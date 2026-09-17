import { Navigate, Route, Routes } from 'react-router-dom'
import SignIn from './routes/SignIn'
import B2BDashboard from './routes/B2BDashboard'
import { getAccountRoleId } from './lib/session'

// This app is the operations/compliance system — worker, block supervisor,
// zone manager and admin surfaces (frames.html's W/S/Z/A groups) — split out
// of forestos-qr-landing, which now owns only the public consumer trace (the
// T group). Worker and block-supervisor screens are phone-frame mockups in
// frames.html (mobile app territory) and are not rebuilt here; this console
// covers the desktop-appropriate roles: Zone Manager and System Admin, plus
// the partner/sponsor roles carried over from the earlier B2B portal.
//
// `/` is the sign-in page; `/app/*` is the console, gated by a lightweight
// prototype session (see `lib/session.js`) — no real backend or auth exists
// yet, this just keeps the console from being reachable without "signing in"
// as one of the demo accounts first.
function RequireSession({ children }) {
  return getAccountRoleId() ? children : <Navigate to="/" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<SignIn />} />
      <Route
        path="/app/*"
        element={
          <RequireSession>
            <B2BDashboard />
          </RequireSession>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
