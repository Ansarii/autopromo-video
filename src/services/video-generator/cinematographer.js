/**
 * Cinematographer - Advanced Camera & Shot Composition
 * Professional camera movements and shot framing
 */

const SHOT_LIBRARY = {
    establishing_wide: {
        description: 'Full page view with slow push-in',
        zoom: { min: 0.8, max: 1.2 },
        duration: { min: 2, max: 4 },
        movement: 'smooth_push_in',
        framing: 'full_viewport'
    },
    feature_medium: {
        description: 'Focus on specific section',
        zoom: { min: 1.2, max: 1.5 },
        duration: { min: 3, max: 5 },
        movement: 'gentle_pan',
        framing: 'rule_of_thirds'
    },
    detail_closeup: {
        description: 'Zoom into specific element',
        zoom: { min: 1.5, max: 2.5 },
        duration: { min: 1.5, max: 3 },
        movement: 'dramatic_zoom',
        framing: 'center_focus'
    },
    interaction_pov: {
        description: 'User perspective for interactions',
        zoom: { min: 1.3, max: 1.6 },
        duration: { min: 2, max: 4 },
        movement: 'follow_cursor',
        framing: 'dynamic'
    },
    scroll_reveal: {
        description: 'Reveal content through scrolling',
        zoom: { min: 1.0, max: 1.1 },
        duration: { min: 3, max: 6 },
        movement: 'smooth_scroll',
        framing: 'vertical_flow'
    },
    orbit_focus: {
        description: 'Circular motion around element',
        zoom: { min: 1.3, max: 1.4 },
        duration: { min: 3, max: 5 },
        movement: 'subtle_orbit',
        framing: 'center_focus'
    }
};

const CAMERA_MOVEMENTS = {
    smooth_push_in: {
        type: 'zoom',
        easing: 'ease-in-out',
        curve: [0.4, 0, 0.2, 1]
    },
    dramatic_zoom: {
        type: 'zoom',
        easing: 'ease-in',
        curve: [0.4, 0, 1, 1]
    },
    gentle_pan: {
        type: 'pan',
        easing: 'linear',
        curve: [0, 0, 1, 1]
    },
    smooth_scroll: {
        type: 'scroll',
        easing: 'ease-out',
        curve: [0, 0, 0.2, 1]
    },
    follow_cursor: {
        type: 'track',
        easing: 'ease-in-out',
        curve: [0.4, 0, 0.2, 1]
    },
    subtle_orbit: {
        type: 'orbit',
        easing: 'linear',
        curve: [0, 0, 1, 1],
        angle: 15 // degrees
    },
    static_focus: {
        type: 'static',
        easing: 'none',
        curve: [0, 0, 0, 0]
    },
    // NEW: Movements used by narrative planner
    pan_smooth: {
        type: 'pan',
        easing: 'ease-in-out',
        curve: [0.4, 0, 0.2, 1]
    },
    zoom_dramatic: {
        type: 'zoom',
        easing: 'ease-in',
        curve: [0.4, 0, 1, 1]
    },
    scroll_smooth: {
        type: 'scroll',
        easing: 'ease-out',
        curve: [0, 0, 0.2, 1]
    },
    push_smooth: {
        type: 'zoom',
        easing: 'ease-out',
        curve: [0, 0, 0.2, 1]
    },
    zoom_in: {
        type: 'zoom',
        easing: 'ease-in',
        curve: [0.4, 0, 1, 1]
    },
    zoom_out: {
        type: 'zoom',
        easing: 'ease-out',
        curve: [0, 0, 0.2, 1]
    }
};

/**
 * Convert narrative shot to execution plan
 */
