/* 开场动画：满屏像素爱心 + 生日彩带，两句话依次浮现
   纯粹的氛围层，播完自己退场（约 6.4 秒），轻点可跳过。 */
const INTRO = (() => {
  const root = document.getElementById('opening');
  const cv = document.getElementById('openingFx');
  if (!root || !cv) return { done: () => true };

  const W = 480, H = 270;
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  /* 7x6 的像素爱心 */
  const HEART = [
    '.##.##.',
    '#######',
    '#######',
    '.#####.',
    '..###..',
    '...#...',
  ];
  const HEART_COLS = ['#ff9ec2', '#ffb8d2', '#ff6fa5', '#fff0f6', '#ffd0e2'];
  const TAPE_COLS = ['#ffd166', '#8ee0d0', '#ffa9c6', '#b7c9ff', '#ffe9a8'];

  const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  let hearts = [];
  let tapes = [];
  let stars = [];
  let t0 = 0;
  let raf = 0;
  let alive = false;

  function rnd(a, b) { return a + Math.random() * (b - a); }

  function seed() {
    hearts = [];
    for (let i = 0; i < (reduce ? 18 : 54); i++) {
      hearts.push({
        x: rnd(-6, W + 6),
        y: rnd(-20, H + 20),
        vy: rnd(-16, -7),          /* 负 = 向上飘 */
        s: Math.random() < 0.45 ? 2 : 3,
        amp: rnd(2, 7),
        ph: rnd(0, Math.PI * 2),
        sp: rnd(0.5, 1.4),
        a: rnd(0.72, 1),
        col: HEART_COLS[(Math.random() * HEART_COLS.length) | 0],
      });
    }
    tapes = [];
    for (let i = 0; i < (reduce ? 6 : 18); i++) {
      tapes.push({
        x: rnd(0, W), y: rnd(-H, H),
        vy: rnd(9, 26),
        w: Math.random() < 0.5 ? 3 : 2,
        h: rnd(5, 9),
        ph: rnd(0, Math.PI * 2),
        a: rnd(0.28, 0.62),
        col: TAPE_COLS[(Math.random() * TAPE_COLS.length) | 0],
      });
    }
    stars = [];
    for (let i = 0; i < 14; i++) {
      stars.push({ x: rnd(8, W - 8), y: rnd(8, H - 8), ph: rnd(0, Math.PI * 2), sp: rnd(1.6, 3.4) });
    }
  }

  function drawHeart(h) {
    const s = h.s;
    for (let r = 0; r < HEART.length; r++) {
      const row = HEART[r];
      for (let c = 0; c < row.length; c++) {
        if (row[c] === '#') {
          ctx.fillStyle = h.col;
          ctx.fillRect(Math.round(h.x + c * s), Math.round(h.y + r * s), s, s);
        }
      }
    }
  }

  function frame(now) {
    if (!t0) t0 = now;
    const t = now / 1000;
    const dt = Math.min(0.05, (now - (frame._last || now)) / 1000);
    frame._last = now;

    ctx.clearRect(0, 0, W, H);

    /* 星星先闪，垫在最底下 */
    for (const st of stars) {
      const k = (Math.sin(t * st.sp + st.ph) + 1) / 2;
      ctx.globalAlpha = 0.25 + k * 0.6;
      ctx.fillStyle = '#fff4e4';
      ctx.fillRect(Math.round(st.x), Math.round(st.y), 1, 1);
      if (k > 0.72) {
        ctx.fillRect(Math.round(st.x) - 1, Math.round(st.y), 3, 1);
        ctx.fillRect(Math.round(st.x), Math.round(st.y) - 1, 1, 3);
      }
      ctx.globalAlpha = 1;
    }

    /* 彩带：慢慢落，左右摆 */
    for (const p of tapes) {
      p.y += p.vy * dt;
      p.ph += dt * 1.6;
      if (p.y > H + 12) { p.y = -12; p.x = rnd(0, W); }
      ctx.globalAlpha = p.a;
      ctx.fillStyle = p.col;
      const dx = Math.sin(p.ph) * 2.4;
      ctx.fillRect(Math.round(p.x + dx), Math.round(p.y), p.w, p.h);
      ctx.globalAlpha = 1;
    }

    /* 爱心：向上飘，出顶再从底部回来 */
    for (const h of hearts) {
      h.y += h.vy * dt;
      h.ph += dt * h.sp;
      if (h.y < -22) { h.y = H + 16; h.x = rnd(-6, W + 6); }
      ctx.globalAlpha = h.a;
      drawHeart({ x: h.x + Math.sin(h.ph) * h.amp, y: h.y, s: h.s, col: h.col });
      ctx.globalAlpha = 1;
    }

    if (alive) raf = requestAnimationFrame(frame);
  }

  let hidden = false;
  function hide() {
    if (hidden) return;
    hidden = true;
    alive = false;
    root.classList.add('out');
    setTimeout(() => {
      root.style.display = 'none';
      if (raf) cancelAnimationFrame(raf);
    }, 780);
  }

  function start() {
    seed();
    alive = true;
    raf = requestAnimationFrame(frame);

    const t1 = root.querySelector('.i-txt.t1');
    const t2 = root.querySelector('.i-txt.t2');
    const d = reduce ? 200 : 1;
    setTimeout(() => { if (t1) t1.classList.add('on'); }, 700 * d);
    setTimeout(() => { if (t2) t2.classList.add('on'); }, 2900 * d);
    setTimeout(hide, 5700 * d);

    root.addEventListener('click', hide);
    root.addEventListener('touchstart', hide, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  return { done: () => hidden };
})();