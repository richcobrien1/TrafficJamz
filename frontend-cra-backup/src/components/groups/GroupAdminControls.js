// src/components/GroupAdminControls.js
// This file contains controls for group administrators, allowing them to edit the group,
// manage members, and delete the group if they are the owner.
// USE: <GroupAdminControls group={activeGroup} />

import React from "react";
import { useGroupPermissions } from "../../hooks/groups";

export default function GroupAdminControls({ group }) {
  const { isOwner } = useGroupPermissions(group);

  if (!isOwner) return null;

  return (
    <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem" }}>
      <button>Edit Group</button>
      <button>Manage Members</button>
      <button style={{ color: "#d32f2f" }}>Delete Group</button>
    </div>
  );
}
