// ─────────────────────────────────────────────────────────────
//  The Haunted Wild — a clickable haunted house by The Virtual Wild
// ─────────────────────────────────────────────────────────────

// ───────── Settings you may want to change ─────────
const SITE = 'https://www.thevirtualwild.com';
const INQUIRY_EMAIL = 'hello@thevirtualwild.com';
// Form delivery: FormSubmit emails every submission to INQUIRY_EMAIL. The first submission sends an
// activation email to that inbox; click it once and every form after that is delivered.
const FORM_ENDPOINT = `https://formsubmit.co/ajax/${INQUIRY_EMAIL}`;
const INSTAGRAM = { handle: '@thevirtualwild', url: 'https://www.instagram.com/thevirtualwild/' };
// The reward for finding all three spirits. Make sure the team can honor it before launch.
const TREAT = {
  title: 'Your treat: a free 20-minute brainstorm',
  body: 'Wondering how AI could actually work in your business? Need an installation that stops a crowd in its tracks? Have a complex idea that has to land with everyone, not just experts? Grab 20 minutes with our team and we’ll work through it with you.',
};
const MAILCHIMP = {                       // from http://eepurl.com/gNXWG5
  action: 'https://thevirtualwild.us4.list-manage.com/subscribe/post-json',
  u: '8b1276d5fce9f2e98101757ba',
  id: 'a2a987a77f',
  fallback: 'http://eepurl.com/gNXWG5',
};

// The seven capabilities, each haunting a spot in the booth.
const CAPS = {
  booth: {
    name: 'Trade Show Booth Design',
    haunt: 'This booth has a way of pulling people in… and never quite letting them go.',
    body: 'Booths designed to stop people in the aisle: bold structure, big screens and interactive moments that turn passers-by into conversations.',
    url: `${SITE}/capability/trade-show-booth-design`,
  },
  ar: {
    name: 'Virtual & Augmented Reality',
    haunt: 'Some of what you see in here isn’t really there.',
    body: 'VR and AR experiences that put your product, place or story all around your audience, on a headset, a phone or a booth screen.',
    url: `${SITE}/capability/virtual-augmented-reality`,
  },
  web: {
    name: 'Immersive Web',
    haunt: 'You’re standing inside one right now.',
    body: 'Browser experiences like this haunted house: they feel like an app or a game, but open from a link. No download, no install.',
    url: `${SITE}/capability/immersive-web`,
  },
  strategy: {
    name: 'Digital Strategy Consulting',
    haunt: 'They’ve been whispering about your next launch.',
    body: 'We help teams decide what to build and why, choosing the right mix of physical, digital and interactive before anything gets made.',
    url: `${SITE}/capability/digital-strategy-consulting`,
  },
  product: {
    name: '3D Product Demos',
    haunt: 'It moved. We swear it moved.',
    body: 'Interactive 3D models that let buyers spin, explode and explore products that are too big, too complex or too early to bring to the show.',
    url: `${SITE}/capability/3d-product-demos`,
  },
  env: {
    name: 'Interactive Environments',
    haunt: 'Touch it. It touches back.',
    body: 'Spaces that respond to the people in them, with touchscreens, sensors and projection that react in real time.',
    url: `${SITE}/capability/interactive-environments`,
  },
  marketing: {
    name: 'Digital Marketing',
    haunt: 'Word spreads fast in this house.',
    body: 'Campaigns that carry the experience past the event: content, social and email that keep people talking after they leave.',
    url: `${SITE}/capability/digital-marketing`,
  },
};

// Positions are fractions of the (square) video frame.
const ROOMS = [
  { name: 'The Grand Hall', num: 'I', rect: [0.11, 0.21, 0.47, 0.68], door: [0.23, 0.69],
    spots: [['booth', 0.335, 0.335], ['ar', 0.245, 0.47], ['web', 0.378, 0.535]],
    egg: { id: 'bats', at: [0.163, 0.545], line: 'Special delivery… from the other side.' } },
  { name: 'The Séance Room', num: 'II', rect: [0.43, 0.21, 0.68, 0.69], door: [0.5, 0.765],
    spots: [['strategy', 0.513, 0.535], ['product', 0.64, 0.6]],
    egg: { id: 'ghost', at: [0.472, 0.49], line: 'Something was hiding in the ferns.' } },
  { name: 'The Crypt Lounge', num: 'III', rect: [0.63, 0.22, 0.9, 0.64], door: [0.79, 0.655],
    spots: [['env', 0.81, 0.55], ['marketing', 0.816, 0.462]],
    egg: { id: 'hands', at: [0.686, 0.43], line: 'They want out.' } },
];
const SIGN = { cross: [0.243, 0.262, 0.172, 0.04], tag: [0.33, 0.25, 0.058, -0.09] }; // the "VIRTUAL" on the booth sign

const MP_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const SEG_MODEL = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite';

