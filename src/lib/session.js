// Lightweight prototype "session" — no real auth exists yet (see README). A
// chosen demo account is remembered for the tab via sessionStorage so the
// dashboard can require a sign-in step without a backend. Wrapped in
// try/catch: sessionStorage can throw in private-browsing contexts, and a
// session that just doesn't persist is an acceptable degradation here.

const KEY = 'forestos-ops.account'

export function getAccountRoleId() {
  try {
    return sessionStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function setAccountRoleId(roleId) {
  try {
    sessionStorage.setItem(KEY, roleId)
  } catch {
    // no-op — session just won't persist this tab
  }
}

export function clearAccount() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // no-op
  }
}
