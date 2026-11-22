import { Card } from "@/components/ui";
import type { ArchetypeCard as ArchetypeCardModel } from "@/features/profile/archetype";

/**
 * The work-style card (item 18). Plain server markup: same scores, same card.
 * `justFinished` adds the line shown right after the quiz.
 */
export function ArchetypeCard({ card, justFinished = false }: { card: ArchetypeCardModel; justFinished?: boolean }) {
  return (
    <Card>
      <p className="text-sm font-semibold uppercase tracking-wide text-ink-3">Your work style</p>
      <h2 className="mt-1 font-serif text-3xl font-normal leading-tight text-ink">{card.name}</h2>
      <p className="mt-2 text-ink-2">{card.description}</p>
      <h3 className="mt-4 text-sm font-semibold text-ink">Your top traits</h3>
      <ul className="mt-2 grid gap-2">
        {card.traits.map((trait) => (
          <li key={trait} className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-ink">
            {trait}
          </li>
        ))}
      </ul>
      {justFinished ? (
        <p className="mt-4 text-sm text-ink-3">From your quiz just now. Retake it any time and this card updates.</p>
      ) : null}
    </Card>
  );
}
