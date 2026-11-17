import { normalizeEmployerName } from "@/features/review/normalize";

export type EmployerCandidate = {
  id: string;
  name: string;
  city: string | null;
  aliases: string[];
};

function wordsOf(value: string): string[] {
  const normalized = normalizeEmployerName(value);
  return normalized.length > 0 ? normalized.split(" ") : [];
}

function levenshtein(left: string, right: string): number {
  if (left === right) return 0;
  if (Math.abs(left.length - right.length) > 2) return 3;
  const rows = left.length + 1;
  const cols = right.length + 1;
  const grid: number[][] = Array.from({ length: rows }, () => Array<number>(cols).fill(0));
  for (let row = 0; row < rows; row += 1) grid[row]![0] = row;
  for (let col = 0; col < cols; col += 1) grid[0]![col] = col;
  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      const cost = left[row - 1] === right[col - 1] ? 0 : 1;
      grid[row]![col] = Math.min(
        grid[row - 1]![col]! + 1,
        grid[row]![col - 1]! + 1,
        grid[row - 1]![col - 1]! + cost,
      );
    }
  }
  return grid[left.length]![right.length]!;
}

function tokenFit(token: string, words: string[]): "exact" | "prefix" | "typo" | "none" {
  if (words.some((word) => word === token)) return "exact";
  if (token.length >= 2 && words.some((word) => word.startsWith(token))) return "prefix";
  const typoLimit = token.length >= 8 ? 2 : token.length >= 4 ? 1 : 0;
  if (typoLimit > 0 && words.some((word) => levenshtein(word, token) <= typoLimit)) {
    return "typo";
  }
  return "none";
}

function scoreCandidate(query: string, tokens: string[], candidate: EmployerCandidate): number {
  const fullName = normalizeEmployerName(candidate.name);
  const aliasNames = candidate.aliases.map((alias) => normalizeEmployerName(alias));
  if (query.length > 0 && query === fullName) return 100;
  if (query.length > 0 && aliasNames.includes(query)) return 95;

  const words = [
    ...wordsOf(candidate.name),
    ...candidate.aliases.flatMap((alias) => wordsOf(alias)),
  ];
  if (tokens.length === 0 || words.length === 0) return 0;

  const fits = tokens.map((token) => tokenFit(token, words));
  if (fits.some((fit) => fit === "none")) {
    if (query.length >= 3 && (fullName.includes(query) || aliasNames.some((alias) => alias.includes(query)))) {
      return 40;
    }
    return 0;
  }
  if (fits.every((fit) => fit === "exact")) return 85;
  if (fits.every((fit) => fit === "exact" || fit === "prefix")) return 70;
  return 55;
}

/** Word-start, nickname (alias), and small-typo matches. Highest scores first. */
export function rankEmployers(query: string, candidates: readonly EmployerCandidate[]): EmployerCandidate[] {
  const normalized = normalizeEmployerName(query);
  if (normalized.length < 2) return [];
  const tokens = normalized.split(" ").filter((token) => token.length > 0);

  return candidates
    .map((candidate) => ({ candidate, score: scoreCandidate(normalized, tokens, candidate) }))
    .filter((row) => row.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.candidate.name.localeCompare(right.candidate.name);
    })
    .map((row) => row.candidate);
}
