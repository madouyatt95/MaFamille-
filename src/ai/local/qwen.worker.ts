/// <reference lib="webworker" />

import {
  AutoProcessor,
  Qwen3_5ForConditionalGeneration,
  TextStreamer,
  env
} from '@huggingface/transformers';
import {
  LOCAL_QWEN_CACHE_NAME,
  LOCAL_QWEN_MODEL_ID,
  LOCAL_QWEN_MODEL_REVISION,
  type LocalAiBackend,
  type LocalQwenProgress,
  type LocalQwenWorkerRequest,
  type LocalQwenWorkerResponse
} from './contracts';

const workerScope = self as unknown as DedicatedWorkerGlobalScope;

env.allowRemoteModels = true;
env.allowLocalModels = false;
env.useBrowserCache = true;
env.useWasmCache = true;
env.cacheKey = LOCAL_QWEN_CACHE_NAME;

let processor: Awaited<ReturnType<typeof AutoProcessor.from_pretrained>> | null = null;
let model: Awaited<ReturnType<typeof Qwen3_5ForConditionalGeneration.from_pretrained>> | null = null;
let activeBackend: LocalAiBackend | null = null;

function post(message: LocalQwenWorkerResponse) {
  workerScope.postMessage(message);
}

function normalizeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error || 'Erreur Qwen inconnue');
}

function forwardProgress(requestId: string) {
  return (progress: LocalQwenProgress) => {
    post({ type: 'progress', requestId, progress });
  };
}

async function loadModel(requestId: string, backend: LocalAiBackend) {
  if (model && processor && activeBackend === backend) {
    post({ type: 'ready', requestId, backend, loadDurationMs: 0 });
    return;
  }

  if (model) await model.dispose();
  model = null;
  processor = null;
  activeBackend = null;

  const startedAt = performance.now();
  const progressCallback = forwardProgress(requestId);

  processor = await AutoProcessor.from_pretrained(LOCAL_QWEN_MODEL_ID, {
    revision: LOCAL_QWEN_MODEL_REVISION,
    progress_callback: progressCallback
  });

  model = await Qwen3_5ForConditionalGeneration.from_pretrained(LOCAL_QWEN_MODEL_ID, {
    revision: LOCAL_QWEN_MODEL_REVISION,
    device: backend,
    dtype: {
      embed_tokens: 'q4',
      vision_encoder: 'q4',
      decoder_model_merged: 'q4'
    },
    progress_callback: progressCallback
  });

  activeBackend = backend;
  post({
    type: 'ready',
    requestId,
    backend,
    loadDurationMs: performance.now() - startedAt
  });
}

async function generate(
  requestId: string,
  prompt: string,
  systemPrompt: string,
  maxNewTokens: number
) {
  if (!model || !processor) {
    throw new Error("Le moteur local n'est pas chargé.");
  }

  const conversation = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt }
  ];
  const formattedPrompt = processor.apply_chat_template(conversation, {
    add_generation_prompt: true,
    tokenize: false
  });
  const inputs = await processor(formattedPrompt);
  const promptLength = inputs.input_ids.dims.at(-1) || 0;
  const tokenizer = processor.tokenizer;
  if (!tokenizer) {
    throw new Error('Le tokenizer Qwen est indisponible.');
  }
  let generatedTokens = 0;
  const startedAt = performance.now();

  const streamer = new TextStreamer(tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function: (token: string) => {
      post({ type: 'token', requestId, token });
    },
    token_callback_function: (tokens: bigint[]) => {
      generatedTokens += tokens.length;
    }
  });

  const outputs = await model.generate({
    ...inputs,
    max_new_tokens: Math.max(8, Math.min(maxNewTokens, 512)),
    do_sample: false,
    repetition_penalty: 1.05,
    streamer
  });
  if (!('slice' in outputs) || typeof outputs.slice !== 'function') {
    throw new Error('Le moteur Qwen a renvoyé un format de sortie inattendu.');
  }
  const decoded = processor.batch_decode(
    outputs.slice(null, [promptLength, null]),
    { skip_special_tokens: true }
  );

  post({
    type: 'result',
    requestId,
    text: decoded[0]?.trim() || '',
    durationMs: performance.now() - startedAt,
    generatedTokens
  });
}

async function dispose(requestId: string) {
  if (model) await model.dispose();
  model = null;
  processor = null;
  activeBackend = null;
  post({ type: 'disposed', requestId });
}

workerScope.onmessage = async (event: MessageEvent<LocalQwenWorkerRequest>) => {
  const request = event.data;
  try {
    if (request.type === 'load') {
      await loadModel(request.requestId, request.backend);
    } else if (request.type === 'generate') {
      await generate(
        request.requestId,
        request.prompt,
        request.systemPrompt,
        request.maxNewTokens
      );
    } else if (request.type === 'dispose') {
      await dispose(request.requestId);
    }
  } catch (error) {
    post({ type: 'error', requestId: request.requestId, message: normalizeError(error) });
  }
};
