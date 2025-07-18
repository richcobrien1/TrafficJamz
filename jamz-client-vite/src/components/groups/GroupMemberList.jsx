// src/components/GroupMemberList.js
// This component displays a list of group members with their identity cards.
// Use: <GroupMemberList members={groupMembers} isDark={true} />

import React from "react";
import UserIdentityCard from "../UserIdentityCard";

// Example prop shape for each user
// {
//   id: "uuid",
//   avatarUrl: "https://...",
//   displayName: "Jane Frost",
//   role: "subscriber"
// }

export default function GroupMemberList({ members, isDark = false }) {
  if (!members?.length) {
    return <p>No members in this group yet.</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {members.map((user) => (
        <UserIdentityCard key={user.id} user={user} isDark={isDark} />
      ))}
    </div>
  );
}
