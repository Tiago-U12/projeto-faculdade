-- Caixa privada. Sem acesso direto do navegador: somente a Pages Function usa o binding.
CREATE TABLE IF NOT EXISTS feedback_reports (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewing','resolved','dismissed')),
  note TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS feedback_created ON feedback_reports(created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS feedback_rate ON feedback_reports(ip_hash, created_at);
