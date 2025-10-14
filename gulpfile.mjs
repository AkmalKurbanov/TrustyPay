// ===== IMPORTS =====
import { spawn } from "node:child_process";
import { src, dest, series, parallel, watch } from "gulp";
import { deleteAsync } from "del";
import browserSyncLib from "browser-sync";
import plumber from "gulp-plumber";
import pug from "gulp-pug";
import * as dartSass from "sass";
import gulpSass from "gulp-sass";
import postcss from "gulp-postcss";
import autoprefixer from "autoprefixer";
import cssnano from "cssnano";
import svgSprite from "gulp-svg-sprite";
import * as esbuild from "esbuild";
import fs from "fs";
import path from "path";
import newer from "gulp-newer";
import postcssImport from "postcss-import";
import { createHash } from "crypto";
import changed from "gulp-changed"; // <— инкрементальная сборка страниц

const sass = gulpSass(dartSass);
const bs = browserSyncLib.create();

const isProd = process.argv.includes("--build");
const useRev = process.env.REV === "1"; // зарезервировано под ревизию (не используется сейчас)

// ЕДИНСТВЕННЫЙ JSON-ФАЙЛ ДАННЫХ ДЛЯ PUG (не триггерим пересборку)
const DATA_FILE = "src/pug/_data/data.json"; // оставлен на будущее

// ===== PATHS =====
const paths = {
  pug: { src: "src/pug/pages/**/*.pug", watch: "src/pug/pages/**/*.pug", dest: "dist" },

  styles: {
    src: "src/styles/main.{sass,scss}",
    watch: "src/styles/**/*.{sass,scss}",
    dest: "dist/css",
  },

  scripts: { src: "src/scripts/main.js", watch: "src/scripts/**/*.js", dest: "dist/js" },

  // статика 1:1
  static: { src: "src/images/static/**/*", dest: "dist/images/static" },

  // копируем только то, что НЕ генерит sharp
  imagesMisc: {
    src: ["src/images/**/*.{svg,gif,ico}", "!src/images/static/**", "!src/icons/**"],
    dest: "dist/images",
  },

  icons: { src: "src/icons/**/*.svg", dest: "dist/images/sprite" },

  fonts: { src: "src/fonts/**/*.{woff,woff2,ttf,otf,eot}", dest: "dist/fonts" },
};

// ===== HELPERS =====
function handleErrors(task) {
  return plumber({
    errorHandler(err) {
      const msg =
        (err && (err.messageFormatted || err.message || err.toString())) ||
        "Unknown error";
      console.error(`[${task}]`, msg);
      this.emit("end");
    },
  });
}

// ===== CLEANERS =====
export function cleanAll() {
  return deleteAsync(["dist"]);
}
export function cleanSafe() {
  return deleteAsync(["dist/**", "!dist/images", "!dist/images/**"]);
}

// ===== IMAGES (sharp) =====
export function imagesSharp(cb) {
  const cp = spawn(process.execPath, ["scripts/img.cjs", "build", "src/images", "dist/images"], {
    stdio: "inherit",
  });
  cp.on("close", (code) => (code ? cb(new Error(`img.cjs exited ${code}`)) : cb()));
}

export function imagesSharpWatch(cb) {
  const cp = spawn(process.execPath, ["scripts/img.cjs", "watch", "src/images", "dist/images"], {
    stdio: "inherit",
  });
  // долгоживущий процесс — не вызываем cb, пока не завершится
  cp.on("close", () => cb());
}

// если dist/images пуст — единоразово сгенерим перед стартом dev
export function maybeImagesBuild(cb) {
  try {
    const dir = "dist/images";
    const ok = fs.existsSync(dir) && fs.readdirSync(dir).length > 0;
    if (ok) return cb();
  } catch { }
  return imagesSharp(cb);
}

// ===== (опционально) JSON -> locals для Pug =====
function loadJsonLocals(file = DATA_FILE) {
  try {
    if (!fs.existsSync(file)) return {};
    const raw = fs.readFileSync(file, "utf8");
    return raw.trim() ? JSON.parse(raw) : {};
  } catch { return {}; }
}

