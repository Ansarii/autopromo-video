const puppeteer = require('puppeteer');
const path = require('path');
const { captureSiteProDirector } = require('./shots');
const { analyzePageSemantics, generateNarrative } = require('./intelligence');
const { planNarrative } = require('./narrative-planner');
const { planCameraWork } = require('./cinematographer');

// Viewport dimensions based on format
const VIEWPORTS = {
    '9:16': { width: 1080, height: 1920 }, // Vertical (TikTok/Reels)
    '16:9': { width: 1920, height: 1080 }  // Horizontal (YouTube)
};

async function launchBrowser() {
    try {
        const browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-software-rasterizer',
                '--disable-web-security'
            ]
        });
        return browser;
    } catch (error) {
        console.error('Failed to launch browser:', error.message);
        throw new Error('Browser initialization failed. Chrome/Chromium may not be installed properly.');
    }
}


async function captureSite({ url, format, duration, credentials, outputDir, mode = 'basic' }) {
    const browser = await launchBrowser();
    const page = await browser.newPage();

    try {
        // Set viewport
        const viewport = VIEWPORTS[format];
        await page.setViewport(viewport);

        // Handle login if credentials provided
        if (credentials) {
            console.log('Attempting login...');
            await handleLogin(page, credentials, null); // Pass null for captureFrame during login
            console.log('Login attempted, proceeding with capture');
        }


        // Navigate to URL with timeout
        console.log(`Loading ${url}...`);
        await page.goto(url, {
            waitUntil: 'networkidle0',
            timeout: 30000
        });

        // Wait a bit more for any lazy-loaded content
        await new Promise(resolve => setTimeout(resolve, 2000));

        // AUTO-DISMISS MODALS, POPUPS, COOKIE BANNERS
        console.log('[Browser] Auto-dismissing popups and modals...');
        await dismissAllPopups(page);
        await new Promise(resolve => setTimeout(resolve, 1000));


        // PRO DIRECTOR 2.0 - Professional Marketing Video Pipeline
        if (mode === 'pro_director') {
            try {
                console.log('[Pro Director 2.0] Starting professional pipeline...');

                // STEP 1: Semantic Analysis
                console.log('[Pro Director 2.0] Analyzing page semantics...');
                const semanticData = await analyzePageSemantics(page, url);

                // STEP 2: Generate Narrative
                console.log('[Pro Director 2.0] Generating narrative structure...');
                const narrativeStructure = planNarrative(semanticData, duration);
                const narrative = generateNarrative(semanticData);

                console.log('[Pro Director 2.0] Narrative:', {
                    hook: narrative.hook.substring(0, 50),
                    beats: narrativeStructure.beats.length,
                    totalShots: narrativeStructure.beats.reduce((sum, b) => sum + b.shots.length, 0)
                });

                // STEP 3: Execute Professional Capture
                const proResult = await captureSiteProDirector({
                    page,
                    url,
                    format,
                    duration,
                    outputDir,
                    narrativeStructure,
                    semanticData,
                    narrative
                });

                if (proResult && !proResult.fallbackToBasic) {
                    console.log('[Pro Director 2.0] ✅ Professional video generated successfully');
                    return proResult;
                }

                console.warn('[Pro Director 2.0] Pipeline incomplete, falling back to Basic');
            } catch (proError) {
                console.error('[Pro Director 2.0] Error:', proError.message);
                console.log('[Pro Director 2.0] Attempting Basic fallback...');
            }
        }

        // Basic Mode Fallback
        console.log('[Browser] Executing Basic Mode...');

        // Extract metadata (Basic Mode)
        const metadata = await page.evaluate(() => {
            const getMetaContent = (name) => {
                const meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
                return meta ? meta.getAttribute('content') : '';
            };

            return {
                title: document.title || 'Untitled',
                description: getMetaContent('description') || getMetaContent('og:description'),
                h1: document.querySelector('h1')?.textContent || ''
            };
        });

        console.log('Metadata:', metadata);

        // Calculate number of frames (10 FPS)
        const fps = 10;
        const totalFrames = duration * fps;

        // NEW: Find interactive elements to click
        const clickableElements = await findClickableElements(page);
        console.log(`Found ${clickableElements.length} clickable elements`);

        let frameCount = 0;

        // Capture with interactions
        frameCount = await captureWithInteractions(page, {
            outputDir,
            totalFrames,
            fps,
            viewport,
            clickableElements
        });

        console.log(`Captured ${frameCount} frames`);

        return {
            frames: frameCount,
            metadata,
            viewport,
            shots: [{
                id: 1,
                type: 'basic',
                duration: duration,
                shotDir: outputDir,
                caption: metadata.title || 'Discover More',
                startFrame: 0,
                endFrame: frameCount
            }]
        };

    } finally {
        await browser.close();
    }
}

