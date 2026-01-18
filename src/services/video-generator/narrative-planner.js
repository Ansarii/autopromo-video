/**
 * Narrative Planner - Story Engine
 * Generates story-driven video narratives with strategic shot sequences
 */

const NARRATIVE_TEMPLATES = {
    saas_landing: {
        structure: ['hook', 'solution', 'cta'],
        beats: {
            hook: { proportion: 0.10, tempo: 'fast', music: 'intense_build' },      // 10% of total
            solution: { proportion: 0.70, tempo: 'dynamic', music: 'uplifting' },   // 70% of total
            cta: { proportion: 0.20, tempo: 'medium', music: 'resolution' }         // 20% of total
        }
    },
    product: {
        structure: ['hook', 'features', 'cta'],
        beats: {
            hook: { proportion: 0.10, tempo: 'fast', music: 'intense_build' },
            features: { proportion: 0.70, tempo: 'dynamic', music: 'uplifting' },
            cta: { proportion: 0.20, tempo: 'medium', music: 'resolution' }
        }
    },
    pricing: {
        structure: ['hook', 'plans', 'cta'],
        beats: {
            hook: { proportion: 0.10, tempo: 'fast', music: 'intense_build' },
            plans: { proportion: 0.67, tempo: 'dynamic', music: 'uplifting' },
            cta: { proportion: 0.23, tempo: 'medium', music: 'resolution' }
        }
    }
};

/**
 * Plan narrative-driven storyboard
 */
function planNarrative(semanticData, targetDuration = 50) {
    console.log('[NarrativePlanner] Planning story structure...');

    // Select template based on page type
    const template = NARRATIVE_TEMPLATES[semanticData.pageType] || NARRATIVE_TEMPLATES.saas_landing;

    // Generate narrative beats
    const narrative = {
        structure: template.structure,
        beats: [],
        totalDuration: targetDuration,
        metadata: {
            pageType: semanticData.pageType,
            hasTestimonials: semanticData.socialProof.testimonials.length > 0,
            hasMetrics: semanticData.socialProof.metrics.length > 0,
            valuePropsCount: semanticData.valueProps.length
        }
    };

    // Build each beat with shots
    template.structure.forEach((beatName, index) => {
        const beatConfig = template.beats[beatName];
        const beat = createBeat(beatName, beatConfig, semanticData, index, targetDuration);
        narrative.beats.push(beat);
    });

    // Adjust timing to match target duration (final normalization)
    narrative.beats = adjustTiming(narrative.beats, targetDuration);

    console.log('[NarrativePlanner] Created', narrative.beats.length, 'narrative beats');
    return narrative;
}

/**
 * Create a narrative beat with shots
 */
function createBeat(beatName, config, data, index, targetDuration) {
    // Calculate actual duration from proportion
    const calculatedDuration = Math.max(1, Math.round(config.proportion * targetDuration));

    const beat = {
        name: beatName,
        index,
        duration: calculatedDuration,
        tempo: config.tempo,
        music: config.music,
        shots: [],
        captions: []
    };

    // Generate shots based on beat type
    switch (beatName) {
        case 'hook':
            beat.shots = createHookShots(data, calculatedDuration);
            beat.captions = createHookCaptions(data);
            break;

        case 'problem':
            beat.shots = createProblemShots(data, calculatedDuration);
            beat.captions = createProblemCaptions(data);
            break;

        case 'solution':
        case 'features':
        case 'plans':  // Added for pricing template
            beat.shots = createSolutionShots(data, calculatedDuration);
            beat.captions = createSolutionCaptions(data);
            break;

        case 'proof':
        case 'social_proof':
            beat.shots = createProofShots(data, calculatedDuration);
            beat.captions = createProofCaptions(data);
            break;

        case 'cta':
            beat.shots = createCTAShots(data, calculatedDuration);
            beat.captions = createCTACaptions(data);
            break;

        case 'benefits':
            beat.shots = createBenefitsShots(data, calculatedDuration);
            beat.captions = createBenefitsCaptions(data);
            break;

        default:
            beat.shots = createGenericShots(data, calculatedDuration);
    }

    return beat;
}

/**
 * HOOK SHOTS: Grab attention immediately
 */
