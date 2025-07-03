// src/hooks/groups/useResolvedGroupRole.js
// This hook resolves the user's role in a group, preferring client-side checks first,
// then falling back to a Supabase RPC call if necessary.

import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../services/client"; // assumes shared Supabase client

export function useResolvedGroupRole(group) {
  const { currentUser } = useAuth();
  const [resolvedRole, setResolvedRole] = useState(null);

  useEffect(() => {
    if (!group || !currentUser) return;

    // Try client-side shortcut
    if (group.owner_id === currentUser.id) {
      setResolvedRole("owner");
    } else if (group.members?.includes(currentUser.id)) {
      setResolvedRole("member");
    } else if (group.invitees?.includes(currentUser.id)) {
      setResolvedRole("invitee");
    } else {
      // Fallback to Supabase RPC
      const fetchRole = async () => {
        const { data, error } = await supabase.rpc("resolve_group_role", {
          user_id: currentUser.id,
          group_id: group.id,
        });
        if (!error) setResolvedRole(data);
      };
      fetchRole();
    }
  }, [group, currentUser]);

  return resolvedRole;
}
