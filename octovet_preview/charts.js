/* Gráficos 1 a 4. Só representam dados presentes em data/breeds.json; campo sem fonte vira "Pendente". */
import { onSelect, select } from './store.js';
import { h, diffTable, refLinks, badge, NA, EV } from './breeds.js';

let tipEl;
function tip(el, text) {
  tipEl ??= Object.assign(h('div', 'tip'), { id: 'tip', role: 'tooltip', hidden: true });
  if (!tipEl.isConnected) document.body.append(tipEl);
  el.setAttribute('aria-describedby', 'tip');
  const show = () => {
    tipEl.textContent = typeof text === 'function' ? text() : text;
    tipEl.hidden = false;
    const r = el.getBoundingClientRect(), t = tipEl.getBoundingClientRect();
    tipEl.style.left = `${Math.max(8, Math.min(innerWidth - t.width - 8, r.left + r.width / 2 - t.width / 2))}px`;
    tipEl.style.top = `${r.top > t.height + 12 ? r.top - t.height - 8 : r.bottom + 8}px`;
  };
  const hide = () => { tipEl.hidden = true; };
  ['mouseenter', 'focus'].forEach((ev) => el.addEventListener(ev, show));
  ['mouseleave', 'blur'].forEach((ev) => el.addEventListener(ev, hide));
  el.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
}

const srcLine = (host, ids) => {
  const p = h('p', 'chart-src', 'Fontes: ');
  p.append(refLinks([...new Set(ids)].sort((a, b) => a.slice(1) - b.slice(1))));
  host.append(p);
};
const fieldTip = (b, k) => {
  const f = b.fields[k];
  return f.v === null ? `${b.name}: ${NA}.` : `${b.name}: ${f.v} Evidência: ${EV[f.e]}. Fontes: ${f.s.join(', ')}.`;
};

/* Gráfico 1: aptidão (corte × leite) */
function chartAptitude(data, host) {
  const groups = { corte: [], leite: [] };
  data.breeds.forEach((b) => groups[b.aptitude].push(b));
  const chips = [];
  const ul = h('ul', 'apt-chart');
  Object.entries(groups).forEach(([k, list]) => {
    const li = h('li');
    li.append(h('span', 'apt-label', `${k === 'corte' ? 'Corte' : 'Leite'} (${list.length} de ${data.breeds.length})`));
    const bar = h('div', 'apt-bar'); bar.style.setProperty('--w', `${(list.length / data.breeds.length) * 100}%`);
    bar.dataset.kind = k;
    list.forEach((b) => {
      const c = h('button', 'chip', `${b.animal} · ${b.name}`); c.type = 'button'; c.dataset.breed = b.id;
      c.addEventListener('click', () => select(b.id));
      tip(c, () => fieldTip(b, 'aptidao'));
      chips.push(c); bar.append(c);
    });
    li.append(bar); ul.append(li);
  });
  host.append(ul);
  srcLine(host, data.breeds.flatMap((b) => b.fields.aptidao.s));
  onSelect((id) => chips.forEach((c) => c.classList.toggle('is-selected', c.dataset.breed === id)));
}

/* Gráfico 2: matriz de características morfológicas (escala categórica) */
function chartMorph(data, host) {
  const traits = [['cupim', 'Cupim'], ['barbela', 'Barbela'], ['orelhas', 'Orelhas'], ['chifres', 'Chifres'], ['pelagem', 'Pelagem']];
  const t = h('table', 'matrix');
  t.append(h('caption', 'sr-only', 'Características morfológicas por raça'));
  const hr = h('tr'); hr.append(h('th', null, 'Característica'));
  const cols = [];
  data.breeds.forEach((b) => {
    const th = h('th'); th.scope = 'col';
    const btn = h('button', 'col-btn', b.animal); btn.type = 'button';
    btn.append(h('span', null, b.name)); btn.addEventListener('click', () => select(b.id));
    th.append(btn); hr.append(th); cols.push({ id: b.id, cells: [th] });
  });
  const hd = h('thead'); hd.append(hr); t.append(hd);
  const body = h('tbody');
  traits.forEach(([k, label]) => {
    const tr = h('tr'); const rh = h('th', null, label); rh.scope = 'row'; tr.append(rh);
    data.breeds.forEach((b, i) => {
      const f = b.fields[k];
      const td = h('td', `cat-${f.v === null ? 'pendente' : f.cat || 'texto'}`, f.v === null ? NA : f.short || f.v);
      td.tabIndex = 0; tip(td, () => fieldTip(b, k));
      tr.append(td); cols[i].cells.push(td);
    });
    body.append(tr);
  });
  t.append(body);
  const sc = h('div', 'table-scroll'); sc.append(t); host.append(sc);
  const lg = h('ul', 'legend');
  [['presente', 'Presente / desenvolvida'], ['ausente', 'Ausente'], ['variavel', 'Variável'], ['pendente', 'Pendente de verificação']]
    .forEach(([c, l]) => { const li = h('li', null, l); li.className = `cat-${c}`; lg.append(li); });
  host.append(lg);
  host.append(h('p', 'chart-note', 'Escala qualitativa. Não há medidas quantitativas comparáveis verificadas. Passe o mouse ou foque uma célula para ver a fonte.'));
  srcLine(host, data.breeds.flatMap((b) => traits.flatMap(([k]) => b.fields[k].s)));
  onSelect((id) => cols.forEach((c) => c.cells.forEach((el) => el.classList.toggle('is-selected', c.id === id))));
}

/* Gráfico 3: comparação de duas ou mais raças escolhidas */
function chartDiff(data, host) {
  const fs = h('fieldset', 'pick'); fs.append(h('legend', null, 'Escolha duas ou mais raças'));
  const out = h('div'); out.setAttribute('aria-live', 'polite');
  const boxes = data.breeds.map((b) => {
    const lab = h('label', 'pick-item'); const cb = h('input'); cb.type = 'checkbox'; cb.value = b.id;
    cb.checked = b.id === 'nelore' || b.id === 'angus';
    cb.addEventListener('change', render); lab.append(cb, ` ${b.animal} · ${b.name}`); fs.append(lab); return cb;
  });
  function render() {
    const sel = boxes.filter((c) => c.checked).map((c) => data.breeds.find((b) => b.id === c.value));
    out.replaceChildren(sel.length < 2 ? h('p', 'empty-text', 'Marque pelo menos duas raças.') : diffTable(sel));
  }
  host.append(fs, out); render();
  host.append(h('p', 'chart-note', 'Linhas marcadas como "difere" têm todos os campos preenchidos e valores distintos. Linhas com pendência não são comparáveis.'));
}

/* Gráfico 4: espaço reservado para dados zootécnicos (sem números) */
function chartZoo(host) {
  const ul = h('ul', 'zoo-list');
  ['Peso adulto', 'Produção leiteira', 'Ganho médio diário', 'Eficiência alimentar', 'Idade ao primeiro parto'].forEach((n) => {
    const li = h('li'); li.append(h('span', null, n), h('span', 'zoo-empty', 'Sem dados comparáveis verificados')); ul.append(li);
  });
  host.append(ul, h('p', 'chart-note', 'Indicadores só entram com fontes comparáveis (mesma categoria, sistema e metodologia). Nenhum valor foi estimado.'));
}

export function initCharts(data) {
  const slot = (id) => document.querySelector(`#${id} [data-chart]`);
  [['chart-aptitude', chartAptitude], ['chart-morph', chartMorph], ['chart-diff', chartDiff]].forEach(([id, fn]) => { const s = slot(id); if (s) fn(data, s); });
  const z = slot('chart-zoo'); if (z) chartZoo(z);
}
