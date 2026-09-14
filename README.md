# MoonWeb — Windows build

This is the MoonWeb source project prepared for a real Windows x64 Electron build.

## Build locally on Windows

Install Node.js 20+, then from this folder:

```powershell
npm install
npm run build:win
```

The installer is written to `dist/MoonWeb-Setup-1.0.0-x64.exe`.

Electron bundles its own Chromium runtime, so the finished app does **not** require Microsoft Edge.

## Build without installing Node.js on your PC

Push this project to a GitHub repository, open **Actions → Build MoonWeb for Windows → Run workflow**. The Windows runner builds the installer and uploads it as an artifact.

## Current privacy features

- Known ad/analytics host blocking
- Referrer header stripping
- `X-Client-Data` stripping
- Denied web permission requests
- Sandboxed renderer
- Unpacked Chromium extension loading
- Search-provider privacy labels

## Important limitations

- This is an Electron/Chromium browser shell, not a full Chromium fork. Do not describe it as having all Google proprietary Chrome telemetry removed.
- The Chrome Web Store can be opened, but direct installation of arbitrary Chrome Web Store extensions is not guaranteed by Electron. Unpacked extensions can be loaded from a local folder.
- The VPN UI does not fake a connection. A production built-in VPN needs an actual VPN backend/provider (for example WireGuard/Wintun) and a configuration.
- The ad blocker currently uses a small built-in host list. Production MoonWeb should use maintained filter lists and update them safely.
