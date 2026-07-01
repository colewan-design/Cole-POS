# Nail Salon — Grid 2: Enhancements & Add-ons

Paste the prompt below into your image generator. It renders a 3x3 grid of 9
distinct product photos in one image; crop each cell out afterward and save
using the filenames listed in the mapping table.

## Prompt

```
Professional product photography, 3x3 grid of 9 separate photos arranged in
even square cells with thin white gutters between them for easy cropping.
Each cell shows one extreme close-up of a manicured hand or nail detail,
shot from the same angle, same soft diffused studio lighting, same warm
blush-pink and cream seamless background, same neutral skin tone hand
model, same camera distance and framing so every cell is visually
consistent. No text, no labels, no numbers, no watermark, no logos,
photorealistic, high resolution, clean modern beauty-salon aesthetic.

Cells (left to right, top to bottom):
1. Hand with a full set of long, natural-looking acrylic nail extensions,
   nude polish, elegant almond shape
2. Hand with a full set of dip-powder nail extensions, smooth matte-to-glossy
   finish, soft pink shade
3. Hand with a full set of gel nail extensions, glossy clear-to-pink ombre,
   square shape
4. Extreme close-up of two fingertips showing delicate hand-painted floral
   nail art detail
5. Extreme close-up of a fingertip with small rhinestone crystal accents
   applied near the cuticle, sparkling under studio light
6. Extreme close-up of fingertips with a classic French tip manicure, crisp
   white tips on a natural pink base
7. Hand with hands wrapped/dipped in warm white paraffin wax, spa paraffin
   treatment in progress
8. Extreme close-up of fingertips with a chrome/cat-eye metallic nail
   finish, holographic shimmer
9. Small glass bottle of clear nail polish standing upright on a marble
   surface, soft reflection, minimal styling
```

## Crop mapping

| Cell | Product | Save as |
|---|---|---|
| 1 | Acrylic Full Set | `apps/web/public/products/acrylic-full-set.jpg` |
| 2 | Dip Powder Full Set | `apps/web/public/products/dip-powder-full-set.jpg` |
| 3 | Gel Extension Full Set | `apps/web/public/products/gel-extension-full-set.jpg` |
| 4 | Nail Art (per nail) | `apps/web/public/products/nail-art-per-nail.jpg` |
| 5 | Rhinestone Accent | `apps/web/public/products/rhinestone-accent.jpg` |
| 6 | French Tip | `apps/web/public/products/french-tip.jpg` |
| 7 | Paraffin Wax Treatment | `apps/web/public/products/paraffin-wax-treatment.jpg` |
| 8 | Chrome / Cat Eye Finish | `apps/web/public/products/chrome-cat-eye-finish.jpg` |
| 9 | Nail Polish Bottle | `apps/web/public/products/nail-polish-bottle.jpg` |

Crop each cell to a 1:1 square before saving to match the other product
thumbnails in `apps/web/public/products/`.
