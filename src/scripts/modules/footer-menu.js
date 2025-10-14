/* ===========================
   Footer Menu (Instant Accordion) — only for columns with trigger
   =========================== */

// --- настройки ---
const MOBILE_BREAKPOINT = 768; // px
const isMobile = () => window.innerWidth < MOBILE_BREAKPOINT;

/* =========== helpers без анимации (мгновенно) =========== */
function slideDown(el) {
  if (!el) return;
  el.classList.remove('footer__nav--hidden');
  el.style.removeProperty('height');
  el.style.removeProperty('visibility');
  el.style.removeProperty('display');
}

function slideUp(el) {
  if (!el) return;
  el.classList.add('footer__nav--hidden');
  el.style.height = '0';
  el.style.visibility = 'hidden';
}

/* переключатель без анимации */
function slideToggle(el) {
  if (!el) return;
  if (el.classList.contains('footer__nav--hidden')) slideDown(el);
  else slideUp(el);
}

/* ================= утилиты ================= */
function getAccordionColumns() {
  // берём ТОЛЬКО колонки, где есть стрелка — они аккордеонные
  return Array.from(document.querySelectorAll('.footer__flex-column'))
    .filter(col => col.querySelector('.footer-menu-trigger-js'));
}

function syncAriaForColumn(col) {
  const nav = col.querySelector('.footer__nav');
  const title = col.querySelector('.title');
  if (!title || !nav) return;
  const expanded = !nav.classList.contains('footer__nav--hidden');
  title.setAttribute('aria-expanded', String(expanded));
}

function resetInline(el) {
  if (!el) return;
  el.style.removeProperty('height');
  el.style.removeProperty('visibility');
  el.style.removeProperty('display');
}

/* ================ обработка кликов ================ */
/* Аккордеон работает только на мобильных и только для "аккордеонных" колонок */
document.addEventListener('click', (e) => {
  if (!isMobile()) return;

  const trigger = e.target.closest('.footer-menu-trigger-js');
  if (!trigger) return;

  const column = trigger.closest('.footer__flex-column');
  if (!column) return;

  const current = column.querySelector('.footer__nav');
  if (!current) return; // колонка без списка — выходим

  // 1) закрыть остальные (только среди аккордеонных колонок)
  for (const col of getAccordionColumns()) {
    if (col === column) continue;

    const nav = col.querySelector('.footer__nav');
    if (nav && !nav.classList.contains('footer__nav--hidden')) {
      slideUp(nav);
    }
    const icon = col.querySelector('.footer-menu-trigger-js');
    if (icon) icon.classList.remove('is-rotated');
    syncAriaForColumn(col);
  }

  // 2) переключить текущую секцию
  slideToggle(current);

  // 3) повернуть текущую стрелку по факту состояния
  trigger.classList.toggle('is-rotated', !current.classList.contains('footer__nav--hidden'));

  // 4) ARIA
  syncAriaForColumn(column);
});

/* ================ init + resize ================= */
function initState() {
  // работаем только с аккордеонными колонками; прочие не трогаем
  for (const col of getAccordionColumns()) {
    const nav = col.querySelector('.footer__nav');
    const icon = col.querySelector('.footer-menu-trigger-js');
    if (!nav) continue;

    if (isMobile()) {
      // на мобилке уважаем текущее состояние классов; чистим инлайны
      resetInline(nav);
      if (icon) {
        const opened = !nav.classList.contains('footer__nav--hidden');
        icon.classList.toggle('is-rotated', opened);
      }
    } else {
      // на десктопе аккордеон не нужен — всё открыто, стрелки «ровно»
      nav.classList.remove('footer__nav--hidden');
      resetInline(nav);
      if (icon) icon.classList.remove('is-rotated');
    }
    syncAriaForColumn(col);
  }
}

document.addEventListener('DOMContentLoaded', initState);
window.addEventListener('resize', initState);