// ───────── Helpers ─────────
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const easeOut = p => 1 - (1 - p) * (1 - p);
const TAU = Math.PI * 2;
const wait = ms => new Promise(r => setTimeout(r, ms));
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
const cleanName = s => (s || '').replace(/[^\p{L}\p{M} .'-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 24);
const pageUrl = () => location.origin + location.pathname;
const dareUrl = name => name ? `${pageUrl()}?free=${encodeURIComponent(name)}` : pageUrl();

// ───────── Audio (all synthesized) ─────────
const AU = { ctx: null, out: null, noise: null, wind: null, muted: store.get('thw-muted', false) };
function audioInit() {
  if (AU.ctx) { AU.ctx.resume?.(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  const c = AU.ctx = new AC();
  const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
  AU.out = c.createGain(); AU.out.gain.value = AU.muted ? 0 : 0.85;
  AU.out.connect(comp); comp.connect(c.destination);
  const len = c.sampleRate * 2, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  AU.noise = b;
  const s = c.createBufferSource(); s.buffer = c.createBuffer(1, 1, 22050); s.connect(c.destination); s.start(0);
  if (navigator.audioSession) { try { navigator.audioSession.type = 'playback'; } catch {} }
  c.resume?.();
}
function setMuted(m) {
  AU.muted = m; store.set('thw-muted', m);
  $('#sound').setAttribute('aria-pressed', String(m)); $('#sound').setAttribute('aria-label', m ? 'Turn sound on' : 'Mute sound');
  if (AU.out) AU.out.gain.setTargetAtTime(m ? 0 : 0.85, AU.ctx.currentTime, 0.05);
  if (typeof S !== 'undefined' && S.phase === 'intro') video.muted = m;
}
const now = () => AU.ctx.currentTime;
const osc = (type, f) => { const o = AU.ctx.createOscillator(); o.type = type; o.frequency.value = f; return o; };
const gain = (v = 0.0001) => { const g = AU.ctx.createGain(); g.gain.value = v; return g; };
const filt = (type, f, q = 1) => { const b = AU.ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
const noiseSrc = () => { const s = AU.ctx.createBufferSource(); s.buffer = AU.noise; s.loop = true; return s; };
const chain = (...n) => { for (let i = 0; i < n.length - 1; i++) n[i].connect(n[i + 1]); return n[n.length - 1]; };
function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
function burst(t, type, f, q, peak, d) { const n = noiseSrc(), b = filt(type, f, q), g = gain(); chain(n, b, g, AU.out); n.start(t, Math.random()); n.stop(t + d + 0.05); env(g, t, 0.002, peak, d); }
function tone(t, type, f, peak, d, f2) {
  const o = osc(type, f), g = gain(); chain(o, g, AU.out); if (f2) { o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f2, t + d); }
  o.start(t); o.stop(t + d + 0.05); env(g, t, 0.01, peak, d);
}
const SFX = {
  ok: () => !!AU.ctx,
  thunder() { if (!SFX.ok()) return; const t = now(); const n = noiseSrc(), lp = filt('lowpass', 500, 0.7), g = gain(); chain(n, lp, g, AU.out);
    lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(90, t + 2.6); n.start(t, Math.random()); n.stop(t + 3);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.7, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);
    tone(t, 'sine', 55, 0.4, 2.2, 32); },
  wind() { if (!SFX.ok() || AU.wind) return; const t = now(); const n = noiseSrc(), bp = filt('bandpass', 420, 0.8), g = gain(); chain(n, bp, g, AU.out); n.start(t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06, t + 4);
    const l = osc('sine', 0.09), lg = gain(220); chain(l, lg, bp.frequency); l.start(t);
    const l2 = osc('sine', 0.13), lg2 = gain(0.025); chain(l2, lg2, g.gain); l2.start(t);
    const dr = osc('sawtooth', 49), dr2 = osc('sawtooth', 49.4), dlp = filt('lowpass', 160, 2), dg = gain();
    dr.connect(dlp); dr2.connect(dlp); chain(dlp, dg, AU.out); dr.start(t); dr2.start(t); dg.gain.setValueAtTime(0.0001, t); dg.gain.exponentialRampToValueAtTime(0.035, t + 6);
    AU.wind = true; },
  rattle() { if (!SFX.ok()) return; const t = now(); for (let i = 0; i < 7; i++) { const x = t + i * 0.075 + (i > 3 ? 0.12 : 0); burst(x, 'bandpass', 3200 + Math.random() * 800, 6, 0.35, 0.03); tone(x, 'triangle', 2400, 0.03, 0.03); } },
  hiss() { if (!SFX.ok()) return () => {}; const t = now(); const n = noiseSrc(), hp = filt('highpass', 2600), bp = filt('peaking', 6000, 1), g = gain();
    bp.gain.value = 6; chain(n, hp, bp, g, AU.out); n.start(t, Math.random()); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.05);
    return () => { const e = now(); g.gain.cancelScheduledValues(e); g.gain.setValueAtTime(g.gain.value, e); g.gain.exponentialRampToValueAtTime(0.0001, e + 0.08); n.stop(e + 0.12); }; },
  creak() { if (!SFX.ok()) return; const t = now(), d = 0.9; const o = osc('sawtooth', 18), b = filt('bandpass', 1300, 9), g = gain(); chain(o, b, g, AU.out);
    o.frequency.setValueAtTime(16, t); o.frequency.linearRampToValueAtTime(42, t + d); o.start(t); o.stop(t + d + 0.05);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(3.5, t + 0.1); g.gain.linearRampToValueAtTime(0.0001, t + d); },
  whoosh() { if (!SFX.ok()) return; const t = now(); const n = noiseSrc(), b = filt('bandpass', 300, 1.2), g = gain(); chain(n, b, g, AU.out);
    b.frequency.setValueAtTime(250, t); b.frequency.exponentialRampToValueAtTime(1600, t + 0.6); n.start(t, Math.random()); n.stop(t + 0.75); env(g, t, 0.25, 0.14, 0.45); },
  chime() { if (!SFX.ok()) return; const t = now(); [[880, 0], [1318.5, 0.09], [1760, 0.18], [2637, 0.27]].forEach(([f, d]) => tone(t + d, 'sine', f, 0.09, 1.6)); },
  soft() { if (!SFX.ok()) return; const t = now(); tone(t, 'sine', 660, 0.05, 0.5); tone(t + 0.06, 'sine', 990, 0.03, 0.5); },
  giggle() { if (!SFX.ok()) return; const t = now(); [0, 0.17, 0.32, 0.45].forEach((d, i) => { const o = osc('triangle', 980 - i * 40), b = filt('bandpass', 1400, 3), g = gain();
    const v = osc('sine', 11), vg = gain(60); chain(v, vg, o.frequency); chain(o, b, g, AU.out); o.start(t + d); v.start(t + d); o.stop(t + d + 0.14); v.stop(t + d + 0.14);
    o.frequency.setValueAtTime(980 - i * 40, t + d); o.frequency.exponentialRampToValueAtTime(1250 - i * 60, t + d + 0.1); env(g, t + d, 0.01, 0.25, 0.11); }); },
  flutter() { if (!SFX.ok()) return; const t = now(); for (let i = 0; i < 22; i++) burst(t + i * 0.035 + Math.random() * 0.01, 'bandpass', 1200 + Math.random() * 900, 2, 0.12, 0.018); },
  thump() { if (!SFX.ok()) return; const t = now(); tone(t, 'sine', 110, 0.55, 0.22, 48); burst(t, 'bandpass', 1800, 1.5, 0.25, 0.04); },
  tick() { if (!SFX.ok()) return; const t = now(); tone(t, 'sine', 1200, 0.12, 0.08); tone(t, 'sine', 70, 0.4, 0.15, 45); },
  powerDown() { if (!SFX.ok()) return; const t = now(); tone(t, 'sawtooth', 160, 0.12, 0.9, 22); tone(t + 0.75, 'sine', 70, 0.5, 0.35, 35); burst(t + 0.75, 'highpass', 1800, 1, 0.4, 0.04); },
  hum(on) {
    if (!SFX.ok()) return;
    if (!AU.hum) { const o = osc('sawtooth', 60), b = filt('bandpass', 180, 1.5), g = gain(); chain(o, b, g, AU.out); o.start(); AU.hum = g; }
    AU.hum.gain.setValueAtTime(on ? 0.05 : 0.0001, now());
  },
  relay(on) { if (!SFX.ok()) return; const t = now(); burst(t, 'highpass', 2500, 1, on ? 0.35 : 0.25, 0.02); tone(t, 'sine', 90, 0.3, 0.08, 50); SFX.hum(on); },
  crack(v = 1) { if (!SFX.ok()) return; const t = now(); burst(t, 'highpass', 600, 0.7, 0.9 * v, 0.3); burst(t, 'bandpass', 3200, 1.5, 0.6 * v, 0.08); tone(t, 'sine', 70, 0.8 * v, 1.4, 28); },
  zap(d) {
    if (!SFX.ok()) return; const t = now();
    for (let x = 0; x < d; x += 0.025) burst(t + x + Math.random() * 0.02, 'bandpass', 2500 + Math.random() * 5000, 4, 0.06 + Math.random() * 0.16, 0.012);
    const o = osc('sawtooth', 120), b = filt('bandpass', 1800, 2), g = gain(), l = osc('square', 31), lg = gain(0.04);
    chain(o, b, g, AU.out); chain(l, lg, g.gain); o.start(t); l.start(t); o.stop(t + d); l.stop(t + d);
    g.gain.setValueAtTime(0.05, t); g.gain.linearRampToValueAtTime(0.0001, t + d);
  },
  shutter() { if (!SFX.ok()) return; const t = now(); burst(t, 'highpass', 2000, 1, 0.5, 0.04); burst(t + 0.07, 'highpass', 1500, 1, 0.35, 0.05); tone(t, 'sine', 80, 0.6, 0.6, 30); },
};

// ───────── Spray paint ─────────
// A Spray draws "ops" (cross-outs and tags) onto a canvas, stamp by stamp, so it looks sprayed on.
class Spray {
  constructor(canvas, fixedDpr) { this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.ops = []; this.fixed = fixedDpr; this.dpr = fixedDpr || 1; }
  resize() {
    if (this.fixed) return;
    const w0 = this.canvas.offsetWidth, h0 = this.canvas.offsetHeight; if (!w0) return;
    const d = Math.min(2, window.devicePixelRatio || 1), w = Math.round(w0 * d), h = Math.round(h0 * d);
    if (w === this.canvas.width && h === this.canvas.height) return;
    this.dpr = d; this.canvas.width = w; this.canvas.height = h; this.redraw();
  }
  redraw() { this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); for (const op of this.ops) if (op.shown) { op.prep(this); op.draw(this, 0, 1); } }
  async play(op, ms) {
    if (!this.ops.includes(op)) this.ops.push(op);
    op.shown = true; op.prep(this);
    if (!ms) { op.draw(this, 0, 1); return; }
    const stop = SFX.hiss();
    await new Promise(res => {
      const t0 = performance.now(); let last = 0;
      const step = t => { const p = Math.min(1, (t - t0) / ms); op.draw(this, last, p); last = p; p < 1 ? requestAnimationFrame(step) : res(); };
      requestAnimationFrame(step);
    });
    stop();
  }
}
function makePath(pts) { const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)); return { pts, L, len: L[L.length - 1] }; }
function pointAt(path, d) {
  const { pts, L } = path; let i = 1; while (i < L.length - 1 && L[i] < d) i++;
  const seg = L[i] - L[i - 1] || 1, f = clamp01((d - L[i - 1]) / seg);
  return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * f, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * f };
}
function stamps(path, a, b, spacing, fn) {
  const end = b * path.len; let d = a === 0 ? 0 : Math.floor(a * path.len / spacing + 1) * spacing;
  for (; d <= end + 0.001; d += spacing) fn(pointAt(path, d));
}
function mist(c, p, R, color, n, scale) {
  c.fillStyle = color; c.globalAlpha = 0.35;
  for (let i = 0; i < n; i++) { const a = Math.random() * TAU, r = R * Math.sqrt(Math.random()), s = (0.6 + Math.random() * 1.6) * scale; c.fillRect(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, s, s); }
  c.globalAlpha = 1;
}
// Messy back-and-forth strokes over a word. geo() → {x, y, w, h} in CSS px.
function crossOutOp(rgb, geo) {
  const op = { shown: false, j: Array.from({ length: 12 }, () => Math.random() - 0.5) };
  op.prep = s => {
    const d = s.dpr, g = geo(), x = g.x * d, y = g.y * d, w = g.w * d, h = g.h * d, pad = h * 0.25;
    op.r = h * 0.42; op.spacing = op.r * 0.16; op.scale = d;
    const raw = [[x - pad, y + h * .35], [x + w + pad, y + h * .12], [x - pad * .6, y + h * .7], [x + w + pad * .8, y + h * .48], [x - pad * .3, y + h * .95], [x + w + pad, y + h * .82]];
    op.path = makePath(raw.map((p, i) => ({ x: p[0] + op.j[i] * h * 0.3, y: p[1] + op.j[i + 6] * h * 0.2 })));
  };
  op.draw = (s, a, b) => {
    const c = s.ctx;
    stamps(op.path, a, b, op.spacing, p => {
      const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, op.r);
      g.addColorStop(0, `rgba(${rgb},.5)`); g.addColorStop(.6, `rgba(${rgb},.22)`); g.addColorStop(1, `rgba(${rgb},0)`);
      c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, op.r, 0, TAU); c.fill();
      mist(c, p, op.r * 1.3, `rgb(${rgb})`, 3, op.scale);
    });
  };
  return op;
}
// Dripping graffiti text. geo() → {cx, cy, size, rot} in CSS px.
function tagOp(text, color, glow, geo, dripCount = 9) {
  const op = { shown: false, seeds: Array.from({ length: dripCount }, () => ({ u: Math.random(), len: 0.25 + Math.random() * 0.8, w: 0.035 + Math.random() * 0.035 })) };
  op.prep = s => {
    const d = s.dpr, g = geo(), W = s.canvas.width, H = s.canvas.height, fs = g.size * d, cx = g.cx * d, cy = g.cy * d, rot = g.rot || 0;
    if (!op.img || op.img.width !== W || op.img.height !== H) op.img = mk(W, H);
    const x = op.img.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, W, H);
    x.font = `${fs}px "Rubik Wet Paint", Impact, sans-serif`; const tw = x.measureText(text).width;
    x.translate(cx, cy); x.rotate(rot); x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = color; x.shadowColor = glow; x.shadowBlur = fs * 0.06; x.fillText(text, 0, 0); x.shadowBlur = 0; x.fillText(text, 0, 0);
    x.setTransform(1, 0, 0, 1, 0, 0);
    const cos = Math.cos(rot), sin = Math.sin(rot), P = (lx, ly) => ({ x: cx + lx * cos - ly * sin, y: cy + lx * sin + ly * cos });
    const n = Math.max(4, Math.ceil(tw / (fs * 0.2))), pts = [];
    for (let i = 0; i <= n; i++) pts.push(P(-tw / 2 - fs * 0.15 + (tw + fs * 0.3) * i / n, Math.sin(i * 1.3) * fs * 0.12));
    op.path = makePath(pts); op.r = fs * 0.5; op.spacing = fs * 0.11; op.scale = d; op.color = color;
    // find the bottom of the paint under each drip
    const x0 = Math.max(0, Math.floor(cx - tw / 2 - fs)), y0 = Math.max(0, Math.floor(cy - fs * 1.5));
    const bw = Math.min(W - x0, Math.ceil(tw + fs * 2)), bh = Math.min(H - y0, Math.ceil(fs * 3));
    op.drips = [];
    if (bw > 0 && bh > 0) {
      const data = x.getImageData(x0, y0, bw, bh).data;
      for (const sd of op.seeds) {
        const lp = P(-tw / 2 + tw * (0.05 + 0.9 * sd.u), 0), col = Math.round(lp.x) - x0; if (col < 0 || col >= bw) continue;
        let yb = -1; for (let yy = bh - 1; yy >= 0; yy--) if (data[(yy * bw + col) * 4 + 3] > 200) { yb = yy; break; }
        if (yb >= 0) op.drips.push({ x: lp.x, y: y0 + yb - 1, len: sd.len * fs, w: Math.max(1.5, sd.w * fs) });
      }
    }
  };
  op.draw = (s, a, b) => {
    const c = s.ctx, ra = clamp01(a / 0.72), rb = clamp01(b / 0.72);
    if (rb > ra || (b > 0 && a === 0)) stamps(op.path, ra, rb, op.spacing, p => {
      c.save(); c.beginPath(); c.arc(p.x, p.y, op.r, 0, TAU); c.clip(); c.drawImage(op.img, 0, 0); c.restore();
      mist(c, p, op.r * 1.15, op.color, 2, op.scale);
    });
    const da = easeOut(clamp01((a - 0.55) / 0.45)), db = easeOut(clamp01((b - 0.55) / 0.45));
    if (db > da) {
      c.save(); c.strokeStyle = c.fillStyle = op.color; c.lineCap = 'round';
      for (const dr of op.drips) {
        c.lineWidth = dr.w; c.beginPath(); c.moveTo(dr.x, dr.y + dr.len * da); c.lineTo(dr.x, dr.y + dr.len * db); c.stroke();
        if (db >= 1) { c.beginPath(); c.arc(dr.x, dr.y + dr.len, dr.w * 0.8, 0, TAU); c.fill(); }
      }
      c.restore();
    }
  };
  return op;
}

