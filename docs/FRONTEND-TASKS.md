# Frontend tasks — small tickets

Auth, folder structure, database and both app shells are already done. What's
left is screens.

**Each ticket below is one file.** Pick a number, build that one file, push.
Most are 1–3 hours. Nobody needs to understand the whole project.

## Before you start

```bash
git pull
npm install
npm run dev
```

Then read these two files once — everything you need is in them:

- `src/types/index.ts` — the data shapes (what a product/order/pickup looks like)
- `src/lib/mocks.ts` — fake data to render. **No backend needed.**

Copy the styling from an existing page so it all looks the same:
`src/app/(admin)/admin/dashboard/page.tsx` is the simplest example.

Reuse these, don't rebuild them: `Button`, `Input`, `Alert` from
`src/components/ui/`.

---

## A. Customer portal — shopping

| # | Task | File to create | Use mock | What to build | Time |
|---|---|---|---|---|---|
| A1 | Product card | `src/components/products/product-card.tsx` | — | One card: image box, name, category, "from ₹900/day", deposit line, "Out of stock" badge when `available === 0`. Takes a `ProductVM` prop. | 1h |
| A2 | Catalogue page | `src/app/(portal)/products/page.tsx` | `mockProducts` | Grid of A1 cards, 3 per row on desktop, 1 on mobile. Page heading + count. | 1h |
| A3 | Category filter | `src/components/products/category-filter.tsx` | `mockProducts` | Row of filter pills (All / Photography / Construction / Events). Highlight the active one. | 1h |
| A4 | Product detail | `src/app/(portal)/products/[slug]/page.tsx` | `mockProducts` | Big image, name, description, price table for all 4 rental periods, deposit amount, quantity, "Add to cart" button. | 3h |
| A5 | Variant picker | `src/components/products/variant-picker.tsx` | `mockProducts` | Buttons for brand / colour / size from `product.variants`. Selected one highlighted. | 2h |
| A6 | Date range picker | `src/components/products/date-range.tsx` | — | Two `<input type="date">` — start and end. Show "3 days" underneath. Block past dates. | 2h |
| A7 | Cart page | `src/app/(portal)/cart/page.tsx` | `mockCartItems` | Item rows (image, name, dates, qty, price), remove button, and a summary box: **Rent total** and **Security deposit** on separate lines, then grand total. | 3h |
| A8 | Checkout page | `src/app/(portal)/checkout/page.tsx` | `mockCartItems`, `mockAddresses` | Two radio options: "Deliver to address" (pick from list) or "Collect from store". Below it a card form. Right side: order summary. | 3h |
| A9 | Success page | `src/app/(portal)/checkout/success/page.tsx` | — | Green tick, "Order confirmed", order number `RO-2026-0046`, "Download invoice" button, "View my rentals" link. | 1h |

## B. Customer portal — account

| # | Task | File to create | Use mock | What to build | Time |
|---|---|---|---|---|---|
| B1 | Status badge | `src/components/orders/status-badge.tsx` | — | Coloured pill for each `OrderStatus`. Active = blue, Overdue = red, Completed = green, Cancelled = grey. Used by B2 and C2. | 1h |
| B2 | My rentals list | `src/app/(portal)/orders/page.tsx` | `mockOrders` | Table/card list: order number, product, dates, B1 badge, total. Click → detail. | 2h |
| B3 | Order detail | `src/app/(portal)/orders/[id]/page.tsx` | `mockOrders` | Items, dates, and a money box: rent, deposit, late fee, total. Show "Deposit held" / "Deposit refunded". | 3h |
| B4 | Order timeline | `src/components/orders/order-timeline.tsx` | `mockOrders` | Vertical steps: Confirmed → Picked up → Active → Returned → Completed. Tick the done ones. | 2h |
| B5 | Invoice page | `src/app/(portal)/orders/[id]/invoice/page.tsx` | `mockOrders` | Printable invoice: company header, customer, line items, rent + deposit + late fee, total. Add a print button. | 3h |
| B6 | Profile page | `src/app/(portal)/profile/page.tsx` | — | Avatar circle with "Change photo" button, name / email / phone fields, Save button. | 2h |
| B7 | Address book | `src/app/(portal)/profile/addresses/page.tsx` | `mockAddresses` | Address cards, "Default" tag on one, Edit / Delete / Add new buttons. | 2h |

## C. Admin — operations

