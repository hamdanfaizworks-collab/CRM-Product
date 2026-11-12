// localized-ui-v1
import { getLocale, localizedLabel, tr } from "./i18n";
import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight,
  Building2,
  Check,
  ChevronRight,
  Mail,
  MapPin,
  Package,
  Phone,
  Plus,
  Stethoscope,
} from "lucide-react";
import { useCRM } from "./store";
import { AccountForm } from "./AccountForm";
import {
  Badge,
  Dialog,
  Empty,
  EntityForm,
  PageHead,
  SearchToolbar,
} from "./ui";
import type { Field } from "./ui";
import type {
  Account,
  Contact,
  Equipment,
  Opportunity,
  Product,
  Stage,
  Task,
} from "./types";
import { STAGE_LABEL, STATUS_LABEL } from "./types";
import {
  activeStages,
  dateOnly,
  displayDate,
  displayTime,
  isManager,
  money,
  shortMoney,
} from "./rules";

const stages = Object.keys(STAGE_LABEL) as Stage[];
const accountTypes = [
  ["hospital", "Rumah sakit"],
  ["clinic", "Klinik"],
  ["distributor", "Distributor"],
  ["principal", "Prinsipal"],
  ["other", "Lainnya"],
].map(([value, label]) => ({ value, label }));
const accountStatuses = [
  { value: "prospect", label: "Prospek" },
  { value: "active", label: "Aktif" },
  { value: "inactive", label: "Tidak aktif" },
];
const taskStatuses = [
  { value: "todo", label: "Terbuka" },
  { value: "in_progress", label: "Dikerjakan" },
  { value: "done", label: "Selesai" },
  { value: "cancelled", label: "Dibatalkan" },
];
const priorities = [
  { value: "low", label: "Rendah" },
  { value: "medium", label: "Normal" },
  { value: "high", label: "Tinggi" },
];
const equipmentStatuses = [
  { value: "available", label: "Operasional" },
  { value: "maintenance", label: "Pemeliharaan" },
  { value: "inactive", label: "Tidak operasional" },
];
const includes = (text: unknown, q: string) =>
  String(text ?? "")
    .toLocaleLowerCase(getLocale())
    .includes(q.toLocaleLowerCase(getLocale()));
const labelFor = (options: { value: string; label: string }[], value: string) =>
  tr(options.find((o) => o.value === value)?.label || value || "—");
const textValue = (value: unknown) =>
  typeof value === "object" ? JSON.stringify(value) : String(value ?? "—");
const accountDefaults = {
  name: "",
  type: "hospital",
  status: "prospect",
  owner_id: "",
  city: "",
  province: "",
  territory: "",
  address: "",
  notes: "",
};
const contactDefaults = {
  full_name: "",
  job_title: "",
  department: "",
  email: "",
  phone: "",
  is_primary: false,
};
const opportunityDefaults = {
  title: "",
  account_id: "",
  product_id: "",
  owner_id: "",
  stage: "lead",
  value: 0,
  probability: 10,
  expected_close: "",
  next_step: "",
  next_action_due_date: "",
  lost_reason: "",
  notes: "",
};
const taskDefaults = {
  title: "",
  assigned_to: "",
  due_date: "",
  priority: "medium",
  status: "todo",
  account_id: null,
  activity_id: null,
  opportunity_id: null,
  notes: "",
};
const productDefaults = {
  name: "",
  brand: "",
  category: "",
  description: "",
  source_page: 1,
  active: true,
  specs: {},
};
const equipmentDefaults = {
  name: "",
  code: "",
  product_id: "",
  status: "available",
  serial_number: "",
  location: "",
  notes: "",
};
function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="metric-item">
      <span className="muted">{tr(label)}</span>
      <strong>{value}</strong>
    </div>
  );
}
function AddButton({
  children,
  onClick,
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button className="btn primary" onClick={onClick} disabled={disabled}>
      <Plus size={16} />
      {children}
    </button>
  );
}

