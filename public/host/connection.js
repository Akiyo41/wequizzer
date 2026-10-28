// Connexion au serveur, création de la partie, invitation des joueurs
// ----- Connexion, création de la partie, retour après coupure -----
const SESSION_KEY = 'wequizzer.hostSession';
if (!LS.get(SESSION_KEY, null)) Brand.intro();
// Connexion perdue : le professeur répare le câble (affiché seulement si la coupure dure plus d'1,5 s)
let connTimer = null;
// On charge l'image du professeur « réparation » tant qu'on est en ligne : une fois coupé, il serait trop tard
let connImg = null;
setTimeout(() => { connImg = Brand.preload('reparation', 'md'); }, 1200);
function connShow() {
  clearTimeout(connTimer);
  connTimer = setTimeout(() => {
    if (!$('connMascot').firstChild) $('connMascot').appendChild(connImg || Brand.preload('reparation', 'md'));
    $('connBanner').classList.remove('hidden');
  }, 1500);
}
function connHide() { clearTimeout(connTimer); $('connBanner').classList.add('hidden'); }
socket.on('connect', () => {
  connHide();
  const sess = LS.get(SESSION_KEY, null);
  if (sess && sess.pin && sess.key) socket.emit('host:rejoin', sess);
  else socket.emit('host:create', { origin: location.origin });
});
socket.on('disconnect', connShow);
socket.on('host:rejoin:error', () => {
  LS.del(SESSION_KEY);
  socket.emit('host:create', { origin: location.origin });
});
socket.on('host:create:error', (msg) => alert(msg));
// ----- Inviter des joueurs (menu de partage du téléphone, copier le lien) -----
let inviteUrl = '';
if (!navigator.share) $('invShare').classList.add('hidden');
$('invShare').onclick = () => { if (inviteUrl) navigator.share({ title: 'WeQuizzer', text: "🎓 Le Professeur Quizzo t'attend ! Rejoins mon quiz WeQuizzer :", url: inviteUrl }).catch(() => {}); };
$('invCopy').onclick = () => { if (inviteUrl) copyText(inviteUrl, $('invCopy')); };
socket.on('host:created', async (d) => {
  LS.set(SESSION_KEY, { pin: d.pin, key: d.key });
  $('pin').textContent = d.pin;
  $('joinUrl').textContent = d.joinUrl.replace(/^https?:\/\//, '');
  inviteUrl = d.joinUrl + '?pin=' + d.pin;
  if (d.qr) { $('qr').src = d.qr; $('qr').classList.remove('hidden'); }
  $('lanNote').classList.toggle('hidden', !d.lanOnly);
  if (d.rejoined) {
    applySettings(d.settings);
  } else {
    const saved = LS.get('wequizzer.settings', null);
    applySettings(saved ? Object.assign({}, d.settings, saved) : d.settings);
    if (saved) pushSettings();
  }
  await initLibrary();
});
