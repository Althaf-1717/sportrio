import React from "react";
import { Routes, Route, Navigate, useParams } from "react-router-dom";
import { useApp } from "./context/AppContext";
import PublicLayout from "./components/PublicLayout";
import DashboardLayout from "./components/DashboardLayout";
import { ScrollTop } from "./components/UI";
import {
  Home,
  Sports,
  SportDetail,
  Coaches,
  CoachDetail,
  Membership,
  MembershipDetail,
  About,
  Contact,
  NotFound,
} from "./pages/Public";
import Auth from "./pages/Auth";
import {
  Overview,
  Enrollment,
  StudentMembership,
  StudentSports,
  StudentCoaches,
  Attendance,
  Progress,
  Payments,
  Squad,
  Profile,
} from "./pages/Training";
import { AdminResource, Settings, AthleteDetail } from "./pages/Admin";
function DashboardPage() {
  const { role, page } = useParams();
  if (!page) return <Overview />;
  const student = {
    enroll: <Enrollment />,
    enrollment: <Enrollment />,
    membership: <StudentMembership />,
    sports: <StudentSports />,
    coaches: <StudentCoaches />,
    attendance: <Attendance />,
    progress: <Progress />,
    payments: <Payments />,
    profile: <Profile />,
  };
  const coach = {
    students: <Squad />,
    attendance: <Attendance />,
    progress: <Progress />,
    profile: <Profile />,
  };
  if (role === "student") return student[page] || <NotFound />;
  if (role === "coach") return coach[page] || <NotFound />;
  if (role === "admin") {
    if (page === "settings") return <Settings />;
    if (page === "attendance") return <Attendance />;
    if (page === "progress") return <Progress />;
    if (page === "payments") return <Payments />;
    if (
      [
        "students",
        "coaches",
        "sports",
        "membership-plans",
        "enrollments",
        "users",
        "messages",
      ].includes(page)
    )
      return <AdminResource key={page} resource={page} />;
  }
  return <NotFound />;
}
function DashboardRedirect() {
  const { user } = useApp();
  return <Navigate to={user ? "/dashboard/" + user.role : "/login"} replace />;
}
function PlanRedirect() {
  const { planId } = useParams();
  return <Navigate to={"/membership?plan=" + planId} replace />;
}
export default function App() {
  return (
    <>
      <ScrollTop />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="sports" element={<Sports />} />
          <Route path="sports/:id" element={<SportDetail />} />
          <Route path="coaches" element={<Coaches />} />
          <Route path="coaches/:id" element={<CoachDetail />} />
          <Route path="membership" element={<Membership />} />
          <Route path="membership/:planId" element={<MembershipDetail />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
        </Route>
        <Route path="login" element={<Auth />} />
        <Route path="register" element={<Auth register />} />
        <Route path="coach" element={<Auth role="coach" />} />
        <Route path="admin" element={<Auth role="admin" />} />
        <Route path="dashboard" element={<DashboardRedirect />} />
        <Route
          path="dashboard/coaches"
          element={<Navigate to="/dashboard/coach" replace />}
        />
        <Route path="dashboard/:role" element={<DashboardLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path=":page" element={<DashboardPage />} />
        </Route>
        <Route path="students/:studentId" element={<AthleteDetail />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
