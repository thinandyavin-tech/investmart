"use client";

import { useEffect, useRef } from "react";

// Original shader from aurora-drift/aurora.js — navy→indigo→purple→hot-pink palette,
// fbm warp field, mouse influence, up to 8 simultaneous click blooms.
const VERT = `
  attribute vec2 a_position;
  void main(){ gl_Position = vec4(a_position, 0.0, 1.0); }
`;

const FRAG = `
  precision highp float;
  uniform vec2  u_resolution;
  uniform float u_time;
  uniform vec2  u_mouse;        // 0..1, y up
  uniform float u_mouseActive;
  uniform vec4  u_clicks[8];    // xy in 0..1, z = age sec, w = strength

  float hash21(vec2 p){
    vec3 p3 = fract(vec3(p.xyx)*.1031);
    p3 += dot(p3, p3.yzx+33.33);
    return fract((p3.x+p3.y)*p3.z);
  }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(hash21(i+vec2(0,0)), hash21(i+vec2(1,0)), u.x),
               mix(hash21(i+vec2(0,1)), hash21(i+vec2(1,1)), u.x), u.y);
  }
  float fbm(vec2 p){
    float v = 0.0, a = 0.5;
    for(int i=0;i<5;i++){ v += a*noise(p); p *= 2.02; a *= 0.5; }
    return v;
  }

  vec3 palette(float t){
    vec3 c0 = vec3(0.060, 0.078, 0.145); // deep navy
    vec3 c1 = vec3(0.290, 0.220, 0.580); // indigo
    vec3 c2 = vec3(0.545, 0.361, 0.965); // #8B5CF6 InvestMart purple
    vec3 c3 = vec3(1.000, 0.239, 0.604); // #FF3D9A hot pink
    t = clamp(t, 0.0, 1.0);
    if (t < 0.33) return mix(c0, c1, t/0.33);
    if (t < 0.66) return mix(c1, c2, (t-0.33)/0.33);
    return mix(c2, c3, (t-0.66)/0.34);
  }

  void main(){
    vec2 p = (gl_FragCoord.xy - 0.5*u_resolution.xy) / u_resolution.y;
    vec2 m = u_mouse - 0.5;
    float t = u_time * 0.08;

    vec2 q = p;
    q += 0.6 * vec2(fbm(q*1.3 + t), fbm(q*1.3 - t + 11.0));
    q += 0.4 * vec2(fbm(q*2.7 + m*1.5 + t*1.3),
                    fbm(q*2.7 - m*1.5 - t*1.1 + 4.0));
    float band = fbm(q*1.8 + vec2(t*0.6, -t*0.4));

    float pulse = 0.0;
    for (int i=0; i<8; i++){
      vec4 c = u_clicks[i];
      if (c.w <= 0.0) continue;
      vec2 cp = (c.xy - 0.5) * vec2(u_resolution.x/u_resolution.y, 1.0);
      float d = length(p - cp);
      float age = c.z;
      float r = age * 0.6;
      float ring = exp(-pow((d - r)*8.0, 2.0));
      pulse += ring * exp(-age*1.4) * c.w;
    }

    float e = band * 0.95 + 0.05 + pulse * 0.35;
    float vig = smoothstep(1.25, 0.25, length(p));
    e *= mix(0.55, 1.0, vig);

    vec3 col = palette(e);
    col += (hash21(gl_FragCoord.xy + u_time) - 0.5) * 0.02;

    gl_FragColor = vec4(col, 1.0);
  }
`;

interface Click {
  x: number;
  y: number;
  t0: number;
  strength: number;
}

