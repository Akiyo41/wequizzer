// Fin de partie et retour à la salle d'attente
const { computeTitles, heartsOn, isTeamMode, rankedPlayers, resetPlayerStats, teamBoard, teamInfo } = require('./rules');
const { allPeople, games, toHost, toPlayer } = require('./send');
const { clearTimer } = require('./timer');
const { lobbyPayload, queuedPayload, sendHostPlayers } = require('./room');

// Pour chaque question notée (dans l'ordre) : true, false, ou null si le joueur n'y a pas joué
function answerRow(g, p) {
  return Object.keys(g.qstats || {}).map(Number).sort((a, b) => a - b).map((k) => (p.hist && k in p.hist ? p.hist[k] : null));
}
function endPayloadFor(g, p, ranked, titles, tboard) {
  const myTitle = titles.find((t) => t.pid === p.pid) || null;
  return {
    score: p.score,
    correct: p.correct,
    scoreMode: g.scoreMode,
    hasDouble: g.questions.some((q) => q.double),
    questions: g.scored,
    rank: ranked.findIndex((x) => x.pid === p.pid) + 1,
    total: ranked.length,
    avatar: p.avatar,
    name: p.name,
    title: myTitle ? { title: myTitle.title, icon: myTitle.icon } : null,
    mode: g.settings.mode,
    heartsMode: heartsOn(g),
    alive: !p.eliminated,
    hearts: heartsOn(g) ? p.hearts : null,
    mistakes: g.settings.reviewErrors ? p.mistakes : null,
    team: p.team,
    ...teamInfo(g, p.team),
    teamRank: tboard && p.team !== null ? tboard.findIndex((t) => t.team === p.team) + 1 : null,
    teamCount: tboard ? tboard.length : 0,
    quizTitle: g.quiz ? g.quiz.title : '',
    answers: answerRow(g, p),
  };
}

function endGame(pin) {
  const g = games[pin];
  clearTimer(g);
  g.state = 'end';
  const ranked = rankedPlayers(g);
  const titles = computeTitles(g, ranked);
  const tboard = isTeamMode(g) ? teamBoard(g) : null;
  g.endData = {
    board: ranked.slice(0, 10).map((p) => ({
      pid: p.pid, name: p.name, avatar: p.avatar, score: p.score, correct: p.correct, team: p.team, alive: !p.eliminated, hearts: heartsOn(g) ? p.hearts : null,
    })),
    total: ranked.length,
    // tous les joueurs (le podium n'en montre que 10) : pour le tableur des résultats
    results: ranked.map((p, i) => ({
      answers: answerRow(g, p),
      rank: i + 1, name: p.name, team: p.team === null || p.team === undefined ? null : teamInfo(g, p.team).teamName, score: p.score, correct: p.correct, alive: !p.eliminated, hearts: heartsOn(g) ? p.hearts : null,
    })),
    scoreMode: g.scoreMode,
    hasDouble: g.questions.some((q) => q.double),
    questions: g.scored,
    mode: g.settings.mode,
    heartsMode: heartsOn(g),
    missedCount: Object.keys(g.missed || {}).length,
    qstats: Object.keys(g.qstats || {}).map(Number).sort((a, b) => a - b).map((i) => {
      const q = g.questions[i];
      return { label: (q.wheel ? q.category + ' : ' + q.text : q.match ? q.category + ' : ' + q.left.join(', ') : q.text).slice(0, 120), ok: g.qstats[i].ok, total: g.qstats[i].total };
    }),
    titles,
    teams: tboard,
    quizTitle: g.quiz ? g.quiz.title : '',
  };
  g.endCtx = { ranked, titles, tboard };
  toHost(g, 'end', g.endData);
  Object.values(g.players).forEach((p) => toPlayer(p, 'end', endPayloadFor(g, p, ranked, titles, tboard)));
  Object.values(g.queue).forEach((p) => toPlayer(p, 'queued', queuedPayload(g)));
}

// Retour à la salle d'attente : les joueurs restent connectés, les scores repartent à zéro
function resetGame(pin) {
  const g = games[pin];
  clearTimer(g);
  g.paused = false;
  g.pauseReason = null;
  g.state = 'lobby';
  g.index = 0;
  g.questions = [];
  g.endData = null;
  // La file d'attente rejoint la salle
  Object.values(g.queue).forEach((p) => {
    p.queued = false;
    g.players[p.pid] = p;
  });
  g.queue = {};
  Object.values(g.players).forEach((p) => resetPlayerStats(p));
  allPeople(g).forEach((p) => toPlayer(p, 'lobby', lobbyPayload(g, p)));
  toHost(g, 'lobby', {});
  sendHostPlayers(g);
}

module.exports = { endGame, endPayloadFor, resetGame };
