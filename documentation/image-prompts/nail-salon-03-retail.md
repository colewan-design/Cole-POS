# Nail Salon — Grid 3: Retail Products

Only 3 retail SKUs remain after grids 1 and 2, so this grid gives each
product 3 alternate shots (front, angled, in-use detail) instead of 9
different products — pick whichever cell in each row crops best.

## Prompt

```
Professional e-commerce product photography, 3x3 grid of 9 separate photos
arranged in even square cells with thin white gutters between them for easy
cropping. Each row shows the same product from three different angles.
Same soft diffused studio lighting, same warm blush-pink and cream seamless
background, same camera distance across all cells so every cell is visually
consistent. No text, no labels, no numbers, no watermark, no logos,
photorealistic, high resolution, clean modern beauty-salon aesthetic.

Row 1 — small glass cuticle oil bottle with a dropper cap:
1. Upright front view of the full bottle, cap on
2. Three-quarter angle view with the dropper cap removed, glass dropper wand
   resting beside the bottle
3. Extreme close-up of a single drop of oil being applied to a fingernail
   cuticle

Row 2 — hand cream:
4. Upright front view of a hand cream tube
5. Three-quarter angle view of an open hand cream jar showing the cream
   texture inside
6. Close-up of a dollop of hand cream on the back of a hand, soft-focus
   background

Row 3 — nail strengthener polish:
7. Upright front view of a nail strengthener bottle with a brush-cap
   applicator
8. Three-quarter angle view of the bottle with the brush applicator resting
   on top, a drop of polish visible on the brush
9. Extreme close-up of the brush applying clear strengthener polish to a
   bare fingernail
```

## Crop mapping

| Row | Product | Save as | Pick the best of cells 1–3 (or 4–6, 7–9) |
|---|---|---|---|
| 1 | Cuticle Oil | `apps/web/public/products/cuticle-oil.jpg` | cells 1, 2, or 3 |
| 2 | Hand Cream | `apps/web/public/products/hand-cream.jpg` | cells 4, 5, or 6 |
| 3 | Nail Strengthener | `apps/web/public/products/nail-strengthener.jpg` | cells 7, 8, or 9 |

Crop to a 1:1 square before saving to match the other product thumbnails in
`apps/web/public/products/`.
