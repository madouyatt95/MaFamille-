/**
 * Utility to compress images on the client side using HTML5 Canvas.
 * Reduces image dimensions and lowers JPEG quality to optimize payload sizes for Supabase.
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
