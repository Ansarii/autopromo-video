// State
let selectedDuration = 30;
let currentJobId = null;
let pollingInterval = null;
let selectedFormat = '16:9';
let currentUrl = '';
let consoleLogs = [];
let startTime = null;

// Advanced options state
let selectedFontWeight = 'bold';
let selectedTextColor = '#00CED1';
let selectedLogoPosition = 'top-right';
let logoFile = null;

// Progress steps configuration
const PROGRESS_STEPS = [
    { id: 1, name: 'Initializing Browser', range: [0, 20], message: 'Headless chrome instance started' },
    { id: 2, name: 'Analyzing Content', range: [20, 40], message: 'Extracting assets and metadata' },
    { id: 3, name: 'Rendering Video', range: [40, 85], message: 'Processing scenes and transitions' },
    { id: 4, name: 'Finalizing & Uploading', range: [85, 100], message: 'Encoding and saving' }
];

// Show custom dialog
function showDialog(message) {
    const dialog = document.getElementById('customDialog');
    const dialogMessage = document.getElementById('dialogMessage');
    if (dialog && dialogMessage) {
        dialogMessage.textContent = message;
        dialog.classList.add('show');
    }
}

function closeDialog() {
    const dialog = document.getElementById('customDialog');
    if (dialog) dialog.classList.remove('show');
}

// Console logging
function addConsoleLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    const colors = {
        info: 'text-slate-300',
        success: 'text-green-400/80',
        warning: 'text-yellow-400/80',
        error: 'text-red-400/80',
        blue: 'text-blue-400/80'
    };

    consoleLogs.push({ timestamp, message, type });

    const consoleLog = document.getElementById('consoleLog');
    if (!consoleLog) return;

    const logEntry = document.createElement('div');
    logEntry.className = `flex gap-3 ${colors[type] || colors.info}`;
    logEntry.innerHTML = `
        <span class="text-slate-500 shrink-0">[${timestamp}]</span>
        <span>${message}</span>
    `;

    consoleLog.appendChild(logEntry);
    consoleLog.scrollTop = consoleLog.scrollHeight;
}

// Update progress steps
function updateProgressSteps(progress) {
    const stepsContainer = document.getElementById('progressSteps');
    if (!stepsContainer) return;

    stepsContainer.innerHTML = '';

    PROGRESS_STEPS.forEach((step, index) => {
        const isLast = index === PROGRESS_STEPS.length - 1;
        const isComplete = progress >= step.range[1];
        const isActive = progress >= step.range[0] && progress < step.range[1];
        const isUpcoming = progress < step.range[0];

        // Icon column
        const iconDiv = document.createElement('div');
        iconDiv.className = 'flex flex-col items-center';

        let iconHTML = '';
        if (isComplete) {
            iconHTML = `
                <div class="flex items-center justify-center size-8 rounded-full bg-green-500/20 text-green-500 ring-1 ring-green-500/50">
                    <span class="material-symbols-outlined text-sm font-bold">check</span>
                </div>
            `;
        } else if (isActive) {
            iconHTML = `
                <div class="flex items-center justify-center size-8 rounded-full bg-primary text-white shadow-[0_0_15px_rgba(91,43,238,0.5)]">
                    <span class="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                </div>
            `;
        } else {
            iconHTML = `
                <div class="flex items-center justify-center size-8 rounded-full bg-surface-dark border-2 border-slate-700 text-slate-700">
                    <span class="material-symbols-outlined text-sm">circle</span>
                </div>
            `;
        }

        if (!isLast) {
            iconHTML += `<div class="w-0.5 bg-border-dark h-full min-h-[24px]"></div>`;
        }

        iconDiv.innerHTML = iconHTML;
        stepsContainer.appendChild(iconDiv);

        // Content column
        const contentDiv = document.createElement('div');
        contentDiv.className = isLast ? 'pt-1' : 'pb-6 pt-1';

        const textColor = isActive ? 'text-primary' : isComplete ? 'text-white' : 'text-slate-500';
        const descColor = isActive ? 'text-slate-400' : 'text-slate-500';

        contentDiv.innerHTML = `
            <p class="${textColor} text-base font-medium">${step.name}</p>
            ${!isUpcoming ? `<p class="${descColor} text-sm mt-0.5">${step.message}</p>` : ''}
        `;

        stepsContainer.appendChild(contentDiv);
    });
}

