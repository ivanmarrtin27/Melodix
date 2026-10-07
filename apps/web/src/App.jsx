import { lazy, Suspense, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { AppSplash } from './components/layout/AppSplash'

const Home = lazy(() => import('./pages/Home'))
const Search = lazy(() => import('./pages/Search'))
const Library = lazy(() => import('./pages/Library'))
const PlaylistDetail = lazy(() => import('./pages/PlaylistDetail'))
const AlbumDetail = lazy(() => import('./pages/AlbumDetail'))
const ArtistDetail = lazy(() => import('./pages/ArtistDetail'))
const GenreDetail = lazy(() => import('./pages/GenreDetail'))
const User = lazy(() => import('./pages/User'))
const Settings = lazy(() => import('./pages/Settings'))

function PageFallback() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div
        className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: 'var(--accent-color)', borderTopColor: 'transparent' }}
      />
    </div>
  )
}

export default function App() {
  const [splashDone, setSplashDone] = useState(false)

  return (
    <>
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<Navigate to="/home" replace />} />
              <Route path="home" element={<Home />} />
              <Route path="search" element={<Search />} />
              <Route path="library" element={<Library />} />
              <Route path="library/:id" element={<PlaylistDetail />} />
              <Route path="album/:id" element={<AlbumDetail />} />
              <Route path="artist/:id" element={<ArtistDetail />} />
              <Route path="genre/:id" element={<GenreDetail />} />
              <Route path="user" element={<User />} />
              <Route path="settings" element={<Settings />} />
              <Route path="stats" element={<Navigate to="/user" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>

      {!splashDone && <AppSplash onComplete={() => setSplashDone(true)} />}
    </>
  )
}
