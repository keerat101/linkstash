'use client'

import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import AddBookmark from '@/components/AddBookmark'
import BookmarkList from '@/components/BookmarkList'

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'there'

  const getGreeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="live-badge live-connecting"><span className="live-dot" />Loading...</div>
    </div>
  )

  return (
    <>
      <Header />
      <main className="page-wrapper">
        {user ? (
          <>
            <div className="welcome-banner">
              <div className="welcome-left">
                <span className="welcome-wave">👋</span>
                <div>
                  <h1 className="welcome-title">
                    {getGreeting()}, <span className="welcome-name">{firstName}!</span>
                  </h1>
                  <p className="welcome-sub">Ready to grow your stash?</p>
                </div>
              </div>
            </div>
            <AddBookmark userId={user.id} />
            <BookmarkList userId={user.id} />
          </>
        ) : (
          <div className="hero">
            <div className="hero-badge">✦ Your personal web library</div>
            <h1 className="hero-title">
              Every great link,<br /><em>beautifully saved.</em>
            </h1>
            <p className="hero-sub">
              LinkStash is your private collection of the web's best content — synced instantly across every tab and device.
            </p>
            <div className="features-grid">
              <div className="feature-item">
                <div className="feature-emoji">⚡</div>
                <div className="feature-name">Instant Sync</div>
                <div className="feature-desc">Changes appear across all your open tabs in real time</div>
              </div>
              <div className="feature-item">
                <div className="feature-emoji">🔐</div>
                <div className="feature-name">Private</div>
                <div className="feature-desc">Your links are yours alone — enforced at the database level</div>
              </div>
              <div className="feature-item">
                <div className="feature-emoji">🌿</div>
                <div className="feature-name">Minimal</div>
                <div className="feature-desc">No noise, no clutter — just your links</div>
              </div>
            </div>
            <button onClick={handleSignIn} className="btn-signin" style={{ margin: '0 auto' }}>
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
            <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: 'var(--text3)', fontWeight: 300 }}>
              Free forever · No credit card required
            </p>
          </div>
        )}
      </main>
      <footer className="footer">LinkStash — Built with Next.js & Supabase</footer>
    </>
  )
}
