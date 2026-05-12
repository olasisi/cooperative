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
    throw new Error("No self-approval allowed");
  }

  if (request.status !== RequestWorkflowStatus.REVIEWED && request.status !== RequestWorkflowStatus.PROPOSED) {
    throw new Error("Request is not in an approvable state");
  }

  const approvalsCount = request.approvalsCount + 1;
  const status = approvalsCount >= input.threshold ? RequestWorkflowStatus.APPROVED : RequestWorkflowStatus.REVIEWED;

  return { ...request, approvalsCount, status };
};
