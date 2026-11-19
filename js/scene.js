/* ============================================================
 *  scene.js — 等距房间正式版
 *  参考图2：45° 斜俯视的小屋，暖木地板、粉紫软装、中央蛋糕
 * ============================================================ */

const PAL = {
  // 地板（木）
  floorA:   '#d5a878',
  floorB:   '#cf9f6d',
  floorSeam:'#b8874f',
  floorHi:  '#e3bd93',

  // 墙
  wallL:    '#f2ddc6',   // 左墙（偏暗）
  wallR:    '#f7e6d2',   // 后墙（偏亮）
  wallTop:  '#c9a47c',
  wallTrim: '#e5c9ac',
  skirtL:   '#c79c74',
  skirtR:   '#d2aa82',

  // 木器
  woodTop:  '#cf9659',
  woodTopHi:'#e0ad72',
  woodL:    '#a8703f',
  woodR:    '#b87c48',
  woodEdge: '#6b4526',

  // 软装
  cream:    '#fdf6ec',
  creamLo:  '#ecdfcd',
  purple:   '#ddc9ec',
  purpleLo: '#c6aede',
  ping:     '#f7b9c9',
  pinkLo:   '#e79aae',
  pinkHi:   '#ffd6e0',
  rug:      '#f5cfda',
  rugHi:    '#fce4ea',

  // 蛋糕
  cake:     '#fff8ef',
  cakePink: '#f9c3d2',
  cakeEdge: '#e8d6c2',
  berry:    '#e8495f',
  berryLo:  '#b92f42',
  leaf:     '#6aa84f',
  candle:   '#ffffff',

  // 夜空
  nightTop: '#26304f',
  nightBot: '#3d4d7a',

  ink:      '#4a2f1c',
  inkSoft:  '#6b4526',
};

const ROOMW = 8;      // gx 方向格数
const ROOMD = 8;      // gy 方向格数
const WALLH = 108;    // 墙高

