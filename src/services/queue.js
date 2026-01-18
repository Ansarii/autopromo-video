const { Redis } = require('@upstash/redis');
const { generateVideo } = require('./video-generator');

// In-memory storage fallback for local development
const inMemoryStorage = {
    jobs: new Map(),
    queue: [],
    rateLimits: new Map()
};

// Initialize Redis client with fallback
let redis = null;
let useInMemory = false;


// Check if we have valid Redis credentials
if (redisUrl && redisUrl.startsWith('https://') && redisToken) {
    redis = new Redis({
        url: redisUrl,
        token: redisToken
    });
    console.log('✅ Connected to Upstash Redis');
} else {
    useInMemory = true;
    console.warn('⚠️  Redis credentials not configured - using in-memory storage (for local dev only)');
}
} catch (error) {
    useInMemory = true;
    console.warn('⚠️  Failed to initialize Redis - using in-memory storage:', error.message);
}


// In-memory wrappers
const storage = {
    async get(key) {
        if (useInMemory) {
            return inMemoryStorage.rateLimits.get(key) || null;
        }
        return await redis.get(key);
    },
    async setex(key, seconds, value) {
        if (useInMemory) {
            inMemoryStorage.rateLimits.set(key, value);
            setTimeout(() => inMemoryStorage.rateLimits.delete(key), seconds * 1000);
            return 'OK';
        }
        return await redis.setex(key, seconds, value);
    },
    async hset(key, data) {
        if (useInMemory) {
            const existing = inMemoryStorage.jobs.get(key) || {};
            inMemoryStorage.jobs.set(key, { ...existing, ...data });
            return 1;
        }
        return await redis.hset(key, data);
    },
    async hgetall(key) {
        if (useInMemory) {
            return inMemoryStorage.jobs.get(key) || {};
        }
        return await redis.hgetall(key);
    },
    async lpush(key, value) {
        if (useInMemory) {
            inMemoryStorage.queue.push(value);
            return inMemoryStorage.queue.length;
        }
        return await redis.lpush(key, value);
    },
    async brpop(key, timeout) {
        if (useInMemory) {
            if (inMemoryStorage.queue.length > 0) {
                return [key, inMemoryStorage.queue.shift()];
            }
            return null;
        }
        return await redis.brpop(key, timeout);
    }
};

// Check rate limit for IP address
async function checkRateLimit(ip) {
    const key = `ratelimit:${ip}`;
    const existing = await storage.get(key);

    if (existing) {
        return false; // Rate limited
    }

    // Set rate limit (expires after configured hours)
    const hours = parseInt(process.env.RATE_LIMIT_HOURS || 1);
    await storage.setex(key, hours * 3600, '1');

    return true;
}

// Create a new job
async function createJob(jobData) {
    const { id, url, format, duration, credentials, options, clientIp } = jobData;

    // Store job metadata
    const metadata = {
        url,
        format,
        duration,
        status: 'queued',
        progress: 0,
        options: JSON.stringify(options || {}), // Ensure options persist as string
        created: Date.now(),
        clientIp
    };

    if (credentials) {
        metadata.hasCredentials = 'true';
        // Store credentials separately with shorter TTL
        await storage.hset(`job:${id}:credentials`, credentials);
    }

    await storage.hset(`job:${id}`, metadata);

    // Add to processing queue
    await storage.lpush('queue:jobs', id);

    return id;
}

// Get job details
async function getJob(id) {
    const job = await storage.hgetall(`job:${id}`);

    if (!job || Object.keys(job).length === 0) {
        return null;
    }

    // Load credentials if they exist
    let credentials = null;
    if (job.hasCredentials === 'true') {
        credentials = await storage.hgetall(`job:${id}:credentials`);
    }

    // Parse options
    let options = {};
    if (job.options) {
        try {
            options = typeof job.options === 'string' ? JSON.parse(job.options) : job.options;
        } catch (e) {
            console.error(`Error parsing job options for ${id}:`, e);
        }
    }

    return {
        id,
        ...job,
        options,
        credentials, // Include credentials
        progress: parseInt(job.progress || 0),
        duration: parseInt(job.duration),
        created: parseInt(job.created)
    };
}

// Update job status
async function updateJobStatus(id, status, progress = null, videoUrl = null, error = null) {
    const updates = { status };

    if (progress !== null) updates.progress = progress;
    if (videoUrl) updates.videoUrl = videoUrl;
    if (error) updates.error = error;
    if (status === 'completed' || status === 'failed') {
        updates.completed = Date.now();
    }

    await storage.hset(`job:${id}`, updates);
}

// Background worker to process jobs
async function startWorker() {
    console.log('🔄 Starting job worker...');

    // Simple worker loop
    async function processNextJob() {
        try {
            // Block and wait for job (BRPOP with 5 second timeout)
            const result = await storage.brpop('queue:jobs', 5);

            if (!result || result.length < 2) {
                // No job available, try again
                setTimeout(processNextJob, 1000);
                return;
            }

            const jobId = result[1];
            console.log(`📹 Processing job: ${jobId}`);

            const job = await getJob(jobId);
            if (!job) {
                console.error(`Job ${jobId} not found`);
                setTimeout(processNextJob, 0);
                return;
            }

            // Update status to processing
            await updateJobStatus(jobId, 'processing', 10);

            try {
                console.log(`[Queue] Processing job ${jobId} with options:`, JSON.stringify(job.options));

                // Generate video
                const videoUrl = await generateVideo({
                    jobId,
                    url: job.url,
                    format: job.format,
                    duration: job.duration,
                    credentials: job.credentials, // Pass credentials for login
                    options: job.options || {}, // Pass enhancement options
                    onProgress: (progress) => {
                        updateJobStatus(jobId, 'processing', progress);
                    }
                });

                // Mark as completed
                await updateJobStatus(jobId, 'completed', 100, videoUrl);
                console.log(`✅ Job completed: ${jobId}`);

            } catch (error) {
                console.error(`❌ Job failed: ${jobId}`, error);
                await updateJobStatus(jobId, 'failed', null, null, error.message);
            }

            // Process next job immediately
            setTimeout(processNextJob, 0);

        } catch (error) {
            console.error('Worker error:', error);
            // Wait before retrying on error
            setTimeout(processNextJob, 5000);
        }
    }

    // Start the worker
    processNextJob();
}

module.exports = {
    checkRateLimit,
    createJob,
    getJob,
    updateJobStatus,
    startWorker
};