export function AuroraDrift({ className = "" }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const canvas = document.createElement("canvas");
    // backface-visibility + translate3d forces the canvas onto its own GPU layer,
    // preventing iOS Safari from repainting it (and flashing) on every scroll frame.
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;-webkit-backface-visibility:hidden;backface-visibility:hidden;transform:translateZ(0);";
    container.appendChild(canvas);

    // gl is confirmed non-null after the early return below
    const gl = canvas.getContext("webgl", {
      antialias: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
    });
    if (!gl) {
      container.removeChild(canvas);
      return;
    }
    // Alias to help TS understand gl is non-null inside closures
    const ctx = gl;

    function compile(type: number, src: string): WebGLShader | null {
      const s = ctx.createShader(type);
      if (!s) return null;
      ctx.shaderSource(s, src);
      ctx.compileShader(s);
      if (!ctx.getShaderParameter(s, ctx.COMPILE_STATUS)) {
        console.error("Aurora shader error:", ctx.getShaderInfoLog(s));
        return null;
      }
      return s;
    }

    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;

    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error("Aurora link error:", gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
    const locPos = gl.getAttribLocation(prog, "a_position");
    gl.enableVertexAttribArray(locPos);
    gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, 0, 0);

    const locs = {
      res:    gl.getUniformLocation(prog, "u_resolution"),
      time:   gl.getUniformLocation(prog, "u_time"),
      mouse:  gl.getUniformLocation(prog, "u_mouse"),
      mAct:   gl.getUniformLocation(prog, "u_mouseActive"),
      clicks: gl.getUniformLocation(prog, "u_clicks[0]"),
    };

    let W = 0, H = 0;
    const mouse = [0.5, 0.5];
    const mouseSmooth = [0.5, 0.5];
    let mouseActive = 0;
    let lastT = 0;
    const T0 = performance.now();
    const clicks: Click[] = [];

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const newW = Math.max(1, Math.floor(rect.width  * dpr));
      const newH = Math.max(1, Math.floor(rect.height * dpr));
      if (newW !== W || newH !== H) {
        canvas.width = newW; canvas.height = newH;
        ctx.viewport(0, 0, newW, newH);
        W = newW; H = newH;
      }
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Attach to window so the shader reacts anywhere on the page
    function onMove(e: PointerEvent) {
      const rect = canvas.getBoundingClientRect();
      mouse[0] = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      mouse[1] = Math.max(0, Math.min(1, 1.0 - (e.clientY - rect.top) / rect.height));
      mouseActive = 1;
    }
    function onDown(e: PointerEvent) {
      const rect = canvas.getBoundingClientRect();
      clicks.push({
        x: (e.clientX - rect.left) / rect.width,
        y: 1.0 - (e.clientY - rect.top) / rect.height,
        t0: (performance.now() - T0) / 1000,
        strength: 1,
      });
      while (clicks.length > 8) clicks.shift();
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerdown", onDown);

    let raf = 0;
    function tick() {
      const t = (performance.now() - T0) / 1000;
      const dt = Math.min(0.1, t - lastT);
      lastT = t;

      const k = 1 - Math.exp(-dt * 9);
      mouseSmooth[0] += (mouse[0] - mouseSmooth[0]) * k;
      mouseSmooth[1] += (mouse[1] - mouseSmooth[1]) * k;

      ctx.useProgram(prog);
      ctx.uniform2f(locs.res,   W, H);
      ctx.uniform1f(locs.time,  t);
      ctx.uniform2f(locs.mouse, mouseSmooth[0], mouseSmooth[1]);
      ctx.uniform1f(locs.mAct,  mouseActive);

      // Pack click data; expire after 6 s
      for (let i = clicks.length - 1; i >= 0; i--) {
        if (t - clicks[i].t0 > 6) clicks.splice(i, 1);
      }
      const data = new Float32Array(8 * 4);
      for (let i = 0; i < clicks.length && i < 8; i++) {
        const c = clicks[i];
        data[i*4+0] = c.x;
        data[i*4+1] = c.y;
        data[i*4+2] = Math.max(0, t - c.t0);
        data[i*4+3] = c.strength;
      }
      ctx.uniform4fv(locs.clicks, data);

      ctx.drawArrays(ctx.TRIANGLES, 0, 6);
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      try { ctx.deleteProgram(prog); ctx.deleteBuffer(vbo); } catch (_) {}
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: "relative", width: "100%", height: "100%" }}
    />
  );
}
