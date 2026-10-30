function finishGame(winner) {
  if (gameState.gameOver) return;
  gameState.gameOver = true;
  gameState.winner = winner;
  gameState.modalOpen = false;
  upgradeModal.classList.add('hidden');

  SoundFX.play(winner === 'player' ? 'victory' : 'defeat');

  const modal = document.getElementById('gameOverModal');
  const icon = document.getElementById('gameOverIcon');
  const title = document.getElementById('gameOverTitle');
  const subtitle = document.getElementById('gameOverSubtitle');
  const statsBox = document.getElementById('gameOverStats');
  const mvpBanner = document.getElementById('mvpUnitBanner');
  const tableBody = document.getElementById('unitStatsTableBody');

  if (winner === 'player') {
    icon.textContent = '🏆';
    title.textContent = 'ПОБЕДА!';
    title.className = 'text-2xl sm:text-3xl font-black text-amber-300 text-outline uppercase leading-none';
    subtitle.textContent = 'Вы сокрушили синий замок противника и завоевали долину!';
  } else {
    icon.textContent = '💀';
    title.textContent = 'ПОРАЖЕНИЕ';
    title.className = 'text-2xl sm:text-3xl font-black text-red-400 text-outline uppercase leading-none';
    subtitle.textContent = 'Синяя армия разрушила ваш красный замок. Попробуйте новую стратегию!';
  }

  const mins = Math.floor(gameState.elapsedTime / 60);
  const secs = Math.floor(gameState.elapsedTime % 60);
  statsBox.innerHTML = `
    <div class="bg-black/30 rounded-lg p-1.5">⏱️ Время боя<br><strong class="text-white text-sm">${mins}м ${secs}с</strong></div>
    <div class="bg-black/30 rounded-lg p-1.5">⚔️ Произведено<br><strong class="text-white text-sm">${gameState.stats.unitsSpawned} бойцов</strong></div>
    <div class="bg-black/30 rounded-lg p-1.5">🛡️ Убито врагов<br><strong class="text-white text-sm">${gameState.stats.enemiesDefeated}</strong></div>
    <div class="bg-black/30 rounded-lg p-1.5">🃏 Взято карт<br><strong class="text-white text-sm">${gameState.stats.upgradesPicked} (ИИ: ${gameState.aiUpgradesCount})</strong></div>
  `;

  const rows = Object.values(gameState.unitBattleStats).sort((a, b) => b.damageDealt - a.damageDealt || b.kills - a.kills);
  const topUnit = rows[0];

  if (topUnit && topUnit.damageDealt > 0) {
    mvpBanner.innerHTML = `⭐ <span>Самый эффективный род войск: <strong class="text-yellow-300 uppercase">${topUnit.name}</strong> — нанес <strong class="text-white">${topUnit.damageDealt}</strong> урона и уничтожил <strong class="text-white">${topUnit.kills}</strong> врагов!</span>`;
  } else {
    mvpBanner.innerHTML = `⭐ <span>В этом бою ваши войска еще не успели нанести урон</span>`;
  }

  tableBody.innerHTML = '';
  rows.forEach((r, idx) => {
    const isTop = idx === 0 && r.damageDealt > 0;
    const dmgPerUnit = r.spawned > 0 ? Math.round(r.damageDealt / r.spawned) : 0;
    const tr = document.createElement('tr');
    tr.className = isTop ? 'bg-amber-900/40 text-amber-200' : 'hover:bg-white/5';
    tr.innerHTML = `
      <td class="py-1.5 px-2.5 flex items-center gap-1.5">
        <span>${isTop ? '👑' : '•'}</span>
        <span class="font-bold">${r.name}</span>
      </td>
      <td class="py-1.5 px-2 text-center">${r.spawned}</td>
      <td class="py-1.5 px-2 text-right font-extrabold text-amber-300">${r.damageDealt}</td>
      <td class="py-1.5 px-2 text-right font-extrabold text-red-300">${r.kills}</td>
      <td class="py-1.5 px-2.5 text-right text-sky-200">${dmgPerUnit}</td>
    `;
    tableBody.appendChild(tr);
  });

  modal.classList.remove('hidden');
  updateHUD();
}
