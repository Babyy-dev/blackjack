import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

type RequireAdminProps = {
  children: ReactNode
}

const RequireAdmin = ({ children }: RequireAdminProps) => {
  const accessToken = useAuthStore((state) => state.accessToken)
  const user = useAuthStore((state) => state.user)
  const isBootstrapped = useAuthStore((state) => state.isBootstrapped)
  const location = useLocation()

  if (!isBootstrapped) {
    return null
  }

  if (!accessToken) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />
  }

  if (!user?.is_admin) {
    return (
      <div className="mx-auto flex w-full  flex-col items-center gap-4 px-6 py-20 text-center">
        <h1 className="text-3xl font-display uppercase tracking-[0.3rem] text-white">
          Admin access only
        </h1>
        <p className="text-sm text-white/60">
          You do not have permission to view the admin console.
        </p>
      </div>
    )
  }

  return <>{children}</>
}

export default RequireAdmin
