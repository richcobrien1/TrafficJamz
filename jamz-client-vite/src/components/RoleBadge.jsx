// src/components/RoleBadge.js
// This component displays a badge representing the user's role in a group.
// Use: <RoleBadge role={userRole} isDark={true} />

import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";

// Optional: Move keyframes to global CSS or CSS module
const shimmerStyle = `
@keyframes shimmer {
  0%   { opacity: 0.6; transform: scale(0.95); }
  50%  { opacity: 1;   transform: scale(1.05); }
  100% { opacity: 1;   transform: scale(1);    }
`;

// Inject shimmer keyframes if not using CSS file
if (typeof document !== "undefined") {
  const styleTag = document.getElementById("shimmer-keyframes") || document.createElement("style");
  styleTag.id = "shimmer-keyframes";
  styleTag.innerHTML = shimmerStyle;
  document.head.appendChild(styleTag);
}

export default function RoleBadge({ role, isDark = false }) {
  const [showShimmer, setShowShimmer] = useState(false);
  const [prevRole, setPrevRole] = useState(role);

  useEffect(() => {
    if (role !== prevRole) {
      setShowShimmer(true);
      const timer = setTimeout(() => setShowShimmer(false), 600);
      setPrevRole(role);
      return () => clearTimeout(timer);
    }
  }, [role]);

  const getBadgeStyle = () => {
    switch (role) {
      case "owner": return { label: "👑 Owner", color: "#388e3c" };
      case "subscriber": return { label: "💼 Subscriber", color: "#1976d2" };
      case "member": return { label: "🧑‍🤝‍🧑 Member", color: "#7b1fa2" };
      case "invitee": return { label: "🔒 Invitee", color: "#f57c00" };
      default: return { label: "🚫 Unknown", color: "#d32f2f" };
    }
  };

  const { label, color } = getBadgeStyle();

  return (
    <span style={{
      padding: "0.35em 0.65em",
      fontSize: "0.875rem",
      borderRadius: "12px",
      backgroundColor: color,
      color: isDark ? "#f0f4f8" : "#fff",
      fontWeight: 600,
      whiteSpace: "nowrap",
      animation: showShimmer ? "shimmer 0.6s ease-out" : "none",
      display: "inline-block",
    }}>
      {label}
    </span>
  );
}

RoleBadge.propTypes = {
  role: PropTypes.string,
  isDark: PropTypes.bool,
};
