import { ARCHETYPE_IDS, ARCHETYPES, type ArchetypeId } from "@/content/archetypes";

export type SharedArchetype = { name: string; description: string };

/** What Community shows for a shared work-style card. Unknown ids (from a future version) show nothing extra. */
export function sharedArchetype(id: string | null): SharedArchetype | null {
  if (!id || !(ARCHETYPE_IDS as readonly string[]).includes(id)) return null;
  return ARCHETYPES[id as ArchetypeId];
}