// Find important clickable elements on the page
async function findClickableElements(page) {
    return await page.evaluate(() => {
        function isVisible(el) {
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            if (!rect || (rect.width === 0 && rect.height === 0)) return false;
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
            return rect.bottom > 0 && rect.right > 0 &&
                rect.top < (window.innerHeight || document.documentElement.clientHeight) &&
                rect.left < (window.innerWidth || document.documentElement.clientWidth);
        }

        function uniqueSelector(el) {
            if (el.id) return `#${el.id}`;
            const parts = [];
            let current = el;
            while (current && parts.length < 4) {
                let part = current.nodeName.toLowerCase();
                if (current.className && typeof current.className === 'string') {
                    const cls = current.className.split(/\s+/).filter(Boolean).slice(0, 2).join('.');
                    if (cls) part += `.${cls}`;
                }
                parts.unshift(part);
                current = current.parentElement;
            }
            return parts.join(' > ');
        }

        const clickable = [];
        const all = [
            ...document.querySelectorAll('button'),
            ...document.querySelectorAll('a[href]'),
            ...document.querySelectorAll('[role="button"]'),
            ...document.querySelectorAll('[role="tab"]'),
        ];

        const keywordsHigh = ['try', 'demo', 'playground', 'get started', 'start', 'sign up', 'launch', 'explore'];
        const keywordsMedium = ['features', 'pricing', 'how it works', 'learn more', 'docs', 'documentation'];

        for (const el of all) {
            if (!isVisible(el)) continue;

            const rect = el.getBoundingClientRect();
            if (rect.width < 60 || rect.height < 20) continue;

            const text = (el.innerText || el.textContent || '').toLowerCase().trim();
            if (!text) continue;

            let score = 0;
            if (keywordsHigh.some(k => text.includes(k))) score += 10;
            if (keywordsMedium.some(k => text.includes(k))) score += 5;

            // Reward elements near the top
            if (rect.top < 150) score += 3;

            // Bigger elements get slightly more weight
            score += Math.min(rect.width * rect.height / 5000, 3);

            if (score > 0) {
                clickable.push({
                    text,
                    score,
                    selector: uniqueSelector(el),
                    top: rect.top
                });
            }
        }

        clickable.sort((a, b) => b.score - a.score);
        return clickable.slice(0, 3); // Top 3 elements
    });
}

