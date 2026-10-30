# Franchise page media

The card images below are in place: the client's uploads, cropped to 1280x800
(16:10) and saved as optimized JPGs under these names. The originals are in git
history (commit "Add files via upload"). Only the hero video is still missing;
until it is added the hero shows a still photo instead.

| Save as                          | Supplied file                                      | Used for |
|----------------------------------|----------------------------------------------------|----------|
| franchise-hero-vertical.mp4      | Vertical promo video (see below)                   | Hero background video |
| small-space-blueprint.jpg        | Modern takeout restaurant blueprint-2.png          | Card 1 |
| marketing.jpg                    | marketing.jpg                                      | Card 2 |
| academy-team.jpg                 | 1777967051084.jpg (team photo)                     | Card 3 |
| locations-map.jpg                | image (1).png (US locations map)                   | Card 4 |
| suppliers-sysco-pepsi.jpg        | ATL Wing Spot with Sysco and Pepsi.png             | Card 5 |
| waffles.jpg                      | waffles (3).jpg                                    | Card 6 |
| delivery-ubereats-doordash.jpg   | Uber Eats and DoorDash delivery cards-1.png        | Card 7 |
| grand-opening-team.jpg           | image.png (grand opening team)                     | Card 8 |

To replace an image: save it as a 1280x800 JPG (quality ~80) with the same name.

## Hero video (vertical, 9:16)

Save the file as exactly:

    app/public/assets/franchise/franchise-hero-vertical.mp4

then run `npm run build` in `app/` and commit. No code change is needed; the
path is the `HERO_VIDEO` constant in `app/src/pages/Franchise.jsx`.

Until the file exists (or if a browser can't autoplay it) the hero shows the
existing wings photo, exactly as before. Phones show the clip full-screen;
wider screens show it on the right over a blurred, darkened backdrop.

Recommended export: H.264 MP4, 1080x1920 (or 720x1280), 15–30 seconds,
NO audio track (it is always muted anyway), ideally under 8 MB. If you have
ffmpeg, this converts and shrinks a phone clip in one go:

    ffmpeg -i input.mov -an -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" \
      -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p -movflags +faststart \
      franchise-hero-vertical.mp4

Visitors who prefer reduced motion, or have data saver on, never download it.
