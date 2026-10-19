"use client";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { FERRO_DEFAULTS, createFerro, ferroDown, ferroMove, ferroRelease, ferroStep } from "../../packages/ui/src/components/ferrofluid/ferroMath";
import { FERRO_H, FERRO_W } from "../../packages/ui/src/components/ferrofluid/ferroDesign";
import { FERRO_SHADER } from "../../packages/ui/src/components/ferrofluid/ferroShader";
import styles from "./ferrofluid.module.css";

const PRELUDE = `precision highp float;
#define float2 vec2
#define float3 vec3
#define float4 vec4
uniform float uScale;
uniform float uHeight;
`;
const FRAGMENT = `${PRELUDE}${FERRO_SHADER}
void main() {
  gl_FragColor = vec4(ferrofluidColor(vec2(gl_FragCoord.x, uHeight - gl_FragCoord.y) / uScale), 1.0);
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

export function FerrofluidPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [slow, setSlow] = useState(false);
  const systemReduce = useReducedMotion();
  const latest = useRef({ slow, reduced: !!systemReduce });
  latest.current = { slow, reduced: !!systemReduce };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false });
    if (!gl) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(FERRO_W * dpr);
    canvas.height = Math.round(FERRO_H * dpr);
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
    gl.uniform2f(u("size"), FERRO_W, FERRO_H);
    const uMag = u("mag");

    const st = createFerro(FERRO_W / 2, FERRO_H * 0.5);
    let reducedApplied = false;
    let raf = 0;
    let last = 0;
    let drawn = false;
    let pending = false;

    const draw = () => {
      gl.uniform4f(uMag, st.mx, st.my, st.s, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    const tick = (now: number) => {
      const dt = last ? Math.min(48, now - last) / 1000 : 1 / 60;
      last = now;
      let dirty = !drawn || pending;
      if (latest.current.reduced) {
        if (!reducedApplied) {
          Object.assign(st, createFerro(FERRO_W / 2, FERRO_H * 0.5));
          st.s = 1;
          reducedApplied = true;
          dirty = true;
        }
      } else {
        if (reducedApplied) {
          Object.assign(st, createFerro(FERRO_W / 2, FERRO_H * 0.5));
          reducedApplied = false;
          dirty = true;
        }
        if (ferroStep(st, dt * (latest.current.slow ? 0.25 : 1), FERRO_DEFAULTS)) dirty = true;
      }
      if (dirty) {
        draw();
        drawn = true;
        pending = false;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const local = (ev: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((ev.clientX - rect.left) / rect.width) * FERRO_W,
        y: ((ev.clientY - rect.top) / rect.height) * FERRO_H,
      };
    };
    const down = (ev: PointerEvent) => {
      if (latest.current.reduced) return;
      const p = local(ev);
      ferroDown(st, p.x, p.y);
      pending = true;
      canvas.setPointerCapture(ev.pointerId);
    };
    const move = (ev: PointerEvent) => {
      if (!st.down) return;
      const p = local(ev);
      ferroMove(st, p.x, p.y);
      pending = true;
    };
    const up = () => {
      ferroRelease(st);
      pending = true;
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
      <canvas ref={canvasRef} className={styles.canvas} style={{ width: FERRO_W, height: FERRO_H }} role="img" aria-label="Ferrofluid web preview: press and hold on the black liquid and spikes grow toward your finger like a magnet under the dish" />
      <div className={styles.row}>
        <button type="button" className={slow ? styles.chipPrimary : styles.chip} onClick={() => setSlow((v) => !v)} aria-pressed={slow}>Slow motion: {slow ? "on" : "off"}</button>
      </div>
      <p className={styles.hint}>Press and hold, then drag. A magnet under the dish follows your finger.</p>
    </div>
  );
}
