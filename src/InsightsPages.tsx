// localized-ui-v1
import { getLanguage, getLocale, tr } from "./i18n";
import { useState, type ReactNode } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { useCRM } from "./store";
import { Badge, Empty, PageHead, StatCard } from "./ui";
import {
  ACTIVITY_LABEL,
  ROLE_LABEL,
  STATUS_LABEL,
  type Activity,
  type Profile,
} from "./types";
import {
  activeStages,
  dateOnly,
  displayDate,
  displayTime,
  downloadCSV,
  holdingStatuses,
  money,
  shortMoney,
} from "./rules";

function currentMonth() {
  const today = dateOnly();
  const [year, month] = today.slice(0, 7).split("-").map(Number);
  return {
    from: today.slice(0, 7) + "-01",
    to: new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10),
  };
}

function inPeriod(value: string | null | undefined, from: string, to: string) {
  return !!value && (!from || value >= from) && (!to || value <= to);
}

function assigned(activity: Activity, member: string) {
  return (
    !member ||
    activity.owner_id === member ||
    activity.participant_ids.includes(member)
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function MemberName({ member }: { member: Profile }) {
  return (
    <div className="text-button">
      <span className="avatar" aria-hidden="true">
        {initials(member.full_name)}
      </span>
      <span>
        <strong>{member.full_name}</strong>
        <small className="muted">
          {ROLE_LABEL[member.role]}
          {!member.active ? (tr(" · Nonaktif")) : ("")}
        </small>
      </span>
    </div>
  );
}

function PeriodToolbar({
  from,
  to,
  member,
  setFrom,
  setTo,
  setMember,
  members,
  children,
}: {
  from: string;
  to: string;
  member: string;
  setFrom: (value: string) => void;
  setTo: (value: string) => void;
  setMember: (value: string) => void;
  members: Profile[];
  children?: ReactNode;
}) {
  return (
    <div className="toolbar insights-filters">
      <div className="toolbar-filters">
        <label className="field">
          <span>{tr("Dari tanggal")}</span>
          <input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(event) => setFrom(event.target.value)}
          />
        </label>
        <label className="field">
          <span>{tr("Sampai tanggal")}</span>
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(event) => setTo(event.target.value)}
          />
        </label>
        <label className="field">
          <span>{tr("Anggota tim")}</span>
          <select
            value={member}
            onChange={(event) => setMember(event.target.value)}
          >
            <option value="">{tr("Seluruh tim")}</option>
            {members.map((person) => (
              <option key={person.id} value={person.id}>
                {person.full_name}
                {person.active ? ("") : (tr(" (nonaktif)"))}
              </option>
            ))}
          </select>
        </label>
        {children}
      </div>
      <button
        className="btn secondary"
        onClick={() => {
          const month = currentMonth();
          setFrom(month.from);
          setTo(month.to);
        }}
      >{tr("Bulan ini")}</button>
    </div>
  );
}

function RangeNote({ from, to }: { from: string; to: string }) {
  return (
    <span>
      {from ? (displayDate(from)) : (tr("Awal data"))} –{" "}
      {to ? (displayDate(to)) : (tr("Tanpa batas akhir"))}
    </span>
  );
}

function QuantityBar({
  label,
  value,
  maximum,
}: {
  label: string;
  value: number;
  maximum: number;
}) {
  return (
    <div
      className="progress-bar"
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={Math.max(maximum, 1)}
      aria-valuenow={value}
    >
      <span
        style={{
          display: "block",
          width: `${maximum ? (value / maximum) * 100 : 0}%`,
          height: "100%",
          minHeight: 7,
          background: "#174B8A",
          borderRadius: "inherit",
        }}
      />
    </div>
  );
}

