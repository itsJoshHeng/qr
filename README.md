# QR Generator

A static QR-code generator: live preview as you type, colours, size, error correction, and PNG download. Works on iPhone and iPad (share sheet / press-and-hold).

No backend. No CDN. Open `index.html` locally or on GitHub Pages.

## GitHub Pages

This repo deploys from `main` via GitHub Actions (`.github/workflows/pages.yml`).

After the first push, the site is at:

**https://itsjoshheng.github.io/qr/**

If the first Actions run asks you to enable Pages: **Settings → Pages → Source → GitHub Actions**.

You can also skip Actions and set **Settings → Pages → Deploy from a branch → `main` / `/ (root)`**.

## Files

- `index.html` — page
- `styles.css` — layout and theme
- `app.js` — generator, palettes, iOS save sheet
- `qrcode.min.js` — vendored [node-qrcode](https://github.com/soldair/node-qrcode) browser bundle
- `favicon.svg` — icon
