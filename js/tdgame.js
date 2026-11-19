/* ============================================================
 *  tdgame.js — 正俯视版主循环
 *  状态机：title → play → wish → celebrate
 *  纯点击移动；点蛋糕走过去许愿
 * ============================================================ */

const VIEW = document.getElementById('game');
const vctx = VIEW.getContext('2d');
const BUF = mkCanvas(LOGIC_W, LOGIC_H);
const bctx = BUF.ctx;

const GIRL_NAME = '雪雪';
const AGE = 17;

const QS = new URLSearchParams(location.search);
let state = QS.get('scene') === 'play' ? 'play' : 'title';
let time = 0;
let stateT = 0;
let hintAlpha = 0;
let nearCake = false;

/* ---------- 角色 ---------- */
const player = {
  x: 258, y: 222, dir: 'down',
  pose: 'stand', poseId: null,
  moving: false, animT: 0, bob: 0,
  steerX: 0,
  steerY: 0,
};

let WALK = LAYOUT.walk;

function blocked(x, y) { return tdBlocked(x, y); }

/* 站位：木桌右边（面向左边，避免人物挡住蛋糕和蜡烛） */
let STAND = { x: 245, y: 185 };

function inTableZone(x, y) {
  const t = LAYOUT.table;
  if (!t) return false;
  return x > t.x - 10 && x < t.x + t.w + 14 && y > t.y - 8 && y < t.y + t.h + 30;
}

function checkNearCake() {
  nearCake = Math.abs(player.x - STAND.x) < 17 && Math.abs(player.y - STAND.y) < 22;
}

/* ---------- 可交互物件 ---------- */
/* hit: 点击命中框；stand: 走到这里再触发 */
const INTERACTS_BY_SCENE = {
  cottage: [
    { id: 'photo', label: '看看照片墙', hit: { x: 105, y: 25,  w: 90,  h: 65 },  stand: { x: 174, y: 156 }, face: 'up',    btn: { x: 150, y: 94 }  },
    { id: 'door',  label: '出门',       hit: { x: 232, y: 25,  w: 72,  h: 120 }, stand: { x: 252, y: 138 }, face: 'up',    btn: { x: 250, y: 152 } },
    { id: 'bed',   label: '睡觉',       hit: { x: 40,  y: 168, w: 120, h: 88 },  stand: { x: 178, y: 212 }, face: 'left',  btn: { x: 100, y: 152 } },
    { id: 'shelf', label: '看看书架',   hit: { x: 330, y: 45,  w: 86,  h: 90 },  stand: { x: 370, y: 145 }, face: 'up',    btn: { x: 370, y: 38 }  },
    { id: 'him',   label: '和他说说话', hit: { x: 386, y: 110, w: 26,  h: 86 },  stand: { x: 430, y: 200 }, face: 'left',  btn: { x: 400, y: 112 } },
    { id: 'flower',label: '勿忘我',     hit: { x: 98,  y: 82,  w: 34,  h: 60 },  stand: { x: 126, y: 162 }, face: 'up',    btn: { x: 114, y: 74 }  },
    { id: 'cat',   label: '摸摸猫',     hit: { x: 196, y: 138, w: 30,  h: 28 },  stand: { x: 210, y: 170 }, face: 'left',  btn: { x: 202, y: 140 } },
    { id: 'dog',   label: '摸摸狗',     hit: { x: 162, y: 148, w: 30,  h: 30 },  stand: { x: 176, y: 180 }, face: 'left',  btn: { x: 168, y: 150 } },
    { id: 'gift',  label: '打开礼物',   hit: { x: 172, y: 86,  w: 32,  h: 28 },  stand: { x: 204, y: 178 }, face: 'up',    btn: { x: 190, y: 78 }  },
    { id: 'letter',label: '读这封信',   hit: { x: 142, y: 94,  w: 32,  h: 24 },  stand: { x: 152, y: 150 }, face: 'up',    btn: { x: 166, y: 90 }  },
    { id: 'cake',  label: '吹蜡烛',     hit: { x: 285, y: 132, w: 56,  h: 40 },  stand: { x: 245, y: 185 }, face: 'right', btn: { x: 313, y: 126 } },
  ],
  beach: [
    { id: 'him',   label: '和他说说话', hit: { x: 272, y: 138, w: 30,  h: 74 },  stand: { x: 248, y: 212 }, face: 'right', btn: { x: 286, y: 130 } },
    { id: 'swing', label: '坐秋千',     hit: { x: 352, y: 84,  w: 92,  h: 104 }, stand: { x: 398, y: 196 }, face: 'up',    btn: { x: 398, y: 80 }  },
    { id: 'house', label: '回小屋',     hit: { x: 0,   y: 73,  w: 46,  h: 56 },  stand: { x: 72,  y: 150 }, face: 'up',    btn: { x: 23,  y: 66 }  },
    { id: 'sea',   label: '看海',       hit: { x: 60,  y: 96,  w: 300, h: 26 },  stand: { x: 212, y: 130 }, face: 'up',    btn: { x: 212, y: 88 }  },
  ],
};
let INTERACTS = INTERACTS_BY_SCENE.cottage;

function hitInteract(x, y) {
  for (let i = INTERACTS.length - 1; i >= 0; i--) {
    const h = INTERACTS[i].hit;
    if (x > h.x && x < h.x + h.w && y > h.y && y < h.y + h.h) return INTERACTS[i];
  }
  return null;
}

/* 靠近哪个可交互物件（站着就会冒出互动按钮） */
let NEAR = null;
/* 玩家点了某件东西走过来 → 到达后把互动键锁给它，直到他再点别处/走开 */
let NEAR_LOCK = null;
const BTN_R = 11;
function btnPos(it) {
  /* 每个物件显式给按钮位置，必须紧贴物件本体（用户要求：交互键要离物品很近） */
  if (it.btn) return it.btn;
  const h = it.hit;
  return { x: h.x + h.w / 2, y: h.y - 8 };
}
function _dbg() {
  window.__DBG = {
    state: state,
    x: Math.round(player.x), y: Math.round(player.y),
    near: NEAR && NEAR.id,
    pose: player.pose,
    tap: { a: TAP.active, tx: Math.round(TAP.tx), ty: Math.round(TAP.ty), via: TAP.via },
    n: INTERACTS.length,
  };
}

function updateNear() {
  NEAR = null;
  if (state === 'wish') return;
  if (state !== 'play') return;
  /* 点的是哪件东西，走到它跟前就把互动键锁给它：
     书桌前面花 / 照片墙 / 信 / 狗 的站位点挨得太近，只看「最近的那个」会抢错 */
  if (NEAR_LOCK) {
    const lock = INTERACTS.find((o) => o.id === NEAR_LOCK);
    if (lock && Math.hypot(player.x - lock.stand.x, player.y - lock.stand.y) < 42) {
      NEAR = lock;
      return;
    }
    /* 还没走到就先用「最近的」兜底，但锁保留 —— 由下一次点击决定换不换 */
  }
  let bestD = 1e9;
  for (const it of INTERACTS) {
    const isHim = it.id === 'him';
    /* 他的站位点一直在动，直接按两个人的距离算，靠过去就算到 */
    const d = isHim
      ? Math.hypot(player.x - NPC.x, player.y - NPC.y)
      : Math.hypot(player.x - it.stand.x, player.y - it.stand.y);
    const lim = isHim ? (NPC.linked ? 72 : 42) : 26;
    if (d < lim && d < bestD) { bestD = d; NEAR = it; }
  }
}
/* 互动按钮走 DOM：480x270 画布上写中文会糊，DOM 标签清楚 */
const _actEl = () => document.getElementById('act');
function _act2El() { return document.getElementById('act2'); }

