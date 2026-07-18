export const MAX_TICKET_IMAGES = 3;
export const MAX_TICKET_IMAGES_TOTAL_LENGTH = 1_400_000;

const TICKET_IMAGE_TARGETS = [
  { maxSide: 960, quality: 0.78 },
  { maxSide: 840, quality: 0.7 },
  { maxSide: 720, quality: 0.62 },
];

function imageToJpegDataUrl(image, { maxSide, quality }) {
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  const outputWidth = Math.max(1, Math.round(image.width * scale));
  const outputHeight = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0, outputWidth, outputHeight);
  return canvas.toDataURL("image/jpeg", quality);
}

export function fileToTicketImageDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      reject(new Error("Selecione uma imagem válida."));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      reject(new Error("Use uma imagem de até 5 MB."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Não foi possível carregar a imagem."));
      image.onload = () => {
        for (const target of TICKET_IMAGE_TARGETS) {
          const dataUrl = imageToJpegDataUrl(image, target);
          if (dataUrl.length <= 480_000) {
            resolve(dataUrl);
            return;
          }
        }

        reject(new Error("A imagem ficou grande demais. Tente uma foto mais leve ou recortada."));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
