import { jsx as _jsx } from "react/jsx-runtime";
const colors = {
    PROPOSED: "#6b7280",
    REVIEWED: "#0369a1",
    APPROVED: "#047857",
    EXECUTED: "#4f46e5",
    LOGGED: "#111827",
    REJECTED: "#b91c1c"
};
export const StatusBadge = ({ status }) => (_jsx("span", { style: {
        background: colors[status],
        color: "white",
        borderRadius: 999,
        padding: "0.2rem 0.6rem",
        fontSize: "0.75rem"
    }, children: status }));
