/** Client-safe shape of a rotation returned by GET /api/rotations. */
export type RotationListItem = {
  id: string;
  employerId: string;
  roleTitle: string;
  termSeason: string;
  termYear: number;
  rotationNumber: number;
  payHourly: string | null;
  returnOffer: string;
  employer: { id: string; name: string };
  review: {
    enjoyment: number;
    learning: number;
    mentorship: number;
    clarityGained: number;
    skillsUsed: string[];
    freeText: string | null;
    shareFreeText: boolean;
  };
};
