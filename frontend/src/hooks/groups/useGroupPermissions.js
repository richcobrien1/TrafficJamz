// src/hooks/groups/useGroupPermissions.js

import { useResolvedGroupRole } from "./useResolvedGroupRole";

export function useGroupPermissions(group) {
  const role = useResolvedGroupRole(group);

  return {
    isOwner: role === "owner",
    isSubscriber: role === "subscriber",
    isMember: role === "member",
    isInvitee: role === "invitee",

    // Capability flags
    canCreateGroup: role === "subscriber" || role === "owner",
    canCreateSession: role === "owner",
    canEditGroup: role === "owner",
    canInviteMembers: role === "owner" || role === "subscriber",
    canViewSessions: ["owner", "subscriber", "member"].includes(role),
    isReadOnly: role === "invitee" || !role,
  };
}
