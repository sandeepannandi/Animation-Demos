"use client";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  createRope,
  stepRopeFixed,
  bulbPosition,
  shadeBuffer,
  type Vec,
} from "../../packages/ui/src/components/light-painting/lightMath";
import {
  PAINTINGS,
  rasterize,
  type RasterizedPainting,
} from "../../packages/ui/src/components/light-painting/paintings";
import {
  LIGHT_TEX_SIZE,
  GLSL_VERT,
  GLSL_FRAG,
} from "../../packages/ui/src/components/light-painting/shaders";
import styles from "./light-painting.module.css";

const PX = 640; // canvas resolution
const FALLBACK_SHADE = 160; // CPU fallback shading buffer resolution
const GL_RES = 512; // WebGL render target resolution
const ANCHOR = { x: PX / 2, y: 6 };
const ROPE_LENGTH = 300;
const BULB_Z = 1.1;
const INTENSITY = 1.1;
const AMBIENT = 0.12;
const SHADOW_FLOOR = 0.14;

interface GLPainting {
  albedo: WebGLTexture;
  depth: WebGLTexture;
}

interface GLState {
  gl: WebGLRenderingContext;
  canvas: HTMLCanvasElement;
  program: WebGLProgram;
  paintings: GLPainting[];
  uTexSize: WebGLUniformLocation | null;
  uBulbUV: WebGLUniformLocation | null;
  uBulbZ: WebGLUniformLocation | null;
  uIntensity: WebGLUniformLocation | null;
  uAmbient: WebGLUniformLocation | null;
  uShadowFloor: WebGLUniformLocation | null;
  uAlbedo: WebGLUniformLocation | null;
  uDepth: WebGLUniformLocation | null;
}

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.warn("light-painting shader compile failed:", gl.getShaderInfoLog(sh));
    return null;
  }
  return sh;
}

/** Build the WebGL shading pass; null when WebGL is unavailable or shaders fail. */
function initGL(rasters: RasterizedPainting[]): GLState | null {
  const canvas = document.createElement("canvas");
  canvas.width = GL_RES;
  canvas.height = GL_RES;
  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: true,
  }) as WebGLRenderingContext | null;
  if (!gl) return null;
  const vs = compile(gl, gl.VERTEX_SHADER, GLSL_VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, GLSL_FRAG);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn("light-painting program link failed:", gl.getProgramInfoLog(program));
    return null;
  }
  gl.useProgram(program);
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const makeTex = (unit: number): WebGLTexture | null => {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  };
  const paintings: GLPainting[] = [];
  for (const r of rasters) {
    const albedo = makeTex(0);
    const depth = makeTex(1);
    if (!albedo || !depth) return null;
    gl.activeTexture(gl.TEXTURE0);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, r.size, r.size, 0, gl.RGBA, gl.UNSIGNED_BYTE, r.albedo);
    const depthBytes = new Uint8Array(r.size * r.size);
    for (let i = 0; i < r.size * r.size; i++) {
      depthBytes[i] = Math.max(0, Math.min(255, Math.round(r.depth[i] * 255)));
    }
    gl.activeTexture(gl.TEXTURE1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, r.size, r.size, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, depthBytes);
    paintings.push({ albedo, depth });
  }
  return {
    gl,
    canvas,
    program,
    paintings,
    uTexSize: gl.getUniformLocation(program, "texSize"),
    uBulbUV: gl.getUniformLocation(program, "bulbUV"),
    uBulbZ: gl.getUniformLocation(program, "bulbZ"),
    uIntensity: gl.getUniformLocation(program, "intensity"),
    uAmbient: gl.getUniformLocation(program, "ambient"),
    uShadowFloor: gl.getUniformLocation(program, "shadowFloor"),
    uAlbedo: gl.getUniformLocation(program, "albedoTex"),
    uDepth: gl.getUniformLocation(program, "depthTex"),
  };
}

function drawGL(state: GLState, painting: number, bulbUV: Vec): void {
  const { gl } = state;
  const p = state.paintings[painting % state.paintings.length];
  gl.viewport(0, 0, GL_RES, GL_RES);
  gl.useProgram(state.program);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, p.albedo);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, p.depth);
  gl.uniform1i(state.uAlbedo, 0);
  gl.uniform1i(state.uDepth, 1);
  gl.uniform1f(state.uTexSize, LIGHT_TEX_SIZE);
  gl.uniform2f(state.uBulbUV, bulbUV.x, bulbUV.y);
  gl.uniform1f(state.uBulbZ, BULB_Z);
  gl.uniform1f(state.uIntensity, INTENSITY);
  gl.uniform1f(state.uAmbient, AMBIENT);
  gl.uniform1f(state.uShadowFloor, SHADOW_FLOOR);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

