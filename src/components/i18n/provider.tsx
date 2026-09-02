"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { defaultLocale, dicts, type Locale, locales } from "@/lib/i18n";

const Ctx = createContext<{ locale:Locale, setLocale:(l:Locale)=>void, t:(k:string)=>string }>({ locale: defaultLocale, setLocale:()=>{}, t:(k)=>k });

export function I18nProvider({ children, initial }:{ children:React.ReactNode, initial?:Locale }){
  const [locale,setLocaleState]=useState<Locale>(initial ?? defaultLocale);
  useEffect(()=>{
    const saved = (localStorage.getItem("locale") as Locale|null);
    if(saved && locales.includes(saved) && !initial) setLocaleState(saved);
    // fetch server preference
    fetch("/api/settings").then(r=>r.json()).then(j=>{
      const srv=j?.user?.locale as Locale|undefined;
      if(srv && locales.includes(srv)) { setLocaleState(srv); localStorage.setItem("locale",srv); }
    }).catch(()=>{});
  },[initial]);
  function setLocale(l:Locale){
    setLocaleState(l);
    localStorage.setItem("locale",l);
    document.cookie=`locale=${l}; path=/; max-age=31536000; SameSite=lax`;
    fetch("/api/settings",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({ locale:l })}).catch(()=>{});
  }
  function t(k:string){ return dicts[locale]?.[k] ?? dicts[defaultLocale][k] ?? k; }
  return <Ctx.Provider value={{ locale, setLocale, t }}>{children}</Ctx.Provider>;
}
export function useI18n(){ return useContext(Ctx); }
