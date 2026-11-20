/* ============================================================
 *  gift.js — 礼物卡片弹窗
 *
 *  数据在 GIFTS 里改：把礼物图片丢进 assets/gifts/，
 *  再把 img 路径填上就行；文件不存在会自动显示占位框。
 *
 *  对外：GIFT.open() / GIFT.close() / GIFT.isOpen()
 * ============================================================ */

const GIFTS = [
  {
    title: '第一份生日礼物',
    desc: '有了这个手环以后会方便很多，能看心率和睡眠状况，还能离线支付，它能替我照顾好你陪你一起上学呀！',
    img: 'assets/gifts/gift1.png',
  },
  {
    title: '第二份生日礼物',
    desc: '你以前说自己没有这种类型的首饰，所以我就送你一条平安锁，往后你一定要平平安安的长大！',
    img: 'assets/gifts/gift2.jpg',
  },
  {
    title: '第三份生日礼物',
    desc: '真丝发圈，听说很好用嘞，不知道适不适合你用呢。',
    img: 'assets/gifts/gift3.jpg',
  },
  {
    title: '第四份生日礼物',
    desc: '天气变冷皮肤很容易干燥呀，要保护好自己的手手哦。',
    img: 'assets/gifts/gift4.jpg',
  },
  {
    title: '第五份生日礼物',
    desc: '还有嘴唇也是，你不喜欢喝水的话就更要保持湿润了（这个唇膏我用了一次哦 ⁄(⁄⁄•⁄ω⁄•⁄⁄)⁄）',
    img: 'assets/gifts/gift5.jpg',
  },
  {
    title: '第六份生日礼物',
    desc: '给你补充铅笔芯呀，看你买过这个牌子的，就是不知道你喜不喜欢用。',
    img: 'assets/gifts/gift6.jpg',
  },
  {
    title: '第七份生日礼物',
    desc: '橡皮也是，你说过这个牌子很好用所以我给你买了！嗯对，多一点，万一不见了可以备用。',
    img: 'assets/gifts/gift7.jpg',
  },
  {
    title: '第八份生日礼物',
    desc: '雪吻巧克力的含义是：祈愿你每年都陪在我身边。',
    img: 'assets/gifts/gift8.jpg',
  },
  {
    title: '第九份生日礼物',
    desc: '这种糖我也没吃过诶，好吃吗好吃吗？',
    img: 'assets/gifts/gift9.jpg',
  },
  {
    title: '第十份生日礼物',
    desc: '奥利奥，扭一扭，舔一舔，泡一泡。',
    img: 'assets/gifts/gift10.jpg',
  },
  {
    title: '第十一份生日礼物',
    desc: '这个味道好吃嘛？我喜欢吃巧克力味的。',
    img: 'assets/gifts/gift11.jpg',
  },
  {
    title: '第十二份生日礼物',
    desc: '无论未来如何，我都希望你能记住我，爱也好恨也罢，只要能够一直被你记住就足够了呀。',
    img: 'assets/gifts/gift12.jpg',
  },
];

/* 墙上的照片（点照片墙翻这一组） */
const PHOTOS = [
  { title: '相册 · 一', desc: '（照片说明待插入）', img: 'assets/photos/p1.jpg' },
  { title: '相册 · 二', desc: '（照片说明待插入）', img: 'assets/photos/p2.jpg' },
  { title: '相册 · 三', desc: '（照片说明待插入）', img: 'assets/photos/p3.jpg' },
  { title: '相册 · 四', desc: '（照片说明待插入）', img: 'assets/photos/p4.jpg' },
  { title: '相册 · 五', desc: '（照片说明待插入）', img: 'assets/photos/p5.jpg' },
  { title: '相册 · 六', desc: '（照片说明待插入）', img: 'assets/photos/p6.jpg' },
  { title: '相册 · 七', desc: '（照片说明待插入）', img: 'assets/photos/p7.jpg' },
  { title: '相册 · 八', desc: '（照片说明待插入）', img: 'assets/photos/p8.jpg' },
  { title: '相册 · 九', desc: '（照片说明待插入）', img: 'assets/photos/p9.jpg' },
  { title: '相册 · 十', desc: '（照片说明待插入）', img: 'assets/photos/p10.jpg' },
  { title: '相册 · 十一', desc: '（照片说明待插入）', img: 'assets/photos/p11.jpg' },
  { title: '相册 · 十二', desc: '（照片说明待插入）', img: 'assets/photos/p12.jpg' },
];