// ───────── Elements & state ─────────
const video = $('#scene'), stage = $('#stage'), wrap = $('#wrap');
const sceneSpray = new Spray($('#sceneSpray'));
const S = { phase: 'gate', room: -1, z: 1, tx: 0, ty: 0, found: new Set(store.get('thw-found', [])), seen: new Set(), still: null, panelCap: null };

const stageW = () => $('#sceneSpray').offsetWidth;
const sceneCross = crossOutOp('6,5,10', () => { const W = stageW(), [x, y, w, h] = SIGN.cross; return { x: x * W, y: y * W, w: w * W, h: h * W }; });
const sceneTag = tagOp('HAUNTED', '#b4ff3a', 'rgba(150,255,60,.6)', () => { const W = stageW(), [cx, cy, sz, rot] = SIGN.tag; return { cx: cx * W, cy: cy * W, size: sz * W, rot }; }, 6);

// ───────── Gate & intro ─────────
const params = new URLSearchParams(location.search);
const rescue = cleanName(params.get('free') || params.get('from'));   // who this visitor came to rescue
if (rescue) {
  $('#gateKicker').textContent = 'Rescue mission';
  $('#gateTitle').textContent = `${rescue} is trapped inside`;
  const l = $('#dareLine'); l.textContent = 'Find the 3 restless spirits to set them free.'; l.hidden = false;
  $('#enter').textContent = 'Go in after them';
}

$('#gate').addEventListener('click', enter);
async function enter() {
  if (S.phase !== 'gate') return; S.phase = 'intro';
  audioInit(); setMuted(AU.muted);
  $('#gate').hidden = true; $('#app').hidden = false;
  resizeAll();
  const fonts = document.fonts ? Promise.all(['400 40px "DM Serif Display"', '40px "Rubik Wet Paint"'].map(f => document.fonts.load(f))).catch(() => {}) : Promise.resolve();
  if (store.get('thw-seen', false)) $('#skip').hidden = false; else setTimeout(() => { if (S.phase === 'intro') $('#skip').hidden = false; }, 3500);
  // the video's own music carries the cheery part, so it plays with sound (muted only if the visitor muted us)
  video.muted = AU.muted;
  let played = true;
  try { await video.play(); } catch { try { video.muted = true; await video.play(); } catch { played = false; } }
  if (!played) { await fonts; return afterStorm(true); }
  const watch = () => {
    if (S.phase !== 'intro' || S.skipping) return;
    const t = video.currentTime;
    if (t >= POWER_CUT_AT || video.ended || t >= (video.duration || 10) - 0.3) { fonts.then(powerCut); return; }
    requestAnimationFrame(watch);
  };
  requestAnimationFrame(watch);
}
function haunt() { document.body.classList.add('haunted'); SFX.wind(); startFog(); }

// ───────── The storm: power cut → flickers with shadow figures → lightning ─────────
// The whole intro runs about 6 seconds: 2s cheery → 0.35s power cut → 1.1s flickers → 1s lightning → 1s spray.
const POWER_CUT_AT = 2.0;   // seconds into the video the cheery part ends
const TAPE_STOP_MS = 350, LIGHTNING_MS = 1000;
// [lights, ms, which figures stand in the booth while the lights are on]
const FLICKS = [['off', 200], ['on', 70, 'a'], ['off', 150], ['on', 60, 'b'], ['off', 130], ['on', 90, 'c'], ['off', 100], ['on', 60, 'd'], ['off', 240]];
// [x, y of the feet, height] as fractions of the frame
const FIGS = {
  a: [[0.47, 0.585, 0.22]],
  b: [[0.3, 0.625, 0.25], [0.79, 0.585, 0.21]],
  c: [[0.56, 0.72, 0.46]],
  d: [[0.2, 0.62, 0.26], [0.42, 0.6, 0.27], [0.63, 0.635, 0.3], [0.83, 0.59, 0.25]],
};
// edges of the glass cube, for the electricity to crawl along
const CUBE = [
  [[0.112, 0.228], [0.65, 0.205]], [[0.65, 0.205], [0.898, 0.225]], [[0.12, 0.195], [0.89, 0.2]],
  [[0.112, 0.228], [0.122, 0.62]], [[0.65, 0.205], [0.65, 0.68]], [[0.898, 0.225], [0.88, 0.61]],
  [[0.122, 0.62], [0.65, 0.68]], [[0.65, 0.68], [0.88, 0.61]], [[0.25, 0.22], [0.26, 0.64]], [[0.456, 0.21], [0.46, 0.66]],
];
const STRIKE = [0.56, 0.2];
// tall, thin, arms too long: people, but wrong
const FIG_SVG = '<svg viewBox="0 0 40 140" preserveAspectRatio="none" aria-hidden="true"><ellipse cx="20" cy="9" rx="5" ry="6.5"/><path d="M20 16C15 16 12 18 11 22L8 50 6 102h2.5L11 54l2-20 1 36 .5 68h4L20 80l1.5 58h4l.5-68 1-36 2 20 2.5 48H34l-2-52-3-28c-1-4-4-6-9-6z"/></svg>';

async function powerCut() {
  if (S.phase !== 'intro' || S.skipping) return; S.phase = 'storm';
  $('#skip').hidden = false;
  SFX.powerDown();
  // tape-stop: the music dies with the power
  try { video.preservesPitch = false; video.webkitPreservesPitch = false; video.mozPreservesPitch = false; } catch {}
  const t0 = performance.now();
  await new Promise(res => {
    const step = t => { if (S.skipping) return res(); const p = Math.min(1, (t - t0) / TAPE_STOP_MS); try { video.playbackRate = Math.max(0.12, 1 - 0.88 * p * p); } catch {} p < 1 ? requestAnimationFrame(step) : res(); };
    requestAnimationFrame(step);
  });
  video.pause(); video.muted = true; try { video.playbackRate = 1; } catch {}
  if (S.skipping) return;
  captureStill();
  for (const [st, ms, set] of FLICKS) { if (S.skipping) return; setPower(st, set); await wait(ms); }
  if (S.skipping) return;
  await lightning();
  if (!S.skipping) afterStorm(false);
}

function setPower(st, set) {
  stage.classList.toggle('off', st === 'off'); stage.classList.toggle('on', st === 'on');
  SFX.relay(st === 'on');
  const box = $('#figs'); box.innerHTML = '';
  if (st !== 'on' || !set) return;
  for (const [x, y, h] of FIGS[set]) {
    const f = document.createElement('div'); f.className = 'fig'; f.innerHTML = FIG_SVG;
    Object.assign(f.style, { left: `${x * 100}%`, top: `${y * 100}%`, height: `${h * 100}%`, width: `${h * 29}%`,
      transform: `translate(-50%, -100%) skewX(${(Math.random() - 0.5) * 8}deg)` });
    box.appendChild(f);
  }
}

