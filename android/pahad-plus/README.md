# PAHAD+ Android app (Play Store)

Status: **Founder's choices applied (version 3), waiting for the final sign-off** (see `approval/`). The app is built after that.

Founder's decisions on version 2: icon **A** (PAHAD emblem + “+”), an animated opening with icon A, the feature graphic with the logo and “entertainment”, all eight screenshots, and the title **PAHAD+: Events & Entertainment**.

| Folder | What's in it |
| --- | --- |
| `approval/PAHAD-Plus-Final-Images-v3.pdf` | The final images and words with the Founder's choices applied, and a sign-off page. |
| `store-assets/icon-512.png` | Store icon (512 × 512), the same as `public/icons/plus-512.png`. |
| `store-assets/icon-maskable-512.png` | Round-safe icon for Android launchers (the same as `public/icons/plus-maskable-512.png`). |
| `store-assets/splash-frame-1..3.png` | Three moments from the in-app opening animation. |
| `store-assets/feature-graphic-1024x500.png` | Feature graphic for the top of the Google Play page. |
| `store-assets/screenshots/` | Eight phone screenshots (1080 × 1920) in the order Google Play shows them. |

## Store listing

- **Title:** PAHAD+: Events & Entertainment (30/30)
- **Short description:** Events, entertainment, places, local business & alerts from Darjeeling & Sikkim (79/80)
- **Category:** Entertainment
- **Package:** `org.pahad.plus`, developer PAHAD (same Play account as the PAHAD and PAHAD Admin apps)

## Building the app (on the PAHAD laptop)

The PAHAD key, its password file and the build tools live in `C:\Users\G J\pahad-apk` (the same folder that built `PAHAD.apk` and `PAHAD-Admin.apk`). Keep a backup of `pahad-release.keystore` and `keystore-password.txt` on a pen drive: without them the PAHAD apps can never be updated. They are never committed (see `.gitignore`).

```
git -C D:\PAHAD pull origin main
copy D:\PAHAD\android\pahad-plus\build-plus.js "C:\Users\G J\pahad-apk\"
cd "C:\Users\G J\pahad-apk"
node build-plus.js
```

It makes `D:\PAHAD\android\pahad-plus\dist\PAHAD-Plus.aab` (upload to Google Play) and `PAHAD-Plus.apk` (install on a phone to test). For each later release, raise `VERSION_CODE` in `build-plus.js` by 1.

What to fill in on Google Play (listing, content rating, Data safety, release steps): `PLAY-STORE.md`.

The screenshots use sample posts written for the purpose (the café, clubs and people are made up; the places are real public places). Photos are from PAHAD's own gallery.
