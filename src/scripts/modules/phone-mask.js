import { AsYouType } from 'libphonenumber-js/max';

function initPhoneMask() {
  const $input = document.querySelector('#phone');
  if (!$input) return;                         

  const $e164 = document.querySelector('#phone_e164'); 
  const $meta = document.querySelector('#phone_meta');

  const formatter = new AsYouType(); 

  const withLeadingPlus = (value) => {
    const onlyDigitsAndPlus = String(value || '').replace(/[^\d+]/g, '');
    const noPluses = onlyDigitsAndPlus.replace(/\+/g, '');
    return '+' + noPluses;
  };


  $input.addEventListener('keydown', (e) => {
    const { selectionStart, selectionEnd } = $input;
    if ((e.key === 'Backspace' && selectionStart <= 1 && selectionEnd <= 1) ||
      (e.key === 'Delete' && selectionStart === 0 && selectionEnd <= 1)) {
      e.preventDefault();
    }
    if (e.key === 'Home') {
      e.preventDefault();
      $input.setSelectionRange(1, 1);
    }
  });


  $input.addEventListener('focus', () => {
    if (!$input.value) {
      $input.value = '+';
      $input.setSelectionRange(1, 1);
    }
  });

  function format() {
    let raw = withLeadingPlus($input.value);

    formatter.reset();
    const pretty = formatter.input(raw);
    $input.value = pretty;
    $input.setSelectionRange($input.value.length, $input.value.length);

    const num = formatter.getNumber();
    if (num) {
      if ($e164) $e164.value = num.number || '';
      const valid = num.isValid();
      const ctry = num.country || '—';
      const intl = num.formatInternational?.() || '';
      if ($meta) $meta.textContent = `${ctry} • ${valid ? 'валиден' : 'невалиден'} • ${intl}`;
      $input.classList.toggle('is-valid', valid);
      $input.classList.toggle('is-invalid', !valid);
    } else {
      if ($input.value === '+') {
        if ($meta) $meta.textContent = '';
        if ($e164) $e164.value = '';
        $input.classList.remove('is-valid', 'is-invalid');
        return;
      }
      if ($meta) $meta.textContent = '';
      if ($e164) $e164.value = '';
      $input.classList.remove('is-valid', 'is-invalid');
    }
  }

  $input.addEventListener('input', format);
  $input.addEventListener('blur', format);
}


if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPhoneMask);
} else {
  initPhoneMask();
}