function boltPath(a, b, disp, depth) {
  let pts = [{ x: a[0], y: a[1] }, { x: b[0], y: b[1] }];
  for (let i = 0; i < depth; i++) {
    const n = [pts[0]];
    for (let j = 1; j < pts.length; j++) {
      const p = pts[j - 1], q = pts[j], dx = q.x - p.x, dy = q.y - p.y, len = Math.hypot(dx, dy) || 1, o = (Math.random() - 0.5) * disp;
      n.push({ x: (p.x + q.x) / 2 - dy / len * o, y: (p.y + q.y) / 2 + dx / len * o }, q);   // push the midpoint sideways
    }
    pts = n; disp *= 0.55;
  }
  return pts;
}
function makeBolt() {
  const start = [STRIKE[0] + (Math.random() - 0.5) * 0.25, -0.04];
  const main = boltPath(start, STRIKE, 0.22, 6), out = [{ pts: main, w: 0.0095 }];
  for (const f of [0.35, 0.6]) {
    const p = main[Math.floor(main.length * f)], end = [p.x + (Math.random() < 0.5 ? -1 : 1) * (0.06 + Math.random() * 0.1), p.y + 0.06 + Math.random() * 0.08];
    out.push({ pts: boltPath([p.x, p.y], end, 0.08, 4), w: 0.0038 });
  }
  return out;
}
function strokeBolt(x, pts, w, alpha, px) {
  x.save(); x.globalAlpha = alpha; x.lineJoin = 'round'; x.lineCap = 'round';
  x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(p.x, p.y) : x.moveTo(p.x, p.y));
  x.shadowColor = '#8fd8ff'; x.shadowBlur = 18 * px; x.strokeStyle = 'rgba(150,215,255,.85)'; x.lineWidth = w * 2.6; x.stroke();
  x.shadowBlur = 6 * px; x.strokeStyle = '#fff'; x.lineWidth = w; x.stroke();
  x.restore();
}
async function lightning() {
  const c = $('#zap'), x = c.getContext('2d'), W = c.offsetWidth, d = Math.min(2, window.devicePixelRatio || 1);
  c.width = Math.round(W * d); c.height = Math.round(W * d); x.setTransform(W * d, 0, 0, W * d, 0, 0);
  setPower('on'); stage.classList.add('surge');
  SFX.crack(1); setTimeout(SFX.thunder, 250); SFX.zap(LIGHTNING_MS / 1000 - 0.1);
  let bolt = makeBolt(), restruck = false, lastSurge = 0;
  const t0 = performance.now();
  await new Promise(res => {
    const step = t => {
      x.clearRect(0, 0, 1, 1);
      if (S.skipping) return res();
      const e = t - t0;
      if (e > 110 && !restruck) { restruck = true; bolt = makeBolt(); SFX.crack(0.6); }
      const flash = e < 110 ? 1 - e / 110 : e < 220 ? 0.7 * (1 - (e - 110) / 110) : 0;
      if (flash > 0) { x.fillStyle = `rgba(225,240,255,${flash * 0.8})`; x.fillRect(0, 0, 1, 1); }
      if (e < 360) for (const b of bolt) strokeBolt(x, b.pts, b.w, 1 - Math.max(0, e - 220) / 140, d);
      if (e > 180 && e < LIGHTNING_MS - 60) {
        for (const [a, b] of CUBE) if (Math.random() < 0.7) strokeBolt(x, boltPath(a, b, Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.12, 4), 0.0034, 0.55 + Math.random() * 0.45, d);
        if (t - lastSurge > 60 + Math.random() * 60) { lastSurge = t; stage.classList.toggle('surge', Math.random() < 0.6); }
      }
      if (e >= LIGHTNING_MS) return res();
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  x.clearRect(0, 0, 1, 1);
  stage.classList.remove('surge', 'on', 'off');
}

$('#skip').addEventListener('click', async () => {
  if ((S.phase !== 'intro' && S.phase !== 'storm') || S.skipping) return;
  S.skipping = true; video.pause(); video.muted = true;
  if (!S.still) await new Promise(r => { video.addEventListener('seeked', r, { once: true }); video.currentTime = Math.max(0, (video.duration || 10) - 0.15); setTimeout(r, 800); });
  afterStorm(true);
});

// After the storm: the booth's own sign gets tagged, then the house opens.
async function afterStorm(instant) {
  if (S.phase === 'spray' || S.phase === 'explore') return; S.phase = 'spray';
  $('#skip').hidden = true; store.set('thw-seen', true);
  stage.classList.remove('surge', 'on', 'off'); $('#figs').innerHTML = ''; SFX.hum(false);
  if (!document.body.classList.contains('haunted')) haunt();
  if (!S.still) captureStill();
  if (!instant) { await wait(60); SFX.rattle(); }
  await sceneSpray.play(sceneCross, instant ? 0 : 350);
  await sceneSpray.play(sceneTag, instant ? 0 : 600);
  if (!instant) await wait(250);
  startExplore();
}
function captureStill() {
  try {
    const c = mk(video.videoWidth || 960, video.videoHeight || 960);
    c.getContext('2d').drawImage(video, 0, 0, c.width, c.height);
    S.still = c;
  } catch (e) { console.warn('still', e); }
}

// ───────── Zoom ─────────
function zoomTo(rect, instant) {
  const W = stage.offsetWidth;
  let z = 1, tx = 0, ty = 0;
  if (rect) {
    const [x0, y0, x1, y1] = rect;
    z = Math.min(2.6, 0.94 / Math.max(x1 - x0, y1 - y0));
    const cx = (x0 + x1) / 2 * W, cy = (y0 + y1) / 2 * W;
    tx = Math.min(0, Math.max(W - W * z, W / 2 - cx * z));
    ty = Math.min(0, Math.max(W - W * z, W / 2 - cy * z));
  }
  S.z = z; S.tx = tx; S.ty = ty;
  stage.classList.toggle('instant', !!instant);
  stage.style.transform = `translate(${tx}px, ${ty}px) scale(${z})`;
  stage.style.setProperty('--inv', String(1 / z));
  updateLight();
  if (instant) requestAnimationFrame(() => stage.classList.remove('instant'));
}

// ───────── Fog ─────────
let fogOn = false;
function startFog() {
  if (fogOn) return; fogOn = true;
  const c = $('#fog'), x = c.getContext('2d');
  const blobs = Array.from({ length: 9 }, (_, i) => ({ x: Math.random(), y: 0.55 + Math.random() * 0.45, r: 0.18 + Math.random() * 0.22, v: (Math.random() - 0.5) * 0.012, a: 0.05 + Math.random() * 0.06 }));
  let last = 0;
  const step = t => {
    requestAnimationFrame(step);
    if (t - last < 33) return; const dt = Math.min(0.1, (t - last) / 1000); last = t;
    const W = Math.max(2, Math.round(c.offsetWidth / 2)); if (c.width !== W) { c.width = W; c.height = W; }
    x.clearRect(0, 0, W, W);
    for (const b of blobs) {
      b.x += b.v * dt; if (b.x < -0.3) b.x = 1.3; if (b.x > 1.3) b.x = -0.3;
      const g = x.createRadialGradient(b.x * W, b.y * W, 0, b.x * W, b.y * W, b.r * W);
      g.addColorStop(0, `rgba(200,225,255,${b.a})`); g.addColorStop(1, 'rgba(200,225,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, W, W);
    }
  };
  requestAnimationFrame(step);
}

// ───────── Flashlight ─────────
const light = { x: 0.5, y: 0.5 };
function updateLight() {
  const W = stage.offsetWidth, d = $('#dark');
  const sx = (light.x * W - S.tx) / S.z, sy = (light.y * W - S.ty) / S.z;   // wrap → stage coordinates
  d.style.setProperty('--fx', `${sx}px`); d.style.setProperty('--fy', `${sy}px`);
  d.style.setProperty('--r0', `${W * 0.13 / S.z}px`); d.style.setProperty('--r1', `${W * 0.36 / S.z}px`);
}
function movelight(e) { const r = wrap.getBoundingClientRect(); light.x = (e.clientX - r.left) / r.width; light.y = (e.clientY - r.top) / r.height; updateLight(); }
wrap.addEventListener('pointermove', movelight);
wrap.addEventListener('pointerdown', movelight);

// ───────── Explore: rooms, spots, eggs ─────────
function buildHotspots() {
  const spots = $('#spots'), low = $('#low');
  const pos = (el, x, y) => { el.style.left = `${x * 100}%`; el.style.top = `${y * 100}%`; };
  ROOMS.forEach((R, i) => {
    const bay = document.createElement('button'); bay.className = 'bay'; bay.type = 'button'; bay.setAttribute('aria-label', `Enter ${R.name}`);
    const [x0, y0, x1, y1] = R.rect; Object.assign(bay.style, { left: `${x0 * 100}%`, top: `${y0 * 100}%`, width: `${(x1 - x0) * 100}%`, height: `${(y1 - y0) * 100}%` });
    bay.addEventListener('click', () => enterRoom(i)); spots.appendChild(bay);
    const door = document.createElement('button'); door.className = 'door'; door.type = 'button';
    door.innerHTML = `<b>${R.num}</b><span></span>`; door.querySelector('span').textContent = R.name;
    pos(door, ...R.door); door.addEventListener('click', () => enterRoom(i)); spots.appendChild(door);
    for (const [key, x, y] of R.spots) {
      const b = document.createElement('button'); b.className = 'spot'; b.type = 'button'; b.dataset.room = i; b.dataset.cap = key;
      b.setAttribute('aria-label', CAPS[key].name); b.innerHTML = '<span></span>'; b.querySelector('span').textContent = CAPS[key].name;
      pos(b, x, y); b.addEventListener('click', e => { e.stopPropagation(); openCap(key, i); }); spots.appendChild(b);
    }
    const E = R.egg;
    const m = document.createElement('div'); m.className = 'mote'; m.dataset.egg = E.id; pos(m, ...E.at); low.appendChild(m);
    const eb = document.createElement('button'); eb.className = 'egg'; eb.type = 'button'; eb.dataset.room = i; eb.dataset.egg = E.id;
    eb.setAttribute('aria-label', 'Something glints here'); pos(eb, ...E.at);
    eb.addEventListener('click', e => { e.stopPropagation(); triggerEgg(E, i); }); spots.appendChild(eb);
  });
  syncFound(false);
}

function setMission() {
  const n = S.found.size;
  if (n === 3) {
    $('#mKicker').textContent = rescue ? 'Rescue complete' : 'Mission complete';
    $('#mTitle').textContent = rescue ? `You freed ${rescue}` : 'All 3 spirits found';
    $('#mBody').textContent = 'Claim your treat, then get yourself trapped in the booth and see which friend comes to save you.';
  } else {
    $('#mKicker').textContent = rescue ? 'Rescue mission' : 'Your mission';
    $('#mTitle').textContent = rescue ? `Free ${rescue}: find the 3 spirits` : 'Find the 3 restless spirits';
    $('#mBody').textContent = (rescue ? `${rescue} is trapped in our haunted booth. ` : 'They’re hiding in our haunted booth. ')
      + 'Step into each room, sweep your light around and click anything that glints.';
  }
}
function buildRoomList() {
  const ol = $('#roomList'); ol.innerHTML = '';
  ROOMS.forEach((R, i) => {
    const li = document.createElement('li'), b = document.createElement('button'); b.type = 'button'; b.dataset.room = i;
    b.innerHTML = `<b>${R.num}</b><span></span><span class="st"></span>`; b.querySelector('span').textContent = R.name;
    b.addEventListener('click', () => S.room === i ? leaveRoom() : enterRoom(i));
    li.appendChild(b); ol.appendChild(li);
  });
  syncRoomList();
}
function syncRoomList() {
  $$('#roomList button').forEach(b => {
    const i = +b.dataset.room, st = b.querySelector('.st'), done = S.found.has(ROOMS[i].egg.id);
    b.setAttribute('aria-current', String(S.room === i));
    st.textContent = done ? 'Spirit found ✓' : 'Spirit hiding'; st.classList.toggle('ok', done);
  });
}

function startExplore() {
  S.phase = 'explore';
  buildHotspots(); buildRoomList(); setMission();
  $('#mission').classList.add('in');
  document.body.classList.add('explore');
  document.body.dataset.room = '-1';
  hint(S.found.size === 3 ? 'The spirits are at rest. But the house still has secrets.' : 'Choose a room to step inside.');
}

function enterRoom(i) {
  if (S.phase !== 'explore') return;
  closePanel();
  S.room = i; document.body.dataset.room = String(i); syncRoomList();
  zoomTo(ROOMS[i].rect);
  SFX.creak();
  $('#roomBar').hidden = false;
  $('#roomName').innerHTML = `<b>${ROOMS[i].num}</b><span></span>`; $('#roomName span').textContent = ROOMS[i].name;
  $('#next').textContent = i < ROOMS.length - 1 ? 'Next room →' : 'First room →';
  light.x = 0.5; light.y = 0.55; updateLight();
  const egg = ROOMS[i].egg;
  hint(S.found.has(egg.id) ? 'This room’s spirit is at rest. Tap a glowing light to see what we do.' : 'Move your light around. Something in here is hiding.');
}
function leaveRoom() {
  closePanel();
  S.room = -1; document.body.dataset.room = '-1'; syncRoomList();
  zoomTo(null); SFX.whoosh();
  $('#roomBar').hidden = true;
  hint(S.found.size === 3 ? 'All three spirits found. Take your spooky photo before you go.' : `${3 - S.found.size} restless ${S.found.size === 2 ? 'spirit remains' : 'spirits remain'}. Choose a room.`);
}
$('#back').addEventListener('click', leaveRoom);
$('#next').addEventListener('click', () => enterRoom((S.room + 1) % ROOMS.length));

function openCap(key, roomIndex) {
  const C = CAPS[key]; S.panelCap = key;
  S.seen.add(key); $$(`.spot[data-cap="${key}"]`).forEach(s => s.classList.add('seen'));
  $('#pKicker').textContent = `Room ${ROOMS[roomIndex].num} · ${ROOMS[roomIndex].name}`;
  $('#pTitle').textContent = C.name; $('#pHaunt').textContent = C.haunt; $('#pBody').textContent = C.body;
  $('#pLink').href = C.url;
  const p = $('#panel'); p.hidden = false; p.style.animation = 'none'; void p.offsetWidth; p.style.animation = '';
  SFX.soft();
}
function closePanel() { $('#panel').hidden = true; S.panelCap = null; }
$('#panel .x').addEventListener('click', closePanel);
$('#pAsk').addEventListener('click', () => { const k = S.panelCap; closePanel(); openModal('inquiry', { cap: k }); });
// "See our work" opens our site in its own window so the haunted house stays open behind it
$('#pLink').addEventListener('click', e => {
  const w = Math.min(1280, screen.availWidth - 80), h = Math.min(900, screen.availHeight - 80);
  e.preventDefault();   // a click always allows the window; on phones it simply opens as a new tab
  window.open($('#pLink').href, 'tvw-work', `noopener,width=${w},height=${h},left=${(screen.availWidth - w) / 2},top=${(screen.availHeight - h) / 2}`);
});

function syncFound(animateId) {
  const n = S.found.size;
  $$('.pips i').forEach((p, i) => { p.classList.toggle('on', i < n); if (animateId && i === n - 1) { p.classList.remove('pop'); void p.offsetWidth; p.classList.add('pop'); } });
  $('#spiritTxt').textContent = `${n} of 3 spirits`;
  for (const id of S.found) { $$(`[data-egg="${id}"]`).forEach(el => el.classList.add('found')); }
  syncRoomList(); if (S.phase === 'explore') setMission();
}

function triggerEgg(E, roomIndex) {
  const first = !S.found.has(E.id);
  ({ bats: eggBats, ghost: eggGhost, hands: eggHands })[E.id](E);
  if (!first) return;
  S.found.add(E.id); store.set('thw-found', [...S.found]);
  setTimeout(() => {
    SFX.chime(); syncFound(E.id);
    toast(`${E.line}  ·  Spirit ${S.found.size} of 3 found`);
    hint(S.found.size === 3 ? (rescue ? `That’s all three. ${rescue} is free…` : 'That’s all three. The house wants a word with you…') : 'Spirit found. Try another room.');
    if (S.found.size === 3) setTimeout(() => openModal('reward'), 2600);
  }, 900);
}

const BAT_SVG = '<svg viewBox="0 0 64 32" aria-hidden="true"><path fill="#0a0910" d="M32 10c-2-4-4-5-4-5l1 5c-6-4-14-6-22-4 4 2 6 5 6 9-3-1-7-1-10 0 4 2 8 6 9 11 3-4 8-6 13-5 2 1 4 3 7 6 3-3 5-5 7-6 5-1 10 1 13 5 1-5 5-9 9-11-3-1-7-1-10 0 0-4 2-7 6-9-8-2-16 0-22 4l1-5s-2 1-4 5z"/></svg>';
function eggBats(E) {
  SFX.flutter();
  const low = $('#low');
  for (let i = 0; i < 7; i++) {
    const b = document.createElement('div'); b.className = 'sprite bat'; b.innerHTML = BAT_SVG;
    const size = 30 + Math.random() * 26;
    Object.assign(b.style, { left: `${E.at[0] * 100}%`, top: `${E.at[1] * 100}%`, width: `${size / S.z}px`, height: `${size / 2 / S.z}px`, marginLeft: `${-size / 2 / S.z}px`, marginTop: `${-size / 4 / S.z}px` });
    $('#spots').appendChild(b);
    const W = stage.offsetWidth, ang = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, dist = W * (0.6 + Math.random() * 0.5) / S.z;
    const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist, wob = (Math.random() - 0.5) * W * 0.2 / S.z;
    b.animate([
      { transform: 'translate(0,0) scale(.3)', opacity: 0 },
      { transform: `translate(${dx * 0.3 + wob}px, ${dy * 0.3}px) scale(1)`, opacity: 1, offset: 0.25 },
      { transform: `translate(${dx * 0.7 - wob}px, ${dy * 0.7}px) scale(1.1)`, opacity: 1, offset: 0.7 },
      { transform: `translate(${dx}px, ${dy}px) scale(1.2)`, opacity: 0 },
    ], { duration: 1600 + Math.random() * 900, delay: i * 70, easing: 'cubic-bezier(.3,.1,.5,1)', fill: 'forwards' }).onfinish = () => b.remove();
  }
}
const GHOST_SVG = '<svg viewBox="0 0 100 120" aria-hidden="true"><defs><radialGradient id="gg" cx="50%" cy="35%" r="70%"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#cfe9ff" stop-opacity=".45"/></radialGradient></defs><path d="M50 4C24 4 10 26 10 52v58l12-10 10 12 9-12 9 12 9-12 10 12 10-12 11 10V52C90 26 76 4 50 4z" fill="url(#gg)"/><ellipse cx="37" cy="50" rx="6" ry="9" fill="#14121c"/><ellipse cx="63" cy="50" rx="6" ry="9" fill="#14121c"/><ellipse cx="50" cy="74" rx="6" ry="8" fill="#14121c" opacity=".8"/></svg>';
function eggGhost(E) {
  const g = document.createElement('div'); g.className = 'sprite'; g.innerHTML = GHOST_SVG;
  const W = stage.offsetWidth, sz = W * 0.05;
  Object.assign(g.style, { left: `${E.at[0] * 100}%`, top: `${E.at[1] * 100}%`, width: `${sz}px`, height: `${sz * 1.2}px`, marginLeft: `${-sz / 2}px`, marginTop: `${-sz * 0.6}px`, filter: 'drop-shadow(0 0 6px rgba(200,230,255,.8))' });
  $('#spots').appendChild(g);
  setTimeout(SFX.giggle, 650);
  g.animate([
    { transform: 'translate(0,0) rotate(0)', opacity: 0 },
    { transform: `translate(${-sz * 0.9}px, ${-sz * 0.1}px) rotate(-14deg)`, opacity: 0.95, offset: 0.2 },
    { transform: `translate(${-sz * 0.9}px, ${-sz * 0.1}px) rotate(-8deg)`, opacity: 0.95, offset: 0.45 },
    { transform: `translate(${-sz * 0.3}px, ${-sz * 0.4}px) rotate(6deg)`, opacity: 0.9, offset: 0.6 },
    { transform: `translate(${sz * 0.6}px, ${-W * 0.22}px) rotate(18deg) scale(1.2)`, opacity: 0 },
  ], { duration: 3200, easing: 'ease-in-out', fill: 'forwards' }).onfinish = () => g.remove();
}
const HAND_SVG = '<svg viewBox="0 0 60 80" aria-hidden="true"><g fill="rgba(215,240,255,.55)"><ellipse cx="30" cy="54" rx="17" ry="19"/><rect x="11" y="18" width="8" height="30" rx="4" transform="rotate(-12 15 33)"/><rect x="20" y="6" width="8" height="36" rx="4" transform="rotate(-4 24 24)"/><rect x="31" y="5" width="8" height="37" rx="4" transform="rotate(3 35 23)"/><rect x="41" y="12" width="8" height="32" rx="4" transform="rotate(10 45 28)"/><rect x="44" y="44" width="8" height="22" rx="4" transform="rotate(48 48 55)"/></g></svg>';
function eggHands() {
  const W = stage.offsetWidth, spots = $('#spots');
  const where = [[0.665, 0.33], [0.73, 0.29], [0.84, 0.34], [0.7, 0.5], [0.875, 0.48], [0.77, 0.38]];
  where.forEach(([x, y], i) => {
    setTimeout(() => {
      const h = document.createElement('div'); h.className = 'sprite handprint'; h.innerHTML = HAND_SVG;
      const sz = W * (0.032 + Math.random() * 0.01);
      Object.assign(h.style, { left: `${x * 100}%`, top: `${y * 100}%`, width: `${sz}px`, height: `${sz * 1.33}px`, marginLeft: `${-sz / 2}px`, marginTop: `${-sz * 0.66}px` });
      spots.appendChild(h); SFX.thump();
      const r = (Math.random() - 0.5) * 40;
      h.animate([
        { transform: `rotate(${r}deg) scale(1.25)`, opacity: 0 },
        { transform: `rotate(${r}deg) scale(1)`, opacity: 0.9, offset: 0.04 },
        { transform: `rotate(${r}deg) scale(1)`, opacity: 0.8, offset: 0.75 },
        { transform: `rotate(${r}deg) scale(1)`, opacity: 0, offset: 1 },
      ], { duration: 6500, fill: 'forwards' }).onfinish = () => h.remove();
    }, i * 320);
  });
}

// ───────── Toast & hint ─────────
let toastT = 0;
function toast(text, ms = 3600) { const t = $('#toast'); t.textContent = text; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms); }
function hint(text) { const h = $('#hint'); h.style.opacity = 0; setTimeout(() => { h.textContent = text; h.style.opacity = 1; }, 250); }

// ───────── Modals ─────────
let modalCleanup = null;
function openModal(kind, opts = {}) {
  closeModal();
  closePanel();
  const body = $('#modalBody'); body.innerHTML = ''; body.appendChild($(`#tpl-${kind}`).content.cloneNode(true));
  $('#modal').hidden = false;
  modalCleanup = ({ newsletter: setupNewsletter, inquiry: setupInquiry, photo: setupPhoto, reward: setupReward })[kind](body, opts) || null;
  SFX.soft();
  setTimeout(() => body.querySelector('input:not([type=hidden]), button')?.focus({ preventScroll: true }), 50);
}
function closeModal() { if (modalCleanup) { modalCleanup(); modalCleanup = null; } $('#modal').hidden = true; }
$('#modal .x').addEventListener('click', closeModal);
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (!$('#modal').hidden) closeModal(); else closePanel(); } });
$$('[data-open]').forEach(b => b.addEventListener('click', () => openModal(b.dataset.open)));