function updateAct() {
  const el = _actEl();
  const el2 = _act2El();
  if (!el) return;
  if (state === 'wish') {
    if (el2) el2.classList.remove('show');
    if (!wishReady) { el.classList.remove('show'); return; }
    const pW = logicToScreen(240, 270 * 0.93);
    el.style.left = pW.x + 'px';
    el.style.top = pW.y + 'px';
    const sp = el.firstElementChild;
    if (sp && sp.textContent !== '吹蜡烛') sp.textContent = '吹蜡烛';
    el.classList.add('show');
    return;
  }
  if (!NEAR || state !== 'play') {
    el.classList.remove('show');
    if (el2) el2.classList.remove('show');
    return;
  }
  const b = btnPos(NEAR);
  const bs = logicToScreen(b.x, b.y);
  const px = bs.x;
  const py = bs.y;
  el.style.left = px + 'px';
  el.style.top = py + 'px';
  const sp = el.firstElementChild;
  if (sp && sp.textContent !== NEAR.label) sp.textContent = NEAR.label;
  el.classList.add('show');

  /* 他在旁边时多给一个「说说话」，牵手和聊天不打架 */
  if (el2) {
    if (NEAR.id === 'him' && TD.scene !== 'beach') {
      el2.style.left = px + 'px';
      el2.style.top = (py + 32) + 'px';
      const sp2 = el2.firstElementChild;
      if (sp2 && sp2.textContent !== '说说话') sp2.textContent = '说说话';
      el2.classList.add('show');
    } else {
      el2.classList.remove('show');
    }
  }
}
function bindAct() {
  const el = _actEl();
  if (el && !el.dataset.bound) {
    el.dataset.bound = '1';
    el.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      /* 许愿特写里 NEAR 已被清空，这个按钮就是「吹蜡烛」 */
      if (state === 'wish') {
        el.classList.remove('show');
        blowCandles();
        return;
      }
      if (!NEAR) return;
      const id = NEAR.id;
      NEAR = null;
      el.classList.remove('show');
      const e2 = _act2El();
      if (e2) e2.classList.remove('show');
      runInteract(id);
    });
  }
  const el2 = _act2El();
  if (el2 && !el2.dataset.bound) {
    el2.dataset.bound = '1';
    el2.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (!NEAR) return;
      el.classList.remove('show');
      el2.classList.remove('show');
      if (typeof DIALOG !== 'undefined') DIALOG.open(TD.scene);
    });
  }
}

/* 底部小提示（走 DOM，字更清楚） */
let _toastTimer = 0;
function hideToast() {
  const el = document.getElementById('toast');
  if (el) el.classList.remove('show');
  clearTimeout(_toastTimer);
}
let _hintOn = false;
function syncHint() {
  const on = false;   /* 有互动按钮了，旧的「轻点蛋糕」提示条不再用 */
  if (on === _hintOn) return;
  _hintOn = on;
  const el = document.getElementById('hint');
  if (el) el.classList.toggle('show', on);
}

function showToast(txt) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = txt;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 2300);
}

/* ---------- 输入 ---------- */
const TAP = { active: false, tx: 240, ty: 208, via: null, path: [], pi: 0 };

function toLogic(clientX, clientY) {
  if (VIEW_ROT) {
    /* 画面顺时针转了 90°：屏幕上的 (dx,dy) 逆向映射回 canvas 本地坐标 */
    const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    const u = (clientY - cy) + VIEW_W / 2;
    const v = -(clientX - cx) + VIEW_H / 2;
    return { x: (u / VIEW_W) * LOGIC_W, y: (v / VIEW_H) * LOGIC_H };
  }
  const r = VIEW.getBoundingClientRect();
  return {
    x: ((clientX - r.left) / r.width) * LOGIC_W,
    y: ((clientY - r.top) / r.height) * LOGIC_H,
  };
}

/* 右上角音乐唱片按钮（逻辑坐标，圆形命中） */
const MUSIC_BTN = { x: 450, y: 4, w: 24, h: 24 };
const MUSIC_C = { x: MUSIC_BTN.x + MUSIC_BTN.w / 2, y: MUSIC_BTN.y + MUSIC_BTN.h / 2 };
const MUSIC_R = 12;

/* 唱片左边那颗「切歌」键 */
const NEXT_C = { x: 434, y: 15 };
const NEXT_R = 9;
function inNextBtn(x, y) {
  const dx = x - NEXT_C.x, dy = y - NEXT_C.y;
  return dx * dx + dy * dy <= NEXT_R * NEXT_R;
}

function inMusicBtn(x, y) {
  const dx = x - MUSIC_C.x, dy = y - MUSIC_C.y;
  return dx * dx + dy * dy <= MUSIC_R * MUSIC_R;
}

function onPointerDown(e) {
  if (e.cancelable) e.preventDefault();
  /* 弹窗打开时不让画面跟着点 */
  if (typeof DIALOG !== 'undefined' && DIALOG.isOpen()) return;
  if (typeof GIFT !== 'undefined' && GIFT.isOpen && GIFT.isOpen()) return;
  const p = toLogic(e.clientX, e.clientY);

  if (inNextBtn(p.x, p.y)) {
    AU.unlock();
    if (state === 'wish') return;
    if (AU.isMuted()) AU.setMuted(false);
    if (typeof BGM !== 'undefined' && BGM.next) BGM.next();
    musicPop = 1;
    nextPop = 1;
    return;
  }

  if (inMusicBtn(p.x, p.y)) {
    AU.unlock();
    /* 许愿时放的是生日歌，别让唱片把它抢掉 */
    if (state === 'wish') return;
    if (AU.isMuted()) AU.setMuted(false);
    if (typeof BGM !== 'undefined' && BGM.toggle) BGM.toggle();
    musicPop = 1;
    return;
  }

  if (state === 'title') { startPlay(); return; }
  if (state === 'celebrate' && stateT > 1.6) {
    resetAll();
    AU.startAmbience();
    state = 'play';
    stateT = 0;
    npcSpawnAt(TD.scene);
    buildNav();
    bindAct();
    if (typeof BGM !== 'undefined') BGM.play();
    return;
  }
  if (state !== 'play') return;

  /* 躺着/坐着时先站起来 */
  if (player.pose !== 'stand') {
    const prev = INTERACTS.find((o) => o.id === player.poseId);
    player.pose = 'stand';
    player.poseId = null;
    if (prev) {
      player.x = prev.stand.x;
      player.y = prev.stand.y;
      if (prev.face) player.dir = prev.face;
    }
  }

  const hit = hitInteract(p.x, p.y);
  if (hit) {
    NEAR_LOCK = hit.id;             /* 点谁就锁谁，走到跟前出对应的互动键 */
    startWalk(hit.stand.x, hit.stand.y, hit.id);
    return;
  }

  if (inTableZone(p.x, p.y)) {
    NEAR_LOCK = 'cake';
    startWalk(STAND.x, STAND.y, 'cake');
    return;
  }
  NEAR_LOCK = null;

  startWalk(
    Math.max(WALK.x0, Math.min(WALK.x1, p.x)),
    Math.max(WALK.y0, Math.min(WALK.y1, p.y)),
    null
  );
}

/* ---------- 网格寻路：避免直线穿过大桌子卡在桌角 ---------- */
const NAV = 6;
let navG = null, navW = 0, navH = 0;
function buildNav() {
  navW = Math.ceil(480 / NAV);
  navH = Math.ceil(270 / NAV);
  navG = new Uint8Array(navW * navH);
  for (let gy = 0; gy < navH; gy++) {
    for (let gx = 0; gx < navW; gx++) {
      const cx = gx * NAV + NAV / 2;
      const cy = gy * NAV + NAV / 2;
      navG[gy * navW + gx] = blocked(cx, cy) ? 1 : 0;
    }
  }
}
function _cellOf(x, y) {
  return [
    Math.max(0, Math.min(navW - 1, Math.floor(x / NAV))),
    Math.max(0, Math.min(navH - 1, Math.floor(y / NAV))),
  ];
}
function _nearestFree(gx, gy) {
  if (!navG[gy * navW + gx]) return [gx, gy];
  for (let r = 1; r <= 8; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const nx = gx + dx, ny = gy + dy;
        if (nx < 0 || ny < 0 || nx >= navW || ny >= navH) continue;
        if (!navG[ny * navW + nx]) return [nx, ny];
      }
    }
  }
  return [gx, gy];
}
function findPath(sx, sy, tx, ty) {
  if (!navG) buildNav();
  const s0 = _nearestFree(..._cellOf(sx, sy));
  const g0 = _nearestFree(..._cellOf(tx, ty));
  const N = navW * navH;
  const si = s0[1] * navW + s0[0];
  const gi = g0[1] * navW + g0[0];
  if (si === gi) return [];
  const prev = new Int32Array(N).fill(-2);
  prev[si] = -1;
  const q = [si];
  let head = 0, found = false;
  while (head < q.length && !found) {
    const cur = q[head++];
    const cx = cur % navW, cy = (cur / navW) | 0;
    const nb = [
      cx + 1 < navW ? cur + 1 : -1,
      cx - 1 >= 0 ? cur - 1 : -1,
      cy + 1 < navH ? cur + navW : -1,
      cy - 1 >= 0 ? cur - navW : -1,
    ];
    for (let k = 0; k < 4; k++) {
      const ni = nb[k];
      if (ni < 0 || prev[ni] !== -2 || navG[ni]) continue;
      prev[ni] = cur;
      if (ni === gi) { found = true; break; }
      q.push(ni);
    }
  }
  if (prev[gi] === -2) return [];
  const out = [];
  let c = gi;
  while (c !== -1 && c !== si) {
    out.push([(c % navW) * NAV + NAV / 2, (((c / navW) | 0)) * NAV + NAV / 2]);
    c = prev[c];
  }
  out.reverse();
  return out;
}
function startWalk(tx, ty, via) {
  TAP.tx = tx;
  TAP.ty = ty;
  TAP.via = via || null;
  TAP.path = findPath(player.x, player.y, tx, ty);
  TAP.path.push([tx, ty]);        // 最后精确落在目标点
  TAP.pi = 0;
  TAP.active = true;
}

