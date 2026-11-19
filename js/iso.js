/* ============================================================
 *  iso.js — 等距（isometric）投影工具
 *  参考图2 的房间是 45° 斜俯视，靠这套投影才能做出那种立体感
 *
 *  格坐标 (gx, gy) → 屏幕坐标
 *  格 (gx,gy) 的「左上角」映射到屏幕，一个格子占 TW×TH 的菱形
 * ============================================================ */

const ISO = {
  TW: 48,        // 菱形宽
  TH: 24,        // 菱形高
  OX: 240,       // 屏幕原点（格 0,0 的上顶点）
  OY: 74,
};

/** 格坐标 → 屏幕坐标 */
function iso(gx, gy) {
  return {
    x: ISO.OX + (gx - gy) * (ISO.TW / 2),
    y: ISO.OY + (gx + gy) * (ISO.TH / 2),
  };
}

/** 屏幕坐标 → 格坐标（浮点） */
function unIso(sx, sy) {
  const dx = sx - ISO.OX;
  const dy = sy - ISO.OY;
  const hw = ISO.TW / 2, hh = ISO.TH / 2;
  return {
    gx: (dx / hw + dy / hh) / 2,
    gy: (dy / hh - dx / hw) / 2,
  };
}

/* ============================================================
 *  多边形扫描线填充（硬边，无抗锯齿）
 *  pts: [{x,y}, ...]
 * ============================================================ */
function polyFill(ctx, pts, color) {
  let minY = Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  minY = Math.floor(minY);
  maxY = Math.ceil(maxY);
  if (maxY - minY > 4000) return;

  ctx.fillStyle = color;
  for (let y = minY; y <= maxY; y++) {
    const xs = [];
    const py = y + 0.5;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      if ((a.y <= py && b.y > py) || (b.y <= py && a.y > py)) {
        xs.push(a.x + ((py - a.y) / (b.y - a.y)) * (b.x - a.x));
      }
    }
    xs.sort((p, q) => p - q);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const x0 = Math.round(xs[i]);
      const x1 = Math.round(xs[i + 1]);
      if (x1 > x0) ctx.fillRect(x0, y, x1 - x0, 1);
    }
  }
}

/** 多边形描边（1px，用四邻域像素点，避免斜线糊） */
function polyStroke(ctx, pts, color) {
  ctx.fillStyle = color;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    let x0 = Math.round(a.x), y0 = Math.round(a.y);
    const x1 = Math.round(b.x), y1 = Math.round(b.y);
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let guard = 0;
    while (guard++ < 2000) {
      ctx.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
    }
  }
}

/* ============================================================
 *  地板菱形（单格）
 * ============================================================ */
function isoDiamond(ctx, gx, gy, color) {
  const p0 = iso(gx, gy);
  const p1 = iso(gx + 1, gy);
  const p2 = iso(gx + 1, gy + 1);
  const p3 = iso(gx, gy + 1);
  polyFill(ctx, [p0, p1, p2, p3], color);
}

/* ============================================================
 *  等距盒子（柱体）
 *  gx,gy  底面起始格（占 w×d 格）
 *  h      高度（像素）
 *
 *  格点映射：iso(gx,gy) 是菱形的「上顶点」
 *    顶面四顶点（抬升 h）：
 *      t0 = iso(gx,   gy)    上
 *      t1 = iso(gx+w, gy)    右
 *      t2 = iso(gx+w, gy+d)  下（最靠近观察者）
 *      t3 = iso(gx,   gy+d)  左
 *    可见的两个侧面：
 *      右前 = t1,t2,b2,b1
 *      左前 = t3,t2,b2,b3
 * ============================================================ */
function isoBox(ctx, gx, gy, w, d, h, colors) {
  const top = colors.top;
  const left = colors.left || top;
  const right = colors.right || top;

  const p0 = iso(gx, gy);
  const p1 = iso(gx + w, gy);
  const p2 = iso(gx + w, gy + d);
  const p3 = iso(gx, gy + d);

  const t0 = { x: p0.x, y: p0.y - h };
  const t1 = { x: p1.x, y: p1.y - h };
  const t2 = { x: p2.x, y: p2.y - h };
  const t3 = { x: p3.x, y: p3.y - h };

  const b1 = p1, b2 = p2, b3 = p3;

  // 右前面（法线朝 -gy）
  polyFill(ctx, [t1, t2, b2, b1], right);
  // 左前面（法线朝 -gx）
  polyFill(ctx, [t3, t2, b2, b3], left);
  // 顶面
  polyFill(ctx, [t0, t1, t2, t3], top);

  if (colors.edge) {
    polyStroke(ctx, [t1, t2, b2, b1], colors.edge);
    polyStroke(ctx, [t3, t2, b2, b3], colors.edge);
    polyStroke(ctx, [t0, t1, t2, t3], colors.edge);
  }
  return { t0, t1, t2, t3, b1, b2, b3 };
}

/* ============================================================
 *  等距墙面（沿一条地板边缘向上延伸）
 *  axis: 'x' 表示墙面沿 gx 方向（即 gy 固定），反之亦然
 *  返回顶面四角，便于往上贴装饰
 * ============================================================ */
function isoWall(ctx, gx0, gy0, gx1, gy1, h, color, topColor) {
  const b0 = iso(gx0, gy0);
  const b1 = iso(gx1, gy1);
  const t0 = { x: b0.x, y: b0.y - h };
  const t1 = { x: b1.x, y: b1.y - h };

  polyFill(ctx, [t0, t1, b1, b0], color);
  if (topColor) {
    // 墙顶厚度（1~2px 亮边）
    polyFill(ctx, [
      { x: t0.x, y: t0.y }, { x: t1.x, y: t1.y },
      { x: t1.x, y: t1.y + 2 }, { x: t0.x, y: t0.y + 2 },
    ], topColor);
  }
  return { t0, t1, b0, b1 };
}

/* ============================================================
 *  等距文字/贴图定位辅助：把「墙面上的矩形区域」映射过去
 *  用于窗户、挂画等
 * ============================================================ */
function isoWallRect(ctx, gx0, gy0, gx1, gy1, h, yTop, yBot, color) {
  const b0 = iso(gx0, gy0);
  const b1 = iso(gx1, gy1);
  polyFill(ctx, [
    { x: b0.x, y: b0.y - yTop }, { x: b1.x, y: b1.y - yTop },
    { x: b1.x, y: b1.y - yBot }, { x: b0.x, y: b0.y - yBot },
  ], color);
}