function planCameraWork(narrativeShot, page) {
    const shotType = SHOT_LIBRARY[narrativeShot.type] || SHOT_LIBRARY.feature_medium;
    const movement = CAMERA_MOVEMENTS[narrativeShot.cameraMove] || CAMERA_MOVEMENTS.smooth_push_in;

    const executionPlan = {
        shotId: `shot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: narrativeShot.type,
        duration: narrativeShot.duration || shotType.duration.min,

        // Camera parameters
        camera: {
            zoomStart: narrativeShot.zoomLevel?.start || shotType.zoom.min,
            zoomEnd: narrativeShot.zoomLevel?.end || shotType.zoom.max,
            movement: movement.type,
            easing: movement.easing,
            easingCurve: movement.curve
        },

        // Framing
        framing: {
            type: shotType.framing,
            composition: calculateComposition(narrativeShot.target),
            focusPoint: narrativeShot.focus || 'element'
        },

        // Target element
        target: {
            selector: narrativeShot.target,
            highlight: narrativeShot.highlight || false,
            overlay: narrativeShot.overlay || null,
            interaction: narrativeShot.interaction || null // Pass through interaction intent
        },

        // Effects
        effects: {
            motionBlur: movement.type === 'zoom' ? 0.3 : 0,
            vignette: narrativeShot.type.includes('closeup') ? 0.2 : 0,
            glow: narrativeShot.highlight === 'pulse_glow',
            colorGrade: narrativeShot.overlay || 'none'
        },

        // Metadata
        metadata: {
            narrativeBeat: narrativeShot.beat || 'unknown',
            featureData: narrativeShot.featureData || null,
            ctaData: narrativeShot.ctaData || null
        }
    };

    return executionPlan;
}

/**
 * Calculate shot composition based on rule of thirds
 */
function calculateComposition(target) {
    // Rule of thirds: place important elements at intersection points
    // Grid: 33%, 66% horizontally and vertically

    const compositions = {
        hero: { x: 0.5, y: 0.33 },           // Upper center
        headline: { x: 0.5, y: 0.33 },       // Upper center
        feature: { x: 0.33, y: 0.5 },        // Left center
        cta: { x: 0.5, y: 0.66 },            // Lower center
        testimonial: { x: 0.5, y: 0.5 },     // Center
        logo: { x: 0.5, y: 0.5 },            // Center
        metrics: { x: 0.66, y: 0.33 },       // Upper right
        default: { x: 0.5, y: 0.5 }          // Center
    };

    // Match target to composition
    for (const [key, position] of Object.entries(compositions)) {
        if (typeof target === 'string' && target.toLowerCase().includes(key)) {
            return position;
        }
    }

    return compositions.default;
}

/**
 * Generate smooth camera path for zoompan
 */
function generateCameraPath(executionPlan, frameCount, fps = 10) {
    const { camera, framing } = executionPlan;
    const frames = Math.floor(executionPlan.duration * fps);
    const path = [];

    for (let i = 0; i < frames; i++) {
        const progress = i / (frames - 1);
        const easedProgress = applyEasing(progress, camera.easingCurve);

        // Calculate zoom level
        const zoom = lerp(camera.zoomStart, camera.zoomEnd, easedProgress);

        // Calculate pan position
        const focusX = framing.composition.x;
        const focusY = framing.composition.y;

        path.push({
            frame: i,
            zoom,
            x: focusX,
            y: focusY,
            rotation: camera.movement === 'orbit' ? easedProgress * 15 : 0
        });
    }

    return path;
}

/**
 * Apply easing curve to progress value
 */
function applyEasing(t, curve) {
    // Cubic bezier approximation
    const [x1, y1, x2, y2] = curve;

    // Simplified cubic bezier
    if (curve.every(v => v === 0)) return t; // Linear

    const cx = 3.0 * x1;
    const bx = 3.0 * (x2 - x1) - cx;
    const ax = 1.0 - cx - bx;

    const cy = 3.0 * y1;
    const by = 3.0 * (y2 - y1) - cy;
    const ay = 1.0 - cy - by;

    const sampleCurveY = (t) => ((ay * t + by) * t + cy) * t;

    return sampleCurveY(t);
}

/**
 * Linear interpolation
 */
function lerp(start, end, t) {
    return start + (end - start) * t;
}

/**
 * Generate FFmpeg zoompan filter string
 */
function generateZoompanFilter(cameraPath, width, height, duration, fps = 10) {
    if (cameraPath.length === 0) return null;

    const frameCount = cameraPath.length;
    const firstFrame = cameraPath[0];
    const lastFrame = cameraPath[frameCount - 1];

    // Build zoompan expression
    // Format: zoompan=z='zoom expression':x='x expression':y='y expression':d=frames:s=widthxheight:fps=fps

    const zoomExpr = `'if(lte(on,0),${firstFrame.zoom},${firstFrame.zoom}+(${lastFrame.zoom}-${firstFrame.zoom})*on/${frameCount})'`;
    const xExpr = `'iw/2-(iw/zoom/2)'`; // Center x
    const yExpr = `'ih/2-(ih/zoom/2)'`; // Center y

    const filter = `zoompan=z=${zoomExpr}:x=${xExpr}:y=${yExpr}:d=${frameCount}:s=${width}x${height}:fps=${fps}`;

    return filter;
}

/**
 * Generate transition parameters
 */
function planTransition(fromShot, toShot, narrativeTempo) {
    const transitions = {
        fast: { type: 'fade', duration: 0.3 },
        medium: { type: 'wipeleft', duration: 0.5 },
        dynamic: { type: 'fade', duration: 0.4 },
        steady: { type: 'dissolve', duration: 0.6 },
        slow: { type: 'fade', duration: 0.8 }
    };

    const transition = transitions[narrativeTempo] || transitions.medium;

    return {
        type: transition.type,
        duration: transition.duration,
        offset: 0.2 // Overlap for smooth blend
    };
}

/**
 * Execute camera movement during capture
 */
async function executeCameraMove(page, executionPlan) {
    const { camera, target, duration } = executionPlan;

    console.log(`[Cinematographer] Executing ${executionPlan.type} shot`);

    // Find target element
    let targetElement = null;
    try {
        if (target.selector && target.selector !== 'viewport') {
            targetElement = await findTargetElement(page, target.selector);
        }
    } catch (err) {
        console.warn('[Cinematographer] Target not found, using viewport');
    }

    // Apply highlight if needed
    if (target.highlight && targetElement) {
        await highlightElement(page, targetElement, executionPlan.effects.glow);
    }

    // Execute camera movement based on type
    const movePromise = (async () => {
        switch (camera.movement) {
            case 'scroll':
                await smoothScroll(page, duration, camera.zoomEnd);
                break;
            case 'zoom':
                await smoothZoom(page, targetElement, camera.zoomStart, camera.zoomEnd, duration);
                break;
            case 'pan':
                await smoothPan(page, targetElement, duration);
                break;
            case 'track':
                await trackElement(page, targetElement, duration);
                break;
            case 'static':
                await focusElement(page, targetElement);
                await new Promise(resolve => setTimeout(resolve, duration * 1000));
                break;
            default:
                await new Promise(resolve => setTimeout(resolve, duration * 1000));
        }
    })();

    // Perform interaction during movement if specified
    if (target.interaction && targetElement) {
        // Wait for ~40% of duration to click (visual sweet spot)
        const interactionDelay = Math.max(0.3, duration * 0.4) * 1000;

        const interactionPromise = (async () => {
            await new Promise(resolve => setTimeout(resolve, interactionDelay));
            console.log(`[Cinematographer] Performing ${target.interaction} on ${target.selector}`);

            try {
                // Ensure cursor is initialized and moved to target
                await simulateCursorMove(page, targetElement);
                await new Promise(r => setTimeout(r, 150)); // Reduced from 800ms to 150ms

                if (target.interaction === 'click') {
                    // Trigger click ripple animation
                    await triggerClickRipple(page, targetElement);

                    // Actually click (no additional delay)
                    await page.click(targetElement).catch(err => {
                        console.warn(`[Cinematographer] Click failed: ${err.message}`);
                    });
                } else if (target.interaction === 'hover') {
                    await page.hover(targetElement).catch(() => { });
                }
            } catch (err) {
                console.warn(`[Cinematographer] Interaction failed: ${err.message}`);
            }
        })();

        await Promise.all([movePromise, interactionPromise]);
    } else {
        await movePromise;
    }

    return { success: true, duration };
}

/**
 * Find target element on page
 */
async function findTargetElement(page, targetSelector) {
    // Map semantic targets to actual selectors
    const selectorMap = {
        'hero': 'section:first-of-type, header, [class*="hero"]',
        'hero_headline': 'h1',
        'testimonials': '[class*="testimonial"], [class*="review"]',
        'stats': '[class*="stat"], [class*="metric"]',
        'footer': 'footer',
        'logo': 'img[alt*="logo" i], [class*="logo"]',
        'content': 'main, body'
    };

    const actualSelector = selectorMap[targetSelector] || targetSelector;

    // Check if element exists, but don't fail if it doesn't
    try {
        const exists = await page.evaluate((sel) => {
            return !!document.querySelector(sel);
        }, actualSelector);

        if (exists) {
            return actualSelector;
        }
    } catch { }

    // Return the selector anyway - let the camera functions handle it
    return actualSelector;
}

/**
 * Smooth scroll DOWN the page
 */
async function smoothScroll(page, duration, scrollFactor = 1.0) {
    console.log(`[Cinematographer] Scrolling page for ${duration}s`);

    try {
        // Calculate how far to scroll (2-3 viewport heights for visibility)
        const scrollDistance = await page.evaluate((factor) => {
            const viewportHeight = window.innerHeight;
            const totalScroll = viewportHeight * 2.5 * factor;  // Scroll 2.5x viewport
            return totalScroll;
        }, scrollFactor);

        console.log(`[Cinematographer] Scrolling ${scrollDistance}px over ${duration}s`);

        // Animate the scroll smoothly
        await page.evaluate((distance, dur) => {
            const startY = window.scrollY;
            const startTime = performance.now();
            const duration = dur * 1000;

            function scroll() {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Ease-out function for smooth deceleration
                const easeProgress = 1 - Math.pow(1 - progress, 3);

                window.scrollTo(0, startY + (distance * easeProgress));

                if (progress < 1) {
                    requestAnimationFrame(scroll);
                }
            }

            requestAnimationFrame(scroll);
        }, scrollDistance, duration);

    } catch (err) {
        console.warn(`[Cinematographer] Scroll failed: ${err.message}`);
    }

    await new Promise(resolve => setTimeout(resolve, duration * 1000));
}

/**
 * Smooth zoom (via viewport scale)
 */
async function smoothZoom(page, targetSelector, zoomStart, zoomEnd, duration) {
    // Note: Actual zoom is handled by FFmpeg zoompan
    // This just ensures element is visible
    if (targetSelector) {
        try {
            await page.evaluate((selector) => {
                const el = document.querySelector(selector);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, targetSelector);
        } catch { }
    }

    await new Promise(resolve => setTimeout(resolve, duration * 1000));
}

/**
 * Smooth pan - ACTUALLY SCROLL THE PAGE
 */
async function smoothPan(page, targetSelector, duration) {
    console.log(`[Cinematographer] Pan to: ${targetSelector}`);

    if (targetSelector) {
        try {
            // Try to scroll to the element
            const scrolled = await page.evaluate((selector) => {
                const el = document.querySelector(selector);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                    return true;
                }
                return false;
            }, targetSelector);

            if (!scrolled) {
                console.log(`[Cinematographer] Element not found: ${targetSelector}, scrolling by viewport height`);
                // If element not found, just scroll down by viewport height
                await page.evaluate(() => {
                    window.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' });
                });
            } else {
                console.log(`[Cinematographer] Successfully panned to ${targetSelector}`);
            }
        } catch (err) {
            console.warn(`[Cinematographer] Pan failed: ${err.message}`);
        }
    }

    await new Promise(resolve => setTimeout(resolve, duration * 1000));
}

/**
 * Track element (follow it)
 */
async function trackElement(page, targetSelector, duration) {
    // Keep element in frame during duration
    await focusElement(page, targetSelector);
    await new Promise(resolve => setTimeout(resolve, duration * 1000));
}

/**
 * Focus on element
 */
async function focusElement(page, targetSelector) {
    if (!targetSelector) return;

    try {
        await page.evaluate((selector) => {
            const el = document.querySelector(selector);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, targetSelector);

        await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
        console.warn('[Cinematographer] Could not focus element');
    }
}

/**
 * Highlight element with professional glow
 */
async function highlightElement(page, selector, glow = false) {
    await page.evaluate((sel, useGlow) => {
        const el = document.querySelector(sel);
        if (!el) return;

        const highlight = document.createElement('div');
        highlight.style.cssText = `
            position: absolute;
            pointer-events: none;
            border: 3px solid #5b2bee;
            border-radius: 8px;
            ${useGlow ? 'box-shadow: 0 0 20px rgba(91, 43, 238, 0.6);' : ''}
            animation: pulse 2s ease-in-out infinite;
            z-index: 10000;
        `;

        const rect = el.getBoundingClientRect();
        highlight.style.top = (rect.top + window.scrollY - 5) + 'px';
        highlight.style.left = (rect.left + window.scrollX - 5) + 'px';
        highlight.style.width = (rect.width + 10) + 'px';
        highlight.style.height = (rect.height + 10) + 'px';

        document.body.appendChild(highlight);

        // Pulse animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0%, 100% { opacity: 0.7; transform: scale(1); }
                50% { opacity: 1; transform: scale(1.02); }
            }
        `;
        document.head.appendChild(style);
    }, selector, glow);
}

