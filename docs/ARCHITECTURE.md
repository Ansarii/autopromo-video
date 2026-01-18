# Technical Architecture

AutoPromo Video is built on a distributed, queue-based architecture to handle resource-intensive video generation without blocking the web server.

## System Overview

![Architecture Diagram](../assets/architecture.png)

The system consists of three main components:
1. **Express Server**: Handles API requests, serves the frontend, and manages job queuing.
2. **Redis Queue**: Acts as the message broker between the server and the worker.
3. **Worker Pipeline**: Executes the actual browser automation and video processing.

## Job Lifecycle

1. **Request**: The user submits a URL via the UI or API.
2. **Validation**: The server validates the URL and parameters.
3. **Queuing**: A unique `jobId` is generated, and the job is pushed to the Redis queue.
4. **Status Polling**: The client starts polling `/api/jobs/:jobId` for updates.
5. **Processing**: The worker picks up the job and starts the pipeline:
   - **Puppeteer Session**: Launches a headless browser.
   - **Capture**: Navigates to the URL and captures frames at 10 FPS.
   - **Camera Logic**: Applies cinematic movements (zooms, pans) based on the "Pro Director" algorithm.
   - **Encoding**: FFmpeg takes the frames and encodes them into an MP4 file.
   - **Post-Processing**: Adds background music and the logo overlay.
6. **Upload**: The final MP4 and a thumbnail are uploaded to Cloudflare R2 / AWS S3.
7. **Cleanup**: Temporary local frames and video files are deleted.
8. **Completion**: The job status in Redis is updated to `completed`, including the download URL.

## Core Services

- **JobService**: Interfaces with Redis to manage state and queuing.
- **VideoGenerator**: Orchestrates Puppeteer and FFmpeg.
- **StorageService**: Handles R2/S3 operations.
- **DirectorService**: Contains the logic for camera movements and scene generation.

## Performance Considerations

- **Concurrency**: Each job spawns a Puppeteer instance, which is CPU and RAM intensive. We recommend limiting concurrency to 1-2 jobs per CPU core.
- **Storage**: R2 is used to avoid filling up the server's disk space.
- **Rate Limiting**: Essential to prevent abuse, as each video generation has a real cost in cloud compute and storage bandwidth.

## Security

- **Input Validation**: All URLs are sanitized.
- **Headless Isolation**: Puppeteer runs in a restricted sandbox.
- **Private Storage**: Buckets should be private, with public access only via a CDN or signed URLs if required.
