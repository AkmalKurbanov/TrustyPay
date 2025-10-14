document.addEventListener("DOMContentLoaded", () => {
  const originals = new WeakMap(); // храним исходный HTML в памяти

  function getFirstP(desc) {
    return desc.querySelector("p");
  }

  function smartBySentence(text) {
    const end = text.search(/[.!?…](\s|$)/);
    const cutAt = end !== -1 ? end + 1 : Math.min(140, text.length);
    return { head: text.slice(0, cutAt).trim(), tail: text.slice(cutAt) };
  }

  function byChars(text, n) {
    n = Math.max(1, Number(n) || 180);
    if (text.length <= n) return { head: text, tail: "" };
    // не рвём слово, откатываемся до ближайшего пробела
    const space = text.lastIndexOf(" ", n);
    const cut = space > n * 0.7 ? space : n;
    return { head: text.slice(0, cut).trim(), tail: text.slice(cut) };
  }

  function byWord(text, word) {
    if (!word) return smartBySentence(text);
    const re = new RegExp(`(${word})([\\s.,;:!?…]*)`, "i");
    const m = re.exec(text);
    if (!m) return smartBySentence(text);
    const endWord = m.index + m[1].length;
    const skipAll = m.index + m[0].length;
    return { head: text.slice(0, endWord).trim(), tail: text.slice(skipAll) };
  }

  function byElement(desc, p, selector = ".cut-here") {
    const mark = p.querySelector(selector);
    if (!mark) return null;
    // Собираем текст до метки (только из первого p)
    // Простой путь: взять p.textContent и обрезать по позиции маркера
    // (позицию найдём через временную замену маркера уникальным символом):
    const marker = "\uFFFFCUT\uFFFF";
    const cloned = p.cloneNode(true);
    const inner = cloned.innerHTML.replace(
      new RegExp(`<([^>]*?)class="([^"]*\\b${selector.replace('.', '')}\\b[^"]*)"([^>]*)>(.*?)</[^>]+>`, "i"),
      marker
    );
    const tmp = document.createElement("div");
    tmp.innerHTML = inner;
    const plain = tmp.textContent;
    const idx = plain.indexOf(marker);
    if (idx === -1) return null;
    return { head: plain.slice(0, idx).trim(), tail: plain.slice(idx + marker.length) };
  }

  function collapse(desc) {
    const original = originals.get(desc);
    if (typeof original !== "string") return;
    desc.innerHTML = original;

    const mode = (desc.getAttribute("data-cut-mode") || "sentence").toLowerCase();
    const firstP = getFirstP(desc);
    if (!firstP) return;

    const text = firstP.textContent || "";
    let parts = null;

    switch (mode) {
      case "chars":
        parts = byChars(text, desc.getAttribute("data-cut-chars"));
        break;
      case "word":
        parts = byWord(text, desc.getAttribute("data-cut-word"));
        break;
      case "element":
        parts = byElement(desc, firstP, desc.getAttribute("data-cut-selector") || ".cut-here");
        if (!parts) parts = smartBySentence(text);
        break;
      case "sentence":
      default:
        parts = smartBySentence(text);
        break;
    }

    const { head, tail } = parts;

    // Если нечего скрывать и нет последующих элементов — остаёмся на полном тексте
    const hasSiblings = !!firstP.nextElementSibling;
    if (!tail.trim() && !hasSiblings) {
      desc.innerHTML = original;
      return;
    }

    // Меняем только контент первого <p>
    firstP.textContent = head + "…";

    // Скрываем все последующие элементы (структура сохранена)
    let sib = firstP.nextElementSibling;
    while (sib) {
      sib.style.display = "none";
      sib = sib.nextElementSibling;
    }
  }

  function expand(desc) {
    const original = originals.get(desc);
    if (typeof original === "string") desc.innerHTML = original;
  }

  document.querySelectorAll(".footer__about").forEach(block => {
    const desc = block.querySelector(".footer__about-desc");
    const btn = block.querySelector(".more-js");
    if (!desc || !btn) return;

    // Сохраняем исходник
    if (!originals.has(desc)) originals.set(desc, desc.innerHTML);

    // Кнопка не сабмитит
    if (!btn.hasAttribute("type")) btn.setAttribute("type", "button");

    // Старт: свёрнуто
    collapse(desc);
    let expanded = false;
    btn.innerHTML = `Читать полностью <span class="icon"><svg class="icon icon--angle icon" aria-hidden="true" width="18" height="18"><use href="/images/sprite/symbol/sprite.svg#angle"></use></svg></span>`;

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      if (expanded) {
        collapse(desc);
        btn.innerHTML = `Читать полностью <span class="icon"><svg class="icon icon--angle icon" aria-hidden="true" width="18" height="18"><use href="/images/sprite/symbol/sprite.svg#angle"></use></svg></span>`;
      } else {
        expand(desc);
        btn.innerHTML = `Скрыть <span class="icon" style="transform:rotate(180deg)"><svg class="icon icon--angle icon" aria-hidden="true" width="18" height="18"><use href="/images/sprite/symbol/sprite.svg#angle"></use></svg></span>`;
      }
      expanded = !expanded;
    });

    // Экспорт простого API (по желанию)
    block.Truncator = {
      expand: () => { expand(desc); expanded = true; },
      collapse: () => { collapse(desc); expanded = false; },
      isExpanded: () => expanded
    };
  });
});

