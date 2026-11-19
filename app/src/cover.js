// Draws GTA-style poster cover art onto a canvas: several photo panels with
// white gutters, a sunset or neon colour grade, and big bold caption lettering.
// Everything is drawn from the state object; the same function renders the
// live preview and the exported PNG, so what you see is what you share.

export const GRADES = {
  sunset: {
    label: 'Sunset',
    tintTop: 'rgba(255, 122, 40, 0.10)',
    tintBottom: 'rgba(198, 30, 120, 0.38)',
    textTop: '#ffe259',
    textBottom: '#ff2975',
    scrim: 'rgba(10, 3, 22, 0.88)',
  },
  neon: {
    label: 'Neon',
    tintTop: 'rgba(0, 240, 255, 0.12)',
    tintBottom: 'rgba(255, 41, 117, 0.32)',
    textTop: '#8ef6ff',
    textBottom: '#ff2975',
    scrim: 'rgba(4, 6, 26, 0.88)',
  },
  midnight: {
    label: 'Midnight',
    tintTop: 'rgba(70, 90, 255, 0.16)',
    tintBottom: 'rgba(120, 20, 170, 0.36)',
    textTop: '#cdb9ff',
    textBottom: '#ff5ea8',
    scrim: 'rgba(6, 4, 24, 0.88)',
  },
  gold: {
    label: 'Golden hour',
    tintTop: 'rgba(255, 200, 80, 0.10)',
    tintBottom: 'rgba(255, 110, 30, 0.30)',
    textTop: '#fff3b0',
    textBottom: '#ff8a00',
    scrim: 'rgba(16, 6, 2, 0.88)',
  },
};

export const LAYOUTS = {
  'triple-strip': { label: 'Triple strip', panels: 3 },
  'hero-duo': { label: 'Hero + duo', panels: 3 },
  'sunset-split': { label: 'Sunset split', panels: 3 },
};

export const SIZES = [
  { label: 'Square · 1080 × 1080', w: 1080, h: 1080 },
  { label: 'Portrait · 1080 × 1350', w: 1080, h: 1350 },
  { label: 'Wide · 1920 × 1080', w: 1920, h: 1080 },
];

/** A panel's photo, or null while empty: { image, zoom, dx, dy }. */
export function emptyPanel() {
  return { image: null, zoom: 1, dx: 0, dy: 0 };
}

/** The cover's full state: size, layout, grade, caption, subtitle, panels. */
export function defaultState() {
  return {
    size: SIZES[0],
    layout: 'triple-strip',
    grade: 'sunset',
    caption: 'SUNSET HEIST',
    subtitle: 'OCEAN DRIVE · 2026',
    panels: [emptyPanel(), emptyPanel(), emptyPanel()],
  };
}

/** Splits a caption into one or two lines that fit maxWidth at the given size. */
export function wrapCaption(ctx, text, maxWidth, size) {
  ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
  if (ctx.measureText(text).width <= maxWidth || !text.includes(' ')) return [text];
  const words = text.split(/\s+/);
  let best = null;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ');
    const b = words.slice(i).join(' ');
    const w = Math.max(ctx.measureText(a).width, ctx.measureText(b).width);
    if (!best || w < best.w) best = { lines: [a, b], w };
  }
  return best && best.w <= maxWidth ? best.lines : [text];
}

/** Picks the biggest caption size (up to startSize) whose wrapped lines fit. */
export function fitCaptionSize(ctx, text, maxWidth, startSize) {
  let size = startSize;
  while (size > 28) {
    const lines = wrapCaption(ctx, text, maxWidth, size);
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    if (widest <= maxWidth) return size;
    size -= 4;
  }
  return size;
}

function coverFit(image, pw, ph, zoom, dx, dy) {
  const scale = Math.max(pw / image.naturalWidth, ph / image.naturalHeight) * zoom;
  const dw = image.naturalWidth * scale;
  const dh = image.naturalHeight * scale;
  return { x: (pw - dw) / 2 + dx * pw, y: (ph - dh) / 2 + dy * ph, w: dw, h: dh };
}

function drawPhoto(ctx, panel, x, y, pw, ph, grade) {
  if (panel.image) {
    const r = coverFit(panel.image, pw, ph, panel.zoom, panel.dx, panel.dy);
    ctx.drawImage(panel.image, x + r.x, y + r.y, r.w, r.h);
  } else {
    const g = ctx.createLinearGradient(x, y, x, y + ph);
    g.addColorStop(0, '#3a2358');
    g.addColorStop(1, '#160a2e');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, pw, ph);
  }
  const tint = ctx.createLinearGradient(x, y, x, y + ph);
  tint.addColorStop(0, grade.tintTop);
  tint.addColorStop(1, grade.tintBottom);
  ctx.fillStyle = tint;
  ctx.fillRect(x, y, pw, ph);
}

