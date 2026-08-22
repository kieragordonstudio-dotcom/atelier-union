# Customising Atelier Union

This template keeps brand and content changes in predictable files.

## Change the salon name

Open `src/config/site.ts` and change:

```ts
name: 'ATELIER UNION',
shortName: 'Atelier Union',
```

## Change the accent colour

Open `src/styles/tokens.css` and change:

```css
--color-accent: #681D27;
```

to another hex value.

## Change typography

Open `src/styles/tokens.css` and edit:

```css
--font-display: 'Instrument Serif', Georgia, serif;
--font-functional: 'Manrope', Arial, sans-serif;
```

Use no more than two font families for the intended design quality.

## Change services and prices

Open `src/data/treatments.ts`. Each treatment has:

```ts
name
description
duration
price
```

Add-ons and removal pricing are in the same file.

## Change artists

Open `src/data/artists.ts`. Update each artist name, image, role, specialties and next available text.

## Change reviews

Open `src/data/reviews.ts`. These are fictional demonstration reviews. Replace them before using the template for a real business.

## Change lookbook images

1. Add new WebP files to `public/images/`.
2. Open `src/data/lookbook.ts`.
3. Update `image`, `alt`, `category`, `suggestedBaseTreatment` and `addOn`.
4. Record the image source in `IMAGE-SOURCES.md`.

## Change booking availability

Open `src/data/availability.ts`. Add or remove slots by changing:

```ts
date
time
group
artist
```

The booking UI automatically filters by artist, date and time group.

## Convert to a real booking site

The booking flow is front-end only. To use it for a live salon, connect a real booking backend, add payment processing, replace demo policy copy and publish a real privacy policy.
