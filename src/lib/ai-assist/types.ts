/** Upstream BriefResponse from AI-ASSIST POST /v1/compliance-review-brief. */
export interface BriefResponse {
  brief_id: string;
  output: unknown;
  tool_trace: unknown;
  replayed?: boolean;
}

export interface ReviewAnnotation {
  annotation_id: string;
  operator_id: string;
  annotation: string;
  created_at: string;
}

/** Upstream ReviewQueueSummary from GET /v1/review-queue. */
export interface ReviewQueueSummary {
  brief_id: string;
  tenant_id: string;
  exception_id: string;
  queue_state: "pending_review" | "annotated";
  sor_status_unchanged: boolean;
  created_at: string;
  updated_at: string;
}

/** Upstream ReviewQueueListResponse from GET /v1/review-queue. */
export interface ReviewQueueListResponse {
  items: ReviewQueueSummary[];
  total: number;
  limit: number;
  offset: number;
}

/** Upstream ReviewQueueResponse from GET /v1/review-queue/{brief_id}. */
export interface ReviewQueueResponse {
  brief_id: string;
  tenant_id: string;
  exception_id: string;
  output: unknown;
  queue_state: "pending_review" | "annotated";
  sor_status_unchanged: boolean;
  annotations: ReviewAnnotation[];
  created_at: string;
  updated_at: string;
}

export interface AiAssistConfig {
  apiUrl: string;
  apiToken: string;
  timeoutMs: number;
}

export interface AiAssistHeadersInput {
  token: string;
  tenantId?: string;
  requestId?: string;
  idempotencyKey?: string;
  json?: boolean;
}

export interface CreateBriefParams {
  exceptionId: string;
  tenantId: string;
  requestId: string;
  idempotencyKey: string;
}

export interface GetReviewParams {
  briefId: string;
  tenantId: string;
  requestId: string;
}

export interface ListReviewsParams {
  tenantId?: string;
  requestId?: string;
  limit?: number;
  offset?: number;
  state?: "pending_review" | "annotated";
}

export interface AddAnnotationParams {
  briefId: string;
  annotation: string;
  tenantId?: string;
  requestId?: string;
  idempotencyKey?: string;
}
