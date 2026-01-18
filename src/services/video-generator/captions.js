/**
 * Captions Module - Template System
 * Generates professional marketing copy based on page context and shot type
 */

const CAPTION_TEMPLATES = {
    hook: [
        'Meet {product}',
        'Stop {pain_point} manually',
        '{product} makes {benefit} easy',
        'Discover {product}'
    ],
    intro: [
        '{verb} {object} in seconds',
        'Built for {audience}',
        'The {adjective} way to {action}',
        'Everything you need to {action}'
    ],
    feature: [
        '{verb} {feature_name}',
        '{benefit} with one click',
        'Instantly {action}',
        'Focus on {benefit}'
    ],
    cta: [
        'Try it free',
        'Get started now',
        'Generate your first {output}',
        'Experience {product} today'
    ]
};

/**
 * Generate a contextual caption for a shot
 * @param {Object} shot - Shot object from planner
 * @param {Object} context - Scanned page data and metadata
 * @returns {string} Generated caption
 */
function generateCaption(shot, context) {
    const templates = CAPTION_TEMPLATES[shot.type] || ['Check this out'];
    const template = templates[Math.floor(Math.random() * templates.length)];

    // Derived values
    const productName = extractProductName(context);
    const domain = new URL(context.url).hostname.replace('www.', '');

    let caption = template
        .replace(/{product}/g, productName)
        .replace(/{domain}/g, domain)
        .replace(/{benefit}/g, extractBenefit(context))
        .replace(/{verb}/g, detectActionVerb(shot))
        .replace(/{feature_name}/g, extractFeatureName(shot))
        .replace(/{action}/g, detectActionVerb(shot).toLowerCase() + ' results')
        .replace(/{pain_point}/g, 'wasting time')
        .replace(/{object}/g, 'content')
        .replace(/{audience}/g, 'teams')
        .replace(/{adjective}/g, 'smartest')
        .replace(/{output}/g, 'video');

    // Capitalize first letter and cleanup
    caption = caption.trim();
    return caption.charAt(0).toUpperCase() + caption.slice(1);
}

/**
 * Helper to extract product name
 */
function extractProductName(context) {
    const title = context.metadata.title || '';
    return title.split(/[-|–—•]/)[0].trim() || 'This Product';
}

/**
 * Helper to extract benefit
 */
function extractBenefit(context) {
    const h1 = context.hero.h1 || '';
    if (h1 && h1.length < 50) return h1.toLowerCase();
    return 'growth';
}

/**
 * Helper to detect action verb
 */
function detectActionVerb(shot) {
    if (shot.type === 'cta') return 'Start';
    if (shot.interaction && shot.interaction.intent) {
        const map = {
            show_demo: 'Experience',
            show_features: 'Explore',
            switch_tab: 'View',
            signup: 'Join',
            navigate: 'Discover'
        };
        return map[shot.interaction.intent] || 'Check';
    }
    return 'See';
}

/**
 * Helper to extract feature name
 */
function extractFeatureName(shot) {
    if (shot.interaction && shot.interaction.text) {
        return shot.interaction.text.trim();
    }
    return 'Features';
}

module.exports = {
    generateCaption
};
