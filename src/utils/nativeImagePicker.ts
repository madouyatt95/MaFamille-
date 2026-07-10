import { Capacitor, registerPlugin } from '@capacitor/core';

type NativeImagePickerPlugin = {
  pick(options: { source: 'camera' | 'library' }): Promise<{
    name: string;
    type: string;
    base64: string;
  }>;
};

const FamilyImagePicker = registerPlugin<NativeImagePickerPlugin>('FamilyImagePicker');

export const pickNativeImage = async (source: 'camera' | 'library'): Promise<File | null> => {
  if (Capacitor.getPlatform() !== 'ios') return null;
  try {
    const payload = await FamilyImagePicker.pick({ source });
    const binary = atob(payload.base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return new File([bytes], payload.name || 'scan.jpg', { type: payload.type || 'image/jpeg' });
  } catch {
    return null;
  }
};
