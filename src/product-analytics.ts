import type { Activity, Data, Product } from "./types";

export const PROMOTION_TYPES = ["presentation", "demo", "exhibition", "training", "refreshment", "visit"] as const;
export type PromotionType = (typeof PROMOTION_TYPES)[number];
export type PromotionCounts = Record<PromotionType, number>;
export type PromotionTrend = "up" | "down" | "flat" | "new" | "none";
export type ProductAttention = "new" | "no_record" | "idle" | "no_current_activity" | "below_target" | "on_target";
export interface ProductAnalyticsOptions {
  from: string | null;
  to: string | null;
  /** Explicit clock keeps results deterministic and independent of the browser timezone. */
  now: number | string | Date;
  memberId?: string;
  includeInactive?: boolean;
  targetPerPeriod?: number;
  idleDaysThreshold?: number;
}
export interface ProductAnalyticsPeriod {
  from: string;
  to: string;
  days: number;
  previousFrom: string;
  previousTo: string;
  todayWib: string;
}
export interface ProductPromotionRow {
  product: Product;
  actual: number;
  previous: number;
  planned: number;
  nextPlannedAt: string | null;
  inProgress: number;
  countsByType: PromotionCounts;
  previousByType: PromotionCounts;
  delta: number;
  percentChange: number | null;
  trend: PromotionTrend;
  /** Scheduled end of the last completed promotion, not a workflow completion timestamp. */
  lastCompletedAt: string | null;
  idleDays: number | null;
  historyCount: number;
  uniqueAccounts: number;
  /** Current active pipeline snapshot; deliberately independent of expected_close/from/to. */
  activePipelineCount: number;
  activePipelineValue: number;
  weightedPipelineValue: number;
  /** Open task snapshot; a task linked through both sources counts once per product. */
  openTasks: number;
  overdueTasks: number;
  newInPeriod: boolean;
  createdAfterPeriod: boolean;
  flags: { noActivity: boolean; belowTarget: boolean; idle: boolean; noHistory: boolean; upcomingPlan: boolean; newProduct: boolean };
  attention: ProductAttention;
}
export interface ProductAnalyticsSummary {
  products: number;
  actual: number;
  previous: number;
  planned: number;
  inProgress: number;
  productsWithActivity: number;
  productsWithoutActivity: number;
  /** Percent of included catalogue products with at least one actual promotion. */
  coveragePercent: number;
  attentionProducts: number;
  noHistoryProducts: number;
  newProducts: number;
  delta: number;
  percentChange: number | null;
  trend: PromotionTrend;
}
export interface ProductAnalyticsCoverage {
  /** Qualifying current-period completed promotions with no explicit product_id. */
  unlinkedCompleted: number;
  unknownProductCompleted: number;
  unlinkedPlanned: number;
  unknownProductPlanned: number;
  invalidActivityDates: number;
  excludedInactiveProducts: number;
}
type ProductAnalyticsData = Pick<Data, "products" | "activities" | "opportunities" | "tasks">;
export type ProductAnalyticsError = "missing_range" | "invalid_range" | "future_range" | "invalid_now" | "invalid_thresholds";
export type ProductAnalyticsResult = {
  valid: true; error: null; period: ProductAnalyticsPeriod; rows: ProductPromotionRow[];
  summary: ProductAnalyticsSummary; coverage: ProductAnalyticsCoverage; plannedWindowDays: 30;
} | {
  valid: false; error: ProductAnalyticsError; period: null; rows: ProductPromotionRow[];
  summary: ProductAnalyticsSummary; coverage: ProductAnalyticsCoverage; plannedWindowDays: 30;
};

const DAY = 86_400_000;
const WIB = 7 * 3_600_000;
const activeStages = new Set(["lead", "qualified", "demo", "proposal", "negotiation"]);
const promotionTypes = new Set<string>(PROMOTION_TYPES);
const emptyCounts = (): PromotionCounts => ({ presentation: 0, demo: 0, exhibition: 0, training: 0, refreshment: 0, visit: 0 });
const emptySummary = (): ProductAnalyticsSummary => ({ products: 0, actual: 0, previous: 0, planned: 0, inProgress: 0, productsWithActivity: 0, productsWithoutActivity: 0, coveragePercent: 0, attentionProducts: 0, noHistoryProducts: 0, newProducts: 0, delta: 0, percentChange: null, trend: "none" });
const emptyCoverage = (): ProductAnalyticsCoverage => ({ unlinkedCompleted: 0, unknownProductCompleted: 0, unlinkedPlanned: 0, unknownProductPlanned: 0, invalidActivityDates: 0, excludedInactiveProducts: 0 });
function dayNumber(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return null;
  const time = Date.parse(value + "T00:00:00Z");
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value ? time / DAY : null;
}
function dateFromDay(day: number): string { return new Date(day * DAY).toISOString().slice(0, 10); }
function timestamp(value: string): number {
  // Reject timezone-less timestamps rather than silently interpreting the host timezone.
  return /T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? Date.parse(value) : NaN;
}
function wibDay(time: number): number { return Math.floor((time + WIB) / DAY); }
function trend(actual: number, previous: number): { delta: number; percentChange: number | null; trend: PromotionTrend } {
  return { delta: actual - previous, percentChange: previous ? (actual - previous) / previous * 100 : null,
    trend: previous === 0 ? actual === 0 ? "none" : "new" : actual === previous ? "flat" : actual > previous ? "up" : "down" };
}
function activityInMemberScope(activity: Activity, memberId?: string): boolean {
  return !memberId || activity.owner_id === memberId || activity.participant_ids.includes(memberId);
}

