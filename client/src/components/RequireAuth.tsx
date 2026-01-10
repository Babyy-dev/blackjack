import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

type RequireAuthProps = {
  children: ReactNode
}

const RequireAuth = ({ children }: RequireAuthProps) => {
  const accessToken = useAuthStore((state) => state.accessToken)
  const isBootstrapped = useAuthStore((state) => state.isBootstrapped)
  const location = useLocation()

  if (!isBootstrapped) {
    return null
  }

  if (!accessToken) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}

export default RequireAuth
