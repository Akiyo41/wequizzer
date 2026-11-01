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
// « Quoi de neuf ? » : pastille sur le bouton Aide tant que l'animateur n'a pas lu les dernières nouveautés.
// Changer NEWS quand on met à jour la liste « faq-nouveau » de host.html.
const NEWS = '2026-11-01b';
const NEWS_KEY = 'wequizzer.newsSeen';
if (LS.get(NEWS_KEY, '') !== NEWS) $('openFaq').appendChild(el('span', 'news-dot', 'nouveau'));
$('openFaq').onclick = () => {
  const dot = $('openFaq').querySelector('.news-dot');
  if (!dot) return openFaq(null);
  dot.remove();
  LS.set(NEWS_KEY, NEWS);
  openFaq('faq-nouveau');
};
document.querySelectorAll('[data-faq]').forEach((b) => {
  b.onclick = (e) => { e.preventDefault(); e.stopPropagation(); openFaq(b.dataset.faq); };
});
$('faqBack').onclick = () => show(faqBack);
$('faqTour').onclick = () => Tour.start();
// « Signaler un problème » : bouton caché si le serveur n'a pas la clé Web3Forms (report.js)
Report.mount([$('reportHost')], 'animateur');
