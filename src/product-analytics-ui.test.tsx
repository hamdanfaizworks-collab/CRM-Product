// @vitest-environment happy-dom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const boundary = vi.hoisted(() => ({ context: null as any }));
vi.mock("./store", () => ({ useCRM: () => boundary.context, friendlyError: (error: unknown) => String(error) }));
vi.mock("./rules", async importOriginal => ({ ...await importOriginal<typeof import("./rules")>(), downloadCSV: vi.fn() }));
import { ProductAnalyticsPage } from "./ProductAnalyticsPage";
import { demoData, demoId } from "./demo";
import { downloadCSV } from "./rules";
import { setLanguage } from "./i18n";
import type { Activity, Product } from "./types";

const NOW = "2026-11-15T05:00:00Z";
const ids = { a: demoId(2101), zero: demoId(2102), prior: demoId(2103), inactive: demoId(2104), owner: demoId(2201), other: demoId(2202) };
function product(id: string, name: string, category = "USG", active = true): Product {
  return { id, name, category, brand: "TechnoMed", description: "User description", source_page: 4, specs: {}, active, created_at: "2026-01-01T00:00:00Z" };
}
function activity(id: number, productId: string, change: Partial<Activity> = {}): Activity {
  return { id: demoId(id), title: "Promotion fixture", type: "presentation", product_id: productId, account_id: null, opportunity_id: null, owner_id: ids.owner, start_at: "2026-11-01T02:00:00Z", end_at: "2026-11-01T03:00:00Z", timezone: "Asia/Jakarta", location: "Fixture", objective: "Fixture", notes: "", priority: "medium", status: "completed", report: "Done", outcome: "Follow up", follow_up_date: null, participant_ids: [], equipment_ids: [], approval_note: "", budget: 0, actual_cost: 0, attendance_count: 0, ...change };
}
const table = () => within(screen.getByRole("region", { name: "Tabel promosi produk; geser horizontal untuk kolom lainnya" }));
beforeEach(() => {
  setLanguage("id"); vi.clearAllMocks();
  const data = demoData();
  const template = data.profiles[0];
  data.profiles = [{ ...template, id: ids.owner, full_name: "Presentasi", role: "director", active: true }, { ...template, id: ids.other, full_name: "Other member", role: "product_specialist", active: true }];
  data.products = [product(ids.a, "Presentasi"), product(ids.zero, "Zero MRI", "MRI"), product(ids.prior, "Prior USG"), product(ids.inactive, "Archived CT", "CT", false)];
  data.activities = [
    activity(2301, ids.a),
    activity(2302, ids.a, { type: "demo", start_at: "2026-07-01T02:00:00Z", end_at: "2026-07-01T03:00:00Z" }),
    activity(2303, ids.prior, { start_at: "2026-07-15T02:00:00Z", end_at: "2026-07-15T03:00:00Z" }),
    activity(2304, ids.inactive),
    activity(2305, ids.a, { status: "approved", start_at: "2026-11-17T02:00:00Z", end_at: "2026-11-17T03:00:00Z" }),
    activity(2306, ids.zero, { status: "submitted", start_at: "2026-11-18T02:00:00Z", end_at: "2026-11-18T03:00:00Z" }),
  ];
  data.opportunities = []; data.tasks = [];
  boundary.context = { data, profile: data.profiles[0], demo: true, save: vi.fn(), notify: vi.fn() };
});
afterEach(() => { cleanup(); setLanguage("id"); });

