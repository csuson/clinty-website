import { Navigate, useLocation } from 'react-router-dom'
import { isAdminEmail } from '../constants/admin'
import { useAuth } from '../context/AuthContext'
import ProtectedRoute from './ProtectedRoute'

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const location = useLocation()

  return (
    <ProtectedRoute>
      {isAdminEmail(user?.email) ? (
        children
      ) : (
        <Navigate to="/account" state={{ from: location.pathname }} replace />
      )}
    </ProtectedRoute>
  )
}
