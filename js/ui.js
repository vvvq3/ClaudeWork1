// ============================================================================
// UI RENDERING (unit cards + bonus cards + castle upgrade in the bottom bar)
// ============================================================================
const unitBarContainer = document.getElementById('unitBarContainer');
const upgradeModal = document.getElementById('upgradeModal');
const upgradeCardsContainer = document.getElementById('upgradeCardsContainer');
const btnReadyUpgrade = document.getElementById('btnReadyUpgrade');

// Hotkeys: 1-9 units, 0 = bonus cards, - = castle upgrade
const BONUS_KEY = '0';
const CASTLE_KEY = '-';

// Compact card: name, picture and price. Stats appear in a tooltip on hover (or long press).
function cardMarkup(opts) {
  return `
    <span class="card-key">${opts.key}</span>
    <div class="card-name text-outline-sm" title="${opts.title || ''}">${opts.name}</div>
    <div class="card-art">${opts.art}</div>
    <div id="${opts.priceId}" class="${opts.priceClass} price-btn">
      <span id="${opts.costId}" class="price-num text-outline-sm">${opts.cost}</span>
      <span class="coin coin-sm"></span>
    </div>`;
}

function buildBottomUnitCards() {
  unitBarContainer.innerHTML = '';

  UNIT_TYPES.forEach(u => {
    const card = document.createElement('div');
    card.id = `unit-card-${u.id}`;
    card.className = 'unit-card affordable';
    card.dataset.tip = `unit:${u.id}`;
    card.addEventListener('click', () => spawnPlayerUnit(u.id));
    card.innerHTML = cardMarkup({
      key: u.key,
      name: u.shortCardTitle || u.name,
      title: u.name,
      art: getUnitCardSVG(u.id),
      priceId: `unit-price-btn-${u.id}`,
      priceClass: 'price-btn-affordable',
      costId: `unit-cost-${u.id}`,
      cost: u.baseCost
    });
    unitBarContainer.appendChild(card);
  });

  // bonus: pay for an extra choice of 3 upgrade cards
  const bonusCard = document.createElement('div');
  bonusCard.id = 'unit-card-buy-upgrade';
  bonusCard.className = 'unit-card affordable-bonus';
  bonusCard.dataset.tip = 'cards';
  bonusCard.addEventListener('click', buyExtraUpgradeCards);
  bonusCard.innerHTML = cardMarkup({
    key: BONUS_KEY, name: '3 Карты', title: 'Купить 3 карты апгрейдов',
    art: Art.icons.unitCard('buy_cards'),
    priceId: 'buy-upgrade-price-btn', priceClass: 'price-btn-bonus', costId: 'buy-upgrade-cost', cost: 100
  });
  unitBarContainer.appendChild(bonusCard);

  // castle upgrade ladder
  const castleCard = document.createElement('div');
  castleCard.id = 'unit-card-castle';
  castleCard.className = 'unit-card affordable-castle';
  castleCard.dataset.tip = 'castle';
  castleCard.addEventListener('click', buyCastleUpgrade);
  castleCard.innerHTML = cardMarkup({
    key: CASTLE_KEY, name: 'Замок', title: 'Улучшить замок',
    art: Art.icons.unitCard('castle_up'),
    priceId: 'castle-price-btn', priceClass: 'price-btn-castle', costId: 'castle-cost', cost: CASTLE_UPGRADES[0].cost
  });
  unitBarContainer.appendChild(castleCard);

  bindCardTooltips();
}

// ---- tooltips -----------------------------------------------------------------------------------
const unitTooltip = document.getElementById('unitTooltip');
let tooltipTip = null;      // which card the tooltip currently describes
let tooltipAnchor = null;   // its element, for positioning

function speedWord(speed) {
  return speed >= 100 ? 'очень быстрая' : speed >= 55 ? 'быстрая' : speed >= 44 ? 'средняя' : 'медленная';
}

