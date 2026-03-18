/**
 * AriaLiveAnnouncer — global visually-hidden live regions for screen readers.
 *
 * Two priority levels:
 *   announce(msg)       → assertive (move, delete, errors — needs immediate attention)
 *   announcePolite(msg) → polite    (save, rename, copy, import — informational)
 *
 * Usage:
 *   import { announce, announcePolite } from './aria-live-announcer';
 *   announce('Moved "Blue" to "Brand Colors"');
 *   announcePolite('Saved "Blue" to collection');
 */
import { useState, useEffect, useCallback, createContext, useContext } from 'react';

type AnnounceFunction = (message: string) => void;

interface AnnounceAPI {
  announce: AnnounceFunction;
  announcePolite: AnnounceFunction;
}

const AnnounceContext = createContext<AnnounceAPI>({
  announce: () => {},
  announcePolite: () => {},
});

// Module-level singletons so non-React code (or deeply nested callbacks) can announce.
let _globalAnnounce: AnnounceFunction = () => {};
let _globalAnnouncePolite: AnnounceFunction = () => {};

/** Assertive announcement — interrupts current speech. Use for destructive / critical actions. */
export function announce(message: string) {
  _globalAnnounce(message);
}

/** Polite announcement — waits for current speech to finish. Use for confirmations / info. */
export function announcePolite(message: string) {
  _globalAnnouncePolite(message);
}

function useLiveRegion() {
  const [message, setMessage] = useState('');

  const doAnnounce = useCallback((msg: string) => {
    // Clear first so re-announcing the same message still triggers
    setMessage('');
    requestAnimationFrame(() => setMessage(msg));
  }, []);

  return { message, doAnnounce } as const;
}

export function AriaLiveAnnouncer({ children }: { children: React.ReactNode }) {
  const assertive = useLiveRegion();
  const polite = useLiveRegion();

  useEffect(() => {
    _globalAnnounce = assertive.doAnnounce;
    _globalAnnouncePolite = polite.doAnnounce;
    return () => {
      _globalAnnounce = () => {};
      _globalAnnouncePolite = () => {};
    };
  }, [assertive.doAnnounce, polite.doAnnounce]);

  const api: AnnounceAPI = {
    announce: assertive.doAnnounce,
    announcePolite: polite.doAnnounce,
  };

  return (
    <AnnounceContext.Provider value={api}>
      {children}
      {/* Assertive — for destructive/move/error actions */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertive.message}
      </div>
      {/* Polite — for saves, renames, copies, imports */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {polite.message}
      </div>
    </AnnounceContext.Provider>
  );
}
