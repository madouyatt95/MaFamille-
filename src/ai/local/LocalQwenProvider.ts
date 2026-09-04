import {
  LOCAL_QWEN_CACHE_NAME,
  LOCAL_QWEN_MODEL_ID,
  LOCAL_QWEN_MODEL_REVISION,
  type LocalAiBackend,
  type LocalAiCompatibility,
  type LocalGenerationResult,
  type LocalQwenProgress,
  type LocalQwenWorkerRequest,
  type LocalQwenWorkerResponse
} from './contracts';

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  onProgress?: (progress: LocalQwenProgress) => void;
  onToken?: (token: string) => void;
};

type NavigatorWithDeviceMemory = Navigator & {
  deviceMemory?: number;
  gpu?: unknown;
};

const INSTALL_MANIFEST_KEY = 'mf_local_qwen_manifest';

export class LocalQwenProvider {
  private worker: Worker;
  private pending = new Map<string, PendingRequest>();

  constructor() {
    this.worker = new Worker(new URL('./qwen.worker.ts', import.meta.url), { type: 'module' });
    this.worker.addEventListener('message', this.handleMessage);
    this.worker.addEventListener('error', this.handleWorkerError);
  }

  static async detectCompatibility(): Promise<LocalAiCompatibility> {
    const browserNavigator = navigator as NavigatorWithDeviceMemory;
    const storage = await navigator.storage?.estimate?.().catch(() => null);
    const persistentStorage = await navigator.storage?.persisted?.().catch(() => false) || false;
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const webGpuAvailable = Boolean(browserNavigator.gpu) && !isIos;

    return {
      webGpuAvailable,
      wasmAvailable: typeof WebAssembly !== 'undefined',
      crossOriginIsolated: window.crossOriginIsolated,
      hardwareConcurrency: navigator.hardwareConcurrency || 1,
      deviceMemoryGb: browserNavigator.deviceMemory || null,
      isIos,
      recommendedBackend: webGpuAvailable ? 'webgpu' : null,
      storageUsage: storage?.usage ?? null,
      storageQuota: storage?.quota ?? null,
      persistentStorage
    };
  }

  static async requestPersistentStorage(): Promise<boolean> {
    if (!navigator.storage?.persist) return false;
    return navigator.storage.persist();
  }

  static async clearModelCache(): Promise<boolean> {
    localStorage.removeItem(INSTALL_MANIFEST_KEY);
    if (!('caches' in window)) return false;
    return caches.delete(LOCAL_QWEN_CACHE_NAME);
  }

  static async getCachedRequestCount(): Promise<number> {
    if (!('caches' in window)) return 0;
    const cacheNames = await caches.keys();
    if (!cacheNames.includes(LOCAL_QWEN_CACHE_NAME)) return 0;
    const cache = await caches.open(LOCAL_QWEN_CACHE_NAME);
    return (await cache.keys()).length;
  }

  async load(
    backend: LocalAiBackend,
    onProgress?: (progress: LocalQwenProgress) => void
  ): Promise<{ backend: LocalAiBackend; loadDurationMs: number }> {
    const result = await this.request('load', { backend }, { onProgress }) as {
      backend: LocalAiBackend;
      loadDurationMs: number;
    };
    localStorage.setItem(INSTALL_MANIFEST_KEY, JSON.stringify({
      modelId: LOCAL_QWEN_MODEL_ID,
      revision: LOCAL_QWEN_MODEL_REVISION,
      backend,
      installedAt: new Date().toISOString()
    }));
    return result;
  }

  async generate(options: {
    prompt: string;
    systemPrompt: string;
    maxNewTokens?: number;
    onToken?: (token: string) => void;
  }): Promise<LocalGenerationResult> {
    const result = await this.request('generate', {
      prompt: options.prompt,
      systemPrompt: options.systemPrompt,
      maxNewTokens: options.maxNewTokens ?? 128
    }, { onToken: options.onToken }) as Omit<LocalGenerationResult, 'tokensPerSecond'>;

    return {
      ...result,
      tokensPerSecond: result.durationMs > 0
        ? result.generatedTokens / (result.durationMs / 1000)
        : 0
    };
  }

  async dispose(): Promise<void> {
    await this.request('dispose', {}, {});
  }

  terminate() {
    this.worker.removeEventListener('message', this.handleMessage);
    this.worker.removeEventListener('error', this.handleWorkerError);
    this.worker.terminate();
    this.pending.forEach(({ reject }) => reject(new Error('Worker Qwen arrêté.')));
    this.pending.clear();
  }

  private request(
    type: LocalQwenWorkerRequest['type'],
    payload: Record<string, unknown>,
    callbacks: Pick<PendingRequest, 'onProgress' | 'onToken'>
  ): Promise<unknown> {
    const requestId = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      this.pending.set(requestId, { resolve, reject, ...callbacks });
      this.worker.postMessage({ type, requestId, ...payload } as LocalQwenWorkerRequest);
    });
  }

  private handleMessage = (event: MessageEvent<LocalQwenWorkerResponse>) => {
    const message = event.data;
    const pending = this.pending.get(message.requestId);
    if (!pending) return;

    if (message.type === 'progress') {
      pending.onProgress?.(message.progress);
      return;
    }
    if (message.type === 'token') {
      pending.onToken?.(message.token);
      return;
    }
    if (message.type === 'error') {
      this.pending.delete(message.requestId);
      pending.reject(new Error(message.message));
      return;
    }
    if (message.type === 'ready') {
      this.pending.delete(message.requestId);
      pending.resolve({ backend: message.backend, loadDurationMs: message.loadDurationMs });
      return;
    }
    if (message.type === 'result') {
      this.pending.delete(message.requestId);
      pending.resolve({
        text: message.text,
        durationMs: message.durationMs,
        generatedTokens: message.generatedTokens
      });
      return;
    }
    if (message.type === 'disposed') {
      this.pending.delete(message.requestId);
      pending.resolve(undefined);
    }
  };

  private handleWorkerError = (event: ErrorEvent) => {
    const error = new Error(event.message || 'Le worker Qwen a rencontré une erreur.');
    this.pending.forEach(({ reject }) => reject(error));
    this.pending.clear();
  };
}
