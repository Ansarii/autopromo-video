const { scanPage } = require('./scanner');
const { buildStoryboard } = require('./planner');
const { planCameraWork, executeCameraMove } = require('./cinematographer');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;
const { existsSync } = require('fs');

/**
 * Capture site using Pro Director Pipeline (shot-based with narrative)
 * @param {Object} params - Capture parameters
 * @returns {Object} Capture results with shots data
 */
async function captureSiteProDirector({
    page, url, format, duration, outputDir,
    narrativeStructure = null,
    semanticData = null,
    narrative = null
}) {
    console.log('[Pro Director] Starting production capture (V3 - Professional)...');


    // Set work budget timeout
    const budgetTimeout = setTimeout(() => {
        console.error('[Pro Director] WORK BUDGET EXCEEDED (90s)');
    }, 90000);

    try {
        let storyboard = [];

        // Use narrative structure if provided (Pro Director 2.0)
        if (narrativeStructure && narrativeStructure.beats) {
            console.log('[Pro Director 2.0] Using narrative-driven shots');

            // Convert narrative beats to executable shots
            let shotId = 1;
            for (const beat of narrativeStructure.beats) {
                console.log(`[Pro Director 2.0] Processing beat: ${beat.name} (${beat.shots.length} shots)`);

                for (const narrativeShot of beat.shots) {
                    // Plan camera work using cinematographer
                    const executionPlan = planCameraWork(narrativeShot, page);

                    storyboard.push({
                        id: shotId++,
                        type: narrativeShot.type,
                        beat: beat.name,
                        duration: narrativeShot.duration,
                        startTime: 0, // Will be calculated cumulatively
                        endTime: narrativeShot.duration,
                        startFrame: 0,
                        endFrame: Math.floor(narrativeShot.duration * 10),
                        frameCount: Math.floor(narrativeShot.duration * 10),
                        caption: beat.captions.find(c => true), // First caption for beat
                        executionPlan,
                        narrativeShot,
                        metadata: {
                            tempo: beat.tempo,
                            music: beat.music
                        }
                    });
                }
            }

            console.log(`[Pro Director 2.0] Generated ${storyboard.length} narrative-driven shots`);
        } else {
            // Fallback to old scanner-based approach
            console.log('[Pro Director] Using scanner-based approach (legacy)');
            const scannedPage = await Promise.race([
                scanPage(page, url),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Scanner timeout')), 30000))
            ]);

            storyboard = buildStoryboard(scannedPage, duration);
        }

        // Step 3: Execute shots discretely
        const executedShots = [];
        let cumulativeTime = 0;

        for (const shot of storyboard) {
            console.log(`[Pro Director] Executing Shot ${shot.id}: ${shot.type} (${shot.duration}s)`);

            const shotDir = path.join(outputDir, `shot_${shot.id}`);
            if (!existsSync(shotDir)) await fs.mkdir(shotDir, { recursive: true });

            // Update shot timing
            shot.startTime = cumulativeTime;
            shot.endTime = cumulativeTime + shot.duration;

            const result = await executeShot(page, shot, shotDir);

            if (result.skipped) {
                console.log(`[Pro Director] Shot ${shot.id} skipped (no visual change/failed)`);
                continue;
            }

            executedShots.push({
                ...shot,
                shotDir,
                frameCount: result.frameCount,
                changeScore: result.changeScore
            });

            cumulativeTime += shot.duration;
        }

        clearTimeout(budgetTimeout);

        console.log(`[Pro Director] Done. Captured ${executedShots.length}/${storyboard.length} shots.`);

        return {
            metadata: semanticData?.hero || { title: 'Generated Video', description: '' },
            shots: executedShots,
            narrative,
            fallbackToBasic: executedShots.length === 0
        };

    } catch (error) {
        clearTimeout(budgetTimeout);
        console.error('[Pro Director] Capture pipeline crashed:', error.message);
        return { fallbackToBasic: true };
    }
}

/**
 * Execute a single shot
 */
