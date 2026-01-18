# Configuration Guide

AutoPromo Video uses environment variables for configuration. Create a `.env` file in the root directory based on `.env.example`.

## Environment Variables

### Server Settings

| Variable | Description | Default |
| -------- | ----------- | ------- |
| `PORT` | The port the Express server will listen on. | `3000` |
| `NODE_ENV` | Environment mode (`development` or `production`). | `development` |

### Redis (Required)

Used for job queuing and rate limiting.

| Variable | Description | Example |
| -------- | ----------- | ------- |
| `UPSTASH_REDIS_URL` | Full Redis connection string. | `redis://default:xxx@xxx.upstash.io:6379` |

### Cloud Storage (Required)

Used to host generated videos and thumbnails. Compatible with Cloudflare R2 or AWS S3.

| Variable | Description | Example |
| -------- | ----------- | ------- |
| `R2_ACCOUNT_ID` | Your Cloudflare Account ID. | `abc123def456` |
| `R2_ACCESS_KEY_ID` | R2 API Access Key ID. | `xxx` |
| `R2_SECRET_ACCESS_KEY` | R2 API Secret Access Key. | `xxx` |
| `R2_BUCKET_NAME` | The bucket to store files in. | `autopromo-videos` |
| `R2_PUBLIC_URL` | The public URL for the bucket. | `https://pub-xxx.r2.dev` |

### Video Generation Settings

| Variable | Description | Default |
| -------- | ----------- | ------- |
| `MAX_VIDEO_DURATION` | Maximum allowed duration in seconds. | `60` |
| `DEFAULT_VIDEO_DURATION` | Default duration if not specified. | `30` |
| `VIDEO_CLEANUP_HOURS` | Hours to keep local temporary files. | `24` |

### Rate Limiting

| Variable | Description | Default |
| -------- | ----------- | ------- |
| `RATE_LIMIT_HOURS` | Time window for rate limiting in hours. | `1` |
| `RATE_LIMIT_MAX_JOBS` | Max jobs per IP in the time window. | `5` |

## Advanced Configuration

### Docker

If running via Docker, you can pass environment variables using the `--env-file` flag or by defining them in your `docker-compose.yml`.

### Puppeteer Headless Mode

By default, Puppeteer runs in `new` headless mode. If you need to debug visual issues on a local machine, you can modify `src/services/videoGenerator.js` to set `headless: false`.

### FFmpeg Path

The app assumes `ffmpeg` is in your system PATH. If it's installed in a non-standard location, you can set the path manually using `fluent-ffmpeg`:

```javascript
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath('/path/to/ffmpeg');
```
