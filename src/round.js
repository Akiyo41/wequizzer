// Une question : compte à rebours, lecture, réponses, correction, question suivante
const { COUNTDOWN, HANG_MAX } = require('./config');
const { correctText, isCorrect, mistakeEntry, shownAnswer } = require('./answers');
const { activePlayers, heartsOn, teamBoard } = require('./rules');
const { allPeople, games, toAll, toHost, toPlayer } = require('./send');
const { clearTimer, qTime, schedule } = require('./timer');
const { queuedPayload } = require('./room');
const { endGame } = require('./end');

function beginRound(pin) {
  const g = games[pin];
  g.state = 'countdown';
  toAll(g, 'countdown', { seconds: COUNTDOWN, index: g.index, total: g.questions.length });
  schedule(g, COUNTDOWN * 1000 + 300, () => (g.settings.readDelay ? startReading(pin) : startQuestion(pin)));
}

function readingPayload(g, p) {
  const q = g.questions[g.index];
  const base = { index: g.index, total: g.questions.length, seconds: g.settings.readSeconds, double: !!q.double, type: q.type };
  if (p && g.settings.display === 'host') return { ...base, hidden: true };
  return { ...base, text: q.text, image: q.image || null };
}

function startReading(pin) {
  const g = games[pin];
  if (!g) return;
  g.state = 'reading';
  toHost(g, 'reading', readingPayload(g, null));
  allPeople(g).forEach((p) => toPlayer(p, 'reading', readingPayload(g, p)));
  schedule(g, g.settings.readSeconds * 1000, () => startQuestion(pin));
}

function questionPayload(g, p, left) {
  const q = g.questions[g.index];
  const time = qTime(g);
  const base = {
    index: g.index,
    total: g.questions.length,
    type: q.type,
    double: !!q.double,
    time,
    left: time ? (left === undefined ? time : left) : null,
    labels: g.settings.labels,
    changeAnswer: g.settings.changeAnswer,
    wheel: !!q.wheel,
    match: !!q.match,
    order: q.type === 'order',
    matchLeft: q.match ? q.left : null, // éléments à relier (`left` est le temps restant)
    category: q.wheel || q.match ? q.category : null,
    letters: !!q.letters,
    tiles: q.letters ? q.tiles : null,
    slots: q.letters ? q.slots : null,
    maxHearts: heartsOn(g) ? g.settings.lives : null,
    hangMax: g.settings.mode === 'hangman' ? HANG_MAX : null,
  };
  if (!p) return { ...base, text: q.text, image: q.image || null, choices: q.choices };
  const out =
    g.settings.display === 'host' && !q.wheel && !q.letters && !q.match && q.type !== 'order'
      ? { ...base, hidden: true, count: q.choices.length }
      : { ...base, text: q.text, image: q.image || null, choices: q.choices };
  out.eliminated = !!p.eliminated;
  out.hearts = p.hearts;
  out.hangErrors = g.settings.mode === 'hangman' && p.team !== null ? g.hang[p.team] : null;
  out.answered = !!p.answered;
  out.mine = p.answered ? p.answer : null;
  return out;
}

function progressPayload(g) {
  const act = activePlayers(g);
  return {
    answered: act.filter((p) => p.answered).length,
    total: act.length,
    pending: act.filter((p) => !p.answered).map((p) => ({ pid: p.pid, name: p.name, avatar: p.avatar, offline: !p.sid })),
  };
}

function startQuestion(pin) {
  const g = games[pin];
  if (!g) return;
  const q = g.questions[g.index];
  const time = qTime(g);
  g.state = 'question';
  g.startedAt = Date.now();
  Object.values(g.players).forEach((p) => {
    p.answered = false;
    p.answer = null;
    p.answeredAt = 0;
    p.lastPoints = 0;
    p.lastCorrect = false;
    p.activeNow = !p.eliminated;
  });
  toHost(g, 'question', questionPayload(g, null));
  Object.values(g.players).forEach((p) => toPlayer(p, 'question', questionPayload(g, p)));
  Object.values(g.queue).forEach((p) => toPlayer(p, 'queued', queuedPayload(g)));
  toHost(g, 'progress', progressPayload(g));
  if (time) schedule(g, time * 1000, () => endQuestion(pin));
  else clearTimer(g);
  void q;
}

