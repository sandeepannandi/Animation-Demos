/**
 * Light on Painting - GPU shading sources.
 *
 * One lighting model, two targets: SKSL_SRC feeds a Skia RuntimeEffect
 * (native + CanvasKit web), GLSL feeds the WebGL pass in the site adapter.
 * Both implement the exact maths of shadeBuffer() in lightMath.ts - lambert
 * from the depth-gradient normal, quadratic distance falloff, and a 3-tap
 * penumbra of 24-step occlusion marches through the depth map - but run per
 * pixel at full canvas resolution, so silhouettes and shadow edges stay as
 * sharp as the 256px textures allow. shadeBuffer() remains the CPU fallback
 * and the reference the Node tests pin.
 *
 * All distances are in normalized uv space (0..1 across the painting) so
 * mediump fragment precision is enough on old mobile GPUs.
 */

/** Albedo and depth texture resolution (square). */
export const LIGHT_TEX_SIZE = 256;

const SKSL_SRC = `
uniform shader albedoImg;
uniform shader depthImg;
uniform float2 dstOrigin;
uniform float2 dstSize;
uniform float texSize;
uniform float2 bulbUV;
uniform float bulbZ;
uniform float intensity;
uniform float ambient;
uniform float shadowFloor;

float depthAt(float2 uvp) {
    return depthImg.eval(uvp * texSize).r;
}

float march(float2 uv, float pd, float2 buv, float bz) {
    float2 d = buv - uv;
    if (length(d) * texSize < 1.5) { return 1.0; }
    for (int i = 1; i < 24; i++) {
        float t = float(i) / 24.0;
        float2 p = uv + d * t;
        float ray = pd + (bz - pd) * t;
        if (depthAt(p) > ray + 0.012) { return 0.0; }
    }
    return 1.0;
}

half4 main(float2 xy) {
    float2 uv = (xy - dstOrigin) / dstSize;
    float4 c = albedoImg.eval(uv * texSize);
    float d = depthAt(uv);
    float texel = 1.0 / texSize;
    float gx = depthAt(uv + float2(texel, 0.0)) - depthAt(uv - float2(texel, 0.0));
    float gy = depthAt(uv + float2(0.0, texel)) - depthAt(uv - float2(0.0, texel));
    float3 n = normalize(float3(-gx, -gy, 1.6));
    float3 L = normalize(float3(bulbUV.x - uv.x, bulbUV.y - uv.y, bulbZ - d));
    float lambert = max(0.0, dot(n, L));
    float2 dl = bulbUV - uv;
    float falloff = 1.0 / (1.0 + dot(dl, dl) / 0.9);
    float dist = max(length(dl), 1e-5);
    float2 perp = float2(-dl.y, dl.x) / dist * (0.9 / texSize);
    float lit = march(uv, d, bulbUV, bulbZ)
              + march(uv + perp, d, bulbUV, bulbZ)
              + march(uv - perp, d, bulbUV, bulbZ);
    float shadow = shadowFloor + (1.0 - shadowFloor) * (lit / 3.0);
    float light = ambient + intensity * lambert * falloff * shadow;
    return half4(float3(c.r, c.g, c.b) * light, 1.0);
}
`;

const GLSL_VERT = `
attribute vec2 aPos;
varying vec2 vUV;
void main() {
    vUV = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);
    gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const GLSL_FRAG = `
precision mediump float;
varying vec2 vUV;
uniform sampler2D albedoTex;
uniform sampler2D depthTex;
uniform float texSize;
uniform vec2 bulbUV;
uniform float bulbZ;
uniform float intensity;
uniform float ambient;
uniform float shadowFloor;

float depthAt(vec2 uvp) {
    return texture2D(depthTex, uvp).r;
}

float march(vec2 uv, float pd, vec2 buv, float bz) {
    vec2 d = buv - uv;
    if (length(d) * texSize < 1.5) { return 1.0; }
    for (int i = 1; i < 24; i++) {
        float t = float(i) / 24.0;
        vec2 p = uv + d * t;
        float ray = pd + (bz - pd) * t;
        if (depthAt(p) > ray + 0.012) { return 0.0; }
    }
    return 1.0;
}

void main() {
    vec2 uv = vUV;
    vec3 c = texture2D(albedoTex, uv).rgb;
    float d = depthAt(uv);
    float texel = 1.0 / texSize;
    float gx = depthAt(uv + vec2(texel, 0.0)) - depthAt(uv - vec2(texel, 0.0));
    float gy = depthAt(uv + vec2(0.0, texel)) - depthAt(uv - vec2(0.0, texel));
    vec3 n = normalize(vec3(-gx, -gy, 1.6));
    vec3 L = normalize(vec3(bulbUV.x - uv.x, bulbUV.y - uv.y, bulbZ - d));
    float lambert = max(0.0, dot(n, L));
    vec2 dl = bulbUV - uv;
    float falloff = 1.0 / (1.0 + dot(dl, dl) / 0.9);
    float dist = max(length(dl), 1e-5);
    vec2 perp = vec2(-dl.y, dl.x) / dist * (0.9 / texSize);
    float lit = march(uv, d, bulbUV, bulbZ)
              + march(uv + perp, d, bulbUV, bulbZ)
              + march(uv - perp, d, bulbUV, bulbZ);
    float shadow = shadowFloor + (1.0 - shadowFloor) * (lit / 3.0);
    float light = ambient + intensity * lambert * falloff * shadow;
    gl_FragColor = vec4(c * light, 1.0);
}
`;

export { SKSL_SRC, GLSL_VERT, GLSL_FRAG };
