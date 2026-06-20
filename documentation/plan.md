# Offline-First POS System — Overall Build Plan

> Multi-business point-of-sale (coffee shop, small grocery, and beyond).
> One Vue codebase shipped to mobile, desktop, and web. Works fully offline; syncs when online.
> Plan date: June 2026. Tooling versions reflect the current 2026 ecosystem.

---

## 1. Goals & Principles

- **Offline-first.** The device is the source of truth for its own transactions. The app never blocks on the network; a dropped connection never loses a sale.
- **One codebase, three targets.** A single Vue 3 application runs as a mobile app (Capacitor), a desktop app (Electron), and an installable web app (PWA).
- **Mobile-centric, low hardware cost.** Cheap Android tablets/terminals are the primary target. Camera is the default scanner; a hardware scanner is an optional, zero-code upgrade.
- **One engine, many businesses.** A single POS engine is configured per business type (coffee shop vs. grocery) rather than forked into separate apps.
- **Self-hosted distribution.** The marketing site, downloads, and licensing all run on the developer's own infrastructure (Hostinger), avoiding app-store cuts where legally possible.
- **Optional sync.** Each customer chooses local-only operation or online sync (for backup, multi-device, and back-office reporting).

---

## 2. Stack

| Layer | Choice | Notes |
|---|---|---|
| UI core | Vue 3 + Vite + TypeScript | Single codebase shared by all targets |
| Mobile shell | Capacitor 8 | Android-first; iOS optional (App Store only) |
| Desktop shell | Electron | Windows-first; macOS/Linux possible from same code |
| Web | PWA (service worker + installable) | Browser fallback / no-install option |
| On-device DB | SQLite | Per-platform driver behind one abstraction (see §4) |
| State | Pinia | Cart, session, shift, settings |
| Backend | Laravel + PostgreSQL | Back office, accounts, licensing, sync target |
| Hosting | Hostinger (VPS recommended over shared) | Site, downloads, API, DB |
| Sync (phase 1) | Custom outbox → Laravel API | Simple, robust for 1–2 devices |
| Sync (phase 2) | PowerSync (optional upgrade) | Bidirectional offline sync for multi-terminal |

---

## 3. Repository / Project Structure

A monorepo keeps the shared core in one place and the three shells thin.

```
/pos
  /packages
    /core            # Vue app: components, POS engine, view models (platform-agnostic)
    /data            # Storage abstraction + sync engine (interface + impls)
    /shared          # Types, domain logic, config schemas, money/tax utils
  /apps
    /mobile          # Capacitor wrapper (android/, ios/)
    /desktop         # Electron wrapper (main process, preload, IPC)
    /web             # PWA entry + service worker config
  /backend           # Laravel API + back office (separate deploy)
  /website           # Marketing site + download + account portal
```

The golden rule: **`/apps/*` contain no business logic.** They wire platform services (storage driver, printer, scanner) into the shared core via a common interface.

---

## 4. Storage Abstraction (the make-or-break layer)

SQLite access differs per platform, so define one interface and three implementations. The app only ever talks to the interface.

```ts
interface DataStore {
  query<T>(sql: string, params?: any[]): Promise<T[]>;
  exec(sql: string, params?: any[]): Promise<void>;
  transaction(fn: (tx: DataStore) => Promise<void>): Promise<void>;
}
```

| Target | Implementation |
|---|---|
| Mobile (Capacitor) | `@capacitor-community/sqlite` |
| Desktop (Electron) | `better-sqlite3` in the main process; renderer calls it over IPC via a preload bridge |
| Web (PWA) | `wa-sqlite` + OPFS for real SQLite in-browser (or Dexie/IndexedDB if you prefer simplicity) |

Use a single set of SQL migrations (plain `.sql` files run in order, tracked in a `migrations` table) so the schema is identical everywhere. Consider Drizzle ORM on top for type-safe queries — it works against all three drivers.

---

## 5. Offline-First Sync Strategy

Sync is the highest-risk piece, so it's tiered. The app shell is identical for both tiers; you can start at Tier 1 and move up without rework.

