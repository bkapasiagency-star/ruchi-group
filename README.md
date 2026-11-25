# Ruchi Group website

Corporate website for Ruchi Group (Ruchi Twisters Pvt. Ltd.), a textile and fashion fabric manufacturer in Surat, India.

A static site: plain HTML, CSS and JavaScript, with no build step.

## Structure

- `index.html`: the whole page
- `css/style.css`: styles
- `js/main.js`: animations and interactions (GSAP, ScrollTrigger, Flip and Lenis, loaded from CDNs)
- `assets/`: logo, favicons, images and the company film (`assets/video/`)

## Run locally

```
python .claude/serve.py 5173
```

Then open http://localhost:5173. This small server supports byte ranges, so the film's chapter links can seek. Any static server that sends `Accept-Ranges` works too.

## Deploy

Upload `index.html`, `css/`, `js/` and `assets/` to any static host.
