import { getSession, type SessionPayload } from "./auth";
import { prisma } from "./db";

export type TenantContext = SessionPayload & { organizationId: string };

export async function requireTenant(): Promise<TenantContext> {
  const s = await getSession();
  if (!s) throw new Error("Unauthorized");
  let orgId = s.orgId;
  if (!orgId) {
    const m = await prisma.membership.findFirst({ where: { userId: s.userId }, select: { organizationId: true } });
    if (!m) throw new Error("No organization");
    orgId = m.organizationId;
  }
  return { ...s, organizationId: orgId };
}

// Parse pagination from searchParams — ponytail: one helper, no lib
export function parsePagination(url: URL, defaults = { page: 1, limit: 20 }) {
  const page = Math.max(1, Number(url.searchParams.get("page") ?? defaults.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? defaults.limit) || defaults.limit));
  const skip = (page - 1) * limit;
  const q = url.searchParams.get("q")?.trim() || "";
  return { page, limit, skip, q };
}
