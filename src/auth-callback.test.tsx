// @vitest-environment happy-dom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.hoisted(() => {
  vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "test-publishable");
  window.location.hash = "type=invite";
});

// Auth SDK initialization can consume the callback hash before React mounts.
// The valid invite session must still enter password setup, not the workspace.
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => {
    window.location.hash = "";
    return {
      auth: {
        getSession: async () => ({
          data: { session: { user: { id: "invited-user" } } },
          error: null,
        }),
        onAuthStateChange: () => ({
          data: { subscription: { unsubscribe: vi.fn() } },
        }),
      },
      from: () => {
        throw Error("Business data must wait until password setup.");
      },
    };
  }),
}));

import { App } from "./App";
afterEach(cleanup);
it("shows password setup even when Auth consumed the invite callback before mount", async () => {
  render(<App />);
  expect(
    await screen.findByRole("heading", { name: "Atur password Anda" }),
  ).toBeTruthy();
  expect(screen.getByLabelText(/^Password baru/)).toBeTruthy();
  expect(screen.getByLabelText("Konfirmasi password")).toBeTruthy();
});
