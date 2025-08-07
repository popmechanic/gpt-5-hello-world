import React, { useState, useEffect } from 'react'
import { db, syncHelpers } from '../database.js'

export function AuthPanel() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [showAuthForm, setShowAuthForm] = useState(false)

  // Simplified authentication state - avoid infinite loops
  const [currentUser, setCurrentUser] = useState({ isLoggedIn: false })
  const [syncStatus, setSyncStatus] = useState({ isOnline: false, isSyncing: false, phase: 'unknown' })

  // Check auth state on mount and when needed
  useEffect(() => {
    try {
      const user = syncHelpers.getCurrentUser()
      const isReallyLoggedIn = user.isLoggedIn && user.id !== 'unauthorized'
      setCurrentUser({
        ...user,
        isLoggedIn: isReallyLoggedIn
      })

      const cloudState = db.cloud.syncState || db.cloud.persistedSyncState || {}
      const phase = cloudState.phase || 'unknown'
      setSyncStatus({
        isOnline: phase === 'online' || (isReallyLoggedIn && phase === 'unknown'),
        isSyncing: phase === 'syncing',
        lastSync: cloudState.lastSync,
        phase: phase,
        isLoggedIn: isReallyLoggedIn
      })
    } catch (error) {
      console.log('Auth check error:', error)
      setCurrentUser({ isLoggedIn: false })
      setSyncStatus({ isOnline: false, isSyncing: false, phase: 'error' })
    }
  }, [message]) // Re-check when messages change (after auth attempts)

  const handleSignIn = async (e) => {
    e.preventDefault()
    if (!email.trim()) return

    setIsLoading(true)
    setMessage('')

    try {
      await syncHelpers.signIn(email)
      setMessage('Check your email for the login link!')
      setEmail('')
    } catch (error) {
      setMessage(`Sign in failed: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    setIsLoading(true)
    try {
      await syncHelpers.signOut()
      setMessage('Signed out successfully')
    } catch (error) {
      setMessage(`Sign out failed: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleForceSync = async () => {
    setIsLoading(true)
    try {
      // Try to trigger a manual sync
      await db.cloud.sync()
      setMessage('Sync triggered')
    } catch (error) {
      setMessage(`Sync failed: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  if (!currentUser?.isLoggedIn) {
    return (
      <div className="bg-[#ffffff] border-4 border-[#242424] p-4 rounded-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold">Cloud Sync</h2>
          <button
            onClick={() => setShowAuthForm(!showAuthForm)}
            className="px-3 py-1 bg-[#70d6ff] border-4 border-[#242424] font-semibold text-sm"
          >
            {showAuthForm ? 'Hide' : 'Sign In'}
          </button>
        </div>

        <div className="text-sm text-[#242424]/70 mb-2">
          ⚠️ <strong>Offline Mode:</strong> Data is stored locally only
        </div>

        {showAuthForm && (
          <form onSubmit={handleSignIn} className="space-y-3">
            <div>
              <label className="block font-semibold text-sm">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="mt-1 w-full border-4 border-[#242424] px-3 py-2 rounded-sm bg-[#e9ff70] placeholder-[#242424]/60"
                required
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !email.trim()}
              className="px-4 py-2 bg-[#ffd670] border-4 border-[#242424] font-bold disabled:opacity-60"
            >
              {isLoading ? 'Sending...' : 'Send Login Link'}
            </button>
          </form>
        )}

        {message && (
          <div className="mt-3 p-2 bg-[#ff70a6]/20 border-4 border-[#242424] rounded-sm text-sm">
            {message}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-[#ffffff] border-4 border-[#242424] p-4 rounded-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-bold">Cloud Sync</h2>
        <div className="flex items-center gap-2">
          <SyncStatusIndicator status={syncStatus} />
          <button
            onClick={handleForceSync}
            disabled={isLoading}
            className="px-2 py-1 bg-[#ffd670] border-4 border-[#242424] font-semibold text-xs disabled:opacity-60"
          >
            Sync
          </button>
          <button
            onClick={handleSignOut}
            disabled={isLoading}
            className="px-3 py-1 bg-[#ff70a6] border-4 border-[#242424] font-semibold text-sm disabled:opacity-60"
          >
            Sign Out
          </button>
        </div>
      </div>

      <div className="text-sm space-y-1">
        <div>
          ✅ <strong>Signed in as:</strong> {currentUser?.email || 'Anonymous'}
        </div>
        <div>
          🔄 <strong>Sync status:</strong> {getSyncStatusText(syncStatus)}
        </div>
        <details className="text-xs text-[#242424]/50 mt-1">
          <summary>Debug Info</summary>
          <pre>{JSON.stringify({ 
            phase: syncStatus?.phase,
            isLoggedIn: syncStatus?.isLoggedIn,
            userId: db.cloud.currentUserId,
            syncState: db.cloud.syncState?.phase
          }, null, 2)}</pre>
        </details>
        <div className="text-[#242424]/70">
          Notes are publicly readable and sync across all devices
        </div>
      </div>

      {message && (
        <div className="mt-3 p-2 bg-[#70d6ff]/20 border-4 border-[#242424] rounded-sm text-sm">
          {message}
        </div>
      )}
    </div>
  )
}

function SyncStatusIndicator({ status }) {
  if (!status) return <div className="w-3 h-3 rounded-full bg-gray-400"></div>

  if (status.isSyncing) {
    return <div className="w-3 h-3 rounded-full bg-yellow-400 animate-pulse"></div>
  }
  
  if (status.isOnline) {
    return <div className="w-3 h-3 rounded-full bg-green-400"></div>
  }
  
  return <div className="w-3 h-3 rounded-full bg-red-400"></div>
}

function getSyncStatusText(status) {
  if (!status) return 'Unknown'
  if (status.isSyncing) return 'Syncing...'
  if (status.isOnline) return 'Online'
  return `Offline (${status.phase || 'no-phase'})`
}