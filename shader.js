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
            const typeName = type === this.gl.VERTEX_SHADER ? 'VERTEX' : 'FRAGMENT';
            console.error(`[SHADER ERROR] ${typeName} shader compilation failed:`);
            console.error(info);

            // Show line numbers for debugging
            const lines = source.split('\n');
            lines.forEach((line, i) => {
                console.log(`${i + 1}: ${line}`);
            });

            this.gl.deleteShader(shader);
            throw new Error(`${typeName} shader compilation error: ` + info);
        }

        console.log('[SHADER SUCCESS] Shader compiled successfully');
        return shader;
    }

    async init(vertexShaderUrl, fragmentShaderUrl) {
        console.log('[VISUAL TEST] Loading shaders:', vertexShaderUrl, fragmentShaderUrl);

        // Load shader sources
        const vertexSource = await this.loadShader(vertexShaderUrl);
        const fragmentSource = await this.loadShader(fragmentShaderUrl);
        console.log('[VISUAL TEST] Shaders loaded, compiling...');

        // Compile shaders
        const vertexShader = this.compileShader(vertexSource, this.gl.VERTEX_SHADER);
        const fragmentShader = this.compileShader(fragmentSource, this.gl.FRAGMENT_SHADER);
        console.log('[VISUAL TEST] Shaders compiled successfully');

        // Create and link program
        this.program = this.gl.createProgram();
        this.gl.attachShader(this.program, vertexShader);
        this.gl.attachShader(this.program, fragmentShader);
        this.gl.linkProgram(this.program);

        if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
            const info = this.gl.getProgramInfoLog(this.program);
            console.error('[VISUAL TEST] Program linking failed:', info);
            throw new Error('Program linking error: ' + info);
        }

        console.log('[VISUAL TEST] Program linked successfully');
        this.gl.useProgram(this.program);

        // Setup geometry (full-screen quad)
        this.setupGeometry();

        // Get uniform and attribute locations
        this.setupLocations();
        console.log('[VISUAL TEST] Uniforms found:', Object.keys(this.uniforms));

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
            const originalName = info.name; // e.g., "u_amplitudes[0]" or "u_time"
            let glslName = originalName; // Name to use for getUniformLocation

            // Handle array uniforms - WebGL reports them as "name[0]"
            // Strip the [0] to get the base name
            const arrayMatch = originalName.match(/^(.+)\[0\]$/);
            if (arrayMatch) {
                glslName = arrayMatch[1]; // e.g., "u_amplitudes[0]" -> "u_amplitudes"
            }

            // Convert uniform name to JavaScript-friendly name
            // e.g., "u_ballSize" -> "ballSize", "u_amplitudes" -> "amplitudes"
            const jsName = glslName.startsWith('u_') ? glslName.substring(2) : glslName;

            // Store location
            this.uniforms[jsName] = this.gl.getUniformLocation(this.program, glslName);
        }
    }

    setUniform(name, value) {
        const location = this.uniforms[name];
        if (!location) return;

        // Get uniform info to check type
        const numUniforms = this.gl.getProgramParameter(this.program, this.gl.ACTIVE_UNIFORMS);
        let uniformType = this.gl.FLOAT;

        // Find the uniform type
        for (let i = 0; i < numUniforms; i++) {
            const info = this.gl.getActiveUniform(this.program, i);
            let uniformName = info.name;

            // Strip [0] from array names
            const arrayMatch = uniformName.match(/^(.+)\[0\]$/);
            if (arrayMatch) {
                uniformName = arrayMatch[1];
            }

            const jsName = uniformName.startsWith('u_') ? uniformName.substring(2) : uniformName;

            if (jsName === name) {
                uniformType = info.type;
                break;
            }
        }

        if (Array.isArray(value)) {
            if (value.length === 2) {
                this.gl.uniform2fv(location, value);
            } else if (value.length === 3) {
                this.gl.uniform3fv(location, value);
            } else if (value.length === 4) {
                this.gl.uniform4fv(location, value);
            } else {
                // For larger arrays (like audio amplitudes)
                this.gl.uniform1fv(location, value);
            }
        } else if (typeof value === 'number') {
            // Use appropriate method based on uniform type
            if (uniformType === this.gl.INT || uniformType === this.gl.BOOL) {
                this.gl.uniform1i(location, Math.floor(value));
            } else {
                this.gl.uniform1f(location, value);
            }
        } else if (typeof value === 'boolean') {
            this.gl.uniform1i(location, value ? 1 : 0);
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
