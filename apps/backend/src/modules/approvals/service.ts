import { RequestWorkflowStatus } from "@cooperative/contracts";

type RequestLike = {
  id: string;
  proposerUserId: string;
  status: RequestWorkflowStatus;
  approvalsCount: number;
};

type ApprovalInput = {
  reviewerUserId: string;
  threshold: number;
};

export const applyApproval = (request: RequestLike, input: ApprovalInput): RequestLike => {
  if (request.proposerUserId === input.reviewerUserId) {
    throw new Error(
      `Self-approval not allowed: reviewer and proposer cannot be the same user (userId: ${input.reviewerUserId})`
    );
  }

  if (request.status !== RequestWorkflowStatus.REVIEWED && request.status !== RequestWorkflowStatus.PROPOSED) {
    throw new Error(
      `Request cannot be approved. Current status: ${request.status}. Expected: PROPOSED or REVIEWED`
    );
  }

  const approvalsCount = request.approvalsCount + 1;
  const status = approvalsCount >= input.threshold ? RequestWorkflowStatus.APPROVED : RequestWorkflowStatus.REVIEWED;

  return { ...request, approvalsCount, status };
};
