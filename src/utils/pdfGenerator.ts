import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { JustificatifPack, DocumentFile } from '../types';

export const generatePackPDF = async (pack: JustificatifPack, documents: DocumentFile[]): Promise<void> => {
  try {
    // 1. Création d'un nouveau document PDF
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // 2. Page de garde
    const coverPage = pdfDoc.addPage();
    const { width, height } = coverPage.getSize();
    
    coverPage.drawText(`Dossier: ${pack.name}`, {
      x: 50,
      y: height - 100,
      size: 24,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });

    coverPage.drawText(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, {
      x: 50,
      y: height - 130,
      size: 12,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    });

    coverPage.drawText('Sommaire des pièces jointes :', {
      x: 50,
      y: height - 200,
      size: 16,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });

    let yOffset = height - 240;
    
    // 3. Traitement des documents
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

      if (!doc.fileBase64) continue;

      try {
        // Extraction du type MIME et de la base64 brute
        const [meta, base64Data] = doc.fileBase64.split(',');
        
        if (meta.includes('application/pdf')) {
          // Si c'est un PDF, on fusionne ses pages
          const docBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
          const embeddedPdf = await PDFDocument.load(docBuffer);
          const copiedPages = await pdfDoc.copyPages(embeddedPdf, embeddedPdf.getPageIndices());
          copiedPages.forEach((page) => pdfDoc.addPage(page));
        } 
        else if (meta.includes('image/')) {
          // Si c'est une image, on l'ajoute sur une nouvelle page
          const imgBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
          let embeddedImage;
          if (meta.includes('image/png')) {
            embeddedImage = await pdfDoc.embedPng(imgBuffer);
          } else {
            embeddedImage = await pdfDoc.embedJpg(imgBuffer);
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

    // 4. Sauvegarde et téléchargement
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
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