export function DashboardPage({
  navigate,
}: {
  navigate: (page: string) => void;
}) {
  const { data, profile } = useCRM();
  const [from, setFrom] = useState(() => currentMonth().from);
  const [to, setTo] = useState(() => currentMonth().to);
  const [member, setMember] = useState("");
  const invalidRange = !!from && !!to && from > to;
  const today = dateOnly();
  const now = Date.now();
  const activities = invalidRange
    ? []
    : data.activities.filter(
        (activity) =>
          inPeriod(dateOnly(activity.start_at), from, to) &&
          assigned(activity, member),
      );
  const opportunities = invalidRange
    ? []
    : data.opportunities.filter(
        (opportunity) =>
          inPeriod(opportunity.expected_close, from, to) &&
          (!member || opportunity.owner_id === member),
      );
  const pipeline = opportunities.filter((opportunity) =>
    activeStages.includes(opportunity.stage),
  );
  const pipelineValue = pipeline.reduce(
    (sum, opportunity) => sum + Number(opportunity.value),
    0,
  );
  const weightedValue = pipeline.reduce(
    (sum, opportunity) =>
      sum + (Number(opportunity.value) * opportunity.probability) / 100,
    0,
  );
  const tasks = invalidRange
    ? []
    : data.tasks.filter(
        (task) =>
          inPeriod(task.due_date, from, to) &&
          (!member || task.assigned_to === member),
      );
  const overdue = tasks.filter(
    (task) =>
      task.due_date < today && !["done", "cancelled"].includes(task.status),
  );
  const awaiting = activities.filter(
    (activity) => activity.status === "submitted",
  );
  const completed = activities.filter(
    (activity) => activity.status === "completed",
  );
  const agenda = activities
    .filter(
      (activity) =>
        holdingStatuses.includes(activity.status) &&
        new Date(activity.end_at).getTime() > now,
    )
    .sort(
      (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
    )
    .slice(0, 5);
  const reserved = activities.filter((activity) =>
    holdingStatuses.includes(activity.status),
  );
  const workload = data.profiles
    .filter(
      (person) =>
        (!member || person.id === member) &&
        (person.active ||
          activities.some((activity) => assigned(activity, person.id))),
    )
    .map((person) => {
      const bookings = reserved.filter((activity) =>
        assigned(activity, person.id),
      );
      return {
        person,
        count: bookings.length,
        hours: bookings.reduce(
          (sum, activity) =>
            sum +
            (new Date(activity.end_at).getTime() -
              new Date(activity.start_at).getTime()) /
              3600000,
          0,
        ),
      };
    })
    .sort(
      (a, b) =>
        b.count - a.count ||
        a.person.full_name.localeCompare(b.person.full_name, getLocale()),
    );
  const maximumLoad = Math.max(1, ...workload.map((row) => row.count));
  const distribution = Object.entries(ACTIVITY_LABEL)
    .map(([type, label]) => ({
      type,
      label,
      count: activities.filter((activity) => activity.type === type).length,
    }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count);
  const personName = (id: string) =>
    data.profiles.find((person) => person.id === id)?.full_name ||
    tr("Anggota tidak ditemukan");

  return (
    <>
      <PageHead
        eyebrow={tr("TTM PRODUCT MANAGEMENT WORKSPACE")}
        title={tr("Selamat datang, {{value0}}", { value0: (profile.full_name.split(" ")[0]) })}
        action={
          <button
            className="btn primary"
            onClick={() => navigate("activities")}
          >
            <CalendarDays size={17} />{tr("Buka kalender")}</button>
        }
      />
      <PeriodToolbar
        from={from}
        to={to}
        member={member}
        setFrom={setFrom}
        setTo={setTo}
        setMember={setMember}
        members={data.profiles}
      />
      {invalidRange && (
        <div className="form-error" role="alert">{tr("Tanggal akhir harus sama dengan atau setelah tanggal awal.")}</div>
      )}
      <div className="filter-note">
        <RangeNote from={from} to={to} />
        <span>
          {" "}{tr("· Kegiatan berdasarkan tanggal mulai WIB; peluang berdasarkan target closing; tugas berdasarkan tenggat.")}</span>
      </div>

      <div className="stats-grid">
        <StatCard
          label={tr("Kegiatan periode")}
          value={activities.length}
          note={tr("{{value0}} selesai · seluruh status", { value0: (completed.length) })}
          icon={<CalendarDays size={21} />}
          onClick={() => navigate("activities")}
        />
        <StatCard
          label={tr("Pipeline aktif periode")}
          value={shortMoney(pipelineValue)}
          note={tr("{{value0}} peluang · target closing pada periode", { value0: (pipeline.length) })}
          icon={<TrendingUp size={21} />}
          onClick={() => navigate("pipeline")}
        />
        <StatCard
          label={tr("Menunggu persetujuan")}
          value={awaiting.length}
          note={tr("Tanggal mulai kegiatan pada periode")}
          icon={<CheckCircle2 size={21} />}
          color="amber"
          onClick={() => navigate("activities")}
        />
        <StatCard
          label={tr("Tindak lanjut terlambat")}
          value={overdue.length}
          note={tr("Tenggat pada periode · belum selesai per hari ini")}
          icon={<Clock size={21} />}
          color="red"
          onClick={() => navigate("tasks")}
        />
      </div>

      <div className="dashboard-grid">
        <section className="card">
          <div className="panel-head">
            <div>
              <h2>{tr("Agenda aktif & mendatang")}</h2>
              <p className="muted">{tr("Maksimum 5 kegiatan pada periode dan anggota terpilih.")}</p>
            </div>
            <button
              className="btn secondary small"
              onClick={() => navigate("activities")}
            >{tr("Lihat kalender")}<ArrowRight size={15} />
            </button>
          </div>
          {agenda.length ? (
            <div className="agenda-list">
              {agenda.map((activity) => (
                <button
                  className="activity-mini agenda-row"
                  key={activity.id}
                  onClick={() => navigate("activities")}
                >
                  <div className="agenda-date">
                    <strong>
                      {displayDate(activity.start_at, { day: "2-digit" })}
                    </strong>
                    <span>
                      {displayDate(activity.start_at, { month: "short" })}
                    </span>
                  </div>
                  <div className="agenda-main">
                    <Badge
                      value={activity.type}
                      label={ACTIVITY_LABEL[activity.type]}
                    />
                    <h3>{activity.title}</h3>
                    <p className="muted">
                      {data.accounts.find(
                        (account) => account.id === activity.account_id,
                      )?.name ||
                        activity.location || (tr("Kegiatan internal"))}{" "}
                      · {personName(activity.owner_id)}
                    </p>
                  </div>
                  <div className="agenda-time">
                    <span>{displayTime(activity.start_at)}{tr(" WIB")}</span>
                    <Badge
                      value={activity.status}
                      label={STATUS_LABEL[activity.status]}
                    />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <Empty
              title={tr("Agenda sedang lapang")}
              description={tr("Tidak ada reservasi aktif atau mendatang dalam filter ini.")}
              action={
                <button
                  className="btn secondary"
                  onClick={() => navigate("activities")}
                >{tr("Rencanakan kegiatan")}<ArrowRight size={15} />
                </button>
              }
            />
          )}
          <div className="card-foot">{tr("Termasuk diajukan, disetujui, dan berlangsung.")}<span>{tr("Waktu WIB (UTC+7)")}</span>
          </div>
        </section>

        <section className="card">
          <div className="panel-head">
            <div>
              <h2>{tr("Fokus pipeline")}</h2>
              <p className="muted">{tr("Peluang aktif dengan target closing pada periode.")}</p>
            </div>
            <Target size={20} aria-hidden="true" />
          </div>
          <div className="metrics-strip">
            <div className="metric-item">
              <span className="muted">{tr("Nilai tertimbang")}</span>
              <strong>{shortMoney(weightedValue)}</strong>
            </div>
            <div className="metric-item">
              <span className="muted">{tr("Peluang aktif")}</span>
              <strong>{pipeline.length}</strong>
            </div>
          </div>
          <div className="detail-section">
            <p className="muted">{tr("Nilai tertimbang = nilai peluang × probabilitas. Angka ini merupakan estimasi pipeline, bukan pendapatan.")}</p>
            {pipeline.length ? (
              <>
                {pipeline
                  .slice()
                  .sort((a, b) => b.value - a.value)
                  .slice(0, 3)
                  .map((opportunity) => (
                    <div className="relation-item" key={opportunity.id}>
                      <div>
                        <strong>{opportunity.title}</strong>
                        <p className="muted">
                          {displayDate(opportunity.expected_close)} ·{" "}
                          {opportunity.probability}{tr("% probabilitas")}</p>
                      </div>
                      <strong>{shortMoney(opportunity.value)}</strong>
                    </div>
                  ))}
              </>
            ) : (
              <p>{tr("Belum ada peluang aktif dengan target closing dalam filter ini.")}</p>
            )}
            <button
              className="btn secondary"
              onClick={() => navigate("pipeline")}
            >{tr("Tinjau peluang")}<ArrowRight size={15} />
            </button>
          </div>
        </section>

        <section className="card">
          <div className="panel-head">
            <div>
              <h2>{tr("Alokasi tim")}</h2>
              <p className="muted">{tr("Reservasi aktif dari tanggal mulai kegiatan pada periode.")}</p>
            </div>
            <Users size={20} aria-hidden="true" />
          </div>
          {workload.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{tr("Anggota")}</th>
                    <th>{tr("Reservasi")}</th>
                    <th>{tr("Durasi")}</th>
                  </tr>
                </thead>
                <tbody>
                  {workload.map(({ person, count, hours }) => (
                    <tr key={person.id}>
                      <td>
                        <MemberName member={person} />
                      </td>
                      <td>
                        <strong>{count}{tr(" kegiatan")}</strong>
                        <QuantityBar
                          label={tr("Reservasi {{value0}}", { value0: (person.full_name) })}
                          value={count}
                          maximum={maximumLoad}
                        />
                      </td>
                      <td>
                        {hours.toLocaleString(getLocale(), {
                          maximumFractionDigits: 1,
                        })}{" "}{tr("jam")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title={tr("Belum ada anggota dalam filter")}
              description={tr("Pilih seluruh tim atau tambahkan anggota aktif.")}
            />
          )}
          <div className="card-foot">{tr("Koordinator dan peserta dihitung sekali per kegiatan per orang.")}</div>
        </section>

        <section className="card">
          <div className="panel-head">
            <div>
              <h2>{tr("Komposisi kegiatan")}</h2>
              <p className="muted">{tr("Seluruh status kegiatan yang cocok dengan filter.")}</p>
            </div>
            <FileText size={20} aria-hidden="true" />
          </div>
          {distribution.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{tr("Jenis")}</th>
                    <th>{tr("Jumlah & proporsi")}</th>
                  </tr>
                </thead>
                <tbody>
                  {distribution.map((row) => (
                    <tr key={row.type}>
                      <td>{tr(row.label)}</td>
                      <td>
                        <strong>{row.count}</strong>
                        <span className="muted">
                          {" "}
                          · {Math.round((row.count / activities.length) * 100)}%
                        </span>
                        <QuantityBar
                          label={tr("{{value0}}, {{value1}} dari {{value2}} kegiatan", { value0: tr(row.label), value1: (row.count), value2: (activities.length) })}
                          value={row.count}
                          maximum={activities.length}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title={tr("Belum ada kegiatan pada periode")}
              description={tr("Sesuaikan rentang tanggal atau rencanakan aktivitas tim.")}
            />
          )}
          <div className="card-foot">
            <button className="text-btn" onClick={() => navigate("reports")}>{tr("Buka laporan lengkap")}<ArrowRight size={14} />
            </button>
          </div>
        </section>
      </div>
      <p className="source-note muted">{tr("Kartu membuka modul terkait; filter dashboard tidak otomatis dipindahkan ke modul tersebut. Peluang tanpa target closing dan tugas tanpa tenggat tidak masuk metrik periode.")}</p>
    </>
  );
}

export function ReportsPage() {
  const { data } = useCRM();
  const [from, setFrom] = useState(() => currentMonth().from);
  const [to, setTo] = useState(() => currentMonth().to);
  const [member, setMember] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [product, setProduct] = useState("");
  const invalidRange = !!from && !!to && from > to;
  const today = dateOnly();
  const activities = invalidRange
    ? []
    : data.activities
        .filter(
          (activity) =>
            inPeriod(dateOnly(activity.start_at), from, to) &&
            assigned(activity, member) &&
            (!type || activity.type === type) &&
            (!status || activity.status === status) &&
            (!product || activity.product_id === product),
        )
        .sort(
          (a, b) =>
            new Date(b.start_at).getTime() - new Date(a.start_at).getTime(),
        );
  const opportunities = invalidRange
    ? []
    : data.opportunities.filter(
        (opportunity) =>
          inPeriod(opportunity.expected_close, from, to) &&
          (!member || opportunity.owner_id === member) &&
          (!product || opportunity.product_id === product),
      );
  const tasks = invalidRange
    ? []
    : data.tasks.filter(
        (task) =>
          inPeriod(task.due_date, from, to) &&
          (!member || task.assigned_to === member),
      );
  const completed = activities.filter(
    (activity) => activity.status === "completed",
  );
  const actualCost = activities.reduce(
    (sum, activity) => sum + Number(activity.actual_cost || 0),
    0,
  );
  const personName = (id: string) =>
    data.profiles.find((person) => person.id === id)?.full_name ||
    tr("Anggota tidak ditemukan");
  const accountName = (id: string | null) =>
    data.accounts.find((account) => account.id === id)?.name ||
    tr("Internal / tanpa instansi");
  const productName = (id: string | null) =>
    data.products.find((item) => item.id === id)?.name || tr("Tanpa produk");
  const performance = data.profiles
    .filter(
      (person) =>
        (!member || person.id === member) &&
        (person.active ||
          activities.some((activity) => assigned(activity, person.id)) ||
          opportunities.some(
            (opportunity) => opportunity.owner_id === person.id,
          ) ||
          tasks.some((task) => task.assigned_to === person.id)),
    )
    .map((person) => {
      const ownActivities = activities.filter((activity) =>
        assigned(activity, person.id),
      );
      const ownOpportunities = opportunities.filter(
        (opportunity) => opportunity.owner_id === person.id,
      );
      const ownTasks = tasks.filter((task) => task.assigned_to === person.id);
      const active = ownOpportunities.filter((opportunity) =>
        activeStages.includes(opportunity.stage),
      );
      return {
        person,
        activities: ownActivities.length,
        completed: ownActivities.filter(
          (activity) => activity.status === "completed",
        ).length,
        pipeline: active.reduce(
          (sum, opportunity) => sum + Number(opportunity.value),
          0,
        ),
        weighted: active.reduce(
          (sum, opportunity) =>
            sum + (Number(opportunity.value) * opportunity.probability) / 100,
          0,
        ),
        won: ownOpportunities
          .filter((opportunity) => opportunity.stage === "won")
          .reduce((sum, opportunity) => sum + Number(opportunity.value), 0),
        tasks: ownTasks.length,
        done: ownTasks.filter((task) => task.status === "done").length,
        overdue: ownTasks.filter(
          (task) =>
            task.due_date < today &&
            !["done", "cancelled"].includes(task.status),
        ).length,
      };
    })
    .sort(
      (a, b) =>
        b.completed - a.completed ||
        a.person.full_name.localeCompare(b.person.full_name, getLocale()),
    );
  const filterRows: unknown[][] = [
    [tr("TTM Product CRM"), tr("Laporan operasional")],
    [tr("Periode WIB"), from || tr("Awal data"), to || tr("Tanpa batas akhir")],
    [tr("Anggota"), member ? personName(member) : tr("Seluruh tim")],
    [
      tr("Filter kegiatan"),
      type
        ? ACTIVITY_LABEL[type as keyof typeof ACTIVITY_LABEL]
        : tr("Semua jenis"),
      status
        ? STATUS_LABEL[status as keyof typeof STATUS_LABEL]
        : tr("Semua status"),
      product ? productName(product) : tr("Semua produk"),
    ],
    [
      tr("Dasar periode"),
      tr("Kegiatan: tanggal mulai WIB"),
      tr("Peluang: expected_close"),
      tr("Tugas: due_date"),
    ],
    [
      tr("Cakupan filter"),
      tr("Jenis/status hanya kegiatan; produk juga membatasi peluang; tugas hanya periode dan anggota"),
    ],
  ];
  const exportActivities = () =>
    downloadCSV(`ttm-${getLanguage() === "en" ? "activities" : "kegiatan"}-${from || tr("awal")}-${to || tr("akhir")}.csv`, [
      ...filterRows,
      [],
      [
        tr("ID"),
        tr("Kegiatan"),
        tr("Jenis"),
        tr("Status"),
        tr("Mulai WIB"),
        tr("Selesai WIB"),
        tr("Pelanggan"),
        tr("Produk"),
        tr("Koordinator"),
        tr("Anggota tambahan"),
        tr("Lokasi"),
        tr("Tujuan"),
        tr("Laporan"),
        tr("Hasil"),
        tr("Target tindak lanjut"),
        tr("Anggaran IDR"),
        tr("Realisasi IDR"),
        tr("Jumlah peserta"),
      ],
      ...activities.map((activity) => [
        activity.id,
        activity.title,
        ACTIVITY_LABEL[activity.type],
        STATUS_LABEL[activity.status],
        `${dateOnly(activity.start_at)} ${displayTime(activity.start_at)}`,
        `${dateOnly(activity.end_at)} ${displayTime(activity.end_at)}`,
        accountName(activity.account_id),
        productName(activity.product_id),
        personName(activity.owner_id),
        activity.participant_ids.map(personName).join("; "),
        activity.location,
        activity.objective,
        activity.report,
        activity.outcome,
        activity.follow_up_date,
        activity.budget,
        activity.actual_cost,
        activity.attendance_count,
      ]),
    ]);
  const exportPerformance = () =>
    downloadCSV(`ttm-${getLanguage() === "en" ? "performance" : "kinerja"}-${from || tr("awal")}-${to || tr("akhir")}.csv`, [
      ...filterRows,
      [
        tr("Catatan atribusi"),
        tr("Satu kegiatan dapat dihitung untuk beberapa anggota; tidak menunjukkan penjualan teratribusi dari kegiatan"),
      ],
      [],
      [
        tr("Anggota"),
        tr("Role"),
        tr("Kegiatan ditugaskan"),
        tr("Kegiatan selesai"),
        tr("Pipeline aktif IDR"),
        tr("Pipeline tertimbang IDR"),
        tr("Won IDR"),
        tr("Tugas periode"),
        tr("Tugas selesai"),
        tr("Tugas terlambat per hari ini"),
      ],
      ...performance.map((row) => [
        row.person.full_name,
        ROLE_LABEL[row.person.role],
        row.activities,
        row.completed,
        row.pipeline,
        row.weighted,
        row.won,
        row.tasks,
        row.done,
        row.overdue,
      ]),
    ]);

  return (
    <>
      <PageHead
        eyebrow={tr("INSIGHTS & PERFORMANCE")}
        title={tr("Laporan & kinerja")}
        description={tr("Evaluasi kegiatan, pipeline, dan tindak lanjut dengan dasar periode yang jelas.")}
        action={
          <div className="page-actions">
            <button
              className="btn secondary"
              disabled={invalidRange || !performance.length}
              onClick={exportPerformance}
            >
              <Download size={16} />{tr("Ekspor kinerja")}</button>
            <button
              className="btn primary"
              disabled={invalidRange || !activities.length}
              onClick={exportActivities}
            >
              <Download size={16} />{tr("Ekspor kegiatan")}</button>
          </div>
        }
      />
      <div className="card">
        <PeriodToolbar
          from={from}
          to={to}
          member={member}
          setFrom={setFrom}
          setTo={setTo}
          setMember={setMember}
          members={data.profiles}
        >
          <label className="field">
            <span>{tr("Jenis kegiatan")}</span>
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              <option value="">{tr("Semua jenis")}</option>
              {Object.entries(ACTIVITY_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{tr("Status kegiatan")}</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">{tr("Semua status")}</option>
              {Object.entries(STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{tr("Produk")}</span>
            <select
              value={product}
              onChange={(event) => setProduct(event.target.value)}
            >
              <option value="">{tr("Semua produk")}</option>
              {data.products.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        </PeriodToolbar>
      </div>
      {invalidRange && (
        <div className="form-error" role="alert">{tr("Tanggal akhir harus sama dengan atau setelah tanggal awal. Ekspor dinonaktifkan.")}</div>
      )}
      <p className="filter-note" aria-live="polite">
        <RangeNote from={from} to={to} /> · {activities.length}{tr(" kegiatan cocok dengan seluruh filter.")}</p>
      <div className="stats-grid">
        <StatCard
          label={tr("Kegiatan terpilih")}
          value={activities.length}
          note={tr("Berdasarkan tanggal mulai WIB")}
          icon={<CalendarDays size={21} />}
        />
        <StatCard
          label={tr("Kegiatan selesai")}
          value={completed.length}
          note={tr("{{value0}}% dari kegiatan terpilih", { value0: (activities.length ? Math.round((completed.length / activities.length) * 100) : 0) })}
          icon={<CheckCircle2 size={21} />}
          color="green"
        />
        <StatCard
          label={tr("Peserta kegiatan selesai")}
          value={completed.reduce(
            (sum, activity) => sum + Number(activity.attendance_count || 0),
            0,
          )}
          note={tr("Jumlah kehadiran · bukan orang unik")}
          icon={<Users size={21} />}
        />
        <StatCard
          label={tr("Realisasi biaya")}
          value={shortMoney(actualCost)}
          note={tr("Jumlah biaya tercatat pada kegiatan terpilih")}
          icon={<FileText size={21} />}
        />
      </div>

      <section className="card">
        <div className="panel-head">
          <div>
            <h2>{tr("Kinerja anggota")}</h2>
            <p className="muted">{tr("Aktivitas menurut penugasan; peluang menurut owner; tugas menurut penanggung jawab.")}</p>
          </div>
        </div>
        <div className="info-banner">{tr("Periode peluang memakai ")}<strong>{tr("target closing")}</strong>{tr(", tugas memakai")}{" "}
          <strong>{tr("tenggat")}</strong>{tr(". Jenis/status hanya memfilter kegiatan; produk juga memfilter peluang. Tugas hanya mengikuti periode dan anggota. Won di sini adalah nilai peluang dengan target closing pada periode, bukan bukti transaksi pada tanggal penjualan.")}</div>
        {performance.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{tr("Anggota")}</th>
                  <th>{tr("Kegiatan")}</th>
                  <th>{tr("Selesai")}</th>
                  <th>{tr("Pipeline aktif")}</th>
                  <th>{tr("Tertimbang")}</th>
                  <th>{tr("Won")}</th>
                  <th>{tr("Tugas selesai")}</th>
                  <th>{tr("Terlambat")}</th>
                </tr>
              </thead>
              <tbody>
                {performance.map((row) => (
                  <tr key={row.person.id}>
                    <td>
                      <MemberName member={row.person} />
                    </td>
                    <td>{row.activities}</td>
                    <td>{row.completed}</td>
                    <td>{shortMoney(row.pipeline)}</td>
                    <td>{shortMoney(row.weighted)}</td>
                    <td>{shortMoney(row.won)}</td>
                    <td>
                      {row.done} / {row.tasks}
                    </td>
                    <td>
                      {row.overdue ? (
                        <Badge value="overdue" label={tr("{{value0}} tugas", { value0: (row.overdue) })} />
                      ) : (
                        "0"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title={tr("Belum ada anggota untuk ditampilkan")}
            description={tr("Sesuaikan filter anggota atau lengkapi data tim.")}
          />
        )}
        <div className="card-foot">{tr("Kegiatan bersama dihitung sekali untuk setiap anggota yang ditugaskan; total antaranggota dapat melebihi jumlah kegiatan unik.")}</div>
      </section>

      <section className="card">
        <div className="panel-head">
          <div>
            <h2>{tr("Rincian kegiatan")}</h2>
            <p className="muted">{tr("Seluruh filter berlaku pada tabel dan ekspor kegiatan ini.")}</p>
          </div>
          <span className="badge">{activities.length}{tr(" kegiatan")}</span>
        </div>
        {activities.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{tr("Kegiatan / pelanggan")}</th>
                  <th>{tr("Jadwal WIB")}</th>
                  <th>{tr("Jenis / status")}</th>
                  <th>{tr("Tim")}</th>
                  <th>{tr("Produk")}</th>
                  <th>{tr("Laporan & hasil")}</th>
                  <th>{tr("Biaya aktual")}</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((activity) => (
                  <tr key={activity.id}>
                    <td>
                      <strong>{activity.title}</strong>
                      <small className="muted">
                        {accountName(activity.account_id)}
                      </small>
                    </td>
                    <td>
                      {displayDate(activity.start_at)}
                      <small className="muted">
                        {displayTime(activity.start_at)} –{" "}
                        {displayDate(activity.end_at)},{" "}
                        {displayTime(activity.end_at)}
                      </small>
                    </td>
                    <td>
                      <Badge
                        value={activity.type}
                        label={ACTIVITY_LABEL[activity.type]}
                      />
                      <small>
                        <Badge
                          value={activity.status}
                          label={STATUS_LABEL[activity.status]}
                        />
                      </small>
                    </td>
                    <td>
                      {personName(activity.owner_id)}
                      <small className="muted">
                        {activity.participant_ids.length ? (activity.participant_ids.map(personName).join(", ")) : (tr("Tanpa anggota tambahan"))}
                      </small>
                    </td>
                    <td>{productName(activity.product_id)}</td>
                    <td>
                      {activity.report ? (
                        <details>
                          <summary>{tr("Lihat laporan")}</summary>
                          <p className="pre-wrap">{activity.report}</p>
                          {activity.outcome && (
                            <p className="pre-wrap">
                              <strong>{tr("Hasil:")}</strong> {activity.outcome}
                            </p>
                          )}
                          {activity.follow_up_date && (
                            <p>{tr("Tindak lanjut:")}{" "}
                              {displayDate(activity.follow_up_date)}
                            </p>
                          )}
                        </details>
                      ) : (
                        <span className="muted">{tr("Belum dilaporkan")}</span>
                      )}
                    </td>
                    <td>{money(activity.actual_cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title={tr("Tidak ada kegiatan sesuai filter")}
            description={tr("Perluas rentang tanggal, jenis, status, produk, atau anggota yang dipilih.")}
          />
        )}
      </section>
      <p className="source-note muted">{tr("Peluang tanpa target closing dan tugas tanpa tenggat dikecualikan dari metrik periode. Nilai pipeline adalah estimasi. CSV memuat hasil filter lengkap dan menetralkan awalan formula untuk spreadsheet.")}</p>
    </>
  );
}
