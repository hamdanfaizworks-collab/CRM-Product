import {useEffect, useState} from "react";
import type {Data, Profile} from "./types";
import {canReviewActivity, isManager} from "./rules";

export type ReminderReason = "activity_start_soon" | "activity_start_overdue" | "activity_end_soon" | "activity_end_overdue" | "task_due" | "task_overdue" | "approval_pending";
export interface AgendaReminder {
  id: string;
  entity_id: string;
  kind: "activity" | "task" | "approval";
  urgency: "overdue" | "upcoming" | "pending";
  reason: ReminderReason;
  title: string;
  due_at: string;
}
export function buildReminders(data: Pick<Data, "activities" | "tasks" | "reporting_lines" | "profiles">, profile: Profile, now = Date.now()): AgendaReminder[] {
  if (!profile.active) return [];
  const reminders: AgendaReminder[] = [];
  for (const activity of data.activities) {
    if (canReviewActivity(profile, activity, data.reporting_lines, data.profiles)) reminders.push({id: `review:${activity.id}:${activity.submitted_at || activity.start_at}`, entity_id: activity.id, kind: "approval", urgency: "pending", reason: "approval_pending", title: activity.title, due_at: activity.start_at});
    if (!["submitted", "approved", "in_progress"].includes(activity.status)) continue;
    const visible = isManager(profile.role) || activity.owner_id === profile.id || activity.participant_ids.includes(profile.id) || data.reporting_lines.some(line => line.member_id === activity.owner_id && line.supervisor_id === profile.id);
    if (!visible) continue;
    const ongoing = activity.status === "in_progress";
    const due = ongoing ? activity.end_at : activity.start_at;
    const time = Date.parse(due);
    if (!Number.isFinite(time) || time > now + 24 * 60 * 60 * 1000) continue;
    const overdue = time < now;
    reminders.push({id: `activity:${activity.id}:${due}:${overdue ? "overdue" : "upcoming"}`, entity_id: activity.id, kind: "activity", urgency: overdue ? "overdue" : "upcoming", reason: ongoing ? overdue ? "activity_end_overdue" : "activity_end_soon" : overdue ? "activity_start_overdue" : "activity_start_soon", title: activity.title, due_at: due});
  }
  for (const task of data.tasks) {
    if (!task.due_date || ["done", "cancelled"].includes(task.status) || (!isManager(profile.role) && task.assigned_to !== profile.id)) continue;
    const due = `${task.due_date}T23:59:59+07:00`;
    const time = Date.parse(due);
    if (!Number.isFinite(time) || time > now + 24 * 60 * 60 * 1000) continue;
    const overdue = time < now;
    reminders.push({id: `task:${task.id}:${due}:${overdue ? "overdue" : "upcoming"}`, entity_id: task.id, kind: "task", urgency: overdue ? "overdue" : "upcoming", reason: overdue ? "task_overdue" : "task_due", title: task.title, due_at: due});
  }
  const order = {overdue: 0, upcoming: 1, pending: 2};
  return reminders.sort((a, b) => order[a.urgency] - order[b.urgency] || Date.parse(a.due_at) - Date.parse(b.due_at) || a.id.localeCompare(b.id));
}
export function useReminderClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const update = () => setNow(Date.now());
    const timer = setInterval(update, 30000);
    window.addEventListener("focus", update);
    return () => {clearInterval(timer); window.removeEventListener("focus", update);};
  }, []);
  return now;
}
