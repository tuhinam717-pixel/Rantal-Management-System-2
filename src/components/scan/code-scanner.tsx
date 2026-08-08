"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Keyboard, Loader2 } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseScanCode } from "@/lib/rental/scan-code";

/** Minimal shape of the BarcodeDetector API we rely on. */
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
 * Uses the native BarcodeDetector where it exists (Chrome/Edge on desktop and
 * Android). Safari and Firefox don't ship it, and camera access needs HTTPS,
 * so manual entry is always available rather than being a dead end.
 */
export function CodeScanner({
  onCode,
  isBusy = false,
}: {
  onCode: (orderNumber: string) => void;
  isBusy?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => setSupported(getDetectorCtor() !== null), []);

  const stop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  useEffect(() => stop, [stop]);

  async function start() {
    setError(null);

    const Detector = getDetectorCtor();
    if (!Detector) {
      setError(
        "This browser has no barcode support. Use Chrome or Edge, or type the order number below."
      );
      return;
    }

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

      const detector = new Detector({ formats: ["qr_code", "code_128"] });

      const tick = async () => {
        if (!streamRef.current || !videoRef.current) return;
        try {
          const results = await detector.detect(videoRef.current);
          const hit = results
            .map((r) => parseScanCode(r.rawValue))
            .find((v): v is string => Boolean(v));

          if (hit) {
            stop();
            onCode(hit);
            return;
          }
        } catch {
          // A frame can fail to decode; keep going rather than tearing down.
        }
        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    } catch {
      stop();
      setError(
        "Could not open the camera. Check the browser's camera permission, or type the order number below."
      );
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
          <div className="absolute inset-0 grid place-items-center bg-ink-900/80 text-center">
            <div>
              <span className="mx-auto grid size-12 place-items-center rounded-full bg-white/10 text-white">
                {supported === false ? (
                  <CameraOff className="size-5" aria-hidden />
                ) : (
                  <Camera className="size-5" aria-hidden />
                )}
              </span>
              <p className="mt-3 text-sm font-medium text-white">
                {supported === false
                  ? "Camera scanning not supported here"
                  : "Point the camera at the order QR code"}
              </p>
              <p className="mt-1 text-xs text-slate-300">
                {supported === false
                  ? "Type the order number below instead."
                  : "The code is on the invoice and the order page."}
              </p>
              {supported !== false && (
                <div className="mt-4">
                  <Button type="button" onClick={start} disabled={isBusy}>
                    <Camera className="size-4" aria-hidden />
                    Start camera
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {scanning && (
          <>
            {/* Framing guide */}
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="size-48 rounded-2xl border-2 border-white/70" />
            </div>
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-ink-900/70 px-4 py-3">
              <span className="inline-flex items-center gap-2 text-xs text-white">
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Scanning...
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
            label="Or enter the order number"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="RO-2026-0001"
            icon={<Keyboard className="size-4" />}
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