// newsletter → Mailchimp (JSONP, the same endpoint Mailchimp's embed forms use)
function mailchimp(email, fname) {
  return new Promise((resolve, reject) => {
    const cb = `thw_mc_${Date.now()}`, s = document.createElement('script');
    const cleanup = () => { clearTimeout(timer); delete window[cb]; s.remove(); };
    const timer = setTimeout(() => { cleanup(); reject(new Error('timeout')); }, 12000);
    window[cb] = data => { cleanup(); resolve(data); };
    const p = new URLSearchParams({ u: MAILCHIMP.u, id: MAILCHIMP.id, EMAIL: email, FNAME: fname, c: cb });
    p.set(`b_${MAILCHIMP.u}_${MAILCHIMP.id}`, '');
    s.src = `${MAILCHIMP.action}?${p}`; s.onerror = () => { cleanup(); reject(new Error('network')); };
    document.head.appendChild(s);
  });
}
const stripHtml = s => { const d = new DOMParser().parseFromString(String(s || ''), 'text/html'); return (d.body.textContent || '').replace(/^\d+\s*-\s*/, '').trim(); };
const validEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
function setupNewsletter(root) {
  const f = $('form', root), msg = $('.formmsg', root), btn = $('button[type=submit]', root);
  f.addEventListener('submit', async e => {
    e.preventDefault();
    if (f.bot.value) return;
    const email = f.email.value.trim(), fname = f.fname.value.trim().slice(0, 40);
    if (!validEmail(email)) { msg.className = 'formmsg err'; msg.textContent = 'That email doesn’t look quite right.'; f.email.focus(); return; }
    btn.disabled = true; btn.textContent = 'Summoning…'; msg.className = 'formmsg'; msg.textContent = '';
    try {
      const r = await mailchimp(email, fname);
      if (r && r.result === 'success') {
        f.outerHTML = '<div class="done"><h3>You’re on the list.</h3><p class="lede">Check your inbox to confirm. We’ll be in touch… from beyond.</p></div>';
        SFX.chime(); return;
      }
      const m = stripHtml(r && r.msg);
      msg.className = 'formmsg ' + (/already subscribed/i.test(m) ? 'ok' : 'err');
      msg.textContent = /already subscribed/i.test(m) ? 'You’re already on the list. The spirits remember you.' : (m || 'Something went wrong. Try again in a moment.');
    } catch {
      msg.className = 'formmsg err'; msg.innerHTML = 'We couldn’t reach the sign-up service. <a target="_blank" rel="noopener">Sign up on Mailchimp instead</a>.';
      msg.querySelector('a').href = MAILCHIMP.fallback;
    }
    btn.disabled = false; btn.textContent = 'Subscribe';
  });
}