| # | Task | File to create | Use mock | What to build | Time |
|---|---|---|---|---|---|
| C1 | KPI tile | `src/components/dashboard/kpi-tile.tsx` | — | Small card: label, big number, icon. Money tiles use `formatCurrency` from `src/lib/utils.ts`. | 1h |
| C2 | Dashboard | `src/app/(admin)/admin/dashboard/page.tsx` | `mockKpis` | Replace the placeholder tiles with 8 real C1 tiles: Active Rentals, Due Today, Upcoming Pickups, Upcoming Returns, Overdue Rentals, Revenue, Deposits Held, Late Fees. | 2h |
| C3 | Orders table | `src/app/(admin)/admin/orders/page.tsx` | `mockOrders` | Table: number, customer, dates, B1 badge, total. Red row tint when status is `OVERDUE`. | 2h |
| C4 | Pickup schedule | `src/app/(admin)/admin/pickups/page.tsx` | `mockPickups` | Today's pickups sorted by `routeSequence`, showing time, customer, address, assigned team, "Confirm pickup" button. | 3h |
| C5 | Return schedule | `src/app/(admin)/admin/returns/page.tsx` | `mockReturns` | Today's returns. If `isLate`, show a red "Late by 74h" chip. | 2h |
| C6 | Inspection form | `src/app/(admin)/admin/returns/inspection/page.tsx` | `mockReturns` | Radio: Good / Damaged / Missing accessories / Unusable. Damage note textarea, "Repair required" checkbox, damage charge input. | 3h |
| C7 | Deposits list | `src/app/(admin)/admin/deposits/page.tsx` | `mockDeposits` | Table: order, customer, amount, deducted, refunded, status pill. | 2h |
| C8 | Deposit ledger | `src/components/deposits/deposit-ledger.tsx` | `mockDeposits` | Timeline of `transactions` — Collection (green +), Deduction (red −), Refund (blue). | 2h |
| C9 | Late fees list | `src/app/(admin)/admin/late-fees/page.tsx` | `mockLateFees` | Table: order, customer, "3 days overdue", amount, status. | 2h |
| C10 | Late fee rule form | `src/app/(admin)/admin/late-fees/rules/page.tsx` | — | Form: charge per Hour/Day/Week/Month dropdown, amount, grace hours, max cap. | 2h |

## D. Admin — masters

| # | Task | File to create | Use mock | What to build | Time |
|---|---|---|---|---|---|
| D1 | Products table | `src/app/(admin)/admin/products/page.tsx` | `mockProducts` | Table: image, name, SKU, category, stock, deposit. "Add product" button. | 2h |
| D2 | Product form | `src/app/(admin)/admin/products/new/page.tsx` | — | Form: name, SKU, description, category, stock, deposit type (Fixed / Percentage) + value. | 3h |
| D3 | Variant table | `src/app/(admin)/admin/products/variants/page.tsx` | `mockProducts` | Table of Brand / Manufacturer / Colour / Size / Stock with an "Add variant" row. | 2h |
| D4 | Pricelists page | `src/app/(admin)/admin/pricelists/page.tsx` | `mockRentalPeriods` | List of pricelists, one tagged **Default**. Others show validity dates. | 2h |
| D5 | Price grid | `src/components/pricelists/price-grid.tsx` | `mockProducts`, `mockRentalPeriods` | Table: products down the side, Hourly/Daily/Weekly/Monthly across the top, price input in each cell. | 3h |
| D6 | Rental periods | `src/app/(admin)/admin/rental-periods/page.tsx` | `mockRentalPeriods` | List of the 4 periods with an active/inactive toggle. | 1h |
| D7 | Quotations list | `src/app/(admin)/admin/quotations/page.tsx` | — | Table: number, customer, status (Draft/Sent/Confirmed/Cancelled), total, valid until. | 2h |
| D8 | Quotation builder | `src/app/(admin)/admin/quotations/new/page.tsx` | `mockProducts` | Pick customer, add product lines, live totals with a separate deposit line, "Confirm" button. | 3h |
| D9 | Template editor | `src/app/(admin)/admin/quotations/templates/page.tsx` | — | Three textareas: header, footer, terms. Preview box on the right. | 2h |
| D10 | Settings page | `src/app/(admin)/admin/settings/page.tsx` | — | Company name, currency, default deposit type + value, grace hours, quotation validity days. | 2h |

---

## 4 rules that matter

Get these wrong and the screens are wrong, so read them once:

1. **Rent and deposit are always separate amounts.** Never add them into one
   "total" without showing the split first.
2. Deposit is either a **fixed amount** or a **percentage**.
3. Return **on time → full deposit back**, nothing deducted.
4. Return **late → penalty deducted from the deposit**, the rest refunded in cash.

## Pushing your work

```bash
git checkout -b feat/a2-catalogue     # your ticket number
npm run typecheck                     # must pass before you push
git add . && git commit -m "A2: product catalogue page"
git push -u origin feat/a2-catalogue
```

One branch per ticket. Only touch the file in your row — that way nobody gets
merge conflicts.

**Order to build in:** A1 before A2, B1 before B2/C3, C1 before C2. Everything
else can be done in any order, by anyone, at the same time.
