import { describe, expect, it } from "vitest";
import { buildProductAnalytics, PROMOTION_TYPES } from "./product-analytics";
import type { ProductAnalyticsOptions, ProductAnalyticsResult } from "./product-analytics";
import type { Activity, Data, Opportunity, Product, Task } from "./types";

type Input = Pick<Data, "products" | "activities" | "opportunities" | "tasks">;
let sequence = 0;
const id = () => `record-${++sequence}`;
const NOW = Date.parse("2026-11-15T05:00:00Z");
const options: ProductAnalyticsOptions = { from: "2026-11-01", to: "2026-11-15", now: NOW };
const product = (change: Partial<Product> = {}): Product => ({ id: "p1", name: "Imaging product", brand: "TTM", category: "USG", description: "", source_page: 1, specs: {}, active: true, created_at: "2020-01-01T00:00:00Z", ...change });
const activity = (change: Partial<Activity> = {}): Activity => {
  const start = change.start_at ?? "2026-11-10T03:00:00Z";
  const end = Number.isFinite(Date.parse(start)) ? new Date(Date.parse(start) + 3_600_000).toISOString() : "invalid";
  return { id: id(), title: "Promotion", type: "demo", account_id: "account1", product_id: "p1", opportunity_id: null, owner_id: "owner", start_at: start, end_at: end, timezone: "Asia/Jakarta", location: "", objective: "", notes: "", priority: "medium", status: "completed", report: "Promotion report", outcome: "Follow up", follow_up_date: null, participant_ids: [], equipment_ids: [], approval_note: "", budget: 0, actual_cost: 0, attendance_count: 0, ...change };
};
const opportunity = (change: Partial<Opportunity> = {}): Opportunity => ({ id: id(), title: "Opportunity", account_id: "account1", product_id: "p1", owner_id: "owner", stage: "qualified", value: 1_000, probability: 50, expected_close: "2020-01-01", next_step: "Follow up", next_action_due_date: "", notes: "", lost_reason: "", ...change });
const task = (change: Partial<Task> = {}): Task => ({ id: id(), title: "Follow up", due_date: "2026-11-14", assigned_to: "owner", activity_id: null, account_id: null, opportunity_id: null, status: "todo", priority: "medium", notes: "", ...change });
const data = (change: Partial<Input> = {}): Input => ({ products: [product()], activities: [], opportunities: [], tasks: [], ...change });
function valid(result: ProductAnalyticsResult) { expect(result.valid).toBe(true); if (!result.valid) throw new Error(result.error); return result; }
const analyze = (input: Input, change: Partial<ProductAnalyticsOptions> = {}) => valid(buildProductAnalytics(input, { ...options, ...change }));

describe("promotion period validation and WIB boundaries", () => {
  it.each([null, ""])("requires both period endpoints: %s", from => {
    const result = buildProductAnalytics(data(), { ...options, from });
    expect(result).toMatchObject({ valid: false, error: "missing_range", period: null, rows: [] });
  });
  it.each([
    { from: "2026-02-30", to: "2026-03-01" },
    { from: "2026-11-16", to: "2026-11-15" },
    { from: "11/01/2026", to: "2026-11-15" },
    { from: "2026-11-01", to: "not-a-date" },
  ])("rejects invalid calendar ranges %j", range => expect(buildProductAnalytics(data(), { ...options, ...range })).toMatchObject({ valid: false, error: "invalid_range" }));
  it("rejects periods extending beyond today in WIB", () => {
    expect(buildProductAnalytics(data(), { ...options, to: "2026-11-16" })).toMatchObject({ valid: false, error: "future_range" });
    expect(buildProductAnalytics(data(), { ...options, now: "2026-11-15T17:00:00Z", to: "2026-11-16" }).valid).toBe(true);
  });
  it("reports invalid clock and threshold options explicitly", () => {
    expect(buildProductAnalytics(data(), { ...options, now: NaN })).toMatchObject({ valid: false, error: "invalid_now" });
    expect(buildProductAnalytics(data(), { ...options, now: "2026-11-15T12:00:00" })).toMatchObject({ valid: false, error: "invalid_now" });
    for (const change of [{ targetPerPeriod: 0 }, { targetPerPeriod: Infinity }, { targetPerPeriod: 1.5 }, { idleDaysThreshold: -1 }]) expect(buildProductAnalytics(data(), { ...options, ...change })).toMatchObject({ valid: false, error: "invalid_thresholds" });
  });
  it("compares the immediately preceding equal number of calendar days across leap day", () => {
    const result = analyze(data(), { from: "2024-03-01", to: "2024-03-02" });
    expect(result.period).toMatchObject({ days: 2, previousFrom: "2024-02-28", previousTo: "2024-02-29" });
    expect(analyze(data()).period).toMatchObject({ days: 15, previousFrom: "2026-10-17", previousTo: "2026-10-31" });
  });
  it("counts inclusive WIB start days rather than UTC dates or end dates", () => {
    const result = analyze(data({ activities: [
      activity({ start_at: "2026-10-31T17:00:00Z" }), // Nov1 00:00 WIB
      activity({ start_at: "2026-11-15T16:00:00Z", end_at: "2026-11-15T16:30:00Z" }),
      activity({ start_at: "2026-10-31T16:59:00Z", end_at: "2026-10-31T17:10:00Z" }), // Previous start day
      activity({ start_at: "2026-11-15T17:00:00Z" }), // Nov16, future
    ] }), { now: "2026-11-15T16:59:59.999Z" });
    expect(result.rows[0]).toMatchObject({ actual: 2, previous: 1, historyCount: 3 });
  });
});

