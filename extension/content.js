let rec, chunks=[], callId=null;
async function start(callIdArg){
  callId=callIdArg;
  const stream=await navigator.mediaDevices.getDisplayMedia({ audio:true, video:true });
  const audio=new MediaStream(stream.getAudioTracks());
  rec=new MediaRecorder(audio, { mimeType:"audio/webm" });
  chunks=[];
  rec.ondataavailable=e=>{ if(e.data.size>0) chunks.push(e.data); if(chunks.length>0) uploadChunk(); };
  rec.start(15000);
  console.log("[closer] stealth capture on", callId);
}
function uploadChunk(){
  if(!chunks.length||!callId) return;
  const blob=new Blob(chunks.splice(0,1), { type:"audio/webm" });
  const fd=new FormData();
  fd.append("audio", blob, "chunk.webm");
  const base=document.querySelector('meta[name="closer-api"]')?.content || "http://178.105.181.38:6002";
  fetch(`${base}/api/calls/${callId}/transcribe`, { method:"POST", body: fd, credentials:"include" }).then(r=>r.json()).then(j=>console.log("[closer] chunk", j)).catch(()=>{});
}
chrome.runtime.onMessage.addListener((m)=>{
  if(m.type==="CLOSER_START") start(m.callId);
  if(m.type==="CLOSER_STOP"){ try{rec&&rec.stop(); rec=null;}catch{} }
});
