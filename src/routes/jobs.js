const express = require('express');
const multer = require('multer');
const path = require('path');
const { nanoid } = require('nanoid');
const { createJob, getJob, checkRateLimit } = require('../services/queue');

const router = express.Router();

// Configure multer for logo uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, '/tmp/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only PNG, JPG, or WebP images are allowed for logo'));
        }
    }
});

// Validate URL format
function isValidUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
}

// POST /api/jobs - Create new video generation job
router.post('/', upload.single('logo'), async (req, res) => {
    try {
        const { url, format = '9:16', duration = 15, credentials, mode = 'basic' } = req.body;
        // Enhancement options
        const { musicTrack, fontWeight, textColor, logoPosition, logoSize, logoOpacity } = req.body;

        // Validate URL
        if (!url || !isValidUrl(url)) {
            return res.status(400).json({ error: 'Invalid URL provided' });
        }

        // Validate format
        if (!['9:16', '16:9'].includes(format)) {
            return res.status(400).json({ error: 'Format must be 9:16 or 16:9' });
        }

        // Validate duration
        const maxDuration = parseInt(process.env.MAX_VIDEO_DURATION || 60);
        if (duration < 5 || duration > maxDuration) {
            return res.status(400).json({
                error: `Duration must be between 5 and ${maxDuration} seconds`
            });
        }

        // Get client IP
        const clientIp = req.ip || req.connection.remoteAddress;

        // Check rate limit (skip in development)
        if (process.env.NODE_ENV === 'production') {
            const rateLimitOk = await checkRateLimit(clientIp);

            if (!rateLimitOk) {
                return res.status(429).json({
                    error: 'Rate limit exceeded',
                    message: `You can only generate ${process.env.RATE_LIMIT_MAX_JOBS || 1} video per ${process.env.RATE_LIMIT_HOURS || 1} hour. Please try again later.`
                });
            }
        }

        // Build options object
        console.log(`[API] Creating job with mode: ${mode}, musicTrack: ${musicTrack || 'random'}`);
        const options = { mode };
        if (musicTrack) options.musicTrack = musicTrack;
        if (fontWeight) options.fontWeight = fontWeight;
        if (textColor) options.textColor = textColor;
        if (req.file) {
            options.logoPath = req.file.path;
            options.logoPosition = logoPosition || 'top-right';
            options.logoSize = parseInt(logoSize) || 80;
            options.logoOpacity = parseFloat(logoOpacity) || 0.8;
        }

        // Create job
        const jobId = nanoid(12);
        await createJob({
            id: jobId,
            url,
            format,
            duration,
            credentials, // Pass credentials to job
            options, // Pass enhancement options
            clientIp
        });

        console.log(`[API] Job created successfully: ${jobId} for IP: ${clientIp}`);
        res.status(202).json({
            id: jobId,
            status: 'queued',
            message: 'Job created successfully'
        });

    } catch (error) {
        console.error('Error creating job:', error);
        res.status(500).json({ error: 'Failed to create job' });
    }
});

// GET /api/jobs/:id - Get job status
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const job = await getJob(id);

        if (!job) {
            console.warn(`[API] Job NOT FOUND: ${id}`);
            return res.status(404).json({ error: 'Job not found' });
        }
        console.log(`[API] Job found: ${id}, status: ${job.status}`);

        // Redact sensitive credentials before returning to client
        const safeJob = { ...job };
        if (safeJob.credentials) delete safeJob.credentials;
        if (safeJob.options && safeJob.options.credentials) delete safeJob.options.credentials;

        res.json(safeJob);

    } catch (error) {
        console.error('Error getting job:', error);
        res.status(500).json({ error: 'Failed to get job status' });
    }
});

module.exports = router;
