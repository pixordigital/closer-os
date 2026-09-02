export type Locale = "pt-BR" | "en";
export const locales: Locale[] = ["pt-BR","en"];
export const defaultLocale: Locale = "pt-BR";

type Dict = Record<string,string>;
const pt: Dict = {
  "nav.dashboard":"Dashboard","nav.pipeline":"Pipeline","nav.companies":"Companies","nav.contacts":"Contacts","nav.calls":"Calls","nav.live":"Live Coach","nav.objections":"Objeções","nav.roleplay":"Roleplay","nav.discovery":"Discovery","nav.coaching":"Coaching","nav.roi":"ROI","nav.tasks":"Tasks","nav.command":"Command","nav.webhooks":"Webhooks","nav.automations":"Automations","nav.jobs":"Jobs","nav.integrations":"Integrations","nav.settings":"Settings","nav.logout":"Sair",
  "dashboard.title":"Dashboard","dashboard.subtitle":"Visão geral do seu pipeline e performance.",
  "settings.title":"Settings","settings.subtitle":"Conta, organização e segurança",
  "settings.language":"Idioma","settings.language.desc":"Escolha o idioma da interface",
  "common.save":"Salvar","common.saving":"Salvando...","common.saved":"Salvo ✓",
};
const en: Dict = {
  "nav.dashboard":"Dashboard","nav.pipeline":"Pipeline","nav.companies":"Companies","nav.contacts":"Contacts","nav.calls":"Calls","nav.live":"Live Coach","nav.objections":"Objections","nav.roleplay":"Roleplay","nav.discovery":"Discovery","nav.coaching":"Coaching","nav.roi":"ROI","nav.tasks":"Tasks","nav.command":"Command","nav.webhooks":"Webhooks","nav.automations":"Automations","nav.jobs":"Jobs","nav.integrations":"Integrations","nav.settings":"Settings","nav.logout":"Logout",
  "dashboard.title":"Dashboard","dashboard.subtitle":"Overview of your pipeline and performance.",
  "settings.title":"Settings","settings.subtitle":"Account, organization and security",
  "settings.language":"Language","settings.language.desc":"Choose interface language",
  "common.save":"Save","common.saving":"Saving...","common.saved":"Saved ✓",
};

export const dicts: Record<Locale,Dict> = { "pt-BR": pt, "en": en };
export function t(locale:Locale, key:string):string{ return dicts[locale]?.[key] ?? dicts[defaultLocale][key] ?? key; }
