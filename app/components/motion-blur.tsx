"use client";
import { useEffect, useRef, useState } from "react";
import {
  blurSpan,
  clamp,
  dragScroll,
  fringeSpan,
  snapTarget,
  springConfig,
} from "../../packages/ui/src/components/motion-blur/motionMath";
import { SCENES, ridgePath, type Scene } from "../../packages/ui/src/components/motion-blur/scenes";
import styles from "./motion-blur.module.css";

const BOX_W = 340,
  CANVAS_H = 340,
  PAGE_W = 300,
  GAP = 20,
  STRIDE = PAGE_W + GAP,
  RADIUS = 16,
  MAX_BLUR = 44,
  S = 2;

// The same landscapes as the native Example, painted with Canvas 2D.
function paintScene(scene: Scene) {
  const canvas = document.createElement("canvas");
  canvas.width = PAGE_W * S;
  canvas.height = CANVAS_H * S;
  const c = canvas.getContext("2d")!;
  const sky = c.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, scene.sky[0]);
  sky.addColorStop(1, scene.sky[1]);
  c.fillStyle = sky;
  c.fillRect(0, 0, canvas.width, canvas.height);
  c.fillStyle = scene.body.halo;
  c.beginPath();
  c.arc(scene.body.x * canvas.width, scene.body.y * canvas.height, scene.body.r * canvas.width * 1.9, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = scene.body.color;
  c.beginPath();
  c.arc(scene.body.x * canvas.width, scene.body.y * canvas.height, scene.body.r * canvas.width, 0, Math.PI * 2);
  c.fill();
  for (const ridge of scene.ridges) {
    const pts = ridgePath(ridge, canvas.width, canvas.height);
    c.fillStyle = ridge.color;
    c.beginPath();
    c.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i].y);
    c.closePath();
    c.fill();
  }
  return canvas;
}

