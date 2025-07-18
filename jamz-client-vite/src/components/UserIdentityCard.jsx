// src/components/UserIdentityCard.js
// This component displays a user's identity card with their avatar, display name, and role badge.
// Use: <UserIdentityCard user={currentUser} isDark={true} />

import React from "react";
import RoleBadge from "./RoleBadge";

export default function UserIdentityCard({ user, isDark = false }) {
  if (!user) return null;

  const { avatarUrl, displayName, role } = user;

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "0.75rem",
      padding: "0.75rem 1rem",
      borderRadius: "8px",
      backgroundColor: isDark ? "#1e1e1e" : "#f0f4f8",
      boxShadow: isDark ? "0 0 4px #000" : "0 0 4px #ccc"
    }}>
      <img
        src={avatarUrl}
        alt="User avatar"
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          objectFit: "cover",
          border: `2px solid ${isDark ? "#444" : "#ddd"}`,
        }}
      />
      <div>
        <div style={{
          fontWeight: 600,
          fontSize: "1rem",
          marginBottom: "0.25rem",
          color: isDark ? "#f0f0f0" : "#333"
        }}>
          {displayName}
        </div>
        <RoleBadge role={role} isDark={isDark} />
      </div>
    </div>
  );
}
