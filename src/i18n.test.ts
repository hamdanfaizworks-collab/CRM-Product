import {afterEach,describe,expect,it} from "vitest";
import {getLanguage,getLocale,localizedLabel,setLanguage,tr,translatedLabels} from "./i18n";
import {dateOnly,displayDate,displayTime,shortMoney} from "./rules";
afterEach(()=>setLanguage("id"));
describe("language settings and data invariants",()=>{
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
