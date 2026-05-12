import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link, Outlet } from "react-router-dom";
export const AppLayout = () => {
    return (_jsxs("div", { style: { fontFamily: "system-ui", margin: "0 auto", maxWidth: 960, padding: 16 }, children: [_jsx("h1", { children: "Cooperative Financial Workflow Starter" }), _jsxs("nav", { style: { display: "flex", gap: 12, marginBottom: 16 }, children: [_jsx(Link, { to: "/", children: "Home" }), _jsx(Link, { to: "/auth/login", children: "Auth" }), _jsx(Link, { to: "/member", children: "Member Dashboard" }), _jsx(Link, { to: "/admin", children: "Admin Dashboard" })] }), _jsx(Outlet, {})] }));
};
