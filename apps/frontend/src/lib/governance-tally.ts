export interface VoteTally {
  votesTotal: number;
  forPercentage: number;
  againstPercentage: number;
  quorumReached: boolean;
}

/** Pure vote-tally formatting: totals and percentages for a proposal's for/against votes. */
export function calculateVoteTally(
  votesFor: number,
  votesAgainst: number,
  quorumRequired: number
): VoteTally {
  const votesTotal = votesFor + votesAgainst;
  const forPercentage = votesTotal > 0 ? (votesFor / votesTotal) * 100 : 0;
  const againstPercentage = votesTotal > 0 ? (votesAgainst / votesTotal) * 100 : 0;
  const quorumReached = votesTotal >= quorumRequired;

  return { votesTotal, forPercentage, againstPercentage, quorumReached };
}
