/* ============================================================
 *  outline.js — 像素精灵 1px 描边工具
 *  像素画里区分主体与背景最有效的手段
 * ============================================================ */

function hexToRgb(c) {
  c = c.replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  return [
    parseInt(c.slice(0, 2), 16),
    parseInt(c.slice(2, 4), 16),
    parseInt(c.slice(4, 6), 16),
  ];
}

/** 给离屏画布的不透明区域加 1px 外描边 */
function addOutline(srcCanvas, color, threshold = 80) {
  const w = srcCanvas.width, h = srcCanvas.height;
  const src = srcCanvas.getContext('2d').getImageData(0, 0, w, h).data;

  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const octx = out.getContext('2d');
  octx.imageSmoothingEnabled = false;

  const img = octx.createImageData(w, h);
  const d = img.data;
  const rgb = hexToRgb(color);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (src[i + 3] > threshold) continue;   // 自身不透明，跳过

      let hit = false;
      for (let dy = -1; dy <= 1 && !hit; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          if (src[(ny * w + nx) * 4 + 3] > threshold) { hit = true; break; }
        }
      }
      if (hit) {
        d[i] = rgb[0];
        d[i + 1] = rgb[1];
        d[i + 2] = rgb[2];
        d[i + 3] = 255;
      }
    }
  }
  octx.putImageData(img, 0, 0);
  octx.drawImage(srcCanvas, 0, 0);   // 原图叠在描边之上
  return out;
}
