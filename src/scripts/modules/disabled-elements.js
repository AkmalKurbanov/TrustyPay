(() => {
  const EXCLUDE_SELECTOR = '.badge--primary';
  const APPLIED_ATTR = 'data-gray-applied';
  const PREV_ATTR = 'data-prev-filter';

  function setGray(el) {
    if (el.hasAttribute(APPLIED_ATTR)) return;
    const prev = el.style.filter; // сохраняем только inline
    if (prev) el.setAttribute(PREV_ATTR, prev);
    el.style.filter = prev && prev !== 'none' ? `${prev} grayscale(1)` : 'grayscale(1)';
    el.setAttribute(APPLIED_ATTR, '');
  }

  function unsetGray(el) {
    if (!el.hasAttribute(APPLIED_ATTR)) return;
    const prev = el.getAttribute(PREV_ATTR);
    if (prev !== null) {
      el.style.filter = prev;
    } else {
      el.style.removeProperty('filter');
    }
    el.removeAttribute(PREV_ATTR);
    el.removeAttribute(APPLIED_ATTR);
  }

  // собрать набор родителей для всех .badge--primary внутри контейнера
  function collectBadgeParents(container) {
    const parents = new Set();
    const badges = container.querySelectorAll(EXCLUDE_SELECTOR);
    badges.forEach(badge => {
      const p = badge.parentElement;
      if (p && container.contains(p)) parents.add(p);
    });
    return parents;
  }

  // применить серость ко всем подходящим элементам внутри .disabled-контейнера
  function applyToDisabledContainer(container) {
    if (!container || !container.classList?.contains('disabled')) return;

    const skipParents = collectBadgeParents(container);

    // ВАЖНО: не ставим фильтр на сам контейнер, только на его потомков
    const all = container.querySelectorAll('*');

    for (const el of all) {
      // пропуски:
      // 1) сам бейдж
      if (el.matches(EXCLUDE_SELECTOR)) continue;
      // 2) любой потомок бейджа
      if (el.closest(EXCLUDE_SELECTOR)) continue;
      // 3) РОДИТЕЛЬ бейджа
      if (skipParents.has(el)) continue;

      // системные теги не трогаем
      const tn = el.tagName;
      if (tn === 'SCRIPT' || tn === 'STYLE' || tn === 'LINK' || tn === 'META') continue;

      setGray(el);
    }
  }

  // снять серость со всех, кому ставили, внутри контейнера
  function clearFromDisabledContainer(container) {
    if (!container) return;
    const grayApplied = container.querySelectorAll(`*[${APPLIED_ATTR}]`);
    for (const el of grayApplied) unsetGray(el);
  }

  // общий пересчёт: вернуть цвет там, где .disabled ушёл; применить там, где появился
  function refresh(scope = document) {
    // убрать там, где элемент уже не внутри .disabled
    const applied = scope.querySelectorAll(`*[${APPLIED_ATTR}]`);
    for (const el of applied) {
      if (!el.closest('.disabled')) unsetGray(el);
    }
    // применить для всех текущих .disabled
    const containers = scope.querySelectorAll('.disabled');
    containers.forEach(applyToDisabledContainer);
  }

  function init() {
    refresh();

    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && m.attributeName === 'class') {
          const el = m.target;
          if (!(el instanceof Element)) continue;

          const nowDisabled = el.classList.contains('disabled');
          if (nowDisabled) {
            // класс .disabled добавили
            applyToDisabledContainer(el);
          } else {
            // класс .disabled сняли
            clearFromDisabledContainer(el);
          }

          // если класс менялся у элемента, который может быть .badge--primary
          // или у его родителя — безопаснее пересчитать ближайший .disabled контейнер
          if (el.matches(EXCLUDE_SELECTOR) || el.contains(document.querySelector(EXCLUDE_SELECTOR))) {
            const c = el.closest('.disabled');
            if (c) {
              clearFromDisabledContainer(c);
              applyToDisabledContainer(c);
            }
          }
        }

        if (m.type === 'childList') {
          // добавленные узлы внутри .disabled — применить
          for (const node of m.addedNodes) {
            if (!(node instanceof Element)) continue;
            const container = node.closest?.('.disabled');
            if (container) {
              // полная пересборка конкретного контейнера (корректнее при сложных вставках)
              clearFromDisabledContainer(container);
              applyToDisabledContainer(container);
            }
          }
        }
      }
    });

    mo.observe(document.body || document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class'],
    });

    // экспорт утилит (по желанию)
    window.refreshDisabledGray = () => refresh();
    window.applyDisabledGray = (container) => applyToDisabledContainer(container);
    window.clearDisabledGray = (container) => clearFromDisabledContainer(container);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
