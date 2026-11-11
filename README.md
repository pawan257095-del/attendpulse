# AttendPulse — Daily Attendance Register

An offline-first attendance register for activities, members, shifts, holidays, reports, and encrypted backups. Data is stored in the browser using IndexedDB.

## Requirements

- Node.js 20.19+ or 22.12+ (Vite 8 requirement)
- npm (included with Node.js)

## Run on Windows

From this folder, open Command Prompt or PowerShell and run:

```cmd
npm.cmd install
npm.cmd run dev
```

Open the local URL printed by Vite (usually `http://localhost:3000`). No API key or `.env` file is required.

## Other commands

```cmd
npm.cmd run build
npm.cmd run preview
npm.cmd run lint
npm.cmd test
```

The app works offline after it has been loaded once. Back up your data regularly from **Backup & Restore**; browser data is local to the browser profile and device.
