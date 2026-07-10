import { Capacitor, registerPlugin } from '@capacitor/core';

type NativeSharedFile = {
  name: string;
  type: string;
  base64: string;
};

type NativeSharedInboxPlugin = {
  consume(options: { id: string }): Promise<{
    id: string;
    title?: string;
    text?: string;
    url?: string;
    target?: string;
    files?: NativeSharedFile[];
  }>;
  consumeQuickAction(): Promise<{
    action?: string;
    query?: string;
  }>;
};

const SharedInbox = registerPlugin<NativeSharedInboxPlugin>('SharedInbox');
let quickActionConsumption: Promise<{ action: string; query: string } | null> | null = null;

const fileFromBase64 = (source: NativeSharedFile): File => {
  const binary = atob(source.base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new File([bytes], source.name || 'Document partagé', { type: source.type || 'application/octet-stream' });
};

export const consumeNativeSharedInbox = async (id: string): Promise<{
  id: string;
  title?: string;
  text?: string;
  url?: string;
  target?: string;
  files: File[];
} | null> => {
  if (Capacitor.getPlatform() !== 'ios') return null;
  try {
    const payload = await SharedInbox.consume({ id });
    return {
      ...payload,
      files: (payload.files || []).map(fileFromBase64)
    };
  } catch {
    return null;
  }
};

export const consumeNativeQuickAction = async (): Promise<{ action: string; query: string } | null> => {
  if (Capacitor.getPlatform() !== 'ios') return null;
  if (quickActionConsumption) return quickActionConsumption;
  quickActionConsumption = SharedInbox.consumeQuickAction()
    .then((payload) => {
      const action = payload.action?.trim() || '';
      if (!action) return null;
      return { action, query: payload.query?.trim() || `action=${encodeURIComponent(action)}` };
    })
    .catch(() => null)
    .finally(() => {
      quickActionConsumption = null;
    });
  return quickActionConsumption;
};

export const quickActionLink = (action: string, params: Record<string, string | number | undefined> = {}): string => {
  const publicOrigin = (import.meta.env.VITE_SITE_URL || 'https://myfamilyplus.fr').replace(/\/+$/, '');
  const url = new URL(`/action/${action}`, publicOrigin);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  });
  return url.toString();
};
