// Service worker minimal : il permet d'installer WeQuizzer comme une appli sur le téléphone.
// Il ne garde RIEN en mémoire (pas de cache) : tout passe par Internet, donc les mises à jour arrivent tout de suite.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
