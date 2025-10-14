// modals.js — единый контроллер модалок/табов и body-lock
// ВАЖНО: слушатели на document повешены в CAPTURE-фазе, чтобы обойти stopPropagation внутри табов.

/* ==================== УТИЛЫ ==================== */

// Есть ли открытые МОДАЛКИ (.popup.show)
function hasAnyOpenModal() {
  return !!document.querySelector(".popup.show");
}

// Безопасный query по имени
function queryCalledByName(root, name) {
  if (!name) return null;
  try {
    return root.querySelector(`.called-js[data-name="${CSS.escape(name)}"]`);
  } catch {
    return root.querySelector(`.called-js[data-name="${name}"]`);
  }
}

// Найти триггер по имени внутри scope
function getTriggerByName(name, scope = document) {
  if (!name) return null;
  try {
    return scope.querySelector(`.trigger-js[data-name="${CSS.escape(name)}"]`);
  } catch {
    return scope.querySelector(`.trigger-js[data-name="${name}"]`);
  }
}

// Глобальный адаптер блокировки скролла
const toggleBodyLock =
  typeof window.toggleBodyLock === "function"
    ? window.toggleBodyLock
    : (() => {
      let locked = false;
      let savedY = 0;
      const html = document.documentElement;
      const body = document.body;

      function lock() {
        if (locked) return;
        savedY = window.scrollY || window.pageYOffset || 0;
        body.style.position = "fixed";
        body.style.top = `-${savedY}px`;
        body.style.left = "0";
        body.style.right = "0";
        body.style.width = "100%";
        html.classList.add("scroll-locked");
        body.classList.add("scroll-locked");
        locked = true;
      }

      function unlock() {
        if (!locked) return;
        body.style.position = "";
        body.style.top = "";
        body.style.left = "";
        body.style.right = "";
        body.style.width = "";
        html.classList.remove("scroll-locked");
        body.classList.remove("scroll-locked");
        window.scrollTo(0, savedY);
        locked = false;
      }

      return (shouldLock) => (shouldLock ? lock() : unlock());
    })();

// Опциональный хелпер из проекта
const applyAuthTop =
  typeof window.applyAuthTop === "function" ? window.applyAuthTop : () => { };

/* ==================== БАЗОВЫЕ ОПЕРАЦИИ ==================== */

function openBox(el) {
  if (!el || el.classList.contains("show")) return false;
  el.classList.add("show");
  return true;
}
function closeBox(el) {
  if (!el || !el.classList.contains("show")) return false;
  el.classList.remove("show");
  return true;
}
function activateTrigger(tr) {
  tr?.classList.add("active");
}
function deactivateTrigger(tr) {
  tr?.classList.remove("active");
}
function deactivateTriggerFor(container) {
  const name = container?.getAttribute?.("data-name");
  const scope = container?.closest?.(".tabs") || document;
  const trigger =
    getTriggerByName(name, scope) || getTriggerByName(name, document);
  deactivateTrigger(trigger);
}

/* ==================== ЛОГИКА ==================== */

// Открытие/переключение по .trigger-js
// !!! ВЕШАЕМ В CAPTURE-ФАЗЕ, чтобы обойти stopPropagation в табах
document.addEventListener(
  "click",
  (e) => {
    const trigger = e.target?.closest?.(".trigger-js");
    if (!trigger) return;

    const name = trigger.getAttribute("data-name");
    if (!name) return;

    const tabsScope = trigger.closest(".tabs"); // может быть null
    // 1) Сначала ищем в пределах ближайших табов
    let target = tabsScope ? queryCalledByName(tabsScope, name) : null;
    // 2) Если не нашли — ищем глобально (модалка вне табов)
    if (!target) target = queryCalledByName(document, name);
    if (!target) return;

    // Закрыть соседей только если target действительно относится к tabsScope
    let openedSiblings = [];
    if (tabsScope && tabsScope.contains(target)) {
      openedSiblings = Array.from(
        tabsScope.querySelectorAll(`.called-js.show:not([data-name="${name}"])`)
      );
    }

    let changed = false;

    if (target.classList.contains("show")) {
      // если открыт — закрыть
      changed = closeBox(target) || changed;
      deactivateTrigger(trigger);
    } else {
      // закрыть соседей в рамках tabsScope
      openedSiblings.forEach((el) => {
        changed = closeBox(el) || changed;
        deactivateTriggerFor(el);
      });
      // открыть текущий
      changed = openBox(target) || changed;
      activateTrigger(trigger);
      applyAuthTop?.();
    }

    if (changed) {
      // Лочим ТОЛЬКО если открыт .popup.show (табы не трогаем)
      toggleBodyLock(hasAnyOpenModal());
    }
  },
  true // <-- capture
);

// Закрытие по кнопкам: .popup__close-btn, .close-js, [data-close]
// Тоже слушаем в capture, чтобы не зависеть от чужих stopPropagation
document.addEventListener(
  "click",
  (e) => {
    const closeBtn =
      e.target?.closest?.(".popup__close-btn, .close-js, [data-close]");
    if (!closeBtn) return;

    const container =
      closeBtn.closest(".popup") || closeBtn.closest(".called-js") || null;

    if (!container) return;

    let changed = false;
    changed = closeBox(container) || changed;
    deactivateTriggerFor(container);

    if (changed) {
      toggleBodyLock(hasAnyOpenModal());
    }
  },
  true // <-- capture
);

// Закрытие по клику на overlay (.popup, мимо .popup__box)
document.addEventListener(
  "mouseup",
  (e) => {
    const overlay = e.target?.closest?.(".popup");
    if (!overlay) return; // не по попапу
    if (e.target.closest(".popup__box")) return; // клик по контенту — игнор

    const changed = closeBox(overlay);
    if (changed) {
      deactivateTriggerFor(overlay.closest(".called-js") || overlay);
      toggleBodyLock(hasAnyOpenModal());
    }
  },
  true // <-- тоже на capture на всякий случай
);

// Escape — закрыть все открытые модалки
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;

  const opened = Array.from(document.querySelectorAll(".popup.show"));
  if (!opened.length) return;

  let changed = false;
  opened.forEach((el) => {
    changed = closeBox(el) || changed;
    deactivateTriggerFor(el.closest(".called-js") || el);
  });

  if (changed) {
    toggleBodyLock(hasAnyOpenModal());
  }
});

// Если при загрузке уже есть открытая модалка — залочим скролл
document.addEventListener("DOMContentLoaded", () => {
  toggleBodyLock(hasAnyOpenModal());
});
