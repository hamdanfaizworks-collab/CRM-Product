import type { Activity, Data, Stage, Role, Profile, ReportingLine } from "./types";
import { getLocale, getLanguage, tr } from "./i18n";
export const isManager = (role: Role) =>
  role === "director" || role === "admin";
export function canReviewActivity(profile: Profile, activity: Pick<Activity, "owner_id" | "status">, lines: ReportingLine[], profiles: Profile[] = []) {
  if (!profile.active || profile.role === "viewer" || activity.status !== "submitted" || profile.id === activity.owner_id) return false;
  if (profiles.length && !profiles.some(person => person.id === profile.id && person.active && person.role !== "viewer")) return false;
  return profile.role === "director" || lines.some(line => line.member_id === activity.owner_id && line.supervisor_id === profile.id);
}
export const money = (n: number) =>
  new Intl.NumberFormat(getLocale(), {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);
export const shortMoney = (n: number) =>
  Math.abs(n) >= 1e9
    ? `${getLanguage()==="en"?"IDR":"Rp"} ${(n / 1e9).toLocaleString(getLocale(), { maximumFractionDigits: 1 })} ${getLanguage()==="en"?"B":"M"}`
    : Math.abs(n) >= 1e6
      ? `${getLanguage()==="en"?"IDR":"Rp"} ${(n / 1e6).toLocaleString(getLocale(), { maximumFractionDigits: 1 })} ${getLanguage()==="en"?"M":"jt"}`
      : money(n);
export const dateOnly = (v: string | Date = new Date(), tz = "Asia/Jakarta") =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(v));
export const displayDate = (
  v?: string | null,
  opts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  },
) =>
  v
    ? new Intl.DateTimeFormat(getLocale(), {
        ...opts,
        timeZone: "Asia/Jakarta",
      }).format(new Date(v.length === 10 ? v + "T00:00:00+07:00" : v))
    : "—";
export const displayTime = (v: string) =>
  new Intl.DateTimeFormat(getLocale(), {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  }).format(new Date(v));
export const localInput = (v: string) => {
  const d = new Date(new Date(v).getTime() + 7 * 3600000);
  return d.toISOString().slice(0, 16);
};
export const fromLocal = (v: string) => new Date(v + "+07:00").toISOString();
export const activeStages: Stage[] = [
  "lead",
  "qualified",
  "demo",
  "proposal",
  "negotiation",
];
export const holdingStatuses = ["submitted", "approved", "in_progress"];
export const overlaps = (a: string, b: string, c: string, d: string) =>
  new Date(a) < new Date(d) && new Date(c) < new Date(b);
export function conflictFor(a: Partial<Activity>, activities: Activity[]) {
  if (!a.start_at || !a.end_at) return "";
  if (new Date(a.end_at) <= new Date(a.start_at))
    return tr("Waktu selesai harus setelah waktu mulai.");
  if (!holdingStatuses.includes(a.status || "draft")) return "";
  const people = new Set([a.owner_id, ...(a.participant_ids || [])]);
  const other = activities.find(
    (x) =>
      x.id !== a.id &&
      holdingStatuses.includes(x.status) &&
      overlaps(a.start_at!, a.end_at!, x.start_at, x.end_at) &&
      ([x.owner_id, ...x.participant_ids].some((p) => people.has(p)) ||
        x.equipment_ids.some((e) => a.equipment_ids?.includes(e))),
  );
  return other
    ? tr("Jadwal bentrok dengan “{{value0}}”. Pilih waktu, personel, atau unit lain.",{value0:other.title})
    : "";
}
export function csvText(rows: unknown[][]) {
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map((value) => {
            let s = String(value ?? "");
            if (/^[\s]*[=+@\-]/.test(s)) s = "'" + s;
            return '"' + s.replaceAll('"', '""') + '"';
          })
          .join(","),
      )
      .join("\r\n")
  );
}
export function downloadCSV(name: string, rows: unknown[][]) {
  const url = URL.createObjectURL(
    new Blob([csvText(rows)], { type: "text/csv;charset=utf-8;" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function pipelineStats(data: Data) {
  const active = data.opportunities.filter((o) =>
    activeStages.includes(o.stage),
  );
  return {
    count: active.length,
    total: active.reduce((s, o) => s + Number(o.value), 0),
    weighted: active.reduce(
      (s, o) => s + (Number(o.value) * o.probability) / 100,
      0,
    ),
    won: data.opportunities
      .filter((o) => o.stage === "won")
      .reduce((s, o) => s + Number(o.value), 0),
  };
}
