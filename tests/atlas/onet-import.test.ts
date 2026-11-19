import { describe, expect, it } from "vitest";
import { ONET_DETAILS, ONET_RELEASE } from "@/content/atlas/onet-details";
import { ONET_CREDIT, OCCUPATIONS } from "@/content/atlas/occupations";
import { buildDetails, MAX_SOFTWARE, MAX_TASKS, parseCsv, renderDetailsModule } from "@/features/atlas/onet-import";

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

describe("CSV parsing", () => {
  it("handles quoted commas, doubled quotes, CRLF and a byte-order mark", () => {
    const rows = parseCsv('a,b\r\n"x, y","say ""hi"""\r\n');
    expect(rows).toEqual([["a", "b"], ["x, y", 'say "hi"']]);
    expect(parseCsv("﻿h\n1")[0]).toEqual(["h"]);
  });
});

describe("O*NET selection rules", () => {
  const { details, missing } = buildDetails(["17-2141.00"], { occupationData: OCC, taskStatements: TASKS, softwareSkills: SOFTWARE });
  const me = details[0];

  it("keeps descriptions verbatim", () => {
    expect(me.description).toBe('Design machines, engines and "other" equipment.');
  });

  it("puts Core tasks first, in file order, capped at five", () => {
    expect(me.tasks).toEqual(["Core one, with a comma", "Core two", "Core three", "Core four", "Core five"]);
    expect(me.tasks).toHaveLength(MAX_TASKS);
  });

  it("keeps only In Demand software, once each, without generic office tools", () => {
    expect(me.software).toEqual(["Dassault Systemes SolidWorks"]);
  });

  it("reports codes it cannot fill instead of inventing content", () => {
    const result = buildDetails(["00-0000.00"], { occupationData: OCC, taskStatements: TASKS, softwareSkills: SOFTWARE });
    expect(result.details).toEqual([]);
    expect(result.missing).toEqual(["00-0000.00"]);
    expect(missing).toEqual([]);
  });

  it("produces the same module text every run", () => {
    expect(renderDetailsModule(details, "30.3")).toBe(renderDetailsModule(details, "30.3"));
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
    }
  });

  it("names the same release in the data and in the credit line", () => {
    expect(ONET_RELEASE).toMatch(/^\d+\.\d+$/);
    expect(ONET_CREDIT).toContain(`O*NET ${ONET_RELEASE} Database`);
    expect(ONET_CREDIT).toContain("CC BY 4.0");
  });
});
