import { z } from "zod";

/**
 * Uploaded photos are stored inline as base64 `data:` URLs in the existing
 * `imageUrl` column.
 *
 * There is no object storage wired up (Vercel's filesystem is read-only and no
 * Cloudinary credentials exist), so an inline data URL is what lets "upload
 * from your gallery" work without new infrastructure. The upload widget
 * downscales on a canvas first, which keeps a typical photo well under the cap
 * below — and under the 1 MB Server Action body limit.
 */
export const MAX_IMAGE_BYTES = 600_000;

const DATA_URL = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/;

export function isDataImageUrl(value: string) {
  return DATA_URL.test(value);
}

/**
 * Accepts an empty string, a normal http(s) link, or an inline image data URL.
 * Anything else — including `javascript:` and other data MIME types — fails.
 */
export const imageUrlSchema = z
  .string()
  .trim()
  .superRefine((value, ctx) => {
    if (value === "") return;

    if (isDataImageUrl(value)) {
      if (value.length > MAX_IMAGE_BYTES) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "That image is too large. Pick one under 500 KB.",
        });
      }
      return;
    }

    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a valid image URL, or upload a photo.",
      });
      return;
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Image links must start with https://",
      });
    }
  })
  .optional();
