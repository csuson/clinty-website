import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="pt-32 pb-24 px-6 flex justify-center">
        <div className="text-navy-600 text-sm">Loading your account...</div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/sign-in" state={{ from: location.pathname }} replace />
  }

  return children
}

export function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="pt-32 pb-24 px-6 flex justify-center">
        <div className="text-navy-600 text-sm">Loading...</div>
      </div>
    )
  }

  if (user) {
    return <Navigate to="/account" replace />
  }

  return children
}
