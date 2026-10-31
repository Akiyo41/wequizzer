// Crée une image des résultats à partager (dessinée dans un canvas, rien n'est envoyé sur Internet)
const Share = (() => {
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function fit(ctx, text, maxW) {
    let t = String(text);
    while (ctx.measureText(t).width > maxW && t.length > 1) t = t.slice(0, -2) + '…';
    return t;
  }

  // opts : { quiz, emoji, headline, sub, rows: [{ left, mid, right }], badges: [string] }
  function draw(opts) {
    const rows = (opts.rows || []).slice(0, 7);
    const badges = (opts.badges || []).slice(0, 4);
    const W = 1080;
    const H = 640 + rows.length * 96 + badges.length * 80 + (rows.length ? 40 : 0) + (badges.length ? 40 : 0);
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#081246');
    g.addColorStop(1, '#1d46c4');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // bulles de couleur
    [['#ff3d71', 1000, 40, 260], ['#00b8ff', 60, H - 60, 300]].forEach(([col, x, y, r]) => {
      const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, col + 'aa');
      rg.addColorStop(1, col + '00');
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, W, H);
    });

    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    // logo (image) : dessiné par-dessus si chargé
    if (opts.logoImg) {
      const lh = 110, lw = opts.logoImg.width * lh / opts.logoImg.height;
      ctx.drawImage(opts.logoImg, (W - lw) / 2, 36, lw, lh);
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = '#b3bcf0';
    ctx.font = '700 38px system-ui, sans-serif';
    ctx.fillText(fit(ctx, opts.quiz || '', W - 120), W / 2, 200);

    ctx.font = '150px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(opts.emoji || '🏆', W / 2, 370);
    ctx.fillStyle = '#ffd23f';
    ctx.font = '800 76px system-ui, sans-serif';
    ctx.fillText(fit(ctx, opts.headline || '', W - 100), W / 2, 470);
    if (opts.sub) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 42px system-ui, sans-serif';
      ctx.fillText(fit(ctx, opts.sub, W - 100), W / 2, 535);
    }

    let y = 590;
    rows.forEach((r) => {
      ctx.fillStyle = 'rgba(255,255,255,.12)';
      roundRect(ctx, 70, y, W - 140, 80, 22);
      ctx.fill();
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffd23f';
      ctx.font = '800 38px system-ui, sans-serif';
      ctx.fillText(r.left || '', 100, y + 42);
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 38px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
      ctx.fillText(fit(ctx, r.mid || '', 560), 190, y + 42);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#b3bcf0';
      ctx.fillText(r.right || '', W - 100, y + 42);
      y += 96;
    });
    if (rows.length) y += 24;
    badges.forEach((b) => {
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,210,63,.18)';
      roundRect(ctx, 70, y, W - 140, 68, 34);
      ctx.fill();
      ctx.fillStyle = '#ffd23f';
      ctx.font = '800 34px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
      ctx.fillText(fit(ctx, b, W - 200), W / 2, y + 36);
      y += 80;
    });
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.font = '700 30px system-ui, sans-serif';
    ctx.fillText('Joué avec ' + (typeof BRAND !== 'undefined' ? BRAND.name : 'WeQuizzer'), W / 2, H - 40);
    return c;
  }

  // Partage (téléphone) ou téléchargement (ordinateur)
  function loadImg(src) {
    return new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
  }
  async function share(opts, filename) {
    if (typeof BRAND !== 'undefined') opts = Object.assign({}, opts, { logoImg: await loadImg(BRAND.logo) });
    const canvas = draw(opts);
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
    if (!blob) return false;
    const file = new File([blob], filename || 'wequizzer-resultats.png', { type: 'image/png' });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Résultats WeQuizzer' });
        return true;
      }
    } catch (e) {
      if (e && e.name === 'AbortError') return true;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    return true;
  }

  // Récap à partager : ✅ juste, ❌ ratée, ➖ pas jouée (20 questions au plus, puis « … »)
  function recapLine(answers) {
    const list = answers || [];
    const marks = list.slice(0, 20).map((a) => (a === true ? '✅' : a === false ? '❌' : '➖')).join('');
    return list.length > 20 ? marks + '…' : marks;
  }

  return { draw, share, recapLine };
})();
if (typeof module !== 'undefined') module.exports = { Share };
