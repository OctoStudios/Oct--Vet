/* Mini cercado 2D (Canvas). Comportamentos são genéricos de bovinos e iguais para todas as raças.
   Os desenhos são originais, feitos por código. A lógica (makeAnimal/stepAnimal) não depende do DOM. */
import { onSelect, select, getSelected } from './store.js';

export const WORLD = { w: 800, h: 500, minX: 80, maxX: 720, minY: 110, maxY: 425 };
export const STATES = {
  repouso: { label: 'Repouso', w: 3, dur: [4, 9] },
  caminhada: { label: 'Caminhada', w: 3, dur: [4, 8] },
  alimentacao: { label: 'Alimentação', w: 2, dur: [6, 11] },
  hidratacao: { label: 'Hidratação', w: 1.5, dur: [4, 8] },
  exploracao: { label: 'Exploração', w: 2, dur: [7, 13] },
};
const FEED = { x: 170, y: 385 }, WATER = { x: 640, y: 215 };
const rnd = (r, a, b) => a + (b - a) * r();
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
const inWorld = (p) => ({ x: clamp(p.x, WORLD.minX, WORLD.maxX), y: clamp(p.y, WORLD.minY, WORLD.maxY) });

function pickState(prev, r) {
  const opts = Object.entries(STATES).filter(([k]) => k !== prev);
  let x = r() * opts.reduce((s, [, v]) => s + v.w, 0);
  for (const [k, v] of opts) { x -= v.w; if (x <= 0) return k; }
  return opts[0][0];
}
function randomTarget(a, r, min, max) {
  const ang = rnd(r, 0, Math.PI * 2), d = rnd(r, min, max);
  return inWorld({ x: a.x + Math.cos(ang) * d, y: a.y + Math.sin(ang) * d });
}
function enter(a, key, r) {
  a.state = key; a.t = rnd(r, ...STATES[key].dur); a.arrived = false; a.guard = 25;
  const j = () => rnd(r, -28, 28);
  if (key === 'repouso') a.target = null;
  else if (key === 'alimentacao') a.target = inWorld({ x: FEED.x + j(), y: FEED.y + j() / 2 });
  else if (key === 'hidratacao') a.target = inWorld({ x: WATER.x + j(), y: WATER.y + j() / 2 });
  else if (key === 'caminhada') a.target = randomTarget(a, r, 60, 220);
  else a.target = randomTarget(a, r, 200, 420);
}
export function makeAnimal(b, r = Math.random) {
  const a = { id: b.id, name: b.animal, breed: b.name, visible: true, speed: 0, phase: 0, hd: 0, face: 1, t: 0 };
  a.x = rnd(r, WORLD.minX + 40, WORLD.maxX - 40); a.y = rnd(r, WORLD.minY + 20, WORLD.maxY - 20);
  a.heading = rnd(r, 0, Math.PI * 2);
  enter(a, pickState(null, r), r);
  return a;
}
export function stepAnimal(a, dt, others, r = Math.random) {
  const trip = a.state === 'alimentacao' || a.state === 'hidratacao';
  if (trip && a.target && !a.arrived) { a.guard -= dt; if (a.guard <= 0) a.arrived = true; } else a.t -= dt;
  let vt = 0;
  if (a.target && !a.arrived) {
    const dx = a.target.x - a.x, dy = a.target.y - a.y;
    if (Math.hypot(dx, dy) < 12) {
      if (a.state === 'exploracao' && a.t > 2) a.target = randomTarget(a, r, 200, 420);
      else a.arrived = true;
    } else {
      const diff = angDiff(a.heading, Math.atan2(dy, dx));
      a.heading += clamp(diff, -1.4 * dt, 1.4 * dt);
      vt = (a.state === 'exploracao' ? 18 : 27) * clamp(1.6 - Math.abs(diff), 0.1, 1);
    }
  }
  a.speed += clamp(vt - a.speed, -45 * dt, 45 * dt);
  a.x += Math.cos(a.heading) * a.speed * dt; a.y += Math.sin(a.heading) * a.speed * dt;
  for (const o of others) {
    if (o === a || !o.visible) continue;
    const dx = a.x - o.x, dy = a.y - o.y, d = Math.hypot(dx, dy);
    if (d > 0 && d < 52) { const k = (40 * dt * (1 - d / 52)) / d; a.x += dx * k; a.y += dy * k; }
  }
  Object.assign(a, inWorld(a));
  a.phase += a.speed * dt * 0.22;
  const c = Math.cos(a.heading); if (Math.abs(c) > 0.25) a.face = c > 0 ? 1 : -1;
  const down = trip && a.arrived ? 1 : 0;
  a.hd += clamp(down - a.hd, -2 * dt, 2 * dt);
  if (a.t <= 0) enter(a, pickState(a.state, r), r);
}

