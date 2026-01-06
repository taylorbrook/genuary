# Genuary 2026 - WebGL Creative Coding Challenge

## Project Overview

This is a creative coding project for the [Genuary 2026 challenge](https://genuary.art/), exploring GLSL shaders and "vibe coding" for the first time. Each day features a different generative art piece created with WebGL shaders.

**Live Site:** https://taylorbrook.github.io/genuary/

## Project Structure

```
genuary/
├── index.html          # Main HTML with calendar UI and controls
├── main.js             # Core application logic, day switching, shader loading
├── shader.js           # WebGL shader compilation and rendering utilities
├── audio.js            # Web Audio API implementation (Day 3)
├── lorenz.js           # Lorenz Attractor particle system (Day 6)
├── style.css           # UI styling
├── shaders/
│   ├── vertex.glsl           # Shared vertex shader (Days 1-4)
│   ├── fragment.glsl         # Day 1: Hypnotic Kaleidoscope
│   ├── day2-fragment.glsl    # Day 2: Anticipation (Hand-Drawn)
│   ├── day3-fragment.glsl    # Day 3: Fibonacci Forever
│   ├── day4-pixels.glsl      # Day 4: Pixel Flow (Lowres)
│   ├── day6-vertex.glsl      # Day 6: Lorenz Attractor (WebGL 2 vertex)
│   └── day6-fragment.glsl    # Day 6: Lorenz Attractor (WebGL 2 fragment)
├── test-browser.js     # Playwright test runner
├── test-day3.js        # Day 3 specific tests
└── TESTING.md          # Comprehensive testing guide for Day 3
```

## Architecture

### Core System (main.js)

The app uses a day-based system where each day has:
- **Name & Subtitle**: Display text from the challenge prompt
- **Shader Paths**: Vertex and fragment shader files
- **Parameters**: Day-specific uniforms and UI controls

Days are accessed via URL parameters: `?day=1`, `?day=2`, etc.

### Shader Pipeline (shader.js)

1. Load shader source files from `/shaders/` directory
2. Compile vertex and fragment shaders
3. Link WebGL program
4. Set up uniforms for parameters
5. Render loop passes time, resolution, and custom params to shaders

### Audio System (audio.js) - Day 3 Only

The `FibonacciChord` class creates harmonic drones using:
- Web Audio API oscillators
- Fibonacci sequence for frequency ratios
- LFO modulation for subtle movement
- Stereo panning for spatial depth
- Real-time amplitude analysis for visual feedback

### Lorenz Attractor System (lorenz.js) - Day 6 Only

The `LorenzAttractor` class implements a 3D particle system using:
- WebGL 2 for modern GPU features
- Lorenz differential equations for particle physics (CPU-side)
- 10,000 particles with position and velocity attributes
- Point sprite rendering with smooth edges
- 3D perspective camera with orbit animation
- Custom matrix math for projection and view transforms
- Independent animation loop (doesn't use main.js animate function)

## Completed Days

### Day 1: Hypnotic Kaleidoscope
**Prompt:** One color, one shape

**Features:**
- Kaleidoscope effect with configurable segments
- Polygonal shapes (3-12 sides)
- Three rotating layers with different speeds
- Hypnotic pulsing and zooming effects
- Recursive/fractal depth (0-6 levels)
- Wave distortion

**Key Parameters:** `hue`, `segments`, `sides`, `scale`, `speed`, `rotation`, layer configs, pulse/zoom effects, recursion

### Day 2: Anticipation
**Prompt:** 12 Principles of Animation

**Features:**
- Hand-drawn/sketchy aesthetic
- Bouncing circle with wind-up anticipation
- Paper grain texture
- Variable line weight
- Squash and stretch physics

**Key Parameters:** `speed`, `anticipationAmt`, `windUpDuration`, `sketchiness`, `lineWeight`, `paperGrain`

### Day 3: Fibonacci Forever
**Prompt:** Fibonacci sequence

**Features:**
- Audio-visual experience combining sound and visuals
- Fibonacci-based harmonic drone (1:1:2:3:5:8:13:21...)
- Visual circles arranged in Fibonacci spiral
- Real-time audio analysis drives visual glow
- Interactive play/pause and parameter control

**Key Parameters:** `fundamental` (Hz), `harmonicCount` (2-12), `globalVolume`, `rotation`, `sketchiness`, `lineWeight`, `glowIntensity`, `spiralWeight`

**Audio Implementation:**
- Base frequency oscillators for each harmonic ratio
- LFO modulation (0.1-0.3 Hz) for subtle movement
- Stereo panning with random LFOs
- Amplitude envelope on master gain
- 300ms fade transitions when changing harmonic count

### Day 4: Pixel Flow
**Prompt:** Lowres

**Status:** Recently added (commit 0a83574)

**Features:** Low-resolution pixel effect (details TBD)

### Day 5: Spell Genuary
**Prompt:** (Skipped)

**Status:** Placeholder only - no shader

This day intentionally has no implementation, just displays the title and subtitle.

### Day 6: Lights on/off
**Prompt:** Lorenz particles with 3d lighting

**Features:**
- 3D particle system (10,000 particles)
- Lorenz attractor physics simulation
- Real-time particle physics on CPU with GPU rendering
- WebGL 2 implementation with point rendering
- 5-color gradient palette based on velocity
- Rotating directional lighting
- Interactive camera orbit

**Key Parameters:** `lightIntensity` (0-1), `zoom` (50-300)

**Technical Implementation:**
- Uses WebGL 2 (not WebGL 1 like other days)
- Separate rendering system in `lorenz.js`
- Particles updated via Lorenz equations: dx = σ(y-x), dy = x(ρ-z)-y, dz = xy-βz
- Parameters: σ=10, ρ=28, β=8/3, dt=0.001
- 3D perspective camera with `lookAt` and `perspective` matrices
- Vertex attributes for position and velocity
- Point sprites with smooth edges and alpha blending

## Development Workflow

### Running Locally

```bash
# Start local server
python3 -m http.server 8000

# Open in browser
http://localhost:8000/?day=1
http://localhost:8000/?day=2
http://localhost:8000/?day=3
http://localhost:8000/?day=4
```

### Testing

The project has Playwright-based testing, especially comprehensive for Day 3:

```bash
npm test
```

See `TESTING.md` for detailed Day 3 testing procedures including:
- Audio system initialization tests
- Visual rendering tests
- Control interaction tests
- Common issues and debugging

### Git Status

**Current branch:** main

**Modified files:**
- `audio.js` (uncommitted changes)

**Recent work:**
- Day 4 added
- Day 3 audio/visual bug fixes
- Comprehensive testing suite for Day 3
- URL parameter support for day switching

## Key Technical Patterns

### Day Switching

```javascript
// main.js exposes switchDay() globally
window.switchDay(3); // Load Day 3
```

The calendar UI automatically generates day buttons that call `switchDay()`.

### Shader Uniforms

All shaders receive base uniforms:
- `time` - Animation time in seconds
- `resolution` - Canvas dimensions

Day-specific params are passed as additional uniforms (floats, ints).

### Audio-Visual Sync (Day 3)

```javascript
// audio.js exposes FibonacciChord instance globally
window.fibonacciChord.start();
window.fibonacciChord.getAmplitudes(); // Returns array of amplitudes [0-1]
```

The shader reads amplitudes via uniform array to drive visual effects.

### Lorenz Attractor Integration (Day 6)

```javascript
// lorenz.js exposes LorenzAttractor instance globally
window.lorenzAttractor = new LorenzAttractor(canvas);
await window.lorenzAttractor.init();
window.lorenzAttractor.start();

// Update parameters in real-time
window.lorenzAttractor.setLightIntensity(0.5);
window.lorenzAttractor.setZoom(150);
```

Day 6 has its own rendering loop and is skipped in the main animate() function.

## UI Controls

Controls are day-specific and show/hide based on current day:
- `.day-1-controls`
- `.day-2-controls`
- `.day-3-controls`
- `.day-4-controls`

Each control is an `<input type="range">` with:
- `id` matching the parameter name
- `value` and `step` for precision
- Corresponding `<span id="param-value">` for display

JavaScript watches for `input` events and updates shader uniforms in real-time.

## Common Tasks

### Adding a New Day

1. Create shader file: `shaders/dayN-fragment.glsl`
2. Add entry to `shaders` object in `main.js`
3. Add control section in `index.html`: `<div class="day-N-controls">`
4. Update `switchDay()` to show/hide new controls
5. Test with `?day=N`

### Debugging Shaders

- Check browser console for WebGL compilation errors
- Shader compilation failures show line numbers
- Use `console.log()` in main.js to verify uniform values
- Visual bugs: check fragment shader math and coordinate systems

### Debugging Audio (Day 3)

- Console shows `[AUDIO TEST]` prefixed logs
- Check AudioContext state (suspended = needs user interaction)
- Verify `window.fibonacciChord` exists after init
- Use TESTING.md for systematic debugging

## Dependencies

- **Playwright** (dev): Browser automation for testing
- Pure vanilla JS, WebGL, and Web Audio API - no frameworks

## Design Philosophy

- **Vibe coding**: Experimental, exploratory approach
- **Real-time interaction**: All parameters adjustable live
- **Visual aesthetics**: Hand-drawn, organic feel (sketch lines, paper grain)
- **Minimal dependencies**: Vanilla web technologies only

## Future Ideas / TODOs

- Day 4 controls and parameters
- Improve reverb in Day 3 (use ConvolverNode)
- Add recording/export functionality
- Optimize shader performance for mobile
- Add preset saving/loading
- Cross-day parameter persistence

## Notes

- First time working with GLSL shaders
- Project is exploratory/learning focused
- Each day builds on previous shader techniques
- Audio integration (Day 3) was complex but successful after extensive testing
- Calendar UI provides intuitive navigation between days
