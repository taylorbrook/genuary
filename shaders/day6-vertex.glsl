#version 300 es
in vec3 position;
in vec3 velocity;

uniform mat4 projection;
uniform mat4 view;
uniform float time;

out vec3 vPosition;
out vec3 vVelocity;
out float vSpeed;

void main() {
  vPosition = position;
  vVelocity = velocity;
  vSpeed = length(velocity);
  gl_Position = projection * view * vec4(position, 1.0);
  gl_PointSize = 1.0 + vSpeed * 0.3;
}
