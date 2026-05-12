import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { RequestWorkflowStatus } from "@cooperative/contracts";
import { StatusBadge } from "../components/StatusBadge";
const workflow = [
    RequestWorkflowStatus.PROPOSED,
    RequestWorkflowStatus.REVIEWED,
    RequestWorkflowStatus.APPROVED,
    RequestWorkflowStatus.EXECUTED,
    RequestWorkflowStatus.LOGGED
];
export const HomePage = () => (_jsxs("section", { children: [_jsx("p", { children: "Secure cooperative starter with immutable ledger and approval-driven execution." }), _jsx("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: workflow.map((status) => (_jsx(StatusBadge, { status: status }, status))) })] }));
