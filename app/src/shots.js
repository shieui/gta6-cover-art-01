// Fixed scenes for screenshots, driven by `?shot=` query parameters.
// `editor` shows the page with sample photos loaded; `cover` shows the cover
// alone at the requested size, layout and caption. window.__shotReady is set
// once the scene is painted, so a screenshot tool can wait for it.

/** Runs one screenshot scene. `app` carries the live state and helpers. */
export async function runShot(shot, query, app) {
  const { state, canvas, loadSamples, applySize, redraw } = app;
  if (query.get('layout')) state.layout = query.get('layout');
  if (query.get('grade')) state.grade = query.get('grade');
  if (query.get('caption') !== null) {
    state.caption = query.get('caption');
    document.getElementById('caption').value = state.caption;
  }
  if (query.get('subtitle') !== null) {
    state.subtitle = query.get('subtitle');
    document.getElementById('subtitle').value = state.subtitle;
  }
  const size = query.get('size');
  if (size) {
    const [w, h] = size.split('x').map(Number);
    if (Number.isFinite(w) && Number.isFinite(h)) state.size = { label: size, w, h };
  }
  await loadSamples();
  applySize();
  if (shot === 'cover') document.body.classList.add('shot-cover');
  redraw();
  await document.fonts.ready;
  redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