function unitTooltipHTML(u) {
  const st = getTeamUnitStats('player', u);
  const dmgNote = u.splash ? ' (по площади)' : (u.multiTarget ? ` (по ${u.multiTarget} целям)` : '');
  const range = u.isRanged ? `${u.range}` : 'ближний бой';
  return `
    <div class="tt-title">${u.name}</div>
    <div class="tt-role">${u.role || ''}</div>
    <div class="tt-grid">
      <span>❤️ Здоровье</span><b>${st.hp}</b>
      <span>⚔️ Урон</span><b>${st.atk}${dmgNote}</b>
      <span>🎯 Дальность</span><b>${range}</b>
      <span>⏱️ Темп атаки</span><b>${u.atkCooldown.toFixed(2).replace(/0$/, '').replace('.', ',')} с</b>
      <span>👣 Скорость</span><b>${speedWord(u.speed)}</b>
      <span>🏰 Урон по замку</span><b>×${String(u.castleMult || 1).replace('.', ',')}</b>
      <span>🪙 Цена</span><b>${st.cost}</b>
    </div>
    <ul class="tt-notes">${(u.notes || []).map(n => `<li>${n}</li>`).join('')}</ul>
    <div class="tt-key">Клавиша ${u.key}</div>`;
}

function castleTooltipHTML() {
  const lvl = gameState ? gameState.playerCastleLevel : 0;
  const rows = CASTLE_UPGRADES.map((up, i) => {
    const place = up.slot <= 4 ? 'на стене' : (up.kind === 'commander' ? 'во дворе, вдохновляет армию' : 'во дворе');
    const done = i < lvl;
    const next = i === lvl;
    return `<li class="${done ? 'tt-done' : next ? 'tt-next' : ''}">${done ? '✔' : next ? '➜' : '•'} <b>${up.cost}</b> 🪙 — ${up.name} ${place}</li>`;
  }).join('');
  return `
    <div class="tt-title">Улучшение замка (${lvl} / ${CASTLE_UPGRADES.length})</div>
    <div class="tt-role">Усиливает гарнизон и добавляет здоровье</div>
    <ul class="tt-notes tt-ladder">${rows}</ul>
    <ul class="tt-notes"><li>Каждое улучшение: +${CASTLE_UPGRADE_HP} здоровья замка</li><li>Гарнизон использует ваши улучшения юнитов</li></ul>
    <div class="tt-key">Клавиша ${CASTLE_KEY}</div>`;
}

function cardsTooltipHTML() {
  const cost = gameState ? gameState.paidUpgradeCost : 100;
  return `
    <div class="tt-title">3 карты улучшений</div>
    <div class="tt-role">Дополнительный выбор прямо сейчас</div>
    <ul class="tt-notes">
      <li>Выберите одну из трёх случайных карт</li>
      <li>Следующая покупка: <b>${cost}</b> 🪙, каждая следующая дороже на 100</li>
      <li>Не мешает обычным картам каждые 20 секунд</li>
    </ul>
    <div class="tt-key">Клавиша ${BONUS_KEY}</div>`;
}

function tooltipHTMLFor(tip) {
  if (tip === 'castle') return castleTooltipHTML();
  if (tip === 'cards') return cardsTooltipHTML();
  const u = UNIT_TYPES.find(t => `unit:${t.id}` === tip);
  return u ? unitTooltipHTML(u) : '';
}

function positionTooltip() {
  if (!tooltipAnchor || !unitTooltip) return;
  const r = tooltipAnchor.getBoundingClientRect();
  const tw = unitTooltip.offsetWidth, th = unitTooltip.offsetHeight;
  const left = Math.max(6, Math.min(window.innerWidth - tw - 6, r.left + r.width / 2 - tw / 2));
  const top = Math.max(6, r.top - th - 10);
  unitTooltip.style.left = `${left}px`;
  unitTooltip.style.top = `${top}px`;
}

function showCardTooltip(card) {
  tooltipTip = card.dataset.tip;
  tooltipAnchor = card;
  unitTooltip.innerHTML = tooltipHTMLFor(tooltipTip);
  unitTooltip.classList.remove('hidden');
  positionTooltip();
}

function hideCardTooltip() {
  tooltipTip = null;
  tooltipAnchor = null;
  unitTooltip.classList.add('hidden');
}

function bindCardTooltips() {
  const canHover = !!(window.matchMedia && window.matchMedia('(hover: hover)').matches);
  unitBarContainer.querySelectorAll('.unit-card').forEach(card => {
    if (canHover) {
      card.addEventListener('mouseenter', () => showCardTooltip(card));
      card.addEventListener('mouseleave', hideCardTooltip);
    }
    // touch screens have no hover: a long press shows the tooltip instead of buying
    let pressTimer = null;
    card.addEventListener('touchstart', () => {
      pressTimer = setTimeout(() => { card._longPress = true; showCardTooltip(card); }, 450);
    }, { passive: true });
    const endPress = () => { clearTimeout(pressTimer); };
    card.addEventListener('touchend', e => {
      endPress();
      if (card._longPress) { e.preventDefault(); setTimeout(() => { card._longPress = false; }, 50); setTimeout(hideCardTooltip, 2500); }
    });
    card.addEventListener('touchmove', endPress, { passive: true });
    card.addEventListener('click', e => { if (card._longPress) e.stopImmediatePropagation(); }, true);
  });
}

