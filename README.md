# ForestOS Ops

The internal operations console for **Nyayo Tea Zone Development
Cooperation (NTZDC) employees only** — Zone Manager, Factory Manager,
Operations Manager (national head of operations), System Admin. Split out of `forestos-qr-landing`, which keeps the public
consumer trace (the QR scan → provenance story); Brand, Buyer, Creator and
ESG Capital accounts used to live here too, but were removed — those partners
connect through the customer experience platform (`forestos-qr-landing`)
instead, not this console. Block Operations and National Management were
removed later (see DESIGN.md).

Structurally this maps onto `frames.html`'s role groups — **Zone Manager**
and **System Admin** are built here as real desktop consoles (frames.html's
Z1–Z5 and A1–A5 mockups, plus an Exceptions and an Integrations screen the
nav promises but the mockup only sketches inline); **Worker** and **Block
Supervisor** are phone/USSD-frame mockups in frames.html and stay the
companion mobile app + USSD channel's job, not rebuilt here.

The **Conservation Officer** console (`/app/conservation`, Buffer Zones & Protected Forest) covers claims,
incidents and KFS liaison, the boundary, tree survival, patrols and exports; see DESIGN.md's “Conservation Officer”
section.

**Prototype.** Every screen still renders from illustrative mock data
(`dashboardData.js`, `zoneManager.js`, `systemAdmin.js`, `batchChain.js`,
and friends) — nothing here talks to a real backend yet.

`/` is a sign-in page listing one demo account per role (`src/routes/SignIn.jsx`);
`/app/*` is the console itself, gated behind a `sessionStorage`-backed
"session" (`src/lib/session.js`) so it isn't reachable without picking an
account first. This is **not real authentication** — there are no
credentials, no server-side session, nothing that would survive a backend
existing. It exists so the console isn't an open URL, and so different demo
accounts land on different, correctly-scoped screens.

## What's next, in order

1. **Real auth**, replacing the demo-account picker — login + org/role-scoped
   access issued by a real backend (see `src/lib/dashboard/roles.js` for the
   role list this maps onto).
2. **A real backend.** `src/lib/contracts/{shapes,adapters}.js` already
   documents the swap seam — each `toX` in `adapters.js` projects today's
   mock into the shape a real endpoint should return; components don't need
   to change when that lands.
3. **Data submission**, not just display — payroll approval, energy
   pricing, zone sign-off currently just render cards;
   a real system writes those somewhere with an audit trail.

## Stack

- **Vite** + **React 19** + **React Router**
- **Tailwind CSS v4** — theme tokens in `src/index.css` (copied from the
  landing repo). Two registers now: `.dash`'s paper-and-ink "light console"
  for most screens, and a dark cinematic forest-950 register (real photo +
  gradient, Instrument Serif, amber accent — no `.dash`) for the sign-in
  page and a role's flagship overview banner (`CinematicBanner.jsx`). See
  DESIGN.md's "Cinematic direction" section.
- **Cesium + Resium** — the zone manager's buffer integrity map
  (`src/components/dashboard/sector/SectorFocusMap.jsx`)
- **Framer Motion**, **lucide-react**

## Running it

```bash
npm install
npm run dev      # predev copies Cesium assets into public/cesium
```

## Global Forest Watch alerts (optional)

The Boundary & Encroachment screen lists deforestation alerts from Global Forest Watch. Register for a free key at
data-api.globalforestwatch.org, then set `GFW_API_KEY` in `.env.local` (dev) or the host's environment (Vercel).
The key is used only by `server/gfwAlerts.js`, served at `/api/gfw-alerts`; without it the panel says it is not connected.
Alerts are kept only if they fall inside the forest outline or within 1 km of its edge, and each says which.

## Sector geography: what is real and what is not

The sector map is anchored on the South West Mau Forest as mapped in OpenStreetMap
(`src/lib/geo/swMauOutline.js`, relation 16054773, regenerated with `node scripts/fetch-sw-mau-outline.mjs`).

| Layer | Status |
|---|---|
| Forest outline, bounding box, centre, area (about 21,400 ha) | Real. Volunteer-traced forest cover, © OpenStreetMap contributors, ODbL 1.0. |
| Esri imagery, Sentinel-2 scenes, Global Forest Watch alerts | Real, live. |
| Sample plots, NDVI shading, collection-centre pins, segments, zone and plot names | Illustrative. Placed by code relative to the outline; each Mau zone's plots sit on the side of the forest nearest that zone's town. |

The outline is **not** the gazetted reserve boundary. The gazetted South West Mau Forest Reserve is about 60,000 ha, so this
outline is roughly a third of it. Get the boundary from KFS or the Survey of Kenya and drop it into `swMauOutline.js` (same
shape: rings of `[lon, lat]`, first ring outer). Nothing else needs to change.

Do not use the World Database on Protected Areas (Protected Planet) polygon for this. Its terms prohibit redistributing the
data and make publishing it online conditional on it not being downloadable, which a public repo and a JS bundle are.
