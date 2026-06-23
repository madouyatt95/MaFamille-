import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { JustificatifPack, DocumentFile } from '../types';

const loadDocumentPayload = async (doc: DocumentFile): Promise<{ mime: string; bytes: Uint8Array } | null> => {
  const source = doc.fileUrl || doc.fileBase64;
  if (!source) return null;

  if (/^https?:\/\//i.test(source)) {
    const response = await fetch(source);
    if (!response.ok) throw new Error(`Téléchargement impossible (${response.status})`);
    const mime = response.headers.get('content-type') || '';
    return { mime, bytes: new Uint8Array(await response.arrayBuffer()) };
  }

  const [meta, base64Data] = source.split(',');
  if (!base64Data) return null;
  return {
    mime: meta,
    bytes: Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))
  };
};

export const generatePackPDF = async (pack: JustificatifPack, documents: DocumentFile[]): Promise<void> => {
  try {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const generatedAt = new Date();
    const expiresAt = pack.shareExpiresAt ? new Date(pack.shareExpiresAt) : null;
    const watermarkParts = [
      'MyFamily+',
      `généré le ${generatedAt.toLocaleDateString('fr-FR')}`,
      expiresAt && !Number.isNaN(expiresAt.getTime()) ? `expire le ${expiresAt.toLocaleDateString('fr-FR')}` : null,
      pack.shareRecipientLabel ? `destinataire : ${pack.shareRecipientLabel}` : null
    ].filter(Boolean);
    const watermark = watermarkParts.join(' • ');

    const coverPage = pdfDoc.addPage();
    const { width, height } = coverPage.getSize();
    
    coverPage.drawText(`Dossier: ${pack.name}`, {
      x: 50,
      y: height - 100,
      size: 24,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });

    coverPage.drawText(`Généré le ${generatedAt.toLocaleDateString('fr-FR')}`, {
      x: 50,
      y: height - 130,
      size: 12,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    });

    if (expiresAt && !Number.isNaN(expiresAt.getTime())) {
      coverPage.drawText(`Lien valable jusqu'au ${expiresAt.toLocaleDateString('fr-FR')}`, {
        x: 50,
        y: height - 150,
        size: 11,
        font: font,
        color: rgb(0.45, 0.45, 0.45),
      });
    }

    if (pack.shareRecipientLabel) {
      coverPage.drawText(`Destinataire : ${pack.shareRecipientLabel}`, {
        x: 50,
        y: height - 168,
        size: 11,
        font: font,
        color: rgb(0.45, 0.45, 0.45),
      });
    }

    coverPage.drawText('Sommaire des pièces jointes :', {
      x: 50,
      y: height - 200,
      size: 16,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });

    let yOffset = height - 240;
    
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      
      // Ajout au sommaire
      coverPage.drawText(`${i + 1}. ${doc.name} (${doc.category})`, {
        x: 60,
        y: yOffset,
        size: 12,
        font: font,
        color: rgb(0.3, 0.3, 0.3),
      });
      yOffset -= 25;

      if (!doc.fileUrl && !doc.fileBase64) continue;

      try {
        const payload = await loadDocumentPayload(doc);
        if (!payload) continue;
        
        if (payload.mime.includes('application/pdf')) {
          // Si c'est un PDF, on fusionne ses pages
          const embeddedPdf = await PDFDocument.load(payload.bytes);
          const copiedPages = await pdfDoc.copyPages(embeddedPdf, embeddedPdf.getPageIndices());
          copiedPages.forEach((page) => pdfDoc.addPage(page));
        } 
        else if (payload.mime.includes('image/')) {
          // Si c'est une image, on l'ajoute sur une nouvelle page
          let embeddedImage;
          if (payload.mime.includes('image/png')) {
            embeddedImage = await pdfDoc.embedPng(payload.bytes);
          } else {
            embeddedImage = await pdfDoc.embedJpg(payload.bytes);
          }
          
          const imgDims = embeddedImage.scaleToFit(width - 100, height - 100);
          const newPage = pdfDoc.addPage();
          
          newPage.drawImage(embeddedImage, {
            x: width / 2 - imgDims.width / 2,
            y: height / 2 - imgDims.height / 2,
            width: imgDims.width,
            height: imgDims.height,
          });
        }
      } catch (err) {
        console.error(`Erreur lors de l'intégration du document ${doc.name}`, err);
      }
    }

    pdfDoc.getPages().forEach((page) => {
      const { width: pageWidth } = page.getSize();
      page.drawText(watermark, {
        x: 36,
        y: 22,
        size: 7,
        font,
        color: rgb(0.55, 0.55, 0.55),
        maxWidth: pageWidth - 72
      });
    });

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `Dossier_${pack.name.replace(/\s+/g, '_')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

  } catch (error) {
    console.error('Erreur globale lors de la génération du PDF :', error);
    alert('Une erreur est survenue lors de la génération du PDF.');
  }
};