// Every form lands in INQUIRY_EMAIL. If delivery fails, the visitor gets a ready-to-send email instead.
async function sendLead(subject, fields) {
  const r = await fetch(FORM_ENDPOINT, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ _subject: subject, _template: 'table', _captcha: 'false', Source: 'The Haunted Wild', ...fields }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || String(d.success) !== 'true') throw new Error(d.message || `HTTP ${r.status}`);
}
function mailtoFallback(subject, fields) {
  const body = Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join('\r\n');
  return `mailto:${INQUIRY_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
function showSendError(msg, subject, fields) {
  msg.className = 'formmsg err';
  msg.innerHTML = 'We couldn’t send that just now. <a>Email it to us instead</a>.';
  msg.querySelector('a').href = mailtoFallback(subject, fields);
}

function setupInquiry(root, { cap }) {
  const f = $('form', root), msg = $('.formmsg', root), chips = $('.chips', root), picked = new Set(cap ? [cap] : []);
  for (const [key, C] of [...Object.entries(CAPS), ['other', { name: 'Something else' }]]) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = C.name;
    b.setAttribute('aria-pressed', String(picked.has(key)));
    b.addEventListener('click', () => { picked.has(key) ? picked.delete(key) : picked.add(key); b.setAttribute('aria-pressed', String(picked.has(key))); });
    chips.appendChild(b);
  }
  const btn = $('button[type=submit]', root);
  f.addEventListener('submit', async e => {
    e.preventDefault();
    if (f.bot.value) return;
    const v = n => f[n].value.trim();
    const missing = !v('name') ? 'name' : !validEmail(v('email')) ? 'email' : !v('msg') ? 'msg' : null;
    if (missing) { msg.className = 'formmsg err'; msg.textContent = missing === 'email' ? 'Please add a valid email so we can reply.' : missing === 'name' ? 'Please tell us your name.' : 'Tell us a little about the project.'; f[missing].focus(); return; }
    const subject = `Haunted Wild inquiry: ${v('name')}${v('company') ? ` (${v('company')})` : ''}`;
    const fields = {
      Name: v('name'), email: v('email'), Company: v('company') || '-',
      'Interested in': [...picked].map(k => k === 'other' ? 'Something else' : CAPS[k].name).join(', ') || 'Not specified',
      Timeline: f.timeline.value || 'Not specified', Message: v('msg'), Newsletter: f.news.checked ? 'Yes' : 'No',
      'Spirits found': `${S.found.size} of 3`,
    };
    btn.disabled = true; btn.textContent = 'Sending…'; msg.className = 'formmsg'; msg.textContent = '';
    try {
      await sendLead(subject, fields);
      if (f.news.checked) mailchimp(v('email'), v('name').split(' ')[0]).catch(() => {});
      const done = document.createElement('div'); done.className = 'done';
      done.innerHTML = '<h3>Your summons has been received.</h3><p class="lede">Our team will get back to you soon, probably before midnight.</p>';
      f.replaceWith(done); SFX.chime();
    } catch (err) {
      console.warn('inquiry', err); showSendError(msg, subject, fields);
      btn.disabled = false; btn.textContent = 'Send inquiry';
    }
  });
}

function setupReward(root) {
  if (rescue) { $('#rwKicker', root).textContent = 'Rescue complete'; $('#modalTitle', root).textContent = `You freed ${rescue}!`; }
  $('#rwLede', root).textContent = rescue
    ? `All three spirits are at rest and ${rescue} is free. Your turn: claim your treat, then get yourself trapped and see who comes to save you.`
    : 'You found all three spirits. Few make it this far. Claim your treat, then get yourself trapped and see who comes to save you.';
  $('#trTitle', root).textContent = TREAT.title; $('#trBody', root).textContent = TREAT.body;
  const f = $('form', root), msg = $('.formmsg', root), btn = $('button[type=submit]', root);
  f.addEventListener('submit', async e => {
    e.preventDefault();
    if (f.bot.value) return;
    const v = n => f[n].value.trim();
    if (!v('name')) { msg.className = 'formmsg err'; msg.textContent = 'Please tell us your name.'; f.name.focus(); return; }
    if (!validEmail(v('email'))) { msg.className = 'formmsg err'; msg.textContent = 'Please add a valid email so we can send your treat.'; f.email.focus(); return; }
    const subject = `Haunted Wild treat claimed: ${v('name')}${v('company') ? ` (${v('company')})` : ''}`;
    const fields = { Name: v('name'), email: v('email'), Company: v('company') || '-', Treat: '20-minute brainstorm', Topic: f.topic.value || 'Not specified', Newsletter: f.news.checked ? 'Yes' : 'No', 'Rescued': rescue || '-' };
    btn.disabled = true; btn.textContent = 'Claiming…'; msg.className = 'formmsg'; msg.textContent = '';
    try {
      await sendLead(subject, fields);
      if (f.news.checked) mailchimp(v('email'), v('name').split(' ')[0]).catch(() => {});
      const done = document.createElement('div'); done.className = 'done';
      done.innerHTML = '<h3>Brainstorm claimed.</h3><p>Our team will email you to find a time. Watch your inbox… if you dare.</p>';
      f.replaceWith(done); SFX.chime();
    } catch (err) {
      console.warn('treat', err); showSendError(msg, subject, fields);
      btn.disabled = false; btn.textContent = 'Claim my brainstorm';
    }
  });
  $$('[data-act]', root).forEach(b => b.addEventListener('click', () => {
    const a = b.dataset.act;
    if (a === 'dare') return shareDare('');
    openModal(a);
  }));
}

async function copyText(text, msg) {
  try { await navigator.clipboard.writeText(text); toast(msg); }
  catch { prompt('Copy this:', text); }
}
const shareText = name => name
  ? 'I’m trapped in The Haunted Wild. Find the 3 spirits to set me free.'
  : 'Something got into The Virtual Wild. Can you find the 3 spirits hiding in The Haunted Wild?';
async function shareDare(name) {
  const url = dareUrl(name), text = shareText(name);
  if (navigator.share) { try { await navigator.share({ title: 'The Haunted Wild', text, url }); return; } catch (e) { if (e.name === 'AbortError') return; } }
  copyText(url, 'Dare link copied. Send it to someone brave.');
}
function openSocial(net, name, card) {
  const url = encodeURIComponent(dareUrl(name)), text = encodeURIComponent(shareText(name));
  const links = {
    x: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
  };
  if (net === 'copy') return copyText(dareUrl(name), 'Rescue link copied. Send it to someone brave.');
  if (net === 'instagram') return shareToInstagram(name, card);
  window.open(links[net], '_blank', 'noopener,width=620,height=560');
}
// Instagram has no web share link. On phones the share sheet offers Instagram (Stories, feed, DMs);
// elsewhere we save the photo, copy a caption with the rescue link, and open Instagram.
async function shareToInstagram(name, card) {
  const caption = `${shareText(name)} ${dareUrl(name)} ${INSTAGRAM.handle} #TheHauntedWild`;
  if (card && navigator.canShare && navigator.canShare({ files: [card.file] })) {
    try { await navigator.share({ files: [card.file], text: caption }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  if (card) { const a = document.createElement('a'); a.href = card.url; a.download = 'the-haunted-wild.jpg'; document.body.appendChild(a); a.click(); a.remove(); }
  try { await navigator.clipboard.writeText(caption); } catch {}
  toast('Photo saved and caption copied. Post it on Instagram and paste the caption so friends can rescue you.', 6000);
  setTimeout(() => window.open(INSTAGRAM.url, '_blank', 'noopener'), 900);
}

// ───────── Photo booth ─────────
let segP = null;
function loadSeg() {
  return segP ||= (async () => {
    const mod = await import(`${MP_BASE}/vision_bundle.mjs`);
    const fs = await mod.FilesetResolver.forVisionTasks(`${MP_BASE}/wasm`);
    let err;
    for (const delegate of isIOS ? ['CPU', 'GPU'] : ['GPU', 'CPU']) {
      try { return await mod.ImageSegmenter.createFromOptions(fs, { baseOptions: { modelAssetPath: SEG_MODEL, delegate }, runningMode: 'IMAGE', outputConfidenceMasks: true, outputCategoryMask: false }); }
      catch (e) { err = e; }
    }
    throw err;
  })().catch(e => { segP = null; throw e; });
}

function setupPhoto(root) {
  const v = $('#pbVideo', root), img = $('#pbResult', root), count = $('#pbCount', root), msgEl = $('#pbMsg', root), nameIn = $('#pbName', root);
  let stream = null, card = null, alive = true;
  nameIn.value = store.get('thw-name', '');
  loadSeg().catch(() => {});
  const stop = () => { if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; } };
  async function start() {
    img.hidden = true; v.hidden = false; $('#pbTake', root).hidden = false; $('#pbDone', root).hidden = true; $('#pbDare', root).hidden = true;
    msgEl.textContent = 'Waking the camera…';
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error(), { name: 'Insecure' });
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
      if (!alive) return stop();
      v.srcObject = stream; await v.play().catch(() => {});
      msgEl.textContent = 'Get close, look scared, then take your photo.';
    } catch (e) {
      msgEl.textContent = e.name === 'NotAllowedError' ? 'Camera access was blocked. Allow it in your browser settings to take your photo.'
        : e.name === 'Insecure' ? 'The camera needs this page to be opened over HTTPS.' : 'We couldn’t start the camera.';
    }
  }
  $('#pbShoot', root).addEventListener('click', async () => {
    if (!stream || !v.videoWidth) return;
    $('#pbShoot', root).disabled = true; msgEl.textContent = '';
    for (const n of [3, 2, 1]) { count.textContent = n; SFX.tick(); await wait(800); if (!alive) return; }
    count.textContent = '';
    const cap = mk(Math.min(900, v.videoWidth), Math.round(Math.min(900, v.videoWidth) * v.videoHeight / v.videoWidth));
    const cx = cap.getContext('2d'); cx.translate(cap.width, 0); cx.scale(-1, 1); cx.drawImage(v, 0, 0, cap.width, cap.height);
    $('#flash').classList.remove('go'); void $('#flash').offsetWidth; $('#flash').classList.add('go'); SFX.shutter();
    stop(); msgEl.textContent = 'Locking you in the booth…';
    const name = cleanName(nameIn.value); store.set('thw-name', name);
    card = await buildPortrait(cap, name);
    if (!alive) return;
    img.src = card.url; img.hidden = false; v.hidden = true; msgEl.textContent = '';
    $('#pbShoot', root).disabled = false; $('#pbTake', root).hidden = true; $('#pbDone', root).hidden = false; $('#pbDare', root).hidden = false;
    $('#pbShare', root).hidden = !(navigator.canShare && navigator.canShare({ files: [card.file] }));
    $('#pbSave', root).classList.toggle('primary', $('#pbShare', root).hidden);
  });
  $('#pbShare', root).addEventListener('click', async () => {
    const name = cleanName(nameIn.value);
    try { await navigator.share({ files: [card.file], title: 'The Haunted Wild', text: `${shareText(name)} ${dareUrl(name)}` }); }
    catch (e) { if (e.name !== 'AbortError') saveCard(); }
  });
  const saveCard = () => { const a = document.createElement('a'); a.href = card.url; a.download = 'the-haunted-wild.jpg'; document.body.appendChild(a); a.click(); a.remove(); };
  $('#pbSave', root).addEventListener('click', saveCard);
  $('#pbRetake', root).addEventListener('click', start);
  $$('.soc', root).forEach(b => b.addEventListener('click', () => openSocial(b.dataset.net, cleanName(nameIn.value), card)));
  start();
  return () => { alive = false; stop(); if (card) setTimeout(() => URL.revokeObjectURL(card.url), 1000); };
}

