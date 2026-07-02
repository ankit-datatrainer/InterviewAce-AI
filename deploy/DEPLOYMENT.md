# Deploying InterviewAce AI to your VPS

Domain: **interviewaceai.peculiex.com**

This guide is written for someone with **no technical background**. Follow it top to
bottom. Anything in `code font` is a command you paste into your VPS terminal
(connected via SSH / your host's "Web Terminal" / PuTTY).

Replace **`YOUR_VPS_IP`** everywhere with your server's public IP address.

---

## Part 1 — DNS (do this first; it takes time to activate)

Go to wherever you manage DNS for **peculiex.com** (your domain registrar or hosting
DNS panel). Add ONE record:

| Field | Value |
|-------|-------|
| Type  | **A** |
| Name / Host | **interviewaceai** |
| Value / Points to | **YOUR_VPS_IP** (your server's public IP) |
| TTL | Automatic / 3600 |

That's it. This tells the internet that `interviewaceai.peculiex.com` → your server.
DNS can take 5 minutes to a few hours to spread. You can continue with the next
steps while it activates.

> Do NOT add a CNAME or a second record for the same name — just the one A record.

---

## Part 2 — Prepare the VPS (one-time setup)

Connect to your VPS, then install the tools we need.

1. Update the server:
   ```
   sudo apt update && sudo apt upgrade -y
   ```

2. Install Node.js 20 (the app needs Node 18+):
   ```
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs
   ```

3. Install PM2 (keeps the app running 24/7) and the web server + SSL tool:
   ```
   sudo npm install -g pm2
   sudo apt install -y nginx certbot python3-certbot-nginx git
   ```

---

## Part 3 — Put your code on the VPS

Get the project onto the server, into `/var/www/interviewaceai`.

**Easiest way (via GitHub):** push your project to a private GitHub repo, then:
```
sudo mkdir -p /var/www/interviewaceai
sudo chown -R $USER:$USER /var/www/interviewaceai
git clone YOUR_GITHUB_REPO_URL /var/www/interviewaceai
cd /var/www/interviewaceai
```

**Alternative:** use your host's file manager / SFTP to upload the whole project
folder to `/var/www/interviewaceai`. Do **not** upload the `node_modules` or
`.next` folders — those get rebuilt on the server.

---

## Part 4 — Add your secret keys

The app reads all keys from a file called `.env.local` in the project folder.
This file is intentionally NOT in Git, so you create it on the server:

```
cd /var/www/interviewaceai
nano .env.local
```

Paste the SAME contents as your local `.env.local` (Supabase, LiveAvatar,
VideoSDK, NVIDIA, Razorpay, SMTP keys). Save with `Ctrl+O`, `Enter`, then exit
with `Ctrl+X`.

> Keep this file secret. It contains live payment and API keys.

---

## Part 5 — Build and start the app

```
cd /var/www/interviewaceai
npm install
npm run build
pm2 start deploy/ecosystem.config.js
pm2 save
pm2 startup
```

The last command prints one more command — copy/paste and run it once. This makes
the app restart automatically if the server ever reboots.

Check it's running:
```
pm2 status
```
You should see `interviewaceai` with status **online**.

---

## Part 6 — Connect the domain + turn on HTTPS (the padlock)

1. Copy the included Nginx config into place:
   ```
   sudo cp /var/www/interviewaceai/deploy/nginx-interviewaceai.conf /etc/nginx/sites-available/interviewaceai
   sudo ln -s /etc/nginx/sites-available/interviewaceai /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

2. Get a free SSL certificate (only works AFTER the DNS from Part 1 is active):
   ```
   sudo certbot --nginx -d interviewaceai.peculiex.com
   ```
   Answer the prompts (enter your email, agree, and choose to redirect HTTP→HTTPS).
   Certbot edits the Nginx file for you and auto-renews the certificate.

---

## Part 7 — Tell Supabase about the new domain (important for login)

In your Supabase dashboard → **Authentication → URL Configuration**:
- Set **Site URL** to: `https://interviewaceai.peculiex.com`
- Add it under **Redirect URLs** too: `https://interviewaceai.peculiex.com/**`

Without this, sign-up confirmation emails and logins can misbehave.

> Also make sure your Razorpay dashboard's allowed domains (if any) include the
> new domain, and that any webhook URLs point to it.

---

## Part 8 — Test it

Open **https://interviewaceai.peculiex.com** in a browser. You should see the site
with a padlock. Try: sign up / log in, start a mock interview (avatar loads and
talks), and book a coaching session (video room opens).

---

## Updating the site later (when you change code)

```
cd /var/www/interviewaceai
git pull                 # or re-upload changed files
npm install              # only if dependencies changed
npm run build
pm2 restart interviewaceai
```

---

## If something goes wrong — quick checks

- App not loading at all → `pm2 status` and `pm2 logs interviewaceai`
- "502 Bad Gateway" → the app isn't running on port 3000; check `pm2 logs`
- Domain shows nothing → DNS not active yet, or Nginx not reloaded
- Login/avatar fails → a key is missing from `.env.local`, or Supabase Site URL not set
- Certbot fails → DNS (Part 1) hasn't activated yet; wait and retry