VIEW.addEventListener('pointerdown', onPointerDown);
/* 鼠标移到唱片上换成小手，并在绘制里描一圈边，提示这里能点 */
VIEW.addEventListener('pointermove', (e) => {
  const p = toLogic(e.clientX, e.clientY);
  musicHover = inMusicBtn(p.x, p.y);
  nextHover = inNextBtn(p.x, p.y);
  VIEW.style.cursor = (musicHover || nextHover) ? 'pointer' : '';
});
VIEW.addEventListener('pointerleave', () => { musicHover = false; nextHover = false; VIEW.style.cursor = ''; });

function steerToTarget() {
  if (!TAP.active || state !== 'play' || player.pose !== 'stand') {
    player.steerX = 0;
    player.steerY = 0;
    return;
  }
  while (TAP.pi < TAP.path.length) {
    const wp = TAP.path[TAP.pi];
    const d = Math.hypot(wp[0] - player.x, wp[1] - player.y);
    if (d < 5) { TAP.pi++; continue; }
    player.steerX = (wp[0] - player.x) / d;
    player.steerY = (wp[1] - player.y) / d;
    return;
  }
  TAP.active = false;
  player.steerX = 0;
  player.steerY = 0;
  /* 走到位后不再自动触发，靠近会浮出文字按钮，点按钮才互动 */
  if (TAP.via) {
    const it = INTERACTS.find((o) => o.id === TAP.via);
    if (it && it.face) player.dir = it.face;
    if (!NEAR_LOCK) NEAR_LOCK = TAP.via;
    TAP.via = null;
  }
}

/* ---------- 交互 ---------- */
function runInteract(id) {
  if (state === 'wish') { blowCandles(); return; }
  if (state !== 'play') return;

  if (id === 'cake') { tryInteract(); return; }

  const it = INTERACTS.find((o) => o.id === id);
  if (it && it.face) player.dir = it.face;

  if (id === 'him') {
    /* 室外：不牵手，直接跟他聊海和以后 */
    if (TD.scene === 'beach') {
      AU.tap();
      if (typeof DIALOG !== 'undefined') DIALOG.open('beach');
      return;
    }
    if (NPC.linked) {
      NPC.linked = false;
      AU.tap();
      showToast('手松开了，他还站在原地看你。');
    } else {
      NPC.linked = true;
      AU.spark();
      showToast('他握住你的手，说「走吧，我跟着你。」');
    }
    return;
  }
  if (id === 'gift') {
    AU.tap();
    startGiftOpen();
    return;
  }
  if (id === 'door') {
    goScene('beach', { x: 210, y: 226, dir: 'down' });
    return;
  }
  if (id === 'house') {
    goScene('cottage', { x: 250, y: 175, dir: 'up' });
    return;
  }
  if (id === 'swing') {
    AU.tap();
    player.moving = false;
    player.pose = 'sit';
    player.poseId = 'swing';
    player.x = 402;
    player.y = 163;
    player.dir = 'down';
    showToast('秋千慢慢晃起来，落日刚好落在海面上');
    return;
  }
  if (id === 'sea') {
    AU.spark();
    showToast('海水漫过脚背，凉凉的');
    return;
  }
  if (id === 'chair') {
    AU.tap();
    player.pose = 'sit';
    player.poseId = 'chair';
    player.x = 77;
    player.y = 116;
    player.dir = 'down';
    showToast('坐一会儿，窗帘的影子在地板上晃');
    return;
  }
  if (id === 'photo') {
    AU.chimeUp();
    const openWall = () => {
      if (typeof PWALL !== 'undefined' && PWALL.open) PWALL.open();
      else if (typeof GIFT !== 'undefined') GIFT.openPhoto();
    };
    if (typeof NOTE !== 'undefined') {
      NOTE.show({ text: '这是我们之间的回忆（＾ω＾）', onClose: openWall });
    } else openWall();
    return;
  }
  if (id === 'dog' || id === 'cat') {
    AU.voice(id);
    if (typeof NOTE !== 'undefined') NOTE.show({ text: PET_LINE });
    else showToast(PET_LINE);
    return;
  }
  if (id === 'shelf') {
    showToast('书架上全是你爱看的书');
    return;
  }
  if (id === 'flower') {
    AU.tap();
    const line = '我问你喜欢什么花，你说最有印象的是勿忘我，那我希望你也不要忘记我呀QAQ';
    if (typeof NOTE !== 'undefined') {
      NOTE.show({ text: line, img: 'assets/photos/flower.jpg', ph: '花的照片待插入', ratio: '1080 / 1051', fit: 'contain' });
    } else showToast(line);
    return;
  }
  if (id === 'letter') {
    AU.chimeUp();
    const body = '雪雪：\n\n生日快乐呀。\n\n你说最有印象的花是勿忘我，我记住了。窗边那束就是——看见它的时候，也顺便想起我一下。\n\n以后每年的这一天，我都想坐在你旁边，看你把蜡烛一根一根吹灭。\n\n—— 一直站在你旁边的人';
    if (typeof NOTE !== 'undefined') {
      NOTE.show({
        tag: 'A LETTER FOR YOU',
        text: body,
        img: 'assets/photos/letter.png',
        ph: '信的照片待插入',
        ratio: '3 / 4',
        maxW: '192px',
      });
    } else showToast('桌上有封信，是写给你的');
    return;
  }
  if (id === 'bed') {
    AU.tap();
    player.pose = 'sleep';
    player.poseId = 'bed';
    player.x = 140;
    player.y = 196;
    player.dir = 'down';
    showToast('被子有晒过太阳的味道，好暖和。');
    return;
  }
}

/* ---------- 场景切换（室内 ↔ 沙滩） ---------- */
function goScene(id, spawn) {
  if (TD.scene === id) return;
  hideToast();
  AU.spark();
  tdFadeTo(() => {
    tdSetScene(id);
    LAYOUT = SCENE_DEF[id];
    WALK = LAYOUT.walk;
    INTERACTS = INTERACTS_BY_SCENE[id];
    if (LAYOUT.cake) STAND = INTERACTS_BY_SCENE.cottage.find((o) => o.id === 'cake').stand;
    player.x = spawn.x;
    player.y = spawn.y;
    player.dir = spawn.dir;
    player.moving = false;
    player.animT = 0;
    player.steerX = 0;
    player.steerY = 0;
    TAP.active = false;
    TAP.path = [];
    npcSpawnAt(id);
    buildNav();
    if (id === 'beach') setTimeout(() => { if (state === 'play') showToast('外面就是海。傍晚的风很软。'); }, 700);
  });
}

function tryInteract() {
  checkNearCake();
  if (!nearCake || state !== 'play') return;
  state = 'wish';
  stateT = 0;
  wishReady = false;
  CAKE.lit = true;
  CAKE.out = false;
  /* 许愿特写里她转成正面对镜头：侧身时合掌的手会被身体挡住看不见 */
  player.dir = 'down';
  /* 他站到她左手边，看着她许愿 */
  NPC.visible = true;
  NPC.moving = false;
  NPC.x = player.x - 26;
  NPC.y = player.y + 6;
  NPC.dir = 'right';
  hideToast();
  AU.spark();
  AU.stopAmbience();
  if (typeof BGM !== 'undefined') BGM.pause();     /* 全局音乐让位给生日歌 */
  setTimeout(() => { if (state === 'wish') AU.playSong(0.6); }, 500);
}

