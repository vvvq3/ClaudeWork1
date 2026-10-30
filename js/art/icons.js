// ============================================================================
// ICONS FOR THE HTML INTERFACE
// Unit portraits are rendered from the same sprites used on the battlefield;
// upgrade-card and bonus-card icons are hand-built SVGs in the same inked style.
// ============================================================================
Art.icons = (function () {
  const INK = '#2a1810';

  const svg = (body, defs = '') =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><defs>${defs}</defs>${body}</svg>`;
  const dataUrl = s => 'data:image/svg+xml;utf8,' + encodeURIComponent(s);
  const img = (s, cls) => `<img class="${cls}" alt="" draggable="false" src="${dataUrl(s)}">`;
  const grad = (id, a, b, horizontal) =>
    `<linearGradient id="${id}" x1="0" y1="0" x2="${horizontal ? 1 : 0}" y2="${horizontal ? 0 : 1}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
  const S = (w = 3) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

  const COIN_DEFS = grad('gc', '#ffe680', '#e8a10e') + grad('wd', '#c98a4a', '#8a5528') + grad('gl', '#e8f8ff', '#9fd4f5');

  const coin = (x, y, r = 10) =>
    `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r}" fill="url(#gc)" ${S(2.6)}/>` +
    `<circle cx="${x}" cy="${y}" r="${r * 0.62}" fill="none" stroke="#b9780a" stroke-width="2"/>` +
    `<path d="M${x - r * 0.35} ${y - r * 0.45} L${x + r * 0.05} ${y - r * 0.6}" stroke="#fff8d0" stroke-width="2.4" stroke-linecap="round"/>`;

  // ---- standalone icons ---------------------------------------------------------
  const ICONS = {
    gold_rate: svg(
      `<ellipse cx="48" cy="88" rx="30" ry="5" fill="rgba(0,0,0,.25)"/>
       <rect x="12" y="8" width="72" height="12" rx="4" fill="url(#wd)" ${S()}/>
       <rect x="12" y="74" width="72" height="12" rx="4" fill="url(#wd)" ${S()}/>
       <rect x="16" y="20" width="7" height="54" fill="url(#wd)" ${S(2.6)}/>
       <rect x="73" y="20" width="7" height="54" fill="url(#wd)" ${S(2.6)}/>
       <path d="M26 20 H70 C70 40 55 44 52 48 C55 52 70 56 70 74 H26 C26 56 41 52 44 48 C41 44 26 40 26 20 Z" fill="url(#gl)" fill-opacity=".8" ${S()}/>
       <path d="M31 22 H65 C62 32 54 37 48 40 C42 37 34 32 31 22 Z" fill="url(#gc)"/>
       <path d="M48 41 V62" stroke="#f2b61c" stroke-width="2.6" stroke-linecap="round"/>
       <path d="M31 72 H65 C62 65 55 60 48 57 C41 60 34 65 31 72 Z" fill="url(#gc)" stroke="#b9780a" stroke-width="1.5"/>
       <path d="M30 24 C30 34 38 40 42 44" stroke="#fff" stroke-opacity=".8" stroke-width="2.6" fill="none" stroke-linecap="round"/>
       ${coin(72, 80, 9)}${coin(60, 84, 8)}`,
      COIN_DEFS),
    instant_gold: svg(
      `<ellipse cx="48" cy="88" rx="34" ry="5" fill="rgba(0,0,0,.25)"/>
       ${[[24, 76], [24, 68], [24, 60]].map(([x, y]) => coin(x, y, 13)).join('')}
       ${[[70, 78], [70, 70], [70, 62], [70, 54]].map(([x, y]) => coin(x, y, 13)).join('')}
       ${[[47, 80], [47, 72], [47, 64], [47, 56], [47, 48]].map(([x, y]) => coin(x, y, 14)).join('')}
       <path d="M47 22 L51 32 L62 34 L54 41 L56 52 L47 46 L38 52 L40 41 L32 34 L43 32 Z" fill="#fff6a8" ${S(2.4)}/>
       <path d="M14 30 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3z" fill="#fff6a8" stroke="${INK}" stroke-width="1.6" transform="translate(6 -8) scale(.7)"/>
       <path d="M14 30 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3z" fill="#fff6a8" stroke="${INK}" stroke-width="1.6" transform="translate(66 6) scale(.6)"/>`,
      COIN_DEFS),
    wipe_enemies: svg(
      `<ellipse cx="48" cy="86" rx="26" ry="4.5" fill="rgba(0,0,0,.25)"/>
       <path d="M18 44 C8 44 6 28 20 27 C22 14 40 12 46 22 C54 14 74 18 72 32 C86 32 88 48 74 50 L20 50 C14 50 14 44 18 44 Z" fill="#6b5a8e" ${S()}/>
       <path d="M24 30 C28 22 38 20 44 25" stroke="#a594c9" stroke-width="3" fill="none" stroke-linecap="round"/>
       <path d="M56 12 L28 54 L46 54 L36 90 L72 44 L53 44 L66 12 Z" fill="url(#gc)" ${S(3.2)}/>
       <path d="M54 18 L36 46" stroke="#fff8d0" stroke-width="3" stroke-linecap="round" opacity=".85"/>
       <path d="M16 70 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3z" fill="#fff6a8" stroke="${INK}" stroke-width="1.6" transform="translate(4 -16) scale(.7)"/>`,
      COIN_DEFS),
    castle_max_hp: svg(
      `<ellipse cx="48" cy="88" rx="30" ry="5" fill="rgba(0,0,0,.25)"/>
       <rect x="22" y="38" width="52" height="46" fill="#b9c1cf" ${S()}/>
       <rect x="22" y="38" width="16" height="46" fill="#8c96a8" opacity=".5"/>
       <path d="M18 38 V26 H28 V32 H36 V26 H46 V32 H54 V26 H64 V32 H70 V26 H78 V38 Z" fill="#cfd6e2" ${S(2.8)}/>
       <path d="M16 26 L48 4 L80 26 Z" fill="#3b78dc" ${S()}/>
       <path d="M48 4 L80 26 L62 26 Z" fill="#2158b8" opacity=".6"/>
       <path d="M48 4 V-2" ${S(2.4)}/>
       <path d="M38 84 V62 C38 52 58 52 58 62 V84 Z" fill="#6a4222" ${S(2.8)}/>
       <rect x="60" y="44" width="8" height="12" rx="4" fill="#2d2540" ${S(2)}/>
       <circle cx="76" cy="74" r="15" fill="#4ade5a" ${S(3)}/>
       <path d="M76 66 V82 M68 74 H84" stroke="#fff" stroke-width="5" stroke-linecap="round"/>`),
    castle_heal: svg(
      `<ellipse cx="48" cy="88" rx="30" ry="5" fill="rgba(0,0,0,.25)"/>
       <g transform="rotate(-38 48 50)">
         <rect x="43" y="22" width="11" height="62" rx="4" fill="url(#wd)" ${S()}/>
         <rect x="22" y="12" width="52" height="24" rx="6" fill="#aab6c8" ${S()}/>
         <rect x="22" y="12" width="52" height="9" rx="4" fill="#e7eef8" opacity=".75"/>
         <rect x="22" y="12" width="12" height="24" rx="6" fill="#7b889c" opacity=".55"/>
       </g>
       <circle cx="70" cy="68" r="17" fill="#4ade5a" ${S(3)}/>
       <path d="M70 58 V78 M60 68 H80" stroke="#fff" stroke-width="6" stroke-linecap="round"/>
       <path d="M62 60 C64 56 68 54 72 54" stroke="#d9ffe0" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
      COIN_DEFS),
    buy_cards: svg(
      `<ellipse cx="48" cy="88" rx="32" ry="5" fill="rgba(0,0,0,.25)"/>
       <g transform="rotate(-16 30 52)"><rect x="12" y="16" width="34" height="52" rx="6" fill="#4f8ef0" ${S()}/><rect x="17" y="21" width="24" height="42" rx="3" fill="none" stroke="#bcd6ff" stroke-width="2"/></g>
       <g transform="rotate(16 66 52)"><rect x="50" y="16" width="34" height="52" rx="6" fill="#f0b323" ${S()}/><rect x="55" y="21" width="24" height="42" rx="3" fill="none" stroke="#fff0b0" stroke-width="2"/></g>
       <rect x="30" y="10" width="36" height="56" rx="6" fill="#ef4f45" ${S()}/>
       <rect x="35" y="15" width="26" height="46" rx="3" fill="none" stroke="#ffc2bc" stroke-width="2"/>
       <path d="M48 24 L52.5 34.5 L64 35.5 L55.3 43 L58 54 L48 48 L38 54 L40.7 43 L32 35.5 L43.5 34.5 Z" fill="#fff0a0" ${S(2.4)}/>`)
  };

  // badges used on top of unit portraits
  const BADGES = {
    unit_atk: svg(
      `<circle cx="48" cy="48" r="40" fill="#e23a34" ${S(4)}/>
       <path d="M26 70 L62 26 L72 24 L70 34 L34 74 Z" fill="#eef3f9" ${S(3)}/>
       <path d="M70 70 L34 26 L24 24 L26 34 L62 74 Z" fill="#dfe7f1" ${S(3)}/>
       <path d="M22 62 L38 78 M74 62 L58 78" stroke="#ffd447" stroke-width="7" stroke-linecap="round"/>
       <path d="M22 62 L38 78 M74 62 L58 78" stroke="${INK}" stroke-width="1.4" stroke-linecap="round" opacity=".6"/>`),
    unit_hp: svg(
      `<circle cx="48" cy="48" r="40" fill="#2f7be6" ${S(4)}/>
       <path d="M24 24 L48 16 L72 24 V46 C72 62 48 78 48 78 C48 78 24 62 24 46 Z" fill="#bfe0ff" ${S(3.4)}/>
       <path d="M48 24 V68 M33 42 H63" stroke="#2f7be6" stroke-width="7" stroke-linecap="round"/>
       <path d="M30 30 L46 24" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".9"/>`),
    unit_discount: svg(
      `<circle cx="48" cy="48" r="40" fill="#3fbf3f" ${S(4)}/>
       <path d="M18 50 L46 22 H72 V48 L44 76 Z" fill="#fff1b8" ${S(3.2)}/>
       <circle cx="60" cy="35" r="5" fill="#3fbf3f" ${S(2.2)}/>
       <path d="M30 56 L40 46" stroke="#e8a10e" stroke-width="3" stroke-linecap="round"/>
       <text x="49" y="62" font-family="Arial Black, Arial" font-weight="900" font-size="20" fill="#c43b2c" text-anchor="middle" stroke="${INK}" stroke-width="1.2" transform="rotate(-45 49 52)">%</text>`)
  };

  function upgrade(type, unitId) {
    if (BADGES[type] && unitId) {
      return `<div class="up-portrait"><img class="up-unit" alt="" draggable="false" src="${Art.units.portrait(unitId, 'player', 84)}">${img(BADGES[type], 'up-badge')}</div>`;
    }
    return img(ICONS[type] || ICONS.gold_rate, 'up-icon-img');
  }

  const unitCard = unitId => {
    if (unitId === 'buy_cards') return img(ICONS.buy_cards, 'unit-portrait');
    if (unitId === 'castle_up') return img(ICONS.castle_max_hp, 'unit-portrait');
    return `<img class="unit-portrait" alt="" draggable="false" src="${Art.units.portrait(unitId, 'player', 96)}">`;
  };

  return { upgrade, unitCard, ICONS };
})();
