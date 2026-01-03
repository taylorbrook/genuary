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
// Returns: xy = position, z = size
vec3 getFibonacciRect(int index) {
    if (index < 0 || index >= 21) return vec3(0.0);

    float size = fibonacci(index);
    vec2 pos = vec2(0.0);

    // Simplified positioning - arrange in expanding spiral
    // Using golden angle for spiral arrangement
    float goldenAngle = 2.39996; // ~137.5 degrees in radians

    if (index == 0) {
        pos = vec2(0.0, 0.0);
    } else {
        // Spiral outward using golden angle
        float angle = float(index) * goldenAngle;
        float radius = sqrt(float(index)) * 0.5; // Spiral expansion
        pos = vec2(cos(angle), sin(angle)) * radius;
    }

    return vec3(pos, size);
}

// ============================================================================
// RENDERING
// ============================================================================

void main() {
    // Normalize coordinates to center
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);

    // Apply rotation
    uv = rotate2D(u_rotation * u_time * 0.1) * uv;

    // Scale to fit spiral (larger for visibility)
    uv *= 2.0;

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
        vec3 rectInfo = getFibonacciRect(i);
        vec2 rectPos = rectInfo.xy;
        float rectSize = rectInfo.z * 0.08; // Scale down the rectangles

        // Get audio amplitude for this harmonic
        float amplitude = u_amplitudes[i];

        // Transform to rectangle space
        vec2 p = uv - rectPos;

        // Draw circle instead of rectangle for simplicity and visibility
        float circleDist = length(p) - rectSize;
        circleDist = wobblySDF(circleDist, p, u_sketchiness);

        // Sketch line (multiple strokes for hand-drawn feel)
        float thickness = u_lineWeight * 0.015;
        for (float j = 0.0; j < 2.0; j++) {
            float offset = (j - 0.5) * thickness * 0.4;
            sketch += smoothstep(thickness, 0.0, abs(circleDist + offset));
        }

        // Glow based on audio amplitude
        if (circleDist < 0.0) {
            // Inside circle - add glow based on amplitude
            float glowAmount = amplitude * u_glowIntensity * 15.0;
            glow += glowAmount * smoothstep(0.1, 0.0, abs(circleDist));
        }

        // Draw spiral connecting the circles
        if (i > 0) {
            vec3 prevRectInfo = getFibonacciRect(i - 1);
            vec2 prevPos = prevRectInfo.xy;

            // Line from previous to current
            vec2 lineDir = rectPos - prevPos;
            float lineLen = length(lineDir);
            lineDir = normalize(lineDir);

            // Distance to line segment
            vec2 toPoint = p - prevPos;
            float t = clamp(dot(toPoint, lineDir) / lineLen, 0.0, 1.0);
            vec2 closest = prevPos + lineDir * t * lineLen;
            float lineDist = length(p - closest);

            float lineThickness = u_spiralWeight * 0.01;
            spiralLine = min(spiralLine, lineDist - lineThickness);
        }
    }

    // Combine elements
    vec3 inkColor = vec3(0.15, 0.12, 0.10); // Dark brownish-black ink
    vec3 color = bgColor;

    // Apply sketch lines
    color = mix(color, inkColor, clamp(sketch, 0.0, 1.0));

    // Apply golden spiral line
    float spiralLineVis = smoothstep(0.015, 0.0, spiralLine);
    vec3 spiralColor = vec3(0.8, 0.6, 0.2); // Golden color
    color = mix(color, spiralColor, spiralLineVis * 0.5);

    // Apply audio-reactive glow
    vec3 glowColor = vec3(0.3, 0.6, 0.9); // Blue glow
    color += glowColor * glow * 0.15;

    // Subtle vignette
    float vignette = smoothstep(1.5, 0.3, length(uv));
    color *= 0.7 + 0.3 * vignette;

    gl_FragColor = vec4(color, 1.0);
}
