// src/components/StatusRing.js
// This component displays a small colored ring indicating the user's status (online, pending, offline).
// Use: <StatusRing status="online" />

import React from "react";

export default function StatusRing({ status = "offline" }) {
  const getColor = () => {
    switch (status) {
      case "online": return "#4caf50";   // green
      case "pending": return "#ff9800";  // orange
      case "offline": default: return "#9e9e9e";  // gray
    }
  };

  return (
    <span style={{
      display: "inline-block",
      width: "12px",
      height: "12px",
      borderRadius: "50%",
      backgroundColor: getColor(),
      boxShadow: "0 0 2px rgba(0,0,0,0.2)",
    }} />
  );
}
