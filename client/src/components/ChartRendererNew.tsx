// src/components/ChartRenderer.tsx - Refactored with streaming random walk
import { useEffect, useRef, useState } from "react";
import StreamControls from "./StreamControls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, BarChart3, TrendingUp, Zap } from "lucide-react";

const DOWNSAMPLED_POINTS = 2000;
// const BATCH_SIZE = 10000;
const DEFAULT_INTERVAL_MS = 100;
// const TOTAL_TARGET_POINTS = 1_000_000; // 1 million target points

type GlCanvasElem = HTMLCanvasElement & {
  startSharedLoop?: () => void;
  stopSharedLoop?: () => void;
};

export default function ChartRenderer() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const glCanvasRef = useRef<GlCanvasElem | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const glStateRef = useRef<any>(null);

  // Current data buffers - accumulating buffer retains all data
  const dataBufferRef = useRef<Float32Array>(new Float32Array(0));
  const dataCountRef = useRef(0);
  const totalGeneratedPointsRef = useRef(0); // Track total raw points generated
  const accumulatedRawDataRef = useRef<Float32Array>(new Float32Array(0)); // Keep all raw data

  // View state
  const viewRef = useRef({ xMin: 0, xMax: 100, yMin: 95, yMax: 105 });
  const autoScrollEnabledRef = useRef(true);

  // Worker refs
  const workerRef = useRef<Worker | null>(null);
  const sabWorkerRef = useRef<Worker | null>(null);
  const isRunningRef = useRef(false);

  const [batchSize, setBatchSize] = useState(5000); // default
  // SharedArrayBuffer refs for SAB worker
  const sabDataRef = useRef<Float32Array | null>(null);
  const sabMetaRef = useRef<Int32Array | null>(null);
  const sabRafRef = useRef<number | null>(null);
  const sabTotalPointsRef = useRef(0);

  const renderFpsCountRef = useRef(0);
  const lastRenderFpsTimeRef = useRef(performance.now());
  const [renderFps, setRenderFps] = useState(0);

  // Stream parameters
  const [drift, setDrift] = useState(0.005); // 0.5% drift per tick - strong upward trend
  const [volatility, setVolatility] = useState(0.025); // 2.5% volatility for realistic fluctuations
  const [updateRate, setUpdateRate] = useState(DEFAULT_INTERVAL_MS);
  const [isRunning, setIsRunning] = useState(false);
  const [fps, setFps] = useState(0);
  const pointsPerSecond = Math.floor((batchSize / updateRate) * 1000);

  // FPS counter
  const fpsCountRef = useRef(0);
  const lastFpsTimeRef = useRef(performance.now());

  // Hover state
  const hoverRef = useRef<{
    px: number | null;
    py: number | null;
    dataX?: number;
    dataY?: number;
  }>({ px: null, py: null });

  // ---------- WebGL Setup ----------
  const VS = `
    attribute vec2 a_pos;
    uniform float u_xMin;
    uniform float u_xRange;
    uniform float u_yMin;
    uniform float u_yRange;
    void main() {
      float nx = (a_pos.x - u_xMin) / u_xRange;
      float ny = (a_pos.y - u_yMin) / u_yRange;
      float clipX = nx * 2.0 - 1.0;
      float clipY = 1.0 - (ny * 2.0);
      gl_Position = vec4(clipX, clipY, 0.0, 1.0);
    }
  `;
  const FS = `
    precision mediump float;
    uniform vec4 u_color;
    void main() {
      gl_FragColor = u_color;
    }
  `;

  function createShader(gl: WebGLRenderingContext, type: number, src: string) {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(s) || "unknown";
      gl.deleteShader(s);
      throw new Error("Shader compile: " + info);
    }
    return s;
  }

  function createProgram(gl: WebGLRenderingContext, vs: string, fs: string) {
    const vShader = createShader(gl, gl.VERTEX_SHADER, vs);
    const fShader = createShader(gl, gl.FRAGMENT_SHADER, fs);
    const p = gl.createProgram()!;
    gl.attachShader(p, vShader);
    gl.attachShader(p, fShader);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(p) || "unknown";
      gl.deleteProgram(p);
      throw new Error("Program link: " + info);
    }
    return p;
  }

  function initWebGL() {
    if (glStateRef.current) return;
    const canvas = glCanvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", { antialias: true });
    if (!gl) {
      console.error("WebGL not available");
      return;
    }

    const program = createProgram(gl, VS, FS);
    gl.useProgram(program);

    const aPosLoc = gl.getAttribLocation(program, "a_pos");
    const u_xMin = gl.getUniformLocation(program, "u_xMin");
    const u_xRange = gl.getUniformLocation(program, "u_xRange");
    const u_yMin = gl.getUniformLocation(program, "u_yMin");
    const u_yRange = gl.getUniformLocation(program, "u_yRange");
    const u_color = gl.getUniformLocation(program, "u_color");

    // Create optimized buffer (pre-allocated for max size)
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, DOWNSAMPLED_POINTS * 2 * 4, gl.DYNAMIC_DRAW);

    gl.enableVertexAttribArray(aPosLoc);
    gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0); // Transparent background

    glStateRef.current = {
      gl,
      program,
      aPosLoc,
      buffer,
      u_xMin,
      u_xRange,
      u_yMin,
      u_yRange,
      u_color,
    };

    resizeCanvases();
    updateGLUniforms();
    renderGL();
  }

  function startRenderLoop() {
    let rafId = 0;

    const loop = () => {
      // --- FPS CALC ---
      renderFpsCountRef.current++;
      const now = performance.now();
      if (now - lastRenderFpsTimeRef.current >= 1000) {
        setRenderFps(renderFpsCountRef.current);
        renderFpsCountRef.current = 0;
        lastRenderFpsTimeRef.current = now;
      }

      // --- Render ---
      renderGL();
      drawOverlay();

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(rafId);
  }

  function resizeCanvases() {
    const container = containerRef.current;
    const canvas = glCanvasRef.current;
    const overlay = overlayRef.current;
    if (!container || !canvas || !overlay) return;

    const width = container.clientWidth;
    const height = container.clientHeight || 480;
    const dpr = window.devicePixelRatio || 1;

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    overlay.style.width = `${width}px`;
    overlay.style.height = `${height}px`;
    overlay.width = Math.round(width * dpr);
    overlay.height = Math.round(height * dpr);

    const ctx = overlay.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const st = glStateRef.current;
    if (st) st.gl.viewport(0, 0, canvas.width, canvas.height);
  }

  function updateGLUniforms() {
    const st = glStateRef.current;
    if (!st) return;
    const { gl, u_xMin, u_xRange, u_yMin, u_yRange, program } = st;
    const v = viewRef.current;
    const xr = Math.max(1e-6, v.xMax - v.xMin);
    const yr = Math.max(1e-6, v.yMax - v.yMin);
    gl.useProgram(program);
    gl.uniform1f(u_xMin, v.xMin);
    gl.uniform1f(u_xRange, xr);
    gl.uniform1f(u_yMin, v.yMin);
    gl.uniform1f(u_yRange, yr);
  }

  function renderGL() {
    const st = glStateRef.current;
    if (!st) return;
    const { gl, buffer, u_color, aPosLoc } = st;

    gl.clear(gl.COLOR_BUFFER_BIT);

    if (dataCountRef.current > 1) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, false, 0, 0);
      // Neon Cyan color
      gl.uniform4f(u_color, 0.0, 0.9, 1.0, 1.0);
      gl.drawArrays(gl.LINE_STRIP, 0, dataCountRef.current);
    }
  }

  function updateData(newData: Float32Array, totalPoints: number) {
    const st = glStateRef.current;
    if (!st) return;

    const { gl, buffer } = st;
    const pairs = Math.floor(newData.length / 2);

    // Update stats
    totalGeneratedPointsRef.current = totalPoints;
    dataCountRef.current = pairs;

    // REPLACE buffer data completely (since worker sends full view)
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

    // Check if we need to reallocate buffer (if view size grew)
    // We allocated DOWNSAMPLED_POINTS * 2 * 4 initially.
    // If pairs > DOWNSAMPLED_POINTS, we might need to realloc, but usually targetPairs is constant.
    // However, if we change targetPairs dynamically, we need to handle it.
    // For now, assume targetPairs <= DOWNSAMPLED_POINTS.

    gl.bufferSubData(gl.ARRAY_BUFFER, 0, newData);

    // Auto-scroll to latest data and adjust Y-axis smoothly
    if (autoScrollEnabledRef.current && pairs > 0) {
      const latestX = newData[(pairs - 1) * 2];
      const windowSize = Math.max(
        100,
        viewRef.current.xMax - viewRef.current.xMin
      );
      viewRef.current.xMax = latestX + 10;
      viewRef.current.xMin = viewRef.current.xMax - windowSize;

      // Smooth Y-axis adjustment - only look at visible window
      // Calculate which data points are in the visible X range
      let minY = Infinity;
      let maxY = -Infinity;
      for (let i = 0; i < pairs; i++) {
        const x = newData[i * 2];
        const y = newData[i * 2 + 1];
        // Only consider points in the visible X range
        if (x >= viewRef.current.xMin && x <= viewRef.current.xMax) {
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }

      if (isFinite(minY) && isFinite(maxY) && minY !== maxY) {
        // Use 15% padding for better visual clarity
        const range = maxY - minY;
        const padding = range * 0.15;

        // Smooth transition: blend old and new bounds
        const alpha = 0.3; // Smoothing factor
        viewRef.current.yMin =
          viewRef.current.yMin * (1 - alpha) + (minY - padding) * alpha;
        viewRef.current.yMax =
          viewRef.current.yMax * (1 - alpha) + (maxY + padding) * alpha;
      }
    }

    updateGLUniforms();
    renderGL();
    drawOverlay();

    // Update FPS
    fpsCountRef.current++;
    const now = performance.now();
    if (now - lastFpsTimeRef.current >= 1000) {
      setFps(fpsCountRef.current);
      fpsCountRef.current = 0;
      lastFpsTimeRef.current = now;
    }
  }

  // ---------- Overlay (axes, grid, tooltip) ----------
  function niceTicks(min: number, max: number, target = 6): number[] {
    if (!isFinite(min) || !isFinite(max) || min === max) return [min];
    const span = max - min;
    const raw = span / Math.max(1, target);
    const pow10 = Math.pow(10, Math.floor(Math.log10(Math.abs(raw) || 1)));
    const steps = [1, 2, 5, 10];
    let chosen = steps[0] * pow10;
    for (const s of steps) {
      if (s * pow10 >= raw) {
        chosen = s * pow10;
        break;
      }
    }
    const first = Math.ceil(min / chosen) * chosen;
    const ticks: number[] = [];
    for (let v = first; v <= max + 1e-12; v += chosen) {
      ticks.push(+v.toFixed(8));
    }
    return ticks;
  }

  function drawOverlay() {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext("2d")!;
    const rect = overlay.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    const v = viewRef.current;
    ctx.save();
    ctx.font = "11px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "#a1a1aa"; // zinc-400
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;

    // Grid lines
    const xTicks = niceTicks(v.xMin, v.xMax, 10);
    const yTicks = niceTicks(v.yMin, v.yMax, 8);

    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (const tx of xTicks) {
      const px = ((tx - v.xMin) / (v.xMax - v.xMin)) * w;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, h);
      ctx.stroke();
      ctx.fillText(tx.toFixed(0), px, h - 18);
    }

    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (const ty of yTicks) {
      const py = h - ((ty - v.yMin) / (v.yMax - v.yMin)) * h;
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(w, py);
      ctx.stroke();
      ctx.fillText(ty.toFixed(1), w - 8, py);
    }

    // Zero axes
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 1.5;
    const y0 = Math.max(v.yMin, Math.min(v.yMax, 0));
    const py0 = h - ((y0 - v.yMin) / (v.yMax - v.yMin)) * h;
    ctx.beginPath();
    ctx.moveTo(0, py0);
    ctx.lineTo(w, py0);
    ctx.stroke();

    // Hover tooltip
    const hs = hoverRef.current;
    if (hs.px != null && hs.py != null) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(hs.px, 0);
      ctx.lineTo(hs.px, h);
      ctx.stroke();
      ctx.setLineDash([]);

      const dataX = v.xMin + (hs.px / w) * (v.xMax - v.xMin);
      const dataY = v.yMax - (hs.py / h) * (v.yMax - v.yMin);

      const boxW = 140;
      const boxH = 60;
      let bx = hs.px + 15;
      let by = hs.py - boxH / 2;
      if (bx + boxW > w) bx = hs.px - boxW - 15;
      if (by < 10) by = 10;
      if (by + boxH > h - 10) by = h - boxH - 10;

      ctx.fillStyle = "rgba(20, 20, 30, 0.9)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      ctx.lineWidth = 1;
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 8;
      ctx.fillRect(bx, by, boxW, boxH);
      ctx.strokeRect(bx, by, boxW, boxH);
      ctx.shadowBlur = 0;

      ctx.fillStyle = "#fff";
      ctx.font = "12px system-ui";
      ctx.textAlign = "left";
      ctx.fillText(`X: ${dataX.toFixed(1)}`, bx + 10, by + 20);
      ctx.fillText(`Y: ${dataY.toFixed(2)}`, bx + 10, by + 40);
    }

    ctx.restore();
  }

  // ---------- Mouse Interactions ----------
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    let dragging = false;
    let lastPos: { x: number; y: number } | null = null;

    function onDown(e: MouseEvent) {
      dragging = true;
      lastPos = { x: e.clientX, y: e.clientY };
      overlay!.style.cursor = "grabbing";
    }

    function onUp() {
      dragging = false;
      lastPos = null;
      overlay!.style.cursor = "crosshair";
    }

    function onMove(e: MouseEvent) {
      if (!overlay) return;
      const rect = overlay.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      hoverRef.current = { px, py };

      if (dragging && lastPos) {
        const dx = e.clientX - lastPos.x;
        const dy = e.clientY - lastPos.y;
        lastPos = { x: e.clientX, y: e.clientY };

        const v = viewRef.current;
        const spanX = v.xMax - v.xMin;
        const spanY = v.yMax - v.yMin;
        const dxData = (dx / rect.width) * spanX;
        const dyData = (dy / rect.height) * spanY;

        v.xMin -= dxData;
        v.xMax -= dxData;
        v.yMin += dyData;
        v.yMax += dyData;

        updateGLUniforms();
        renderGL();
      }

      drawOverlay();
    }

    function onLeave() {
      hoverRef.current = { px: null, py: null };
      drawOverlay();
    }

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      if (!overlay) return;
      const rect = overlay.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const v = viewRef.current;
      const factor = e.deltaY > 0 ? 1.15 : 0.85;

      const xAtMouse = v.xMin + (mx / rect.width) * (v.xMax - v.xMin);
      const yAtMouse =
        v.yMin + ((rect.height - my) / rect.height) * (v.yMax - v.yMin);

      v.xMin = xAtMouse - (xAtMouse - v.xMin) * factor;
      v.xMax = xAtMouse + (v.xMax - xAtMouse) * factor;
      v.yMin = yAtMouse - (yAtMouse - v.yMin) * factor;
      v.yMax = yAtMouse + (v.yMax - yAtMouse) * factor;

      updateGLUniforms();
      renderGL();
      drawOverlay();
    }

    overlay.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mousemove", onMove);
    overlay.addEventListener("mouseleave", onLeave);
    overlay.addEventListener("wheel", onWheel, { passive: false });
    overlay.style.cursor = "crosshair";

    return () => {
      overlay.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mousemove", onMove);
      overlay.removeEventListener("mouseleave", onLeave);
      overlay.removeEventListener("wheel", onWheel);
    };
  }, []);

  // ---------- Window Resize ----------
  useEffect(() => {
    function onResize() {
      resizeCanvases();
      updateGLUniforms();
      renderGL();
      drawOverlay();
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ---------- Init WebGL ----------
  useEffect(() => {
    initWebGL();

    const stopLoop = startRenderLoop();

    return () => {
      stopLoop();
      const st = glStateRef.current;
      if (st?.gl) {
        try {
          st.gl.deleteBuffer(st.buffer);
          st.gl.deleteProgram(st.program);
        } catch (e) {}
      }
      glStateRef.current = null;
    };
  }, []);

  // ---------- Worker Setup ----------
  useEffect(() => {
    if (workerRef.current) return;

    try {
      const w = new Worker(
        new URL("../workers/rust_lttb_worker.ts", import.meta.url),
        { type: "module" }
      );
      workerRef.current = w;

      w.onmessage = (ev: MessageEvent) => {
        const msg = ev.data;
        if (msg.type === "ready") {
          console.log("[ChartRenderer] Worker ready");
          return;
        }
        if (msg.type === "data") {
          const floatBuf = new Float32Array(msg.buffer);
          const totalPoints = msg.totalPoints || 0;
          updateData(floatBuf, totalPoints);
        }
        if (msg.type === "error") {
          console.error("[ChartRenderer] Worker error:", msg.error);
          handleStop();
        }
      };

      w.onerror = (err) => console.error("Worker error:", err);

      // Initialize worker
      w.postMessage({
        type: "init",
        batchSize,
        targetPairs: DOWNSAMPLED_POINTS,
        intervalMs: updateRate,
        seed: 42,
        drift: drift,
        volatility: volatility,
      });

      // --- Create and initialize SAB worker ---
      // try {
      //   const sab = new Worker(
      //     new URL("../workers/rust_sab_worker.ts", import.meta.url),
      //     { type: "module" }
      //   );
      //   sabWorkerRef.current = sab;

      //   // Allocate SharedArrayBuffer sized for downsampled points (pairs * 2 floats)
      //   const sabPairs = DOWNSAMPLED_POINTS;
      //   const sabFloatLen = sabPairs * 2; // x,y pairs
      //   const sabBuf = new SharedArrayBuffer(
      //     Float32Array.BYTES_PER_ELEMENT * sabFloatLen
      //   );
      //   const sabMeta = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * 1);

      //   sabDataRef.current = new Float32Array(sabBuf);
      //   sabMetaRef.current = new Int32Array(sabMeta);

      //   sab.onmessage = (ev: MessageEvent) => {
      //     const msg = ev.data;
      //     if (msg.type === "ready") {
      //       console.log("[ChartRenderer] SAB worker ready");
      //       return;
      //     }
      //     if (msg.type === "error") {
      //       console.error(
      //         "[ChartRenderer] SAB worker error:",
      //         msg.error,
      //         msg.details
      //       );
      //       handleStop();
      //     }
      //   };

      //   sab.onerror = (err) => console.error("SAB worker error:", err);

      //   sab.postMessage({
      //     type: "init",
      //     batchSize: 1000,
      //     targetPairs: DOWNSAMPLED_POINTS,
      //     intervalMs: updateRate,
      //     seed: 42,
      //     drift: drift,
      //     volatility: volatility,
      //     sab: sabBuf,
      //     meta: sabMeta,
      //   });

      //   // attach RAF poll loop to read SAB changes
      //   const startSharedLoop = () => {
      //     if (sabRafRef.current != null) return;

      //     const loop = () => {
      //       try {
      //         const meta = sabMetaRef.current;
      //         const data = sabDataRef.current;

      //         if (meta && data) {
      //           // READ PAIRS WITH MEMORY FENCE
      //           const pairs = Atomics.load(meta, 0);

      //           // No new data → skip
      //           if (pairs > 0) {
      //             const used = Math.min(pairs * 2, data.length);

      //             // SAFER COPY — prevents race tearing
      //             const copied = data.slice(0, used);

      //             // Update chart
      //             sabTotalPointsRef.current = pairs;
      //             updateData(copied, sabTotalPointsRef.current);

      //             // MARK CONSUMED (memory fence)
      //             Atomics.store(meta, 0, 0);
      //           }
      //         }
      //       } catch (e) {
      //         // ignore transient reads
      //       }

      //       sabRafRef.current = requestAnimationFrame(loop);
      //     };

      //     sabRafRef.current = requestAnimationFrame(loop);
      //   };

      //   const stopSharedLoop = () => {
      //     if (sabRafRef.current != null) {
      //       cancelAnimationFrame(sabRafRef.current);
      //       sabRafRef.current = null;
      //     }
      //   };

      //   // Expose start/stop helpers on canvas element so controls can trigger
      //   const canvas = glCanvasRef.current as GlCanvasElem | null;
      //   if (canvas) {
      //     canvas.startSharedLoop = startSharedLoop;
      //     canvas.stopSharedLoop = stopSharedLoop;
      //   }
      // } catch (err) {
      //   console.warn("Failed to create SAB worker:", err);
      // }
    } catch (err) {
      console.error("Failed to create worker:", err);
    }

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
      // terminate sab worker and stop RAF if present
      try {
        const canvas = glCanvasRef.current as GlCanvasElem | null;
        if (canvas && canvas.stopSharedLoop) canvas.stopSharedLoop();
      } catch (e) {}
      sabWorkerRef.current?.terminate();
      sabWorkerRef.current = null;
      sabDataRef.current = null;
      sabMetaRef.current = null;
    };
  }, []);

  // ---------- Control Handlers ----------
  function handleToggleRunning() {
    if (isRunning) {
      handleStop();
    } else {
      handleStart();
    }
  }

  function handleStart() {
    if (workerRef.current) {
      isRunningRef.current = true;
      setIsRunning(true);
      workerRef.current.postMessage({ type: "start" });
    }
    if (sabWorkerRef.current) {
      sabWorkerRef.current.postMessage({ type: "start" });
      // begin RAF poll loop
      const canvas = glCanvasRef.current as GlCanvasElem | null;
      if (canvas && canvas.startSharedLoop) canvas.startSharedLoop();
    }
  }

  function handleStop() {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: "stop" });
    }
    if (sabWorkerRef.current) {
      sabWorkerRef.current.postMessage({ type: "stop" });
      const canvas = glCanvasRef.current as GlCanvasElem | null;
      if (canvas && canvas.stopSharedLoop) canvas.stopSharedLoop();
    }
    isRunningRef.current = false;
    setIsRunning(false);
    setFps(0);
  }

  function handleReset() {
    console.log("[Chart Renderer] 🔄 Resetting all data...");
    if (workerRef.current) {
      workerRef.current.postMessage({ type: "reset" });
    }
    if (sabWorkerRef.current) {
      sabWorkerRef.current.postMessage({ type: "reset" });
      // zero meta
      if (sabMetaRef.current) Atomics.store(sabMetaRef.current, 0, 0);
    }
    dataBufferRef.current = new Float32Array(0);
    dataCountRef.current = 0;
    totalGeneratedPointsRef.current = 0;
    accumulatedRawDataRef.current = new Float32Array(0);
    viewRef.current = { xMin: 0, xMax: 100, yMin: 95, yMax: 105 };
    updateGLUniforms();
    renderGL();
    drawOverlay();
    console.log("[Chart Renderer] ✅ Reset complete");
  }

  function handleDriftChange(value: number) {
    setDrift(value);
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: "updateParams",
        drift: value,
      });
    }
    if (sabWorkerRef.current) {
      sabWorkerRef.current.postMessage({ type: "updateParams", drift: value });
    }
  }

  function handleVolatilityChange(value: number) {
    setVolatility(value);
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: "updateParams",
        volatility: value,
      });
    }
    if (sabWorkerRef.current) {
      sabWorkerRef.current.postMessage({
        type: "updateParams",
        volatility: value,
      });
    }
  }

  function handleUpdateRateChange(value: number) {
    setUpdateRate(value);
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: "updateParams",
        intervalMs: value,
      });
    }
    if (sabWorkerRef.current) {
      sabWorkerRef.current.postMessage({
        type: "updateParams",
        intervalMs: value,
      });
    }
  }

  return (
    <div className="space-y-6">
      <StreamControls
        drift={drift}
        volatility={volatility}
        updateRate={updateRate}
        isRunning={isRunning}
        onDriftChange={handleDriftChange}
        onVolatilityChange={handleVolatilityChange}
        onUpdateRateChange={handleUpdateRateChange}
        onToggleRunning={handleToggleRunning}
        onReset={handleReset}
      />

      <div className="w-full p-4 bg-card rounded-lg border border-border/40">
        <label className="text-sm text-muted-foreground font-medium">
          Data points: {pointsPerSecond}
        </label>
        <input
          type="range"
          min={100}
          max={100000}
          step={100}
          value={batchSize}
          onChange={(e) => {
            const val = Number(e.target.value);
            setBatchSize(val);
            // send new batch size to worker
            workerRef.current?.postMessage({
              type: "updateParams",
              batchSize: val,
            });
          }}
          className="w-full mt-2"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <Card className="border border-border/50 bg-card/50 backdrop-blur-sm shadow-lg hover:bg-card/80 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Frame Rate
            </CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{fps} FPS</div>
            <div className="text-2xl font-bold text-foreground">
              Render FPS: {renderFps}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Rendering performance
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/50 bg-card/50 backdrop-blur-sm shadow-lg hover:bg-card/80 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Visible Points
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {dataCountRef.current.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Downsampled (chart)
            </p>
          </CardContent>
        </Card>
        <Card className="border border-border/50 bg-card/50 backdrop-blur-sm shadow-lg hover:bg-card/80 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              View Range
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {(viewRef.current.xMax - viewRef.current.xMin).toFixed(0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              X: {viewRef.current.xMin.toFixed(0)} →{" "}
              {viewRef.current.xMax.toFixed(0)}
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/50 bg-card/50 backdrop-blur-sm shadow-lg hover:bg-card/80 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Status
            </CardTitle>
            <Activity className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">
              {isRunning ? "🟢 Live" : "⚫ Idle"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">WebGL + WASM</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="border border-border/50 bg-card/50 backdrop-blur-sm shadow-xl overflow-hidden">
        <div
          ref={containerRef}
          className="relative w-full bg-transparent"
          style={{ height: "520px" }}>
          <canvas ref={glCanvasRef as any} className="absolute inset-0 z-10" />
          <canvas ref={overlayRef} className="absolute inset-0 z-20" />
        </div>
      </Card>
    </div>
  );
}
