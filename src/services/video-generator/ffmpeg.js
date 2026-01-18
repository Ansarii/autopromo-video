const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

// Set ffmpeg paths - try multiple locations
const ffmpegPaths = [
    '/usr/local/bin/ffmpeg',
    '/opt/homebrew/bin/ffmpeg',
    '/usr/bin/ffmpeg',
    process.env.FFMPEG_PATH
].filter(Boolean);

const ffmpegPath = ffmpegPaths.find(p => fs.existsSync(p));
const ffprobePath = ffmpegPath ? ffmpegPath.replace('ffmpeg', 'ffprobe') : null;

if (ffmpegPath) {
    console.log(`Using ffmpeg at: ${ffmpegPath}`);
    ffmpeg.setFfmpegPath(ffmpegPath);
    if (ffprobePath && fs.existsSync(ffprobePath)) {
        ffmpeg.setFfprobePath(ffprobePath);
    }
} else {
    console.warn('FFmpeg not found in common locations, relying on PATH');
}


/**
 * Sanitize caption text for FFmpeg drawtext filter
 */
function sanitizeCaption(text) {
    if (!text) return '';
    return text
        .replace(/\\/g, '\\\\\\\\')
        .replace(/'/g, "\\\'\\'\\\'") // Escape for single quote inside single quote drawtext
        .replace(/:/g, '\\\\:')
        .replace(/%/g, '\\%')
        .replace(/[\r\n]+/g, ' ')
        .trim();
}
/**
 * Generate captions from narrative metadata (Professional)
 */
function generateNarrativeCaptions(shots, narrative) {
    const captions = [];

    if (narrative) {
        // Hook caption
        if (narrative.hook) {
            captions.push({
                text: narrative.hook,
                startTime: 0.5,
                duration: 2.5,
                style: 'headline',
                position: 'center'
            });
        }

        // Solution captions from shots
        shots.forEach((shot) => {
            if (shot.caption && shot.caption.text) {
                captions.push({
                    text: shot.caption.text,
                    startTime: shot.startTime + (shot.caption.startTime || 0.5),
                    duration: shot.caption.duration || 2.5,
                    style: shot.caption.style || 'feature',
                    position: shot.caption.position || 'lower_third'
                });
            }
        });

        // CTA caption
        if (narrative.cta) {
            const totalDuration = shots.reduce((sum, s) => sum + s.duration, 0);
            captions.push({
                text: narrative.cta,
                startTime: Math.max(0, totalDuration - 4),
                duration: 3.5,
                style: 'cta',
                position: 'center'
            });
        }
    }

    return captions;
}

// Generate captions from metadata (Legacy)
function generateCaptions(metadata) {
    const captions = [];

    // Hook (0-3s)
    if (metadata.title) {
        captions.push({
            text: metadata.title.substring(0, 50),
            startTime: 0,
            endTime: 3
        });
    }

    // Description/benefit (4-7s)
    if (metadata.description) {
        const shortDesc = metadata.description.substring(0, 60);
        captions.push({
            text: shortDesc,
            startTime: 4,
            endTime: 7
        });
    }

    // CTA (last 3 seconds)
    captions.push({
        text: 'Try it now',
        startTime: -3,
        endTime: 0
    });

    return captions;
}

async function generateVideoFromFrames({ framesDir, outputPath, metadata, duration, format, options = {}, shots = [], narrative = null }) {
    return new Promise((resolve, reject) => {
        console.log(`[FFmpeg] Starting V3 generation. Shots: ${shots.length}, Mode: ${options.mode}`);

        const targetW = format === '9:16' ? 1080 : 1920;
        const targetH = format === '9:16' ? 1920 : 1080;
        let command = ffmpeg();

        // 1. Add Shot Inputs
        shots.forEach((shot, idx) => {
            const shotPath = path.join(shot.shotDir, 'frame_%04d.jpg');
            command.input(shotPath).inputFPS(8); // Matches the new optimized capture FPS
        });

        // 2. Add Music & Logo Inputs - Using professional inspiring track
        let selectedTrack = options.musicTrack || 'professional-inspiring.mp3';

        const musicPath = path.resolve(__dirname, `../../../public/music/${selectedTrack}`);
        const musicExists = fs.existsSync(musicPath);
        if (musicExists) command.input(musicPath);

        const logoExists = options.logoPath && fs.existsSync(options.logoPath);
        if (logoExists) command.input(options.logoPath);

        // 3. Filter Chain
        let filters = [];
        const musicInputIdx = shots.length;
        const logoInputIdx = musicExists ? shots.length + 1 : shots.length;

        // Pre-process each shot (Scale + Zoom + FPS)
        shots.forEach((shot, idx) => {
            const totalFrames = Math.floor(shot.duration * 30);
            filters.push(`[${idx}:v]scale=${targetW * 2}:${targetH * 2},setsar=1,fps=30,format=yuv420p[t${idx}]`);
            filters.push(`[t${idx}]zoompan=z='min(zoom+0.0005,1.2)':d=${totalFrames}:s=${targetW}x${targetH}:fps=30:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'[sz${idx}]`);
        });

        // XFade Logic
        let lastLabel = 'sz0';
        let cumulativeTime = shots[0].duration;
        const transitionDuration = 1.0;

        for (let i = 1; i < shots.length; i++) {
            const offset = cumulativeTime - transitionDuration;
            const currentLabel = `sxf${i}`;
            filters.push(`[${lastLabel}][sz${i}]xfade=transition=fade:duration=${transitionDuration}:offset=${offset}[${currentLabel}]`);
            lastLabel = currentLabel;
            cumulativeTime += shots[i].duration - transitionDuration;
        }


        // CAPTIONS DISABLED PER USER REQUEST
        console.log(`[FFmpeg] Captions disabled - generating video without text overlays`);

        // Logo & Audio
        if (logoExists) {
            filters.push(`[${logoInputIdx}:v]scale=120:-1,format=rgba,colorchannelmixer=aa=0.8[logo]`);
            filters.push(`[${lastLabel}][logo]overlay=x=W-w-40:y=40[vout]`);
            lastLabel = 'vout';
        }

        if (musicExists) {
            filters.push(`[${musicInputIdx}:a]volume=0.2[aa]`);
        }

        // Output
        command.complexFilter(filters.join(';'));
        command.outputOptions([
            `-map [${lastLabel}]`,
            musicExists ? '-map [aa]' : null,
            '-pix_fmt yuv420p',
            '-preset fast',
            '-crf 23',
            '-movflags +faststart',
            '-shortest'
        ].filter(Boolean));

        command.duration(cumulativeTime);

        command
            .output(outputPath)
            .on('start', (cmd) => console.log('[FFmpeg] Started assembly'))
            .on('end', () => resolve(outputPath))
            .on('error', (err) => {
                console.error('[FFmpeg] Assembly failed:', err.message);
                reject(err);
            })
            .run();
    });
}

module.exports = {
    generateVideoFromFrames,
    generateCaptions
};
