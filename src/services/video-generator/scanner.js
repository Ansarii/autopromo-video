/**
 * Scanner Module - Page Structure Extraction
 * Analyzes a webpage and extracts structured data for video generation
 */

/**
 * Scan a page and extract structure
 * @param {Page} page - Puppeteer page object
 * @param {string} url - Page URL
 * @returns {Object} Scanned page structure
 */
async function scanPage(page, url) {
    console.log('[Scanner] Analyzing page structure (V3)...');

    // Expose selector builder to browser context
    await page.evaluate(() => {
        window.buildSafeSelectorForEval = (el, idx) => {
            if (!el) return 'body';
            if (el.id) return `#\${el.id}`;
            const name = el.getAttribute('name');
            if (name) return `[name="\${name}"]`;
            const aria = el.getAttribute('aria-label');
            if (aria) return `[aria-label="\${aria}"]`;
            const placeholder = el.getAttribute('placeholder');
            if (placeholder) return `[placeholder="\${placeholder}"]`;
            const className = el.className && typeof el.className === 'string' ? el.className.split(' ').find(c => c.length > 2 && !c.includes('active')) : null;
            if (className) return `.\${className}`;
            return `\${el.tagName.toLowerCase()}:nth-of-type(\${idx + 1})`;
        };
    });

    const structure = {
        url,
        hero: await extractHero(page),
        scenes: await extractScenes(page),
        interactions: await scoreInteractions(page),
        metadata: await extractMetadata(page)
    };

    console.log(`[Scanner] Found ${structure.scenes.length} scenes, ${structure.interactions.length} interactions`);
    return structure;
}

/**
 * Extract hero section data
 */
async function extractHero(page) {
    try {
        const hero = await page.evaluate(() => {
            // Find H1
            const h1 = document.querySelector('h1');
            const h1Text = h1 ? h1.textContent.trim() : '';

            // Find primary CTA
            const buttons = Array.from(document.querySelectorAll('button, a[href*="signup"], a[href*="start"], a[href*="try"], .cta, [class*="cta"]'));
            const visibleButtons = buttons.filter(btn => {
                const rect = btn.getBoundingClientRect();
                return rect.top >= 0 && rect.top < window.innerHeight && rect.width > 0;
            });

            let primaryCTA = null;
            if (visibleButtons.length > 0) {
                visibleButtons.sort((a, b) => {
                    const aSize = a.getBoundingClientRect().width * a.getBoundingClientRect().height;
                    const bSize = b.getBoundingClientRect().width * b.getBoundingClientRect().height;
                    return bSize - aSize;
                });

                const cta = visibleButtons[0];
                primaryCTA = {
                    text: cta.textContent.trim(),
                    selector: window.buildSafeSelectorForEval(cta, 0)
                };
            }

            // Find hero section
            const heroSelectors = ['.hero', 'header', '[class*="hero"]', '[id*="hero"]', 'section:first-of-type'];
            let heroSelector = null;
            for (const sel of heroSelectors) {
                if (document.querySelector(sel)) {
                    heroSelector = sel;
                    break;
                }
            }

            return {
                h1: h1Text,
                cta: primaryCTA,
                selector: heroSelector || 'body'
            };
        });

        return hero;
    } catch (error) {
        console.error('[Scanner] Error extracting hero:', error);
        return { h1: '', cta: null, selector: 'body' };
    }
}

/**
 * Extract scenes (sections) from page
 */
async function extractScenes(page) {
    try {
        const scenes = await page.evaluate(() => {
            const sceneList = [];

            // Find all H2/H3 sections
            const headings = Array.from(document.querySelectorAll('h2, h3'));
            headings.forEach((heading, idx) => {
                const text = heading.textContent.trim().toLowerCase();

                // Classify scene type
                let type = 'content';
                if (text.includes('feature') || text.includes('how it works')) type = 'features';
                else if (text.includes('pricing') || text.includes('plan')) type = 'pricing';
                else if (text.includes('demo') || text.includes('example')) type = 'demo';
                else if (text.includes('about') || text.includes('story')) type = 'about';

                const selector = heading.className ? `.${heading.className.split(' ')[0]}` : `h${heading.tagName[1]}:nth-of-type(${idx + 1})`;

                sceneList.push({
                    type,
                    title: heading.textContent.trim(),
                    selector,
                    duration: type === 'features' ? 10 : 6
                });
            });

            return sceneList;
        });

        return scenes.slice(0, 5); // Limit to 5 scenes
    } catch (error) {
        console.error('[Scanner] Error extracting scenes:', error);
        return [];
    }
}

/**
 * Score and rank interactive elements
 */
async function scoreInteractions(page) {
    try {
        const interactions = await page.evaluate(() => {
            const elements = [];

            // Find all clickable elements
            const clickables = Array.from(document.querySelectorAll('button, a, [role="button"], [role="tab"], input[type="submit"]'));

            clickables.forEach((el, idx) => {
                const rect = el.getBoundingClientRect();
                const text = el.textContent.trim().toLowerCase();
                const isVisible = rect.width > 0 && rect.height > 0 && rect.top >= 0;

                if (!isVisible || !text || text.length < 2) return;

                // Score based on keywords
                let score = 0.5;
                if (text.includes('demo') || text.includes('try')) score += 0.3;
                if (text.includes('start') || text.includes('signup')) score += 0.25;

                // Intent classification
                let intent = 'navigate';
                if (text.includes('demo') || text.includes('example')) intent = 'show_demo';
                else if (text.includes('start') || text.includes('signup')) intent = 'signup';

                elements.push({
                    text,
                    selector: window.buildSafeSelectorForEval(el, idx),
                    intent,
                    score: Math.min(score, 1.0),
                    position: { x: rect.left, y: rect.top }
                });
            });

            // Sort by score
            return elements.sort((a, b) => b.score - a.score);
        });

        return interactions.slice(0, 10); // Top 10 interactions
    } catch (error) {
        console.error('[Scanner] Error scoring interactions:', error);
        return [];
    }
}

/**
 * Helper to build a robust CSS selector
 */
function buildSafeSelector(el, idx) {
    if (!el) return 'body';

    // 1. ID is king
    if (el.id) return `#\${el.id}`;

    // 2. Name is stable for forms
    const name = el.getAttribute('name');
    if (name) return `[name="\${name}"]`;

    // 3. ARIA roles/labels
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) return `[aria-label="\${ariaLabel}"]`;

    // 4. Placeholder for inputs
    const placeholder = el.getAttribute('placeholder');
    if (placeholder) return `[placeholder="\${placeholder}"]`;

    // 5. Semantic classes (limited to first)
    const className = el.className && typeof el.className === 'string' ? el.className.split(' ').find(c => c.length > 2 && !c.includes('active') && !c.includes('hover')) : null;
    if (className) return `.\${className}`;

    // 6. Fallback to tag + nth-of-type
    return `\${el.tagName.toLowerCase()}:nth-of-type(\${idx + 1})`;
}

module.exports = {
    scanPage
};
