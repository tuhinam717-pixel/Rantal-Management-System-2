/**
 * Shared view-model types.
 *
 * These are the shapes the UI renders. They deliberately use `number` and
 * `string` rather than Prisma's `Decimal` / `Date`, because those don't survive
 * the server -> client boundary. Server components convert at the edge.
 *
 * OWNERSHIP: this file is shared by all three frontend tracks. Add types, don't
 * rewrite existing ones — someone else's screen is already rendering them.
 */

export type Role = "ADMIN" | "CUSTOMER";

export type RentalUnit = "HOUR" | "DAY" | "WEEK" | "MONTH";

export type OrderStatus =
  | "DRAFT"
  | "CONFIRMED"
  | "READY_FOR_PICKUP"
  | "PICKED_UP"
  | "ACTIVE"
  | "RETURN_DUE"
  | "OVERDUE"
  | "RETURNED"
  | "COMPLETED"
  | "CANCELLED";

export type DepositStatus =
  | "PENDING"
  | "COLLECTED"
  | "HELD"
  | "PARTIALLY_REFUNDED"
  | "REFUNDED"
  | "FORFEITED";

export type PickupStatus = "SCHEDULED" | "IN_TRANSIT" | "COMPLETED" | "MISSED";

export type ReturnStatus =
  | "SCHEDULED"
  | "RECEIVED"
  | "INSPECTED"
  | "COMPLETED"
  | "MISSED";

export type ItemCondition =
  | "GOOD"
  | "DAMAGED"
  | "MISSING_ACCESSORIES"
  | "UNUSABLE";

export type FulfilmentMethod = "DELIVERY" | "STORE_PICKUP";

export interface ProductVariantVM {
  id: string;
  sku: string;
  brand?: string;
  manufacturer?: string;
  colour?: string;
  size?: string;
  stock: number;
}

export interface ProductVM {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description?: string;
  imageUrl?: string;
  category?: string;
  available: number;
  /** Cheapest rate across rental periods, for "from ₹X / day" on cards. */
  fromPrice: number;
  fromUnit: RentalUnit;
  depositAmount: number;
  variants: ProductVariantVM[];
}

export interface RentalPeriodVM {
  id: string;
  name: string;
  unit: RentalUnit;
  duration: number;
  price: number;
}

export interface CartItemVM {
  id: string;
  product: Pick<ProductVM, "id" | "name" | "slug" | "imageUrl">;
  rentalPeriod: RentalPeriodVM;
  quantity: number;
  /** ISO strings. */
  rentalStart: string;
  rentalEnd: string;
  lineTotal: number;
  depositAmount: number;
}

export interface OrderLineVM {
  id: string;
  productName: string;
  imageUrl?: string;
  quantity: number;
  unitPrice: number;
  depositAmount: number;
  lineTotal: number;
}

export interface OrderVM {
  id: string;
  number: string;
  status: OrderStatus;
  fulfilment: FulfilmentMethod;
  customerName: string;
  rentalStart: string;
  rentalEnd: string;
  returnedAt?: string;
  subtotal: number;
  depositTotal: number;
  lateFeeTotal: number;
  total: number;
  lines: OrderLineVM[];
}

export interface DepositVM {
  id: string;
  orderNumber: string;
  customerName: string;
  amount: number;
  deductedAmount: number;
  refundedAmount: number;
  status: DepositStatus;
  transactions: {
    id: string;
    type: "COLLECTION" | "DEDUCTION" | "REFUND";
    amount: number;
    note?: string;
    createdAt: string;
  }[];
}

export interface PickupVM {
  id: string;
  orderNumber: string;
  customerName: string;
  address: string;
  scheduledFor: string;
  status: PickupStatus;
  routeSequence?: number;
  assignedTo?: string;
}

export interface ReturnVM {
  id: string;
  orderNumber: string;
  customerName: string;
  scheduledFor: string;
  receivedAt?: string;
  status: ReturnStatus;
  isLate: boolean;
  hoursOverdue: number;
}

export interface LateFeeVM {
  id: string;
  orderNumber: string;
  customerName: string;
  overdueUnits: number;
  unit: RentalUnit;
  amount: number;
  status: "CALCULATED" | "DEDUCTED_FROM_DEPOSIT" | "INVOICED" | "WAIVED" | "PAID";
}

/** The eight KPI tiles the brief asks for on the operations dashboard. */
export interface DashboardKpisVM {
  activeRentals: number;
  dueToday: number;
  upcomingPickups: number;
  upcomingReturns: number;
  overdueRentals: number;
  rentalRevenue: number;
  depositsHeld: number;
  lateFeesCollected: number;
}

export interface AddressVM {
  id: string;
  label?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}