function buyExtraUpgradeCards() {
  if (!gameState || gameState.gameOver || gameState.paused || gameState.modalOpen) return;
  if (gameState.gold < gameState.paidUpgradeCost) return;

  gameState.gold -= gameState.paidUpgradeCost;
  gameState.paidUpgradePurchases++;
  gameState.paidUpgradeCost = (gameState.paidUpgradePurchases + 1) * 100;

  gameState.pendingUpgrades++;
  openUpgradeModal(false);
  updateHUD();
}

function buyCastleUpgrade() {
  if (!gameState || gameState.gameOver || gameState.paused || gameState.modalOpen) return;
  const level = gameState.playerCastleLevel;
  if (level >= CASTLE_UPGRADES.length) return;
  const up = CASTLE_UPGRADES[level];
  if (gameState.gold < up.cost) return;
  gameState.gold -= up.cost;
  applyCastleUpgrade('player');
  updateHUD();
}

function updateHUD() {
  if (!gameState) return;

  const pPct = Math.max(0, Math.min(100, (gameState.playerCastleHp / gameState.playerCastleMaxHp) * 100));
  document.getElementById('playerHpBar').style.width = `${pPct}%`;
  document.getElementById('playerHpText').textContent =
    `ЗАМОК ИГРОКА • ${Math.ceil(gameState.playerCastleHp)} / ${Math.round(gameState.playerCastleMaxHp)} HP`;

  const ePct = Math.max(0, Math.min(100, (gameState.enemyCastleHp / gameState.enemyCastleMaxHp) * 100));
  document.getElementById('enemyHpBar').style.width = `${ePct}%`;
  document.getElementById('enemyHpText').textContent =
    `ЗАМОК ВРАГА • ${Math.ceil(gameState.enemyCastleHp)} / ${Math.round(gameState.enemyCastleMaxHp)} HP`;

  document.getElementById('goldAmountText').textContent = Math.floor(gameState.gold);
  const perSec = Math.round(gameState.goldPerTick / GOLD_TICK_INTERVAL);
  document.getElementById('goldRateText').textContent = `(+${perSec}/сек)`;

  const remainingSec = Math.max(0, Math.ceil(UPGRADE_INTERVAL - gameState.upgradeTimer));
  document.getElementById('upgradeCountdownText').textContent = `${remainingSec} сек`;
  const remainingPct = Math.max(0, Math.min(100, ((UPGRADE_INTERVAL - gameState.upgradeTimer) / UPGRADE_INTERVAL) * 100));
  document.getElementById('upgradeTimerBar').style.width = `${remainingPct}%`;

  const playing = !gameState.gameOver && !gameState.modalOpen;
  UNIT_TYPES.forEach(u => {
    const stats = getTeamUnitStats('player', u);
    const canAfford = gameState.gold >= stats.cost && playing;
    const card = document.getElementById(`unit-card-${u.id}`);
    const priceBtn = document.getElementById(`unit-price-btn-${u.id}`);
    const costEl = document.getElementById(`unit-cost-${u.id}`);
    if (card) card.className = `unit-card ${canAfford ? 'affordable' : 'locked'}`;
    if (priceBtn) priceBtn.className = `${canAfford ? 'price-btn-affordable' : 'price-btn-locked'} price-btn`;
    if (costEl) costEl.textContent = stats.cost;
  });

  const canAffordUpgrade = gameState.gold >= gameState.paidUpgradeCost && playing;
  const buyCardEl = document.getElementById('unit-card-buy-upgrade');
  const buyBtnEl = document.getElementById('buy-upgrade-price-btn');
  const buyCostEl = document.getElementById('buy-upgrade-cost');
  if (buyCardEl) buyCardEl.className = `unit-card ${canAffordUpgrade ? 'affordable-bonus' : 'locked'}`;
  if (buyBtnEl) buyBtnEl.className = `${canAffordUpgrade ? 'price-btn-bonus' : 'price-btn-locked'} price-btn`;
  if (buyCostEl) buyCostEl.textContent = gameState.paidUpgradeCost;

  // castle upgrade: next price, or MAX once the ladder is complete
  const level = gameState.playerCastleLevel;
  const maxed = level >= CASTLE_UPGRADES.length;
  const castleCost = maxed ? 0 : CASTLE_UPGRADES[level].cost;
  const canAffordCastle = !maxed && gameState.gold >= castleCost && playing;
  const castleCardEl = document.getElementById('unit-card-castle');
  const castleBtnEl = document.getElementById('castle-price-btn');
  const castleCostEl = document.getElementById('castle-cost');
  if (castleCardEl) castleCardEl.className = `unit-card ${canAffordCastle ? 'affordable-castle' : 'locked'}`;
  if (castleBtnEl) castleBtnEl.className = `${canAffordCastle ? 'price-btn-castle' : 'price-btn-locked'} price-btn`;
  if (castleCostEl) castleCostEl.textContent = maxed ? 'МАКС' : castleCost;

  // keep an open tooltip in sync (prices and stats change with upgrades)
  if (tooltipTip && !unitTooltip.classList.contains('hidden')) {
    unitTooltip.innerHTML = tooltipHTMLFor(tooltipTip);
    positionTooltip();
  }
}

