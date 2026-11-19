/* ============================================================
 *  game.js — 主循环 / 输入 / 状态机
 *  等距房间 + 真实精灵表角色
 * ============================================================ */

const VIEW = document.getElementById('game');
const vctx = VIEW.getContext('2d');
const BUF = mkCanvas(LOGIC_W, LOGIC_H);
const bctx = BUF.ctx;

const QS = new URLSearchParams(location.search);
let state = QS.get('scene') === 'play' ? 'play' : 'title';
let time = 0;
let stateT = 0;
let hintAlpha = 0;

/* ============================================================
 *  角色状态（等距坐标用格反算，这里直接用屏幕坐标走动）
 * ============================================================ */
const player = {
  x: 240, y: 250,
  dir: 'up',
  moving: false,
  animT: 0,
  bob: 0,
  steerX: 0,
  steerY: 0,
};

/* 可走区域（屏幕坐标，等距地板范围内收一圈） */
const WALK = { x0: 72, x1: 408, y0: 132, y1: 258 };

/* 障碍：屏幕空间接地矩形（只有脚底落进去才挡） */
const OBSTACLES = [
  { x: 178, y: 152, w: 96, h: 26, name: 'bed' },      // 床
  { x: 214, y: 156, w: 56, h: 22, name: 'table' },    // 中央圆桌
  { x: 330, y: 178, w: 74, h: 30, name: 'desk' },     // 书桌
  { x: 78, y: 176, w: 46, h: 26, name: 'vinyl' },     // 唱片柜（左）
];

function blocked(x, y) {
  const r = 7;
  if (x < WALK.x0 || x > WALK.x1 || y < WALK.y0 || y > WALK.y1) return true;
  for (const o of OBSTACLES) {
    // 脚底落进矩形才阻挡（站物体前方不挡）
    if (y > o.y - 2 && y < o.y + o.h && x + r > o.x && x - r < o.x + o.w) return true;
  }
  return false;
}

/* 是否站在蛋糕前（桌前方一点） */
let nearCake = false;
function checkNearCake() {
  nearCake = Math.abs(player.x - 272) < 54 && player.y > 180 && player.y < 222;
}

/* ============================================================
 *  输入 —— 只靠点击 / 触摸移动（电脑和手机同一套）
 * ============================================================ */
const TAP = {
  active: false,
  tx: 0, ty: 0,
  pointerDown: false,
};

function inTableZone(x, y) {
  return Math.abs(x - 240) < 52 && y > 138 && y < 200;
}

function onPointerDown(e) {
  const p = toLogic(e.clientX, e.clientY);

  if (state === 'title') {
    state = 'play';
    stateT = 0;
    return;
  }
  if (state === 'celebrate' && stateT > 3.2) {
    // 再看一次
    state = 'play';
    stateT = 0;
    CAKE.lit = false;
    CAKE.out = false;
    CAKE.level = 0;
    confetti.length = 0;
    return;
  }
  if (state !== 'play') return;

  TAP.pointerDown = true;

  // 点在桌子区域：走过去，到了就吹蜡烛
  if (inTableZone(p.x, p.y)) {
    TAP.active = true;
    TAP.tx = 276;          // 站到桌右下方，不遮蛋糕
    TAP.ty = 200;
    TAP.viaTable = true;
    return;
  }

  // 点地面：走过去
  TAP.active = true;
  TAP.tx = Math.max(WALK.x0, Math.min(WALK.x1, p.x));
  TAP.ty = Math.max(WALK.y0, Math.min(WALK.y1, p.y));
  TAP.viaTable = false;
}

VIEW.addEventListener('pointerdown', onPointerDown);
VIEW.addEventListener('pointerup', () => { TAP.pointerDown = false; });
VIEW.addEventListener('pointercancel', () => { TAP.pointerDown = false; });

/* 每帧把「目标点」转成方向 */
function steerToTarget() {
  if (!TAP.active) return;
  const dx = TAP.tx - player.x;
  const dy = TAP.ty - player.y;
  const d = Math.hypot(dx, dy);
  if (d < 4) {
    TAP.active = false;
    if (TAP.viaTable && nearCake) tryInteract();
    return;
  }
  player.steerX = dx / d;
  player.steerY = dy / d;
}

/* ============================================================
 *  交互 & 状态
 * ============================================================ */
function tryInteract() {
  if (!nearCake || state !== 'play') return;
  state = 'wish';
  stateT = 0;
  CAKE.lit = true;
  CAKE.level = 0;
  player.dir = 'up';
}

