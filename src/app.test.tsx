// @vitest-environment happy-dom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.hoisted(() => {
  vi.stubEnv("VITE_SUPABASE_URL", "");
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "");
});
vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn(() => null) }));

// Keep the real provider and domain behavior, but make the App's external
// authentication boundary unconfigured. No hosted Auth/API is exercised here.
vi.mock("./store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./store")>();
  return { ...actual, supabase: null, configured: false };
});

import { App } from "./App";
import {SandboxWorkspace} from "./test-support/workspace";
import { setLanguage } from "./i18n";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Offline test environment")));
  localStorage.clear();
  setLanguage("id");
  location.hash = "";
});

afterEach(() => {cleanup();vi.unstubAllGlobals();});

async function openDemo(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole("navigation", { name: "Navigasi utama" });
}

async function navigate(
  user: ReturnType<typeof userEvent.setup>,
  name: RegExp,
) {
  await user.click(
    within(
      screen.getByRole("navigation", { name: "Navigasi utama" }),
    ).getByRole("button", { name }),
  );
}

describe("alur workspace sandbox melalui DOM", () => {
  it("requires credentials and provides no public demo entry", async () => {
    render(<App />);
    expect(
      screen.queryByRole("navigation", { name: "Navigasi utama" }),
    ).toBeNull();
    expect(
      (
        screen.getByRole("button", {
          name: /Masuk ke workspace/,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(screen.queryByRole("button", {name: /Jelajahi demo/i})).toBeNull();
    expect(screen.getByRole("heading", {name: "Sistem Terpadu Manajemen Product"})).toBeTruthy();
    expect(screen.queryByText("KHUSUS TIM INTERNAL TTM")).toBeNull();
    expect(screen.queryByText(/Kenali workspace/)).toBeNull();
    expect(screen.queryByText(/Ruang kerja untuk membangun hubungan/)).toBeNull();
    expect(screen.queryByText(/Butuh akses/)).toBeNull();
  });

  it("membuat pelanggan, mencatat peluang, mengganti tahap, dan mempertahankan hasil setelah remount", async () => {
    const user = userEvent.setup();
    const app = render(<SandboxWorkspace />);
    await openDemo(user);
    await navigate(user, /^Pelanggan$/);
    await user.click(screen.getByRole("button", { name: "Tambah pelanggan" }));
    let dialog = within(await screen.findByRole("dialog"));
    await user.type(
      dialog.getByLabelText(/Nama instansi/),
      "RS Pengujian Alur",
    );
    await user.selectOptions(dialog.getByLabelText(/^Provinsi$/), "Sulawesi Selatan");
    await user.selectOptions(dialog.getByLabelText(/^Kabupaten \/ kota$/), "Kota Makassar");
    await user.click(dialog.getByRole("button", { name: "Simpan" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByText("RS Pengujian Alur")).toBeTruthy();

    await navigate(user, /^Pipeline Peluang$/);
    await user.click(screen.getByRole("button", { name: "Tambah peluang" }));
    dialog = within(await screen.findByRole("dialog"));
    await user.type(dialog.getByLabelText(/Judul peluang/), "Evaluasi USG UAT");
    await user.selectOptions(
      dialog.getByLabelText(/Pelanggan \/ instansi/),
      within(dialog.getByLabelText(/Pelanggan \/ instansi/)).getByRole(
        "option",
        { name: "RS Pengujian Alur" },
      ),
    );
    await user.selectOptions(
      dialog.getByLabelText(/^Produk/),
      within(dialog.getByLabelText(/^Produk/)).getByRole("option", {
        name: "Pixonic Revo Z",
      }),
    );
    await user.clear(dialog.getByLabelText(/Nilai estimasi/));
    await user.type(dialog.getByLabelText(/Nilai estimasi/), "250000000");
    await user.clear(dialog.getByLabelText(/Probabilitas/));
    await user.type(dialog.getByLabelText(/Probabilitas/), "35");
    await user.type(
      dialog.getByLabelText(/^Next action/),
      "Presentasikan konfigurasi sesuai kebutuhan",
    );
    fireEvent.change(dialog.getByLabelText(/Target closing/), {
      target: { value: "2026-11-30" },
    });
    await user.click(dialog.getByRole("button", { name: "Simpan" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const stage = () =>
      screen.getByRole("combobox", {
        name: "Ubah tahap Evaluasi USG UAT",
      }) as HTMLSelectElement;
    await user.selectOptions(stage(), "proposal");
    await waitFor(() => expect(stage().value).toBe("proposal"));
    await user.selectOptions(stage(), "won");
    await waitFor(() => expect(stage().value).toBe("won"));
    expect(within(stage().closest("article")!).getByText("100%")).toBeTruthy();

    app.unmount();
    render(<SandboxWorkspace />);
    await openDemo(user);
    await navigate(user, /^Pipeline Peluang$/);
    expect(
      (
        (await screen.findByRole("combobox", {
          name: "Ubah tahap Evaluasi USG UAT",
        })) as HTMLSelectElement
      ).value,
    ).toBe("won");
    expect(screen.getByText("RS Pengujian Alur")).toBeTruthy();
  });

  it("menjalankan kegiatan dari draft sampai selesai dengan laporan serta tindak lanjut", async () => {
    const user = userEvent.setup();
    render(<SandboxWorkspace />);
    await openDemo(user);
    await navigate(user, /^Kalender & Aktivitas$/);
    await user.click(screen.getByRole("button", { name: "Tambah kegiatan" }));
    let dialog = within(await screen.findByRole("dialog"));
    await user.type(
      dialog.getByLabelText(/Nama kegiatan/),
      "Training workflow UAT",
    );
    await user.selectOptions(
      dialog.getByLabelText(/^Jenis kegiatan/),
      "training",
    );
    const customer = dialog.getByLabelText(/Pelanggan \/ instansi/);
    await user.selectOptions(
      customer,
      within(customer).getByRole("option", { name: "RS Contoh Sejahtera" }),
    );
    await user.type(
      dialog.getByLabelText(/Tujuan kegiatan/),
      "Melatih alur kerja aplikasi dan menilai kesiapan pengguna.",
    );
    await user.selectOptions(dialog.getByLabelText(/^Koordinator/), within(dialog.getByLabelText(/^Koordinator/)).getByRole("option", {name: "Product Specialist Demo"}));
    await user.click(dialog.getByRole("button", { name: "Simpan" }));
    dialog = within(await screen.findByRole("dialog"));
    await user.click(
      await dialog.findByRole("button", { name: "Ajukan persetujuan" }),
    );
    await user.click(await dialog.findByRole("button", { name: "Setujui" }));
    await user.click(
      await dialog.findByRole("button", { name: "Mulai kegiatan" }),
    );
    await user.click(
      await dialog.findByRole("button", { name: "Selesaikan & laporkan" }),
    );
    dialog = within(await screen.findByRole("dialog"));
    await user.type(
      dialog.getByLabelText(/Ringkasan pelaksanaan/),
      "Training terlaksana; pengguna mencoba workflow dan menyepakati tindak lanjut.",
    );
    await user.type(
      dialog.getByLabelText(/Hasil dibanding tujuan/),
      "Tim memahami workflow dan meminta materi refreshment.",
    );
    await user.clear(dialog.getByLabelText(/Jumlah peserta/));
    await user.type(dialog.getByLabelText(/Jumlah peserta/), "8");
    await user.click(dialog.getByRole("button", { name: "Simpan" }));
    dialog = within(await screen.findByRole("dialog"));
    expect(await dialog.findByText("Laporan pelaksanaan")).toBeTruthy();
    expect(dialog.getByText("Selesai", { exact: true })).toBeTruthy();
    await user.click(
      dialog.getByRole("button", { name: "Buat tindak lanjut" }),
    );
    dialog = within(await screen.findByRole("dialog"));
    await user.type(
      dialog.getByLabelText(/^Tindak lanjut/),
      "Kirim materi refreshment UAT",
    );
    await user.click(dialog.getByRole("button", { name: "Simpan" }));
    dialog = within(await screen.findByRole("dialog"));
    await user.click(dialog.getByRole("button", { name: "Tutup dialog" }));
    await navigate(user, /^Tindak Lanjut/);
    expect(
      await screen.findByText("Kirim materi refreshment UAT"),
    ).toBeTruthy();
    const row = screen.getByText("Kirim materi refreshment UAT").closest("tr")!;
    await user.click(within(row).getByRole("button", { name: "Edit" }));
    dialog = within(await screen.findByRole("dialog"));
    expect(
      (dialog.getByLabelText(/Kegiatan terkait/) as HTMLSelectElement)
        .selectedOptions[0].textContent,
    ).toBe("Training workflow UAT");
  }, 20000);
});
