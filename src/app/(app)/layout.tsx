import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { CmdK } from "@/components/command/cmdk";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  if (!s) redirect("/login");
  return (
    <AppShell>{children}<CmdK /></AppShell>
  );
}
