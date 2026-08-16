import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ScrollToHash from './components/ScrollToHash'
import ProtectedRoute, { GuestRoute } from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import Home from './pages/Home'
import Contact from './pages/Contact'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsOfService from './pages/TermsOfService'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import Account from './pages/Account'
import Admin from './pages/Admin'
import AdminAgentSettingsNew from './pages/AdminAgentSettingsNew'
import AdminAgentSettingsEdit from './pages/AdminAgentSettingsEdit'
import Dashboard from './pages/Dashboard'

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToHash />
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route
            path="/sign-in"
            element={
              <GuestRoute>
                <SignIn />
              </GuestRoute>
            }
          />
          <Route
            path="/sign-up"
            element={
              <GuestRoute>
                <SignUp />
              </GuestRoute>
            }
          />
          <Route
            path="/admin/agent-settings/:id/edit"
            element={
              <AdminRoute>
                <AdminAgentSettingsEdit />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/agent-settings/new"
            element={
              <AdminRoute>
                <AdminAgentSettingsNew />
              </AdminRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <Admin />
              </AdminRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account/*"
            element={
              <ProtectedRoute>
                <Account />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
      <Footer />
    </BrowserRouter>
  )
}
