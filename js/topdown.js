/* ============================================================
 *  topdown.js — 双场景：海边小屋（室内）/ 傍晚沙滩
 *
 *  底图：assets/scene_cottage.png / scene_beach.png（均 960x540，
 *        1536x864 生成图等比缩小 0.625），绘制到 480x270 逻辑画布时
 *        临时开 imageSmoothing，保留柔和像素颗粒。
 *
 *  坐标都由 1536x864 原图实测后 ×0.3125 换算（480x270 逻辑坐标）。
 *  场景切换：TD.setScene('beach') / TD.setScene('cottage')
 * ============================================================ */

const TD = { bg: null, ready: false, scene: 'cottage', fade: 0 };

const SCENE_DEF = {
  /* ---------------- 室内 ---------------- */
  cottage: {
    src: 'assets/scene_cottage.png',
    walk: { x0: 50, x1: 452, y0: 118, y1: 242 },
    cake: { x: 311, y: 152 },          // 桌上蛋糕顶面中心（画蜡烛用）
    table: { x: 262, y: 140, w: 98, h: 76 },
    rug: { x: 165, y: 165, w: 70, h: 65 },
    gift: { x: 268, y: 143, w: 30, h: 26 },
    door: { x: 232, y: 25, w: 72, h: 120 },
    photo: { x: 105, y: 25, w: 90, h: 65 },
    dog: { x: 174, y: 172 },
    cat: { x: 208, y: 162 },
    npc:  { x: 400, y: 195 },
    obstacles: [
      /* 床前留出 y≈150..156 的走廊，否则左侧窗边永远走不到；
         wallL 挡住左边窗户那面墙，免得人物走到窗帘上 */
      { x: 0,   y: 0,   w: 126, h: 146, name: 'wallL' },
      { x: 44,  y: 170, w: 118, h: 82, name: 'bed' },
      { x: 128, y: 96,  w: 98,  h: 44, name: 'desk' },
      { x: 330, y: 45,  w: 86,  h: 90, name: 'shelf' },
      { x: 262, y: 140, w: 98,  h: 76, name: 'table' },
      { x: 100, y: 84,  w: 28,  h: 48, name: 'plantL' },
      { x: 415, y: 90,  w: 36,  h: 42, name: 'cabinetR' },
    ],
  },

  /* ---------------- 沙滩 ---------------- */
  beach: {
    src: 'assets/scene_beach.png',
    walk: { x0: 14, x1: 466, y0: 118, y1: 266 },
    cake: null,
    rug: null,
    gift: null,
    sign: null,
    house: { x: 0, y: 73, w: 44, h: 54 },
    swing: { x: 356, y: 83, w: 85, h: 106 },
    npc:   { x: 286, y: 212 },
    obstacles: [
      { x: 0, y: 73, w: 46, h: 56, name: 'house' },
      { x: 356, y: 83, w: 13, h: 106, name: 'postL' },
      { x: 428, y: 83, w: 13, h: 106, name: 'postR' },
      { x: 443, y: 156, w: 22, h: 40, name: 'lantern' },
    ],
  },
};

/* 当前场景的布局对象（tdgame.js 直接读 LAYOUT.*） */
let LAYOUT = SCENE_DEF.cottage;

/* ---------- 男主 NPC 的运行时状态（由 tdgame.js 驱动：跟随 / 牵手） ---------- */
const NPC = {
  x: 0, y: 0, dir: 'down', animT: 0, moving: false,
  visible: false, linked: false, trail: [],
};

function npcSpawnAt(scene) {
  const L = SCENE_DEF[scene] || SCENE_DEF.cottage;
  const n = L.npc || { x: 400, y: 195 };
  NPC.x = n.x;
  NPC.y = n.y;
  NPC.dir = 'down';
  NPC.animT = 0;
  NPC.moving = false;
  NPC.visible = true;
  NPC.linked = false;
  NPC.trail.length = 0;
}

