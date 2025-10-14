// scripts/img.cjs
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const chokidar = require("chokidar");
const os = require("os");

let sharp;
try {
  sharp = require("sharp");
} catch (e) {
  console.error("[img] ERROR: sharp не установлен/не собран.", e.message);
  console.error("      Решение: npm i && npm rebuild sharp --verbose");
  process.exit(1);
}
sharp.concurrency(Math.max(1, (os.cpus()?.length || 2) - 1));

// === ВХОД/ВЫХОД ===
const inRoot = process.argv[3] || "src/images";
const outRoot = process.argv[4] || "dist/images";

// === НАБОРЫ ШИРИН ПО ГРУППАМ ===
const WIDTHS = {
  default: [320, 640, 960, 1440, 1920],
  services: [48, 72, 80, 92, 144, 152, 216, 304, 456],
  replenishments: [72, 144, 216],
  gamecurrency: [88, 176, 264],
  games: [120, 240, 360],
  gifts: [120, 240, 360],
  advantages: [102, 181, 204, 306, 362, 543],
  avatars: [36, 72, 108, 63, 128, 189, 80, 160, 240],
};
const GROUPS = [
  { name: "services", test: /(services)/i, widths: WIDTHS.services },
  { name: "replenishments", test: /(replenishments)/i, widths: WIDTHS.replenishments },
  { name: "gamecurrency", test: /(gamecurrency)/i, widths: WIDTHS.gamecurrency },
  { name: "games", test: /(games)/i, widths: WIDTHS.games },
  { name: "gifts", test: /(gifts)/i, widths: WIDTHS.gifts },
  { name: "advantages", test: /(advantages)/i, widths: WIDTHS.advantages },
  { name: "bgmobile", test: /(bgmobile)/i, widths: WIDTHS.bgmobile },
  { name: "bgdesktop", test: /(bgdesktop)/i, widths: WIDTHS.bgdesktop },
  { name: "avatars", test: /(avatars)/i, widths: WIDTHS.avatars },
];

const exts = new Set([".jpg", ".jpeg", ".png"]); // исходники
const enableAvif = process.env.IMG_NO_AVIF !== "1"; // IMG_NO_AVIF=1 чтобы отключить AVIF

const log = (...a) => console.log("[img]", ...a);
const err = (...a) => console.error("[img] ERROR:", ...a);

// name@72.png     -> [72,144]
// name@72x3.png   -> [72,144,216]
function parseDprToken(baseName) {
  const m = baseName.match(/^(.*)@(\d+)(?:x(\d+))?$/);
  if (!m) return null;
  const name = m[1];
  const base = parseInt(m[2], 10);
  const mult = m[3] ? parseInt(m[3], 10) : 3;
  const widths = Array.from({ length: mult }, (_, i) => base * (i + 1));
  return { name, widths };
}

// Подбираем набор ширин: приоритетом токен @…x…, затем группа по ПАПКЕ, иначе default
function pickWidthsFor(relPath, rawBase) {
  const token = parseDprToken(rawBase);
  if (token) return { base: token.name, widths: token.widths };
  const dirNorm = path.dirname(relPath).replace(/\\/g, "/");
  const grp = GROUPS.find(g => g.test.test(dirNorm));
  if (grp) return { base: rawBase, widths: grp.widths };
  return { base: rawBase, widths: WIDTHS.default };
}

// Рекурсивный обход
function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

async function ensureDir(p) {
  await fs.promises.mkdir(p, { recursive: true });
}

// Свежесть: выходной файл новее исходника и не пустой
function isFresh(src, dest) {
  try {
    const stSrc = fs.statSync(src);
    const stDst = fs.statSync(dest);
    return stDst.size > 0 && stDst.mtimeMs >= stSrc.mtimeMs;
  } catch {
    return false;
  }
}