export function AccountsPage() {
  const { data, profile, save } = useCRM();
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState("all"),
    [selected, setSelected] = useState<string | null>(null),
    [accountForm, setAccountForm] = useState<Partial<Account> | null>(null),
    [contactForm, setContactForm] = useState<Partial<Contact> | null>(null);
  const account = data.accounts.find((a) => a.id === selected);
  const managers = isManager(profile.role),
    canCreate = profile.role !== "viewer";
  const canEdit = (row: Account) =>
    canCreate && (managers || row.owner_id === profile.id);
  const members = data.profiles
    .filter((p) => p.active && (managers || p.id === profile.id))
    .map((p) => ({ value: p.id, label: p.full_name }));
  const rows = data.accounts.filter(
    (a) =>
      (status === "all" || a.status === status) &&
      [a.name, a.city, a.province, a.territory].some((v) =>
        includes(v, search),
      ),
  );
  const fields: Field[] = [
    { key: "name", label: "Nama instansi", required: true },
    {
      key: "type",
      label: "Jenis instansi",
      type: "select",
      required: true,
      options: accountTypes,
    },
    {
      key: "status",
      label: "Status hubungan",
      type: "select",
      options: accountStatuses,
      required: true,
    },
    {
      key: "owner_id",
      label: "Penanggung jawab",
      type: "select",
      required: true,
      options: members,
    },
    { key: "province", label: "Provinsi" },
    { key: "city", label: "Kabupaten / kota" },
    { key: "territory", label: "Wilayah" },
    { key: "address", label: "Alamat", type: "textarea" },
    { key: "notes", label: "Catatan relasi", type: "textarea" },
  ];
  const contactFields: Field[] = [
    { key: "full_name", label: "Nama lengkap PIC", required: true },
    { key: "job_title", label: "Jabatan" },
    { key: "department", label: "Departemen" },
    { key: "email", label: "Email bisnis", type: "email" },
    { key: "phone", label: "Nomor telepon", type: "tel" },
    { key: "is_primary", label: "PIC utama", type: "checkbox" },
  ];
  return (
    <>
      <PageHead
        eyebrow={tr("CUSTOMER RELATIONSHIP")}
        title={tr("Pelanggan")}
        description={tr("Bangun hubungan yang kuat dengan setiap mitra layanan kesehatan.")}
        action={
          <AddButton
            onClick={() =>
              setAccountForm({
                type: "hospital",
                status: "prospect",
                owner_id: profile.id,
              })
            }
            disabled={!canCreate}
          >{tr("Tambah pelanggan")}</AddButton>
        }
      />
      <div className="metrics-strip">
        <Stat label={tr("Seluruh instansi")} value={data.accounts.length} />
        <Stat
          label={tr("Hubungan aktif")}
          value={data.accounts.filter((a) => a.status === "active").length}
        />
        <Stat label={tr("Kontak / PIC")} value={data.contacts.length} />
        <Stat label={tr("Peluang terkait")} value={data.opportunities.length} />
      </div>
      <div className="card">
        <SearchToolbar
          search={search}
          setSearch={setSearch}
          placeholder={tr("Cari instansi, kota, atau wilayah…")}
        >
          <select
            className="filter-select"
            aria-label={tr("Filter status pelanggan")}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">{tr("Semua status")}</option>
            {accountStatuses.map((o) => (
              <option key={o.value} value={o.value}>
                {localizedLabel(o)}
              </option>
            ))}
          </select>
        </SearchToolbar>
        {rows.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{tr("Instansi")}</th>
                  <th>{tr("Kota / wilayah")}</th>
                  <th>{tr("PIC")}</th>
                  <th>{tr("Penanggung jawab")}</th>
                  <th>{tr("Status")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <button
                        className="text-button"
                        onClick={() => setSelected(a.id)}
                      >
                        <Building2 size={17} />
                        <span>
                          <strong>{a.name}</strong>
                          <small className="muted">
                            {labelFor(accountTypes, a.type)}
                          </small>
                        </span>
                      </button>
                    </td>
                    <td>
                      {a.city || "—"}
                      <small className="muted">
                        {a.territory || a.province}
                      </small>
                    </td>
                    <td>
                      {
                        data.contacts.filter((c) => c.account_id === a.id)
                          .length
                      }{" "}{tr("kontak")}</td>
                    <td>
                      {data.profiles.find((p) => p.id === a.owner_id)
                        ?.full_name || "—"}
                    </td>
                    <td>
                      <Badge
                        value={a.status}
                        label={labelFor(accountStatuses, a.status)}
                      />
                    </td>
                    <td>
                      <button
                        className="btn secondary small"
                        onClick={() => setSelected(a.id)}
                        aria-label={tr("Lihat {{value0}}", { value0: (a.name) })}
                      >
                        <ChevronRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title={
              search ? (tr("Pelanggan tidak ditemukan")) : (tr("Mulai dari pelanggan pertama"))
            }
            description={
              search ? (tr("Coba kata kunci atau filter lain.")) : (tr("Catat rumah sakit, klinik, dan mitra untuk menghubungkan peluang serta kegiatan."))
            }
            action={
              canCreate ? (
                <AddButton
                  onClick={() =>
                    setAccountForm({
                      type: "hospital",
                      status: "prospect",
                      owner_id: profile.id,
                    })
                  }
                >{tr("Tambah pelanggan")}</AddButton>
              ) : undefined
            }
          />
        )}
      </div>
      {account && (
        <Dialog title={account.name} onClose={() => setSelected(null)} wide>
          <div className="dialog-body detail-grid">
            <div>
              <div className="detail-section">
                <Badge
                  value={account.status}
                  label={labelFor(accountStatuses, account.status)}
                />
                <p className="muted">
                  {labelFor(accountTypes, account.type)} ·{" "}
                  {account.city || (tr("Kota belum diisi"))}
                  {account.province ? ", " + account.province : ""}
                </p>
                <p>
                  <MapPin size={15} /> {account.address || (tr("Alamat belum diisi"))}
                </p>
                <p>{tr("Penanggung jawab:")}{" "}
                  <strong>
                    {data.profiles.find((p) => p.id === account.owner_id)
                      ?.full_name || "—"}
                  </strong>
                </p>
                {account.territory && <p>{tr("Wilayah: ")}{account.territory}</p>}
                {account.notes && (
                  <p className="preserve-lines">{account.notes}</p>
                )}
                <button
                  className="btn secondary"
                  onClick={() => setAccountForm(account)}
                  disabled={!canEdit(account)}
                >{tr("Edit pelanggan")}</button>
              </div>
              <div className="detail-section">
                <div className="section-heading">
                  <h3>{tr("PIC & kontak")}</h3>
                  <button
                    className="btn secondary small"
                    disabled={!canEdit(account)}
                    onClick={() =>
                      setContactForm({
                        account_id: account.id,
                        is_primary: !data.contacts.some(
                          (c) => c.account_id === account.id,
                        ),
                      })
                    }
                  >
                    <Plus size={14} />{tr("Tambah PIC")}</button>
                </div>
                {data.contacts
                  .filter((c) => c.account_id === account.id)
                  .map((c) => (
                    <div className="relation-item" key={c.id}>
                      <div>
                        <strong>{c.full_name}</strong>
                        {c.is_primary && (
                          <Badge value="active" label={tr("PIC utama")} />
                        )}
                        <p className="muted">
                          {[c.job_title, c.department]
                            .filter(Boolean)
                            .join(" · ") || (tr("Jabatan belum diisi"))}
                        </p>
                        {c.email && (
                          <p>
                            <Mail size={13} />{" "}
                            <a href={"mailto:" + c.email}>{c.email}</a>
                          </p>
                        )}
                        {c.phone && (
                          <p>
                            <Phone size={13} />{" "}
                            <a href={"tel:" + c.phone.replace(/[^+\d]/g, "")}>
                              {c.phone}
                            </a>
                          </p>
                        )}
                      </div>
                      <button
                        className="btn secondary small"
                        disabled={!canEdit(account)}
                        onClick={() => setContactForm(c)}
                      >{tr("Edit")}</button>
                    </div>
                  ))}
                {!data.contacts.some((c) => c.account_id === account.id) && (
                  <p className="muted">{tr("Belum ada PIC. Tambahkan kontak utama untuk koordinasi.")}</p>
                )}
              </div>
            </div>
            <div>
              <div className="detail-section">
                <h3>{tr("Peluang bisnis")}</h3>
                {data.opportunities
                  .filter((o) => o.account_id === account.id)
                  .map((o) => (
                    <div className="relation-item" key={o.id}>
                      <div>
                        <strong>{o.title}</strong>
                        <p className="muted">{money(o.value)}</p>
                      </div>
                      <Badge value={o.stage} label={STAGE_LABEL[o.stage]} />
                    </div>
                  ))}
                {!data.opportunities.some(
                  (o) => o.account_id === account.id,
                ) && <p className="muted">{tr("Belum ada peluang terkait.")}</p>}
              </div>
              <div className="detail-section">
                <h3>{tr("Aktivitas terkait")}</h3>
                {data.activities
                  .filter((a) => a.account_id === account.id)
                  .sort((a, b) => b.start_at.localeCompare(a.start_at))
                  .slice(0, 8)
                  .map((a) => (
                    <div className="relation-item" key={a.id}>
                      <div>
                        <strong>{a.title}</strong>
                        <p className="muted">
                          {displayDate(a.start_at)} · {displayTime(a.start_at)}
                        </p>
                      </div>
                      <Badge value={a.status} label={STATUS_LABEL[a.status]} />
                    </div>
                  ))}
                {!data.activities.some((a) => a.account_id === account.id) && (
                  <p className="muted">{tr("Belum ada kegiatan terkait.")}</p>
                )}
              </div>
            </div>
          </div>
        </Dialog>
      )}
      {accountForm && (
        <AccountForm
          title={accountForm.id ? (tr("Edit pelanggan")) : (tr("Tambah pelanggan"))}
          initial={{ ...accountDefaults, ...accountForm }}
          fields={fields}
          onClose={() => setAccountForm(null)}
          onSave={async (row) => {
            await save("accounts", { ...accountForm, ...row });
            setAccountForm(null);
          }}
        />
      )}
      {contactForm && (
        <EntityForm
          title={contactForm.id ? (tr("Edit PIC")) : (tr("Tambah PIC"))}
          initial={{ ...contactDefaults, ...contactForm }}
          fields={contactFields}
          onClose={() => setContactForm(null)}
          onSave={async (row) => {
            if (
              row.is_primary &&
              data.contacts.some(
                (c) =>
                  c.account_id === contactForm.account_id &&
                  c.id !== contactForm.id &&
                  c.is_primary,
              )
            )
              throw new Error(
                tr("Instansi ini sudah memiliki PIC utama. Ubah PIC utama sebelumnya terlebih dahulu."),
              );
            await save("contacts", { ...contactForm, ...row });
            setContactForm(null);
          }}
        />
      )}
    </>
  );
}

