"use client";

import { useRef, useState } from "react";
import { ImageOff, Link2, Loader2, Trash2, Upload, UserRound } from "lucide-react";

import { AppImage } from "@/components/ui/app-image";
import { Input } from "@/components/ui/input";
import { MAX_IMAGE_BYTES } from "@/lib/image";
import { cn } from "@/lib/utils";

/**
 * Downscale on a canvas before the file ever reaches the server.
 *
 * A phone photo is several megabytes, which would blow past the Server Action
 * body limit. Re-encoding to JPEG at `max` pixels on the long edge brings a
 * typical shot down to a few tens of kilobytes.
 */
function toResizedDataUrl(file: File, max: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("That file could not be read."));
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error("That file is not a readable image."));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Your browser could not process that image."));
          return;
        }

        // PNGs and transparent images flatten onto white rather than black.
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function ImageUpload({
  name,
  defaultValue = "",
  label,
  hint,
  shape = "rect",
  maxDimension = 800,
}: {
  name: string;
  defaultValue?: string;
  label: string;
  hint?: string;
  /** Circle for avatars, rect for product photography. */
  shape?: "circle" | "rect";
  maxDimension?: number;
}) {
  const [value, setValue] = useState(defaultValue);
  const [broken, setBroken] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLink, setShowLink] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const Placeholder = shape === "circle" ? UserRound : ImageOff;

  async function onPick(file: File | undefined) {
    if (!file) return;

    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("Pick an image file.");
      return;
    }

    setBusy(true);
    try {
      const dataUrl = await toResizedDataUrl(file, maxDimension);

      if (dataUrl.length > MAX_IMAGE_BYTES) {
        setError("That image is too large even after resizing. Try another.");
        return;
      }

      setValue(dataUrl);
      setBroken(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That image could not be used.");
    } finally {
      setBusy(false);
      // Reset so picking the same file twice still fires onChange.
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-ink-700">{label}</p>

      {/* The value the surrounding form actually submits. */}
      <input type="hidden" name={name} value={value} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div
          className={cn(
            "relative shrink-0 overflow-hidden bg-brand-50 ring-1 ring-line",
            shape === "circle"
              ? "size-20 rounded-full"
              : "aspect-4/3 w-40 rounded-xl"
          )}
        >
          {value && !broken ? (
            <AppImage
              src={value}
              alt=""
              fill
              sizes={shape === "circle" ? "80px" : "160px"}
              className="object-cover"
              onError={() => setBroken(true)}
            />
          ) : (
            <span className="grid size-full place-items-center text-brand-400">
              <Placeholder
                className={shape === "circle" ? "size-8" : "size-7"}
                aria-hidden
              />
            </span>
          )}

          {busy && (
            <span className="absolute inset-0 grid place-items-center bg-white/70">
              <Loader2 className="size-5 animate-spin text-brand-600" aria-hidden />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
            >
              <Upload className="size-4" aria-hidden />
              {value ? "Change photo" : "Upload photo"}
            </button>

            {value && (
              <button
                type="button"
                onClick={() => {
                  setValue("");
                  setBroken(false);
                  setError(null);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-3.5 py-2 text-sm font-medium text-ink-700 ring-1 ring-inset ring-slate-200 transition-colors hover:bg-slate-50"
              >
                <Trash2 className="size-4" aria-hidden />
                Remove
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowLink((v) => !v)}
              className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-ink-500 transition-colors hover:text-ink-900"
            >
              <Link2 className="size-4" aria-hidden />
              {showLink ? "Hide link field" : "Use a link instead"}
            </button>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => onPick(e.target.files?.[0])}
          />

          {showLink && (
            <Input
              label="Image link"
              type="url"
              value={value.startsWith("data:") ? "" : value}
              onChange={(e) => {
                setValue(e.target.value);
                setBroken(false);
              }}
              placeholder="https://images.unsplash.com/..."
              hint="Remote links must be on a host allowed in next.config.ts. Uploading avoids that."
            />
          )}

          {error ? (
            <p className="text-xs font-medium text-red-600">{error}</p>
          ) : broken ? (
            <p className="text-xs font-medium text-red-600">
              That image could not be loaded. Upload a file instead.
            </p>
          ) : hint ? (
            <p className="text-xs text-ink-500">{hint}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
