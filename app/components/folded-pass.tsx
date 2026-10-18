"use client";
import { useEffect, useRef, useState } from "react";
import {
  PANELS,
  atlasUV,
  foldMesh,
  makeFoldGrid,
  releaseTarget,
  scrub,
} from "../../packages/ui/src/components/folded-pass/foldMath";
import { PASS_H, PASS_W, passDesign, type Item } from "../../packages/ui/src/components/folded-pass/passDesign";
import styles from "./folded-pass.module.css";

const BOX_W = 340,
  BOX_H = 430,
  PASS_X = (BOX_W - PASS_W) / 2,
  PASS_Y = 28,
  S = 2;

function drawAtlas(checkedIn: boolean) {
  const design = passDesign(checkedIn);
  const canvas = document.createElement("canvas");
  canvas.width = PASS_W * S * 2;
  canvas.height = PASS_H * S * 3;
  const c = canvas.getContext("2d")!;
  const draw = (items: Item[], ox: number, oy: number) => {
    for (const it of items) {
      c.fillStyle = it.color;
      if (it.k === "rect") {
        const r = it.r ?? 0,
          k = it.corners ?? "all";
        const radii = k === "all" ? [r, r, r, r] : k === "top" ? [r, r, 0, 0] : k === "bottom" ? [0, 0, r, r] : [0, 0, 0, 0];
        c.beginPath();
        c.roundRect(ox + it.x * S, oy + it.y * S, it.w * S, it.h * S, radii.map((v) => v * S));
        c.fill();
      } else {
        c.font = `${it.size * S}px ${getComputedStyle(document.body).fontFamily}`;
        c.textAlign = it.align ?? "left";
        c.fillText(it.text, ox + it.x * S, oy + it.y * S);
      }
    }
  };
  for (let p = 0; p < PANELS; p++) {
    draw(design.fronts[p], 0, p * PASS_H * S);
    draw(design.backs[p], PASS_W * S, p * PASS_H * S);
  }
  return canvas;
}

