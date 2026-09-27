export async function redis(...command: (string | number)[]) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url?.startsWith('https://') || !token) throw new Error('Redis configuration missing');
  const response = await fetch(url, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command), cache: 'no-store', signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error('Redis unavailable');
  const data = await response.json();
  if (data.error) throw new Error('Redis command failed');
  return data.result;
}

// ponytail: retain 200 messages and expire idle rooms after 24 hours; add archival only if required.
export const script = `
local room = KEYS[1]
local log = KEYS[2]
local presence = KEYS[3]
local lock = KEYS[4]
local rate = KEYS[5]
local action = ARGV[1]
local id = ARGV[2]
local generation = ARGV[3]
local now = tonumber(redis.call('TIME')[1])
if redis.call('INCR', rate) == 1 then redis.call('EXPIRE', rate, 60) end
if tonumber(redis.call('GET', rate)) > 90 then return {'rate'} end
if redis.call('EXISTS', lock) == 1 then return {'locked', redis.call('TTL', lock)} end
local current = redis.call('GET', room)
if action == 'join' then
  if not current then
    redis.call('DEL', log, presence)
    redis.call('SET', room, generation, 'EX', 86400)
    current = generation
  end
elseif not current or current ~= generation then return {'gone'} end
if action == 'destroy' then
  redis.call('DEL', room, log, presence)
  redis.call('SET', lock, '1', 'EX', 30)
  return {'destroyed'}
end
redis.call('ZREMRANGEBYSCORE', presence, '-inf', now - 30)
redis.call('ZADD', presence, now, id)
redis.call('EXPIRE', room, 86400)
redis.call('EXPIRE', presence, 86400)
if action == 'send' then
  redis.call('RPUSH', log, ARGV[4])
  redis.call('LTRIM', log, -200, -1)
end
redis.call('EXPIRE', log, 86400)
return {'ok', current, redis.call('LRANGE', log, 0, -1), redis.call('ZRANGE', presence, 0, -1)}
`;
