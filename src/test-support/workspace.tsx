import React from "react";
import {CRMProvider} from "../store";
import {DEMO_USER} from "../demo";
import {Workspace} from "../App";
// Test-only composition. Production App always requires an authenticated user.
export function SandboxWorkspace() {
  return <CRMProvider demo userId={DEMO_USER} onLogout={() => {}}><Workspace onLogout={() => {}}/></CRMProvider>;
}
