// Point d'entrée : serveur web + temps réel. La logique du jeu est dans src/.
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const sampleQuestions = require('./questions.json');
const { PORT } = require('./src/config');
const { lanUrl } = require('./src/utils');
const { init } = require('./src/send');
const setupSockets = require('./src/sockets');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 8e6 });

// En-têtes de protection : le site ne s'affiche pas caché dans un autre site (piège au clic),
// les fichiers gardent leur vrai type, et l'adresse de la partie n'est pas transmise aux autres sites
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self'");
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
});
app.use(express.static(path.join(__dirname, 'public')));
app.use('/icons', express.static(path.join(__dirname, 'node_modules/@tabler/icons-webfont/dist')));
app.get('/api/sample-quiz', (req, res) => {
  res.json({ title: 'Culture générale', questions: sampleQuestions });
});

init(io);
setupSockets(io);

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`WeQuizzer lancé : http://localhost:${PORT}`);
    console.log(`Animateur : http://localhost:${PORT}/host.html`);
    const lan = lanUrl();
    if (lan) console.log(`Joueurs (même Wi-Fi) : ${lan}/play.html`);
  });
}
