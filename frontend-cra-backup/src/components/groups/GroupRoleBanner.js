// src/components/GroupRoleBanner.js
// This component displays the user's role in a group and their permissions.
// It uses the `useGroupPermissions` hook to determine the user's role and permissions.
// USE: <GroupRoleBanner group={activeGroup} />

import React from "react";
import { useGroupPermissions } from "../../hooks/groups";

export default function GroupRoleBanner({ group }) {
  const {
    isOwner,
    isSubscriber,
    isMember,
    isInvitee,
    canCreateSession,
    canInviteMembers,
    isReadOnly
  } = useGroupPermissions(group);

  let message = "";
  let color = "#1976d2"; // default blue

  if (isOwner) {
    message = "👑 You are the owner of this group. Full access granted.";
    color = "#388e3c"; // green
  } else if (isSubscriber) {
    message = "✅ You’re a subscriber. You can create your own group anytime.";
    color = "#1976d2";
  } else if (isMember) {
    message = "🧑‍🤝‍🧑 You're a member of this group. Session access enabled.";
  } else if (isInvitee) {
    message = "🔒 You're viewing as an invitee. Join this group to unlock access.";
    color = "#f57c00"; // orange
  } else {
    message = "🚫 Access level unknown. Please reauthenticate or contact support.";
    color = "#d32f2f"; // red
  }

  return (
    <div style={{
      padding: "0.75rem 1rem",
      marginBottom: "1rem",
      backgroundColor: "#f0f4f8",
      borderLeft: `4px solid ${color}`,
      borderRadius: "4px"
    }}>
      <p style={{ margin: 0 }}>{message}</p>
    </div>
  );
}