function loadRoomBg(cb) {
  /* 男主：四方向各 1 帧站立待机 + 四方向各 9 帧行走（62 高，与女主同高） */
  TD.npcSpr = {};
  const npcFiles = {
    stand: 'assets/npc_stand.png',
    idleS: 'assets/npc_idle_s.png',
    idleU: 'assets/npc_idle_u.png',
    idleL: 'assets/npc_idle_l.png',
    idleR: 'assets/npc_idle_r.png',
    s: 'assets/npc_walk_s.png',
    u: 'assets/npc_walk_u.png',
    l: 'assets/npc_walk_l.png',
    r: 'assets/npc_walk_r.png',
  };
  Object.keys(npcFiles).forEach((k) => {
    const im = new Image();
    im.onload = () => { TD.npcSpr[k] = im; };
    im.src = npcFiles[k];
  });

  const dogImg = new Image();
  dogImg.onload = () => { TD.dogImg = dogImg; };
  dogImg.src = 'assets/dog.png';

  const catImg = new Image();
  catImg.onload = () => { TD.catImg = catImg; };
  catImg.src = 'assets/cat.png';

  const keys = Object.keys(SCENE_DEF);
  const imgs = {};
  let n = 0;
  keys.forEach((k) => {
    const img = new Image();
    img.onload = () => {
      imgs[k] = img;
      if (++n === keys.length) {
        TD.imgs = imgs;
        TD.bg = imgs[TD.scene];
        TD.ready = true;
        cb && cb();
      }
    };
    img.onerror = () => { if (++n === keys.length) { TD.imgs = imgs; cb && cb(); } };
    img.src = SCENE_DEF[k].src;
  });
}

/** 切换场景（布局、障碍、底图一起换） */
function tdSetScene(id) {
  if (!SCENE_DEF[id]) return;
  TD.scene = id;
  LAYOUT = SCENE_DEF[id];
  TD.bg = TD.imgs ? TD.imgs[id] : null;
}

/* ---------- 淡入淡出（切场景时用） ---------- */
let _tdFade = 0;          // 0 透明 → 1 全黑
let _tdFadeDir = 0;       // 1 变黑 / -1 变亮
let _tdFadeMid = null;    // 全黑瞬间的回调
let _tdFadeT = 0;

function tdFadeTo(midCb) {
  if (_tdFadeDir === 1) return;
  _tdFadeDir = 1;
  _tdFadeMid = midCb || null;
}

function tdDrawFade(ctx, t) {
  const dt = Math.min(0.06, Math.max(0, t - _tdFadeT));
  _tdFadeT = t;
  if (_tdFadeDir === 1) {
    _tdFade += dt * 3.2;
    if (_tdFade >= 1) {
      _tdFade = 1;
      _tdFadeDir = -1;
      if (_tdFadeMid) { _tdFadeMid(); _tdFadeMid = null; }
    }
  } else if (_tdFadeDir === -1) {
    _tdFade -= dt * 2.6;
    if (_tdFade <= 0) { _tdFade = 0; _tdFadeDir = 0; }
  }
  if (_tdFade > 0.002) {
    ctx.globalAlpha = _tdFade;
    P.r(ctx, 0, 0, LOGIC_W, LOGIC_H, '#1b1220');
    ctx.globalAlpha = 1;
  }
}

/* ============================================================
 *  蛋糕（俯视三层，粉色奶油 + 三根蜡烛）
 * ============================================================ */
function tdCake(ctx, t) {
  const c = LAYOUT.cake;
  if (!c) return;
  const lit = typeof CAKE !== 'undefined' && CAKE.lit;
  const out = typeof CAKE !== 'undefined' && CAKE.out;
  const cx = c.x, cy = c.y;
  /* 底图上已经画好蛋糕和蜡烛，这里只补"火" */
  const candles = [-19, -7, 7, 19];
  candles.forEach((dx, i) => {
    const bx = cx + dx;
    if (lit) {
      const fl = Math.sin(t * 9 + i * 2.1) * 0.8;
      const fy = cy - 22 + fl;
      ctx.globalAlpha = 0.6;
      P.ellipse(ctx, bx + 0.5, fy, 2.4, 3.4, 'rgba(255,190,110,0.9)');
      ctx.globalAlpha = 1;
      P.r(ctx, bx, fy - 1, 1, 4, '#fff3b0');
      P.r(ctx, bx, fy, 1, 2, '#fffdf0');
    } else if (out) {
      const s2 = Math.sin(t * 2 + i) * 0.6;
      ctx.globalAlpha = 0.3;
      P.r(ctx, bx + s2, cy - 26, 1, 3, 'rgba(205,205,215,0.8)');
      P.r(ctx, bx - s2, cy - 30, 1, 3, 'rgba(205,205,215,0.45)');
      ctx.globalAlpha = 1;
    }
  });
}

