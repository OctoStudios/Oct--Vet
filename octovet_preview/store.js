/* Estado compartilhado: raça selecionada. Todos os módulos assinam aqui. */
const listeners = new Set();
let selected = 'nelore';
export const getSelected = () => selected;
export function select(id) {
  if (id === selected) return;
  selected = id;
  listeners.forEach((fn) => fn(id));
}
/** Registra ouvinte e o chama uma vez com a seleção atual. */
export function onSelect(fn) {
  listeners.add(fn);
  fn(selected);
}
