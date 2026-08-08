"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Keyboard, Loader2, ScanLine } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseScanCode } from "@/lib/rental/scan-code";

/** Minimal shape of the native BarcodeDetector API. */
interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}
type BarcodeDetectorCtor = new (options?: {
  formats?: string[];
}) => BarcodeDetectorLike;

function getDetectorCtor(): BarcodeDetectorCtor | null {
  if (typeof window === "undefined") return null;
  return (
    (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor })
      .BarcodeDetector ?? null
  );
}

/**
 * Camera scanner with a typed fallback.
 *
 * Two decoding paths, because the native BarcodeDetector only exists in
 * Chromium: it is used when present (fastest, hardware-accelerated), and
 * everywhere else — notably Safari on iPhone — frames are decoded with jsQR,
 * loaded on demand so Chromium users never download it.
 *
 * Camera access also requires HTTPS, so typing the order number stays
 * available regardless. A USB/Bluetooth scanner gun works through that same
 * field: those behave as keyboards and press Enter, which submits the form.
 */
export function CodeScanner({
  onCode,
  isBusy = false,
}: {
  onCode: (orderNumber: string) => void;
  isBusy?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const manualRef = useRef<HTMLInputElement>(null);

  const [scanning, setScanning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [engine, setEngine] = useState<"native" | "jsqr" | null>(null);

  // Focus the manual field on mount so a scanner gun works without a click.
  useEffect(() => {
    manualRef.current?.focus();
  }, []);

  const stop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  useEffect(() => stop, [stop]);

  const handleHit = useCallback(
    (raw: string) => {
      const parsed = parseScanCode(raw);
      if (!parsed) return false;
      stop();
      onCode(parsed);
      return true;
    },
    [onCode, stop]
  );

  async function start() {
    setError(null);
    setStarting(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      setScanning(true);

      const Detector = getDetectorCtor();

      if (Detector) {
        setEngine("native");
        const detector = new Detector({ formats: ["qr_code", "code_128"] });

        const tick = async () => {
          if (!streamRef.current || !videoRef.current) return;
          try {
            const results = await detector.detect(videoRef.current);
            for (const r of results) {
              if (handleHit(r.rawValue)) return;
            }
          } catch {
            // A frame can fail to decode; keep going.
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      // Safari / Firefox: decode frames ourselves.
      setEngine("jsqr");
      const { default: jsQR } = await import("jsqr");
      const canvas = canvasRef.current ?? document.createElement("canvas");
      canvasRef.current = canvas;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });

      const tick = () => {
        const v = videoRef.current;
        if (!streamRef.current || !v || !ctx) return;

        if (v.readyState === v.HAVE_ENOUGH_DATA) {
          // Cap the working size: decoding a full 1080p frame every tick is
          // needlessly slow, and QR codes survive the downscale fine.
          const scale = Math.min(1, 640 / (v.videoWidth || 640));
          canvas.width = Math.round(v.videoWidth * scale);
          canvas.height = Math.round(v.videoHeight * scale);
          ctx.drawImage(v, 0, 0, canvas.width, canvas.height);

          const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const found = jsQR(image.data, image.width, image.height, {
            inversionAttempts: "dontInvert",
          });

          if (found?.data && handleHit(found.data)) return;
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      stop();
      const denied =
        err instanceof DOMException &&
        (err.name === "NotAllowedError" || err.name === "SecurityError");
      setError(
        denied
          ? "Camera permission was blocked. Allow it in the address bar, or type the order number below."
          : "Could not open the camera. It may be in use by another app, or this device has none. Type the order number below instead."
      );
    } finally {
      setStarting(false);
    }
  }

  function submitManual(event: React.FormEvent) {
    event.preventDefault();
    const parsed = parseScanCode(manual);
    if (!parsed) {
      setError("That doesn't look like an order number. Example: RO-2026-0001");
      return;
    }
    setError(null);
    setManual("");
    onCode(parsed);
  }

  return (
    <div className="space-y-4">
      {error && <Alert tone="error">{error}</Alert>}

      <div className="relative aspect-4/3 overflow-hidden rounded-2xl bg-ink-900">
        <video
          ref={videoRef}
          playsInline
          muted
          className="size-full object-cover"
        />

        {!scanning && (
          <div className="absolute inset-0 grid place-items-center bg-ink-900/80 px-6 text-center">
            <div>
              <span className="mx-auto grid size-12 place-items-center rounded-full bg-white/10 text-white">
                <Camera className="size-5" aria-hidden />
              </span>
              <p className="mt-3 text-sm font-medium text-white">
                Point the camera at the order QR code
              </p>
              <p className="mt-1 text-xs text-slate-300">
                Works on phone or laptop. The code is on the customer&apos;s
                order page and invoice.
              </p>
              <div className="mt-4">
                <Button
                  type="button"
                  onClick={start}
                  disabled={isBusy}
                  isLoading={starting}
                >
                  {!starting && <Camera className="size-4" aria-hidden />}
                  Start camera
                </Button>
              </div>
            </div>
          </div>
        )}

        {scanning && (
          <>
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="relative size-48 rounded-2xl border-2 border-white/70">
                <ScanLine
                  className="absolute inset-x-0 top-1/2 mx-auto size-10 -translate-y-1/2 text-white/80"
                  aria-hidden
                />
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-ink-900/70 px-4 py-3">
              <span className="inline-flex items-center gap-2 text-xs text-white">
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Scanning
                <span className="text-slate-400">
                  ({engine === "native" ? "fast mode" : "compatibility mode"})
                </span>
              </span>
              <Button type="button" variant="secondary" size="sm" onClick={stop}>
                Stop
              </Button>
            </div>
          </>
        )}
      </div>

      <form onSubmit={submitManual} className="flex items-end gap-2">
        <div className="flex-1">
          <Input
            ref={manualRef}
            label="Or enter the order number"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="RO-2026-0001"
            icon={<Keyboard className="size-4" />}
            hint="A USB or Bluetooth scanner gun also works here."
            className="font-mono uppercase"
          />
        </div>
        <Button type="submit" isLoading={isBusy} disabled={!manual.trim()}>
          Look up
        </Button>
      </form>
    </div>
  );
}