/* ---------- 一道真门（把底图地板上的洞补成门洞） ---------- */
function tdDoor(ctx, t) {
  const d = LAYOUT.door;
  if (!d) return;
  const x0 = d.x, y0 = d.y, x1 = d.x + d.w, y1 = d.y + d.h;

  // 门口透出的屋外光
  const g = ctx.createLinearGradient(0, y1, 0, y0);
  g.addColorStop(0, 'rgba(255,214,150,0.26)');
  g.addColorStop(1, 'rgba(255,214,150,0.02)');
  ctx.fillStyle = g;
  ctx.fillRect(x0 + 3, y0 + 3, d.w - 6, d.h - 6);

  // 门框：上楣 + 左右立柱（浅木，带高光）
  const F = '#a9714a', FH = '#caa27a', FS = '#7d4f32';
  P.r(ctx, x0 - 6, y0 - 7, d.w + 12, 7, FS);
  P.r(ctx, x0 - 6, y0 - 7, d.w + 12, 5, F);
  P.r(ctx, x0 - 6, y0 - 7, d.w + 12, 2, FH);
  P.r(ctx, x0 - 6, y0 - 2, 6, d.h + 2, FS);
  P.r(ctx, x0 - 6, y0 - 2, 4, d.h + 2, F);
  P.r(ctx, x1, y0 - 2, 6, d.h + 2, FS);
  P.r(ctx, x1 + 2, y0 - 2, 4, d.h + 2, F);

  // 开着的门板：贴在右框内侧，向屋里偏出来一点
  const pw = 19, ph = d.h - 6;
  const bx = x1 - pw - 2, by = y0 + 1;
  P.r(ctx, bx - 2, by + 2, pw + 4, ph, 'rgba(90,55,40,0.22)');   // 门板投影
  P.r(ctx, bx, by, pw, ph, '#c98a5a');
  P.r(ctx, bx, by, pw, 2, '#e0a877');
  P.r(ctx, bx, by, 2, ph, '#b0734a');
  P.r(ctx, bx + pw - 2, by, 2, ph, '#8f5a38');
  // 门上两块凹板（木门纹理）
  P.r(ctx, bx + 4, by + 5, pw - 8, ph * 0.42, '#bb7c4e');
  P.r(ctx, bx + 4, by + 5, pw - 8, 1, '#a4693f');
  P.r(ctx, bx + 4, by + 5 + ph * 0.46, pw - 8, ph * 0.42, '#bb7c4e');
  P.r(ctx, bx + 4, by + 5 + ph * 0.46, pw - 8, 1, '#a4693f');
  // 门把手
  P.r(ctx, bx + 3, by + ph * 0.52, 5, 5, '#e8c07a');
  P.r(ctx, bx + 3, by + ph * 0.52, 4, 4, '#ffd98a');
  P.r(ctx, bx + 4, by + ph * 0.52, 2, 2, '#fff0c4');

  // 门缝里漏出来的暖光
  ctx.globalAlpha = 0.12 + 0.05 * Math.sin(t * 1.6);
  P.r(ctx, bx - 4, by + 4, 3, ph - 8, '#ffe2b0');
  ctx.globalAlpha = 1;
}

