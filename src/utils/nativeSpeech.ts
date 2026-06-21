import { Capacitor, registerPlugin } from '@capacitor/core';

export type NativeSpeechVoice = {
  id: string;
  name: string;
  language: string;
  quality: number;
  qualityLabel: 'Standard' | 'Améliorée' | 'Premium';
  gender: 'Féminine' | 'Masculine' | 'Non précisé';
  isNovelty?: boolean;
  isPersonal?: boolean;
  isInstalled?: boolean;
  requiresNetwork?: boolean;
};

type PluginListenerHandle = {
  remove(): Promise<void>;
};

type NativeSpeechPlugin = {
  getVoices(): Promise<{ voices: NativeSpeechVoice[] }>;
  speak(options: { text: string; voiceId?: string; rate?: number; pitch?: number; volume?: number }): Promise<void>;
  stop(): Promise<void>;
  addListener(
    eventName: 'voicesChanged',
    listener: (event: { voices: NativeSpeechVoice[] }) => void
  ): Promise<PluginListenerHandle>;
};

const plugin = registerPlugin<NativeSpeechPlugin>('NativeSpeech');

export const nativeSpeech = {
  isAvailable: () => ['ios', 'android'].includes(Capacitor.getPlatform()),
  platform: () => Capacitor.getPlatform(),
  getVoices: async () => (await plugin.getVoices()).voices,
  speak: (text: string, voiceId = '') => plugin.speak({
    text,
    voiceId,
    rate: 0.48,
    pitch: 1,
    volume: 1
  }),
  stop: () => plugin.stop(),
  onVoicesChanged: (listener: (voices: NativeSpeechVoice[]) => void) =>
    plugin.addListener('voicesChanged', event => listener(event.voices))
};
