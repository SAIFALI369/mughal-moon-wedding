export const GUEST_PHOTO_LIMIT = 5;
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024; // strict 2 MB — enforced in DB and client
export function validatePhoto(file: Pick<File, "type" | "size">): void {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Choose a JPG, PNG or WebP image.");
  if (file.size > MAX_PHOTO_BYTES)
    throw new Error("Each photo must be 2 MB or smaller (strict limit).");
  if (file.size === 0) throw new Error("This photo is empty.");
}

export async function compressPhoto(file: File, opts: { maxSide?: number; quality?: number } = {}): Promise<string> {
  validatePhoto(file);
  // Owner can pass maxSide/quality for replace flow; guests use defaults
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width * bitmap.height > 40000000)
      throw new Error("Choose a photo smaller than 40 megapixels.");
    const maxSide = opts.maxSide ?? 1400;
    const quality = opts.quality ?? 0.75;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image processing is unavailable in this browser.");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const result = canvas.toDataURL("image/jpeg", quality);
    // Strict 2 MB DB limit: base64 ~2.8M chars ~= 2M bytes payload. Keep client under that.
    if (octetLength(result) > 2800000)
      throw new Error("Compressed image still exceeds 2 MB. Try a smaller photo.");
    if (result.length > 2800000)
      throw new Error("This photo is too detailed. Please choose a smaller image.");
    return result;
  } finally {
    bitmap.close();
  }
}

function octetLength(dataUrl: string): number {
  // rough base64 length check
  return new TextEncoder().encode(dataUrl).length;
}
