// Aide (FAQ) : ouverte par le bouton « Aide » ou par un « ? » à côté d'un réglage
let faqBack = 'lobby';
// id : la question à déplier (ex. 'faq-coeurs') ; sans id, la page s'ouvre en haut
function openFaq(id) {
  faqBack = screens.find((s) => !$(s).classList.contains('hidden')) || 'lobby';
  document.querySelectorAll('#faqPage details').forEach((d) => { d.open = d.id === id; });
  show('faqPage');
  const q = id && $(id);
  if (q) q.scrollIntoView({ block: 'center' });
}
$('openFaq').onclick = () => openFaq(null);
document.querySelectorAll('[data-faq]').forEach((b) => {
  b.onclick = (e) => { e.preventDefault(); e.stopPropagation(); openFaq(b.dataset.faq); };
});
$('faqBack').onclick = () => show(faqBack);
