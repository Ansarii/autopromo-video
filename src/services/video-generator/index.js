const { launchBrowser, captureSite } = require('./browser');
const { generateVideoFromFrames } = require('./ffmpeg');
const { uploadToR2 } = require('./storage');
const fs = require('fs').promises;
const path = require('path');

async function generateVideo({ jobId, url, format, duration, credentials, options = {}, onProgress }) {
    const tempDir = `/tmp/autopromo/${jobId}`;
    const framesDir = path.join(tempDir, 'frames');
    const outputPath = path.join(tempDir, 'output.mp4');

    try {
        // Create temp directories
        await fs.mkdir(framesDir, { recursive: true });

        // Step 1: Capture website (0-40%)
        onProgress(15);
        console.log(`[${jobId}] Launching browser...`);
        console.log(`[${jobId}] Options received:`, JSON.stringify(options));
        console.log(`[${jobId}] Mode being passed to captureSite: "${options.mode}"`);

        const { frames, metadata, shots, narrative } = await captureSite({
            url,
            format,
            duration,
            credentials, // Pass credentials for login
            outputDir: framesDir,
            mode: options.mode // Pass mode (basic vs pro_director)
        });

        onProgress(40);
        console.log(`[${jobId}] Captured ${frames} frames`);

        // Step 2: Generate video with FFmpeg (40-80%)
        onProgress(50);
        console.log(`[${jobId}] Generating video with options:`, options);

        await generateVideoFromFrames({
            framesDir,
            outputPath,
            metadata,
            duration,
            format,
            options, // Pass enhancement options
            shots,   // Pass shots for Pro Director editing
            narrative // Pass narrative for professional captions
        });

        onProgress(80);
        console.log(`[${jobId}] Video generated`);

        // Step 3: For development, serve locally. For production, upload to R2
        let videoUrl;

        if (process.env.NODE_ENV === 'production') {
            onProgress(85);
            console.log(`[${jobId}] Uploading to R2...`);
            videoUrl = await uploadToR2(outputPath, jobId);
            onProgress(95);
            console.log(`[${jobId}] Upload complete: ${videoUrl}`);

            // Cleanup temp files after upload
            await fs.rm(tempDir, { recursive: true, force: true });
        } else {
            // Development: Copy to public directory and serve locally
            const publicVideosDir = path.join(__dirname, '../../../public/videos');
            await fs.mkdir(publicVideosDir, { recursive: true });

            const publicVideoPath = path.join(publicVideosDir, `${jobId}.mp4`);
            await fs.copyFile(outputPath, publicVideoPath);

            videoUrl = `/videos/${jobId}.mp4`;
            console.log(`[${jobId}] Video saved locally: ${videoUrl}`);

            // Cleanup temp directory but keep the public video
            await fs.rm(tempDir, { recursive: true, force: true });
        }

        onProgress(100);

        return videoUrl;

    } catch (error) {
        console.error(`[${jobId}] Error:`, error);

        // Cleanup on error
        try {
            await fs.rm(tempDir, { recursive: true, force: true });
        } catch (cleanupError) {
            console.error('Cleanup error:', cleanupError);
        }

        throw error;
    }
}

module.exports = { generateVideo };
