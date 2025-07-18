// src/components/GroupSessionStats.js
// This component displays statistics about group sessions, such as total sessions,
// USE: <GroupSessionStats stats={groupStats} />
import React from "react";

export default function GroupSessionStats({ stats }) {
  if (!stats) return null;

  const { totalSessions, lastSessionDate, activeUsers } = stats;

  return (
    <div style={{
      padding: "1rem",
      background: "#eef2f7",
      borderRadius: "6px",
      marginBottom: "1rem"
    }}>
      <h3>📈 Session Activity</h3>
      <ul>
        <li><strong>Total Sessions:</strong> {totalSessions}</li>
        <li><strong>Last Session:</strong> {new Date(lastSessionDate).toLocaleString()}</li>
        <li><strong>Active Users:</strong> {activeUsers}</li>
      </ul>
    </div>
  );
}
