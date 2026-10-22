// Shared by both entries, so builds emit a shared chunk and a modulepreload tag.
export function pass(name) {
  document.querySelector(`[data-check="${name}"]`)?.setAttribute("data-ok", "");
}
