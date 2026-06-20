# POS Feature Log

Last updated: June 19, 2026

## Current App Surface

The web POS currently ships four main screens from the shared Vue core:

- `Register` at `/`
- `Orders` at `/orders`
- `Analytics` at `/analytics`
- `Settings` at `/settings`

The app is built from a shared architecture using:

- Vue 3
- Vite
- Pinia
- Vue Router
- A shared `packages/core`, `packages/data`, and `packages/shared` structure

## Implemented Features

### Register / Checkout

- Product catalog with category tabs
- Search by product name, SKU, or barcode
- Business-mode-aware catalog filtering
  - `coffee-shop`
  - `grocery`
- Product cards with placeholder product photos
- Add-to-cart flow from the product grid
- Quantity increment/decrement in the order panel
- Remove line item from cart
- Clear full cart
- Order type support
  - `takeaway`
  - `dine_in`
- Tax calculation using shared `calculateTax`
- Live subtotal, tax, and total calculation
- Payment sheet modal
- Payment method support
  - `cash`
  - `card`
  - `ewallet`
- Numeric keypad for cash tendering
- Change calculation for cash payments
- Complete order flow with local persistence
- Success banner after payment capture

### Orders

- Recent orders list
- Empty state when there are no completed orders
- Sales summary cards
  - Gross sales
  - Average ticket
  - Cash vs digital order counts
- Order history with:
  - Ticket number
  - Created time
  - Payment method
  - Ordered items summary
  - Business mode badge
  - Total amount

### Analytics

- Business analytics screen implementing the first pass of `analytics.md`
- Reporting cards for:
  - Gross sales
  - Tax collected
  - Average order value
  - Items per order
- Payment mix summary
- Top product summary
- Sales by category
- Hourly sales buckets
- Product telemetry visibility
- Pending app event count
- Telemetry event breakdown
- Latest captured event payload view

### Settings

- Business mode selector
- Sync mode selector
- Toggle for total animation
- Toggle for telemetry collection
- Local settings persistence
- Save-state feedback message
- Preview cards for business profile and sync behavior

## Local Data / Offline Foundation

### Local Persistence

The browser implementation currently persists data using `localStorage` through the shared repository layer.

Persisted locally:

- Orders
- Settings
- App telemetry events
- Generated device ID

### Shared Repository Support

The `packages/data` layer currently supports:

- `loadCatalog`
- `loadOrders`
- `saveOrder`
- `loadSettings`
- `saveSettings`
- `loadAppEvents`
- `trackAppEvent`

## Telemetry Implemented So Far

App telemetry events currently captured:

- `cart_search_used`
- `product_added`
- `cart_cleared`
- `payment_sheet_opened`
- `payment_method_selected`
- `order_completed`
- `settings_saved`

Telemetry is stored locally in an `app_events`-style structure and surfaced in the Analytics screen.

## Product / Catalog Data

The seeded demo catalog currently includes:

- Coffee items
- Tea items
- Pastry items
- Cold drinks
- Grocery staples
- Produce
- Dairy
- Snacks

Additional seeded data support:

- Category IDs
- SKUs
- Barcodes
- Tax rates
- Business-mode mapping
- Weighted products for grocery use cases
- Placeholder product images and attribution URLs

## UI / Design Work Implemented

Based on `design.md`, the app currently includes:

- Apple-inspired light visual language
- Shared design tokens
- Rounded surfaces and softened panels
- Large signature total styling
- Responsive two-pane layout
- Bottom-sheet-style payment flow
- Mobile-friendly controls and spacing
- Tabular numeric formatting for monetary values

## What Is Still Placeholder or Incomplete

### Platform Targets

- `apps/web` is the only runnable target today
- `apps/mobile` is still a placeholder shell
- `apps/desktop` is still a placeholder shell

### Storage / Sync

- Browser persistence uses `localStorage`, not SQLite yet
- No real `sync_outbox` push/pull implementation yet
- No Laravel or server sync integration yet
- No PowerSync integration yet

### POS Back-Office / Reporting Gaps

- No X report or Z report yet
- No shift open/close flow yet
- No cash reconciliation yet
- No voids/refunds tracking yet
- No discounts tracking yet
- No product cost / margin reporting yet
- No low-stock event tracking yet
- No printable report exports yet

### Hardware / Platform Integration Gaps

- No receipt printer integration yet
- No barcode scanner integration yet
- No camera scanning yet
- No cash drawer integration yet
- No Electron IPC layer yet
- No Capacitor plugins wired yet

### Payments / Commerce Gaps

- No external card processor integration
- No GCash or Maya QR integration
- No licensing or activation flow yet

### Telemetry / Observability Gaps

- No Sentry integration yet
- No PostHog integration yet
- No event sync to backend yet
- No telemetry opt-in policy UI beyond local toggle
- No performance timing instrumentation yet

## Notes

- The current app is a working offline-first prototype foundation for the web target.
- Analytics and telemetry are implemented locally first, matching the architecture direction in `analytics.md`.
- The feature set is already broad enough to continue into shift reporting, SQLite migration, and sync implementation next.
