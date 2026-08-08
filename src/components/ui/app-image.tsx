import Image, { type ImageProps } from "next/image";

import { isDataImageUrl } from "@/lib/image";

/**
 * `next/image` with one adjustment: uploaded photos arrive as inline `data:`
 * URLs, which the optimizer cannot fetch or resize. Those are passed through
 * untouched; remote URLs keep the normal optimization path.
 */
export function AppImage({ src, ...props }: ImageProps) {
  const inline = typeof src === "string" && isDataImageUrl(src);

  // `alt` is required by ImageProps and arrives through the spread; the lint
  // rule cannot see that far.
  // eslint-disable-next-line jsx-a11y/alt-text
  return <Image src={src} unoptimized={inline || undefined} {...props} />;
}
