import { NextResponse } from "next/server";

import { markOverdueRentals } from "@/server/services/rentals";
import { generateReminders } from "@/server/services/notifications";

/**
 * Daily maintenance run: flag overdue rentals and generate customer reminders.
 *
 * The brief asks for overdue returns to be detected *automatically*; a button
 * an admin has to remember to press is not that. Scheduled by vercel.json.
 *
 * Vercel sends CRON_SECRET as a bearer token. The route refuses to run without
 * it in production so a public URL can't be hammered, but stays open locally
 * where the variable isn't set.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 503 }
    );
  }

  try {
    const overdue = await markOverdueRentals();
    const reminders = await generateReminders();

    return NextResponse.json({
      ok: true,
      ranAt: new Date().toISOString(),
      markedOverdue: overdue,
      reminders,
    });
  } catch (error) {
    console.error("[cron/daily]", error);
    return NextResponse.json(
      { error: "Daily run failed", detail: String(error) },
      { status: 500 }
    );
  }
}
