# Nail Salon — Grid 1: Manicures & Pedicures

Paste the prompt below into your image generator. It renders a 3x3 grid of 9
distinct product photos in one image; crop each cell out afterward and save
using the filenames listed in the mapping table.

## Prompt

```
Professional product photography, 3x3 grid of 9 separate photos arranged in
even square cells with thin white gutters between them for easy cropping.
Each cell shows one close-up nail salon service, shot from the same
top-down angle, same soft diffused studio lighting, same warm blush-pink
and cream seamless background, same neutral skin tone hand/foot model,
same camera distance and framing so every cell is visually consistent.
No text, no labels, no numbers, no watermark, no logos, photorealistic,
high resolution, clean modern beauty-salon aesthetic.

Cells (left to right, top to bottom):
1. Manicured hand with short, glossy, classic nude-pink nail polish resting on a
   folded white towel
2. Manicured hand with short, quick everyday nail polish, minimal styling,
   slightly faster/simpler look than cell 1
3. Manicured hand with glossy gel nail polish in a rich red, high-shine finish
4. Manicured hand mid spa-manicure, resting in a small bowl of soapy water with
   rose petals, soft-focus spa elements nearby
5. Manicured bare feet with short, glossy, classic nude-pink pedicure polish,
   toes separated by a foam toe separator
6. Manicured bare feet with quick everyday pedicure polish, minimal styling
7. Manicured bare feet with glossy gel pedicure polish in a rich red, high-shine
   finish
8. Manicured bare feet mid spa-pedicure, feet resting in a small basin of
   soapy water with rose petals
9. Close-up of a manicurist's hand filing/refilling the edge of an existing
   set of nails, nail file visible, tidy workstation background
```

## Crop mapping

| Cell | Product | Save as |
|---|---|---|
| 1 | Classic Manicure | `apps/web/public/products/classic-manicure.jpg` |
| 2 | Express Manicure | `apps/web/public/products/express-manicure.jpg` |
| 3 | Gel Manicure | `apps/web/public/products/gel-manicure.jpg` |
| 4 | Spa Manicure | `apps/web/public/products/spa-manicure.jpg` |
| 5 | Classic Pedicure | `apps/web/public/products/classic-pedicure.jpg` |
| 6 | Express Pedicure | `apps/web/public/products/express-pedicure.jpg` |
| 7 | Gel Pedicure | `apps/web/public/products/gel-pedicure.jpg` |
| 8 | Spa Pedicure | `apps/web/public/products/spa-pedicure.jpg` |
| 9 | Nail Refill / Fill-in | `apps/web/public/products/nail-refill.jpg` |

Crop each cell to a 1:1 square before saving to match the other product
thumbnails in `apps/web/public/products/`.
