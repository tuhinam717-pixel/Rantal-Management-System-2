/**
 * Mock data so all three frontend tracks can build screens before the APIs
 * exist. Import these, render them, and swap the import for a real fetch later
 * — the shapes are the same (`src/types`).
 *
 * Dates are fixed ISO strings on purpose: no `new Date()` here, so snapshots
 * and screenshots stay stable.
 */

import type {
  AddressVM,
  CartItemVM,
  DashboardKpisVM,
  DepositVM,
  LateFeeVM,
  OrderVM,
  PickupVM,
  ProductVM,
  RentalPeriodVM,
  ReturnVM,
} from "@/types";

export const mockRentalPeriods: RentalPeriodVM[] = [
  { id: "rp-hour", name: "Hourly", unit: "HOUR", duration: 1, price: 150 },
  { id: "rp-day", name: "Daily", unit: "DAY", duration: 1, price: 900 },
  { id: "rp-week", name: "Weekly", unit: "WEEK", duration: 1, price: 5000 },
  { id: "rp-month", name: "Monthly", unit: "MONTH", duration: 1, price: 16000 },
];

export const mockProducts: ProductVM[] = [
  {
    id: "p-1",
    name: "Canon EOS R5 Camera Kit",
    slug: "canon-eos-r5-kit",
    sku: "CAM-R5-001",
    description:
      "45MP full-frame mirrorless body with 24-105mm lens, two batteries and a carry case.",
    category: "Photography",
    available: 4,
    fromPrice: 900,
    fromUnit: "DAY",
    depositAmount: 15000,
    variants: [
      {
        id: "v-1",
        sku: "CAM-R5-001-BLK",
        brand: "Canon",
        manufacturer: "Canon Inc.",
        colour: "Black",
        size: "Body + 24-105mm",
        stock: 4,
      },
    ],
  },
  {
    id: "p-2",
    name: "DJI Ronin 4D Gimbal",
    slug: "dji-ronin-4d",
    sku: "GIM-R4D-002",
    description: "4-axis stabilised cinema camera system with LiDAR focusing.",
    category: "Photography",
    available: 2,
    fromPrice: 2500,
    fromUnit: "DAY",
    depositAmount: 40000,
    variants: [
      {
        id: "v-2",
        sku: "GIM-R4D-002-GRY",
        brand: "DJI",
        manufacturer: "SZ DJI Technology",
        colour: "Grey",
        size: "6K",
        stock: 2,
      },
    ],
  },
  {
    id: "p-3",
    name: "Scaffolding Tower (6m)",
    slug: "scaffolding-tower-6m",
    sku: "CON-SCF-003",
    description: "Aluminium mobile access tower, 6 metre working height.",
    category: "Construction",
    available: 0,
    fromPrice: 1200,
    fromUnit: "DAY",
    depositAmount: 8000,
    variants: [
      {
        id: "v-3",
        sku: "CON-SCF-003-6M",
        brand: "Youngman",
        manufacturer: "Youngman Group",
        colour: "Silver",
        size: "6m",
        stock: 0,
      },
    ],
  },
  {
    id: "p-4",
    name: "Round Banquet Table (10 seat)",
    slug: "banquet-table-10",
    sku: "EVT-TBL-004",
    description: "1.8m round folding banquet table, seats ten.",
    category: "Events",
    available: 45,
    fromPrice: 300,
    fromUnit: "DAY",
    depositAmount: 1000,
    variants: [
      {
        id: "v-4",
        sku: "EVT-TBL-004-WHT",
        brand: "Lifetime",
        manufacturer: "Lifetime Products",
        colour: "White",
        size: "1.8m",
        stock: 45,
      },
    ],
  },
];

export const mockCartItems: CartItemVM[] = [
  {
    id: "ci-1",
    product: {
      id: "p-1",
      name: "Canon EOS R5 Camera Kit",
      slug: "canon-eos-r5-kit",
    },
    rentalPeriod: mockRentalPeriods[1],
    quantity: 1,
    rentalStart: "2026-08-14T10:00:00.000Z",
    rentalEnd: "2026-08-17T10:00:00.000Z",
    lineTotal: 2700,
    depositAmount: 15000,
  },
  {
    id: "ci-2",
    product: {
      id: "p-4",
      name: "Round Banquet Table (10 seat)",
      slug: "banquet-table-10",
    },
    rentalPeriod: mockRentalPeriods[1],
    quantity: 6,
    rentalStart: "2026-08-14T10:00:00.000Z",
    rentalEnd: "2026-08-16T10:00:00.000Z",
    lineTotal: 3600,
    depositAmount: 6000,
  },
];