/**
 * Actual promotion counts use scheduled start dates in inclusive WIB calendar days.
 * Only completed external promotional types whose entire scheduled interval is past qualify.
 * Planned = future submitted/approved starts within 30 rolling days of now, independent of the period.
 * In-progress is a current snapshot of qualifying started activities, including overdue ones.
 * History/idle use the same member scope across all past history. Product associations are explicit.
 * Pipeline/open tasks are current snapshots, not historical reconstructions or conversion claims.
 * Callers filter returned rows for brand/category and recompute scoped summaries, preserving
 * the full catalogue here so filtered products are not misreported as unknown associations.
 */
export function buildProductAnalytics(data: ProductAnalyticsData, options: ProductAnalyticsOptions): ProductAnalyticsResult {
  const invalid = (error: ProductAnalyticsError): ProductAnalyticsResult => ({ valid: false, error, period: null, rows: [], summary: emptySummary(), coverage: emptyCoverage(), plannedWindowDays: 30 });
  if (!options.from || !options.to) return invalid("missing_range");
  const from = dayNumber(options.from), to = dayNumber(options.to);
  if (from === null || to === null || from > to) return invalid("invalid_range");
  const days = to - from + 1, previousFrom = from - days, previousTo = from - 1;
  if (dayNumber(dateFromDay(previousFrom)) === null) return invalid("invalid_range");
  const now = typeof options.now === "number" ? options.now : options.now instanceof Date ? options.now.getTime() : timestamp(options.now);
  if (!Number.isFinite(now) || !Number.isFinite(new Date(now).getTime())) return invalid("invalid_now");
  const target = options.targetPerPeriod ?? 2, idleThreshold = options.idleDaysThreshold ?? 90;
  if (!Number.isSafeInteger(target) || target < 1 || !Number.isSafeInteger(idleThreshold) || idleThreshold < 1) return invalid("invalid_thresholds");
  const today = wibDay(now);
  if (to > today) return invalid("future_range");
  const period: ProductAnalyticsPeriod = { from: options.from, to: options.to, days, previousFrom: dateFromDay(previousFrom), previousTo: dateFromDay(previousTo), todayWib: dateFromDay(today) };
  const coverage = emptyCoverage();
  coverage.excludedInactiveProducts = options.includeInactive ? 0 : data.products.filter(product => product.active === false).length;
  const catalogue = new Set(data.products.map(product => product.id));
  const rows = data.products.filter(product => options.includeInactive || product.active !== false).map(product => {
    const created = product.created_at ? timestamp(product.created_at) : NaN;
    const createdDay = Number.isFinite(created) && created <= now ? wibDay(created) : null;
    const newInPeriod = createdDay !== null && createdDay >= from && createdDay <= to;
    const createdAfterPeriod = createdDay !== null && createdDay > to;
    const row: ProductPromotionRow = { product, actual: 0, previous: 0, planned: 0, nextPlannedAt: null, inProgress: 0,
      countsByType: emptyCounts(), previousByType: emptyCounts(), ...trend(0, 0), lastCompletedAt: null, idleDays: null, historyCount: 0, uniqueAccounts: 0,
      activePipelineCount: 0, activePipelineValue: 0, weightedPipelineValue: 0, openTasks: 0, overdueTasks: 0,
      newInPeriod, createdAfterPeriod, flags: { noActivity: true, belowTarget: false, idle: false, noHistory: true, upcomingPlan: false, newProduct: newInPeriod || createdAfterPeriod }, attention: "no_record" };
    return row;
  });
  const byProduct = new Map(rows.map(row => [row.product.id, row]));
  const accountIds = new Map(rows.map(row => [row.product.id, new Set<string>()]));
  const lastCompletedTimes = new Map<string, number>();
  for (const activity of data.activities) {
    if (!promotionTypes.has(activity.type) || !activityInMemberScope(activity, options.memberId)) continue;
    const start = timestamp(activity.start_at), end = timestamp(activity.end_at);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) { coverage.invalidActivityDates++; continue; }
    const startDay = wibDay(start), current = startDay >= from && startDay <= to;
    const completed = activity.status === "completed" && start <= now && end <= now;
    const planned = (activity.status === "submitted" || activity.status === "approved") && start > now && start <= now + 30 * DAY;
    if (!activity.product_id) {
      if (current && completed) coverage.unlinkedCompleted++;
      if (planned) coverage.unlinkedPlanned++;
    } else if (!catalogue.has(activity.product_id)) {
      if (current && completed) coverage.unknownProductCompleted++;
      if (planned) coverage.unknownProductPlanned++;
    }
    const row = activity.product_id ? byProduct.get(activity.product_id) : undefined;
    if (!row) continue;
    if (completed) {
      row.historyCount++;
      if (end > (lastCompletedTimes.get(row.product.id) ?? -Infinity)) { row.lastCompletedAt = activity.end_at; lastCompletedTimes.set(row.product.id, end); }
      if (current) { row.actual++; row.countsByType[activity.type as PromotionType]++; if (activity.account_id) accountIds.get(row.product.id)!.add(activity.account_id); }
      else if (startDay >= previousFrom && startDay <= previousTo) { row.previous++; row.previousByType[activity.type as PromotionType]++; }
    }
    if (planned) {
      row.planned++;
      if (!row.nextPlannedAt || start < timestamp(row.nextPlannedAt)) row.nextPlannedAt = activity.start_at;
    }
    if (activity.status === "in_progress" && start <= now) row.inProgress++;
  }
  for (const opportunity of data.opportunities) {
    if (!activeStages.has(opportunity.stage) || (options.memberId && opportunity.owner_id !== options.memberId)) continue;
    const row = byProduct.get(opportunity.product_id); if (!row) continue;
    const amount = Number(opportunity.value), probability = Number(opportunity.probability);
    row.activePipelineCount++;
    row.activePipelineValue += Number.isFinite(amount) && amount >= 0 ? amount : 0;
    row.weightedPipelineValue += Number.isFinite(amount) && amount >= 0 && Number.isFinite(probability) ? amount * Math.min(100, Math.max(0, probability)) / 100 : 0;
  }
  const activities = new Map(data.activities.map(activity => [activity.id, activity]));
  const opportunities = new Map(data.opportunities.map(opportunity => [opportunity.id, opportunity]));
  const countedTasks = new Map(rows.map(row => [row.product.id, new Set<string>()]));
  for (const task of data.tasks) {
    if ((task.status !== "todo" && task.status !== "in_progress") || (options.memberId && task.assigned_to !== options.memberId)) continue;
    const productIds = new Set([task.activity_id ? activities.get(task.activity_id)?.product_id : null, task.opportunity_id ? opportunities.get(task.opportunity_id)?.product_id : null]);
    for (const id of productIds) {
      const row = id ? byProduct.get(id) : undefined;
      if (!row || countedTasks.get(row.product.id)!.has(task.id)) continue;
      countedTasks.get(row.product.id)!.add(task.id); row.openTasks++;
      const due = dayNumber(task.due_date); if (due !== null && due < today) row.overdueTasks++;
    }
  }
  for (const row of rows) {
    Object.assign(row, trend(row.actual, row.previous));
    row.uniqueAccounts = accountIds.get(row.product.id)!.size;
    row.idleDays = lastCompletedTimes.has(row.product.id) ? today - wibDay(lastCompletedTimes.get(row.product.id)!) : null;
    row.flags = { noActivity: row.actual === 0, belowTarget: row.actual < target,
      idle: row.idleDays !== null && row.idleDays >= idleThreshold, noHistory: row.historyCount === 0, upcomingPlan: row.planned > 0, newProduct: row.flags.newProduct };
    row.attention = row.flags.noHistory ? row.flags.newProduct ? "new" : "no_record" : row.flags.idle ? "idle" :
      row.flags.newProduct && row.flags.belowTarget ? "new" : row.actual === 0 ? "no_current_activity" : row.flags.belowTarget ? "below_target" : "on_target";
  }
  const summary = emptySummary();
  summary.products = rows.length;
  for (const row of rows) {
    summary.actual += row.actual; summary.previous += row.previous; summary.planned += row.planned; summary.inProgress += row.inProgress;
    if (row.actual > 0) summary.productsWithActivity++;
    if (row.flags.noHistory) summary.noHistoryProducts++;
    if (row.flags.newProduct) summary.newProducts++;
    if (row.attention !== "on_target") summary.attentionProducts++;
  }
  summary.productsWithoutActivity = rows.length - summary.productsWithActivity;
  summary.coveragePercent = rows.length ? summary.productsWithActivity / rows.length * 100 : 0;
  Object.assign(summary, trend(summary.actual, summary.previous));
  return { valid: true, error: null, period, rows, summary, coverage, plannedWindowDays: 30 };
}