/* ---------- Desenho ---------- */
const LOOK = {
  nelore: { body: '#E4E0D4', dark: '#B9B3A3', hump: 12, dew: 11, ear: 7, horns: true, s: 1, skin: '#4A4036' },
  angus: { body: '#2C2B29', dark: '#1B1B1A', hump: 0, dew: 3, ear: 4, s: 1, skin: '#111' },
  brahman: { body: '#B3AEA3', dark: '#8D887C', hump: 11, dew: 12, ear: 11, s: 1.02, skin: '#4A4036' },
  hereford: { body: '#A34F2C', dark: '#7E3A1F', hump: 0, dew: 4, ear: 4, white: true, s: 1, skin: '#E7C9B8' },
  jersey: { body: '#B07A45', dark: '#8A5C2F', hump: 0, dew: 3, ear: 7, slim: true, s: 0.82, skin: '#5A3D22' },
};
const WHITE = '#F3EBDD', INK = '#2B2A1F';
function ell(c, x, y, rx, ry, fill, rot = 0) {
  c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  if (fill) { c.fillStyle = fill; c.fill(); }
  c.stroke();
}
function leg(c, x, sw, col, sock) {
  c.fillStyle = col; c.fillRect(x - 3 + sw * 0.5, 10, 6, 21); c.strokeRect(x - 3 + sw * 0.5, 10, 6, 21);
  if (sock) { c.fillStyle = WHITE; c.fillRect(x - 3 + sw * 0.5, 22, 6, 9); }
  c.fillStyle = INK; c.fillRect(x - 3 + sw * 0.5, 31, 6, 4);
}
function drawCow(c, a, sel) {
  const L = LOOK[a.id], s = L.s, sw = Math.sin(a.phase) * 5 * clamp(a.speed / 27, 0, 1.2);
  c.save(); c.translate(a.x, a.y);
  c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(0, 33 * s, 36 * s, 6 * s, 0, 0, 7); c.fill();
  c.scale(a.face * s, s); c.strokeStyle = 'rgba(43,42,31,.6)'; c.lineWidth = 1.2;
  leg(c, -20, sw, L.dark, L.white); leg(c, 14, -sw, L.dark, L.white);
  c.beginPath(); c.moveTo(-34, -8); c.quadraticCurveTo(-44, 4, -40, 20); c.lineWidth = 3; c.strokeStyle = L.dark; c.stroke();
  c.lineWidth = 1.2; c.strokeStyle = 'rgba(43,42,31,.6)';
  ell(c, 0, 0, 35, L.slim ? 15 : 18, L.body);
  if (L.hump) ell(c, 16, -17, L.hump, 9, L.body);
  if (L.white) ell(c, 0, 12, 22, 5, WHITE);
  ell(c, 27, 5, L.dew, 6 + L.dew / 3, L.body);
  const hx = 42, hy = -6 + a.hd * 20;
  ell(c, 28, -6 + a.hd * 8, 13, 10, L.body, 0.5 + a.hd * 0.5);
  ell(c, hx, hy, 13, 9, L.white ? WHITE : L.body, 0.15);
  ell(c, hx + 11, hy + 3, 6, 5, L.skin);
  c.save(); c.translate(hx - 8, hy - 7); c.rotate(L.ear > 8 ? 1.1 : 0.5); ell(c, 0, 0, L.ear, 3.5, L.white ? L.body : L.dark); c.restore();
  if (L.horns) { c.beginPath(); c.moveTo(hx - 4, hy - 8); c.lineTo(hx - 2, hy - 17); c.lineWidth = 3; c.strokeStyle = '#E9DFC6'; c.stroke(); c.lineWidth = 1.2; }
  c.fillStyle = INK; c.beginPath(); c.arc(hx + 4, hy - 2, 1.6, 0, 7); c.fill();
  leg(c, -12, -sw, L.body, L.white); leg(c, 22, sw, L.body, L.white);
  c.restore();
  if (sel) {
    c.save(); c.strokeStyle = '#F2E8D5'; c.lineWidth = 3; c.setLineDash([7, 5]);
    c.beginPath(); c.ellipse(a.x, a.y + 33 * s, 46 * s, 13 * s, 0, 0, 7); c.stroke(); c.restore();
  }
  c.font = `${sel ? 700 : 600} 12px "Source Sans 3", system-ui, sans-serif`; c.textAlign = 'center';
  const tw = c.measureText(a.name).width + 12;
  c.fillStyle = sel ? '#354C36' : 'rgba(53,76,54,.82)'; c.fillRect(a.x - tw / 2, a.y + 40 * s, tw, 16);
  c.fillStyle = '#F2E8D5'; c.fillText(a.name, a.x, a.y + 52 * s);
}
function tag(c, text, x, y) {
  c.font = '600 11px "Source Sans 3", system-ui, sans-serif'; c.textAlign = 'center';
  const w = c.measureText(text).width + 10;
  c.fillStyle = 'rgba(53,76,54,.85)'; c.fillRect(x - w / 2, y - 11, w, 15); c.fillStyle = '#F2E8D5'; c.fillText(text, x, y);
}
function drawEnv(c) {
  const { w, h } = WORLD;
  c.fillStyle = '#8E9D68'; c.fillRect(0, 0, w, h);
  c.fillStyle = 'rgba(101,115,75,.35)';
  for (let i = 0; i < 70; i++) { const x = (i * 97) % w, y = 60 + ((i * 53) % (h - 70)); c.fillRect(x, y, 26, 3); }
  c.fillStyle = 'rgba(53,76,54,.28)'; c.beginPath(); c.ellipse(190, 175, 95, 55, 0, 0, 7); c.fill();
  c.fillStyle = '#C9B48A'; c.beginPath(); c.ellipse(170, 410, 120, 36, 0, 0, 7); c.fill();
  c.beginPath(); c.ellipse(640, 195, 75, 45, 0, 0, 7); c.fill();
  c.fillStyle = '#7FA3AA'; c.beginPath(); c.ellipse(640, 192, 52, 28, 0, 0, 7); c.fill();
  c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(628, 184, 18, 7, 0, 0, 7); c.fill();
  c.fillStyle = '#79543B'; c.fillRect(110, 412, 120, 26); c.fillStyle = '#D9C27A'; c.fillRect(116, 417, 108, 14);
  c.strokeStyle = '#4B3322'; c.lineWidth = 2; c.strokeRect(110, 412, 120, 26);
  const x0 = 34, x1 = 766, y0 = 66, y1 = 468;
  c.strokeStyle = '#79543B'; c.lineWidth = 5;
  [y0 + 14, y0 + 34].forEach((y) => { c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke(); });
  [y1 - 34, y1 - 14].forEach((y) => { c.beginPath(); c.moveTo(x0, y); c.lineTo(340, y); c.moveTo(460, y); c.lineTo(x1, y); c.stroke(); });
  [x0, x1].forEach((x) => { c.beginPath(); c.moveTo(x, y0 + 14); c.lineTo(x, y1 - 14); c.stroke(); });
  c.fillStyle = '#5B3F2B';
  for (let x = x0; x <= x1; x += 44) c.fillRect(x - 4, y0 + 6, 8, 36);
  for (let x = x0; x <= x1; x += 44) if (x < 330 || x > 470) c.fillRect(x - 4, y1 - 42, 8, 36);
  for (let y = y0; y <= y1; y += 44) { c.fillRect(x0 - 4, y, 8, 12); c.fillRect(x1 - 4, y, 8, 12); }
  c.strokeStyle = '#A58B65'; c.lineWidth = 4; c.strokeRect(344, y1 - 40, 112, 30);
  c.beginPath(); c.moveTo(344, y1 - 40); c.lineTo(456, y1 - 10); c.moveTo(456, y1 - 40); c.lineTo(344, y1 - 10); c.stroke();
  c.fillStyle = '#79543B'; c.fillRect(300, 8, 200, 34); c.strokeStyle = '#4B3322'; c.lineWidth = 2; c.strokeRect(300, 8, 200, 34);
  c.fillStyle = '#F2E8D5'; c.font = '700 15px Bitter, Georgia, serif'; c.textAlign = 'center'; c.fillText('Cercado 01 · Octó Vet', 400, 31);
  tag(c, 'Cocho', 170, 452); tag(c, 'Bebedouro', 640, 250); tag(c, 'Sombra', 190, 240); tag(c, 'Portão', 400, 490);
}

