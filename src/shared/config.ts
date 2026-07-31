export const SKY_CONFIG = {
  staleAfterDays: 7,
  staleSnapshotAfterHours: 24,
  pace: {
    onTrackLagPoints: 10,
    atRiskLagPoints: 25,
  },
  timelinePaddingDays: 10,
  dayWidthPx: 18,
} as const;

export const LINEAR_API_URL = "https://api.linear.app/graphql";
