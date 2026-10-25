// Dessin du pendu (SVG). Une partie par erreur : tête, corps, bras gauche, bras droit, jambe gauche, jambe droite.
window.Hangman = (function () {
  const PARTS = [
    '<circle cx="62" cy="34" r="9"/>',
    '<line x1="62" y1="43" x2="62" y2="72"/>',
    '<line x1="62" y1="50" x2="48" y2="63"/>',
    '<line x1="62" y1="50" x2="76" y2="63"/>',
    '<line x1="62" y1="72" x2="50" y2="92"/>',
    '<line x1="62" y1="72" x2="74" y2="92"/>',
  ];
  function svg(errors, color, size) {
    const n = Math.max(0, Math.min(PARTS.length, errors || 0));
    const dead = n >= PARTS.length;
    return (
      '<svg viewBox="0 0 100 110" width="' + (size || 90) + '" height="' + (size || 90) * 1.1 + '" aria-label="Pendu : ' + n + ' erreur(s) sur ' + PARTS.length + '">' +
      '<g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="4">' +
      '<g stroke="#8a6d4b"><line x1="10" y1="102" x2="90" y2="102"/><line x1="28" y1="102" x2="28" y2="10"/><line x1="26" y1="12" x2="62" y2="12"/><line x1="28" y1="28" x2="42" y2="12"/></g>' +
      '<line x1="62" y1="12" x2="62" y2="25" stroke="#8a6d4b" stroke-width="3"/>' +
      '<g stroke="' + (dead ? '#d62839' : color || '#14213d') + '">' + PARTS.slice(0, n).join('') + '</g>' +
      (dead ? '<g stroke="#d62839" stroke-width="2"><line x1="58" y1="31" x2="61" y2="34"/><line x1="61" y1="31" x2="58" y2="34"/><line x1="63" y1="31" x2="66" y2="34"/><line x1="66" y1="31" x2="63" y2="34"/></g>' : '') +
      '</g></svg>'
    );
  }
  return { svg: svg, max: PARTS.length };
})();