describe("product analytics decision flows", () => {
  it("starts with 90 inclusive WIB days and keeps zero-activity products in coverage and the table", () => {
    render(<ProductAnalyticsPage now={NOW}/>);
    expect((screen.getByLabelText("Dari tanggal") as HTMLInputElement).value).toBe("2026-08-18");
    expect((screen.getByLabelText("Sampai tanggal") as HTMLInputElement).value).toBe("2026-11-15");
    expect(screen.getByText("1 dari 3 produk memiliki kegiatan selesai")).toBeTruthy();
    const grid = table(); expect(grid.getByText("Zero MRI")).toBeTruthy(); expect(grid.getByText("Presentasi", { selector: "button" })).toBeTruthy(); expect(grid.queryByText("Archived CT")).toBeNull();
    expect(grid.getAllByRole("row")).toHaveLength(4);
  });
  it("supports presentation-specific sort and zero-presentation filtering without changing catalogue KPI scope", async () => {
    const user = userEvent.setup(); render(<ProductAnalyticsPage now={NOW}/>);
    await user.selectOptions(screen.getByRole("combobox", { name: "Urutkan produk" }), "presentations_most");
    expect(within(table().getAllByRole("row")[1]).getByText("Presentasi", { selector: "button" })).toBeTruthy();
    await user.selectOptions(screen.getByRole("combobox", { name: "Filter perhatian" }), "no_presentation");
    expect(table().queryByText("Presentasi", { selector: "button" })).toBeNull();
    expect(table().getByText("Zero MRI")).toBeTruthy(); expect(table().getByText("Prior USG")).toBeTruthy();
    expect(screen.getByText("1 dari 3 produk memiliki kegiatan selesai")).toBeTruthy();
  });
  it("exports filtered zero rows with period, snapshot, scope and methodology metadata", async () => {
    const user = userEvent.setup(); render(<ProductAnalyticsPage now={NOW}/>);
    await user.selectOptions(screen.getByRole("combobox", { name: "Kategori produk" }), "MRI");
    expect(screen.getByText("0 dari 1 produk memiliki kegiatan selesai")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Ekspor CSV" }));
    expect(downloadCSV).toHaveBeenCalledOnce();
    const [filename, rows] = vi.mocked(downloadCSV).mock.calls[0];
    expect(filename).toBe("TTM-product-promotion-2026-08-18-2026-11-15.csv");
    expect(rows).toContainEqual(["Periode (WIB)", "2026-08-18", "2026-11-15"]);
    expect(rows).toContainEqual(["Kategori", "MRI"]);
    expect(rows.some(row => row[0] === "Metode kegiatan selesai")).toBe(true);
    const records = rows.filter(row => row[0] === ids.zero || row[0] === ids.a);
    expect(records).toHaveLength(1); expect(records[0].slice(0, 6)).toEqual([ids.zero, "Zero MRI", "TechnoMed", "MRI", "Ya", 0]);
    expect(records[0][11]).toBe(0); expect(records[0][16]).toBe(1);
  });
  it("distinguishes a scoped missing record from proof of no promotion and opens an unsaved plan for that product", async () => {
    const user = userEvent.setup(), plan = vi.fn(); render(<ProductAnalyticsPage now={NOW} onPlanActivity={plan}/>);
    await user.click(screen.getByRole("button", { name: "Lihat analitik Zero MRI" }));
    const detail = within(screen.getByRole("dialog"));
    expect(detail.getByText("Belum ada promosi selesai yang memenuhi kriteria dalam catatan yang tersedia untuk cakupan anggota ini.")).toBeTruthy();
    expect(detail.getByText("1 rencana 30 hari · 0 sedang berlangsung")).toBeTruthy();
    await user.click(detail.getByRole("button", { name: "Rencanakan kegiatan" }));
    expect(plan).toHaveBeenCalledWith(ids.zero); expect(boundary.context.save).not.toHaveBeenCalled(); expect(screen.queryByRole("dialog")).toBeNull();
  });
  it.each(["viewer", "inactive"])("disables planning for %s while leaving analytics readable", async mode => {
    const user = userEvent.setup(), plan = vi.fn();
    if (mode === "viewer") boundary.context.profile = { ...boundary.context.profile, role: "viewer" };
    render(<ProductAnalyticsPage now={NOW} onPlanActivity={plan}/>);
    if (mode === "inactive") await user.selectOptions(screen.getByRole("combobox", { name: "Cakupan katalog" }), "all");
    await user.click(screen.getByRole("button", { name: mode === "inactive" ? "Lihat analitik Archived CT" : "Lihat analitik Zero MRI" }));
    const button = within(screen.getByRole("dialog")).getByRole("button", { name: "Rencanakan kegiatan" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true); await user.click(button); expect(plan).not.toHaveBeenCalled(); expect(boundary.context.save).not.toHaveBeenCalled();
  });
  it("rejects a future analysis end without showing misleading totals or allowing CSV", () => {
    render(<ProductAnalyticsPage now={NOW}/>);
    fireEvent.change(screen.getByLabelText("Sampai tanggal"), { target: { value: "2026-11-16" } });
    expect(screen.getByRole("alert").textContent).toBe("Tanggal akhir analisis tidak boleh melewati hari ini (WIB).");
    expect((screen.getByRole("button", { name: "Ekspor CSV" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole("region", { name: "Tabel promosi produk; geser horizontal untuk kolom lainnya" })).toBeNull();
    expect(downloadCSV).not.toHaveBeenCalled();
  });
  it("filters activities by member owner or participant while preserving the full catalogue denominator", async () => {
    const user = userEvent.setup();
    boundary.context.data.activities.push(activity(2307, ids.zero, { owner_id: ids.other }));
    boundary.context.data.activities.push(activity(2308, ids.prior, { owner_id: ids.owner, participant_ids: [ids.other] }));
    render(<ProductAnalyticsPage now={NOW}/>);
    await user.selectOptions(screen.getByRole("combobox", { name: "Anggota tim" }), ids.other);
    expect(screen.getByText("2 dari 3 produk memiliki kegiatan selesai")).toBeTruthy();
    await user.selectOptions(screen.getByRole("combobox", { name: "Filter perhatian" }), "no_current");
    expect(table().getByText("Presentasi", { selector: "button" })).toBeTruthy();
    expect(table().queryByText("Zero MRI")).toBeNull(); expect(table().queryByText("Prior USG")).toBeNull();
  });
});
