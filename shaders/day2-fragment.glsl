precision mediump float;

varying vec2 v_uv;

uniform float u_time;
uniform vec2 u_resolution;
uniform float u_hue;
uniform float u_speed;
uniform float u_sketchiness;
uniform float u_hatchDensity;
uniform float u_anticipationAmt;
uniform float u_windUpDuration;
uniform float u_energyIntensity;
uniform float u_formCount;
uniform float u_paperGrain;
uniform float u_lineWeight;
uniform float u_contrast;

#define PI 3.14159265359
#define TAU 6.28318530718

// ============================================================================
// NOISE FUNCTIONS - For organic, hand-drawn quality
// ============================================================================

// Hash function for pseudo-random values
float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

// 2D noise function
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);

    // Smooth interpolation
    f = f * f * (3.0 - 2.0 * f);

    // Get corner values
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    // Bilinear interpolation
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Fractal Brownian Motion - layered noise for detail
float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;

    for (int i = 0; i < 5; i++) {
        value += amplitude * noise(p * frequency);
        frequency *= 2.0;
        amplitude *= 0.5;
    }

    return value;
}

// ============================================================================
// HSV to RGB CONVERSION
// ============================================================================

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// ============================================================================
// EASING FUNCTIONS - For smooth, natural motion
// ============================================================================

float easeInQuad(float t) {
    return t * t;
}

float easeOutQuad(float t) {
    return t * (2.0 - t);
}

float easeInOutQuad(float t) {
    return t < 0.5 ? 2.0 * t * t : -1.0 + (4.0 - 2.0 * t) * t;
}

float easeOutCubic(float t) {
    float f = t - 1.0;
    return f * f * f + 1.0;
}

float easeInBack(float t) {
    float c1 = 1.70158;
    float c3 = c1 + 1.0;
    return c3 * t * t * t - c1 * t * t;
}

// ============================================================================
// ANTICIPATION CURVE - Core animation principle
// ============================================================================

// This creates the characteristic anticipation motion:
// 1. Wind-up (pull back) - 60% of cycle
// 2. Hold (tension) - 10% of cycle
// 3. Release (fast forward) - 20% of cycle
// 4. Follow-through (settle) - 10% of cycle
float anticipationCurve(float t) {
    if (t < 0.6) {
        // Wind-up phase - ease back
        float windUp = t / 0.6;
        return -0.3 * easeInQuad(windUp);
    } else if (t < 0.7) {
        // Hold at maximum tension
        return -0.3;
    } else if (t < 0.9) {
        // Release - fast forward with overshoot
        float release = (t - 0.7) / 0.2;
        return -0.3 + 1.3 * easeOutCubic(release);
    } else {
        // Follow-through - settle back
        float settle = (t - 0.9) / 0.1;
        return 1.0 - 0.1 * easeOutQuad(settle);
    }
}

// Apply anticipation to motion between two points
vec2 anticipationMotion(float t, vec2 startPos, vec2 endPos) {
    float curve = anticipationCurve(t);
    // Map [-0.3, 1.0] to [0, 1] for position interpolation
    float normalizedCurve = (curve + 0.3) / 1.3;
    return mix(startPos, endPos, normalizedCurve);
}

// ============================================================================
// DISTANCE FIELD FUNCTIONS
// ============================================================================

// 2D rotation matrix
mat2 rotate2D(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat2(c, -s, s, c);
}

// Signed distance function for circle
float sdCircle(vec2 p, float r) {
    return length(p) - r;
}

// Organic blob using noise-deformed circle
float organicBlob(vec2 p, float time, float seed) {
    float angle = atan(p.y, p.x);
    float radius = length(p);

    // Add organic deformation using noise
    float deform = noise(vec2(angle * 3.0 + seed * 10.0, time * 0.3)) * 0.3;
    deform += noise(vec2(angle * 7.0 + seed * 20.0, time * 0.2)) * 0.15;

    float baseRadius = 0.15 + deform * 0.1;
    return radius - baseRadius;
}

// Wobbly SDF - adds sketch-like imperfection to edges
float wobblySDF(float dist, vec2 p, float time, float amount) {
    float wobble = noise(p * 20.0 + time * 0.5) * amount * 0.02;
    wobble += noise(p * 50.0 - time * 0.3) * amount * 0.01;
    return dist + wobble;
}

// ============================================================================
// HATCHING FUNCTIONS - For hand-drawn shading
// ============================================================================

// Single hatching pattern at a given angle
float hatching(vec2 p, float angle, float spacing, float density) {
    mat2 rot = rotate2D(angle);
    vec2 rp = rot * p;
    float lines = fract(rp.x / spacing);
    float threshold = mix(1.0, 0.3, density);
    return smoothstep(threshold - 0.1, threshold + 0.1, lines);
}

