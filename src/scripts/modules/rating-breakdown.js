
document.addEventListener('DOMContentLoaded', () => {
  const ACCENT = getComputedStyle(document.documentElement)
    .getPropertyValue('--rating-accent') || '#b7ff1e';

  const starPath = "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";

  function makeStars(nActive) {
    const wrap = document.createElement('div');
    wrap.className = 'rb__stars';
    for (let i = 1; i <= 5; i++) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.classList.add('rb__star', i <= nActive ? 'is-active' : 'is-muted');
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', starPath);
      svg.appendChild(p);
      wrap.appendChild(svg);
    }
    return wrap;
  }

  function renderBox(root) {
    let data = root.dataset.breakdown;
    try { data = JSON.parse(data); } catch { data = {}; }

    // нормализуем ключи
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, ...Object.fromEntries(Object.entries(data).map(([k, v]) => [+k, +v || 0])) };
    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    // средняя оценка
    const sum = Object.entries(counts)
      .reduce((acc, [stars, cnt]) => acc + (+stars) * cnt, 0);
    const avg = total ? (sum / total) : 0;

    // заголовок
    const headAvg = root.querySelector('.rating-box__avg');
    if (headAvg) headAvg.textContent = avg.toFixed(2);

    // если у тебя есть компонент звёзд из предыдущего кода:
    const headStars = root.querySelector('.rating[data-rating]');
    if (headStars) {
      headStars.innerHTML = '';                 // очистим контейнер
      const renderRating = (container, rating) => {
        const max = 5;
        for (let i = 1; i <= max; i++) {
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.setAttribute('viewBox', '0 0 24 24');
          svg.classList.add('rb__star', 'is-active');
          const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          p.setAttribute('d', starPath);
          svg.appendChild(p);

          // половинки не заморачиваем — можно добавить при желании
          if (rating < i && rating > i - 1) {
            // простая «половинка» через clipPath
            const id = `clip-${Math.random().toString(36).slice(2)}`;
            const cp = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
            cp.setAttribute('id', id);
            const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            r.setAttribute('x', '0'); r.setAttribute('y', '0'); r.setAttribute('width', '12'); r.setAttribute('height', '24');
            cp.appendChild(r); svg.appendChild(cp); p.setAttribute('clip-path', `url(#${id})`);
          } else if (rating < i) {
            svg.classList.remove('is-active'); svg.classList.add('is-muted');
          }

          container.appendChild(svg);
        }
      };
      renderRating(headStars, avg);
    }

    // тело
    const body = root.querySelector('.rating-breakdown');
    body.innerHTML = '';

    for (let stars = 5; stars >= 1; stars--) {
      const row = document.createElement('div');
      row.className = 'rb__row';

      const starsEl = makeStars(stars);
      row.appendChild(starsEl);

      const barWrap = document.createElement('div');
      barWrap.className = 'rb__bar';
      const bar = document.createElement('div');
      bar.className = 'rb__bar-fill';
      barWrap.appendChild(bar);

      const cnt = counts[stars] || 0;
      const pct = total ? (cnt / total) * 100 : 0;

      const countEl = document.createElement('div');
      countEl.className = 'rb__count';
      countEl.textContent = String(cnt);

      row.appendChild(barWrap);
      row.appendChild(countEl);
      body.appendChild(row);

      // анимация ширины
      requestAnimationFrame(() => { bar.style.width = pct.toFixed(2) + '%'; });
    }
  }

  document.querySelectorAll('.rating-box[data-breakdown]').forEach(renderBox);
});
