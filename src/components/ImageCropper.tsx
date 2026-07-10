import { useEffect, useMemo, useState } from 'react';
import { Check, Move, RotateCcw, X, ZoomIn } from 'lucide-react';
import './image-cropper.css';

type ImageCropperProps = {
  file: File;
  aspect?: number;
  title?: string;
  onCancel: () => void;
  onConfirm: (blob: Blob) => Promise<void> | void;
};

const loadImage = (file: File): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    URL.revokeObjectURL(url);
    resolve(image);
  };
  image.onerror = () => {
    URL.revokeObjectURL(url);
    reject(new Error('Image illisible.'));
  };
  image.src = url;
});

const cropImage = async (file: File, aspect: number, zoom: number, offsetX: number, offsetY: number): Promise<Blob> => {
  const image = await loadImage(file);
  const sourceRatio = image.naturalWidth / image.naturalHeight;
  let baseWidth = image.naturalWidth;
  let baseHeight = image.naturalHeight;
  if (sourceRatio > aspect) baseWidth = image.naturalHeight * aspect;
  else baseHeight = image.naturalWidth / aspect;

  const cropWidth = baseWidth / zoom;
  const cropHeight = baseHeight / zoom;
  const horizontalRoom = Math.max(0, (image.naturalWidth - cropWidth) / 2);
  const verticalRoom = Math.max(0, (image.naturalHeight - cropHeight) / 2);
  const sourceX = horizontalRoom + (offsetX / 100) * horizontalRoom;
  const sourceY = verticalRoom + (offsetY / 100) * verticalRoom;
  const targetWidth = aspect >= 1 ? 720 : Math.round(720 * aspect);
  const targetHeight = Math.round(targetWidth / aspect);
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Recadrage indisponible.');
  context.drawImage(image, sourceX, sourceY, cropWidth, cropHeight, 0, 0, targetWidth, targetHeight);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Recadrage impossible.')), 'image/jpeg', .9));
};

export function ImageCropper({ file, aspect = 1, title = 'Recadrer la photo', onCancel, onConfirm }: ImageCropperProps) {
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [busy, setBusy] = useState(false);
  const previewUrl = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(previewUrl), [previewUrl]);

  const reset = () => {
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
  };

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm(await cropImage(file, aspect, zoom, offsetX, offsetY));
    } finally {
      setBusy(false);
    }
  };

  return <div className="image-cropper-backdrop" role="dialog" aria-modal="true" aria-label={title}>
    <section className="image-cropper-panel">
      <header><div><span>Photo</span><h2>{title}</h2></div><button onClick={onCancel} aria-label="Fermer"><X /></button></header>
      <div className="image-cropper-stage" style={{ aspectRatio: String(aspect) }}>
        <img src={previewUrl} alt="Aperçu du recadrage" style={{ transform: `translate(${offsetX * .28}%, ${offsetY * .28}%) scale(${zoom})` }} />
        <span className="image-cropper-frame" />
      </div>
      <div className="image-cropper-controls">
        <label><ZoomIn /><span>Zoom</span><input type="range" min="1" max="3" step="0.05" value={zoom} onChange={event => setZoom(Number(event.target.value))} /></label>
        <label><Move /><span>Horizontal</span><input type="range" min="-100" max="100" value={offsetX} onChange={event => setOffsetX(Number(event.target.value))} /></label>
        <label><Move /><span>Vertical</span><input type="range" min="-100" max="100" value={offsetY} onChange={event => setOffsetY(Number(event.target.value))} /></label>
      </div>
      <div className="image-cropper-actions"><button onClick={reset}><RotateCcw /> Recentrer</button><button className="is-primary" disabled={busy} onClick={() => void confirm()}><Check /> {busy ? 'Préparation…' : 'Utiliser cette photo'}</button></div>
    </section>
  </div>;
}

