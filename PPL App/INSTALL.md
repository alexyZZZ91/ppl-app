# PPL Split — iPhone Install Guide

Follow these steps once and the app lives on your home screen like a native app, works fully offline, and saves all your data.

---

## Step 1 — Create a free GitHub account (skip if you have one)

1. Go to **github.com** and sign up (free)
2. Verify your email

---

## Step 2 — Create a new repository

1. Click the **+** button (top right) → **New repository**
2. Name it exactly: `ppl-app`
3. Set visibility to **Public** ← required for free hosting
4. ✅ Check **"Add a README file"**
5. Click **Create repository**

---

## Step 3 — Upload your files

Inside your new repo, click **Add file → Upload files**, then drag in these files/folders from your Desktop:

```
PPL App/
├── ppl_training_split.html   ← the main app
├── manifest.json
├── service-worker.js
└── icons/                    ← upload the whole folder
    ├── icon-120.png
    ├── icon-152.png
    ├── icon-167.png
    ├── icon-180.png
    ├── icon-192.png
    └── icon-512.png
```

> **Important:** Upload the `icons` folder and its contents, not just the files inside it.

Click **Commit changes** at the bottom.

---

## Step 4 — Enable GitHub Pages

1. In your repo, go to **Settings** (top tab)
2. Click **Pages** in the left sidebar
3. Under **Source**, select:
   - Branch: `main`
   - Folder: `/ (root)`
4. Click **Save**
5. Wait ~60 seconds. A green banner will appear with your URL:

```
https://YOUR-GITHUB-USERNAME.github.io/ppl-app/ppl_training_split.html
```

> Replace `YOUR-GITHUB-USERNAME` with your actual GitHub username.

---

## Step 5 — Install on iPhone

> ⚠️ **Must use Safari** — Chrome and other iOS browsers cannot install PWAs.

1. Open **Safari** on your iPhone
2. Go to your URL: `https://YOUR-GITHUB-USERNAME.github.io/ppl-app/ppl_training_split.html`
3. The app will load and show an **"Install as App"** banner at the bottom — this is your reminder
4. Tap the **Share button** (box with ↑ arrow) at the bottom of Safari
5. Scroll down and tap **"Add to Home Screen"**
6. The name will be **"PPL Split"** — tap **Add**
7. The app icon appears on your home screen ✅

---

## Step 6 — Test offline

1. Open the app from your home screen (not from Safari)
2. Enable **Airplane Mode**
3. Close and reopen the app
4. Everything should work — all 6 days, all exercises, weight logging, data saving

If it doesn't load offline the first time, open it in Airplane Mode **off** once more to let the service worker cache everything, then try again offline.

---

## Updating the app in future

When you make changes to the HTML:

1. Upload the updated `ppl_training_split.html` to GitHub (drag & drop → commit)
2. Open `service-worker.js`, change `'ppl-split-v1'` to `'ppl-split-v2'` → upload that too
3. Open the app on your iPhone while online — it will update automatically in the background
4. Close and reopen the app to see the changes

---

## Data & Storage Notes

- All workout data (checked exercises, weights, reps, session history) is stored in your browser's **localStorage** on your iPhone — no server, no account needed
- Data is tied to the GitHub Pages URL. If you change the URL, data starts fresh
- ⚠️ **iOS will clear localStorage if you don't open the app for 7+ days** (Apple's ITP policy). Make it a habit to open it at least once a week — which you will since you're training 6 days!
- To back up your data: open the app in Safari, open the console (via Mac → Safari Developer Tools), and run `JSON.stringify(localStorage.getItem('ppl_v4'))` to copy your data

---

## Troubleshooting

| Problem | Fix |
|---|---|
| App doesn't load offline | Open it online once to let the service worker cache files |
| Old version showing after update | Close all Safari tabs, reopen from home screen |
| "Add to Home Screen" is greyed out | Make sure you're using Safari, not Chrome |
| Data disappeared | Check if it's been 7+ days since last use (iOS ITP eviction) |
| Status bar overlaps the header | Hard refresh the app (only happens on very old iOS versions) |
