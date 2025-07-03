// src/hooks/groups/useGroupInvites.js
// This hook fetches group invites for the current user from Supabase
// Prefers client-side checks first, then falls back to Supabase RPC if needed

import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../services/client"; // assumes shared Supabase client
export function useGroupInvites() {
  const { currentUser } = useAuth();
  const [invites, setInvites] = useState([]);

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