#version 300 es
precision highp float;

in vec3 vColor;
in float vSpeed;

uniform float time;

out vec4 fragColor;

void main() {
    // Create circular point sprite
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);

    // Discard pixels outside the circle
    if (dist > 0.5) discard;

    // Smooth edge with glow effect
    float alpha = smoothstep(0.5, 0.15, dist);

    // Add subtle shimmer based on speed and time
    float shimmer = 0.9 + 0.1 * sin(time * 3.0 + vSpeed * 20.0);

    // Brighten fast-moving particles
    float brightness = 1.0 + vSpeed * 2.0;

    vec3 finalColor = vColor * shimmer * brightness;

    // Clamp to prevent oversaturation
    finalColor = min(finalColor, vec3(1.2));

    fragColor = vec4(finalColor, alpha * 0.85);
}
