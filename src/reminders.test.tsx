// @vitest-environment happy-dom
import React from "react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {act, cleanup, render, screen} from "@testing-library/react";
import {demoData, DEMO_USER} from "./demo";
import {buildReminders, useReminderClock} from "./reminders";
const now = Date.parse("2026-11-15T02:00:00Z");
const iso = (hours: number) => new Date(now + hours * 3600000).toISOString();
function fixture() {const data=demoData(); const activity=data.activities[0];data.activities=[];data.tasks=[];return {data,activity,profile:data.profiles.find(person=>person.id===DEMO_USER)!};}
afterEach(()=>{cleanup();vi.useRealTimers()});
describe("agenda reminders",()=>{
  it("includes overdue starts and the next 24 hours, excluding terminal/draft activities",()=>{
    const {data,activity,profile}=fixture();
    data.activities=[{...activity,id:"late",status:"approved",start_at:iso(-2),end_at:iso(1)},{...activity,id:"soon",status:"approved",start_at:iso(24),end_at:iso(25)},{...activity,id:"later",status:"approved",start_at:iso(25),end_at:iso(26)},...["draft","completed","cancelled","rejected"].map((status,index)=>({...activity,id:"excluded"+index,status:status as typeof activity.status,start_at:iso(-3),end_at:iso(-2)}))];
    const items=buildReminders(data,profile,now);
    expect(items.map(item=>item.entity_id)).toEqual(["late","soon"]);
    expect(items.map(item=>item.reason)).toEqual(["activity_start_overdue","activity_start_soon"]);
  });
  it("uses the end time for activities already in progress",()=>{
    const {data,activity,profile}=fixture();data.activities=[{...activity,id:"running",status:"in_progress",start_at:iso(-2),end_at:iso(2)}];
    expect(buildReminders(data,profile,now)[0].reason).toBe("activity_end_soon");
    expect(buildReminders(data,profile,now+3*3600000)[0].reason).toBe("activity_end_overdue");
  });
  it("treats date-only task deadlines as the end of the WIB day",()=>{
    const {data,profile}=fixture(); const task=demoData().tasks[0];data.tasks=[{...task,id:"deadline",due_date:"2026-11-15",status:"todo"}];
    expect(buildReminders(data,profile,Date.parse("2026-11-15T15:00:00Z"))[0].reason).toBe("task_due");
    expect(buildReminders(data,profile,Date.parse("2026-11-15T17:00:00Z"))[0].reason).toBe("task_overdue");
    data.tasks[0].status="done"; expect(buildReminders(data,profile,now)).toHaveLength(0);
  });
  it("shows direct-report approval to a specialist, without creating an extra ancestor stage",()=>{
    const {data,activity}=fixture();const ps=data.profiles[1],as=data.profiles[2];
    data.activities=[{...activity,id:"report",owner_id:as.id,participant_ids:[],status:"submitted",start_at:iso(26),end_at:iso(27)}];
    expect(buildReminders(data,ps,now).map(item=>item.kind)).toEqual(["approval"]);
    const unrelated={...ps,id:"unrelated"};data.profiles.push(unrelated);
    expect(buildReminders(data,unrelated,now)).toHaveLength(0);
    const admin={...unrelated,role:"admin" as const};
    expect(buildReminders(data,admin,now).filter(item=>item.kind==="approval")).toHaveLength(0);
  });
  it("never asks a director to approve their own activity",()=>{
    const {data,activity,profile}=fixture();data.activities=[{...activity,owner_id:profile.id,status:"submitted",start_at:iso(26),end_at:iso(27)}];
    expect(buildReminders(data,profile,now)).toHaveLength(0);
  });
  it("ignores invalid dates and inactive memberships",()=>{
    const {data,activity,profile}=fixture();data.activities=[{...activity,status:"approved",start_at:"invalid",end_at:"invalid"}];
    expect(buildReminders(data,profile,now)).toHaveLength(0);
    data.activities=[{...activity,status:"approved",start_at:iso(-1),end_at:iso(1)}];
    expect(buildReminders(data,{...profile,active:false},now)).toHaveLength(0);
  });
  it("updates the reminder clock without a page reload",()=>{
    vi.useFakeTimers();vi.setSystemTime(now);
    function Clock(){const value=useReminderClock();return <output data-testid="clock">{value}</output>}
    render(<Clock/>);expect(screen.getByTestId("clock").textContent).toBe(String(now));
    act(()=>vi.advanceTimersByTime(30000));expect(screen.getByTestId("clock").textContent).toBe(String(now+30000));
    cleanup();expect(vi.getTimerCount()).toBe(0);
  });
});
