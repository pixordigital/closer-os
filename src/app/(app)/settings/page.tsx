import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { SettingsForms } from "@/components/settings/settings-forms";

export default async function SettingsPage(){
  const { organizationId, userId, email } = await requireTenant();
  const [user, org, membership, memberCount] = await Promise.all([
    prisma.user.findUnique({ where:{ id: userId }, select:{ id:true, name:true, email:true, createdAt:true, locale:true } }),
    prisma.organization.findUnique({ where:{ id: organizationId }, select:{ id:true, name:true, slug:true, createdAt:true } }),
    prisma.membership.findFirst({ where:{ userId, organizationId }, select:{ role:true } }),
    prisma.membership.count({ where:{ organizationId } }),
  ]);
  if(!user || !org) throw new Error("Not found");
  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-3xl">
      <div><h1 className="text-2xl font-semibold tracking-tight">Settings</h1><p className="text-sm text-zinc-400">Conta, organização e segurança</p></div>
      <SettingsForms initial={{ user, org, membership: membership!, memberCount, email: email! }} />
    </div>
  );
}
