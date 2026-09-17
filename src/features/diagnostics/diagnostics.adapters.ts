import type {
  Detail,
  EmbeddedReview,
  RawDetail,
  Review,
} from "./diagnostics.types";
export function adaptReview(r: EmbeddedReview): Review {
  return {
    ...r,
    status: r.reviewStatus,
    comment: r.reviewComment,
    reviewedBy: r.reviewedByAdminId,
    reviewedByName: r.reviewedByNameSnapshot,
  };
}
export function adaptDetail(raw: RawDetail): Detail {
  return {
    ...raw,
    reviews: raw.reviews.map(adaptReview),
    currentReview: raw.currentReview ? adaptReview(raw.currentReview) : null,
    reports: raw.reports.map((r) => ({
      ...r,
      createdAt: r.clientCreatedAt,
      receivedAt: r.serverCreatedAt,
    })),
  };
}
