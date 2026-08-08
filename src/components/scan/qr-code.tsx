import QRCode from "qrcode";

import { buildScanCode } from "@/lib/rental/scan-code";
import { cn } from "@/lib/utils";

/**
 * Server-rendered QR for an order. Renders as inline SVG rather than a data
 * URI so it stays crisp at any size and prints cleanly on the invoice.
 */
export async function OrderQrCode({
  orderNumber,
  size = 160,
  className,
}: {
  orderNumber: string;
  size?: number;
  className?: string;
}) {
  const svg = await QRCode.toString(buildScanCode(orderNumber), {
    type: "svg",
    margin: 1,
    // High correction so a scuffed or partly covered label still scans.
    errorCorrectionLevel: "H",
    color: { dark: "#114537", light: "#ffffff" },
  });

  return (
    <div className={cn("inline-flex flex-col items-center gap-2", className)}>
      <div
        className="rounded-xl bg-white p-2 ring-1 ring-line"
        style={{ width: size, height: size }}
        // qrcode returns a self-contained <svg>; sizing comes from the wrapper.
        dangerouslySetInnerHTML={{
          __html: svg.replace("<svg", '<svg style="width:100%;height:100%"'),
        }}
      />
      <span className="font-mono text-xs text-ink-500">{orderNumber}</span>
    </div>
  );
}
