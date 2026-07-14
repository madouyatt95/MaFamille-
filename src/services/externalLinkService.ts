import { Capacitor, registerPlugin } from '@capacitor/core';

type ExternalLinkPlugin = {
  open(options: { url: string }): Promise<{ opened: boolean }>;
};

const NativeExternalLink = registerPlugin<ExternalLinkPlugin>('ExternalLink');
const PUBLIC_SITE_URL = 'https://myfamilyplus.fr';

export const publicUrl = (path: string): string => new URL(path, PUBLIC_SITE_URL).toString();

export const openExternalUrl = async (url: string): Promise<void> => {
  if (Capacitor.isNativePlatform()) {
    await NativeExternalLink.open({ url });
    return;
  }

  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (!opened) window.location.assign(url);
};

export const openLegalPage = (path: string): Promise<void> => openExternalUrl(publicUrl(path));