/* 15 秒到了、用户点了「吹蜡烛」 */
function blowCandles() {
  if (state !== 'wish' || !wishReady) return;
  wishReady = false;
  CAKE.lit = false;
  CAKE.out = true;
  CAKE.level = 0;
  state = 'celebrate';
  stateT = 0;
  spawnConfetti(140);
  AU.blow();
  AU.chimeUp();
  setTimeout(() => AU.firework(1), 180);
  fwTimer = 1.1;
  if (typeof BGM !== 'undefined') BGM.play();      /* 吹完还原：全局音乐回来 */
  const el = _actEl();
  if (el) el.classList.remove('show');
}

const CAKE = { lit: false, out: false, level: 0 };
const WISH_DUR = 15;

/* 拆礼物盒动画（在 canvas 上播完再开卡片） */
let giftAnim = null;   // { t, dur }
let giftIdx = 0;       // 下一件要开的礼物

const PET_LINE = '以后我们有自己的小家了就可以一起养你喜欢的狗狗和猫猫了呀OvO ♥';          /* 许愿特写持续 15 秒，之后才出现「吹蜡烛」 */
let wishReady = false;

let confetti = [];
let fwTimer = 0;
function spawnConfetti(n) {
  const cols = ['#ffd9e2', '#fff3d0', '#ffb3c6', '#c9d8ff', '#ffe9a8', '#e3d0f2'];
  for (let i = 0; i < n; i++) {
    confetti.push({
      x: Math.random() * LOGIC_W,
      y: -8 - Math.random() * 60,
      vx: (Math.random() - 0.5) * 26,
      vy: 26 + Math.random() * 46,
      w: 2 + (Math.random() < 0.4 ? 1 : 0),
      h: 2 + (Math.random() < 0.5 ? 1 : 0),
      rot: Math.random() * Math.PI * 2,
      rs: (Math.random() - 0.5) * 7,
      c: cols[(Math.random() * cols.length) | 0],
      life: 1 + Math.random() * 0.8,
    });
  }
}

function resetAll() {
  confetti = [];
  fwTimer = 0;
  CAKE.lit = false;
  CAKE.out = false;
  CAKE.level = 0;
  if (TD.scene !== 'cottage') {
    tdSetScene('cottage');
    LAYOUT = SCENE_DEF.cottage;
    WALK = LAYOUT.walk;
    INTERACTS = INTERACTS_BY_SCENE.cottage;
    STAND = INTERACTS_BY_SCENE.cottage.find((o) => o.id === 'cake').stand;
  }
  player.x = 198;
  player.y = 195;
  player.dir = 'down';
  TAP.active = false;
  TAP.path = [];
  npcSpawnAt(TD.scene);
  buildNav();
}

/* ---------- 男主跟随 / 牵手 ---------- */
const NPC_SPEED = 122;

function updateNpc(dt) {
  if (!NPC.visible && TD.scene) { /* 还没初始化 */ }
  if (!NPC.visible) return;

  /* 把他要交互的那条记录同步到他的实时位置 */
  const him = INTERACTS.find((o) => o.id === 'him');
  if (him) {
    him.hit.x = NPC.x - 18;
    him.hit.y = NPC.y - 58;
    him.hit.w = 36;
    him.hit.h = 60;
    {
      const cand = [
        { x: NPC.x - 32, y: NPC.y + 10 },
        { x: NPC.x + 32, y: NPC.y + 10 },
        { x: NPC.x, y: NPC.y + 34 },
      ];
      const pick = cand.find((c) => !blocked(c.x, c.y)) || cand[2];
      him.stand.x = pick.x;
      him.stand.y = pick.y;
    }
    him.btn.x = NPC.x;
    him.btn.y = NPC.y - 68;
    him.label = (TD.scene === 'beach') ? '和他说说话' : (NPC.linked ? '松开手' : '牵他的手');
  }

  /* 没牵手的时候他就站在原地等，别满屋子追着跑 */
  if (!NPC.linked) {
    NPC.moving = false;
    NPC.animT = 0;
    const px = player.x - NPC.x, py = player.y - NPC.y;
    if (Math.hypot(px, py) < 120) {
      if (Math.abs(px) > Math.abs(py)) NPC.dir = px < 0 ? 'left' : 'right';
      else NPC.dir = py < 0 ? 'up' : 'down';
    }
    return;
  }

  /* 牵手时贴在她侧后方：x 侧偏 34，y 略靠后（排序时先画，被她的身体盖住一点） */
  const side = player.dir === 'right' ? -34 : 34;
  const tx = player.x + side;
  const ty = player.y - 8;

  /* 目标可能被家具挡着（桌子/床），直线走不通就每 0.35s 用 BFS 重算一段路 */
  NPC.pathT = (NPC.pathT || 0) - dt;
  const goalMoved = !NPC.goal || Math.hypot(NPC.goal.x - tx, NPC.goal.y - ty) > 24;
  if (goalMoved || NPC.pathT <= 0 || !NPC.path || !NPC.path.length) {
    NPC.pathT = 0.35;
    NPC.goal = { x: tx, y: ty };
    NPC.path = findPath(NPC.x, NPC.y, tx, ty) || [];
    if (NPC.path.length > 24) NPC.path.length = 24;
  }
  let wx = tx, wy = ty;
  if (NPC.path && NPC.path.length) {
    while (NPC.path.length && Math.hypot(NPC.path[0][0] - NPC.x, NPC.path[0][1] - NPC.y) < 5) NPC.path.shift();
    if (NPC.path.length) { wx = NPC.path[0][0]; wy = NPC.path[0][1]; }
  }

  const dx = wx - NPC.x, dy = wy - NPC.y;
  const dist = Math.hypot(dx, dy);
  if (dist > 1.8) {
    const step = Math.min(dist, NPC_SPEED * dt);
    const nx = NPC.x + (dx / dist) * step;
    const ny = NPC.y + (dy / dist) * step;
    if (!blocked(nx, ny)) { NPC.x = nx; NPC.y = ny; }
    else if (!blocked(nx, NPC.y)) { NPC.x = nx; }
    else if (!blocked(NPC.x, ny)) { NPC.y = ny; }
    NPC.moving = true;
    NPC.animT += dt;
    if (Math.abs(dx) > Math.abs(dy)) NPC.dir = dx < 0 ? 'left' : 'right';
    else NPC.dir = dy < 0 ? 'up' : 'down';
  } else {
    NPC.moving = false;
    NPC.animT = 0;
    if (!NPC.linked) {
      const px = player.x - NPC.x, py = player.y - NPC.y;
      if (Math.abs(px) > Math.abs(py)) NPC.dir = px < 0 ? 'left' : 'right';
      else if (Math.abs(py) > 2) NPC.dir = py < 0 ? 'up' : 'down';
    } else {
      NPC.dir = player.dir;
    }
  }
}

/* ---------- 更新 ---------- */
function update(dt) {
  time += dt;
  stateT += dt;

  if (CAKE.lit) CAKE.level = Math.min(1, CAKE.level + dt * 1.6);

  /* 唱片的转速按秒算，别按帧 —— 144Hz 屏上按帧加会快出两倍多 */
  const _on = (typeof BGM !== 'undefined' && BGM.isOn) ? BGM.isOn() : false;
  musicSpin += ((_on ? 1 : 0) - musicSpin) * Math.min(1, dt * 8);
  musicAng = (musicAng + musicSpin * 0.80 * dt) % (Math.PI * 2);

  for (let i = confetti.length - 1; i >= 0; i--) {
    const c = confetti[i];
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    c.vy += 14 * dt;
    c.rot += c.rs * dt;
    c.life -= dt * 0.10;
    if (c.y > LOGIC_H + 24 || c.life <= 0) confetti.splice(i, 1);
  }

  updateGiftAnim(dt);

  if (state === 'wish') {
    hideToast();
    if (!wishReady && stateT >= WISH_DUR) {
      wishReady = true;
      AU.chimeUp();
    }
    updateAct();
    return;
  }
  if (state === 'celebrate') {
    if (Math.random() < dt * 2.2) spawnConfetti(5);
    /* 稀疏的礼花噼啪，别盖住生日歌 */
    fwTimer -= dt;
    if (fwTimer <= 0 && stateT < 12) {
      fwTimer = 1.3 + Math.random() * 1.6;
      AU.firework(0.32);
    }
    return;
  }
  if (state !== 'play') return;

  let dx = player.steerX || 0;
  let dy = player.steerY || 0;
  const len = Math.hypot(dx, dy);
  player.moving = len > 0.01;

  if (player.moving) {
    dx /= len; dy /= len;
    const speed = 96;
    const nx = player.x + dx * speed * dt;
    const ny = player.y + dy * speed * dt;
    if (!blocked(nx, player.y)) { player.x = nx; }
    if (!blocked(player.x, ny)) { player.y = ny; }
    /* 两轴都动不了才算走不通（单轴能滑就贴着障碍绕过去） */
    if (blocked(nx, player.y) && blocked(nx, ny) && blocked(player.x, ny) && TAP.active) TAP.pi++;

    if (Math.abs(dx) > Math.abs(dy)) player.dir = dx > 0 ? 'right' : 'left';
    else player.dir = dy > 0 ? 'down' : 'up';

    player.animT += dt * 9;
    player.bob = 0;
  } else {
    player.animT = 0;
    player.bob = 0;
    player.steerX = 0;
    player.steerY = 0;
  }

  updateNpc(dt);
  checkNearCake();
  hintAlpha += ((nearCake ? 1 : 0) - hintAlpha) * Math.min(1, dt * 12);
  updateNear();
  updateAct();
  _dbg();
}

