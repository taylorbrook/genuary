// WebGL shader setup and compilation utilities

class ShaderProgram {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

        if (!this.gl) {
            throw new Error('WebGL not supported');
        }

        this.program = null;
        this.uniforms = {};
        this.attributes = {};
    }

    async loadShader(url) {
        const response = await fetch(url);
        return await response.text();
    }

    compileShader(source, type) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            const info = this.gl.getShaderInfoLog(shader);
            this.gl.deleteShader(shader);
            throw new Error('Shader compilation error: ' + info);
        }

        return shader;
    }

    async init(vertexShaderUrl, fragmentShaderUrl) {
        // Load shader sources
        const vertexSource = await this.loadShader(vertexShaderUrl);
        const fragmentSource = await this.loadShader(fragmentShaderUrl);

        // Compile shaders
        const vertexShader = this.compileShader(vertexSource, this.gl.VERTEX_SHADER);
        const fragmentShader = this.compileShader(fragmentSource, this.gl.FRAGMENT_SHADER);

        // Create and link program
        this.program = this.gl.createProgram();
        this.gl.attachShader(this.program, vertexShader);
        this.gl.attachShader(this.program, fragmentShader);
        this.gl.linkProgram(this.program);

        if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
            const info = this.gl.getProgramInfoLog(this.program);
            throw new Error('Program linking error: ' + info);
        }

        this.gl.useProgram(this.program);

        // Setup geometry (full-screen quad)
        this.setupGeometry();

        // Get uniform and attribute locations
        this.setupLocations();

        // Cleanup shaders (no longer needed after linking)
        this.gl.deleteShader(vertexShader);
        this.gl.deleteShader(fragmentShader);
    }

    setupGeometry() {
        // Create a full-screen quad
        const positions = new Float32Array([
            -1, -1,
             1, -1,
            -1,  1,
            -1,  1,
             1, -1,
             1,  1,
        ]);

        const positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);

        const positionLocation = this.gl.getAttribLocation(this.program, 'a_position');
        this.gl.enableVertexAttribArray(positionLocation);
        this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);
    }

    setupLocations() {
        // Get uniform locations
        this.uniforms.time = this.gl.getUniformLocation(this.program, 'u_time');
        this.uniforms.resolution = this.gl.getUniformLocation(this.program, 'u_resolution');
        this.uniforms.hue = this.gl.getUniformLocation(this.program, 'u_hue');
        this.uniforms.segments = this.gl.getUniformLocation(this.program, 'u_segments');
        this.uniforms.sides = this.gl.getUniformLocation(this.program, 'u_sides');
        this.uniforms.scale = this.gl.getUniformLocation(this.program, 'u_scale');
        this.uniforms.speed = this.gl.getUniformLocation(this.program, 'u_speed');
        this.uniforms.rotation = this.gl.getUniformLocation(this.program, 'u_rotation');

        // Layer 1 uniforms
        this.uniforms.layer1Count = this.gl.getUniformLocation(this.program, 'u_layer1Count');
        this.uniforms.layer1Radius = this.gl.getUniformLocation(this.program, 'u_layer1Radius');
        this.uniforms.layer1RotSpeed = this.gl.getUniformLocation(this.program, 'u_layer1RotSpeed');
        this.uniforms.layer1Scale = this.gl.getUniformLocation(this.program, 'u_layer1Scale');

        // Layer 2 uniforms
        this.uniforms.layer2Count = this.gl.getUniformLocation(this.program, 'u_layer2Count');
        this.uniforms.layer2Radius = this.gl.getUniformLocation(this.program, 'u_layer2Radius');
        this.uniforms.layer2RotSpeed = this.gl.getUniformLocation(this.program, 'u_layer2RotSpeed');
        this.uniforms.layer2Scale = this.gl.getUniformLocation(this.program, 'u_layer2Scale');

        // Layer 3 uniforms
        this.uniforms.layer3Count = this.gl.getUniformLocation(this.program, 'u_layer3Count');
        this.uniforms.layer3Radius = this.gl.getUniformLocation(this.program, 'u_layer3Radius');
        this.uniforms.layer3RotSpeed = this.gl.getUniformLocation(this.program, 'u_layer3RotSpeed');
        this.uniforms.layer3Scale = this.gl.getUniformLocation(this.program, 'u_layer3Scale');

        // Effect uniforms
        this.uniforms.blendSmoothness = this.gl.getUniformLocation(this.program, 'u_blendSmoothness');
        this.uniforms.pulseFreq = this.gl.getUniformLocation(this.program, 'u_pulseFreq');
        this.uniforms.pulseAmount = this.gl.getUniformLocation(this.program, 'u_pulseAmount');
        this.uniforms.waveStrength = this.gl.getUniformLocation(this.program, 'u_waveStrength');
        this.uniforms.zoomFreq = this.gl.getUniformLocation(this.program, 'u_zoomFreq');
        this.uniforms.zoomAmount = this.gl.getUniformLocation(this.program, 'u_zoomAmount');

        // Recursion uniforms
        this.uniforms.recursionDepth = this.gl.getUniformLocation(this.program, 'u_recursionDepth');
        this.uniforms.recursionScale = this.gl.getUniformLocation(this.program, 'u_recursionScale');
        this.uniforms.recursionSpread = this.gl.getUniformLocation(this.program, 'u_recursionSpread');
        this.uniforms.recursionFade = this.gl.getUniformLocation(this.program, 'u_recursionFade');
    }

    setUniform(name, value) {
        const location = this.uniforms[name];
        if (!location) return;

        if (Array.isArray(value)) {
            if (value.length === 2) {
                this.gl.uniform2fv(location, value);
            } else if (value.length === 3) {
                this.gl.uniform3fv(location, value);
            } else if (value.length === 4) {
                this.gl.uniform4fv(location, value);
            }
        } else {
            this.gl.uniform1f(location, value);
        }
    }

    resize() {
        const displayWidth = this.canvas.clientWidth;
        const displayHeight = this.canvas.clientHeight;

        if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
            this.canvas.width = displayWidth;
            this.canvas.height = displayHeight;
            this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    render() {
        this.resize();
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }
}
