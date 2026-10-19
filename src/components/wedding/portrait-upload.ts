import { isSafePortrait } from "./invitation-details";

const MAX_SOURCE_BYTES = 8_000_000;
const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Keep portraits in the owner-protected card JSON, not in an externally hosted public bucket. */
export async function processInvitationPortrait(file: File): Promise<string> {
  if (!ACCEPTED.has(file.type) || file.size > MAX_SOURCE_BYTES || file.size === 0) {
    throw new Error("Choose a JPEG, PNG or WebP photo under 8 MB.");
  }

  const url = URL.createObjectURL(file);
  const image = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("This image could not be opened."));
      image.src = url;
    });
    if (
      !image.naturalWidth ||
      !image.naturalHeight ||
      image.naturalWidth * image.naturalHeight > 40_000_000
    ) {
      throw new Error("Please choose a valid photo smaller than 40 megapixels.");
    }

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Photo processing is not available in this browser.");

    for (const dimension of [900, 720, 560]) {
      const scale = Math.min(1, dimension / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.round(image.naturalWidth * scale);
      canvas.height = Math.round(image.naturalHeight * scale);
      // Flatten transparent uploads against ivory before encoding as JPEG.
      context.fillStyle = "#f7f0e4";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.82, 0.7, 0.55]) {
        const photo = canvas.toDataURL("image/jpeg", quality);
        if (isSafePortrait(photo)) return photo;
      }
    }
    throw new Error("Photo is still too large. Try a smaller image or a different crop.");
  } finally {
    URL.revokeObjectURL(url);
  }
}
