// Fragment Shader
precision highp float;
varying vec2 v_uv;
uniform float u_time;
uniform vec2 u_resolution;

// Color palette (normalized to 0-1)
vec3 palette[5];

// Random function
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

// Noise function
float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void main() {
    // Define color palette
    palette[0] = vec3(255.0, 195.0, 150.0) / 255.0; // #ffc396
    palette[1] = vec3(255.0, 219.0, 114.0) / 255.0; // #ffdb72
    palette[2] = vec3(250.0, 250.0, 250.0) / 255.0; // #fafafa
    palette[3] = vec3(190.0, 227.0, 206.0) / 255.0; // #bee3ce
    palette[4] = vec3(255.0, 178.0, 187.0) / 255.0; // #ffb2bb
    
    // Pixelate coordinates
    vec2 pixelSize = vec2(64.0, 64.0);
    vec2 pixelated = floor(v_uv * pixelSize) / pixelSize;
    
    // Smooth continuous time
    float smoothTime = u_time * 0.3;
    
    // Generate noise coordinates
    vec2 noiseCoord = pixelated * 4.0 + vec2(smoothTime * 0.5, smoothTime * 0.3);
    
    // Generate multiple noise layers
    float n1 = noise(noiseCoord);
    float n2 = noise(noiseCoord * 2.0 + smoothTime);
    float n3 = noise(pixelated * 8.0 + smoothTime * 0.5);
    
    // Combine noise values
    float noiseValue = (n1 + n2 + n3) / 3.0;
    
    // Map noise to palette index (0-4)
    float paletteIndex = noiseValue * 4.999; // Slightly less than 5 to avoid overflow
    
    // Manual color blending based on noise value ranges
    vec3 color;
    if (paletteIndex < 1.0) {
        color = mix(palette[0], palette[1], fract(paletteIndex));
    } else if (paletteIndex < 2.0) {
        color = mix(palette[1], palette[2], fract(paletteIndex));
    } else if (paletteIndex < 3.0) {
        color = mix(palette[2], palette[3], fract(paletteIndex));
    } else {
        color = mix(palette[3], palette[4], fract(paletteIndex));
    }
    
    // Add scanline effect for extra retro feel
    float scanline = sin(v_uv.y * pixelSize.y * 3.14159) * 0.05 + 0.95;
    color *= scanline;
    
    gl_FragColor = vec4(color, 1.0);
}