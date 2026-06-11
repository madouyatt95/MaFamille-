import { getSupabaseClient } from './supabase';

/**
 * Presets de compression d'images recommandés.
 */
export interface CompressionPreset {
  maxWidth: number;
  maxHeight: number;
  quality: number;
}

export const PRESETS: Record<'profile' | 'classic' | 'document' | 'thumbnail', CompressionPreset> = {
  profile: { maxWidth: 512, maxHeight: 512, quality: 0.75 },
  classic: { maxWidth: 1280, maxHeight: 1280, quality: 0.75 },
  document: { maxWidth: 1600, maxHeight: 1600, quality: 0.80 },
  thumbnail: { maxWidth: 300, maxHeight: 300, quality: 0.75 }
};

/**
 * Utility to compress images on the client side using HTML5 Canvas.
 * Reduces image dimensions and lowers JPEG quality to optimize payload sizes for Supabase.
 * Retains original signature for backward compatibility.
 */
export const compressImage = (
  file: File,
  maxWidth = 1024,
  maxHeight = 1024,
  quality = 0.6
): Promise<string> => {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.src = objectUrl;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Maintain aspect ratio
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        resolve('');
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      
      // Output as JPEG with specified quality (0.0 to 1.0)
      const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
      URL.revokeObjectURL(objectUrl);
      resolve(compressedBase64);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve('');
    };
  });
};

const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // Avoid tainted canvas
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
};

/**
 * Compresse une image source (Fichier ou chaîne Base64) selon un preset donné et renvoie un Blob WebP (ou JPEG).
 */
export const compressImageToBlob = async (
  source: File | string,
  presetName: 'profile' | 'classic' | 'document' | 'thumbnail'
): Promise<{ blob: Blob; ext: string }> => {
  const preset = PRESETS[presetName];
  let src: string;
  const isObjectUrl = source instanceof File;

  if (isObjectUrl) {
    src = URL.createObjectURL(source);
  } else if (typeof source === 'string') {
    if (source.startsWith('data:')) {
      src = source;
    } else {
      src = `data:image/jpeg;base64,${source}`;
    }
  } else {
    throw new Error("Source d'image non valide pour la compression");
  }

  try {
    const img = await loadImage(src);
    const canvas = document.createElement('canvas');
    let width = img.width;
    let height = img.height;

    const { maxWidth, maxHeight, quality } = preset;

    // Maintain aspect ratio
    if (width > height) {
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
    } else {
      if (height > maxHeight) {
        width = Math.round((width * maxHeight) / height);
        height = maxHeight;
      }
    }

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error("Impossible d'obtenir le contexte 2D du canvas");
    }

    ctx.drawImage(img, 0, 0, width, height);

    // Try WebP first, then fallback to JPEG
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob && blob.type === 'image/webp') {
            resolve({ blob, ext: 'webp' });
          } else {
            // Fallback to JPEG
            canvas.toBlob(
              (jpegBlob) => {
                if (jpegBlob) {
                  resolve({ blob: jpegBlob, ext: 'jpg' });
                } else {
                  reject(new Error("La compression en Blob JPEG a échoué"));
                }
              },
              'image/jpeg',
              quality
            );
          }
        },
        'image/webp',
        quality
      );
    });
  } finally {
    if (isObjectUrl && src) {
      URL.revokeObjectURL(src);
    }
  }
};

/**
 * Téléverse un Blob d'image vers Supabase Storage.
 * Effectue un repli (fallback) automatique vers le bucket 'avatars' si le bucket de destination échoue.
 */
export const uploadBlobToStorage = async (
  bucket: string,
  path: string,
  blob: Blob
): Promise<string> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Client Supabase non configuré");
  }

  const cleanPath = path.replace(/\/+/g, '/').replace(/^\//, '');
  console.log(`[Storage] Envoi vers le bucket "${bucket}", chemin: "${cleanPath}"`);

  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(cleanPath, blob, {
        contentType: blob.type,
        upsert: true
      });

    if (!error && data) {
      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(cleanPath);
      return publicUrl;
    }
    console.warn(`[Storage] Échec d'envoi vers le bucket "${bucket}": ${error?.message || 'Inconnu'}. Tentative sur le bucket 'avatars'.`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[Storage] Exception sur le bucket "${bucket}": ${message}. Tentative sur le bucket 'avatars'.`);
  }

  // Fallback bucket 'avatars'
  const fallbackPath = `${bucket}/${cleanPath}`.replace(/\/+/g, '/').replace(/^\//, '');
  const { error: fallbackError } = await supabase.storage
    .from('avatars')
    .upload(fallbackPath, blob, {
      contentType: blob.type,
      upsert: true
    });

  if (fallbackError) {
    throw new Error(`Échec de téléversement définitif : ${fallbackError.message}`);
  }

  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fallbackPath);
  return publicUrl;
};
