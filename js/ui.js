// ============================================================================
// UI RENDERING (6 Unit Cards + 1 Paid Upgrade Card in Bottom Bar)
// ============================================================================
const unitBarContainer = document.getElementById('unitBarContainer');
const upgradeModal = document.getElementById('upgradeModal');
const upgradeCardsContainer = document.getElementById('upgradeCardsContainer');
const btnReadyUpgrade = document.getElementById('btnReadyUpgrade');

function buildBottomUnitCards() {
  unitBarContainer.innerHTML = '';

  UNIT_TYPES.forEach(u => {
    const card = document.createElement('div');
    card.id = `unit-card-${u.id}`;
    card.className = 'unit-card affordable rounded-xl p-1.5 sm:p-2 gap-0.5 flex flex-col justify-between relative select-none';
    card.addEventListener('click', () => spawnPlayerUnit(u.id));

    const displayTitle = u.shortCardTitle || u.name;
    card.innerHTML = `
      <div class="flex items-center gap-1 mb-0.5">
        <span class="card-num">${u.key}</span>
        <span class="hidden sm:block text-white font-black text-[11px] sm:text-sm md:text-base text-outline-sm truncate leading-tight" title="${u.name}">
          ${displayTitle}
        </span>
      </div>

      <div class="flex items-center justify-between gap-1 my-0.5 px-0.5">
        <div class="shrink-0 -ml-1">
          ${getUnitCardSVG(u.id)}
        </div>
        <div class="hidden sm:flex flex-col items-end text-right leading-tight">
          <span id="unit-hp-${u.id}" class="text-white font-extrabold text-[10px] sm:text-xs md:text-sm text-outline-sm">HP: ${formatInt(u.baseHp)}</span>
          <span id="unit-atk-${u.id}" class="text-amber-200 font-extrabold text-[10px] sm:text-xs md:text-sm text-outline-sm">ATK: ${formatInt(u.baseAtk)}</span>
        </div>
      </div>

      <div id="unit-price-btn-${u.id}" class="price-btn-affordable rounded-lg py-0.5 sm:py-1 px-2 flex items-center justify-center gap-1 mt-0.5">
        <span id="unit-cost-${u.id}" class="text-white font-black text-xs sm:text-sm md:text-base text-outline-sm">${u.baseCost}</span>
        <span class="coin coin-sm"></span>
      </div>
    `;
    unitBarContainer.appendChild(card);
  });

  const bonusCard = document.createElement('div');
  bonusCard.id = 'unit-card-buy-upgrade';
  bonusCard.className = 'unit-card affordable-bonus rounded-xl p-1.5 sm:p-2 gap-0.5 flex flex-col justify-between relative select-none';
  bonusCard.addEventListener('click', buyExtraUpgradeCards);
  bonusCard.innerHTML = `
    <div class="flex items-center gap-1 mb-0.5">
      <span class="card-num">7</span>
      <span class="hidden sm:block text-amber-100 font-black text-[11px] sm:text-sm md:text-base text-outline-sm truncate leading-tight" title="Купить 3 карты апгрейдов">
        3 Карты
      </span>
    </div>

    <div class="flex items-center justify-between gap-1 my-0.5 px-0.5">
      <div class="shrink-0 -ml-1">
        ${getUnitCardSVG('buy_cards')}
      </div>
      <div class="hidden sm:flex flex-col items-end text-right leading-tight">
        <span class="text-purple-100 font-extrabold text-[10px] sm:text-xs md:text-sm text-outline-sm">БОНУС</span>
        <span class="text-amber-300 font-black text-[10px] sm:text-xs md:text-sm text-outline-sm">АПГРЕЙД</span>
      </div>
    </div>

    <div id="buy-upgrade-price-btn" class="price-btn-bonus rounded-lg py-0.5 sm:py-1 px-2 flex items-center justify-center gap-1 mt-0.5">
      <span id="buy-upgrade-cost" class="text-white font-black text-xs sm:text-sm md:text-base text-outline-sm">100</span>
      <span class="coin coin-sm"></span>
    </div>
  `;
  unitBarContainer.appendChild(bonusCard);
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

  UNIT_TYPES.forEach(u => {
    const stats = getTeamUnitStats('player', u);
    const canAfford = gameState.gold >= stats.cost && !gameState.gameOver && !gameState.modalOpen;
    const card = document.getElementById(`unit-card-${u.id}`);
    const priceBtn = document.getElementById(`unit-price-btn-${u.id}`);
    const hpEl = document.getElementById(`unit-hp-${u.id}`);
    const atkEl = document.getElementById(`unit-atk-${u.id}`);
    const costEl = document.getElementById(`unit-cost-${u.id}`);

    if (card) {
      card.className = `unit-card ${canAfford ? 'affordable' : 'locked'} rounded-xl p-1.5 sm:p-2 gap-0.5 flex flex-col justify-between relative select-none`;
    }
    if (priceBtn) {
      priceBtn.className = `${canAfford ? 'price-btn-affordable' : 'price-btn-locked'} rounded-lg py-0.5 sm:py-1 px-2 flex items-center justify-center gap-1 mt-0.5`;
    }
    if (hpEl) hpEl.textContent = `HP: ${formatInt(stats.hp)}`;
    if (atkEl) atkEl.textContent = `ATK: ${formatInt(stats.atk)}`;
    if (costEl) costEl.textContent = stats.cost;
  });

  const canAffordUpgrade = gameState.gold >= gameState.paidUpgradeCost && !gameState.gameOver && !gameState.modalOpen;
  const buyCardEl = document.getElementById('unit-card-buy-upgrade');
  const buyBtnEl = document.getElementById('buy-upgrade-price-btn');
  const buyCostEl = document.getElementById('buy-upgrade-cost');
  if (buyCardEl) {
    buyCardEl.className = `unit-card ${canAffordUpgrade ? 'affordable-bonus' : 'locked'} rounded-xl p-1.5 sm:p-2 gap-0.5 flex flex-col justify-between relative select-none`;
  }
  if (buyBtnEl) {
    buyBtnEl.className = `${canAffordUpgrade ? 'price-btn-bonus' : 'price-btn-locked'} rounded-lg py-0.5 sm:py-1 px-2 flex items-center justify-center gap-1 mt-0.5`;
  }
  if (buyCostEl) {
    buyCostEl.textContent = gameState.paidUpgradeCost;
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
