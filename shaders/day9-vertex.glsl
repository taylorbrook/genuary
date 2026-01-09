#version 300 es

in vec2 position;
in vec2 velocity;
in vec3 color;

uniform vec2 resolution;
uniform float time;

out vec3 vColor;
out float vSpeed;

void main() {
    vColor = color;
    vSpeed = length(velocity);

    gl_Position = vec4(position, 0.0, 1.0);

    // Point size based on speed - faster particles are slightly larger
    gl_PointSize = 2.0 + vSpeed * 15.0;
}
