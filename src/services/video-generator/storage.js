const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs = require('fs').promises;
const path = require('path');

// Initialize R2 client (S3-compatible)
function getR2Client() {
    const accountId = (process.env.R2_ACCOUNT_ID || '').trim();
    const accessKeyId = (process.env.R2_ACCESS_KEY_ID || '').trim();
    const secretAccessKey = (process.env.R2_SECRET_ACCESS_KEY || '').trim();
    const endpoint = (process.env.R2_ENDPOINT || '').trim();

    if (!accessKeyId || !secretAccessKey || (!accountId && !endpoint)) {
        console.warn('R2 credentials not fully configured, will skip upload');
        return null;
    }

    return new S3Client({
        region: 'auto',
        endpoint: endpoint || `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId,
            secretAccessKey
        }
    });
}

async function uploadToR2(filePath, jobId) {
    const client = getR2Client();

    // Fallback: if R2 not configured, return local path (for development)
    if (!client) {
        console.warn('R2 not configured, using fallback URL');
        return `/videos/${jobId}.mp4`;
    }

    try {
        // Read file
        const fileBuffer = await fs.readFile(filePath);
        const fileName = `videos/${jobId}.mp4`;

        // Upload to R2
        const command = new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: fileName,
            Body: fileBuffer,
            ContentType: 'video/mp4',
            // Set metadata for auto-cleanup (handled by R2 lifecycle rules)
            Metadata: {
                'created-at': new Date().toISOString(),
                'job-id': jobId
            }
        });

        await client.send(command);
        console.log(`Uploaded to R2: ${fileName}`);

        // Return public URL or signed URL
        if (process.env.R2_PUBLIC_URL) {
            return `${process.env.R2_PUBLIC_URL}/${fileName}`;
        }

        // Generate signed URL (24 hour expiry)
        const signedUrl = await getSignedUrl(client, command, { expiresIn: 86400 });
        return signedUrl;

    } catch (error) {
        console.error('R2 upload error:', error);
        throw new Error('Failed to upload video to storage');
    }
}

module.exports = {
    uploadToR2
};
