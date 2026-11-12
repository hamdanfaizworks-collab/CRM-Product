import { useSyncExternalStore } from "react";
import english from "./locales/en.json";

export type Language = "id" | "en";
const STORAGE_KEY = "ttm.crm.language.v1";
const listeners = new Set<() => void>();
const preferredLanguage = (value: string | null): Language => value === "id" ? "id" : "en";
let language: Language = "en";
try { if (typeof localStorage !== "undefined") language = preferredLanguage(localStorage.getItem(STORAGE_KEY)); } catch { /* English remains the default when preference storage is unavailable. */ }
const dictionary = english as Record<string,string>;
const reverse = new Map(Object.entries(dictionary).map(([key,value])=>[value,key]));
const missing = new Set<string>();
export const getLanguage = () => language;
export const getLocale = () => language === "en" ? "en-GB" : "id-ID";
function updateDocument(){if(typeof document!=="undefined")document.documentElement.lang=language;}
updateDocument();
export function setLanguage(next:Language){
  if(next!=="id"&&next!=="en")return;
  language=next;try{localStorage.setItem(STORAGE_KEY,next)}catch{/* Keep the in-memory preference. */}
  updateDocument();for(const callback of listeners)callback();
}
if(typeof window!=="undefined")window.addEventListener("storage",event=>{if(event.key===STORAGE_KEY||event.key===null)setLanguage(preferredLanguage(event.newValue))});
export function useLanguage(){return useSyncExternalStore(callback=>{listeners.add(callback);return()=>listeners.delete(callback)},getLanguage,()=>"en" as Language)}
function interpolate(text:string,values:Record<string,unknown>){return text.replace(/\{\{\s*([^{}]+)\s*\}\}/g,(whole,key)=>key in values?String(values[key]??""):whole)}
export function tr(input:string,values:Record<string,unknown>={}){
  if(!input)return input;
  const leading=input.match(/^\s*/)?.[0]||"",trailing=input.match(/\s*$/)?.[0]||"";
  const key=input.trim();
  const canonical=Object.prototype.hasOwnProperty.call(dictionary,key)?key:reverse.get(key)||key;
  const translated=language==="en"?dictionary[key]||dictionary[canonical]||key:canonical;
  if(language==="en"&&!dictionary[key]&&!reverse.has(key)&&/[A-Za-z]/.test(key))missing.add(key);
  return leading+interpolate(translated,values)+trailing;
}
export function translatedLabels<T extends Record<string,string>>(labels:T):T{return new Proxy(labels,{get(target,key,receiver){const value=Reflect.get(target,key,receiver);return typeof value==="string"?tr(value):value}})}
export const missingTranslations=()=>[...missing];
export function localizedLabel(option:{label:string;value?:string;id?:string}){
  const identity=option.value||option.id||"";
  return /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(identity)?option.label:tr(option.label);
}
