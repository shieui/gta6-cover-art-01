// Wires Neon Cover Studio: panel photos, layout, grade, caption and export.
// Photos are read on this machine with FileReader / object URLs and never
// uploaded. A `?shot=` query sets up a fixed scene for a screenshot instead.
import { GRADES, LAYOUTS, SIZES, defaultState, drawCover } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const captionInput = document.getElementById('caption');
const subtitleInput = document.getElementById('subtitle');
const photoFile = document.getElementById('photoFile');
const photoSample = document.getElementById('photoSample');
const zoomInput = document.getElementById('zoom');
const dxInput = document.getElementById('dx');
const dyInput = document.getElementById('dy');

const state = defaultState();
let activePanel = 0;
let fontsReady = false;

const SAMPLES = [
  'samples/sunset-skyline.jpg',
  'samples/neon-street.jpg',
  'samples/beach-pier.jpg',
];

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

function redraw() {
  drawCover(canvas, state);
}

function applySize() {
  canvas.width = state.size.w;
  canvas.height = state.size.h;
  redraw();
}

function syncPanelControls() {
  const panel = state.panels[activePanel];
  zoomInput.value = panel.zoom;
  dxInput.value = panel.dx;
  dyInput.value = panel.dy;
  document.getElementById('zoomOut').textContent = `${panel.zoom.toFixed(2)}×`;
  document.getElementById('dxOut').textContent = panel.dx.toFixed(2);
  document.getElementById('dyOut').textContent = panel.dy.toFixed(2);
  document.querySelectorAll('#panelTabs button').forEach((b, i) => {
    b.setAttribute('aria-pressed', String(i === activePanel));
  });
}

function syncButtons(rowId, current, values) {
  document.querySelectorAll(`#${rowId} button`).forEach((b, i) => {
    b.setAttribute('aria-pressed', String(values[i] === current));
  });
}

function buildButtonRow(rowId, entries, onPick) {
  const row = document.getElementById(rowId);
  entries.forEach(([value, label]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => onPick(value));
    row.appendChild(b);
  });
}

buildButtonRow('layoutRow', Object.entries(LAYOUTS).map(([k, v]) => [k, v.label]), (value) => {
  state.layout = value;
  syncButtons('layoutRow', value, Object.keys(LAYOUTS));
  redraw();
});
buildButtonRow('gradeRow', Object.entries(GRADES).map(([k, v]) => [k, v.label]), (value) => {
  state.grade = value;
  syncButtons('gradeRow', value, Object.keys(GRADES));
  redraw();
});
buildButtonRow('sizeRow', SIZES.map((s) => [`${s.w}x${s.h}`, s.label]), (value) => {
  state.size = SIZES.find((s) => `${s.w}x${s.h}` === value);
  syncButtons('sizeRow', value, SIZES.map((s) => `${s.w}x${s.h}`));
  applySize();
});
buildButtonRow('panelTabs', [0, 1, 2].map((i) => [i, `Panel ${i + 1}`]), (value) => {
  activePanel = value;
  syncPanelControls();
});
syncButtons('layoutRow', state.layout, Object.keys(LAYOUTS));
syncButtons('gradeRow', state.grade, Object.keys(GRADES));
syncButtons('sizeRow', `${state.size.w}x${state.size.h}`, SIZES.map((s) => `${s.w}x${s.h}`));

photoFile.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  state.panels[activePanel].image = await loadImage(URL.createObjectURL(file));
  photoSample.value = '';
  status.textContent = `Panel ${activePanel + 1}: loaded ${file.name}`;
  redraw();
});

photoSample.addEventListener('change', async () => {
  if (!photoSample.value) return;
  state.panels[activePanel].image = await loadImage(photoSample.value);
  status.textContent = `Panel ${activePanel + 1}: using sample ${photoSample.value}`;
  redraw();
});

zoomInput.addEventListener('input', () => {
  state.panels[activePanel].zoom = Number(zoomInput.value);
  syncPanelControls();
  redraw();
});
dxInput.addEventListener('input', () => {
  state.panels[activePanel].dx = Number(dxInput.value);
  syncPanelControls();
  redraw();
});
dyInput.addEventListener('input', () => {
  state.panels[activePanel].dy = Number(dyInput.value);
  syncPanelControls();
  redraw();
});

document.getElementById('applyAll').addEventListener('click', () => {
  const image = state.panels[activePanel].image;
  state.panels.forEach((p) => { p.image = image; });
  status.textContent = 'One photo now fills all three panels';
  redraw();
});

captionInput.addEventListener('input', () => {
  state.caption = captionInput.value;
  redraw();
});
subtitleInput.addEventListener('input', () => {
  state.subtitle = subtitleInput.value;
  redraw();
});

document.getElementById('export').addEventListener('click', () => {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-cover-${state.size.w}x${state.size.h}.png`;
    a.click();
    status.textContent = `Exported neon-cover-${state.size.w}x${state.size.h}.png`;
  }, 'image/png');
});

/** Loads the three sample photos into the panels, in order. */
export async function loadSamples() {
  const images = await Promise.all(SAMPLES.map(loadImage));
  images.forEach((image, i) => { state.panels[i].image = image; });
}

async function start() {
  // The display font for the caption; fall back to a system font if it fails.
  try {
    await Promise.race([
      document.fonts.load('100px Anton'),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);
    fontsReady = true;
  } catch {
    fontsReady = false;
  }
  const query = new URLSearchParams(location.search);
  const shot = query.get('shot');
  if (shot) {
    await runShot(shot, query, { state, canvas, loadImage, loadSamples, applySize, redraw });
    // A shot scene may set layout, grade or size from the query: make the
    // pressed buttons match the state it chose.
    syncButtons('layoutRow', state.layout, Object.keys(LAYOUTS));
    syncButtons('gradeRow', state.grade, Object.keys(GRADES));
    syncButtons('sizeRow', `${state.size.w}x${state.size.h}`, SIZES.map((s) => `${s.w}x${s.h}`));
    syncPanelControls();
  } else {
    await loadSamples();
    syncPanelControls();
    applySize();
  }
  if (fontsReady) redraw();
}

start();
