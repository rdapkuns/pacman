uniform float iTime;
uniform vec2 iResolution;

varying vec2 vUv;

void main() {
    // Use vUv (plane UVs) instead of gl_FragCoord
    vec2 uv = vUv * 4.0; // scale tiling

    float wave = sin(uv.x * 3.0 + iTime) * 0.1 +
                 cos(uv.y * 5.0 + iTime * 0.5) * 0.1;

    // Basic color blending
    vec3 color = vec3(0.0, 0.3, 0.6) + wave * 0.5;

    gl_FragColor = vec4(color, 1.0);
}
