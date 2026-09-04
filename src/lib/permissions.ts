import { prisma } from "./db";
import type { SessionPayload } from "./auth";

// ponytail: role check on Membership — no new table
export type OrgRole = "OWNER"|"ADMIN"|"MEMBER";
const ORDER: Record<OrgRole,number> = { MEMBER:1, ADMIN:2, OWNER:3 };

export async function getOrgRole(userId:string, organizationId:string): Promise<OrgRole|null>{
  const m = await prisma.membership.findFirst({ where:{ userId, organizationId }, select:{ role:true }});
  return (m?.role as OrgRole) ?? null;
}
export async function requireRole(session: SessionPayload, organizationId:string, min:OrgRole){
  const role = await getOrgRole(session.userId, organizationId);
  if(!role || ORDER[role] < ORDER[min]) throw Object.assign(new Error(`Forbidden — need ${min}`), { status:403 });
  return role;
}
