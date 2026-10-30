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
    card.className = 'unit-card affordable rounded-xl p-1.5 sm:p-2 flex flex-col justify-between relative select-none';
    card.addEventListener('click', () => spawnPlayerUnit(u.id));

    const displayTitle = u.shortCardTitle || u.name;
    card.innerHTML = `
      <div class="flex items-center gap-1 mb-0.5">
        <span class="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-black/45 border border-white/25 text-[10px] sm:text-xs font-extrabold text-amber-200 flex items-center justify-center shrink-0">
          ${u.key}
        </span>
        <span class="text-white font-extrabold text-[10px] sm:text-xs md:text-sm text-outline-sm truncate leading-tight" title="${u.name}">
          ${displayTitle}
        </span>
      </div>

      <div class="flex items-center justify-between gap-1 my-0.5 px-0.5">
        <div class="shrink-0 -ml-1">
          ${getUnitCardSVG(u.id)}
        </div>
        <div class="flex flex-col items-end text-right leading-tight">
          <span id="unit-hp-${u.id}" class="text-white font-bold text-[10px] sm:text-xs text-outline-sm">HP: ${formatInt(u.baseHp)}</span>
          <span id="unit-atk-${u.id}" class="text-amber-200 font-bold text-[10px] sm:text-xs text-outline-sm">ATK: ${formatInt(u.baseAtk)}</span>
        </div>
      </div>

      <div id="unit-price-btn-${u.id}" class="price-btn-affordable rounded-lg py-0.5 sm:py-1 px-2 flex items-center justify-center gap-1 mt-0.5">
        <span id="unit-cost-${u.id}" class="text-white font-black text-xs sm:text-sm md:text-base text-outline-sm">${u.baseCost}</span>
        <span class="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-gradient-to-b from-[#fde047] to-[#ca8a04] border border-[#713f12] inline-block"></span>
      </div>
    `;
    unitBarContainer.appendChild(card);
  });

  const bonusCard = document.createElement('div');
  bonusCard.id = 'unit-card-buy-upgrade';
  bonusCard.className = 'unit-card affordable-bonus rounded-xl p-1.5 sm:p-2 flex flex-col justify-between relative select-none';
  bonusCard.addEventListener('click', buyExtraUpgradeCards);
  bonusCard.innerHTML = `
    <div class="flex items-center gap-1 mb-0.5">
      <span class="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-black/45 border border-amber-300/40 text-[10px] sm:text-xs font-extrabold text-amber-300 flex items-center justify-center shrink-0">
        7
      </span>
      <span class="text-amber-200 font-extrabold text-[10px] sm:text-xs md:text-sm text-outline-sm truncate leading-tight" title="Купить 3 карты апгрейдов">
        3 Карты
      </span>
    </div>

    <div class="flex items-center justify-between gap-1 my-0.5 px-0.5">
      <div class="shrink-0 -ml-1">
        ${getUnitCardSVG('buy_cards')}
      </div>
      <div class="flex flex-col items-end text-right leading-tight">
        <span class="text-purple-200 font-bold text-[10px] sm:text-xs text-outline-sm">БОНУС</span>
        <span class="text-amber-300 font-extrabold text-[10px] sm:text-xs text-outline-sm">АПГРЕЙД</span>
      </div>
    </div>

    <div id="buy-upgrade-price-btn" class="price-btn-bonus rounded-lg py-0.5 sm:py-1 px-2 flex items-center justify-center gap-1 mt-0.5">
      <span id="buy-upgrade-cost" class="text-white font-black text-xs sm:text-sm md:text-base text-outline-sm">100</span>
      <span class="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-gradient-to-b from-[#fde047] to-[#ca8a04] border border-[#713f12] inline-block"></span>
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
      card.className = `unit-card ${canAfford ? 'affordable' : 'locked'} rounded-xl p-1.5 sm:p-2 flex flex-col justify-between relative select-none`;
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
    buyCardEl.className = `unit-card ${canAffordUpgrade ? 'affordable-bonus' : 'locked'} rounded-xl p-1.5 sm:p-2 flex flex-col justify-between relative select-none`;
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

  const themeStyles = {
    green: 'from-[#65a30d] via-[#4d7c0f] to-[#1a2e05] border-[#bef264]',
    blue: 'from-[#2563eb] via-[#1d4ed8] to-[#172554] border-[#93c5fd]',
    red: 'from-[#dc2626] via-[#b91c1c] to-[#450a0a] border-[#fca5a5]',
    gold: 'from-[#d97706] via-[#b45309] to-[#451a03] border-[#fde047]',
    purple: 'from-[#9333ea] via-[#6b21a8] to-[#2e1065] border-[#e9d5ff]'
  };

  upgradeCardsContainer.innerHTML = '';
  gameState.currentCards.forEach((card, idx) => {
    const el = document.createElement('div');
    const grad = themeStyles[card.theme] || themeStyles.green;
    el.className = `upgrade-card rounded-2xl bg-gradient-to-b ${grad} border-2 p-3 sm:p-4 flex flex-col items-center justify-between text-center shadow-xl`;
    el.innerHTML = `
      <div class="text-white font-black text-xs sm:text-sm tracking-wide text-outline uppercase">
        ${card.subject}
      </div>

      <div class="my-1.5">
        ${card.iconSVG}
      </div>

      <div class="text-amber-300 font-black text-2xl sm:text-4xl text-outline tracking-tight my-1">
        ${card.bigValue}
      </div>

      <div class="text-white/90 text-[11px] sm:text-xs font-bold mb-2">
        ${card.subtitle}
      </div>

      <div class="w-full py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-[#23140b] font-black text-xs uppercase tracking-wider shadow">
        🖱️ Выбрать
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
    badge.className = 'px-1.5 py-0.5 rounded bg-amber-950/85 border border-amber-500/60 text-amber-200 text-[10px] font-bold shadow';
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