// Capture frames with interactions
async function captureWithInteractions(page, { outputDir, totalFrames, fps, viewport, clickableElements }) {
    let frameCount = 0;

    // Helper to capture a frame
    const captureFrame = async () => {
        const framePath = path.join(outputDir, `frame_${String(frameCount).padStart(4, '0')}.png`);
        await page.screenshot({ path: framePath, type: 'png' });
        frameCount++;
        await new Promise(resolve => setTimeout(resolve, 1000 / fps));
    };

    // Phase 1: Show hero section (top of page) - 15% of time
    const heroFrames = Math.floor(totalFrames * 0.15);
    for (let i = 0; i < heroFrames; i++) {
        await captureFrame();
    }

    // Phase 2: Interactions - 50% of time
    const interactionTime = Math.floor(totalFrames * 0.5);
    const totalInteractions = clickableElements.length;
    const framesPerInteraction = Math.floor(interactionTime / Math.max(totalInteractions, 1));

    // Try to find and fill one form
    const formFilled = await tryFillForm(page, captureFrame, Math.floor(framesPerInteraction * 0.8));

    for (const element of clickableElements) {
        try {
            // Scroll element into view
            await page.evaluate((sel) => {
                const el = document.querySelector(sel);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, element.selector);

            // Capture scrolling
            for (let i = 0; i < Math.floor(framesPerInteraction * 0.3); i++) {
                await captureFrame();
            }

            // Click the element
            await page.evaluate((sel) => {
                const el = document.querySelector(sel);
                if (el) el.click();
            }, element.selector);

            console.log(`Clicked: ${element.text}`);

            // Capture the result of clicking
            for (let i = 0; i < Math.floor(framesPerInteraction * 0.7); i++) {
                await captureFrame();
            }

        } catch (err) {
            console.warn(`Failed to interact with element: ${element.text}`, err.message);
        }
    }

    // Phase 3: Smooth scroll to show rest of page - 35% of time
    const scrollFrames = totalFrames - frameCount;
    const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const viewportHeight = viewport.height;
    const scrollableHeight = Math.max(0, pageHeight - viewportHeight);

    for (let i = 0; i < scrollFrames; i++) {
        const progress = i / (scrollFrames - 1);
        const scrollY = Math.floor(scrollableHeight * progress);

        await page.evaluate((y) => window.scrollTo(0, y), scrollY);
        await captureFrame();
    }

    return frameCount;
}

// Try to find and fill a form
async function tryFillForm(page, captureFrame, maxFrames) {
    try {
        const formFields = await page.evaluate(() => {
            const fields = [];
            const inputs = document.querySelectorAll('input[type="email"], input[type="search"], input[type="text"]:not([type="hidden"]), textarea');

            for (const input of inputs) {
                const rect = input.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    const type = input.type || 'text';
                    const placeholder = input.placeholder || '';
                    fields.push({
                        selector: input.id ? `#${input.id}` : input.name ? `[name="${input.name}"]` : null,
                        type,
                        placeholder
                    });
                }
            }
            return fields.slice(0, 2); // Max 2 fields
        });

        if (formFields.length === 0) return false;

        let framesBudget = maxFrames;
        for (const field of formFields) {
            if (!field.selector || framesBudget <= 0) continue;

            try {
                // Scroll to field
                await page.evaluate((sel) => {
                    const el = document.querySelector(sel);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, field.selector);

                // Capture scroll
                for (let i = 0; i < 5 && framesBudget > 0; i++) {
                    await captureFrame();
                    framesBudget--;
                }

                // Click to focus
                await page.click(field.selector);

                // Generate appropriate content
                let textToType = '';
                if (field.type === 'email') {
                    textToType = 'demo@autopromo.video';
                } else if (field.type === 'search') {
                    textToType = 'product demo';
                } else {
                    textToType = field.placeholder ? field.placeholder.substring(0, 20) : 'Sample text';
                }

                // Type with human-like speed
                await typeWithAnimation(page, field.selector, textToType, captureFrame, framesBudget);
                framesBudget -= textToType.length;

                console.log(`Filled ${field.type} field: ${textToType}`);

            } catch (err) {
                console.warn('Failed to fill field:', err.message);
            }
        }

        return true;
    } catch (err) {
        return false;
    }
}

// Type text with human-like animation
async function typeWithAnimation(page, selector, text, captureFrame, maxFrames) {
    try {
        await page.focus(selector);

        for (let i = 0; i < text.length && i < maxFrames; i++) {
            await page.keyboard.type(text[i]);
            await new Promise(resolve => setTimeout(resolve, 80)); // 80ms per character
            if (i % 2 === 0 && captureFrame) {
                await captureFrame(); // Capture every other character
            }
        }
    } catch (err) {
        // Silently fail
    }
}

// Handle login if credentials provided
async function handleLogin(page, credentials, captureFrame) {
    if (!credentials || !credentials.username || !credentials.password) {
        return false;
    }

    try {
        // Navigate to login URL if provided
        if (credentials.loginUrl) {
            await page.goto(credentials.loginUrl, { waitUntil: 'networkidle0', timeout: 30000 });
        }

        // Find login form fields
        const loginFields = await page.evaluate(() => {
            const usernameField = document.querySelector('input[type="email"], input[type="text"][name*="user"], input[name="username"], input[id*="email"]');
            const passwordField = document.querySelector('input[type="password"]');
            const submitButton = document.querySelector('button[type="submit"], input[type="submit"], button:has-text("log in"), button:has-text("sign in")');

            return {
                username: window.buildSafeSelectorForEval(usernameField, 0),
                password: window.buildSafeSelectorForEval(passwordField, 1),
                submit: window.buildSafeSelectorForEval(submitButton, 2)
            };
        });

        if (!loginFields.username || !loginFields.password) {
            console.warn('Could not find login form fields');
            return false;
        }

        // Fill username
        await page.click(loginFields.username);
        await typeWithAnimation(page, loginFields.username, credentials.username, captureFrame, 20);

        // Fill password
        await page.click(loginFields.password);
        await page.type(loginFields.password, credentials.password);

        // Submit
        if (loginFields.submit) {
            await page.click(loginFields.submit);
            await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }).catch(() => { });
        }

        console.log('Login completed');
        return true;

    } catch (err) {
        console.warn('Login failed:', err.message);
        return false;
    }
}

