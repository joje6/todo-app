import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from './app';

function fakePool(rows: any[] = []) {
  const calls: Array<{ sql: string; values?: unknown[] }> = [];
  const pool: any = { calls, query: async (sql: string, values?: unknown[]) => {
    calls.push({ sql, values });
    if (sql.startsWith('SELECT')) return { rows };
    if (sql.startsWith('INSERT')) return { rows: [{ id: 2, title: values?.[0], completed: false, created_at: '2026-01-01T00:00:00Z' }], rowCount: 1 };
    if (sql.startsWith('UPDATE')) return { rows: [{ id: values?.[1], title: 'Updated', completed: values?.[0], created_at: '2026-01-01T00:00:00Z' }], rowCount: 1 };
    if (sql.startsWith('DELETE')) return { rows: [], rowCount: 1 };
    return { rows: [], rowCount: 0 };
  } };
  return pool;
}

test('health endpoint reports healthy', async () => {
  const res = await request(createApp(fakePool())).get('/healthz').expect(200);
  assert.deepEqual(res.body, { status: 'ok' });
});
test('lists todos from persistence', async () => {
  const pool = fakePool([{ id: 1, title: 'Ship it', completed: false }]);
  const res = await request(createApp(pool)).get('/api/todos').expect(200);
  assert.equal(res.body[0].title, 'Ship it');
  assert.match(pool.calls[0].sql, /FROM todos/);
});
test('creates trimmed todo and validates title', async () => {
  const app = createApp(fakePool());
  const created = await request(app).post('/api/todos').send({ title: '  Buy tea  ' }).expect(201);
  assert.equal(created.body.title, 'Buy tea');
  await request(app).post('/api/todos').send({ title: '  ' }).expect(400);
  await request(app).post('/api/todos').send({ title: 'x'.repeat(201) }).expect(400);
});
test('updates completion and validates payload', async () => {
  const app = createApp(fakePool());
  const updated = await request(app).patch('/api/todos/2').send({ completed: true }).expect(200);
  assert.equal(updated.body.completed, true);
  await request(app).patch('/api/todos/nope').send({ completed: true }).expect(400);
  await request(app).patch('/api/todos/2').send({ completed: 'yes' }).expect(400);
});
test('deletes todo and validates identifier', async () => {
  const app = createApp(fakePool());
  await request(app).delete('/api/todos/2').expect(204);
  await request(app).delete('/api/todos/-2').expect(400);
});
