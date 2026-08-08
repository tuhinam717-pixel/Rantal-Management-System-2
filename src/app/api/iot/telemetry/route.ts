import { NextResponse } from "next/server";
import { z } from "zod";

import { recordTelemetry } from "@/server/services/assets";

/**
 * Telemetry ingest for asset trackers.
 *
 * Any device that can make an HTTPS request works — no vendor SDK. Auth is a
 * shared bearer token in IOT_INGEST_KEY; the route refuses to run without it in
 * production so a public URL can't be used to forge positions, but stays open
 * locally where the variable isn't set.
 *
 *   curl -X POST https://<host>/api/iot/telemetry \
 *     -H "Authorization: Bearer $IOT_INGEST_KEY" \
 *     -H "Content-Type: application/json" \
 *     -d '{"deviceId":"TRK-0001","latitude":19.076,"longitude":72.877,"batteryPct":84}'
 */
const telemetrySchema = z.object({
  deviceId: z.string().min(1),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  batteryPct: z.number().int().min(0).max(100).optional(),
});

export async function POST(request: Request) {
  const secret = process.env.IOT_INGEST_KEY;

  if (secret) {
    if (request.headers.get("authorization") !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "IOT_INGEST_KEY is not configured" },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }

  const parsed = telemetrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 }
    );
  }

  try {
    const tracker = await recordTelemetry(parsed.data);

    if (!tracker) {
      return NextResponse.json(
        { error: `Unknown device ${parsed.data.deviceId}. Pair it first.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      deviceId: tracker.deviceId,
      recordedAt: tracker.lastSeenAt,
    });
  } catch (error) {
    console.error("[iot/telemetry]", error);
    return NextResponse.json({ error: "Ingest failed" }, { status: 500 });
  }
}
