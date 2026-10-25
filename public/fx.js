// Sons (WebAudio, aucun fichier) et confettis
const FX = (() => {
  let ctx = null;
  let on = true;
  let vol = 0.7;

  function ac() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; }
    }
    return ctx;
  }

  function tone(freq, dur = 0.12, type = 'sine', delay = 0, v = 0.15) {
    if (!on) return;
    const c = ac();
    if (!c) return;
    if (c.state === 'suspended') c.resume();
    const o = c.createOscillator();
    const g = c.createGain();
    const t0 = c.currentTime + delay;
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(Math.max(0.0002, vol * v * 1.4), t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.03);
  }

  function confetti(n = 70) {
    const colors = ['#ff3d71', '#00b8ff', '#ffd23f', '#2ee59d', '#ff9f1c', '#ffffff'];
    for (let i = 0; i < n; i++) {
      const d = document.createElement('div');
      d.className = 'confetti';
      d.style.left = Math.random() * 100 + 'vw';
      d.style.background = colors[i % colors.length];
      d.style.animationDuration = 2.5 + Math.random() * 2.5 + 's';
      d.style.animationDelay = Math.random() * 1.2 + 's';
      d.style.transform = 'rotate(' + Math.random() * 360 + 'deg)';
      document.body.appendChild(d);
      setTimeout(() => d.remove(), 7000);
    }
  }

  return {
    setOn(v) { on = !!v; },
    setVol(v) { vol = Math.max(0, Math.min(100, Number(v))) / 100; },
    // garde l'écran allumé (téléphone)
    keepAwake() {
      let lock = null;
      const get = async () => {
        try { if ('wakeLock' in navigator && document.visibilityState === 'visible' && !lock) { lock = await navigator.wakeLock.request('screen'); lock.addEventListener('release', () => { lock = null; }); } } catch (e) { lock = null; }
      };
      get();
      document.addEventListener('visibilitychange', get);
      document.addEventListener('click', get);
      document.addEventListener('touchstart', get, { passive: true });
    },
    unlock() { const c = ac(); if (c && c.state === 'suspended') c.resume(); },
    click() { tone(660, 0.05, 'square', 0, 0.07); },
    tick() { tone(880, 0.06, 'square', 0, 0.08); },
    count() { tone(520, 0.16, 'triangle'); },
    go() { tone(784, 0.1, 'triangle'); tone(1047, 0.22, 'triangle', 0.1); },
    good() { [523, 659, 784].forEach((f, i) => tone(f, 0.16, 'triangle', i * 0.09)); },
    bad() { tone(220, 0.25, 'sawtooth', 0, 0.1); tone(165, 0.3, 'sawtooth', 0.15, 0.1); },
    fanfare() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.2, 'triangle', i * 0.12)); },
    confetti,
  };
})();
