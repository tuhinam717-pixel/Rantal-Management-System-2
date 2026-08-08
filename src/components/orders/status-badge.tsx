import { Badge, type BadgeTone } from "@/components/ui/badge";
import type { OrderStatus } from "@/types";

const STATUS: Record<OrderStatus, { label: string; tone: BadgeTone }> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  CONFIRMED: { label: "Confirmed", tone: "brand" },
  READY_FOR_PICKUP: { label: "Ready for pickup", tone: "info" },
  PICKED_UP: { label: "Picked up", tone: "info" },
  ACTIVE: { label: "Active", tone: "info" },
  RETURN_DUE: { label: "Return due", tone: "warning" },
  OVERDUE: { label: "Overdue", tone: "danger" },
  RETURNED: { label: "Returned", tone: "success" },
  COMPLETED: { label: "Completed", tone: "success" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const { label, tone } = STATUS[status];
  return <Badge tone={tone}>{label}</Badge>;
}
