const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const CHANNELS = [
  ['ambassadors', 'Student ambassadors', 240, 700],
  ['clubs', 'College clubs', 120, 450],
  ['communities', 'Student communities', 90, 350],
  ['paid', 'Paid promotion', 20, 350],
  ['recovery', 'Follow-up & referral recovery', 30, 150],
  ['organic', 'Organic social', 0, 0],
  ['direct', 'Direct or unknown', 0, 0]
];

function openDatabase(filename = process.env.DATABASE_PATH || './data/campusai.sqlite') {
  if (filename !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(filename)), { recursive: true });
  const db = new Database(filename);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS ambassadors (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, college TEXT NOT NULL,
      referral_code TEXT NOT NULL UNIQUE COLLATE NOCASE, created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS registrations (
      id TEXT PRIMARY KEY, full_name TEXT NOT NULL, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      college TEXT NOT NULL, branch TEXT NOT NULL, academic_year TEXT NOT NULL,
      ambassador_id TEXT REFERENCES ambassadors(id) ON DELETE SET NULL,
      referral_code TEXT, channel TEXT NOT NULL CHECK(channel IN ('ambassadors','clubs','communities','organic','paid','direct','recovery')),
      utm_source TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS demo_registrations (
      id TEXT PRIMARY KEY, full_name TEXT NOT NULL, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      college TEXT NOT NULL, branch TEXT NOT NULL, academic_year TEXT NOT NULL,
      ambassador_id TEXT REFERENCES ambassadors(id) ON DELETE SET NULL,
      referral_code TEXT, channel TEXT NOT NULL CHECK(channel IN ('ambassadors','clubs','communities','organic','paid','direct','recovery')),
      utm_source TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE VIEW IF NOT EXISTS all_registrations AS
      SELECT id,full_name,email,college,branch,academic_year,ambassador_id,referral_code,channel,utm_source,created_at FROM registrations
      UNION ALL
      SELECT id,full_name,email,college,branch,academic_year,ambassador_id,referral_code,channel,utm_source,created_at FROM demo_registrations;
    CREATE TABLE IF NOT EXISTS channel_budgets (
      channel TEXT PRIMARY KEY, label TEXT NOT NULL, target INTEGER NOT NULL DEFAULT 0,
      allocation_paise INTEGER NOT NULL DEFAULT 0 CHECK(allocation_paise >= 0),
      spend_paise INTEGER NOT NULL DEFAULT 0 CHECK(spend_paise >= 0)
    );
    CREATE TABLE IF NOT EXISTS campaign_config (
      key TEXT PRIMARY KEY, value TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_registrations_created ON registrations(created_at);
    CREATE INDEX IF NOT EXISTS idx_registrations_channel ON registrations(channel);
    CREATE INDEX IF NOT EXISTS idx_registrations_ambassador ON registrations(ambassador_id);
    CREATE INDEX IF NOT EXISTS idx_demo_registrations_created ON demo_registrations(created_at);
    CREATE INDEX IF NOT EXISTS idx_demo_registrations_channel ON demo_registrations(channel);
    CREATE INDEX IF NOT EXISTS idx_demo_registrations_ambassador ON demo_registrations(ambassador_id);
  `);
  const addDefaults = db.transaction(() => {
    const insert = db.prepare('INSERT OR IGNORE INTO channel_budgets(channel,label,target,allocation_paise,spend_paise) VALUES(?,?,?,?,0)');
    for (const [channel,label,target,allocationRupees] of CHANNELS) insert.run(channel,label,target,allocationRupees*100);
    db.prepare("INSERT OR IGNORE INTO campaign_config(key,value) VALUES('target','500'),('demo_mode','false'),('campaign_start','2026-10-28')").run();
    db.prepare("INSERT OR IGNORE INTO campaign_config(key,value) VALUES('budget_allocations_seeded','false')").run();
    if(db.prepare("SELECT value FROM campaign_config WHERE key='budget_allocations_seeded'").get().value!=='true'){
      const update=db.prepare('UPDATE channel_budgets SET allocation_paise=? WHERE channel=?');
      for(const [channel,, ,allocationRupees] of CHANNELS) update.run(allocationRupees*100,channel);
      db.prepare("UPDATE campaign_config SET value='true' WHERE key='budget_allocations_seeded'").run();
    }
  });
  addDefaults();
  return db;
}

module.exports = { openDatabase, CHANNELS };
