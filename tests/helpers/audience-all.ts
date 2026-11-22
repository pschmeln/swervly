import * as audience from "@/lib/audience";

/**
 * The "all" audience, for tests that cover majors and careers hidden from engineering
 * students. Use it with: vi.mock("@/lib/audience", () => import("../helpers/audience-all"));
 * Spreads the real module, so a new export is never missing here.
 */
const all = { ...audience, ...audience.audienceRules("all") };
export const {
  AUDIENCE,
  AUDIENCE_COPY,
  audienceRules,
  offersUndecided,
  suggestsMajors,
  showsMajorCategory,
  showsFamily,
  showsSpecialization,
  showsRole,
  showsCompany,
} = all;
export type { Audience } from "@/lib/audience";
