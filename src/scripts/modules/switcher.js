function raf2(cb) {
  requestAnimationFrame(() => requestAnimationFrame(cb));
}

function getScrollContainer(sw) {
  return sw.querySelector('.scroll__container') || sw;
}

// ---- измеряем фактическую геометрию активного пункта ----
function measureActiveGeometry(switcher) {
  const slider = switcher.querySelector('.switcher__slider');
  const active = switcher.querySelector('.switcher__item--active');
  if (!slider || !active) return null;

  const scroller = getScrollContainer(switcher);

  // форсируем layout, если вдруг стили только что изменились
  // eslint-disable-next-line no-unused-expressions
  active.offsetWidth;

  const a = active.getBoundingClientRect();
  const c = scroller.getBoundingClientRect();

  const left = a.left - c.left + scroller.scrollLeft;
  const width = a.width;

  return { slider, scroller, left, width };
}

// ---- применяем размеры к слайдеру (с твоими поправками +3 и -2) ----
function applySliderGeom(slider, { left, width }) {
  const w = Math.round(width);
  const l = Math.round(left);
  slider.style.width = `${w + 3}px`;
  slider.style.transform = `translateX(${l - 2}px)`;
}

// ---- ставим и перепроверяем; до 3 попыток для стабилизации ----
function positionSliderStable(switcher, attempt = 1) {
  const geom1 = measureActiveGeometry(switcher);
  if (!geom1) return;

  applySliderGeom(geom1.slider, geom1);

  // перепроверка на следующем кадре
  requestAnimationFrame(() => {
    const geom2 = measureActiveGeometry(switcher);
    if (!geom2) return;

    const deltaLeft = Math.abs((geom2.left) - (geom1.left));
    const deltaWidth = Math.abs((geom2.width) - (geom1.width));

    // если после применения размеры "уплыли" (шрифт дорисовался, скролл изменился и т.п.)
    if ((deltaLeft > 0.5 || deltaWidth > 0.5) && attempt < 3) {
      applySliderGeom(geom2.slider, geom2);
      // можем сделать ещё один цикл для полной стабилизации
      positionSliderStable(switcher, attempt + 1);
    } else {
      // финальный гарантированный апдейт
      applySliderGeom(geom2.slider, geom2);
    }
  });
}

function bindSwitcher(switcher) {
  if (switcher.__bound) return;
  switcher.__bound = true;

  const scroller = getScrollContainer(switcher);

  // Клик по табу
  switcher.addEventListener('click', (e) => {
    const item = e.target.closest('.switcher__item');
    if (!item || !switcher.contains(item)) return;

    switcher.querySelectorAll('.switcher__item')
      .forEach(i => i.classList.remove('switcher__item--active'));
    item.classList.add('switcher__item--active');

    raf2(() => positionSliderStable(switcher));
  }, { passive: true });

  // Движение при горизонтальной прокрутке контейнера
  scroller.addEventListener('scroll', () => {
    // коалесим через rAF2 и стабилизируем
    raf2(() => positionSliderStable(switcher));
  }, { passive: true });

  // Автопересчёт при любых ресайзах
  const ro = new ResizeObserver(() => positionSliderStable(switcher));
  ro.observe(switcher);
  ro.observe(scroller);
  switcher.__ro = ro;
}

async function initSwitchers() {
  // ждём шрифты — иначе ширина кнопок "прыгает"
  if (document.fonts && document.fonts.ready) {
    try { await document.fonts.ready; } catch { }
  }

  document.querySelectorAll('.switcher').forEach(sw => {
    bindSwitcher(sw);
    // после layout/стилей — ставим и перепроверяем
    raf2(() => positionSliderStable(sw));
  });
}

function remeasureAll() {
  document.querySelectorAll('.switcher').forEach(positionSliderStable);
}

// init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSwitchers);
} else {
  initSwitchers();
}

// при изменении окна/ориентации
window.addEventListener('resize', () => raf2(remeasureAll));
window.addEventListener('orientationchange', () => setTimeout(remeasureAll, 50));