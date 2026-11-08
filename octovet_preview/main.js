/* Octó Vet · Protótipo 000: navegação e inicialização dos módulos. */
import { initBreeds } from './breeds.js';
import { initCharts } from './charts.js';
import { initFarm } from './farm.js';

const VIEWS = ['inicio', 'atlas', 'anatomia', 'nutricao', 'racas'];
const $ = (id) => document.getElementById(id);

function route(focus) {
  const id = decodeURIComponent(location.hash.slice(1));
  const target = id ? document.getElementById(id) : null;
  const view = (target && target.closest('.view')) || $(VIEWS.includes(id) ? id : 'inicio');
  document.querySelectorAll('.view').forEach((v) => { v.hidden = v !== view; });
  document.querySelectorAll('#main-nav a').forEach((a) => {
    if (a.dataset.section === view.id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  if (target && target !== view) target.scrollIntoView({ block: 'start' }); else window.scrollTo(0, 0);
  if (focus) { const hd = view.querySelector('h1, h2'); if (hd) { hd.tabIndex = -1; hd.focus({ preventScroll: true }); } }
}

function stubs() {
  const err = $('viewer-error');
  if (err) {
    $('viewer-error-text').textContent = 'Visualizador 3D ainda não disponível. Entra na etapa seguinte, após a avaliação de fichas, gráficos e cercado.';
    $('viewer-retry').hidden = true; err.hidden = false;
  }
  ['btn-rotate-left', 'btn-rotate-right', 'btn-zoom-in', 'btn-zoom-out', 'btn-autorotate', 'btn-reset-view'].forEach((id) => { if ($(id)) $(id).disabled = true; });
  document.querySelectorAll('[data-loading]').forEach((e) => { e.textContent = 'Módulo ainda não implementado nesta etapa.'; });
  document.querySelectorAll('#nutrition-form input, #nutrition-form select, #nutrition-form button').forEach((e) => { e.disabled = true; });
  if ($('nutrition-count')) $('nutrition-count').textContent = 'Busca de nutrientes indisponível nesta etapa.';
}

async function start() {
  window.addEventListener('hashchange', () => route(true));
  route(false); stubs();
  try {
    const res = await fetch('data/breeds.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    initBreeds(data); initCharts(data); initFarm(data);
  } catch (e) {
    console.error(e);
    const p = document.createElement('p');
    p.className = 'notice'; p.setAttribute('role', 'alert');
    p.textContent = 'Não foi possível carregar data/breeds.json. Abra o site por um servidor HTTP (não por file://) e confira o caminho do arquivo.';
    $('conteudo').prepend(p);
  }
}
start();
