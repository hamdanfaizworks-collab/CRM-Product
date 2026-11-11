import { afterEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  // These tests do not initialise a real backend or use production environment files.
  vi.stubEnv("VITE_SUPABASE_URL", "");
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "");
});

import { friendlyError, unwrapFunctionError } from "./store";
import { setLanguage } from "./i18n";
afterEach(() => setLanguage("id"));

describe("Edge Function user-visible errors", () => {
  it("extracts only the error field without consuming the original response", async () => {
    const response = new Response(JSON.stringify({ error: "Email tidak valid.", details: "internal payload" }), { status: 400, headers: { "Content-Type": "application/json" } });
    const original = Object.assign(new Error("Edge Function returned a non-2xx status code"), { context: response });
    const unwrapped = await unwrapFunctionError(original);
    expect(unwrapped).toBeInstanceOf(Error);
    expect((unwrapped as Error).message).toBe("Email tidak valid.");
    expect((unwrapped as Error).cause).toBe(original);
    expect(JSON.parse(await response.text()).details).toBe("internal payload");
    expect(friendlyError(unwrapped)).not.toContain("internal payload");
  });

  it("preserves the original SDK error when the response is not JSON", async () => {
    const original = Object.assign(new Error("Gateway unavailable"), { context: new Response("<html>maintenance</html>", { status: 503 }) });
    expect(await unwrapFunctionError(original)).toBe(original);
  });

  it("does not surface an unexpected or structured payload", async () => {
    for (const body of [{ detail: "internal diagnostic" }, { error: { secret: "must not display" } }, { error: "  " }, ["internal diagnostic"]]) {
      const original = Object.assign(new Error("Original safe fallback"), { context: Response.json(body, { status: 500 }) });
      expect(await unwrapFunctionError(original)).toBe(original);
    }
  });

  it("preserves network errors and safely falls back for a consumed body", async () => {
    const original = new Error("Failed to fetch");
    expect(await unwrapFunctionError(original)).toBe(original);
    const response = Response.json({ error: "Email tidak valid." });
    await response.text();
    const consumed = Object.assign(new Error("SDK fallback"), { context: response });
    expect(await unwrapFunctionError(consumed)).toBe(consumed);
  });

  it("passes the extracted message through the active English error translation", async () => {
    setLanguage("en");
    const original = Object.assign(new Error("Edge Function returned a non-2xx status code"), { context: Response.json({ error: "Email tidak valid." }, { status: 400 }) });
    expect(friendlyError(await unwrapFunctionError(original))).toBe("The email address is invalid.");
  });
});
