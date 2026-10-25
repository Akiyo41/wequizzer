// Roue de jeu (brouillon, sans décor) : anneau extérieur = questions, anneau intérieur = réponses qu'on fait tourner.
// La réponse choisie est celle qui se trouve en bas, face à la question en cours.
(function () {
  const BOTTOM = 90; // degrés : le bas de l'écran

  function norm(a) {
    a = ((a + 180) % 360 + 360) % 360 - 180;
    return a;
  }

  function createWheel(box) {
    box.classList.add('wheel');
    box.innerHTML = '';
    const center = document.createElement('div');
    center.className = 'w-center';
    const mark = document.createElement('div');
    mark.className = 'w-mark';
    box.appendChild(mark);
    box.appendChild(center);
    let answers = [];
    let questions = [];
    let rot = 0;
    let enabled = true;
    let nodesA = [];
    let nodesQ = [];
    let sel = 0;
    let selCb = null;
    let lastSel = -1;
    let dragging = false;
    let lastAng = 0;

    const size = () => box.clientWidth || 320;
    const step = () => (answers.length ? 360 / answers.length : 360);

    function place(node, ang, radius) {
      const s = size();
      const r = radius * s;
      const x = s / 2 + r * Math.cos((ang * Math.PI) / 180);
      const y = s / 2 + r * Math.sin((ang * Math.PI) / 180);
      node.style.left = x + 'px';
      node.style.top = y + 'px';
    }

    function layout() {
      const n = answers.length;
      let best = 0;
      let bestD = 999;
      answers.forEach((a, i) => {
        const ang = BOTTOM + i * step() + rot;
        place(nodesA[i], ang, 0.32);
        const d = Math.abs(norm(ang - BOTTOM));
        if (d < bestD) { bestD = d; best = i; }
      });
      sel = best;
      nodesA.forEach((nd, i) => nd.classList.toggle('sel', i === sel));
      if (selCb && sel !== lastSel) { lastSel = sel; selCb(answers[sel] ? answers[sel].text : ''); }
      // anneau extérieur : la question en cours en bas, les suivantes tout autour
      const m = questions.length;
      questions.forEach((q, i) => {
        const st = m > 1 ? 360 / m : 360;
        place(nodesQ[i], BOTTOM + i * st, 0.465);
      });
      const fs = Math.max(10, Math.min(n <= 5 ? 16 : 18, Math.round(size() / (10 + n * 0.45))));
      const s = size();
      const maxW = Math.max(46, Math.min((n <= 5 ? 0.30 : 0.24) * s, ((2 * Math.PI * 0.32 * s) / Math.max(n, 1)) * 0.92));
      nodesA.forEach((nd) => { nd.style.fontSize = (nd.textContent.length > 22 ? fs * 0.8 : fs) + 'px'; nd.style.maxWidth = maxW + 'px'; nd.style.width = maxW + 'px'; });
      nodesQ.forEach((nd) => (nd.style.fontSize = Math.max(10, fs) + 'px'));
    }

    function snap() {
      // aligne la réponse la plus proche exactement en bas
      const off = norm(BOTTOM + sel * step() + rot - BOTTOM);
      rot -= off;
      layout();
    }

    function angleOf(e) {
      const r = box.getBoundingClientRect();
      return (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
    }
    let startX = 0;
    let startY = 0;
    let tapNode = null;
    let moved = false;
    box.addEventListener('pointerdown', (e) => {
      if (!enabled) return;
      dragging = true;
      moved = false;
      startX = e.clientX;
      startY = e.clientY;
      tapNode = e.target.closest ? e.target.closest('.w-a') : null;
      lastAng = angleOf(e);
    });
    box.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      if (!moved && Math.hypot(e.clientX - startX, e.clientY - startY) < 8) return;
      if (!moved) { moved = true; try { box.setPointerCapture(e.pointerId); } catch (x) { /* rien */ } lastAng = angleOf(e); return; }
      const a = angleOf(e);
      rot += norm(a - lastAng);
      lastAng = a;
      layout();
    });
    const end = () => {
      if (!dragging) return;
      dragging = false;
      if (!moved && tapNode) {
        // simple touche sur une réponse : elle vient se placer en bas
        const i = nodesA.indexOf(tapNode);
        if (i !== -1) sel = i;
      }
      tapNode = null;
      snap();
    };
    box.addEventListener('pointerup', end);
    box.addEventListener('pointercancel', end);

    window.addEventListener('resize', layout);

    return {
      // data : { category, questions: [texte,…] (la 1re = en cours), answers: [{id, text}] }
      set(data) {
        nodesA.forEach((n) => n.remove());
        nodesQ.forEach((n) => n.remove());
        answers = data.answers.slice();
        questions = data.questions.slice();
        center.textContent = data.category;
        nodesA = answers.map((a) => {
          const d = document.createElement('div');
          d.className = 'w-item w-a';
          d.textContent = a.text;
          box.appendChild(d);
          return d;
        });
        nodesQ = questions.map((q, i) => {
          const d = document.createElement('div');
          d.className = 'w-item w-q' + (i === 0 ? ' cur' : '');
          d.textContent = q;
          box.appendChild(d);
          return d;
        });
        rot = 0;
        sel = 0;
        lastSel = -1;
        layout();
      },
      onSel(fn) { selCb = fn; lastSel = sel; if (fn && answers[sel]) fn(answers[sel].text); },
      index() { return sel; },
      id() { return answers[sel] ? answers[sel].id : null; },
      enable(on) { enabled = !!on; box.classList.toggle('off', !on); },
    };
  }
  window.createWheel = createWheel;
})();
