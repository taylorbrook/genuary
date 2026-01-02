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
        // Dynamic uniform discovery - automatically find all uniforms in the shader
        const numUniforms = this.gl.getProgramParameter(this.program, this.gl.ACTIVE_UNIFORMS);

        for (let i = 0; i < numUniforms; i++) {
            const info = this.gl.getActiveUniform(this.program, i);
            const name = info.name;

            // Convert uniform name to JavaScript-friendly name
            // e.g., "u_ballSize" -> "ballSize"
            const jsName = name.startsWith('u_') ? name.substring(2) : name;

            // Store location
            this.uniforms[jsName] = this.gl.getUniformLocation(this.program, name);
        }
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
