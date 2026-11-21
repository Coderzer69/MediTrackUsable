// Dark theme generator.
//
// Scans the app's source for Tailwind color classes (bg-white, text-gray-900,
// hover:bg-emerald-50, bg-[#F8FAF9], ...) and writes a stylesheet that gives
// each of them a tuned dark-mode color under `.dark`. Colors are converted with
// perceptual (OKLCH) lightness so light surfaces become dark surfaces, dark text
// becomes light text, and brand/accent hues are preserved.
//
// It runs automatically from vite.config.ts (on start and whenever a source
// file changes), so new classes get dark styles without any extra work.
// To style a single element differently, add a `dark:` class to it - those always
// win, because theme.css gives the dark variant a higher specificity.

import fs from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------- color math

const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

const rgbToOklch = (r, g, b) => {
  const [lr, lg, lb] = [r, g, b].map((v) => srgbToLinear(v / 255));
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.sqrt(A * A + B * B);
  let H = (Math.atan2(B, A) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { L, C, H };
};

const parseColor = (raw) => {
  const v = raw.trim().toLowerCase();
  let m = v.match(/^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)/);
  if (m) return { L: m[2] ? +m[1] / 100 : +m[1], C: +m[3], H: +m[4] };
  m = v.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    let hex = m[1];
    if (hex.length === 3 || hex.length === 4) hex = [...hex].map((c) => c + c).join('');
    const n = parseInt(hex.slice(0, 6), 16);
    return rgbToOklch((n >> 16) & 255, (n >> 8) & 255, n & 255);
  }
  m = v.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/);
  if (m) return rgbToOklch(+m[1], +m[2], +m[3]);
  return null;
};

const fmt = ({ L, C, H }, alpha) =>
  `oklch(${(L * 100).toFixed(1)}% ${C.toFixed(3)} ${H.toFixed(1)}${alpha != null && alpha < 1 ? ` / ${alpha}` : ''})`;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
// Tailwind's grays carry a slight blue tint, so neutrality comes from the palette
// name when known, and from chroma for arbitrary colors.
const isNeutral = (c) => (c.neutral != null ? c.neutral : c.C < 0.03);

// ---------------------------------------------------------- dark mappings

// Backgrounds: light surfaces become layered dark surfaces; solid colors stay.
const darkSurface = (c) => {
  if (c.L >= 0.9) {
    if (isNeutral(c)) {
      const L = c.L >= 0.995 ? 0.215 : c.L >= 0.975 ? 0.17 : c.L >= 0.95 ? 0.25 : 0.29;
      return { L, C: Math.min(c.C * 2, 0.012), H: c.H };
    }
    const L = c.L >= 0.97 ? 0.26 : c.L >= 0.94 ? 0.29 : 0.33;
    return { L, C: Math.min(c.C * 1.1, 0.07), H: c.H };
  }
  if (c.L >= 0.75) return isNeutral(c) ? { L: 0.37, C: c.C, H: c.H } : { L: 0.43, C: c.C * 0.9, H: c.H };
  // Solid and deep colours (brand buttons, the dark-green footer, badges) keep their
  // light-mode value: they already read well on a dark page.
  return null;
};

// Text: dark text becomes light text; already-light text is left alone.
const darkInk = (c) => {
  if (c.L >= 0.62) return null;
  if (isNeutral(c)) return { L: clamp(0.985 - (c.L - 0.2) * 0.85, 0.66, 0.985), C: c.C, H: c.H };
  return { L: clamp(0.8 - (c.L - 0.3) * 0.3, 0.72, 0.86), C: Math.min(c.C, 0.16), H: c.H };
};

// Borders, rings, dividers: light lines become subtle dark lines.
const darkLine = (c) => {
  if (c.L >= 0.85) return isNeutral(c) ? { L: 0.31, C: c.C, H: c.H } : { L: 0.4, C: c.C * 0.7, H: c.H };
  if (c.L >= 0.7 && isNeutral(c)) return { L: 0.42, C: c.C, H: c.H };
  return null;
};

const KINDS = {
  bg: { map: darkSurface, decl: (v) => `background-color:${v}` },
  from: { map: darkSurface, decl: (v) => `--tw-gradient-from:${v}` },
  via: { map: darkSurface, decl: (v) => `--tw-gradient-via:${v}` },
  to: { map: darkSurface, decl: (v) => `--tw-gradient-to:${v}` },
  text: { map: darkInk, decl: (v) => `color:${v}` },
  placeholder: { map: darkInk, decl: (v) => `color:${v}`, suffix: '::placeholder' },
  fill: { map: darkInk, decl: (v) => `fill:${v}` },
  stroke: { map: darkInk, decl: (v) => `stroke:${v}` },
  decoration: { map: darkInk, decl: (v) => `text-decoration-color:${v}` },
  border: { map: darkLine, decl: (v) => `border-color:${v}` },
  'border-t': { map: darkLine, decl: (v) => `border-top-color:${v}` },
  'border-b': { map: darkLine, decl: (v) => `border-bottom-color:${v}` },
  'border-l': { map: darkLine, decl: (v) => `border-left-color:${v}` },
  'border-r': { map: darkLine, decl: (v) => `border-right-color:${v}` },
  'border-x': { map: darkLine, decl: (v) => `border-left-color:${v};border-right-color:${v}` },
  'border-y': { map: darkLine, decl: (v) => `border-top-color:${v};border-bottom-color:${v}` },
  outline: { map: darkLine, decl: (v) => `outline-color:${v}` },
  ring: { map: darkLine, decl: (v) => `--tw-ring-color:${v}` },
  divide: { map: darkLine, decl: (v) => `border-color:${v}`, suffix: ' > :not(:last-child)' },
};