export function FoldedPassPreview() {
  const canvas = useRef<HTMLCanvasElement>(null),
    progress = useRef(0),
    velocity = useRef(0),
    goal = useRef(0),
    spring = useRef(false);
  const [expanded, setExpanded] = useState(false),
    [slow, setSlow] = useState(false),
    [reduce, setReduce] = useState(false),
    [checked, setChecked] = useState(false),
    [error, setError] = useState(false);
  const latest = useRef({ slow, reduce });
  latest.current = { slow, reduce };
  const drag = useRef<{ id: number; y: number; start: number; lastY: number; at: number; v: number } | null>(null);
  const atlasRef = useRef<{ set: (c: HTMLCanvasElement) => void } | null>(null);

  function settle(to: number, v = 0) {
    goal.current = to;
    setExpanded(!!to);
    if (latest.current.reduce) {
      progress.current = to;
      velocity.current = 0;
      spring.current = false;
      return;
    }
    velocity.current = v;
    spring.current = true;
  }

  useEffect(() => {
    atlasRef.current?.set(drawAtlas(checked));
  }, [checked]);

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
        `attribute vec2 pos; attribute vec2 uv; attribute float shade; varying vec2 tex; varying float lit;
         void main(){ gl_Position = vec4((pos.x + ${PASS_X}.0) / ${BOX_W / 2}.0 - 1.0, 1.0 - (pos.y + ${PASS_Y}.0) / ${BOX_H / 2}.0, 0.0, 1.0); tex = uv; lit = shade; }`,
      );
      const fs = shader(
        gl.FRAGMENT_SHADER,
        "precision mediump float; varying vec2 tex; varying float lit; uniform sampler2D image; void main(){ vec4 c = texture2D(image, tex); gl_FragColor = vec4(c.rgb * lit, c.a); }",
      );
      program = gl.createProgram();
      if (!program) throw Error("Unable to create program");
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program) || "Program failed");
      gl.useProgram(program);
      const grid = makeFoldGrid();
      const buf = () => gl.createBuffer()!;
      const posB = buf(),
        uvB = buf(),
        shadeB = buf(),
        indexB = gl.createBuffer()!,
        tex = gl.createTexture()!;
      const attr = (b: WebGLBuffer, name: string, size: number) => {
        gl.bindBuffer(gl.ARRAY_BUFFER, b);
        const loc = gl.getAttribLocation(program!, name);
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
      };
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexB);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(grid.indices), gl.STATIC_DRAW);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      let aw = PASS_W * S * 2,
        ah = PASS_H * S * 3;
      const upload = (source: HTMLCanvasElement) => {
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
        aw = source.width;
        ah = source.height;
      };
      upload(drawAtlas(false));
      atlasRef.current = { set: upload };
      // Geist may still be loading when the first atlas is drawn: redraw once fonts settle.
      document.fonts?.ready.then(() => upload(drawAtlas(false)));
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      let frame = 0,
        last = performance.now();
      const draw = (now: number) => {
        const dt = Math.min(0.032, (now - last) / 1000);
        last = now;
        if (spring.current && !drag.current) {
          // The same spring the native component runs: damping 17, stiffness 170, stretched in time by 4 for slow motion.
          const k = latest.current.slow ? 4 : 1;
          const stiffness = 170 / (k * k),
            damping = 17 / k;
          const sub = 4;
          for (let i = 0; i < sub; i++) {
            const h = dt / sub;
            const a = -stiffness * (progress.current - goal.current) - damping * velocity.current;
            velocity.current += a * h;
            progress.current += velocity.current * h;
          }
          if (Math.abs(progress.current - goal.current) < 0.001 && Math.abs(velocity.current) < 0.01) {
            progress.current = goal.current;
            velocity.current = 0;
            spring.current = false;
          }
        }
        const mesh = foldMesh(progress.current, PASS_W, PASS_H);
        gl.viewport(0, 0, el.width, el.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        for (const p of [2, 1, 0]) {
          const m = mesh.panels[p];
          gl.bindBuffer(gl.ARRAY_BUFFER, posB);
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(m.pos.flatMap((q) => [q.x, q.y])), gl.DYNAMIC_DRAW);
          attr(posB, "pos", 2);
          const t = atlasUV(p, m.front, grid.uv, 1, 1);
          void aw;
          void ah;
          gl.bindBuffer(gl.ARRAY_BUFFER, uvB);
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(t.flatMap((q) => [q.x, q.y])), gl.DYNAMIC_DRAW);
          attr(uvB, "uv", 2);
          gl.bindBuffer(gl.ARRAY_BUFFER, shadeB);
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(m.shade), gl.DYNAMIC_DRAW);
          attr(shadeB, "shade", 1);
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexB);
          gl.drawElements(gl.TRIANGLES, grid.indices.length, gl.UNSIGNED_SHORT, 0);
        }
        el.dataset.progress = progress.current.toFixed(3);
        frame = requestAnimationFrame(draw);
      };
      frame = requestAnimationFrame(draw);
      return () => {
        cancelAnimationFrame(frame);
        media.removeEventListener("change", onMedia);
        atlasRef.current = null;
        gl.deleteTexture(tex);
        [posB, uvB, shadeB, indexB].forEach((b) => gl.deleteBuffer(b));
        gl.deleteProgram(program);
        shaders.forEach((s) => gl.deleteShader(s));
      };
    } catch {
      if (program) gl.deleteProgram(program);
      shaders.forEach((s) => gl.deleteShader(s));
      setError(true);
      return;
    }
  }, []);

  const travel = PASS_H * 2.4;
  return (
    <div className={styles.wrap}>
      <div className={styles.stage}>
        <canvas
          ref={canvas}
          width={BOX_W * S}
          height={BOX_H * S}
          className={styles.canvas}
          role="button"
          aria-label={expanded ? "Fold pass" : "Unfold pass"}
          tabIndex={0}
          onKeyDown={(e) => {
            if (["Enter", " "].includes(e.key)) {
              e.preventDefault();
              settle(1 - goal.current);
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              settle(1);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              settle(0);
            }
          }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            spring.current = false;
            drag.current = { id: e.pointerId, y: e.clientY, start: progress.current, lastY: e.clientY, at: performance.now(), v: 0 };
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d || d.id !== e.pointerId) return;
            const now = performance.now();
            d.v = (e.clientY - d.lastY) / Math.max(1, now - d.at);
            d.lastY = e.clientY;
            d.at = now;
            const scale = e.currentTarget.getBoundingClientRect().height / BOX_H;
            progress.current = scrub(d.start, (e.clientY - d.y) / scale, travel);
          }}
          onPointerUp={(e) => {
            const d = drag.current;
            if (!d || d.id !== e.pointerId) return;
            const v = performance.now() - d.at > 100 ? 0 : d.v;
            drag.current = null;
            const scale = e.currentTarget.getBoundingClientRect().height / BOX_H;
            const tap = Math.abs(e.clientY - d.y) < 4;
            settle(tap ? 1 - goal.current : Number(releaseTarget(progress.current, v)), tap ? 0 : (v * 1000) / scale / travel);
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
      </div>
      {error ? <p className={styles.hint}>This preview needs WebGL.</p> : null}
      <button className={styles.button} onClick={() => settle(1 - goal.current)}>
        {expanded ? "Fold pass" : "Unfold pass"}
      </button>
      <div className={styles.row}>
        <button className={styles.chip} aria-pressed={slow} onClick={() => setSlow(!slow)}>
          Slow motion: {slow ? "on" : "off"}
        </button>
        <button className={styles.chip} aria-pressed={reduce} onClick={() => setReduce(!reduce)}>
          Reduce motion: {reduce ? "on" : "off"}
        </button>
        <button className={styles.chip} aria-pressed={checked} onClick={() => setChecked(true)}>
          {checked ? "Checked in" : "Check in"}
        </button>
      </div>
      <p className={styles.hint}>Drag the pass down to unfold it. Drag up to fold it.</p>
    </div>
  );
}
