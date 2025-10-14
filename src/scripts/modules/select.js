/* ===========================
   Custom Select (country / currency)
   =========================== */

// helpers
function renderSelected(select, option) {
  const selected = select.querySelector('.select__selected-item');
  if (!selected || !option) return;

  const isCurrencySelect = select.classList.contains('select--currency');

  // контейнер иконки/флага из опции
  const optionImgWrap = option.querySelector('.select__option-img');
  const optionImg = optionImgWrap?.querySelector('img') || option.querySelector('img');

  // очищаем шапку
  selected.innerHTML = '';

  // --- флаг ---
  if (optionImgWrap) {
    const cloneWrap = optionImgWrap.cloneNode(true);
    cloneWrap.classList.remove('select__option-img');
    cloneWrap.classList.add('select__selected-img');

    const img = cloneWrap.querySelector('img');
    if (img) {
      img.removeAttribute('width');
      img.removeAttribute('height');
      img.style.width = '';
      img.style.height = '';
    }
    selected.appendChild(cloneWrap);
  } else if (optionImg) {
    const cloneImg = optionImg.cloneNode(true);
    cloneImg.removeAttribute('width');
    cloneImg.removeAttribute('height');

    const wrap = document.createElement('span');
    wrap.className = 'select__selected-img';
    wrap.appendChild(cloneImg);
    selected.appendChild(wrap);
  }

  // --- подпись ---
  const labelSpan = document.createElement('span');

  if (isCurrencySelect) {
    // берем код и символ из правого блока опции или из data-атрибутов
    const rightBlock = option.querySelector(':scope > div:last-child');
    const codeFromMarkup = rightBlock?.querySelector('span:first-child')?.textContent?.trim();
    const symbolFromMarkup = rightBlock?.querySelector('span:nth-child(2)')?.textContent?.trim();

    const code = (option.dataset.currency || codeFromMarkup || '').trim();
    const symbol = (option.dataset.symbol || symbolFromMarkup || '').trim();

    // если символ совпадает с кодом — показываем только код
    labelSpan.textContent = (symbol && symbol !== code) ? `${code} (${symbol})` : code;
  } else {
    // страны и прочее: берем название из левого блока
    const countrySpan = option.querySelector('div:first-child span:last-child');
    labelSpan.textContent = countrySpan ? countrySpan.textContent.trim() : option.textContent.trim();
  }

  selected.appendChild(labelSpan);
}

function setActiveOption(select, option) {
  if (!select.classList.contains('select--activeFunction')) return;

  select.querySelectorAll('.select__option.active')
    .forEach(o => o.classList.remove('active'));
  option.classList.add('active');
}

document.addEventListener('click', (e) => {
  const select = e.target.closest('.select-js');
  const allSelects = document.querySelectorAll('.select-js');

  // клик вне селекта — закрыть все
  if (!select) {
    allSelects.forEach(s => s.classList.remove('open'));
    return;
  }

  // закрыть остальные селекты
  allSelects.forEach(s => { if (s !== select) s.classList.remove('open'); });

  // выбор опции
  const option = e.target.closest('.select__option');
  if (option && select.contains(option)) {
    e.preventDefault();
    setActiveOption(select, option);
    renderSelected(select, option);
    select.classList.remove('open');

    // проброс значений (если нужно)
    const codeInput = document.getElementById('country-code');
    const currInput = document.getElementById('country-currency');
    if (codeInput) codeInput.value = option.dataset.code || '';
    if (currInput) currInput.value = option.dataset.currency || '';
    return;
  }

  // клик по шапке — открыть/закрыть
  if (!e.target.closest('.select__dropdown')) {
    select.classList.toggle('open');
  }
});

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.select-js').forEach(select => {
    const active = select.querySelector('.select__option.active');
    if (active) renderSelected(select, active);
  });
});
