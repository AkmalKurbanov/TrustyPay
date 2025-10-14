(() => {
  function initHs(container) {
    if (!container || container.__hsInited) return;
    container.__hsInited = true;

    // опции
    const track = container.querySelector('[data-hs-track]') || container;
    const snap = track.getAttribute('data-hs-snap') || 'proximity';
    const gap = parseInt(track.getAttribute('data-hs-gap') || '16', 10);
    const threshold = parseInt(track.getAttribute('data-hs-threshold') || '8', 10);
    const selectMode = (track.getAttribute('data-hs-select') || 'none').toLowerCase();
    const activeClass = track.getAttribute('data-hs-active-class') || 'is-active';
    const itemSelector = track.getAttribute('data-hs-item-selector') || '[data-hs-item]';

    // применяем CSS-переменные на контейнер
    container.style.setProperty('--hs-gap', `${gap}px`);
    container.style.setProperty('--hs-snap', snap === 'none' ? 'none' : snap);

    // флаг/данные драга
    let isDown = false, moved = false, startX = 0, startLeft = 0, pid = null;
    const getX = (e) => ('touches' in e ? e.touches[0].clientX : e.clientX);

    // wheel: вертикаль -> горизонталь
    container.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        container.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    }, { passive: false });

    // запрет нативного drag сущностей
    track.addEventListener('dragstart', (e) => e.preventDefault());

    // pointerdown
    track.addEventListener('pointerdown', (e) => {
      if (e.button === 2) return;
      isDown = true; moved = false;
      startX = getX(e);
      startLeft = container.scrollLeft;
      // захватим указатель только после превышения порога
    });

    // pointermove
    track.addEventListener('pointermove', (e) => {
      if (!isDown) return;
      const dx = getX(e) - startX;

      if (!moved && Math.abs(dx) > threshold) {
        moved = true;
        track.classList.add('is-dragging');
        pid = e.pointerId;
        track.setPointerCapture?.(pid);
      }
      if (moved) {
        container.scrollLeft = startLeft - dx;
        e.preventDefault();
      }
    }, { passive: false });

    // завершение
    const end = () => {
      if (!isDown) return;
      isDown = false;
      // короткая задержка, чтобы клик после драга не стрелял
      setTimeout(() => { moved = false; }, 0);
      track.classList.remove('is-dragging');
      if (pid != null) {
        track.releasePointerCapture?.(pid);
        pid = null;
      }
    };
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);

    // клики по ссылкам после драга не пускаем
    track.addEventListener('click', (e) => {
      if (!moved) return;
      if (e.target.closest('a, [data-hs-link]')) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);

    // селекция айтемов (опционально)
    if (selectMode !== 'none') {
      track.addEventListener('click', (e) => {
        if (e.target.closest('a, [data-hs-link]')) return;
        const item = e.target.closest(itemSelector);
        if (!item || !track.contains(item)) return;
        if (item.hasAttribute('disabled') || item.getAttribute('aria-disabled') === 'true') return;

        if (selectMode === 'single') {
          track.querySelectorAll(itemSelector).forEach(el => {
            const on = el === item;
            el.classList.toggle(activeClass, on);
            el.setAttribute('aria-selected', on ? 'true' : 'false');
            el.tabIndex = on ? 0 : -1;
          });
          item.focus?.();
        } else if (selectMode === 'multi') {
          const on = item.classList.toggle(activeClass);
          item.setAttribute('aria-selected', on ? 'true' : 'false');
          item.tabIndex = on ? 0 : -1;
        }
      });
    }

    // Публичные методы (по желанию)
    container.hs = {
      scrollToIndex(idx, behavior = 'smooth', align = 'start') {
        const items = [...track.querySelectorAll(itemSelector)];
        const el = items[idx];
        if (!el) return;
        const left = el.offsetLeft - (align === 'center'
          ? (container.clientWidth - el.clientWidth) / 2
          : 0);
        container.scrollTo({ left, behavior });
      },
      destroy() {
        container.__hsInited = false;
        container.hs = undefined;
        // слушатели висят на window и track — тут при желании можно отписаться
      }
    };
  }

  // авто-инициализация
  function initAll(root = document) {
    root.querySelectorAll('[data-hs]').forEach(initHs);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initAll());
  } else {
    initAll();
  }

  // на случай динамического добавления узлов:
  const mo = new MutationObserver((list) => {
    if (list.some(m => m.addedNodes && m.addedNodes.length)) initAll();
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
})();
