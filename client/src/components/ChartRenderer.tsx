// src/components/ChartRenderer.tsx
import React, { useEffect, useRef, useState } from "react";

/**
 * Hybrid ChartRenderer.tsx
 * - Normal (wasm LTTB) worker: receives transferred Float32Array per tick
 * - SAB streaming worker: worker writes into SharedArrayBuffer which main thread reads via RAF
 *
 * Worker files (expected):
 *  - ../workers/rust_lttb_worker.ts   (exports postMessage {type: 'data', buffer})
 *  - ../workers/rust_sab_worker.ts    (writes into SAB & Atomics.store meta pairs)
 *
 * Build notes:
 * - Ensure wasm pkg built and served (e.g. /pkg/rw_lttb.js + .wasm)
 * - If using SAB: enable COOP/COEP headers for SharedArrayBuffer
 */

const DOWNSAMPLED_POINTS = 2000; // target LTTB output pairs
const TOTAL_PAIRS = 1_000_000; // million points in generator
const LTTB_INTERVAL_MS = 100; // cadence for LTTB worker

// allow canvas element to have start/stop attached methods
type GlCanvasElem = HTMLCanvasElement & {
  startSharedLoop?: () => void;
  stopSharedLoop?: () => void;
};

export default function ChartRenderer() {
  // refs for DOM
  const containerRef = useRef<HTMLDivElement | null>(null);
  const glCanvasRef = useRef<GlCanvasElem | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);

  // GL state ref (keeps WebGL objects)
  const glStateRef = useRef<any>(null);

  // series buffers currently displayed (Float32Arrays of [x,y,x,y,...])
  const seriesRef = useRef<{
    blue: Float32Array<ArrayBufferLike>;
    red: Float32Array<ArrayBufferLike>;
    green: Float32Array<ArrayBufferLike>;
  }>({
    blue: new Float32Array(0),
    red: new Float32Array(0),
    green: new Float32Array(0),
  });
  const seriesCountRef = useRef({ blue: 0, red: 0, green: 0 });

  // view (data-space)
  const viewRef = useRef({ xMin: 0, xMax: 100, yMin: -1, yMax: 1 });
  const autoFitEnabledRef = useRef(true);
  const autoScrollEnabledRef = useRef(true);

  // workers
  const lttbWorkerRef = useRef<Worker | null>(null);
  const sabWorkerRef = useRef<Worker | null>(null);

  // SAB buffers
  const sharedDataRef = useRef<Float32Array | null>(null);
  const sharedMetaRef = useRef<Int32Array | null>(null);

  // running flags
  const isLttbRunningRef = useRef(false);
  const isSabRunningRef = useRef(false);
  const sabRafRunningRef = useRef(false);

  // UI state
  const [isLttbRunning, setIsLttbRunning] = useState(false);
  const [isSabRunning, setIsSabRunning] = useState(false);
  const [fpsLttb, setFpsLttb] = useState(0);
  const [fpsSab, setFpsSab] = useState(0);

  // fps counters
  const cntLttb = useRef(0);
  const lastLttb = useRef(performance.now());
  const cntSab = useRef(0);
  const lastSab = useRef(performance.now());

  // hover state
  const hoverRef = useRef<{
    px: number | null;
    py: number | null;
    dataX?: number;
    dataY?: number;
  }>({
    px: null,
    py: null,
  });

  // ---------- WebGL small helper & init ----------
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
      float clipY = 1.0 - (ny * 2.0 - 1.0);
      gl_Position = vec4(clipX, clipY, 0.0, 1.0);
    }
  `;
  const FS = `precision mediump float; uniform vec4 u_color; void main() { gl_FragColor = u_color; }`;

  function createShader(gl: WebGLRenderingContext, type: number, src: string) {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(s) || "unknown";
      gl.deleteShader(s);
      throw new Error("Shader compile failed: " + info);
    }
    return s;
  }
  function createProgram(
    gl: WebGLRenderingContext,
    vsSrc: string,
    fsSrc: string
  ) {
    const vs = createShader(gl, gl.VERTEX_SHADER, vsSrc);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSrc);
    const p = gl.createProgram()!;
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(p) || "unknown";
      gl.deleteProgram(p);
      throw new Error("Program link failed: " + info);
    }
    return p;
  }

  function initWebGLIfNeeded() {
    if (glStateRef.current) return;
    const canvas = glCanvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false });
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

    const buffers = {
      blue: gl.createBuffer(),
      red: gl.createBuffer(),
      green: gl.createBuffer(),
    };

    Object.values(buffers).forEach((b) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      // allocate DOWNSAMPLED_POINTS * (x,y) * 4 bytes
      gl.bufferData(
        gl.ARRAY_BUFFER,
        DOWNSAMPLED_POINTS * 2 * 4,
        gl.DYNAMIC_DRAW
      );
    });

    gl.enableVertexAttribArray(aPosLoc);
    gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(1, 1, 1, 1);

    glStateRef.current = {
      gl,
      program,
      aPosLoc,
      buffers,
      u_xMin,
      u_xRange,
      u_yMin,
      u_yRange,
      u_color,
    };

    resizeCanvases();
    updateGLUniforms();
    renderGL();
    drawOverlay();
  }

  // ---------- DPR-aware resize and overlay ----------
  function resizeCanvases() {
    const container = containerRef.current;
    const canvas = glCanvasRef.current;
    const overlay = overlayRef.current;
    if (!container || !canvas || !overlay) return;
    const width = container.clientWidth;
    const height = container.clientHeight || 360;
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

  function drawSeries(
    buffer: WebGLBuffer | null,
    count: number,
    color: [number, number, number, number]
  ) {
    const st = glStateRef.current;
    if (!st) return;
    const { gl, aPosLoc, u_color } = st;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, false, 0, 0);
    gl.uniform4f(u_color, color[0], color[1], color[2], color[3]);
    if (count > 1) gl.drawArrays(gl.LINE_STRIP, 0, count);
  }

  function renderGL() {
    const st = glStateRef.current;
    if (!st) return;
    const { gl, buffers } = st;
    gl.clear(gl.COLOR_BUFFER_BIT);
    drawSeries(
      buffers.blue,
      seriesCountRef.current.blue,
      [0.0, 0.48, 0.78, 0.95]
    );
    drawSeries(
      buffers.red,
      seriesCountRef.current.red,
      [0.85, 0.15, 0.15, 0.95]
    );
    drawSeries(
      buffers.green,
      seriesCountRef.current.green,
      [0.12, 0.7, 0.18, 0.95]
    );
  }

  // update three series into GL buffers and optionally auto-scroll
  function update3Series(
    blueArr: Float32Array,
    redArr: Float32Array,
    greenArr: Float32Array,
    opts: { autoScroll?: boolean } = {}
  ) {
    const st = glStateRef.current;
    if (!st) return;
    const { gl, buffers } = st;

    const bPairs = Math.floor(blueArr.length / 2);
    const rPairs = Math.floor(redArr.length / 2);
    const gPairs = Math.floor(greenArr.length / 2);

    seriesRef.current.blue = blueArr;
    seriesRef.current.red = redArr;
    seriesRef.current.green = greenArr;
    seriesCountRef.current = { blue: bPairs, red: rPairs, green: gPairs };

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.blue);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, blueArr);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.red);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, redArr);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.green);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, greenArr);

    if (opts.autoScroll && autoScrollEnabledRef.current) {
      autoScrollToLatest(blueArr);
    }

    updateGLUniforms();
    renderGL();
    drawOverlay();
  }

  // ---------- overlay (axes, hover, tooltip) ----------
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
    for (let v = first; v <= max + 1e-12; v += chosen)
      ticks.push(+v.toFixed(8));
    return ticks;
  }

  function sampleSeries(arr: Float32Array | null, x: number) {
    if (!arr || arr.length < 2) return null;
    let minD = Infinity,
      val: number | null = null;
    for (let i = 0; i < arr.length; i += 2) {
      const dx = Math.abs(arr[i] - x);
      if (dx < minD) {
        minD = dx;
        val = arr[i + 1];
      }
    }
    return val;
  }

  function drawOverlay() {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext("2d")!;
    const rect = overlay.getBoundingClientRect();
    const w = rect.width,
      h = rect.height;
    ctx.clearRect(0, 0, w, h);

    const v = viewRef.current;
    ctx.save();
    ctx.font = "12px system-ui, Arial";
    ctx.fillStyle = "#111";
    ctx.strokeStyle = "#e6e6e6";
    ctx.lineWidth = 1;

    const xTicks = niceTicks(v.xMin, v.xMax, 8);
    const yTicks = niceTicks(v.yMin, v.yMax, 6);

    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (const tx of xTicks) {
      const px = ((tx - v.xMin) / (v.xMax - v.xMin)) * w;
      ctx.beginPath();
      ctx.moveTo(px + 0.5, 0);
      ctx.lineTo(px + 0.5, h);
      ctx.stroke();
      ctx.fillText(String(tx), px, h - 16);
    }

    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (const ty of yTicks) {
      const py = h - ((ty - v.yMin) / (v.yMax - v.yMin)) * h;
      ctx.beginPath();
      ctx.moveTo(0, py + 0.5);
      ctx.lineTo(w, py + 0.5);
      ctx.stroke();
      ctx.fillText(String(ty), w - 6, py);
    }

    // axis lines
    ctx.strokeStyle = "#222";
    ctx.lineWidth = 1.5;
    const y0 = Math.max(v.yMin, Math.min(v.yMax, 0));
    const py0 = h - ((y0 - v.yMin) / (v.yMax - v.yMin)) * h;
    ctx.beginPath();
    ctx.moveTo(0, py0 + 0.5);
    ctx.lineTo(w, py0 + 0.5);
    ctx.stroke();

    const x0 = Math.max(v.xMin, Math.min(v.xMax, 0));
    const px0 = ((x0 - v.xMin) / (v.xMax - v.xMin)) * w;
    ctx.beginPath();
    ctx.moveTo(px0 + 0.5, 0);
    ctx.lineTo(px0 + 0.5, h);
    ctx.stroke();

    // hover crosshair and tooltip
    const hs = hoverRef.current;
    if (hs && hs.px != null) {
      ctx.strokeStyle = "#444";
      ctx.beginPath();
      ctx.moveTo(hs.px + 0.5, 0);
      ctx.lineTo(hs.px + 0.5, h);
      ctx.stroke();

      const dataX = hs.dataX ?? v.xMin + (hs.px! / w) * (v.xMax - v.xMin);
      const blueVal = sampleSeries(seriesRef.current.blue, dataX);
      const redVal = sampleSeries(seriesRef.current.red, dataX);
      const greenVal = sampleSeries(seriesRef.current.green, dataX);

      const boxW = 160,
        boxH = 76;
      let bx = hs.px! + 12;
      let by = hs.py! - boxH / 2;
      if (bx + boxW > w) bx = hs.px! - boxW - 12;
      if (by < 6) by = 6;
      if (by + boxH > h - 6) by = h - boxH - 6;

      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.strokeStyle = "#888";
      ctx.lineWidth = 1;
      ctx.fillRect(bx, by, boxW, boxH);
      ctx.strokeRect(bx, by, boxW, boxH);

      ctx.fillStyle = "#000";
      ctx.font = "12px system-ui, Arial";
      ctx.textAlign = "left";
      ctx.fillText("X: " + dataX.toFixed(2), bx + 8, by + 16);
      ctx.fillStyle = "#007aa8";
      ctx.fillText(
        "Blue:  " + (blueVal !== null ? blueVal.toFixed(2) : "—"),
        bx + 8,
        by + 32
      );
      ctx.fillStyle = "#c71b1b";
      ctx.fillText(
        "Red:   " + (redVal !== null ? redVal.toFixed(2) : "—"),
        bx + 8,
        by + 48
      );
      ctx.fillStyle = "#2ea84f";
      ctx.fillText(
        "Green: " + (greenVal !== null ? greenVal.toFixed(2) : "—"),
        bx + 8,
        by + 64
      );
    }

    ctx.restore();
  }

  // ---------- interactions: pan/zoom/hover ----------
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    let dragging = false;
    let last: { x: number; y: number } | null = null;

    function onDown(e: MouseEvent) {
      dragging = true;
      last = { x: e.clientX, y: e.clientY };
      if (overlay) overlay.style.cursor = "grabbing";
    }
    function onUp() {
      dragging = false;
      last = null;
      if (overlay) overlay.style.cursor = "default";
    }
    function onMove(e: MouseEvent) {
      if (!overlay) return;
      const rect = overlay.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const v = viewRef.current;
      const dataX = v.xMin + (px / rect.width) * (v.xMax - v.xMin);
      const dataY = v.yMax - (py / rect.height) * (v.yMax - v.yMin);
      hoverRef.current = { px, py, dataX, dataY };

      if (!dragging) {
        drawOverlay();
        return;
      }

      // panning while dragging
      if (!last) return;
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      last = { x: e.clientX, y: e.clientY };
      const spanX = v.xMax - v.xMin,
        spanY = v.yMax - v.yMin;
      const dxData = (dx / rect.width) * spanX;
      const dyData = (dy / rect.height) * spanY;
      v.xMin -= dxData;
      v.xMax -= dxData;
      v.yMin += dyData;
      v.yMax += dyData;
      updateGLUniforms();
      renderGL();
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
      const mx = e.clientX - rect.left,
        my = e.clientY - rect.top;
      const v = viewRef.current;
      const factor = e.deltaY > 0 ? 1.12 : 0.88;
      const xAtMouse = v.xMin + (mx / rect.width) * (v.xMax - v.xMin);
      const yAtMouse =
        v.yMin + ((rect.height - my) / rect.height) * (v.yMax - v.yMin);
      const newW = (v.xMax - v.xMin) * factor;
      const newH = (v.yMax - v.yMin) * factor;
      v.xMin = xAtMouse - (xAtMouse - v.xMin) * factor;
      v.xMax = v.xMin + newW;
      v.yMin = yAtMouse - (yAtMouse - v.yMin) * factor;
      v.yMax = v.yMin + newH;
      updateGLUniforms();
      renderGL();
      drawOverlay();
    }

    overlay.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mousemove", onMove);
    overlay.addEventListener("mouseleave", onLeave);
    overlay.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      overlay.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mousemove", onMove);
      overlay.removeEventListener("mouseleave", onLeave);
      overlay.removeEventListener("wheel", onWheel);
    };
  }, []);

  // ---------- resize ----------
  useEffect(() => {
    function onResize() {
      resizeCanvases();
      drawOverlay();
      updateGLUniforms();
      renderGL();
    }
    window.addEventListener("resize", onResize);
    resizeCanvases();
    drawOverlay();
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ---------- init WebGL ----------
  useEffect(() => {
    initWebGLIfNeeded();
    return () => {
      const st = glStateRef.current;
      if (st && st.gl) {
        try {
          st.gl.deleteBuffer(st.buffers.blue);
          st.gl.deleteBuffer(st.buffers.red);
          st.gl.deleteBuffer(st.buffers.green);
          st.gl.deleteProgram(st.program);
        } catch (e) {
          // ignore
        }
      }
      glStateRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- LTTB (wasm) worker ----------
  useEffect(() => {
    if (lttbWorkerRef.current) return;

    try {
      const w = new Worker(
        new URL("../workers/rust_lttb_worker.ts", import.meta.url),
        { type: "module" }
      );
      lttbWorkerRef.current = w;

      w.onmessage = (ev: MessageEvent) => {
        const msg = ev.data;
        if (msg.type === "ready") {
          console.log("[ChartRenderer] LTTB worker ready");
          drawOverlay();
          return;
        }
        if (msg.type === "data") {
          try {
            // msg.buffer is transferred ArrayBuffer
            const floatBuf = new Float32Array(msg.buffer);

            if (floatBuf.length === 0) {
              console.warn("[ChartRenderer] Received empty buffer");
              return;
            }

            // Derive red/green series and update
            const blue = floatBuf;
            const red = deriveSeries(blue, 1);
            const green = deriveSeries(blue, -1);
            update3Series(blue, red, green, { autoScroll: true });

            // FPS counter
            cntLttb.current++;
            const now = performance.now();
            if (now - lastLttb.current >= 1000) {
              setFpsLttb(cntLttb.current);
              cntLttb.current = 0;
              lastLttb.current = now;
            }
          } catch (err) {
            console.error("[ChartRenderer] Error processing data:", err);
          }
        }
        if (msg.type === "error") {
          console.error("[ChartRenderer] LTTB worker error:", msg.error);
          if (msg.details) {
            console.error("Details:", msg.details);
          }
          // Stop the worker on error
          stopLttb();
        }
      };

      w.onerror = (err) => console.error("LTTB worker error (onerror)", err);
    } catch (err) {
      console.error("Failed to create LTTB worker", err);
    }

    return () => {
      try {
        lttbWorkerRef.current?.terminate();
      } catch (e) {}
      lttbWorkerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- SAB streaming worker ----------
  useEffect(() => {
    if (sabWorkerRef.current) return;

    try {
      // create SABs
      const sabDataBuffer = new SharedArrayBuffer(
        DOWNSAMPLED_POINTS * 2 * Float32Array.BYTES_PER_ELEMENT
      );
      const sabMetaBuffer = new SharedArrayBuffer(
        1 * Int32Array.BYTES_PER_ELEMENT
      );
      sharedDataRef.current = new Float32Array(sabDataBuffer);
      sharedMetaRef.current = new Int32Array(sabMetaBuffer);

      const w = new Worker(
        new URL("../workers/rust_sab_worker.ts", import.meta.url),
        { type: "module" }
      );
      sabWorkerRef.current = w;

      w.onmessage = (ev: MessageEvent) => {
        const msg = ev.data;
        if (msg?.type === "ready") {
          console.log("[ChartRenderer] SAB worker ready");
          drawOverlay();
          return;
        }
        if (msg?.type === "error") {
          console.error("SAB worker error:", msg.error);
        }
      };
      w.onerror = (e) => console.error("SAB worker onerror", e);

      // initialize worker: provide sabs, config
      w.postMessage({
        type: "init",
        sab: sabDataBuffer,
        meta: sabMetaBuffer,
        totalPairs: TOTAL_PAIRS,
        targetPairs: DOWNSAMPLED_POINTS,
        intervalMs: LTTB_INTERVAL_MS,
        seed: 12345,
        bias: 0.01,
      });
    } catch (err) {
      console.error("Failed to create SAB worker", err);
    }

    // RAF read loop for SAB (runs at 60 FPS)
    let rafId = 0;
    function loop() {
      if (!sabRafRunningRef.current) return;

      const meta = sharedMetaRef.current;
      const data = sharedDataRef.current;
      if (!meta || !data) {
        rafId = requestAnimationFrame(loop);
        return;
      }

      try {
        const pairs = Atomics.load(meta, 0);
        if (pairs > 1) {
          // Copy current downsample into new Float32Array (prevents race conditions)
          const blue = new Float32Array(pairs * 2);
          blue.set(data.subarray(0, pairs * 2));

          // Derive red and green series
          const red = deriveSeries(blue, 1);
          const green = deriveSeries(blue, -1);

          // Update chart if SAB is running or chart is empty (initial load)
          if (isSabRunningRef.current || seriesRef.current.blue.length === 0) {
            update3Series(blue, red, green, { autoScroll: true });
          }

          // FPS counter
          cntSab.current++;
          const now = performance.now();
          if (now - lastSab.current >= 1000) {
            setFpsSab(cntSab.current);
            cntSab.current = 0;
            lastSab.current = now;
          }
        }
      } catch (err) {
        console.error("[ChartRenderer] SAB RAF loop error:", err);
      }

      // Continue RAF loop
      rafId = requestAnimationFrame(loop);
    }

    // attach start/stop to canvas element
    const canvas = glCanvasRef.current;
    if (canvas) {
      canvas.startSharedLoop = () => {
        if (!sabRafRunningRef.current) {
          sabRafRunningRef.current = true;
          loop();
        }
      };
      canvas.stopSharedLoop = () => {
        sabRafRunningRef.current = false;
        if (rafId) cancelAnimationFrame(rafId);
      };
    }

    return () => {
      try {
        sabWorkerRef.current?.terminate();
      } catch (e) {}
      sabWorkerRef.current = null;
      if (glCanvasRef.current?.stopSharedLoop)
        glCanvasRef.current.stopSharedLoop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- derive red/green series (same approach as earlier) ----------
  function deriveSeries(baseArr: Float32Array, mode = 0): Float32Array {
    const n = Math.floor(baseArr.length / 2);
    const out = new Float32Array(n * 2);

    // independent LCG seeds per mode
    let seed = mode === 1 ? 1299827 : mode === -1 ? 719393 : 553109;

    function rand() {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return (seed & 0xffff) / 0xffff;
    }

    const MR = mode === 1 ? 0.1 : mode === -1 ? 0.08 : 0.06;
    const VOL = mode === 1 ? 10 : mode === -1 ? 8 : 6;
    const SPIKE_P = mode === 1 ? 0.004 : mode === -1 ? 0.003 : 0.002;

    const BASE_MEAN = mode === 1 ? 50 : mode === -1 ? -30 : 0;

    let yPrev = BASE_MEAN + (rand() - 0.5) * 20;

    for (let i = 0; i < n; i++) {
      const x = baseArr[i * 2];
      const noise = (rand() - 0.5) * VOL;
      const smooth = Math.sin(i * 0.006 + seed * 0.001) * (VOL * 0.5);
      const mr = (BASE_MEAN - yPrev) * MR;
      const spike = rand() < SPIKE_P ? (rand() - 0.5) * 120 : 0;
      const y = yPrev + noise + smooth + mr + spike;
      out[i * 2] = x;
      out[i * 2 + 1] = y;
      yPrev = y;
    }
    return out;
  }

  // ---------- auto fit & scroll ----------
  // Auto-fit function (unused but kept for future use)
  // function autoFitToSeries(blue: Float32Array) {
  //   if (!blue || blue.length < 2) return;
  //   let minX = Infinity,
  //     maxX = -Infinity,
  //     minY = Infinity,
  //     maxY = -Infinity;
  //   const pairs = Math.floor(blue.length / 2);
  //   for (let i = 0; i < pairs; i++) {
  //     const x = blue[i * 2],
  //       y = blue[i * 2 + 1];
  //     if (x < minX) minX = x;
  //     if (x > maxX) maxX = x;
  //     if (y < minY) minY = y;
  //     if (y > maxY) maxY = y;
  //   }
  //   if (!isFinite(minX) || !isFinite(maxX)) return;
  //   const padX = (maxX - minX) * 0.04 || 1;
  //   const padY = (maxY - minY) * 0.12 || 1;
  //   viewRef.current.xMin = minX - padX;
  //   viewRef.current.xMax = maxX + padX;
  //   viewRef.current.yMin = minY - padY;
  //   viewRef.current.yMax = maxY + padY;
  //   updateGLUniforms();
  // }

  function autoScrollToLatest(blue: Float32Array) {
    if (!blue || blue.length < 2) return;
    const n = Math.floor(blue.length / 2);
    const latestX = blue[(n - 1) * 2];
    const v = viewRef.current;
    const windowSize = Math.max(1, v.xMax - v.xMin);
    v.xMax = latestX;
    v.xMin = latestX - windowSize;
  }

  // ---------- control handlers ----------
  function startLttb() {
    autoFitEnabledRef.current = true;
    if (lttbWorkerRef.current) {
      isLttbRunningRef.current = true;
      setIsLttbRunning(true);
      // send init/start config
      lttbWorkerRef.current.postMessage({
        type: "init",
        totalPairs: TOTAL_PAIRS,
        targetPairs: DOWNSAMPLED_POINTS,
        intervalMs: LTTB_INTERVAL_MS,
        seed: 12345,
        bias: 0.01,
      });
      lttbWorkerRef.current.postMessage({ type: "start" });
    } else {
      console.warn("LTTB worker not found");
    }
  }
  function stopLttb() {
    if (lttbWorkerRef.current)
      lttbWorkerRef.current.postMessage({ type: "stop" });
    isLttbRunningRef.current = false;
    setIsLttbRunning(false);
    setFpsLttb(0);
    cntLttb.current = 0;
  }

  function startSab() {
    autoFitEnabledRef.current = true;
    if (sabWorkerRef.current && glCanvasRef.current?.startSharedLoop) {
      isSabRunningRef.current = true;
      setIsSabRunning(true);
      sabWorkerRef.current.postMessage({ type: "start" });
      glCanvasRef.current.startSharedLoop!();
    } else {
      console.warn("SAB worker / shared loop not available");
    }
  }
  function stopSab() {
    if (sabWorkerRef.current)
      sabWorkerRef.current.postMessage({ type: "stop" });
    if (glCanvasRef.current?.stopSharedLoop)
      glCanvasRef.current.stopSharedLoop!();
    isSabRunningRef.current = false;
    setIsSabRunning(false);
    setFpsSab(0);
    cntSab.current = 0;
  }

  function toggleAutoScroll() {
    autoScrollEnabledRef.current = !autoScrollEnabledRef.current;
  }

  // ---------- render ----------
  return (
    <div style={{ padding: 12 }}>
      <h2 style={{ marginBottom: 8 }}>
        HYBRID: Rust LTTB + SAB Streaming — Chart
      </h2>

      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          marginBottom: 8,
        }}>
        {!isLttbRunning ? (
          <button onClick={startLttb} style={btnStyle}>
            Start LTTB (wasm)
          </button>
        ) : (
          <button
            onClick={stopLttb}
            style={{ ...btnStyle, background: "#e53e3e" }}>
            Stop LTTB
          </button>
        )}

        {!isSabRunning ? (
          <button onClick={startSab} style={btnStyle}>
            Start SAB
          </button>
        ) : (
          <button
            onClick={stopSab}
            style={{ ...btnStyle, background: "#e53e3e" }}>
            Stop SAB
          </button>
        )}

        <button
          onClick={toggleAutoScroll}
          style={{
            ...btnStyle,
            background: autoScrollEnabledRef.current ? "#16a34a" : "#6b7280",
          }}>
          Auto-scroll: {autoScrollEnabledRef.current ? "On" : "Off"}
        </button>

        <div style={{ marginLeft: "auto" }}>
          FPS LTTB: {fpsLttb} — FPS SAB: {fpsSab}
        </div>
      </div>

      <div
        ref={containerRef}
        style={{
          position: "relative",
          width: "100%",
          height: 420,
          border: "1px solid #ddd",
          boxSizing: "border-box",
        }}>
        <canvas
          ref={glCanvasRef as any}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            width: "100%",
            height: "100%",
          }}
        />
        <canvas
          ref={overlayRef}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 2,
            width: "100%",
            height: "100%",
          }}
        />
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: "8px 12px",
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
};
