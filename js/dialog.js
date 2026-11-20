/* 男主 NPC 对话（DOM 卡片，米色暖调，跟礼物卡一套视觉）
   两套台词：cottage（屋里）/ beach（沙滩） */
const DIALOG = (() => {
  /* 女主对他的称呼：每换一句台词重新抽一次 */
  const CALLS = ['你', '哥哥', '老公', '宝宝'];

  const SETS = {
    cottage: {
      start: {
        text: '{c}来啦。我一直在等你。',
        opts: [
          { t: '{c}怎么会在这儿？', go: 'a' },
          { t: '今天……陪我好不好', go: 'b' },
        ],
      },
      a: {
        text: '今天是你生日啊。这种日子，我怎么可能不在你身边。',
        opts: [{ t: '……（笑）', go: 'end' }],
      },
      b: {
        text: '好。今天一整天，都归你。',
        opts: [{ t: '那现在呢？', go: 'c' }],
      },
      c: {
        text: '现在啊……就站在这儿，看你走过去，把蜡烛吹灭。',
        opts: [{ t: '嗯！', go: 'end' }],
      },
      end: {
        text: '雪雪，十七岁快乐。以后的每一年，我都想陪你过。',
        opts: [{ t: '（抱住{c}）', go: null }],
      },
    },

    beach: {
      start: {
        text: '外面风比屋里凉。站我旁边，我给你挡着。',
        opts: [
          { t: '{c}不冷吗？', go: 'a' },
          { t: '海是粉色的诶', go: 'b' },
        ],
      },
      a: {
        text: '不冷。你一出门，我就跟着出来了，一直站在你后面不远的地方。',
        opts: [{ t: '那……一直跟着？', go: 'c' }],
      },
      b: {
        text: '嗯，落日把海染成粉的了。跟你头发一个颜色。',
        opts: [{ t: '（低头笑）才没有', go: 'c' }],
      },
      c: {
        text: '雪雪，回家以后我也想每天都这样：你在前面走，我在后面跟着，走慢一点也没关系。',
        opts: [{ t: '……说好了', go: 'end' }],
      },
      end: {
        text: '说好了。今天的风、海，还有你，我都记住了。',
        opts: [{ t: '（抱住{c}）', go: null }],
      },
    },
  };

  let root, textEl, optsEl, typing = null;
  let isOpen = false;
  let nodes = SETS.cottage;
  let cur = 'start';
  let call = CALLS[0];

  function pickCall() {
    call = CALLS[Math.floor(Math.random() * CALLS.length)];
  }

  /* 把 {c} 换成这一句抽到的称呼 */
  function sub(str) {
    return String(str).replace(/\{c\}/g, call);
  }

  function el() {
    root = document.getElementById('dlg');
    if (!root) return;
    textEl = root.querySelector('.d-text');
    optsEl = root.querySelector('.d-opts');
  }

  /* 打字机：每 26ms 一个字，点文字区可一次补全 */
  function type(str) {
    if (typing) clearInterval(typing);
    textEl.textContent = '';
    optsEl.innerHTML = '';
    optsEl.classList.remove('on');
    let i = 0;
    typing = setInterval(() => {
      i += 1;
      textEl.textContent = str.slice(0, i);
      if (i >= str.length) {
        clearInterval(typing);
        typing = null;
        showOpts();
      }
    }, 26);
    typing.skip = () => {
      clearInterval(typing);
      typing = null;
      textEl.textContent = str;
      showOpts();
    };
  }

  function finish() {
    if (typing && typing.skip) typing.skip();
  }

  function showOpts() {
    const node = nodes[cur];
    if (!node) return;
    optsEl.innerHTML = '';
    node.opts.forEach((o) => {
      const b = document.createElement('button');
      b.className = 'd-opt';
      b.textContent = sub(o.t);
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typing) finish();
        if (o.go) {
          cur = o.go;
          pickCall();
          type(sub(nodes[cur].text));
        } else {
          close();
        }
      });
      optsEl.appendChild(b);
    });
    optsEl.classList.add('on');
  }

  let shownAt = 0;

  function open(which) {
    if (!root) el();
    if (!root) return;
    nodes = SETS[which] || SETS.cottage;
    cur = 'start';
    isOpen = true;
    root.classList.add('show');
    shownAt = Date.now();
    pickCall();
    type(sub(nodes[cur].text));
  }

  function close() {
    if (typing) { clearInterval(typing); typing = null; }
    isOpen = false;
    root.classList.remove('show');
  }

  function init() {
    el();
    if (!root) return;
    root.addEventListener('click', (e) => {
      if (e.target === root || e.target.classList.contains('d-veil')) {
        /* 按钮是 pointerdown 打开的，touchend 之后浏览器还会补一个 click，
           这个 click 正好落在刚出现的遮罩上 —— 320ms 内忽略，否则对话框闪一下就没了 */
        if (Date.now() - shownAt < 320) return;
        close();
      }
      else if (e.target.classList.contains('d-text')) finish();
    });
    root.querySelector('.d-close').addEventListener('click', close);
  }

  return { init, open, close, isOpen: () => isOpen };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => DIALOG.init());
} else {
  DIALOG.init();
}