/* 确定性伪随机（保证每帧一致） */
function h2(a, b) {
  let x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/* ============================================================
 *  地板：沿 gx 方向的长条木板（低对比，绝不能是棋盘）
 * ============================================================ */
function drawFloor(ctx) {
  for (let gy = 0; gy < ROOMD; gy++) {
    // 每条板一整行，色差极小
    const t = h2(gy, 3);
    const base = t > 0.5 ? PAL.floorA : PAL.floorB;
    for (let gx = 0; gx < ROOMW; gx++) {
      isoDiamond(ctx, gx, gy, base);
    }

    // 板与板之间的缝（沿 gx 方向）
    const a = iso(0, gy), b = iso(ROOMW, gy);
    polyStroke(ctx, [a, b], PAL.floorSeam);

    // 板内极淡的木纹（每条 1~2 条短线）
    for (let k = 0; k < 2; k++) {
      const sx = h2(gy, k * 7) * (ROOMW - 1.5);
      const x0 = iso(sx, gy + 0.3), x1 = iso(sx + 1.6, gy + 0.3);
      polyStroke(ctx, [x0, x1], PAL.floorHi);
      const y0b = iso(sx, gy + 0.7), y1b = iso(sx + 1.2, gy + 0.7);
      polyStroke(ctx, [y0b, y1b], 'rgba(160,110,65,0.22)');
    }
  }

  // 地板末端（最前一排）加一条略深的收边
  const e0 = iso(0, ROOMD), e1 = iso(ROOMW, ROOMD);
  polyStroke(ctx, [e0, e1], '#9c6d3c');
}

/* ============================================================
 *  墙
 * ============================================================ */
function drawWalls(ctx) {
  // 后墙（沿 gx，位于 gy=0）
  isoWall(ctx, 0, 0, ROOMW, 0, WALLH, PAL.wallR, PAL.wallTop);
  // 左墙（沿 gy，位于 gx=0）
  isoWall(ctx, 0, 0, 0, ROOMD, WALLH, PAL.wallL, PAL.wallTop);

  // 壁纸竖纹（后墙）
  for (let gx = 0.5; gx < ROOMW; gx += 0.72) {
    const a = iso(gx, 0), b = iso(gx, 0);
    polyStroke(ctx, [{ x: a.x, y: a.y - WALLH + 3 }, { x: b.x, y: b.y - 3 }], 'rgba(200,165,130,0.34)');
  }
  // 壁纸竖纹（左墙）
  for (let gy = 0.5; gy < ROOMD; gy += 0.72) {
    const a = iso(0, gy), b = iso(0, gy);
    polyStroke(ctx, [{ x: a.x, y: a.y - WALLH + 3 }, { x: b.x, y: b.y - 3 }], 'rgba(190,155,120,0.30)');
  }

  // 墙顶亮边（厚度感）
  const w0 = iso(0, 0), w1 = iso(ROOMW, 0), w2 = iso(0, ROOMD);
  polyStroke(ctx, [{ x: w0.x, y: w0.y - WALLH }, { x: w1.x, y: w1.y - WALLH }], '#e8d0b6');
  polyStroke(ctx, [{ x: w0.x, y: w0.y - WALLH }, { x: w2.x, y: w2.y - WALLH }], '#dcc0a2');

  // 踢脚线
  const skH = 7;
  // 后墙
  polyFill(ctx, [
    iso(0, 0), iso(ROOMW, 0),
    { x: iso(ROOMW, 0).x, y: iso(ROOMW, 0).y - skH },
    { x: iso(0, 0).x, y: iso(0, 0).y - skH },
  ], PAL.skirtR);
  // 左墙
  polyFill(ctx, [
    iso(0, 0), iso(0, ROOMD),
    { x: iso(0, ROOMD).x, y: iso(0, ROOMD).y - skH },
    { x: iso(0, 0).x, y: iso(0, 0).y - skH },
  ], PAL.skirtL);
  // 踢脚线上沿亮线
  polyStroke(ctx, [
    { x: iso(0, 0).x, y: iso(0, 0).y - skH },
    { x: iso(ROOMW, 0).x, y: iso(ROOMW, 0).y - skH },
  ], '#e9cfb2');
  polyStroke(ctx, [
    { x: iso(0, 0).x, y: iso(0, 0).y - skH },
    { x: iso(0, ROOMD).x, y: iso(0, ROOMD).y - skH },
  ], '#dfc0a0');
}

/* ============================================================
 *  后墙上的窗户（夜空）
 * ============================================================ */
function drawWindow(ctx, t) {
  const gx0 = 2.6, gx1 = 5.4;
  const yTop = 88, yBot = 40;      // 距地板高度

  const b0 = iso(gx0, 0), b1 = iso(gx1, 0);
  const P0 = { x: b0.x, y: b0.y - yTop };
  const P1 = { x: b1.x, y: b1.y - yTop };
  const P2 = { x: b1.x, y: b1.y - yBot };
  const P3 = { x: b0.x, y: b0.y - yBot };

  // 外框
  polyFill(ctx, [
    { x: P0.x - 1, y: P0.y - 3 }, { x: P1.x + 1, y: P1.y - 3 },
    { x: P2.x + 1, y: P2.y + 3 }, { x: P3.x - 1, y: P3.y + 3 },
  ], '#e8d3bb');

  // 夜空渐变（沿窗口高度逐行）
  const topY = Math.min(P0.y, P1.y), botY = Math.max(P2.y, P3.y);
  const rows = Math.ceil((botY - topY) / 1);
  for (let i = 0; i < rows; i++) {
    const tt = i / Math.max(1, rows);
    const col = mix(PAL.nightTop, PAL.nightBot, Math.pow(tt, 0.85));
    polyFill(ctx, [
      { x: P0.x, y: P0.y + i }, { x: P1.x, y: P1.y + i },
      { x: P1.x, y: P1.y + i + 1 }, { x: P0.x, y: P0.y + i + 1 },
    ].filter(p => p.y <= botY), col);
  }

  // 月亮
  const mx = (P0.x + P1.x) / 2 + 22;
  const my = (P0.y + P1.y) / 2 - 8;
  P.circle(ctx, mx, my, 7, '#fdf3d0');
  P.circle(ctx, mx + 3, my - 1, 6, mix(PAL.nightTop, PAL.nightBot, 0.3));
  P.glow(ctx, mx, my, 22, 'rgba(255,240,190,0.5)');

  // 星星
  for (let i = 0; i < 16; i++) {
    const sx = Math.min(P0.x, P1.x) + 6 + h2(i, 1) * (Math.abs(P1.x - P0.x) - 12);
    const sy = topY + 5 + h2(i, 2) * (botY - topY - 12);
    const tw = 0.5 + 0.5 * Math.sin(t * 2 + i * 1.7);
    ctx.globalAlpha = tw;
    P.r(ctx, sx, sy, 1, 1, '#fff8dc');
    ctx.globalAlpha = 1;
  }

  // 窗棂（十字）
  const midX = (P0.x + P1.x) / 2;
  polyStroke(ctx, [
    { x: midX, y: P0.y }, { x: midX, y: P2.y },
  ], '#e0cbb0');
  const midY = (P0.y + P2.y) / 2;
  polyStroke(ctx, [
    { x: P0.x, y: midY }, { x: P1.x, y: midY },
  ], '#e0cbb0');

  // 窗框描边
  polyStroke(ctx, [P0, P1, P2, P3], '#c9a888');

  // 窗台
  polyFill(ctx, [
    { x: P3.x - 3, y: P3.y }, { x: P2.x + 3, y: P2.y },
    { x: P2.x + 3, y: P2.y + 3 }, { x: P3.x - 3, y: P3.y + 3 },
  ], '#dcbfa0');

  // 窗帘（两侧，像素竖褶）
  drawCurtain(ctx, P0, P3, -1);
  drawCurtain(ctx, P1, P2, 1);
}

function drawCurtain(ctx, pt, pb, dir) {
  const w = 9;
  for (let i = 0; i < w; i++) {
    const c = i % 3 === 0 ? '#e79fb2' : i % 3 === 1 ? '#f6c3d1' : '#ffd9e3';
    const x0 = pt.x + dir * i;
    polyFill(ctx, [
      { x: x0, y: pt.y - 2 },
      { x: x0, y: pb.y + 2 },
      { x: x0 + 1, y: pb.y + 2 },
      { x: x0 + 1, y: pt.y - 2 },
    ], c);
  }
}

/* ============================================================
 *  左侧墙上的挂画
 * ============================================================ */
function drawWallArt(ctx) {
  // 左墙（沿 gy）挂两幅画
  const arts = [
    { g0: 1.4, g1: 2.6, yT: 78, yB: 52, c1: '#f7d9e2', c2: '#cf9fb8' },
    { g0: 3.2, g1: 4.2, yT: 72, yB: 50, c1: '#dfe8f5', c2: '#9db4d6' },
  ];
  arts.forEach(a => {
    const b0 = iso(0, a.g0), b1 = iso(0, a.g1);
    const q = [
      { x: b0.x, y: b0.y - a.yT }, { x: b1.x, y: b1.y - a.yT },
      { x: b1.x, y: b1.y - a.yB }, { x: b0.x, y: b0.y - a.yB },
    ];
    // 外框
    polyFill(ctx, [
      { x: q[0].x - 1, y: q[0].y - 2 }, { x: q[1].x + 1, y: q[1].y - 2 },
      { x: q[2].x + 1, y: q[2].y + 2 }, { x: q[3].x - 1, y: q[3].y + 2 },
    ], '#fdf6ee');
    polyFill(ctx, q, a.c1);
    polyStroke(ctx, q, '#c9a888');
    // 画中的小风景
    polyFill(ctx, [
      { x: q[3].x, y: q[3].y - 4 }, { x: q[2].x, y: q[2].y - 4 },
      { x: q[2].x, y: q[2].y }, { x: q[3].x, y: q[3].y },
    ], a.c2);
    // 太阳/月亮
    P.circle(ctx, (q[0].x + q[1].x) / 2 + 3, q[0].y + 6, 2, '#fff3d0');
  });
}

/* ============================================================
 *  灯串（后墙上方，沿墙抛物下垂）
 * ============================================================ */
function drawStringLights(ctx, t) {
  const yH = WALLH - 14;
  const steps = 46;
  for (let i = 0; i < steps; i++) {
    const u = i / (steps - 1);
    const gx = u * ROOMW;
    const p = iso(gx, 0);
    const sag = Math.sin(u * Math.PI) * 9;
    const y = p.y - yH + sag;
    P.r(ctx, p.x, y, 1, 1, '#7a5b3d');

    if (i % 6 === 2) {
      const tw = 0.6 + 0.4 * Math.sin(t * 2.2 + i * 0.7);
      P.r(ctx, p.x - 1, y + 1, 2, 2, '#fff0c4');
      ctx.globalAlpha = tw * 0.5;
      P.glow(ctx, p.x, y + 2, 10, 'rgba(255,225,150,0.9)');
      ctx.globalAlpha = 1;
    }
  }
}

/* ============================================================
 *  家具：床（左后）
 * ============================================================ */
function drawBed(ctx) {
  const gx = 0.3, gy = 0.7, w = 2.5, d = 3.2;

  // 床体（矮一点，别把墙挡住）
  const box = isoBox(ctx, gx, gy, w, d, 7, {
    top: PAL.cream, left: PAL.woodL, right: PAL.woodR, edge: PAL.woodEdge,
  });

  // 床垫顶面再叠一层（被子）
  const qIn = 0.16;
  const m0 = iso(gx + qIn, gy + qIn + 0.55);
  const m1 = iso(gx + w - qIn, gy + qIn + 0.55);
  const m2 = iso(gx + w - qIn, gy + d - qIn);
  const m3 = iso(gx + qIn, gy + d - qIn);
  const lift = 9;
  const q = [
    { x: m0.x, y: m0.y - lift }, { x: m1.x, y: m1.y - lift },
    { x: m2.x, y: m2.y - lift }, { x: m3.x, y: m3.y - lift },
  ];
  polyFill(ctx, q, PAL.purple);

  // 格子纹
  for (let k = 1; k < 5; k++) {
    const u = k / 5;
    const a0 = lerpPt(m0, m3, u), a1 = lerpPt(m1, m2, u);
    polyStroke(ctx, [{ x: a0.x, y: a0.y - lift }, { x: a1.x, y: a1.y - lift }], PAL.purpleLo);
    const b0 = lerpPt(m0, m1, u), b1 = lerpPt(m3, m2, u);
    polyStroke(ctx, [{ x: b0.x, y: b0.y - lift }, { x: b1.x, y: b1.y - lift }], PAL.purpleLo);
  }

  // 枕头
  for (let k = 0; k < 2; k++) {
    const px = gx + 0.28 + k * 1.05;
    const p0 = iso(px, gy + 0.24), p1 = iso(px + 0.85, gy + 0.24);
    const p2 = iso(px + 0.85, gy + 0.95), p3 = iso(px, gy + 0.95);
    const pl = lift + 3;
    const pp = [
      { x: p0.x, y: p0.y - pl }, { x: p1.x, y: p1.y - pl },
      { x: p2.x, y: p2.y - pl }, { x: p3.x, y: p3.y - pl },
    ];
    polyFill(ctx, pp, '#fffaf2');
    polyStroke(ctx, pp, '#e9dac8');
  }

  // 被子翻边
  const f0 = iso(gx + 0.08, gy + d - 0.6);
  const f1 = iso(gx + w - 0.08, gy + d - 0.6);
  const f2 = iso(gx + w - 0.08, gy + d - 0.08);
  const f3 = iso(gx + 0.08, gy + d - 0.08);
  polyFill(ctx, [
    { x: f0.x, y: f0.y - lift }, { x: f1.x, y: f1.y - lift },
    { x: f2.x, y: f2.y - lift }, { x: f3.x, y: f3.y - lift },
  ], '#f8f2ff');

  // 床头灯（床尾侧）
  const lp = iso(gx - 0.15, gy + d + 0.35);
  P.ellipse(ctx, lp.x, lp.y + 1, 4, 2, '#8e5f39');
  P.r(ctx, lp.x - 2, lp.y - 10, 4, 10, '#ffe1a0');
  P.r(ctx, lp.x - 2, lp.y - 10, 4, 1, '#fff5da');
  P.glow(ctx, lp.x, lp.y - 6, 22, 'rgba(255,215,140,0.45)');
}

/* ============================================================
 *  家具：书桌 + 书架（右后）
 * ============================================================ */
function drawDesk(ctx) {
  const gx = 6.0, gy = 0.3, w = 2.7, d = 1.5;

  // 桌面
  isoBox(ctx, gx, gy, w, d, 12, {
    top: PAL.woodTop, left: PAL.woodL, right: PAL.woodR, edge: PAL.woodEdge,
  });

  // 桌面高光（沿边缘一条亮线）
  const a = iso(gx + 0.1, gy + 0.1), b = iso(gx + w - 0.1, gy + 0.1);
  polyStroke(ctx, [{ x: a.x, y: a.y - 12 }, { x: b.x, y: b.y - 12 }], PAL.woodTopHi);

  // 桌上的小物：笔记本、杯子、台灯
  const cpos = iso(gx + 1.4, gy + 0.7);
  // 笔记本
  polyFill(ctx, [
    { x: cpos.x - 6, y: cpos.y - 14 }, { x: cpos.x + 2, y: cpos.y - 18 },
    { x: cpos.x + 7, y: cpos.y - 15 }, { x: cpos.x - 1, y: cpos.y - 11 },
  ], '#e7e2ee');
  polyStroke(ctx, [
    { x: cpos.x - 6, y: cpos.y - 14 }, { x: cpos.x + 2, y: cpos.y - 18 },
    { x: cpos.x + 7, y: cpos.y - 15 }, { x: cpos.x - 1, y: cpos.y - 11 },
  ], '#b6adc4');

  // 台灯（简化：杆 + 灯罩 + 光晕）
  const lx = iso(gx + 0.55, gy + 0.5);
  P.r(ctx, lx.x, lx.y - 26, 1, 14, '#8d7a63');
  P.r(ctx, lx.x - 2, lx.y - 12, 5, 2, '#8d7a63');
  polyFill(ctx, [
    { x: lx.x - 5, y: lx.y - 27 }, { x: lx.x + 5, y: lx.y - 27 },
    { x: lx.x + 3, y: lx.y - 34 }, { x: lx.x - 3, y: lx.y - 34 },
  ], '#ffe1a0');
  P.glow(ctx, lx.x, lx.y - 24, 26, 'rgba(255,205,130,0.4)');

  // 椅子（桌前方）
  const ch = iso(gx + 1.1, gy + 1.9);
  isoBox(ctx, gx + 1.1, gy + 1.9, 0.9, 0.9, 7, {
    top: '#ddb7c1', left: '#b98a95', right: '#c797a2', edge: '#7a5058',
  });
  // 椅背
  isoBox(ctx, gx + 1.1, gy + 2.7, 0.9, 0.16, 15, {
    top: '#e8cbd3', left: '#c79aa5', right: '#d3a5b0', edge: '#7a5058',
  });

  // 书架（贴后墙，桌上）
  drawShelf(ctx, gx + 0.2, gy + 0.1, 2.3);
}

function drawShelf(ctx, gx, gy, w) {
  const yH = 34;   // 距地板
  const a0 = iso(gx, gy), a1 = iso(gx + w, gy);

  // 书架背板 + 层板
  const tiers = 3;
  for (let i = 0; i < tiers; i++) {
    const yb = yH + i * 11;
    polyFill(ctx, [
      { x: a0.x, y: a0.y - yb - 9 }, { x: a1.x, y: a1.y - yb - 9 },
      { x: a1.x, y: a1.y - yb }, { x: a0.x, y: a0.y - yb },
    ], '#e8dccd');
    // 层板
    polyFill(ctx, [
      { x: a0.x, y: a0.y - yb }, { x: a1.x, y: a1.y - yb },
      { x: a1.x, y: a1.y - yb + 2 }, { x: a0.x, y: a0.y - yb + 2 },
    ], PAL.woodL);
  }

  // 书（每层几本，颜色不同）
  const cols = ['#e9a0b4', '#a8c4e2', '#e8d49a', '#b0d9c0', '#d9b8e0', '#f0c9a0'];
  for (let i = 0; i < tiers; i++) {
    const yb = yH + i * 11;
    let cursor = 0.12;
    let ci = i * 2;
    while (cursor < w - 0.25) {
      const bw = 0.14 + h2(i, cursor * 10) * 0.06;
      const bh = 5 + Math.floor(h2(ci, i) * 3);
      const bx0 = iso(gx + cursor, gy + 0.06), bx1 = iso(gx + cursor + bw, gy + 0.06);
      const col = cols[ci % cols.length];
      polyFill(ctx, [
        { x: bx0.x, y: bx0.y - yb - 1 }, { x: bx1.x, y: bx1.y - yb - 1 },
        { x: bx1.x, y: bx1.y - yb - 1 - bh }, { x: bx0.x, y: bx0.y - yb - 1 - bh },
      ], col);
      cursor += bw + 0.05;
      ci++;
    }
  }
  // 书架外框
  const b0 = iso(gx, gy), b1 = iso(gx + w, gy);
  polyStroke(ctx, [
    { x: b0.x, y: b0.y - yH }, { x: b1.x, y: b1.y - yH },
    { x: b1.x, y: b1.y - yH - 33 }, { x: b0.x, y: b0.y - yH - 33 },
    { x: b0.x, y: b0.y - yH },
  ], PAL.woodEdge);
}

/* ============================================================
 *  家具：中央圆桌（放蛋糕）
 * ============================================================ */
const TABLE_ISO = { gx: 3.6, gy: 3.6, w: 1.2, d: 1.2 };

/* 桌面中心屏幕坐标（蛋糕 / 深度排序用） */
function tableTopCenter() {
  const { gx, gy, w, d } = TABLE_ISO;
  const p = iso(gx + w / 2, gy + d / 2);
  return { x: p.x, y: p.y };
}

function drawTable(ctx) {
  const { gx, gy, w, d } = TABLE_ISO;
  const H = 24;                       // 桌面离地高度
  const c = iso(gx + w / 2, gy + d / 2);

  // 影子
  P.ellipse(ctx, c.x, c.y + 2, 32, 11, 'rgba(60,35,20,0.16)');

  // ---- 四条腿（细，2px）----
  const legs = [
    [gx + 0.14, gy + 0.14],
    [gx + w - 0.14, gy + 0.14],
    [gx + 0.14, gy + d - 0.14],
    [gx + w - 0.14, gy + d - 0.14],
  ];
  legs.forEach(([lx, ly], i) => {
    const p = iso(lx, ly);
    const col = i >= 2 ? PAL.woodL : '#7d4c22';
    P.r(ctx, p.x - 1, p.y - H + 3, 2, H - 3, col);
    P.r(ctx, p.x - 1, p.y - H + 3, 1, H - 3, PAL.woodR);
  });

  // ---- 桌面：椭圆盘（等距圆）----
  const ty = c.y - H;
  P.ellipse(ctx, c.x, ty + 3, 30, 11, '#7d4c22');   // 下沿厚度
  P.ellipse(ctx, c.x, ty + 2, 29, 10, '#96612f');
  P.ellipse(ctx, c.x, ty, 29, 10, PAL.woodTop);      // 桌面
  P.ellipse(ctx, c.x, ty - 1, 26, 8, PAL.woodTopHi); // 高光区

  // 木纹（两条同心弧）
  ctx.save();
  ctx.globalAlpha = 0.14;
  ctx.strokeStyle = '#a3682f';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(c.x, ty, 20, 6.5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(c.x, ty, 11, 3.5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // 桌沿亮线
  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = PAL.woodTopHi;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(c.x, ty - 1, 28, 9.5, 0, Math.PI * 1.05, Math.PI * 1.95);
  ctx.stroke();
  ctx.restore();

  // 桌上小物：小盘 + 叉子
  P.ellipse(ctx, c.x + 20, ty + 1, 6, 2, '#efe6da');
  P.ellipse(ctx, c.x + 20, ty, 5, 2, '#fdf8f1');
  P.r(ctx, c.x - 26, ty + 1, 9, 1, '#d8cec2');

  // 蛋糕
  drawCakeISO(ctx, c.x, ty - 2);
}

/* ============================================================
 *  蛋糕（等距视角：上下两种椭圆 + 侧面）
 * ============================================================ */
const CAKE = { lit: false, out: false, level: 0 };

function drawCakeISO(ctx, cx, baseY) {
  // 盘
  P.ellipse(ctx, cx, baseY + 1, 19, 6, '#ded3c4');
  P.ellipse(ctx, cx, baseY, 19, 6, '#fdf8f1');
  P.ellipse(ctx, cx, baseY - 1, 15, 4, '#f1e7d9');

  // 下层：侧面 9px
  const b1h = 9;
  const r1x = 17, r1y = 5;
  drawCakeLayer(ctx, cx, baseY - 2, r1x, r1y, b1h, PAL.cake, PAL.cakePink);

  // 中层
  const b2y = baseY - 2 - b1h - 1;
  drawCakeLayer(ctx, cx, b2y, 13, 4, 8, PAL.cake, PAL.cakePink);

  // 上层
  const b3y = b2y - 8 - 1;
  drawCakeLayer(ctx, cx, b3y, 9, 3, 6, PAL.cake, PAL.cakePink);

  // 顶面
  P.ellipse(ctx, cx, b3y - 2, 9, 3, '#fffdf8');
  P.ellipse(ctx, cx, b3y - 2, 8, 2, '#fbd5e0');
  P.ellipse(ctx, cx, b3y - 3, 5, 2, '#fde8ef');

  // 草莓（顶面上一圈）
  const berries = [[-6, 0], [-2, -1], [3, -1], [6, 0], [0, 1]];
  berries.forEach(([dx, dy]) => {
    const sx = cx + dx, sy = b3y - 3 + dy;
    P.r(ctx, sx - 1, sy - 1, 3, 3, PAL.berry);
    P.r(ctx, sx - 1, sy + 1, 3, 1, PAL.berryLo);
    P.r(ctx, sx - 1, sy - 2, 3, 1, PAL.leaf);
    P.r(ctx, sx, sy - 1, 1, 1, '#ffb8c2');
  });

  // 蜡烛
  const candles = [[-5, 0], [0, 1], [5, 0]];
  candles.forEach(([dx, dy], i) => {
    const cxp = cx + dx, cyp = b3y - 4 + dy;
    P.r(ctx, cxp, cyp - 9, 2, 9, PAL.candle);
    P.r(ctx, cxp, cyp - 7, 2, 1, PAL.cakePink);
    P.r(ctx, cxp, cyp - 4, 2, 1, PAL.cakePink);
    P.r(ctx, cxp, cyp - 10, 1, 1, '#5a4a42');

    if (CAKE.lit) {
      const fl = 0.6 + 0.4 * Math.sin(performance.now() / 130 + i * 2.1);
      const fh = Math.round(3 + fl * 3);
      P.r(ctx, cxp, cyp - 10 - fh, 2, fh, '#ffab3d');
      P.r(ctx, cxp, cyp - 9 - fh + 1, 1, Math.max(1, fh - 1), '#fff3c0');
      ctx.globalAlpha = 0.4 * CAKE.level;
      P.glow(ctx, cxp + 1, cyp - 11 - fh / 2, 20 * CAKE.level, 'rgba(255,190,110,1)');
      ctx.globalAlpha = 1;
    } else if (CAKE.out) {
      const ph = (performance.now() / 900 + i * 0.3) % 1;
      ctx.globalAlpha = (1 - ph) * 0.5;
      P.r(ctx, cxp + Math.round(Math.sin(ph * 7) * 2), cyp - 11 - ph * 9, 1, 3, '#cbc1b9');
      ctx.globalAlpha = 1;
    }
  });
}

function drawCakeLayer(ctx, cx, topY, rx, ry, h, body, pink) {
  // 侧面（矩形，底部是椭圆弧）
  P.r(ctx, cx - rx, topY, rx * 2, h, body);
  // 侧面底部弧（让底部圆润）
  P.ellipse(ctx, cx, topY + h, rx, ry, body);
  // 侧面暗部
  ctx.globalAlpha = 0.16;
  P.r(ctx, cx + rx - 5, topY, 5, h, '#8a6a4a');
  ctx.globalAlpha = 1;
  // 侧面高光
  ctx.globalAlpha = 0.5;
  P.r(ctx, cx - rx + 1, topY + 1, 2, h - 2, '#ffffff');
  ctx.globalAlpha = 1;

  // 粉色淋面：顶面椭圆 + 往下流淌
  P.ellipse(ctx, cx, topY, rx, ry, pink);
  P.ellipse(ctx, cx, topY - 1, rx - 1, ry - 1, '#fdd9e3');
  // 流淌
  for (let i = -rx + 2; i < rx - 1; i += 5) {
    const len = 2 + Math.round(h2(i, topY) * 3);
    P.r(ctx, cx + i, topY + 1, 2, len, pink);
  }
}

/* ============================================================
 *  地毯（中央圆形）
 * ============================================================ */
function drawRug(ctx) {
  const c = iso(4.5, 4.5);
  const cy = c.y + 4;

  // 底色（等距压扁的椭圆）
  P.ellipse(ctx, c.x, cy, 62, 31, PAL.rug);
  P.ellipse(ctx, c.x, cy - 1, 60, 30, PAL.rugHi);

  // 边缘一圈
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = '#d99cb0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(c.x, cy, 62, 31, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // 内圈白
  P.ellipse(ctx, c.x, cy, 40, 20, '#fff5f8');

  // 格子纹（沿等距方向）
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(c.x, cy, 60, 30, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.globalAlpha = 0.12;
  for (let i = -70; i < 70; i += 12) {
    P.r(ctx, c.x + i, cy - 32, 1, 64, '#d99cb0');
    P.r(ctx, c.x - 64, cy + i * 0.5, 128, 1, '#d99cb0');
  }
  ctx.restore();
}

/* ============================================================
 *  植物 / 落地镜 / 唱片柜（点缀）
 * ============================================================ */
function drawPlant(ctx, gx, gy, s = 1) {
  const p = iso(gx, gy);
  // 花盆
  P.ellipse(ctx, p.x, p.y + 1, 7 * s, 3 * s, '#a86a4a');
  P.r(ctx, p.x - 6 * s, p.y - 6 * s, 12 * s, 7 * s, '#cf8a68');
  P.ellipse(ctx, p.x, p.y - 6 * s, 6 * s, 2.5 * s, '#e0a181');
  // 叶子
  const leaves = [[-5, -14], [0, -18], [5, -14], [-3, -20], [4, -20]];
  leaves.forEach(([dx, dy], i) => {
    const col = i % 2 ? '#7fb069' : '#91c47a';
    P.ellipse(ctx, p.x + dx * s, p.y + dy * s, 4 * s, 3 * s, col);
  });
  P.ellipse(ctx, p.x, p.y - 16 * s, 3 * s, 3 * s, '#a8d898');
}

function drawMirror(ctx) {
  const gx = 8.3, gy = 3.2;
  const b0 = iso(gx, gy), b1 = iso(gx + 0.3, gy + 1.6);
  // 镜框（站立的长方）
  polyFill(ctx, [
    { x: b0.x, y: b0.y - 46 }, { x: b0.x + 12, y: b0.y - 52 },
    { x: b0.x + 12, y: b0.y - 4 }, { x: b0.x, y: b0.y + 2 },
  ], '#d9b78f');
  // 镜面
  polyFill(ctx, [
    { x: b0.x + 2, y: b0.y - 44 }, { x: b0.x + 10, y: b0.y - 49 },
    { x: b0.x + 10, y: b0.y - 6 }, { x: b0.x + 2, y: b0.y - 1 },
  ], '#d4e4ee');
  // 反光
  ctx.save();
  ctx.globalAlpha = 0.55;
  polyFill(ctx, [
    { x: b0.x + 3, y: b0.y - 34 }, { x: b0.x + 9, y: b0.y - 38 },
    { x: b0.x + 9, y: b0.y - 26 }, { x: b0.x + 3, y: b0.y - 22 },
  ], '#ffffff');
  ctx.restore();
}

function drawVinyl(ctx, t) {
  const gx = 0.55, gy = 4.6;
  // 矮柜
  isoBox(ctx, gx, gy, 1.5, 1.0, 11, {
    top: PAL.woodTop, left: PAL.woodL, right: PAL.woodR, edge: PAL.woodEdge,
  });
  // 唱片机
  const p = iso(gx + 0.7, gy + 0.5);
  const ty = p.y - 11;
  P.ellipse(ctx, p.x, ty, 7, 3, '#3b3038');
  P.ellipse(ctx, p.x, ty - 1, 6, 2, '#5a4a55');
  P.r(ctx, p.x - 4, ty - 3, 5, 3, '#2b2429');
  P.r(ctx, p.x + 27 - 25, ty - 4, 4, 1, '#c9bda8');
  // 音符
  if (Math.sin(t * 1.2) > 0.3) {
    ctx.globalAlpha = 0.55 * (0.6 + 0.4 * Math.sin(t * 2));
    P.r(ctx, p.x + 9, ty - 18 - Math.round((t * 5) % 8), 1, 3, '#f7c9d8');
    P.r(ctx, p.x + 10, ty - 19 - Math.round((t * 5) % 8), 2, 1, '#f7c9d8');
    ctx.globalAlpha = 1;
  }
}

/* ============================================================
 *  氛围光 + 暗角
 * ============================================================ */
function drawAmbience(ctx, t) {
  const breath = 0.05 + 0.015 * Math.sin(t * 0.8);
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = `rgba(255,180,110,${breath})`;
  ctx.fillRect(0, 0, LOGIC_W, LOGIC_H);
  ctx.restore();

  // 台灯光晕
  const lp = iso(6.55, 0.8);
  P.glow(ctx, lp.x, lp.y - 30, 46, 'rgba(255,200,120,0.15)');
  // 窗口冷光
  P.glow(ctx, 240, 70, 70, 'rgba(120,150,255,0.06)');

  // 暗角
  const vg = ctx.createRadialGradient(240, 140, 90, 240, 140, 260);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(40,20,35,0.45)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, LOGIC_W, LOGIC_H);
}

/* ---------- 小工具 ---------- */
function lerpPt(a, b, u) {
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
}
