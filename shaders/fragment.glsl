precision mediump float;

varying vec2 v_uv;

uniform float u_time;
uniform vec2 u_resolution;
uniform float u_hue;
uniform float u_segments;
uniform float u_sides;
uniform float u_scale;
uniform float u_speed;
uniform float u_rotation;

// Layer 1 uniforms
uniform float u_layer1Count;
uniform float u_layer1Radius;
uniform float u_layer1RotSpeed;
uniform float u_layer1Scale;

// Layer 2 uniforms
uniform float u_layer2Count;
uniform float u_layer2Radius;
uniform float u_layer2RotSpeed;
uniform float u_layer2Scale;

// Layer 3 uniforms
uniform float u_layer3Count;
uniform float u_layer3Radius;
uniform float u_layer3RotSpeed;
uniform float u_layer3Scale;

// Effect uniforms
uniform float u_blendSmoothness;
uniform float u_pulseFreq;
uniform float u_pulseAmount;
uniform float u_waveStrength;
uniform float u_zoomFreq;
uniform float u_zoomAmount;

// Recursion uniforms
uniform float u_recursionDepth;
uniform float u_recursionScale;
uniform float u_recursionSpread;
uniform float u_recursionFade;

#define PI 3.14159265359
#define TAU 6.28318530718

// HSV to RGB conversion
vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// Signed distance function for a regular polygon
float sdPolygon(vec2 p, float r, float n) {
    float a = atan(p.x, p.y) + PI;
    float b = TAU / n;
    return cos(floor(0.5 + a / b) * b - a) * length(p) - r;
}

// 2D rotation matrix
mat2 rotate2D(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat2(c, -s, s, c);
}

// Smooth minimum for organic blending
float smoothMin(float a, float b, float k) {
    float h = max(k - abs(a - b), 0.0) / k;
    return min(a, b) - h * h * k * 0.25;
}

// Polar repetition - repeats space in circular pattern
vec2 polarRepetition(vec2 p, float count) {
    float angle = atan(p.y, p.x);
    float radius = length(p);

    // Divide space into segments
    float segmentAngle = TAU / count;

    // Find which segment we're in and wrap to first segment
    angle = mod(angle, segmentAngle) - segmentAngle * 0.5;

    // Reconstruct position in repeated space
    return vec2(cos(angle), sin(angle)) * radius;
}

// Get pulsing value for breathing effect
float getPulse(float time, float frequency, float amplitude, float phase) {
    return 1.0 + sin(time * frequency + phase) * amplitude;
}

// Apply wave distortion for organic motion
vec2 applyWaveDistortion(vec2 p, float time, float strength) {
    float waveX = sin(p.y * 5.0 + time * 2.0) * strength;
    float waveY = cos(p.x * 5.0 - time * 1.5) * strength;
    return p + vec2(waveX, waveY);
}

// Kaleidoscope effect
vec2 kaleidoscope(vec2 uv, float segments) {
    float angle = atan(uv.y, uv.x);
    float radius = length(uv);

    float segmentAngle = TAU / segments;
    angle = mod(angle, segmentAngle);

    // Mirror effect
    if (mod(floor(atan(uv.y, uv.x) / segmentAngle), 2.0) == 0.0) {
        angle = segmentAngle - angle;
    }

    return vec2(cos(angle), sin(angle)) * radius;
}

