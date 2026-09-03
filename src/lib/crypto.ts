import crypto from "crypto";

function key(): Buffer {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("AUTH_SECRET too short");
  return crypto.createHash("sha256").update(s).digest();
}

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

export function decrypt(payload: string): string {
  const [ivB, tagB, encB] = payload.split(":");
  if (!ivB || !tagB || !encB) return "";
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(ivB, "base64"));
  decipher.setAuthTag(Buffer.from(tagB, "base64"));
  const dec = Buffer.concat([decipher.update(Buffer.from(encB, "base64")), decipher.final()]);
  return dec.toString("utf8");
}

export function mask(val?: string | null): string {
  if (!val) return "";
  const d = val.includes(":") ? (()=>{ try{ return decrypt(val);}catch{return val;}})() : val;
  if (d.length <= 8) return "••••";
  return d.slice(0, 4) + "••••" + d.slice(-4);
}
