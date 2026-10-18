"use client";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  REVEAL_DEFAULTS, brushDown, brushMove, brushPresetPatch, brushRelease, brushStep, createBrush,
} from "../../packages/ui/src/components/code-reveal/revealMath";
import { REVEAL_H, REVEAL_STAMPS, REVEAL_W } from "../../packages/ui/src/components/code-reveal/revealDesign";
import { REVEAL_SHADER } from "../../packages/ui/src/components/code-reveal/revealShader";
import styles from "./code-reveal.module.css";

const PRELUDE = `precision highp float;
#define float2 vec2
#define float3 vec3
#define float4 vec4
uniform float uScale;
uniform float uHeight;
`;
const FRAGMENT = `${PRELUDE}${REVEAL_SHADER}
void main() {
  gl_FragColor = vec4(codeRevealColor(vec2(gl_FragCoord.x, uHeight - gl_FragCoord.y) / uScale), 1.0);
}
`;
const VERTEX = `attribute vec2 pos;
void main() { gl_Position = vec4(pos, 0.0, 1.0); }
`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function CodeRevealPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState(false);
  const [slow, setSlow] = useState(false);
  const systemReduce = useReducedMotion();
  const latest = useRef({ color, slow, reduced: !!systemReduce });
  latest.current = { color, slow, reduced: !!systemReduce };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false });
    if (!gl) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(REVEAL_W * dpr);
    canvas.height = Math.round(REVEAL_H * dpr);
    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    if (!vs || !fs) return;
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, "pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.viewport(0, 0, canvas.width, canvas.height);
    const u = (name: string) => gl.getUniformLocation(program, name);
    gl.uniform1f(u("uScale"), dpr);
    gl.uniform1f(u("uHeight"), canvas.height);
    gl.uniform2f(u("size"), REVEAL_W, REVEAL_H);
    const uMode = u("mode");
    const uStamps = Array.from({ length: REVEAL_STAMPS }, (_, i) => u("s" + i));

    const brush = createBrush(REVEAL_DEFAULTS);
    let wasReduced = false;
    let raf = 0;
    let last = 0;
    let drawn = false;
    let lastColor = latest.current.color;

    const draw = () => {
      gl.uniform1f(uMode, latest.current.color ? 1 : 0);
      for (let i = 0; i < REVEAL_STAMPS; i++) {
        gl.uniform4f(uStamps[i], brush.data[i * 4], brush.data[i * 4 + 1], brush.data[i * 4 + 2], brush.data[i * 4 + 3]);
      }
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    const tick = (now: number) => {
      const dt = last ? Math.min(48, now - last) / 1000 : 1 / 60;
      last = now;
      let dirty = !drawn || lastColor !== latest.current.color;
      lastColor = latest.current.color;
      if (latest.current.reduced) {
        if (!wasReduced) {
          Object.assign(brush, createBrush(REVEAL_DEFAULTS));
          brushPresetPatch(brush, REVEAL_W * 0.5, REVEAL_H * 0.55, 80, REVEAL_DEFAULTS);
          wasReduced = true;
          dirty = true;
        }
      } else {
        if (wasReduced) {
          Object.assign(brush, createBrush(REVEAL_DEFAULTS));
          wasReduced = false;
          dirty = true;
        }
        if (brushStep(brush, dt * (latest.current.slow ? 0.25 : 1), REVEAL_DEFAULTS)) dirty = true;
      }
      if (dirty || pending) {
        draw();
        drawn = true;
        pending = false;
      }
      raf = requestAnimationFrame(tick);
    };
    let pending = false;
    raf = requestAnimationFrame(tick);

    const local = (ev: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((ev.clientX - rect.left) / rect.width) * REVEAL_W,
        y: ((ev.clientY - rect.top) / rect.height) * REVEAL_H,
      };
    };
    const down = (ev: PointerEvent) => {
      if (latest.current.reduced) return;
      const p = local(ev);
      brushDown(brush, p.x, p.y, ev.timeStamp, REVEAL_DEFAULTS);
      pending = true;
      canvas.setPointerCapture(ev.pointerId);
    };
    const move = (ev: PointerEvent) => {
      if (!brush.down) return;
      const p = local(ev);
      brushMove(brush, p.x, p.y, ev.timeStamp, REVEAL_DEFAULTS);
      pending = true;
    };
    const up = () => {
      brushRelease(brush);
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
    };
  }, []);

  return (
    <div className={styles.stage}>
      <canvas ref={canvasRef} className={styles.canvas} style={{ width: REVEAL_W, height: REVEAL_H }} role="img" aria-label="Code Reveal web preview: drag across a sunset picture and it turns into glyphs under your finger, then fades back" />
      <div className={styles.row}>
        <button type="button" className={color ? styles.chipPrimary : styles.chip} onClick={() => setColor((v) => !v)} aria-pressed={color}>Color glyphs: {color ? "on" : "off"}</button>
        <button type="button" className={slow ? styles.chipPrimary : styles.chip} onClick={() => setSlow((v) => !v)} aria-pressed={slow}>Slow motion: {slow ? "on" : "off"}</button>
      </div>
      <p className={styles.hint}>Drag across the picture. Move faster for a bigger brush.</p>
    </div>
  );
}