export const mockOrders: OrderVM[] = [
  {
    id: "o-1",
    number: "RO-2026-0041",
    status: "ACTIVE",
    fulfilment: "DELIVERY",
    customerName: "Demo Customer",
    rentalStart: "2026-08-01T09:00:00.000Z",
    rentalEnd: "2026-08-09T09:00:00.000Z",
    subtotal: 7200,
    depositTotal: 15000,
    lateFeeTotal: 0,
    total: 22200,
    lines: [
      {
        id: "ol-1",
        productName: "Canon EOS R5 Camera Kit",
        quantity: 1,
        unitPrice: 900,
        depositAmount: 15000,
        lineTotal: 7200,
      },
    ],
  },
  {
    id: "o-2",
    number: "RO-2026-0038",
    status: "OVERDUE",
    fulfilment: "STORE_PICKUP",
    customerName: "Ravi Sharma",
    rentalStart: "2026-07-25T09:00:00.000Z",
    rentalEnd: "2026-08-05T09:00:00.000Z",
    subtotal: 13200,
    depositTotal: 8000,
    lateFeeTotal: 1500,
    total: 22700,
    lines: [
      {
        id: "ol-2",
        productName: "Scaffolding Tower (6m)",
        quantity: 1,
        unitPrice: 1200,
        depositAmount: 8000,
        lineTotal: 13200,
      },
    ],
  },
  {
    id: "o-3",
    number: "RO-2026-0030",
    status: "COMPLETED",
    fulfilment: "DELIVERY",
    customerName: "Anita Desai",
    rentalStart: "2026-07-10T09:00:00.000Z",
    rentalEnd: "2026-07-14T09:00:00.000Z",
    returnedAt: "2026-07-14T08:10:00.000Z",
    subtotal: 1200,
    depositTotal: 1000,
    lateFeeTotal: 0,
    total: 2200,
    lines: [
      {
        id: "ol-3",
        productName: "Round Banquet Table (10 seat)",
        quantity: 4,
        unitPrice: 300,
        depositAmount: 1000,
        lineTotal: 1200,
      },
    ],
  },
];

export const mockPickups: PickupVM[] = [
  {
    id: "pk-1",
    orderNumber: "RO-2026-0044",
    customerName: "Meera Iyer",
    address: "12 MG Road, Bengaluru 560001",
    scheduledFor: "2026-08-08T09:30:00.000Z",
    status: "SCHEDULED",
    routeSequence: 1,
    assignedTo: "Team A",
  },
  {
    id: "pk-2",
    orderNumber: "RO-2026-0045",
    customerName: "Karan Mehta",
    address: "45 Residency Road, Bengaluru 560025",
    scheduledFor: "2026-08-08T11:00:00.000Z",
    status: "IN_TRANSIT",
    routeSequence: 2,
    assignedTo: "Team A",
  },
];

export const mockReturns: ReturnVM[] = [
  {
    id: "rt-1",
    orderNumber: "RO-2026-0041",
    customerName: "Demo Customer",
    scheduledFor: "2026-08-09T09:00:00.000Z",
    status: "SCHEDULED",
    isLate: false,
    hoursOverdue: 0,
  },
  {
    id: "rt-2",
    orderNumber: "RO-2026-0038",
    customerName: "Ravi Sharma",
    scheduledFor: "2026-08-05T09:00:00.000Z",
    status: "SCHEDULED",
    isLate: true,
    hoursOverdue: 74,
  },
];

export const mockDeposits: DepositVM[] = [
  {
    id: "d-1",
    orderNumber: "RO-2026-0041",
    customerName: "Demo Customer",
    amount: 15000,
    deductedAmount: 0,
    refundedAmount: 0,
    status: "HELD",
    transactions: [
      {
        id: "dt-1",
        type: "COLLECTION",
        amount: 15000,
        note: "Collected at confirmation",
        createdAt: "2026-08-01T09:05:00.000Z",
      },
    ],
  },
  {
    id: "d-2",
    orderNumber: "RO-2026-0030",
    customerName: "Anita Desai",
    amount: 1000,
    deductedAmount: 0,
    refundedAmount: 1000,
    status: "REFUNDED",
    transactions: [
      {
        id: "dt-2",
        type: "COLLECTION",
        amount: 1000,
        createdAt: "2026-07-10T09:02:00.000Z",
      },
      {
        id: "dt-3",
        type: "REFUND",
        amount: 1000,
        note: "Returned on time, full refund",
        createdAt: "2026-07-14T08:20:00.000Z",
      },
    ],
  },
];

export const mockLateFees: LateFeeVM[] = [
  {
    id: "lf-1",
    orderNumber: "RO-2026-0038",
    customerName: "Ravi Sharma",
    overdueUnits: 3,
    unit: "DAY",
    amount: 1500,
    status: "CALCULATED",
  },
];

export const mockKpis: DashboardKpisVM = {
  activeRentals: 18,
  dueToday: 5,
  upcomingPickups: 7,
  upcomingReturns: 9,
  overdueRentals: 3,
  rentalRevenue: 482500,
  depositsHeld: 196000,
  lateFeesCollected: 12400,
};

export const mockAddresses: AddressVM[] = [
  {
    id: "a-1",
    label: "Home",
    line1: "221B Baker Street",
    city: "Bengaluru",
    state: "Karnataka",
    postalCode: "560001",
    country: "India",
    isDefault: true,
  },
  {
    id: "a-2",
    label: "Office",
    line1: "Tower B, Prestige Tech Park",
    line2: "Marathahalli",
    city: "Bengaluru",
    state: "Karnataka",
    postalCode: "560103",
    country: "India",
    isDefault: false,
  },
];