async function personMask(cap) {
  try {
    const seg = await Promise.race([loadSeg(), wait(9000).then(() => { throw new Error('slow'); })]);
    let out = null;
    seg.segment(cap, r => {
      const m = r.confidenceMasks?.[r.confidenceMasks.length - 1]; if (!m) return;
      const w = m.width, h = m.height, data = m.getAsFloat32Array();
      let edge = 0, n = 0; for (let x = 0; x < w; x++) { edge += data[x]; n++; } for (let y = 0; y < h; y++) { edge += data[y * w] + data[y * w + w - 1]; n += 2; }
      const inv = edge / n > 0.6, im = new ImageData(w, h);
      for (let i = 0; i < w * h; i++) { let a = inv ? 1 - data[i] : data[i]; a = clamp01((a - 0.25) / 0.5); im.data[i * 4 + 3] = a * 255; }
      out = mk(w, h); out.getContext('2d').putImageData(im, 0, 0);
    });
    return out;
  } catch (e) { console.warn('segment', e); return null; }
}

function drawCover(c, src, x, y, w, h, fy = 0.5) {
  const s = Math.max(w / src.width, h / src.height), sw = w / s, sh = h / s;
  c.drawImage(src, (src.width - sw) / 2, (src.height - sh) * fy, sw, sh, x, y, w, h);
}
function drawGhost(c, x, y, s, a, rot) {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s / 100, s / 100); c.globalAlpha = a;
  const g = c.createRadialGradient(50, 40, 5, 50, 50, 80); g.addColorStop(0, '#ffffff'); g.addColorStop(1, 'rgba(200,230,255,.4)');
  c.fillStyle = g; c.shadowColor = 'rgba(200,230,255,.9)'; c.shadowBlur = 30;
  c.beginPath(); c.moveTo(50, 4); c.bezierCurveTo(24, 4, 10, 26, 10, 52); c.lineTo(10, 110); c.lineTo(22, 100); c.lineTo(32, 112); c.lineTo(41, 100); c.lineTo(50, 112);
  c.lineTo(59, 100); c.lineTo(69, 112); c.lineTo(79, 100); c.lineTo(90, 110); c.lineTo(90, 52); c.bezierCurveTo(90, 26, 76, 4, 50, 4); c.fill();
  c.shadowBlur = 0; c.fillStyle = '#14121c';
  for (const [ex, ey, rx, ry] of [[37, 50, 6, 9], [63, 50, 6, 9], [50, 74, 6, 8]]) { c.beginPath(); c.ellipse(ex, ey, rx, ry, 0, 0, TAU); c.fill(); }
  c.restore();
}

