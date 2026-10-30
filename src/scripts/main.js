import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function init() {
  // ---------- smooth scroll
  let lenis = null;
  if (!reduced) {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    const el = id === '#top' ? document.body : $(id);
    if (!el) return;
    e.preventDefault();
    const end = a.dataset.end && $(a.dataset.end);
    if (end) {
      // scroll so the whole section top is visible, but never hide its main call to action
      const top = el.getBoundingClientRect().top + scrollY - 70;
      const ctaBottom = end.getBoundingClientRect().bottom + scrollY + 40;
      const y = Math.max(top, ctaBottom - innerHeight);
      lenis ? lenis.scrollTo(y) : scrollTo({ top: y, behavior: 'smooth' });
      return;
    }
    lenis ? lenis.scrollTo(el, { offset: id === '#top' ? 0 : -70 }) : el.scrollIntoView({ behavior: 'smooth' });
  }));

  // ---------- nav
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 30);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // ---------- entrances
  if (reduced) { $$('.up').forEach((e) => (e.style.opacity = 1)); }
  else {
    const heroUps = $$('.hero .up');
    gsap.to(heroUps, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: .08, delay: .15 });
    ScrollTrigger.batch($$('.up').filter((e) => !heroUps.includes(e)), {
      start: 'top 88%',
      onEnter: (b) => gsap.to(b, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: .08 }),
    });
    const curve = $('.pen .curve');
    if (curve) { const L = curve.getTotalLength(); gsap.fromTo(curve, { strokeDasharray: L, strokeDashoffset: L }, { strokeDashoffset: 0, duration: 2, ease: 'power2.inOut', delay: .6 }); }
        gsap.from('.sticker', { scale: 0, opacity: 0, duration: .8, ease: 'back.out(2)', stagger: .15, delay: .9 });
  }

  // ---------- hello word reveal
  const r = $('#reveal');
  const words = r.textContent.trim().split(/\s+/);
  r.innerHTML = words.map((w) => `<span class="w">${w}</span>`).join(' ');
  const ws = $$('.w', r);
  if (reduced) ws.forEach((w) => w.classList.add('on'));
  else ScrollTrigger.create({ trigger: r, start: 'top 80%', end: 'bottom 40%', scrub: true,
    onUpdate: (s) => { const n = Math.round(s.progress * ws.length); ws.forEach((w, i) => w.classList.toggle('on', i < n)); } });
  // ---------- hero glow follows the mouse, edge blobs drift softly
  if (!reduced && matchMedia('(hover:hover)').matches) {
    const hero = $('.hero'), glow = $('.glow', hero), b1 = $('.blob.b1'), b2 = $('.blob.b2');
    if (hero && glow) {
      const gx = gsap.quickTo(glow, 'x', { duration: 1.6, ease: 'power3.out' }), gy = gsap.quickTo(glow, 'y', { duration: 1.6, ease: 'power3.out' });
      const drift = [[b1, .3, .22], [b2, -.22, -.18]].filter(([el]) => el).map(([el, sx, sy]) => ({ x: gsap.quickTo(el, 'x', { duration: 2.6, ease: 'power2.out' }), y: gsap.quickTo(el, 'y', { duration: 2.6, ease: 'power2.out' }), sx, sy }));
      let first = true;
      hero.addEventListener('mousemove', (e) => {
        const r = hero.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
        if (first) { gsap.set(glow, { x, y }); first = false; }
        gx(x); gy(y); hero.classList.add('lit');
        const dx = e.clientX - innerWidth / 2, dy = e.clientY - innerHeight / 2;
        drift.forEach((o) => { o.x(dx * o.sx); o.y(dy * o.sy); });
      }, { passive: true });
      hero.addEventListener('mouseleave', () => { hero.classList.remove('lit'); drift.forEach((o) => { o.x(0); o.y(0); }); });
      gsap.to([b1, b2].filter(Boolean), { scale: 1.12, duration: 6, ease: 'sine.inOut', yoyo: true, repeat: -1, stagger: 3 });
    }
  }

  // ---------- skills as Figma layers, a cursor hops between them
  const layers = $$('.floaters .layer'), fcur = $('.fcursor');
  if (layers.length) {
    let cur = -1, timer = null, paused = false;
    const select = (i) => {
      if (i === cur) return; cur = i;
      layers.forEach((l, k) => l.classList.toggle('sel', k === i));
      const l = layers[i];
      $('.dim', l).textContent = `${l.offsetWidth} × ${l.offsetHeight}`;
      if (fcur && getComputedStyle(fcur).display !== 'none') {
        const x = l.offsetLeft + l.offsetWidth - 10, y = l.offsetTop + l.offsetHeight - 8;
        if (reduced || !fcur.classList.contains('on')) { gsap.set(fcur, { x, y }); fcur.classList.add('on'); }
        else gsap.to(fcur, { x, y, duration: .9, ease: 'power3.inOut' });
      }
    };
    const next = () => { if (!paused) select((cur + 1 + Math.floor(Math.random() * (layers.length - 1))) % layers.length); };
    layers.forEach((l, k) => {
      l.addEventListener('mouseenter', () => { paused = true; select(k); });
      l.addEventListener('mouseleave', () => { paused = false; });
    });
    new IntersectionObserver(([e]) => {
      clearInterval(timer);
      if (e.isIntersecting) { if (cur < 0) select(0); if (!reduced) timer = setInterval(next, 1900); }
    }).observe($('.hello'));
  }

  // ---------- buttons: bloom from the cursor + gentle magnet
  if (matchMedia('(hover:hover)').matches) {
    $$('.btn').forEach((b) => {
      const qx = reduced ? null : gsap.quickTo(b, 'x', { duration: .5, ease: 'power3' });
      const qy = reduced ? null : gsap.quickTo(b, 'y', { duration: .5, ease: 'power3' });
      const at = (e) => { const r = b.getBoundingClientRect(); b.style.setProperty('--x', `${e.clientX - r.left}px`); b.style.setProperty('--y', `${e.clientY - r.top}px`); return r; };
      b.addEventListener('mouseenter', at);
      b.addEventListener('mousemove', (e) => { const r = at(e); if (qx) { qx((e.clientX - r.left - r.width / 2) * .22); qy((e.clientY - r.top - r.height / 2) * .3); } });
      b.addEventListener('mouseleave', (e) => { at(e); if (qx) { qx(0); qy(0); } });
    });
  }

  // ---------- work card tilt
  if (!reduced && matchMedia('(hover:hover)').matches) {
    $$('.proj .art').forEach((art) => {
      const qx = gsap.quickTo(art, 'rotationY', { duration: .6, ease: 'power3' });
      const qy = gsap.quickTo(art, 'rotationX', { duration: .6, ease: 'power3' });
      gsap.set(art, { transformPerspective: 900 });
      art.addEventListener('pointermove', (e) => { const b = art.getBoundingClientRect(); qx(((e.clientX - b.left) / b.width - .5) * 8); qy(-((e.clientY - b.top) / b.height - .5) * 8); });
      art.addEventListener('pointerleave', () => { qx(0); qy(0); });
    });
  }

  // ---------- rebirth
  rebirth();

  // ---------- experience preview
  const pv = $('#preview');
  if (matchMedia('(hover:hover)').matches) {
    const px = gsap.quickTo(pv, 'left', { duration: .45, ease: 'power3' });
    const py = gsap.quickTo(pv, 'top', { duration: .45, ease: 'power3' });
    $$('#before li').forEach((li) => {
      li.addEventListener('pointerenter', () => { $('b', pv).textContent = li.dataset.t; $('p', pv).textContent = li.dataset.p; pv.classList.add('show'); });
      li.addEventListener('pointerleave', () => pv.classList.remove('show'));
      li.addEventListener('pointermove', (e) => { px(e.clientX + 24); py(e.clientY - 60); });
    });
  }

  // ---------- counters
  $$('[data-count]').forEach((el) => {
    const to = +el.dataset.count; const o = { v: 0 };
    ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => gsap.to(o, { v: to, duration: 1.6, ease: 'power2.out', onUpdate: () => { el.textContent = Math.round(o.v).toLocaleString('en-US') + '+'; } }) });
  });

  // ---------- ways toggle
  const t = $('#tog'), pr = $('#paneRole'), pf = $('#paneFree'), lr = $('#lblRole'), lf = $('#lblFree');
  const setWay = (free) => {
    t.setAttribute('aria-checked', String(free)); t.setAttribute('aria-label', free ? 'Show full-time details' : 'Show freelance details');
    pr.hidden = free; pf.hidden = !free; lr.classList.toggle('act', !free); lf.classList.toggle('act', free);
    if (!reduced) gsap.from(free ? pf : pr, { opacity: 0, y: 14, duration: .45, ease: 'power2.out' });
  };
  t.addEventListener('click', () => setWay(t.getAttribute('aria-checked') !== 'true'));
  lr.addEventListener('click', () => setWay(false)); lf.addEventListener('click', () => setWay(true));

  // ---------- copy email
  const btn = $('#copyBtn'), mail = $('#mail');
  btn.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(mail.textContent); btn.textContent = 'Copied ✓'; }
    catch { const rg = document.createRange(); rg.selectNodeContents(mail); const s = getSelection(); s.removeAllRanges(); s.addRange(rg); btn.textContent = 'Selected'; }
    setTimeout(() => (btn.textContent = 'Copy email'), 1800);
  });

  // ---------- designer / developer mode
  const d = $('#mDesign'), c = $('#mCode');
  const setMode = (code) => {
    document.body.classList.toggle('code', code); d.setAttribute('aria-pressed', String(!code)); c.setAttribute('aria-pressed', String(code));
    try { localStorage.setItem('tm-mode', code ? 'code' : 'design'); } catch {}
    ScrollTrigger.refresh();
  };
  d.addEventListener('click', () => setMode(false)); c.addEventListener('click', () => setMode(true));
  try { if (localStorage.getItem('tm-mode') === 'code') setMode(true); } catch {}

  addEventListener('load', () => ScrollTrigger.refresh());
}

