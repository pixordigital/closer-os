import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "@/components/i18n/provider";
import { cookies } from "next/headers";
import type { Locale } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Closer OS — AI Sales Operating System",
  description: "Segundo cérebro comercial + simulador de vendas + AI Sales Coach.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const locale = (jar.get("locale")?.value as Locale | undefined) ?? "pt-BR";
  return (
    <html lang={locale} className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100"><I18nProvider initial={locale as Locale}>{children}</I18nProvider></body>
    </html>
  );
}
