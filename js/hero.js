/* ============================================================
 *  hero.js — 角色绘制（2026-11-19 换新素材）
 *
 *  素材（全部 62px 高，脚底对齐，每帧等宽 slot）：
 *    assets/hero_stand.png   待机站立 4 方向  33x62（down/left/up/right 横排）
 *    assets/hero_walk_s.png  朝下 9 帧        36x62（2026-11-19 换新）
 *    assets/hero_walk_u.png  朝上 9 帧        36x62（2026-11-19 新增）
 *    assets/hero_walk_l.png  朝左 9 帧        37x62
 *    assets/hero_walk_r.png  朝右 9 帧        38x62
 *
 *  生成脚本 _mk_hero2.py：alpha>=128 求 bbox → clean_edges 去毛边 →
 *  LANCZOS 缩到 84 高 → 二值化 → 48 色量化 → 脚底对齐横排。
 *  走路 9 帧用同一 scale（按最高帧定），所以下蹲帧自然矮几像素。
 *
 *  9 帧素材第 0 帧是站立帧，走动时循环 1..8。
 *  站立帧实测像素分界：0..47 头/身体/裙摆，48..56 腿，57..61 鞋。
 *  切腿时必须「先画腿段、后画上身」，上身后画盖住腿段顶部，否则露背景缝。
 * ============================================================ */

const HERO_SPR = {
  stand: null,      // { img, fw:44, fh:84, n:4 }
  walkS: null,      // 朝下 9 帧
  walkU: null,      // 朝上 9 帧
  walkL: null,
  walkR: null,
  sit: null,        // 坐姿整身（AI 生成，含秋千座板）
  pray: null,      // 许愿合掌帧（AI 生成，单帧）
  dirIndex: { down: 0, left: 1, up: 2, right: 3 },
  ready: false,
};

const HERO_LEG_Y = 48;    // 腿段裁切起点（裙摆下沿，62 高实测）
const HERO_BODY_H = 51;   // 上身绘制高度（向下多盖 3px 消缝）
const HERO_STRIDE = 2;    // 抬腿像素
const WALK_ANIM = 1.0;    // 9 帧播放倍率

const WALK_FRONT = [
  { body: 0, l: -HERO_STRIDE, r: 0 },
  { body: -1, l: -1, r: -1 },
  { body: 0, l: 0, r: -HERO_STRIDE },
  { body: -1, l: -1, r: -1 },
];

let _heroPending = 7;

function loadHeroSprite(cb) {
  function done() {
    if (--_heroPending > 0) return;
    HERO_SPR.ready = true;
    if (cb) cb();
  }
  function load(src, n, key) {
    const img = new Image();
    img.onload = () => {
      HERO_SPR[key] = { img, fw: img.width / n, fh: img.height, n };
      done();
    };
    img.onerror = () => { console.warn('hero sheet failed:', key, src); done(); };
    img.src = src;
  }
  load('assets/hero_stand.png', 4, 'stand');
  load('assets/hero_walk_s.png', 9, 'walkS');
  load('assets/hero_walk_u.png', 9, 'walkU');
  load('assets/hero_walk_l.png', 9, 'walkL');
  load('assets/hero_walk_r.png', 9, 'walkR');
  load('assets/hero_sit.png', 1, 'sit');
  load('assets/hero_pray.png', 1, 'pray');
}

/** 9 帧动画帧号：静止用第 0 帧，走动循环 1..8 */
function _frameIndex(walking, phase, n) {
  if (!walking) return 0;
  const f = Math.floor(phase * WALK_ANIM);
  return ((f % (n - 1)) + (n - 1)) % (n - 1) + 1;
}

function _walkSheet(dir) {
  if (dir === 'down') return HERO_SPR.walkS;
  if (dir === 'up') return HERO_SPR.walkU;
  if (dir === 'left') return HERO_SPR.walkL;
  if (dir === 'right') return HERO_SPR.walkR;
  return null;
}

function _standSX(dir) {
  const S = HERO_SPR.stand;
  const i = HERO_SPR.dirIndex[dir];
  return { S, sx: (i === undefined ? 0 : i) * S.fw };
}

/** 三个方向：播 9 帧行走图，静止时取第 0 帧 */
function drawHeroSheet(ctx, dir, cx, footY, walking, phase) {
  const S = _walkSheet(dir);
  if (!S || !S.img.complete) return false;
  const i = _frameIndex(walking, phase, S.n);
  const left = Math.round(cx - S.fw / 2);
  const top = Math.round(footY - S.fh);
  ctx.drawImage(S.img, i * S.fw, 0, S.fw, S.fh, left, top, S.fw, S.fh);
  return true;
}

/** 四方向走路：全部从站立帧派生（切左右半腿交替 + 上身轻起伏），
    这样走路与待机的体型、像素风格 100% 一致 */
