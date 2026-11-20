# PAHAD+ Android app (Play Store)

Status: **waiting for the Founder's approval of the images** (see `approval/`). The app is not built until then.

| Folder | What's in it |
| --- | --- |
| `approval/PAHAD-Plus-Images-for-Approval.pdf` | Every image for the app and its Google Play page, with tick boxes and a sign-off page. Share it with the Founder. |
| `store-assets/` | The same images as files, at the sizes Google Play asks for: icon options A, B and C (512 × 512, plus maskable versions of B and C; C, the app's emblem, is recommended), splash previews on the app's dark background, feature graphic (1024 × 500) and eight phone screenshots (1080 × 1920) of the dark, full-screen design. |

After approval:

1. The chosen icon replaces `public/icons/plus-*.png` (the app manifest uses them).
2. The Bubblewrap build project for `org.pahad.plus` is set up here, signed with the same PAHAD key as the PAHAD and PAHAD Admin apps (its fingerprint is already in `public/.well-known/assetlinks.json`).
3. The app is built and signed on a PC, and the `.aab` / `.apk` saved to `D:\PAHAD`.

The screenshots use sample posts written for the purpose (the café, clubs and people are made up; the places are real public places). Photos are from PAHAD's own gallery.
