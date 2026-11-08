// Procedural fire phoenix (intro): flapping wings, flowing tail ribbons, real-feeling flame particles.
const PHX = (() => {
  const TAU = Math.PI * 2;
  const rnd = (a, b) => a + Math.random() * (b - a);
  // colour ramp for burning particles: white-hot → yellow → orange → red → rose smoke
  const RAMP = [[255, 248, 226], [255, 222, 150], [255, 180, 90], [246, 128, 62], [214, 84, 60], [168, 82, 92], [150, 120, 126]];
  const rampAt = (k) => { const f = k * (RAMP.length - 1), i = Math.min(RAMP.length - 2, f | 0), u = f - i; return RAMP[i].map((c, j) => c + (RAMP[i + 1][j] - c) * u); };
  const sprites = [];
  for (let s = 0; s < 24; s++) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), col = rampAt(s / 23), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, `rgba(${col},1)`); r.addColorStop(.35, `rgba(${col},.55)`); r.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = r; g.fillRect(0, 0, 64, 64); sprites.push(c);
  }
  const glow = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,190,110,.55)'); r.addColorStop(.4, 'rgba(250,140,90,.22)'); r.addColorStop(1, 'rgba(240,120,90,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); return c; })();

  function create() { return { x: 0, y: 0, z: 0, heading: 0, scale: 1, alpha: 0, front: true, active: false, hist: [], density: 1 }; }

  function mount(back, front, b) {
    const cvs = [back, front], ctxs = cvs.map((c) => c.getContext('2d'));
    let CW = 1, CH = 1;
    const fit = () => { const pr = Math.min(devicePixelRatio, 2); CW = back.clientWidth || innerWidth; CH = back.clientHeight || innerHeight; cvs.forEach((c, i) => { c.width = CW * pr; c.height = CH * pr; ctxs[i].setTransform(pr, 0, 0, pr, 0, 0); }); };
    fit(); addEventListener('resize', fit);
    const parts = []; let last = 0, phase = 0;

    function wingPts(s, sc, e, ch, sh) {
      // local wing outline (bird faces +x, s = ±1 side), e = wing elevation −1..1
      const L = 96, span = L * (.62 + .38 * Math.cos(e * 1.15)), sweep = -L * (.22 + .12 * e);
      const lift = -e * L * .42 * sc; // screen-space lift so the stroke reads in any heading
      const W = (lx, ly) => [b.x + (lx * ch - ly * sh) * sc, b.y + (lx * sh + ly * ch) * sc + lift * Math.min(1, Math.abs(ly) / span)];
      const lead = [[10, s * 5], [14, s * span * .35], [6, s * span * .7], [sweep + 8, s * span * .96], [sweep, s * span]];
      const trail = [];
      const n = 7;
      for (let i = 0; i <= n; i++) { // scalloped primaries/secondaries along trailing edge
        const u = i / n, y = s * span * (1 - u), x = sweep - 6 - Math.sin(u * Math.PI) * 30 - (1 - u) * 14;
        trail.push([x, y]); if (i < n) trail.push([x + 9, y - s * span / n * .5]);
      }
      trail.push([-16, s * 5]);
      return { pts: lead.concat(trail).map(([a, c]) => W(a, c)), tip: W(sweep, s * span), elbow: W(0, s * span * .55), rootB: W(-12, s * 6), trail: trail.filter((_, i) => i % 2 === 0).map(([a, c]) => W(a, c)) };
    }

    function drawBird(ctx, sc, e) {
      const ch = Math.cos(b.heading), sh = Math.sin(b.heading);
      const P = (lx, ly) => [b.x + (lx * ch - ly * sh) * sc, b.y + (lx * sh + ly * ch) * sc];
      ctx.save(); ctx.globalAlpha = b.alpha;
      ctx.drawImage(glow, b.x - 110 * sc, b.y - 110 * sc, 220 * sc, 220 * sc);
      // tail: long flowing flame feathers that sway behind the body
      for (const [off, len] of [[-9, 92], [0, 118], [9, 92], [-4, 70], [4, 70]]) {
        const N = 14; let px, py;
        for (let i = 0; i <= N; i++) {
          const u = i / N, lx = -22 - u * len, ly = off * (.4 + u * 1.3) + Math.sin(phase * .55 - u * 4 + off) * 9 * u;
          const [x, y] = P(lx, ly);
          if (i) { const col = rampAt(.15 + u * .75); ctx.strokeStyle = `rgba(${col},${(1 - u) * .9})`; ctx.lineWidth = Math.max(.6, (1 - u) * 6.5 * sc); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke(); }
          px = x; py = y;
        }
        (b._tails || (b._tails = [])).push(P(-22 - len * .9, off * 1.5));
      }
      // wings (far wing first)
      for (const s of [-1, 1]) {
        const w = wingPts(s, sc, e, ch, sh);
        const g = ctx.createLinearGradient(b.x, b.y, w.tip[0], w.tip[1]);
        g.addColorStop(0, 'rgba(255,240,205,.98)'); g.addColorStop(.35, 'rgba(255,196,110,.95)'); g.addColorStop(.7, 'rgba(242,124,70,.9)'); g.addColorStop(1, 'rgba(176,74,78,.75)');
        ctx.fillStyle = g; ctx.beginPath(); w.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill();
        // feather veins
        ctx.strokeStyle = 'rgba(255,246,220,.55)'; ctx.lineWidth = 1 * sc;
        for (const t of w.trail) { ctx.beginPath(); ctx.moveTo(w.elbow[0] * .5 + b.x * .5, w.elbow[1] * .5 + b.y * .5); ctx.lineTo(t[0], t[1]); ctx.stroke(); }
        w._s = s; (b._w || (b._w = {}))[s] = w;
      }
      // body
      const bg = ctx.createLinearGradient(...P(-22, 0), ...P(30, 0));
      bg.addColorStop(0, 'rgba(240,130,70,.95)'); bg.addColorStop(.6, 'rgba(255,214,140,1)'); bg.addColorStop(1, 'rgba(255,246,222,1)');
      ctx.fillStyle = bg; ctx.beginPath();
      const body = [[30, 0], [22, 7], [4, 10], [-14, 7], [-26, 2], [-26, -2], [-14, -7], [4, -10], [22, -7]];
      body.forEach(([lx, ly], i) => { const [x, y] = P(lx, ly); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath(); ctx.fill();
      // head, beak, crest
      const [hx, hy] = P(34, 0); ctx.fillStyle = 'rgba(255,248,230,1)'; ctx.beginPath(); ctx.arc(hx, hy, 7 * sc, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(200,96,70,1)'; ctx.beginPath(); [[46, 0], [39, 3], [39, -3]].forEach(([lx, ly], i) => { const [x, y] = P(lx, ly); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.fill();
      ctx.strokeStyle = 'rgba(255,170,90,.9)'; ctx.lineWidth = 1.6 * sc; ctx.lineCap = 'round';
      for (const k of [-1, 0, 1]) { ctx.beginPath(); ctx.moveTo(hx, hy); const [cx, cy] = P(28, k * 8); const [ex, ey] = P(18 + Math.sin(phase * .5 + k) * 3, k * 14); ctx.quadraticCurveTo(cx, cy, ex, ey); ctx.stroke(); }
      ctx.restore();
    }

    let px = null, py = null;
    function spawn(sc) {
      const lay = b.front ? 1 : 0, ch = Math.cos(b.heading), sh = Math.sin(b.heading);
      const dx = px == null ? 0 : b.x - px, dy = px == null ? 0 : b.y - py;
      const steps = Math.max(1, Math.min(8, Math.round(Math.hypot(dx, dy) / 6)));
      const emit = (x, y, n, sz, life, spd) => { for (let st = 0; st < steps; st++) { const f = st / steps; for (let i = 0; i < n; i++) if (Math.random() < b.density) parts.push({ x: x - dx * f + rnd(-3, 3) * sc, y: y - dy * f + rnd(-3, 3) * sc, vx: -ch * spd * rnd(.3, 1) + rnd(-14, 14), vy: -sh * spd * rnd(.3, 1) + rnd(-30, 0), life: 0, max: rnd(life * .55, life), s: rnd(sz * .55, sz) * sc, seed: Math.random() * 99, lay }); } };
      const w = b._w || {};
      for (const s of [-1, 1]) { const ww = w[s]; if (!ww) continue; ww.trail.forEach((t, i) => { if (i % 2 === 0) emit(t[0], t[1], 1, 9, .38, 40); }); emit(ww.tip[0], ww.tip[1], 1, 8, .45, 30); }
      emit(b.x - ch * 18 * sc, b.y - sh * 18 * sc, 2, 13, .5, 70);
      (b._tails || []).forEach(([x, y]) => emit(x, y, 1, 10, .55, 25));
      b._tails = [];
      px = b.x; py = b.y;
    }

    let raf = 0, running = false;
    function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(.05, (now - (last || now)) / 1000); last = now;
      phase += dt * TAU * 2.1;
      const e = Math.sin(phase + .45 * Math.sin(phase)); // quick downstroke, slower recovery
      const sc = b.scale;
      ctxs.forEach((c) => c.clearRect(0, 0, CW, CH));
      if (b.active && b.alpha > .02) {
        b.hist.push({ x: b.x, y: b.y, hd: b.heading }); if (b.hist.length > 26) b.hist.shift();
        spawn(sc);
      } else { b.hist.length = 0; px = null; }
      // particles
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]; p.life += dt; if (p.life > p.max) { parts.splice(i, 1); continue; }
        const k = p.life / p.max;
        p.vy -= 160 * dt; // buoyancy
        p.vx += Math.sin(now / 160 + p.seed) * 40 * dt; p.vx *= .985; p.vy *= .985;
        p.x += p.vx * dt; p.y += p.vy * dt;
        const ctx = ctxs[p.lay], sz = p.s * (1 + k * 1.8);
        ctx.globalAlpha = (k < .1 ? k / .1 : Math.pow(1 - (k - .1) / .9, 1.4)) * .62;
        ctx.drawImage(sprites[Math.min(23, (k * 23) | 0)], p.x - sz, p.y - sz, sz * 2, sz * 2);
      }
      ctxs.forEach((c) => (c.globalAlpha = 1));
      if (parts.length > 2500) parts.splice(0, parts.length - 2500);
      if (b.active && b.alpha > .02) drawBird(ctxs[b.front ? 1 : 0], sc, e);
    }
    const start = () => { if (!running) { running = true; last = 0; raf = requestAnimationFrame(frame); } };
    const stop = () => { running = false; cancelAnimationFrame(raf); parts.length = 0; ctxs.forEach((c) => c.clearRect(0, 0, CW, CH)); };
    return { start, stop, fit };
  }
  return { create, mount };
})();
export default PHX;
