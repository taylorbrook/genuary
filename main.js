// Main application logic and animation loop

let shaderProgram;
let startTime;
let currentDay = 1;

// Expose to window for testing and debugging
window.currentDay = currentDay;

// Shader configurations for each day
const shaders = {
    1: {
        name: "Hypnotic Kaleidoscope",
        subtitle: "One color, one shape",
        vertexPath: "shaders/vertex.glsl",
        fragmentPath: "shaders/fragment.glsl",
        params: {
            hue: 200,
            segments: 8,
            sides: 6,
            scale: 2.0,
            speed: 0.5,
            rotation: 0.2,
            layer1Count: 8,
            layer1Radius: 0.25,
            layer1RotSpeed: 1.8,
            layer1Scale: 0.18,
            layer2Count: 12,
            layer2Radius: 0.65,
            layer2RotSpeed: -0.8,
            layer2Scale: 0.22,
            layer3Count: 16,
            layer3Radius: 1.0,
            layer3RotSpeed: 0.4,
            layer3Scale: 0.28,
            blendSmoothness: 0.15,
            pulseFreq: 1.5,
            pulseAmount: 0.12,
            waveStrength: 0.06,
            zoomFreq: 0.4,
            zoomAmount: 0.08,
            recursionDepth: 0,
            recursionScale: 0.6,
            recursionSpread: 1.0,
            recursionFade: 0.7
        }
    },
    2: {
        name: "Anticipation",
        subtitle: "12 Principles of Animation",
        vertexPath: "shaders/vertex.glsl",
        fragmentPath: "shaders/day2-fragment.glsl",
        params: {
            hue: 200,
            speed: 0.6,
            sketchiness: 0.15,
            hatchDensity: 0.3,
            anticipationAmt: 0.8,
            windUpDuration: 0.6,
            energyIntensity: 0.5,
            formCount: 3,
            paperGrain: 0.3,
            lineWeight: 0.7,
            contrast: 1.8
        }
    },
    3: {
        name: "Fibonacci Forever",
        subtitle: "Fibonacci sequence",
        vertexPath: "shaders/vertex.glsl",
        fragmentPath: "shaders/day3-fragment.glsl",
        params: {
            fundamental: 40,
            harmonicCount: 5,
            globalVolume: 0.3,
            rotation: 0.0,
            sketchiness: 0.15,
            lineWeight: 0.8,
            glowIntensity: 1.0,
            spiralWeight: 1.5
        }
    }
};

// Parameters controlled by UI
const params = {
    hue: 100,
    segments: 8,
    sides: 4,
    scale: 4.0,
    speed: 0.5,
    rotation: 0.2,

    // Layer 1 (Inner - Fast)
    layer1Count: 8,
    layer1Radius: 0.25,
    layer1RotSpeed: 1.8,
    layer1Scale: 0.18,

    // Layer 2 (Middle - Counter-rotating)
    layer2Count: 12,
    layer2Radius: 0.65,
    layer2RotSpeed: -0.8,
    layer2Scale: 0.22,

    // Layer 3 (Outer - Slow)
    layer3Count: 16,
    layer3Radius: 1.0,
    layer3RotSpeed: 0.4,
    layer3Scale: 0.28,

    // Effects
    blendSmoothness: 0.15,
    pulseFreq: 1.5,
    pulseAmount: 0.12,
    waveStrength: 0.06,
    zoomFreq: 0.4,
    zoomAmount: 0.08,

    // Recursive effect
    recursionDepth: 3,
    recursionScale: 0.6,
    recursionSpread: 1.0,
    recursionFade: 0.7
};

// Generate calendar grid
function generateCalendar() {
    const grid = document.querySelector('.calendar-grid');

    // January 2026 starts on Thursday (day 4, 0=Sunday)
    const startDay = 4;
    const completedDays = Object.keys(shaders).length;

    // Clear existing days (keep labels)
    const existingDays = grid.querySelectorAll('.calendar-day');
    existingDays.forEach(day => day.remove());

    // Add empty cells for padding
    for (let i = 0; i < startDay; i++) {
        const empty = document.createElement('div');
        empty.className = 'calendar-day empty';
        grid.appendChild(empty);
    }

    // Add day cells
    for (let day = 1; day <= completedDays; day++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        dayEl.textContent = day;
        dayEl.dataset.day = day;

        if (day === currentDay) {
            dayEl.classList.add('active');
        }

        dayEl.addEventListener('click', () => switchToDay(day));
        grid.appendChild(dayEl);
    }
}

