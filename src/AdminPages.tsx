// localized-ui-v1
import { tr, localizedLabel, useLanguage } from "./i18n";
import React, { useState } from "react";
import {
  Plus,
  Mail,
  MapPin,
  Users,
  ShieldCheck,
  Download,
  ExternalLink,
  RotateCcw,
  Settings2,
  UserRound,
} from "lucide-react";
import { useCRM, supabase, resetDemo, unwrapFunctionError, friendlyError } from "./store";
import {
  PageHead,
  Badge,
  EntityForm,
  Empty,
  SearchToolbar,
  Dialog,
  type Field,
} from "./ui";
import { ROLE_LABEL, type Profile, type Role } from "./types";
import { isManager, displayDate, dateOnly, downloadCSV } from "./rules";
const roleOptions = () => Object.entries(ROLE_LABEL).map(([value, label]) => ({
  value,
  label,
}));
export function TeamPage() {
  useLanguage();
  const { data, profile, demo, save, refresh, notify } = useCRM();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [edit, setEdit] = useState<Partial<Profile> | null>(null);
  const [invite, setInvite] = useState(false);
  const manager = isManager(profile.role);
  const rows = data.profiles.filter(
    (p) =>
      (!role || p.role === role) &&
      `${p.full_name} ${p.email} ${p.region}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const fields: Field[] = [
    { key: "full_name", label: tr("Nama lengkap"), required: true },
    { key: "email", label: tr("Email bisnis"), type: "email", required: true },
    {
      key: "role",
      label: tr("Peran"),
      type: "select",
      required: true,
      options: roleOptions(),
    },
    { key: "region", label: tr("Wilayah") },
    {
      key: "skills",
      label: tr("Kompetensi / produk"),
      help: tr("Pisahkan dengan koma."),
    },
    ...(edit?.id
      ? [{ key: "active", label: tr("Anggota aktif"), type: "checkbox" } as Field]
      : []),
  ];
  async function saveTeam(row: any) {
    if (demo) {
      await save("profiles", {
        ...row,
        id: row.id || crypto.randomUUID(),
        skills: String(row.skills || "")
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean),
        active: row.id ? !!row.active : true,
      });
      notify(tr("Anggota simulasi tersimpan. Tidak ada email undangan dikirim."));
    } else {
      const { data: d, error: e } = await supabase!.functions.invoke(
        "team-admin",
        {
          body: {
            ...row,
            action: row.id ? "update" : "invite",
            skills: String(row.skills || "")
              .split(",")
              .map((s: string) => s.trim())
              .filter(Boolean),
          },
        },
      );
      if (e) throw await unwrapFunctionError(e);
      if (d?.error) throw Error(d.error);
      try {
        await refresh();
      } catch {
        notify(tr("Perubahan tersimpan; muat ulang untuk memperbarui daftar."));
      }
      notify(
        row.id ? (tr("Profil tim diperbarui.")) : (tr("Undangan telah dikirim melalui Supabase Auth.")),
      );
    }
    setInvite(false);
    setEdit(null);
  }
  return (
    <>
      <PageHead
        eyebrow={tr("PEOPLE & CAPACITY")}
        title={tr("Tim produk")}
        description={tr("Satu tim, penugasan yang jelas, dan kapasitas yang terlihat.")}
        action={
          manager && (
            <button
              className="btn primary"
              onClick={() => {
                setInvite(true);
                setEdit({
                  role: "product_specialist",
                  active: true,
                  skills: [],
                });
              }}
            >
              <Plus size={17} />{tr("Undang anggota")}</button>
          )
        }
      />
      <div className="metrics-strip">
        <div className="metric-item">
          <span>{tr("Anggota aktif")}</span>
          <strong>{data.profiles.filter((p) => p.active).length}</strong>
        </div>
        <div className="metric-item">
          <span>{tr("Product Specialist")}</span>
          <strong>
            {
              data.profiles.filter(
                (p) => p.active && p.role === "product_specialist",
              ).length
            }
          </strong>
        </div>
        <div className="metric-item">
          <span>{tr("Application Specialist")}</span>
          <strong>
            {
              data.profiles.filter(
                (p) => p.active && p.role === "application_specialist",
              ).length
            }
          </strong>
        </div>
        <div className="metric-item">
          <span>{tr("Penugasan bulan ini")}</span>
          <strong>
            {
              data.activities.filter(
                (a) =>
                  dateOnly(a.start_at).slice(0, 7) === dateOnly().slice(0, 7) &&
                  a.status !== "cancelled",
              ).length
            }
          </strong>
        </div>
      </div>
      <SearchToolbar
        search={search}
        setSearch={setSearch}
        placeholder={tr("Cari nama, email, atau wilayah…")}
      >
        <select
          aria-label={tr("Filter peran")}
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="">{tr("Semua peran")}</option>
          {roleOptions().map((o) => (
            <option key={o.value} value={o.value}>
              {localizedLabel(o)}
            </option>
          ))}
        </select>
      </SearchToolbar>
      <div className="team-grid">
        {rows.map((p) => {
          const assigned = data.activities.filter(
            (a) =>
              [a.owner_id, ...a.participant_ids].includes(p.id) &&
              dateOnly(a.start_at).slice(0, 7) === dateOnly().slice(0, 7) &&
              !["cancelled", "rejected"].includes(a.status),
          );
          return (
            <article className="card team-card" key={p.id}>
              <div className="team-card-head">
                <div className="avatar large">
                  {p.full_name
                    .split(" ")
                    .map((s) => s[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <Badge
                  value={p.active ? "active" : "inactive"}
                  label={p.active ? (tr("Aktif")) : (tr("Nonaktif"))}
                />
              </div>
              <h3>{p.full_name}</h3>
              <div className="team-role">{ROLE_LABEL[p.role]}</div>
              <p>
                <Mail size={14} />
                {p.email}
              </p>
              <p>
                <MapPin size={14} />
                {p.region || (tr("Wilayah belum diisi"))}
              </p>
              <div className="tag-list">
                {(p.skills || []).map((s) => (
                  <span className="tag" key={s}>
                    {s}
                  </span>
                ))}
              </div>
              <div className="team-workload">
                <span>{tr("Kegiatan bulan ini")}</span>
                <strong>{assigned.length}</strong>
              </div>
              <div className="team-card-foot">
                <span>
                  <ShieldCheck size={14} />
                  {p.id === profile.id ? (tr("Akun Anda")) : (tr("Akses internal"))}
                </span>
                {manager && (
                  <button className="text-btn" onClick={() => setEdit(p)}>{tr("Kelola profil")}</button>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {!rows.length && (
        <Empty
          title={tr("Anggota tidak ditemukan")}
          description={tr("Sesuaikan pencarian atau filter peran.")}
        />
      )}
      {edit && (
        <EntityForm
          title={invite ? (tr("Undang anggota tim")) : (tr("Kelola anggota"))}
          initial={{ ...edit, skills: edit.skills?.join(", ") || "" }}
          fields={fields.filter((f) => !edit.id || f.key !== "email")}
          onClose={() => {
            setEdit(null);
            setInvite(false);
          }}
          onSave={saveTeam}
        />
      )}
    </>
  );
}
export function SettingsPage() {
  useLanguage();
  const { data, profile, demo, save, refresh, notify } = useCRM();
  const [editProfile, setEditProfile] = useState(false);
  const [editOrg, setEditOrg] = useState(false);
  const [reset, setReset] = useState(false);
  const [audit, setAudit] = useState<string | number | null>(null);
  const org = data.org_settings[0];
  const manager = isManager(profile.role);
  const logs = [...data.audit_logs]
    .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
    .slice(0, 100);
  const selected = logs.find((l) => l.id === audit);
  return (
    <>
      <PageHead
        eyebrow={tr("WORKSPACE ADMINISTRATION")}
        title={tr("Pengaturan")}
        description={tr("Kelola profil, identitas ruang kerja, dan transparansi perubahan.")}
      />
      <div className="settings-grid">
        <section className="card settings-card">
          <div className="panel-head">
            <h2>
              <UserRound size={19} />{tr("Profil saya")}</h2>
            <button className="text-btn" onClick={() => setEditProfile(true)}>{tr("Edit profil")}</button>
          </div>
          <div className="settings-body">
            <strong>{profile.full_name}</strong>
            <p>{profile.email}</p>
            <Badge value={profile.role} label={ROLE_LABEL[profile.role]} />
            <p className="muted">{profile.region || (tr("Wilayah belum diisi"))}</p>
          </div>
        </section>
        <section className="card settings-card">
          <div className="panel-head">
            <h2>
              <Settings2 size={19} />{tr("Organisasi")}</h2>
            {manager && (
              <button className="text-btn" onClick={() => setEditOrg(true)}>{tr("Edit identitas")}</button>
            )}
          </div>
          <div className="settings-body">
            <strong>{org?.name || "Triputra Techno Med"}</strong>
            <p>{tr("Zona waktu tampilan: Asia/Jakarta (WIB)")}</p>
            <p className="muted">{tr("Nilai komersial menggunakan rupiah (IDR).")}</p>
          </div>
        </section>
        <section className="card settings-card">
          <div className="panel-head">
            <h2>
              <ShieldCheck size={19} />{tr("Lingkungan aplikasi")}</h2>
            <Badge
              value={demo ? "draft" : "active"}
              label={demo ? (tr("Sandbox demo")) : (tr("Supabase aktif"))}
            />
          </div>
          <div className="settings-body">
            <p>
              {demo ? (tr("Data simulasi tersimpan hanya di browser ini.")) : (tr("Data ruang kerja dibaca dari backend Supabase yang dikonfigurasi."))}
            </p>
            <p className="muted">{tr("Akses pengguna mengikuti keanggotaan aktif dan role. Pendaftaran publik tidak tersedia.")}</p>
            {demo && (
              <button className="btn secondary" onClick={() => setReset(true)}>
                <RotateCcw size={15} />{tr("Reset data demo")}</button>
            )}
          </div>
        </section>
        <section className="card settings-card">
          <div className="panel-head">
            <h2>
              <Download size={19} />{tr("Dokumentasi produk")}</h2>
          </div>
          <div className="settings-body">
            <p>{tr("PRD, panduan operasional, dan checklist go-live tersedia bersama source project.")}</p>
            <a className="btn secondary" href="/PRD.md" download>
              <Download size={15} />{tr("Unduh PRD")}</a>
            <a
              className="text-btn block"
              href="https://github.com/hamdanfaizworks-collab/CRM-Product"
              target="_blank"
              rel="noreferrer"
            >{tr("Repository project ")}<ExternalLink size={13} />
            </a>
          </div>
        </section>
      </div>
      {manager && (
        <section className="card">
          <div className="panel-head">
            <div>
              <h2>{tr("Audit perubahan")}</h2>
              <p>{tr("100 peristiwa terbaru yang dapat Anda akses.")}</p>
            </div>
            <button
              className="btn secondary small"
              onClick={() =>
                downloadCSV("ttm-audit.csv", [
                  [tr("Waktu"), tr("Entitas"), tr("ID"), tr("Aksi"), tr("Pelaku")],
                  ...logs.map((l) => [
                    l.occurred_at,
                    l.entity_type,
                    l.entity_id,
                    l.action,
                    data.profiles.find((p) => p.id === l.actor_id)?.full_name ||
                      l.actor_id,
                  ]),
                ])
              }
            >
              <Download size={15} />{tr("Ekspor")}</button>
          </div>
          {logs.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{tr("Waktu (WIB)")}</th>
                    <th>{tr("Entitas")}</th>
                    <th>{tr("Aksi")}</th>
                    <th>{tr("Pelaku")}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id}>
                      <td>
                        {displayDate(l.occurred_at, {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td>{l.entity_type}</td>
                      <td>
                        <Badge value={l.action} label={l.action} />
                      </td>
                      <td>
                        {data.profiles.find((p) => p.id === l.actor_id)
                          ?.full_name || (tr("Operator sistem"))}
                      </td>
                      <td>
                        <button
                          className="text-btn"
                          onClick={() => setAudit(l.id)}
                        >{tr("Detail")}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title={tr("Belum ada riwayat perubahan")}
              description={tr("Perubahan data berikutnya akan tampil di sini.")}
            />
          )}
        </section>
      )}
      {editProfile && (
        <EntityForm
          title={tr("Edit profil saya")}
          initial={{
            full_name: profile.full_name,
            region: profile.region,
            skills: profile.skills.join(", "),
          }}
          fields={[{ key: "full_name", label: tr("Nama lengkap"), required: true }]}
          onClose={() => setEditProfile(false)}
          onSave={async (row) => {
            const patch = { full_name: row.full_name };
            if (demo) await save("profiles", { id: profile.id, ...patch });
            else {
              const { data: d, error: e } = await supabase!.functions.invoke(
                "team-admin",
                { body: { action: "update_self", ...patch } },
              );
              if (e) throw await unwrapFunctionError(e);
              if (d?.error) throw Error(d.error);
              await refresh();
            }
            setEditProfile(false);
          }}
        />
      )}
      {editOrg && (
        <EntityForm
          title={tr("Identitas organisasi")}
          initial={
            org || {
              id: "ttm",
              name: "Triputra Techno Med",
              timezone: "Asia/Jakarta",
            }
          }
          fields={[{ key: "name", label: tr("Nama organisasi"), required: true }]}
          onClose={() => setEditOrg(false)}
          onSave={async (row) => {
            await save("org_settings", row);
            setEditOrg(false);
          }}
        />
      )}
      {reset && (
        <Dialog title={tr("Reset sandbox demo?")} onClose={() => setReset(false)}>
          <div className="dialog-body">
            <p>{tr("Perubahan simulasi di browser ini akan diganti dengan contoh awal. Data Supabase tidak terpengaruh.")}</p>
          </div>
          <div className="dialog-footer">
            <button className="btn secondary" onClick={() => setReset(false)}>{tr("Batal")}</button>
            <button
              className="btn primary"
              onClick={async () => {
                try {
                  await resetDemo();
                  await refresh();
                  setReset(false);
                  notify(tr("Sandbox demo direset."));
                } catch (error) { notify(friendlyError(error)); }
              }}
            >{tr("Reset demo")}</button>
          </div>
        </Dialog>
      )}
      {selected && (
        <Dialog title={tr("Detail audit")} onClose={() => setAudit(null)} wide>
          <div className="dialog-body">
            <p>
              {selected.entity_type} · {selected.action} · {selected.entity_id}
            </p>
            <h3>{tr("Sebelum")}</h3>
            <pre className="audit-json">
              {JSON.stringify(selected.old_data, null, 2)}
            </pre>
            <h3>{tr("Sesudah")}</h3>
            <pre className="audit-json">
              {JSON.stringify(selected.new_data, null, 2)}
            </pre>
          </div>
        </Dialog>
      )}
    </>
  );
}
