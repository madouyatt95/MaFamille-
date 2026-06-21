import { Capacitor, registerPlugin } from '@capacitor/core';

export type NativeSpeechVoice = {
  id: string;
  name: string;
  language: string;
  quality: number;
};

type NativeSpeechPlugin = {
  getVoices(): Promise<{ voices: NativeSpeechVoice[] }>;
  speak(options: { text: string; voiceId?: string; rate?: number; pitch?: number; volume?: number }): Promise<void>;
  stop(): Promise<void>;
};

const plugin = registerPlugin<NativeSpeechPlugin>('NativeSpeech');

export const nativeSpeech = {
  isAvailable: () => Capacitor.getPlatform() === 'ios',
  getVoices: async () => (await plugin.getVoices()).voices,
  speak: (text: string, voiceId = '') => plugin.speak({
    text,
    voiceId,
    rate: 0.48,
    pitch: 1,
    volume: 1
  }),
  stop: () => plugin.stop()
};
