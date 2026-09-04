export const LOCAL_QWEN_MODEL_ID = 'onnx-community/Qwen3.5-0.8B-ONNX-OPT';
export const LOCAL_QWEN_MODEL_REVISION = 'fafab72d87a9e6be3925b38caf48286d2838f2d0';
export const LOCAL_QWEN_CACHE_NAME = 'myfamily-qwen-model-v1';
export const LOCAL_QWEN_ESTIMATED_BYTES = 735 * 1024 * 1024;

export type LocalAiBackend = 'webgpu' | 'wasm';

export type LocalQwenProgress = {
  status: string;
  file?: string;
  progress?: number;
  loaded?: number;
  total?: number;
};

export type LocalQwenWorkerRequest =
  | {
      type: 'load';
      requestId: string;
      backend: LocalAiBackend;
    }
  | {
      type: 'generate';
      requestId: string;
      prompt: string;
      systemPrompt: string;
      maxNewTokens: number;
    }
  | {
      type: 'dispose';
      requestId: string;
    };

export type LocalQwenWorkerResponse =
  | {
      type: 'progress';
      requestId: string;
      progress: LocalQwenProgress;
    }
  | {
      type: 'ready';
      requestId: string;
      backend: LocalAiBackend;
      loadDurationMs: number;
    }
  | {
      type: 'token';
      requestId: string;
      token: string;
    }
  | {
      type: 'result';
      requestId: string;
      text: string;
      durationMs: number;
      generatedTokens: number;
    }
  | {
      type: 'disposed';
      requestId: string;
    }
  | {
      type: 'error';
      requestId: string;
      message: string;
    };

export type LocalAiCompatibility = {
  webGpuAvailable: boolean;
  wasmAvailable: boolean;
  crossOriginIsolated: boolean;
  hardwareConcurrency: number;
  deviceMemoryGb: number | null;
  isIos: boolean;
  recommendedBackend: LocalAiBackend | null;
  storageUsage: number | null;
  storageQuota: number | null;
  persistentStorage: boolean;
};

export type LocalGenerationResult = {
  text: string;
  durationMs: number;
  generatedTokens: number;
  tokensPerSecond: number;
};
