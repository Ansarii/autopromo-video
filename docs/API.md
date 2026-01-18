# API Reference

AutoPromo Video provides a REST API to programmatically generate marketing videos.

## Base URL

Local development: `http://localhost:3000`
Production: `https://your-app-name.render.com` (example)

## Authentication

*Currently, the API does not require authentication for internal use. If exposed publicly, we recommend implementing API key authentication.*

## Endpoints

### 1. Create Video Job

Create a new video generation job.

**URL**: `/api/jobs`
**Method**: `POST`
**Content-Type**: `application/json`

**Request Body**:

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| `url` | String | Yes | The URL of the website to capture. |
| `format` | String | No | Aspect ratio: `16:9` (default) or `9:16`. |
| `duration` | Number | No | Duration in seconds: `15`, `30` (default), `45`, or `60`. |
| `mode` | String | No | Mode: `simple_scroll` or `pro_director` (default). |
| `musicTrack` | String | No | Filename of the track to use (e.g., `track1.mp3`). |

**Example Request**:

```json
{
  "url": "https://example.com",
  "format": "16:9",
  "duration": 30,
  "mode": "pro_director"
}
```

**Example Response (Success)**:

```json
{
  "jobId": "abc12345",
  "status": "queued",
  "message": "Job created successfully"
}
```

### 2. Check Job Status

Check the status of a specific generation job and retrieve the download link when finished.

**URL**: `/api/jobs/:jobId`
**Method**: `GET`

**Example Response (In Progress)**:

```json
{
  "jobId": "abc12345",
  "status": "processing",
  "progress": 45
}
```

**Example Response (Completed)**:

```json
{
  "jobId": "abc12345",
  "status": "completed",
  "videoUrl": "https://pub-xxx.r2.dev/videos/abc12345.mp4",
  "thumbnailUrl": "https://pub-xxx.r2.dev/thumbnails/abc12345.png"
}
```

**Example Response (Failed)**:

```json
{
  "jobId": "abc12345",
  "status": "failed",
  "error": "Failed to render page: Timeout exceeded"
}
```

## Error Codes

| Status Code | Description |
| ----------- | ----------- |
| `400` | Bad Request - Missing or invalid parameters. |
| `429` | Too Many Requests - Rate limit exceeded. |
| `404` | Not Found - Job ID does not exist. |
| `500` | Internal Server Error - Unexpected error during processing. |

## Rate Limiting

The API is rate-limited by IP address.
- Default: 5 jobs per hour per IP.
- Configurable via `RATE_LIMIT_MAX_JOBS` and `RATE_LIMIT_HOURS` in `.env`.
