const FPS = 10; // Fixed FPS for capture contract

/**
 * Planner Module - Storyboard Builder
 * Creates a shot-by-shot plan for professional marketing videos
 */

/**
 * Build a storyboard from scanned page data
 * @param {Object} scannedPage - Output from scanner.js
 * @param {number} targetDuration - Target video duration in seconds
 * @returns {Array} Array of shot objects
 */
function buildStoryboard(scannedPage, targetDuration = 45) {
    console.log('[Planner] Building storyboard (V3)...');

    const shots = [];
    let usedTime = 0;

    // Helper to add shot with consistent contract
    const addShot = (shotData) => {
        const startFrame = Math.round(usedTime * FPS);
        const endFrame = Math.round((usedTime + shotData.duration) * FPS);

        shots.push({
            ...shotData,
            startTime: usedTime,
            startFrame,
            endFrame,
            frameCount: endFrame - startFrame
        });

        usedTime += shotData.duration;
    };

    // 1. Hook (Fixed 3s)
    addShot({
        id: 1,
        type: 'hook',
        duration: 3,
        target: scannedPage.hero.selector,
        action: null,
        caption: generateHookCaption(scannedPage),
        cameraMove: 'static'
    });

    // 2. Intro (Clamped 7-9s)
    const introDuration = Math.min(Math.max(7, Math.floor(targetDuration * 0.2)), 9);
    addShot({
        id: 2,
        type: 'intro',
        duration: introDuration,
        target: scannedPage.hero.selector,
        action: null,
        caption: generateIntroCaption(scannedPage),
        cameraMove: 'slow_pan_down'
    });

    // 3. Features (Min 6s each)
    let interactionsToUse = [...scannedPage.interactions];
    if (interactionsToUse.length === 0) {
        interactionsToUse.push({ selector: 'body > section:nth-of-type(2)', text: 'Discover', intent: 'navigate' });
        interactionsToUse.push({ selector: 'footer', text: 'Contact', intent: 'navigate' });
    }

    const remainingForFeatures = targetDuration - usedTime - 8; // Reserve 8s for CTA
    const featureCount = Math.min(interactionsToUse.length, 3);
    const perFeature = Math.max(6, Math.floor(remainingForFeatures / featureCount));

    interactionsToUse.slice(0, featureCount).forEach((interaction) => {
        addShot({
            id: shots.length + 1,
            type: interaction.intent === 'navigate' ? 'discovery' : 'feature',
            duration: perFeature,
            target: interaction.selector,
            action: interaction.intent === 'navigate' ? null : 'click',
            caption: generateFeatureCaption(interaction),
            cameraMove: interaction.intent === 'navigate' ? 'slow_pan_down' : 'zoom_to_action',
            interaction
        });
    });

    // 4. CTA (Min 5s)
    const ctaDuration = Math.max(5, targetDuration - usedTime);
    addShot({
        id: shots.length + 1,
        type: 'cta',
        duration: ctaDuration,
        target: scannedPage.hero.cta?.selector || 'body',
        action: null,
        caption: scannedPage.hero.cta ? generateCTACaption(scannedPage.hero.cta) : 'Try it for free',
        cameraMove: 'zoom_to_cta'
    });

    console.log(`[Planner] Storyboard Locked: ${shots.length} shots, Total: ${usedTime.toFixed(1)}s`);
    return shots;
}

/**
 * Generate hook caption
 */
function generateHookCaption(scannedPage) {
    const productName = extractProductName(scannedPage);

    const templates = [
        `Meet ${productName}`,
        `${productName}`,
        `Introducing ${productName}`
    ];

    return templates[0];
}

/**
 * Generate intro caption
 */
function generateIntroCaption(scannedPage) {
    const h1 = scannedPage.hero.h1;
    const description = scannedPage.metadata.description;

    // Extract benefit from H1 or description
    if (h1.length > 0 && h1.length < 60) {
        return h1;
    }

    if (description.length > 0 && description.length < 80) {
        return description.split('.')[0];
    }

    return 'The modern way to create videos';
}

/**
 * Generate feature caption
 */
function generateFeatureCaption(interaction) {
    const text = interaction.text;

    // Clean up the text
    let caption = text
        .replace(/click/gi, '')
        .replace(/here/gi, '')
        .trim();

    // Add action verb based on intent
    const verbs = {
        'show_demo': 'See',
        'show_features': 'Explore',
        'switch_tab': 'View',
        'signup': 'Start',
        'navigate': 'Discover'
    };

    const verb = verbs[interaction.intent] || 'Check';

    // Capitalize first letter
    caption = caption.charAt(0).toUpperCase() + caption.slice(1);

    return caption.length > 40 ? caption.substring(0, 37) + '...' : caption;
}

/**
 * Generate CTA caption
 */
function generateCTACaption(cta) {
    if (!cta) return 'Get started now';

    const text = cta.text.trim();

    // Use CTA text if it's good
    if (text.match(/try|start|sign|get|create/i)) {
        return text.charAt(0).toUpperCase() + text.slice(1);
    }

    return 'Try it free';
}

/**
 * Extract product name from page
 */
function extractProductName(scannedPage) {
    // Try title first
    const title = scannedPage.metadata.title;
    if (title) {
        // Remove common suffixes
        return title
            .replace(/\s*[-|–—]\s*.*/g, '')
            .replace(/\s*•\s*.*/g, '')
            .trim();
    }

    // Fall back to domain
    try {
        const url = new URL(scannedPage.url);
        const domain = url.hostname.replace('www.', '');
        return domain.split('.')[0];
    } catch {
        return 'This product';
    }
}

module.exports = {
    buildStoryboard
};
