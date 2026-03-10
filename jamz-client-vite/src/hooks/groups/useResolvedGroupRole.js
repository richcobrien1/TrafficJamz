// src/hooks/groups/useResolvedGroupRole.js
// This hook resolves the user's role in a group, preferring client-side checks first,
// then falling back to a Supabase RPC call if necessary.

import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import sessionService from "../../services/session.service";
import { supabase } from "../services/client"; // assumes shared Supabase client
import api from "../../services/api";

export function useResolvedGroupRole(group) {
  const { user: clerkUser, isLoaded } = useUser();
  const [backendUser, setBackendUser] = useState(() => sessionService.getCachedUserData());
  const [resolvedRole, setResolvedRole] = useState(null);
  
  const currentUser = React.useMemo(() => {
    if (!clerkUser || !backendUser) return null;
    return { id: backendUser.id, ...backendUser };
  }, [clerkUser, backendUser]);
  
  // Fetch backend profile if not cached
  useEffect(() => {
    if (clerkUser && !backendUser) {
      api.get('/users/profile')
        .then(response => {
          setBackendUser(response.data.user);
          sessionService.cacheUserData(response.data.user);
        })
        .catch(error => console.error('Error fetching user profile:', error));
    }
  }, [clerkUser]);

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
