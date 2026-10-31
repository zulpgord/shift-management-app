import { useState, useEffect } from 'react';

// Render spegne i servizi free dopo 15 minuti di inattività: la prima richiesta
// della giornata può aspettare quasi un minuto. Invece di lasciare una schermata
// muta, raccontiamo cosa sta succedendo finché /health non risponde.
const PHRASES = [
  'Stiamo contando gli oggetti…',
  'Stiamo svegliando i volontari…',
  'Riapriamo le serrande…',
  'Mettiamo in ordine gli scaffali…',
  'Cerchiamo le chiavi del magazzino…',
  'Controlliamo chi è di turno…',
  'Spolveriamo il bancone…',
  'Accendiamo le luci…',
  'Mettiamo su il caffè…',
  'Ancora un momento, ci siamo quasi…',
];

// Se il backend è già sveglio risponde in pochi millisecondi: in quel caso
// non deve comparire nulla, altrimenti il banner sarebbe un lampo fastidioso.
const SHOW_AFTER_MS = 1200;
const PHRASE_EVERY_MS = 2800;
const RETRY_EVERY_MS = 2000;
const GIVE_UP_AFTER_MS = 120000;

export default function WakeUpBanner() {
  const [visible, setVisible] = useState(false);
  const [phrase, setPhrase] = useState(0);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    let awake = false;
    const timers = [];

    const showTimer = setTimeout(() => {
      if (!awake) setVisible(true);
    }, SHOW_AFTER_MS);
    timers.push(showTimer);

    const slowTimer = setTimeout(() => {
      if (!awake) setSlow(true);
    }, GIVE_UP_AFTER_MS);
    timers.push(slowTimer);

    const rotate = setInterval(() => setPhrase(p => (p + 1) % PHRASES.length), PHRASE_EVERY_MS);

    const ping = async () => {
      if (awake) return;
      try {
        const res = await fetch(`${backendUrl}/health`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        awake = true;
        setVisible(false);
      } catch {
        if (!awake) timers.push(setTimeout(ping, RETRY_EVERY_MS));
      }
    };
    ping();

    return () => {
      awake = true;
      timers.forEach(clearTimeout);
      clearInterval(rotate);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed top-6 left-1/2 z-[100] flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl bg-indigo-600 text-white text-sm font-semibold"
      style={{ transform: 'translateX(-50%)', maxWidth: 'calc(100vw - 2rem)' }}
      role="status"
      aria-live="polite"
    >
      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin flex-shrink-0" />
      <span>
        {slow ? 'Il server ci sta mettendo più del solito, ancora un attimo…' : PHRASES[phrase]}
      </span>
    </div>
  );
}
