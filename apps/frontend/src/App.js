import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./layouts/AppLayout";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/auth/LoginPage";
import { MemberDashboardPage } from "./pages/member/MemberDashboardPage";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
export const App = () => (_jsx(Routes, { children: _jsxs(Route, { path: "/", element: _jsx(AppLayout, {}), children: [_jsx(Route, { index: true, element: _jsx(HomePage, {}) }), _jsx(Route, { path: "auth/login", element: _jsx(LoginPage, {}) }), _jsx(Route, { path: "member", element: _jsx(MemberDashboardPage, {}) }), _jsx(Route, { path: "admin", element: _jsx(AdminDashboardPage, {}) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }) }));
