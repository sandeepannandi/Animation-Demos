"use client";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  COIN_DEFAULTS, coinAxes, createCoin, restCoin, stepCoinFixed,
  type CoinPointer,
} from "../../packages/ui/src/components/coin/coinMath";
import {
  COIN_BACKDROP_BOTTOM, COIN_BACKDROP_TOP, COIN_CAMERA, COIN_CENTER_X, COIN_CENTER_Y, COIN_H, COIN_METAL,
  COIN_PX_PER_UNIT, COIN_W,
} from "../../packages/ui/src/components/coin/coinDesign";
import { COIN_SHADER } from "../../packages/ui/src/components/coin/coinShader";
import styles from "./coin.module.css";

const PRELUDE = `precision highp float;
#define float2 vec2
#define float3 vec3
#define float4 vec4
uniform float uScale;
uniform float uHeight;
`;
const FRAGMENT = `${PRELUDE}${COIN_SHADER}
void main() {
  gl_FragColor = coinColor(vec2(gl_FragCoord.x, uHeight - gl_FragCoord.y) / uScale);
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

export function CoinPreview() {
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
    canvas.width = Math.round(COIN_W * dpr);
    canvas.height = Math.round(COIN_H * dpr);
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
    gl.uniform2f(u("size"), COIN_W, COIN_H);
    gl.uniform2f(u("center"), COIN_CENTER_X, COIN_CENTER_Y);
    gl.uniform1f(u("ppu"), COIN_PX_PER_UNIT);
    gl.uniform1f(u("camD"), COIN_CAMERA);
    gl.uniform3f(u("metal"), COIN_METAL[0], COIN_METAL[1], COIN_METAL[2]);
    gl.uniform3f(u("bgTop"), COIN_BACKDROP_TOP[0], COIN_BACKDROP_TOP[1], COIN_BACKDROP_TOP[2]);
    gl.uniform3f(u("bgBottom"), COIN_BACKDROP_BOTTOM[0], COIN_BACKDROP_BOTTOM[1], COIN_BACKDROP_BOTTOM[2]);
    const uAx = u("ax");
    const uAy = u("ay");
    const uAz = u("az");

    const sim = createCoin(COIN_DEFAULTS);
    const pointer: CoinPointer = { x: 0, y: 0, active: 0 };
    const axes = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    let wasReduced = false;
    let raf = 0;
    let last = 0;

    const draw = () => {
      coinAxes(sim, axes);
      gl.uniform3f(uAx, axes[0], axes[1], axes[2]);
      gl.uniform3f(uAy, axes[3], axes[4], axes[5]);
      gl.uniform3f(uAz, axes[6], axes[7], axes[8]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    const tick = (now: number) => {
      const dt = last ? Math.min(48, now - last) / 1000 : 1 / 60;
      last = now;
      if (latest.current.reduced) {
        if (!wasReduced) {
          pointer.active = 0;
          restCoin(sim, 0.7);
          wasReduced = true;
        }
      } else {
        if (wasReduced) {
          Object.assign(sim, createCoin(COIN_DEFAULTS));
          wasReduced = false;
        }
        stepCoinFixed(sim, dt * (latest.current.slow ? 0.25 : 1), pointer, COIN_DEFAULTS);
      }
      draw();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const local = (ev: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((ev.clientX - rect.left) / rect.width) * COIN_W;
      const y = ((ev.clientY - rect.top) / rect.height) * COIN_H;
      return { x: (x - COIN_CENTER_X) / COIN_PX_PER_UNIT, y: -(y - COIN_CENTER_Y) / COIN_PX_PER_UNIT };
    };
    const down = (ev: PointerEvent) => {
      if (latest.current.reduced) return;
      const p = local(ev);
      pointer.x = p.x;
      pointer.y = p.y;
      pointer.active = 1;
      canvas.setPointerCapture(ev.pointerId);
    };
    const move = (ev: PointerEvent) => {
      if (!pointer.active) return;
      const p = local(ev);
      pointer.x = p.x;
      pointer.y = p.y;
    };
    const up = () => {
      pointer.active = 0;
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
      <canvas ref={canvasRef} className={styles.canvas} style={{ width: COIN_W, height: COIN_H }} role="img" aria-label="Coin web preview: a metal coin you can grab and flick, spinning and wobbling in space" />
      <div className={styles.row}>
        <button type="button" className={slow ? styles.chipPrimary : styles.chip} onClick={() => setSlow((v) => !v)} aria-pressed={slow}>Slow motion: {slow ? "on" : "off"}</button>
      </div>
      <p className={styles.hint}>Grab the coin and flick it. It spins and wobbles on its own.</p>
    </div>
  );
}
