// src/hooks/groups/useGroupInvites.js
// This hook fetches group invites for the current user from Supabase
// Prefers client-side checks first, then falls back to Supabase RPC if needed

import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import sessionService from "../../services/session.service";
import { supabase } from "../services/client"; // assumes shared Supabase client
import api from "../../services/api";

export function useGroupInvites() {
  const { user: clerkUser, isLoaded } = useUser();
  const [backendUser, setBackendUser] = useState(() => sessionService.getCachedUserData());
  const [invites, setInvites] = useState([]);
  
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
    if (!currentUser) return;

    const fetchInvites = async () => {
      const { data, error } = await supabase
        .from("group_invites")
        .select("*")
        .eq("invitee_id", currentUser.id);

      if (error) {
        console.error("Error fetching group invites:", error);
      } else {
        setInvites(data);
      }
    };

    fetchInvites();
  }, [currentUser]);

  return invites;
}