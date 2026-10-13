"use client";
import { useEffect, useRef, useState } from "react";
import {
  makeGrid,
  meshPoints,
  releaseTarget,
  scrub,
} from "../../packages/ui/src/components/genie-dismiss/genieMath";
import styles from "./genie-dismiss.module.css";
const card = { x: 24, y: 20, width: 292, height: 290 };
function texture() {
  const canvas = document.createElement("canvas");
  canvas.width = 584;
  canvas.height = 580;
  const c = canvas.getContext("2d")!;
  c.clearRect(0, 0, 584, 580);
  c.fillStyle = "#e9e6db";
  c.beginPath();
  c.roundRect(0, 0, 584, 580, 30);
  c.fill();
  c.fillStyle = "#315843";
  c.font = "600 16px sans-serif";
  c.fillText("FIELD NOTES / 019", 36, 50);
  c.font = "600 50px Georgia";
  c.fillText("A little room", 36, 124);
  c.fillText("to wander.", 36, 180);
  c.fillStyle = "#ae8655";
  c.beginPath();
  c.arc(392, 355, 142, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#315843";
  c.beginPath();
  c.arc(240, 396, 108, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#b7c7a0";
  c.beginPath();
  c.arc(432, 406, 80, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#315843";
  c.font = "18px sans-serif";
  c.fillText("Take the long way home.", 36, 544);
  return canvas;
}
export function GenieDismissPreview() {
  const canvas = useRef<HTMLCanvasElement>(null),
    progress = useRef(0),
    goal = useRef(0),
    animation = useRef<{
      from: number;
      to: number;
      at: number;
      duration: number;
    } | null>(null);
  const [minimized, setMinimized] = useState(false),
    [slow, setSlow] = useState(false),
    [left, setLeft] = useState(false),
    [error, setError] = useState(false);
  const latest = useRef({ slow, left, reduce: false });
  latest.current.slow = slow;
  latest.current.left = left;
  const drag = useRef<{
    id: number;
    y: number;
    start: number;
    lastY: number;
    at: number;
    velocity: number;
  } | null>(null);
  function settle(to: number) {
    goal.current = to;
    setMinimized(!!to);
    animation.current = {
      from: progress.current,
      to,
      at: performance.now(),
      duration: latest.current.reduce
        ? 140
        : Math.max(
            120,
            Math.abs(to - progress.current) *
              (latest.current.slow ? 3600 : 900),
          ),
    };
  }
  useEffect(() => {
    if (animation.current) settle(goal.current);
  }, [slow]);
  useEffect(() => {
    const el = canvas.current!,
      gl = el.getContext("webgl", {
        alpha: true,
        antialias: true,
        premultipliedAlpha: true,
      });
    if (!gl) {
      setError(true);
      return;
    }
    const shader = (kind: number, source: string) => {
      const s = gl.createShader(kind)!;
      gl.shaderSource(s, source);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
        throw Error(gl.getShaderInfoLog(s) || "Shader failed");
      return s;
    };
    const vs = shader(
      gl.VERTEX_SHADER,
      "attribute vec2 pos; attribute vec2 uv; varying vec2 tex; void main(){gl_Position=vec4(pos.x/170.0-1.0,1.0-pos.y/215.0,0.,1.);tex=uv;}",
    );
    const fs = shader(
      gl.FRAGMENT_SHADER,
      "precision mediump float; varying vec2 tex; uniform sampler2D image; uniform float opacity; void main(){gl_FragColor=texture2D(image,tex)*opacity;}",
    );
    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw Error(gl.getProgramInfoLog(program) || "Program failed");
    gl.useProgram(program);
    const grid = makeGrid(),
      pos = gl.createBuffer()!,
      uv = gl.createBuffer()!,
      index = gl.createBuffer()!,
      image = gl.createTexture()!;
    const bind = (buffer: WebGLBuffer, name: string) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      const loc = gl.getAttribLocation(program, name);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    };
    bind(uv, "uv");
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(grid.uv.flatMap((p) => [p.x, p.y])),
      gl.STATIC_DRAW,
    );
    bind(pos, "pos");
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(grid.indices),
      gl.STATIC_DRAW,
    );
    gl.bindTexture(gl.TEXTURE_2D, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      texture(),
    );
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    latest.current.reduce = media.matches;
    const change = () => {
      latest.current.reduce = media.matches;
      settle(goal.current);
    };
    media.addEventListener("change", change);
    let frame = 0;
    const draw = (now: number) => {
      const a = animation.current;
      if (a) {
        const t = Math.min(1, (now - a.at) / a.duration),
          ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        progress.current = a.from + (a.to - a.from) * ease;
        if (t === 1) animation.current = null;
      }
      const target = { x: latest.current.left ? 52 : 288, y: 382 };
      const points = meshPoints(
        grid.uv,
        latest.current.reduce ? 0 : progress.current,
        card,
        target,
      );
      gl.viewport(0, 0, el.width, el.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindBuffer(gl.ARRAY_BUFFER, pos);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(points.flatMap((p) => [p.x, p.y])),
        gl.DYNAMIC_DRAW,
      );
      gl.uniform1f(
        gl.getUniformLocation(program, "opacity"),
        latest.current.reduce ? 1 - progress.current : 1,
      );
      gl.drawElements(gl.TRIANGLES, grid.indices.length, gl.UNSIGNED_SHORT, 0);
      el.dataset.progress = progress.current.toFixed(3);
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      media.removeEventListener("change", change);
      gl.deleteTexture(image);
      [pos, uv, index].forEach((b) => gl.deleteBuffer(b));
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, []);
  return (
    <div className={styles.wrap}>
      <div
        style={{
          position: "relative",
          width: "min(100%, 340px)",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <span
          aria-hidden
          style={{
            position: "absolute",
            left: left ? "15.3%" : "84.7%",
            top: "88.8%",
            transform: "translate(-50%,-50%)",
            width: 44,
            height: 44,
            borderRadius: 24,
            background: "#315843",
            color: "#fff",
            display: "grid",
            placeItems: "center",
            fontSize: 22,
            zIndex: 1,
            pointerEvents: "none",
          }}
        >
          ↓
        </span>
        <canvas
          ref={canvas}
          width={680}
          height={860}
          style={{ width: "100%" }}
          className={styles.canvas}
          role="button"
          aria-label={minimized ? "Restore card" : "Minimize card"}
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
            animation.current = null;
            drag.current = {
              id: e.pointerId,
              y: e.clientY,
              start: progress.current,
              lastY: e.clientY,
              at: performance.now(),
              velocity: 0,
            };
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d || d.id !== e.pointerId) return;
            const now = performance.now();
            d.velocity = (e.clientY - d.lastY) / Math.max(1, now - d.at);
            d.lastY = e.clientY;
            d.at = now;
            progress.current = scrub(
              d.start,
              ((e.clientY - d.y) * 430) /
                e.currentTarget.getBoundingClientRect().height,
              card.height,
            );
          }}
          onPointerUp={(e) => {
            const d = drag.current;
            if (!d || d.id !== e.pointerId) return;
            const velocity = performance.now() - d.at > 100 ? 0 : d.velocity;
            drag.current = null;
            settle(
              Math.abs(e.clientY - d.y) < 4
                ? 1 - goal.current
                : Number(releaseTarget(progress.current, velocity)),
            );
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
      <button
        className={styles.button}
        onClick={() => settle(1 - goal.current)}
      >
        {minimized ? "Restore card" : "Minimize card"}
      </button>
      <div className={styles.row}>
        <button
          className={styles.chip}
          aria-pressed={slow}
          onClick={() => setSlow(!slow)}
        >
          Slow motion: {slow ? "on" : "off"}
        </button>
        <button
          className={styles.chip}
          onClick={() => {
            animation.current = null;
            drag.current = null;
            progress.current = 0;
            goal.current = 0;
            setMinimized(false);
            setLeft(!left);
          }}
        >
          Target: {left ? "left" : "right"}
        </button>
      </div>
      <p className={styles.hint}>
        Drag down to tuck away. Drag up to bring it back.
      </p>
    </div>
  );
}
