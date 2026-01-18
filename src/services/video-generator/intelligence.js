/**
 * Intelligence Layer - Semantic Page Analysis
 * Understands website structure, marketing narrative, and user journey
 */

/**
 * Analyze page semantics to understand marketing structure
 */
async function analyzePageSemantics(page, url) {
    console.log('[Intelligence] Analyzing page semantics...');

    const semanticData = await page.evaluate(() => {
        // Helper: Get text content cleaned
        const cleanText = (el) => el?.textContent?.trim().replace(/\s+/g, ' ') || '';

        // Helper: Check if element is visible
        const isVisible = (el) => {
            if (!el) return false;
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            return rect.width > 0 && rect.height > 0 &&
                style.display !== 'none' && style.visibility !== 'hidden';
        };

        // 1. HERO SECTION DETECTION
        const hero = {
            element: null,
            headline: '',
            subheadline: '',
            cta: null,
            visualType: 'unknown'
        };

        // Find main headline (usually h1 in top viewport)
        const h1Elements = Array.from(document.querySelectorAll('h1')).filter(isVisible);
        if (h1Elements.length > 0) {
            const heroH1 = h1Elements[0];
            hero.headline = cleanText(heroH1);
            // hero.element removed to fix serialization crash

            // Find associated subheadline (p, h2 near h1)
            const parent = heroH1.parentElement;
            const nextSibling = parent.querySelector('p, h2, h3');
            if (nextSibling) hero.subheadline = cleanText(nextSibling);

            // Find CTA button in hero
            const ctaButton = parent.querySelector('a[class*="button"], button, a[class*="cta"]');
            if (ctaButton && isVisible(ctaButton)) {
                hero.cta = {
                    text: cleanText(ctaButton),
                    action: ctaButton.getAttribute('href') || 'click'
                };
            }

            // Detect visual type
            if (parent.querySelector('video')) hero.visualType = 'video';
            else if (parent.querySelector('img[src*="screenshot"], img[src*="product"]')) hero.visualType = 'product';
            else if (parent.querySelector('canvas, svg')) hero.visualType = 'illustration';
        }

        // 2. VALUE PROPOSITIONS - ULTRA AGGRESSIVE
        const valueProps = [];

        // Strategy 1: Look for ANY section/div with a heading
        const allSections = Array.from(document.querySelectorAll('section, div[class], article'));
        const potentialFeatures = allSections.filter(section => {
            if (!isVisible(section)) return false;
            const hasHeading = section.querySelector('h1, h2, h3, h4');
            const hasContent = section.querySelector('p, span, div');
            const height = section.offsetHeight;
            // Must have heading, content, and be reasonably sized
            return hasHeading && hasContent && height > 50 && height < 2000;
        }).slice(0, 10); // Get many candidates

        potentialFeatures.forEach((section, idx) => {
            const heading = section.querySelector('h1, h2, h3, h4');
            const description = section.querySelector('p') || section.querySelector('span');
            const icon = section.querySelector('svg, img, i[class*="icon"]');

            if (heading && cleanText(heading).length > 3) {
                valueProps.push({
                    title: cleanText(heading).substring(0, 80),
                    description: description ? cleanText(description).substring(0, 150) : '',
                    hasIcon: !!icon,
                    index: idx
                });
            }
        });

        console.log('[Intelligence] Found', valueProps.length, 'value propositions');

        // 3. PAIN POINTS (often in problem/challenge sections)
        const painPoints = [];
        const problemKeywords = ['problem', 'challenge', 'pain', 'difficult', 'struggle', 'issue'];
        const problemSections = Array.from(document.querySelectorAll('section, div')).filter(section => {
            const text = cleanText(section).toLowerCase();
            return problemKeywords.some(keyword => text.includes(keyword)) && text.length < 500;
        }).slice(0, 3);

        problemSections.forEach(section => {
            const heading = section.querySelector('h2, h3, strong');
            if (heading) {
                painPoints.push({
                    text: cleanText(heading),
                    context: cleanText(section).substring(0, 200)
                });
            }
        });

        // 4. SOCIAL PROOF
        const socialProof = {
            testimonials: [],
            metrics: [],
            logos: []
        };

        // Testimonials
        const testimonialElements = document.querySelectorAll(
            '[class*="testimonial"], [class*="review"], [class*="quote"]'
        );
        testimonialElements.forEach((el, idx) => {
            if (idx >= 3 || !isVisible(el)) return;
            const text = cleanText(el);
            const author = el.querySelector('[class*="author"], [class*="name"], cite');
            if (text.length > 20) {
                socialProof.testimonials.push({
                    text: text.substring(0, 150),
                    author: author ? cleanText(author) : 'Customer'
                });
            }
        });

        // Metrics/Stats
        const metricElements = document.querySelectorAll(
            '[class*="stat"], [class*="metric"], [class*="number"]'
        );
        metricElements.forEach((el, idx) => {
            if (idx >= 4 || !isVisible(el)) return;
            const text = cleanText(el);
            // Look for numbers with suffixes like "10K+", "99%", "$1M"
            if (/\d+[KMB%+]/.test(text) || /\$\d+/.test(text)) {
                socialProof.metrics.push({
                    value: text,
                    label: cleanText(el.closest('div, section'))
                });
            }
        });

        // Company logos
        const logoImages = document.querySelectorAll('img[alt*="logo" i], img[src*="logo" i], img[class*="logo"]');
        socialProof.logos = Array.from(logoImages).slice(0, 6).filter(isVisible).length;

        // 5. CTA DETECTION - ULTRA AGGRESSIVE
        const ctas = {
            primary: null,
            secondary: null,
            footer: null
        };

        // Find ALL buttons and links
        let ctaButtons = Array.from(document.querySelectorAll('a, button')).filter(isVisible);

        // Prioritize by keywords
        const primaryKeywords = ['get started', 'sign up', 'try', 'explore', 'demo', 'buy', 'start', 'learn', 'watch', 'see', 'view', 'download'];
        const strongCTAs = ctaButtons.filter(btn =>
            primaryKeywords.some(kw => btn.textContent.toLowerCase().includes(kw))
        );

        // Use strong CTAs if found, otherwise use ANY button/link
        const finalCTAs = strongCTAs.length > 0 ? strongCTAs : ctaButtons;

        if (finalCTAs.length > 0) {
            ctas.primary = {
                text: cleanText(finalCTAs[0]) || 'Click Here',
                action: finalCTAs[0].getAttribute('href') || 'action'
            };
        }

        console.log('[Intelligence] Found CTA:', ctas.primary ? ctas.primary.text : 'none');

        // Footer CTA
        const footer = document.querySelector('footer');
        if (footer) {
            const footerCTA = footer.querySelector('a[class*="button"], button');
            if (footerCTA && isVisible(footerCTA)) {
                ctas.footer = {
                    text: cleanText(footerCTA),
                    action: footerCTA.getAttribute('href') || 'action'
                };
            }
        }

        // 6. USER JOURNEY ELEMENTS
        const journey = {
            hasDemo: !!document.querySelector('[href*="demo"], [class*="demo"]'),
            hasSignup: !!document.querySelector('[href*="signup"], [href*="register"]'),
            hasPricing: !!document.querySelector('[href*="pricing"], [class*="pricing"]'),
            hasLogin: !!document.querySelector('[href*="login"], [href*="signin"]')
        };

        return {
            hero,
            valueProps,
            painPoints,
            socialProof,
            ctas,
            journey,
            // Will detect page type after evaluation using actual data
            pageType: null
        };
    });

    // Detect page type using semantic data (outside evaluate scope)
    function detectPageType(data) {
        const urlLower = url.toLowerCase();

        if (urlLower.includes('product')) return 'product';
        if (urlLower.includes('pricing')) return 'pricing';
        if (urlLower.includes('about')) return 'about';
        if (data.valueProps.length > 2 && data.hero.headline) return 'saas_landing';
        return 'marketing_site';
    }

    semanticData.pageType = detectPageType(semanticData);

    // 7. MARKETING RELEVANCE SCORING
    semanticData.relevanceScores = scoreMarketingRelevance(semanticData);

    console.log('[Intelligence] Detected:', {
        pageType: semanticData.pageType,
        valueProps: semanticData.valueProps.length,
        testimonials: semanticData.socialProof.testimonials.length,
        ctas: Object.keys(semanticData.ctas).filter(k => semanticData.ctas[k]).length
    });

    return semanticData;
}

