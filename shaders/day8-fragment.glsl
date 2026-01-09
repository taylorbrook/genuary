precision highp float;

uniform float time;
uniform vec2 resolution;
uniform float buildingDensity;
uniform float windowBrightness;
uniform float detailSpeed;
uniform float cameraHeight;

#define MAX_STEPS 100
#define MAX_DIST 100.0
#define SURF_DIST 0.01

// Hash functions for procedural generation
float hash(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
}

float hash3(vec3 p) {
    p = fract(p * vec3(234.34, 435.345, 123.456));
    p += dot(p, p.yxz + 34.23);
    return fract(p.x * p.y * p.z);
}

// Noise for stars
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

// SDF for a box
float sdBox(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

// Ground plane
float sdPlane(vec3 p) {
    return p.y;
}

// Get building info for a cell
vec3 getBuildingInfo(vec2 cellId) {
    float h = hash(cellId);
    float h2 = hash(cellId + 100.0);
    float h3 = hash(cellId + 200.0);

    // Height variation
    float height = 2.0 + h * 12.0;

    // Some cells have no building (streets)
    float hasBuilding = step(1.0 - buildingDensity, h2);

    // Building width variation
    float width = 0.3 + h3 * 0.15;

    return vec3(height * hasBuilding, width, h);
}

// City SDF with detail level
float citySDF(vec3 p, float detail) {
    float cellSize = 1.2;

    // Get cell coordinates
    vec2 cellId = floor(p.xz / cellSize);
    vec2 localP = mod(p.xz, cellSize) - cellSize * 0.5;

    float minDist = MAX_DIST;

    // Check neighboring cells for closest building
    for (int x = -1; x <= 1; x++) {
        for (int z = -1; z <= 1; z++) {
            vec2 neighbor = cellId + vec2(float(x), float(z));
            vec3 info = getBuildingInfo(neighbor);
            float height = info.x;
            float width = info.y;

            if (height > 0.0) {
                vec2 neighborLocal = p.xz - (neighbor + 0.5) * cellSize;

                // Base building
                vec3 buildingP = vec3(neighborLocal.x, p.y, neighborLocal.y);
                float d = sdBox(buildingP - vec3(0.0, height * 0.5, 0.0),
                               vec3(width, height * 0.5, width));

                // Add ledges/setbacks based on detail level
                if (detail > 0.5 && height > 5.0) {
                    // Setback for taller buildings
                    float setbackHeight = height * 0.7;
                    float d2 = sdBox(buildingP - vec3(0.0, setbackHeight + height * 0.15, 0.0),
                                    vec3(width * 0.7, height * 0.15, width * 0.7));
                    d = min(d, d2);
                }

                minDist = min(minDist, d);
            }
        }
    }

    // Ground plane
    float ground = sdPlane(p);
    minDist = min(minDist, ground);

    return minDist;
}

// Raymarching
float raymarch(vec3 ro, vec3 rd, float detail) {
    float d = 0.0;

    for (int i = 0; i < MAX_STEPS; i++) {
        vec3 p = ro + rd * d;
        float ds = citySDF(p, detail);
        d += ds;
        if (d > MAX_DIST || ds < SURF_DIST) break;
    }

    return d;
}

// Calculate normal
vec3 getNormal(vec3 p, float detail) {
    float d = citySDF(p, detail);
    vec2 e = vec2(0.01, 0.0);

    vec3 n = d - vec3(
        citySDF(p - e.xyy, detail),
        citySDF(p - e.yxy, detail),
        citySDF(p - e.yyx, detail)
    );

    return normalize(n);
}

// Window pattern with two layers that fade at offset times
vec2 windowPattern(vec3 p, float cycleTime) {
    // Window grid parameters
    float windowSize = 0.15;
    float windowSpacing = 0.25;

    vec2 windowUV = p.xz;
    if (abs(p.x) > abs(p.z)) {
        windowUV = p.zy;
    }

    // Create window grid
    vec2 windowCell = mod(windowUV, windowSpacing) - windowSpacing * 0.5;
    float windowDist = max(abs(windowCell.x), abs(windowCell.y));

    // Only show windows on vertical faces and above ground
    float isWindow = step(windowDist, windowSize * 0.4) * step(0.5, p.y);

    // Window ID for randomization
    vec2 windowId = floor(windowUV / windowSpacing);
    float floorId = floor(p.y / windowSpacing);

    // Two different window sets with different random seeds
    float windowSet1 = step(0.5, hash(windowId + floorId * 100.0));
    float windowSet2 = step(0.5, hash(windowId + floorId * 100.0 + 500.0));

    // Two fade cycles offset by half period (10 seconds each, offset by 5 seconds)
    float cycle1 = mod(cycleTime, 20.0) / 20.0;           // 0-1 over 20 seconds
    float cycle2 = mod(cycleTime + 10.0, 20.0) / 20.0;    // Same but offset by half

    // Smooth fade in and out for each cycle
    // Fade in from 0-0.3, stay on 0.3-0.7, fade out 0.7-1.0
    float fade1 = smoothstep(0.0, 0.3, cycle1) * (1.0 - smoothstep(0.7, 1.0, cycle1));
    float fade2 = smoothstep(0.0, 0.3, cycle2) * (1.0 - smoothstep(0.7, 1.0, cycle2));

    // Return both window intensities
    float window1 = isWindow * windowSet1 * fade1;
    float window2 = isWindow * windowSet2 * fade2;

    return vec2(window1, window2);
}

// Starfield
float stars(vec2 uv) {
    float star = 0.0;

    // Multiple layers of stars
    for (float i = 0.0; i < 3.0; i++) {
        vec2 starUV = uv * (50.0 + i * 30.0);
        vec2 starId = floor(starUV);
        vec2 starLocal = fract(starUV) - 0.5;

        float h = hash(starId + i * 100.0);
        if (h > 0.97) {
            float brightness = (h - 0.97) / 0.03;
            float dist = length(starLocal);
            star += brightness * smoothstep(0.1, 0.0, dist);
        }
    }

    return star;
}

// Main render function
vec3 render(vec3 ro, vec3 rd, float detail, float cycleTime) {
    float d = raymarch(ro, rd, detail);

    // Sky color
    vec3 skyColor = mix(
        vec3(0.02, 0.02, 0.08),  // Horizon
        vec3(0.0, 0.0, 0.03),    // Zenith
        max(rd.y, 0.0)
    );

    // Add stars
    if (rd.y > 0.0) {
        float starBrightness = stars(rd.xz / rd.y);
        skyColor += vec3(starBrightness);
    }

    if (d < MAX_DIST) {
        vec3 p = ro + rd * d;
        vec3 n = getNormal(p, detail);

        // Check if we hit ground or building
        float isGround = step(p.y, 0.02);

        // Base building color (dark)
        vec3 buildingColor = vec3(0.05, 0.05, 0.07);

        // Ground color
        vec3 groundColor = vec3(0.02, 0.02, 0.03);

        // Ambient light
        vec3 ambient = vec3(0.02, 0.02, 0.04);

        // Simple top-down light for depth
        float topLight = max(n.y, 0.0) * 0.1;

        // Side lighting for definition
        vec3 lightDir = normalize(vec3(1.0, 0.5, 0.5));
        float diffuse = max(dot(n, lightDir), 0.0) * 0.15;

        vec3 col = mix(buildingColor, groundColor, isGround);
        col += ambient + topLight + diffuse;

        // Windows - two layers with offset fade cycles
        if (isGround < 0.5) {
            vec2 windows = windowPattern(p, cycleTime);

            // Window colors - warm for set 1, mix for set 2
            vec3 warmWindow = vec3(1.0, 0.8, 0.4) * windowBrightness;
            vec3 coolWindow = vec3(0.4, 0.7, 1.0) * windowBrightness * 0.7;

            // Set 1: mostly warm windows
            float temp1 = hash(floor(p.xz * 4.0) + floor(p.y * 4.0) * 10.0);
            vec3 color1 = mix(warmWindow, coolWindow, step(0.85, temp1));

            // Set 2: different color distribution
            float temp2 = hash(floor(p.xz * 4.0) + floor(p.y * 4.0) * 10.0 + 300.0);
            vec3 color2 = mix(warmWindow, coolWindow, step(0.8, temp2));

            col += windows.x * color1 + windows.y * color2;
        }

        // Distance fog
        float fog = 1.0 - exp(-d * 0.03);
        col = mix(col, skyColor, fog);

        return col;
    }

    return skyColor;
}

// Camera matrix
mat3 setCamera(vec3 ro, vec3 ta) {
    vec3 cw = normalize(ta - ro);
    vec3 cp = vec3(0.0, 1.0, 0.0);
    vec3 cu = normalize(cross(cw, cp));
    vec3 cv = normalize(cross(cu, cw));
    return mat3(cu, cv, cw);
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * resolution.xy) / resolution.y;

    // Calculate detail level (cycles over time)
    float cycleTime = time * detailSpeed;
    float detail = mod(cycleTime, 20.0) / 20.0;

    // Camera setup - aerial orbit
    float camAngle = time * 0.08;
    float camDist = 25.0;
    vec3 ro = vec3(
        cos(camAngle) * camDist,
        cameraHeight,
        sin(camAngle) * camDist
    );
    vec3 ta = vec3(0.0, 4.0, 0.0);

    // Camera matrix
    mat3 ca = setCamera(ro, ta);

    // Ray direction
    vec3 rd = ca * normalize(vec3(uv, 1.5));

    // Render
    vec3 col = render(ro, rd, detail, cycleTime);

    // Tone mapping and gamma
    col = col / (col + vec3(1.0));
    col = pow(col, vec3(0.9));

    gl_FragColor = vec4(col, 1.0);
}
