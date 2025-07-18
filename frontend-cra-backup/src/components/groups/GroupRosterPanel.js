// src/components/GroupRosterPanel.js
// This component displays a list of group members with their avatars, status, and additional information on
// Use: <GroupRosterPanel members={groupMembers} isDark={true} />

import React, { useState } from "react";
import AvatarStack from "./AvatarStack";
import UserHoverCard from "./UserHoverCard";
import StatusRing from "./StatusRing";
import SortDropdown from "./SortDropdown";

export default function GroupRosterPanel({ members = [], isDark = false }) {
  const [sortBy, setSortBy] = useState("name");
  const [showInviteesOnly, setShowInviteesOnly] = useState(false);

  if (!members.length) return <p>No group members yet.</p>;

  // Sorting logic
  const sortedMembers = [...members].sort((a, b) => {
    if (sortBy === "name") return a.displayName.localeCompare(b.displayName);
    if (sortBy === "role") return a.role.localeCompare(b.role);
    if (sortBy === "lastActive") return new Date(b.lastActive) - new Date(a.lastActive);
    return 0;
  });

  // Filtering logic
  const visibleMembers = showInviteesOnly
    ? sortedMembers.filter((u) => u.role === "invitee")
    : sortedMembers;

  return (
    <div style={{
      padding: "1.5rem",
      borderRadius: "12px",
      backgroundColor: isDark ? "#161a1d" : "#f9fafa",
      boxShadow: isDark ? "0 0 6px #000" : "0 0 6px rgba(0,0,0,0.1)",
      color: isDark ? "#f0f4f8" : "#222",
      maxWidth: "600px",
      margin: "0 auto",
    }}>
      <h3 style={{ marginBottom: "1rem" }}>👥 Group Members</h3>

      {/* Compact avatar preview */}
      <div style={{ marginBottom: "1rem" }}>
        <AvatarStack users={members} />
      </div>

      {/* Control bar */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "1rem",
        flexWrap: "wrap",
        gap: "1rem",
      }}>
        <SortDropdown sortBy={sortBy} setSortBy={setSortBy} />
        <button onClick={() => setShowInviteesOnly(!showInviteesOnly)}>
          {showInviteesOnly ? "Show All Members" : "Show Invitees Only"}
        </button>
      </div>

      {/* Scrollable member list */}
      <div style={{
        maxHeight: "320px",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem"
      }}>
        {visibleMembers.map((user, index) => (
          <div
            key={user.id}
            className="animated-entry"
            style={{
              position: "relative",
              animation: "fadePulse 0.6s ease-out",
              animationDelay: `${index * 40}ms`,
              animationFillMode: "both"
            }}
          >
            <UserHoverCard user={user} isDark={isDark} />
            <div style={{
              position: "absolute",
              bottom: "6px",
              right: "6px",
            }}>
              <StatusRing status={user.status || "offline"} />
            </div>
          </div>
        ))}
      </div>

      {/* Inline shimmer animation definition (if not globally included) */}
      <style>
        {`@keyframes fadePulse {
          0% { opacity: 0; transform: scale(0.95); }
          50% { opacity: 0.6; transform: scale(1.02); }
          100% { opacity: 1; transform: scale(1); }
        }`}
      </style>
    </div>
  );
}
