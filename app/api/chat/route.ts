import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomUUID } from 'node:crypto';
import { message, open, roomKey, seal, username } from '@/lib/security.mjs';
import { redis, script } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
function reply(body: object, status = 200) { return NextResponse.json(body, { status, headers }); }

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) return reply({ error: 'Invalid origin' }, 403);
  if (!request.headers.get('content-type')?.startsWith('application/json')) return reply({ error: 'JSON required' }, 415);
  let input;
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new Error();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 12000) { await reader.cancel(); return reply({ error: 'Request too large' }, 413); }
      chunks.push(value);
    }
    input = JSON.parse(Buffer.concat(chunks).toString());
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error();
  } catch { return reply({ error: 'Invalid JSON' }, 400); }
  const { action } = input;
  if (!['join', 'poll', 'send', 'destroy'].includes(action)) return reply({ error: 'Invalid action' }, 400);
  try {
    let session;
    if (action === 'join') {
      let room, name;
      try { room = roomKey(input.room); name = username(input.username); }
      catch (error) { return reply({ error: (error as Error).message }, 400); }
      session = { room, name, generation: randomUUID(), id: randomUUID(), expires: Date.now() + 86400000 };
    } else {
      try {
        session = open(request.cookies.get('chat-session')?.value || '', 'session');
        if (session.expires < Date.now()) throw new Error();
      } catch { return reply({ error: 'Session expired. Join again.' }, 401); }
    }
    let text = '';
    if (action === 'send') {
      try { text = message(input.text); }
      catch (error) { return reply({ error: (error as Error).message }, 400); }
    }
    const ip = request.headers.get('x-vercel-forwarded-for') || request.headers.get('x-forwarded-for') || 'local';
    const actor = action === 'join' ? createHash('sha256').update(ip).digest('hex') : session.id;
    const prefix = `cs:{${session.room}}`;
    const presence = seal({ id: session.id, name: session.name }, 'presence');
    // Keep one stable presence member per session instead of generating one per heartbeat.
    session.presence ||= presence;
    const encrypted = action === 'send' ? seal({ id: randomUUID(), sender: session.id, username: session.name, text, time: Date.now() }, 'message') : '';
    const result = await redis('EVAL', script, 5, `${prefix}:room`, `${prefix}:log`, `${prefix}:online`, `${prefix}:lock`, `cs:{${session.room}}:rate:${actor}`, action, session.presence, session.generation, encrypted);
    if (result[0] === 'rate') return reply({ error: 'Too many requests. Wait one minute.' }, 429);
    if (result[0] === 'locked') return reply({ error: `Room destroyed. Try again in ${result[1]} seconds.` }, 410);
    if (result[0] === 'gone') return reply({ error: 'Room expired or destroyed. Join again.' }, 410);
    if (result[0] === 'destroyed') {
      const response = reply({ destroyed: true });
      response.cookies.delete('chat-session');
      return response;
    }
    session.generation = result[1];
    const response = reply({
      id: session.id,
      messages: result[2].map((value: string) => open(value, 'message')),
      online: result[3].map((value: string) => open(value, 'presence')),
    });
    if (action === 'join') response.cookies.set('chat-session', seal(session, 'session'), {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 86400,
    });
    return response;
  } catch {
    return reply({ error: 'Chat unavailable. Check server configuration or retry shortly.' }, 503);
  }
}