/* ---------- 靠近时浮出的互动按钮 ---------- */
function drawNearBtn(ctx, t) {
  if (!NEAR || state !== 'play') return;
  const b = btnPos(NEAR);
  const k = (Math.sin(t * 4.2) + 1) / 2;

  ctx.globalAlpha = 0.14 + 0.14 * k;
  P.ellipse(ctx, b.x, b.y, 10 + k * 1.6, 10 + k * 1.6, '#ffb6c8');
  ctx.globalAlpha = 1;

  P.ellipse(ctx, b.x, b.y + 1, 7.6, 7.6, 'rgba(120,60,80,0.18)');
  P.ellipse(ctx, b.x, b.y, 7.6, 7.6, '#ffffff');
  P.ellipse(ctx, b.x, b.y, 6.4, 6.4, '#ffd9e4');
  P.ellipse(ctx, b.x, b.y - 0.6, 5.4, 5.4, '#ffeef4');

  // 里面一颗小爱心
  P.r(ctx, b.x - 2, b.y - 3, 2, 2, '#e8547a');
  P.r(ctx, b.x + 1, b.y - 3, 2, 2, '#e8547a');
  P.r(ctx, b.x - 1, b.y - 1, 3, 2, '#e8547a');
  P.r(ctx, b.x, b.y + 1, 1, 1, '#e8547a');
}

/* ---------- 渲染 ---------- */
function drawPlayerSprite(ctx, t) {
  if (state === 'wish') { drawHeroPray(ctx, player.x, player.y, player.dir, t); return; }
  if (player.pose === 'sleep') drawHeroLie(ctx, player.x, player.y, player.dir);
  else if (player.pose === 'sit') {
    /* 秋千上的人跟着一起轻轻荡，幅度很小，别晕 */
    const sy = player.poseId === 'swing' ? player.y + Math.sin(t * 1.5) * 1.6 : player.y;
    drawHeroSit(ctx, player.x, sy, player.dir, t, player.poseId === 'swing');
  }
  else drawHeroSprite(ctx, player.x, player.y, player.dir, player.moving, player.animT);
}

function render() {
  const t = time;

  drawTopDownScene(bctx, t);
  if (TD.scene === 'cottage') { drawLetter(bctx, t); drawCakeAge(bctx, t); }

  /* 坐着时身下透出的一圈粉坐垫（只限室内那把椅子，秋千上不要） */
  if (player.pose === 'sit' && player.poseId === 'chair') {
    P.ellipse(bctx, player.x, player.y + 2.4, 13, 4.8, 'rgba(120,60,80,0.16)');
    P.ellipse(bctx, player.x, player.y + 0.8, 12.4, 4.2, '#f7bfd2');
    P.ellipse(bctx, player.x, player.y - 0.4, 10.4, 3.1, '#ffd9e6');
  }

  /* 脚下的影子（躺着/坐着各有自己的处理） */
  if (player.pose === 'stand') {
    P.ellipse(bctx, player.x, player.y + 1.2, 10, 3.4, 'rgba(92,52,62,0.20)');
    P.ellipse(bctx, player.x, player.y + 0.8, 7, 2.3, 'rgba(92,52,62,0.16)');
  }

  /* 角色按 y 排序：谁脚底更低谁后画（盖住前面的人） */
  const npcY = (typeof tdNpcTop === 'function') ? tdNpcTop() : -1;
  if (npcY >= 0 && player.y < npcY) {
    drawPlayerSprite(bctx, t);
    tdDrawNpc(bctx, t);
  } else {
    tdDrawNpc(bctx, t);
    drawPlayerSprite(bctx, t);
  }


  // 点蜡烛的暖光盖在最上
  if (CAKE.level > 0) tdCandleLight(bctx, CAKE.level, t);

  drawGiftAnim(bctx, t);

  // 礼花
  confetti.forEach((c) => {
    bctx.save();
    bctx.globalAlpha = Math.max(0, Math.min(1, c.life));
    bctx.translate(c.x, c.y);
    bctx.rotate(c.rot);
    P.r(bctx, -c.w / 2, -c.h / 2, c.w, c.h, c.c);
    bctx.restore();
  });

  // 交互提示改走 DOM（#hint），字号清楚、不压角色
  syncHint();

  if (state === 'title') drawTitle(bctx, t);
  if (state === 'wish') { wishShot(bctx, t); drawWishBubble(bctx, t); drawWish(bctx, t); }
  if (state === 'celebrate') drawCelebrate(bctx, t);
  drawMusicDisc(bctx, t);
  drawNextBtn(bctx, t);
  tdDrawFade(bctx, t);

  vctx.imageSmoothingEnabled = false;
  vctx.clearRect(0, 0, VIEW.width, VIEW.height);
  vctx.drawImage(BUF.canvas, 0, 0);
}

/* ---------- 右上角音乐唱片 ---------- */
let musicAng = 0;     // 唱片当前角度
let musicSpin = 0;    // 转速缓动（0 停 / 1 转）
let musicPop = 0;     // 按下脉冲
let musicHover = false;
let nextHover = false;
let nextPop = 0;
let _discSpr = null;

/* 26x26 像素唱片精灵：黑胶盘 + 沟槽 + 粉色标签 + 一道斜高光 */
function musicDiscSprite() {
  if (_discSpr) return _discSpr;
  const S = 26, R = 12.2, mid = S / 2;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const g = c.getContext('2d');
  const put = (x, y, col) => { g.fillStyle = col; g.fillRect(x, y, 1, 1); };
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = x + 0.5 - mid, dy = y + 0.5 - mid;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > R) continue;
      const a = Math.atan2(dy, dx);
      const ring = Math.floor(d);
      let col;
      if (d > R - 1.2) col = '#2a1b2e';                              // 盘边
      else if (d > 3.5) {
        /* 黑胶盘面：一圈圈同心沟槽 */
        col = (ring % 2 === 0) ? '#191020' : '#241a2a';
        /* 斜上方一道反光带，转起来才看得出在转 */
        let da = a - 2.25;
        if (da > Math.PI) da -= Math.PI * 2;
        if (da < -Math.PI) da += Math.PI * 2;
        if (Math.abs(da) < 0.44) col = (ring % 2 === 0) ? '#5a4162' : '#6f5480';
        if (Math.abs(da) < 0.18) col = '#8b6c98';
      } else if (d > 2.9) col = '#ff9fc4';                           // 粉色标签
      else if (d > 1.5) col = '#ffd3e4';
      else col = '#3a2334';                                          // 中心孔
      put(x, y, col);
    }
  }
  _discSpr = c;
  return c;
}

