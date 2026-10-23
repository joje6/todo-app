import express, { NextFunction, Request, Response } from 'express';
import type { Pool } from 'pg';

export interface Todo { id: number; title: string; completed: boolean; created_at: string }
export function createApp(pool: Pool) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));
  app.get('/healthz', (_req, res) => res.status(200).json({ status: 'ok' }));

  app.get('/api/todos', async (_req, res, next) => {
    try {
      const result = await pool.query<Todo>('SELECT id, title, completed, created_at FROM todos ORDER BY created_at DESC, id DESC');
      res.json(result.rows);
    } catch (error) { next(error); }
  });

  app.post('/api/todos', async (req, res, next) => {
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    if (!title || title.length > 200) return res.status(400).json({ error: 'Title must be between 1 and 200 characters.' });
    try {
      const result = await pool.query<Todo>('INSERT INTO todos (title) VALUES ($1) RETURNING id, title, completed, created_at', [title]);
      res.status(201).json(result.rows[0]);
    } catch (error) { next(error); }
  });

  app.patch('/api/todos/:id', async (req, res, next) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid todo id.' });
    const keys = Object.keys(req.body ?? {});
    if (keys.length !== 1 || !['title', 'completed'].includes(keys[0])) return res.status(400).json({ error: 'Provide either title or completed.' });
    if (keys[0] === 'title') {
      const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
      if (!title || title.length > 200) return res.status(400).json({ error: 'Title must be between 1 and 200 characters.' });
      try {
        const result = await pool.query<Todo>('UPDATE todos SET title = $1 WHERE id = $2 RETURNING id, title, completed, created_at', [title, id]);
        return result.rowCount ? res.json(result.rows[0]) : res.status(404).json({ error: 'Todo not found.' });
      } catch (error) { return next(error); }
    }
    if (typeof req.body.completed !== 'boolean') return res.status(400).json({ error: 'completed must be a boolean.' });
    try {
      const result = await pool.query<Todo>('UPDATE todos SET completed = $1 WHERE id = $2 RETURNING id, title, completed, created_at', [req.body.completed, id]);
      return result.rowCount ? res.json(result.rows[0]) : res.status(404).json({ error: 'Todo not found.' });
    } catch (error) { return next(error); }
  });

  app.delete('/api/todos/:id', async (req, res, next) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid todo id.' });
    try {
      const result = await pool.query('DELETE FROM todos WHERE id = $1', [id]);
      return result.rowCount ? res.status(204).end() : res.status(404).json({ error: 'Todo not found.' });
    } catch (error) { return next(error); }
  });

  app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found.' }));
  app.use(express.static('dist/public'));
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof SyntaxError && 'body' in err) return res.status(400).json({ error: 'Invalid JSON body.' });
    console.error('Request error:', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  });
  return app;
}