// Dismiss all popups, modals, cookie banners, etc.
async function dismissAllPopups(page) {
    try {
        await page.evaluate(() => {
            // Strategy 1: Find and click common close buttons
            const closeSelectors = [
                'button[aria-label*="close" i]',
                'button[aria-label*="dismiss" i]',
                'button[title*="close" i]',
                'button.close',
                'button.modal-close',
                '[class*="close-button"]',
                '[class*="close-btn"]',
                '[data-dismiss="modal"]',
                'button:has(svg[class*="close"])',
                'button:has([class*="close"])',
                '.modal button:last-child', // Often "Accept" or "Confirm" button
                '[role="dialog"] button:last-child'
            ];

            for (const selector of closeSelectors) {
                try {
                    const buttons = document.querySelectorAll(selector);
                    for (const btn of buttons) {
                        const rect = btn.getBoundingClientRect();
                        if (rect.width > 0 && rect.height > 0) {
                            btn.click();
                            console.log('[Auto-Dismiss] Clicked:', selector);
                        }
                    }
                } catch (e) { }
            }

            // Strategy 2: Remove modal overlays and backdrops
            const overlaySelectors = [
                '.modal',
                '.modal-backdrop',
                '.overlay',
                '[role="dialog"]',
                '[class*="modal"]',
                '[class*="popup"]',
                '[class*="overlay"]',
                '[style*="position: fixed"]',
                '[style*="z-index"]'
            ];

            for (const selector of overlaySelectors) {
                try {
                    const elements = document.querySelectorAll(selector);
                    for (const el of elements) {
                        const style = window.getComputedStyle(el);
                        // Check if it's a blocking overlay (fixed position, high z-index)
                        if (style.position === 'fixed' && parseInt(style.zIndex) > 100) {
                            el.remove();
                            console.log('[Auto-Dismiss] Removed overlay:', selector);
                        }
                    }
                } catch (e) { }
            }

            // Strategy 3: Press ESC key to close modals
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27 }));
            document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', keyCode: 27 }));

            // Strategy 4: Remove body scroll locks
            document.body.style.overflow = 'auto';
            document.documentElement.style.overflow = 'auto';

            // Strategy 5: Click backdrop areas (dark overlays)
            const backdrops = document.querySelectorAll('[class*="backdrop"], [class*="mask"]');
            backdrops.forEach(backdrop => {
                try {
                    backdrop.remove();
                } catch (e) { }
            });
        });

        console.log('[Browser] ✅ Popups dismissed');
    } catch (error) {
        console.warn('[Browser] Failed to dismiss popups:', error.message);
    }
}

module.exports = {
    launchBrowser,
    captureSite,
    handleLogin
};
