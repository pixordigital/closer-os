// §92 Observability — structured JSON logs (no deps). Ponytail: console only, no pino/winston.
export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogFields = Record<string, unknown> & { msg: string; level?: LogLevel; event?: string; organizationId?: string; userId?: string; latencyMs?: number };
const ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
function minLevel(): LogLevel {
  const v = (process.env.LOG_LEVEL ?? "info").toLowerCase();
  if (v === "debug" || v === "info" || v === "warn" || v === "error") return v;
  return "info";
}
function out(level: LogLevel, fields: LogFields) {
  if (ORDER[level] < ORDER[minLevel()]) return;
  const rec = { ts: new Date().toISOString(), level, ...fields };
  const line = JSON.stringify(rec);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
export const logger = {
  debug: (fields: LogFields) => out("debug", fields),
  info: (fields: LogFields) => out("info", fields),
  warn: (fields: LogFields) => out("warn", fields),
  error: (fields: LogFields) => out("error", fields),
};