/* ---------- 墙上的照片墙 ---------- */
function tdPhotoWall(ctx, t) {
  const p = LAYOUT.photo;
  if (!p) return;
  const frames = [
    [0, 0, 24, 22], [28, 0, 24, 22],
    [0, 26, 24, 22], [28, 26, 24, 22],
  ];
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    const x = p.x + f[0], y = p.y + f[1], w = f[2], h = f[3];
    /* 挂钉 + 细线 */
    P.r(ctx, x + w / 2 - 0.5, y - 3, 1, 1, '#b98a6a');
    P.r(ctx, x + w / 2 - 0.5, y - 2, 1, 2, 'rgba(185,138,106,0.55)');
    /* 投影 + 双层白框 */
    P.r(ctx, x + 1, y + h, w - 1, 2, 'rgba(120,80,60,0.18)');
    P.r(ctx, x, y, w, h, '#e8dccb');
    P.r(ctx, x, y, w, 1, '#fffdf8');
    P.r(ctx, x + 1, y + 1, w - 2, h - 2, '#fffaf1');
    P.r(ctx, x + 1, y + h - 2, w - 2, 1, '#f0e6d6');
    const ix = x + 3, iy = y + 3, iw = w - 6, ih = h - 6;
    photoArt(ctx, i, ix, iy, iw, ih);
  }
  // 一颗闪烁的小星星，提示能点
  const k = (Math.sin(t * 2.2) + 1) / 2;
  ctx.globalAlpha = 0.35 + 0.5 * k;
  P.r(ctx, p.x + p.w + 3, p.y + 4, 1, 1, '#fff4c4');
  P.r(ctx, p.x + p.w + 2, p.y + 5, 3, 1, 'rgba(255,244,196,0.75)');
  ctx.globalAlpha = 1;
}

/* 四张小照片的内容：落日海 / 两个人 / 蛋糕 / 心 */
function photoArt(ctx, i, x, y, w, h) {
  const hor = Math.round(h * 0.52);
  if (i === 0) {
    P.r(ctx, x, y, w, hor, '#ffcfa8');                       // 天
    P.r(ctx, x, y, w, Math.round(hor * 0.5), '#ffb894');
    P.ellipse(ctx, x + w * 0.5, y + hor - 2, 3.6, 3.6, '#fff0c0');  // 落日
    P.r(ctx, x, y + hor, w, h - hor, '#9dbdd6');             // 海
    P.r(ctx, x, y + hor, w, 1, '#e8f3fa');
    P.r(ctx, x + 3, y + hor + 3, 5, 1, 'rgba(255,255,255,0.65)');
    P.r(ctx, x + w - 9, y + hor + 5, 4, 1, 'rgba(255,255,255,0.5)');
  } else if (i === 1) {
    /* 一座小房子 + 落日：我们的家 */
    P.r(ctx, x, y, w, h, '#cfe3f5');
    P.r(ctx, x, y + h - 3, w, 3, '#a9c4a8');
    P.ellipse(ctx, x + w - 4, y + 4, 2.6, 2.6, '#ffe08a');
    const bx = x + 3, bw = w - 6, by = y + 7, bh = h - 10;
    P.r(ctx, bx, by, bw, bh, '#fff1e2');                     // 墙
    P.r(ctx, bx, by, bw, 1, '#fffdf7');
    P.r(ctx, bx + 2, by - 2, bw - 4, 2, '#d98f7f');          // 屋顶
    P.r(ctx, bx + 1, by - 3, bw - 2, 1, '#e8a293');
    P.r(ctx, bx + 4, by + 2, 2, 2, '#ffd9a0');               // 窗
    P.r(ctx, bx + bw - 6, by + 2, 2, 2, '#ffd9a0');
    P.r(ctx, bx + Math.floor(bw / 2) - 1, by + bh - 4, 3, 4, '#b97a5c');  // 门
  } else if (i === 2) {
    P.r(ctx, x, y, w, h, '#fdeaf1');                         // 背景
    P.r(ctx, x + 2, y + h - 3, w - 4, 2, '#e0b8c8');         // 盘子
    P.r(ctx, x + 3, y + h - 7, w - 6, 4, '#ffd9e6');         // 下层
    P.r(ctx, x + 4, y + h - 11, w - 8, 4, '#ffe6ef');        // 上层
    P.r(ctx, x + 6, y + h - 14, w - 12, 3, '#fff3f7');
    P.r(ctx, x + Math.round(w * 0.3), y + h - 18, 1, 3, '#f2b6c8');
    P.r(ctx, x + Math.round(w * 0.7), y + h - 18, 1, 3, '#f2b6c8');
    P.r(ctx, x + Math.round(w * 0.3), y + h - 19, 1, 1, '#ffd86b');
    P.r(ctx, x + Math.round(w * 0.7), y + h - 19, 1, 1, '#ffd86b');
  } else {
    P.r(ctx, x, y, w, h, '#fdf0dc');                         // 背景
    P.r(ctx, x + 2, y + 2, 1, 1, '#fff6d0');
    P.r(ctx, x + w - 3, y + h - 4, 1, 1, '#fff6d0');
    const cx = x + w / 2, cy = y + h / 2 - 1;
    const RED = '#ef7a9a';
    P.r(ctx, cx - 4, cy - 3, 3, 3, RED);
    P.r(ctx, cx + 1, cy - 3, 3, 3, RED);
    P.r(ctx, cx - 4, cy - 1, 8, 3, RED);
    P.r(ctx, cx - 3, cy + 2, 6, 1, RED);
    P.r(ctx, cx - 2, cy + 3, 4, 1, RED);
    P.r(ctx, cx - 1, cy + 4, 2, 1, RED);
  }
}

