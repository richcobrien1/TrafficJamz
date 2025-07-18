// src/components/AvatarStack.js
// This component displays a stack of user avatars with an overflow indicator if there are more users than the maxVisible limit.
// Use: <AvatarStack users={userList} maxVisible={5} />
import React from "react";

export default function AvatarStack({ users, maxVisible = 5 }) {
  const overflow = users.length > maxVisible;
  const visibleUsers = users.slice(0, maxVisible);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "-10px" }}>
      {visibleUsers.map((u) => (
        <img
          key={u.id}
          src={u.avatarUrl}
          alt={u.displayName}
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            border: "2px solid #fff",
            objectFit: "cover",
            boxShadow: "0 0 4px rgba(0,0,0,0.2)",
            zIndex: 100 - users.indexOf(u),
          }}
        />
      ))}
      {overflow && (
        <span style={{
          width: "36px",
          height: "36px",
          borderRadius: "50%",
          backgroundColor: "#ccc",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 600,
          color: "#333",
          boxShadow: "0 0 4px rgba(0,0,0,0.2)",
          marginLeft: "4px"
        }}>
          +{users.length - maxVisible}
        </span>
      )}
    </div>
  );
}
