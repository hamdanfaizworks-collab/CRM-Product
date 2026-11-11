// localized-ui-v1
import { tr, localizedLabel, useLanguage } from "./i18n";
import React, { useState } from "react";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  List,
  Clock,
  MapPin,
  Users,
  Box,
  Paperclip,
  Download,
  CheckCircle2,
  ArrowRight,
  Edit3,
} from "lucide-react";
import { useCRM, supabase, friendlyError } from "./store";
import {
  PageHead,
  Badge,
  Empty,
  EntityForm,
  Dialog,
  SearchToolbar,
  type Field,
} from "./ui";
import {
  ACTIVITY_LABEL,
  STATUS_LABEL,
  type Activity,
  type ActivityStatus,
} from "./types";
import {
  dateOnly,
  displayDate,
  displayTime,
  localInput,
  fromLocal,
  isManager,
  conflictFor,
  money,
} from "./rules";
const options = (o: Record<string, string>) =>
  Object.entries(o).map(([value, label]) => ({ value, label: tr(label) }));
export function ActivityPage() {
  useLanguage();
  const { data, profile, demo, save, notify, refresh } = useCRM();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [member, setMember] = useState("");
  const [view, setView] = useState<"month" | "list">("month");
  const [month, setMonth] = useState(dateOnly().slice(0, 7));
  const [selectedDay, setSelectedDay] = useState("");
  const [edit, setEdit] = useState<Partial<Activity> | null>(null);
  const [detailId, setDetailId] = useState("");
  const [action, setAction] = useState<{
    status: ActivityStatus;
    title: string;
  } | null>(null);
  const [report, setReport] = useState(false);
  const [task, setTask] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const manager = isManager(profile.role);
  const writable = profile.role !== "viewer";
  const person = (id: string) =>
    data.profiles.find((p) => p.id === id)?.full_name || "—";
  const account = (id: string | null) =>
    data.accounts.find((a) => a.id === id)?.name || tr("Internal / tanpa instansi");
  const product = (id: string | null) =>
    data.products.find((p) => p.id === id)?.name || "—";
  const activePeople = data.profiles
    .filter((p) => p.active)
    .map((p) => ({ value: p.id, label: p.full_name }));
  const relation = (rows: { id: string; name?: string; title?: string }[]) =>
    rows.map((r) => ({ value: r.id, label: r.name || r.title || r.id }));
  const filtered = data.activities.filter(
    (a) =>
      (!type || a.type === type) &&
      (!status || a.status === status) &&
      (!member || [a.owner_id, ...a.participant_ids].includes(member)) &&
      `${a.title} ${account(a.account_id)} ${a.location}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const inMonth = filtered
    .filter(
      (a) =>
        dateOnly(a.start_at).slice(0, 7) <= month &&
        dateOnly(a.end_at).slice(0, 7) >= month,
    )
    .sort((a, b) => a.start_at.localeCompare(b.start_at));
  const agenda = selectedDay
    ? inMonth.filter(
        (a) =>
          dateOnly(a.start_at) <= selectedDay &&
          dateOnly(a.end_at) >= selectedDay,
      )
    : inMonth;
  const detail = data.activities.find((a) => a.id === detailId);
  const editable =
    detail &&
    writable &&
    (manager ||
      [detail.owner_id, ...detail.participant_ids].includes(profile.id));
  const startMonth = new Date(month + "-01T12:00:00Z");
  const startOffset = (startMonth.getUTCDay() + 6) % 7;
  const days = new Date(
    startMonth.getUTCFullYear(),
    startMonth.getUTCMonth() + 1,
    0,
  ).getUTCDate();
  const changeMonth = (n: number) => {
    const d = new Date(startMonth);
    d.setUTCMonth(d.getUTCMonth() + n);
    setMonth(d.toISOString().slice(0, 7));
    setSelectedDay("");
  };
  const newActivity = () =>
    setEdit({
      title: "",
      type: "demo",
      status: "draft",
      owner_id: profile.id,
      start_at: new Date(
        `${selectedDay || dateOnly()}T09:00:00+07:00`,
      ).toISOString(),
      end_at: new Date(
        `${selectedDay || dateOnly()}T10:00:00+07:00`,
      ).toISOString(),
      timezone: "Asia/Jakarta",
      participant_ids: [],
      equipment_ids: [],
      priority: "medium",
      budget: 0,
      actual_cost: 0,
      attendance_count: 0,
      approval_note: "",
      objective: "",
      notes: "",
      report: "",
      outcome: "",
    });
  const fields: Field[] = [
    { key: "title", label: tr("Nama kegiatan"), required: true },
    {
      key: "type",
      label: tr("Jenis kegiatan"),
      type: "select",
      options: options(ACTIVITY_LABEL),
      required: true,
    },
    {
      key: "start_at",
      label: tr("Mulai (WIB)"),
      type: "datetime-local",
      required: true,
    },
    {
      key: "end_at",
      label: tr("Selesai (WIB)"),
      type: "datetime-local",
      required: true,
    },
    {
      key: "account_id",
      label: tr("Pelanggan / instansi"),
      type: "select",
      options: relation(data.accounts),
    },
    {
      key: "product_id",
      label: tr("Produk"),
      type: "select",
      options: relation(data.products.filter((p) => p.active !== false)),
    },
    {
      key: "opportunity_id",
      label: tr("Peluang terkait"),
      type: "select",
      options: relation(data.opportunities),
    },
    {
      key: "owner_id",
      label: tr("Koordinator"),
      type: "select",
      required: true,
      options: activePeople,
    },
    { key: "location", label: tr("Lokasi / tautan meeting") },
    {
      key: "priority",
      label: tr("Prioritas"),
      type: "select",
      required: true,
      options: options({ low: "Rendah", medium: "Sedang", high: "Tinggi" }),
    },
    {
      key: "participant_ids",
      label: tr("Anggota yang ditugaskan"),
      type: "multiselect",
      options: activePeople,
    },
    {
      key: "equipment_ids",
      label: tr("Unit demo"),
      type: "multiselect",
      options: data.equipment
        .filter(
          (e) =>
            e.status === "available" || edit?.equipment_ids?.includes(e.id),
        )
        .map((e) => ({
          value: e.id,
          label: `${e.code} • ${e.name}${e.status !== "available" ? tr(" (tidak tersedia)") : ""}`,
        })),
    },
    {
      key: "objective",
      label: tr("Tujuan kegiatan"),
      type: "textarea",
      required: true,
    },
    {
      key: "notes",
      label: tr("Konteks / catatan"),
      type: "textarea",
      help: tr("Wajib diisi jika kegiatan pelanggan tanpa instansi. Jangan masukkan data pasien."),
    },
    { key: "budget", label: tr("Anggaran (Rp)"), type: "number", min: 0 },
  ];
  async function statusChange(next: ActivityStatus, note?: string) {
    if (!detail) return;
    setBusy(true);
    setError("");
    try {
      const changes = {
        id: detail.id,
        status: next,
        ...(note !== undefined ? { approval_note: note } : {}),
      };
      const conflict = conflictFor({ ...detail, ...changes }, data.activities);
      if (conflict) throw Error(conflict);
      await save("activities", changes);
      setAction(null);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  async function upload(file: File) {
    if (!detail) return;
    if (demo) {
      notify(
        tr("Unggah bukti tersedia pada lingkungan Supabase aktif; file tidak diunggah pada demo."),
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      const allowed = [
        "application/pdf",
        "image/png",
        "image/jpeg",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      if (!allowed.includes(file.type) || file.size > 10485760 || !file.size)
        throw Error(tr("Pilih PDF, JPG, PNG, atau DOCX, maksimum 10 MB."));
      const path = `${detail.id}/${crypto.randomUUID()}.${
        file.name
          .split(".")
          .pop()
          ?.replace(/[^a-zA-Z0-9]/g, "") || "bin"
      }`;
      const { error: e } = await supabase!.storage
        .from("activity-evidence")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (e) throw e;
      try {
        await save("activity_attachments", {
          activity_id: detail.id,
          file_name: file.name,
          storage_path: path,
          size_bytes: file.size,
          mime_type: file.type,
        });
      } catch (metadataError) {
        throw Error(
          tr("File telah diunggah, tetapi metadata gagal disimpan. Hubungi admin untuk rekonsiliasi object {{value0}}. {{value1}}", { value0: (path), value1: (friendlyError(metadataError)) }),
        );
      }
      await refresh();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHead
        eyebrow={tr("TEAM OPERATIONS")}
        title={tr("Kalender & aktivitas")}
        description={tr("Rencanakan kegiatan, atur penugasan, dan jaga setiap tindak lanjut.")}
        action={
          writable && (
            <button className="btn primary" onClick={newActivity}>
              <Plus size={17} />{tr("Tambah kegiatan")}</button>
          )
        }
      />
      <SearchToolbar
        search={search}
        setSearch={setSearch}
        placeholder={tr("Cari kegiatan, pelanggan, lokasi…")}
      >
        <select
          aria-label={tr("Jenis kegiatan")}
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="">{tr("Semua jenis")}</option>
          {options(ACTIVITY_LABEL).map((o) => (
            <option key={o.value} value={o.value}>
              {localizedLabel(o)}
            </option>
          ))}
        </select>
        <select
          aria-label={tr("Status kegiatan")}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">{tr("Semua status")}</option>
          {options(STATUS_LABEL).map((o) => (
            <option key={o.value} value={o.value}>
              {localizedLabel(o)}
            </option>
          ))}
        </select>
        <select
          aria-label={tr("Anggota tim")}
          value={member}
          onChange={(e) => setMember(e.target.value)}
        >
          <option value="">{tr("Seluruh tim")}</option>
          {activePeople.map((o) => (
            <option key={o.value} value={o.value}>
              {localizedLabel(o)}
            </option>
          ))}
        </select>
      </SearchToolbar>
      <div className="card calendar-card">
        <div className="calendar-toolbar">
          <div className="month-switch">
            <button
              className="icon-btn"
              aria-label={tr("Bulan sebelumnya")}
              onClick={() => changeMonth(-1)}
            >
              <ChevronLeft size={18} />
            </button>
            <h2>
              {displayDate(month + "-01", { month: "long", year: "numeric" })}
            </h2>
            <button
              className="icon-btn"
              aria-label={tr("Bulan berikutnya")}
              onClick={() => changeMonth(1)}
            >
              <ChevronRight size={18} />
            </button>
            <button
              className="btn small secondary"
              onClick={() => {
                setMonth(dateOnly().slice(0, 7));
                setSelectedDay(dateOnly());
              }}
            >{tr("Hari ini")}</button>
          </div>
          <div className="segmented">
            <button
              className={view === "month" ? "selected" : ""}
              onClick={() => setView("month")}
            >
              <CalendarDays size={16} />{tr("Bulan")}</button>
            <button
              className={view === "list" ? "selected" : ""}
              onClick={() => setView("list")}
            >
              <List size={16} />{tr("Agenda")}</button>
          </div>
        </div>
        {view === "month" ? (
          <div className="calendar-scroll">
            <div className="calendar-grid">
              {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((d) => (
                <div key={d} className="weekday">
                  {tr(d)}
                </div>
              ))}
              {Array.from({ length: startOffset + days }, (_, i) => {
                const n = i - startOffset + 1;
                if (n < 1) return <div key={i} className="day muted-day" />;
                const date = `${month}-${String(n).padStart(2, "0")}`;
                const events = inMonth.filter(
                  (a) =>
                    dateOnly(a.start_at) <= date && dateOnly(a.end_at) >= date,
                );
                return (
                  <div
                    className={`day ${date === dateOnly() ? "today" : ""} ${selectedDay === date ? "picked" : ""}`}
                    key={date}
                  >
                    <button
                      className="day-number"
                      aria-label={tr("Lihat {{value0}}", { value0: (displayDate(date)) })}
                      onClick={() => {
                        setSelectedDay(date);
                        setView("list");
                      }}
                    >
                      {n}
                    </button>
                    {events.slice(0, 3).map((a) => (
                      <button
                        key={a.id}
                        className={`calendar-event event-${a.type}`}
                        onClick={() => {
                          setDetailId(a.id);
                          setError("");
                        }}
                        title={a.title}
                      >
                        <span>{displayTime(a.start_at)}</span>
                        {a.title}
                      </button>
                    ))}
                    {events.length > 3 && (
                      <button
                        className="calendar-more"
                        onClick={() => {
                          setSelectedDay(date);
                          setView("list");
                        }}
                      >
                        {tr("+{{value0}} kegiatan", {value0: events.length - 3})}</button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <>
            {selectedDay && (
              <div className="filter-note">{tr("Agenda {{value0}}", {value0: displayDate(selectedDay)})}
                <button className="text-btn" onClick={() => setSelectedDay("")}>{tr("Tampilkan sebulan")}</button>
              </div>
            )}
            {agenda.length ? (
              <div className="agenda-list">
                {agenda.map((a) => (
                  <button
                    className="agenda-row"
                    key={a.id}
                    onClick={() => {
                      setDetailId(a.id);
                      setError("");
                    }}
                  >
                    <div className="agenda-date">
                      <strong>
                        {displayDate(a.start_at, { day: "2-digit" })}
                      </strong>
                      <span>{displayDate(a.start_at, { month: "short" })}</span>
                    </div>
                    <div className="agenda-main">
                      <Badge value={a.type} label={ACTIVITY_LABEL[a.type]} />
                      <h3>{a.title}</h3>
                      <p>
                        {account(a.account_id)} • {person(a.owner_id)}
                      </p>
                    </div>
                    <div className="agenda-time">
                      <span>
                        <Clock size={14} />
                        {displayTime(a.start_at)}–{displayTime(a.end_at)} WIB</span>
                      <Badge value={a.status} label={STATUS_LABEL[a.status]} />
                    </div>
                    <ArrowRight size={16} />
                  </button>
                ))}
              </div>
            ) : (
              <Empty
                title={tr("Belum ada kegiatan")}
                description={tr("Tambahkan rencana kegiatan atau sesuaikan filter.")}
              />
            )}
          </>
        )}
        <div className="card-foot">
          {tr("{{value0}} kegiatan pada bulan ini", {value0: inMonth.length})}{" "}
          <span>{tr("Seluruh jadwal ditampilkan dalam WIB (UTC+7).")}</span>
        </div>
      </div>
      {edit && (
        <EntityForm
          title={edit.id ? (tr("Edit kegiatan")) : (tr("Rencanakan kegiatan"))}
          initial={{
            ...edit,
            start_at: localInput(edit.start_at!),
            end_at: localInput(edit.end_at!),
          }}
          fields={fields}
          onClose={() => setEdit(null)}
          onSave={async (row) => {
            const payload = {
              ...row,
              start_at: fromLocal(row.start_at),
              end_at: fromLocal(row.end_at),
              timezone: "Asia/Jakarta",
            };
            if (new Date(payload.end_at) <= new Date(payload.start_at))
              throw Error(tr("Waktu selesai harus setelah mulai."));
            if (
              !payload.account_id &&
              payload.type !== "internal" &&
              !payload.notes?.trim()
            )
              throw Error(
                tr("Pilih instansi atau isi konteks kegiatan pada catatan."),
              );
            const op = data.opportunities.find(
              (o) => o.id === payload.opportunity_id,
            );
            if (op && payload.account_id !== op.account_id)
              throw Error(tr("Peluang yang dipilih berasal dari instansi lain."));
            if (edit.id && ["approved", "in_progress"].includes(edit.status!)) {
              if (
                [
                  "start_at",
                  "end_at",
                  "owner_id",
                  "participant_ids",
                  "equipment_ids",
                ].some(
                  (k) =>
                    JSON.stringify(payload[k]) !==
                    JSON.stringify((edit as any)[k]),
                )
              )
                payload.status = "submitted";
            }
            const a = await save("activities", payload);
            setEdit(null);
            setDetailId(a.id);
          }}
        />
      )}
      {detail && !edit && !action && !report && !task && (
        <Dialog title={tr("Detail kegiatan")} onClose={() => setDetailId("")} wide>
          <div className="dialog-body">
            <div className="detail-title">
              <div>
                <Badge
                  value={detail.type}
                  label={ACTIVITY_LABEL[detail.type]}
                />
                <h2>{detail.title}</h2>
                <p>{account(detail.account_id)}</p>
              </div>
              <Badge
                value={detail.status}
                label={STATUS_LABEL[detail.status]}
              />
            </div>
            <div className="detail-grid">
              <div>
                <span className="detail-label">
                  <CalendarDays size={15} />{tr("Jadwal")}</span>
                <strong>
                  {displayDate(detail.start_at)}, {displayTime(detail.start_at)} WIB</strong>
                <p>{tr("s.d. ")}{displayDate(detail.end_at)},{" "}
                  {displayTime(detail.end_at)} WIB</p>
              </div>
              <div>
                <span className="detail-label">
                  <MapPin size={15} />{tr("Lokasi")}</span>
                <strong>{detail.location || (tr("Belum ditentukan"))}</strong>
              </div>
              <div>
                <span className="detail-label">
                  <Users size={15} />{tr("Tim pelaksana")}</span>
                <strong>{tr("{{value0}} (koordinator)", {value0: person(detail.owner_id)})}</strong>
                <p>
                  {detail.participant_ids.map(person).join(", ") || (tr("Tanpa anggota tambahan"))}
                </p>
              </div>
              <div>
                <span className="detail-label">
                  <Box size={15} />{tr("Produk & unit")}</span>
                <strong>{product(detail.product_id)}</strong>
                <p>
                  {detail.equipment_ids
                    .map((id) => data.equipment.find((e) => e.id === id)?.code)
                    .join(", ") || (tr("Tanpa reservasi unit"))}
                </p>
              </div>
            </div>
            <div className="detail-section">
              <h3>{tr("Tujuan")}</h3>
              <p className="pre-wrap">{detail.objective || "—"}</p>
              {detail.notes && <p className="muted pre-wrap">{detail.notes}</p>}
            </div>
            <div className="detail-section">
              <h3>{tr("Anggaran & pelaksanaan")}</h3>
              <p>{tr("Anggaran {{value0}} · Realisasi {{value1}} · Peserta {{value2}}", {value0: money(detail.budget), value1: money(detail.actual_cost), value2: detail.attendance_count || 0})}</p>
            </div>
            {detail.approval_note && (
              <div className="info-banner">{detail.approval_note}</div>
            )}
            {detail.report && (
              <div className="detail-section">
                <h3>{tr("Laporan pelaksanaan")}</h3>
                <p className="pre-wrap">{detail.report}</p>
                <h4>{tr("Hasil & feedback")}</h4>
                <p className="pre-wrap">{detail.outcome}</p>
                {detail.follow_up_date && (
                  <p>{tr("Target tindak lanjut: {{value0}}", {value0: displayDate(detail.follow_up_date)})}</p>
                )}
              </div>
            )}
            <div className="detail-section">
              <h3>
                <Paperclip size={16} />{tr("Dokumen pendukung")}</h3>
              {data.activity_attachments
                .filter((f) => f.activity_id === detail.id)
                .map((f) => (
                  <div className="file-row" key={f.id}>
                    <span>
                      {f.file_name}
                      <small>{Math.ceil(f.size_bytes / 1024)} KB</small>
                    </span>
                    <button
                      className="icon-btn"
                      aria-label={tr("Unduh {{value0}}", { value0: (f.file_name) })}
                      onClick={async () => {
                        try {
                          const { data: d, error: e } = await supabase!.storage
                            .from("activity-evidence")
                            .createSignedUrl(f.storage_path, 60);
                          if (e) throw e;
                          window.open(
                            d.signedUrl,
                            "_blank",
                            "noopener,noreferrer",
                          );
                        } catch (e) {
                          setError(friendlyError(e));
                        }
                      }}
                    >
                      <Download size={17} />
                    </button>
                  </div>
                ))}
              {editable && (
                <label className="upload-btn">
                  <Paperclip size={15} />
                  {busy ? (tr("Mengunggah…")) : (tr("Tambah PDF, JPG, PNG, DOCX (maks. 10 MB)"))}
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.docx"
                    disabled={busy || demo}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void upload(f);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
              )}
              {demo && (
                <small>{tr("Unggah bukti memerlukan lingkungan Supabase aktif.")}</small>
              )}
            </div>
            {error && (
              <div role="alert" className="form-error">
                {error}
              </div>
            )}
          </div>
          <div className="dialog-footer wrap">
            {editable && detail.status !== "completed" && (
              <button
                className="btn secondary"
                disabled={busy}
                onClick={() => {
                  setEdit(detail);
                  setError("");
                }}
              >
                <Edit3 size={15} />{tr("Edit")}</button>
            )}
            {editable && ["draft", "rejected"].includes(detail.status) && (
              <button
                className="btn primary"
                disabled={busy}
                onClick={() => void statusChange("submitted")}
              >{tr("Ajukan persetujuan")}</button>
            )}
            {manager && detail.status === "submitted" && (
              <>
                <button
                  className="btn secondary"
                  onClick={() =>
                    setAction({ status: "rejected", title: "Tolak pengajuan" })
                  }
                >{tr("Tolak")}</button>
                <button
                  className="btn primary"
                  disabled={busy}
                  onClick={() => void statusChange("approved")}
                >
                  <CheckCircle2 size={15} />{tr("Setujui")}</button>
              </>
            )}
            {editable && detail.status === "approved" && (
              <button
                className="btn primary"
                disabled={busy}
                onClick={() => void statusChange("in_progress")}
              >{tr("Mulai kegiatan")}</button>
            )}
            {editable &&
              ["in_progress", "completed"].includes(detail.status) && (
                <button className="btn primary" onClick={() => setReport(true)}>
                  {detail.status === "completed" ? (tr("Edit laporan")) : (tr("Selesaikan & laporkan"))}
                </button>
              )}
            {editable && (
              <button className="btn secondary" onClick={() => setTask(true)}>{tr("Buat tindak lanjut")}</button>
            )}
            {editable &&
              !["completed", "cancelled"].includes(detail.status) && (
                <button
                  className="text-btn danger"
                  onClick={() =>
                    setAction({
                      status: "cancelled",
                      title: "Batalkan kegiatan",
                    })
                  }
                >{tr("Batalkan")}</button>
              )}
          </div>
        </Dialog>
      )}
      {detail && action && (
        <EntityForm
          title={tr(action.title)}
          initial={{ approval_note: "" }}
          fields={[
            {
              key: "approval_note",
              label: tr("Alasan / catatan"),
              type: "textarea",
              required: true,
            },
          ]}
          onClose={() => setAction(null)}
          onSave={async (row) => {
            await save("activities", {
              id: detail.id,
              status: action.status,
              approval_note: row.approval_note,
            });
            setAction(null);
          }}
        />
      )}
      {detail && report && (
        <EntityForm
          title={tr("Laporan pelaksanaan")}
          initial={detail}
          fields={[
            {
              key: "report",
              label: tr("Ringkasan pelaksanaan, kendala, dan next action"),
              type: "textarea",
              required: true,
              help: tr("Minimum 10 karakter. Hindari data pasien."),
            },
            {
              key: "outcome",
              label: tr("Hasil dibanding tujuan & feedback pelanggan"),
              type: "textarea",
              required: true,
            },
            {
              key: "attendance_count",
              label: tr("Jumlah peserta"),
              type: "number",
              min: 0,
            },
            {
              key: "actual_cost",
              label: tr("Biaya aktual (Rp)"),
              type: "number",
              min: 0,
            },
            {
              key: "follow_up_date",
              label: tr("Target tindak lanjut"),
              type: "date",
            },
          ]}
          onClose={() => setReport(false)}
          onSave={async (row) => {
            if (row.report.trim().length < 10)
              throw Error(tr("Ringkasan laporan minimum 10 karakter."));
            await save("activities", { ...row, status: "completed" });
            setReport(false);
          }}
        />
      )}
      {detail && task && (
        <EntityForm
          title={tr("Tindak lanjut kegiatan")}
          initial={{
            title: "",
            assigned_to: detail.owner_id,
            due_date: detail.follow_up_date || dateOnly(),
            priority: "medium",
            status: "todo",
            activity_id: detail.id,
            account_id: detail.account_id,
            opportunity_id: detail.opportunity_id,
            notes: "",
          }}
          fields={[
            { key: "title", label: tr("Tindak lanjut"), required: true },
            {
              key: "assigned_to",
              label: tr("Penanggung jawab"),
              type: "select",
              options: activePeople,
              required: true,
            },
            { key: "due_date", label: tr("Tenggat"), type: "date", required: true },
            {
              key: "priority",
              label: tr("Prioritas"),
              type: "select",
              options: options({
                low: "Rendah",
                medium: "Sedang",
                high: "Tinggi",
              }),
              required: true,
            },
            { key: "notes", label: tr("Catatan"), type: "textarea" },
          ]}
          onClose={() => setTask(false)}
          onSave={async (row) => {
            await save("tasks", row);
            setTask(false);
          }}
        />
      )}
    </>
  );
}
