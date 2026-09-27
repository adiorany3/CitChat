'use client';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
type Feed = { id: string; messages: { id: string; sender: string; username: string; text: string; time: number }[]; online: { id: string; name: string }[] };
const empty: Feed = { id: '', messages: [], online: [] };
export default function Home() {
  const [room, setRoom] = useState('');
  const [username, setUsername] = useState('');
  const [joined, setJoined] = useState(false);
  const [feed, setFeed] = useState<Feed>(empty);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [sound, setSound] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  const last = useRef('');
  const bottom = useRef<HTMLDivElement>(null);
  const flight = useRef(false);
  const beep = useCallback(() => {
    const ctx = audio.current;
    if (!ctx || ctx.state !== 'running') return;
    const tone = ctx.createOscillator(), gain = ctx.createGain();
    tone.frequency.value = 720;
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    tone.connect(gain).connect(ctx.destination);
    tone.start(); tone.stop(ctx.currentTime + 0.15);
  }, []);
  const request = useCallback(async (action: string, extra: object = {}) => {
    if (flight.current) return false;
    flight.current = true;
    try {
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...extra }), signal: AbortSignal.timeout(12000) });
      const data = await response.json();
      if (!response.ok) {
        if ([410, 401].includes(response.status)) { setJoined(false); setFeed(empty); last.current = ''; }
        throw new Error(data.error || 'Request failed');
      }
      setError('');
      if (data.destroyed) {
        setJoined(false); setFeed(empty); last.current = '';
        setNotice('Room destroyed. Name locked for 30 seconds.');
      } else {
        const newest = data.messages.at(-1);
        if (action !== 'join' && sound && newest && newest.id !== last.current && newest.sender !== data.id) beep();
        last.current = newest?.id || '';
        setFeed(data); setJoined(true);
      }
      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Connection failed'); return false;
    } finally { flight.current = false; }
  }, [sound, beep]);
  useEffect(() => { setRoom(new URLSearchParams(window.location.hash.slice(1)).get('room') || ''); }, []);
  useEffect(() => {
    if (!joined) return;
    const timer = setInterval(() => { if (!document.hidden) void request('poll'); }, 3000);
    return () => clearInterval(timer);
  }, [joined, request]);
  const latestId = feed.messages.at(-1)?.id;
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'nearest' }); }, [latestId]);
  async function join(event: FormEvent) {
    event.preventDefault(); setBusy(true); setNotice('');
    await request('join', { room, username }); setBusy(false);
  }
  async function send(event?: FormEvent, ping = false) {
    event?.preventDefault(); setBusy(true);
    if (await request('send', { text: ping ? 'PING!' : text })) { if (!ping) setText(''); }
    setBusy(false);
  }
  async function destroy() {
    if (!window.confirm('Permanently delete all messages and presence for everyone in this room?')) return;
    setBusy(true); await request('destroy'); setBusy(false);
  }
  async function share() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/#room=${encodeURIComponent(room)}`);
      setNotice('Invite copied. Anyone knowing this room name can join and destroy it.');
    } catch { setError('Clipboard unavailable. Share the room name manually.'); }
  }
  return <main>
    <header><span className="badge">CHATSECRETS / WEB TERMINAL</span><h1>Private words.<br /><span>Temporary rooms.</span></h1><p>No accounts. Choose a room. Share its name.</p></header>
    <aside>Messages encrypted in storage, not end-to-end. Anyone knowing the room name can read messages and destroy the room. Use a long, random name.</aside>
    {error && <p role="alert" className="error">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {!joined ? <form onSubmit={join} className="panel">
      <h2>Establish connection</h2><label htmlFor="room">Room name</label>
      <input id="room" value={room} onChange={e => setRoom(e.target.value)} required minLength={3} maxLength={64} pattern="[a-zA-Z0-9_-]+" autoComplete="off" placeholder="black-room-01" />
      <button type="button" onClick={() => setRoom(crypto.randomUUID())}>Generate random room</button>
      <label htmlFor="username">Username</label>
      <input id="username" value={username} onChange={e => setUsername(e.target.value)} required maxLength={32} autoComplete="off" placeholder="SubZero1" />
      <button disabled={busy} type="submit">{busy ? 'Connecting…' : 'Enter room'}</button>
    </form> : <section className="panel">
      <div className="toolbar"><h2>Room: {room}</h2><button onClick={share}>Copy invite</button></div>
      <p>Signed in as {username} · refresh every 3 seconds</p>
      <div className="toolbar"><span>Online: {feed.online.map(user => user.name).join(', ') || 'Nobody'}</span>
        <label><input type="checkbox" checked={sound} onChange={async e => {
          const enabled = e.target.checked;
          try { if (enabled) { audio.current ||= new AudioContext(); await audio.current.resume(); beep(); } setSound(enabled); }
          catch { setError('Audio unavailable in this browser.'); }
        }} /> Sound</label></div>
      <div className="log" role="log" aria-label="Chat messages" aria-live="polite" tabIndex={0}>
        {!feed.messages.length && <p className="muted">Connection ready. Send the first message.</p>}
        {feed.messages.map(item => <article key={item.id} className={item.sender === feed.id ? 'mine' : ''}>
          <div className="meta">{item.username} · <time dateTime={new Date(item.time).toISOString()}>{new Date(item.time).toLocaleTimeString('en-GB', { timeZone: 'Asia/Jakarta' })} WIB</time></div>
          <p>{item.text}</p>
        </article>)}<div ref={bottom} />
      </div>
      <form onSubmit={send}><label htmlFor="message">Message</label><textarea id="message" value={text} onChange={e => setText(e.target.value)} maxLength={2000} required rows={3} />
        <div className="toolbar"><button disabled={busy || !text.trim()}>Send</button><button type="button" disabled={busy} onClick={() => send(undefined, true)}>Ping</button></div>
      </form>
      <button className="danger" disabled={busy} onClick={destroy}>Destroy room for everyone</button>
    </section>}
    <footer>Latest 200 messages · idle rooms expire after 24 hours · destroyed names unlock after 30 seconds</footer>
  </main>;
}
