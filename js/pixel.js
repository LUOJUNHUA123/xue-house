/* ============================================================
 *  pixel.js — 像素绘制基础工具
 *  逻辑分辨率固定 480x270，所有绘制都是整数像素，
 *  最后整体放大到屏幕，imageSmoothing 关闭，保证硬像素边缘。
 * ============================================================ */

const LOGIC_W = 480;
const LOGIC_H = 270;

const P = {
  /** 实心矩形 */
  r(ctx, x, y, w, h, c) {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  },

  /** 1px 描边矩形（先描边后填充内部） */
  rb(ctx, x, y, w, h, fill, stroke) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    if (stroke) {
      ctx.fillStyle = stroke;
      ctx.fillRect(x, y, w, h);
    }
    if (fill) {
      ctx.fillStyle = fill;
      const i = stroke ? 1 : 0;
      if (w - i * 2 > 0 && h - i * 2 > 0) ctx.fillRect(x + i, y + i, w - i * 2, h - i * 2);
    }
  },

  /** 像素圆（用逐行扫描，不开启抗锯齿） */
  circle(ctx, cx, cy, rad, c) {
    cx = Math.round(cx); cy = Math.round(cy); rad = Math.round(rad);
    ctx.fillStyle = c;
    for (let dy = -rad; dy <= rad; dy++) {
      const dx = Math.floor(Math.sqrt(rad * rad - dy * dy));
      ctx.fillRect(cx - dx, cy + dy, dx * 2 + 1, 1);
    }
  },

  /** 椭圆（横向压缩） */
  ellipse(ctx, cx, cy, rx, ry, c) {
    cx = Math.round(cx); cy = Math.round(cy);
    ctx.fillStyle = c;
    for (let dy = -ry; dy <= ry; dy++) {
      const k = 1 - (dy * dy) / (ry * ry);
      if (k <= 0) continue;
      const dx = Math.round(rx * Math.sqrt(k));
      ctx.fillRect(cx - dx, cy + dy, dx * 2 + 1, 1);
    }
  },

  /** 棋盘点阵抖动填充 —— 像素画质感的关键 */
  dither(ctx, x, y, w, h, c, alpha = 0.5) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = c;
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        if (((i + j) & 1) === 0) ctx.fillRect(x + i, y + j, 1, 1);
      }
    }
    ctx.globalAlpha = 1;
  },

  /** 斜线抖动（用于渐变过渡） */
  ditherDiag(ctx, x, y, w, h, c, alpha = 0.4) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = c;
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        if ((i & 1) === 0) ctx.fillRect(x + i, y + j, 1, 1);
      }
    }
    ctx.globalAlpha = 1;
  },

  /** 发光（径向渐变，用于灯光） */
  glow(ctx, cx, cy, radius, color, alpha = 1) {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  /** 影子（柔和椭圆） */
  shadow(ctx, cx, cy, rx, ry, alpha = 0.25) {
    ctx.save();
    ctx.globalAlpha = alpha;
    P.ellipse(ctx, cx, cy, rx, ry, '#2a1a12');
    ctx.restore();
  },

  /** 文字（像素风格用小字号 + 无抗锯齿） */
  text(ctx, str, x, y, color, size = 10, align = 'left', font = 'sans-serif') {
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = `${size}px ${font}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'top';
    ctx.fillText(str, Math.round(x), Math.round(y));
    ctx.restore();
  },
};

/* -------- 颜色工具 -------- */
function mix(c1, c2, t) {
  const p = (c) => {
    c = c.replace('#', '');
    if (c.length === 3) c = c.split('').map((x) => x + x).join('');
    return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
  };
  const a = p(c1), b = p(c2);
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

function shade(c, amount) {
  // amount > 0 提亮, < 0 压暗
  return amount >= 0 ? mix(c, '#ffffff', amount) : mix(c, '#1a0f0a', -amount);
}

/** 创建离屏画布 */
function mkCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  return { canvas: c, ctx: x };
}