For the concrete Laravel + PostgreSQL multi-store schema and tenancy rules, see [backend-multistore-sync.md](./backend-multistore-sync.md).

### Tier 1 — Outbox pattern (default; ideal for 1–2 devices per shop)
- Every sale / stock change is written locally with a **client-generated UUID** and appended to a `sync_outbox` table.
- A background task pushes queued rows to a Laravel endpoint whenever a connection exists. Endpoints are **idempotent** (keyed on UUID) so retries are safe.
- Catalog, prices, and stock are **pulled down** via delta sync on `updated_at`.
- Conflicts are effectively nonexistent: the terminal owns its own sales; the back office owns the catalog.

### Tier 2 — PowerSync (optional upgrade for multi-terminal / near-real-time)
- Adopt **PowerSync** to get battle-tested bidirectional offline sync (full local SQLite + managed upload queue) against Postgres.
- Writes still flow through your Laravel API; PowerSync manages the down-sync and the queue so you don't hand-roll it.

### "Local-only vs. online sync" toggle
- A per-install setting. Local-only customers never push data out; the outbox simply stays unused.
- Online customers authenticate once, then sync runs in the background. Make the sync status visible (last synced time, pending count).

---

## 6. Core Data Model (shared across all business types)

```
products        (id, sku, barcode, name, price, tax_rate, type: standard|weighted|modifier_parent)
categories      (id, name, sort_order)
modifiers       (id, product_id, name, price_delta)        -- size, milk, extra shot
inventory       (product_id, qty_on_hand, reorder_level)
orders          (id uuid, status, type: dine_in|takeaway, subtotal, tax, total, created_at, synced_at)
order_items     (id, order_id, product_id, qty, unit_price, modifiers_json)
payments        (id, order_id, method: cash|card|ewallet, amount, change)
shifts          (id, opened_by, opening_cash, closing_cash, opened_at, closed_at)
cash_movements  (id, shift_id, type: pay_in|pay_out, amount, reason)
sync_outbox     (id, entity, payload_json, created_at, sent_at)
settings        (key, value)                                -- business config, sync mode, license
```

All transactional tables use client-generated UUIDs so records are unique across devices before they ever reach the server.

---

## 7. One POS Engine, Configured per Business

Build the engine once; drive differences with a config object stored in `settings`.

| Capability | Coffee shop | Grocery |
|---|---|---|
| Modifiers (size/milk/shots) | On | Off |
| Order types (dine-in/takeaway) | On | Off |
| Catalog size | Small (dozens) | Large (thousands) |
| Barcode-centric flow | Secondary | Primary |
| Weighted items (price/kg) | Off | On |
| Order queue / "now serving" | On | Off |

Shared by every business: cart, payments (cash / card / e-wallet incl. GCash & Maya QR for PH), receipt printing, shift open/close with cash reconciliation, sales history, and X/Z daily reports.

---

## 8. Hardware Integration

| Device | Mobile (Capacitor) | Desktop (Electron) | Web (PWA) |
|---|---|---|---|
| Barcode/QR scan (camera) | `@capacitor-mlkit/barcode-scanning` (ML Kit) | getUserMedia + JS decoder | getUserMedia + JS decoder |
| Hardware scanner (HID) | Works as keyboard, zero code | Works as keyboard, zero code | Works as keyboard, zero code |
| Receipt printer (ESC/POS) | BT/built-in printer plugin; Sunmi/iMin SDK | `node-thermal-printer` / `serialport` over USB/LAN | Limited — LAN printer via bridge only |
| Cash drawer | Triggered via printer kick-out port | Triggered via printer kick-out port | Via networked printer |

**Notes**
- Android terminals (Sunmi/iMin) bundle scanner + printer + drawer — the cheapest reliable POS hardware path.
- Camera scanning is great for QR and acceptable for retail 1D barcodes; for high-volume grocery, a ~$15 Bluetooth HID scanner is a free-to-support upgrade (acts as a keyboard).
- Electron is the strongest target for traditional USB/serial peripherals — verify a maintained driver for your specific printer models before committing to those SKUs.

---

## 9. Licensing & Monetization