describe("actual promotional records and catalogue coverage", () => {
  it.each(PROMOTION_TYPES)("counts completed external promotional type %s", type => {
    const row = analyze(data({ activities: [activity({ type })] })).rows[0];
    expect(row.actual).toBe(1); expect(row.countsByType[type]).toBe(1);
  });
  it.each(["internal", "other"] as const)("excludes %s even when completed", type => expect(analyze(data({ activities: [activity({ type })] })).summary.actual).toBe(0));
  it.each(["draft", "submitted", "approved", "in_progress", "rejected", "cancelled"] as const)("does not inflate actuals with %s", status => expect(analyze(data({ activities: [activity({ status })] })).summary.actual).toBe(0));
  it("excludes future-dated completed starts and completed intervals not yet ended", () => {
    const result = analyze(data({ activities: [activity({ start_at: "2026-11-16T02:00:00Z" }), activity({ start_at: "2026-11-15T04:00:00Z", end_at: "2026-11-15T06:00:00Z" })] }));
    expect(result.rows[0]).toMatchObject({ actual: 0, historyCount: 0, lastCompletedAt: null });
  });
  it("includes every active product with zeroes in the denominator and optionally includes inactive products", () => {
    const input = data({ products: [product(), product({ id: "p2", active: undefined }), product({ id: "p3", active: false })], activities: [activity(), activity({ product_id: "p3" })] });
    const result = analyze(input);
    expect(result.rows.map(row => row.product.id)).toEqual(["p1", "p2"]);
    expect(result.summary).toMatchObject({ products: 2, productsWithActivity: 1, productsWithoutActivity: 1, coveragePercent: 50 });
    expect(result.coverage.excludedInactiveProducts).toBe(1);
    expect(analyze(input, { includeInactive: true }).summary).toMatchObject({ products: 3, actual: 2 });
  });
  it("reports missing and unknown product links without inferring activity product from its opportunity", () => {
    const opp = opportunity();
    const result = analyze(data({ opportunities: [opp], activities: [activity({ product_id: null, opportunity_id: opp.id }), activity({ product_id: "outside-catalogue" }), activity({ type: "internal", product_id: null })] }));
    expect(result.summary.actual).toBe(0);
    expect(result.coverage).toMatchObject({ unlinkedCompleted: 1, unknownProductCompleted: 1 });
  });
  it("counts unique known accounts once and preserves the per-type breakdown", () => {
    const row = analyze(data({ activities: [activity(), activity({ type: "training" }), activity({ account_id: "account2" }), activity({ account_id: null })] })).rows[0];
    expect(row).toMatchObject({ actual: 4, uniqueAccounts: 2, countsByType: { demo: 3, training: 1 } });
  });
  it("skips invalid or ambiguous timestamps and reversed intervals explicitly", () => {
    const result = analyze(data({ activities: [activity({ start_at: "invalid" }), activity({ start_at: "2026-11-10T10:00:00", end_at: "2026-11-10T11:00:00" }), activity({ end_at: "2026-11-09T00:00:00Z" })] }));
    expect(result.summary.actual).toBe(0); expect(result.coverage.invalidActivityDates).toBe(3);
  });
  it("supports an empty catalogue without NaN or infinite coverage", () => expect(analyze(data({ products: [] })).summary).toMatchObject({ products: 0, coveragePercent: 0, actual: 0 }));
});

