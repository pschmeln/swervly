/** Shown next to a balance. There is nothing to spend points on yet. */
export const POINTS_COMING_SOON = "Points can be spent on things coming soon.";

export function pointsBalanceLabel(points: number): string {
  return points === 1 ? "1 point" : `${points} points`;
}

/** Count of friends who finished onboarding. No names and no emails. */
export function friendsFinishedLabel(count: number): string {
  return count === 1 ? "1 friend finished onboarding" : `${count} friends finished onboarding`;
}
