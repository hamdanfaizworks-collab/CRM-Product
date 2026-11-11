// localized-ui-v1
import { tr, useLanguage } from "./i18n";
import { LanguageSwitcher } from "./LanguageSwitcher";
import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Building2,
  GitBranch,
  CalendarDays,
  CheckSquare,
  Package,
  Boxes,
  Users,
  BarChart3,
  Settings,
  LogOut,
  ChevronRight,
  Bell,
  Menu,
  X,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Activity,
  ArrowUpRight,
  Check,
  Eye,
  EyeOff,
  BookOpen,
} from "lucide-react";
import {
  CRMProvider,
  useCRM,
  supabase,
  configured,
  friendlyError,
  initialAuthFlow,
} from "./store";
import { DEMO_USER } from "./demo";
import { ROLE_LABEL } from "./types";
import { dateOnly, displayDate, isManager } from "./rules";
import { Dialog } from "./ui";
import {
  AccountsPage,
  PipelinePage,
  TasksPage,
  CatalogPage,
  EquipmentPage,
} from "./BusinessPages";
import { ActivityPage } from "./ActivityPage";
import { TeamPage, SettingsPage } from "./AdminPages";
import { DashboardPage, ReportsPage } from "./InsightsPages";
import { KnowledgeBasePage } from "./KnowledgeBasePage";
const menu = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "accounts", label: "Pelanggan", icon: Building2 },
  { id: "pipeline", label: "Pipeline Peluang", icon: GitBranch },
  { id: "activities", label: "Kalender & Aktivitas", icon: CalendarDays },
  { id: "tasks", label: "Tindak Lanjut", icon: CheckSquare },
  { id: "catalog", label: "Katalog Produk", icon: Package },
  { id: "knowledge", label: "Basis Pengetahuan", icon: BookOpen },
  { id: "equipment", label: "Unit Demo", icon: Boxes },
  { id: "team", label: "Team", icon: Users },
  { id: "reports", label: "Laporan", icon: BarChart3 },
  { id: "settings", label: "Pengaturan", icon: Settings },
];
export function App() {
  useLanguage();
  const [demo, setDemo] = useState(false);
  const [userId, setUserId] = useState("");
  const [authReady, setAuthReady] = useState(!supabase);
  const [passwordFlow, setPasswordFlow] = useState(
    initialAuthFlow === "invite" || initialAuthFlow === "recovery",
  );
  const [error, setError] = useState("");
  useEffect(() => {
    if (!supabase) return;
    supabase.auth
      .getSession()
      .then(({ data, error: e }) => {
        if (e) setError(friendlyError(e));
        setUserId(data.session?.user.id || "");
        setAuthReady(true);
      })
      .catch((e) => {
        setError(friendlyError(e));
        setAuthReady(true);
      });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUserId(session?.user.id || "");
      setAuthReady(true);
      if (event === "PASSWORD_RECOVERY") setPasswordFlow(true);
    });
    return () => subscription.unsubscribe();
  }, []);
  const logout = async () => {
    if (demo) {
      setDemo(false);
      return;
    }
    const { error: e } = await supabase!.auth.signOut();
    if (e) {
      setError(friendlyError(e));
      return;
    }
    setUserId("");
    setPasswordFlow(false);
  };
  if (!authReady)
    return (
      <div className="screen-center">
        <div className="spinner" />
        <p>{tr("Memeriksa sesi Anda…")}</p>
      </div>
    );
  if (passwordFlow && userId && !demo)
    return (
      <PasswordSetup
        onDone={() => {
          setPasswordFlow(false);
          location.hash = "dashboard";
        }}
        onLogout={() => void logout()}
      />
    );
  if (!userId && !demo)
    return <Login initialError={error} onDemo={() => setDemo(true)} />;
  return (
    <CRMProvider
      demo={demo}
      userId={demo ? DEMO_USER : userId}
      onLogout={() => void logout()}
    >
      <Workspace onLogout={() => void logout()} />
    </CRMProvider>
  );
}
function Login({
  onDemo,
  initialError,
}: {
  onDemo: () => void;
  initialError: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"login" | "reset">("login");
  const [error, setError] = useState(initialError);
  const [message, setMessage] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (!supabase)
        throw Error(
          tr("Konfigurasi layanan belum tersedia. Hubungi administrator."),
        );
      if (mode === "reset") {
        const { error: e } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: location.origin,
        });
        if (e) throw e;
        setMessage(
          tr("Jika email terdaftar, tautan pemulihan akan dikirim. Periksa kotak masuk Anda."),
        );
      } else {
        const { error: e } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (e)
          throw Error(
            /invalid login/i.test(e.message) ? (tr("Email atau password tidak sesuai.")) : (e.message),
          );
      }
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login-page">
      <section className="login-story">
        <div className="login-brand">
          <img src="/ttm-logo.png" alt="Triputra Techno Med" />
          <span>{tr("PRODUCT WORKSPACE")}</span>
        </div>
        <div className="login-story-content">
          <span className="login-kicker">
            <span />{tr("CONNECTED PRODUCT MANAGEMENT")}</span>
          <h1>{tr("Produk yang tepat.")}<br />{tr("Tim yang terhubung.")}<br />
            <em>{tr("Dampak yang nyata.")}</em>
          </h1>
          <p>{tr("Ruang kerja untuk membangun hubungan pelanggan dan menggerakkan setiap kegiatan tim produk TTM.")}</p>
          <div className="login-feature-list">
            <span>
              <Check size={16} />{tr("CRM & pipeline produk")}</span>
            <span>
              <Check size={16} />{tr("Penjadwalan tim & unit demo")}</span>
            <span>
              <Check size={16} />{tr("Persetujuan, laporan & tindak lanjut")}</span>
          </div>
        </div>
        <div className="medical-orbit" aria-hidden="true">
          <div className="orbit-inner">
            <Activity size={75} strokeWidth={1} />
          </div>
          <span className="orbit-dot one" />
          <span className="orbit-dot two" />
          <span className="orbit-label">{tr("PRECISION IN EVERY CONNECTION")}</span>
        </div>
        <div className="login-story-footer">{tr("Triputra Techno Med ")}<span>{tr("Healthcare technology, connected.")}</span>
        </div>
      </section>
      <section className="login-form-panel">
        <div className="login-language"><LanguageSwitcher/></div>
        <div className="login-form-wrap">
          <div className="login-small-label">
            <ShieldCheck size={16} />{tr("KHUSUS TIM INTERNAL TTM")}</div>
          <h2>
            {mode === "login" ? (tr("Selamat datang kembali")) : (tr("Pulihkan akses Anda"))}
          </h2>
          <p>
            {mode === "login" ? (tr("Masuk untuk melanjutkan pekerjaan dan kolaborasi tim.")) : (tr("Masukkan email bisnis yang terdaftar di ruang kerja."))}
          </p>
          <form onSubmit={(e) => void submit(e)}>
            <label className="field">
              <span>{tr("Email bisnis")}</span>
              <input
                autoFocus
                type="email"
                autoComplete="username"
                placeholder={tr("nama@perusahaan.com")}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            {mode === "login" && (
              <label className="field">
                <span>{tr("Password")}</span>
                <div className="password-input">
                  <input
                    type={show ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={tr("Masukkan password")}
                  />
                  <button
                    type="button"
                    aria-label={
                      show ? (tr("Sembunyikan password")) : (tr("Tampilkan password"))
                    }
                    onClick={() => setShow(!show)}
                  >
                    {show ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </label>
            )}
            {error && (
              <div role="alert" className="form-error">
                {error}
              </div>
            )}
            {message && (
              <div role="status" className="success-banner">
                {message}
              </div>
            )}
            <button
              className="btn primary login-submit"
              disabled={busy || !configured}
            >
              {busy ? (tr("Memproses…")) : (mode === "login" ? (tr("Masuk ke workspace")) : (tr("Kirim tautan pemulihan")))}
              <ArrowRight size={17} />
            </button>
            <button
              type="button"
              className="text-btn login-reset"
              onClick={() => {
                setMode(mode === "login" ? "reset" : "login");
                setError("");
                setMessage("");
              }}
            >
              {mode === "login" ? (tr("Lupa password?")) : (tr("Kembali ke login"))}
            </button>
          </form>
          <div className="login-divider">
            <span>{tr("Kenali workspace terlebih dahulu")}</span>
          </div>
          <button className="btn secondary demo-enter" onClick={onDemo}>{tr("Jelajahi demo interaktif ")}<ArrowUpRight size={17} />
          </button>
          <p className="login-note">{tr("Demo menggunakan data simulasi. Akses operasional hanya untuk anggota yang diundang administrator.")}</p>
          <div className="login-help">{tr("Butuh akses? Hubungi administrator TTM.")}</div>
        </div>
        <footer>
          © {new Date().getFullYear()}{tr(" Triputra Techno Med")}{" "}
          <span>{tr("Product CRM · v1.0")}</span>
        </footer>
      </section>
    </main>
  );
}
function PasswordSetup({
  onDone,
  onLogout,
}: {
  onDone: () => void;
  onLogout: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="screen-center">
      <div className="password-card card">
        <img src="/ttm-logo.png" alt="TTM" />
        <h1>{tr("Atur password Anda")}</h1>
        <p>{tr("Lengkapi akses undangan atau pemulihan akun.")}</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              if (password !== confirm)
                throw Error(tr("Konfirmasi password belum sama."));
              const { error: e } = await supabase!.auth.updateUser({
                password,
              });
              if (e) throw e;
              onDone();
            } catch (e) {
              setError(friendlyError(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="field">
            <span>{tr("Password baru")}</span>
            <input
              type="password"
              required
              minLength={10}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <small>{tr("Minimum 10 karakter.")}</small>
          </label>
          <label className="field">
            <span>{tr("Konfirmasi password")}</span>
            <input
              type="password"
              minLength={10}
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          <button className="btn primary" disabled={busy}>{tr("Simpan password")}</button>
          <button className="text-btn" type="button" onClick={onLogout}>{tr("Keluar")}</button>
        </form>
      </div>
    </div>
  );
}
function Workspace({ onLogout }: { onLogout: () => void }) {
  const { data, profile, demo, refresh, notify } = useCRM();
  const initial = location.hash.slice(1).split("?")[0];
  const [page, setPage] = useState(
    menu.some((m) => m.id === initial) ? initial : "dashboard",
  );
  const [sidebar, setSidebar] = useState(false);
  const [knowledgeProduct, setKnowledgeProduct] = useState(() => new URLSearchParams(location.hash.split("?")[1] || "").get("product") || "all");
  const [notifications, setNotifications] = useState(false);
  const [sync, setSync] = useState(false);
  const navigate = (id: string, productId = "all") => {
    if (!menu.some((m) => m.id === id)) return;
    setPage(id);
    if (id === "knowledge") setKnowledgeProduct(productId);
    location.hash = id + (id === "knowledge" && productId !== "all" ? "?product=" + encodeURIComponent(productId) : "");
    setSidebar(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  useEffect(() => {
    const f = () => {
      const id = location.hash.slice(1).split("?")[0];
      if (menu.some((m) => m.id === id)) setPage(id);
      if (id === "knowledge") setKnowledgeProduct(new URLSearchParams(location.hash.split("?")[1] || "").get("product") || "all");
    };
    addEventListener("hashchange", f);
    return () => removeEventListener("hashchange", f);
  }, []);
  const overdue = data.tasks.filter(
    (t) => t.due_date < dateOnly() && !["done", "cancelled"].includes(t.status),
  );
  const pending = data.activities.filter((a) => a.status === "submitted");
  const upcoming = data.activities
    .filter(
      (a) =>
        a.start_at > new Date().toISOString() &&
        ["approved", "in_progress"].includes(a.status),
    )
    .sort((a, b) => a.start_at.localeCompare(b.start_at))
    .slice(0, 5);
  const alerts =
    overdue.length + (isManager(profile.role) ? pending.length : 0);
  const current = menu.find((m) => m.id === page)!;
  return (
    <div className="workspace">
      {sidebar && (
        <button
          aria-label={tr("Tutup navigasi")}
          className="sidebar-backdrop"
          onClick={() => setSidebar(false)}
        />
      )}
      <aside className={`sidebar ${sidebar ? "open" : ""}`}>
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <img src="/ttm-logo.png" alt="TTM Triputra Techno Med" />
          </div>
          <div className="workspace-label">{tr("Product Management Workspace")}<span>{tr("CUSTOMER RELATIONSHIP MANAGEMENT")}</span>
          </div>
          <button
            className="mobile-close icon-btn"
            aria-label={tr("Tutup navigasi")}
            onClick={() => setSidebar(false)}
          >
            <X size={20} />
          </button>
        </div>
        <nav aria-label={tr("Navigasi utama")}>
          <div className="nav-group-label">{tr("WORKSPACE")}</div>
          {menu.map((m, i) => (
            <React.Fragment key={m.id}>
              {i === 5 && (
                <div className="nav-group-label resources-label">{tr("MANAGEMENT")}</div>
              )}
              <button
                className={`nav-item ${page === m.id ? "active" : ""}`}
                onClick={() => navigate(m.id)}
                aria-current={page === m.id ? "page" : undefined}
              >
                <m.icon size={18} />
                <span>{tr(m.label)}</span>
                {m.id === "tasks" && overdue.length > 0 && (
                  <b className="nav-count">{overdue.length}</b>
                )}
                {page === m.id && <span className="nav-active-dot" />}
              </button>
            </React.Fragment>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-status">
            <span className={demo ? "status-dot demo" : "status-dot"} />
            <div>
              {demo ? (tr("Sandbox demo")) : (tr("Workspace Terhubung"))}
              <small>
                {demo ? (tr("Data simulasi di browser")) : (tr("Supabase · Akses internal"))}
              </small>
            </div>
          </div>
          <a href="/PRD.md" download className="sidebar-doc">{tr("Dokumentasi produk ")}<ArrowUpRight size={14} />
          </a>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-btn mobile-menu"
              aria-label={tr("Buka navigasi")}
              onClick={() => setSidebar(true)}
            >
              <Menu size={21} />
            </button>
            <span>{tr("Workspace")}</span>
            <ChevronRight size={13} />
            <strong>{tr(current.label)}</strong>
          </div>
        <div className="topbar-actions">
          <LanguageSwitcher/>
            <span className="topbar-date">
              {displayDate(dateOnly(), {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            <button
              className="icon-btn"
              aria-label={tr("Muat ulang data")}
              title={tr("Muat ulang data")}
              disabled={sync}
              onClick={async () => {
                setSync(true);
                try {
                  await refresh();
                  notify(tr("Data diperbarui."));
                } catch (e) {
                  notify(friendlyError(e));
                } finally {
                  setSync(false);
                }
              }}
            >
              <RefreshCw size={17} className={sync ? "spin" : ""} />
            </button>
            <button
              className="icon-btn notification-button"
              aria-label={tr("Notifikasi, {{value0}} perlu perhatian", { value0: (alerts) })}
              onClick={() => setNotifications(true)}
            >
              <Bell size={19} />
              {alerts > 0 && <span className="notification-dot" />}
            </button>
            <div className="topbar-divider" />
            <button
              className="profile-button"
              onClick={() => navigate("settings")}
            >
              <span className="avatar">
                {profile.full_name
                  .split(" ")
                  .map((x) => x[0])
                  .slice(0, 2)
                  .join("")}
              </span>
              <span>
                <strong>{profile.full_name}</strong>
                <small>{ROLE_LABEL[profile.role]}</small>
              </span>
            </button>
            <button
              className="icon-btn logout"
              aria-label={demo ? (tr("Keluar dari demo")) : (tr("Logout"))}
              title={tr("Keluar")}
              onClick={onLogout}
            >
              <LogOut size={17} />
            </button>
          </div>
        </header>
        {demo && (
          <div className="demo-banner">
            <span>
              <span className="status-dot demo" />
              <strong>{tr("MODE DEMO")}</strong>{tr(" · Data simulasi tersimpan di browser ini.")}</span>
            <button onClick={onLogout}>{tr("Masuk ke akun TTM ")}<ArrowRight size={13} />
            </button>
          </div>
        )}
        <main className="content" key={page}>
          {page === "dashboard" ? (
            <DashboardPage navigate={navigate} />
          ) : page === "accounts" ? (
            <AccountsPage />
          ) : page === "pipeline" ? (
            <PipelinePage />
          ) : page === "activities" ? (
            <ActivityPage />
          ) : page === "tasks" ? (
            <TasksPage />
          ) : page === "catalog" ? (
            <CatalogPage onOpenKnowledge={(productId) => navigate("knowledge", productId)} />
          ) : page === "knowledge" ? (
            <KnowledgeBasePage initialProductId={knowledgeProduct} />
          ) : page === "equipment" ? (
            <EquipmentPage />
          ) : page === "team" ? (
            <TeamPage />
          ) : page === "reports" ? (
            <ReportsPage />
          ) : (
            <SettingsPage />
          )}
        </main>
        <footer className="workspace-footer">
          <span>© {new Date().getFullYear()}{tr(" Triputra Techno Med")}</span>
          <span>{tr("Product Workspace ")}<span className="footer-dot">·</span>{tr(" v1.0")}</span>
        </footer>
      </div>
      {notifications && (
        <Dialog title={tr("Perlu perhatian")} onClose={() => setNotifications(false)}>
          <div className="dialog-body notification-list">
            {overdue.length > 0 && (
              <button
                onClick={() => {
                  navigate("tasks");
                  setNotifications(false);
                }}
              >
                <span className="notice-icon amber">
                  <CheckSquare size={19} />
                </span>
                <div>
                  <strong>{overdue.length}{tr(" tindak lanjut terlambat")}</strong>
                  <p>{tr("Periksa tugas dan tentukan langkah berikutnya.")}</p>
                </div>
                <ChevronRight size={17} />
              </button>
            )}
            {isManager(profile.role) && pending.length > 0 && (
              <button
                onClick={() => {
                  navigate("activities");
                  setNotifications(false);
                }}
              >
                <span className="notice-icon blue">
                  <ShieldCheck size={19} />
                </span>
                <div>
                  <strong>
                    {pending.length}{tr(" pengajuan menunggu persetujuan")}</strong>
                  <p>{tr("Tinjau jadwal, personel, dan unit demo.")}</p>
                </div>
                <ChevronRight size={17} />
              </button>
            )}
            {upcoming.map((a) => (
              <button
                key={a.id}
                onClick={() => {
                  navigate("activities");
                  setNotifications(false);
                }}
              >
                <span className="notice-icon blue">
                  <CalendarDays size={19} />
                </span>
                <div>
                  <strong>{a.title}</strong>
                  <p>
                    {displayDate(a.start_at, {
                      day: "numeric",
                      month: "long",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}{tr("WIB")}</p>
                </div>
                <ChevronRight size={17} />
              </button>
            ))}
            {!alerts && !upcoming.length && (
              <p>{tr("Semua tertangani. Belum ada notifikasi yang perlu ditindaklanjuti.")}</p>
            )}
            <small>{tr("Notifikasi dihitung dari data saat terakhir dimuat.")}</small>
          </div>
        </Dialog>
      )}
    </div>
  );
}