export function LightPaintingPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const [paintingIndex, setPaintingIndex] = useState(0);
  const stateRef = useRef({
    rope: createRope({ anchor: ANCHOR, segments: 8, length: ROPE_LENGTH }),
    drag: null as Vec | null,
    swipe: null as { x: number; y: number; t: number } | null,
    rasters: [] as RasterizedPainting[],
    painting: 0,
    last: 0,
  });

  useEffect(() => {
    stateRef.current.painting = paintingIndex;
  }, [paintingIndex]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const st = stateRef.current;

    // GPU path: 256px albedo + depth textures, per-pixel shading in GLSL.
    // CPU fallback: 160px shadeBuffer composite, upscaled by drawImage.
    let glState: GLState | null = null;
    try {
      glState = initGL(PAINTINGS.map((p) => rasterize(p, LIGHT_TEX_SIZE)));
    } catch (e) {
      console.warn("light-painting WebGL init failed, using CPU fallback:", e);
      glState = null;
    }
    let off: HTMLCanvasElement | null = null;
    let offCtx: CanvasRenderingContext2D | null = null;
    let img: ImageData | null = null;
    let out: Uint8ClampedArray | null = null;
    if (!glState) {
      st.rasters = PAINTINGS.map((p) => rasterize(p, FALLBACK_SHADE));
      off = document.createElement("canvas");
      off.width = FALLBACK_SHADE;
      off.height = FALLBACK_SHADE;
      offCtx = off.getContext("2d")!;
      img = offCtx.createImageData(FALLBACK_SHADE, FALLBACK_SHADE);
      out = new Uint8ClampedArray(FALLBACK_SHADE * FALLBACK_SHADE * 4);
    }

    let raf = 0;
    const frame = (now: number) => {
      const dt = st.last ? (now - st.last) / 1000 : 1 / 60;
      st.last = now;
      if (!reduced) stepRopeFixed(st.rope, dt, { dragTarget: st.drag, elasticity: 0.08 });
      const bulb = bulbPosition(st.rope);

      // dark room
      ctx.fillStyle = "#0a0c10";
      ctx.fillRect(0, 0, PX, PX);
      // painting inside a wooden frame
      const fx = 56, fy = 56, fs = PX - 112;
      if (glState) {
        drawGL(glState, st.painting, { x: bulb.x / PX, y: bulb.y / PX });
        ctx.drawImage(glState.canvas, fx, fy, fs, fs);
      } else {
        const r = st.rasters[st.painting];
        shadeBuffer({
          size: FALLBACK_SHADE,
          albedo: r.albedo,
          depth: r.depth,
          bulb: { x: (bulb.x / PX) * FALLBACK_SHADE, y: (bulb.y / PX) * FALLBACK_SHADE },
          bulbZ: BULB_Z,
          intensity: INTENSITY,
          ambient: AMBIENT,
          out: out!,
        });
        img!.data.set(out!);
        offCtx!.putImageData(img!, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(off!, fx, fy, fs, fs);
      }
      ctx.strokeStyle = "#3d2c1c";
      ctx.lineWidth = 14;
      ctx.strokeRect(fx - 7, fy - 7, fs + 14, fs + 14);
      ctx.strokeStyle = "#5a422a";
      ctx.lineWidth = 3;
      ctx.strokeRect(fx - 12, fy - 12, fs + 24, fs + 24);

      // cord
      ctx.strokeStyle = "#2a2f3a";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(st.rope.nodes[0].x, st.rope.nodes[0].y);
      for (const n of st.rope.nodes) ctx.lineTo(n.x, n.y);
      ctx.stroke();

      // bulb glow + bulb
      const glow = ctx.createRadialGradient(bulb.x, bulb.y, 2, bulb.x, bulb.y, 120);
      glow.addColorStop(0, "rgba(255, 236, 180, 0.55)");
      glow.addColorStop(0.25, "rgba(255, 226, 160, 0.18)");
      glow.addColorStop(1, "rgba(255, 226, 160, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, PX, PX);
      ctx.fillStyle = "#ffe9b8";
      ctx.beginPath();
      ctx.arc(bulb.x, bulb.y, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff6dd";
      ctx.beginPath();
      ctx.arc(bulb.x - 3, bulb.y - 3, 5, 0, Math.PI * 2);
      ctx.fill();

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const toLocal = (e: PointerEvent): Vec => {
      const r = canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - r.left) / r.width) * PX,
        y: ((e.clientY - r.top) / r.height) * PX,
      };
    };
    const down = (e: PointerEvent) => {
      const p = toLocal(e);
      const bulb = bulbPosition(stateRef.current.rope);
      canvas.setPointerCapture(e.pointerId);
      if (Math.hypot(p.x - bulb.x, p.y - bulb.y) < 70) {
        stateRef.current.drag = p;
      } else {
        stateRef.current.swipe = { x: p.x, y: p.y, t: performance.now() };
      }
    };
    const move = (e: PointerEvent) => {
      if (stateRef.current.drag) stateRef.current.drag = toLocal(e);
    };
    const up = (e: PointerEvent) => {
      const st = stateRef.current;
      if (st.drag) {
        st.drag = null;
        return;
      }
      if (st.swipe) {
        const p = toLocal(e);
        const dx = p.x - st.swipe.x;
        const dt = performance.now() - st.swipe.t;
        // fast flick, or a long horizontal travel regardless of speed (slow
        // machines can blow the 600ms window on frame time alone)
        if (Math.abs(dx) > 60 && (dt < 600 || Math.abs(dx) > 160)) {
          setPaintingIndex((i) => {
            const n = PAINTINGS.length;
            return dx < 0 ? (i + 1) % n : (i - 1 + n) % n;
          });
        }
        st.swipe = null;
      }
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
    };
  }, []);

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.kicker}>LIGHT ON PAINTING</span>
        <span className={styles.paintingName}>{PAINTINGS[paintingIndex].name}</span>
      </div>
      <canvas ref={canvasRef} width={PX} height={PX} className={styles.canvas} />
      <p className={styles.hint}>
        Drag the bulb to move the light. Swipe across the painting for the next one.
      </p>
    </div>
  );
}
