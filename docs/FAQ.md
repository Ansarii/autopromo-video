# Frequently Asked Questions (FAQ)

## General Questions

### What sites can I use?
AutoPromo works with almost any publicly accessible website. Some sites with aggressive bot protection (like Amazon or Google) may require advanced Puppeteer settings (stealth mode) or may not work at all.

### How long does it take to generate a video?
On average, a 30-second video takes about 45-60 seconds to generate. This depends on the website's complexity and the server's CPU power.

### Is the music royalty-free?
Yes, the included music tracks are royalty-free. However, if you add your own music, ensure you have the rights to use it.

---

## Technical Questions

### Why am I getting "Failed to launch browser"?
This usually means some Linux dependencies for Puppeteer are missing. See the [Deployment Guide](DEPLOYMENT.md#troubleshooting) for a fix.

### Can I change the generation FPS?
Currently, it's hardcoded at 10 FPS to balance quality and speed. You can modify this in `src/services/videoGenerator.js`.

### How do I use AWS S3 instead of Cloudflare R2?
Simply update your `.env` with your AWS credentials. The `StorageService` is compatible with any S3-compliant API.

---

## Troubleshooting

### My video is just a white screen
Make sure the URL you provided is fully qualified (starts with `https://`). If it still fails, the site might be blocking headless browsers.

### Redis connection errors
Verify that your `UPSTASH_REDIS_URL` is correct and that your IP is allowlisted in the Upstash console if you have restricted access.

### FFmpeg not found
Ensure FFmpeg is installed and accessible in your system's PATH. On Render, make sure you use the `render.yaml` blueprint or the Dockerfile.

---

## Contributing

### Can I add new camera movements?
Absolutely! Check out `src/services/directorService.js` to see how scenes and movements are defined. We welcome PRs for new cinematic styles.

### How do I add my own music?
Add your MP3 files to `public/music/` and they will automatically appear in the generation options.
