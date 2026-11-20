/* ============================================================
 *  audio.js — 纯 WebAudio 合成音效（零外部素材、零版权依赖）
 *  八音盒音色 + 房间氛围 + 吹蜡烛 + 礼花
 *  浏览器要求首次用户手势后才能出声，故由 TD.unlock() 触发。
 * ============================================================ */

const AU = (function () {
  let ac = null;
  let master = null, sfxBus = null, musicBus = null, verb = null;
  let ready = false;
  let muted = false;
  let ambienceTimer = null;
  let songTimers = [];
  let ambienceOn = false;

  /* MIDI → Hz */
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  function ensure() {
    if (ac) return ac;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ac = new AC(); } catch (e) { return null; }

    master = ac.createGain();
    master.gain.value = 0.85;
    master.connect(ac.destination);

    sfxBus = ac.createGain();
    sfxBus.gain.value = 0.5;
    sfxBus.connect(master);

    musicBus = ac.createGain();
    musicBus.gain.value = 0.32;
    musicBus.connect(master);

    /* 房间混响：指数衰减噪声脉冲 */
    const len = Math.floor(ac.sampleRate * 1.8);
    const buf = ac.createBuffer(2, len, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8);
      }
    }
    verb = ac.createConvolver();
    verb.buffer = buf;
    const vg = ac.createGain();
    vg.gain.value = 0.34;
    verb.connect(vg);
    vg.connect(master);

    ready = true;
    return ac;
  }

  /* ---------- 基础音色 ---------- */

  /** 八音盒单音：基频 + 二次泛音 + 极短起音 + 长尾 */
  function bell(midi, at, dur, gain, bus) {
    if (!ready) return;
    const t0 = at;
    const f = hz(midi);
    const out = ac.createGain();
    out.gain.setValueAtTime(0.0001, t0);
    out.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + 0.006);
    out.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    const o1 = ac.createOscillator();
    o1.type = 'sine';
    o1.frequency.value = f;
    const o2 = ac.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = f * 2.004;
    const g2 = ac.createGain();
    g2.gain.value = 0.26;
    const o3 = ac.createOscillator();
    o3.type = 'triangle';
    o3.frequency.value = f * 3.01;
    const g3 = ac.createGain();
    g3.gain.value = 0.07;

    o1.connect(out);
    o2.connect(g2); g2.connect(out);
    o3.connect(g3); g3.connect(out);
    out.connect(bus || sfxBus);
    out.connect(verb);

    [o1, o2, o3].forEach((o) => { o.start(t0); o.stop(t0 + dur + 0.06); });
  }

  /** 噪声源 */
  function noise(dur) {
    const n = Math.floor(ac.sampleRate * dur);
    const buf = ac.createBuffer(1, n, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource();
    src.buffer = buf;
    return src;
  }

  /* ---------- 音效 ---------- */

  function spark() {
    if (!ensure() || muted) return;
    const t = ac.currentTime;
    // 擦火柴：短噪声 + 高频闪
    const s = noise(0.14);
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(2600, t);
    bp.frequency.exponentialRampToValueAtTime(900, t + 0.13);
    bp.Q.value = 1.2;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.16, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    s.connect(bp); bp.connect(g); g.connect(sfxBus);
    s.start(t); s.stop(t + 0.15);
    bell(84, t + 0.05, 0.5, 0.05, sfxBus);
  }

  function blow() {
    if (!ensure() || muted) return;
    const t = ac.currentTime;
    const s = noise(0.55);
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1300, t);
    lp.frequency.exponentialRampToValueAtTime(260, t + 0.5);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.30, t + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.52);
    s.connect(lp); lp.connect(g); g.connect(sfxBus);
    s.start(t); s.stop(t + 0.56);
  }

  function firework(intensity) {
    if (!ensure() || muted) return;
    const k = Math.max(0.3, Math.min(1, intensity == null ? 0.8 : intensity));
    const t = ac.currentTime;
    // 低频闷响
    const boom = ac.createOscillator();
    boom.type = 'sine';
    boom.frequency.setValueAtTime(150, t);
    boom.frequency.exponentialRampToValueAtTime(48, t + 0.22);
    const bg = ac.createGain();
    bg.gain.setValueAtTime(0.26 * k, t);
    bg.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    boom.connect(bg); bg.connect(sfxBus);
    boom.start(t); boom.stop(t + 0.32);

    // 噼啪颗粒
    const s = noise(0.5);
    const hp = ac.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1800;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12 * k, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.46);
    s.connect(hp); hp.connect(g); g.connect(sfxBus);
    s.start(t); s.stop(t + 0.5);

    // 高音闪光
    for (let i = 0; i < 4; i++) {
      bell(88 + ((Math.random() * 7) | 0), t + 0.02 + i * 0.045, 0.34, 0.022 * k, sfxBus);
    }
  }

  function chimeUp() {
    if (!ensure() || muted) return;
    const t = ac.currentTime;
    const scale = [72, 76, 79, 84, 88];
    scale.forEach((m, i) => bell(m, t + i * 0.085, 1.1, 0.11, sfxBus));
  }

  function tap() {
    if (!ensure() || muted) return;
    bell(91, ac.currentTime, 0.16, 0.03, sfxBus);
  }

  /* 翻页：纸张擦过（带通噪声快速上扫） */
  function page() {
    if (!ensure() || muted) return;
    const t = ac.currentTime;
    const src = noise(0.24);
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(850, t);
    bp.frequency.exponentialRampToValueAtTime(2700, t + 0.10);
    bp.Q.value = 0.9;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.17, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.19);
    src.connect(bp); bp.connect(g); g.connect(sfxBus);
    src.start(t); src.stop(t + 0.24);
  }

  /* 拆信：先纸面摩擦，再"啵"一下撕开封蜡 */
  function envelope() {
    if (!ensure() || muted) return;
    const t = ac.currentTime;
    const s1 = noise(0.32);
    const hp = ac.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 1100;
    const g1 = ac.createGain();
    g1.gain.setValueAtTime(0.0001, t);
    g1.gain.linearRampToValueAtTime(0.10, t + 0.035);
    g1.gain.exponentialRampToValueAtTime(0.0001, t + 0.27);
    s1.connect(hp); hp.connect(g1); g1.connect(sfxBus);
    s1.start(t); s1.stop(t + 0.32);

    const s2 = noise(0.18);
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 2900; bp.Q.value = 1.5;
    const g2 = ac.createGain();
    g2.gain.setValueAtTime(0.0001, t + 0.09);
    g2.gain.linearRampToValueAtTime(0.12, t + 0.12);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
    s2.connect(bp); bp.connect(g2); g2.connect(sfxBus);
    s2.start(t + 0.09); s2.stop(t + 0.27);

    bell(72, t + 0.16, 0.22, 0.05, sfxBus);
  }

  /* ---------- 海浪（室外循环） ---------- */
  let seaOn = false, seaNodes = [];

  function startSea() {
    if (!ensure() || seaOn || muted) return;
    seaOn = true;
    const t = ac.currentTime;

    const src = noise(4);
    src.loop = true;

    const hp = ac.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 85;
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    lp.Q.value = 0.5;

    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.085, t + 2.6);

    /* 慢速潮汐：0.13Hz 的正弦叠在音量上，像一波一波推上来 */
    const lfo = ac.createOscillator();
    lfo.type = 'sine'; lfo.frequency.value = 0.13;
    const lfoG = ac.createGain();
    lfoG.gain.value = 0.05;
    lfo.connect(lfoG); lfoG.connect(g.gain);

    /* 再叠一层稍快的呼吸，避免听起来像死循环 */
    const lfo2 = ac.createOscillator();
    lfo2.type = 'sine'; lfo2.frequency.value = 0.037;
    const lfo2G = ac.createGain();
    lfo2G.gain.value = 0.02;
    lfo2.connect(lfo2G); lfo2G.connect(g.gain);

    src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(musicBus);
    src.start(t); lfo.start(t); lfo2.start(t);
    seaNodes = [src, hp, lp, g, lfo, lfoG, lfo2, lfo2G];
  }

  function stopSea() {
    if (!seaOn) return;
    seaOn = false;
    if (!ready || !ac) { seaNodes = []; return; }
    const t = ac.currentTime;
    const g = seaNodes[3];
    if (g && g.gain) {
      try {
        g.gain.cancelScheduledValues(t);
        g.gain.setValueAtTime(g.gain.value, t);
        g.gain.linearRampToValueAtTime(0.0001, t + 1.4);
      } catch (e) {}
    }
    const olds = seaNodes.slice();
    seaNodes = [];
    setTimeout(() => {
      olds.forEach((n) => { try { if (n.stop) n.stop(); if (n.disconnect) n.disconnect(); } catch (e) {} });
    }, 1700);
  }

  /* ---------- 生日歌（八音盒） ---------- */

  /* [midi, 拍数] ，1 拍 = beat 秒 */
  const SONG = [
    [60, 0.5], [60, 0.5], [62, 1], [60, 1], [65, 1], [64, 2],
    [60, 0.5], [60, 0.5], [62, 1], [60, 1], [67, 1], [65, 2],
    [60, 0.5], [60, 0.5], [72, 1], [69, 1], [65, 1], [64, 1], [62, 2],
    [70, 0.5], [70, 0.5], [69, 1], [65, 1], [67, 1], [65, 2.5],
  ];
  /* 低音分解（C / F / G） */
  const BASS = [
    [48, 0], [55, 1], [52, 2], [48, 3],
    [48, 4], [55, 5], [52, 6], [55, 7],
    [48, 8], [55, 9], [52, 10], [55, 11],
    [53, 12], [48, 13], [55, 14], [48, 15],
  ];

  function playSong(beat) {
    if (!ensure() || muted) return;
    const b = beat || 0.62;
    const t0 = ac.currentTime + 0.06;
    let u = 0;
    SONG.forEach(([m, d]) => {
      bell(m + 12, t0 + u * b, Math.max(0.5, d * b * 1.9), 0.16, musicBus);
      u += d;
    });
    const total = u;
    BASS.forEach(([m, bar]) => {
      for (let k = 0; k < 4; k++) {
        const at = bar * (total / 16) + k * (total / 64) * 2;
        bell(m, t0 + at, 1.6, 0.05, musicBus);
      }
    });
    return total * b;
  }

  /* ---------- 房间氛围：极轻的持续垫音 + 偶发风铃 ---------- */
  let padNodes = [];

  function startAmbience() {
    if (!ensure() || ambienceOn) return;
    ambienceOn = true;
    const t = ac.currentTime;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.055, t + 2.2);
    g.connect(musicBus);
    [48, 55, 60].forEach((m, i) => {
      const o = ac.createOscillator();
      o.type = 'sine';
      o.frequency.value = hz(m);
      const og = ac.createGain();
      og.gain.value = i === 0 ? 0.6 : 0.34;
      o.connect(og); og.connect(g);
      o.start(t);
      padNodes.push(o, og);
    });
    padNodes.push(g);

    const tick = () => {
      if (!ambienceOn) return;
      if (!muted && Math.random() < 0.75) {
        const m = [79, 81, 84, 86, 88][(Math.random() * 5) | 0];
        bell(m, ac.currentTime + 0.05, 1.5, 0.020, musicBus);
        if (Math.random() < 0.4) bell(m + 7, ac.currentTime + 0.28, 1.2, 0.012, musicBus);
      }
      ambienceTimer = setTimeout(tick, 4200 + Math.random() * 6200);
    };
    ambienceTimer = setTimeout(tick, 3000);
  }

  function stopAmbience() {
    ambienceOn = false;
    if (ambienceTimer) { clearTimeout(ambienceTimer); ambienceTimer = null; }
    if (!ready) return;
    const t = ac.currentTime;
    const g = padNodes[padNodes.length - 1];
    if (g && g.gain) {
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(0.0001, t + 1.1);
    }
    const olds = padNodes.slice();
    padNodes = [];
    setTimeout(() => {
      olds.forEach((n) => { try { if (n.stop) n.stop(); if (n.disconnect) n.disconnect(); } catch (e) {} });
    }, 1400);
  }

  /* ---------- 对外 ---------- */

  function unlock() {
    if (!ensure()) return false;
    if (ac.state === 'suspended') ac.resume();
    return true;
  }

  function setMuted(v) {
    muted = !!v;
    if (typeof BGM !== 'undefined' && BGM.setMuted) BGM.setMuted(muted);
    if (!ready) return muted;
    try { localStorage.setItem('xc_muted', muted ? '1' : '0'); } catch (e) {}
    const t = ac.currentTime;
    const target = muted ? 0.0001 : 1;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), t);
    master.gain.linearRampToValueAtTime(target * 0.85, t + 0.25);
    return muted;
  }

  function toggleMute() { return setMuted(!muted); }
  function isMuted() { return muted; }

  /* ---------- 宠物叫声（本地 mp3，跟静音联动） ---------- */
  const VOICE = { dog: null, cat: null };
  /* 路径写成完整字符串：打包单文件时才能被静态识别并内联 */
  const VOICE_SRC = { dog: 'assets/sfx/dog.mp3', cat: 'assets/sfx/cat.mp3' };
  let LAST_VOICE = null;
  function voice(kind) {
    try {
      let a = VOICE[kind];
      if (!a) {
        a = new Audio(VOICE_SRC[kind]);
        a.preload = 'auto';
        a.volume = 0.9;
        VOICE[kind] = a;
      }
      if (muted) return;
      a.currentTime = 0;
      const p = a.play();
      if (p && p.then) {
        p.then(() => { LAST_VOICE = { kind: kind, ok: true }; })
          .catch(() => { LAST_VOICE = { kind: kind, ok: false }; });
      } else LAST_VOICE = { kind: kind, ok: true };
    } catch (e) {
      LAST_VOICE = { kind: kind, ok: false };
    }
  }

  try { muted = localStorage.getItem('xc_muted') === '1'; } catch (e) {}

  return {
    unlock, spark, blow, firework, chimeUp, tap, voice, lastVoice: () => LAST_VOICE,
    page, envelope, startSea, stopSea,
    playSong, startAmbience, stopAmbience,
    setMuted, toggleMute, isMuted,
  };
})();
/* ---------- 背景音乐：全局循环，许愿时暂停 ---------- */
const BGM = (function () {
  /* 曲子列表：唱片旁边的「下一首」在中间轮换，loop 一直在，切歌不打断循环 */
  const TRACKS = ['assets/music/bg99.mp3', 'assets/music/song100.mp3'];
  const TRACK_NAMES = ['99', '100'];
  let ti = 0;
  const el = new Audio(TRACKS[0]);
  el.loop = true;
  el.preload = 'auto';
  el.volume = 0.42;
  let want = false;
  let vol = 0.42;
  let userOff = false;   // 玩家用唱片按钮手动关掉了音乐

  function tryPlay() {
    const p = el.play();
    if (p && p.catch) p.catch(() => {});
  }
  /* 剧情播放（进房间 / 吹完蜡烛）：玩家手动关过就保持安静 */
  function play() { want = true; if (userOff) return; tryPlay(); }
  function pause() { want = false; try { el.pause(); } catch (e) {} }
  function resume() { if (want && !userOff) tryPlay(); }
  function stop() { want = false; try { el.pause(); el.currentTime = 0; } catch (e) {} }
  /* 唱片按钮：真正的播放 / 暂停开关，返回切换后是否在放 */
  function toggle() {
    /* 只要此刻没在放（玩家关过 / 剧情暂停过），点一下就是开 */
    if (userOff || el.paused) {
      userOff = false;
      want = true;
      el.muted = false;
      tryPlay();
    } else {
      userOff = true;
      want = false;
      try { el.pause(); } catch (e) {}
    }
    return !userOff;
  }
  function setVolume(v) {
    vol = Math.max(0, Math.min(1, v));
    el.volume = vol;
  }
  function setMuted(v) { el.muted = !!v; }
  /* 下一首：切歌顺手把「玩家关掉了」也解开，否则点了没声音会以为坏了 */
  function next() {
    ti = (ti + 1) % TRACKS.length;
    try {
      el.src = TRACKS[ti];
      el.currentTime = 0;
    } catch (e) {}
    if (userOff) { userOff = false; want = true; el.muted = false; }
    if (want) tryPlay();
    return ti;
  }

  return {
    el, play, pause, resume, stop, setVolume, setMuted, toggle, next,
    trackIndex: () => ti,
    trackName: () => TRACK_NAMES[ti],
    trackCount: () => TRACKS.length,
    isPlaying: () => !el.paused,
    /* 唱片该不该转：玩家没关、剧情也想放、而且真的在放 */
    isOn: () => !userOff && want && !el.paused,
    isWanted: () => want,
    isUserOff: () => userOff,
    duration: () => el.duration || 0,
  };
})();
