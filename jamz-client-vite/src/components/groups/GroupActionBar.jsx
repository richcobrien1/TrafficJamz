// src/components/GroupActionBar.js
// This component provides action buttons for group members based on their permissions.
// USE: <GroupActionBar group={activeGroup} />

import React from "react";
import { useGroupPermissions } from "../../hooks/groups";

export default function GroupActionBar({ group }) {
  const { canCreateSession, canInviteMembers, canEditGroup } = useGroupPermissions(group);

  return (
    <div style={{
      display: "flex",
      flexWrap: "wrap",
      gap: "0.75rem",
      marginBottom: "1rem"
    }}>
      {canCreateSession && <button>🎧 Start Session</button>}
      {canInviteMembers && <button>📨 Invite Member</button>}
      {canEditGroup && <button>🛠️ Edit Group</button>}
    </div>
  );
}
