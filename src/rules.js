// Règles de jeu : modes, équipes, classement, titres
const { HANG_MAX, TEAMS } = require('./config');
const { shuffle } = require('./utils');

// ---------- Modes et équipes ----------
const isTeamMode = (g) => g.settings.mode === 'teams' || g.settings.mode === 'hangman';
const tName = (g, i) => (g.settings.teamNames && g.settings.teamNames[i]) || TEAMS[i].name;
const teamInfo = (g, t) => (t === null || t === undefined ? {} : { teamName: tName(g, t), teamIcon: TEAMS[t].icon, teamColor: TEAMS[t].color });

// Règles de score : cœurs (pas avec l'élimination) et/ou points selon la vitesse (seulement si le temps est limité) : les deux marchent ensemble
function heartsOn(g) {
  return !!g.settings.hearts && g.settings.mode !== 'elimination' && g.settings.mode !== 'hangman';
}
function bonusOn(g) {
  return !!g.settings.limitTime && !!g.settings.speedBonus;
}

function activePlayers(g) {
  return Object.values(g.players).filter((p) => !p.eliminated);
}

// ---------- Classement de fin de partie ----------
function rankedPlayers(g) {
  const arr = Object.values(g.players);
  if (g.settings.mode === 'hangman') {
    const order = teamBoard(g).map((t) => t.team);
    return arr.sort((a, b) => order.indexOf(a.team) - order.indexOf(b.team) || b.score - a.score || a.timeSum - b.timeSum);
  }
  if (heartsOn(g)) {
    return arr.sort((a, b) => {
      if (a.eliminated !== b.eliminated) return a.eliminated ? 1 : -1;
      if (a.eliminated && a.elimRound !== b.elimRound) return b.elimRound - a.elimRound;
      return (b.hearts || 0) - (a.hearts || 0) || b.score - a.score || a.timeSum - b.timeSum;
    });
  }
  if (g.settings.mode === 'elimination') {
    return arr.sort((a, b) => {
      if (a.eliminated !== b.eliminated) return a.eliminated ? 1 : -1;
      if (a.eliminated && a.elimRound !== b.elimRound) return b.elimRound - a.elimRound;
      return b.score - a.score || a.timeSum - b.timeSum;
    });
  }
  return arr.sort((a, b) => b.score - a.score || a.timeSum - b.timeSum);
}

function computeTitles(g, ranked) {
  const titles = [];
  const given = new Set();
  const n = ranked.length;
  const give = (title, icon, cand) => {
    const p = cand.find((x) => !given.has(x.pid));
    if (!p) return;
    given.add(p.pid);
    titles.push({ title, icon, pid: p.pid, name: p.name, avatar: p.avatar });
  };
  if (g.settings.mode === 'elimination' || heartsOn(g)) {
    give('Inarrêtable', 'ti-shield-check', ranked.filter((p) => !p.eliminated));
  }
  if (n >= 2) {
    if (g.scored >= 3) give('Sans-faute', 'ti-target', ranked.filter((p) => p.correct === g.scored));
    const withCorrect = ranked.filter((p) => p.correct > 0);
    const byAvg = withCorrect.slice().sort((a, b) => a.timeSum / a.correct - b.timeSum / b.correct);
    give('Vitesse éclair', 'ti-bolt', byAvg);
    give('La meilleure série', 'ti-flame', ranked.filter((p) => p.bestStreak >= 3).sort((a, b) => b.bestStreak - a.bestStreak));
    give('Tête pensante', 'ti-bulb', byAvg.slice().reverse());
    if (g.settings.reactions) give('Réactions en folie', 'ti-mood-happy', ranked.filter((p) => p.reactions >= 3).sort((a, b) => b.reactions - a.reactions));
  }
  return titles;
}

function teamBoard(g) {
  const rows = [];
  const hang = g.settings.mode === 'hangman';
  for (const t of g.teams) {
    const members = Object.values(g.players).filter((p) => p.team === t);
    const total = members.reduce((s, p) => s + p.score, 0);
    rows.push({
      team: t,
      name: tName(g, t),
      icon: TEAMS[t].icon,
      color: TEAMS[t].color,
      members: members.length,
      score: members.length ? Math.round(total / members.length) : 0,
      errors: hang ? g.hang[t] : null,
      out: hang ? g.hang[t] >= HANG_MAX : false,
      outRound: hang ? g.hangOut[t] : null,
    });
  }
  if (hang) {
    return rows.sort((a, b) => {
      if (a.out !== b.out) return a.out ? 1 : -1;
      if (a.out && a.outRound !== b.outRound) return b.outRound - a.outRound;
      return a.errors - b.errors || b.score - a.score;
    });
  }
  return rows.sort((a, b) => b.score - a.score);
}

function resetPlayerStats(p) {
  p.score = 0;
  p.streak = 0;
  p.bestStreak = 0;
  p.correct = 0;
  p.timeSum = 0;
  p.reactions = 0;
  p.answered = false;
  p.answer = null;
  p.answeredAt = 0;
  p.lastPoints = 0;
  p.lastCorrect = false;
  p.eliminated = false;
  p.elimRound = -1;
  p.activeNow = false;
  p.team = null;
  p.lastResult = null;
  p.hearts = null;
  p.lostHeart = false;
  p.mistakes = [];
}

function assignTeams(g) {
  const all = Object.values(g.players);
  g.teamCount = Math.max(1, Math.min(g.settings.teamCount, all.length));
  g.hang = Array.from({ length: 4 }, () => 0);
  g.hangOut = Array.from({ length: 4 }, () => -1);
  if (g.settings.teamAssign === 'manual') {
    // L'animateur a choisi : les joueurs sans équipe rejoignent la plus petite
    g.teamCount = g.settings.teamCount;
    const size = Array.from({ length: g.teamCount }, () => 0);
    all.forEach((p) => {
      const t = g.teamOf && g.teamOf[p.pid];
      if (Number.isInteger(t) && t >= 0 && t < g.teamCount) { p.team = t; size[t]++; } else p.team = null;
    });
    shuffle(all.filter((p) => p.team === null)).forEach((p) => {
      const t = size.indexOf(Math.min(...size));
      p.team = t;
      size[t]++;
    });
  } else {
    shuffle(all).forEach((p, i) => {
      p.team = i % g.teamCount;
    });
  }
  // Équipes en jeu : seulement celles qui ont au moins un joueur
  g.teams = [...new Set(all.map((p) => p.team))].sort((a, b) => a - b);
}

module.exports = { isTeamMode, teamInfo, heartsOn, activePlayers, rankedPlayers, computeTitles, teamBoard, resetPlayerStats, bonusOn, assignTeams };