/** Panel shapes for a layout: each is { path(ctx), rect:[x,y,w,h], rotate }. */
function panelShapes(state, w, h) {
  const slant = w * 0.055;
  if (state.layout === 'triple-strip') {
    return [0, 1, 2].map((i) => {
      const x0 = (w * i) / 3;
      const x1 = (w * (i + 1)) / 3;
      return {
        rect: [x0, 0, x1 - x0, h],
        rotate: 0,
        path(ctx) {
          ctx.beginPath();
          ctx.moveTo(x0 + slant, 0);
          ctx.lineTo(x1 + slant, 0);
          ctx.lineTo(x1 - slant, h);
          ctx.lineTo(x0 - slant, h);
          ctx.closePath();
        },
      };
    });
  }
  if (state.layout === 'hero-duo') {
    const top = h * 0.58;
    return [
      {
        rect: [0, 0, w, top],
        rotate: 0,
        path(ctx) { ctx.rect(0, 0, w, top); },
      },
      {
        rect: [0, top, w / 2, h - top],
        rotate: 0,
        path(ctx) { ctx.rect(0, top, w / 2, h - top); },
      },
      {
        rect: [w / 2, top, w / 2, h - top],
        rotate: 0,
        path(ctx) { ctx.rect(w / 2, top, w / 2, h - top); },
      },
    ];
  }
  // sunset-split: one full-bleed hero photo, two tilted inset panels.
  const iw = w * 0.4;
  const ih = h * 0.26;
  const inset = (cx, cy, angle) => ({
    rect: [cx - iw / 2, cy - ih / 2, iw, ih],
    rotate: angle,
    cx,
    cy,
    path(ctx) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.rect(-iw / 2, -ih / 2, iw, ih);
      ctx.restore();
    },
  });
  return [
    {
      rect: [0, 0, w, h],
      rotate: 0,
      path(ctx) { ctx.rect(0, 0, w, h); },
    },
    inset(w * 0.24, h * 0.52, -0.07),
    inset(w * 0.76, h * 0.55, 0.05),
  ];
}

/** Draws the whole cover for `state` onto the canvas at its own pixel size. */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = GRADES[state.grade];
  const border = Math.max(6, Math.round(w * 0.008));
  const shapes = panelShapes(state, w, h);

  ctx.fillStyle = '#160a2e';
  ctx.fillRect(0, 0, w, h);

  shapes.forEach((shape, i) => {
    const panel = state.panels[i] ?? emptyPanel();
    const [x, y, pw, ph] = shape.rect;
    ctx.save();
    shape.path(ctx);
    ctx.clip();
    if (shape.rotate) {
      ctx.translate(shape.cx, shape.cy);
      ctx.rotate(shape.rotate);
      ctx.translate(-shape.cx, -shape.cy);
    }
    drawPhoto(ctx, panel, x, y, pw, ph, grade);
    ctx.restore();
    const isInset = state.layout === 'sunset-split' && i > 0;
    if (!isInset) {
      // White gutter around every panel but the full-bleed hero.
      ctx.save();
      shape.path(ctx);
      ctx.lineWidth = border;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      ctx.restore();
    } else {
      // Tilted inset panels get a white edge and a soft drop shadow instead.
      ctx.save();
      ctx.translate(shape.cx, shape.cy);
      ctx.rotate(shape.rotate);
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = w * 0.02;
      ctx.shadowOffsetY = h * 0.008;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = border;
      ctx.strokeRect(-(shape.rect[2] / 2), -(shape.rect[3] / 2), shape.rect[2], shape.rect[3]);
      ctx.restore();
    }
  });

  // Poster frame around the whole cover.
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = border * 1.5;
  ctx.strokeRect(border * 0.75, border * 0.75, w - border * 1.5, h - border * 1.5);

  // Dark scrim behind the lettering, so it reads on any photo.
  const scrim = ctx.createLinearGradient(0, h * 0.58, 0, h);
  scrim.addColorStop(0, 'rgba(8, 3, 18, 0)');
  scrim.addColorStop(1, grade.scrim);
  ctx.fillStyle = scrim;
  ctx.fillRect(0, h * 0.58, w, h * 0.42);

  // Subtle vignette to pull the eye to the middle.
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(0, 0, 0, 0.22)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  drawLettering(ctx, state, w, h, grade);
}

/** The caption and subtitle, in big gradient Anton with a dark outline. */
export function drawLettering(ctx, state, w, h, grade) {
  const caption = state.caption.trim().toUpperCase();
  const subtitle = state.subtitle.trim().toUpperCase();
  const cx = w / 2;

  // Measure the caption first: the subtitle pill sits just above its block.
  const maxWidth = w * 0.92;
  const size = caption ? fitCaptionSize(ctx, caption, maxWidth, Math.round(h * 0.15)) : 0;
  const lines = caption ? wrapCaption(ctx, caption, maxWidth, size) : [];
  const lineHeight = size * 1.02;
  const blockH = lineHeight * lines.length;
  const topY = h * 0.97 - blockH;

  if (subtitle) {
    const subSize = Math.round(h * 0.026);
    ctx.font = `700 ${subSize}px system-ui, sans-serif`;
    try { ctx.letterSpacing = `${Math.round(subSize * 0.28)}px`; } catch { /* older canvas */ }
    const tw = ctx.measureText(subtitle).width;
    const padX = subSize * 0.9;
    const padY = subSize * 0.55;
    const pillW = tw + padX * 2;
    const pillH = subSize + padY * 2;
    const pillX = cx - pillW / 2;
    const pillY = topY - h * 0.022 - pillH;
    ctx.fillStyle = 'rgba(8, 3, 18, 0.72)';
    roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(subtitle, cx, pillY + pillH / 2 + subSize * 0.04);
    try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
  }

  if (!caption) return;

  ctx.save();
  ctx.translate(cx, topY + blockH / 2);
  ctx.rotate(-0.03);
  ctx.translate(-cx, -(topY + blockH / 2));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = size * 0.14;
  ctx.shadowOffsetY = size * 0.035;
  lines.forEach((line, i) => {
    const y = topY + lineHeight * (i + 0.5);
    const grad = ctx.createLinearGradient(0, y - size / 2, 0, y + size / 2);
    grad.addColorStop(0, grade.textTop);
    grad.addColorStop(1, grade.textBottom);
    ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
    ctx.lineWidth = Math.max(4, size * 0.09);
    ctx.strokeStyle = '#16041f';
    ctx.strokeText(line, cx, y);
    ctx.fillStyle = grad;
    ctx.fillText(line, cx, y);
  });
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