function spawnConfetti(n = 100) {
  for (let i = 0; i < n; i++) {
    confetti.push({
      x: Math.random() * LOGIC_W,
      y: -10 - Math.random() * 70,
      vx: (Math.random() - 0.5) * 24,
      vy: 12 + Math.random() * 34,
      w: 1 + Math.floor(Math.random() * 2),
      h: 2 + Math.floor(Math.random() * 3),
      c: ['#f7b9c9', '#ffd9a0', '#c9b3e0', '#a8d8c8', '#fff0c4', '#f7a0b8'][Math.floor(Math.random() * 6)],
      rot: Math.random() * 6,
      rs: (Math.random() - 0.5) * 9,
      life: 1,
    });
  }
}
const confetti = [];

/* ============================================================
 *  更新
 * ============================================================ */
function update(dt) {
  time += dt;
  stateT += dt;

  // 烛光渐亮
  if (CAKE.lit) CAKE.level = Math.min(1, CAKE.level + dt * 1.5);

  // 礼花
  for (let i = confetti.length - 1; i >= 0; i--) {
    const c = confetti[i];
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    c.vy += 12 * dt;
    c.rot += c.rs * dt;
    c.life -= dt * 0.11;
    if (c.y > LOGIC_H + 24 || c.life <= 0) confetti.splice(i, 1);
  }

  if (state === 'title') return;

  if (state === 'wish') {
    if (stateT > 2.8) {
      CAKE.lit = false;
      CAKE.out = true;
      CAKE.level = 0;
      state = 'celebrate';
      stateT = 0;
      spawnConfetti(130);
    }
    return;
  }

  if (state === 'celebrate') {
    if (Math.random() < dt * 2.5) spawnConfetti(6);
    return;
  }

  /* ---- 自由走动（点击驱动） ---- */
  let dx = player.steerX || 0;
  let dy = player.steerY || 0;

  const len = Math.hypot(dx, dy);
  player.moving = len > 0.01;

  if (player.moving) {
    dx /= len; dy /= len;
    const speed = 68;
    const nx = player.x + dx * speed * dt;
    const ny = player.y + dy * speed * dt;
    // 分轴移动，贴墙能滑
    if (!blocked(nx, player.y)) player.x = nx;
    else if (TAP.active) { TAP.active = false; }

    if (!blocked(player.x, ny)) player.y = ny;
    else if (TAP.active) { TAP.active = false; }

    // 朝向：横向优先
    if (Math.abs(dx) > Math.abs(dy)) player.dir = dx > 0 ? 'right' : 'left';
    else player.dir = dy > 0 ? 'down' : 'up';

    player.animT += dt * 7;
    player.bob = Math.floor(player.animT) % 2 === 0 ? 0 : -1;
  } else {
    player.animT = 0;
    player.bob = 0;
    player.steerX = 0;
    player.steerY = 0;
  }

  checkNearCake();
  hintAlpha += ((nearCake ? 1 : 0) - hintAlpha) * Math.min(1, dt * 12);
}

/* ============================================================
 *  渲染
 * ============================================================ */
function render() {
  const t = time;
  bctx.clearRect(0, 0, LOGIC_W, LOGIC_H);

  // 背景
  P.r(bctx, 0, 0, LOGIC_W, LOGIC_H, '#241a2b');

  // 场景（地板 / 墙 / 家具 / 蛋糕）
  drawFloor(bctx);
  drawWalls(bctx);
  drawWindow(bctx, t);
  drawWallArt(bctx);
  drawStringLights(bctx, t);
  drawRug(bctx);
  drawBed(bctx);
  drawDesk(bctx);
  drawMirror(bctx);
  drawVinyl(bctx, t);
  drawPlant(bctx, 0.6, 6.6, 1.0);
  drawPlant(bctx, 8.4, 1.0, 0.85);

  // 深度排序：桌子 / 角色（按接地 y）
  const tc = tableTopCenter();
  const items = [
    { y: tc.y + 24, draw: () => drawTable(bctx) },
    { y: player.y, draw: () => drawHeroSprite(bctx, player.x, player.y, player.dir, player.bob) },
  ];
  items.sort((a, b) => a.y - b.y);
  items.forEach((it) => it.draw());

  // 礼花
  confetti.forEach((c) => {
    bctx.save();
    bctx.globalAlpha = Math.max(0, Math.min(1, c.life));
    bctx.translate(c.x, c.y);
    bctx.rotate(c.rot);
    P.r(bctx, -c.w / 2, -c.h / 2, c.w, c.h, c.c);
    bctx.restore();
  });

  // 氛围光
  drawAmbience(bctx, t);

  // 交互提示（顶部，完全不遮挡角色与蛋糕）
  if (hintAlpha > 0.02 && state === 'play') {
    const bw = 88, bh = 16;
    const bx = LOGIC_W / 2 - bw / 2;
    const by = 12;
    bctx.save();
    bctx.globalAlpha = hintAlpha;
    P.rb(bctx, bx, by, bw, bh, 'rgba(38,26,36,0.82)', 'rgba(255,220,200,0.35)');
    P.text(bctx, '轻点蛋糕 ⟶ 吹蜡烛', LOGIC_W / 2, by + 4, '#ffe9d6', 9, 'center');
    bctx.restore();
  }

  // 标题 / 许愿 / 庆祝 遮罩
  if (state === 'title') drawTitle(bctx, t);
  if (state === 'wish') drawWish(bctx, t);
  if (state === 'celebrate') drawCelebrate(bctx, t);

  // 输出
  vctx.imageSmoothingEnabled = false;
  vctx.clearRect(0, 0, VIEW.width, VIEW.height);
  vctx.drawImage(BUF.canvas, 0, 0);
}

