import {CalendarClock, CheckSquare, ShieldCheck} from "lucide-react";
import {tr} from "./i18n";
import {displayDate} from "./rules";
import type {AgendaReminder, ReminderReason} from "./reminders";
const reasons: Record<ReminderReason, string> = {
  activity_start_soon: "Mulai dalam 24 jam",
  activity_start_overdue: "Jadwal mulai telah lewat",
  activity_end_soon: "Berakhir dalam 24 jam",
  activity_end_overdue: "Jadwal selesai telah lewat",
  task_due: "Tenggat tindak lanjut dalam 24 jam",
  task_overdue: "Tindak lanjut melewati tenggat",
  approval_pending: "Menunggu persetujuan Anda",
};
export function ReminderList({items, onOpen}: {items: AgendaReminder[]; onOpen: (item: AgendaReminder) => void}) {
  return <div className="notification-list agenda-reminders">
    {!items.length && <p>{tr("Tidak ada agenda atau tindak lanjut yang perlu perhatian.")}</p>}
    {items.slice(0, 40).map(item => <button key={item.id} onClick={() => onOpen(item)}>
      <span className={`notice-icon ${item.urgency === "overdue" ? "amber" : "blue"}`}>{item.kind === "approval" ? <ShieldCheck size={19}/> : item.kind === "task" ? <CheckSquare size={19}/> : <CalendarClock size={19}/>}</span>
      <div><strong>{item.title}</strong><p><span className={`reminder-state ${item.urgency}`}>{tr(reasons[item.reason])}</span><br/>{displayDate(item.due_at, {day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"})} WIB</p></div>
    </button>)}
    {items.length > 40 && <small>{tr("Menampilkan 40 dari {{value0}} pengingat. Buka modul terkait untuk daftar lengkap.", {value0: items.length})}</small>}
    <small>{tr("Pengingat diperbarui selama aplikasi terbuka. Agenda dan tugas memakai zona waktu WIB.")}</small>
  </div>;
}
