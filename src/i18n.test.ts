// @vitest-environment happy-dom
import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {getLanguage,getLocale,localizedLabel,setLanguage,tr,translatedLabels} from "./i18n";
import {dateOnly,displayDate,displayTime,shortMoney} from "./rules";
const preferenceKey="ttm.crm.language.v1";
beforeEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();localStorage.clear();setLanguage("id")});
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();setLanguage("id");localStorage.clear()});

async function reloadLanguageModule(){vi.resetModules();return import("./i18n")}

describe("English default and stored language choice",()=>{
 it.each([null,"invalid","EN"])("defaults an unset or invalid preference %j to English",async value=>{
  if(value===null)localStorage.removeItem(preferenceKey);else localStorage.setItem(preferenceKey,value);
  const fresh=await reloadLanguageModule();
  expect(fresh.getLanguage()).toBe("en");expect(fresh.getLocale()).toBe("en-GB");
  expect(document.documentElement.lang).toBe("en");expect(fresh.tr("Pelanggan")).toBe("Customers");
 });
 it("preserves an explicit Indonesian selection across a fresh module load",async()=>{
  localStorage.removeItem(preferenceKey);const first=await reloadLanguageModule();
  first.setLanguage("id");expect(localStorage.getItem(preferenceKey)).toBe("id");
  const reloaded=await reloadLanguageModule();expect(reloaded.getLanguage()).toBe("id");
  expect(reloaded.tr("Pelanggan")).toBe("Pelanggan");expect(document.documentElement.lang).toBe("id");
  reloaded.setLanguage("en");const englishReload=await reloadLanguageModule();
  expect(englishReload.getLanguage()).toBe("en");expect(localStorage.getItem(preferenceKey)).toBe("en");
 });
 it("defaults to English when storage cannot be read and still lets the user choose Indonesian",async()=>{
  vi.stubGlobal("localStorage",{
   getItem:()=>{throw new Error("Storage is unavailable")},
   setItem:()=>{throw new Error("Storage is unavailable")},
  });
  const fresh=await reloadLanguageModule();expect(fresh.getLanguage()).toBe("en");
  expect(()=>fresh.setLanguage("id")).not.toThrow();expect(fresh.getLanguage()).toBe("id");
  expect(document.documentElement.lang).toBe("id");
 });
 it.each([{key:preferenceKey,newValue:null},{key:preferenceKey,newValue:"invalid"},{key:null,newValue:null}])("returns to English after a cross-tab preference reset %j",async event=>{
  localStorage.setItem(preferenceKey,"id");const fresh=await reloadLanguageModule();
  window.dispatchEvent(new StorageEvent("storage",event));
  expect(fresh.getLanguage()).toBe("en");expect(document.documentElement.lang).toBe("en");
 });
});
describe("language settings and data invariants",()=>{
 it("preserves explicit canonical labels when another translation shares the same value",()=>{
  setLanguage("id");expect(tr("Team")).toBe("Team");
  setLanguage("en");expect(tr("Team")).toBe("Team");expect(tr("Tim")).toBe("Team");
 });
 it("changes UI text and interpolates values without changing names",()=>{
  setLanguage("en");expect(tr("Pelanggan")).toBe("Customers");
  expect(tr("Selamat datang, {{value0}}",{value0:"Selesai"})).toBe("Welcome, Selesai");
  const reference={value:"00000000-0000-4000-8000-000000000123",label:"Rumah sakit"};
  expect(localizedLabel(reference)).toBe("Rumah sakit");
  expect(localizedLabel({value:"hospital",label:"Rumah sakit"})).toBe("Hospital");
 });
 it("updates enum display labels and keeps enum identities stable",()=>{
  const labels=translatedLabels({completed:"Selesai",submitted:"Menunggu persetujuan"});
  setLanguage("en");expect(labels.completed).toBe("Completed");expect(Object.keys(labels)).toEqual(["completed","submitted"]);
  setLanguage("id");expect(labels.completed).toBe("Selesai");
 });
 it("changes display locale and monetary units while retaining WIB dates",()=>{
  const timestamp="2026-11-10T23:30:00Z";const iso=dateOnly(timestamp);
  setLanguage("en");expect(getLanguage()).toBe("en");expect(getLocale()).toBe("en-GB");
  expect(dateOnly(timestamp)).toBe(iso);expect(displayTime(timestamp)).toMatch(/06[:.]30/);
  expect(displayDate(timestamp,{weekday:"long"})).toBe("Wednesday");
  expect(shortMoney(1000000000)).toMatch(/B$/);expect(shortMoney(1000000)).toMatch(/M$/);
  setLanguage("id");expect(displayDate(timestamp,{weekday:"long"})).toBe("Rabu");
  expect(shortMoney(1000000)).toMatch(/jt$/);
 });
});
