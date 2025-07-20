import { lazy } from "react";

// Lazy imports
const Login = lazy(() => import("../pages/auth/Login"));
const Register = lazy(() => import("../pages/auth/Register"));
const Dashboard = lazy(() => import("../pages/dashboard/Dashboard"));
const AudioSession = lazy(() => import("../pages/sessions/AudioSession"));
const GroupDetail = lazy(() => import("../pages/groups/GroupDetail"));
const LocationTracking = lazy(() => import("../pages/location/LocationTracking"));
const Profile = lazy(() => import("../pages/profile/Profile"));
const SubscriptionPlans = lazy(() => import("../pages/misc/SubscriptionPlans"));
const InvitationAccept = lazy(() => import("../pages/groups/InvitationAccept"));
const ForgotPassword = lazy(() => import("../pages/auth/ForgotPassword"));
const NotFound = lazy(() => import("../pages/misc/NotFound"));

export const ROUTES = [
  {
    path: "/auth/login",
    name: "Login",
    element: <Login />,
    public: true,
    icon: "🔐",
  },
  {
    path: "/auth/register",
    name: "Register",
    element: <Register />,
    public: true,
    icon: "📝",
  },
  {
    path: "/dashboard",
    name: "Dashboard",
    element: <Dashboard />,
    icon: "📊",
  },
  {
    path: "/audio/:sessionId",
    name: "Audio Session",
    element: <AudioSession />,
    icon: "🎧",
  },
  {
    path: "/groups/:groupId",
    name: "Group Detail",
    element: <GroupDetail />,
    icon: "👥",
  },
  {
    path: "/location-tracking/:groupId",
    name: "Location Tracking (Group)",
    element: <LocationTracking />,
    icon: "🗺️",
  },
  {
    path: "/profile",
    name: "Profile",
    element: <Profile />,
    icon: "🧑‍💼",
  },
  {
    path: "/subscription-plans",
    name: "Plans",
    element: <SubscriptionPlans />,
    icon: "💳",
  },
  {
    path: "/auth/forgot-password",
    name: "Forgot Password",
    element: <ForgotPassword />,
    public: true,
    icon: "🔄",
  },
  {
    path: "/groups/invitation/:inviteId",
    name: "Accept Invitation",
    element: <InvitationAccept />,
    public: true,
  },
  {
    path: "*",
    name: "Not Found",
    element: <NotFound />,
    public: true,
  },
];
