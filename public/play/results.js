// Résultat après chaque question et écran de fin
// ----- Résultat (jamais de points ni de rang pendant le quiz) -----
// Le même résultat qui revient alors qu'on est encore dessus (coupure du réseau) garde la phrase du Professeur
const sameAgain = (() => { const last = {}; return (screen, data) => { const sig = JSON.stringify(data); const again = curScreen === screen && last[screen] === sig; last[screen] = sig; return again; }; })();
socket.on('result', (r) => {
  const again = sameAgain('result', r);
  clearInterval(timerInt);
  const icon = $('resIcon');
  Brand.setPose($('resMascot'), r.correct ? 'bravo' : (r.type === 'poll' ? 'question' : 'desole'));
  const t = $('resTitle');
  const sub = $('resSub');
  sub.textContent = '';
  if (!r.wasActive) {
    show('spectate');
    return;
  }
  if (r.type === 'poll') {
    icon.textContent = r.answered ? '🗳️' : '⏱️';
    t.textContent = r.answered ? 'Merci pour ton vote !' : 'Pas de vote';
    t.className = 'big-num';
    t.style.fontSize = '2rem';
  } else if (r.correct) {
    icon.textContent = '🎉';
    t.textContent = 'Bravo !';
    t.className = 'big-num good';
    t.style.fontSize = '';
    sub.textContent = r.double ? '⚡ Question bonus réussie !' : '';
    FX.good();
  } else if (!r.answered) {
    icon.textContent = '⏱️';
    t.textContent = 'Pas de réponse';
    t.className = 'big-num bad';
    t.style.fontSize = '';
    FX.bad();
  } else {
    icon.textContent = '😅';
    t.textContent = 'Raté !';
    t.className = 'big-num bad';
    t.style.fontSize = '';
    FX.bad();
  }
  if (r.lostHeart && !r.outNow) sub.textContent = '💔 Tu perds un cœur… il t\'en reste ' + r.hearts + ' !';
  if (r.outNow) {
    sub.textContent = '💀 Tu es hors jeu… mais tu peux encore envoyer des réactions !';
    sub.style.fontSize = '1.2rem';
  } else sub.style.fontSize = '1.5rem';
  const hm = $('resHang');
  hm.classList.toggle('hidden', r.hangErrors === null || r.hangErrors === undefined);
  if (r.hangErrors !== null && r.hangErrors !== undefined) {
    hm.innerHTML = Hangman.svg(r.hangErrors, '#14213d', 110);
    hm.appendChild(el('span', '', r.hangErrors >= r.hangMax ? '💀 Le pendu de ton équipe est complet…' : 'Pendu de ton équipe : ' + r.hangErrors + ' / ' + r.hangMax));
  }
  // Le Professeur parle dans sa bulle (il remplace la mascotte du haut) : l'explication s'il y en a une,
  // sinon une réaction (série à partir de 3 bonnes réponses d'affilée)
  if (r.explain) {
    Brand.say($('resExplain'), r.explain);
    $('resExplain').classList.remove('hidden');
    $('resMascot').classList.add('hidden');
  } else if (!again) {
    const { key, pose } = resultLine(r); // éliminé d'abord, puis sondage / juste / faux / pas de réponse (lines.js)
    profSay('resExplain', 'resMascot', key, pose, { pseudo: me.name, serie: r.streak });
  }
  const stats = $('resStats');
  stats.innerHTML = '';
  if (r.type !== 'poll' && r.myTotal) stats.appendChild(stat('Tes bonnes réponses', r.myCorrect + ' / ' + r.myTotal));
  if (r.streak >= 2) stats.appendChild(stat('Série', '🔥 ' + r.streak));
  $('resNext').textContent = r.last ? 'Les résultats arrivent…' : 'Prochaine question bientôt…';
  show('result');
});

