// Lorenz Attractor particle system for Day 6

class LorenzAttractor {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl2');

        if (!this.gl) {
            console.error('[LORENZ ERROR] WebGL 2 not supported or context creation failed');
            console.error('[LORENZ ERROR] Canvas:', canvas);
            console.error('[LORENZ ERROR] Existing contexts on canvas:', canvas.getContext('webgl'));
            throw new Error('WebGL 2 not supported');
        }

        this.program = null;
        this.particles = [];
        this.numParticles = 10000;
        this.animationFrameId = null;
        this.time = 0;

        // Lorenz parameters
        this.sigma = 10.0;
        this.rho = 28.0;
        this.beta = 8.0 / 3.0;
        this.dt = 0.001;

        // User-controllable parameters
        this.lightIntensity = 0.5;
        this.zoom = 150;

        // Buffer and location references
        this.positionBuffer = null;
        this.velocityBuffer = null;
        this.positionLoc = null;
        this.velocityLoc = null;
        this.projectionLoc = null;
        this.viewLoc = null;
        this.timeLoc = null;
        this.lightLoc = null;
    }

    async init() {
        const gl = this.gl;

        if (!gl) {
            throw new Error('WebGL 2 context is null - cannot initialize Lorenz Attractor');
        }

        // Vertex shader source
        const vertexShaderSource = await this.loadShader('shaders/day6-vertex.glsl');

        // Fragment shader source
        const fragmentShaderSource = await this.loadShader('shaders/day6-fragment.glsl');

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
            console.error('[LORENZ] Program linking failed:', gl.getProgramInfoLog(this.program));
            return;
        }

        console.log('[LORENZ] Shaders compiled and linked successfully');

        // Initialize particles
        for (let i = 0; i < this.numParticles; i++) {
            this.particles.push({
                x: (Math.random() - 0.5) * 50,
                y: (Math.random() - 0.5) * 50,
                z: (Math.random() - 0.5) * 50 + 25,
                vx: 0,
                vy: 0,
                vz: 0
            });
        }

        // Create buffers
        this.positionBuffer = gl.createBuffer();
        this.velocityBuffer = gl.createBuffer();

        // Get attribute and uniform locations
        this.positionLoc = gl.getAttribLocation(this.program, 'position');
        this.velocityLoc = gl.getAttribLocation(this.program, 'velocity');
        this.projectionLoc = gl.getUniformLocation(this.program, 'projection');
        this.viewLoc = gl.getUniformLocation(this.program, 'view');
        this.timeLoc = gl.getUniformLocation(this.program, 'time');
        this.lightLoc = gl.getUniformLocation(this.program, 'lightIntensity');

        console.log('[LORENZ] Initialized with', this.numParticles, 'particles');
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
            console.error('[LORENZ] Shader compilation failed:', info);
            console.error('Shader source:', source);
            return null;
        }

        return shader;
    }

    perspective(fov, aspect, near, far) {
        const f = 1.0 / Math.tan(fov / 2);
        return new Float32Array([
            f / aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (far + near) / (near - far), -1,
            0, 0, (2 * far * near) / (near - far), 0
        ]);
    }

    lookAt(eye, center, up) {
        const z = [eye[0] - center[0], eye[1] - center[1], eye[2] - center[2]];
        const zLen = Math.sqrt(z[0]*z[0] + z[1]*z[1] + z[2]*z[2]);
        z[0] /= zLen; z[1] /= zLen; z[2] /= zLen;

        const x = [
            up[1]*z[2] - up[2]*z[1],
            up[2]*z[0] - up[0]*z[2],
            up[0]*z[1] - up[1]*z[0]
        ];
        const xLen = Math.sqrt(x[0]*x[0] + x[1]*x[1] + x[2]*x[2]);
        x[0] /= xLen; x[1] /= xLen; x[2] /= xLen;

        const y = [z[1]*x[2] - z[2]*x[1], z[2]*x[0] - z[0]*x[2], z[0]*x[1] - z[1]*x[0]];

        return new Float32Array([
            x[0], y[0], z[0], 0,
            x[1], y[1], z[1], 0,
            x[2], y[2], z[2], 0,
            -(x[0]*eye[0] + x[1]*eye[1] + x[2]*eye[2]),
            -(y[0]*eye[0] + y[1]*eye[1] + y[2]*eye[2]),
            -(z[0]*eye[0] + z[1]*eye[1] + z[2]*eye[2]), 1
        ]);
    }

    update() {
        // Update particles with Lorenz attractor
        for (let p of this.particles) {
            const dx = this.sigma * (p.y - p.x);
            const dy = p.x * (this.rho - p.z) - p.y;
            const dz = p.x * p.y - this.beta * p.z;

            p.vx = dx;
            p.vy = dy;
            p.vz = dz;

            p.x += dx * this.dt;
            p.y += dy * this.dt;
            p.z += dz * this.dt;
        }
    }

    render() {
        const gl = this.gl;

        this.time += 0.016;
        this.update();

        // Prepare data for GPU
        const positions = new Float32Array(this.numParticles * 3);
        const velocities = new Float32Array(this.numParticles * 3);

        for (let i = 0; i < this.numParticles; i++) {
            const p = this.particles[i];
            positions[i * 3] = p.x;
            positions[i * 3 + 1] = p.y;
            positions[i * 3 + 2] = p.z;
            velocities[i * 3] = p.vx;
            velocities[i * 3 + 1] = p.vy;
            velocities[i * 3 + 2] = p.vz;
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.velocityBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, velocities, gl.DYNAMIC_DRAW);

        // Clear and setup
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        gl.enable(gl.DEPTH_TEST);

        gl.useProgram(this.program);

        // Set matrices
        const projMatrix = this.perspective(
            Math.PI / 4,
            this.canvas.width / this.canvas.height,
            0.1,
            1000
        );
        const angle = this.time * 0.1;
        const radius = this.zoom;
        const viewMatrix = this.lookAt(
            [Math.cos(angle) * radius, 50, Math.sin(angle) * radius],
            [0, 0, 25],
            [0, 1, 0]
        );

        gl.uniformMatrix4fv(this.projectionLoc, false, projMatrix);
        gl.uniformMatrix4fv(this.viewLoc, false, viewMatrix);
        gl.uniform1f(this.timeLoc, this.time);
        gl.uniform1f(this.lightLoc, this.lightIntensity);

        // Set attributes
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.enableVertexAttribArray(this.positionLoc);
        gl.vertexAttribPointer(this.positionLoc, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.velocityBuffer);
        gl.enableVertexAttribArray(this.velocityLoc);
        gl.vertexAttribPointer(this.velocityLoc, 3, gl.FLOAT, false, 0, 0);

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
        console.log('[LORENZ] Animation started');
    }

    stop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
            console.log('[LORENZ] Animation stopped');
        }
    }

    setLightIntensity(value) {
        this.lightIntensity = value;
    }

    setZoom(value) {
        this.zoom = value;
    }
}
