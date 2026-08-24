ATL WING SPOT — MENU ASSET PACK
================================

Source page: https://www.atlwingspot.com/menu/
Collected: August 24, 2026

CONTENTS
--------

images/
  55 original, full-resolution image files exactly as served by the website.
  Original JPG, PNG, WebP, and AVIF formats are preserved.

images-web/
  55 Git- and app-friendly image files. JPG, PNG, and WebP originals are copied
  unchanged. AVIF originals are converted to high-quality WebP while preserving
  their exact pixel dimensions.

menu-descriptions.txt
  Plain-text menu categories, item names, and descriptions as published on the
  live menu page. Website spelling and wording are intentionally preserved.

menu-items.csv / menu-items.json
  Structured catalog of all 68 menu listings. Each row includes category, title,
  description, original image path, compatibility image path, and source URL.

image-manifest.csv
  Inventory of the 55 source image files, including pixel dimensions, byte sizes,
  SHA-256 checksums, original paths, compatibility paths, and source URLs.

image-sources.json
  Verified full-resolution source URLs and the image labels published by the site.

NOTES
-----

- The menu contains 68 item listings but only 55 distinct source filenames because
  several sizes or variations intentionally reuse the same photo.
- The 20 Jumbo Tenders and 50 Jumbo Tenders URLs currently serve identical bytes;
  both filenames are retained so menu references remain clear.
- 37 of the 55 source images are at least 1920 pixels wide. The available originals
  range from 592 x 422 to 2560 x 2048. Nothing has been upscaled.
- All filenames are lowercase and contain no spaces, so they are safe to commit to
  a Git repository and reference with relative paths.
- For the broadest compatibility, use paths from images-web/ or the web_image field
  in menu-items.csv/menu-items.json.
- For untouched source quality, use paths from images/ or the local_image field.
- Use these assets only with permission from ATL Wing Spot or the applicable rights
  holder.

