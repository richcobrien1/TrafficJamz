// src/components/GroupInvitePanel.js
// This file contains a panel for inviting new members to a group.
// It allows group owners to send email invites to potential members.
// USE: <GroupInvitePanel group={activeGroup} />

import React, { useState } from "react";
import { useGroupPermissions } from "../../hooks/groups";
import { supabase } from "../../services/client";

export default function GroupInvitePanel({ group }) {
  const { canInviteMembers } = useGroupPermissions(group);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(null);

  if (!canInviteMembers) return null;

  const sendInvite = async () => {
    if (!email) return;

    const { error } = await supabase.from("group_invites").insert({
      group_id: group.id,
      invited_email: email,
      invited_by: group.owner_id,
    });

    if (error) {
      setStatus("❌ Invite failed. Please try again.");
    } else {
      setStatus("✅ Invite sent successfully.");
      setEmail("");
    }
  };

  return (
    <div style={{ padding: "1rem", background: "#f7fafc", borderRadius: "6px", marginBottom: "1rem" }}>
      <h3>📨 Invite a Member</h3>
      <input
        type="email"
        placeholder="user@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ marginRight: "0.5rem", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
      />
      <button onClick={sendInvite}>Send Invite</button>
      {status && <p style={{ marginTop: "0.5rem" }}>{status}</p>}
    </div>
  );
}
