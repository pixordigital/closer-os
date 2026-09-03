import { MeetZoomEmbed } from "@/components/live/meet-zoom-embed";
import { LiveCoachPanel } from "@/components/live/live-coach-panel";

export default function MobileLivePage(){
  return (
    <div className="h-[calc(100vh-56px)] md:h-screen flex flex-col md:flex-row">
      <div className="order-2 md:order-1 w-full md:w-[30%] border-t md:border-t-0 md:border-r border-zinc-800 bg-zinc-950 overflow-auto">
        <div className="p-3">
          <h2 className="text-sm font-semibold">Live Coach — 30%</h2>
          <p className="text-xs text-zinc-500">Stealth Granola invisível · auto-feed com HITL</p>
          <div className="mt-3"><LiveCoachPanel /></div>
        </div>
      </div>
      <div className="order-1 md:order-2 w-full md:w-[70%] bg-black flex flex-col">
        <div className="p-3 border-b border-zinc-800 bg-zinc-950">
          <h2 className="text-sm font-semibold">Meet — 70% · 100% controles nativos</h2>
          <p className="text-xs text-zinc-500">No app: WebView nativo. No navegador: iframe com fallback split-screen.</p>
        </div>
        <div className="flex-1 p-2 bg-zinc-900"><MeetZoomEmbed /></div>
      </div>
    </div>
  );
}
