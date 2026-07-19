export const MAX_TICKET_IMAGES = 3;
export const MAX_TICKET_IMAGES_TOTAL_LENGTH = 2_400_000;

const MAX_RAW_TICKET_IMAGE_BYTES = 18 * 1024 * 1024;
const MAX_TICKET_IMAGE_DATA_URL_LENGTH = 760_000;

const TICKET_IMAGE_TARGETS = [
  { maxSide: 1400, quality: 0.82 },
  { maxSide: 1200, quality: 0.78 },
  { maxSide: 1080, quality: 0.72 },
  { maxSide: 960, quality: 0.66 },
  { maxSide: 840, quality: 0.58 },
  { maxSide: 720, quality: 0.5 },
  { maxSide: 640, quality: 0.44 },
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

    if (file.size > MAX_RAW_TICKET_IMAGE_BYTES) {
      reject(new Error("Use uma imagem de até 18 MB. Fotos do celular serão comprimidas automaticamente."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Não foi possível carregar a imagem."));
      image.onload = () => {
        try {
          for (const target of TICKET_IMAGE_TARGETS) {
            const dataUrl = imageToJpegDataUrl(image, target);
            if (dataUrl.length <= MAX_TICKET_IMAGE_DATA_URL_LENGTH) {
              resolve(dataUrl);
              return;
            }
          }

          reject(new Error("A imagem ficou grande demais após a compressão. Tente recortar a foto ou enviar outra imagem."));
        } catch {
          reject(new Error("Não foi possível compactar a imagem neste navegador."));
        }
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