// Switch to a different day's shader
async function switchToDay(day) {
    if (!shaders[day]) return;

    currentDay = day;
    window.currentDay = day; // Expose to window

    // Update URL to reflect current day (allows direct linking)
    const newUrl = new URL(window.location);
    newUrl.searchParams.set('day', day);
    window.history.pushState({}, '', newUrl);

    // Update calendar active state
    document.querySelectorAll('.calendar-day').forEach(el => {
        el.classList.remove('active');
        if (parseInt(el.dataset.day) === day) {
            el.classList.add('active');
        }
    });

    // Update header
    document.querySelector('header h1').textContent = shaders[day].name;
    document.querySelector('header p').textContent = shaders[day].subtitle;

    // Show/hide appropriate control panels
    document.querySelectorAll('[class^="day-"]').forEach(el => {
        el.style.display = 'none';
    });
    const dayControls = document.querySelector(`.day-${day}-controls`);
    if (dayControls) {
        dayControls.style.display = 'block';
    }

    // Initialize audio system for Day 3
    console.log('[AUDIO TEST] Switching to day:', day);
    console.log('[AUDIO TEST] FibonacciChord class exists:', typeof FibonacciChord !== 'undefined');

    if (day === 3 && typeof FibonacciChord !== 'undefined') {
        console.log('[AUDIO TEST] Day 3 initialization starting...');
        if (!window.fibonacciChord) {
            console.log('[AUDIO TEST] Creating new FibonacciChord instance');
            window.fibonacciChord = new FibonacciChord();
            await window.fibonacciChord.init();
            console.log('[AUDIO TEST] FibonacciChord initialized');
        }
        // Update audio parameters
        window.fibonacciChord.fundamental = params.fundamental || 40;
        window.fibonacciChord.harmonicCount = params.harmonicCount || 5;
        window.fibonacciChord.globalVolume = params.globalVolume || 0.3;
        console.log('[AUDIO TEST] Audio parameters set:', {
            fundamental: window.fibonacciChord.fundamental,
            harmonicCount: window.fibonacciChord.harmonicCount,
            globalVolume: window.fibonacciChord.globalVolume
        });
    } else if (day !== 3 && window.fibonacciChord && window.fibonacciChord.isPlaying) {
        // Stop audio when leaving Day 3
        console.log('[AUDIO TEST] Leaving Day 3, stopping audio');
        window.fibonacciChord.stop();
    }

    // Reload shader
    const config = shaders[day];
    await shaderProgram.init(config.vertexPath, config.fragmentPath);

    // Update params
    Object.assign(params, config.params);

    // Update UI controls
    updateControlValues();
}

// Update UI control values to match params
function updateControlValues() {
    Object.keys(params).forEach(key => {
        const slider = document.getElementById(key);
        const display = document.getElementById(`${key}-value`);
        if (slider && display) {
            slider.value = params[key];
            const isInt = slider.step === '1';
            display.textContent = isInt ? params[key] : params[key].toFixed(2);
        }
    });
}