function createHookShots(data, duration) {
    const shots = [];

    // Single establishing shot - fast and efficient
    if (data.hero.headline) {
        shots.push({
            type: 'establishing_wide',
            target: 'hero',
            duration: duration,  // Use full hook duration (2s)
            cameraMove: 'push_smooth',
            zoomLevel: { start: 0.9, end: 1.1 },
            focus: 'headline'
        });
    } else {
        shots.push({
            type: 'establishing_wide',
            target: 'viewport',
            duration: duration,
            cameraMove: 'static',
            zoomLevel: { start: 1.0, end: 1.0 }
        });
    }

    return shots;
}

function createHookCaptions(data) {
    if (data.hero.headline) {
        return [{
            text: data.hero.headline,
            startTime: 0.5,
            duration: 2.0,
            position: 'center',
            animation: 'scale_bounce',
            style: 'headline'
        }];
    }
    return [];
}

/**
 * PROBLEM SHOTS: Show pain points
 */
function createProblemShots(data, duration) {
    const shots = [];

    if (data.painPoints.length > 0) {
        // Show problem context
        data.painPoints.slice(0, 2).forEach((pain, idx) => {
            shots.push({
                type: 'feature_medium',
                target: 'problem_section',
                duration: duration / 2,
                cameraMove: 'pan_right',
                zoomLevel: { start: 1.1, end: 1.2 },
                overlay: 'subtle_red_tint' // Visual tension
            });
        });
    } else {
        // Infer problem fr solution (scroll to features)
        shots.push({
            type: 'scroll_reveal',
            target: 'features',
            duration: duration,
            cameraMove: 'scroll_smooth',
            scrollAmount: 0.3
        });
    }

    return shots;
}

function createProblemCaptions(data) {
    const captions = [];

    if (data.painPoints.length > 0) {
        captions.push({
            text: data.painPoints[0].text,
            startTime: 1.0,
            duration: 3.0,
            position: 'lower_third',
            animation: 'fade_slide_up',
            style: 'problem'
        });
    } else {
        captions.push({
            text: "Looking for a better solution?",
            startTime: 1.0,
            duration: 2.5,
            position: 'center',
            animation: 'fade_slide_up',
            style: 'question'
        });
    }

    return captions;
}

/**
 * SOLUTION SHOTS: Showcase features with interactions (OPTIMIZED)
 */
function createSolutionShots(data, duration) {
    const shots = [];
    const valueProps = data.valueProps.slice(0, 2); // Only top 2 features for speed

    if (valueProps.length === 0) {
        // Fallback: single scroll through page
        return [{
            type: 'scroll_tour',
            target: 'content',
            duration: duration,
            cameraMove: 'scroll_smooth',
            scrollAmount: 0.5  // Reduced scroll distance
        }];
    }

    // Create ONE shot per feature (no detail closeups)
    const timePerFeature = duration / valueProps.length;

    valueProps.forEach((prop, idx) => {
        // Use REAL selectors that will actually find the sections
        const sectionSelectors = [
            `section:nth-of-type(${idx + 2})`,  // Skip first section (hero)
            `div[class]:nth-of-type(${idx + 3})`,
            `article:nth-of-type(${idx + 1})`
        ];

        shots.push({
            type: 'feature_showcase',
            target: sectionSelectors.join(', '),  // Use actual CSS selector
            duration: timePerFeature,
            cameraMove: 'pan_smooth',
            zoomLevel: { start: 1.0, end: 1.2 },  // Reduced zoom for visibility
            highlight: false,  // Disabled for speed
            featureData: prop
        });
    });

    return shots;
}

function createSolutionCaptions(data) {
    const captions = [];
    let currentTime = 0.5;

    data.valueProps.slice(0, 3).forEach((prop, idx) => {
        captions.push({
            text: prop.title,
            description: prop.description.substring(0, 80),
            startTime: currentTime,
            duration: 3.5,
            position: 'lower_third',
            animation: 'kinetic_split',
            style: 'feature'
        });
        currentTime += 4.0;
    });

    return captions;
}

/**
 * PROOF SHOTS: Social proof and credibility
 */