function rebirth() {
  const section = $('.rebirth');
  if (reduced) { section.classList.add('rm'); return; }
  const stage = $('#rbStage'), editor = $('#editor'), phoenix = $('#phoenix'), design = $('#sceneDesign');
  const lines = $$('.editor .ln'), devTl = $$('#devTl li'), chat = $('#chat');
  const desTl = $$('#desTl li'), card = $('#dcard'), winds = $$('#winds path');
  winds.forEach((p) => { const L = p.getTotalLength(); p.style.strokeDasharray = `${L * .25} ${L}`; p.style.strokeDashoffset = L * 1.25; p.dataset.l = L; });

  // flight path in stage-relative 0..1 coords (cubic bezier)
  const P = [[-0.18, 1.12], [0.25, 0.55], [0.55, 0.85], [1.15, -0.28]];
  const bez = (t) => { const u = 1 - t; const k = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t]; return [0, 1].map((i) => k.reduce((s, kk, j) => s + kk * P[j][i], 0)); };

  const state = { flight: 0 };
  let fx = null; // particles renderer

  const tl = gsap.timeline({
    scrollTrigger: { trigger: stage, start: 'top top', end: '+=320%', pin: true, scrub: 1, anticipatePin: 1,
      onEnter: () => { if (!fx) loadFx(); } },
    defaults: { ease: 'none' },
  });
  tl.to(lines, { opacity: 1, stagger: .12, duration: .3 }, 0)
    .to(devTl, { opacity: 1, stagger: .35, duration: .4 }, .4)
    .to(chat, { opacity: 1, duration: .5 }, 1.8)
    .from('.bubble', { y: 20, scale: .96, duration: .5 }, 1.8)
    .to('#rbHint', { opacity: 0, duration: .3 }, 2.6)
    .to(state, { flight: 1, duration: 3.6, ease: 'power1.inOut', onUpdate: () => render(state.flight) }, 3)
    .to(editor, { opacity: 0, filter: 'blur(6px)', duration: 1.2 }, 3.1)
    .to('.scene-dev .side, .scene-dev .rb-title, .scene-dev .rb-kicker', { opacity: 0, duration: 1 }, 3.6)
    .fromTo(card, { opacity: 0, scale: .85, rotate: -4 }, { opacity: 1, scale: 1, rotate: 0, duration: 1, ease: 'back.out(1.6)' }, 6.3)
    .from('#sceneDesign .rb-title, #sceneDesign .rb-kicker', { y: 30, opacity: 0, duration: .8 }, 6.1)
    .to(desTl, { opacity: 1, stagger: .3, duration: .4 }, 6.6)
    .to({}, { duration: 1.2 });

  function render(t) {
    const w = stage.clientWidth, h = stage.clientHeight;
    const [x, y] = bez(Math.min(1, Math.max(0, t)));
    const [x2, y2] = bez(Math.min(1, t + .01));
    const ang = Math.atan2((y2 - y) * h, (x2 - x) * w) * 180 / Math.PI + 55;
    const s = .7 + Math.sin(t * Math.PI) * .55;
    const pw = phoenix.offsetWidth, ph = phoenix.offsetHeight;
    gsap.set(phoenix, { x: x * w - pw / 2, y: y * h - ph / 2, rotation: ang * .35, scale: s, opacity: t > 0 && t < 1 ? Math.min(1, t * 8, (1 - t) * 6) : 0 });
    const rad = Math.max(0, (t - .1) / .9) * 260;
    design.style.clipPath = t >= .97 ? 'none' : `circle(${rad}% at ${(x * 100).toFixed(1)}% ${(y * 100).toFixed(1)}%)`;
    winds.forEach((p, i) => { const L = +p.dataset.l; const k = Math.min(1, Math.max(0, (t - i * .06) * 1.4)); p.style.strokeDashoffset = L * 1.25 - k * L * 1.5; p.style.opacity = Math.sin(k * Math.PI) * .8; });
    if (fx) fx.update(t, x * w, y * h);
  }
  render(0);

  async function loadFx() {
    fx = { update() {} };
    const THREE = await import('three');
    const canvas = $('#rbCanvas');
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    const pr = Math.min(devicePixelRatio, 2); renderer.setPixelRatio(pr);
    const scene = new THREE.Scene();
    let W = 1, H = 1; const cam = new THREE.OrthographicCamera(0, 1, 0, 1, -10, 10);
    const small = innerWidth < 700;
    const ND = small ? 500 : 1100, NE = small ? 260 : 520, N = ND + NE;
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), alpha = new Float32Array(N), size = new Float32Array(N);
    const seed = Array.from({ length: N }, () => [Math.random(), Math.random(), Math.random(), Math.random()]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('alpha', new THREE.BufferAttribute(alpha, 1));
    geo.setAttribute('size', new THREE.BufferAttribute(size, 1));
    const palette = ['#F7EAE6', '#F0C1AE', '#C3999E', '#A8D5BA', '#8E5464'].map((c) => new THREE.Color(c));
    for (let i = 0; i < N; i++) {
      const c = i < ND ? palette[Math.floor(seed[i][3] * 4)] : palette[[1, 1, 2, 4][Math.floor(seed[i][3] * 4)]];
      col.set([c.r, c.g, c.b], i * 3);
      size[i] = (i < ND ? 1.6 + seed[i][2] * 2.4 : 2 + seed[i][2] * 5) * pr;
    }
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: 'attribute float alpha;attribute float size;varying float vA;varying vec3 vC;void main(){vA=alpha;vC=color;gl_PointSize=size;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'varying float vA;varying vec3 vC;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(vC,vA*smoothstep(.5,.1,d));}',
      vertexColors: true,
    });
    scene.add(new THREE.Points(geo, mat));
    let er = { x: 0, y: 0, w: 1, h: 1 };
    const size2 = () => {
      W = stage.clientWidth; H = stage.clientHeight; renderer.setSize(W, H, false);
      cam.right = W; cam.bottom = H; cam.updateProjectionMatrix();
      const sb = stage.getBoundingClientRect(), eb = editor.getBoundingClientRect();
      er = { x: eb.left - sb.left, y: eb.top - sb.top, w: eb.width, h: eb.height };
    };
    size2(); addEventListener('resize', size2);
    ScrollTrigger.addEventListener('refresh', size2);
    fx = {
      update(t, px, py) {
        for (let i = 0; i < N; i++) {
          const s = seed[i]; let x, y, a;
          if (i < ND) {
            const k = Math.min(1, Math.max(0, (t - s[0] * .25) / .55));
            const e = k * k;
            x = er.x + s[0] * er.w + e * (W * (.35 + s[1] * .6)) + Math.sin(k * 6 + s[2] * 9) * 30 * k;
            y = er.y + s[1] * er.h - e * (H * (.35 + s[2] * .7)) + Math.cos(k * 5 + s[0] * 7) * 24 * k;
            a = k <= 0 ? 0 : Math.min(1, k * 8) * (1 - k) * .9;
          } else {
            const d = s[0] * .3, k = t - d;
            const [bx, by] = bez(Math.min(1, Math.max(0, k)));
            const spread = 20 + d * 520;
            x = bx * W + (s[1] - .5) * spread; y = by * H + (s[2] - .5) * spread + d * 120;
            a = k > 0 && k < 1 ? (1 - d / .3) * Math.min(1, k * 10) * .95 : 0;
          }
          pos[i * 3] = x; pos[i * 3 + 1] = y; alpha[i] = a;
        }
        geo.attributes.position.needsUpdate = true; geo.attributes.alpha.needsUpdate = true;
        renderer.render(scene, cam);
      },
    };
    render(state.flight);
  }
}
