// Crazy Automaton - Cellular Automata Particle System for Day 9

class CrazyAutomaton {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl2');

        if (!this.gl) {
            console.error('[AUTOMATA ERROR] WebGL 2 not supported');
            throw new Error('WebGL 2 not supported');
        }

        this.program = null;
        this.particles = [];
        this.numParticles = 10000;
        this.animationFrameId = null;
        this.time = 0;

        // Mouse state
        this.mouseX = 0;
        this.mouseY = 0;
        this.attractMode = true; // true = attract, false = repel

        // User-controllable parameters
        this.mouseInfluence = 0.5;
        this.contagionRate = 0.02;
        this.chaosAmount = 0.3;

        // Spatial hashing for efficient neighbor queries
        this.gridCellSize = 0.08;
        this.grid = new Map();

        // Buffer and location references
        this.positionBuffer = null;
        this.velocityBuffer = null;
        this.colorBuffer = null;
        this.positionLoc = null;
        this.velocityLoc = null;
        this.colorLoc = null;
        this.resolutionLoc = null;
        this.timeLoc = null;

        // Color palette
        this.palette = [
            [1.0, 0.42, 0.42],   // #FF6B6B coral red
            [0.31, 0.80, 0.77],  // #4ECDC4 teal
            [1.0, 0.90, 0.43],   // #FFE66D yellow
            [0.58, 0.88, 0.83],  // #95E1D3 mint
            [0.95, 0.50, 0.50],  // #F38181 salmon
            [0.67, 0.59, 0.85]   // #AA96DA lavender
        ];

