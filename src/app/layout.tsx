import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Closer OS — AI Sales Operating System",
  description: "Segundo cérebro comercial + simulador de vendas + AI Sales Coach.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100">{children}</body>
    </html>
  );
}
