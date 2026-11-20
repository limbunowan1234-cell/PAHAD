# PAHAD+ on Google Play: what to fill in

Copy these into Google Play Console when creating the app **PAHAD+** (package `org.pahad.plus`), in the same developer account as the PAHAD and PAHAD Admin apps.

## Main store listing

**App name** (30 max)
PAHAD+: Events & Entertainment

**Short description** (80 max)
Events, entertainment, places, local business & alerts from Darjeeling & Sikkim

**Full description**

PAHAD+ is the community app for the hills, from PAHAD (Participatory Action for Holistic Advancement & Development).

Swipe through what is happening in Darjeeling, Kalimpong, Siliguri and Sikkim:

• Events & entertainment: music, culture, festivals and competitions, with E-Passes you show at the gate
• Roam: viewpoints, eco-trails, heritage sites and homestays
• Business: local cafés, handloom, tea and cooperatives
• Briefs: road and civic alerts, jobs, opportunities and local tips

Built for trust:
✓ Every post goes live straight away and is checked by PAHAD's verifiers. Booking and apply links unlock only once a post is verified
✓ "Authentic" appears when more than 5 people vouch for a post, or when PAHAD knows the poster
✓ Report anything that looks wrong; 3 reports put a post on hold for review
✓ You choose whether your contact details show on your posts

Free and paid E-Passes: get your pass in the app, keep it on your phone (it opens even without a signal), and get checked in with a QR scan. Organisers can approve each request.

Follow local creators, guilds and businesses, save posts for later, and turn on alerts for your region.

Anyone can post. PAHAD verifies.

**App icon**: `store-assets/icon-512.png`
**Feature graphic**: `store-assets/feature-graphic-1024x500.png`
**Phone screenshots** (in this order): `store-assets/screenshots/phone-1-feed.jpg` … `phone-8-post.jpg`

**Category**: Entertainment
**Tags** (choose up to 5 that Play offers): Events, Local, Community, Travel, Entertainment
**Contact email**: PAHAD's public contact email
**Website**: https://pahad.org/plus
**Privacy policy**: https://pahad.org/privacy#pahad-plus

## App content

**Privacy policy**: https://pahad.org/privacy#pahad-plus

**Ads**: No, the app has no ads.

**App access**: Some features need an account. Give reviewers a test PAHAD+ account (email + password) made for Google: create it in the app, confirm its email, and paste the details in "App access". Never use a real person's account.

**Content rating** (IARC questionnaire): category *Social / communication*. Answers:
- Users can interact or exchange content: **Yes** (posts are public; there is no private chat)
- Shares user location: **No** (people choose a region; no GPS)
- Digital purchases: **Yes** (paid E-Passes for real-world events through Razorpay)
- Violence, sexual content, profanity, drugs, gambling: **No**
- Moderation: posts are checked by PAHAD's verifiers, users can report and block

**Target audience**: 18 and over. (Posts include phone numbers and payments; keep the app out of the Families programme.)

**News app**: No. (Briefs include civic alerts, but PAHAD+ is a community app, not a news publisher.)

**Government app**: No.

**Financial features**: None of the listed financial services (paid E-Passes are a ticket purchase).

**Health**: No.

## Data safety

Data is **encrypted in transit** (HTTPS): **Yes**.
Users can **request deletion**: **Yes**, in the app (Profile → Settings → Delete account) and at https://pahad.org/plus/delete-account.
Data is **not sold** and **not shared** with third parties for advertising. (Razorpay processes payments as PAHAD's service provider; Google delivers push notifications. Under Play's rules these are "service providers", not sharing.)

| Data type (Play's name) | Collected | Required? | Why |
| --- | --- | --- | --- |
| Personal info → Name | Yes | Required | Account functionality, shown on posts and E-Passes |
| Personal info → Email address | Yes | Required | Account sign-in, confirming the address, password reset |
| Personal info → Phone number | Yes | Optional for the account; needed to publish most posts | App functionality (contact on posts) |
| Personal info → Other info (Instagram handle, collaboration email, payout UPI/bank for paid organisers) | Yes | Optional | App functionality; payouts to organisers |
| Financial info → Purchase history | Yes | Optional (only if you buy a paid E-Pass) | App functionality, PAHAD's accounts |
| Financial info → Payment info | No | — | Card / UPI / bank details go to Razorpay, never to PAHAD |
| Photos and videos → Photos | Yes | Optional | Photos people add to their posts |
| App activity → Other user-generated content | Yes | Optional | Posts, reports |
| App activity → App interactions | Yes | Optional | Likes, supports, saves, follows, blocks |
| Location | No | — | People choose a region from a list; no GPS |
| Device or other IDs | Yes | Optional | Push notification subscription, only if notifications are turned on |
| Messages, contacts, calendar, health, audio, files | No | — | |

**Collected but processed only on the device**: ready E-Passes saved for offline use (removed at logout); the camera image when scanning E-Passes at a gate (read for the QR code, never stored or sent).

## Release

1. Create the app in Play Console (default language English (India), App, Free).
2. **Play App Signing**: accept it. Upload `PAHAD-Plus.aab`; it is signed with PAHAD's key, which becomes the **upload key**.
3. Then open **Setup → App signing** and copy the **App signing key certificate SHA-256 fingerprint**. Send it to be added to `public/.well-known/assetlinks.json` next to the existing entry for `org.pahad.plus`. Without this, the app installed from Play shows a browser bar at the top.
4. Start with **Internal testing** (add your own and the founder's Gmail as testers), check it on a phone, then promote to **Production**.
