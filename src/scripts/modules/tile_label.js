// tile-label-ellipsis.pure-js.js
(() => {
  const TILE_SEL = '.tile';
  const ICON_SEL = '.tile__icon';
  const LABEL_SEL = '.tile__label';

  function styleLabel(label, widthPx) {
    const s = label.style;
    s.display = 'block';                // чтобы width применился
    s.boxSizing = 'border-box';
    s.width = widthPx + 'px';           // равна ширине иконки
    s.maxWidth = widthPx + 'px';
    s.whiteSpace = 'nowrap';            // однострочно
    s.overflow = 'hidden';              // скрывать лишнее
    s.textOverflow = 'ellipsis';        // троеточие
    s.textAlign = 'center';             // по желанию, можно убрать
  }

  function measureIconWidth(iconEl) {
    const rect = iconEl.getBoundingClientRect();
    return Math.round(rect.width);
  }

  function applyOne(tile) {
    const icon = tile.querySelector(ICON_SEL);
    const label = tile.querySelector(LABEL_SEL);
    if (!icon || !label) return;

    let w = measureIconWidth(icon);

    // Если ширина 0 (иконка ещё не дорисована/скрыта) — подождём
    if (!w) {
      const img = icon.querySelector('img');
      if (img && !img.complete) {
        img.addEventListener('load', () => applyOne(tile), { once: true });
        img.addEventListener('error', () => applyOne(tile), { once: true });
      }
      requestAnimationFrame(() => applyOne(tile));
      return;
    }

    // Применяем только если реально поменялось
    if (tile.__lastIconW !== w) {
      tile.__lastIconW = w;
      styleLabel(label, w);
    }
  }

  function bindTile(tile) {
    if (tile.__bound) return;
    tile.__bound = true;

    applyOne(tile);

    const ro = new ResizeObserver(() => applyOne(tile));
    ro.observe(tile);
    const icon = tile.querySelector(ICON_SEL);
    if (icon) ro.observe(icon);

    tile.__ro = ro;
  }

  function scan(root = document) {
    root.querySelectorAll(TILE_SEL).forEach(bindTile);
  }

  // Инициализация
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => scan());
  } else {
    scan();
  }
  window.addEventListener('load', () => scan());
  window.addEventListener('resize', () => {
    document.querySelectorAll(TILE_SEL).forEach(applyOne);
  });

  // Если тайлы добавляются динамически
  const domMO = new MutationObserver(muts => {
    muts.forEach(m => {
      m.addedNodes.forEach(n => {
        if (n.nodeType !== 1) return;
        if (n.matches?.(TILE_SEL)) bindTile(n);
        else n.querySelectorAll?.(TILE_SEL).forEach(bindTile);
      });
    });
  });
  domMO.observe(document.body, { childList: true, subtree: true });

  // Публичный хук: вызови после слайдера/таба
  window.updateTileLabelsJSOnly = () => {
    document.querySelectorAll(TILE_SEL).forEach(applyOne);
  };
})();