        // Bind event handlers
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleClick = this.handleClick.bind(this);
    }

    async init() {
        const gl = this.gl;

        if (!gl) {
            throw new Error('WebGL 2 context is null');
        }

        // Load shaders
        const vertexShaderSource = await this.loadShader('shaders/day9-vertex.glsl');
        const fragmentShaderSource = await this.loadShader('shaders/day9-fragment.glsl');

        // Compile shaders
        const vertexShader = this.compileShader(vertexShaderSource, gl.VERTEX_SHADER);
        const fragmentShader = this.compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER);

        if (!vertexShader || !fragmentShader) {
            throw new Error('Failed to compile shaders');
        }

        this.program = gl.createProgram();
        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);

        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.error('[AUTOMATA] Program linking failed:', gl.getProgramInfoLog(this.program));
            return;
        }

        console.log('[AUTOMATA] Shaders compiled and linked successfully');

        // Initialize particles with random positions and colors
        for (let i = 0; i < this.numParticles; i++) {
            const colorIdx = Math.floor(Math.random() * this.palette.length);
            const color = this.palette[colorIdx];

            this.particles.push({
                x: (Math.random() - 0.5) * 1.8,
                y: (Math.random() - 0.5) * 1.8,
                vx: (Math.random() - 0.5) * 0.01,
                vy: (Math.random() - 0.5) * 0.01,
                r: color[0],
                g: color[1],
                b: color[2],
                age: Math.random() * 100
            });
        }

        // Create buffers
        this.positionBuffer = gl.createBuffer();
        this.velocityBuffer = gl.createBuffer();
        this.colorBuffer = gl.createBuffer();

        // Get attribute and uniform locations
        this.positionLoc = gl.getAttribLocation(this.program, 'position');
        this.velocityLoc = gl.getAttribLocation(this.program, 'velocity');
        this.colorLoc = gl.getAttribLocation(this.program, 'color');
        this.resolutionLoc = gl.getUniformLocation(this.program, 'resolution');
        this.timeLoc = gl.getUniformLocation(this.program, 'time');

        // Setup mouse event listeners
        this.canvas.addEventListener('mousemove', this.handleMouseMove);
        this.canvas.addEventListener('click', this.handleClick);

        console.log('[AUTOMATA] Initialized with', this.numParticles, 'particles');
    }

    async loadShader(url) {
        const response = await fetch(url);
        return await response.text();
    }

    compileShader(source, type) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const info = gl.getShaderInfoLog(shader);
            console.error('[AUTOMATA] Shader compilation failed:', info);
            return null;
        }

        return shader;
    }

    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        // Convert to normalized device coordinates (-1 to 1)
        this.mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    }

    handleClick() {
        this.attractMode = !this.attractMode;
        console.log('[AUTOMATA] Mode:', this.attractMode ? 'Attract' : 'Repel');

        // Update button text if it exists
        const modeToggle = document.getElementById('modeToggle');
        if (modeToggle) {
            modeToggle.textContent = this.attractMode ? 'Mode: Attract' : 'Mode: Repel';
        }
    }

    // Build spatial hash grid for efficient neighbor queries
    buildSpatialGrid() {
        this.grid.clear();

        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            const cellX = Math.floor(p.x / this.gridCellSize);
            const cellY = Math.floor(p.y / this.gridCellSize);
            const key = `${cellX},${cellY}`;

            if (!this.grid.has(key)) {
                this.grid.set(key, []);
            }
            this.grid.get(key).push(i);
        }
    }

    // Get neighbors within radius
    getNeighbors(particleIdx, radius) {
        const p = this.particles[particleIdx];
        const cellRadius = Math.ceil(radius / this.gridCellSize);
        const centerCellX = Math.floor(p.x / this.gridCellSize);
        const centerCellY = Math.floor(p.y / this.gridCellSize);

        const neighbors = [];
        const radiusSq = radius * radius;

        for (let dx = -cellRadius; dx <= cellRadius; dx++) {
            for (let dy = -cellRadius; dy <= cellRadius; dy++) {
                const key = `${centerCellX + dx},${centerCellY + dy}`;
                const cell = this.grid.get(key);

                if (cell) {
                    for (const idx of cell) {
                        if (idx !== particleIdx) {
                            const other = this.particles[idx];
                            const distSq = (p.x - other.x) ** 2 + (p.y - other.y) ** 2;
                            if (distSq < radiusSq) {
                                neighbors.push({ idx, distSq });
                            }
                        }
                    }
                }
            }
        }

        return neighbors;
    }

    update() {
        // Build spatial grid for neighbor queries
        this.buildSpatialGrid();

        const friction = 0.98;
        const maxSpeed = 0.05;

        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];

            // Mouse interaction force
            const dx = this.mouseX - p.x;
            const dy = this.mouseY - p.y;
            const distToMouse = Math.sqrt(dx * dx + dy * dy);

            if (distToMouse < 0.4 && distToMouse > 0.01) {
                const force = this.mouseInfluence / (distToMouse * distToMouse + 0.1);
                const direction = this.attractMode ? 1 : -1;
                p.vx += direction * (dx / distToMouse) * force * 0.0008;
                p.vy += direction * (dy / distToMouse) * force * 0.0008;

                // Chaos injection near mouse - random color mutations
                if (Math.random() < this.chaosAmount * 0.01) {
                    const newColorIdx = Math.floor(Math.random() * this.palette.length);
                    const newColor = this.palette[newColorIdx];
                    p.r = p.r * 0.7 + newColor[0] * 0.3;
                    p.g = p.g * 0.7 + newColor[1] * 0.3;
                    p.b = p.b * 0.7 + newColor[2] * 0.3;
                }
            }

            // Color contagion - sample neighbors and blend colors
            const neighbors = this.getNeighbors(i, 0.06);

            if (neighbors.length > 0) {
                let avgR = 0, avgG = 0, avgB = 0;
                let totalWeight = 0;

                for (const { idx, distSq } of neighbors) {
                    const other = this.particles[idx];
                    const weight = 1.0 / (distSq + 0.001);
                    avgR += other.r * weight;
                    avgG += other.g * weight;
                    avgB += other.b * weight;
                    totalWeight += weight;
                }

                if (totalWeight > 0) {
                    avgR /= totalWeight;
                    avgG /= totalWeight;
                    avgB /= totalWeight;

                    // Blend toward neighbor average
                    const rate = this.contagionRate;
                    p.r = p.r * (1 - rate) + avgR * rate;
                    p.g = p.g * (1 - rate) + avgG * rate;
                    p.b = p.b * (1 - rate) + avgB * rate;
                }

                // Density effect - crowded areas intensify colors
                const density = neighbors.length / 20.0;
                const intensify = 1.0 + density * 0.02;
                p.r = Math.min(p.r * intensify, 1.0);
                p.g = Math.min(p.g * intensify, 1.0);
                p.b = Math.min(p.b * intensify, 1.0);
            }

            // Velocity-color coupling: fast particles shift warm, slow shift cool
            const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            if (speed > 0.01) {
                // Shift toward warm (red/yellow)
                p.r = Math.min(p.r + 0.002, 1.0);
                p.g = Math.min(p.g + 0.001, 1.0);
                p.b = Math.max(p.b - 0.001, 0.0);
            } else {
                // Shift toward cool (blue/teal)
                p.r = Math.max(p.r - 0.001, 0.0);
                p.b = Math.min(p.b + 0.001, 1.0);
            }

            // Apply friction
            p.vx *= friction;
            p.vy *= friction;

            // Clamp velocity
            const currentSpeed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            if (currentSpeed > maxSpeed) {
                p.vx = (p.vx / currentSpeed) * maxSpeed;
                p.vy = (p.vy / currentSpeed) * maxSpeed;
            }

            // Update position
            p.x += p.vx;
            p.y += p.vy;

            // Wrap around edges
            if (p.x < -1.0) p.x = 1.0;
            if (p.x > 1.0) p.x = -1.0;
            if (p.y < -1.0) p.y = 1.0;
            if (p.y > 1.0) p.y = -1.0;

            p.age += 0.01;
        }
    }

    render() {
        const gl = this.gl;

        this.time += 0.016;
        this.update();

        // Prepare data for GPU
        const positions = new Float32Array(this.numParticles * 2);
        const velocities = new Float32Array(this.numParticles * 2);
        const colors = new Float32Array(this.numParticles * 3);

        for (let i = 0; i < this.numParticles; i++) {
            const p = this.particles[i];
            positions[i * 2] = p.x;
            positions[i * 2 + 1] = p.y;
            velocities[i * 2] = p.vx;
            velocities[i * 2 + 1] = p.vy;
            colors[i * 3] = p.r;
            colors[i * 3 + 1] = p.g;
            colors[i * 3 + 2] = p.b;
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.velocityBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, velocities, gl.DYNAMIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, colors, gl.DYNAMIC_DRAW);

        // Clear and setup
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.clearColor(0.02, 0.02, 0.05, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

        gl.useProgram(this.program);

        // Set uniforms
        gl.uniform2f(this.resolutionLoc, this.canvas.width, this.canvas.height);
        gl.uniform1f(this.timeLoc, this.time);

        // Set position attribute
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.enableVertexAttribArray(this.positionLoc);
        gl.vertexAttribPointer(this.positionLoc, 2, gl.FLOAT, false, 0, 0);

        // Set velocity attribute
        gl.bindBuffer(gl.ARRAY_BUFFER, this.velocityBuffer);
        gl.enableVertexAttribArray(this.velocityLoc);
        gl.vertexAttribPointer(this.velocityLoc, 2, gl.FLOAT, false, 0, 0);

        // Set color attribute
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.enableVertexAttribArray(this.colorLoc);
        gl.vertexAttribPointer(this.colorLoc, 3, gl.FLOAT, false, 0, 0);

        // Draw
        gl.drawArrays(gl.POINTS, 0, this.numParticles);
    }

    start() {
        if (this.animationFrameId) return;

        const animate = () => {
            this.render();
            this.animationFrameId = requestAnimationFrame(animate);
        };

        animate();
        console.log('[AUTOMATA] Animation started');
    }

    stop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
            console.log('[AUTOMATA] Animation stopped');
        }

        // Remove event listeners
        this.canvas.removeEventListener('mousemove', this.handleMouseMove);
        this.canvas.removeEventListener('click', this.handleClick);
    }

    // Parameter setters for UI controls
    setMouseInfluence(value) {
        this.mouseInfluence = value;
    }

    setContagionRate(value) {
        this.contagionRate = value;
    }

    setChaosAmount(value) {
        this.chaosAmount = value;
    }
}
