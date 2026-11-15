// @vitest-environment happy-dom
import React from "react";
import {afterEach,beforeEach,expect,it,vi} from "vitest";
import {cleanup,render,screen,waitFor,within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
vi.hoisted(()=>{vi.stubEnv("VITE_SUPABASE_URL","");vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY","");});
vi.mock("@supabase/supabase-js",()=>({createClient:vi.fn(()=>null)}));
import {SandboxWorkspace} from "./test-support/workspace";
import {demoData} from "./demo";
import {setLanguage} from "./i18n";
beforeEach(()=>{localStorage.clear();setLanguage("id");location.hash="";vi.stubGlobal("fetch",vi.fn().mockRejectedValue(new Error("Offline test")));});
afterEach(()=>{cleanup();vi.unstubAllGlobals();location.hash="";});

it("opens a product-prefilled draft without saving an activity",async()=>{
 const product=demoData().products[0];location.hash="activities?newProduct="+product.id;
 render(<SandboxWorkspace/>);
 await screen.findByRole("heading",{name:"Rencanakan kegiatan"});
 const dialog=screen.getByRole("dialog");
 expect((within(dialog).getByLabelText("Produk") as HTMLSelectElement).value).toBe(product.id);
 const before=JSON.parse(localStorage.getItem("ttm.crm.demo.v1")||"null");
 expect(before).toBeNull();
 await userEvent.click(within(dialog).getByRole("button",{name:"Batal"}));
 expect(screen.queryByRole("dialog")).toBeNull();expect(localStorage.getItem("ttm.crm.demo.v1")).toBeNull();expect(location.hash).toBe("#activities");
});

it("opens the product analytics tab from the dashboard summary",async()=>{
 render(<SandboxWorkspace/>);
 const open=await screen.findByRole("button",{name:"Buka Analisis Produk"});
 await userEvent.click(open);
 await waitFor(()=>expect(screen.getByRole("tab",{name:"Analisis Produk"}).getAttribute("aria-selected")).toBe("true"));
 expect(location.hash).toBe("#reports?view=products");
 await userEvent.click(screen.getByRole("tab",{name:"Laporan Operasional"}));
 await screen.findByRole("heading",{name:"Laporan & kinerja"});expect(location.hash).toBe("#reports");
});

it("opens the selected analytics view from its direct URL",async()=>{
 location.hash="reports?view=products";render(<SandboxWorkspace/>);
 await waitFor(()=>expect(screen.getByRole("tab",{name:"Analisis Produk"}).getAttribute("aria-selected")).toBe("true"));
 expect(screen.queryByRole("heading",{name:"Laporan & kinerja"})).toBeNull();
});