/* ---------- 椅子上的粉坐垫 ---------- */
function tdCushion(ctx) {
  const c = LAYOUT.chair;
  if (!c) return;
  const cx = c.x + c.w / 2;
  const cy = c.y + 30;
  P.ellipse(ctx, cx, cy + 1, 13, 5.4, 'rgba(120,60,80,0.16)');
  P.ellipse(ctx, cx, cy, 12.6, 5, '#f7bfd2');
  P.ellipse(ctx, cx, cy - 0.8, 11, 4, '#ffd6e4');
  P.ellipse(ctx, cx, cy - 1.6, 8.6, 2.8, '#ffe7f0');
}

/* ---------- 粉白花球（把书架旁那棵绿植盖成一束花） ---------- */
function tdBasket(ctx, t) {
  const b = LAYOUT.pot;
  if (!b) return;
  const cx = b.x + b.w / 2;
  const by = b.y + b.h;
  const sway = Math.sin(t * 1.4) * 0.9;

  P.ellipse(ctx, cx, by - 2, 20, 4.6, 'rgba(90,55,70,0.20)');

  const leaves = [[-16, -46, 10, 5], [16, -48, 10, 5], [-10, -36, 9, 4.5], [12, -34, 9, 4.5], [0, -54, 11, 5]];
  leaves.forEach(([dx, dy, rx, ry]) => {
    P.ellipse(ctx, cx + dx, by + dy, rx, ry, '#6d9a63');
    P.ellipse(ctx, cx + dx - 1, by + dy - 1, rx * 0.7, ry * 0.6, '#81ad76');
  });

  const pw0 = 40, pw1 = 30;
  for (let i = 0; i < 4; i++) {
    const ty = by - 30 + i * 7.2;
    const pw = pw0 + (pw1 - pw0) * (i / 3);
    P.r(ctx, cx - pw / 2, ty, pw, 7.2, i === 0 ? '#f8c6d4' : '#efb2c5');
  }
  P.r(ctx, cx - pw0 / 2 - 1, by - 32, pw0 + 2, 6, '#ffd9e4');
  P.r(ctx, cx - pw0 / 2 - 1, by - 32, pw0 + 2, 1.6, '#fff2f6');
  P.r(ctx, cx - pw0 / 2 + 1, by - 22, 2, 16, '#ffdfe8');

  function bloom(bx, byy, r, base) {
    const pts = [[0, 0], [-0.62, -0.42], [0.62, -0.42], [-0.5, 0.5], [0.5, 0.5], [0, -0.78], [-0.15, 0.72]];
    pts.forEach(([u, v], i) => {
      P.ellipse(ctx, bx + u * r, byy + v * r, r * 0.6, r * 0.55, i % 3 === 0 ? '#ffffff' : base);
    });
  }
  bloom(cx - 12 + sway, by - 62, 12, '#ffe3ee');
  bloom(cx + 12 + sway, by - 60, 11, '#ffd7e6');
  bloom(cx + sway * 1.2, by - 74, 13, '#fff1f6');
  bloom(cx - 3 + sway, by - 50, 9, '#ffe8f1');

  [[-14, -66], [10, -70], [1, -80], [15, -54], [-18, -57]].forEach(([dx, dy]) => {
    P.r(ctx, cx + dx + sway, by + dy, 2, 2, '#f4a9c2');
  });
}

