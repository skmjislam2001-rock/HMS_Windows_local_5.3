# MediCore HMS — Run locally & access from anywhere

Your hospital management system runs **on your computer** and is exposed to the
internet via a **Cloudflare Tunnel** (free, no account needed). A unique `https`
link is generated and **emailed to you** so you can open it from your phone,
tablet, or any browser — anywhere.

## One-click start

### Windows
Double-click **`start-medicore.bat`**

### Linux / macOS
```bash
./start-medicore.sh
```

That's it. The script automatically:
1. Installs dependencies (first time only)
2. Builds the web app
3. Downloads `cloudflared` if missing
4. Starts the local server + Cloudflare tunnel
5. Emails you the public link

## Email setup (so the link is sent to you)

Copy the example config and fill in your email details:

```bash
cp local-server/config.example.json local-server/config.json
```

Edit `local-server/config.json`:

```json
{
  "emailTo":   "your-email@gmail.com",
  "emailFrom": "your-email@gmail.com",
  "emailUser": "your-email@gmail.com",
  "emailPass": "your-16-char-gmail-app-password",
  "emailHost": "smtp.gmail.com",
  "emailPort": 465
}
```

### Getting a Gmail app password
1. Enable **2-Step Verification** on your Google account.
2. Go to https://myaccount.google.com/apppasswords
3. Create an app password (16 chars) and paste it into `emailPass`.

> Using another provider? Change `emailHost` / `emailPort` accordingly.

## What you'll see

```
  MediCore HMS running locally
  • This computer:  http://localhost:8787
  • Same Wi-Fi/LAN: http://192.168.x.x:8787
  • Starting Cloudflare quick tunnel…
  • Public link:   https://abc-def-ghi.trycloudflare.com
  • Emailing link to your-email@gmail.com…
  • Email sent!
```

Open the **public link** on any device. It stays active as long as the script
runs on your computer. Press **Ctrl+C** to stop the server and close the tunnel.

## Without email or tunnel (optional)

Set environment variables to skip parts:

| Variable        | Effect                              |
|-----------------|-------------------------------------|
| `HMS_NO_TUNNEL=1` | Skip the tunnel (LAN access only) |
| `HMS_NO_EMAIL=1`  | Don't email the link             |
| `HMS_PORT=9000`   | Use a different local port        |

Example (LAN only, no email):
```bash
HMS_NO_TUNNEL=1 node local-server/serve.mjs
```

## How it works

- **Local server** (`local-server/serve.mjs`): a tiny static file server for the
  built app in `dist/`.
- **Cloudflare Tunnel**: `cloudflared tunnel --url http://localhost:8787` creates
  a free temporary public HTTPS URL that forwards to your local server. No port
  forwarding, no firewall changes, no domain needed.
- **Email**: the link is emailed via SMTP (Gmail app password or any SMTP provider).

## Files added for local deployment

```
start-medicore.bat          ← one-click launcher (Windows)
start-medicore.sh           ← one-click launcher (Linux/macOS)
local-server/serve.mjs      ← local server + tunnel + email
local-server/config.example.json  ← email config template
```