// Update circular progress
function updateCircularProgress(progress) {
    const circle = document.getElementById('progressCircle');
    const percentText = document.getElementById('progressPercentCircle');

    if (circle) {
        circle.setAttribute('stroke-dasharray', `${progress}, 100`);
    }
    if (percentText) {
        percentText.textContent = `${progress}%`;
    }
}

// Update status text based on progress
function updateStatusText(progress) {
    const statusText = document.getElementById('videoStatusText');
    if (!statusText) return;

    if (progress < 20) {
        statusText.textContent = 'Launching browser and loading your website...';
    } else if (progress < 40) {
        statusText.textContent = 'Detecting interactive elements and analyzing content...';
    } else if (progress < 70) {
        statusText.textContent = 'Capturing screenshots and generating scenes...';
    } else if (progress < 95) {
        statusText.textContent = 'Applying transitions, music, and text overlays...';
    } else if (progress < 100) {
        statusText.textContent = 'Finalizing video and saving...';
    } else {
        statusText.textContent = 'Video generated successfully!';
    }
}

// Wait for DOM
document.addEventListener('DOMContentLoaded', () => {
    const videoForm = document.getElementById('videoForm');
    const urlInput = document.getElementById('urlInput');

    // Navigation smooth scroll
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // Advanced Options Toggle
    const advancedToggle = document.getElementById('advancedToggle');
    const advancedOptions = document.getElementById('advancedOptions');
    const advancedArrow = document.getElementById('advancedArrow');

    if (advancedToggle) {
        advancedToggle.addEventListener('click', () => {
            advancedOptions.classList.toggle('hidden');
            advancedArrow.style.transform = advancedOptions.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)';
        });
    }

    // Font Weight Selection
    document.querySelectorAll('.font-weight-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.font-weight-btn').forEach(b => {
                b.classList.remove('bg-primary', 'border-primary', 'text-white');
                b.classList.add('bg-surface-light', 'border-border-dark');
            });
            btn.classList.remove('bg-surface-light', 'border-border-dark');
            btn.classList.add('bg-primary', 'border-primary', 'text-white');
            selectedFontWeight = btn.dataset.weight;
        });
    });

    // Color Presets
    document.querySelectorAll('.color-preset').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.color-preset').forEach(b => {
                b.classList.remove('border-primary');
                b.classList.add('border-transparent');
            });
            btn.classList.remove('border-transparent');
            btn.classList.add('border-primary');
            selectedTextColor = btn.dataset.color;
            document.getElementById('textColorPicker').value = selectedTextColor === 'white' ? '#FFFFFF' : selectedTextColor;
        });
    });

    // Color Picker
    const colorPicker = document.getElementById('textColorPicker');
    if (colorPicker) {
        colorPicker.addEventListener('input', (e) => {
            selectedTextColor = e.target.value;
            // Remove active state from presets
            document.querySelectorAll('.color-preset').forEach(b => {
                b.classList.remove('border-primary');
                b.classList.add('border-transparent');
            });
        });
    }

    // Logo Upload
    const logoUpload = document.getElementById('logoUpload');
    const logoPositionOptions = document.getElementById('logoPositionOptions');

    if (logoUpload) {
        logoUpload.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                logoFile = e.target.files[0];
                logoPositionOptions.classList.remove('hidden');
            } else {
                logoFile = null;
                logoPositionOptions.classList.add('hidden');
            }
        });
    }

    // Logo Position Selection
    document.querySelectorAll('.logo-position-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.logo-position-btn').forEach(b => {
                b.classList.remove('bg-primary', 'border-primary', 'text-white');
                b.classList.add('bg-surface-light', 'border-border-dark');
            });
            btn.classList.remove('bg-surface-light', 'border-border-dark');
            btn.classList.add('bg-primary', 'border-primary', 'text-white');
            selectedLogoPosition = btn.dataset.position;
        });
    });

    // Music Track Preview
    const musicSelect = document.getElementById('musicTrack');
    const previewAudio = new Audio();

    if (musicSelect) {
        musicSelect.addEventListener('change', (e) => {
            const track = e.target.value;
            if (track) {
                // Play preview of selected track
                previewAudio.src = `/music/${track}`;
                previewAudio.volume = 0.3;
                previewAudio.currentTime = 0;
                previewAudio.play().catch(err => console.log('Audio play failed:', err));

                // Stop after 5 seconds
                setTimeout(() => {
                    previewAudio.pause();
                    previewAudio.currentTime = 0;
                }, 5000);
            } else {
                previewAudio.pause();
            }
        });
    }

    // Format selection
    const formatInputs = document.querySelectorAll('input[name="format"]');
    formatInputs.forEach(input => {
        input.addEventListener('change', (e) => {
            selectedFormat = e.target.value;
        });
    });

    // Duration selection
    const durationButtons = document.querySelectorAll('.duration-btn');
    durationButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            durationButtons.forEach(b => {
                b.classList.remove('bg-primary', 'border-primary', 'text-white');
                b.classList.add('bg-surface-light', 'border-border-dark');
            });
            btn.classList.remove('bg-surface-light', 'border-border-dark');
            btn.classList.add('bg-primary', 'border-primary', 'text-white');
            selectedDuration = parseInt(btn.dataset.duration);
        });
    });

    // Form submission
    if (videoForm) {
        videoForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const url = urlInput.value.trim();
            currentUrl = url;

            // Validation
            if (!url) {
                showDialog('Please enter a website URL');
                return;
            }

            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                showDialog('URL must start with http:// or https://');
                return;
            }

            const legalConfirm = document.getElementById('legalConfirm');
            if (legalConfirm && !legalConfirm.checked) {
                showDialog('Please confirm you have rights to promote this website');
                return;
            }

            // Start video generation
            startVideoGeneration(url);
        });
    }

    // Back to home button
    const backBtn = document.getElementById('backToHomeBtn');
    if (backBtn) {
        backBtn.onclick = backToHome;
    }
});

