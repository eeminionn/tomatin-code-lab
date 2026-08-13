const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;
const PROFILE_IMAGE_SIZE = 512;
const MAX_PROFILE_IMAGE_DIMENSION = 4096;

const ACCEPTED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif", "heic", "heif"];

function extensionOf(file: File) {
  return file.name.split(".").pop()?.toLowerCase() ?? "";
}

export function validateProfileImage(file: File) {
  const extension = extensionOf(file);
  if (!ACCEPTED_EXTENSIONS.includes(extension)) {
    throw new Error("Usa una imagen JPG, PNG, WebP, GIF o HEIC.");
  }
  if (file.size > MAX_PROFILE_IMAGE_BYTES) {
    throw new Error("La imagen no puede pesar más de 5 MB.");
  }
}

function isHeic(file: File) {
  return ["heic", "heif"].includes(extensionOf(file)) ||
    ["image/heic", "image/heif"].includes(file.type.toLowerCase());
}

function isGif(file: File) {
  return extensionOf(file) === "gif" || file.type.toLowerCase() === "image/gif";
}

async function validateGifDimensions(file: File) {
  const source = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = source;
    await image.decode();
    if (
      image.naturalWidth > MAX_PROFILE_IMAGE_DIMENSION ||
      image.naturalHeight > MAX_PROFILE_IMAGE_DIMENSION
    ) {
      throw new Error("La imagen no puede superar 4096 × 4096 píxeles.");
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("4096")) throw error;
    throw new Error("El GIF no es una imagen válida.");
  } finally {
    URL.revokeObjectURL(source);
  }
}

async function centerCrop(file: Blob) {
  const bitmap = await createImageBitmap(file);
  if (
    bitmap.width > MAX_PROFILE_IMAGE_DIMENSION ||
    bitmap.height > MAX_PROFILE_IMAGE_DIMENSION
  ) {
    bitmap.close();
    throw new Error("La imagen no puede superar 4096 × 4096 píxeles.");
  }
  const sourceSize = Math.min(bitmap.width, bitmap.height);
  const sourceX = Math.floor((bitmap.width - sourceSize) / 2);
  const sourceY = Math.floor((bitmap.height - sourceSize) / 2);
  const canvas = document.createElement("canvas");
  canvas.width = PROFILE_IMAGE_SIZE;
  canvas.height = PROFILE_IMAGE_SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Este navegador no puede procesar la imagen.");
  context.drawImage(
    bitmap,
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,
    0,
    0,
    PROFILE_IMAGE_SIZE,
    PROFILE_IMAGE_SIZE,
  );
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (value) =>
        value ? resolve(value) : reject(new Error("No se pudo preparar la imagen.")),
      "image/webp",
      0.86,
    ),
  );
  return new File([blob], "profile.webp", { type: "image/webp" });
}

export async function prepareProfileImage(file: File) {
  validateProfileImage(file);
  if (isGif(file)) {
    await validateGifDimensions(file);
    return new File([file], "profile.gif", { type: "image/gif" });
  }
  if (isHeic(file)) {
    const { default: heic2any } = await import("heic2any");
    const converted = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.9,
    });
    return centerCrop(Array.isArray(converted) ? converted[0] : converted);
  }
  return centerCrop(file);
}

export const PROFILE_IMAGE_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif";
