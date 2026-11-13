-- Users: minimal. No medical data, ever. id_route = how identity is established.
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, full_name TEXT, phone TEXT,
  id_route TEXT CHECK (id_route IN ('kebele','passport','refugee','partner','none')),
  id_number TEXT, partner_org TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
-- Sessions never expire (no time-outs). answers = JSON map stepId → value.
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id), kind TEXT DEFAULT 'signup',
  lang TEXT DEFAULT 'en', answers TEXT DEFAULT '{}', current_step TEXT,
  resume_token TEXT UNIQUE, completed INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
-- Private support: categories + optional note, stored apart from profile, no proof required.
CREATE TABLE IF NOT EXISTS support_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT REFERENCES sessions(id),
  needs TEXT, note TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, employer TEXT, description TEXT,
  location TEXT, employment_type TEXT, date_posted TEXT DEFAULT CURRENT_DATE);
-- Employer-declared accommodations; candidates filter by code, no disclosure.
CREATE TABLE IF NOT EXISTS job_accommodations (
  job_id INTEGER REFERENCES jobs(id), code TEXT, detail TEXT);
