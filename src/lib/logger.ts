// §92 Observability — structured JSON logs (no deps). Ponytail: console only, no pino/winston.
export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogFields = Record<string, unknown> & { msg: string; level?: LogLevel; event?: string; organizationId?: string; userId?: string; latencyMs?: number };
function out(level: LogLevel, fields: LogFields) {
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
