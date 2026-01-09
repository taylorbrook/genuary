precision highp float;

uniform float time;
uniform vec2 resolution;
uniform float pixelSize;
uniform float speed;
uniform float patternScale;

// Earthy color palette
vec3 palette[10];

void initPalette() {
    palette[0] = vec3(0.345, 0.184, 0.055);  // #582f0e dark brown
    palette[1] = vec3(0.498, 0.310, 0.141);  // #7f4f24 medium brown
    palette[2] = vec3(0.576, 0.400, 0.224);  // #936639 tan brown
    palette[3] = vec3(0.651, 0.541, 0.392);  // #a68a64 olive tan
    palette[4] = vec3(0.714, 0.678, 0.565);  // #b6ad90 sage
    palette[5] = vec3(0.761, 0.773, 0.667);  // #c2c5aa light sage
    palette[6] = vec3(0.643, 0.675, 0.525);  // #a4ac86 muted olive
    palette[7] = vec3(0.396, 0.427, 0.290);  // #656d4a dark olive
    palette[8] = vec3(0.255, 0.282, 0.200);  // #414833 very dark olive
    palette[9] = vec3(0.200, 0.239, 0.161);  // #333d29 darkest green
}

// Convert float to "binary" representation for bitwise-like operations
int toBits(float v) {
    return int(floor(mod(v * 256.0, 256.0)));
}

// Simulated XOR operation
int xorOp(int a, int b) {
    int result = 0;
    int bit = 1;
    for (int i = 0; i < 8; i++) {
        int bitA = int(mod(float(a / bit), 2.0));
        int bitB = int(mod(float(b / bit), 2.0));
        if (bitA != bitB) {
            result += bit;
        }
        bit *= 2;
    }
    return result;
}

// Simulated AND operation
int andOp(int a, int b) {
    int result = 0;
    int bit = 1;
    for (int i = 0; i < 8; i++) {
        int bitA = int(mod(float(a / bit), 2.0));
        int bitB = int(mod(float(b / bit), 2.0));
        if (bitA == 1 && bitB == 1) {
            result += bit;
        }
        bit *= 2;
    }
    return result;
}

// Simulated OR operation
int orOp(int a, int b) {
    int result = 0;
    int bit = 1;
    for (int i = 0; i < 8; i++) {
        int bitA = int(mod(float(a / bit), 2.0));
        int bitB = int(mod(float(b / bit), 2.0));
        if (bitA == 1 || bitB == 1) {
            result += bit;
        }
        bit *= 2;
    }
    return result;
}

// Pattern 1: Concentric circles
float circlePattern(vec2 uv, float t) {
    float d = length(uv);
    return sin(d * 20.0 * patternScale - t * 2.0) * 0.5 + 0.5;
}

// Pattern 2: Diagonal stripes
float stripePattern(vec2 uv, float t) {
    float d = uv.x + uv.y;
    return sin(d * 15.0 * patternScale + t * 1.5) * 0.5 + 0.5;
}

// Pattern 3: Grid/squares
float gridPattern(vec2 uv, float t) {
    vec2 grid = sin(uv * 10.0 * patternScale + t);
    return step(0.0, grid.x * grid.y);
}

// Pattern 4: Radial spokes
float spokePattern(vec2 uv, float t) {
    float angle = atan(uv.y, uv.x);
    return sin(angle * 8.0 + t * 0.5) * 0.5 + 0.5;
}

// Pattern 5: Checker
float checkerPattern(vec2 uv, float t) {
    vec2 c = floor(uv * 8.0 * patternScale + t * 0.5);
    return mod(c.x + c.y, 2.0);
}

// Pattern 6: Sine waves
float wavePattern(vec2 uv, float t) {
    return sin(uv.x * 12.0 * patternScale + sin(uv.y * 4.0 + t)) * 0.5 + 0.5;
}

void main() {
    initPalette();

    // Pixelate the coordinates
    float pxSize = max(pixelSize, 1.0);
    vec2 pixelCoord = floor(gl_FragCoord.xy / pxSize) * pxSize;
    vec2 uv = (pixelCoord - 0.5 * resolution.xy) / resolution.y;

    float t = time * speed;

    // Generate multiple patterns
    float p1 = circlePattern(uv, t);
    float p2 = stripePattern(uv, t * 0.7);
    float p3 = gridPattern(uv, t * 0.5);
    float p4 = spokePattern(uv, t);
    float p5 = checkerPattern(uv, t * 0.3);
    float p6 = wavePattern(uv, t * 0.8);

    // Convert to integer representation for bitwise ops
    int b1 = toBits(p1);
    int b2 = toBits(p2);
    int b3 = toBits(p3);
    int b4 = toBits(p4);
    int b5 = toBits(p5);
    int b6 = toBits(p6);

    // Apply bitwise operations in sequence
    // Layer 1: XOR circles with stripes
    int layer1 = xorOp(b1, b2);

    // Layer 2: AND grid with spokes
    int layer2 = andOp(b3, b4);

    // Layer 3: OR checker with waves
    int layer3 = orOp(b5, b6);

    // Combine layers with more bitwise ops
    // The combination changes over time
    float cycleTime = mod(t * 0.2, 3.0);
    int finalBits;

    if (cycleTime < 1.0) {
        // XOR all layers
        finalBits = xorOp(xorOp(layer1, layer2), layer3);
    } else if (cycleTime < 2.0) {
        // Mixed operations
        finalBits = orOp(xorOp(layer1, layer2), andOp(layer2, layer3));
    } else {
        // Different mix
        finalBits = xorOp(andOp(layer1, layer3), orOp(layer2, layer3));
    }

    // Convert back to float and use for color indexing
    float value = float(finalBits) / 255.0;

    // Map to palette index
    int colorIndex = int(floor(value * 9.99));

    // Clamp index to valid range
    colorIndex = colorIndex - (colorIndex / 10) * 10; // mod 10
    if (colorIndex < 0) colorIndex = 0;
    if (colorIndex > 9) colorIndex = 9;

    // Get color from palette
    vec3 col;
    if (colorIndex == 0) col = palette[0];
    else if (colorIndex == 1) col = palette[1];
    else if (colorIndex == 2) col = palette[2];
    else if (colorIndex == 3) col = palette[3];
    else if (colorIndex == 4) col = palette[4];
    else if (colorIndex == 5) col = palette[5];
    else if (colorIndex == 6) col = palette[6];
    else if (colorIndex == 7) col = palette[7];
    else if (colorIndex == 8) col = palette[8];
    else col = palette[9];

    // Add subtle variation based on bit patterns
    float highlight = float(andOp(finalBits, 128)) / 128.0 * 0.1;
    col += highlight;

    gl_FragColor = vec4(col, 1.0);
}
