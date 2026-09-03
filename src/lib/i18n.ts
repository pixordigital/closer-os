export type Locale = "pt-BR" | "en";
export const locales: Locale[] = ["pt-BR","en"];
export const defaultLocale: Locale = "pt-BR";
type Dict = Record<string,string>;
const pt: Dict = {
  "nav.dashboard":"Dashboard","nav.pipeline":"Pipeline","nav.companies":"Empresas","nav.contacts":"Contatos","nav.calls":"Calls","nav.live":"Live Coach","nav.objections":"Objeções","nav.roleplay":"Roleplay","nav.discovery":"Discovery","nav.coaching":"Coaching","nav.roi":"ROI","nav.tasks":"Tasks","nav.command":"Command","nav.webhooks":"Webhooks","nav.automations":"Automations","nav.jobs":"Jobs","nav.integrations":"Integrações","nav.settings":"Settings","nav.logout":"Sair",
  "dashboard.title":"Dashboard","dashboard.subtitle":"Visão geral do seu pipeline e performance.","dashboard.pipeline":"Pipeline","dashboard.companies":"Empresas","dashboard.calls":"Calls","dashboard.tasks":"Tasks","dashboard.pending":"pendentes","dashboard.onTime":"em dia","dashboard.overdue":"vencidas","dashboard.byStage":"Pipeline por estágio","dashboard.recentDeals":"Deals recentes","dashboard.recentCalls":"Calls recentes","dashboard.pendingTasks":"Tasks pendentes","dashboard.viewPipeline":"Ver pipeline →","dashboard.viewCalls":"Ver calls →","dashboard.viewTasks":"Ver tasks →","dashboard.noDeals":"Nenhum deal ainda.","dashboard.noCalls":"Nenhuma call.","dashboard.noTasks":"Nenhuma task pendente.",
  "settings.title":"Settings","settings.subtitle":"Conta, organização e segurança","settings.account":"Conta","settings.org":"Organização","settings.security":"Segurança — trocar senha","settings.system":"Sistema","settings.language":"Idioma / Language","settings.language.desc":"Escolha o idioma da interface — salvo automaticamente / Choose interface language — auto-saved",
  "settings.name":"Nome","settings.orgName":"Nome da organização","settings.currentPw":"Senha atual","settings.newPw":"Nova senha","settings.confirmPw":"Confirmar nova senha","settings.saveName":"Salvar nome","settings.saveOrg":"Salvar organização","settings.changePw":"Alterar senha",
  "common.save":"Salvar","common.saving":"Salvando...","common.saved":"Salvo ✓","common.account":"Conta","common.email":"Email","common.role":"Role","common.memberSince":"Membro desde","common.slug":"Slug","common.members":"membro(s)","common.created":"Criada",
  "live.title":"Live Sales Coach","live.subtitle":"Faça a call no Meet/Zoom sem sair — coach mapeia e sugere em tempo real.",
  "objections.title":"Objeções — Dashboard & Dicionário","objections.subtitle":"Transcreva calls → mapeia automático → alimenta dashboard e Live Coach",
  "calls.title":"Calls","calls.new":"Nova call",
};
const en: Dict = {
  "nav.dashboard":"Dashboard","nav.pipeline":"Pipeline","nav.companies":"Companies","nav.contacts":"Contacts","nav.calls":"Calls","nav.live":"Live Coach","nav.objections":"Objections","nav.roleplay":"Roleplay","nav.discovery":"Discovery","nav.coaching":"Coaching","nav.roi":"ROI","nav.tasks":"Tasks","nav.command":"Command","nav.webhooks":"Webhooks","nav.automations":"Automations","nav.jobs":"Jobs","nav.integrations":"Integrations","nav.settings":"Settings","nav.logout":"Logout",
  "dashboard.title":"Dashboard","dashboard.subtitle":"Overview of your pipeline and performance.","dashboard.pipeline":"Pipeline","dashboard.companies":"Companies","dashboard.calls":"Calls","dashboard.tasks":"Tasks","dashboard.pending":"pending","dashboard.onTime":"on time","dashboard.overdue":"overdue","dashboard.byStage":"Pipeline by stage","dashboard.recentDeals":"Recent deals","dashboard.recentCalls":"Recent calls","dashboard.pendingTasks":"Pending tasks","dashboard.viewPipeline":"View pipeline →","dashboard.viewCalls":"View calls →","dashboard.viewTasks":"View tasks →","dashboard.noDeals":"No deals yet.","dashboard.noCalls":"No calls.","dashboard.noTasks":"No pending tasks.",
  "settings.title":"Settings","settings.subtitle":"Account, organization and security","settings.account":"Account","settings.org":"Organization","settings.security":"Security — change password","settings.system":"System","settings.language":"Language","settings.language.desc":"Choose interface language — auto-saved",
  "settings.name":"Name","settings.orgName":"Organization name","settings.currentPw":"Current password","settings.newPw":"New password","settings.confirmPw":"Confirm new password","settings.saveName":"Save name","settings.saveOrg":"Save organization","settings.changePw":"Change password",
  "common.save":"Save","common.saving":"Saving...","common.saved":"Saved ✓","common.account":"Account","common.email":"Email","common.role":"Role","common.memberSince":"Member since","common.slug":"Slug","common.members":"member(s)","common.created":"Created",
  "live.title":"Live Sales Coach","live.subtitle":"Run Meet/Zoom without leaving — coach maps and suggests in real time.",
  "objections.title":"Objections — Dashboard & Dictionary","objections.subtitle":"Transcribe calls → auto-map → feed dashboard and Live Coach",
  "calls.title":"Calls","calls.new":"New call",
};
export const dicts: Record<Locale,Dict> = { "pt-BR": pt, "en": en };
export function t(locale:Locale, key:string):string{ return dicts[locale]?.[key] ?? dicts[defaultLocale][key] ?? key; }
