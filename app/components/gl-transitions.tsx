"use client";
import { useEffect, useRef, useState } from "react";
import {
  clamp,
  dragScroll,
  effectForTransition,
  EFFECT_LABELS,
  snapTarget,
  springConfig,
} from "../../packages/ui/src/components/gl-transitions/transitionMath";
import { SCENES, ridgePath, type Scene } from "../../packages/ui/src/components/gl-transitions/scenes";
import styles from "./gl-transitions.module.css";

const BOX_W = 340,
  CANVAS_H = 340,
  RADIUS = 16,
  S = 2;

// The same landscapes as the native Example, painted with Canvas 2D.
function paintScene(scene: Scene) {
  const canvas = document.createElement("canvas");
  canvas.width = BOX_W * S;
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

// The four transition shaders, ported line for line from transitionShaders.ts to WebGL GLSL.
// Each mixes two page textures on a scrubbed 0..1 progress and is exact at both ends.
const FRAGMENTS: Record<string, string> = {
  ripple: `
    vec2 uv = tex;
    float aspect = ${(BOX_W / CANVAS_H).toFixed(4)};
    vec2 d = uv - touch; d.x *= aspect;
    float dist = length(d);
    float maxR = length(vec2(aspect, 1.0)) + 0.08;
    float e = progress * progress * (3.0 - 2.0 * progress);
    float r = e * maxR;
    float edge = 0.09;
    float m = smoothstep(r, r - edge, dist);
    vec4 a = texture2D(fromI, tex);
    vec4 b = texture2D(toI, tex);
    float ring = exp(-4.0 * pow((dist - r) / edge, 2.0));
    vec4 c = mix(a, b, m);
    gl_FragColor = vec4(c.rgb + ring * 0.22 * (1.0 - abs(2.0 * progress - 1.0)) * vec3(0.95, 0.85, 1.0), c.a);`,
  slices: `
    float i = floor(tex.x * 7.0);
    float local = clamp((progress - i * 0.07) / (1.0 - 0.07 * 6.0), 0.0, 1.0);
    local = local * local * (3.0 - 2.0 * local);
    vec2 shift = vec2((1.0 - local) * 0.30 * dir, (mod(i, 2.0) - 0.5) * (1.0 - local) * 0.10);
    vec4 a = texture2D(fromI, tex);
    vec4 b = texture2D(toI, tex + shift);
    gl_FragColor = mix(a, b, local);`,
  zoom: `
    vec2 c = vec2(0.5);
    vec2 pa = c + (tex - c) * (1.0 - 0.18 * progress);
    vec4 a = texture2D(fromI, pa);
    vec2 pb = c + (tex - c) * (1.18 - 0.18 * progress);
    vec2 d = tex - c;
    float split = sin(progress * 3.14159265) * 0.012;
    float r = texture2D(toI, pb - d * split).r;
    vec4 b = texture2D(toI, pb);
    float bl = texture2D(toI, pb + d * split).b;
    float m = smoothstep(0.2, 0.8, progress);
    gl_FragColor = mix(a, vec4(r, b.g, bl, b.a), m);`,
  vortex: `
    vec2 c = vec2(0.5);
    vec2 d = tex - c;
    float dist = length(d) / 0.7071;
    float ta = progress * 5.0 * exp(-2.5 * dist);
    vec2 ra = vec2(d.x * cos(ta) - d.y * sin(ta), d.x * sin(ta) + d.y * cos(ta));
    vec4 a = texture2D(fromI, c + ra * (1.0 + progress * 0.35));
    float tb = (1.0 - progress) * -5.0 * exp(-2.5 * dist);
    vec2 rb = vec2(d.x * cos(tb) - d.y * sin(tb), d.x * sin(tb) + d.y * cos(tb));
    vec4 b = texture2D(toI, c + rb * (1.0 + (1.0 - progress) * 0.35));
    float m = smoothstep(0.25, 0.75, progress);
    gl_FragColor = mix(a, b, m);`,
  wave: `
    float amp = 0.06;
    float wob = sin(tex.y * 14.0 + progress * 5.0);
    float edge = progress * (1.0 + 2.0 * amp) - amp + amp * wob;
    float m = smoothstep(edge + 0.04, edge - 0.04, tex.x);
    float bend = (1.0 - abs(2.0 * progress - 1.0)) * 0.05 * wob;
    vec4 a = texture2D(fromI, tex + vec2(bend, 0.0));
    vec4 b = texture2D(toI, tex + vec2(bend * 0.5, 0.0));
    gl_FragColor = mix(a, b, m);`,
  melt: `
    float col = floor(tex.x * 24.0);
    float rnd = fract(sin(col * 12.9898) * 43758.5453);
    float local = clamp((progress - rnd * 0.45) / 0.55, 0.0, 1.0);
    local = local * local * (3.0 - 2.0 * local);
    vec4 b = texture2D(toI, tex);
    vec4 a = texture2D(fromI, tex + vec2(0.0, local * 0.5));
    gl_FragColor = mix(b, a, 1.0 - local);`,
};

export function GLTransitionsPreview() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const scroll = useRef(0),
    speed = useRef(0),
    goal = useRef(0),
    spring = useRef(false),
    dir = useRef(1),
    touch = useRef<[number, number]>([0.5, 0.5]);
  const [index, setIndex] = useState(0);
  const [slow, setSlow] = useState(false),
    [reduce, setReduce] = useState(false),
    [error, setError] = useState(false);
  // Reduce follows the OS setting only; there is no demo toggle.
  const latest = useRef({ slow, reduce });
  latest.current = { slow, reduce };
  const drag = useRef<{ id: number; x: number; start: number; lastX: number; at: number; v: number } | null>(null);
  const last = SCENES.length - 1;

  function settle(to: number, vPages = 0) {
    goal.current = clamp(Math.round(to), 0, last);
    setIndex(goal.current);
    if (vPages !== 0) dir.current = vPages > 0 ? 1 : -1;
    if (latest.current.reduce) {
      scroll.current = goal.current;
      spring.current = false;
      return;
    }
    speed.current = vPages; // pages per second; the integrator below works in page units
    spring.current = true;
  }
  function go(to: number) {
    dir.current = to > goal.current ? 1 : -1;
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
    const programs: Record<string, WebGLProgram> = {};
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
      // One program per effect, each ending in the same rounded-corner mask over the page quad.
      for (const [name, body] of Object.entries(FRAGMENTS)) {
        const fs = shader(
          gl.FRAGMENT_SHADER,
          `precision mediump float;
           varying vec2 tex;
           uniform sampler2D fromI;
           uniform sampler2D toI;
           uniform float progress;
           uniform vec2 touch;
           uniform float dir;
           void main(){
             vec2 half_ = vec2(${(BOX_W / 2).toFixed(1)}, ${(CANVAS_H / 2).toFixed(1)});
             vec2 q = abs(tex - 0.5) * 2.0 * half_ - (half_ - ${RADIUS.toFixed(1)});
             float outside = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - ${RADIUS.toFixed(1)};
             float mask = 1.0 - smoothstep(-1.0, 1.0, outside);
             if (mask <= 0.0) { gl_FragColor = vec4(0.0); return; }
             ${body}
             gl_FragColor = vec4(gl_FragColor.rgb * mask, gl_FragColor.a * mask);
           }`,
        );
        const program = gl.createProgram();
        if (!program) throw Error("Unable to create program");
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program) || "Program failed");
        programs[name] = program;
      }
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      const posB = gl.createBuffer()!,
        uvB = gl.createBuffer()!;
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
        lastT = performance.now();
      const draw = (now: number) => {
        const dt = Math.min(0.032, (now - lastT) / 1000);
        lastT = now;
        if (spring.current && !drag.current) {
          // The same spring the native component runs: stiffness 320, damping 26, stretched in time by 4 for slow motion.
          const cfg = springConfig(latest.current.slow);
          const sub = 4;
          let x = scroll.current,
            v = speed.current;
          for (let i = 0; i < sub; i++) {
            const h = dt / sub;
            const a = -cfg.stiffness * (x - goal.current) - cfg.damping * v;
            v += a * h;
            x += v * h;
          }
          scroll.current = x;
          speed.current = v;
          if (Math.abs(x - goal.current) < 0.001 && Math.abs(v) < 0.01) {
            scroll.current = goal.current;
            speed.current = 0;
            spring.current = false;
          }
        }
        const s = clamp(scroll.current, 0, last);
        const from = Math.min(Math.floor(s), Math.max(0, last - 1));
        const to = Math.min(from + 1, last);
        const progress = last === 0 ? 0 : clamp(s - from, 0, 1);
        const name = effectForTransition(from);
        const program = programs[name]!;
        gl.useProgram(program);
        gl.viewport(0, 0, el.width, el.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, textures[from]);
        gl.uniform1i(gl.getUniformLocation(program, "fromI"), 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, textures[to]);
        gl.uniform1i(gl.getUniformLocation(program, "toI"), 1);
        gl.uniform1f(gl.getUniformLocation(program, "progress"), progress);
        gl.uniform2f(gl.getUniformLocation(program, "touch"), touch.current[0], touch.current[1]);
        gl.uniform1f(gl.getUniformLocation(program, "dir"), dir.current);
        gl.bindBuffer(gl.ARRAY_BUFFER, posB);
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array([0, 0, BOX_W, 0, 0, CANVAS_H, BOX_W, 0, BOX_W, CANVAS_H, 0, CANVAS_H]),
          gl.DYNAMIC_DRAW,
        );
        const posLoc = gl.getAttribLocation(program, "pos");
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, uvB);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1]), gl.DYNAMIC_DRAW);
        const uvLoc = gl.getAttribLocation(program, "uv");
        gl.enableVertexAttribArray(uvLoc);
        gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        frame = requestAnimationFrame(draw);
      };
      frame = requestAnimationFrame(draw);
      return () => {
        cancelAnimationFrame(frame);
        media.removeEventListener("change", onMedia);
        textures.forEach((t) => gl.deleteTexture(t));
        [posB, uvB].forEach((b) => gl.deleteBuffer(b));
        Object.values(programs).forEach((p) => gl.deleteProgram(p));
        shaders.forEach((s) => gl.deleteShader(s));
      };
    } catch {
      Object.values(programs).forEach((p) => gl.deleteProgram(p));
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
            const rect = e.currentTarget.getBoundingClientRect();
            touch.current = [
              clamp((e.clientX - rect.left) / Math.max(1, rect.width)),
              clamp((e.clientY - rect.top) / Math.max(1, rect.height)),
            ];
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
            const next = dragScroll(d.start, (e.clientX - d.x) / scale, BOX_W, last);
            if (next !== scroll.current) dir.current = next > scroll.current ? 1 : -1;
            scroll.current = next;
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
            const vPages = (-v * 1000) / scale / BOX_W;
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
            {index < last ? ` · next: ${EFFECT_LABELS[effectForTransition(index)]}` : ""}
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
      </div>
      <p className={styles.hint}>Drag slowly to scrub the transition, flick to fly through. Each hop plays the next effect.</p>
    </div>
  );
}
