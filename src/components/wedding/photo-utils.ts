export const GUEST_PHOTO_LIMIT = 5;
export function validatePhoto(file: Pick<File, "type" | "size">): void {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Choose a JPG, PNG or WebP image.");
  if (file.size > 10 * 1024 * 1024)
    throw new Error("Each original photo must be 10 MB or smaller.");
  if (file.size === 0) throw new Error("This photo is empty.");
}

export async function compressPhoto(file: File): Promise<string> {
  validatePhoto(file);
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width * bitmap.height > 40000000)
      throw new Error("Choose a photo smaller than 40 megapixels.");
    const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image processing is unavailable in this browser.");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const result = canvas.toDataURL("image/jpeg", 0.75);
    if (result.length > 1066690)
      throw new Error("This photo is too detailed. Please choose a smaller image.");
    return result;
  } finally {
    bitmap.close();
  }
}