/* ---------- 边牧 / 暹罗猫 ---------- */
function tdPets(ctx, t) {
  const dog = LAYOUT.dog, cat = LAYOUT.cat;
  if (dog && TD.dogImg) {
    const im = TD.dogImg;
    const dh = 31, dw = Math.round(im.width * dh / im.height);
    const bx = Math.round(dog.x - dw / 2);
    const by = Math.round(dog.y - dh + Math.round(Math.sin(t * 1.7) * 0.6));
    P.ellipse(ctx, dog.x, dog.y + 1, dw * 0.44, 3.0, 'rgba(60,35,40,0.22)');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(im, bx, by, dw, dh);
  }
  if (cat && TD.catImg) {
    const im = TD.catImg;
    const dh = 26, dw = Math.round(im.width * dh / im.height);
    const bx = Math.round(cat.x - dw / 2);
    const by = Math.round(cat.y - dh + Math.round(Math.sin(t * 2.4) * 0.5));
    P.ellipse(ctx, cat.x, cat.y + 1, dw * 0.42, 2.6, 'rgba(60,35,40,0.20)');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(im, bx, by, dw, dh);
  }
}

/* ---------- 礼物盒（地毯左下的地板上） ---------- */
function tdGifts(ctx, t) {
  const g = LAYOUT.gift;
  if (!g) return;
  const { x, y, w, h } = g;
  const pulse = 0.55 + 0.45 * Math.sin(t * 2.4);

  // 投影
  ctx.globalAlpha = 0.18;
  P.ellipse(ctx, x + w / 2, y + h - 1, w * 0.6, 4, '#6a3f2c');
  ctx.globalAlpha = 1;

  // 盒体
  P.r(ctx, x, y + 6, w, h - 6, '#f2a9bd');
  P.r(ctx, x, y + 6, w, 2, '#ffc3d2');
  P.r(ctx, x + w - 3, y + 6, 3, h - 6, '#e090a8');
  // 盒盖
  P.r(ctx, x - 1, y + 1, w + 2, 6, '#ffd0dd');
  P.r(ctx, x - 1, y + 1, w + 2, 2, '#ffe4ec');
  // 竖丝带（细，别糊住整个盒子）
  P.r(ctx, x + w / 2 - 1, y + 1, 2, h - 1, '#ffe6c4');
  P.r(ctx, x + w / 2 - 1, y + 1, 1, h - 1, '#fff6e2');
  // 蝴蝶结
  P.ellipse(ctx, x + w / 2 - 4, y - 1, 4, 3, '#fff6e2');
  P.ellipse(ctx, x + w / 2 + 4, y - 1, 4, 3, '#fff6e2');
  P.r(ctx, x + w / 2 - 1, y - 2, 2, 3, '#ffe9c9');

  // 提示小星星
  [[-3, -6], [w + 2, 4]].forEach(([dx, dy], i) => {
    ctx.globalAlpha = 0.35 + 0.5 * Math.abs(Math.sin(t * 2.2 + i * 1.7));
    const sx = x + dx + Math.sin(t * 1.3 + i) * 1.2;
    const sy = y + dy;
    P.r(ctx, sx, sy, 1, 1, '#fff4c4');
    P.r(ctx, sx - 1, sy + 1, 3, 1, 'rgba(255,244,196,0.7)');
    ctx.globalAlpha = 1;
  });
}

/* ---------- 暖光 + 四角压暗 ---------- */
function tdLighting(ctx, t) {
  const c = LAYOUT.cake;
  if (c) {
    const steps = 16;
    for (let i = steps; i > 0; i--) {
      const k = i / steps;
      ctx.globalAlpha = 0.024 * (1 - k) + 0.002;
      P.ellipse(ctx, c.x, c.y - 4, 30 + k * 150, 30 + k * 145, '#ffd9a0');
    }
  }
  for (let i = 0; i < 22; i++) {
    ctx.globalAlpha = 0.22 / 22;
    P.r(ctx, 0, 0, 480, 2, '#1a1224');
    P.r(ctx, 0, 268, 480, 2, '#1a1224');
    P.r(ctx, 0, 0, 2, 270, '#1a1224');
    P.r(ctx, 478, 0, 2, 270, '#1a1224');
  }
  ctx.globalAlpha = 1;
}

