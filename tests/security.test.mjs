import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { seal, open, roomKey, username, message } from '../lib/security.mjs';

process.env.APP_SECRET = randomBytes(32).toString('hex');
test('authenticated encryption, purpose isolation, tamper detection and key validation', () => {
  const value = { text: 'secret <script> hello 🌍' };
  const encrypted = seal(value, 'message');
  assert.deepEqual(open(encrypted, 'message'), value);
  assert.notEqual(seal(value, 'message'), encrypted);
  assert.ok(!encrypted.includes('secret'));
  assert.throws(() => open(encrypted, 'session'));
  const corrupt = Buffer.from(encrypted, 'base64url');
  corrupt[30] ^= 1;
  assert.throws(() => open(corrupt.toString('base64url'), 'message'));
  assert.throws(() => open('', 'message'));
  const key = process.env.APP_SECRET;
  process.env.APP_SECRET = 'weak';
  assert.throws(() => seal(value, 'message'));
  process.env.APP_SECRET = key;
});
test('trust boundaries reject malformed room, username and message values', () => {
  assert.equal(roomKey('room-123').length, 64);
  assert.equal(roomKey('room-123'), roomKey('room-123'));
  for (const value of [null, {}, 'ab', '../secret', 'a'.repeat(65)]) assert.throws(() => roomKey(value));
  assert.equal(username(' Alice '), 'Alice');
  for (const value of [null, '', ' ', 'a'.repeat(33), 'alice\n']) assert.throws(() => username(value));
  assert.equal(message(' hello '), 'hello');
  for (const value of [null, {}, '', ' ', 'a'.repeat(2001)]) assert.throws(() => message(value));
});