// Crosshatching - multiple layers at different angles
float crosshatch(vec2 p, float intensity) {
    intensity = clamp(intensity, 0.0, 1.0);

    float hatch1 = hatching(p, 0.785, 0.1, intensity);           // 45 degrees
    float hatch2 = hatching(p, -0.785, 0.1, intensity * 0.8);    // -45 degrees
    float hatch3 = hatching(p, 0.0, 0.1, intensity * 0.6);       // 0 degrees

    return min(min(hatch1, hatch2), hatch3);
}

// ============================================================================
// PAPER TEXTURE - For authentic hand-drawn feel (crumpled paper effect)
// ============================================================================

float paperTexture(vec2 uv) {
    // Crumpled paper effect with ridges and valleys
    vec2 p = uv * 3.0;

    // Large scale wrinkles
    float crumple1 = abs(sin(noise(p * 0.5) * 6.28));
    float crumple2 = abs(sin(noise(p * 0.7 + 100.0) * 6.28));

    // Medium scale folds
    float folds = fbm(p * 2.0);
    folds = pow(folds, 2.0); // Make sharper ridges

    // Fine detail
    float detail = noise(p * 15.0) * 0.3;

    // Combine with sharp transitions for creased look
    float crumpled = crumple1 * 0.4 + crumple2 * 0.3 + folds * 0.2 + detail * 0.1;

    return crumpled;
}

// ============================================================================
// ENERGY FIELD - Visualize anticipation buildup
// ============================================================================

float energyField(vec2 p, vec2 center, float intensity) {
    vec2 toCenter = p - center;
    float dist = length(toCenter);
    float angle = atan(toCenter.y, toCenter.x);

    // Radiating waves
    float waves = sin(dist * 10.0 - intensity * TAU) * 0.5 + 0.5;
    waves *= smoothstep(1.0, 0.0, dist);

    // Angular rays
    float rays = sin(angle * 8.0 + intensity * TAU) * 0.5 + 0.5;
    rays *= smoothstep(0.8, 0.0, dist);

    // Pulsing core
    float core = smoothstep(0.3, 0.0, dist) * intensity;

    return (waves * 0.3 + rays * 0.3 + core * 0.4) * intensity;
}

// ============================================================================
// MAIN RENDERING
// ============================================================================

