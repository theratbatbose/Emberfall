// Renders the original SVG app icon to the PNG sizes Android and the PWA need.
// Run: node scripts/icons.mjs
import sharp from 'sharp';
import { mkdirSync, readFileSync } from 'node:fs';

const svg = readFileSync('public/favicon.svg');
mkdirSync('public/icons', { recursive: true });
await sharp(svg).resize(192, 192).png().toFile('public/icons/icon-192.png');
await sharp(svg).resize(512, 512).png().toFile('public/icons/icon-512.png');
// Maskable: icon shrunk into the safe zone on a solid background.
const inner = await sharp(svg).resize(360, 360).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#0c0908' } })
  .composite([{ input: inner, gravity: 'center' }])
  .png()
  .toFile('public/icons/maskable-512.png');

// Android launcher + notification icons (used by the Capacitor build, if present).
const res = 'android/app/src/main/res';
try {
  const densities = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
  for (const [d, size] of Object.entries(densities)) {
    const dir = `${res}/mipmap-${d}`;
    mkdirSync(dir, { recursive: true });
    await sharp(svg).resize(size, size).png().toFile(`${dir}/ic_launcher.png`);
    await sharp(svg).resize(size, size).png().toFile(`${dir}/ic_launcher_round.png`);
    const fg = Math.round(size * 2.25);
    const pad = Math.round(fg * 0.2);
    const fgInner = await sharp(svg).resize(fg - pad * 2, fg - pad * 2).png().toBuffer();
    await sharp({ create: { width: fg, height: fg, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: fgInner, gravity: 'center' }])
      .png()
      .toFile(`${dir}/ic_launcher_foreground.png`);
  }
  // Small monochrome notification icon (white flame on transparent).
  const flame = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#fff" d="M12 2c1.5 3.5 6 5.5 6 11a6 6 0 0 1-12 0c0-2.8 1.6-4.4 2.6-6 .3 2 1.3 3 2.4 3.3C10 7 11.4 4.5 12 2z"/></svg>`;
  const small = { mdpi: 24, hdpi: 36, xhdpi: 48, xxhdpi: 72, xxxhdpi: 96 };
  for (const [d, size] of Object.entries(small)) {
    const dir = `${res}/drawable-${d}`;
    mkdirSync(dir, { recursive: true });
    await sharp(Buffer.from(flame)).resize(size, size).png().toFile(`${dir}/ic_stat_ember.png`);
  }
  // Splash screens: the icon centred on the dark background, at each existing size.
  const { readdirSync, existsSync } = await import('node:fs');
  for (const d of readdirSync(res)) {
    const f = `${res}/${d}/splash.png`;
    if (!d.startsWith('drawable') || !existsSync(f)) continue;
    const { width, height } = await sharp(f).metadata();
    const s = Math.round(Math.min(width, height) * 0.32);
    const logo = await sharp(svg).resize(s, s).png().toBuffer();
    const out = await sharp({ create: { width, height, channels: 4, background: '#0c0908' } })
      .composite([{ input: logo, gravity: 'center' }])
      .png()
      .toBuffer();
    await sharp(out).toFile(f);
  }
  console.log('Android icons written');
} catch (e) {
  console.log('Skipped Android icons:', e.message);
}
console.log('PWA icons written');
