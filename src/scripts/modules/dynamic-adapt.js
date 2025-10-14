function dynamicAdaptMobileFirst() {
  const elements = document.querySelectorAll('[data-move]');
  const width = window.innerWidth;

  elements.forEach(el => {
    const [targetSelector, breakpoint] = el.dataset.move.split(',');
    const target = document.querySelector(targetSelector.trim());

    // сохраняем исходного родителя и позицию
    if (!el.dataset.originalParent) {
      el.dataset.originalParent = el.parentNode;
      el.dataset.originalIndex = [...el.parentNode.children].indexOf(el);
    }

    const originalParent = el.dataset.originalParent;
    const originalIndex = +el.dataset.originalIndex;

    // mobile-first логика: переносим, если экран >= брейкпоинта
    if (width >= +breakpoint && target) {
      target.appendChild(el);
    } else {
      const parent = el.dataset.originalParent;
      if (parent instanceof Element && el.parentNode !== parent) {
        const siblings = parent.children;
        if (siblings.length > originalIndex) {
          parent.insertBefore(el, siblings[originalIndex]);
        } else {
          parent.appendChild(el);
        }
      }
    }
  });
}

window.addEventListener('load', dynamicAdaptMobileFirst);
window.addEventListener('resize', dynamicAdaptMobileFirst);
