# ForestOS Ops — Design

This doc covers the operations/compliance system only — worker, block
supervisor, zone manager and system admin surfaces. It was extracted verbatim
from `forestos-qr-landing/DESIGN.md`'s "ESG Portal (B2B dashboard)" section
when the two systems were split (see that repo's own DESIGN.md for the public
consumer trace's design language — the two now diverge and this doc does not
attempt to stay in sync with it).

Everything below still describes the same shipped code — only the mount point
changed twice since: first to this app's root (`/`), then to `/app/*` once a
sign-in page took over `/` (see "Sign-in" below). Every `/dashboard/...` path
mentioned below should be read as `/app/...` (`/dashboard/buyer` → `/app/buyer`,
etc.) — see `src/lib/dashboard/roles.js` for the actual current `base` paths.

Two roles were added after the split, built from `frames.html`'s desktop-frame
Zone Manager and System Admin mockups rather than carried over from the old
B2B portal — see "Zone Manager & System Admin" below for their design, which
extends rather than replaces everything in this document.

## The ESG Portal shell

The `B2BDashboard` shell + `DashboardSidebar` + the routed per-role modules is
the system's **one light surface** — an "operations console" for the
offtaker/brand account, deliberately distinct from the landing repo's
cinematic dark public site so it reads as a working tool rather than a
landing page. It is the inverse of the forest ground, not a new palette: the
same amber action accent, the same `river-500` data accent, the same
serif/sans/mono split. Only the ground flips.

**Scope & tokens.** The shell adds `.dash` to its root and `dash-root` to
`<html>` (so overscroll and short pages show paper, not the forest body base).
All light tokens live in `@theme` and are used only inside `.dash`:

- `paper` `#f7f5f0` — canvas (the module area and the top strip).
- `paper-sunk` `#e7e3d6` — nested wells, inset cards, hovered rows, the schematic
  map grounds.
- `card` `#ffffff` — panels (`Panel`) and KPI tiles (`StatTile`).
- `line` `#e0dbcb` / `line-strong` `#d1cab8` — hairline borders; `line-strong`
  also fills every meter/progress track so it reads on both white and paper-sunk.
- `ink` `#17251c` / `ink-muted` `#4f5c52` / `ink-faint` `#5b6960` — primary,
  secondary, and mono-label/tertiary text. **All three clear WCAG AA (≥4.5:1) on
  paper, card, and paper-sunk** — `ink-faint` was darkened from `#8a948a` in the
  post-critique pass because every functional mono label lands on it.
- `emerald-100 #d1fae5 · 400 #34d399 · 500 #10b981 · 600 #059669 · 700 #047857 ·
  800 #065f46 · 900 #064e3b · 950 #022c22` — canonical Tailwind emerald, declared
  as `@theme` tokens so the literal classes (`bg-emerald-700`, `text-emerald-950`,
  …) and the portal's own usage read from one place. This is the portal's action
  + data-viz green (see roles below).
- `amber-700` `#7c5322` — the accessible cut of amber for text and detail on
  white. Amber is **warnings only** now — see roles.
- `--shadow-card` — one soft ambient lift (`0 1px 2px` + `0 2px 10px -3px`
  rgba(23,37,28,…)) on panels and KPI tiles. This is the portal's single
  structural shadow; the dark site's "no structural shadow" rule does not cross
  into `.dash`.

**Colour roles inside the portal.**