/** 烛光 */
function tdCandleLight(ctx, level, t) {
  if (level <= 0.01) return;
  const c = LAYOUT.cake;
  if (!c) return;
  const cx = c.x, cy = c.y - 18;
  ctx.globalAlpha = 0.16 * level;
  for (let r = 24; r > 0; r -= 3) P.ellipse(ctx, cx, cy, (r + 14) * 0.72, r, '#ffb45e');
  ctx.globalAlpha = 1;
}

/* ---------- 主绘制 ---------- */
function drawTopDownScene(ctx, t) {
  ctx.clearRect(0, 0, LOGIC_W, LOGIC_H);

  if (TD.bg) {
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(TD.bg, 0, 0, LOGIC_W, LOGIC_H);
    ctx.imageSmoothingEnabled = false;
  } else {
    P.r(ctx, 0, 0, LOGIC_W, LOGIC_H, '#caa079');
  }

  if (TD.scene === 'cottage') {
    tdCake(ctx, t);      // 只画蜡烛火焰（蛋糕本体在底图里）
    tdPets(ctx, t);
  }
  tdLighting(ctx, t);
}

/* ---------- 男主 NPC ---------- */
function tdNpcTop() {
  return NPC.visible ? NPC.y : -1;
}

function tdDrawNpc(ctx, t) {
  if (!NPC.visible) return;
  const s = TD.npcSpr || {};
  const idleSet = { down: s.idleS, up: s.idleU, left: s.idleL, right: s.idleR };
  const idle = idleSet[NPC.dir] || s.stand;
  const walk = { down: s.s, up: s.u, left: s.l, right: s.r }[NPC.dir];
  const useWalk = NPC.moving && walk;
  const img = useWalk ? walk : idle;
  if (!img) return;

  const fh = img.height;
  const fw = useWalk ? Math.round(img.width / 9) : img.width;
  const bob = NPC.moving ? 0 : Math.round(Math.sin(t * 2.1) * 1);
  const dx = Math.round(NPC.x - fw / 2);
  const dy = Math.round(NPC.y - fh + bob);

  P.ellipse(ctx, NPC.x, NPC.y + 1, fw * 0.30, 3.2, 'rgba(60,35,40,0.26)');
  ctx.imageSmoothingEnabled = false;
  if (useWalk) {
    const fi = Math.floor(NPC.animT * 10) % 9;
    ctx.drawImage(img, fi * fw, 0, fw, fh, dx, dy, fw, fh);
  } else {
    ctx.drawImage(img, dx, dy, fw, fh);
  }

  /* 头顶的小爱心，提示可以点 */
  const k = (Math.sin(t * 2.6) + 1) / 2;
  const hx = NPC.x, hy = NPC.y - fh - 7 + Math.round(k * 2);
  ctx.globalAlpha = 0.55 + 0.45 * k;
  P.r(ctx, hx - 2, hy - 1, 2, 2, '#ff8fa8');
  P.r(ctx, hx + 1, hy - 1, 2, 2, '#ff8fa8');
  P.r(ctx, hx - 1, hy + 1, 3, 1, '#ff8fa8');
  P.r(ctx, hx, hy + 2, 1, 1, '#ff8fa8');
  ctx.globalAlpha = 1;
}

/* ---------- 碰撞 ---------- */
function tdBlocked(x, y) {
  const W = LAYOUT.walk;
  const r = 7;
  if (x < W.x0 + r || x > W.x1 - r || y < W.y0 || y > W.y1) return true;
  for (const o of LAYOUT.obstacles) {
    if (x + r * 0.7 > o.x && x - r * 0.7 < o.x + o.w && y + 3 > o.y && y - 5 < o.y + o.h) return true;
  }
  return false;
}