import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { Login } from "@/pages/auth/Login"
import { Signup } from "@/pages/auth/Signup"
import { RequestorDashboard } from "@/pages/requestor/Dashboard"
import { MyTickets } from "@/pages/requestor/MyTickets"
import { CreateTicket } from "@/pages/requestor/CreateTicket"
import { RequestorTicketDetail } from "@/pages/requestor/TicketDetail"
import { AdminDashboard } from "@/pages/admin/Dashboard"
import { AdminTickets } from "@/pages/admin/Tickets"
import { AdminTicketDetail } from "@/pages/admin/TicketDetail"
import { AdminDevelopers } from "@/pages/admin/Developers"
import { AdminUsers } from "@/pages/admin/Users"
import { AdminCategories } from "@/pages/admin/Categories"
import { DeveloperDashboard } from "@/pages/developer/Dashboard"
import { DeveloperMyTickets } from "@/pages/developer/MyTickets"
import { DeveloperTicketDetail } from "@/pages/developer/TicketDetail"
import { DeveloperResolved } from "@/pages/developer/Resolved"
import { Notifications } from "@/pages/Notifications"
import { GuestRoute, RoleRoute } from "@/components/RouteGuard"

const guest = (node: React.ReactNode) => <GuestRoute>{node}</GuestRoute>
const role = (name: "user" | "developer" | "admin", node: React.ReactNode) => <RoleRoute role={name}>{node}</RoleRoute>

export default function App() {
  return <BrowserRouter><Routes>
    <Route path="/login" element={guest(<Login />)} />
    <Route path="/signup" element={guest(<Signup />)} />
    <Route path="/requestor" element={role("user", <RequestorDashboard />)} />
    <Route path="/requestor/tickets" element={role("user", <MyTickets />)} />
    <Route path="/requestor/tickets/:id" element={role("user", <RequestorTicketDetail />)} />
    <Route path="/requestor/create" element={role("user", <CreateTicket />)} />
    <Route path="/requestor/notifications" element={role("user", <Notifications role="requestor" />)} />
    <Route path="/admin" element={role("admin", <AdminDashboard />)} />
    <Route path="/admin/tickets" element={role("admin", <AdminTickets />)} />
    <Route path="/admin/tickets/:id" element={role("admin", <AdminTicketDetail />)} />
    <Route path="/admin/developers" element={role("admin", <AdminDevelopers />)} />
    <Route path="/admin/users" element={role("admin", <AdminUsers />)} />
    <Route path="/admin/categories" element={role("admin", <AdminCategories />)} />
    <Route path="/admin/notifications" element={role("admin", <Notifications role="admin" />)} />
    <Route path="/developer" element={role("developer", <DeveloperDashboard />)} />
    <Route path="/developer/tickets" element={role("developer", <DeveloperMyTickets />)} />
    <Route path="/developer/tickets/:id" element={role("developer", <DeveloperTicketDetail />)} />
    <Route path="/developer/resolved" element={role("developer", <DeveloperResolved />)} />
    <Route path="/developer/notifications" element={role("developer", <Notifications role="developer" />)} />
    <Route path="/" element={<Navigate to="/login" replace />} />
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes></BrowserRouter>
}