- **Green is the portal's action + data accent** (the role amber plays on the
  dark public site): `emerald-700` primary CTA buttons
  (`bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm`, replacing the
  amber pill — "Export full GeoJSON", "Download Executive PDF", "Audit
  Certificate"); `emerald-950` page headers (`Overview`, `EUDR & Plot
  Compliance Suite`, …); `emerald-600` progress-bar fills, KPI sparkline stroke,
  the soft `emerald-500/15 → transparent` gradient area under every sparkline,
  positive `▲` delta pills, `text-emerald-700` positive KPI figures, "clear /
  compliant" pills, active list rows, and the QR scan / dwell / campaign visuals;
  the active nav row is `border-l-4 border-emerald-400` (bright) +
  `bg-emerald-900/60` + `text-white`.
- **Amber / orange is reserved strictly for semantic warnings**: `warn`-tone KPI
  tiles (Watch / Flagged) with their leading dot, the `watch` / `flagged` status
  pills, the flagged plot polygon on the sector map, encroachment-alert icons
  and pills, and the `PlotInspector` "current below baseline" canopy bar. Never
  a button, a header, a standard progress bar, or a neutral data mark.
- **`river-500`** stays data-only — now just the "coverage" meter tone in Fair
  Pay and the "current canopy, no loss" tone.
- Large KPI figures are `ink` or `emerald-700` only — never amber or river as
  text on white.

**Roles & navigation.** The portal is **multi-role** — `src/lib/dashboard/roles.js`
defines six views: **Brand / Offtaker** (default, at `/`), **Buyer /
Brand** (`/buyer/*`), **Creator & Artist** (`/creator/*`),
**NTZDC Operations** (`/ops/*`), **NTZDC Management**
(`/management/*`), **ESG Capital Manager** (`/capital/*`). The
active role is **derived from the URL path** (`roleFromPath`, which matches the
most specific non-`/` `base` that prefixes the path), not React state;
the sidebar's "Role View" `<select>` simply `navigate()`s to a role's `base`.
Each role carries its own identity (`org`), scope label, and ordered module list;
`B2BDashboard` routes a flat union of every module across all roles, plus a `*` →
`/` redirect. Every role's index route resolves to `role.base` with **no
trailing slash** so `NavLink end` matching works. New non-Brand modules are built
from the shared `DashboardKit` primitives (`ModuleHeader`, `StatTile` row,
`Panel`, `BarMeter`, `Sparkline`, `DataTable`, `StatusPill`) + a per-role
mock-data file (`src/lib/dashboard/{buyer,creator,ntzdc,ntzdcManagement,esg}.js`);
the ESG "Satellite Recovery" and Buyer "Batch Lookup" modules both re-mount the
full `SectorFocusView` (`variant="ndvi"`).

**Buyer / Brand & the shared batch chain.** The Buyer role (`org.scope`
"Direct-sold volume", `scopeLabel` "Active sourcing") is scoped to a brand's own
direct-sold batches — **auction-pool volume is never shown** (`channel: 'auction'`
records are filtered out everywhere, and Batch Lookup rejects a search that
resolves to one). No farmer names, phone numbers, or IDs appear in this view;
only aggregate `farmers` / `pluckers` counts. Its three modules:
- **Conservation Passport** (`/buyer`) — a four-up KPI row (volume
  verified, active passports, farmers represented, buffer hectares attributed)
  over content `Panel`s for sourcing, conservation activity, community impact
  (aggregate-only), environmental data (`Sparkline` on `SATELLITE.ndvi`),
  verification records, and the headline batch's full chain.
- **Batch Lookup** (`/buyer/batches`) — search by id, a branded-batch
  picker, `BatchProvenanceChain`, evidence downloads (GeoJSON / audit cert /
  passport PDF via the existing `geojson.js` + `passportPdf.js` helpers), and the
  reused `SectorFocusView` map.
- **ESG Report Export** (`/buyer/reports`) — hectares protected, carbon
  stored, verification status; a per-block `DataTable` and PDF + CSV export
  (`src/lib/esgReport.js`, same client-side hand-rolled PDF technique as
  `passportPdf.js`).

The batch chain is defined once, in this app. **`src/lib/batchChain.js`** holds
the canonical records (Land → Block → Plot → Harvest → Batch → Processing, plus
a `channel` tag and Field + Satellite verification), `redactBatchRecord(record,
level)` (`'public'` | `'buyer'` — coordinate precision, harvest/lot-ID detail,
reference truncation), and `toLegacyBatch(record)`. The landing repo
(`forestos-qr-landing`) forked a copy of this file for the public QR site at
the `'public'` redaction level when the two systems split — the fork is
deliberate; nothing keeps the two in sync, and the landing copy no longer
depends on this app's sector-map data (`resolvePlot` there just returns the
record's own plot). **`src/components/batch/BatchProvenanceChain.jsx`** is the
shared renderer for `redactBatchRecord` output — currently styled with the
light `.dash` tokens for its buyer-dashboard mount.

**NTZDC Operations vs. Management.** The two NTZDC roles share a visual language
and the `ntzdc*` data files but differ in scope. **Operations**
(`org.scope` "Kiptunga Block operations", `scopeLabel` "Operating zone") is the
single-block console — Operations & QC Hub, Verification Queue, Problem Reports,
Quality & Rejections, Price Configurator, Farmer Training Alerts, Buffer
Maintenance. **Management** (`org.scope` "All zones", `scopeLabel` "Coverage",
`org.code` "NTZDC-NAT") is the org-wide roll-up across every operating zone, its
data in `ntzdcManagement.js` (a `zones` array plus `zoneTotalPay()` and a
`managementRollup()` that intake-weights every rate). Its three modules:
- **Landscape Overview** (`/management`) — a six-up KPI row (zones,
  blocks, farmers & workers, season intake vs last, aggregate reject rate,
  buffer hectares) over a `BarMeter` "season intake by zone" panel and a
  sortable "zones at a glance" `DataTable`.
- **Zone Comparison** (`/management/zones`) — the pay-disparity screen.
  One `DataTable`, rows **pre-sorted by pay gap descending** (widest gap to the
  top-paying zone first) so regional disparity surfaces without interaction; the
  Pay column renders a `PayStack` — base / quality-premium / conservation-premium
  segments (`emerald-900 / 600 / 400`) on one shared scale (the top payer), with
  the three figures repeated in a mono line beneath because the premium slivers
  are genuinely small. Pay-gap deltas are `amber-700` (a tracked disparity is a
  standing concern). `csvName="ForestOS-zone-pay-comparison"`.
- **Buffer & Conservation Rollup** (`/management/buffer`) — the
  `BufferMaintenanceModule` pattern rolled up: a KPI row (intake-weighted
  boundary integrity, combined patrols, total buffer ha, zone-mean NDVI with a
  `MiniSparkline`), `BarMeter` panels for boundary integrity and patrol activity
  by zone (amber under the 88% integrity floor), and an equal-weighted org-wide
  NDVI `Sparkline` reading the same Sentinel-2 composite as ESG Satellite
  Recovery.

**Sidebar** (`DashboardSidebar`, takes a `role` prop). A **dark rich-emerald
panel** (`bg-emerald-950`, `border-emerald-800/50`) against the parchment
content — the one dark surface in the light portal. At `lg` it is
`sticky top-0 h-screen w-64 overflow-y-auto`, so the emerald ground stays
continuous full-height while the main column scrolls; below `lg` it collapses to
a full-width top section with a horizontal-scroll module row. Top to bottom:
`Leaf` (emerald-400) + `ForestOS` wordmark (white) → `/`; the **Role View**
switcher (native `<select>`, `bg-emerald-900/60`, chevron); the **scope badge**
in a dark transparent card (`bg-emerald-900/40 border border-emerald-800/50`) —
label `emerald-400`, value white, the copy driven by `role.scopeLabel` /
`role.org.scope`; a `MODULES` mono label; the nav list — inactive
`text-emerald-100/70`, hover `bg-emerald-900/50 text-white`, active
`border-l-4 border-emerald-400 + bg-emerald-900/60 + text-white`; and a pinned
"signed in as" card + "back to public site" link (this link should move to an
external URL once the landing repo is deployed separately — currently a dead
in-app path, see forestos-qr-landing's own review notes on the split).

The Role View control is a real labelled `<select id="role-view" name="role-view">`
with a one-line "Switches the entire module set for this account." helper, so the
mode change is stated before interaction and autofill/SR have a name.
**Focus rings inside the sidebar are white** (`.dash aside :focus-visible`) — the
parchment-side `emerald-700` outline is invisible on `emerald-950` and fails
WCAG 2.4.11.

**Shell.** `B2BDashboard` root is `flex min-h-screen flex-col bg-paper lg:flex-row`
(faithful to a `flex min-h-screen` brief but column-stacked on mobile so the
sidebar is not a 256px squeeze). `bg-paper` is `#f7f5f0`. The module column is
`max-w-6xl` centred.

**Card framing.** Every white `Panel`, `StatTile`, and the Sector Focus /
activity-stream containers carry a `border border-emerald-900/10` hairline (a
barely-there green frame) plus `--shadow-card`. `warn`-tone tiles swap it for
`border-amber-700/25`.

**Console top strip.** A slim `border-b` bar above the module area:
`<role label> / <scope>` left, `AS OF <date>` right, both mono uppercase
`ink-faint`.

**Portal display face.** This app's `index.css` sets `--font-display` to
**Newsreader** (an editorial "of record" serif — Production Type, `opsz 6..72`)
as the default (it was scoped to `.dash` when this lived inside the landing
repo's bundle alongside a cinematic Instrument Serif public site; here it's
simply the app's display face). `.dash .font-display` sets
`font-optical-sizing: auto`, `letter-spacing: -0.017em`, `font-weight: 420`.
The mono/sans roles (JetBrains Mono, Archivo) are unchanged.

**KPI tiles** (`StatTile`). `card` fill, `border-emerald-900/10`, `--shadow-card`,
`rounded-lg`. Mono uppercase 11px `ink-faint` label (with a leading **amber** dot
only when `tone="warn"`); a crisp Instrument Serif figure (`text-[2rem]`, tabular)
in `ink` or, for `tone="positive"`, `emerald-700`; and a **right slot that always
carries something** — a `trend` `MiniSparkline` (84×26, emerald stroke +
`emerald-500/16 → transparent` area fill; amber only on a `warn` tile) or, when
there is no series, a `share` (0–1) progress mark — so a tile is never a lone
figure in an empty box. Footer: an optional `DeltaPill` (Lucide `ArrowUp` /
`ArrowDown` + `sr-only` direction word + label, emerald tint up / amber tint
down) and/or a plain `ink-muted` unit caption.

**Charts.** `BarMeter` — one bar, one value; tracks `line-strong`; fills
`emerald-600` (default), `river-500` (coverage / verification), `ink-faint/60`
(`muted`), `amber-500` only for a warning. `BulletBar` — target-vs-actual on one
row: the fill is the actual, an `ink` tick is the target, the bar turns amber
when behind. Use it whenever two quantities are being compared (ESG deployed vs
target, the price stack) instead of two `BarMeter` lists. `Sparkline` /
`MiniSparkline` draw a soft gradient area under the line via an inline
`<linearGradient>` keyed by React `useId`.

**Per-role hero visualisations.** Each role's primary module leads with one
authored chart before the KPI-and-table body:
- **Brand** — the Sector Focus 3D map (EUDR / Satellite).
- **Creator** — `CreatorDropTimeline`: an SVG release calendar, each drop a node
  on a date axis with a sell-through ring and a `TODAY` marker. Campaign Drops
  also carries `CampaignSellThrough` (one segmented bar across every launched
  edition series, units sold vs. total run, upcoming inventory noted as a
  footnote) and a royalty/units/AOV/trees KPI row. Audience QR Scans carries
  `CreatorMessageBoard` — a prototype note composer (280-char cap, emerald
  "Publish to audience" CTA) above a `divide-y` list of published notes, each
  stamped with date, id, and accrued scan reach.
- **NTZDC** — `NtzdcCentreBoard`: one tile per collection centre with a half-
  circle intake gauge against target, moisture against the accepted band, and
  last-pickup time — a board, not a table.
- **ESG** — the `BulletBar` deployed-vs-target chart on Fund Allocation.

**`DataTable`** takes `sortable` (headers become buttons that cycle asc →
desc, with `aria-sort`) and `csvName` (adds a Download CSV action). Where a
module previously rendered a table *and* the same numbers as a `BarMeter` list,
the bar is folded into a table cell instead.

**NTZDC pipeline modules.** Two Operations modules track work through a named
pipeline and reuse the shared primitives rather than adding chrome:

- **Verification Queue** (`/ops/verification`) — a KPI row (pending
  review, verified this week, avg time to verify, flagged/rejected) over a
  `divide-y` list of conservation claims, each a full-width `<button>` row
  showing claim type, `VC-` id, plot/block, reported date and a `StatusPill` for
  the pipeline stage (Reported → Field verified → Evidence attached → Satellite
  cross-check → Verified, or Rejected). Selecting a claim swaps the whole module
  for `VerificationClaimDetail` (local `useState`, a mono "← Back to queue"
  control, no route change) — a `PipelineStepper`, the original submission as a
  `dl`, an editable officer-observations `textarea`, a dashed photo/GPS evidence
  well, an NDVI cross-check that reads the same `SATELLITE.ndvi` composite as ESG
  Satellite Recovery (baseline-vs-current `BarMeter` pair + `Sparkline` + the
  `ESG.recovery` sector mean), and an Approve / Request more evidence / Reject
  decision row with an `aria-live` prototype confirmation.
- **Problem Reports** (`/ops/problems`) — a KPI row (open, avg response
  time, resolved this month, overdue) over a sortable `DataTable` with
  `csvName="ForestOS-problem-reports"`: farmer id, centre, problem type,
  severity and status as `StatusPill`s (severity forced to `warn` at High /
  Critical; an `overdue` mono tag trails an unclosed status), assigned officer.

The verification stage keywords (`verified`, `outcome recorded`) were added to
`StatusPill`'s `STATUS_TONE` map so both modules resolve pipeline pills without
per-call tone props; the pill classes are unchanged and still match the
`CATEGORY_TONE` tags on Impact Audit Logs.

**The QR / audience scatter panels** render on `paper-sunk` with
`rgba(23,37,28,0.07)` grid lines, carry a `role="img"` summary label, and print
the same city figures as a plain sorted list beneath — the bubble field is
decoration over a real list, not the only representation.

**The Sector Focus View** (`components/dashboard/sector/`). The EUDR and
Satellite modules replace a flat schematic with a real 3D map scoped to the
account's one covenant block (`SECTOR` in `dashboardData.js` — South West Mau /
Kiptunga Block). It reuses Cesium/Resium (`lib/cesium` bootstrap, Esri World
Imagery, the same dark scene grade the landing repo's public globe uses) behind
a `React.lazy` boundary, so Cesium only downloads when one of those two modules
opens. Pieces:

- **`SectorFocusMap`** — the Cesium `Viewer`, framed by `SECTOR.flight` (high
  tilt → resting 3/4 view; jumps under reduced motion). The WebGL canvas is
  `tabindex="-1"` + `aria-hidden` — it captures arrow keys and would trap
  keyboard users; the plot rail below the map (a row of focusable status-dotted
  plot-ID buttons) is the keyboard / screen-reader path to every plot's
  inspector. Three toggleable layers:
  `audit` (per-plot polygons, slightly extruded, coloured `#3ba552` cleared /
  `#e8a85c` watch / `#df5a26` flagged, selected plot extruded taller with a bone
  outline), `ndvi` (a 9×6 translucent graded field on the fixed NDVI ramp
  `#a9641d` bare → `#c9a24a` → `#4a9e3f` → `#1f7d38` canopy — these four are the
  only sanctioned NDVI-map colours and never leave the satellite scene),
  `pins` (amber `PinBuilder` billboards for the collection centres). Clicking a
  polygon or pin flies the camera and selects.
- **`SectorLayerToggle`** — top-right dark-glass toggle group. Dark chrome is
  correct **only here**, floating over the satellite scene.
- **`PlotInspector`** — a right-edge slide-over HUD card (dark glass, Framer
  Motion slide / fade under reduced motion): plot ID + coordinates, EUDR status
  badge, baseline-vs-current canopy bars, NDVI, and `GeoJSON` + `Audit
  Certificate` download CTAs (`plotToAuditCert` / `downloadCert`).
- **`AuditActivityStream`** — a light `Panel`-styled feed below the map,
  headed **"Audit Activity"** (never "Live") with a static `SIMULATED FEED` pill
  (no pulsing dot — no fabricated liveness). It adds one paced entry every ~15s
  from `AUDIT_ACTIVITY`; reduced motion renders the whole log at once. Plot IDs
  are click-through to the inspector.

**What does not change.** The mono/serif register rule, the "never a bare
decorative eyebrow" status-line rule, `rounded` vocabulary, and reduced-motion
expectations all hold. The portal's `emerald-*` ramp is a saturated cut of the
same forest green, not a new hue — green, amber (warnings), `river-500` (data),
and the bone/ink neutrals are the whole set. Green takes over action +
emphasis, and amber retreats to warnings only.

## Sign-in

`src/routes/SignIn.jsx` owns `/`. It exists because the console had no front
door at all before — visiting the app landed straight in the Brand role's
Overview with no sense that this was a gated system. Built for institutional
seriousness (the brief: look at how osapiens presents TRACES NT — official,
checklist-driven, trust-marker-heavy) but honest about what's actually true
here: **there is no real authentication.** The page never simulates a
credential form — that would be a dark pattern for a system with no backend
to check a password against. Instead it lists one demo account per role
(`ROLES` in `lib/dashboard/roles.js`, split into "Internal — Forest Line
operations" and "Partners & sponsors — read what the system verifies"), and a
`ShieldAlert`-flagged "Before you sign in" box states plainly: no real
backend, no real auth, worker/supervisor screens live in the mobile app. A
"Built on" strip names the integrations from `ADMIN.integrations` — the
same honest-trust-marker instinct as osapiens' certification badges, but
naming this system's own real dependencies instead of third-party awards.

Picking an account calls `setAccountRoleId` (`lib/session.js` — a
`sessionStorage` string, wrapped in try/catch, nothing more) and navigates to
that role's `base`. `/app/*` is wrapped in a `RequireSession` check in
`App.jsx`: no stored account, and any `/app/...` URL bounces back to `/`. The
sidebar's "Sign out" (was "Back to public site" when this lived inside the
landing repo) clears that session key. None of this is a security boundary —
it's a front door, sized to what a prototype with no backend can honestly
claim.

## Zone Manager & System Admin

Added after the landing/ops split, directly from `frames.html`'s Z1–Z5 and
A1–A5 desktop-frame mockups (`docs` reference: the frames file's own
`forestline.ntzdc.go.ke` breadcrumb strings). These two roles sit in the
internal org hierarchy between Block Operations (one block, the `ntzdc` role)
and National Management (every zone, the `ntzdc-mgmt` role): a Zone Manager
oversees one zone's several blocks (`lib/dashboard/zoneManager.js` — South
West Mau, six blocks); System Admin is cross-cutting, scoped to the whole
platform, not to any one block/zone/nation (`lib/dashboard/systemAdmin.js`).
Deliberately not rebuilt: frames.html's Worker and Block Supervisor screens —
every one of those is a phone or feature-phone frame, field/mobile UI that
belongs to the companion mobile app and USSD channel, not this desktop
console.

**New severity tone.** Neither role fits the portal's existing
positive/warn two-tone system — frames.html uses a third colour
(`--red`) for "fire escalated now," "below target," "shared handset
flagged." Added as `critical` / `critical-soft` tokens in `index.css`
(`#a53a26` / `#f6e2dc` — darkened a touch from frames.html's `#b4442f` for AA
text contrast on `paper`/`card`) and wired through `StatusPill`,
`StatTile`'s `tone` prop and a new `AlertCard` primitive
(`components/dashboard/DashboardKit.jsx`) that renders frames.html's
"needs attention" card pattern — bold lead line, muted detail, optional
trailing pill — reused across both roles' Overview/Exceptions/Needs-attention
panels instead of hand-rolling each one.

**Two screens beyond the lettered mockups.** Both roles' sidebars promise a
nav item frames.html never gave its own numbered frame: Zone Manager's
"Exceptions" (Z1's "Needs you today" panel, expanded into its own triage
screen pulling from blocks, buffer and sign-off) and Admin's "Integrations"
(A1's integrations panel, expanded into its own screen). Built as real
screens rather than left as dead nav links.

**Buffer Map reuses infrastructure, doesn't reinvent it.** Where
frames.html's Z3 hand-draws a schematic SVG block map, this app already has a
real Cesium sector map (`SectorFocusView`, built for the Brand/ESG roles'
EUDR and Satellite modules) — `BufferMapModule` mounts
`<SectorFocusView variant="ndvi" />` and adds the zone-specific "where ground
and satellite agree" panel and KPIs around it, rather than building a second
map component.

**Zone Sign-off's attestation card** is the one dark surface inside either
new role (frames.html's `.card.dark`) — `bg-emerald-950`, matching the
sidebar's ground rather than introducing a new dark tone, with the gold
`amber-400` "Sign & release period" button frames.html itself uses only for
this action and the Admin exports' brand-facing "Release to ForestOS" CTA —
the two moments in the whole console where a human action becomes
irreversible externally-visible fact.

**Demo identities, not just org names.** Every role in `roles.js` now carries
a `person: { name, id }` alongside its existing `org` — Zone Manager's is
literally "David Kemei · ZM-SWMAU-01" from frames.html's own Z5 sign-off
mock. The sidebar's "Signed in as" card prefers `person.name`; the sign-in
page's account cards are built from the same data, so there's one identity
per role, not two.

## Application shell (`src/components/shell/`)

Replaced the earlier one-off `DashboardSidebar` with a proper enterprise app
shell: `AppShell` composes `Sidebar` + `Topbar` around the routed content,
`B2BDashboard` just supplies `role` and its `<Routes>`. Direction: enterprise
"operate" software — density over expression, brand carried in precise
details rather than in gestures the public site is allowed. Style reference
was osapiens (structure, seriousness, role-based access) explicitly *not*
copied pixel-for-pixel; palette stays this app's own forest/emerald/bone/amber,
never osapiens' blue.

**Sidebar** (`Sidebar.jsx`) replaces the old fixed 256px rail with two real
states: an expanded rail (`lg:w-56`) and a collapsed icon rail (`lg:w-[68px]`,
labels dropped, `title` retained per item), toggled from a button at the top
and persisted per-viewer in `localStorage` (`forestos-ops.sidebar-collapsed`
— a convenience, never read back by the app logic). Below `lg`, the same
`SidebarBody` renders inside an off-canvas drawer over a backdrop; it closes
itself when a nav link is actually followed (an `onNavigate` callback wired
through `NavList`, not an effect watching the route — the link click is the
real event that should close it, not a route-change side effect).

**Topbar** (`Topbar.jsx`) is sticky, one line, holds (left to right): a mobile
nav trigger (`lg:hidden`), `Breadcrumbs` (`ForestOS / <Role> / <Screen>`,
resolved from the signed-in role's own module list — no fabricated hierarchy
beyond what actually exists), a search trigger (`⌘K` wired globally), the
notification bell, and the profile menu.

**Global search** (`GlobalSearch.jsx` + `lib/searchIndex.js`) is scoped to
what the signed-in role can actually reach — it is not a system-wide index,
and says so ("Search within {role}") rather than implying it searches
everything. Results are drawn from data that already exists elsewhere in the
app (the role's own module labels, real batch IDs from `batchChain.js`, Zone
Manager's own block list, Admin's own registry plots) so every result
resolves to a screen that actually shows that record, never an invented
index of its own. The panel only mounts while open (`GlobalSearch` returns
`null` and hands off to an always-fresh `SearchPanel`), so "reset on open"
falls out of the mount lifecycle instead of an effect fighting React's
set-state-in-effect warning.

**Notifications** (`NotificationPanel.jsx` + `lib/notifications.js`) are
role-scoped and, like search, sourced from the same mock records the
relevant role's own screens already show (Zone Manager's exceptions, Admin's
needs-attention list) — a notification is never invented separately from the
record it points at. Read state is local component state, not persisted;
there is no backend session to hold it.

**Sign-in became a real login form.** The account-picker grid from the
earlier pass is now a proper email + password form (`SignIn.jsx`) — styled
with the enterprise weight the brief asked for, but still honest that there
is no real backend: every `person` in `roles.js` carries a seeded `email`
(`roleByEmail()` resolves it), any password is accepted, and a collapsed
"Demo accounts" disclosure lists the seeded emails for anyone who wants to
try a different role. This was a deliberate rejection of two easier, worse
options: a fake-looking credential form that pretends to check a password
(a dark pattern for a system with nothing to check it against), and keeping
the old click-to-pick card grid (which the brief explicitly asked to move
away from — "not a cosmetic role toggle").

**Touch targets.** Icon-only controls in the shell (mobile nav trigger,
mobile search, notification bell, sidebar collapse/close) are sized to a
44×44px minimum hit area even where the visible icon is smaller — Collection
Centre Staff and Field Officer are meant to reach this software from a
tablet, not just a desktop pointer.

## Scope narrowed to NTZDC employees only

This console is now internal-only: Block Operations, Zone Manager, National
Management, System Admin — four roles, all Nyayo Tea Zone Development
Cooperation staff. Brand/Offtaker, Buyer/Brand, Creator & Artist and ESG
Capital Manager were removed entirely, along with their modules
(`EudrModule`, `PassportVaultModule`, `FairPayModule`, `SatelliteModule`,
`QrAnalyticsModule`, everything under `modules/{buyer,creator,esg}/`), their
data files (`lib/dashboard/{buyer,creator,esg}.js`, and the
`PASSPORTS`/`FAIR_PAY`/`QR_ANALYTICS`/`OVERVIEW_TRENDS`/`ORG` exports from
`dashboardData.js`), and the now-dead `redactBatchRecord`/`REDACTION`/
`brandedBatches` redaction machinery in `batchChain.js` (that was built for
the Buyer role's fuller redaction level, which no longer exists here). Those
four partner/sponsor accounts connect through the customer experience
platform (`forestos-qr-landing`) instead — not this internal console. That
platform does not yet build their actual experience; this split only
removes them from here.

Two things that survived the cut needed rewiring rather than deletion:

- **`OverviewLandscapeModule`** (`/app/overview`, the shared "Forest Line"
  See → Verify → Value → Reward tour every role can reach) linked two of its
  four stages into now-gone territory — "See" pointed at the Brand role's
  EUDR screen, "Value" at the ESG Capital role's fund allocation. "See" now
  opens Zone Manager's Buffer Map (same underlying sector map,
  `SectorFocusView`); "Value" now opens Zone Manager's Pay & Parity, and its
  figures were rebuilt from `ZONE.pay` (conservation premium, median weekly
  pay) instead of the deleted `ESG`/`FAIR_PAY` data, so the tour never
  disagrees with the module it links to.
- **`VerificationClaimDetail`** (NTZDC Operations, survives) read
  `ESG.recovery.ndviCurrent` for its "sector mean" NDVI figure — a genuine
  cross-role dependency the original build didn't need to think about since
  everything lived in one app. Repointed to `SATELLITE.ndvi.current`
  (`dashboardData.js`, already the same underlying Sentinel-2 composite,
  already imported by this file for the plot-level chart).

`roleFromPath`'s fallback simplified alongside this: with no role left at
the bare `/app` base, it no longer needs the "which role owns the shadow
prefix" filtering it carried when the Brand role sat at `/app` — it now just
matches the most specific `base` and falls back to `DEFAULT_ROLE`
(`ROLES[0]`, Block Operations).

## Cinematic direction — first pass

The sign-in page and Zone Manager's Overview picked up a second visual
register: the same real South West Mau forest photograph already shipping
on `forestos-qr-landing` (`public/media/mau.jpg`, copied in — not a stock
placeholder), dark-graded under the forest-950 gradient the public site
already uses, with the italic Instrument Serif display face at full size
(no `.dash` scoping on the sign-in page — it's dark ground now, not the
light console, so the un-overridden root `--font-display` is exactly right)
and an amber CTA instead of emerald. Real numbers replace decoration: the
sign-in stat row (940 km belt, 6 blocks, 1,180 workers, 87% buffer verified)
reads straight off `ZONE`, not invented copy.

`CinematicBanner` (`components/dashboard/CinematicBanner.jsx`) is the
reusable piece: a photographic header that bleeds edge-to-edge of the page's
own padded content column via negative margins, then hands padding back for
its title so it still aligns with the page content below, with glass KPI
tiles tucked under the image's bottom edge instead of a flat `StatTile` row.
Deliberately not applied to every screen — a table-dense screen (Block
Performance, the Audit Log) gains nothing from a photo banner and loses
scan-ability; this is for a role's flagship overview moment, the same
restraint `.dash`'s single-shadow rule already asks for elsewhere in this
document. Zone Manager's Overview is the one built example; extending it to
National Management's or Admin's own overview is a straightforward repeat of
the same component, not a new pattern, whenever that's asked for.