async function executeShot(page, shot, shotDir) {
    const fps = 10;
    let frameCount = 0;

    try {
        // Hard timeout per shot
        const shotPromise = (async () => {
            // Professional camera movement (Pro Director 2.0)
            if (shot.executionPlan) {
                console.log(`[Shot ${shot.id}] Using professional cinematography (${shot.duration}s)`);

                // Run camera move and frame capture in parallel for fluid motion
                const [moveResult, framesCaptured] = await Promise.all([
                    executeCameraMove(page, shot.executionPlan),
                    captureFrames(page, shot, shotDir)
                ]);

                return { frameCount: framesCaptured, changeScore: 1.0, skipped: false };
            }

            // Legacy approach (fallback)
            // 1. Move to target
            if (shot.target) {
                await scrollToElement(page, shot.target);
                await simulateCursorMove(page, shot.target);
                await new Promise(r => setTimeout(r, 600));
            }

            // 2. Initial state for validation
            const beforeHash = await getPageHash(page);

            // 3. Perform camera move + capture
            switch (shot.cameraMove) {
                case 'zoom_to_action':
                case 'zoom_to_cta':
                    frameCount = await captureZoomToAction(page, shot, shotDir);
                    break;
                case 'slow_pan_down':
                    frameCount = await captureSlowPan(page, shot, shotDir);
                    break;
                default:
                    frameCount = await captureStatic(page, shot, shotDir);
            }

            // 4. Handle Interaction (Click)
            let changeScore = 1.0;
            if (shot.action === 'click' && shot.target) {
                await highlightElement(page, shot.target);
                await page.click(shot.target, { delay: 100 });
                await new Promise(r => setTimeout(r, 1200)); // Action pause

                const afterHash = await getPageHash(page);
                changeScore = (beforeHash === afterHash) ? 0 : 1.0;

                // Validation: Skip if no change
                if (changeScore === 0) return { skipped: true };

                // Capture result (1.5s)
                for (let i = 0; i < 15; i++) {
                    await captureFrame(page, shotDir, frameCount++);
                    await new Promise(r => setTimeout(r, 100));
                }
            }

            return { frameCount, changeScore };
        })();

        // Race against shot timeout (Increased buffer for processing-heavy shots)
        return await Promise.race([
            shotPromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Shot Timeout')), Math.max(10, (shot.duration + 15)) * 1000))
        ]);

    } catch (err) {
        console.error(`  [Shot ${shot.id}] Failed:`, err.message);
        return { skipped: true };
    }
}

/**
 * Capture frames for professional camera movements
 */
async function captureFrames(page, shot, shotDir) {
    const fps = 8; // Slightly lower FPS for better stability
    const totalFrames = Math.floor(shot.duration * fps);
    const interval = 1000 / fps;

    console.log(`  [Capture] Taking ${totalFrames} frames at ${fps} FPS`);

    for (let i = 0; i < totalFrames; i++) {
        const startTime = Date.now();
        await captureFrame(page, shotDir, i);

        // Calculate remaining delay to maintain FPS
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, interval - elapsed);
        if (remaining > 0) {
            await new Promise(resolve => setTimeout(resolve, remaining));
        }
    }

    return totalFrames;
}

/**
 * Capture static shot (no movement)
 */
async function captureStatic(page, shot, shotDir) {
    const fps = 10;
    const frames = shot.duration * fps;

    for (let i = 0; i < frames; i++) {
        await captureFrame(page, shotDir, i);
        await new Promise(resolve => setTimeout(resolve, 1000 / fps));
    }

    return frames;
}

async function captureZoomToAction(page, shot, shotDir) {
    const fps = 10;
    let frameCount = 0;

    const totalFrames = shot.duration * fps;
    for (let i = 0; i < totalFrames; i++) {
        await captureFrame(page, shotDir, frameCount++);
        await new Promise(resolve => setTimeout(resolve, 1000 / fps));
    }

    return frameCount;
}

async function captureSlowPan(page, shot, shotDir) {
    const fps = 10;
    const totalFrames = shot.duration * fps;
    const scrollStep = 30;

    for (let i = 0; i < totalFrames; i++) {
        await captureFrame(page, shotDir, i);
        await page.evaluate((step) => window.scrollBy(0, step), scrollStep);
        await new Promise(resolve => setTimeout(resolve, 1000 / fps));
    }

    return totalFrames;
}

