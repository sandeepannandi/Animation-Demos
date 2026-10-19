"use client";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  PRISM_DEFAULTS, createPrism, prismDown, prismMove, prismRelease, prismStep, prismVertices, tracePrism,
} from "../../packages/ui/src/components/prism/prismMath";
import { BEAM_W, BEAM_Y, PRISM_H, PRISM_REST_X, PRISM_REST_Y, PRISM_SIDE, PRISM_W } from "../../packages/ui/src/components/prism/prismDesign";
import { PRISM_SHADER } from "../../packages/ui/src/components/prism/prismShader";
import styles from "./prism.module.css";

const PRELUDE = `precision highp float;
#define float2 vec2
#define float3 vec3
#define float4 vec4
uniform float uScale;
uniform float uHeight;
`;
const FRAGMENT = `${PRELUDE}${PRISM_SHADER}
void main() {
  gl_FragColor = vec4(prismColor(vec2(gl_FragCoord.x, uHeight - gl_FragCoord.y) / uScale), 1.0);
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

export function PrismPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mono, setMono] = useState(false);
  const systemReduce = useReducedMotion();
  const latest = useRef({ mono, reduced: !!systemReduce });
  latest.current = { mono, reduced: !!systemReduce };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false });
    if (!gl) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(PRISM_W * dpr);
    canvas.height = Math.round(PRISM_H * dpr);
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
    gl.uniform2f(u("size"), PRISM_W, PRISM_H);
    gl.uniform2f(u("beam"), BEAM_Y, BEAM_W);

    const st = createPrism(PRISM_REST_X, PRISM_REST_Y);
    let reducedApplied = false;
    let raf = 0;
    let last = 0;
    let drawn = false;
    let drawnMono = latest.current.mono;

    const draw = () => {
      const t = tracePrism(0, BEAM_Y, 1, 0, st.x, st.y, st.tilt, PRISM_SIDE, latest.current.mono);
      const v = prismVertices(st.x, st.y, st.tilt, PRISM_SIDE);
      const lut = t.lut.length === 16 ? t.lut : new Array(16).fill(550);
      const seg = t.internal;
      gl.uniform4f(u("triA"), v[0], v[1], v[2], v[3]);
      gl.uniform2f(u("triC"), v[4], v[5]);
      if (t.hit) gl.uniform4f(u("incident"), 0, BEAM_Y, t.entryX, t.entryY);
      else gl.uniform4f(u("incident"), 0, BEAM_Y, PRISM_W, BEAM_Y);
      gl.uniform4f(u("seg1"), seg[0] ?? 0, seg[1] ?? 0, seg[2] ?? 0, seg[3] ?? 0);
      gl.uniform4f(u("seg2"), seg[2] ?? 0, seg[3] ?? 0, seg[4] ?? 0, seg[5] ?? 0);
      gl.uniform2f(u("meta"), Math.max(0, seg.length / 2 - 1), t.hit ? 1 : 0);
      gl.uniform4f(u("refl"), t.entryX, t.entryY, t.reflX, t.reflY);
      gl.uniform4f(u("fan"), t.fanX, t.fanY, t.phi0, t.phi1);
      gl.uniform2f(u("fanRef"), t.refDX, t.refDY);
      gl.uniform2f(u("fanCfg"), t.fanOn ? 1 : 0, t.mono ? 1 : 0);
      gl.uniform4f(u("lut0"), lut[0], lut[1], lut[2], lut[3]);
      gl.uniform4f(u("lut1"), lut[4], lut[5], lut[6], lut[7]);
      gl.uniform4f(u("lut2"), lut[8], lut[9], lut[10], lut[11]);
      gl.uniform4f(u("lut3"), lut[12], lut[13], lut[14], lut[15]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    const tick = (now: number) => {
      const dt = last ? Math.min(48, now - last) / 1000 : 1 / 60;
      last = now;
      let dirty = !drawn;
      if (drawnMono !== latest.current.mono) {
        drawnMono = latest.current.mono;
        dirty = true;
      }
      if (latest.current.reduced) {
        if (!reducedApplied) {
          Object.assign(st, createPrism(PRISM_REST_X, BEAM_Y));
          reducedApplied = true;
          dirty = true;
        }
      } else {
        if (reducedApplied) {
          Object.assign(st, createPrism(PRISM_REST_X, PRISM_REST_Y));
          reducedApplied = false;
        }
        if (prismStep(st, dt, PRISM_DEFAULTS)) dirty = true;
      }
      if (dirty) {
        draw();
        drawn = true;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const local = (ev: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((ev.clientX - rect.left) / rect.width) * PRISM_W,
        y: ((ev.clientY - rect.top) / rect.height) * PRISM_H,
      };
    };
    const down = (ev: PointerEvent) => {
      if (latest.current.reduced) return;
      const p = local(ev);
      prismDown(st, p.x, p.y);
      canvas.setPointerCapture(ev.pointerId);
    };
    const move = (ev: PointerEvent) => {
      if (!st.down) return;
      const p = local(ev);
      prismMove(st, p.x, p.y);
    };
    const up = () => {
      prismRelease(st);
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
      <canvas ref={canvasRef} className={styles.canvas} style={{ width: PRISM_W, height: PRISM_H }} role="img" aria-label="Prism web preview: drag the glass prism into the beam of white light and it splits into a rainbow on the screen" />
      <div className={styles.row}>
        <button type="button" className={mono ? styles.chipPrimary : styles.chip} onClick={() => setMono((v) => !v)} aria-pressed={mono}>Light: {mono ? "sodium 589 nm" : "white"}</button>
      </div>
      <p className={styles.hint}>Drag the prism into the beam. White light splits; a single colour only bends.</p>
    </div>
  );
}
