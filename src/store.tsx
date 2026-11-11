// localized-ui-v1
import { tr } from "./i18n";
import { clearDemoKnowledgeFiles } from "./knowledge-files";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Data, Table, Tables, Profile, Activity } from "./types";
import { demoData, DEMO_USER } from "./demo";
import { conflictFor, isManager } from "./rules";
const env = (import.meta as unknown as { env: Record<string, string> }).env;
// Capture the callback before Supabase initialization consumes/cleans its hash.
export const initialAuthFlow = new URLSearchParams(
  typeof window === "undefined" ? "" : window.location.hash.slice(1),
).get("type");
export const configured =
  !!env.VITE_SUPABASE_URL && !!env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const supabase: SupabaseClient | null = configured
  ? createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY)
  : null;
const DEMO_KEY = "ttm.crm.demo.v1";
const TABLES: Table[] = [
  "profiles",
  "accounts",
  "contacts",
  "products",
  "opportunities",
  "equipment",
  "activities",
  "tasks",
  "activity_attachments",
  "knowledge_documents",
  "audit_logs",
  "org_settings",
];
const empty = () =>
  Object.fromEntries(TABLES.map((k) => [k, []])) as unknown as Data;
export function friendlyError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error && "message" in error
        ? String(error.message)
        : String(error);
  if (/row.level|permission|not authorized|unauthorized/i.test(message))
    return tr("Akses ditolak. Periksa role dan keanggotaan Anda.");
  if (/failed to fetch|network|fetch failed/i.test(message))
    return tr("Koneksi ke layanan gagal. Periksa internet lalu coba lagi; input Anda tetap tersedia.");
  return tr(message);
}
export async function unwrapFunctionError(error: unknown): Promise<unknown> {
  try {
    if (
      typeof error !== "object" ||
      !error ||
      !("context" in error) ||
      !(error.context instanceof Response)
    ) return error;
    // Read only the user-visible error field; preserve the original response body.
    const payload: unknown = await error.context.clone().json();
    if (
      typeof payload === "object" &&
      payload !== null &&
      !Array.isArray(payload) &&
      "error" in payload &&
      typeof payload.error === "string" &&
      payload.error.trim()
    ) return new Error(payload.error.trim(), { cause: error });
  } catch {
    // Network errors, consumed bodies and non-JSON responses retain their SDK error.
  }
  return error;
}
interface CRMContext {
  data: Data;
  profile: Profile;
  demo: boolean;
  save: <K extends Table>(
    table: K,
    row: Partial<Tables[K]>,
  ) => Promise<Tables[K]>;
  remove: (table: Table, id: string) => Promise<void>;
  notify: (message: string) => void;
  refresh: () => Promise<void>;
}
const Context = createContext<CRMContext | null>(null);
export const useCRM = () => {
  const c = useContext(Context);
  if (!c) throw Error(tr("CRM provider missing"));
  return c;
};
const nullable = new Set([
  "account_id",
  "product_id",
  "opportunity_id",
  "activity_id",
  "owner_id",
  "assigned_to",
  "expected_close",
  "next_action_due_date",
  "follow_up_date",
  "submitted_at",
  "approved_by",
]);
function clean(row: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(row)
      .filter(
        ([k, v]) =>
          v !== undefined &&
          !["created_at", "updated_at", "created_by"].includes(k),
      )
      .map(([k, v]) => [k, nullable.has(k) && v === "" ? null : v]),
  );
}
export function CRMProvider({
  demo,
  userId,
  children,
  onLogout,
}: {
  demo: boolean;
  userId: string;
  children: React.ReactNode;
  onLogout: () => void;
}) {
  const [data, setData] = useState<Data>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const dataRef = useRef(data);
  dataRef.current = data;
  const notify = useCallback((m: string) => setToast(m), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 5500);
    return () => clearTimeout(t);
  }, [toast]);
  const refresh = useCallback(async () => {
    if (demo) {
      let d: Data;
      try {
        const raw = localStorage.getItem(DEMO_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        d =
          parsed && TABLES.every((k) => k === "knowledge_documents" && parsed[k] === undefined || Array.isArray(parsed[k]))
            ? { ...parsed, knowledge_documents: parsed.knowledge_documents || [] }
            : demoData();
      } catch {
        d = demoData();
      }
      setData(d);
      setLoading(false);
      return;
    }
    if (!supabase) throw Error(tr("Konfigurasi Supabase belum tersedia."));
    const { data: p, error: e } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (e) throw e;
    if (!p?.active)
      throw Error(
        tr("Akun Anda belum memiliki keanggotaan TTM aktif. Hubungi administrator."),
      );
    const entries = await Promise.all(
      TABLES.map(async (t) => {
        let rows: unknown[] = [];
        for (let start = 0; start < 20000; start += 1000) {
          const { data: d, error: x } = await supabase!
            .from(t)
            .select("*")
            .order("id")
            .range(start, start + 999);
          if (x) throw x;
          rows.push(...d);
          if (d.length < 1000) return [t, rows];
        }
        throw Error(
          tr("Data {{value0}} melebihi batas tampilan 20.000 baris. Perlu paging server sebelum melanjutkan.", { value0: (t) }),
        );
      }),
    );
    setData(Object.fromEntries(entries) as Data);
    setLoading(false);
    setError("");
  }, [demo, userId]);
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    refresh().catch((e) => {
      if (mounted) {
        setError(friendlyError(e));
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [refresh]);
  const persistDemo = (next: Data) => {
    localStorage.setItem(DEMO_KEY, JSON.stringify(next));
    dataRef.current = next;
    setData(next);
  };
  const save = async <K extends Table>(
    table: K,
    row: Partial<Tables[K]>,
  ): Promise<Tables[K]> => {
    const current = dataRef.current;
    const actor = current.profiles.find((p) => p.id === userId)!;
    if (actor?.role === "viewer") throw Error(tr("Viewer memiliki akses baca."));
    if (table === "activities") {
      const conflict = conflictFor(
        row as Partial<Activity>,
        current.activities,
      );
      if (conflict) throw Error(conflict);
    }
    const id = String(row.id || crypto.randomUUID());
    const before = current[table].find((x) => x.id === id);
    if (table === "knowledge_documents" && before && "created_by" in before && !isManager(actor.role) && before.created_by !== actor.id)
      throw Error(tr("Hanya penulis atau administrator yang dapat mengubah dokumen."));
    let result: Tables[K];
    if (demo) {
      result = {
        ...before,
        ...row,
        id,
        created_at:
          before && "created_at" in before
            ? before.created_at
            : new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...(table === "knowledge_documents" ? { created_by: before && "created_by" in before ? before.created_by : userId } : {}),
      } as Tables[K];
      const next = {
        ...current,
        [table]: before
          ? current[table].map((x) => (x.id === id ? result : x))
          : [...current[table], result],
      };
      next.audit_logs = [
        {
          id: crypto.randomUUID(),
          entity_type: table,
          entity_id: id,
          action: before ? "UPDATE" : "INSERT",
          actor_id: userId,
          old_data: before || null,
          new_data: result,
          occurred_at: new Date().toISOString(),
        },
        ...current.audit_logs,
      ];
      persistDemo(next);
    } else {
      const payload = clean({ ...row, id } as Record<string, unknown>);
      const query = before
        ? supabase!.from(table).update(payload).eq("id", id)
        : supabase!.from(table).insert(payload);
      const { data: d, error: e } = await query.select("*").single();
      if (e) throw new Error(friendlyError(e));
      result = d;
      const latest = dataRef.current;
      setData({
        ...latest,
        [table]: before
          ? latest[table].map((x) => (x.id === id ? result : x))
          : [...latest[table], result],
      });
      try {
        await refresh();
      } catch {
        notify(tr("Data tersimpan. Penyegaran gagal; gunakan tombol muat ulang."));
        return result;
      }
    }
    notify(
      demo ? (tr("Tersimpan di sandbox demo.")) : (tr("Perubahan tersimpan di Supabase.")),
    );
    return result;
  };
  const remove = async (table: Table, id: string) => {
    if (!isManager(dataRef.current.profiles.find((p) => p.id === userId)!.role))
      throw Error(tr("Perubahan memerlukan administrator."));
    if (demo)
      persistDemo({
        ...dataRef.current,
        [table]: dataRef.current[table].filter((x) => x.id !== id),
      });
    else {
      const { data: d, error: e } = await supabase!
        .from(table)
        .delete()
        .eq("id", id)
        .select("id");
      if (e) throw e;
      if (!d?.length) throw Error(tr("Data tidak dihapus. Periksa izin akses."));
      await refresh();
    }
    notify(tr("Data diperbarui."));
  };
  if (loading)
    return (
      <div className="screen-center">
        <div className="spinner" />
        <h2>{tr("Menyiapkan ruang kerja…")}</h2>
        <p>{tr("Mengambil data dan hak akses Anda.")}</p>
      </div>
    );
  if (error)
    return (
      <div className="screen-center">
        <h2>{tr("Ruang kerja belum terhubung")}</h2>
        <p className="error-text">{error}</p>
        <button
          className="btn primary"
          onClick={() => {
            setLoading(true);
            refresh().catch((e) => {
              setError(friendlyError(e));
              setLoading(false);
            });
          }}
        >{tr("Coba lagi")}</button>
        <button className="btn secondary" onClick={onLogout}>{tr("Kembali ke login")}</button>
      </div>
    );
  const profile = data.profiles.find(
    (p) => p.id === (demo ? DEMO_USER : userId),
  );
  if (!profile)
    return (
      <div className="screen-center">{tr("Profil tidak ditemukan.")}<button onClick={onLogout}>{tr("Kembali")}</button>
      </div>
    );
  return (
    <Context.Provider
      value={{ data, profile, demo, save, remove, notify, refresh }}
    >
      {children}
      {toast && (
        <div role="status" className="toast">
          {toast}
          <button aria-label={tr("Tutup notifikasi")} onClick={() => setToast("")}>
            ×
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
export async function resetDemo() {
  await clearDemoKnowledgeFiles();
  localStorage.removeItem(DEMO_KEY);
}