// Global function to return to home screen
function backToHome() {
    document.getElementById('progressSection').classList.add('hidden');
    document.getElementById('mainContent').classList.remove('hidden');
    window.scrollTo(0, 0);
    location.reload();
}

async function startVideoGeneration(url) {
    // Reset state
    consoleLogs = [];
    startTime = Date.now();

    console.log('[DEBUG] Switching to progress screen...');

    // HIDE homepage and SHOW progress screen (completely separate)
    const mainContent = document.getElementById('mainContent');
    const progressSection = document.getElementById('progressSection');

    if (mainContent) {
        mainContent.classList.add('hidden');
        console.log('[DEBUG] Homepage hidden');
    } else {
        console.error('[ERROR] mainContent not found!');
    }

    if (progressSection) {
        progressSection.classList.remove('hidden');
        console.log('[DEBUG] Progress screen shown');
    } else {
        console.error('[ERROR] progressSection not found!');
    }

    // Scroll to top
    window.scrollTo(0, 0);

    document.getElementById('progressUrl').textContent = url;

    // Initialize console
    addConsoleLog('System initialized v2.4.1', 'info');
    addConsoleLog('Starting video generation pipeline...', 'blue');

    try {
        // Create job
        // Create FormData for file upload support
        const formData = new FormData();
        formData.append('url', url);
        formData.append('format', selectedFormat);
        formData.append('duration', selectedDuration);

        // Get selected mode
        const modeInput = document.querySelector('input[name="mode"]:checked');
        const selectedMode = modeInput ? modeInput.value : 'basic';
        formData.append('mode', selectedMode);
        addConsoleLog(`Mode: ${selectedMode === 'pro_director' ? 'Pro Director 🎬' : 'Simple Scroll'}`, 'info');

        // Add enhancement options
        const musicSelect = document.getElementById('musicTrack');
        if (musicSelect && musicSelect.value) {
            formData.append('musicTrack', musicSelect.value);
            addConsoleLog(`Music: ${musicSelect.value}`, 'info');
        }

        if (selectedFontWeight) {
            formData.append('fontWeight', selectedFontWeight);
            addConsoleLog(`Font: ${selectedFontWeight}`, 'info');
        }

        if (selectedTextColor) {
            formData.append('textColor', selectedTextColor);
            addConsoleLog(`Text Color: ${selectedTextColor}`, 'info');
        }

        if (logoFile) {
            formData.append('logo', logoFile);
            formData.append('logoPosition', selectedLogoPosition);
            formData.append('logoSize', '80');
            formData.append('logoOpacity', '0.8');
            addConsoleLog(`Logo: ${logoFile.name} at ${selectedLogoPosition}`, 'info');
        }

        const response = await fetch('/api/jobs', {
            method: 'POST',
            body: formData // Don't set Content-Type header - browser will set it with boundary
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || error.error || 'Failed to create job');
        }

        const data = await response.json();
        currentJobId = data.id || data.jobId; // Support both field names

        addConsoleLog(`Job created: ${currentJobId}`, 'success');
        addConsoleLog('Connecting to remote browser instance...', 'blue');

        // Start polling
        startPolling();

    } catch (error) {
        console.error('Error:', error);
        addConsoleLog(`ERROR: ${error.message}`, 'error');
        showDialog(error.message || 'Failed to generate video. Please try again.');
        setTimeout(() => location.reload(), 3000);
    }
}

