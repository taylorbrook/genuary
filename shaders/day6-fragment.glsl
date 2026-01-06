#version 300 es
precision highp float;

in vec3 vPosition;
in vec3 vVelocity;
in float vSpeed;

uniform float lightIntensity;
uniform float time;

out vec4 fragColor;

void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord);
  if (dist > 0.5) discard;

  // Smooth particle edge
  float alpha = smoothstep(0.5, 0.2, dist);

  // Color palette based on velocity
  vec3 color1 = vec3(1.0, 0.765, 0.588);  // #ffc396
  vec3 color2 = vec3(1.0, 0.859, 0.447);  // #ffdb72
  vec3 color3 = vec3(0.980, 0.980, 0.980); // #fafafa
  vec3 color4 = vec3(0.745, 0.890, 0.808); // #bee3ce
  vec3 color5 = vec3(1.0, 0.698, 0.733);  // #ffb2bb

  // Use velocity components to pick colors
  vec3 normVel = normalize(abs(vVelocity));
  float colorMix = normVel.x + normVel.y * 0.5 + normVel.z * 0.3;
  colorMix = fract(colorMix * 2.0 + vSpeed * 0.1);

  vec3 baseColor;
  if (colorMix < 0.2) {
    baseColor = mix(color1, color2, colorMix * 5.0);
  } else if (colorMix < 0.4) {
    baseColor = mix(color2, color3, (colorMix - 0.2) * 5.0);
  } else if (colorMix < 0.6) {
    baseColor = mix(color3, color4, (colorMix - 0.4) * 5.0);
  } else if (colorMix < 0.8) {
    baseColor = mix(color4, color5, (colorMix - 0.6) * 5.0);
  } else {
    baseColor = mix(color5, color1, (colorMix - 0.8) * 5.0);
  }

  // Rotating light - circles around the Y axis
  float lightAngle = time * 0.5;
  vec3 lightDir = normalize(vec3(cos(lightAngle), 0.8, sin(lightAngle)));
  vec3 normal = normalize(vVelocity);
  float diffuse = max(dot(normal, lightDir), 0.0);

  // Apply diffuse lighting controlled by slider
  // Map lightIntensity from 0-1 range to 0.01-0.25 range
  float mappedIntensity = 0.01 + lightIntensity * 0.24;
  vec3 finalColor = baseColor * diffuse * mappedIntensity;

  fragColor = vec4(finalColor, alpha * 0.7);
}
