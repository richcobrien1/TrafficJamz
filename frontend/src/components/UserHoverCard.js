// src/components/UserHoverCard.js
// This component displays a hover card with additional user information when hovering over a user's identity card.
// Use: <UserHoverCard user={currentUser} isDark={true} />

import React, { useState } from "react";
import UserIdentityCard from "./UserIdentityCard";

export default function UserHoverCard({ user, isDark = false }) {
  const [hovering, setHovering] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      style={{ position: "relative", display: "inline-block" }}
    >
      <UserIdentityCard user={user} isDark={isDark} />
      {hovering && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: 0,
          marginTop: "0.5rem",
          padding: "0.75rem 1rem",
          backgroundColor: isDark ? "#2e2e2e" : "#fff",
          borderRadius: "6px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          zIndex: 100,
          minWidth: "220px"
        }}>
          <p><strong>📧 Email:</strong> {user.email}</p>
          <p><strong>💳 Subscription:</strong> {user.subscriptionTier || "Free"}</p>
          <p><strong>📩 Invite Status:</strong> {user.inviteStatus || "Accepted"}</p>
        </div>
      )}
    </div>
  );
}