function openUpgradeModal(triggerEnemyUpgrade = true) {
  if (gameState.gameOver) return;
  gameState.modalOpen = true;
  if (!gameState.currentCards || gameState.currentCards.length === 0) {
    gameState.currentCards = generateThreeUpgradeCards('player');
  }

  const noticeEl = document.getElementById('enemyUpgradeNotice');
  if (triggerEnemyUpgrade) {
    const aiChosen = applyRandomUpgradeForEnemy();
    if (noticeEl && aiChosen) {
      noticeEl.classList.remove('hidden');
      noticeEl.innerHTML = `<span>🔵 Противник выбрал карту: <strong class="text-amber-300">${aiChosen.aiSummary}</strong></span>`;
    }
  } else if (noticeEl) {
    noticeEl.classList.remove('hidden');
    noticeEl.innerHTML = `<span>👑 Внеочередной выбор из 3 карт за золото! (Следующая покупка: ${gameState.paidUpgradeCost} 🪙)</span>`;
  }

  SoundFX.play('cardPopup');

  upgradeCardsContainer.innerHTML = '';
  gameState.currentCards.forEach((card, idx) => {
    const el = document.createElement('div');
    el.className = `upgrade-card up-${card.theme || 'green'}`;
    el.innerHTML = `
      <div class="up-head">
        <div class="text-white font-black text-[11px] sm:text-sm tracking-wide text-outline-sm uppercase leading-tight">${card.subject}</div>
      </div>
      <div class="up-art">${card.iconSVG}</div>
      <div class="up-value text-3xl sm:text-4xl text-outline">${card.bigValue}</div>
      <div class="up-foot">
        <div class="text-white text-[11px] sm:text-xs font-bold text-outline-sm">${card.subtitle}</div>
        <div class="up-btn">🖱️ Выбрать</div>
      </div>
    `;
    el.addEventListener('click', () => selectUpgradeCard(idx));
    upgradeCardsContainer.appendChild(el);
  });

  upgradeModal.classList.remove('hidden');
  updateHUD();
}

function selectUpgradeCard(index) {
  if (!gameState.modalOpen || !gameState.currentCards[index]) return;
  const chosen = gameState.currentCards[index];
  chosen.applyToTeam('player');
  SoundFX.play('upgrade');

  const buffsRow = document.getElementById('playerBuffsRow');
  if (buffsRow && chosen.shortTag) {
    const badge = document.createElement('span');
    badge.className = 'buff-chip buff-player';
    badge.textContent = chosen.shortTag;
    buffsRow.appendChild(badge);
  }

  gameState.pendingUpgrades = Math.max(0, gameState.pendingUpgrades - 1);
  gameState.appliedUpgradesCount++;
  gameState.stats.upgradesPicked++;
  gameState.currentCards = [];

  if (gameState.pendingUpgrades > 0) {
    gameState.currentCards = generateThreeUpgradeCards('player');
    openUpgradeModal(false);
  } else {
    gameState.modalOpen = false;
    upgradeModal.classList.add('hidden');
  }
  updateHUD();
}