describe("future plan and in-progress snapshots", () => {
  it("uses the next rolling 30 days regardless of the selected historical period", () => {
    const future = new Date(NOW + 86_400_000).toISOString();
    const boundary = new Date(NOW + 30 * 86_400_000).toISOString();
    const result = analyze(data({ activities: [
      activity({ start_at: future, status: "submitted" }), activity({ start_at: boundary, status: "approved" }),
      activity({ start_at: new Date(NOW + 30 * 86_400_000 + 1).toISOString(), status: "approved" }),
      activity({ start_at: future, status: "draft" }), activity({ start_at: future, status: "cancelled" }),
      activity({ start_at: new Date(NOW).toISOString(), status: "approved" }),
      activity({ start_at: future, type: "internal", status: "approved" }),
    ] }), { from: "2026-01-01", to: "2026-01-15" });
    expect(result.plannedWindowDays).toBe(30);
    expect(result.rows[0]).toMatchObject({ actual: 0, planned: 2, nextPlannedAt: future, flags: { upcomingPlan: true } });
  });
  it("separates current in-progress records, including overdue ones, from actual and planned", () => {
    const row = analyze(data({ activities: [activity({ status: "in_progress", start_at: "2026-10-01T00:00:00Z" }), activity({ status: "in_progress", start_at: "2026-11-16T00:00:00Z" })] })).rows[0];
    expect(row).toMatchObject({ inProgress: 1, actual: 0, planned: 0 });
  });
  it("exposes missing planned links in snapshot coverage, outside the selected period", () => {
    const future = "2026-11-16T00:00:00Z";
    const result = analyze(data({ activities: [activity({ status: "approved", product_id: null, start_at: future }), activity({ status: "submitted", product_id: "unknown", start_at: future })] }), { from: "2026-01-01", to: "2026-01-02" });
    expect(result.coverage).toMatchObject({ unlinkedPlanned: 1, unknownProductPlanned: 1 });
  });
});

describe("member scope, pipeline and task snapshots", () => {
  it("scopes activities/history by owner OR participant while pipeline uses owner and tasks use assignee", () => {
    const linked = activity({ owner_id: "someone-else", participant_ids: ["member"] });
    const ownOpp = opportunity({ owner_id: "member" });
    const result = analyze(data({ activities: [linked, activity(), activity({ owner_id: "member", start_at: "2026-10-20T00:00:00Z" })], opportunities: [ownOpp, opportunity()], tasks: [task({ assigned_to: "member", activity_id: linked.id }), task({ opportunity_id: ownOpp.id })] }), { memberId: "member" });
    expect(result.rows[0]).toMatchObject({ actual: 1, previous: 1, historyCount: 2, activePipelineCount: 1, openTasks: 1 });
  });
  it("includes all current active pipeline regardless of closing date, excluding won/lost", () => {
    const row = analyze(data({ opportunities: [opportunity({ expected_close: "2020-01-01" }), opportunity({ expected_close: "", stage: "demo", value: 2_000, probability: 25 }), opportunity({ stage: "won" }), opportunity({ stage: "lost" })] })).rows[0];
    expect(row).toMatchObject({ activePipelineCount: 2, activePipelineValue: 3_000, weightedPipelineValue: 1_000 });
  });
  it("deduplicates each open task per product across both links and duplicate inputs", () => {
    const act = activity(), opp = opportunity();
    const linked = task({ activity_id: act.id, opportunity_id: opp.id });
    const row = analyze(data({ activities: [act], opportunities: [opp], tasks: [linked, linked, task({ activity_id: act.id, status: "done" }), task({ opportunity_id: opp.id, status: "cancelled" }), task({ activity_id: "missing" }), task({ activity_id: act.id, due_date: "2026-11-15" })] })).rows[0];
    expect(row).toMatchObject({ openTasks: 2, overdueTasks: 1 });
  });
  it("can associate one task to two explicitly linked products, once per product", () => {
    const act = activity(), opp = opportunity({ product_id: "p2" });
    const result = analyze(data({ products: [product(), product({ id: "p2" })], activities: [act], opportunities: [opp], tasks: [task({ activity_id: act.id, opportunity_id: opp.id })] }));
    expect(result.rows.map(row => row.openTasks)).toEqual([1, 1]);
  });
});