function drawHeroWalkDerived(ctx, dir, cx, footY, phase) {
  const S = HERO_SPR.stand;
  if (!S || !S.img.complete) return false;
  const fw = S.fw, fh = S.fh;
  const { sx } = _standSX(dir);
  const left = Math.round(cx - fw / 2);
  const top = Math.round(footY - fh);
  const legH = fh - HERO_LEG_Y;
  const halfW = Math.floor(fw / 2);
  const i = ((Math.floor(phase) % 4) + 4) % 4;
  const f = WALK_FRONT[i];

  ctx.drawImage(S.img, sx, HERO_LEG_Y, halfW, legH,
    left, top + HERO_LEG_Y + f.l, halfW, legH);
  ctx.drawImage(S.img, sx + halfW, HERO_LEG_Y, fw - halfW, legH,
    left + halfW, top + HERO_LEG_Y + f.r, fw - halfW, legH);
  /* 上身最后画，盖住腿段顶部，消掉位移露出的背景缝 */
  ctx.drawImage(S.img, sx, 0, fw, HERO_BODY_H,
    left, top + f.body, fw, HERO_BODY_H);
  return true;
}

/** 朝上：新站立帧 + 切腿踏步（分左右半腿） */
function drawHeroUp(ctx, cx, footY, walking, phase) {
  const S = HERO_SPR.stand;
  if (!S || !S.img.complete) return;
  const fw = S.fw, fh = S.fh;
  const { sx } = _standSX('up');
  const left = Math.round(cx - fw / 2);
  const top = Math.round(footY - fh);
  const legH = fh - HERO_LEG_Y;
  const halfW = Math.floor(fw / 2);

  if (!walking) {
    ctx.drawImage(S.img, sx, 0, fw, fh, left, top, fw, fh);
    return;
  }

  const i = ((Math.floor(phase) % 4) + 4) % 4;
  const f = WALK_FRONT[i];
  const lift = Math.min(Math.abs(f.l), Math.abs(f.r));

  ctx.drawImage(S.img, sx, HERO_LEG_Y, halfW, legH, left, top + HERO_LEG_Y + f.l, halfW, legH);
  ctx.drawImage(S.img, sx + halfW, HERO_LEG_Y, fw - halfW, legH,
    left + halfW, top + HERO_LEG_Y + f.r, fw - halfW, legH);
  // 上身后画，盖住腿段顶部，消掉背景缝
  ctx.drawImage(S.img, sx, 0, fw, HERO_BODY_H, left, top + f.body, fw, HERO_BODY_H);
}

/** 静止：画站立帧 */
function drawHeroStand(ctx, dir, cx, footY) {
  const S = HERO_SPR.stand;
  if (!S || !S.img.complete) return false;
  const { sx } = _standSX(dir);
  ctx.drawImage(S.img, sx, 0, S.fw, S.fh,
    Math.round(cx - S.fw / 2), Math.round(footY - S.fh), S.fw, S.fh);
  return true;
}

/* 坐姿：只画上半身（约 68%），底边落在坐面上 */
function drawHeroSit(ctx, cx, seatY, dir, t, withLegs) {
  /* 坐姿专用素材：整身（含臀下木板），不再用「上半身 + 程序化腿」拼接，
     从根上消除上下身错位。木板位置与背景秋千座板对齐（0.635 处）。 */
  const P9 = HERO_SPR.sit;
  if (P9 && P9.img.complete) {
    const bob = Math.sin(t * 1.6) * 0.8;
    const top = Math.round(seatY - P9.fh * 0.635 + bob);
    ctx.drawImage(P9.img, Math.round(cx - P9.fw / 2), top);
    return;
  }
  const S = HERO_SPR.stand;
  if (!S || !S.img.complete) return;
  const { sx } = _standSX(dir);
  const cut = Math.round(S.fh * 0.68);
  const bob = Math.sin(t * 2.2) * 0.6;
  const left = Math.round(cx - S.fw / 2);
  const top = Math.round(seatY - cut + bob);

  /* 坐着时把腿画在座面下方垂着 —— 秋千上要看得见腿 */
  if (withLegs) {
    const legSrcY = HERO_LEG_Y;
    const legH = S.fh - legSrcY;
    const lw = Math.round(S.fw * 0.64);
    const lx = Math.round((S.fw - lw) / 2);
    const swing = Math.sin(t * 1.7) * 1.7;
    ctx.drawImage(S.img, sx + lx, legSrcY, lw, legH,
      left + lx, Math.round(seatY) + 2 + swing, lw, legH);
  }

  ctx.drawImage(S.img, sx, 0, S.fw, cut, left, top, S.fw, cut);
}

/* 躺姿：整体旋转 90°，头朝左，脚朝右 */
function drawHeroLie(ctx, cx, cy, dir) {
  const S = HERO_SPR.stand;
  if (!S || !S.img.complete) return;
  const { sx } = _standSX(dir);
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(cy));
  ctx.rotate(-Math.PI / 2 + 0.38);  // 贴合等距床的长轴倾角
  ctx.drawImage(S.img, sx, 0, S.fw, S.fh, Math.round(-S.fw / 2), -S.fh, S.fw, S.fh);
  ctx.restore();
}

