import { Link, Outlet } from "react-router-dom";

export const AppLayout = () => {
  return (
    <div style={{ fontFamily: "system-ui", margin: "0 auto", maxWidth: 960, padding: 16 }}>
      <h1>Cooperative Financial Workflow Starter</h1>
      <nav style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <Link to="/">Home</Link>
        <Link to="/auth/login">Auth</Link>
        <Link to="/member">Member Dashboard</Link>
        <Link to="/admin">Admin Dashboard</Link>
      </nav>
      <Outlet />
    </div>
  );
};