describe("trend and attention interpretation", () => {
  it("uses an explicit new/none trend when the prior count is zero, never Infinity", () => {
    expect(analyze(data({ activities: [activity()] })).rows[0]).toMatchObject({ trend: "new", percentChange: null, delta: 1 });
    expect(analyze(data()).rows[0]).toMatchObject({ trend: "none", percentChange: null, delta: 0 });
  });
  it("calculates increasing, flat and decreasing comparisons from actuals only", () => {
    const previous = activity({ start_at: "2026-10-20T00:00:00Z" });
    expect(analyze(data({ activities: [previous, activity(), activity()] })).rows[0]).toMatchObject({ trend: "up", percentChange: 100, delta: 1 });
    expect(analyze(data({ activities: [previous, activity()] })).rows[0]).toMatchObject({ trend: "flat", percentChange: 0 });
    expect(analyze(data({ activities: [previous] })).rows[0]).toMatchObject({ trend: "down", percentChange: -100 });
  });
  it("uses all past history and WIB calendar-day idle age, including prior-period records", () => {
    const row = analyze(data({ activities: [activity({ start_at: "2026-08-16T15:00:00Z", end_at: "2026-08-16T17:00:00Z" })] })).rows[0];
    expect(row).toMatchObject({ actual: 0, lastCompletedAt: "2026-08-16T17:00:00Z", idleDays: 90, attention: "idle", flags: { idle: true } });
    expect(analyze(data({ activities: [activity({ start_at: "2026-08-16T15:00:00Z", end_at: "2026-08-16T17:00:00Z" })] }), { idleDaysThreshold: 91 }).rows[0].flags.idle).toBe(false);
  });
  it("marks no history as no record, and newly added catalogue entries separately, while exposing below-target planning flags", () => {
    const result = analyze(data({ products: [product(), product({ id: "p2", created_at: "2026-11-05T00:00:00Z" })] }));
    expect(result.rows[0]).toMatchObject({ attention: "no_record", idleDays: null, flags: { noHistory: true, belowTarget: true, idle: false } });
    expect(result.rows[1]).toMatchObject({ attention: "new", newInPeriod: true, flags: { newProduct: true, belowTarget: true } });
    expect(result.summary).toMatchObject({ attentionProducts: 2, noHistoryProducts: 2, newProducts: 1 });
  });
  it("flags catalogue entries created after a historical period without claiming they then underperformed", () => {
    expect(analyze(data({ products: [product({ created_at: "2026-11-05T00:00:00Z" })] }), { from: "2026-10-01", to: "2026-10-15" }).rows[0]).toMatchObject({ createdAfterPeriod: true, newInPeriod: false, attention: "new" });
  });
  it("honours an adjustable target and does not let a future plan satisfy it", () => {
    const input = data({ activities: [activity(), activity({ status: "approved", start_at: "2026-11-16T00:00:00Z" })] });
    expect(analyze(input).rows[0]).toMatchObject({ actual: 1, planned: 1, attention: "below_target", flags: { belowTarget: true } });
    expect(analyze(input, { targetPerPeriod: 1 }).rows[0]).toMatchObject({ attention: "on_target", flags: { belowTarget: false } });
  });
  it("does not mutate supplied catalogue, activity, opportunity or task records", () => {
    const act = activity(), opp = opportunity();
    const input = data({ activities: [act], opportunities: [opp], tasks: [task({ activity_id: act.id })] });
    const before = structuredClone(input);
    analyze(input); expect(input).toEqual(before);
  });
});
