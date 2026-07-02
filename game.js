'use strict';
/* ===================================================================
 *  🌼 Garten der Freunde
 *  Ein gemütliches Sammel- und Pflegespiel: züchte einzigartige
 *  Pflanzenfreunde, kümmere dich um sie und lass deinen Garten blühen.
 * =================================================================== */

const SAVE_KEY = 'gardenoffriends_save_v1';
const MAX_PLOTS = 12;
const PLOT_COSTS = [0, 0, 0, 120, 250, 450, 700, 1000, 1400, 1900, 2500, 3200];
const SUN_CAP_MIN = 180;          // Sonnenschein sammelt sich max. 3h an
const WATER_INTERVAL_H = 2;       // frühestens alle 2h gießen
const PET_COOLDOWN_MIN = 15;
const GIFT_COOLDOWN_MIN = 60;
const GIFT_COST = 30;
const MAX_LEVEL = 10;

const RARITIES = {
  common:    { label: 'Gewöhnlich', mult: 1.0, cls: 'common' },
  rare:      { label: 'Selten',     mult: 1.6, cls: 'rare' },
  epic:      { label: 'Episch',     mult: 2.6, cls: 'epic' },
  legendary: { label: 'Legendär',   mult: 4.5, cls: 'legendary' },
};

const SEEDS = {
  wiese:  { name: 'Wiesensamen',  icon: '🌱', cost: 25,
            stageMin: [3, 5, 8],
            odds: { common: .78, rare: .18, epic: .035, legendary: .005 },
            desc: 'Wächst schnell. Meist gewöhnliche, immer liebenswerte Freunde.' },
  bluete: { name: 'Blütensamen',  icon: '🌷', cost: 100,
            stageMin: [15, 25, 40],
            odds: { common: .45, rare: .40, epic: .12, legendary: .03 },
            desc: 'Gute Chance auf seltene und epische Freunde.' },
  stern:  { name: 'Sternensamen', icon: '✨', cost: 300,
            stageMin: [45, 80, 120],
            odds: { common: 0, rare: .45, epic: .40, legendary: .15 },
            desc: 'Garantiert selten oder besser – mit etwas Glück legendär!' },
};

const DECOS = {
  fountain: { name: 'Springbrunnen', icon: '⛲', cost: 250,
              desc: '+15 % Sonnenschein für alle Freunde' },
  gnome:    { name: 'Gartenzwerg',   icon: '🍄', cost: 400,
              desc: '+20 % Freundschafts-Erfahrung' },
  lantern:  { name: 'Laterne',       icon: '🏮', cost: 550,
              desc: 'Freunde werden 25 % langsamer durstig' },
  flamingo: { name: 'Flamingo',      icon: '🦩', cost: 150,
              desc: 'Einfach wunderschön. Und pink.' },
};

const NAMES = ['Momo','Lulu','Pip','Fine','Bo','Kiki','Nino','Mira','Tobi','Wanda',
  'Juno','Pelle','Rosa','Fritzi','Ole','Maja','Bruno','Lotte','Ferdi','Nele',
  'Pauli','Smilla','Theo','Ida','Knut','Elfi','Piet','Runa','Balu','Zora',
  'Milo','Greta','Fips','Heidi','Oskar','Trude','Willi','Yuki','Emmi','Karl',
  'Luna','Beppo','Stella','Gustav','Minna','Anton','Frieda','Leo','Marle','Poldi'];

const PERSONALITIES = [
  { name: 'verträumt',   quotes: ['„Schau mal, die Wolke sieht aus wie ein Schaf …"', '„Ich habe von Sternenstaub geträumt."'] },
  { name: 'fröhlich',    quotes: ['„Was für ein wunderschöner Tag!"', '„Mit dir macht alles doppelt Spaß!"'] },
  { name: 'schüchtern',  quotes: ['„D-danke, dass du an mich denkst …"', '„Bleibst du noch ein bisschen?"'] },
  { name: 'frech',       quotes: ['„Hihi, ich hab dem Käfer einen Streich gespielt!"', '„Wer zuletzt blüht, blüht am besten!"'] },
  { name: 'weise',       quotes: ['„Geduld lässt die schönsten Blüten wachsen."', '„Ein Garten ist Freundschaft, die man sehen kann."'] },
  { name: 'verschmust',  quotes: ['„Noch eine Streicheleinheit, bitte!"', '„Du bist mein Lieblingsmensch."'] },
  { name: 'abenteuerlustig', quotes: ['„Was wohl hinter dem Beet ist?"', '„Eines Tages besuche ich die Sonne!"'] },
  { name: 'gemütlich',   quotes: ['„Ahh, die Sonne kitzelt so schön."', '„Kein Stress. Wir wachsen ja noch."'] },
];

const MOODS = [
  { maxH: 3,        key: 'strahlend', emoji: '🤩', label: 'strahlend', mult: 1.25 },
  { maxH: 6,        key: 'happy',     emoji: '😊', label: 'glücklich', mult: 1.0 },
  { maxH: 12,       key: 'ok',        emoji: '🙂', label: 'zufrieden', mult: 0.75 },
  { maxH: 24,       key: 'thirsty',   emoji: '🥀', label: 'durstig',   mult: 0.4 },
  { maxH: Infinity, key: 'sleep',     emoji: '💤', label: 'schläft',   mult: 0.1 },
];

const GOAL_POOL = [
  { id: 'water',   n: 4,   label: 'Gieße 4-mal deine Freunde',        icon: '💧', reward: 30 },
  { id: 'pet',     n: 3,   label: 'Streichle 3 Freunde',              icon: '🤗', reward: 25 },
  { id: 'collect', n: 150, label: 'Sammle 150 Sonnenschein',          icon: '☀️', reward: 35 },
  { id: 'plant',   n: 1,   label: 'Pflanze einen Samen',              icon: '🌱', reward: 40 },
  { id: 'awaken',  n: 1,   label: 'Erwecke einen neuen Freund',       icon: '🌸', reward: 50 },
  { id: 'gift',    n: 1,   label: 'Mach einem Freund ein Geschenk',   icon: '🎁', reward: 30 },
];

/* ============================ Zustand ============================ */

let S = null;          // Spielstand
let currentView = 'garden';
let butterflyActive = false;