export function MotionBlurPreview() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const scroll = useRef(0),
    speed = useRef(0),
    goal = useRef(0),
    spring = useRef(false);
  const [index, setIndex] = useState(0);
  const [slow, setSlow] = useState(false),
    [reduce, setReduce] = useState(false),
    [error, setError] = useState(false);
  const latest = useRef({ slow, reduce });
  latest.current = { slow, reduce };
  const drag = useRef<{ id: number; x: number; start: number; lastX: number; at: number; v: number } | null>(null);
  const last = SCENES.length - 1;

  function settle(to: number, vPages = 0) {
    goal.current = clamp(Math.round(to), 0, last);
    setIndex(goal.current);
    if (latest.current.reduce) {
      scroll.current = goal.current;
      spring.current = false;
      return;
    }
    speed.current = vPages * STRIDE; // the spring integrator reads speed in px/s of scroll*stride
    spring.current = true;
  }
  function go(to: number) {
    settle(clamp(Math.round(to), 0, last));
  }

  useEffect(() => {
    const el = canvas.current!,
      gl = el.getContext("webgl", { alpha: true, antialias: true, premultipliedAlpha: true });
    if (!gl) {
      setError(true);
      return;
    }
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(media.matches);
    const onMedia = () => setReduce(media.matches);
    media.addEventListener("change", onMedia);
    const shaders: WebGLShader[] = [];
    let program: WebGLProgram | null = null;
    const shader = (kind: number, source: string) => {
      const s = gl.createShader(kind);
      if (!s) throw Error("Unable to create shader");
      shaders.push(s);
      gl.shaderSource(s, source);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(s) || "Shader failed");
      return s;
    };
    try {
      const vs = shader(
        gl.VERTEX_SHADER,
        `attribute vec2 pos; attribute vec2 uv; varying vec2 tex;
         void main(){ gl_Position = vec4(pos.x / ${(BOX_W / 2).toFixed(1)} - 1.0, 1.0 - pos.y / ${(CANVAS_H / 2).toFixed(1)}, 0.0, 1.0); tex = uv; }`,
      );
      // The same blur as blurShader.ts: 12 tent-weighted taps along the motion vector plus a red/blue
      // split, in WebGL GLSL. Rounded corners come from a signed-distance mask over the page quad.
      const fs = shader(
        gl.FRAGMENT_SHADER,
        `precision mediump float;
         varying vec2 tex;
         uniform sampler2D image;
         uniform vec2 off;
         uniform vec2 fr;
         uniform float span;
         void main(){
           vec2 half_ = vec2(${(PAGE_W / 2).toFixed(1)}, ${(CANVAS_H / 2).toFixed(1)});
           vec2 q = abs(tex - 0.5) * 2.0 * half_ - (half_ - ${RADIUS.toFixed(1)});
           float outside = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - ${RADIUS.toFixed(1)};
           float mask = 1.0 - smoothstep(-1.0, 1.0, outside);
           if (mask <= 0.0) { gl_FragColor = vec4(0.0); return; }
           vec4 c0;
           if (span < 0.75) { c0 = texture2D(image, tex); }
           else {
             vec4 acc = vec4(0.0); float wsum = 0.0;
             for (int i = 0; i < 12; i++) {
               float t = float(i) / 11.0 - 0.5;
               float w = 1.0 - 2.0 * abs(t);
               vec2 at = tex + off * t;
               vec4 c = texture2D(image, at);
               float r = texture2D(image, at + fr).r;
               float b = texture2D(image, at - fr).b;
               acc += vec4(r, c.g, b, c.a) * w;
               wsum += w;
             }
             c0 = acc / wsum;
           }
           gl_FragColor = vec4(c0.rgb * mask, c0.a * mask);
         }`,
      );
      program = gl.createProgram();
      if (!program) throw Error("Unable to create program");
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program) || "Program failed");
      gl.useProgram(program);
      const posB = gl.createBuffer()!,
        uvB = gl.createBuffer()!;
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      const uImage = gl.getUniformLocation(program, "image"),
        uOff = gl.getUniformLocation(program, "off"),
        uFr = gl.getUniformLocation(program, "fr"),
        uSpan = gl.getUniformLocation(program, "span");
      gl.uniform1i(uImage, 0);
      const textures = SCENES.map((scene) => {
        const tex = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, paintScene(scene));
        return tex;
      });
      let frame = 0,
        lastT = performance.now(),
        prevScroll = scroll.current;
      const draw = (now: number) => {
        const dt = Math.min(0.032, (now - lastT) / 1000);
        lastT = now;
        if (spring.current && !drag.current) {
          // The same spring the native component runs: stiffness 320, damping 26, stretched in time by 4 for slow motion.
          const cfg = springConfig(latest.current.slow);
          const sub = 4;
          let x = scroll.current,
            v = speed.current / STRIDE;
          for (let i = 0; i < sub; i++) {
            const h = dt / sub;
            const a = -cfg.stiffness * (x - goal.current) - cfg.damping * v;
            v += a * h;
            x += v * h;
          }
          scroll.current = x;
          speed.current = v * STRIDE;
          if (Math.abs(x - goal.current) < 0.001 && Math.abs(v) < 0.01) {
            scroll.current = goal.current;
            speed.current = 0;
            spring.current = false;
          }
        } else if (drag.current) {
          // While dragging, derive speed from scroll changes for the blur.
          const v = dt > 0 ? ((scroll.current - prevScroll) / dt) * STRIDE : 0;
          speed.current += (v - speed.current) * (1 - Math.exp(-(dt * 1000) / 80));
        } else {
          speed.current *= Math.exp(-dt * 6);
        }
        prevScroll = scroll.current;
        const span = latest.current.reduce ? 0 : blurSpan(speed.current, MAX_BLUR);
        const fringe = latest.current.reduce ? 0 : fringeSpan(span);
        const dirX = speed.current >= 0 ? -1 : 1;
        gl.viewport(0, 0, el.width, el.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        for (let i = 0; i < SCENES.length; i++) {
          const x0 = BOX_W / 2 - PAGE_W / 2 + (i - scroll.current) * STRIDE;
          if (x0 > BOX_W || x0 + PAGE_W < 0) continue;
          gl.bindTexture(gl.TEXTURE_2D, textures[i]);
          gl.uniform2f(uOff, (dirX * span) / PAGE_W, 0);
          gl.uniform2f(uFr, (dirX * fringe * 0.5) / PAGE_W, 0);
          gl.uniform1f(uSpan, span);
          gl.bindBuffer(gl.ARRAY_BUFFER, posB);
          gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([x0, 0, x0 + PAGE_W, 0, x0, CANVAS_H, x0 + PAGE_W, 0, x0 + PAGE_W, CANVAS_H, x0, CANVAS_H]),
            gl.DYNAMIC_DRAW,
          );
          const posLoc = gl.getAttribLocation(program!, "pos");
          gl.enableVertexAttribArray(posLoc);
          gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
          gl.bindBuffer(gl.ARRAY_BUFFER, uvB);
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1]), gl.DYNAMIC_DRAW);
          const uvLoc = gl.getAttribLocation(program!, "uv");
          gl.enableVertexAttribArray(uvLoc);
          gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
        }
        frame = requestAnimationFrame(draw);
      };
      frame = requestAnimationFrame(draw);
      return () => {
        cancelAnimationFrame(frame);
        media.removeEventListener("change", onMedia);
        textures.forEach((t) => gl.deleteTexture(t));
        [posB, uvB].forEach((b) => gl.deleteBuffer(b));
        gl.deleteProgram(program);
        shaders.forEach((s) => gl.deleteShader(s));
      };
    } catch {
      if (program) gl.deleteProgram(program);
      shaders.forEach((s) => gl.deleteShader(s));
      setError(true);
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.wrap}>
      <div className={styles.stage}>
        <canvas
          ref={canvas}
          width={BOX_W * S}
          height={CANVAS_H * S}
          className={styles.canvas}
          role="slider"
          aria-label="Landscape gallery"
          aria-valuemin={1}
          aria-valuemax={SCENES.length}
          aria-valuenow={index + 1}
          aria-valuetext={`${SCENES[index].title}, ${index + 1} of ${SCENES.length}`}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") {
              e.preventDefault();
              go(index + 1);
            } else if (e.key === "ArrowLeft") {
              e.preventDefault();
              go(index - 1);
            }
          }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            spring.current = false;
            drag.current = { id: e.pointerId, x: e.clientX, start: scroll.current, lastX: e.clientX, at: performance.now(), v: 0 };
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d || d.id !== e.pointerId) return;
            const now = performance.now();
            d.v = (e.clientX - d.lastX) / Math.max(1, now - d.at);
            d.lastX = e.clientX;
            d.at = now;
            const scale = e.currentTarget.getBoundingClientRect().width / BOX_W;
            scroll.current = dragScroll(d.start, (e.clientX - d.x) / scale, STRIDE, last);
          }}
          onPointerUp={(e) => {
            const d = drag.current;
            if (!d || d.id !== e.pointerId) return;
            const v = performance.now() - d.at > 100 ? 0 : d.v;
            drag.current = null;
            const scale = e.currentTarget.getBoundingClientRect().width / BOX_W;
            const tap = Math.abs(e.clientX - d.x) < 6 && Math.abs(v) < 0.15;
            if (tap) {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = (e.clientX - rect.left) / scale;
              const third = BOX_W / 3;
              go(x < third ? goal.current - 1 : x > third * 2 ? goal.current + 1 : goal.current);
              return;
            }
            const vPages = (-v * 1000) / scale / STRIDE;
            settle(snapTarget(scroll.current, vPages, last), vPages);
          }}
          onPointerCancel={() => {
            drag.current = null;
            settle(goal.current);
          }}
          onLostPointerCapture={() => {
            if (drag.current) {
              drag.current = null;
              settle(goal.current);
            }
          }}
        />
        <div className={styles.caption}>
          <p className={styles.title}>{SCENES[index].title}</p>
          <p className={styles.count} aria-live="polite">
            {index + 1} of {SCENES.length}
          </p>
        </div>
        <div className={styles.dots}>
          {SCENES.map((s, i) => (
            <button key={s.title} className={styles.dot} aria-label={`Go to ${s.title}`} aria-current={i === index} onClick={() => go(i)} />
          ))}
        </div>
      </div>
      {error ? <p className={styles.hint}>This preview needs WebGL.</p> : null}
      <div className={styles.row}>
        <button className={styles.button} onClick={() => go(index - 1)}>
          ← Prev
        </button>
        <button className={styles.button} onClick={() => go(index + 1)}>
          Next →
        </button>
      </div>
      <div className={styles.row}>
        <button className={styles.chip} aria-pressed={slow} onClick={() => setSlow(!slow)}>
          Slow motion: {slow ? "on" : "off"}
        </button>
        <button className={styles.chip} aria-pressed={reduce} onClick={() => setReduce(!reduce)}>
          Reduce motion: {reduce ? "on" : "off"}
        </button>
      </div>
      <p className={styles.hint}>Flick fast and the scenery streaks. Grab it mid-flight to stop it.</p>
    </div>
  );
}