function drawHeroSprite(ctx, cx, footY, dir, walking = false, phase = 0) {
  if (!HERO_SPR.ready) return;
  /* 静止：四个方向统一走站立图（hero_stand.png 是四方向真站立，
     没有抬腿）。此前 down/up 静止借用 walk 图第 0 帧，那帧是迈步姿态，
     所以停下来时总有一只腿悬着。 */
  if (!walking && HERO_SPR.stand) {
    drawHeroStand(ctx, dir, cx, footY);
    return;
  }
  /* 走路：用同一批素材导出的真行走帧（站立帧就是这批里「双脚最并拢」的
     那一帧，所以走↔站体型、像素完全一致） */
  if (drawHeroSheet(ctx, dir, cx, footY, walking, phase)) return;
  /* 行走图没加载出来才退回站立帧派生 */
  if (drawHeroWalkDerived(ctx, dir, cx, footY, phase)) return;
  if (dir === 'up') { drawHeroUp(ctx, cx, footY, walking, phase); return; }
  drawHeroUp(ctx, cx, footY, walking, phase);
}

/** 许愿：双手合十。取站立上半身，胸前补一对合拢的手，轻微呼吸 */
function drawHeroPray(ctx, cx, footY, dir, t) {
  /* 优先用专门的许愿帧（AI 生成、双手合十闭眼），没有才退回站立图 + 叠手 */
  const P2 = HERO_SPR.pray;
  if (P2 && P2.img.complete) {
    const bob = Math.sin(t * 1.7) * 0.7;
    const left = Math.round(cx - P2.fw / 2);
    const top = Math.round(footY - P2.fh + bob);
    ctx.drawImage(P2.img, left, top, P2.fw, P2.fh);
    const a = 0.35 + 0.35 * Math.sin(t * 2.6);
    ctx.save();
    ctx.globalAlpha = a;
    P.r(ctx, cx - 1, top - 5, 2, 2, '#fff3c4');
    ctx.globalAlpha = a * 0.45;
    P.r(ctx, cx - 3, top - 3, 6, 1, '#ffe6a8');
    ctx.restore();
    return;
  }
  const S = HERO_SPR.stand;
  if (!S || !S.img.complete) return;
  const { sx } = _standSX(dir);
  const bob = Math.sin(t * 1.7) * 0.7;
  const left = Math.round(cx - S.fw / 2);
  const top = Math.round(footY - S.fh + bob);

  /* 全身都要画：之前只画上面 74%，所以许愿时下半身直接消失 */
  ctx.drawImage(S.img, sx, 0, S.fw, S.fh, left, top, S.fw, S.fh);

  /* ---- 合掌：两条上臂从肩收到胸前，中间一对合拢的手掌 ---- */
  const cx0 = Math.round(cx);
  const sy = top + Math.round(S.fh * 0.43);   // 肩线
  const hy = top + Math.round(S.fh * 0.50);   // 手掌上沿

  /* 上臂：从 (±8, sy) 斜着收向 (±1, hy)，两段 2px 肉色 */
  for (let i = 0; i <= 7; i++) {
    const yy = sy + i;
    const off = Math.round(8 - i * 1.0);
    P.r(ctx, cx0 - off - 1, yy, 2, 1, i < 5 ? '#efc09c' : '#e6b48d');
    P.r(ctx, cx0 + off - 1, yy, 2, 1, i < 5 ? '#e2ac85' : '#d9a078');
  }
  /* 手肘：外侧一点阴影，让手臂有厚度 */
  P.r(ctx, cx0 - 9, sy + 1, 1, 6, '#d8a37c');
  P.r(ctx, cx0 + 8, sy + 1, 1, 6, '#c9976f');

  /* 掌：两只贴在一起，6 宽 10 高，指节分两档色 */
  P.r(ctx, cx0 - 3, hy,     3, 10, '#f6d3b2');   // 左掌
  P.r(ctx, cx0,     hy,     3, 10, '#e7b891');   // 右掌
  P.r(ctx, cx0 - 3, hy - 2, 3, 2,  '#f8ddbe');   // 左指尖
  P.r(ctx, cx0,     hy - 2, 3, 2,  '#eec4a0');   // 右指尖
  P.r(ctx, cx0 - 1, hy + 1, 2, 8,  '#d9a67e');   // 指缝
  P.r(ctx, cx0 - 4, hy + 9, 8, 1,  '#c79572');   // 腕线

  /* 头顶一颗慢慢亮起来的小光 */
  const a = 0.35 + 0.35 * Math.sin(t * 2.6);
  ctx.save();
  ctx.globalAlpha = a;
  P.r(ctx, cx - 1, top - 5, 2, 2, '#fff3c4');
  ctx.globalAlpha = a * 0.45;
  P.r(ctx, cx - 3, top - 3, 6, 1, '#ffe6a8');
  ctx.restore();
}
