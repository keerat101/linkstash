'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase, Bookmark } from '@/lib/supabase'

export default function BookmarkList({ userId }: { userId: string }) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [liveStatus, setLiveStatus] = useState('connecting')

  const fetchBookmarks = useCallback(async () => {
    const { data, error } = await supabase.from('bookmarks').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    if (!error && data) setBookmarks(data)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchBookmarks()
    const channel = supabase
      .channel(`bookmarks-${userId}-${Math.random()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookmarks' }, (payload) => {
        const b = payload.new as Bookmark
        if (b.user_id === userId) setBookmarks(prev => prev.find(x => x.id === b.id) ? prev : [b, ...prev])
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'bookmarks' }, (payload) => {
        setBookmarks(prev => prev.filter(b => b.id !== payload.old.id))
      })
      .subscribe(status => {
        setLiveStatus(status === 'SUBSCRIBED' ? 'live' : status === 'CHANNEL_ERROR' ? 'error' : 'connecting')
      })
    return () => { supabase.removeChannel(channel) }
  }, [userId, fetchBookmarks])

  const handleConfirmDelete = async () => {
    if (!confirmId) return
    setDeletingId(confirmId); setConfirmId(null)
    await supabase.from('bookmarks').delete().eq('id', confirmId).eq('user_id', userId)
    setDeletingId(null)
  }

  const formatDate = (d: string) => {
    const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    const dy = Math.floor(h / 24)
    if (dy < 7) return `${dy}d ago`
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getDomain = (url: string) => { try { return new URL(url).hostname.replace('www.', '') } catch { return url } }
  const getFavicon = (url: string) => { try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32` } catch { return null } }

  const confirmBookmark = bookmarks.find(b => b.id === confirmId)

  if (loading) return (
    <div className="list-card">
      <div className="list-header"><h2 className="list-title">Your Stash</h2></div>
      <div className="skeleton-list">
        {[1,2,3].map(i => (
          <div key={i} className="skeleton-item">
            <div className="skeleton-icon" />
            <div className="skeleton-text">
              <div className="skeleton-line long" /><div className="skeleton-line short" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <>
      {confirmId && confirmBookmark && (
        <div className="confirm-overlay" onClick={() => setConfirmId(null)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <div className="confirm-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </div>
            <h3 className="confirm-title">Remove this link?</h3>
            <p className="confirm-msg">Are you sure you want to remove <strong>"{confirmBookmark.title}"</strong> from your stash?<br/>This cannot be undone.</p>
            <div className="confirm-actions">
              <button onClick={() => setConfirmId(null)} className="confirm-cancel">Keep it</button>
              <button onClick={handleConfirmDelete} className="confirm-delete">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="list-card">
        <div className="list-header">
          <div className="list-header-left">
            <h2 className="list-title">Your Stash</h2>
            <span className="count-badge">{bookmarks.length}</span>
          </div>
          <div className={`live-badge live-${liveStatus}`}>
            <span className="live-dot" />
            {liveStatus === 'live' ? 'Live' : liveStatus === 'error' ? 'Error' : 'Connecting'}
          </div>
        </div>

        {bookmarks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
            </div>
            <p className="empty-title">Your stash is empty</p>
            <p className="empty-sub">Save your first link above to get started</p>
          </div>
        ) : (
          <ul className="bookmark-list">
            {bookmarks.map((bookmark, i) => (
              <li key={bookmark.id} className="bookmark-item" style={{ animationDelay: `${i * 40}ms` }}>
                <a href={bookmark.url} target="_blank" rel="noopener noreferrer" className="bookmark-link">
                  <div className="bookmark-favicon">
                    <img src={getFavicon(bookmark.url)!} alt="" width={16} height={16}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  </div>
                  <div className="bookmark-content">
                    <span className="bookmark-title">{bookmark.title}</span>
                    <div className="bookmark-meta">
                      <span className="bookmark-domain">{getDomain(bookmark.url)}</span>
                      <span className="meta-dot">·</span>
                      <span className="bookmark-time">{formatDate(bookmark.created_at)}</span>
                    </div>
                  </div>
                  <div className="bookmark-arrow">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>
                    </svg>
                  </div>
                </a>
                <button onClick={() => setConfirmId(bookmark.id)} disabled={deletingId === bookmark.id} className="delete-btn" aria-label="Remove">
                  {deletingId === bookmark.id
                    ? <svg className="spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                  }
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
