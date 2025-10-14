document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.faq__item').forEach((item) => {
    const icon = item.querySelector('.faq__icon');
    const panel = item.querySelector('.faq__desc');
    if (!icon || !panel) return;

    item.classList.remove('is-open');
    icon.classList.remove('is-active');

    icon.addEventListener('click', (e) => {
      e.preventDefault();

      const wasOpen = item.classList.contains('is-open');

      // убрать активные классы у всех
      document.querySelectorAll('.faq__item.is-open').forEach((it) => {
        it.classList.remove('is-open');
        const ico = it.querySelector('.faq__icon');
        if (ico) ico.classList.remove('is-active');
      });

      // если текущий был закрыт — открыть его; если был открыт — оставить закрытым
      if (!wasOpen) {
        item.classList.add('is-open');
        icon.classList.add('is-active');
      }
    });
  });

  // (опционально) клик вне FAQ — закрыть все
  document.addEventListener('click', (e) => {
    if (e.target.closest('.faq__item')) return;
    document.querySelectorAll('.faq__item.is-open').forEach((it) => {
      it.classList.remove('is-open');
      const ico = it.querySelector('.faq__icon');
      if (ico) ico.classList.remove('is-active');
    });
  });
});
