import React, { useState, useEffect } from 'react'
import { db, syncHelpers } from '../database.js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

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
      <Card className="transform -rotate-2 hover:rotate-0 transition-transform duration-200">
        <CardHeader className="bg-muted text-muted-foreground">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-black flex items-center gap-2">
              ☁️ CLOUD SYNC
            </CardTitle>
            <Button
              onClick={() => setShowAuthForm(!showAuthForm)}
              variant={showAuthForm ? "destructive" : "secondary"}
              className="font-black"
            >
              {showAuthForm ? '❌ HIDE' : '🔑 SIGN IN'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="bg-destructive/20 border-4 border-destructive rounded-base p-4">
            <p className="font-black text-lg">⚠️ OFFLINE MODE</p>
            <p className="font-bold opacity-80">Your data is stored locally only!</p>
          </div>

          {showAuthForm && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-black uppercase tracking-wide">Email Address</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  disabled={isLoading}
                  className="text-lg font-bold"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={isLoading || !email.trim()}
                size="lg"
                className="w-full text-lg font-black transform hover:scale-105 transition-transform"
              >
                {isLoading ? '📧 SENDING...' : '🚀 SEND LOGIN LINK'}
              </Button>
            </form>
          )}

          {message && (
            <div className="bg-accent/20 border-4 border-accent rounded-base p-4">
              <p className="font-bold">{message}</p>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="transform rotate-2 hover:rotate-0 transition-transform duration-200">
      <CardHeader className="bg-secondary text-secondary-foreground">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-black flex items-center gap-2">
            ✅ CONNECTED TO CLOUD
          </CardTitle>
          <div className="flex items-center gap-2">
            <SyncStatusIndicator status={syncStatus} />
            <Button
              onClick={handleForceSync}
              disabled={isLoading}
              variant="outline"
              size="sm"
              className="font-black"
            >
              🔄 SYNC
            </Button>
            <Button
              onClick={handleSignOut}
              disabled={isLoading}
              variant="destructive"
              size="sm"
              className="font-black"
            >
              🚪 SIGN OUT
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-primary/10 rounded-base border-4 border-primary p-4">
            <p className="font-black text-lg">👤 USER</p>
            <p className="font-bold opacity-80 break-all">{currentUser?.email || 'Anonymous'}</p>
          </div>
          
          <div className={`rounded-base border-4 p-4 ${
            syncStatus?.isOnline 
              ? 'bg-secondary/30 border-secondary' 
              : 'bg-destructive/20 border-destructive'
          }`}>
            <p className="font-black text-lg">🌐 STATUS</p>
            <p className="font-bold opacity-80">{getSyncStatusText(syncStatus)}</p>
          </div>
        </div>

        <div className="bg-accent/10 border-4 border-accent rounded-base p-4">
          <p className="font-black text-lg mb-2">🚀 YOUR DATA IS SYNCING!</p>
          <p className="font-bold opacity-80">
            Your cards are stored in the public realm and sync across all devices automatically.
          </p>
        </div>

        <details className="bg-muted rounded-base border-2 border-border p-3">
          <summary className="font-black cursor-pointer hover:opacity-70">🔧 DEBUG INFO</summary>
          <pre className="mt-2 text-xs font-mono bg-card p-2 rounded border overflow-auto">
{JSON.stringify({ 
  phase: syncStatus?.phase,
  isLoggedIn: syncStatus?.isLoggedIn,
  userId: db.cloud.currentUserId,
  syncState: db.cloud.syncState?.phase,
  dbUrl: db.cloud.options?.databaseUrl,
  requireAuth: db.cloud.options?.requireAuth
}, null, 2)}
          </pre>
        </details>

        {message && (
          <div className="bg-accent/20 border-4 border-accent rounded-base p-4">
            <p className="font-bold">{message}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SyncStatusIndicator({ status }) {
  if (!status) {
    return (
      <Badge variant="secondary" className="font-black">
        ❓ UNKNOWN
      </Badge>
    )
  }

  if (status.isSyncing) {
    return (
      <Badge variant="outline" className="font-black animate-pulse border-yellow-500 text-yellow-600">
        🔄 SYNCING
      </Badge>
    )
  }
  
  if (status.isOnline) {
    return (
      <Badge variant="secondary" className="font-black bg-green-100 text-green-800 border-green-500">
        🟢 ONLINE
      </Badge>
    )
  }
  
  return (
    <Badge variant="destructive" className="font-black">
      🔴 OFFLINE
    </Badge>
  )
}

function getSyncStatusText(status) {
  if (!status) return '❓ UNKNOWN'
  if (status.isSyncing) return '🔄 SYNCING DATA...'
  if (status.isOnline) return '🟢 ONLINE & READY'
  return `🔴 OFFLINE (${status.phase || 'no-phase'})`
}