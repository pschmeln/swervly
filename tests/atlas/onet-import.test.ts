import { describe, expect, it } from "vitest";
import { ONET_DETAILS, ONET_RELEASE } from "@/content/atlas/onet-details";
import { ONET_CREDIT, OCCUPATIONS } from "@/content/atlas/occupations";
import { ONET_JOB_ZONES } from "@/content/atlas/onet-details";
import { buildDetails, buildJobZones, MAX_SKILLS, MAX_SOFTWARE, MAX_TASKS, parseCsv, renderDetailsModule, type OnetFiles } from "@/features/atlas/onet-import";

const OCC = `﻿O*NET-SOC Code,Title,Description
17-2141.00,Mechanical Engineers,"Design machines, engines and ""other"" equipment."
99-0000.00,Not Wanted,Skip me.
`;
const TASKS = [
  "O*NET-SOC Code,Title,Task ID,Task,Task Type,Incumbents Responding,Date,Domain Source",
  "17-2141.00,Mechanical Engineers,1,Supplemental first in file,Supplemental,10,08/2023,Incumbent",
  "17-2141.00,Mechanical Engineers,2,\"Core one, with a comma\",Core,10,08/2023,Incumbent",
  "17-2141.00,Mechanical Engineers,3,Core two,Core,10,08/2023,Incumbent",
  "17-2141.00,Mechanical Engineers,4,No type,,10,08/2023,Analyst",
  "17-2141.00,Mechanical Engineers,5,Core three,Core,10,08/2023,Incumbent",
  "17-2141.00,Mechanical Engineers,6,Core four,Core,10,08/2023,Incumbent",
  "17-2141.00,Mechanical Engineers,7,Core five,Core,10,08/2023,Incumbent",
].join("\r\n");
const SOFTWARE = [
  "O*NET-SOC Code,Title,Workplace Example,Element ID,Element Name,Hot Technology,In Demand",
  "17-2141.00,Mechanical Engineers,Dassault Systemes SolidWorks,x,CAD,Y,Y",
  "17-2141.00,Mechanical Engineers,Chef,x,Config,Y,N",
  "17-2141.00,Mechanical Engineers,Microsoft Excel,x,Spreadsheet,Y,Y",
  "17-2141.00,Mechanical Engineers,Dassault Systemes SolidWorks,y,CAD,Y,Y",
].join("\n");
const RATINGS = [
  "O*NET-SOC Code,Title,Task ID,Task,Scale ID,Scale Name,Category,Data Value,N,Standard Error,Lower CI Bound,Upper CI Bound,Recommend Suppress,Date,Domain Source",
  "17-2141.00,ME,7,Core five,IM,Importance,,4.90,10,0,0,0,N,08/2023,Incumbent",
  "17-2141.00,ME,1,Supplemental first in file,IM,Importance,,4.50,10,0,0,0,N,08/2023,Incumbent",
  "17-2141.00,ME,2,x,IM,Importance,,3.00,10,0,0,0,N,08/2023,Incumbent",
  "17-2141.00,ME,3,x,IM,Importance,,4.99,10,0,0,0,Y,08/2023,Incumbent",
  "17-2141.00,ME,7,Core five,FT,Frequency,1,99,10,0,0,0,N,08/2023,Incumbent",
].join("\n");
const SKILL_HEADER = "O*NET-SOC Code,Title,Element ID,Element Name,Scale ID,Scale Name,Data Value,N,Standard Error,Lower CI Bound,Upper CI Bound,Recommend Suppress,Not Relevant,Date,Domain Source";
const ESSENTIAL = [
  SKILL_HEADER,
  "17-2141.00,ME,2.A.1.a,Reading Comprehension,IM,Importance,4.00,8,0,0,0,N,,08/2023,Analyst",
  "99-0000.00,Other,2.A.1.a,Reading Comprehension,IM,Importance,4.00,8,0,0,0,N,,08/2023,Analyst",
  "17-2141.00,ME,2.A.1.e,Mathematics,IM,Importance,3.80,8,0,0,0,N,,08/2023,Analyst",
  "99-0000.00,Other,2.A.1.e,Mathematics,IM,Importance,2.00,8,0,0,0,N,,08/2023,Analyst",
].join("\n");
const TRANSFERABLE = [
  SKILL_HEADER,
  "17-2141.00,ME,2.B.3.b,Technology Design,IM,Importance,3.10,8,0,0,0,N,,08/2023,Analyst",
  "99-0000.00,Other,2.B.3.b,Technology Design,IM,Importance,1.50,8,0,0,0,N,,08/2023,Analyst",
  "17-2141.00,ME,2.B.3.e,Programming,IM,Importance,2.90,8,0,0,0,N,,08/2023,Analyst",
  "99-0000.00,Other,2.B.3.e,Programming,IM,Importance,1.00,8,0,0,0,N,,08/2023,Analyst",
  "17-2141.00,ME,2.B.1.a,Persuasion,IM,Importance,4.50,8,0,0,0,Y,,08/2023,Analyst",
].join("\n");
const ZONES = "O*NET-SOC Code,Title,Job Zone,Date,Domain Source\n17-2141.00,ME,4,08/2023,Analyst";
const RELATED = [
  "O*NET-SOC Code,Title,Related O*NET-SOC Code,Related Title,Relatedness Tier,Index",
  "17-2141.00,ME,17-2071.00,Electrical Engineers,Primary-Short,2",
  "17-2141.00,ME,17-3027.00,Mechanical Engineering Technologists and Technicians,Primary-Short,1",
  "17-2141.00,ME,11-9041.00,Architectural and Engineering Managers,Supplemental,3",
].join("\n");
const FILES: OnetFiles = {
  occupationData: OCC,
  taskStatements: TASKS,
  taskRatings: RATINGS,
  essentialSkills: ESSENTIAL,
  transferableSkills: TRANSFERABLE,
  softwareSkills: SOFTWARE,
  jobZones: ZONES,
  relatedOccupations: RELATED,
};