Direct distribution (outside app stores) means **you keep ~100% of revenue** and run licensing through Laravel.

- **Subscription:** activate online → issue a signed license token → re-validate periodically with a **grace window** (works offline for N days before it must phone home). Choose N generously so a bad-internet week doesn't lock the till.
- **One-time purchase:** validate once at activation, store a signed token locally, done.
- **Important caveat:** if you later ship iOS via the App Store, Apple mandates in-app purchase for digital subscriptions and takes its cut — which conflicts with your own billing. Keeping subscriptions on Android + desktop (direct) preserves the margin.

---

## 10. Website Plan (Hostinger)

1. **Marketing / landing** — value prop, business-type showcases (coffee, grocery), pricing.
2. **Pricing & plans** — subscription tiers and/or one-time purchase; checkout (Stripe/PayPal/local PH gateway).
3. **Account portal** — register/login, manage license & subscription, view linked devices, billing history.
4. **Downloads** — Android APK, Windows desktop installer, "open web app" (PWA) link. Per-platform install instructions.
5. **Back office (web app)** — catalog/price management, multi-shop sales reporting, inventory overview. This is the online half of the sync story.
6. **Support** — docs, setup guides (hardware pairing), contact.

Recommend a **Hostinger VPS** (not shared hosting) so you can run Laravel + PostgreSQL + queue workers reliably, and host the download binaries.

---

## 11. Distribution Reality (per platform)

| Platform | Direct download from site? | Notes |
|---|---|---|
| Android | Yes | Host the APK; users enable "unknown sources." Play Protect may warn. Consider Play Store later for trust. |
| Desktop (Electron) | Yes | Host the installer. Unsigned binaries trigger SmartScreen/Gatekeeper warnings — budget for a code-signing certificate. |
| Web (PWA) | Yes (no install needed) | Installable from browser; good no-friction option. |
| iOS | **No (Philippines / non-EU)** | App Store only outside the EU. Treat iOS as an optional, separate App Store track. |

---

## 12. Build & Release Pipeline

- **Shared build:** `vite build` produces the web bundle consumed by all three shells.
- **Mobile:** `cap sync` → Android Studio build → signed APK/AAB. Consider live-update tooling (e.g., Capgo/Capawesome) to push JS updates without re-downloads.
- **Desktop:** `electron-builder` → signed Windows installer (`.exe`/`.msi`); auto-update via update feed hosted on your site.
- **Web:** deploy bundle + service worker behind the site.
- **Backend:** Laravel deploy on the VPS; run migrations; queue workers for sync ingestion.
- Version the on-device schema and tie live updates to native versions so an old shell never receives an incompatible bundle.

---

## 13. Roadmap

1. **Core engine (wk 1–2):** Vue + storage abstraction + SQLite schema; catalog, cart, checkout, cash payment — fully offline on mobile.
2. **Receipts + shifts (wk 3):** ESC/POS printing, shift open/close, cash reconciliation, X/Z reports.
3. **Desktop + web shells (wk 4):** Electron wrapper with `better-sqlite3`; PWA with `wa-sqlite`/OPFS. Verify the same core runs on all three.
4. **Sync — Tier 1 (wk 5):** Laravel back office + outbox push / delta pull; local-only vs. online toggle.
5. **Config layer (wk 6):** business-type config → ship coffee-shop and grocery variants from one codebase.
6. **Hardware + e-wallets (wk 7):** camera scanning, HID scanner support, weighted items, GCash/Maya QR.
7. **Website + licensing (wk 8):** landing, downloads, account portal, license activation + grace-period validation.
8. **Polish & release:** code signing, auto-update feeds, install docs, beta with a real shop.

---

## 14. Open Items to Verify Before Building

- Maintained Capacitor ESC/POS / Bluetooth-printer plugin for your exact printer models (RN has a deeper ecosystem here — confirm Capacitor covers your hardware).
- Local PH payment gateway support for web checkout and in-app e-wallet QR.
- Whether any target shop needs true multi-terminal real-time sync (decides Tier 1 vs. PowerSync now vs. later).
- Code-signing certificates for Windows desktop and (eventually) Android Play Store presence.