const GIFT = (function () {
  let root = null, imgEl = null, phEl = null, titleEl = null, descEl = null;
  let stepEl = null, nextEl = null, prevEl = null, closeEl = null, exitEl = null, cardEl = null;
  let idx = 0;
  let list = GIFTS;
  let opened = false;

  function q(sel) { return root ? root.querySelector(sel) : null; }

  let swapBusy = false, swapT = 0;

  /* 只换内容，不碰动画 */
  function render() {
    const g = list[idx];
    if (!g) return;
    titleEl.textContent = g.title;
    descEl.textContent = g.desc;
    stepEl.textContent = (idx + 1) + ' / ' + list.length;
    nextEl.textContent = idx >= list.length - 1 ? '回到小屋' : '下一份 ›';
    if (prevEl) prevEl.disabled = idx <= 0;

    phEl.style.display = 'none';
    imgEl.style.display = '';
    imgEl.onerror = () => {
      imgEl.style.display = 'none';
      phEl.style.display = 'flex';
      phEl.textContent = (list === PHOTOS ? '照片 ' : '礼物 ') + (idx + 1) + ' 图片待插入';
    };
    imgEl.src = g.img;
    if (!g.img) imgEl.onerror();
  }

  /* 换页：先离场（0.11s）→ 空一拍（约 0.09s）→ 再入场（0.36s，带一点回弹） */
  function paint(dir) {
    if (!dir || !cardEl) { render(); return; }
    swapBusy = true;
    cardEl.classList.remove('swap-next', 'swap-prev', 'swap-out-next', 'swap-out-prev');
    void cardEl.offsetWidth;
    cardEl.classList.add(dir === 'prev' ? 'swap-out-prev' : 'swap-out-next');

    clearTimeout(swapT);
    swapT = setTimeout(() => {
      render();
      cardEl.classList.remove('swap-out-next', 'swap-out-prev');
      void cardEl.offsetWidth;
      cardEl.classList.add(dir === 'prev' ? 'swap-prev' : 'swap-next');
      setTimeout(() => { swapBusy = false; }, 400);
    }, 200);
  }

  function openCommon(startIndex) {
    if (!root) return;
    idx = Math.max(0, Math.min(list.length - 1, startIndex | 0));
    opened = true;
    root.classList.add('show');
    paint();
  }

  function open(startIndex) {
    list = GIFTS;
    openCommon(startIndex);
  }

  function openPhoto(startIndex) {
    list = PHOTOS;
    openCommon(startIndex);
  }

  function close() {
    if (!root) return;
    opened = false;
    root.classList.remove('show');
  }

  /* 提前把 src 换掉：离场那 0.2 秒里图片就开始加载/解码了 */
  function prime(i) {
    const g = list[i];
    if (!g || !imgEl || !g.img) return;
    if (imgEl.getAttribute('src') !== g.img) imgEl.src = g.img;
  }

  function next() {
    if (swapBusy) return;
    if (typeof AU !== 'undefined') AU.page();
    if (idx >= list.length - 1) { close(); return; }
    idx++;
    prime(idx);
    paint('next');
  }

  function prev() {
    if (swapBusy || idx <= 0) return;
    if (typeof AU !== 'undefined') AU.page();
    idx--;
    prime(idx);
    paint('prev');
  }

  function init() {
    root = document.getElementById('gift');
    if (!root) return;
    imgEl = q('.g-img');
    phEl = q('.g-ph');
    titleEl = q('.g-title');
    descEl = q('.g-desc');
    stepEl = q('.g-step');
    nextEl = q('.g-next');
    prevEl = q('.g-prev');
    closeEl = q('.g-close');
    exitEl = q('.g-exit');
    cardEl = q('.g-card');

    nextEl.addEventListener('click', (e) => { e.stopPropagation(); next(); });
    prevEl.addEventListener('click', (e) => { e.stopPropagation(); prev(); });
    closeEl.addEventListener('click', (e) => { e.stopPropagation(); close(); });
    exitEl.addEventListener('click', (e) => { e.stopPropagation(); close(); });
    q('.g-veil').addEventListener('click', () => close());
    root.addEventListener('pointerdown', (e) => e.stopPropagation());
  }

  return {
    init, open, openPhoto, close, next, prev,
    isOpen: () => opened,
    count: () => GIFTS.length,
  };
})();

