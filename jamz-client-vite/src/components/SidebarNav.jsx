import React from "react";
import { useUser } from "@clerk/clerk-react";
import sessionService from "../services/session.service";
import { Link, useLocation } from "react-router-dom";
import { ROUTES } from "../routes";

export default function SidebarNav() {
  const { user: clerkUser } = useUser();
  const backendUser = sessionService.getCachedUserData();
  const role = backendUser?.role || 'user'; // Default to 'user' role
  const location = useLocation();

  const filteredRoutes = ROUTES.filter((r) =>
    r.public || (r.roles && r.roles.includes(role))
  );

  return (
    <nav style={{ padding: "1rem", background: "#f0f4f8" }}>
      {filteredRoutes.map(({ path, name, icon }) => (
        <Link
          key={path}
          to={path}
          style={{
            display: "block",
            marginBottom: "0.75rem",
            color: location.pathname === path ? "#1976d2" : "#333",
            fontWeight: location.pathname === path ? "bold" : "normal",
            textDecoration: "none",
          }}
        >
          {icon ? `${icon} ` : ""}{name}
        </Link>
      ))}
    </nav>
  );
}