function allAnswered(g) {
  const act = activePlayers(g).filter((p) => p.sid);
  return act.length > 0 && act.every((p) => p.answered);
}

function maybeEndEarly(pin) {
  const g = games[pin];
  if (!g || g.state !== 'question' || g.paused) return;
  if (g.settings.changeAnswer) return; // l'animateur termine lui-même, ou le temps s'écoule
  if (allAnswered(g)) endQuestion(pin);
}

function endQuestion(pin) {
  const g = games[pin];
  if (!g || g.state !== 'question') return;
  clearTimer(g);
  g.paused = false;
  g.state = 'results';
  const q = g.questions[g.index];
  const time = qTime(g);
  const pollQ = q.type === 'poll';
  const participants = Object.values(g.players).filter((p) => p.activeNow);

  // Notation
  const mult = q.double ? 2 : 1;
  participants.forEach((p) => {
    const ok = !pollQ && isCorrect(q, p.answer);
    p.lastCorrect = ok;
    if (ok) {
      const base = g.scoreMode === 'points' && time ? Math.round(500 + 500 * Math.max(0, 1 - p.answeredAt / time)) : 1;
      p.lastPoints = base * mult;
      p.score += p.lastPoints;
      p.streak += 1;
      p.bestStreak = Math.max(p.bestStreak, p.streak);
      p.correct += 1;
      p.timeSum += p.answeredAt;
    } else if (!pollQ) {
      p.streak = 0;
      p.mistakes.push(mistakeEntry(q, p.answer));
      g.missed[g.index] = (g.missed[g.index] || 0) + 1;
    }
  });
  if (!pollQ) {
    g.scored += 1;
    g.qstats[g.index] = { ok: participants.filter((p) => p.lastCorrect).length, total: participants.length };
  }

  // Élimination
  let outNow = [];
  const hearts = heartsOn(g);
  if (g.settings.mode === 'elimination' && !pollQ) {
    outNow = participants.filter((p) => !p.lastCorrect);
    if (outNow.length === participants.length) outNow = []; // tout le monde se trompe : personne n'est éliminé
  } else if (hearts && !pollQ) {
    // Cœurs : chaque mauvaise réponse (ou absence de réponse) fait perdre un cœur
    const wrong = participants.filter((p) => !p.lastCorrect);
    const wouldOut = wrong.filter((p) => p.hearts <= 1);
    const safe = wouldOut.length === participants.length; // tout le monde tomberait à zéro : personne ne sort
    wrong.forEach((p) => {
      p.hearts = safe ? Math.max(1, p.hearts - 1 || 1) : p.hearts - 1;
      p.lostHeart = true;
    });
    outNow = safe ? [] : wouldOut;
  }
  const hangman = g.settings.mode === 'hangman';
  if (hangman && !pollQ) {
    // Pendu : chaque mauvaise réponse (ou absence) ajoute une partie au pendu de l'équipe
    const aliveBefore = [];
    g.teams.forEach((t) => { if (g.hang[t] < HANG_MAX) aliveBefore.push(t); });
    participants.filter((p) => !p.lastCorrect && p.team !== null).forEach((p) => {
      g.hang[p.team] = Math.min(HANG_MAX, g.hang[p.team] + 1);
    });
    const done = aliveBefore.filter((t) => g.hang[t] >= HANG_MAX);
    if (done.length && done.length === aliveBefore.length) done.forEach((t) => (g.hang[t] = HANG_MAX - 1)); // tout le monde serait pendu : personne
    else
      done.forEach((t) => {
        g.hangOut[t] = g.index;
        Object.values(g.players).filter((p) => p.team === t && !p.eliminated).forEach((p) => outNow.push(p));
      });
  }
  participants.forEach((p) => { if (hearts && p.lastCorrect) p.lostHeart = false; });
  outNow.forEach((p) => {
    p.eliminated = true;
    p.elimRound = g.index;
  });
  const survivors = activePlayers(g).length;
  const teamsAlive = hangman ? g.teams.filter((t) => g.hang[t] < HANG_MAX).length : 0;
  const elimOver = hangman ? g.teams.length >= 2 && teamsAlive <= 1 : (g.settings.mode === 'elimination' || hearts) && g.startPlayers >= 2 && survivors <= 1;
  const last = g.index === g.questions.length - 1 || elimOver;
  g.lastFlag = last;

  // Compteurs par réponse
  let counts = null;
  if (q.type === 'text' || q.type === 'match' || q.type === 'order') counts = [participants.filter((p) => p.lastCorrect).length, participants.filter((p) => p.answered && !p.lastCorrect).length];
  else {
    counts = q.choices.map(() => 0);
    participants.forEach((p) => {
      if (p.answer === null) return;
      if (Array.isArray(p.answer)) p.answer.forEach((i) => counts[i]++);
      else counts[p.answer]++;
    });
  }

  const autoIn = g.settings.autoNext ? g.settings.autoDelay : null;
  g.hostResults = {
    index: g.index,
    type: q.type,
    wheel: !!q.wheel,
    match: !!q.match,
    order: q.type === 'order',
    explain: g.settings.showExplain ? q.explain || '' : '',
    pairs: q.match ? q.pairs : null,
    category: q.wheel || q.match ? q.category : null,
    text: q.text,
    double: !!q.double,
    correctText: correctText(g, q),
    okCount: participants.filter((p) => p.lastCorrect).length,
    partCount: participants.length,
    correct: q.correct,
    choices: q.choices,
    counts,
    players: g.settings.showAnswers
      ? participants.map((p) => ({
          pid: p.pid,
          name: p.name,
          avatar: p.avatar,
          team: p.team,
          status: pollQ ? (p.answered ? 'voted' : 'none') : p.lastCorrect ? 'correct' : p.answered ? 'wrong' : 'none',
          shown: shownAnswer(g, q, p.answer),
          out: !!p.eliminated && p.elimRound === g.index,
          hearts: hearts ? p.hearts : null,
        }))
      : null,
    outNow: outNow.map((p) => p.name),
    survivors: g.settings.mode === 'elimination' || hearts ? survivors : null,
    hang: hangman ? teamBoard(g) : null,
    hangMax: HANG_MAX,
    labels: g.settings.labels,
    last,
    autoIn,
  };
  toHost(g, 'results', g.hostResults);
  Object.values(g.players).forEach((p) => {
    p.lastResult = resultFor(g, q, p);
    toPlayer(p, 'result', p.lastResult);
  });

  if (autoIn) schedule(g, autoIn * 1000, () => advance(pin));
}

function resultFor(g, q, p) {
  return {
    type: q.type,
    wasActive: !!p.activeNow,
    hearts: p.hearts,
    maxHearts: heartsOn(g) ? g.settings.lives : null,
    lostHeart: !!p.lostHeart,
    myCorrect: p.correct,
    myTotal: g.scored,
    explain: g.settings.showExplain ? q.explain || '' : '',
    hangErrors: g.settings.mode === 'hangman' && p.team !== null ? g.hang[p.team] : null,
    hangMax: HANG_MAX,
    correct: p.lastCorrect,
    answered: p.answered,
    streak: p.streak,
    double: !!q.double,
    eliminated: !!p.eliminated,
    outNow: !!p.eliminated && p.elimRound === g.index,
    last: !!g.lastFlag,
  };
}

function advance(pin) {
  const g = games[pin];
  if (!g || g.state !== 'results' || g.paused) return;
  clearTimer(g);
  if (!g.lastFlag && g.index + 1 < g.questions.length) {
    g.index++;
    beginRound(pin);
  } else {
    endGame(pin);
  }
}

module.exports = { readingPayload, questionPayload, progressPayload, beginRound, maybeEndEarly, endQuestion, advance };
