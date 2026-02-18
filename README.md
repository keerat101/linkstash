# 📚 Linkstash

A real-time bookmark manager built with **Next.js 14**, **Supabase**, and **Tailwind CSS**. Users can sign in with Google, save bookmarks privately, and see changes sync instantly across multiple tabs — no page refresh needed.

---

## 🔗 Live Demo

**Live URL**: [https://linkstash-xuo9.vercel.app](https://linkstash-xuo9.vercel.app)

**GitHub Repo**: [https://github.com/keerat101/linkstash.git](https://github.com/keerat101/linkstash.git
)

---

## ✅ Features

- 🔐 **Google OAuth only** — No email/password sign-up. Login is handled entirely by Supabase + Google OAuth
- 📌 **Add bookmarks** — Save any URL with a custom title
- 🔒 **Private bookmarks** — Each user's bookmarks are isolated using Row Level Security (RLS). User A cannot see User B's bookmarks
- ⚡ **Real-time sync** — Open the app in two tabs. Add a bookmark in one tab — it instantly appears in the other without any page refresh
- 🗑️ **Delete bookmarks** — Remove any bookmark with one click
- 🌙 **Dark / Light theme** — Toggle between dark and light mode with preference saved locally
- 📱 **Responsive design** — Works on mobile, tablet, and desktop

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 14** | Frontend framework (App Router, not Pages Router) |
| **Supabase Auth** | Google OAuth authentication + session management |
| **Supabase Database** | PostgreSQL with Row Level Security |
| **Supabase Realtime** | WebSocket-based live sync across tabs |
| **Tailwind CSS** | Utility-first styling |
| **Vercel** | Deployment and hosting |

---

## 🏗️ Project Structure

```
smart-bookmark-app/
├── app/
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts        # OAuth callback handler
│   ├── globals.css             # Global styles + design system
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Main page
├── components/
│   ├── Header.tsx              # Navigation + theme toggle + sign in/out
│   ├── AddBookmark.tsx         # Form to add new bookmarks
│   └── BookmarkList.tsx        # Real-time bookmark list
├── lib/
│   └── supabase.ts             # Supabase client
├── .env.local                  # Environment variables (not committed)
└── README.md
```

---

## 🗄️ Database Schema

```sql
-- bookmarks table
CREATE TABLE bookmarks (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users NOT NULL,
  title       TEXT NOT NULL,
  url         TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security Policies
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- Users can only view their own bookmarks
CREATE POLICY "Users can view their own bookmarks"
  ON bookmarks FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own bookmarks
CREATE POLICY "Users can create their own bookmarks"
  ON bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own bookmarks
CREATE POLICY "Users can delete their own bookmarks"
  ON bookmarks FOR DELETE
  USING (auth.uid() = user_id);

-- Enable real-time
ALTER PUBLICATION supabase_realtime ADD TABLE bookmarks;
```

---

## ⚙️ How Real-Time Works

Supabase Realtime uses WebSockets to push PostgreSQL changes to all connected clients instantly.

```javascript
// Subscribe to all changes on the bookmarks table
const channel = supabase
  .channel(`bookmarks-${userId}`)
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'bookmarks' },
    (payload) => {
      // New bookmark added — update UI instantly
      setBookmarks(prev => [payload.new, ...prev])
    }
  )
  .on('postgres_changes',
    { event: 'DELETE', schema: 'public', table: 'bookmarks' },
    (payload) => {
      // Bookmark deleted — remove from UI instantly
      setBookmarks(prev => prev.filter(b => b.id !== payload.old.id))
    }
  )
  .subscribe()
```

---

## 🚀 Local Setup

### 1. Clone the Repository
```bash
git clone https://github.com/keerat101/linkstash.git
cd smart-bookmark-app
npm install
```

### 2. Create Supabase Project
1. Go to [supabase.com](https://supabase.com) → New Project
2. Run the SQL from the Database Schema section above in the SQL Editor
3. Go to **Authentication → Providers → Google** and enable it

### 3. Set Up Google OAuth
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials
3. Add Supabase callback URL to Authorized Redirect URIs:
   ```
   https://[your-project].supabase.co/auth/v1/callback
   ```
4. Paste Client ID and Secret in Supabase Google Provider settings

### 4. Environment Variables
Create a `.env.local` file:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 5. Run Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

---

## 🔐 Security

- **Row Level Security (RLS)** is enforced at the database level — even if someone bypasses the frontend, they cannot access other users' data
- **Google OAuth** means no passwords are stored anywhere
- **Environment variables** keep API keys out of the codebase
- **Supabase JWT tokens** handle session authentication automatically

---

## 🐛 Problems Encountered & How I Solved Them

### Problem 1: `createClientComponentClient is not a function`
**Issue**: The app threw a runtime error after replacing the BookmarkList component.

**Cause**: The `lib/supabase.ts` file was using `createClientComponentClient` from `@supabase/auth-helpers-nextjs`, but the package version didn't export that function correctly.

**Solution**: Replaced the supabase client with a direct `createClient` from `@supabase/supabase-js` which is simpler and more reliable:
```javascript
import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

---

### Problem 2: Real-time Updates Not Working
**Issue**: Adding a bookmark in Tab 1 did not appear in Tab 2 without refreshing the page.

**Cause**: The Supabase Realtime publication was not properly configured for the bookmarks table.

**Solution**:
1. Ran this SQL to reset the publication:
```sql
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE bookmarks;
```
2. Rewrote the subscription to use separate event handlers for INSERT and DELETE instead of a single wildcard handler
3. Used a unique channel name per user to prevent conflicts

---

### Problem 3: Vercel Build Failed — Module Not Found
**Issue**: Vercel deployment failed with:
```
Type error: Module '@supabase/auth-helpers-nextjs' has no exported member 'createRouteHandlerClient'
```

**Cause**: The `app/auth/callback/route.ts` file was importing from `@supabase/auth-helpers-nextjs` which wasn't available.

**Solution**: Rewrote the callback route to use the base `@supabase/supabase-js` package directly:
```javascript
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(url, key)
await supabase.auth.exchangeCodeForSession(code)
```

---

### Problem 4: Google OAuth Redirect Mismatch
**Issue**: After clicking "Sign in with Google", got a `redirect_uri_mismatch` error.

**Cause**: The redirect URI in Google Cloud Console didn't match the Supabase callback URL exactly.

**Solution**: 
- Copied the exact callback URL from Supabase → Authentication → Providers → Google
- Pasted it verbatim into Google Cloud Console → Credentials → Authorized redirect URIs
- No manual typing — always copy-paste OAuth URLs

---

### Problem 5: Auth Not Working on Vercel After Deployment
**Issue**: Google login worked locally but failed on the deployed Vercel URL.

**Cause**: Supabase didn't know about the production URL, so it was blocking redirects.

**Solution**: Updated Supabase Authentication → URL Configuration:
- Set **Site URL** to the Vercel URL
- Added `https://linkstash-xuo9.vercel.app/**` to Redirect URLs

---

## 📱 Screenshots

### Dark Mode
- Clean dark interface with purple accent colors
- Real-time live indicator (green dot)
- Website favicons shown next to each bookmark

### Light Mode  
- Crisp white interface
- Sun icon toggle in header
- Same functionality, different aesthetic

---

## 🧪 Testing Checklist

- ✅ Google Sign In works on live URL
- ✅ Add bookmark with URL and title
- ✅ Bookmark appears instantly (no refresh)
- ✅ Open 2 tabs — add bookmark in Tab 1 — appears in Tab 2 automatically
- ✅ Delete bookmark works
- ✅ Sign out and sign back in — bookmarks persist
- ✅ User A cannot see User B's bookmarks
- ✅ Dark/Light theme toggle works
- ✅ Mobile responsive

---

## 🎨 Design Decisions

- **Dark-first design** with a clean light mode alternative
- **Syne font** for headings — geometric and distinctive
- **DM Sans** for body — readable and modern
- **Purple accent** (#7c6dfa) — distinctive but not overwhelming
- **Favicon display** — shows website icon next to each bookmark for quick recognition
- **Live indicator** — green pulsing dot shows real-time connection status
- **Hover-reveal delete** — keeps the UI clean, delete only shows when needed

---

## 📄 License

MIT — feel free to use this project as a reference or starting point.

---

*Built with ❤️ using Next.js, Supabase, and Tailwind CSS*