// Initialize the application
async function init() {
    const canvas = document.getElementById('glCanvas');
    shaderProgram = new ShaderProgram(canvas);
    window.shaderProgram = shaderProgram; // Expose to window for testing

    try {
        // Check URL for day parameter (e.g., ?day=2 or #day2)
        const urlParams = new URLSearchParams(window.location.search);
        const hashMatch = window.location.hash.match(/^#day(\d+)$/);
        const dayFromUrl = urlParams.get('day') || (hashMatch ? hashMatch[1] : null);

        if (dayFromUrl && shaders[dayFromUrl]) {
            currentDay = parseInt(dayFromUrl);
            window.currentDay = currentDay; // Expose to window
        }

        // Load initial shader
        const initialShader = shaders[currentDay];
        await shaderProgram.init(initialShader.vertexPath, initialShader.fragmentPath);
        console.log('Shaders loaded successfully');

        // Update params for current day
        Object.assign(params, initialShader.params);

        // Initialize audio system for Day 3 if needed
        if (currentDay === 3 && typeof FibonacciChord !== 'undefined') {
            console.log('[AUDIO TEST] Initializing Day 3 audio on page load...');
            window.fibonacciChord = new FibonacciChord();
            await window.fibonacciChord.init();
            window.fibonacciChord.fundamental = params.fundamental || 40;
            window.fibonacciChord.harmonicCount = params.harmonicCount || 5;
            window.fibonacciChord.globalVolume = params.globalVolume || 0.3;
            console.log('[AUDIO TEST] Day 3 audio initialized');
        }

        // Generate calendar
        generateCalendar();

        // Setup UI controls
        setupControls();

        // Update UI to match current day
        updateControlValues();
        document.querySelector('header h1').textContent = initialShader.name;
        document.querySelector('header p').textContent = initialShader.subtitle;

        // Show correct control panel
        document.querySelectorAll('[class^="day-"]').forEach(el => {
            el.style.display = 'none';
        });
        const dayControls = document.querySelector(`.day-${currentDay}-controls`);
        if (dayControls) {
            dayControls.style.display = 'block';
        }

        // Start animation loop
        startTime = performance.now();
        requestAnimationFrame(animate);

        // Handle window resize
        window.addEventListener('resize', () => {
            shaderProgram.resize();
        });

    } catch (error) {
        console.error('Failed to initialize:', error);
        alert('Failed to initialize WebGL: ' + error.message);
    }
}

// Setup UI control event listeners - works dynamically for all controls
function setupControls() {
    // Find all input sliders in the controls panel
    const allSliders = document.querySelectorAll('.controls input[type="range"]');

    allSliders.forEach(slider => {
        const id = slider.id;
        const valueDisplay = document.getElementById(`${id}-value`);

        if (valueDisplay) {
            // Determine if this is an integer control based on step
            const isInt = slider.step === '1';

            slider.addEventListener('input', (e) => {
                const value = isInt ? parseInt(e.target.value) : parseFloat(e.target.value);
                params[id] = value;
                valueDisplay.textContent = isInt ? value : value.toFixed(2);

                // Day 3 specific: Update audio parameters in real-time
                if (currentDay === 3 && window.fibonacciChord) {
                    if (id === 'fundamental') {
                        window.fibonacciChord.setFundamental(value);
                    } else if (id === 'harmonicCount') {
                        window.fibonacciChord.setHarmonicCount(value);
                    } else if (id === 'globalVolume') {
                        window.fibonacciChord.setGlobalVolume(value);
                    }
                }
            });
        }
    });

    // Day 3 specific: Audio toggle button
    const audioToggle = document.getElementById('audioToggle');
    console.log('[AUDIO TEST] Audio toggle button:', audioToggle);
    if (audioToggle) {
        audioToggle.addEventListener('click', () => {
            console.log('[AUDIO TEST] Audio toggle clicked');
            console.log('[AUDIO TEST] window.fibonacciChord exists:', !!window.fibonacciChord);

            if (!window.fibonacciChord) {
                console.error('[AUDIO TEST] window.fibonacciChord not initialized!');
                return;
            }

            console.log('[AUDIO TEST] fibonacciChord.isPlaying:', window.fibonacciChord.isPlaying);

            if (window.fibonacciChord.isPlaying) {
                console.log('[AUDIO TEST] Stopping audio...');
                window.fibonacciChord.stop();
                audioToggle.textContent = '▶ Play Sound';
            } else {
                console.log('[AUDIO TEST] Starting audio...');
                window.fibonacciChord.start();
                audioToggle.textContent = '⏸ Pause Sound';
            }
        });
    }
}

// Animation loop
function animate(currentTime) {
    const time = (currentTime - startTime) * 0.001; // Convert to seconds

    // Update standard uniforms
    shaderProgram.setUniform('time', time);
    shaderProgram.setUniform('resolution', [
        shaderProgram.canvas.width,
        shaderProgram.canvas.height
    ]);

    // Day 3 specific: Pass audio amplitude data to shader
    if (currentDay === 3 && window.fibonacciChord) {
        const amplitudes = window.fibonacciChord.getAmplitudes();

        // Pad array to fixed size (21 elements) for shader uniform
        const paddedAmplitudes = new Array(21).fill(0);
        for (let i = 0; i < amplitudes.length && i < 21; i++) {
            paddedAmplitudes[i] = amplitudes[i];
        }

        // Log once per second for visual debugging
        if (Math.floor(time) !== Math.floor(time - 0.016)) {
            console.log('[VISUAL TEST] Amplitudes:', paddedAmplitudes.slice(0, params.harmonicCount));
            console.log('[VISUAL TEST] Harmonic count:', params.harmonicCount);
        }

        shaderProgram.setUniform('amplitudes', paddedAmplitudes);
        shaderProgram.setUniform('harmonicCount', params.harmonicCount);
    }

    // Dynamically update all params as uniforms
    Object.keys(params).forEach(key => {
        shaderProgram.setUniform(key, params[key]);
    });

    // Render the frame
    shaderProgram.render();

    // Request next frame
    requestAnimationFrame(animate);
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
