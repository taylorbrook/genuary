precision mediump float;

varying vec2 v_uv;

uniform float u_time;
uniform vec2 u_resolution;
uniform float u_amplitudes[21]; // Audio amplitude for each harmonic (max 21 Fibonacci numbers)
uniform int u_harmonicCount;
uniform float u_rotation;
uniform float u_sketchiness;
uniform float u_lineWeight;
uniform float u_glowIntensity;
uniform float u_spiralWeight;

#define PI 3.14159265359
#define TAU 6.28318530718
#define PHI 1.618033988749 // Golden ratio

// ============================================================================
// NOISE FUNCTIONS - For hand-drawn aesthetic
// ============================================================================

float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// ============================================================================
// FIBONACCI SEQUENCE
// ============================================================================

float fibonacci(int n) {
    if (n <= 0) return 1.0;
    if (n == 1) return 1.0;

    float a = 1.0;
    float b = 1.0;

    for (int i = 2; i <= 20; i++) {
        if (i > n) break;
        float temp = a + b;
        a = b;
        b = temp;
    }

    return b;
}

// ============================================================================
// 2D TRANSFORMATIONS
// ============================================================================

mat2 rotate2D(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat2(c, -s, s, c);
}

// ============================================================================
// DISTANCE FIELD FUNCTIONS
// ============================================================================

// Rectangle SDF
float sdBox(vec2 p, vec2 size) {
    vec2 d = abs(p) - size;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

// Wobbled SDF for sketch effect
float wobblySDF(float dist, vec2 p, float amount) {
    float wobble = noise(p * 15.0 + u_time * 0.3) * amount * 0.015;
    wobble += noise(p * 40.0 - u_time * 0.2) * amount * 0.008;
    return dist + wobble;
}

// Arc SDF (quarter circle for golden spiral)
float sdArc(vec2 p, float radius, float startAngle, float endAngle, float thickness) {
    float angle = atan(p.y, p.x);
    float dist = length(p);

    // Normalize angle to 0-TAU
    if (angle < 0.0) angle += TAU;

    // Check if angle is within arc range
    float angleDiff = mod(angle - startAngle, TAU);
    float arcSpan = mod(endAngle - startAngle, TAU);

    if (angleDiff > arcSpan) {
        // Outside arc angle range
        return 1000.0;
    }

    // Distance to arc
    return abs(dist - radius) - thickness;
}

// ============================================================================
// FIBONACCI RECTANGLE SPIRAL LAYOUT
// ============================================================================

// Calculate position and size of nth Fibonacci rectangle
// Returns: xy = position, zw = size
vec4 getFibonacciRect(int index) {
    if (index < 0 || index >= 21) return vec4(0.0);

    float size = fibonacci(index);
    vec2 pos = vec2(0.0);

    // Build up position by tracking where each previous rectangle was placed
    // This creates the classic Fibonacci spiral pattern

    if (index == 0) {
        pos = vec2(0.0, 0.0);
        size = 1.0;
    } else if (index == 1) {
        pos = vec2(1.0, 0.0);
        size = 1.0;
    } else if (index == 2) {
        pos = vec2(0.5, 1.0);
        size = 2.0;
    } else if (index == 3) {
        pos = vec2(-1.0, 0.5);
        size = 3.0;
    } else if (index == 4) {
        pos = vec2(-0.5, -2.0);
        size = 5.0;
    } else if (index == 5) {
        pos = vec2(4.0, -1.5);
        size = 8.0;
    } else if (index == 6) {
        pos = vec2(5.5, 5.0);
        size = 13.0;
    } else if (index == 7) {
        pos = vec2(-4.5, 6.5);
        size = 21.0;
    } else if (index == 8) {
        pos = vec2(-11.0, -6.5);
        size = 34.0;
    } else {
        // For higher indices, use an approximation based on golden ratio spiral
        float angle = float(index) * 2.39996; // ~137.5 degrees in radians (golden angle)
        float radius = size * 0.2;
        pos = vec2(cos(angle), sin(angle)) * radius;
    }

    return vec4(pos, size, size);
}

// ============================================================================
// RENDERING
// ============================================================================

void main() {
    // Normalize coordinates to center
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);

    // Apply rotation
    uv = rotate2D(u_rotation * u_time * 0.1) * uv;

    // Scale to fit spiral
    uv *= 0.15;

    // Background: warm paper color
    vec3 bgColor = vec3(0.95, 0.93, 0.88);

    // Initialize output
    float sketch = 0.0;
    float glow = 0.0;
    float spiralLine = 1000.0;

    // Render each Fibonacci rectangle
    for (int i = 0; i < 21; i++) {
        if (i >= u_harmonicCount) break;

        // Get rectangle info
        vec4 rectInfo = getFibonacciRect(i);
        vec2 rectPos = rectInfo.xy;
        vec2 rectSize = rectInfo.zw * 0.5; // Half-size for SDF

        // Get audio amplitude for this harmonic
        float amplitude = u_amplitudes[i];

        // Transform to rectangle space
        vec2 p = uv - rectPos;

        // Draw rectangle outline
        float boxDist = sdBox(p, rectSize);
        boxDist = wobblySDF(boxDist, p, u_sketchiness);

        // Sketch line (multiple strokes for hand-drawn feel)
        float thickness = u_lineWeight * 0.02;
        for (float j = 0.0; j < 2.0; j++) {
            float offset = (j - 0.5) * thickness * 0.4;
            sketch += smoothstep(thickness, 0.0, abs(boxDist + offset));
        }

        // Glow based on audio amplitude
        if (boxDist < 0.0) {
            // Inside rectangle - add glow based on amplitude
            float glowAmount = amplitude * u_glowIntensity * 3.0;
            glow += glowAmount * smoothstep(0.3, 0.0, abs(boxDist));
        }

        // Golden spiral arc within this square
        // Each square has a quarter-circle arc
        float arcRadius = rectSize.x;
        float arcAngle = float(i) * PI * 0.5; // Rotate arc based on position in spiral

        // Calculate arc start/end angles based on spiral position
        float startAngle = arcAngle;
        float endAngle = arcAngle + PI * 0.5;

        vec2 arcP = rotate2D(-arcAngle) * p;
        float arcDist = sdArc(arcP, arcRadius, 0.0, PI * 0.5, u_spiralWeight * 0.01);

        spiralLine = min(spiralLine, arcDist);
    }

    // Combine elements
    vec3 inkColor = vec3(0.15, 0.12, 0.10); // Dark brownish-black ink
    vec3 color = bgColor;

    // Apply sketch lines
    color = mix(color, inkColor, clamp(sketch, 0.0, 1.0));

    // Apply golden spiral line
    float spiralLineVis = smoothstep(0.02, 0.0, abs(spiralLine));
    vec3 spiralColor = vec3(0.8, 0.6, 0.2); // Golden color
    color = mix(color, spiralColor, spiralLineVis * 0.7);

    // Apply audio-reactive glow
    vec3 glowColor = vec3(0.3, 0.6, 0.9); // Blue glow
    color += glowColor * glow * 0.3;

    // Subtle vignette
    float vignette = smoothstep(0.8, 0.3, length(uv));
    color *= 0.7 + 0.3 * vignette;

    gl_FragColor = vec4(color, 1.0);
}
