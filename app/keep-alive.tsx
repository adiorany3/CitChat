'use client';
import { useEffect } from 'react';

const PING = 'https://ngobrol.streamlit.app/healthz';
const EVERY = 5 * 60 * 1000; // ponytail: 5m ceiling avoids idle sleep, lower when Streamlit throttles

export default function KeepAlive() {
  useEffect(() => {
    let t: ReturnType<typeof setInterval>;
    const hit = () => {
      if (document.hidden) return;
      fetch(PING, { mode: 'no-cors', cache: 'no-store', keepalive: true }).catch(() => {});
    };
    hit();
    t = setInterval(hit, EVERY);
    document.addEventListener('visibilitychange', hit);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', hit);
    };
  }, []);
  return null;
}