/**
 * Capture zoom to CTA
 */
async function captureZoomToCTA(page, shot, outputDir, startFrameNumber) {
    // Same as zoom to action
    return await captureZoomToAction(page, shot, outputDir, startFrameNumber);
}

/**
 * Scroll element into view
 */
async function scrollToElement(page, selector) {
    try {
        await page.evaluate((sel) => {
            const element = document.querySelector(sel);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, selector);
    } catch (error) {
        console.log('Could not scroll to', selector);
    }
}

/**
 * Simulate smooth cursor movement to an element
 */
async function simulateCursorMove(page, selector) {
    await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return;

        const rect = el.getBoundingClientRect();
        const targetX = rect.left + rect.width / 2;
        const targetY = rect.top + rect.height / 2;

        let cursor = document.getElementById('pro-director-cursor');
        if (!cursor) {
            cursor = document.createElement('div');
            cursor.id = 'pro-director-cursor';
            cursor.style.cssText = `
                position: fixed;
                width: 24px;
                height: 24px;
                background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='white' stroke='black' stroke-width='1'%3E%3Cpath d='M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z'/%3E%3C/svg%3E") no-repeat;
                z-index: 9999999;
                pointer-events: none;
                transition: all 0.8s cubic-bezier(0.45, 0, 0.55, 1);
                transform: translate(-100px, -100px);
            `;
            document.body.appendChild(cursor);
        }

        // Move cursor from previous position or offscreen
        setTimeout(() => {
            cursor.style.transform = `translate(${targetX}px, ${targetY}px)`;
        }, 10);
    }, selector);
}

/**
 * Highlight element with visual effect
 */
async function highlightElement(page, selector) {
    await page.evaluate((sel) => {
        const element = document.querySelector(sel);
        const cursor = document.getElementById('pro-director-cursor');

        if (element) {
            const highlight = document.createElement('div');
            highlight.id = 'pro-director-highlight';
            highlight.style.cssText = `
                position: absolute;
                border: 3px solid #5b2bee;
                border-radius: 8px;
                pointer-events: none;
                z-index: 999998;
                box-shadow: 0 0 20px rgba(91, 43, 238, 0.5);
                animation: pulse 0.6s ease-in-out infinite;
            `;

            const rect = element.getBoundingClientRect();
            highlight.style.left = (rect.left + window.scrollX - 4) + 'px';
            highlight.style.top = (rect.top + window.scrollY - 4) + 'px';
            highlight.style.width = (rect.width + 8) + 'px';
            highlight.style.height = (rect.height + 8) + 'px';

            document.body.appendChild(highlight);

            // Interaction visual on cursor
            if (cursor) {
                cursor.style.filter = 'drop-shadow(0 0 5px rgba(91, 43, 238, 0.8))';
                cursor.style.scale = '0.8';
            }
        }
    }, selector);
}

/**
 * Remove highlight
 */
async function removeHighlight(page) {
    await page.evaluate(() => {
        const highlight = document.getElementById('pro-director-highlight');
        if (highlight) {
            highlight.remove();
        }
    });
}

/**
 * Get page visual hash for comparison
 */
async function getPageHash(page) {
    const screenshot = await page.screenshot({ encoding: 'binary' });
    return crypto.createHash('md5').update(screenshot).digest('hex');
}

/**
 * Compare two hashes to determine visual change
 */
function compareHashes(hash1, hash2) {
    if (!hash1 || !hash2) return 1.0;

    // Simple comparison - different hash = change
    return hash1 === hash2 ? 0 : 1.0;
}

/**
 * Capture a single frame
 */
async function captureFrame(page, outputDir, frameNumber) {
    const paddedNumber = String(frameNumber).padStart(4, '0');
    const framePath = path.join(outputDir, `frame_${paddedNumber}.jpg`);

    await page.screenshot({
        path: framePath,
        type: 'jpeg',
        quality: 80,
        optimizeForSpeed: true
    });
}

module.exports = {
    captureSiteProDirector
};