/**
 * Simulate cursor move to element (Professional)
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
                width: 28px;
                height: 28px;
                background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='white' stroke='%235b2bee' stroke-width='2'%3E%3Cpath d='M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z'/%3E%3C/svg%3E") no-repeat;
                z-index: 2147483647;
                pointer-events: none;
                transition: transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
                transform: translate(-100px, -100px);
                filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
            `;
            document.body.appendChild(cursor);
        }

        cursor.style.transform = `translate(${targetX}px, ${targetY}px)`;
    }, selector);
}

/**
 * Trigger professional click ripple animation
 */
async function triggerClickRipple(page, selector) {
    await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return;

        const rect = el.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;

        const ripple = document.createElement('div');
        ripple.style.cssText = `
            position: fixed;
            top: ${y}px;
            left: ${x}px;
            width: 10px;
            height: 10px;
            background: rgba(91, 43, 238, 0.4);
            border: 2px solid #5b2bee;
            border-radius: 50%;
            pointer-events: none;
            z-index: 2147483646;
            transform: translate(-50%, -50%);
            animation: ripple-out 0.6s ease-out forwards;
        `;

        if (!document.getElementById('pro-director-animations')) {
            const style = document.createElement('style');
            style.id = 'pro-director-animations';
            style.textContent = `
                @keyframes ripple-out {
                    0% { width: 10px; height: 10px; opacity: 1; border-width: 4px; }
                    100% { width: 100px; height: 100px; opacity: 0; border-width: 1px; }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(ripple);
        setTimeout(() => ripple.remove(), 700);
    }, selector);
}

module.exports = {
    planCameraWork,
    executeCameraMove,
    generateCameraPath,
    generateZoompanFilter,
    planTransition,
    SHOT_LIBRARY,
    CAMERA_MOVEMENTS
};
