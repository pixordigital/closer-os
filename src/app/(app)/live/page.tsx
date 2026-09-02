import { MeetZoomEmbed } from "@/components/live/meet-zoom-embed";
import { LiveCoachPanel } from "@/components/live/live-coach-panel";

export default function LivePage(){
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div><h1 className="text-2xl font-semibold tracking-tight">Live Sales Coach</h1><p className="text-sm text-zinc-400">Faça a call no Meet/Zoom sem sair — coach mapeia a call e te diz como contornar cada objeção em tempo real.</p></div>
      <MeetZoomEmbed />
      <LiveCoachPanel />
    </div>
  );
}