function drawMusicDisc(ctx, t) {
  const cx = MUSIC_C.x, cy = MUSIC_C.y;
  const on = (typeof BGM !== 'undefined' && BGM.isOn) ? BGM.isOn() : false;

  musicPop *= 0.86;

  /* 播放中：粉色呼吸柔光 */
  if (on) {
    ctx.save();
    ctx.globalAlpha = 0.14 + 0.05 * Math.sin(t * 3.1);
    ctx.beginPath();
    ctx.arc(cx, cy, 13.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ff9ec2';
    ctx.fill();
    ctx.restore();
  }

  /* 卡座底盘（很淡，别在粉墙上压出暗斑） */
  ctx.save();
  ctx.globalAlpha = on ? 0.42 : 0.32;
  ctx.beginPath();
  ctx.arc(cx, cy, 13, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(26,16,28,0.62)';
  ctx.fill();
  ctx.restore();

  /* 唱片本体：跟着 musicAng 转 */
  const spr = musicDiscSprite();
  const pop = 1 + musicPop * 0.12;
  ctx.save();
  ctx.globalAlpha = on ? 1 : 0.62;     /* 暂停时压暗，一眼看出没在放 */
  ctx.translate(cx, cy);
  ctx.rotate(musicAng);
  ctx.scale(pop, pop);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(spr, -spr.width / 2, -spr.height / 2);
  ctx.restore();

  /* 暂停时中心一枚奶白播放三角（带深色描边，压在粉标签上也看得清） */
  if (!on) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx - 2.2, cy - 3.6);
    ctx.lineTo(cx + 3.6, cy);
    ctx.lineTo(cx - 2.2, cy + 3.6);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,250,246,0.98)';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(52,26,42,0.85)';
    ctx.stroke();
    ctx.restore();
  }

  /* 悬停：外圈一层淡淡的高亮边 */
  if (musicHover) {
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = '#ffe0ec';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 12.6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

/* 切歌键：小圆底 + 像素「▶|」图标，按下有一点弹 */
function drawNextBtn(ctx, t) {
  const cx = NEXT_C.x, cy = NEXT_C.y;
  const on = (typeof BGM !== 'undefined' && BGM.isOn) ? BGM.isOn() : false;
  nextPop *= 0.84;
  const s = 1 + nextPop * 0.16;

  ctx.save();
  ctx.globalAlpha = on ? 0.5 : 0.38;
  ctx.beginPath();
  ctx.arc(cx, cy, 9, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(26,16,28,0.55)';
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  ctx.globalAlpha = on ? 0.95 : 0.7;
  /* 三角 */
  ctx.fillStyle = '#fff4f8';
  ctx.beginPath();
  ctx.moveTo(-3.6, -3.4);
  ctx.lineTo(1.2, 0);
  ctx.lineTo(-3.6, 3.4);
  ctx.closePath();
  ctx.fill();
  /* 竖杠 */
  ctx.fillRect(2, -3.4, 1.6, 6.8);
  ctx.restore();

  if (nextHover) {
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = '#ffe0ec';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 9.8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

/* ---------- 标题 ---------- */
function drawTitle(ctx, t) {
  ctx.save();
  ctx.fillStyle = 'rgba(20,13,26,0.72)';
  ctx.fillRect(0, 0, LOGIC_W, LOGIC_H);

  for (let i = 0; i < 48; i++) {
    const x = (i * 137.5) % LOGIC_W;
    const y = (i * 71.3) % LOGIC_H;
    ctx.globalAlpha = 0.16 + 0.55 * Math.abs(Math.sin(t * 1.3 + i));
    P.r(ctx, x, y, 1, 1, '#fff4d8');
  }
  ctx.globalAlpha = 1;

  P.text(ctx, '给' + GIRL_NAME + '的', LOGIC_W / 2, 54, '#ffd9e2', 12, 'center');
  P.text(ctx, '生日小屋', LOGIC_W / 2, 74, '#fff3d0', 26, 'center', 'serif');
  P.text(ctx, '— 黄昏的海边，等你回家 —', LOGIC_W / 2, 108, '#f6dcc4', 8, 'center');

  ctx.restore();
}

/* ---------- 开场 ---------- */
function startPlay() {
  AU.unlock();
  AU.startAmbience();
  AU.tap();
  state = 'play';
  stateT = 0;
  npcSpawnAt(TD.scene);
  buildNav();
  bindAct();
  /* 上一版喇叭按钮留下的静音状态不再沿用：唱片默认是「在放」 */
  if (AU.isMuted()) AU.setMuted(false);
  if (typeof BGM !== 'undefined') { BGM.setMuted(false); BGM.play(); }
  const ht = document.getElementById('house-title');
  if (ht) ht.classList.add('show');
  const st = document.getElementById('start');
  if (st) st.classList.add('gone');
  setTimeout(() => { if (state === 'play') showToast('走近屋里的东西，会浮出可以点的提示'); }, 900);
}

/* 黑幕慢慢变亮，再浮出「开始」 */
function initIntro() {
  const veil = document.getElementById('intro');
  const st = document.getElementById('start');
  if (!veil || !st) return;
  setTimeout(() => veil.classList.add('lit'), 650);
  setTimeout(() => st.classList.add('lit'), 1450);
  st.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (typeof AU !== 'undefined' && AU.unlock) AU.unlock();
    if (state === 'title') startPlay();
    else st.classList.add('gone');
  });
}

/* ---------- 拆礼物盒 ---------- */
function startGiftOpen() {
  if (giftAnim) return;
  giftAnim = { t: 0, dur: 1.30 };
  AU.spark();
}

function updateGiftAnim(dt) {
  if (!giftAnim) return;
  giftAnim.t += dt;
  if (giftAnim.t < giftAnim.dur) return;
  giftAnim = null;
  const n = (typeof GIFTS !== 'undefined') ? GIFTS.length : 1;
  if (typeof GIFT !== 'undefined') GIFT.open(giftIdx % Math.max(1, n));
  giftIdx = (giftIdx + 1) % Math.max(1, n);
}

/* ---------- 书桌上那封信 ---------- */
const LETTER_RECT = { x: 146, y: 98, w: 26, h: 16 };

/* 蛋糕上的「17」：白色糖霜字 + 深粉细描边，压在奶油正面 */
const CAKE_NUM = { x: 309, y: 140, s: 2 };   /* 中心 x / 顶边 y / 像素倍数 */
/* 3x5 点阵字模，够小也认得出来 */
const FONT35 = {
  '1': ['.#.', '##.', '.#.', '.#.', '.#.', '.#.', '###'],
  '7': ['###', '..#', '..#', '.#.', '.#.', '.#.', '.#.'],
};

function drawCakeAge(ctx, t) {
  const txt = '17';
  const s2 = CAKE_NUM.s;
  const gw = 3 * s2, gh = 7 * s2;
  const gap = s2 + 2;
  const totalW = gw * txt.length + gap * (txt.length - 1);
  const x0 = Math.round(CAKE_NUM.x - totalW / 2);
  const y0 = CAKE_NUM.y;
  const breath = Math.sin(t * 1.9) * 0.3;   /* 很轻的呼吸，别晃眼 */

  /* 落在蛋糕顶上的接触阴影，让字「站」得住 */
  ctx.save();
  ctx.fillStyle = 'rgba(150,86,64,0.20)';
  ctx.fillRect(x0 + 1, y0 + gh - 1, totalW - 2, 2);
  ctx.restore();

  function stamp(dx, dy, color, dy2) {
    ctx.fillStyle = color;
    const off = (dy2 === undefined ? 0 : dy2);
    let cx = x0;
    for (let i = 0; i < txt.length; i++) {
      const g = FONT35[txt[i]];
      for (let ry = 0; ry < 7; ry++) {
        for (let rx = 0; rx < 3; rx++) {
          if (g[ry][rx] !== '#') continue;
          ctx.fillRect(cx + rx * s2 + dx, y0 + ry * s2 + dy + off + breath, s2, s2);
        }
      }
      cx += gw + gap;
    }
  }

  ctx.save();
  /* 立体感：右下 1px 深橙当侧面，四向细描边压深褐，再铺暖橙，最后左上高光 */
  stamp(1, 1, '#d9603c');
  stamp(-1, 0, '#a8462c');
  stamp(1, 0, '#a8462c');
  stamp(0, -1, '#a8462c');
  stamp(0, 1, '#a8462c');
  stamp(0, 0, '#ffa970');
  /* 顶部一行提亮，像烛光打上去 */
  ctx.fillStyle = '#ffe3c4';
  let cx2 = x0;
  for (let i = 0; i < txt.length; i++) {
    const g = FONT35[txt[i]];
    for (let rx = 0; rx < 3; rx++) {
      if (g[0][rx] === '#') ctx.fillRect(cx2 + rx * s2, y0 + breath, s2, Math.max(1, s2 >> 1));
    }
    cx2 += gw + gap;
  }
  ctx.restore();
}

function drawLetter(ctx, t) {
  const b = LETTER_RECT;
  ctx.save();
  /* 落在桌面上的影子 */
  ctx.globalAlpha = 0.20;
  ctx.fillStyle = '#5a3a2e';
  ctx.fillRect(b.x + 1, b.y + b.h, b.w, 2);
  ctx.globalAlpha = 1;
  /* 信封主体 */
  P.r(ctx, b.x, b.y, b.w, b.h, '#f8e8d7');
  P.r(ctx, b.x, b.y, b.w, 1, '#fff6ec');
  P.r(ctx, b.x, b.y + b.h - 1, b.w, 1, '#dcc0a5');
  P.r(ctx, b.x, b.y, 1, b.h, '#e8d2ba');
  P.r(ctx, b.x + b.w - 1, b.y, 1, b.h, '#e8d2ba');
  /* 封口折线 */
  ctx.beginPath();
  ctx.moveTo(b.x + 2, b.y + 1.5);
  ctx.lineTo(b.x + b.w / 2, b.y + 8);
  ctx.lineTo(b.x + b.w - 2, b.y + 1.5);
  ctx.strokeStyle = '#e3c6aa';
  ctx.lineWidth = 1;
  ctx.stroke();
  /* 粉色封蜡 + 高光 */
  P.r(ctx, b.x + b.w / 2 - 2, b.y + 7, 4, 4, '#ff9ec2');
  P.r(ctx, b.x + b.w / 2 - 1, b.y + 8, 2, 2, '#ffd7e6');
  ctx.restore();
}

/* 盒子落在书桌礼盒那一格；先抖，再掀盖，最后光爆 */
function drawGiftAnim(ctx, t) {
  if (!giftAnim) return;
  const p = Math.min(1, giftAnim.t / giftAnim.dur);
  const cx = 188, cy = 84;                 /* 礼盒顶部 */
  const shake = p < 0.42 ? Math.sin(p * 70) * 1.6 * (p / 0.42) : 0;
  const lift = p <= 0.42 ? 0 : Math.min(1, (p - 0.42) / 0.5);
  const burst = p > 0.5 ? Math.min(1, (p - 0.5) / 0.5) : 0;

  /* 只画盖子：先在原位抖，再飞起来转着淡出 —— 不遮住桌上的礼物贴图 */
  ctx.save();
  ctx.globalAlpha = 1 - lift * lift * 0.95;
  ctx.translate(cx + shake + lift * 7, cy - lift * 36);
  ctx.rotate(lift * 0.95);
  const w = 30 * (1 - lift * 0.22);
  P.r(ctx, -w / 2, -4, w, 8, '#f4b6c4');
  P.r(ctx, -w / 2, 2.5, w, 1.5, '#e9a5b6');
  P.r(ctx, -3, -4, 6, 8, '#ffd98e');
  P.r(ctx, -8, -9, 6, 4, '#ffcf6e');
  P.r(ctx, 2, -9, 6, 4, '#ffcf6e');
  P.r(ctx, -1.5, -8, 3, 3, '#ffb84d');
  ctx.restore();
  ctx.globalAlpha = 1;

  if (burst > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(cx, cy + 12, 2, cx, cy + 12, 10 + burst * 46);
    g.addColorStop(0, 'rgba(255,242,196,' + (0.85 * (1 - burst * 0.55)).toFixed(3) + ')');
    g.addColorStop(0.45, 'rgba(255,206,140,' + (0.32 * (1 - burst)).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(255,190,120,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - 70, cy - 50, 140, 140);
    ctx.restore();

    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + burst * 1.4;
      const r = 5 + burst * 34;
      ctx.globalAlpha = Math.max(0, 1 - burst);
      P.r(ctx, cx + Math.cos(a) * r, cy + 12 + Math.sin(a) * r * 0.66, 2, 2, '#fff3c4');
    }
    ctx.globalAlpha = 1;
  }
}

/* ---------- 许愿 ---------- */
let WISH_SNAP = null;

/* 许愿特写：镜头推近她与蛋糕，房间暗下来，只留烛光照着那一圈 */
function wishShot(ctx, t) {
  if (!WISH_SNAP) WISH_SNAP = mkCanvas(LOGIC_W, LOGIC_H);
  const sc = WISH_SNAP.ctx;
  sc.clearRect(0, 0, LOGIC_W, LOGIC_H);
  sc.drawImage(BUF.canvas, 0, 0);

  const k = Math.min(1, stateT / 7);
  const z = 1.60 + k * 0.64;
  const cx = (player.x + 311) / 2;
  const cy = (player.y + 152) / 2 - 4;
  wishCam = { cx, cy, z, ox: LOGIC_W / 2, oy: LOGIC_H / 2 + 8 };

  ctx.save();
  ctx.clearRect(0, 0, LOGIC_W, LOGIC_H);
  ctx.fillStyle = '#0a0712';
  ctx.fillRect(0, 0, LOGIC_W, LOGIC_H);
  ctx.imageSmoothingEnabled = false;
  ctx.translate(LOGIC_W / 2, LOGIC_H / 2 + 8);
  ctx.scale(z, z);
  ctx.translate(-cx, -cy);
  ctx.drawImage(WISH_SNAP.canvas, 0, 0);
  ctx.restore();

  const flick = 0.95 + Math.sin(t * 7.3) * 0.025 + Math.sin(t * 3.1) * 0.025;
  const g = ctx.createRadialGradient(240, 130, 20, 240, 130, 208 * flick);
  g.addColorStop(0, 'rgba(8,5,14,0)');
  g.addColorStop(0.40, 'rgba(8,5,14,0.32)');
  g.addColorStop(0.68, 'rgba(8,5,14,0.70)');
  g.addColorStop(1, 'rgba(8,5,14,0.96)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, LOGIC_W, LOGIC_H);

  /* 上下压暗，把门外那片亮光也收进夜里 */
  const vg = ctx.createLinearGradient(0, 0, 0, LOGIC_H);
  vg.addColorStop(0, 'rgba(6,4,11,0.66)');
  vg.addColorStop(0.30, 'rgba(6,4,11,0.12)');
  vg.addColorStop(0.70, 'rgba(6,4,11,0.18)');
  vg.addColorStop(1, 'rgba(6,4,11,0.56)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, LOGIC_W, LOGIC_H);

  ctx.globalCompositeOperation = 'lighter';
  const w = ctx.createRadialGradient(240, 146, 3, 240, 146, 136 * flick);
  w.addColorStop(0, 'rgba(255,194,118,0.30)');
  w.addColorStop(0.45, 'rgba(255,156,86,0.12)');
  w.addColorStop(1, 'rgba(255,140,70,0)');
  ctx.fillStyle = w;
  ctx.fillRect(0, 0, LOGIC_W, LOGIC_H);
  ctx.globalCompositeOperation = 'source-over';
}

let wishCam = null;

/* 像素圆角矩形：逐行内缩，边缘保持硬像素（P.rb 是直角，气泡要圆一点） */
function pxRoundRect(ctx, x, y, w, h, r, fill) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h); r = Math.round(r);
  ctx.fillStyle = fill;
  for (let i = 0; i < h; i++) {
    let inset = 0;
    if (i < r) { const dy = r - i - 0.5; inset = Math.round(r - Math.sqrt(Math.max(0, r * r - dy * dy))); }
    else if (i >= h - r) { const dy = i - (h - r) + 0.5; inset = Math.round(r - Math.sqrt(Math.max(0, r * r - dy * dy))); }
    if (w - inset * 2 > 0) ctx.fillRect(x + inset, y + i, w - inset * 2, 1);
  }
}

/* 他头上的生日祝福气泡（跟着特写镜头换算到屏幕坐标） */
function drawWishBubble(ctx, t) {
  if (!wishCam) return;
  const { cx, cy, z, ox, oy } = wishCam;
  const sx = ox + (NPC.x - cx) * z;
  const headY = oy + (NPC.y - cy) * z - 62 * z * 0.96;

  const lines = ['祝你生日快乐呀雪雪！', '这也是我陪你过的第二个生日了，', '以后我们也要一直在一起！'];
  /* 按最长一行估宽，别让气泡空出一大片：全角 9px、半角 5px */
  let tw = 0;
  for (const s2 of lines) {
    let w = 0;
    for (const ch of s2) w += ch.charCodeAt(0) > 255 ? 9 : 5;
    if (w > tw) tw = w;
  }
  const bw = Math.min(192, Math.round(tw) + 22);
  const bh = 16 + lines.length * 13;
  const bx = Math.max(6, Math.min(LOGIC_W - bw - 6, Math.round(sx - bw / 2)));
  const by = Math.max(6, Math.round(headY - bh - 14));

  const a = Math.min(1, Math.max(0, (stateT - 0.5) / 0.7));
  if (a <= 0) return;
  const pop = 0.9 + 0.1 * Math.min(1, (stateT - 0.5) / 0.35);

  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(bx + bw / 2, by + bh);
  ctx.scale(pop, pop);
  ctx.translate(-(bx + bw / 2), -(by + bh));

  const BF = 'rgba(255,250,240,0.5)';
  pxRoundRect(ctx, bx - 1, by - 1, bw + 2, bh + 2, 9, 'rgba(186,126,96,0.32)');
  pxRoundRect(ctx, bx, by, bw, bh, 8, BF);
  /* 小尾巴：从气泡底指向他头顶 */
  const tx = Math.max(bx + 18, Math.min(bx + bw - 18, Math.round(sx)));
  P.r(ctx, tx - 4, by + bh - 1, 9, 4, BF);
  P.r(ctx, tx - 3, by + bh + 2, 7, 3, BF);
  P.r(ctx, tx - 2, by + bh + 5, 5, 3, BF);

  lines.forEach((s2, i) => {
    P.text(ctx, s2, bx + bw / 2, by + 16 + i * 13, '#7d4a37', 9, 'center');
  });
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawWish(ctx, t) {
  const a = Math.min(1, stateT / 0.8);
  ctx.save();
  if (!wishReady) {
    ctx.globalAlpha = a;
    P.text(ctx, '闭上眼，许个愿…', LOGIC_W / 2, 224, '#ffeacb', 10, 'center');
    const p = Math.min(1, stateT / WISH_DUR);
    ctx.globalAlpha = a * 0.4;
    ctx.fillStyle = '#6b4a30';
    ctx.fillRect(LOGIC_W / 2 - 54, 245, 108, 3);
    ctx.globalAlpha = a * 0.95;
    ctx.fillStyle = '#ffd39a';
    ctx.fillRect(LOGIC_W / 2 - 54, 245, 108 * p, 3);
  } else {
    const blink = 0.74 + 0.26 * Math.sin(t * 3.4);
    ctx.globalAlpha = a * blink;
    P.text(ctx, '许好了吗？', LOGIC_W / 2, 224, '#ffeacb', 10, 'center');
  }
  ctx.restore();
}

/* ---------- 庆祝 ---------- */
function drawCelebrate(ctx, t) {
  const a = Math.min(1, stateT / 0.8);
  ctx.save();

  const g = ctx.createLinearGradient(0, 0, 0, 152);
  g.addColorStop(0, 'rgba(24,13,26,0.96)');
  g.addColorStop(0.55, 'rgba(24,13,26,0.88)');
  g.addColorStop(0.82, 'rgba(24,13,26,0.55)');
  g.addColorStop(1, 'rgba(24,13,26,0)');
  ctx.globalAlpha = a;
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, LOGIC_W, 152);

  const cx = LOGIC_W / 2;
  ctx.globalAlpha = a;
  P.text(ctx, GIRL_NAME + '，' + AGE + ' 岁生日快乐！', cx + 1, 45, 'rgba(30,10,22,0.9)', 18, 'center', 'serif');
  P.text(ctx, GIRL_NAME + '，' + AGE + ' 岁生日快乐！', cx, 44, '#ffe2ea', 18, 'center', 'serif');

  const sub = '愿你的每一天都被温柔以待';
  const ring = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [1, -1], [-1, 1]];
  for (const [dx, dy] of ring) P.text(ctx, sub, cx + dx, 82 + dy, 'rgba(46,16,32,0.95)', 10, 'center');
  P.text(ctx, sub, cx, 82, '#ffeccd', 10, 'center');

  if (stateT > 3.4) {
    ctx.globalAlpha = a * (0.45 + 0.55 * Math.sin(t * 2.6));
    P.text(ctx, '轻点屏幕，再看一次', cx, 240, '#ffd9e2', 9, 'center');
  }
  ctx.restore();
}

/* ---------- 缩放 ---------- */
/* 触屏 + 竖屏时把画面整体旋转 90°：手机开了「方向锁定」、微信里不跟随旋转也能玩 */
const IS_TOUCH = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) ||
  !!(window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches);
