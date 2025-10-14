// scripts/build-countries.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// эти два пакета — CJS/JSON, подтягиваем через require
const countries = require('world-countries'); // массив стран (JSON)
const iso = require('i18n-iso-countries');   // объект
const ru = require('i18n-iso-countries/langs/ru.json');

iso.registerLocale(ru);

const DATA_FILE = 'src/pug/_data/data.json';

// вернуть символ валюты (если не получится — сам код)
function currencySymbol(code, locale = 'ru') {
  try {
    const parts = new Intl.NumberFormat(locale, { style: 'currency', currency: code }).formatToParts(1);
    return parts.find(p => p.type === 'currency')?.value || code;
  } catch { return code; }
}

// соберём список стран
const list = countries.map(c => {
  const code = c.cca2; // "RU", "US", ...
  const name = iso.getName(code, 'ru') || c.name?.common || code;
  const curr = Object.keys(c.currencies || {}); // ["RUB"], ["EUR"], ["USD", ...]
  return {
    code,
    name,
    currencies: curr,
    symbols: curr.map(currencySymbol),
  };
}).filter(x => x.name)
  .sort((a, b) => a.name.localeCompare(b.name, 'ru'));

// обновим/создадим data.json
let out = {};
try {
  if (fs.existsSync(DATA_FILE)) {
    out = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8') || '{}');
  } else {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  }
} catch { }

out.countries = list;

fs.writeFileSync(DATA_FILE, JSON.stringify(out, null, 2), 'utf8');
console.log(`[countries] ${list.length} записей -> ${DATA_FILE}`);