// Polling function with smart console logging
function startPolling() {
    if (pollingInterval) clearInterval(pollingInterval);

    let lastProgress = 0;
    let lastStatus = '';

    pollingInterval = setInterval(async () => {
        try {
            const response = await fetch(`/api/jobs/${currentJobId}`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const job = await response.json();

            const progress = Math.min(job.progress || 0, 100);

            // Add console logs based on progress milestones
            if (progress >= 5 && lastProgress < 5) {
                addConsoleLog('Browser launched successfully', 'success');
            }
            if (progress >= 15 && lastProgress < 15) {
                addConsoleLog(`Navigating to ${currentUrl}...`, 'blue');
            }
            if (progress >= 25 && lastProgress < 25) {
                addConsoleLog('DOM loaded. Analyzing page structure...', 'info');
            }
            if (progress >= 35 && lastProgress < 35) {
                addConsoleLog('Finding interactive elements (buttons, forms, tabs)...', 'info');
            }
            if (progress >= 45 && lastProgress < 45) {
                addConsoleLog('Starting screenshot capture at 10 FPS...', 'warning');
            }
            if (progress >= 55 && lastProgress < 55) {
                addConsoleLog('Scrolling and clicking interactive elements...', 'info');
            }
            if (progress >= 65 && lastProgress < 65) {
                addConsoleLog('Screenshot capture complete. Starting FFmpeg...', 'success');
            }
            if (progress >= 75 && lastProgress < 75) {
                addConsoleLog('Generating video with H.264 codec...', 'warning');
            }
            if (progress >= 85 && lastProgress < 85) {
                addConsoleLog('Adding background music and text overlays...', 'info');
            }
            if (progress >= 95 && lastProgress < 95) {
                addConsoleLog('Finalizing video file...', 'blue');
            }

            lastProgress = progress;

            // Update all UI elements
            updateProgressSteps(progress);
            updateCircularProgress(progress);
            updateStatusText(progress);

            if (job.status === 'completed') {
                clearInterval(pollingInterval);
                addConsoleLog('Video generation complete!', 'success');
                addConsoleLog(`Output: ${job.videoUrl}`, 'success');
                showVideoComplete(job.videoUrl);
            } else if (job.status === 'failed') {
                clearInterval(pollingInterval);
                addConsoleLog(`FAILED: ${job.error || 'Unknown error'}`, 'error');
                showDialog(job.error || 'Video generation failed');
                setTimeout(() => location.reload(), 3000);
            }
        } catch (error) {
            console.error('Polling error:', error);
            // Don't spam the console with errors, only log once per second
            if (error.message && !error.message.includes('Load failed')) {
                addConsoleLog(`API Error: ${error.message}`, 'error');
            }
        }
    }, 1000);
}

// Show completed video
function showVideoComplete(videoUrl) {
    // Keep the left progress panel visible as requested
    // const leftPane = document.querySelector('#progressSection .lg\\:w-5\\/12');
    // if (leftPane) {
    //     leftPane.classList.add('hidden');
    // }

    // Update status badge and title
    const statusBadge = document.getElementById('progressStatusBadge');
    const statusTitle = document.getElementById('progressStatusTitle');

    if (statusBadge) {
        statusBadge.textContent = 'Completed';
        statusBadge.classList.remove('bg-primary/10', 'text-primary', 'ring-primary/20');
        statusBadge.classList.add('bg-green-500/10', 'text-green-500', 'ring-green-500/20');
    }

    if (statusTitle) {
        statusTitle.textContent = 'Video Ready';
    }

    // Ensure all progress markers are at 100%
    updateProgressSteps(100);
    updateCircularProgress(100);
    updateStatusText(100);

    // Hide loading, show video
    const loadingDiv = document.getElementById('videoLoading');
    const videoPlayer = document.getElementById('progressVideoPlayer');

    if (loadingDiv) loadingDiv.classList.add('hidden');
    if (videoPlayer) {
        videoPlayer.classList.remove('hidden');
        videoPlayer.src = videoUrl;
    }

    // Keep the right pane at its original width
    // const rightPane = document.querySelector('#progressSection .lg\\:w-7\\/12');
    // if (rightPane) {
    //     rightPane.classList.remove('lg:w-7/12');
    //     rightPane.classList.add('lg:w-full');
    // }

    // Enable action buttons
    const downloadBtn = document.getElementById('downloadBtnProgress');
    const copyLinkBtn = document.getElementById('copyLinkBtnProgress');

    if (downloadBtn) {
        downloadBtn.disabled = false;
        downloadBtn.classList.remove('cursor-not-allowed', 'bg-slate-800', 'text-slate-400');
        downloadBtn.classList.add('cursor-pointer', 'bg-primary', 'text-white', 'hover:bg-primary/90');
        downloadBtn.onclick = () => {
            const a = document.createElement('a');
            a.href = videoUrl;
            a.download = `autopromo-${currentJobId}.mp4`;
            a.click();
            addConsoleLog('Download initiated', 'success');
        };
    }

    if (copyLinkBtn) {
        copyLinkBtn.disabled = false;
        copyLinkBtn.classList.remove('cursor-not-allowed', 'opacity-60', 'text-slate-500');
        copyLinkBtn.classList.add('cursor-pointer', 'text-white', 'hover:bg-surface-dark');
        copyLinkBtn.onclick = () => {
            navigator.clipboard.writeText(window.location.origin + videoUrl);
            copyLinkBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">check</span> Copied!';
            setTimeout(() => {
                copyLinkBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">link</span> Copy Link';
            }, 2000);
            addConsoleLog('Link copied to clipboard', 'success');
        };
    }

    // Update status badge
    const badge = document.querySelector('.inline-flex.items-center.rounded-full');
    if (badge) {
        badge.className = 'inline-flex items-center rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-500 ring-1 ring-inset ring-green-500/20';
        badge.textContent = 'Complete';
    }
}