let VIEW_ROT = false;   /* 当前是否处于旋转铺满状态 */
let VIEW_W = 0, VIEW_H = 0;  /* canvas 未旋转时的 CSS 像素尺寸 */

/* 竖屏有两种看法：转 90° 铺满（横着拿手机最清楚，默认）/ 正立小画面（竖着直接看）
   localStorage 记住选择，右下角 ⇄ 按钮随时切 */
let FLAT_MODE = false;
try { FLAT_MODE = localStorage.getItem('xc_flat') === '1'; } catch (e) {}

function resize() {
  const vw = window.innerWidth, vh = window.innerHeight;
  const portrait = IS_TOUCH && vh > vw + 1;
  const rot = portrait && !FLAT_MODE;

  const tg = document.getElementById('rotoggle');
  if (tg) tg.style.display = portrait ? 'flex' : 'none';

  if (rot) {
    /* 旋转坐标系里可用区是 vh 宽 × vw 高 */
    const s = Math.min(vh / LOGIC_W, vw / LOGIC_H) * 0.99;
    VIEW_W = Math.round(LOGIC_W * s);
    VIEW_H = Math.round(LOGIC_H * s);
    VIEW.style.width = VIEW_W + 'px';
    VIEW.style.height = VIEW_H + 'px';
    VIEW.style.maxWidth = 'none';
    VIEW.style.maxHeight = 'none';
    VIEW.style.position = 'fixed';
    VIEW.style.left = '50%';
    VIEW.style.top = '50%';
    VIEW.style.transform = 'translate(-50%,-50%) rotate(90deg)';
    VIEW.style.borderRadius = '0';
    VIEW_ROT = true;
    document.body.classList.add('rot');
    showRotateTip(true);
  } else {
    const s = Math.min(vw / LOGIC_W, vh / LOGIC_H) * 0.97;
    VIEW_W = Math.round(LOGIC_W * s);
    VIEW_H = Math.round(LOGIC_H * s);
    VIEW.style.width = VIEW_W + 'px';
    VIEW.style.height = VIEW_H + 'px';
    VIEW.style.maxWidth = '';
    VIEW.style.maxHeight = '';
    VIEW.style.position = '';
    VIEW.style.left = '';
    VIEW.style.top = '';
    VIEW.style.transform = '';
    VIEW.style.borderRadius = '';
    VIEW_ROT = false;
    document.body.classList.remove('rot');
    showRotateTip(portrait);
  }
}

