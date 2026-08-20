# QR Generator

Static QR-code generator: live preview as you type, colours, size, error correction, and PNG download. Works on iPhone and iPad (share sheet / press-and-hold).

No backend. No CDN. Open `index.html` locally or on GitHub Pages.

**Live site:** https://itsjoshheng.github.io/qr/

## Enable GitHub Pages (one click)

This repo is ready to publish from `main`. GitHub does not turn Pages on automatically:

1. Open **[Settings → Pages](https://github.com/itsJoshHeng/qr/settings/pages)**
2. Under **Build and deployment → Source**, choose **Deploy from a branch**
3. Branch: **`main`** / folder: **`/ (root)`** → **Save**

The site is then at **https://itsjoshheng.github.io/qr/** (usually within a minute).

## Files

- `index.html` — page
- `styles.css` — layout and theme
- `app.js` — generator, palettes, iOS save sheet
- `qrcode.min.js` — vendored [node-qrcode](https://github.com/soldair/node-qrcode) browser bundle
- `favicon.svg` — icon
