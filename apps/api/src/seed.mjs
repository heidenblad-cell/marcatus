import { db } from './db.mjs';
import crypto from 'crypto';

const assets = [
  { title: 'US Treasury Note (tokenized) – demo', chain: 'ExampleNet', category: 'bond' },
  { title: 'Commercial Real Estate Share – demo', chain: 'ExampleNet', category: 'real-estate' },
  { title: 'Gold Bar Certificate – demo', chain: 'ExampleNet', category: 'commodity' }
];

const insert = db.prepare(`
  INSERT OR REPLACE INTO assets (id, title, chain, category, source)
  VALUES (@id, @title, @chain, @category, 'seed')
`);

for (const a of assets) {
  insert.run({ ...a, id: crypto.randomUUID() });
}

console.log('🌱 Seeded demo assets:', assets.length);
