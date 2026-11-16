# Connect finance records to Google Sheets and Drive

Every finance step in the admin panel (entry submitted, approved, rejected, edited, deleted, exported, finance access changed) is **appended** as a new row to a Google Sheet, and every receipt is saved to Google Drive in `PAHAD Finance / year / month`. Rows are never changed or deleted.

The Sheet and the files must be owned by the **organisation account `pahad.org@gmail.com`**, so ownership survives a change of President. This small Apps Script runs as that account. No Google Cloud project is needed.

Until it is connected, the website keeps every record and queues the Google writes. Entries show **“Not yet synced”**, and everything is sent automatically once the connection works (or when someone clicks **Retry sync now** on the Finance page).

## One-time setup (about 10 minutes)

1. Sign in to Google as **pahad.org@gmail.com** (with two-step verification turned on).
2. Open <https://script.new>. Name the project **PAHAD website bridge**.
3. Delete what's in the editor, paste everything from [`Code.gs`](Code.gs), and press **Save**.
4. Choose the **`setup`** function at the top and press **Run**. Allow the permissions it asks for (Sheets and Drive for this account only).
5. Open **Execution log**. Copy the line `GOOGLE_SCRIPT_SECRET = …`. The Sheet **PAHAD Finance Records** now exists in the account's Drive.
6. Click **Deploy → New deployment → Select type: Web app**.
   - Description: `PAHAD website`
   - Execute as: **Me (pahad.org@gmail.com)**
   - Who has access: **Anyone** (the secret is what protects it)
   - Click **Deploy**, and copy the **Web app URL** (ends in `/exec`).
7. In Vercel → project **pahad** → Settings → Environment Variables (Production), add:
   - `GOOGLE_SCRIPT_URL` = the Web app URL
   - `GOOGLE_SCRIPT_SECRET` = the secret from step 5 (tick **Sensitive**)
8. Redeploy the site. On **Admin → Finance** you should see “Connected to the PAHAD finance Google Sheet and Drive”, then press **Retry sync now** to send anything that was queued.

## Who can see what

- The Sheet and the `PAHAD Finance` folder belong to `pahad.org@gmail.com`. Only the President and General Secretary hold its login.
- Share the Sheet and folder **view-only** with the Treasurer and Chief Executive Director if the Governing Body decides so. Only the Governing Body changes sharing.
- Turn on **version history** (it is on by default in Sheets) and make a periodic copy (File → Make a copy) as a backup.
- Receipt files are private. Anyone without access to the folder can't open the links.

## Changing the script later

Edit the code, then **Deploy → Manage deployments → Edit (pencil) → Version: New version → Deploy**. The URL stays the same.
