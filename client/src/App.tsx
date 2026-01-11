import { useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import SiteLayout from './components/SiteLayout'
import RequireAdmin from './components/RequireAdmin'
import RequireAuth from './components/RequireAuth'
import LandingPage from './pages/LandingPage'
import AuthPage from './pages/AuthPage'
import ProfilePage from './pages/ProfilePage'
import LobbyPage from './pages/LobbyPage'
import TablePage from './pages/TablePage'
import WalletPage from './pages/WalletPage'
import AdminPage from './pages/AdminPage'
import GamePage from './pages/GamePage'
import NotFoundPage from './pages/NotFoundPage'
import { useAuthStore } from './store/authStore'
import { useLobbyStore } from './store/lobbyStore'

const App = () => {
  const bootstrap = useAuthStore((state) => state.bootstrap)
  const accessToken = useAuthStore((state) => state.accessToken)
  const connectLobby = useLobbyStore((state) => state.connect)
  const disconnectLobby = useLobbyStore((state) => state.disconnect)

  useEffect(() => {
    void bootstrap()
  }, [bootstrap])

  useEffect(() => {
    if (accessToken) connectLobby(accessToken)
    else disconnectLobby()
  }, [accessToken, connectLobby, disconnectLobby])

  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/profile"
          element={
            <RequireAuth>
              <ProfilePage />
            </RequireAuth>
          }
        />
        <Route
          path="/wallet"
          element={
            <RequireAuth>
              <WalletPage />
            </RequireAuth>
          }
        />
        <Route
          path="/lobby"
          element={
            <RequireAuth>
              <LobbyPage />
            </RequireAuth>
          }
        />
        <Route
          path="/table/:tableId"
          element={
            <RequireAuth>
              <TablePage />
            </RequireAuth>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminPage />
            </RequireAdmin>
          }
        />
      </Route>
      <Route
        path="/game"
        element={
          <RequireAuth>
            <GamePage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
