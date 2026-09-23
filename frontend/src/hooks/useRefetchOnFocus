// useRefetchOnFocus.js
//
// Rilancia una funzione di fetch quando la tab/app torna visibile o riceve
// focus dopo essere stata in background. Risolve il caso in cui il calendario
// resta "congelato" sullo stato caricato all'apertura iniziale — tipico su
// mobile, dove il sistema operativo sospende la pagina invece di ricaricarla
// quando l'app torna in primo piano.
//
// INTEGRAZIONE nel componente Calendario:
//
//   import { useRefetchOnFocus } from './hooks/useRefetchOnFocus';
//   ...
//   useRefetchOnFocus(fetchShifts);
//
// minIntervalMs evita refetch ravvicinati (es. cambio rapido di tab/app).

import { useEffect, useRef } from 'react';

export function useRefetchOnFocus(refetchFn, { minIntervalMs = 5000 } = {}) {
  const lastRunRef = useRef(0);
  const refetchRef = useRef(refetchFn);

  // Tiene sempre l'ultima versione della funzione senza dover re-registrare i listener
  useEffect(() => {
    refetchRef.current = refetchFn;
  }, [refetchFn]);

  useEffect(() => {
    function maybeRefetch() {
      const now = Date.now();
      if (now - lastRunRef.current < minIntervalMs) return;
      lastRunRef.current = now;
      refetchRef.current();
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') maybeRefetch();
    }

    window.addEventListener('focus', maybeRefetch);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('focus', maybeRefetch);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [minIntervalMs]);
}