async function convertOne(absPath) {
  const ext = path.extname(absPath).toLowerCase();
  if (!exts.has(ext)) return;

  const rel = path.relative(inRoot, absPath);
  const dir = path.dirname(rel);
  const rawBase = path.basename(rel, ext);
  const { base, widths } = pickWidthsFor(rel, rawBase);
  const outDir = path.join(outRoot, dir === "." ? "" : dir);

  await ensureDir(outDir);

  // Ограничиваем целевые ширины реальной шириной исходника
  const meta = await sharp(absPath).metadata();
  const srcW = meta.width || Infinity;
  const hasAlpha = !!meta.hasAlpha;
  let targets = widths.filter(w => w <= srcW);
  if (!targets.length && Number.isFinite(srcW)) targets = [srcW];

  log("→", rel, "=>", base, `[${targets.join(", ")}]`);

  // Опции кодеков
  const webpOpts = { quality: 80, effort: 4 };
  const avifOpts = { quality: 40, effort: 4, chromaSubsampling: "4:4:4" };
  const jpegOpts = { quality: 82, mozjpeg: true };
  const pngOpts = { compressionLevel: 9 };

  let didWork = false;

  for (const w of targets) {
    const stem = path.join(outDir, `${base}-${w}`);

    // WebP
    const outWebp = `${stem}.webp`;
    if (!isFresh(absPath, outWebp)) {
      try {
        await sharp(absPath)
          .resize({ width: w, withoutEnlargement: true })
          .webp(webpOpts)
          .toFile(outWebp);
        log("   ✓", path.relative(process.cwd(), outWebp));
        didWork = true;
      } catch (e) {
        err(`webp ${w}px`, e.message);
      }
    }

    // AVIF (по флагу)
    const outAvif = `${stem}.avif`;
    if (enableAvif && !isFresh(absPath, outAvif)) {
      try {
        await sharp(absPath)
          .resize({ width: w, withoutEnlargement: true })
          .avif(avifOpts)
          .toFile(outAvif);
        log("   ✓", path.relative(process.cwd(), outAvif));
        didWork = true;
      } catch (e) {
        err(`avif ${w}px (можно IMG_NO_AVIF=1)`, e.message);
      }
    }

    // Fallback: JPG (если нет альфы) или PNG (если есть альфа)
    const fallExt = hasAlpha ? "png" : "jpg";
    const outFall = `${stem}.${fallExt}`;
    if (!isFresh(absPath, outFall)) {
      try {
        const pipe = sharp(absPath).resize({ width: w, withoutEnlargement: true });
        if (hasAlpha) {
          await pipe.png(pngOpts).toFile(outFall);
        } else {
          await pipe.jpeg(jpegOpts).toFile(outFall);
        }
        log("   ✓", path.relative(process.cwd(), outFall));
        didWork = true;
      } catch (e) {
        err(`${fallExt} ${w}px`, e.message);
      }
    }
  }

  if (!didWork) log("   → skip (up-to-date)");
}

async function build() {
  log("start build");
  if (!fs.existsSync(inRoot)) {
    err(`нет папки "${inRoot}". Создай и положи .jpg/.png`);
    process.exitCode = 1;
    return;
  }
  await ensureDir(outRoot);

  const all = walk(inRoot);
  const cand = all.filter(p => exts.has(path.extname(p).toLowerCase()));
  if (cand.length === 0) {
    log(`не найдено ни одного .jpg/.jpeg/.png в ${inRoot}`);
    log(`пример: ${path.join(inRoot, "banners", "home.jpg")}`);
    return;
  }

  log(`найдено файлов: ${cand.length}`);
  for (const f of cand) {
    try { await convertOne(f); }
    catch (e) { err(`ошибка обработки ${f}`, e.message); }
  }
  log("done");
}

// Удалить производные, если исходник удалён
function removeOutputs(absPath) {
  const ext = path.extname(absPath).toLowerCase();
  if (!exts.has(ext)) return;
  const rel = path.relative(inRoot, absPath);
  const dir = path.dirname(rel);
  const rawBase = path.basename(rel, ext);
  const { base, widths } = pickWidthsFor(rel, rawBase);
  const outDir = path.join(outRoot, dir === "." ? "" : dir);

  let removed = 0;
  for (const w of widths) {
    for (const extOut of [".webp", ".avif", ".jpg", ".png"]) {
      const p = path.join(outDir, `${base}-${w}${extOut}`);
      try { fs.unlinkSync(p); removed++; } catch { /* no-op */ }
    }
  }
  if (removed) log(`✗ удалены производные: ${rel} (${removed} файлов)`);
}

function watchTask() {
  log(`watching ${inRoot} (jpg/jpeg/png)`);
  if (!fs.existsSync(inRoot)) fs.mkdirSync(inRoot, { recursive: true });
  fs.mkdirSync(outRoot, { recursive: true });

  const watcher = chokidar.watch(inRoot, { ignoreInitial: true });
  watcher.on("add", p => convertOne(p).catch(e => err("add", e.message)));
  watcher.on("change", p => convertOne(p).catch(e => err("change", e.message)));
  watcher.on("unlink", p => removeOutputs(p));
}

const cmd = (process.argv[2] || "build").toLowerCase();
if (cmd === "watch") watchTask();
else build();