function newState() {
  return {
    suns: 60,
    inventory: { wiese: 1, bluete: 0, stern: 0 },
    plots: Array.from({ length: MAX_PLOTS }, (_, i) => ({
      unlocked: i < 3, seed: null, friendId: null,
    })),
    friends: {},       // id -> Freund
    nextId: 1,
    decos: [],
    streak: 1,
    lastDay: null,     // Datums-String des letzten Spieltags
    dailyClaimed: false,
    goals: [],         // [{id, n, label, icon, reward, progress, claimed}]
    firstSeedUsed: false,
    introSeen: false,
    stats: { awakened: 0, byRarity: { common: 0, rare: 0, epic: 0, legendary: 0 }, sunsTotal: 0 },
  };
}

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* voll/privat */ }
}

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) { S = JSON.parse(raw); return; }
  } catch (e) { /* kaputter Spielstand */ }
  S = newState();
}

/* ============================ Helfer ============================ */

const $ = sel => document.querySelector(sel);
const now = () => Date.now();
const rint = n => Math.floor(Math.random() * n);
const choice = a => a[rint(a.length)];
const esc = s => String(s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function fmtTime(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  if (s >= 3600) return Math.floor(s / 3600) + ' h ' + Math.floor((s % 3600) / 60) + ' min';
  if (s >= 60) return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') + ' min';
  return s + ' s';
}

function hasDeco(id) { return S.decos.includes(id); }

function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function floatFx(x, y, text, heart) {
  const el = document.createElement('div');
  el.className = 'float-fx' + (heart ? ' heart' : '');
  el.textContent = text;
  el.style.left = (x - 20) + 'px';
  el.style.top = (y - 20) + 'px';
  $('#fx-layer').appendChild(el);
  setTimeout(() => el.remove(), 1300);
}

function fxAt(ev, text, heart) {
  const x = ev && ev.clientX ? ev.clientX : innerWidth / 2;
  const y = ev && ev.clientY ? ev.clientY : innerHeight / 2;
  floatFx(x, y, text, heart);
}

function addSuns(n, ev) {
  S.suns += n;
  if (n > 0) {
    S.stats.sunsTotal += n;
    goalProgress('collect', n);
    if (ev) fxAt(ev, `+${n} ☀️`);
  }
  const stat = $('#stat-suns');
  stat.classList.remove('bump'); void stat.offsetWidth; stat.classList.add('bump');
  renderHeader();
  save();
}

/* ============================ DNA & Aussehen ============================ */

// Farbpaletten je Seltenheit: [Körper, dunkler Rand, Muster, Bauch]
const PALETTES = {
  common: [
    ['#a5d6a7', '#66bb6a', '#e8f5e9', '#dcedc8'],
    ['#ffcc80', '#ffa726', '#fff3e0', '#ffe0b2'],
    ['#ef9a9a', '#e57373', '#ffebee', '#ffcdd2'],
    ['#fff59d', '#fdd835', '#fffde7', '#fff9c4'],
    ['#bcaaa4', '#8d6e63', '#efebe9', '#d7ccc8'],
  ],
  rare: [
    ['#90caf9', '#42a5f5', '#e3f2fd', '#bbdefb'],
    ['#80deea', '#26c6da', '#e0f7fa', '#b2ebf2'],
    ['#b39ddb', '#7e57c2', '#ede7f6', '#d1c4e9'],
    ['#f48fb1', '#ec407a', '#fce4ec', '#f8bbd0'],
  ],
  epic: [
    ['#ce93d8', '#8e24aa', '#f3e5f5', '#e1bee7'],
    ['#9fa8da', '#3949ab', '#e8eaf6', '#c5cae9'],
    ['#f48fb1', '#ad1457', '#fce4ec', '#f8bbd0'],
    ['#80cbc4', '#00695c', '#e0f2f1', '#b2dfdb'],
  ],
  legendary: [
    ['#ffe082', '#ff8f00', '#fff8e1', '#ffecb3'],
    ['#ffd180', '#ff6d00', '#fff3e0', '#ffe0b2'],
    ['#fff176', '#f9a825', '#fffde7', '#fff59d'],
  ],
};

const N_SHAPES = 5, N_PATTERNS = 5, N_EYES = 3, N_MOUTHS = 3;
// Accessoires: 0 Spross, 1 Blüte, 2 Schleife, 3 Pilzhut, 4 Blütenkranz, 5 Sternchen, 6 Krone
const ACC_BY_RARITY = {
  common: [0, 1, 2], rare: [0, 1, 2, 3, 4], epic: [1, 3, 4, 5], legendary: [5, 6],
};

function rollRarity(odds) {
  let r = Math.random(), acc = 0;
  for (const k of ['common', 'rare', 'epic', 'legendary']) {
    acc += odds[k] || 0;
    if (r < acc) return k;
  }
  return 'legendary';
}

function makeDNA(seedType) {
  const rarity = rollRarity(SEEDS[seedType].odds);
  return {
    rarity,
    palette: rint(PALETTES[rarity].length),
    shape: rint(N_SHAPES),
    pattern: rint(N_PATTERNS),
    eyes: rint(N_EYES),
    mouth: rint(N_MOUTHS),
    acc: choice(ACC_BY_RARITY[rarity]),
  };
}

const BODY_SHAPES = [
  // Kreis-Blob
  '<circle cx="50" cy="60" r="29" />',
  // Ei
  '<ellipse cx="50" cy="59" rx="25" ry="31" />',
  // Bohne
  '<path d="M32 72 C22 55 30 32 50 30 C72 28 80 50 70 68 C62 82 40 84 32 72 Z" />',
  // Squircle
  '<rect x="25" y="31" width="50" height="56" rx="22" />',
  // Tropfen
  '<path d="M50 26 C64 42 76 54 74 68 C72 82 60 89 50 89 C40 89 28 82 26 68 C24 54 36 42 50 26 Z" />',
];

function patternSVG(pattern, color) {
  switch (pattern) {
    case 1: return `<g fill="${color}" opacity=".75">
      <circle cx="38" cy="68" r="4"/><circle cx="55" cy="76" r="3.4"/><circle cx="64" cy="63" r="3"/></g>`;
    case 2: return `<g stroke="${color}" stroke-width="4" fill="none" opacity=".65" stroke-linecap="round">
      <path d="M32 70 Q50 78 68 70"/><path d="M35 79 Q50 85 65 79"/></g>`;
    case 3: return `<text x="50" y="79" font-size="11" text-anchor="middle" opacity=".8">⭐</text>`;
    case 4: return `<text x="50" y="79" font-size="11" text-anchor="middle" opacity=".8">💛</text>`;
    default: return '';
  }
}

function eyesSVG(eyes, moodKey) {
  if (moodKey === 'sleep') {
    return `<g stroke="#4a3f35" stroke-width="2.6" fill="none" stroke-linecap="round">
      <path d="M37 53 q5 4 10 0"/><path d="M53 53 q5 4 10 0"/></g>`;
  }
  if (moodKey === 'thirsty') {
    return `<g fill="#4a3f35"><ellipse cx="42" cy="54" rx="3" ry="2"/><ellipse cx="58" cy="54" rx="3" ry="2"/></g>
      <path d="M36 49 l9 3 M64 49 l-9 3" stroke="#4a3f35" stroke-width="2" stroke-linecap="round"/>`;
  }
  switch (eyes) {
    case 1: // Glanzaugen
      return `<g fill="#4a3f35"><circle cx="42" cy="53" r="4.6"/><circle cx="58" cy="53" r="4.6"/></g>
        <g fill="#fff"><circle cx="43.5" cy="51.5" r="1.7"/><circle cx="59.5" cy="51.5" r="1.7"/></g>`;
    case 2: // Freude-Bögen
      return `<g stroke="#4a3f35" stroke-width="3" fill="none" stroke-linecap="round">
        <path d="M37 54 q5 -6 10 0"/><path d="M53 54 q5 -6 10 0"/></g>`;
    default:
      return `<g fill="#4a3f35"><circle cx="42" cy="53" r="3.6"/><circle cx="58" cy="53" r="3.6"/></g>`;
  }
}

function mouthSVG(mouth, moodKey) {
  if (moodKey === 'sleep') return `<circle cx="50" cy="63" r="2.6" fill="#4a3f35" opacity=".7"/>`;
  if (moodKey === 'thirsty') return `<path d="M45 65 q5 -4 10 0" stroke="#4a3f35" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
  switch (mouth) {
    case 1: return `<path d="M44 62 q6 7 12 0" stroke="#4a3f35" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
    case 2: return `<path d="M44 61 q6 8 12 0 z" fill="#4a3f35"/><path d="M47 66 q3 2 6 0 z" fill="#ef9a9a"/>`;
    default: return `<path d="M46 63 q4 4 8 0" stroke="#4a3f35" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
  }
}

function accSVG(acc, colors) {
  switch (acc) {
    case 0: // Spross
      return `<g><path d="M50 31 q0 -9 0 -12" stroke="#66bb6a" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M50 22 q-9 -6 -12 2 q8 5 12 -2 Z" fill="#81c784"/>
        <path d="M50 22 q9 -6 12 2 q-8 5 -12 -2 Z" fill="#66bb6a"/></g>`;
    case 1: // Blüte
      return `<g transform="translate(50 20)"><g fill="${colors[1]}">
        <ellipse cx="0" cy="-6" rx="4" ry="6"/><ellipse cx="6" cy="-2" rx="4" ry="6" transform="rotate(72 6 -2)"/>
        <ellipse cx="4" cy="5" rx="4" ry="6" transform="rotate(144 4 5)"/><ellipse cx="-4" cy="5" rx="4" ry="6" transform="rotate(216 -4 5)"/>
        <ellipse cx="-6" cy="-2" rx="4" ry="6" transform="rotate(288 -6 -2)"/></g>
        <circle r="4" fill="#fff59d"/></g>`;
    case 2: // Schleife
      return `<g transform="translate(50 24)" fill="${colors[1]}">
        <path d="M0 0 L-11 -7 L-11 7 Z"/><path d="M0 0 L11 -7 L11 7 Z"/><circle r="3.4"/></g>`;
    case 3: // Pilzhut
      return `<g><path d="M28 30 Q50 6 72 30 Q50 38 28 30 Z" fill="#ef5350"/>
        <circle cx="42" cy="22" r="3" fill="#fff"/><circle cx="58" cy="24" r="2.4" fill="#fff"/></g>`;
    case 4: // Blütenkranz
      return `<g font-size="9"><text x="32" y="30" text-anchor="middle">🌸</text>
        <text x="50" y="22" text-anchor="middle">🌼</text><text x="68" y="30" text-anchor="middle">🌸</text></g>`;
    case 5: // Sternchen
      return `<g font-size="11"><text x="50" y="22" text-anchor="middle">⭐</text>
        <text x="30" y="34" font-size="8" text-anchor="middle">✦</text><text x="70" y="34" font-size="8" text-anchor="middle">✦</text></g>`;
    case 6: // Krone
      return `<g><path d="M38 26 L38 14 L44 21 L50 11 L56 21 L62 14 L62 26 Z" fill="#ffd54f" stroke="#ff8f00" stroke-width="1.6" stroke-linejoin="round"/></g>`;
    default: return '';
  }
}

function friendSVG(dna, moodKey = 'happy') {
  const colors = PALETTES[dna.rarity][dna.palette];
  const glow = dna.rarity === 'legendary'
    ? `<circle cx="50" cy="58" r="38" fill="#ffd54f" opacity=".28"/>`
    : dna.rarity === 'epic' ? `<circle cx="50" cy="58" r="36" fill="#ce93d8" opacity=".22"/>` : '';
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="50" cy="90" rx="26" ry="5" fill="#000" opacity=".1"/>
    ${glow}
    <g fill="${colors[0]}" stroke="${colors[1]}" stroke-width="2.5">${BODY_SHAPES[dna.shape]}</g>
    <ellipse cx="50" cy="72" rx="14" ry="11" fill="${colors[3]}" opacity=".85"/>
    ${patternSVG(dna.pattern, colors[2])}
    <g fill="#f8bbd0" opacity=".9"><ellipse cx="34" cy="60" rx="4.4" ry="3"/><ellipse cx="66" cy="60" rx="4.4" ry="3"/></g>
    ${eyesSVG(dna.eyes, moodKey)}
    ${mouthSVG(dna.mouth, moodKey)}
    ${accSVG(dna.acc, colors)}
  </svg>`;
}

function growthSVG(stage, dna, ready) {
  const tint = dna ? PALETTES[dna.rarity][dna.palette][1] : '#66bb6a';
  const glow = ready ? `<circle cx="50" cy="55" r="30" fill="#ffd54f" opacity=".4">
    <animate attributeName="opacity" values=".2;.5;.2" dur="1.6s" repeatCount="indefinite"/></circle>` : '';
  let art = '';
  if (stage === 0) {
    art = `<ellipse cx="50" cy="76" rx="24" ry="10" fill="#8d6e63"/>
      <ellipse cx="50" cy="72" rx="7" ry="9" fill="#a1887f" stroke="#6d4c41" stroke-width="1.6"/>
      <path d="M50 65 q0 -5 3 -8" stroke="#6d4c41" stroke-width="1.6" fill="none"/>`;
  } else if (stage === 1) {
    art = `<ellipse cx="50" cy="80" rx="24" ry="9" fill="#8d6e63"/>
      <path d="M50 78 L50 52" stroke="#66bb6a" stroke-width="4" stroke-linecap="round"/>
      <path d="M50 62 q-13 -8 -17 3 q11 7 17 -3 Z" fill="#81c784"/>
      <path d="M50 56 q13 -8 17 3 q-11 7 -17 -3 Z" fill="#66bb6a"/>`;
  } else {
    art = `<ellipse cx="50" cy="82" rx="24" ry="8" fill="#8d6e63"/>
      <path d="M50 80 L50 52" stroke="#66bb6a" stroke-width="4" stroke-linecap="round"/>
      <path d="M50 68 q-11 -6 -15 3 q10 6 15 -3 Z" fill="#81c784"/>
      <ellipse cx="50" cy="43" rx="13" ry="16" fill="${tint}" stroke="#4a3f35" stroke-width="1.4" opacity=".92"/>
      <path d="M50 28 q-5 8 0 14 q5 -6 0 -14 Z" fill="#fff" opacity=".35"/>`;
  }
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${glow}${art}</svg>`;
}

/* ============================ Freunde-Logik ============================ */

function makeFriend(dna) {
  const id = 'f' + (S.nextId++);
  const usedNames = new Set(Object.values(S.friends).map(f => f.name));
  const free = NAMES.filter(n => !usedNames.has(n));
  const t = now();
  const f = {
    id, dna,
    name: free.length ? choice(free) : choice(NAMES) + ' ' + (S.stats.awakened + 1),
    personality: rint(PERSONALITIES.length),
    level: 1, xp: 0,
    bornAt: t, lastWater: t, lastPet: t - PET_COOLDOWN_MIN * 60000,
    lastGift: 0, lastCollect: t,
  };
  S.friends[id] = f;
  return f;
}

function moodOf(f) {
  const slow = hasDeco('lantern') ? 0.75 : 1;
  const h = ((now() - f.lastWater) / 3600000) * slow;
  return MOODS.find(m => h < m.maxH);
}

function rateOf(f) {  // Sonnenschein pro Minute
  const base = 2 * RARITIES[f.dna.rarity].mult * (1 + 0.2 * (f.level - 1));
  const deco = hasDeco('fountain') ? 1.15 : 1;
  return base * moodOf(f).mult * deco;
}

function pendingSuns(f) {
  const mins = Math.min((now() - f.lastCollect) / 60000, SUN_CAP_MIN);
  return Math.floor(mins * rateOf(f));
}

function xpForNext(level) { return 100 * level; }

function addXp(f, n, ev) {
  if (f.level >= MAX_LEVEL) return;
  n = Math.round(n * (hasDeco('gnome') ? 1.2 : 1));
  f.xp += n;
  if (ev) fxAt(ev, `+${n} 💗`, true);
  while (f.level < MAX_LEVEL && f.xp >= xpForNext(f.level)) {
    f.xp -= xpForNext(f.level);
    f.level++;
    const bonus = 25 * f.level;
    S.suns += bonus;
    S.stats.sunsTotal += bonus;
    toast(`💖 ${f.name} ist jetzt Freundschafts-Level ${f.level}! (+${bonus} ☀️)`);
    if (f.level === MAX_LEVEL) toast(`🏆 ${f.name} ist dein bester Freund geworden!`);
  }
  save();
}

/* ============================ Aktionen ============================ */

function unlockPlot(i, ev) {
  const cost = PLOT_COSTS[i];
  if (S.suns < cost) { toast(`Du brauchst ${cost} ☀️, um dieses Beet zu öffnen.`); return; }
  S.suns -= cost;
  S.plots[i].unlocked = true;
  toast('🌿 Neues Beet freigeschaltet!');
  if (ev) fxAt(ev, '🌿');
  renderHeader(); renderGarden(); save();
}

function plantSeed(i, type) {
  if (!S.inventory[type]) return;
  S.inventory[type]--;
  const firstSeed = !S.firstSeedUsed;
  S.firstSeedUsed = true;
  S.plots[i].seed = {
    type,
    dna: makeDNA(type),
    stage: 0,
    stageStart: now(),
    waiting: false,
    fast: firstSeed,
  };
  goalProgress('plant', 1);
  closeModal();
  toast(`${SEEDS[type].icon} Samen gepflanzt! Gieß ihn, wenn er so weit ist.`);
  renderGarden(); save();
}

function stageMs(seed) {
  const mins = SEEDS[seed.type].stageMin[seed.stage];
  // Der allererste Samen wächst stark beschleunigt (Tutorial-Erlebnis)
  return seed.fast ? mins * 60000 * 0.08 : mins * 60000;
}

function waterSeed(i, ev) {
  const seed = S.plots[i].seed;
  if (!seed || !seed.waiting || seed.stage >= 2) return;
  seed.stage++;
  seed.stageStart = now();
  seed.waiting = false;
  goalProgress('water', 1);
  if (ev) fxAt(ev, '💧');
  renderGarden(); save();
}

function awaken(i) {
  const seed = S.plots[i].seed;
  if (!seed || !(seed.waiting && seed.stage === 2)) return;
  const f = makeFriend(seed.dna);
  S.plots[i].seed = null;
  S.plots[i].friendId = f.id;
  S.stats.awakened++;
  S.stats.byRarity[f.dna.rarity]++;
  goalProgress('awaken', 1);
  renderGarden(); save();
  showReveal(f);
}

function waterFriend(id, ev) {
  const f = S.friends[id];
  const h = (now() - f.lastWater) / 3600000;
  if (h < WATER_INTERVAL_H) { toast(`${f.name} ist noch nicht durstig.`); return; }
  f.lastWater = now();
  goalProgress('water', 1);
  addXp(f, 12, ev);
  toast(`💧 ${f.name} fühlt sich erfrischt!`);
  refreshOpenFriend(id); renderGarden(); save();
}

function petFriend(id, ev) {
  const f = S.friends[id];
  if (now() - f.lastPet < PET_COOLDOWN_MIN * 60000) { toast(`${f.name} kuschelt noch nach. 🥰`); return; }
  f.lastPet = now();
  goalProgress('pet', 1);
  addXp(f, 6, ev);
  const p = PERSONALITIES[f.personality];
  toast(`🤗 ${f.name}: ${choice(p.quotes)}`);
  refreshOpenFriend(id); save();
}

function giftFriend(id, ev) {
  const f = S.friends[id];
  if (now() - f.lastGift < GIFT_COOLDOWN_MIN * 60000) { toast(`${f.name} freut sich noch über das letzte Geschenk!`); return; }
  if (S.suns < GIFT_COST) { toast(`Ein Geschenk kostet ${GIFT_COST} ☀️.`); return; }
  S.suns -= GIFT_COST;
  f.lastGift = now();
  f.lastWater = now();          // Geschenke muntern auch auf
  goalProgress('gift', 1);
  addXp(f, 30, ev);
  toast(`🎁 ${f.name} hüpft vor Freude!`);
  renderHeader(); refreshOpenFriend(id); renderGarden(); save();
}

function collectSuns(id, ev) {
  const f = S.friends[id];
  const n = pendingSuns(f);
  if (n <= 0) return;
  f.lastCollect = now();
  addSuns(n, ev);
  refreshOpenFriend(id); renderGarden();
}

function renameFriend(id) {
  const input = $('#rename-input');
  const name = input && input.value.trim();
  if (!name) return;
  S.friends[id].name = name.slice(0, 16);
  save();
  showFriend(id);
  renderGarden();
}

function buySeed(type, ev) {
  const seed = SEEDS[type];
  if (S.suns < seed.cost) { toast(`Nicht genug Sonnenschein (${seed.cost} ☀️ nötig).`); return; }
  S.suns -= seed.cost;
  S.inventory[type]++;
  toast(`${seed.icon} ${seed.name} gekauft!`);
  if (ev) fxAt(ev, seed.icon);
  renderHeader(); renderView(); save();
}

function buyDeco(id, ev) {
  const d = DECOS[id];
  if (hasDeco(id)) return;
  if (S.suns < d.cost) { toast(`Nicht genug Sonnenschein (${d.cost} ☀️ nötig).`); return; }
  S.suns -= d.cost;
  S.decos.push(id);
  toast(`${d.icon} ${d.name} steht jetzt in deinem Garten!`);
  if (ev) fxAt(ev, d.icon);
  renderHeader(); renderView(); renderDecoStrip(); save();
}

/* ============================ Tagesziele & Streak ============================ */

function todayStr() { return new Date().toDateString(); }

function rollGoals() {
  // 3 deterministisch zufällige Ziele pro Tag
  const d = new Date();
  let h = d.getFullYear() * 372 + d.getMonth() * 31 + d.getDate();
  const pool = [...GOAL_POOL];
  const goals = [];
  for (let k = 0; k < 3; k++) {
    h = (h * 9301 + 49297) % 233280;
    goals.push({ ...pool.splice(h % pool.length, 1)[0], progress: 0, claimed: false });
  }
  return goals;
}

function checkNewDay() {
  const today = todayStr();
  if (S.lastDay === today) return;
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const isFirstDay = S.lastDay === null;
  S.streak = (S.lastDay === yesterday) ? S.streak + 1 : 1;
  S.lastDay = today;
  S.goals = rollGoals();
  S.dailyClaimed = false;
  save();
  renderHeader();
  if (!isFirstDay) showDailyBonus();
}

function dailyReward() {
  const suns = 25 + 15 * Math.min(S.streak, 7);
  const seed = S.streak % 7 === 0 ? 'stern' : (S.streak % 3 === 0 ? 'bluete' : null);
  return { suns, seed };
}

function claimDaily() {
  if (S.dailyClaimed) return;
  const r = dailyReward();
  S.dailyClaimed = true;
  addSuns(r.suns);
  if (r.seed) {
    S.inventory[r.seed]++;
    toast(`🎁 Bonus: 1× ${SEEDS[r.seed].name}!`);
  }
  save();
  closeModal();
}

function goalProgress(id, amount) {
  if (!S.goals) return;
  let hit = false;
  for (const g of S.goals) {
    if (g.id === id && !g.claimed && g.progress < g.n) {
      g.progress = Math.min(g.n, g.progress + amount);
      if (g.progress >= g.n) { toast(`⭐ Ziel geschafft: ${g.label}`); hit = true; }
    }
  }
  if (hit) updateTasksDot();
  save();
}

function claimGoal(idx, ev) {
  const g = S.goals[idx];
  if (!g || g.claimed || g.progress < g.n) return;
  g.claimed = true;
  addSuns(g.reward, ev);
  if (S.goals.every(x => x.claimed)) {
    addSuns(50);
    toast('🌟 Alle Tagesziele geschafft! +50 ☀️ Bonus!');
  }
  renderView(); updateTasksDot(); save();
}

function updateTasksDot() {
  const anyClaimable = S.goals && S.goals.some(g => !g.claimed && g.progress >= g.n);
  $('#tasks-dot').hidden = !anyClaimable;
}

/* ============================ Rendering ============================ */

function renderHeader() {
  $('#suns-val').textContent = Math.floor(S.suns);
  $('#streak-val').textContent = S.streak;
}

function plotSignature(i) {
  const p = S.plots[i];
  if (!p.unlocked) return 'locked';
  if (p.friendId) {
    const f = S.friends[p.friendId];
    return `friend:${p.friendId}:${moodOf(f).key}:${f.level}:${f.name}`;
  }
  if (p.seed) return `seed:${p.seed.type}:${p.seed.stage}:${p.seed.waiting}`;
  return 'empty';
}

function buildPlot(i) {
  const p = S.plots[i];
  const el = document.createElement('div');
  el.dataset.plot = i;
  el.dataset.sig = plotSignature(i);

  if (!p.unlocked) {
    el.className = 'plot locked';
    el.innerHTML = `<div class="lock-icon">🔒</div>
      <div class="p-name">Neues Beet</div>
      <div class="p-sub">${PLOT_COSTS[i]} ☀️</div>`;
    el.onclick = ev => unlockPlot(i, ev);
    return el;
  }

  if (p.friendId) {
    const f = S.friends[p.friendId];
    const mood = moodOf(f);
    const pending = pendingSuns(f);
    el.className = 'plot friend-plot r-' + f.dna.rarity;
    el.innerHTML = `
      <span class="mood-tag" title="${mood.label}">${mood.emoji}</span>
      ${pending >= 5 ? `<span class="sun-bubble">+${pending} ☀️</span>` : ''}
      <div class="art">${friendSVG(f.dna, mood.key)}</div>
      <div class="p-name">${esc(f.name)}</div>
      <div class="p-sub">💗 Lv. ${f.level} · ${mood.label}</div>`;
    el.querySelector('.art').onclick = () => showFriend(f.id);
    const bubble = el.querySelector('.sun-bubble');
    if (bubble) bubble.onclick = ev => { ev.stopPropagation(); collectSuns(f.id, ev); };
    return el;
  }

  if (p.seed) {
    const seed = p.seed;
    // Nach Neuladen/Abwesenheit sofort erkennen, dass die Stufe fertig ist
    if (!seed.waiting && now() - seed.stageStart >= stageMs(seed)) seed.waiting = true;
    const ready = seed.waiting && seed.stage === 2;
    el.className = 'plot growing';
    let action;
    if (ready) {
      action = `<button class="btn awaken small">🌸 Erwecken!</button>`;
    } else if (seed.waiting) {
      action = `<button class="btn water small pulse">💧 Gießen</button>`;
    } else {
      const total = stageMs(seed);
      const left = Math.max(0, seed.stageStart + total - now());
      const pct = Math.min(100, 100 * (1 - left / total));
      action = `<div class="progress"><i style="width:${pct}%"></i></div>
        <div class="p-sub timer">${fmtTime(left)}</div>`;
    }
    el.innerHTML = `
      <div class="art">${growthSVG(seed.stage, seed.dna, ready)}</div>
      <div class="p-sub">${SEEDS[seed.type].icon} ${SEEDS[seed.type].name} · Stufe ${seed.stage + 1}/3</div>
      ${action}`;
    const btn = el.querySelector('button');
    if (btn) btn.onclick = ev => { ev.stopPropagation(); ready ? awaken(i) : waterSeed(i, ev); };
    return el;
  }

  el.className = 'plot empty';
  el.innerHTML = `<div class="plus">🌱</div><div class="p-sub">Samen pflanzen</div>`;
  el.onclick = () => showSeedPicker(i);
  return el;
}

function renderGarden() {
  const g = $('#garden');
  g.innerHTML = '';
  S.plots.forEach((_, i) => g.appendChild(buildPlot(i)));
}

function renderDecoStrip() {
  const strip = $('#deco-strip');
  strip.innerHTML = S.decos.map(id =>
    `<span class="deco" title="${DECOS[id].name}: ${DECOS[id].desc}">${DECOS[id].icon}</span>`).join('');
}

/* --- gezielte Sekunden-Updates ohne DOM-Neuaufbau --- */
function tick() {
  if (currentView !== 'garden') return;
  document.querySelectorAll('#garden .plot').forEach(el => {
    const i = +el.dataset.plot;
    const sig = plotSignature(i);
    if (el.dataset.sig !== sig) { el.replaceWith(buildPlot(i)); return; }
    const p = S.plots[i];
    if (p.seed && !p.seed.waiting) {
      const total = stageMs(p.seed);
      const left = Math.max(0, p.seed.stageStart + total - now());
      if (left <= 0) { p.seed.waiting = true; el.replaceWith(buildPlot(i)); save(); return; }
      const bar = el.querySelector('.progress i');
      const timer = el.querySelector('.timer');
      if (bar) bar.style.width = Math.min(100, 100 * (1 - left / total)) + '%';
      if (timer) timer.textContent = fmtTime(left);
    }
    if (p.friendId) {
      const f = S.friends[p.friendId];
      const pending = pendingSuns(f);
      let bubble = el.querySelector('.sun-bubble');
      if (pending >= 5) {
        if (!bubble) {
          bubble = document.createElement('span');
          bubble.className = 'sun-bubble';
          bubble.onclick = ev => { ev.stopPropagation(); collectSuns(f.id, ev); };
          el.prepend(bubble);
        }
        bubble.textContent = `+${pending} ☀️`;
      } else if (bubble) bubble.remove();
    }
  });
}

/* ============================ Ansichten ============================ */

function switchView(v) {
  currentView = v;
  document.querySelectorAll('#nav button').forEach(b =>
    b.classList.toggle('active', b.dataset.view === v));
  document.querySelectorAll('.view').forEach(sec =>
    sec.hidden = sec.id !== 'view-' + v);
  renderView();
}

function renderView() {
  if (currentView === 'garden') { renderGarden(); renderDecoStrip(); }
  if (currentView === 'album') renderAlbum();
  if (currentView === 'tasks') renderTasks();
  if (currentView === 'shop') renderShop();
}

function renderAlbum() {
  const v = $('#view-album');
  const friends = Object.values(S.friends).sort((a, b) =>
    Object.keys(RARITIES).indexOf(b.dna.rarity) - Object.keys(RARITIES).indexOf(a.dna.rarity) || b.level - a.level);
  const r = S.stats.byRarity;
  v.innerHTML = `<h1>📖 Freundealbum</h1>
    <div class="album-stats">
      <span>🌸 ${S.stats.awakened} Freunde erweckt</span>
      <span style="color:var(--rare)">💙 ${r.rare} selten</span>
      <span style="color:var(--epic)">💜 ${r.epic} episch</span>
      <span style="color:var(--legendary)">💛 ${r.legendary} legendär</span>
    </div>
    ${friends.length === 0 ? '<p style="text-align:center;margin-top:24px;color:var(--ink-soft)">Noch keine Freunde erweckt.<br>Pflanze einen Samen im Garten! 🌱</p>' : ''}
    <div class="album-grid">
      ${friends.map(f => `
        <div class="album-card" data-fid="${f.id}">
          <div class="art">${friendSVG(f.dna)}</div>
          <div class="p-name">${esc(f.name)}</div>
          <span class="rarity-chip ${f.dna.rarity}">${RARITIES[f.dna.rarity].label}</span>
          <div class="p-sub">💗 Lv. ${f.level} · ${PERSONALITIES[f.personality].name}</div>
        </div>`).join('')}
    </div>`;
  v.querySelectorAll('.album-card').forEach(c =>
    c.onclick = () => showFriend(c.dataset.fid));
}

function renderTasks() {
  const v = $('#view-tasks');
  const r = dailyReward();
  v.innerHTML = `<h1>⭐ Tagesziele</h1>
    <div class="panel-card ${S.dailyClaimed ? 'done' : ''}">
      <span class="icon">🔥</span>
      <div class="grow">
        <h3>Tages-Serie: ${S.streak} Tag${S.streak === 1 ? '' : 'e'}</h3>
        <p>Komm jeden Tag vorbei, um deine Serie zu verlängern! Tag 3 & 7 bringen Extra-Samen.</p>
      </div>
      ${S.dailyClaimed
        ? '<span>✅</span>'
        : `<button class="btn small" id="claim-daily">+${r.suns} ☀️</button>`}
    </div>
    <h2 class="section-h">Heutige Ziele</h2>
    ${(S.goals || []).map((g, i) => `
      <div class="panel-card ${g.claimed ? 'done' : ''}">
        <span class="icon">${g.icon}</span>
        <div class="grow">
          <h3>${g.label}</h3>
          <div class="progress"><i style="width:${100 * g.progress / g.n}%"></i></div>
          <p>${Math.floor(g.progress)}/${g.n}</p>
        </div>
        ${g.claimed ? '<span>✅</span>' :
          `<button class="btn small" data-goal="${i}" ${g.progress < g.n ? 'disabled' : ''}>+${g.reward} ☀️</button>`}
      </div>`).join('')}
    <p style="text-align:center;margin-top:16px;color:var(--ink-soft);font-size:.85rem">
      Neue Ziele gibt es jeden Tag! 🌅</p>`;
  const daily = $('#claim-daily');
  if (daily) daily.onclick = claimDaily;
  v.querySelectorAll('[data-goal]').forEach(b =>
    b.onclick = ev => claimGoal(+b.dataset.goal, ev));
}

function renderShop() {
  const v = $('#view-shop');
  v.innerHTML = `<h1>🛒 Gartenladen</h1>
    <h2 class="section-h">Samen</h2>
    ${Object.entries(SEEDS).map(([k, s]) => `
      <div class="panel-card">
        <span class="icon">${s.icon}</span>
        <div class="grow">
          <h3>${s.name} <small style="color:var(--ink-soft)">(du hast ${S.inventory[k]})</small></h3>
          <p>${s.desc}</p>
        </div>
        <button class="btn small" data-seed="${k}">${s.cost} ☀️</button>
      </div>`).join('')}
    <h2 class="section-h">Dekoration</h2>
    ${Object.entries(DECOS).map(([k, d]) => `
      <div class="panel-card ${hasDeco(k) ? 'done' : ''}">
        <span class="icon">${d.icon}</span>
        <div class="grow"><h3>${d.name}</h3><p>${d.desc}</p></div>
        ${hasDeco(k) ? '<span>✅</span>' : `<button class="btn small" data-deco="${k}">${d.cost} ☀️</button>`}
      </div>`).join('')}
    <p style="text-align:center;margin-top:16px;color:var(--ink-soft);font-size:.85rem">
      Neue Beete kaufst du direkt im Garten (🔒). </p>`;
  v.querySelectorAll('[data-seed]').forEach(b => b.onclick = ev => buySeed(b.dataset.seed, ev));
  v.querySelectorAll('[data-deco]').forEach(b => b.onclick = ev => buyDeco(b.dataset.deco, ev));
}

/* ============================ Modals ============================ */

function showModal(html, sticky) {
  const ov = $('#overlay');
  $('#modal').innerHTML = html;
  ov.hidden = false;
  ov.onclick = sticky ? null : (e => { if (e.target === ov) closeModal(); });
}
function closeModal() { $('#overlay').hidden = true; }

function showSeedPicker(plotIdx) {
  const rows = Object.entries(SEEDS).map(([k, s]) => {
    const have = S.inventory[k];
    return `<div class="panel-card">
      <span class="icon">${s.icon}</span>
      <div class="grow"><h3>${s.name}</h3><p>${s.desc}</p></div>
      ${have > 0
        ? `<button class="btn small" data-plant="${k}">Pflanzen (${have})</button>`
        : `<button class="btn small ghost" data-buyplant="${k}" ${S.suns < s.cost ? 'disabled' : ''}>${s.cost} ☀️</button>`}
    </div>`;
  }).join('');
  showModal(`<h2>🌱 Was möchtest du pflanzen?</h2>${rows}
    <div class="row"><button class="btn ghost" onclick="G.closeModal()">Abbrechen</button></div>`);
  document.querySelectorAll('#modal [data-plant]').forEach(b =>
    b.onclick = () => plantSeed(plotIdx, b.dataset.plant));
  document.querySelectorAll('#modal [data-buyplant]').forEach(b =>
    b.onclick = ev => {
      const k = b.dataset.buyplant;
      if (S.suns < SEEDS[k].cost) return;
      S.suns -= SEEDS[k].cost;
      S.inventory[k]++;
      renderHeader();
      plantSeed(plotIdx, k);
    });
}

function showReveal(f) {
  const rar = RARITIES[f.dna.rarity];
  const fanfare = { common: '🌸', rare: '💙 Wow!', epic: '💜 Unglaublich!', legendary: '🌟 LEGENDÄR! 🌟' }[f.dna.rarity];
  showModal(`
    <h2>${fanfare}</h2>
    <div class="big-art reveal-glow">${friendSVG(f.dna, 'strahlend')}</div>
    <h2>${esc(f.name)}</h2>
    <span class="rarity-chip ${rar.cls}">${rar.label}</span>
    <p class="quote">${choice(PERSONALITIES[f.personality].quotes)}</p>
    <p style="font-size:.85rem;color:var(--ink-soft)">Persönlichkeit: ${PERSONALITIES[f.personality].name}</p>
    <div class="row">
      <button class="btn" onclick="G.closeModal()">Hallo, ${esc(f.name)}! 👋</button>
      <button class="btn ghost" onclick="G.showFriend('${f.id}')">Umbenennen</button>
    </div>`, true);
}

let openFriendId = null;
function refreshOpenFriend(id) {
  if (openFriendId === id && !$('#overlay').hidden) showFriend(id);
}

function showFriend(id) {
  const f = S.friends[id];
  if (!f) return;
  openFriendId = id;
  const mood = moodOf(f);
  const rar = RARITIES[f.dna.rarity];
  const pending = pendingSuns(f);
  const canWater = (now() - f.lastWater) / 3600000 >= WATER_INTERVAL_H;
  const canPet = now() - f.lastPet >= PET_COOLDOWN_MIN * 60000;
  const canGift = now() - f.lastGift >= GIFT_COOLDOWN_MIN * 60000 && S.suns >= GIFT_COST;
  const hearts = '💗'.repeat(f.level) + '🤍'.repeat(MAX_LEVEL - f.level);
  const xpPct = f.level >= MAX_LEVEL ? 100 : 100 * f.xp / xpForNext(f.level);
  showModal(`
    <div class="big-art">${friendSVG(f.dna, mood.key)}</div>
    <h2>${esc(f.name)} <button class="btn small ghost" id="show-rename">✏️</button></h2>
    <span class="rarity-chip ${rar.cls}">${rar.label}</span>
    <p class="quote">${choice(PERSONALITIES[f.personality].quotes)}</p>
    <div class="hearts" title="Freundschafts-Level">${hearts}</div>
    <div class="xp-bar"><i style="width:${xpPct}%"></i></div>
    <p style="font-size:.8rem;color:var(--ink-soft)">
      ${f.level >= MAX_LEVEL ? '🏆 Beste Freunde für immer!' : `Level ${f.level} · ${f.xp}/${xpForNext(f.level)} XP`}
      · ${mood.emoji} ${mood.label} · ${rateOf(f).toFixed(1)} ☀️/min</p>
    <div id="rename-box" hidden style="margin-top:8px">
      <input id="rename-input" maxlength="16" value="${esc(f.name)}">
      <div class="row"><button class="btn small" id="do-rename">Speichern</button></div>
    </div>
    <div class="row">
      <button class="btn water" id="act-water" ${canWater ? '' : 'disabled'}>💧 Gießen</button>
      <button class="btn" id="act-pet" ${canPet ? '' : 'disabled'}>🤗 Streicheln</button>
      <button class="btn" id="act-gift" ${canGift ? '' : 'disabled'}>🎁 ${GIFT_COST} ☀️</button>
    </div>
    <div class="row">
      <button class="btn" id="act-collect" ${pending > 0 ? '' : 'disabled'}>☀️ ${pending} einsammeln</button>
      <button class="btn ghost" onclick="G.closeModal()">Zurück</button>
    </div>`);
  $('#act-water').onclick = ev => waterFriend(id, ev);
  $('#act-pet').onclick = ev => petFriend(id, ev);
  $('#act-gift').onclick = ev => giftFriend(id, ev);
  $('#act-collect').onclick = ev => collectSuns(id, ev);
  $('#show-rename').onclick = () => { $('#rename-box').hidden = false; $('#rename-input').focus(); };
  $('#do-rename').onclick = () => renameFriend(id);
}

function showDailyBonus() {
  const r = dailyReward();
  showModal(`
    <h2>🌅 Willkommen zurück!</h2>
    <p style="font-size:3rem;margin:8px 0">🔥</p>
    <h2>Tag ${S.streak} deiner Serie!</h2>
    <p class="quote">Deine Freunde haben dich vermisst.</p>
    <p style="margin:10px 0;font-weight:800;font-size:1.1rem">
      Geschenk: ${r.suns} ☀️${r.seed ? ` + 1× ${SEEDS[r.seed].icon} ${SEEDS[r.seed].name}` : ''}</p>
    <div class="row"><button class="btn" onclick="G.claimDaily()">Annehmen 🎁</button></div>`, true);
}

function showIntro() {
  showModal(`
    <h2>🌼 Willkommen im Garten der Freunde!</h2>
    <p style="text-align:left;line-height:1.6;margin-top:10px">
      🌱 <b>Pflanze Samen</b> und gieße sie, damit sie wachsen.<br><br>
      🌸 Aus jeder Blüte erwacht ein <b>einzigartiger Freund</b> – kein Freund sieht aus wie der andere!<br><br>
      💧🤗🎁 <b>Kümmere dich</b> um deine Freunde: Gießen, Streicheln und Geschenke stärken eure Freundschaft.<br><br>
      ☀️ Glückliche Freunde schenken dir <b>Sonnenschein</b> – dein Geld für neue Samen, Beete und Deko.<br><br>
      🔥 Komm <b>jeden Tag</b> wieder: Deine Freunde warten auf dich!
    </p>
    <div class="row"><button class="btn" onclick="G.startIntro()">Los geht's! 🌷</button></div>`, true);
}

function startIntro() {
  S.introSeen = true;
  save();
  closeModal();
  toast('🌱 Tippe auf ein freies Beet, um deinen ersten Samen zu pflanzen!');
}

/* ============================ Schmetterling ============================ */

function maybeButterfly() {
  if (butterflyActive || currentView !== 'garden' || document.hidden) return;
  if (Math.random() > 1 / 75) return;
  butterflyActive = true;
  const b = document.createElement('div');
  b.className = 'butterfly';
  b.textContent = choice(['🦋', '🐝', '🐞']);
  b.style.top = (15 + rint(45)) + '%';
  b.onclick = ev => {
    const n = 5 + rint(21);
    addSuns(n, ev);
    toast(`Ein Besucher lässt ${n} ☀️ da!`);
    b.remove();
    butterflyActive = false;
  };
  $('#fx-layer').appendChild(b);
  setTimeout(() => { if (b.parentNode) b.remove(); butterflyActive = false; }, 9500);
}

/* ============================ Start ============================ */

function init() {
  load();
  renderHeader();
  renderGarden();
  renderDecoStrip();
  updateTasksDot();

  document.querySelectorAll('#nav button').forEach(b =>
    b.onclick = () => switchView(b.dataset.view));

  if (!S.introSeen) {
    S.lastDay = todayStr();
    S.goals = rollGoals();
    showIntro();
  } else {
    checkNewDay();
  }

  setInterval(() => { tick(); maybeButterfly(); }, 1000);
  setInterval(() => { checkNewDay(); }, 60000);
  setInterval(save, 30000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) save(); else { checkNewDay(); renderView(); }
  });
  window.addEventListener('beforeunload', save);

  // Himmels-Deko
  $('#sky-deco').textContent = '☁️ ☀️ ☁️';
}

/* global für Inline-Handler in Modals (+ kleine Debug-Hooks für Tests) */
window.G = { closeModal, claimDaily, showFriend, startIntro,
  _state: () => S, _save: save, _renderGarden: renderGarden, _friendSVG: friendSVG };

init();
