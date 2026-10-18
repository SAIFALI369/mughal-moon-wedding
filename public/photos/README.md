# Bride & Groom Photos (`public/photos/`)

Upload your own bride (**Simran**) and groom (**Mohsin**) photos into this folder (`public/photos/`), then point to them in [`src/components/wedding/photos.ts`](../../src/components/wedding/photos.ts):

1. Upload your images into `public/photos/`:
   - `public/photos/groom.jpg` (Husband / Mohsin)
   - `public/photos/bride.jpg` (Wife / Simran)
   - Optional gallery photos: `public/photos/g1.jpg` – `public/photos/g6.jpg`

2. Open [`src/components/wedding/photos.ts`](../../src/components/wedding/photos.ts) and set:
   ```ts
   export const GROOM_PHOTO_URL = "/photos/groom.jpg";
   export const BRIDE_PHOTO_URL = "/photos/bride.jpg";
   ```
   _(Alternatively, you can overwrite `src/assets/groom.jpg` and `src/assets/bride.jpg` directly with your own `.jpg` files without changing any code.)_
