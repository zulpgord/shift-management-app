// noCache.middleware.js
//
// Impedisce a browser, proxy intermedi e CDN (es. Cloudflare, visibile nei tuoi
// header di risposta) di servire una copia cached delle risposte per gli
// endpoint /shifts e /assignments. Risolve il caso in cui un client (browser,
// PWA, tab rimasta in background) mostra dati non aggiornati dopo che
// un'assegnazione è stata creata/modificata da un altro utente o da un altro
// dispositivo.
//
// INTEGRAZIONE in server.js:
//
//   const noCache = require('./middleware/noCache');
//   app.use('/api/shifts', noCache);
//   app.use('/api/assignments', noCache);
//
// Se il progetto usa ESM ("type": "module" in package.json), sostituisci
// l'ultima riga con: export default noCache;
// e l'import con: import noCache from './middleware/noCache.js';

function noCache(req, res, next) {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  // Header rispettato da CDN come Cloudflare/Fastly per bypassare la cache edge
  res.set('Surrogate-Control', 'no-store');
  next();
}

module.exports = noCache;
