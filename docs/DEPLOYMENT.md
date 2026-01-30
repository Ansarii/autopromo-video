# Deployment Guide

AutoPromo Video is designed to be easily deployable on modern cloud platforms.

## Prerequisites

Regardless of the platform, you will need:
- **Node.js** (v20+)
- **Upstash Redis** (or any Redis service)
- **Cloudflare R2** (or AWS S3)
- **FFmpeg** installed in the environment

---

## 🚀 Deploying to Render

Render is the recommended platform for AutoPromo Video due to its excellent support for worker queues and Docker.

### Method 1: Blueprint (Recommended)

The repository includes a `render.yaml` file.
1. Connect your GitHub repository to Render.
2. Render will automatically detect the blueprint and set up:
   - Web service (API & Frontend)
   - Background worker (Job processor)
3. fill in the environment variables when prompted.

### Method 2: Manual Docker Deploy

1. Create a "Web Service" on Render.
2. Select your repository.
3. Choose "Docker" as the runtime.
4. Add your environment variables in the Render dashboard.

---

## 🐋 Deploying with Docker

You can run AutoPromo Video using Docker on any VPS or local machine.

### Using Docker Compose

Create a `docker-compose.yml`:

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file: .env
    restart: always
```

Run it:
```bash
docker-compose up -d
```

---

## ☁️ Deploying to Heroku

1. Create a new Heroku app:
   ```bash
   heroku git:remote -a autopromo-video
   ```
2. Add the FFmpeg buildpack:
   ```bash
   heroku buildpacks:add --index 1 https://github.com/jonathanong/heroku-buildpack-ffmpeg-latest.git
   heroku buildpacks:add heroku/nodejs
   ```
3. Set your environment variables:
   ```bash
   heroku config:set R2_ACCESS_KEY_ID=xxx ...
   ```
4. Push your code:
   ```bash
   git push heroku main
   ```

---

## 🛠️ Self-Hosting (Ubuntu/Debian)

1. **Install dependencies**:
   ```bash
   sudo apt update
   sudo apt install nodejs npm ffmpeg
   ```
2. **Setup Redis**: We recommend using Upstash for simplicity, or install Redis locally:
   ```bash
   sudo apt install redis-server
   ```
3. **Clone and Install**:
   ```bash
   git clone https://github.com/Ansarii/autopromo-video.git
   cd autopromo-video
   npm install --production
   ```
4. **Setup Environment**:
   ```bash
   cp .env.example .env
   nano .env
   ```
5. **Run with PM2**:
   ```bash
   sudo npm install -g pm2
   pm2 start src/server.js --name autopromo
   ```

---

## 🔼 Deploying to Vercel

Vercel is excellent for the web interface, but has strict limitations for the video generation pipeline.

### Limitations
- **Serverless Timeouts**: Vercel functions have a max execution time (usually 10s-30s on free, up to 900s on Pro). Video generation often exceeds these limits.
- **Binary Support**: Puppeteer and FFmpeg require specific setup or external layers that often exceed the 50MB function limit.
- **Background Workers**: AutoPromo uses a persistent worker model (`startWorker()`). Vercel's serverless model is short-lived and will not keep the worker running.

### Recommended Strategy
If you must use Vercel:
1. **Frontend Only**: Use Vercel to serve the `public/` folder.
2. **Backend**: Keep the API and Worker on Render or a VPS.
3. **Connection**: Point your frontend environment variables to your Render/VPS API URL.

> [!WARNING]
> For the full "URL-to-Video" pipeline, we strongly recommend **Render** or **Docker** to avoid timeout and binary issues.

---

## Troubleshooting

### Puppeteer missing shared libraries
If you see errors about missing `.so` files when running Puppeteer on a Linux server, you may need to install additional dependencies:
```bash
sudo apt-get install -y libgbm-dev libnss3 libatk-bridge2.0-0 libgtk-3-0 ...
```
(Refer to the [Puppeteer troubleshooting guide](https://pptr.dev/troubleshooting) for the full list).
