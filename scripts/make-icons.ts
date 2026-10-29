/**
 * Generates the PWA icons into public/icons from an inline SVG.
 *
 * Run with: npx tsx scripts/make-icons.ts
 * Only needs re-running if the mark changes.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const GROUND = "#0b0c11";
const GOLD = "#ffd166";
const INK = "#f4f2ee";

/**
 * The mark: a stack of three "cards" seen edge-on, scrolling upward, with the
 * top one gold — the wordmark's accent. Reads at 48px on a home screen.
 *
 * `inset` leaves room around the art for maskable icons, whose outer ~10% can
 * be cropped to a circle or squircle by the launcher.
 */
function markSvg(size: number, inset: number, rounded: boolean): string {
  const s = size;
  const pad = s * inset;
  const w = s - pad * 2;

  // Three bars, bottom to top, each narrower and brighter.
  const barH = w * 0.16;
  const gap = w * 0.1;
  const cx = s / 2;
  const totalH = barH * 3 + gap * 2;
  const top = (s - totalH) / 2;

  const bars = [
    { y: top + (barH + gap) * 2, width: w * 0.62, fill: INK, opacity: 0.3 },
    { y: top + (barH + gap) * 1, width: w * 0.82, fill: INK, opacity: 0.6 },
    { y: top, width: w, fill: GOLD, opacity: 1 },
  ];

  const rects = bars
    .map(
      (b) =>
        `<rect x="${(cx - b.width / 2).toFixed(2)}" y="${b.y.toFixed(2)}" ` +
        `width="${b.width.toFixed(2)}" height="${barH.toFixed(2)}" ` +
        `rx="${(barH / 2).toFixed(2)}" fill="${b.fill}" opacity="${b.opacity}"/>`,
    )
    .join("");

  const bg = rounded
    ? `<rect width="${s}" height="${s}" rx="${(s * 0.22).toFixed(2)}" fill="${GROUND}"/>`
    : `<rect width="${s}" height="${s}" fill="${GROUND}"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">${bg}${rects}</svg>`;
}

type Target = {
  file: string;
  size: number;
  /** Fraction of the canvas kept clear around the art. */
  inset: number;
  rounded: boolean;
};

const TARGETS: Target[] = [
  // Standard PWA icons — square, launcher adds its own masking.
  { file: "icon-192.png", size: 192, inset: 0.2, rounded: true },
  { file: "icon-512.png", size: 512, inset: 0.2, rounded: true },
  // Maskable: art pulled well inside the safe zone, background bleeds edge to edge.
  { file: "icon-512-maskable.png", size: 512, inset: 0.28, rounded: false },
  // iOS home screen. Apple applies its own squircle, so no rounding here.
  { file: "apple-touch-icon.png", size: 180, inset: 0.2, rounded: false },
  { file: "favicon-32.png", size: 32, inset: 0.14, rounded: false },
];

async function main() {
  const outDir = path.join(process.cwd(), "public", "icons");
  await mkdir(outDir, { recursive: true });

  for (const t of TARGETS) {
    const svg = markSvg(t.size, t.inset, t.rounded);
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    await writeFile(path.join(outDir, t.file), png);
    console.log(`wrote public/icons/${t.file} (${t.size}×${t.size})`);
  }

  // Keep the source SVG around so the mark can be edited by hand later.
  await writeFile(path.join(outDir, "mark.svg"), markSvg(512, 0.2, true), "utf8");
  console.log("wrote public/icons/mark.svg");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
