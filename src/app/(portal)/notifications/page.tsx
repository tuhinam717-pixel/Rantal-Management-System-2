import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  ShieldCheck,
  Truck,
} from "lucide-react";

import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { MarkAllRead } from "@/components/portal/mark-all-read";
import { requireUser } from "@/lib/auth/current-user";
import { getNotifications } from "@/server/services/notifications";
import { cn, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Notifications" };

const KIND: Record<
  string,
  { Icon: typeof Bell; tone: BadgeTone; label: string }
> = {
  RETURN_DUE_SOON: {
    Icon: CalendarClock,
    tone: "warning",
    label: "Return due",
  },
  RETURN_OVERDUE: { Icon: AlertTriangle, tone: "danger", label: "Overdue" },
  PICKUP_TOMORROW: { Icon: Truck, tone: "brand", label: "Pickup" },
  DEPOSIT_REFUNDED: {
    Icon: ShieldCheck,
    tone: "success",
    label: "Deposit",
  },
};

export default async function NotificationsPage() {
  const user = await requireUser();
  const notifications = await getNotifications(user.id);
  const unread = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Notifications"
        description={
          unread > 0
            ? `${unread} unread`
            : "Reminders about your pickups, returns and deposits."
        }
        actions={unread > 0 ? <MarkAllRead /> : undefined}
      />

      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Nothing to catch up on"
          description="We'll remind you before a return is due, and again if it goes overdue."
        />
      ) : (
        <ul className="space-y-3">
          {notifications.map((notification) => {
            const kind = KIND[notification.kind] ?? {
              Icon: Bell,
              tone: "neutral" as BadgeTone,
              label: "Update",
            };

            return (
              <li key={notification.id}>
                <Card
                  className={cn(
                    "p-5",
                    !notification.readAt && "border-brand-300 bg-brand-50/40"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-100 text-brand-700">
                      <kind.Icon className="size-4" aria-hidden />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-ink-900">
                          {notification.title}
                        </p>
                        <Badge tone={kind.tone}>{kind.label}</Badge>
                        {!notification.readAt && (
                          <span className="size-2 rounded-full bg-brand-600" />
                        )}
                      </div>

                      <p className="mt-1 text-sm text-ink-700">
                        {notification.body}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <span className="text-xs text-ink-500">
                          {formatDate(notification.createdAt)}
                        </span>
                        {notification.orderId && (
                          <Link
                            href={`/orders/${notification.orderId}`}
                            className="text-xs font-medium text-brand-700 hover:text-brand-800"
                          >
                            View rental
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
