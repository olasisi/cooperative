import { RequestWorkflowStatus } from "@cooperative/contracts";
import { StatusBadge } from "../components/StatusBadge";

const workflow = [
  RequestWorkflowStatus.PROPOSED,
  RequestWorkflowStatus.REVIEWED,
  RequestWorkflowStatus.APPROVED,
  RequestWorkflowStatus.EXECUTED,
  RequestWorkflowStatus.LOGGED
];

export const HomePage = () => (
  <section>
    <p>Secure cooperative starter with immutable ledger and approval-driven execution.</p>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {workflow.map((status) => (
        <StatusBadge key={status} status={status} />
      ))}
    </div>
  </section>
);