void main() {
    // Normalize coordinates to center
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);

    // Blue sky background with clouds
    float skyGradient = smoothstep(-0.8, 0.8, uv.y);
    vec3 skyTop = vec3(0.4, 0.6, 0.9);     // Deeper blue at top
    vec3 skyBottom = vec3(0.7, 0.85, 0.95); // Lighter blue at horizon
    vec3 skyColor = mix(skyBottom, skyTop, skyGradient);

    // Add subtle clouds
    float cloudNoise = fbm(uv * 2.0 + u_time * 0.02);
    cloudNoise = smoothstep(0.4, 0.7, cloudNoise);
    vec3 cloudColor = vec3(1.0, 1.0, 1.0);
    skyColor = mix(skyColor, cloudColor, cloudNoise * 0.3);

    // Paper texture overlay on sky
    float paper = paperTexture(gl_FragCoord.xy * 0.01);
    vec3 bgColor = skyColor * (0.95 + paper * u_paperGrain * 0.1);

    // Time-based anticipation cycle
    float cycleTime = mod(u_time * u_speed, 1.0);
    float anticipation = anticipationCurve(cycleTime);

    // ========================================================================
    // RENDER ORGANIC FORMS with anticipation motion
    // Each form has unique movement characteristics
    // ========================================================================

    float formDist = 1000.0;
    vec2 primaryCenter = vec2(0.0);

    for (float i = 0.0; i < 8.0; i++) {
        if (i >= u_formCount) break;

        // Each form has different cycle length for unpredictability
        // Using prime-like numbers for non-repeating patterns
        float cycleLength = 1.0;
        if (i == 0.0) cycleLength = 3.7; // Long, slow cycle
        if (i == 1.0) cycleLength = 2.3; // Medium cycle
        if (i == 2.0) cycleLength = 5.1; // Very long cycle

        // Scale time by cycle length and add unique phase
        float phase = hash(vec2(i * 7.123, i * 3.456)); // Random phase per form
        float t = mod((u_time * u_speed / cycleLength) + phase, 1.0);

        // Calculate anticipation with different easing per form
        float formAnticipation = anticipationCurve(t);

        // Each form has completely different motion path
        vec2 center;
        vec2 startPos, endPos;

        if (i == 0.0) {
            // Form 1: Diagonal arc motion (bottom-left to top-right)
            startPos = vec2(-0.5, -0.4);
            endPos = vec2(0.5, 0.5);
            center = anticipationMotion(t, startPos, endPos);
            // Add slight curve to the path
            center.y += sin(t * PI) * 0.2;
            primaryCenter = center;
        } else if (i == 1.0) {
            // Form 2: Figure-8 / infinity motion
            float angle = t * TAU;
            center.x = sin(angle) * 0.4;
            center.y = sin(angle * 2.0) * 0.3;
            // Apply anticipation to the radius
            float radiusMod = 0.8 + formAnticipation * 0.4;
            center *= radiusMod;
        } else if (i == 2.0) {
            // Form 3: Spiral motion inward/outward
            float angle = t * TAU * 2.0; // Two rotations per cycle
            float radius = 0.6 * (0.3 + formAnticipation * 0.7);
            center.x = cos(angle) * radius;
            center.y = sin(angle) * radius;
        } else {
            // Additional forms: Random organic wandering
            float baseAngle = i * 1.234 + u_time * 0.1;
            startPos = vec2(cos(baseAngle), sin(baseAngle)) * 0.3;
            endPos = vec2(cos(baseAngle + 2.0), sin(baseAngle + 2.0)) * 0.4;
            center = anticipationMotion(t, startPos, endPos);
        }

        // Create organic blob shape
        vec2 p = uv - center;

        // Add squash and stretch based on velocity (calculated from curve derivative)
        float tNext = mod((u_time * u_speed / cycleLength) + phase + 0.01, 1.0);
        float nextAnticipation = anticipationCurve(tNext);
        float velocity = (nextAnticipation - formAnticipation) * 100.0;

        float squash = 1.0 + abs(velocity) * 0.4;
        float stretch = 1.0 / squash;

        // Apply deformation in direction of motion
        vec2 motionDir = normalize(center - vec2(0.0)); // Direction from origin
        if (length(motionDir) > 0.1) {
            // Rotate deformation to align with motion
            float motionAngle = atan(motionDir.y, motionDir.x);
            mat2 rot = rotate2D(-motionAngle);
            p = rot * p;
            p.x *= squash;
            p.y *= stretch;
            p = rotate2D(motionAngle) * p;
        }

        float dist = organicBlob(p, u_time + i * 10.0, i);

        // Make edges sketchy/wobbly
        dist = wobblySDF(dist, uv - center, u_time, u_sketchiness);

        formDist = min(formDist, dist);
    }

    // ========================================================================
    // SKETCH LINE RENDERING - Multiple overlapping strokes
    // ========================================================================

    float sketch = 0.0;
    float thickness = u_lineWeight * 0.01;

    // Multiple strokes for hand-drawn feel
    for (float j = 0.0; j < 3.0; j++) {
        float offset = (j - 1.0) * thickness * 0.5;
        float jitter = noise(vec2(j * 10.0, u_time * 0.1)) * thickness * 0.3;
        sketch += smoothstep(thickness, 0.0, abs(formDist + offset + jitter));
    }

    sketch = clamp(sketch, 0.0, 1.0);

    // ========================================================================
    // CROSSHATCHING - Shading inside forms
    // ========================================================================

    float hatch = 0.0;
    if (formDist < 0.0) {
        // Intensity based on distance from edge and anticipation phase
        float edgeDist = abs(formDist);
        float baseIntensity = smoothstep(0.3, 0.0, edgeDist);

        // Intensify hatching during wind-up phase (energy building)
        float phaseIntensity = 0.0;
        if (cycleTime < u_windUpDuration) {
            phaseIntensity = (cycleTime / u_windUpDuration) * 0.5;
        }

        float totalIntensity = (baseIntensity + phaseIntensity) * u_hatchDensity;
        hatch = 1.0 - crosshatch(uv * 10.0, totalIntensity);
    }

    // ========================================================================
    // ENERGY FIELD - Visualize anticipation buildup
    // ========================================================================

    float energy = 0.0;
    if (cycleTime < u_windUpDuration) {
        float energyPhase = cycleTime / u_windUpDuration;
        energy = energyField(uv, primaryCenter, energyPhase * u_energyIntensity);
    }

    // ========================================================================
    // COMBINE ALL ELEMENTS
    // ========================================================================

    vec3 inkColor = vec3(0.1);  // Dark sketch color
    vec3 color = bgColor;

    // Apply sketch lines
    color = mix(color, inkColor, sketch * u_contrast);

    // Apply hatching for shading
    color = mix(color, inkColor, hatch * 0.4 * u_contrast);

    // Apply energy field (colored, semi-transparent)
    vec3 energyColor = hsv2rgb(vec3(u_hue / 360.0, 0.7, 0.9));
    color = mix(color, energyColor, energy * 0.5);

    // Add subtle color tint to forms during release phase
    if (formDist < 0.0 && cycleTime > 0.7) {
        float releasePhase = (cycleTime - 0.7) / 0.3;
        vec3 tint = hsv2rgb(vec3(u_hue / 360.0, 0.3, 1.0));
        color = mix(color, tint, releasePhase * 0.2);
    }

    // Final paper grain overlay
    color *= 0.95 + paper * 0.05;

    // Apply overall contrast
    color = mix(vec3(0.5), color, u_contrast);

    gl_FragColor = vec4(color, 1.0);
}