export function PipelinePage() {
  const { data, profile, save, notify } = useCRM();
  const [search, setSearch] = useState(""),
    [owner, setOwner] = useState("all"),
    [form, setForm] = useState<Partial<Opportunity> | null>(null),
    [detail, setDetail] = useState<string | null>(null),
    [busy, setBusy] = useState<string | null>(null);
  const canCreate = profile.role !== "viewer",
    manager = isManager(profile.role),
    canEdit = (o: Opportunity) =>
      canCreate && (manager || o.owner_id === profile.id);
  const accounts = data.accounts.map((a) => ({ value: a.id, label: a.name })),
    products = data.products
      .filter((p) => p.active !== false)
      .map((p) => ({ value: p.id, label: p.name })),
    members = data.profiles
      .filter((p) => p.active)
      .map((p) => ({ value: p.id, label: p.full_name }));
  const rows = data.opportunities.filter(
    (o) =>
      (owner === "all" || o.owner_id === owner) &&
      [
        o.title,
        data.accounts.find((a) => a.id === o.account_id)?.name,
        data.products.find((p) => p.id === o.product_id)?.name,
      ].some((v) => includes(v, search)),
  );
  const active = rows.filter((o) => activeStages.includes(o.stage)),
    total = active.reduce((s, o) => s + Number(o.value), 0),
    weighted = active.reduce(
      (s, o) => s + (Number(o.value) * Number(o.probability)) / 100,
      0,
    ),
    won = rows
      .filter((o) => o.stage === "won")
      .reduce((s, o) => s + Number(o.value), 0);
  const fields: Field[] = [
    { key: "title", label: "Judul peluang", required: true },
    {
      key: "account_id",
      label: "Pelanggan / instansi",
      type: "select",
      required: true,
      options: accounts,
    },
    {
      key: "product_id",
      label: "Produk",
      type: "select",
      required: true,
      options: products,
    },
    {
      key: "owner_id",
      label: "Pemilik peluang",
      type: "select",
      required: true,
      options: manager
        ? members
        : members.filter((m) => m.value === profile.id),
    },
    {
      key: "stage",
      label: "Tahap pipeline",
      type: "select",
      required: true,
      options: stages.map((value) => ({ value, label: STAGE_LABEL[value] })),
    },
    {
      key: "value",
      label: "Nilai estimasi (Rp)",
      type: "number",
      min: 0,
      step: 1,
      required: true,
    },
    {
      key: "probability",
      label: "Probabilitas (%)",
      type: "number",
      min: 0,
      max: 100,
      step: 1,
      required: true,
    },
    { key: "expected_close", label: "Target closing", type: "date" },
    { key: "next_step", label: "Next action", required: true },
    { key: "next_action_due_date", label: "Tenggat next action", type: "date" },
    {
      key: "lost_reason",
      label: "Alasan lost",
      type: "textarea",
      help: "Wajib diisi jika tahap Lost.",
    },
    { key: "notes", label: "Catatan peluang", type: "textarea" },
  ];
  const selected = data.opportunities.find((o) => o.id === detail);
  const newOpportunity = () =>
    setForm({
      owner_id: profile.id,
      stage: "lead",
      value: 0,
      probability: 10,
      next_step: "",
    });
  async function changeStage(o: Opportunity, stage: Stage) {
    if (stage === o.stage) return;
    if (stage === "lost") {
      setForm({ ...o, stage });
      return;
    }
    setBusy(o.id);
    try {
      await save("opportunities", {
        id: o.id,
        stage,
        ...(stage === "won" ? { probability: 100 } : {}),
      });
      notify(tr("Tahap peluang diperbarui."));
    } catch (error) {
      notify(error instanceof Error ? (error.message) : (tr("Tahap gagal disimpan.")));
    } finally {
      setBusy(null);
    }
  }
  return (
    <>
      <PageHead
        eyebrow={tr("SALES & PRODUCT PIPELINE")}
        title={tr("Pipeline peluang")}
        action={
          <AddButton
            disabled={!canCreate || !accounts.length || !products.length}
            onClick={newOpportunity}
          >{tr("Tambah peluang")}</AddButton>
        }
      />
      <div className="metrics-strip">
        <Stat label={tr("Peluang aktif")} value={active.length} />
        <Stat label={tr("Nilai pipeline aktif")} value={shortMoney(total)} />
        <Stat label={tr("Pipeline tertimbang")} value={shortMoney(weighted)} />
        <Stat label={tr("Nilai Won")} value={shortMoney(won)} />
      </div>
      <SearchToolbar
        search={search}
        setSearch={setSearch}
        placeholder={tr("Cari peluang, pelanggan, atau produk…")}
      >
        <select
          className="filter-select"
          aria-label={tr("Filter pemilik peluang")}
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
        >
          <option value="all">{tr("Seluruh pemilik")}</option>
          {members.map((m) => (
            <option value={m.value} key={m.value}>
              {localizedLabel(m)}
            </option>
          ))}
        </select>
      </SearchToolbar>
      {!data.accounts.length || !data.products.length ? (
        <Empty
          title={tr("Lengkapi pelanggan dan katalog")}
          description={tr("Peluang menghubungkan satu pelanggan dengan produk. Tambahkan data master melalui menu Pelanggan dan Katalog Produk.")}
        />
      ) : !rows.length ? (
        <Empty
          title={
            search ? (tr("Peluang tidak ditemukan")) : (tr("Pipeline Anda dimulai di sini"))
          }
          description={
            search ? (tr("Coba kata kunci atau pemilik lain.")) : (tr("Catat peluang pertama dan tentukan langkah berikutnya."))
          }
          action={
            canCreate ? (
              <AddButton onClick={newOpportunity}>{tr("Tambah peluang")}</AddButton>
            ) : undefined
          }
        />
      ) : (
        <div
          className="pipeline-board"
          style={{
            display: "flex",
            gap: 16,
            overflowX: "auto",
            paddingBottom: 16,
          }}
        >
          {stages.map((stage) => {
            const items = rows.filter((o) => o.stage === stage);
            return (
              <section
                className="pipeline-column"
                key={stage}
                style={{ minWidth: 258, width: 258, flexShrink: 0 }}
              >
                <div className="pipeline-stage">
                  <span>
                    <span className={"stage-dot " + stage} />
                    <strong>{STAGE_LABEL[stage]}</strong>{" "}
                    <span className="muted">{items.length}</span>
                  </span>
                  <small className="muted">
                    {shortMoney(items.reduce((s, o) => s + Number(o.value), 0))}
                  </small>
                </div>
                <div className="pipeline-items">
                  {items.map((o) => (
                    <article className="pipeline-card card" key={o.id}>
                      <button
                        className="pipeline-title text-button"
                        onClick={() => setDetail(o.id)}
                      >
                        <strong>{o.title}</strong>
                      </button>
                      <p className="muted">
                        {data.accounts.find((a) => a.id === o.account_id)
                          ?.name || (tr("Pelanggan tidak tersedia"))}
                      </p>
                      <p className="pipeline-value">{money(o.value)}</p>
                      <p className="muted">
                        <Package size={13} />{" "}
                        {data.products.find((p) => p.id === o.product_id)
                          ?.name || (tr("Produk tidak tersedia"))}
                      </p>
                      <div className="pipeline-probability">
                        <span
                          style={{
                            display: "block",
                            width:
                              Math.min(100, Math.max(0, o.probability)) + "%",
                          }}
                        />
                      </div>
                      <div className="relation-item">
                        <span className="muted">{tr("Probabilitas")}</span>
                        <strong>{o.probability}%</strong>
                      </div>
                      <p className="next-action">
                        <ArrowRight size={13} />{" "}
                        {o.next_step || (tr("Next action belum diisi"))}
                      </p>
                      <div className="relation-item">
                        <small className="muted">
                          {data.profiles.find((p) => p.id === o.owner_id)
                            ?.full_name || "—"}
                        </small>
                        <small className="muted">
                          {displayDate(o.expected_close, {
                            day: "numeric",
                            month: "short",
                          })}
                        </small>
                      </div>
                      <select
                        aria-label={tr("Ubah tahap {{value0}}", { value0: (o.title) })}
                        className="filter-select"
                        value={o.stage}
                        disabled={!canEdit(o) || busy === o.id}
                        onChange={(e) =>
                          void changeStage(o, e.target.value as Stage)
                        }
                      >
                        {stages.map((s) => (
                          <option key={s} value={s}>
                            {STAGE_LABEL[s]}
                          </option>
                        ))}
                      </select>
                    </article>
                  ))}
                  {!items.length && (
                    <div className="pipeline-empty">{tr("Belum ada peluang")}</div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
      {selected && (
        <Dialog title={selected.title} onClose={() => setDetail(null)}>
          <div className="dialog-body detail-section">
            <Badge value={selected.stage} label={STAGE_LABEL[selected.stage]} />
            <h2>{money(selected.value)}</h2>
            <p>
              {data.accounts.find((a) => a.id === selected.account_id)?.name}
            </p>
            <p className="muted">
              {data.products.find((p) => p.id === selected.product_id)?.name}
            </p>
            <div className="detail-grid">
              <p>{tr("Probabilitas")}<br />
                <strong>{selected.probability}%</strong>
              </p>
              <p>{tr("Target closing")}<br />
                <strong>{displayDate(selected.expected_close)}</strong>
              </p>
              <p>{tr("Pemilik")}<br />
                <strong>
                  {data.profiles.find((p) => p.id === selected.owner_id)
                    ?.full_name || "—"}
                </strong>
              </p>
              <p>{tr("Tenggat next action")}<br />
                <strong>{displayDate(selected.next_action_due_date)}</strong>
              </p>
            </div>
            <h3>{tr("Next action")}</h3>
            <p className="preserve-lines">
              {selected.next_step || (tr("Belum diisi"))}
            </p>
            {selected.stage === "lost" && (
              <>
                <h3>{tr("Alasan lost")}</h3>
                <p>{selected.lost_reason}</p>
              </>
            )}
            {selected.notes && (
              <>
                <h3>{tr("Catatan")}</h3>
                <p className="preserve-lines">{selected.notes}</p>
              </>
            )}
            <button
              className="btn primary"
              disabled={!canEdit(selected)}
              onClick={() => setForm(selected)}
            >{tr("Edit peluang")}</button>
          </div>
        </Dialog>
      )}
      {form && (
        <EntityForm
          title={form.id ? (tr("Edit peluang")) : (tr("Tambah peluang"))}
          initial={{ ...opportunityDefaults, ...form }}
          fields={fields}
          onClose={() => setForm(null)}
          onSave={async (row) => {
            const result = {
              ...form,
              ...row,
              value: Number(row.value),
              probability:
                row.stage === "won"
                  ? 100
                  : row.stage === "lost"
                    ? 0
                    : Number(row.probability),
            };
            if (
              result.stage === "lost" &&
              !String(result.lost_reason || "").trim()
            )
              throw new Error(tr("Alasan lost wajib diisi."));
            if (
              !Number.isFinite(result.value) ||
              !Number.isFinite(result.probability) ||
              result.value < 0 ||
              result.probability < 0 ||
              result.probability > 100
            )
              throw new Error(
                tr("Nilai dan probabilitas berada di luar rentang yang diizinkan."),
              );
            await save("opportunities", result);
            setForm(null);
          }}
        />
      )}
    </>
  );
}

export function TasksPage() {
  const { data, profile, save, notify } = useCRM();
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState("open"),
    [scope, setScope] = useState("all"),
    [form, setForm] = useState<Partial<Task> | null>(null),
    [busy, setBusy] = useState<string | null>(null);
  const canCreate = profile.role !== "viewer",
    manager = isManager(profile.role),
    today = dateOnly(),
    overdue = (t: Task) =>
      !!t.due_date &&
      t.due_date < today &&
      !["done", "cancelled"].includes(t.status),
    canEdit = (t: Task) =>
      canCreate && (manager || t.assigned_to === profile.id);
  const rows = data.tasks
    .filter(
      (t) =>
        (scope === "all" || t.assigned_to === profile.id) &&
        (filter === "all" ||
          (filter === "overdue" && overdue(t)) ||
          (filter === "open" && !["done", "cancelled"].includes(t.status)) ||
          t.status === filter) &&
        [
          t.title,
          t.notes,
          data.accounts.find((a) => a.id === t.account_id)?.name,
        ].some((v) => includes(v, search)),
    )
    .sort((a, b) => (a.due_date || "9999").localeCompare(b.due_date || "9999"));
  const fields: Field[] = [
    { key: "title", label: "Tugas / tindak lanjut", required: true },
    {
      key: "assigned_to",
      label: "Penanggung jawab",
      type: "select",
      required: true,
      options: data.profiles
        .filter((p) => p.active && (manager || p.id === profile.id))
        .map((p) => ({ value: p.id, label: p.full_name })),
    },
    { key: "due_date", label: "Tenggat", type: "date", required: true },
    {
      key: "priority",
      label: "Prioritas",
      type: "select",
      required: true,
      options: priorities,
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      required: true,
      options: taskStatuses,
    },
    {
      key: "account_id",
      label: "Pelanggan terkait",
      type: "select",
      options: data.accounts.map((a) => ({ value: a.id, label: a.name })),
    },
    {
      key: "opportunity_id",
      label: "Peluang terkait",
      type: "select",
      options: data.opportunities.map((o) => ({ value: o.id, label: o.title })),
    },
    {
      key: "activity_id",
      label: "Kegiatan terkait",
      type: "select",
      options: data.activities.map((a) => ({ value: a.id, label: a.title })),
    },
    { key: "notes", label: "Catatan / hasil tindak lanjut", type: "textarea" },
  ];
  const newTask = () =>
    setForm({
      assigned_to: profile.id,
      due_date: today,
      status: "todo",
      priority: "medium",
    });
  async function complete(t: Task) {
    setBusy(t.id);
    try {
      await save("tasks", { id: t.id, status: "done" });
      notify(tr("Tindak lanjut diselesaikan."));
    } catch (error) {
      notify(
        error instanceof Error ? (error.message) : (tr("Tugas gagal diperbarui.")),
      );
    } finally {
      setBusy(null);
    }
  }
  return (
    <>
      <PageHead
        eyebrow={tr("TEAM FOLLOW-UP")}
        title={tr("Tindak lanjut")}
        action={
          <AddButton onClick={newTask} disabled={!canCreate}>{tr("Tambah tugas")}</AddButton>
        }
      />
      <div className="metrics-strip">
        <Stat
          label={tr("Tugas terbuka")}
          value={
            data.tasks.filter((t) => !["done", "cancelled"].includes(t.status))
              .length
          }
        />
        <Stat label={tr("Terlambat")} value={data.tasks.filter(overdue).length} />
        <Stat
          label={tr("Tugas saya")}
          value={
            data.tasks.filter(
              (t) =>
                t.assigned_to === profile.id &&
                !["done", "cancelled"].includes(t.status),
            ).length
          }
        />
        <Stat
          label={tr("Selesai")}
          value={data.tasks.filter((t) => t.status === "done").length}
        />
      </div>
      <div className="card">
        <SearchToolbar
          search={search}
          setSearch={setSearch}
          placeholder={tr("Cari tindak lanjut atau pelanggan…")}
        >
          <select
            aria-label={tr("Filter status tugas")}
            className="filter-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="open">{tr("Tugas terbuka")}</option>
            <option value="overdue">{tr("Terlambat")}</option>
            <option value="all">{tr("Semua status")}</option>
            {taskStatuses.map((s) => (
              <option key={s.value} value={s.value}>
                {localizedLabel(s)}
              </option>
            ))}
          </select>
          <select
            aria-label={tr("Filter penanggung jawab tugas")}
            className="filter-select"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
          >
            <option value="all">{tr("Seluruh tim")}</option>
            <option value="mine">{tr("Tugas saya")}</option>
          </select>
        </SearchToolbar>
        {rows.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{tr("Tindak lanjut")}</th>
                  <th>{tr("Penanggung jawab")}</th>
                  <th>{tr("Tenggat")}</th>
                  <th>{tr("Prioritas")}</th>
                  <th>{tr("Status")}</th>
                  <th>{tr("Aksi")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <button
                        className="text-button"
                        onClick={() => setForm(t)}
                        disabled={!canEdit(t)}
                      >
                        <strong>{t.title}</strong>
                      </button>
                      <small className="muted">
                        {data.accounts.find((a) => a.id === t.account_id)
                          ?.name ||
                          data.activities.find((a) => a.id === t.activity_id)
                            ?.title || (tr("Tugas internal"))}
                      </small>
                      {t.notes && <small className="muted">{t.notes}</small>}
                    </td>
                    <td>
                      {data.profiles.find((p) => p.id === t.assigned_to)
                        ?.full_name || "—"}
                    </td>
                    <td>
                      <span className={overdue(t) ? "overdue-text" : ""}>
                        {displayDate(t.due_date)}
                      </span>
                      {overdue(t) && (
                        <small className="overdue-text">{tr("Terlambat")}</small>
                      )}
                    </td>
                    <td>
                      <Badge
                        value={t.priority}
                        label={labelFor(priorities, t.priority)}
                      />
                    </td>
                    <td>
                      <Badge
                        value={t.status}
                        label={labelFor(taskStatuses, t.status)}
                      />
                    </td>
                    <td>
                      <div className="inline-actions">
                        <button
                          className="btn secondary small"
                          onClick={() => setForm(t)}
                          disabled={!canEdit(t)}
                        >{tr("Edit")}</button>
                        {!["done", "cancelled"].includes(t.status) && (
                          <button
                            className="btn secondary small"
                            aria-label={tr("Selesaikan {{value0}}", { value0: (t.title) })}
                            disabled={!canEdit(t) || busy === t.id}
                            onClick={() => void complete(t)}
                          >
                            <Check size={15} />{tr("Selesai")}</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title={
              search ? (tr("Tugas tidak ditemukan")) : (tr("Tidak ada tugas pada filter ini"))
            }
            description={tr("Tambahkan tindak lanjut atau pilih filter lain untuk melihat pekerjaan tim.")}
            action={
              canCreate ? (
                <AddButton onClick={newTask}>{tr("Tambah tugas")}</AddButton>
              ) : undefined
            }
          />
        )}
      </div>
      {form && (
        <EntityForm
          title={form.id ? (tr("Edit tindak lanjut")) : (tr("Tambah tindak lanjut"))}
          initial={{ ...taskDefaults, ...form }}
          fields={fields}
          onClose={() => setForm(null)}
          onSave={async (row) => {
            const payload = {
              ...form,
              ...row,
              activity_id: row.activity_id || null,
              account_id: row.account_id || null,
              opportunity_id: row.opportunity_id || null,
            };
            const opportunity = data.opportunities.find(
                (o) => o.id === payload.opportunity_id,
              ),
              activity = data.activities.find(
                (a) => a.id === payload.activity_id,
              );
            if (payload.opportunity_id && !opportunity)
              throw new Error(
                tr("Peluang terkait tidak ditemukan. Pilih kembali peluang."),
              );
            if (payload.activity_id && !activity)
              throw new Error(
                tr("Kegiatan terkait tidak ditemukan. Pilih kembali kegiatan."),
              );
            if (
              opportunity &&
              payload.account_id &&
              opportunity.account_id !== payload.account_id
            )
              throw new Error(
                tr("Peluang tugas tidak sesuai dengan pelanggan yang dipilih."),
              );
            if (
              activity &&
              payload.account_id &&
              activity.account_id !== payload.account_id
            )
              throw new Error(
                tr("Kegiatan tugas tidak sesuai dengan pelanggan yang dipilih."),
              );
            if (
              activity &&
              opportunity &&
              ((activity.opportunity_id &&
                activity.opportunity_id !== opportunity.id) ||
                (activity.account_id &&
                  activity.account_id !== opportunity.account_id))
            )
              throw new Error(
                tr("Kegiatan dan peluang tugas berasal dari konteks pelanggan atau peluang yang berbeda."),
              );
            await save("tasks", payload);
            setForm(null);
          }}
        />
      )}
    </>
  );
}

export function CatalogPage({ onOpenKnowledge }: { onOpenKnowledge?: (productId: string) => void } = {}) {
  const { data, profile, save } = useCRM();
  const [search, setSearch] = useState(""),
    [category, setCategory] = useState("all"),
    [brand, setBrand] = useState("all"),
    [selected, setSelected] = useState<string | null>(null),
    [form, setForm] = useState<Partial<Product> | null>(null);
  const manager = isManager(profile.role),
    categories = useMemo(
      () =>
        Array.from(new Set(data.products.map((p) => p.category)))
          .filter(Boolean)
          .sort(),
      [data.products],
    ),
    brands = useMemo(
      () =>
        Array.from(new Set(data.products.map((p) => p.brand)))
          .filter(Boolean)
          .sort(),
      [data.products],
    );
  const rows = data.products
    .filter(
      (p) =>
        (category === "all" || p.category === category) &&
        (brand === "all" || p.brand === brand) &&
        [p.name, p.brand, p.category, p.description].some((v) =>
          includes(v, search),
        ),
    )
    .sort(
      (a, b) =>
        a.category.localeCompare(b.category, getLocale()) || a.name.localeCompare(b.name, getLocale()),
    );
  const product = data.products.find((p) => p.id === selected);
  const fields: Field[] = [
    { key: "name", label: "Nama / model produk", required: true },
    { key: "brand", label: "Brand / prinsipal", required: true },
    { key: "category", label: "Kategori / modalitas", required: true },
    {
      key: "description",
      label: "Ringkasan produk",
      type: "textarea",
      help: "Gunakan fakta terverifikasi; jangan menambahkan klaim atau spesifikasi yang tidak ada pada sumber.",
    },
    {
      key: "source_page",
      label: "Halaman sumber PDF",
      type: "number",
      min: 1,
      step: 1,
      required: true,
    },
    { key: "active", label: "Produk aktif", type: "checkbox" },
  ];
  return (
    <div className="catalog-refinement">
      <PageHead
        eyebrow={tr("TTM PRODUCT LIBRARY")}
        title={tr("Katalog produk")}
        description={tr("Satu referensi untuk portofolio produk dan solusi TTM.")}
        action={
          manager ? (
            <AddButton
              onClick={() =>
                setForm({ brand: "TechnoMed", active: true, source_page: 1 })
              }
            >{tr("Tambah produk")}</AddButton>
          ) : undefined
        }
      />
      <div className="catalog-source card">
        <div>
          <strong>{tr("Katalog TTM 2026")}</strong>
          <p className="muted">{tr("Data model, family, dan varian dari katalog resmi yang dilampirkan. Jumlah entri bukan jumlah SKU final; referensi halaman menggunakan urutan halaman PDF.")}</p>
        </div>
        <Badge value="active" label={tr("{{value0}} entri", { value0: (data.products.length) })} />
      </div>
      <SearchToolbar
        search={search}
        setSearch={setSearch}
        placeholder={tr("Cari nama produk, brand, atau modalitas…")}
      >
        <select
          className="filter-select"
          aria-label={tr("Filter kategori produk")}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="all">{tr("Semua kategori")}</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          className="filter-select"
          aria-label={tr("Filter brand produk")}
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
        >
          <option value="all">{tr("Semua brand")}</option>
          {brands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </SearchToolbar>
      <p className="muted result-count">{tr("Menampilkan {{value0}} produk", { value0: rows.length })}</p>
      {rows.length ? (
        <div
          className="product-grid"
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fill,minmax(min(100%,270px),1fr))",
            gap: 18,
          }}
        >
          {rows.map((p) => (
            <article className="product-card card" key={p.id}>
              <div className="product-card-top">
                <span className="product-icon">
                  <Stethoscope size={25} />
                </span>
                <span className="muted">{p.brand}</span>
              </div>
              <span className="category-label">{p.category}</span>
              <h3>{p.name}</h3>
              {p.description && (
                <p className="muted product-description">{p.description}</p>
              )}
              <div className="relation-item">
                <small className="muted">{tr("Sumber PDF · hal. ")}{p.source_page || "—"}
                </small>
                {p.active === false && (
                  <Badge value="inactive" label={tr("Tidak aktif")} />
                )}
              </div>
              <button
                className="btn secondary product-detail-button"
                onClick={() => setSelected(p.id)}
              >{tr("Detail produk ")}<ArrowRight size={15} />
              </button>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          title={tr("Produk tidak ditemukan")}
          description={tr("Coba kata kunci, kategori, atau brand lain.")}
        />
      )}
      {product && (
        <Dialog title={product.name} onClose={() => setSelected(null)}>
          <div className="dialog-body detail-section">
            <div className="product-card-top">
              <span className="product-icon">
                <Stethoscope size={30} />
              </span>
              <Badge
                value={product.active === false ? "inactive" : "active"}
                label={product.active === false ? (tr("Tidak aktif")) : (tr("Aktif"))}
              />
            </div>
            <p className="eyebrow">
              {product.brand} · {product.category}
            </p>
            {product.description && (
              <p className="preserve-lines">{product.description}</p>
            )}
            {Object.keys(product.specs || {}).length > 0 && (
              <>
                <h3>{tr("Informasi produk")}</h3>
                <dl className="spec-list">
                  {Object.entries(product.specs).map(([key, value]) => (
                    <div className="relation-item" key={key}>
                      <dt className="muted">{key.replaceAll("_", " ")}</dt>
                      <dd>{textValue(value)}</dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
            <div className="source-note">
              <strong>{tr("Referensi katalog")}</strong>
              <p>{tr("Katalog TTM 2026 · halaman PDF")}{" "}
                {product.source_page || (tr("belum dicatat"))}
                {product.source_page > 1 ? (tr(" (halaman tercetak {{value0}})", { value0: ((product.source_page - 1)) })) : ("")}
                .
              </p>
              <p className="muted">{tr("Spesifikasi, izin edar, harga, dan ketersediaan perlu dikonfirmasi sebelum penawaran.")}</p>
            </div>
            <h3>{tr("Penggunaan di CRM")}</h3>
            <p>
              {
                data.opportunities.filter((o) => o.product_id === product.id)
                  .length
              }{" "}{tr("peluang ·")}{" "}
              {
                data.activities.filter((a) => a.product_id === product.id)
                  .length
              }{" "}{tr("kegiatan ·")}{" "}
              {data.equipment.filter((e) => e.product_id === product.id).length}{" "}{tr("unit demo terdaftar")}</p>
            {manager && (
              <button className="btn primary" onClick={() => setForm(product)}>{tr("Edit produk")}</button>
            )}
            {onOpenKnowledge && (
              <button className="btn secondary" onClick={() => onOpenKnowledge(product.id)}>
                {tr("Lihat materi produk")} ({data.knowledge_documents.filter((document) => document.product_id === product.id && document.status === "active").length})
              </button>
            )}
          </div>
        </Dialog>
      )}
      {form && (
        <EntityForm
          title={form.id ? (tr("Edit produk")) : (tr("Tambah produk"))}
          initial={{ ...productDefaults, ...form }}
          fields={fields}
          onClose={() => setForm(null)}
          onSave={async (row) => {
            await save("products", {
              ...form,
              ...row,
              source_page: Number(row.source_page),
              specs: form.specs || {},
            });
            setForm(null);
          }}
        />
      )}
    </div>
  );
}

export function EquipmentPage() {
  const { data, profile, save } = useCRM();
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState("all"),
    [selected, setSelected] = useState<string | null>(null),
    [form, setForm] = useState<Partial<Equipment> | null>(null);
  const manager = isManager(profile.role),
    unit = data.equipment.find((e) => e.id === selected),
    rows = data.equipment.filter(
      (e) =>
        (status === "all" || e.status === status) &&
        [
          e.name,
          e.code,
          e.serial_number,
          e.location,
          data.products.find((p) => p.id === e.product_id)?.name,
        ].some((v) => includes(v, search)),
    );
  const reservations = (id: string) =>
    data.activities
      .filter(
        (a) =>
          a.equipment_ids.includes(id) &&
          ["submitted", "approved", "in_progress"].includes(a.status) &&
          new Date(a.end_at) >= new Date(),
      )
      .sort((a, b) => a.start_at.localeCompare(b.start_at));
  const fields: Field[] = [
    { key: "name", label: "Nama unit", required: true },
    { key: "code", label: "Kode unit unik", required: true },
    {
      key: "product_id",
      label: "Produk",
      type: "select",
      required: true,
      options: data.products
        .filter((p) => p.active !== false)
        .map((p) => ({ value: p.id, label: p.name })),
    },
    {
      key: "status",
      label: "Status operasional",
      type: "select",
      required: true,
      options: equipmentStatuses,
    },
    { key: "serial_number", label: "Serial number" },
    { key: "location", label: "Lokasi unit" },
    { key: "notes", label: "Kondisi / catatan", type: "textarea" },
  ];
  return (
    <>
      <PageHead
        eyebrow={tr("DEMO RESOURCE MANAGEMENT")}
        title={tr("Unit demo")}
        description={tr("Kelola kesiapan unit dan lihat reservasi kegiatan tim.")}
        action={
          manager ? (
            <AddButton
              disabled={!data.products.length}
              onClick={() => setForm({ status: "available" })}
            >{tr("Tambah unit")}</AddButton>
          ) : undefined
        }
      />
      <div className="metrics-strip">
        <Stat label={tr("Unit terdaftar")} value={data.equipment.length} />
        <Stat
          label={tr("Operasional")}
          value={data.equipment.filter((e) => e.status === "available").length}
        />
        <Stat
          label={tr("Pemeliharaan")}
          value={
            data.equipment.filter((e) => e.status === "maintenance").length
          }
        />
        <Stat
          label={tr("Unit dengan reservasi")}
          value={data.equipment.filter((e) => reservations(e.id).length).length}
        />
      </div>
      <div className="card">
        <SearchToolbar
          search={search}
          setSearch={setSearch}
          placeholder={tr("Cari unit, kode, produk, atau lokasi…")}
        >
          <select
            className="filter-select"
            aria-label={tr("Filter status unit")}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">{tr("Semua status")}</option>
            {equipmentStatuses.map((s) => (
              <option value={s.value} key={s.value}>
                {localizedLabel(s)}
              </option>
            ))}
          </select>
        </SearchToolbar>
        {rows.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{tr("Unit demo")}</th>
                  <th>{tr("Produk")}</th>
                  <th>{tr("Lokasi")}</th>
                  <th>{tr("Status")}</th>
                  <th>{tr("Reservasi berikutnya")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => {
                  const next = reservations(e.id)[0];
                  return (
                    <tr key={e.id}>
                      <td>
                        <button
                          className="text-button"
                          onClick={() => setSelected(e.id)}
                        >
                          <strong>{e.name}</strong>
                        </button>
                        <small className="muted">
                          {e.code}
                          {e.serial_number ? (tr(" · SN {{value0}}", { value0: (e.serial_number) })) : ("")}
                        </small>
                      </td>
                      <td>
                        {data.products.find((p) => p.id === e.product_id)
                          ?.name || "—"}
                      </td>
                      <td>{e.location || "—"}</td>
                      <td>
                        <Badge
                          value={e.status}
                          label={labelFor(equipmentStatuses, e.status)}
                        />
                      </td>
                      <td>
                        {next ? (
                          <>
                            <span>
                              {displayDate(next.start_at, {
                                day: "numeric",
                                month: "short",
                              })}{" "}
                              · {displayTime(next.start_at)}
                            </span>
                            <small className="muted">{next.title}</small>
                          </>
                        ) : (
                          <span className="muted">{tr("Belum ada reservasi")}</span>
                        )}
                      </td>
                      <td>
                        <button
                          className="btn secondary small"
                          onClick={() => setSelected(e.id)}
                        >{tr("Detail")}</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title={search ? (tr("Unit tidak ditemukan")) : (tr("Belum ada unit demo"))}
            description={
              search ? (tr("Coba kata kunci atau status lain.")) : (tr("Daftarkan unit fisik untuk mulai mengelola reservasi. Katalog produk tidak otomatis menjadi stok unit."))
            }
            action={
              manager && data.products.length ? (
                <AddButton onClick={() => setForm({ status: "available" })}>{tr("Tambah unit")}</AddButton>
              ) : undefined
            }
          />
        )}
      </div>
      {unit && (
        <Dialog title={unit.name} onClose={() => setSelected(null)}>
          <div className="dialog-body detail-section">
            <Badge
              value={unit.status}
              label={labelFor(equipmentStatuses, unit.status)}
            />
            <p className="eyebrow">{unit.code}</p>
            <h3>{data.products.find((p) => p.id === unit.product_id)?.name}</h3>
            <p>{tr("Serial number: ")}{unit.serial_number || "—"}</p>
            <p>
              <MapPin size={14} /> {unit.location || (tr("Lokasi belum diisi"))}
            </p>
            {unit.notes && <p className="preserve-lines">{unit.notes}</p>}
            <h3>{tr("Reservasi aktif / mendatang")}</h3>
            {reservations(unit.id).map((a) => (
              <div className="relation-item" key={a.id}>
                <div>
                  <strong>{a.title}</strong>
                  <p className="muted">
                    {displayDate(a.start_at)} · {displayTime(a.start_at)} –{" "}
                    {displayDate(a.end_at)} · {displayTime(a.end_at)}
                  </p>
                  <small className="muted">
                    {data.profiles.find((p) => p.id === a.owner_id)
                      ?.full_name || "—"}
                    {a.location ? " · " + a.location : ""}
                  </small>
                </div>
                <Badge value={a.status} label={STATUS_LABEL[a.status]} />
              </div>
            ))}
            {!reservations(unit.id).length && (
              <p className="muted">{tr("Tidak ada reservasi aktif atau mendatang.")}</p>
            )}
            <p className="source-note muted">{tr("Reservasi dibuat melalui Kalender & Aktivitas. Sistem memeriksa bentrok waktu sebelum pengajuan disimpan.")}</p>
            {manager && (
              <button className="btn primary" onClick={() => setForm(unit)}>{tr("Edit unit")}</button>
            )}
          </div>
        </Dialog>
      )}
      {form && (
        <EntityForm
          title={form.id ? (tr("Edit unit demo")) : (tr("Tambah unit demo"))}
          initial={{ ...equipmentDefaults, ...form }}
          fields={fields}
          onClose={() => setForm(null)}
          onSave={async (row) => {
            const code = String(row.code || "").trim();
            if (
              data.equipment.some(
                (e) =>
                  e.id !== form.id &&
                  e.code.toLowerCase() === code.toLowerCase(),
              )
            )
              throw new Error(tr("Kode unit sudah digunakan. Gunakan kode unik."));
            await save("equipment", { ...form, ...row, code });
            setForm(null);
          }}
        />
      )}
    </>
  );
}