/**
 * Score elements by marketing relevance
 */
function scoreMarketingRelevance(data) {
    const scores = {};

    // Hero gets highest priority
    scores.hero = 100;

    // Value props scored by position
    data.valueProps.forEach((prop, idx) => {
        scores[`valueProp_${idx}`] = 90 - (idx * 10);
    });

    // Social proof is high value
    scores.socialProof = 75;

    // CTAs are critical
    scores.cta = 95;

    // Pain points set context
    scores.painPoints = 60;

    return scores;
}

/**
 * Generate narrative structure from semantic data
 */
function generateNarrative(semanticData) {
    const narrative = {
        hook: '',
        problem: '',
        solution: '',
        proof: '',
        cta: ''
    };

    // Hook: Use hero headline
    if (semanticData.hero.headline) {
        narrative.hook = semanticData.hero.headline;
    }

    // Problem: Use pain points or infer from value props
    if (semanticData.painPoints.length > 0) {
        narrative.problem = semanticData.painPoints[0].text;
    } else if (semanticData.valueProps.length > 0) {
        // Infer problem from solution
        narrative.problem = `Looking for ${semanticData.valueProps[0].title.toLowerCase()}?`;
    }

    // Solution: Use top value props
    if (semanticData.valueProps.length > 0) {
        narrative.solution = semanticData.valueProps
            .slice(0, 3)
            .map(p => p.title)
            .join('. ');
    }

    // Proof: Use testimonial or metrics
    if (semanticData.socialProof.testimonials.length > 0) {
        narrative.proof = semanticData.socialProof.testimonials[0].text;
    } else if (semanticData.socialProof.metrics.length > 0) {
        narrative.proof = `Join ${semanticData.socialProof.metrics[0].value} satisfied users`;
    }

    // CTA: Use primary CTA
    if (semanticData.ctas.primary) {
        narrative.cta = semanticData.ctas.primary.text;
    } else {
        narrative.cta = 'Get Started Today';
    }

    return narrative;
}

module.exports = {
    analyzePageSemantics,
    generateNarrative,
    scoreMarketingRelevance
};
