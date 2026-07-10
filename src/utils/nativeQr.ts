import { Capacitor, registerPlugin } from '@capacitor/core';

type FamilyQrPlugin = {
  create(options: { value: string }): Promise<{ base64: string }>;
};

const FamilyQr = registerPlugin<FamilyQrPlugin>('FamilyQr');

export const createNativeQrCode = async (value: string): Promise<string | null> => {
  if (Capacitor.getPlatform() !== 'ios') return null;
  try {
    const result = await FamilyQr.create({ value });
    return result.base64 ? `data:image/png;base64,${result.base64}` : null;
  } catch {
    return null;
  }
};
