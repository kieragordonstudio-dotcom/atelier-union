# Atelier Union

A polished concept website for a fictional premium nail salon on Union Street, Aberdeen. It is built with React, Vite, TypeScript, React Router and static CSS.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

The production files are generated in `dist/`.

## Deploy to Render

This repo includes `render.yaml` for a Render Static Site:

- Build command: `npm ci && npm run build`
- Publish directory: `dist`
- SPA rewrite: `/*` to `/index.html`

In Render, create a new Static Site from the repository or sync the Blueprint. The rewrite is required so React Router routes such as `/treatments`, `/lookbook` and `/book` work when loaded directly.

## Edit the template

- Salon name, contact details, policies and footer copy: `src/config/site.ts`
- Brand colours, spacing, radius and typography tokens: `src/styles/tokens.css`
- TypeScript theme reference: `src/config/theme.ts`
- Treatments and prices: `src/data/treatments.ts`
- Artists: `src/data/artists.ts`
- Reviews: `src/data/reviews.ts`
- Lookbook items: `src/data/lookbook.ts`
- Booking availability: `src/data/availability.ts`
- Images: `public/images/` and `src/data/lookbook.ts`

## Duplicate for a new salon

1. Copy the project folder.
2. Update `src/config/site.ts`.
3. Update the colour tokens in `src/styles/tokens.css`.
4. Replace images in `public/images/` and update `IMAGE-SOURCES.md`.
5. Edit treatments, artists, reviews, lookbook and availability data.
6. Run `npm run build` before deployment.
