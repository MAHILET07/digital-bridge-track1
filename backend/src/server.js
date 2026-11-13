// Backend/API owner. Express + SQLite. API under /api/v1, frontend served statically.
import express from 'express';
import Database from 'better-sqlite3';
import { randomUUID, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(process.env.DB_PATH || './bridge.db');
db.exec(readFileSync(path.join(here, 'schema.sql'), 'utf8'));
if (!db.prepare('SELECT 1 FROM jobs').get()) seed();

const app = express();
app.use(express.json());
app.use((_, res, next) => { // CORS so the Level-1 embed works on other origins
  res.set({ 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS' }); next(); });
app.options('*', (_, res) => res.sendStatus(204));
app.use(express.static(process.env.FRONTEND_DIR || path.resolve(here, '../../frontend')));

const r = express.Router();
const getSession = (id) => db.prepare('SELECT * FROM sessions WHERE id=?').get(id);
const fail = (res, code, message) => res.status(code).json({ error: { code, message } }); // plain language
const NOT_FOUND = 'We could not find your saved progress.';

r.post('/sessions', (req, res) => {
  const id = randomUUID();
  db.prepare('INSERT INTO sessions (id, kind, lang) VALUES (?,?,?)').run(id, req.body?.kind || 'signup', req.body?.lang || 'en');
  res.status(201).json({ id, answers: {}, current_step: null });
});
r.get('/sessions/:id', (req, res) => {
  const s = getSession(req.params.id); if (!s) return fail(res, 404, NOT_FOUND);
  res.json({ ...s, answers: JSON.parse(s.answers) });
});
r.put('/sessions/:id/steps/:stepId', (req, res) => { // idempotent: safe to replay from offline queue
  const s = getSession(req.params.id); if (!s) return fail(res, 404, NOT_FOUND);
  const answers = JSON.parse(s.answers); answers[req.params.stepId] = req.body?.value;
  db.prepare('UPDATE sessions SET answers=?, current_step=?, updated_at=CURRENT_TIMESTAMP WHERE id=?')
    .run(JSON.stringify(answers), req.params.stepId, s.id);
  res.json({ ok: true, answers });
});
r.post('/sessions/:id/complete', (req, res) => {
  const s = getSession(req.params.id); if (!s) return fail(res, 404, NOT_FOUND);
  const a = JSON.parse(s.answers); const uid = randomUUID();
  db.prepare('INSERT INTO users (id, full_name, phone, id_route, id_number, partner_org) VALUES (?,?,?,?,?,?)')
    .run(uid, a.fullName ?? null, a.phone ?? null, a.idRoute ?? 'none', a.idNumber ?? null, a.partnerOrg ?? null);
  if (a.support?.length) db.prepare('INSERT INTO support_requests (session_id, needs, note) VALUES (?,?,?)')
    .run(s.id, JSON.stringify(a.support), a.supportNote ?? null);
  db.prepare('UPDATE sessions SET completed=1, user_id=? WHERE id=?').run(uid, s.id);
  res.json({ ok: true, user_id: uid });
});
// Save & resume. TODO(backend): send link by SMS (free gateway / sandbox); for now returns it.
r.post('/sessions/:id/resume-token', (req, res) => {
  const token = randomBytes(4).toString('hex');
  db.prepare('UPDATE sessions SET resume_token=? WHERE id=?').run(token, req.params.id);
  res.json({ token, link: `/?resume=${token}` });
});
r.get('/resume/:token', (req, res) => {
  const s = db.prepare('SELECT id FROM sessions WHERE resume_token=?').get(req.params.token);
  s ? res.json({ id: s.id }) : fail(res, 404, 'That code did not work. Please check it and try again.');
});
// ?support=screen_reader,sign_language → jobs offering ALL requested supports
r.get('/jobs', (req, res) => {
  const want = (req.query.support || '').split(',').filter(Boolean);
  const jobs = db.prepare('SELECT * FROM jobs').all().map(j => ({ ...j,
    accommodations: db.prepare('SELECT code, detail FROM job_accommodations WHERE job_id=?').all(j.id) }));
  res.json(jobs.filter(j => want.every(w => j.accommodations.some(a => a.code === w))));
});
r.post('/jobs', (req, res) => { // employer accommodation form
  const { title, employer, description, location, employment_type, accommodations = [] } = req.body || {};
  if (!title || !employer) return fail(res, 400, 'Please add a job title and employer name.');
  const { lastInsertRowid: id } = db.prepare('INSERT INTO jobs (title, employer, description, location, employment_type) VALUES (?,?,?,?,?)')
    .run(title, employer, description, location, employment_type);
  for (const a of accommodations) db.prepare('INSERT INTO job_accommodations VALUES (?,?,?)').run(id, a.code, a.detail ?? null);
  res.status(201).json({ id });
});
// Level 3: schema.org/JobPosting JSON-LD
r.get('/jobs.jsonld', (_, res) => {
  res.type('application/ld+json').json(db.prepare('SELECT * FROM jobs').all().map(j => ({
    '@context': 'https://schema.org', '@type': 'JobPosting', title: j.title, description: j.description || j.title,
    datePosted: j.date_posted, employmentType: j.employment_type,
    hiringOrganization: { '@type': 'Organization', name: j.employer },
    jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: j.location, addressCountry: 'ET' } },
    additionalProperty: db.prepare('SELECT code, detail FROM job_accommodations WHERE job_id=?').all(j.id)
      .map(a => ({ '@type': 'PropertyValue', name: 'accommodation', value: a.code, description: a.detail })) })));
});
app.use('/api/v1', r);
app.get('/openapi.yaml', (_, res) => res.sendFile(path.resolve(here, '../openapi.yaml')));
app.listen(process.env.PORT || 3000, () => console.log('API on', process.env.PORT || 3000));

function seed() {
  const j = db.prepare('INSERT INTO jobs (title, employer, description, location, employment_type) VALUES (?,?,?,?,?)');
  const a = db.prepare('INSERT INTO job_accommodations VALUES (?,?,?)');
  let id = j.run('Customer Support Agent', 'Sample Telecom', 'Answer customer chats.', 'Addis Ababa', 'FULL_TIME').lastInsertRowid;
  a.run(id, 'screen_reader', 'NVDA-ready workstation'); a.run(id, 'remote_work', 'Hybrid, 3 days at home');
  id = j.run('Data Entry Clerk', 'Sample NGO', 'Enter survey data.', 'Adama', 'PART_TIME').lastInsertRowid;
  a.run(id, 'step_free_access', 'Ground-floor office'); a.run(id, 'sign_language', 'Interpreter on request');
}
