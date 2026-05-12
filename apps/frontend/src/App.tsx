import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./layouts/AppLayout";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/auth/LoginPage";
import { MemberDashboardPage } from "./pages/member/MemberDashboardPage";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";

export const App = () => (
  <Routes>
    <Route path="/" element={<AppLayout />}>
      <Route index element={<HomePage />} />
      <Route path="auth/login" element={<LoginPage />} />
      <Route path="member" element={<MemberDashboardPage />} />
      <Route path="admin" element={<AdminDashboardPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  </Routes>
);