// ===== PUG BUILD (инкрементально по сохранению страницы) =====
function buildPagesOnce(srcGlobOrFile) {
  const locals = loadJsonLocals();           // <-- ВАЖНО
  return src(srcGlobOrFile, { allowEmpty: true, base: "src/pug/pages" })
    .pipe(plumber({ errorHandler(err) { console.error("[PUG]", err.message); this.emit("end"); } }))
    .pipe(pug({ basedir: "src/pug", pretty: !isProd, locals }))
    .pipe(dest(paths.pug.dest))
    .pipe(bs.stream());
}

function isPagePug(filePath) {
  const p = path.normalize(filePath);
  const pagesDir = path.normalize("src/pug/pages" + path.sep);
  return p.includes(pagesDir);
}

function rebuildOnlyChangedPug(filePath) {
  if (!isPagePug(filePath)) return;      // include/layout — игнорим
  return buildPagesOnce(filePath);       // страница — собираем только её
}

function deleteOutputHtmlFor(unlinkedPugFile) {
  if (!isPagePug(unlinkedPugFile)) return;
  const rel = path.relative("src/pug/pages", unlinkedPugFile); // foo/bar.pug
  const out = path.join(paths.pug.dest, rel).replace(/\.pug$/, ".html"); // dist/foo/bar.html
  if (fs.existsSync(out)) fs.unlinkSync(out);
}

// ===== TASKS =====
export function html() {
  const locals = loadJsonLocals();           // <-- ВАЖНО
  return src(paths.pug.src, { base: "src/pug/pages" })
    .pipe(plumber({ errorHandler(err) { console.error("[PUG:all]", err.message); this.emit("end"); } }))
    .pipe(pug({ basedir: "src/pug", pretty: !isProd, locals }))
    .pipe(dest(paths.pug.dest));
}

export function styles() {
  return src(paths.styles.src, { sourcemaps: !isProd })
    .pipe(
      plumber({
        errorHandler(err) {
          const msg = err.messageFormatted || err.message || String(err);
          console.error(msg);
          bs.notify(`<pre style="text-align:left">${msg.replace(/</g, "&lt;")}</pre>`, 5000);
          this.emit("end");
        },
      })
    )
    .pipe(sass.sync({ outputStyle: "expanded", loadPaths: ["node_modules"] }).on("error", sass.logError))
    .pipe(postcss([postcssImport({ path: ["node_modules"] }), autoprefixer(), ...(isProd ? [cssnano()] : [])]))
    .pipe(dest(paths.styles.dest, { sourcemaps: !isProd }))
    .pipe(bs.stream());
}

export async function scripts() {
  try {
    await esbuild.build({
      entryPoints: [paths.scripts.src],
      outfile: `${paths.scripts.dest}/main.js`,
      bundle: true,
      platform: "browser",
      target: "es2018",
      sourcemap: !isProd,
      minify: isProd,
    });
    bs.reload();
  } catch (e) {
    console.error(e);
  }
}

export function staticAssets() {
  if (!fs.existsSync("src/images/static")) return Promise.resolve();
  return src(paths.static.src, { allowEmpty: true }).pipe(dest(paths.static.dest));
}

export function imagesMisc() {
  return src(paths.imagesMisc.src, { allowEmpty: true })
    .pipe(newer(paths.imagesMisc.dest))
    .pipe(dest(paths.imagesMisc.dest));
}

function sha256(filePath) {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function walk(dir, predicate, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, predicate, out);
    else if (predicate(p)) out.push(p);
  }
  return out;
}

