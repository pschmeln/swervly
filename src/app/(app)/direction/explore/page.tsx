import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants";

/** Retired (D12): Companies & opportunities moved to Community, and the rest repeated Direction. */
export default function CareerExplorePage() {
  redirect(ROUTES.community);
}
