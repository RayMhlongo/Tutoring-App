# 📚 X-Factor Tutoring — Business Manager PWA

A complete tutoring business management app built for X-Factor Tutoring.

## ✅ Features
- **Students** — full profiles, service type, subjects, parent contact
- **Lesson Log** — attendance, topics covered, homework tracking
- **Marks** — per-subject, per-term academic tracking with symbols
- **Payments** — invoicing, outstanding/overdue tracking, mark-as-paid
- **Expenses** — category breakdown, monthly P&L
- **Schedule** — weekly timetable grid
- **Parent Comms** — log communications, follow-up reminders
- **WhatsApp Broadcast** — message all/filtered parents in one tap
- **Reports** — monthly finance report + per-student report (printable)
- **Export** — all data to Excel with one tap
- **Offline-first** — works without internet, auto-syncs when back online
- **PWA** — installs on phone like a native app

## 🚀 Deploy to GitHub Pages

### Step 1 — Create repo
1. Go to [github.com](https://github.com) → **New repository**
2. Name: `xfactor-tutoring` | Set to **Public**
3. Click **Create repository**

### Step 2 — Upload files
1. Click **uploading an existing file**
2. Drag ALL files: `index.html`, `manifest.json`, `service-worker.js`, `README.md`, and the `icons/` folder
3. Click **Commit changes**

### Step 3 — Enable GitHub Pages
1. **Settings → Pages**
2. Source: **Deploy from branch → main → / (root)**
3. Save → wait 2 minutes
4. Your URL: `https://yourusername.github.io/xfactor-tutoring`

### Step 4 — Install on phone
1. Open the URL in **Chrome**
2. Tap **⋮ → Add to Home Screen** — OR tap the **Install** button in the app header
3. Done ✅

---

## 📡 Google Sheets Setup

### Step 1 — Create Google Sheet with these tabs (exact names):
`Students` | `Lessons` | `Marks` | `Payments` | `Expenses` | `Comms`

### Step 2 — Add headers

**Students:** `id | name | grade | school | service | subjects | days | status | parent | phone | email | start | notes`

**Lessons:** `id | date | studentId | studentName | grade | attendance | subject | hours | topics | hwSet | hwDone | notes`

**Marks:** `id | date | studentId | studentName | grade | subject | term | type | mark | symbol | flag | notes`

**Payments:** `id | invoiceNo | studentId | studentName | amount | paid | date | method | status | month | notes`

**Expenses:** `id | date | month | amount | category | desc | receipt | notes`

**Comms:** `id | date | studentId | studentName | parent | method | topic | summary | followupRequired | followupDate | done`

### Step 3 — Deploy Apps Script
1. Sheet → **Extensions → Apps Script**
2. Paste code from `apps-script.gs`
3. **Deploy → New Deployment → Web App**
4. Execute as: **Me** | Access: **Anyone**
5. Authorise → copy the URL

### Step 4 — Connect
1. Open the app → **⚙️ Settings**
2. Paste the Apps Script URL
3. Tap **🔌 Test** → green = connected ✅

---
*Built with ❤️ — localStorage + Google Sheets, hosted on GitHub Pages*
