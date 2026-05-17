# QNB IPO Management System

A full-featured IPO (Initial Public Offering) subscription management system for Egyptian bank branches. Bilingual Arabic/English with RTL/LTR switching and a Deep Teal (#0f766e) theme.

## Run & Operate

- `pnpm --filter @workspace/qnb-ipo run dev` — run the web app (via workflow)
- `pnpm --filter @workspace/qnb-ipo run typecheck` — typecheck the app
- Login: username `admin`, password `12345678`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- React + Vite + Tailwind v4 + shadcn/ui + lucide-react
- All app logic in `artifacts/qnb-ipo/src/`

## Where things live

- `artifacts/qnb-ipo/src/App.tsx` — main application (~2680 lines); all roles, routing, state
- `artifacts/qnb-ipo/src/context/lang.tsx` — `Lang`, `T` (full AR+EN translations), `LangContext`, `useLang`
- `artifacts/qnb-ipo/src/data/ipoStocks.ts` — `IPOStock` interface + `INITIAL_IPO_STOCKS` (ADIB Egypt, Edita)
- `artifacts/qnb-ipo/src/components/IPOStockSetup.tsx` — reusable IPO stock management UI (used by SystemAdmin, FrontOffice, BackOffice)
- `artifacts/qnb-ipo/src/index.css` — Deep Teal theme CSS variables

## Architecture decisions

- **Language context extracted**: All AR/EN translation strings live in `context/lang.tsx` and are imported wherever needed — not duplicated inline in App.tsx.
- **IPO stock data extracted**: `IPOStock` interface (including `pricePerShare: number`) and seed data live in `data/ipoStocks.ts`; state is lifted to the root `IPOSystem` component and passed down as props.
- **IPOStockSetup component**: Shared component with a `readOnly` prop — SystemAdmin sees the full editable version, FrontOffice and BackOffice see a read-only view. Shows `pricePerShare` on each stock card.
- **Subscription interface**: Includes `ipoId: string`, `date: string`, and `phase: "covered" | "uncovered"` — always include all three when creating new subscriptions.
- **BrokerBatch interface**: Lives in App.tsx. Includes `phase: "covered" | "uncovered"`. Broker CSV submissions create a `BrokerBatch` object that flows: FrontOffice → IPOSystem (`brokerBatches` state) → SupervisorChecker (Broker Batches tab) → Dashboard (financial totals).
- **Phase pool tagging**: When FrontOffice creates a subscription or broker batch, `phase` is set from `activeStock.phase` (or selected IPO's phase for broker). The branch always submits into the currently active pool — Covered or Uncovered — matching the IPO stock's current phase.
- **FrontOffice phase banner**: A prominent amber (covered) / green (uncovered) banner appears at the top of the subscriptions tab clearly showing which pool is active for the current IPO stock.
- **Supervisor phase filter**: SupervisorChecker has a phase filter row (All / Covered / Uncovered) on both the Subscriptions and Broker Batches tabs. Each subscription row has a phase badge; each broker batch card also shows a phase badge.
- **Broker CSV format**: columns — ClientName, IPOName, UnifiedCode, Qty, Cost, Date (6 columns).
- **Broker FIX flow**: After CSV review → Generate FIX Message (FIX 4.2 per client, shown in pre block with copy button) → Submit for Review.
- **Dashboard filtering**: Stats filtered by `activeStockId`. Subscriptions with `s.ipoId === activeStockId`; broker batches with `b.ipoId === activeStockId`. Financial totals include broker batch costs.
- **No `Search` lucide icon**: It causes a runtime error; use `SearchIcon` or omit search icons.
- **No nested `<button>`**: Avoid nesting `<button>` inside `<button>` — causes React hydration warnings.

## Product

Five user roles accessible from the dashboard:
- **Front Office (Branch)**: New subscriptions, KYC, IPO stock overview
- **Supervisor/Checker**: Approve/reject subscriptions and KYC records
- **Back Office (Clearing)**: MCDR upload, allocation, refunds, reconciliation, IPO stock overview
- **Communications**: Customer communication templates
- **System Admin**: User management, groups, audit logs, IPO stock setup

## User preferences

- Deep Teal theme (#0f766e) throughout
- Bilingual AR/EN with RTL/LTR switching via header toggle
- Statistical dashboard as the home screen after login
- Egyptian bank branch context (EGX securities, ISIN format EGSxxxxxxx)

## Gotchas

- Do NOT use the `Search` lucide-react icon — it causes a runtime error
- Do NOT nest `<button>` inside `<button>`
- All translations must be added to BOTH `ar` and `en` objects in `context/lang.tsx`
- `Subscription` interface requires `ipoId`, `date`, AND `phase` — always include all three when creating new subscriptions
- `BrokerBatch` requires `phase: "covered" | "uncovered"` — set from `stock.phase` at submission time
- `BrokerBatch.status` type is `"Pending Review" | "Approved" | "Rejected"` (not the SubStatus union)
- Run `pnpm --filter @workspace/qnb-ipo run typecheck` to verify before shipping

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
