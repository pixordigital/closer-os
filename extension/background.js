chrome.action.onClicked.addListener(async (tab)=>{
  const callId=prompt("Call ID do Closer OS?");
  if(!callId) return;
  chrome.tabs.sendMessage(tab.id, { type:"CLOSER_START", callId });
});
