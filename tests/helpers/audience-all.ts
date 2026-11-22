import { audienceRules } from "@/lib/audience";

/**
 * The "all" audience, for tests that cover majors and careers hidden from engineering
 * students. Use it with: vi.mock("@/lib/audience", () => import("../helpers/audience-all"));
 */
export { audienceRules };
export type { Audience } from "@/lib/audience";
export const { AUDIENCE, showsMajorCategory, showsFamily, showsSpecialization, showsRole, showsCompany, AUDIENCE_COPY } =
  audienceRules("all");