/* ---------- 标题页 ---------- */
function drawTitle(ctx, t) {
  ctx.save();
  ctx.fillStyle = 'rgba(24,15,26,0.74)';
  ctx.fillRect(0, 0, LOGIC_W, LOGIC_H);

  for (let i = 0; i < 46; i++) {
    const x = (i * 137.5) % LOGIC_W;
    const y = (i * 71.3) % LOGIC_H;
    ctx.globalAlpha = 0.18 + 0.55 * Math.abs(Math.sin(t * 1.3 + i));
    P.r(ctx, x, y, 1, 1, '#fff4d8');
  }
  ctx.globalAlpha = 1;

  P.text(ctx, '给宝贝的', LOGIC_W / 2, 72, '#ffd9e2', 12, 'center');
  P.text(ctx, '生日小屋', LOGIC_W / 2, 92, '#fff3d0', 26, 'center', 'serif');
  P.text(ctx, '— 一间为你准备的房间 —', LOGIC_W / 2, 130, '#c9b3d8', 8, 'center');

  ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 2.4);
  P.text(ctx, '点击屏幕开始', LOGIC_W / 2, 200, '#fff0f5', 10, 'center');
  ctx.globalAlpha = 1;
  ctx.restore();
}

/* ---------- 许愿 ---------- */
function drawWish(ctx, t) {
  const a = Math.min(1, stateT / 0.6);
  ctx.save();
  ctx.globalAlpha = a * 0.5;
  ctx.fillStyle = '#1b1020';
  ctx.fillRect(0, 0, LOGIC_W, LOGIC_H);
  ctx.globalAlpha = a;
  P.text(ctx, '闭上眼，许个愿…', LOGIC_W / 2, 236, '#ffe9c9', 11, 'center');
  ctx.restore();
}

/* ---------- 庆祝 ---------- */
function drawCelebrate(ctx, t) {
  const a = Math.min(1, stateT / 0.8);
  ctx.save();

  // 顶部渐暗，让文字看得清
  const g = ctx.createLinearGradient(0, 0, 0, 110);
  g.addColorStop(0, 'rgba(24,14,28,0.82)');
  g.addColorStop(1, 'rgba(24,14,28,0)');
  ctx.globalAlpha = a;
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, LOGIC_W, 110);

  // 标题（带描边，压住礼花）
  const cx = LOGIC_W / 2;
  ctx.globalAlpha = a;
  P.text(ctx, '生日快乐！', cx + 1, 33, 'rgba(60,30,45,0.85)', 24, 'center', 'serif');
  P.text(ctx, '生日快乐！', cx, 32, '#ffd9e2', 24, 'center', 'serif');

  P.text(ctx, '愿你的每一天都被温柔以待', cx + 1, 66, 'rgba(60,30,45,0.7)', 10, 'center');
  P.text(ctx, '愿你的每一天都被温柔以待', cx, 65, '#fff3d0', 10, 'center');

  // 提示再看一次
  if (stateT > 3.4) {
    ctx.globalAlpha = a * (0.45 + 0.55 * Math.sin(t * 2.6));
    P.text(ctx, '轻点屏幕，再看一次', cx, 250, '#ffd9e2', 9, 'center');
  }
  ctx.restore();
}

/* ============================================================
 *  点击 / 触摸
 * ============================================================ */
function toLogic(clientX, clientY) {
  const r = VIEW.getBoundingClientRect();
  return {
    x: ((clientX - r.left) / r.width) * LOGIC_W,
    y: ((clientY - r.top) / r.height) * LOGIC_H,
  };
}

/* ============================================================
 *  缩放
 * ============================================================ */
function resize() {
  const s = Math.min(window.innerWidth / LOGIC_W, window.innerHeight / LOGIC_H) * 0.97;
  VIEW.style.width = Math.round(LOGIC_W * s) + 'px';
  VIEW.style.height = Math.round(LOGIC_H * s) + 'px';
}
window.addEventListener('resize', resize);
resize();

/* ============================================================
 *  主循环
 * ============================================================ */
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  steerToTarget();
  update(dt);
  render();
  requestAnimationFrame(loop);
}

loadHeroSprite(() => {
  requestAnimationFrame(loop);
});
