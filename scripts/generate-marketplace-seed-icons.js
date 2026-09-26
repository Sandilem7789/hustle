// Regenerates the flat illustrated icons used as marketplace seed-product
// images (see DataInitializer.seedMarketplaceDemoProducts). These PNGs live
// only in the backend's uploads_data Docker volume, not in git, so if that
// volume is ever recreated the seed products will point at missing images
// until these are regenerated and re-copied in. To do that:
//
//   node scripts/generate-marketplace-seed-icons.js   (from the repo root)
//   docker cp scripts/.generated-seed-icons/. hustle-backend-1:/app/uploads/
//   (harmless to also copy the _contact-sheet.png alongside — it's just not
//   referenced by anything and can be deleted from /app/uploads afterward)
//
// Requires `sharp`, already a frontend devDependency — resolved relative to
// this script's own location so it works from any working directory, as
// long as `cd frontend && npm install` has been run at least once.
const sharp = require(require('path').join(__dirname, '..', 'frontend', 'node_modules', 'sharp'));
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '.generated-seed-icons');
fs.mkdirSync(OUT, { recursive: true });

const BG = '#F5F0E8'; // --bg-muted, same tone the app already uses for "no photo" states
const W = 480, H = 360;

// Wraps an inner icon (drawn in a 0-0-240-240 box, centered) with the shared
// tan card background so every icon reads as one consistent illustration
// system, not 17 unrelated styles.
function frame(inner) {
  const cx = W / 2, cy = H / 2, s = 220; // icon bounding box size
  const x0 = cx - s / 2, y0 = cy - s / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="${BG}"/>
    <g transform="translate(${x0},${y0})">${inner}</g>
  </svg>`;
}

const ICONS = {
  // ── Food (fried dough: vetkoek / amagwinya) ──────────────────────────────
  'food-fried-dough': frame(`
    <ellipse cx="120" cy="140" rx="95" ry="65" fill="#F0C674"/>
    <ellipse cx="120" cy="130" rx="95" ry="60" fill="#F5D68C"/>
    <circle cx="85" cy="115" r="7" fill="#C98A3A"/>
    <circle cx="140" cy="105" r="6" fill="#C98A3A"/>
    <circle cx="115" cy="150" r="6" fill="#C98A3A"/>
    <circle cx="165" cy="140" r="5" fill="#C98A3A"/>
  `),
  // ── Bread-based street food (bunny chow / boerewors roll) ────────────────
  'food-bread-roll': frame(`
    <rect x="30" y="120" width="180" height="70" rx="35" fill="#E8B65C"/>
    <rect x="30" y="120" width="180" height="35" rx="17" fill="#F2C87A"/>
    <rect x="60" y="95" width="120" height="45" rx="20" fill="#F06820"/>
  `),
  // ── Bottled / canned drink (Coke etc.) ────────────────────────────────────
  'drink-bottle': frame(`
    <rect x="95" y="30" width="50" height="25" rx="6" fill="#1C1917"/>
    <path d="M100 55 L140 55 L150 90 L150 200 Q150 215 135 215 L105 215 Q90 215 90 200 L90 90 Z" fill="#E53935"/>
    <rect x="90" y="120" width="60" height="30" fill="#FFFFFF" opacity="0.85"/>
  `),
  // ── Bread loaf ────────────────────────────────────────────────────────────
  'grocery-bread-loaf': frame(`
    <path d="M20 150 Q20 90 120 90 Q220 90 220 150 L220 175 Q220 195 200 195 L40 195 Q20 195 20 175 Z" fill="#D9A652"/>
    <path d="M45 110 Q120 85 195 110" stroke="#B5822E" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M55 130 Q120 108 185 130" stroke="#B5822E" stroke-width="6" fill="none" stroke-linecap="round"/>
  `),
  // ── Bottled liquid (amasi / sunflower oil) ───────────────────────────────
  'grocery-bottle-liquid': frame(`
    <path d="M95 30 L145 30 L145 55 L165 85 L165 195 Q165 215 145 215 L95 215 Q75 215 75 195 L75 85 Z" fill="#2DB344"/>
    <rect x="95" y="30" width="50" height="25" fill="#166534"/>
    <rect x="80" y="110" width="80" height="45" fill="#FFFFFF" opacity="0.8"/>
  `),
  // ── Sack of dry goods (maize meal) ────────────────────────────────────────
  'grocery-sack': frame(`
    <path d="M70 60 L170 60 L190 100 Q205 150 190 190 Q175 220 120 220 Q65 220 50 190 Q35 150 50 100 Z" fill="#F5B800"/>
    <ellipse cx="120" cy="60" rx="20" ry="10" fill="#92620A"/>
    <path d="M75 120 L165 120" stroke="#C98A0A" stroke-width="6"/>
    <path d="M70 150 L170 150" stroke="#C98A0A" stroke-width="6"/>
  `),
  // ── Beadwork ──────────────────────────────────────────────────────────────
  'craft-beads': frame(`
    <path d="M20 130 Q120 210 220 130" stroke="#8B6A3A" stroke-width="10" fill="none"/>
    <circle cx="30" cy="122" r="17" fill="#F5B800"/>
    <circle cx="65" cy="155" r="17" fill="#E91E8C"/>
    <circle cx="102" cy="172" r="17" fill="#2DB344"/>
    <circle cx="140" cy="172" r="17" fill="#1B6FD4"/>
    <circle cx="177" cy="155" r="17" fill="#F06820"/>
    <circle cx="210" cy="122" r="17" fill="#8B2FC9"/>
  `),
  // ── Woven basket ──────────────────────────────────────────────────────────
  'craft-basket': frame(`
    <path d="M40 110 L200 110 L180 205 Q175 220 155 220 L85 220 Q65 220 60 205 Z" fill="#C98A3A"/>
    <path d="M45 130 L195 130 M50 155 L190 155 M55 180 L185 180" stroke="#8B5E23" stroke-width="6"/>
    <path d="M65 110 Q120 70 175 110" stroke="#8B5E23" stroke-width="8" fill="none"/>
  `),
  // ── Clay pot ──────────────────────────────────────────────────────────────
  'craft-clay-pot': frame(`
    <ellipse cx="120" cy="70" rx="45" ry="14" fill="#B5622E"/>
    <path d="M75 70 Q60 140 90 195 Q100 215 120 215 Q140 215 150 195 Q180 140 165 70 Z" fill="#D9803F"/>
    <ellipse cx="120" cy="150" rx="46" ry="10" fill="#B5622E" opacity="0.5"/>
  `),
  // ── Traditional hat (isicholo) ────────────────────────────────────────────
  'clothing-hat': frame(`
    <ellipse cx="120" cy="195" rx="100" ry="18" fill="#8B2FC9"/>
    <path d="M55 195 Q55 95 120 90 Q185 95 185 195 Z" fill="#A855D8"/>
    <ellipse cx="120" cy="92" rx="35" ry="10" fill="#8B2FC9"/>
  `),
  // ── Leafy greens (spinach / butternut) ────────────────────────────────────
  'agri-leaf': frame(`
    <path d="M120 210 Q60 170 70 100 Q90 60 120 40 Q150 60 170 100 Q180 170 120 210 Z" fill="#2DB344"/>
    <path d="M120 210 L120 60" stroke="#166534" stroke-width="6"/>
    <path d="M40 150 Q90 130 118 150" fill="none" stroke="#166534" stroke-width="6" stroke-linecap="round"/>
    <path d="M200 150 Q150 130 122 150" fill="none" stroke="#166534" stroke-width="6" stroke-linecap="round"/>
  `),
  // ── Eggs ──────────────────────────────────────────────────────────────────
  'agri-eggs': frame(`
    <rect x="30" y="140" width="180" height="60" rx="10" fill="#C98A3A"/>
    <ellipse cx="75" cy="140" rx="30" ry="38" fill="#FDF6E3"/>
    <ellipse cx="120" cy="150" rx="30" ry="38" fill="#FDF6E3"/>
    <ellipse cx="165" cy="140" rx="30" ry="38" fill="#FDF6E3"/>
  `),
  // ── Poultry (simple bird glyph) ───────────────────────────────────────────
  'agri-poultry': frame(`
    <ellipse cx="130" cy="140" rx="70" ry="55" fill="#FDF6E3"/>
    <circle cx="65" cy="95" r="30" fill="#FDF6E3"/>
    <path d="M35 90 L10 80 L35 105 Z" fill="#F06820"/>
    <path d="M55 65 Q65 50 75 65" stroke="#E53935" stroke-width="8" fill="none" stroke-linecap="round"/>
    <circle cx="60" cy="90" r="4" fill="#1C1917"/>
    <ellipse cx="150" cy="190" rx="10" ry="18" fill="#F5B800"/>
    <ellipse cx="185" cy="190" rx="10" ry="18" fill="#F5B800"/>
  `),
  // ── Livestock (simple goat glyph) ─────────────────────────────────────────
  'agri-livestock': frame(`
    <rect x="55" y="120" width="130" height="65" rx="30" fill="#D9C9A8"/>
    <rect x="65" y="170" width="14" height="45" fill="#D9C9A8"/>
    <rect x="105" y="170" width="14" height="45" fill="#D9C9A8"/>
    <rect x="145" y="170" width="14" height="45" fill="#D9C9A8"/>
    <rect x="175" y="170" width="14" height="45" fill="#D9C9A8"/>
    <circle cx="190" cy="105" r="32" fill="#D9C9A8"/>
    <path d="M175 78 L165 45 M205 78 L215 45" stroke="#8B7654" stroke-width="8" stroke-linecap="round"/>
    <circle cx="198" cy="100" r="4" fill="#1C1917"/>
  `),
  // ── Electronics (device / power) ──────────────────────────────────────────
  'electronics-device': frame(`
    <rect x="65" y="30" width="110" height="180" rx="18" fill="#1B6FD4"/>
    <rect x="80" y="50" width="80" height="130" rx="6" fill="#D6E8FF"/>
    <path d="M130 75 L108 125 L125 125 L112 165 L152 110 L132 110 Z" fill="#F5B800"/>
  `),
  // ── Services (tools / repair) ─────────────────────────────────────────────
  'service-tools': frame(`
    <path d="M60 190 L140 110" stroke="#78716C" stroke-width="20" stroke-linecap="round"/>
    <circle cx="165" cy="85" r="38" fill="none" stroke="#1B6FD4" stroke-width="18"/>
    <path d="M165 47 L165 20 M203 85 L230 85" stroke="#1B6FD4" stroke-width="14" stroke-linecap="round"/>
    <circle cx="55" cy="195" r="16" fill="#78716C"/>
  `),
  // ── Firewood ──────────────────────────────────────────────────────────────
  'other-firewood': frame(`
    <rect x="30" y="150" width="180" height="34" rx="17" fill="#8B5E23"/>
    <circle cx="30" cy="167" r="17" fill="#C98A3A"/>
    <circle cx="210" cy="167" r="17" fill="#C98A3A"/>
    <rect x="30" y="105" width="180" height="34" rx="17" fill="#A9743A"/>
    <circle cx="30" cy="122" r="17" fill="#D9A66A"/>
    <circle cx="210" cy="122" r="17" fill="#D9A66A"/>
  `),
};

(async () => {
  const names = Object.keys(ICONS);
  for (const name of names) {
    // "seed-" prefix matches what DataInitializer references directly —
    // output files are ready to docker cp in as-is, no manual rename step.
    await sharp(Buffer.from(ICONS[name])).resize(W, H).png().toFile(path.join(OUT, `seed-${name}.png`));
    console.log('wrote', name);
  }

  // Contact sheet: lay all icons out in a grid for one-shot visual review.
  const cols = 4;
  const rows = Math.ceil(names.length / cols);
  const pad = 12;
  const sheetW = cols * (W + pad) + pad;
  const sheetH = rows * (H + pad + 28) + pad;
  const composites = [];
  for (let i = 0; i < names.length; i++) {
    const col = i % cols, row = Math.floor(i / cols);
    const left = pad + col * (W + pad);
    const top = pad + row * (H + pad + 28);
    composites.push({ input: path.join(OUT, `seed-${names[i]}.png`), left, top });
  }
  await sharp({ create: { width: sheetW, height: sheetH, channels: 3, background: '#FFFFFF' } })
    .composite(composites)
    .png()
    .toFile(path.join(OUT, '_contact-sheet.png'));
  console.log('contact sheet done:', names.length, 'icons');
})().catch(e => { console.error(e); process.exit(1); });