// Render a single layer of shapes with recursion
float renderLayer(vec2 uv, float time, float instanceCount,
                  float radiusOffset, float rotationSpeed,
                  float scaleAmount, float phaseOffset) {

    float totalDist = 1000.0;

    // Recursive loop - each iteration is a smaller copy further out
    float maxDepth = max(1.0, u_recursionDepth + 1.0);
    for (float level = 0.0; level < 6.0; level++) {
        if (level >= maxDepth) break;

        // Calculate scale and offset for this recursion level
        float levelScale = scaleAmount * pow(u_recursionScale, level);
        float levelOffset = radiusOffset + (level * u_recursionSpread);

        // Apply layer rotation
        vec2 p = rotate2D(time * rotationSpeed + phaseOffset) * uv;

        // Apply wave distortion if enabled
        if (u_waveStrength > 0.0) {
            p = applyWaveDistortion(p, time, u_waveStrength);
        }

        // Apply polar repetition to create multiple instances in a ring
        p = polarRepetition(p, instanceCount);

        // Offset from center to position at specific radius
        p.x -= levelOffset;

        // Apply pulsing scale effect
        float pulse = getPulse(time, u_pulseFreq, u_pulseAmount, phaseOffset + level);
        p /= (levelScale * pulse);

        // Generate the polygon shape
        float dist = sdPolygon(p, 0.5, u_sides);

        // Combine with total using minimum
        totalDist = min(totalDist, dist);
    }

    return totalDist;
}

void main() {
    // Normalize coordinates to center
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);

    // Apply scale
    uv *= u_scale;

    // Apply zoom oscillation for breathing depth effect
    float zoomPulse = 1.0 + sin(u_time * u_speed * u_zoomFreq) * u_zoomAmount;
    uv /= zoomPulse;

    // Apply rotation
    float rot = u_time * u_rotation;
    uv = rotate2D(rot) * uv;

    // Apply kaleidoscope effect
    vec2 kaleido_uv = kaleidoscope(uv, u_segments);

    // Animate the pattern
    float animTime = u_time * u_speed;

    // Render all 3 layers
    float dist1 = renderLayer(
        kaleido_uv, animTime,
        u_layer1Count,
        u_layer1Radius,
        u_layer1RotSpeed,
        u_layer1Scale,
        0.0  // phase offset
    );

    float dist2 = renderLayer(
        kaleido_uv, animTime,
        u_layer2Count,
        u_layer2Radius,
        u_layer2RotSpeed,
        u_layer2Scale,
        PI * 0.5  // 90 degree phase offset
    );

    float dist3 = renderLayer(
        kaleido_uv, animTime,
        u_layer3Count,
        u_layer3Radius,
        u_layer3RotSpeed,
        u_layer3Scale,
        PI  // 180 degree phase offset
    );

    // Combine layers using smooth minimum for organic blending
    float finalDist = smoothMin(dist1, dist2, u_blendSmoothness);
    finalDist = smoothMin(finalDist, dist3, u_blendSmoothness);

    // Create color based on distance field with multiple intensity rings
    float intensity = 0.0;

    // Main shape outline
    intensity += smoothstep(0.02, 0.0, abs(finalDist)) * 1.0;

    // Inner glow
    intensity += smoothstep(0.08, 0.0, abs(finalDist + 0.05)) * 0.6;

    // Add individual layer highlights for definition
    intensity += smoothstep(0.015, 0.0, abs(dist1)) * 0.3;
    intensity += smoothstep(0.015, 0.0, abs(dist2)) * 0.25;
    intensity += smoothstep(0.015, 0.0, abs(dist3)) * 0.2;

    // Pulsing rings at different distances (alternating phases for hypnotic effect)
    float masterBeat = animTime * 2.0;
    float ring1 = abs(finalDist - 0.15);
    intensity += smoothstep(0.02, 0.0, ring1) * (0.4 + 0.2 * sin(masterBeat));

    float ring2 = abs(finalDist - 0.3);
    intensity += smoothstep(0.02, 0.0, ring2) * (0.3 + 0.2 * sin(masterBeat + PI));

    // Convert hue to RGB
    vec3 color = hsv2rgb(vec3(u_hue / 360.0, 0.8, intensity));

    // Add glow effect in the background
    float glow = exp(-length(uv) * 1.5) * 0.2;
    color += hsv2rgb(vec3(u_hue / 360.0, 0.6, glow));

    gl_FragColor = vec4(color, 1.0);
}