function createProofShots(data, duration) {
    const shots = [];

    // Testimonials
    if (data.socialProof.testimonials.length > 0) {
        shots.push({
            type: 'testimonial_carousel',
            target: 'testimonials',
            duration: duration * 0.6,
            cameraMove: 'pan_smooth',
            zoomLevel: { start: 1.1, end: 1.2 }
        });
    }

    // Metrics
    if (data.socialProof.metrics.length > 0) {
        shots.push({
            type: 'metrics_display',
            target: 'stats',
            duration: duration * 0.4,
            cameraMove: 'static_focus',
            zoomLevel: { start: 1.3, end: 1.3 },
            effect: 'counter_animation'
        });
    }

    // Fallback if no proof
    if (shots.length === 0) {
        shots.push({
            type: 'brand_trust',
            target: 'footer_or_logos',
            duration: duration,
            cameraMove: 'slow_pan',
            zoomLevel: { start: 1.0, end: 1.1 }
        });
    }

    return shots;
}

function createProofCaptions(data) {
    const captions = [];

    if (data.socialProof.testimonials.length > 0) {
        captions.push({
            text: `"${data.socialProof.testimonials[0].text}"`,
            author: data.socialProof.testimonials[0].author,
            startTime: 1.0,
            duration: 4.0,
            position: 'center',
            animation: 'fade',
            style: 'testimonial'
        });
    }

    if (data.socialProof.metrics.length > 0) {
        captions.push({
            text: data.socialProof.metrics[0].value,
            description: data.socialProof.metrics[0].label,
            startTime: 5.0,
            duration: 3.0,
            position: 'center',
            animation: 'scale_bounce',
            style: 'metric'
        });
    }

    return captions;
}

/**
 * CTA SHOTS: Clear call to action (OPTIMIZED)
 */
function createCTAShots(data, duration) {
    const shots = [];

    if (data.ctas.primary) {
        // Single CTA focus shot - use REAL selector
        shots.push({
            type: 'cta_focus',
            target: 'a, button',  // Find ANY button or link
            duration: duration,  // Use full duration for one impactful shot
            cameraMove: 'zoom_dramatic',
            zoomLevel: { start: 1.0, end: 1.4 },  // Reduced for visibility
            highlight: false,  // Disabled for speed
            interaction: 'click', // Triggers action
            ctaData: data.ctas.primary
        });
    } else {
        // Fallback: quick scroll to footer
        shots.push({
            type: 'scroll_to_footer',
            target: 'footer',
            duration: duration,
            cameraMove: 'scroll_smooth',
            scrollAmount: 0.3  // Reduced scroll distance
        });
    }

    return shots;
}

function createCTACaptions(data) {
    if (data.ctas.primary) {
        return [{
            text: data.ctas.primary.text,
            startTime: 1.0,
            duration: 3.0,
            position: 'center',
            animation: 'scale_bounce',
            style: 'cta',
            callout: true
        }];
    }
    return [{
        text: "Get Started Today",
        startTime: 1.0,
        duration: 2.5,
        position: 'center',
        animation: 'fade',
        style: 'cta'
    }];
}

/**
 * BENEFITS SHOTS
 */
function createBenefitsShots(data, duration) {
    // Similar to solution but focus on outcomes
    return createSolutionShots(data, duration).map(shot => ({
        ...shot,
        overlay: 'success_green_tint'
    }));
}

function createBenefitsCaptions(data) {
    return createSolutionCaptions(data).map(caption => ({
        ...caption,
        style: 'benefit'
    }));
}

/**
 * Generic shots for fallback
 */
function createGenericShots(data, duration) {
    return [{
        type: 'scroll_tour',
        target: 'content',
        duration: duration,
        cameraMove: 'scroll_smooth',
        scrollAmount: 0.5
    }];
}

/**
 * Adjust timing to match target duration
 */
function adjustTiming(beats, targetDuration) {
    const currentTotal = beats.reduce((sum, beat) => sum + beat.duration, 0);
    const ratio = targetDuration / currentTotal;

    return beats.map(beat => ({
        ...beat,
        duration: beat.duration * ratio,
        shots: beat.shots.map(shot => ({
            ...shot,
            duration: shot.duration * ratio
        })),
        captions: beat.captions.map(caption => ({
            ...caption,
            startTime: caption.startTime * ratio,
            duration: caption.duration * ratio
        }))
    }));
}

module.exports = {
    planNarrative,
    NARRATIVE_TEMPLATES
};