/* ---------- 照片墙（铺开面板 + 点开放大） ---------- */
const PWALL = (function () {
  let root = null, gridEl = null, zoomEl = null, zImg = null, zPh = null;
  let zTitle = null, zStep = null;
  let idx = 0, opened = false;

  function esc(t) {
    return String(t == null ? '' : t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  function build() {
    gridEl.innerHTML = '';
    PHOTOS.forEach((p, i) => {
      const cell = document.createElement('div');
      cell.className = 'pw-cell';
      cell.style.setProperty('--rot', ((i % 2 ? 1 : -1) * (0.8 + (i % 3) * 0.5)).toFixed(2) + 'deg');
      cell.innerHTML =
        '<div class="pw-pic"><img alt=""><div class="pw-ph">照片 ' + (i + 1) + ' 待插入</div></div>' +
        '<div class="pw-cap">' + esc(p.title) + '</div>';
      const im = cell.querySelector('img');
      const ph = cell.querySelector('.pw-ph');
      if (p.img) {
        im.onerror = () => { im.style.display = 'none'; ph.style.display = 'flex'; };
        im.src = p.img;
      } else {
        im.style.display = 'none'; ph.style.display = 'flex';
      }
      cell.addEventListener('click', (e) => { e.stopPropagation(); zoom(i); });
      gridEl.appendChild(cell);
    });
  }

  function zoom(i) {
    idx = (i + PHOTOS.length) % PHOTOS.length;
    const p = PHOTOS[idx];
    zTitle.textContent = p.title || '';
    zStep.textContent = (idx + 1) + ' / ' + PHOTOS.length;
    zPh.textContent = '照片 ' + (idx + 1) + ' 图片待插入';
    zPh.style.display = 'none';
    zImg.style.display = '';
    zImg.onerror = () => { zImg.style.display = 'none'; zPh.style.display = 'flex'; };
    zImg.src = p.img || '';
    if (!p.img) zImg.onerror();
    zoomEl.classList.add('show');
  }

  function closeZoom() { zoomEl.classList.remove('show'); }

  function open(startIndex) {
    if (!root) return;
    if (!gridEl.children.length) build();
    opened = true;
    root.classList.add('show');
    if (startIndex != null) zoom(startIndex);
  }

  function close() {
    if (!root) return;
    closeZoom();
    opened = false;
    root.classList.remove('show');
  }

  function init() {
    root = document.getElementById('pwall');
    if (!root) return;
    gridEl = root.querySelector('.pw-grid');
    zoomEl = root.querySelector('.pw-zoom');
    zImg = root.querySelector('.pz-img');
    zPh = root.querySelector('.pz-ph');
    zTitle = root.querySelector('.pz-title');
    zStep = root.querySelector('.pz-step');

    root.querySelector('.pw-close').addEventListener('click', (e) => { e.stopPropagation(); close(); });
    root.querySelector('.pw-veil').addEventListener('click', () => close());
    root.querySelector('.pz-prev').addEventListener('click', (e) => { e.stopPropagation(); zoom(idx - 1); });
    root.querySelector('.pz-next').addEventListener('click', (e) => { e.stopPropagation(); zoom(idx + 1); });
    root.querySelector('.pz-back').addEventListener('click', (e) => { e.stopPropagation(); closeZoom(); });
    zoomEl.addEventListener('click', (e) => { if (e.target === zoomEl) closeZoom(); });
    root.addEventListener('pointerdown', (e) => e.stopPropagation());
  }

  return {
    init, open, close, closeZoom,
    isOpen: () => opened,
    isZoomed: () => !!(zoomEl && zoomEl.classList.contains('show')),
  };
})();


/* ---------- 注释弹窗：宠物 / 照片墙 / 勿忘我 共用 ---------- */
const NOTE = (function () {
  let root = null, tagEl = null, textEl = null, picEl = null, okEl = null, onClose = null;
  let opened = false, shownAt = 0;

  function init() {
    root = document.getElementById('note');
    if (!root || root.dataset.bound) return;
    root.dataset.bound = '1';
    textEl = root.querySelector('.n-text');
    tagEl = root.querySelector('.n-tag');
    picEl = root.querySelector('.n-pic');
    okEl = root.querySelector('.n-ok');
    okEl.addEventListener('click', close);
    root.querySelector('.n-veil').addEventListener('click', close);
  }

  function show(opt) {
    if (!root) return;
    if (tagEl) tagEl.textContent = opt.tag || 'A LITTLE NOTE';
    textEl.textContent = opt.text || '';
    picEl.style.aspectRatio = opt.ratio || '';
    picEl.style.maxWidth = opt.maxW || '';
    picEl.style.background = opt.fit ? '#fff' : '';
    if (opt.img) {
      picEl.hidden = false;
      picEl.innerHTML = '';
      const im = new Image();
      im.alt = '';
      im.style.objectFit = opt.fit || 'cover';
      im.onerror = () => { picEl.innerHTML = ''; picEl.textContent = opt.ph || '照片待插入'; };
      im.src = opt.img;
      picEl.appendChild(im);
    } else {
      picEl.hidden = true;
      picEl.innerHTML = '';
    }
    onClose = opt.onClose || null;
    opened = true;
    shownAt = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    root.classList.add('show');
    if (typeof AU !== 'undefined' && AU.tap) AU.tap();
  }

  function close() {
    if (!root || !opened) return;
    /* 刚弹出时，触发它的那一下点击还会落到遮罩上，这里挡掉 */
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    if (now - shownAt < 300) return;
    opened = false;
    root.classList.remove('show');
    const cb = onClose;
    onClose = null;
    if (cb) setTimeout(cb, 200);
  }

  return { init, show, close, isOpen: () => opened };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { GIFT.init(); PWALL.init(); NOTE.init(); });
} else {
  GIFT.init();
  PWALL.init();
  NOTE.init();
}

/* 预加载：礼物与相册的图提前灌进缓存并 decode，换页时不再"慢半拍" */
(function preloadCards() {
  const go = () => {
    const all = [];
    try { GIFTS.forEach((g) => g.img && all.push(g.img)); } catch (e) {}
    try { PHOTOS.forEach((g) => g.img && all.push(g.img)); } catch (e) {}
    all.forEach((src) => {
      const im = new Image();
      im.decoding = 'async';
      im.src = src;
      if (im.decode) im.decode().catch(() => {});
    });
  };
  if (document.readyState === 'complete') setTimeout(go, 600);
  else window.addEventListener('load', () => setTimeout(go, 600));
})();