/* ---------- Interface ---------- */
export function initFarm(data) {
  const canvas = document.getElementById('farm-canvas');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  const $ = (id) => document.getElementById(id);
  const animals = data.breeds.map((b) => makeAnimal(b));
  const byId = Object.fromEntries(data.breeds.map((b) => [b.id, b]));
  const bg = document.createElement('canvas'); bg.width = WORLD.w; bg.height = WORLD.h; drawEnv(bg.getContext('2d'));
  let running = !matchMedia('(prefers-reduced-motion: reduce)').matches, dirty = true, last = 0, acc = 0;

  const toggle = $('farm-toggle'), reset = $('farm-reset'), legend = $('farm-legend'), info = $('farm-info');
  const stateEls = {};
  const syncToggle = () => { toggle.textContent = running ? 'Pausar' : 'Retomar'; toggle.setAttribute('aria-pressed', String(!running)); };
  toggle.addEventListener('click', () => { running = !running; last = 0; syncToggle(); });
  reset.addEventListener('click', () => { animals.forEach((a, i) => Object.assign(a, makeAnimal(data.breeds[i]), { visible: a.visible })); dirty = true; });
  syncToggle();

  animals.forEach((a) => {
    const li = document.createElement('li'); li.className = 'farm-item';
    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = true; cb.id = `farm-show-${a.id}`;
    cb.setAttribute('aria-label', `Mostrar ${a.name} (${a.breed}) no cercado`);
    cb.addEventListener('change', () => { a.visible = cb.checked; dirty = true; });
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'farm-pick'; btn.dataset.breed = a.id;
    btn.textContent = `${a.name} · ${a.breed}`; btn.addEventListener('click', () => select(a.id));
    const st = document.createElement('span'); st.className = 'farm-state'; stateEls[a.id] = st;
    li.append(cb, btn, st); legend.append(li);
  });

  function renderInfo(id) {
    const b = byId[id], a = animals.find((x) => x.id === id);
    const v = (k) => b.fields[k].short || b.fields[k].v || 'Pendente de verificação';
    info.replaceChildren();
    const t = document.createElement('h4'); t.textContent = `${b.animal} · ${b.name}`;
    const p = document.createElement('p'); p.append('Estado atual: ');
    const s = document.createElement('strong'); s.id = 'farm-cur-state'; s.textContent = a.visible ? STATES[a.state].label : 'oculto'; p.append(s);
    const dl = document.createElement('dl'); dl.className = 'spec-list';
    [['Aptidão', 'aptidao'], ['Origem', 'origem'], ['Pelagem', 'pelagem'], ['Cupim', 'cupim'], ['Chifres', 'chifres']].forEach(([l, k]) => {
      const d = document.createElement('div'), dt = document.createElement('dt'), dd = document.createElement('dd');
      dt.textContent = l; dd.textContent = v(k); d.append(dt, dd); dl.append(d);
    });
    const link = document.createElement('a'); link.href = `#breed-${id}`; link.textContent = 'Ver ficha completa';
    info.append(t, p, dl, link);
  }
  onSelect((id) => {
    renderInfo(id); dirty = true;
    legend.querySelectorAll('.farm-pick').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.breed === id)));
  });

  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2), w = canvas.clientWidth;
    if (!w) return;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round((w * WORLD.h / WORLD.w) * dpr); dirty = true;
  };
  new ResizeObserver(resize).observe(canvas); resize();

  canvas.addEventListener('pointerdown', (e) => {
    const r = canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * WORLD.w, y = ((e.clientY - r.top) / r.height) * WORLD.h;
    let best = null, bd = 48;
    animals.forEach((a) => { if (!a.visible) return; const d = Math.hypot(a.x - x, a.y + 5 - y); if (d < bd) { bd = d; best = a; } });
    if (best) select(best.id);
  });

  function draw() {
    const k = canvas.width / WORLD.w;
    ctx.setTransform(k, 0, 0, k, 0, 0); ctx.drawImage(bg, 0, 0);
    const sel = getSelected();
    [...animals].filter((a) => a.visible).sort((p, q) => p.y - q.y).forEach((a) => drawCow(ctx, a, a.id === sel));
  }
  function refreshStates() {
    animals.forEach((a) => { const txt = a.visible ? STATES[a.state].label : 'oculto'; if (stateEls[a.id].textContent !== txt) stateEls[a.id].textContent = txt; });
    const cur = $('farm-cur-state'), a = animals.find((x) => x.id === getSelected());
    if (cur && a) { const txt = a.visible ? STATES[a.state].label : 'oculto'; if (cur.textContent !== txt) cur.textContent = txt; }
  }
  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden || !canvas.offsetParent) { last = 0; return; }
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0; last = now;
    if (running && dt) { animals.forEach((a) => a.visible && stepAnimal(a, dt, animals)); dirty = true; acc += dt; if (acc > 0.3) { acc = 0; refreshStates(); } }
    if (dirty) { dirty = false; draw(); }
  }
  refreshStates(); requestAnimationFrame(frame);
}
