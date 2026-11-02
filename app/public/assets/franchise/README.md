# Franchise page media

The card images below are in place: the client's uploads, cropped to 1280x800
(16:10) and saved as optimized JPGs under these names. The originals are in git
history (commit "Add files via upload").

| Save as                          | Supplied file                                      | Used for |
|----------------------------------|----------------------------------------------------|----------|
| franchise-hero-vertical.mp4      | wingspot-hero (1).mp4 (vertical promo, 720x1280)    | Hero background video |
| franchise-hero-poster.jpg        | First frame of the video above                     | Shown while the video loads, and instead of it for reduced motion |
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

The hero plays `franchise-hero-vertical.mp4`, muted, looped, with no
controls. Phones show it full-screen; desktop shows it as a rounded card on
the right over a blurred copy of itself. `franchise-hero-poster.jpg` (its
first frame) shows while it loads, and instead of it for visitors who turn
off motion or use data saver.

To swap the video, replace both files under the same names, then run
`npm run build` in `app/` and commit. Recommended export: H.264 MP4,
720x1280 or 1080x1920, 15–30 seconds, no audio track, ideally under 8 MB.
With ffmpeg:

    ffmpeg -i input.mov -an -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" \
      -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p -movflags +faststart \
      franchise-hero-vertical.mp4
    ffmpeg -i franchise-hero-vertical.mp4 -frames:v 1 -q:v 4 franchise-hero-poster.jpg
