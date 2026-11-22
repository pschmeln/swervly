/** Words Swervly copy must never use about companies or careers: it lists no jobs and gives no fit scores. */
export const FORBIDDEN_PROTOTYPE_CLAIM =
  /\b(submitted|published|moderated|now hiring|open position|open roles?|fit score|currently open)\b|%\s*match/i;