describe("CSV parsing", () => {
  it("handles quoted commas, doubled quotes, CRLF and a byte-order mark", () => {
    const rows = parseCsv('a,b\r\n"x, y","say ""hi"""\r\n');
    expect(rows).toEqual([["a", "b"], ["x, y", 'say "hi"']]);
    expect(parseCsv("﻿h\n1")[0]).toEqual(["h"]);
  });
});

describe("O*NET selection rules", () => {
  const { details, missing } = buildDetails(["17-2141.00"], FILES);
  const me = details[0];

  it("keeps descriptions verbatim", () => {
    expect(me.description).toBe('Design machines, engines and "other" equipment.');
  });

  it("ranks tasks by O*NET Importance, ignores suppressed ratings, then fills Core first in file order", () => {
    // Rated: Core five 4.90, Supplemental 4.50, Core one 3.00 (Core two's 4.99 is suppressed).
    expect(me.tasks).toEqual(["Core five", "Supplemental first in file", "Core one, with a comma", "Core two", "Core three"]);
    expect(me.tasks).toHaveLength(MAX_TASKS);
  });

  it("shows skills that are important here and above the average, without suppressed ratings", () => {
    // Mathematics +0.9, Technology Design +0.8; Reading Comprehension equals the average; Programming is below 3; Persuasion is suppressed.
    expect(me.skills).toEqual(["Mathematics", "Technology Design"]);
    expect(me.skills.length).toBeLessThanOrEqual(MAX_SKILLS);
  });

  it("keeps the Job Zone and Primary-Short related occupations in O*NET's order", () => {
    expect(me.jobZone).toBe(4);
    expect(me.related.map((item) => item.title)).toEqual(["Mechanical Engineering Technologists and Technicians", "Electrical Engineers"]);
  });

  it("keeps only In Demand software, once each, without generic office tools", () => {
    expect(me.software).toEqual(["Dassault Systemes SolidWorks"]);
  });

  it("reports codes it cannot fill instead of inventing content", () => {
    const result = buildDetails(["00-0000.00"], FILES);
    expect(result.details).toEqual([]);
    expect(result.missing).toEqual(["00-0000.00"]);
    expect(missing).toEqual([]);
  });

  it("produces the same module text every run", () => {
    const zones = buildJobZones("Job Zone,Name,Experience,Education\n2,Zone 1-2,Some,High school\n4,Zone Four,Lots,Bachelor's");
    expect(zones[1]).toEqual(zones[2]);
    expect(renderDetailsModule(details, zones, "30.3")).toBe(renderDetailsModule(details, zones, "30.3"));
  });
});

describe("Imported O*NET content", () => {
  it("covers every Atlas occupation with a description and at least three tasks", () => {
    for (const item of OCCUPATIONS) {
      const detail = ONET_DETAILS[item.onetCode];
      expect(detail, item.onetCode).toBeDefined();
      expect(detail.description.length).toBeGreaterThan(20);
      expect(detail.tasks.length).toBeGreaterThanOrEqual(3);
      expect(detail.tasks.length).toBeLessThanOrEqual(MAX_TASKS);
      expect(detail.software.length).toBeLessThanOrEqual(MAX_SOFTWARE);
      expect(detail.skills.length).toBeLessThanOrEqual(MAX_SKILLS);
      expect(detail.jobZone, item.onetCode).not.toBeNull();
      expect(ONET_JOB_ZONES[detail.jobZone ?? 0], item.onetCode).toBeDefined();
    }
  });

  it("names the same release in the data and in the credit line", () => {
    expect(ONET_RELEASE).toMatch(/^\d+\.\d+$/);
    expect(ONET_CREDIT).toContain(`O*NET ${ONET_RELEASE} Database`);
    expect(ONET_CREDIT).toContain("CC BY 4.0");
  });
});
