/* Fichas, comparação e fontes. Dados vêm de data/breeds.json (dossiê PESQ-001). */
import { onSelect, select } from './store.js';

export const NA = 'Pendente de verificação';
export const EV = { consolidada: 'Consolidada', associacao: 'Associação clínica/técnica', hipotese: 'Hipótese', pendente: 'Pendente' };
export const FIELDS = [
  ['taxon', 'Classificação'], ['origem', 'Origem'], ['aptidao', 'Aptidão'], ['pelagem', 'Pelagem'],
  ['pele', 'Pele'], ['cupim', 'Cupim'], ['barbela', 'Barbela'], ['orelhas', 'Orelhas'],
  ['chifres', 'Chifres'], ['conformacao', 'Conformação'], ['adaptacao', 'Adaptação'], ['particularidades', 'Particularidades'],
];
const GROUPS = {
  morphology: ['pelagem', 'pele', 'cupim', 'barbela', 'orelhas', 'chifres', 'conformacao'],
  production: ['aptidao', 'adaptacao'],
  notes: ['taxon', 'particularidades'],
};
const LABEL = Object.fromEntries(FIELDS);

export const h = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

/** Situação de uma linha comparativa: 'partial' (há pendência), 'differs' ou 'same'. Função pura. */
export function rowStatus(fields) {
  if (fields.some((f) => f.v === null)) return 'partial';
  return new Set(fields.map((f) => (f.short || f.v).toLowerCase())).size > 1 ? 'differs' : 'same';
}

export function badge(e) { return h('span', `evidence evidence-${e === 'pendente' ? 'hipotese' : e}`, EV[e]); }

export function refLinks(ids) {
  const s = h('span', 'ref-ids');
  ids.forEach((id, i) => {
    if (i) s.append(', ');
    const a = h('a', null, id);
    a.href = `#src-${id}`;
    s.append(a);
  });
  return s;
}

function factItem(label, f) {
  const li = h('li', 'fact');
  li.append(h('strong', null, `${label}: `));
  if (f.v === null) { li.append(h('span', 'ref-pending', NA)); return li; }
  li.append(f.v, ' ', badge(f.e), ' ');
  li.append('[', refLinks(f.s), ']');
  return li;
}

function factList(breed, keys) {
  const ul = h('ul', 'fact-list');
  keys.forEach((k) => ul.append(factItem(LABEL[k], breed.fields[k])));
  return ul;
}

/** Tabela comparativa de duas ou mais raças. */
export function diffTable(breeds) {
  const wrap = h('div');
  const t = h('table');
  t.append(h('caption', 'sr-only', 'Comparação de características entre raças'));
  const hr = h('tr');
  hr.append(h('th', null, 'Característica'));
  breeds.forEach((b) => hr.append(h('th', null, `${b.name} (${b.animal})`)));
  const head = h('thead'); head.append(hr); t.append(head);
  const body = h('tbody');
  FIELDS.forEach(([k, label]) => {
    const fs = breeds.map((b) => b.fields[k]);
    const st = rowStatus(fs);
    const tr = h('tr', `row-${st}`);
    const th = h('th', null, label);
    th.scope = 'row';
    if (st === 'differs') th.append(h('span', 'row-flag', ' (difere)'));
    if (st === 'partial') th.append(h('span', 'row-flag', ' (dados pendentes)'));
    tr.append(th);
    fs.forEach((f) => {
      const td = h('td');
      if (f.v === null) td.append(h('span', 'ref-pending', NA));
      else { td.append(f.v, ' ', badge(f.e)); td.append(' [', refLinks(f.s), ']'); }
      tr.append(td);
    });
    body.append(tr);
  });
  t.append(body);
  wrap.className = 'table-scroll';
  wrap.append(t);
  return wrap;
}

function fillCards(data) {
  data.breeds.forEach((b) => {
    const card = document.getElementById(`breed-${b.id}`);
    if (!card) return;
    Object.entries(GROUPS).forEach(([key, keys]) => {
      const dd = card.querySelector(`[data-field="${key}"]`);
      if (dd) dd.replaceChildren(factList(b, keys));
    });
    const refs = new Set();
    Object.values(b.fields).forEach((f) => f.s.forEach((s) => refs.add(s)));
    const rd = card.querySelector('[data-field="references"]');
    if (rd) rd.replaceChildren(refLinks([...refs].sort((a, c) => a.slice(1) - c.slice(1))));
    const btn = h('button', 'btn', 'Destacar nos gráficos e no cercado');
    btn.type = 'button';
    btn.addEventListener('click', () => select(b.id));
    card.append(btn);
    onSelect((id) => {
      card.classList.toggle('is-selected', id === b.id);
      btn.setAttribute('aria-pressed', String(id === b.id));
    });
  });
}

function fillCompare(data) {
  const a = document.getElementById('compare-a'), c = document.getElementById('compare-b'), out = document.getElementById('compare-result');
  if (!a || !c || !out) return;
  [a, c].forEach((sel) => data.breeds.forEach((b) => sel.add(new Option(`${b.animal} · ${b.name}`, b.id))));
  a.value = 'nelore'; c.value = 'angus';
  const render = () => {
    const ids = [a.value, c.value];
    out.replaceChildren(ids[0] === ids[1] ? h('p', 'empty-text', 'Escolha duas raças diferentes para comparar.')
      : diffTable(ids.map((id) => data.breeds.find((b) => b.id === id))));
  };
  a.addEventListener('change', render); c.addEventListener('change', render);
  render();
}

function fillAtlasPanel(data) {
  const $ = (id) => document.getElementById(id);
  const btns = [...document.querySelectorAll('#breed-selector [data-breed]')];
  btns.forEach((btn) => btn.addEventListener('click', () => select(btn.dataset.breed)));
  onSelect((id) => {
    const b = data.breeds.find((x) => x.id === id);
    if (!b) return;
    btns.forEach((btn) => btn.setAttribute('aria-pressed', String(btn.dataset.breed === id)));
    const title = `${b.animal} · ${b.name}`;
    if ($('viewer-title')) $('viewer-title').textContent = title;
    if ($('breed-info-title')) $('breed-info-title').textContent = title;
    const v = (k) => b.fields[k].short || b.fields[k].v || NA;
    document.querySelector('[data-info="aptitude"]').textContent = v('aptidao');
    document.querySelector('[data-info="origin"]').textContent = v('origem');
    document.querySelector('[data-info="morphology"]').textContent = `Pelagem: ${v('pelagem')}. Cupim: ${v('cupim')}.`;
    if ($('breed-info-link')) $('breed-info-link').href = `#breed-${id}`;
  });
}

function fillSources(data) {
  const ol = document.getElementById('sources-list');
  if (!ol) return;
  Object.entries(data.sources).forEach(([id, s]) => {
    const li = h('li'); li.id = `src-${id}`;
    li.append(h('strong', null, `${id} `), `${s.org}. `);
    const a = h('a', null, s.title); a.href = s.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    li.append(a, ` (${s.year}). Fonte ${s.type}.`);
    ol.append(li);
  });
}

export function initBreeds(data) {
  fillCards(data); fillCompare(data); fillAtlasPanel(data); fillSources(data);
}
