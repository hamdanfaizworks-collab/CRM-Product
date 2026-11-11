// localized-ui-v1
import { tr, localizedLabel } from "./i18n";
import React, { useEffect, useRef, useState } from "react";
import { Search, X, Inbox, LoaderCircle, ArrowUpRight } from "lucide-react";
import { friendlyError } from "./store";
export function PageHead({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-head">
      <div>
        {eyebrow && <div className="eyebrow">{tr(eyebrow)}</div>}
        <h1>{tr(title)}</h1>
        {description && <p>{tr(description)}</p>}
      </div>
      {action && <div className="page-actions">{action}</div>}
    </div>
  );
}
export function Badge({ value, label }: { value: string; label?: string }) {
  return <span className={`badge badge-${value}`}>{tr(label || value)}</span>;
}
export function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Inbox size={27} />
      </div>
      <h3>{tr(title)}</h3>
      {description && <p>{tr(description)}</p>}
      {action}
    </div>
  );
}
export function SearchToolbar({
  search,
  setSearch,
  placeholder = "Cari data…",
  children,
}: {
  search: string;
  setSearch: (v: string) => void;
  placeholder?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="toolbar">
      <label className="search-field">
        <Search size={17} />
        <input
          aria-label={tr(placeholder)}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={tr(placeholder)}
        />
        {search && (
          <button aria-label={tr("Hapus pencarian")} onClick={() => setSearch("")}>
            <X size={14} />
          </button>
        )}
      </label>
      <div className="toolbar-filters">{children}</div>
    </div>
  );
}
export function Dialog({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={wide ? "dialog wide" : "dialog"}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="dialog-header">
        <h2>{title}</h2>
        <button
          type="button"
          className="icon-btn"
          onClick={onClose}
          aria-label={tr("Tutup dialog")}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export interface Field {
  key: string;
  label: string;
  type?:
    | "text"
    | "email"
    | "tel"
    | "number"
    | "textarea"
    | "select"
    | "multiselect"
    | "date"
    | "datetime-local"
    | "checkbox";
  required?: boolean;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  help?: string;
}
export function EntityForm({
  title,
  initial = {},
  fields,
  onSave,
  onClose,
}: {
  title: string;
  initial?: Record<string, any>;
  fields: Field[];
  onSave: (row: any) => Promise<void>;
  onClose: () => void;
}) {
  const [values, setValues] = useState<Record<string, any>>({ ...initial });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: unknown) => setValues((s) => ({ ...s, [k]: v }));
  return (
    <Dialog
      title={tr(title)}
      onClose={() => {
        if (!busy) onClose();
      }}
      wide={fields.length > 7}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const row = { ...values };
            for (const f of fields) {
              if (
                f.required &&
                (row[f.key] === undefined ||
                  row[f.key] === "" ||
                  (Array.isArray(row[f.key]) && !row[f.key].length))
              )
                throw Error(tr("{{value0}} wajib diisi.", { value0: tr(f.label) }));
              if (f.type === "number") row[f.key] = Number(row[f.key] || 0);
              if (f.type === "checkbox") row[f.key] = !!row[f.key];
              if (f.type === "multiselect") row[f.key] = row[f.key] || [];
            }
            await onSave(row);
          } catch (e) {
            setError(friendlyError(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="dialog-body">
          <div className="form-grid">
            {fields.map((f, i) => (
              <label
                className={`field ${f.type === "textarea" || f.type === "multiselect" ? "full" : ""}`}
                key={f.key}
              >
                <span>
                  {tr(f.label)}
                  {f.required && <b className="required"> *</b>}
                </span>
                {f.type === "textarea" ? (
                  <textarea
                    autoFocus={i === 0}
                    maxLength={15000}
                    required={f.required}
                    value={values[f.key] ?? ""}
                    onChange={(e) => set(f.key, e.target.value)}
                    rows={4}
                  />
                ) : f.type === "select" ? (
                  <select
                    autoFocus={i === 0}
                    required={f.required}
                    value={values[f.key] ?? ""}
                    onChange={(e) => set(f.key, e.target.value)}
                  >
                    <option value="">{tr("Pilih…")}</option>
                    {f.options?.map((o) => (
                      <option key={o.value} value={o.value}>
                        {localizedLabel(o)}
                      </option>
                    ))}
                  </select>
                ) : f.type === "multiselect" ? (
                  <div className="multi-options">
                    {f.options?.length ? (
                      f.options.map((o) => (
                        <label key={o.value}>
                          <input
                            type="checkbox"
                            checked={(values[f.key] || []).includes(o.value)}
                            onChange={(e) =>
                              set(
                                f.key,
                                e.target.checked
                                  ? [...(values[f.key] || []), o.value]
                                  : (values[f.key] || []).filter(
                                      (x: string) => x !== o.value,
                                    ),
                              )
                            }
                          />
                          {localizedLabel(o)}
                        </label>
                      ))
                    ) : (
                      <small>{tr("Belum ada pilihan tersedia.")}</small>
                    )}
                  </div>
                ) : f.type === "checkbox" ? (
                  <input
                    type="checkbox"
                    checked={!!values[f.key]}
                    onChange={(e) => set(f.key, e.target.checked)}
                  />
                ) : (
                  <input
                    autoFocus={i === 0}
                    type={f.type || "text"}
                    required={f.required}
                    min={f.min}
                    max={f.max}
                    step={f.step}
                    maxLength={f.type === "number" ? undefined : 500}
                    value={values[f.key] ?? ""}
                    onChange={(e) => set(f.key, e.target.value)}
                  />
                )}
                {f.help && <small>{tr(f.help)}</small>}
              </label>
            ))}
          </div>
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
        </div>
        <div className="dialog-footer">
          <button
            type="button"
            className="btn secondary"
            disabled={busy}
            onClick={onClose}
          >{tr("Batal")}</button>
          <button className="btn primary" disabled={busy}>
            {busy && <LoaderCircle className="spin" size={16} />}{tr("Simpan")}</button>
        </div>
      </form>
    </Dialog>
  );
}
export function StatCard({
  label,
  value,
  note,
  icon,
  color = "blue",
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  note?: string;
  icon: React.ReactNode;
  color?: string;
  onClick?: () => void;
}) {
  return (
    <button
      className={`stat-card ${color}`}
      onClick={onClick}
      disabled={!onClick}
    >
      <div className="stat-top">
        <span>{tr(label)}</span>
        <span className="stat-icon">{icon}</span>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-note">
        {tr(note || "Berdasarkan data aktif")}
        {onClick && <ArrowUpRight size={14} />}
      </div>
    </button>
  );
}