/* 竖屏时底部飘一条提示，4 秒后自己淡出，不挡点击 */
let _rotTipDone = false;
function showRotateTip(on) {
  const el = document.getElementById('rotate');
  if (!el) return;
  clearTimeout(showRotateTip._t);
  if (!on) {
    el.classList.remove('show');
    el.style.display = 'none';
    return;
  }
  if (_rotTipDone) return;
  const t1 = el.querySelector('.t1'), t2 = el.querySelector('.t2');
  if (t1) t1.textContent = FLAT_MODE ? '把手机横过来，画面更大更清楚' : '把手机横过来，画面就是正的';
  if (t2) t2.textContent = FLAT_MODE ? '右下角 ⇄ 也能切换' : '右下角 ⇄ 可以换成竖着看的小画面';
  el.style.display = 'flex';
  requestAnimationFrame(() => el.classList.add('show'));
  showRotateTip._t = setTimeout(() => {
    el.classList.remove('show');
    _rotTipDone = true;
    setTimeout(() => { el.style.display = 'none'; }, 600);
  }, 4200);
}

/* 逻辑坐标 → 屏幕坐标（#act 这类 DOM 按钮定位用；旋转时要跟着转） */
function logicToScreen(lx, ly) {
  const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
  const u = (lx / LOGIC_W) * VIEW_W, v = (ly / LOGIC_H) * VIEW_H;
  if (VIEW_ROT) {
    return { x: cx - (v - VIEW_H / 2), y: cy + (u - VIEW_W / 2) };
  }
  const r = VIEW.getBoundingClientRect();
  return { x: r.left + u, y: r.top + v };
}
window.addEventListener('resize', resize);
resize();

/* 右下角 ⇄：横着看 / 竖着看 切换 */
(function () {
  const el = document.getElementById('rotoggle');
  if (!el) return;
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    FLAT_MODE = !FLAT_MODE;
    try { localStorage.setItem('xc_flat', FLAT_MODE ? '1' : '0'); } catch (e2) {}
    _rotTipDone = false;
    resize();
  });
})();

/* ---------- 主循环 ---------- */
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  steerToTarget();
  update(dt);
  render();
  requestAnimationFrame(loop);
}

initIntro();

loadHeroSprite(() => {
  loadRoomBg(() => requestAnimationFrame(loop));
});