// ----- Fin -----
function scoreLine(d) {
  if (d.scoreMode === 'points') return ['Score final', d.score];
  if (d.hasDouble) return ['Score', d.score];
  return ['Bonnes réponses', d.score + ' / ' + d.questions];
}
socket.on('end', (d) => {
  const again = sameAgain('end', d);
  lastEnd = d;
  clearInterval(timerInt);
  const teamy = d.mode === 'teams' || d.mode === 'hangman';
  const elim = d.mode === 'elimination' || (d.heartsMode && !teamy);
  let medal;
  let head;
  if (teamy && d.teamRank) {
    medal = d.teamRank === 1 ? '🏆' : d.teamRank === 2 ? '🥈' : d.teamRank === 3 ? '🥉' : '🎮';
    head = d.teamRank === 1 ? 'Ton équipe a gagné !' : 'Ton équipe : ' + d.teamRank + 'e sur ' + d.teamCount;
  } else if (elim) {
    medal = d.alive ? '🏆' : '💀';
    head = d.alive ? 'Dernier survivant !' : d.rank + 'e sur ' + d.total;
  } else {
    medal = d.rank === 1 ? '🏆' : d.rank === 2 ? '🥈' : d.rank === 3 ? '🥉' : '🎮';
    head = d.rank === 1 ? 'Tu as gagné !' : d.rank + 'e sur ' + d.total;
  }
  $('endIcon').textContent = medal;
  $('endTitle').textContent = head;
  const stats = $('endStats');
  stats.innerHTML = '';
  const [l, v] = scoreLine(d);
  stats.appendChild(stat(l, v));
  stats.appendChild(stat('Rang', d.rank + ' / ' + d.total));
  if (d.teamName) stats.appendChild(stat('Équipe', d.teamIcon + ' ' + d.teamName));
  const badge = $('endBadge');
  badge.innerHTML = '';
  badge.classList.toggle('hidden', !d.title);
  if (d.title) {
    badge.appendChild(el('i', 'ti ' + d.title.icon));
    badge.appendChild(el('b', '', d.title.title));
  }
  const nm = d.mistakes ? d.mistakes.length : 0;
  $('reviewBtn').classList.toggle('hidden', !nm);
  $('reviewLabel').textContent = 'Revoir mes erreurs (' + nm + ')';
  $('noMistakes').classList.toggle('hidden', !(d.mistakes && nm === 0));
  // Le Professeur félicite : 1er (ou 1re équipe), podium (2e / 3e), ou les autres (lines.js)
  if (!again) profSay('sayEnd', 'endMascot', endLine(d), 'bravo', { pseudo: d.name });
  show('end');
  if ((teamy ? d.teamRank : d.rank) <= 3) { FX.fanfare(); FX.confetti((teamy ? d.teamRank : d.rank) === 1 ? 100 : 50); }
});
$('reviewBtn').onclick = () => {
  const box = $('reviewList');
  box.innerHTML = '';
  ((lastEnd && lastEnd.mistakes) || []).forEach((m) => {
    const card = el('div', 'card');
    card.style.marginBottom = '12px';
    card.appendChild(el('div', 'qtext', m.text));
    const a = el('div', 'note bad', '❌ Ta réponse : ' + m.yours);
    const b = el('div', 'note ok', '✅ Bonne réponse : ' + m.correct);
    card.appendChild(a);
    card.appendChild(b);
    box.appendChild(card);
  });
  show('review');
};
$('reviewBack').onclick = () => show('end');
$('shareBtn').onclick = () => {
  const d = lastEnd;
  if (!d) return;
  const [l, v] = scoreLine(d);
  const badges = [];
  if (d.title) badges.push((TITLE_EMOJI[d.title.title] || '🏅') + ' ' + d.title.title);
  if (d.teamName) badges.push(d.teamIcon + ' Équipe ' + d.teamName);
  Share.share({
    quiz: d.quizTitle,
    emoji: d.avatar,
    headline: d.name,
    sub: d.rank + 'e sur ' + d.total,
    rows: [{ left: '★', mid: l, right: String(v) }, { left: '#', mid: 'Rang', right: d.rank + ' / ' + d.total }],
    badges,
  }, 'mon-resultat-wequizzer.png');
};

// Tous les fichiers de l'écran joueur sont chargés : on peut se connecter
socket.connect();
