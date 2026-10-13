"use client";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  CURL_BODY,
  curlGeometry,
  dragProgress,
  shouldTurn,
  targetPage,
} from "../../packages/ui/src/components/page-curl/curlMath";
import styles from "./page-curl.module.css";
const W = 600,
  H = 800;
function pageTexture(i: number) {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const x = c.getContext("2d")!;
  x.fillStyle = ["#e7edde", "#dce9eb", "#f0e2ce"][i];
  x.fillRect(0, 0, W, H);
  x.fillStyle = "#315444";
  x.font = "500 17px sans-serif";
  x.fillText("FIELD NOTES", 48, 70);
  x.font = "500 49px Georgia";
  x.fillText(
    ["Into the green.", "A slower tide.", "Stay curious."][i],
    48,
    155,
  );
  x.fillStyle = ["#98b393", "#89afb5", "#cdb18a"][i];
  x.beginPath();
  x.arc(305, 430, 186, 0, Math.PI * 2);
  x.fill();
  x.save();
  x.beginPath();
  x.arc(305, 430, 186, 0, Math.PI * 2);
  x.clip();
  for (let k = 0; k < 6; k++) {
    x.fillStyle = ["#315e49", "#43767f", "#866b49"][i];
    x.globalAlpha = 0.2 + k * 0.07;
    x.beginPath();
    x.ellipse(
      115 + k * 82,
      620 - k * 24,
      125,
      200,
      -0.5 + k * 0.18,
      0,
      Math.PI * 2,
    );
    x.fill();
  }
  x.restore();
  x.fillStyle = "#315444";
  x.font = "20px Georgia";
  [
    "Take the long way home.",
    "Leave room for quiet.",
    "Find a little wonder.",
  ].forEach((t, k) => x.fillText(t, 48, 665 + k * 29));
  x.font = "500 15px sans-serif";
  x.fillText(`0${i + 1} / 03`, 48, 765);
  x.fillText("NATIVELET JOURNAL", 365, 765);
  return c;
}
const FRAGMENT = `precision highp float;
uniform sampler2D frontPage; uniform sampler2D underPage; uniform sampler2D backPage;
uniform vec2 size; uniform vec2 axis; uniform vec2 normal; uniform float radius; uniform float progress; uniform float direction;
vec2 uv(vec2 p) { return vec2(direction < 0.0 ? 1.0-p.x/size.x : p.x/size.x, p.y/size.y); }
vec4 sampleFront(vec2 p) { return texture2D(frontPage,uv(p)); }
vec4 sampleUnder(vec2 p) { return texture2D(underPage,uv(p)); }
vec4 sampleBack(vec2 p) { return texture2D(backPage,uv(p)); }
${CURL_BODY}
void main() { vec2 p=vec2(gl_FragCoord.x,size.y-gl_FragCoord.y); if(direction<0.0) p.x=size.x-p.x; gl_FragColor=renderCurl(p); }`;
export function PageCurlPreview() {
  const canvas = useRef<HTMLCanvasElement>(null),
    draw = useRef<() => void>(() => {});
  const state = useRef({
    index: 0,
    direction: 1,
    progress: 0,
    tilt: 0,
    y: H,
    busy: false,
  });
  const [index, setIndex] = useState(0),
    [reduce, setReduce] = useState(false),
    [error, setError] = useState("");
  const system = useReducedMotion(),
    reduceRef = useRef(false);
  reduceRef.current = reduce || !!system;
  const raf = useRef<number>(),
    drag = useRef<{
      x: number;
      y: number;
      lastX: number;
      lastTime: number;
      vx: number;
      pointer: number;
    }>();
  useEffect(() => {
    const el = canvas.current!,
      gl = el.getContext("webgl", {
        preserveDrawingBuffer: true,
        alpha: false,
      });
    if (!gl) {
      setError("WebGL is unavailable in this browser.");
      return;
    }
    const shader = (type: number, source: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, source);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
        throw new Error(gl.getShaderInfoLog(s) || "Shader failed");
      return s;
    };
    let program: WebGLProgram;
    const shaders: WebGLShader[] = [],
      textures: WebGLTexture[] = [];
    let buffer: WebGLBuffer | null = null;
    try {
      program = gl.createProgram()!;
      shaders.push(
        shader(
          gl.VERTEX_SHADER,
          "attribute vec2 a; void main(){gl_Position=vec4(a,0.0,1.0);}",
        ),
        shader(gl.FRAGMENT_SHADER, FRAGMENT),
      );
      shaders.forEach((s) => gl.attachShader(program, s));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        throw new Error("Unable to link curl shader");
      gl.useProgram(program);
      buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW,
      );
      const a = gl.getAttribLocation(program, "a");
      gl.enableVertexAttribArray(a);
      gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
      for (let i = 0; i < 3; i++) {
        const t = gl.createTexture()!;
        textures.push(t);
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          pageTexture(i),
        );
      }
      const u = (name: string) => gl.getUniformLocation(program, name);
      draw.current = () => {
        const s = state.current,
          g = curlGeometry(s.progress, s.tilt, s.y, W, H);
        gl.viewport(0, 0, W, H);
        gl.uniform2f(u("size"), W, H);
        gl.uniform2fv(u("axis"), g.axis);
        gl.uniform2fv(u("normal"), g.normal);
        gl.uniform1f(u("radius"), g.radius);
        gl.uniform1f(u("progress"), reduceRef.current ? 0 : s.progress);
        gl.uniform1f(u("direction"), s.direction);
        [s.index, targetPage(s.index, s.direction, 3), s.index].forEach(
          (n, i) => {
            gl.activeTexture(gl.TEXTURE0 + i);
            gl.bindTexture(gl.TEXTURE_2D, textures[n]);
            gl.uniform1i(u(["frontPage", "underPage", "backPage"][i]), i);
          },
        );
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      };
      draw.current();
    } catch (e) {
      setError(String(e));
    }
    return () => {
      cancelAnimationFrame(raf.current!);
      draw.current = () => {};
      textures.forEach((t) => gl.deleteTexture(t));
      shaders.forEach((s) => gl.deleteShader(s));
      if (buffer) gl.deleteBuffer(buffer);
      if (program!) gl.deleteProgram(program);
    };
  }, []);
  useEffect(() => {
    draw.current();
  }, [reduce, system]);
  const settle = (commit: boolean) => {
    const s = state.current,
      from = s.progress,
      dir = s.direction,
      start = performance.now();
    s.busy = true;
    const finish = () => {
      if (commit) {
        s.index = targetPage(s.index, dir, 3);
        setIndex(s.index);
      }
      s.progress = 0;
      s.busy = false;
      draw.current();
    };
    if (reduceRef.current) {
      finish();
      return;
    }
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 420);
      s.progress = from + ((commit ? 1 : 0) - from) * (1 - Math.pow(1 - t, 3));
      draw.current();
      if (t < 1) raf.current = requestAnimationFrame(step);
      else finish();
    };
    raf.current = requestAnimationFrame(step);
  };
  const turn = (dir: number) => {
    const s = state.current;
    if (s.busy || targetPage(s.index, dir, 3) === s.index) return;
    s.direction = dir;
    s.tilt = 0;
    s.y = H;
    settle(true);
  };
  return (
    <div className={styles.wrap}>
      <div className={styles.top}>
        <span>FIELD NOTES</span>
        <button
          className={styles.motion}
          aria-pressed={reduce}
          onClick={() => setReduce((v) => !v)}
        >
          Motion: {reduce ? "reduced" : "system"}
        </button>
      </div>
      {error ? (
        <p role="alert">{error}</p>
      ) : (
        <canvas
          ref={canvas}
          width={W}
          height={H}
          className={styles.page}
          tabIndex={0}
          role="group"
          aria-label="Page Curl reader. Drag an edge or use arrow keys"
          onKeyDown={(e) => {
            if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
              e.preventDefault();
              turn(e.key === "ArrowRight" ? 1 : -1);
            }
          }}
          onPointerDown={(e) => {
            const s = state.current,
              r = e.currentTarget.getBoundingClientRect(),
              x = ((e.clientX - r.left) * W) / r.width,
              y = ((e.clientY - r.top) * H) / r.height;
            if (s.busy || (x > W * 0.25 && x < W * 0.75)) return;
            const dir = x > W / 2 ? 1 : -1;
            if (targetPage(s.index, dir, 3) === s.index) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            s.direction = dir;
            s.y = y;
            s.tilt = 0;
            s.busy = true;
            drag.current = {
              x: e.clientX,
              y: e.clientY,
              lastX: e.clientX,
              lastTime: performance.now(),
              vx: 0,
              pointer: e.pointerId,
            };
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d || d.pointer !== e.pointerId) return;
            const s = state.current,
              r = e.currentTarget.getBoundingClientRect(),
              dx = ((e.clientX - d.x) * W) / r.width,
              dy = ((e.clientY - d.y) * H) / r.height,
              now = performance.now();
            d.vx = (e.clientX - d.lastX) / Math.max(1, now - d.lastTime);
            d.lastX = e.clientX;
            d.lastTime = now;
            s.progress = dragProgress(dx, W, s.direction);
            s.tilt = Math.max(
              -0.55,
              Math.min(
                0.55,
                (dy / Math.max(40, Math.abs(dx))) * s.direction * 0.5,
              ),
            );
            draw.current();
          }}
          onPointerUp={(e) => {
            const d = drag.current;
            if (!d || d.pointer !== e.pointerId) return;
            drag.current = undefined;
            settle(
              shouldTurn(
                state.current.progress,
                performance.now() - d.lastTime > 100 ? 0 : d.vx,
                state.current.direction,
              ),
            );
          }}
          onPointerCancel={() => {
            if (drag.current) {
              drag.current = undefined;
              settle(false);
            }
          }}
        />
      )}
      <div className={styles.controls}>
        <button
          disabled={index === 0}
          onClick={() => turn(-1)}
          aria-label="Previous page"
        >
          ←
        </button>
        <span aria-live="polite">
          0{index + 1} <span>/ 03</span>
        </span>
        <button
          disabled={index === 2}
          onClick={() => turn(1)}
          aria-label="Next page"
        >
          →
        </button>
      </div>
    </div>
  );
}