function drawHand(c, x, y, s, rot, alpha) {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s / 60, s / 60); c.globalAlpha = alpha; c.fillStyle = 'rgb(225,242,255)';
  c.beginPath(); c.ellipse(30, 54, 17, 19, 0, 0, TAU); c.fill();
  for (const [fx, fy, w, h, r] of [[15, 33, 8, 30, -12], [24, 24, 8, 36, -4], [35, 23, 8, 37, 3], [45, 28, 8, 32, 10], [48, 55, 8, 22, 48]]) {
    c.save(); c.translate(fx, fy); c.rotate(r * Math.PI / 180); c.beginPath(); c.roundRect ? c.roundRect(-w / 2, -h / 2, w, h, 4) : c.rect(-w / 2, -h / 2, w, h); c.fill(); c.restore();
  }
  c.restore();
}

// The share photo: you, shrunk down and trapped behind the glass of the haunted booth in the giant hand.
async function buildPortrait(cap, name) {
  const W = 1080, H = 1350, c = mk(W, H), x = c.getContext('2d');
  const mask = await personMask(cap);
  const CROP = { x: 0.07, y: 0.06, w: 0.66 }, k = W / CROP.w;               // which part of the scene fills the card
  const P = (fx, fy) => [(fx - CROP.x) * k, (fy - CROP.y) * k];
  const FACE = [[0.112, 0.228], [0.65, 0.205], [0.65, 0.68], [0.122, 0.62]].map(([a, b]) => P(a, b)); // front glass wall
  const glassPath = () => { x.beginPath(); FACE.forEach(([px, py], i) => i ? x.lineTo(px, py) : x.moveTo(px, py)); x.closePath(); };

  // the booth, in the hand, haunted
  x.fillStyle = '#06070d'; x.fillRect(0, 0, W, H);
  if (S.still) { const sw = S.still.width; x.drawImage(S.still, CROP.x * sw, CROP.y * sw, CROP.w * sw, CROP.w * sw * H / W, 0, 0, W, H); }
  x.globalCompositeOperation = 'saturation'; x.globalAlpha = 0.5; x.fillStyle = '#777'; x.fillRect(0, 0, W, H);
  x.globalCompositeOperation = 'multiply'; x.globalAlpha = 1; x.fillStyle = '#7383ad'; x.fillRect(0, 0, W, H);
  x.globalCompositeOperation = 'source-over'; x.fillStyle = 'rgba(4,5,12,.2)'; x.fillRect(0, 0, W, H);

  // you, inside the glass
  const cx = (FACE[0][0] + FACE[1][0]) / 2, floor = (FACE[2][1] + FACE[3][1]) / 2 + 12, top = Math.min(FACE[0][1], FACE[1][1]);
  x.save(); glassPath(); x.clip();
  x.fillStyle = 'rgba(6,8,16,.45)'; x.fillRect(0, 0, W, H);
  const glow = x.createRadialGradient(cx, floor - 300, 0, cx, floor - 300, 520);
  glow.addColorStop(0, 'rgba(150,255,80,.35)'); glow.addColorStop(1, 'rgba(150,255,80,0)');
  x.globalCompositeOperation = 'screen'; x.fillStyle = glow; x.fillRect(0, 0, W, H); x.globalCompositeOperation = 'source-over';
  const p = mk(cap.width, cap.height), px = p.getContext('2d');
  px.drawImage(cap, 0, 0);
  px.globalCompositeOperation = 'saturation'; px.globalAlpha = 0.45; px.fillStyle = '#777'; px.fillRect(0, 0, p.width, p.height);
  px.globalCompositeOperation = 'multiply'; px.globalAlpha = 1; px.fillStyle = '#c3cede'; px.fillRect(0, 0, p.width, p.height);
  if (mask) { px.globalCompositeOperation = 'destination-in'; px.imageSmoothingQuality = 'high'; px.drawImage(mask, 0, 0, p.width, p.height); }
  if (mask) {
    const sc = ((floor - top) * 0.98) / p.height;
    x.shadowColor = 'rgba(150,255,80,.5)'; x.shadowBlur = 36;
    x.drawImage(p, cx - p.width * sc / 2, floor - p.height * sc, p.width * sc, p.height * sc);
    x.shadowBlur = 0;
  } else {
    drawCover(x, p, FACE[0][0], top, FACE[1][0] - FACE[0][0], floor - top, 0.3);   // no cut-out: you fill the glass instead
  }
  // glass: tint, reflections, handprints from the inside, mist
  x.fillStyle = 'rgba(140,190,220,.07)'; x.fillRect(0, 0, W, H);
  for (const [x0, w] of [[120, 120], [560, 70], [700, 160]]) {
    const g = x.createLinearGradient(x0, 0, x0 + w, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,.13)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.save(); x.translate(0, 0); x.transform(1, 0, -0.35, 1, 0, 0); x.fillStyle = g; x.fillRect(x0, 0, w, H); x.restore();
  }
  drawHand(x, cx - 330, top + 300, 120, -0.25, 0.32);
  drawHand(x, cx + 250, top + 250, 110, 0.3, 0.28);
  const mist = x.createLinearGradient(0, floor - 180, 0, floor); mist.addColorStop(0, 'rgba(210,230,255,0)'); mist.addColorStop(1, 'rgba(210,230,255,.22)');
  x.fillStyle = mist; x.fillRect(0, 0, W, H);
  x.restore();
  // the booth's metal frame in front of you: edges and the glass divider
  x.lineCap = 'round';
  const bar = (a, b, w) => { const [ax, ay] = P(...a), [bx, by] = P(...b); x.beginPath(); x.moveTo(ax, ay); x.lineTo(bx, by); x.lineWidth = w; x.stroke(); };
  for (const [col, w] of [['#101117', 13], ['rgba(255,255,255,.22)', 2]]) {
    x.strokeStyle = col;
    bar([0.112, 0.228], [0.65, 0.205], w); bar([0.112, 0.228], [0.122, 0.62], w); bar([0.65, 0.205], [0.65, 0.68], w);
    bar([0.122, 0.62], [0.65, 0.68], w); bar([0.25, 0.22], [0.26, 0.64], w * 0.8);
  }

  // ghosts circling outside
  drawGhost(x, 935, 300, 160, 0.5, 0.18);
  drawGhost(x, 70, 1010, 110, 0.32, -0.25);

  // legibility bands
  const topG = x.createLinearGradient(0, 0, 0, 280); topG.addColorStop(0, 'rgba(4,5,12,.95)'); topG.addColorStop(1, 'rgba(4,5,12,0)');
  x.fillStyle = topG; x.fillRect(0, 0, W, 280);
  const bot = x.createLinearGradient(0, 960, 0, H); bot.addColorStop(0, 'rgba(4,5,12,0)'); bot.addColorStop(.45, 'rgba(4,5,12,.85)'); bot.addColorStop(1, 'rgba(4,5,12,.97)');
  x.fillStyle = bot; x.fillRect(0, 960, W, H - 960);

  // the sprayed-over title
  const fsz = 92, ty = 112; x.font = `400 ${fsz}px "DM Serif Display", Georgia, serif`; x.textBaseline = 'middle';
  const parts = ['The ', 'Virtual', ' Wild'], ws = parts.map(t => x.measureText(t).width), total = ws.reduce((a, b) => a + b, 0);
  let tx = (W - total) / 2; x.fillStyle = '#f1ead8'; x.textAlign = 'left';
  parts.forEach((t, i) => { x.fillText(t, tx, ty); tx += ws[i]; });
  const vx = (W - total) / 2 + ws[0], vw = ws[1];
  const layer = mk(W, H), sp = new Spray(layer, 1);
  await sp.play(crossOutOp('8,8,14', () => ({ x: vx, y: ty - fsz * 0.36, w: vw, h: fsz * 0.72 })), 0);
  await sp.play(tagOp('HAUNTED', '#b4ff3a', 'rgba(150,255,60,.55)', () => ({ cx: vx + vw / 2, cy: ty - fsz * 0.5, size: fsz * 0.6, rot: -0.07 })), 0);
  x.drawImage(layer, 0, 0);

  // the rescue call
  x.textAlign = 'center'; x.fillStyle = '#f1ead8';
  const line1 = name ? `${name} is trapped in The Haunted Wild.` : 'I’m trapped in The Haunted Wild.';
  let f1 = 62; do { x.font = `400 ${f1}px "DM Serif Display", Georgia, serif`; } while (x.measureText(line1).width > 990 && (f1 -= 2) > 30);
  x.fillText(line1, W / 2, H - 206);
  x.fillStyle = '#b4ff3a'; x.font = 'italic 400 42px "DM Serif Display", Georgia, serif';
  x.fillText(name ? 'Find the 3 spirits to set them free.' : 'Find the 3 spirits to set me free.', W / 2, H - 142);
  x.fillStyle = 'rgba(241,234,216,.6)'; x.font = '600 24px Inter, -apple-system, sans-serif';
  if ('letterSpacing' in x) x.letterSpacing = '3px';
  x.fillText('THEVIRTUALWILD.COM  ·  MADE BY THE VIRTUAL WILD', W / 2, H - 66);

  const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.92));
  return { blob, url: URL.createObjectURL(blob), file: new File([blob], 'the-haunted-wild.jpg', { type: 'image/jpeg' }) };
}

// ───────── Sound toggle & resize ─────────
$('#sound').addEventListener('click', () => { audioInit(); setMuted(!AU.muted); });
document.addEventListener('pointerdown', () => { if (AU.ctx && AU.ctx.state !== 'running') AU.ctx.resume?.(); }, { passive: true });
function resizeAll() {
  sceneSpray.resize();
  if (S.room >= 0) zoomTo(ROOMS[S.room].rect, true); else if (S.z !== 1) zoomTo(null, true); else updateLight();
}
let rz = 0;
addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(resizeAll, 120); });
setMuted(AU.muted);

