// « Signaler un problème » : la clé Web3Forms vient d'une variable d'environnement (WEB3FORMS_KEY),
// jamais du code. L'offre gratuite de Web3Forms n'accepte que les envois depuis la page : le serveur
// donne donc la clé à la page. Sans la variable, le bouton est caché.
const fs = require('fs');
const path = require('path');

// Sur le PC : la clé est dans le fichier .env (ignoré par git). Sur Render : dans Environment.
// Une variable déjà définie n'est jamais remplacée.
function loadEnvFile(file = path.join(__dirname, '..', '.env')) {
  let txt = '';
  try { txt = fs.readFileSync(file, 'utf8'); } catch (e) { return; }
  txt.split(/\r?\n/).forEach((line) => {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  });
}

function reportConfig(env) {
  const key = String(env.WEB3FORMS_KEY || '').trim();
  return key ? { enabled: true, key } : { enabled: false };
}

module.exports = { loadEnvFile, reportConfig };