// === АТОМАРНАЯ ЗАПИСЬ ШРИФТОВ ЧЕРЕЗ STAGING ===
export function fonts(cb) {
  const SRC_DIR = "src/fonts";
  const DST_DIR = "dist/fonts";
  const EXTS = new Set([".woff2", ".woff", ".ttf", ".otf", ".eot"]);

  if (!fs.existsSync(SRC_DIR)) return cb?.();

  try {
    fs.mkdirSync(DST_DIR, { recursive: true });

    // Собираем все файлы шрифтов рекурсивно
    const files = walk(SRC_DIR, (p) => EXTS.has(path.extname(p).toLowerCase()));

    for (const from of files) {
      const rel = path.relative(SRC_DIR, from);
      const to = path.join(DST_DIR, rel);
      fs.mkdirSync(path.dirname(to), { recursive: true });

      // Атомарная запись: сначала во временный файл, затем rename
      const tmp = to + ".tmp-copy";
      fs.copyFileSync(from, tmp);
      fs.renameSync(tmp, to);

      // Верификация: src и dist должны совпасть побайтно (SHA256)
      const hSrc = sha256(from);
      const hDist = sha256(to);
      if (hSrc !== hDist) {
        // Повторная копия на всякий случай (Windows/антивирус)
        fs.copyFileSync(from, to);
        const hDist2 = sha256(to);
        if (hSrc !== hDist2) {
          throw new Error(
            `Font copy mismatch for "${rel}"\n  src:  ${hSrc}\n  dist: ${hDist2}\n  from: ${from}\n  to:   ${to}`
          );
        }
      }
    }

    setTimeout(() => {
      bs.reload();
      cb?.();
    }, 150); // небольшой люфт и перезагрузка
  } catch (err) {
    cb?.(err);
  }
}

export function sprite() {
  if (!fs.existsSync("src/icons")) return Promise.resolve();
  return src(paths.icons.src, { allowEmpty: true })
    .pipe(
      svgSprite({
        mode: { symbol: { sprite: "sprite.svg", example: false } },
        shape: {
          transform: [
            {
              svgo: {
                plugins: [
                  { name: "removeViewBox", active: false },
                  { name: "removeDimensions", active: true },
                  { name: "removeAttrs", params: { attrs: "(fill|stroke)" } },
                ],
              },
            },
          ],
        },
      })
    )
    .pipe(dest(paths.icons.dest));
}

export function iconsRaw() {
  return src("src/icons/**/*.svg", { allowEmpty: true })
    .pipe(newer("dist/icons"))
    .pipe(dest("dist/icons"));
}

export function flags() {
  return src("node_modules/flag-icons/flags/**/*").pipe(dest("dist/flags"));
}

// ===== SERVER + WATCH =====
function server(done) {
  bs.init({
    server: { baseDir: "dist" },
    open: false,
    notify: false,
    port: 3000,
    // НЕ наблюдаем весь dist — релоадим из тасков
    reloadDebounce: 200,
    watchOptions: {
      awaitWriteFinish: { stabilityThreshold: 600, pollInterval: 100 },
    },
  });
  done();
}

function watcher() {
  const wopts = { awaitWriteFinish: { stabilityThreshold: 600, pollInterval: 100 } };

  // PUG: только страницы. Любые include/layout НЕ триггерят пересборку.
  const pugWatcher = watch(paths.pug.watch, wopts);
  pugWatcher.on("add", (filePath) => buildPagesOnce(filePath));
  pugWatcher.on("change", (filePath) => buildPagesOnce(filePath));
  pugWatcher.on("unlink", (filePath) => {
    deleteOutputHtmlFor(filePath);
    bs.reload();
  });

  // НЕ вотчим DATA_FILE и src/pug/**/partials — по твоему ТЗ.

  // Остальные вотчеры
  watch(paths.styles.watch, wopts, styles);
  watch(paths.scripts.watch, wopts, scripts);
  watch("src/images/static/**/*", wopts, staticAssets);
  watch(paths.imagesMisc.src, wopts, imagesMisc);
  watch(paths.icons.src, wopts, series(sprite, iconsRaw, () => bs.reload()));
  watch(paths.fonts.src, wopts, fonts); // reload делает сам fonts() ПОСЛЕ копирования
}

// ===== COMPOSITES =====
// PROD: полная чистка -> генерация картинок -> сборка
export const build = series(
  cleanAll,
  imagesSharp,
  parallel(flags, html, styles, scripts, staticAssets, imagesMisc, fonts, sprite, iconsRaw)
);

// DEV: мягкая чистка -> (если пусто) сгенерить картинки -> сборка -> сервер+вотчеры+sharp-watch
export default series(
  cleanSafe,
  maybeImagesBuild,
  parallel(flags, html, styles, scripts, staticAssets, imagesMisc, fonts, sprite, iconsRaw),
  parallel(server, watcher, imagesSharpWatch)
);