const PSEUDO = {
  hover: ':hover', focus: ':focus', 'focus-visible': ':focus-visible', 'focus-within': ':focus-within',
  active: ':active', disabled: ':disabled', first: ':first-child', last: ':last-child',
  odd: ':nth-child(odd)', even: ':nth-child(even)', checked: ':checked', placeholder: '::placeholder',
};
const GROUP = { 'group-hover': '.group:hover ', 'group-focus': '.group:focus ', 'group-focus-within': '.group:focus-within ' };
const MEDIA = { sm: '40rem', md: '48rem', lg: '64rem', xl: '80rem', '2xl': '96rem' };

const TOKEN = /^((?:[a-z0-9-]+:)*)(bg|from|via|to|text|placeholder|fill|stroke|decoration|border-[tblrxy]|border|outline|ring|divide)-(\[[^\]]+\]|[a-z]+(?:-\d{2,3})?)(?:\/(\d{1,3}|\[[\d.]+\]))?$/;

const escapeClass = (cls) => cls.replace(/[^a-zA-Z0-9_-]/g, (ch) => `\\${ch}`);

// ------------------------------------------------------------------ scanning

const walk = (dir, out = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(tsx|ts|jsx|js)$/.test(entry.name)) out.push(full);
  }
  return out;
};

const loadPalette = (themeCssPath) => {
  const palette = {};
  const css = fs.readFileSync(themeCssPath, 'utf8');
  for (const m of css.matchAll(/--color-([a-z]+(?:-\d{2,3})?):\s*([^;]+);/g)) palette[m[1]] = m[2];
  return palette;
};

export function generateDarkCss({ srcDir, themeCssPath }) {
  const palette = loadPalette(themeCssPath);
  const tokens = new Set();
  for (const file of walk(srcDir)) {
    for (const t of fs.readFileSync(file, 'utf8').split(/[\s"'`{}()<>,;]+/)) {
      if (!t.startsWith('dark:') && TOKEN.test(t)) tokens.add(t);
    }
  }

  const rules = [];
  for (const token of [...tokens].sort()) {
    const [, variantStr, kindName, colorName, opacity] = token.match(TOKEN);
    const kind = KINDS[kindName];
    if (!kind) continue;

    let raw;
    if (colorName.startsWith('[')) raw = colorName.slice(1, -1).replace(/_/g, ' ');
    else raw = palette[colorName];
    if (!raw) continue; // not a color (e.g. text-[13px]) or unknown name
    const color = parseColor(raw);
    if (!color) continue;
    if (!colorName.startsWith('[')) color.neutral = /^(gray|slate|zinc|neutral|stone|white|black)\b/.test(colorName);
    // null = keep the light-mode colour. Plain classes then need no rule, but variant
    // classes (hover:, focus:...) still get one so they are not hidden by dark base colours.
    const dark = kind.map(color) || (variantStr ? { ...color } : null);
    if (!dark) continue;

    let alpha = null;
    if (opacity) alpha = opacity.startsWith('[') ? +opacity.slice(1, -1) : +opacity / 100;

    const variants = variantStr ? variantStr.slice(0, -1).split(':') : [];
    let pseudo = '';
    let group = '';
    let media = null;
    let supported = true;
    for (const v of variants) {
      if (PSEUDO[v]) pseudo += PSEUDO[v];
      else if (GROUP[v]) group = GROUP[v];
      else if (MEDIA[v]) media = MEDIA[v];
      else supported = false;
    }
    if (!supported) continue;

    // Interactive surfaces get lighter (not darker) on hover in dark mode.
    if (kindName === 'bg' && /:(hover|active|focus)/.test(pseudo) && dark.L < 0.215 && color.L >= 0.9) dark.L = 0.26;

    const selector = `.dark ${group}.${escapeClass(token)}${pseudo}${kind.suffix || ''}`;
    const rule = `${selector}{${kind.decl(fmt(dark, alpha))}}`;
    rules.push(media ? `@media (width >= ${media}){${rule}}` : rule);
  }

  return [
    '/* AUTO-GENERATED by scripts/dark-theme.mjs - do not edit by hand. */',
    `/* ${rules.length} dark-mode color overrides */`,
    '@layer utilities {',
    ...rules,
    '}',
    '',
  ].join('\n');
}

// Vite plugin: regenerate on start and whenever a source file changes.
export function darkThemePlugin({ srcDir, themeCssPath, outFile }) {
  const write = () => {
    const css = generateDarkCss({ srcDir, themeCssPath });
    const prev = fs.existsSync(outFile) ? fs.readFileSync(outFile, 'utf8') : '';
    if (css !== prev) fs.writeFileSync(outFile, css);
  };
  return {
    name: 'meditrack-dark-theme',
    buildStart() {
      write();
    },
    handleHotUpdate({ file }) {
      if (/\.(tsx|ts|jsx|js)$/.test(file) && path.resolve(file).startsWith(path.resolve(srcDir))) write();
    },
  };
}
