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

    // hand-drawn phoenix artwork (side view while flying, front view when it rises), tinted with fire
    const tint = (src, w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; c.ready = false;
      const im = new Image(); im.onload = () => { const g = c.getContext('2d'); g.drawImage(im, 0, 0, w, h); g.globalCompositeOperation = 'source-in';
        const gr = g.createLinearGradient(0, 0, w * .3, h); gr.addColorStop(0, '#FFE7B8'); gr.addColorStop(.35, '#FFB866'); gr.addColorStop(.7, '#EE7A4A'); gr.addColorStop(1, '#B04A5A');
        g.fillStyle = gr; g.fillRect(0, 0, w, h); c.ready = true; }; im.src = src; return c; };
    const SIDE = tint('/img/phx-side.png', 492, 700), FRONT = tint('/img/phx-front.png', 612, 700);
    const ART_H = 230, SIDE_ANCHOR = [.6, .42], FWD = -35 * Math.PI / 180;
    // where a point of the side artwork (u,v in 0..1) lands in the world, honouring rotation + mirroring
    const pose = () => { const right = Math.cos(b.heading) >= 0, hd = right ? b.heading : Math.PI - b.heading; return { right, rot: Math.max(-1.1, Math.min(.9, hd - FWD)) }; };
    const sidePt = (u, v, sc) => {
      const { right, rot } = pose(), h = ART_H * sc, w = h * 492 / 700;
      let x = (u - SIDE_ANCHOR[0]) * w, y = (v - SIDE_ANCHOR[1]) * h;
      const c = Math.cos(rot), s = Math.sin(rot); let X = x * c - y * s, Y = x * s + y * c;
      if (!right) X = -X; return [b.x + X, b.y + Y];
    };
    function drawBird(ctx, sc, e) {
      if (!SIDE.ready || !FRONT.ready) return;
      const h = ART_H * sc, { right, rot } = pose(), fr = b.rise || 0;
      ctx.save(); ctx.globalAlpha = b.alpha;
      ctx.drawImage(glow, b.x - h * .7, b.y - h * .7, h * 1.4, h * 1.4);
      ctx.shadowColor = 'rgba(255,150,80,.7)'; ctx.shadowBlur = 16 * sc;
      if (fr < 1) { // side view, gentle wingbeat
        const w = h * 492 / 700;
        ctx.save(); ctx.globalAlpha = b.alpha * (1 - fr);
        ctx.translate(b.x, b.y); if (!right) ctx.scale(-1, 1); ctx.rotate(rot);
        ctx.scale(1, 1 - .09 * (.5 + .5 * e));
        ctx.drawImage(SIDE, -SIDE_ANCHOR[0] * w, -SIDE_ANCHOR[1] * h, w, h);
        ctx.restore();
      }
      if (fr > 0) { // front view as it rises away
        const w = h * 612 / 700;
        ctx.save(); ctx.globalAlpha = b.alpha * fr;
        ctx.translate(b.x, b.y); ctx.scale(1 - .12 * (.5 + .5 * e), 1);
        ctx.drawImage(FRONT, -w / 2, -h * .45, w, h);
        ctx.restore();
      }
      ctx.restore();
    }

    let px = null, py = null;
    function spawn(sc) {
      if (!SIDE.ready) return;
      const lay = b.front ? 1 : 0, ch = Math.cos(b.heading), sh = Math.sin(b.heading);
      const dx = px == null ? 0 : b.x - px, dy = px == null ? 0 : b.y - py;
      const steps = Math.max(1, Math.min(8, Math.round(Math.hypot(dx, dy) / 6)));
      const emit = (x, y, n, sz, life, spd) => { for (let st = 0; st < steps; st++) { const f = st / steps; for (let i = 0; i < n; i++) if (Math.random() < b.density) parts.push({ x: x - dx * f + rnd(-4, 4) * sc, y: y - dy * f + rnd(-4, 4) * sc, vx: -ch * spd * rnd(.3, 1) + rnd(-12, 12), vy: -sh * spd * rnd(.3, 1) + rnd(-26, 0), life: 0, max: rnd(life * .55, life), s: rnd(sz * .55, sz) * sc, seed: Math.random() * 99, lay }); } };
      if ((b.rise || 0) < .5) {
        emit(...sidePt(.3, .95, sc), 3, 13, .65, 50);   // tail plumes
        emit(...sidePt(.42, .8, sc), 2, 11, .55, 45);
        emit(...sidePt(.12, .12, sc), 1, 8, .4, 30);    // wing tips
        emit(...sidePt(.55, .05, sc), 1, 8, .4, 30);
      } else {
        emit(b.x, b.y + ART_H * sc * .5, 4, 14, .7, 20);
      }
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
