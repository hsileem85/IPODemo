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
- **IPO stock data extracted**: `IPOStock` interface and seed data live in `data/ipoStocks.ts`; state is lifted to the root `IPOSystem` component and passed down as props.
- **IPOStockSetup component**: Shared component with a `readOnly` prop — SystemAdmin sees the full editable version, FrontOffice and BackOffice see a read-only view.
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
- Run `pnpm --filter @workspace/qnb-ipo run typecheck` to verify before shipping

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
