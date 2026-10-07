import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Search as SearchIcon } from 'lucide-react'
import { restoreReturnScroll, navigateWithReturn } from '../utils/navigationReturn'
import { fetchPlaylistTracks, searchDeezerAll } from '../services/deezerApi'
import { prefetchPlayback } from '../services/musicApi'
import { primePlaybackIntent } from '../utils/playIntent'
import { useLibraryStore } from '../stores/libraryStore'
import { usePlayerStore } from '../stores/playerStore'
import { useSearchStore } from '../stores/searchStore'
import { GenreGrid } from '../components/search/GenreGrid'
import { SearchResults } from '../components/search/SearchResults'
import { SearchHistory } from '../components/search/SearchHistory'
import { SkeletonList } from '../components/ui/Skeleton'
import { useT } from '../i18n'

const EMPTY_RESULTS = { artists: [], albums: [], tracks: [], playlists: [] }

export default function Search() {
  const t = useT()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialQ = searchParams.get('q') || ''
  const [query, setQuery] = useState(initialQ)
  // Solo cambia al pulsar Enter (o al cargar / historial)
  const [submittedQuery, setSubmittedQuery] = useState(initialQ.trim())
  const [active, setActive] = useState(false)
  const [results, setResults] = useState(EMPTY_RESULTS)
  const [loading, setLoading] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const lastSavedQuery = useRef('')
  const inputRef = useRef(null)
  const pageRef = useRef(null)

  const addQuery = useSearchStore((s) => s.addQuery)
  const addItem = useSearchStore((s) => s.addItem)
  const hasHistory = useSearchStore((s) => s.history.length > 0)

  const { addRecent, addAlbum } = useLibraryStore()
  const playTrack = usePlayerStore((s) => s.playTrack)
  const playQueue = usePlayerStore((s) => s.playQueue)

  const runSearch = useCallback((raw) => {
    const q = String(raw || '').trim()
    setSubmittedQuery(q)
    if (q) setSearchParams({ q }, { replace: true })
    else setSearchParams({}, { replace: true })
  }, [setSearchParams])

  useEffect(() => {
    if (!submittedQuery) {
      setResults(EMPTY_RESULTS)
      setSearchError(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    searchDeezerAll(submittedQuery)
      .then((data) => {
        if (!cancelled) {
          setResults(data)
          setSearchError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setResults(EMPTY_RESULTS)
          setSearchError(err.message || 'Error de búsqueda')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [submittedQuery])

  // Guarda en historial cuando hay resultados reales
  useEffect(() => {
    const q = submittedQuery.trim()
    if (loading || !q || q.length < 2 || searchError) return
    if (lastSavedQuery.current === q) return

    const total =
      results.artists.length +
      results.albums.length +
      results.tracks.length +
      (results.playlists?.length || 0)
    if (total <= 0) return

    addQuery(q, total)
    lastSavedQuery.current = q
  }, [loading, submittedQuery, searchError, results, addQuery])

  useEffect(() => {
    if (!loading) restoreReturnScroll()
  }, [loading, submittedQuery, results])

  // Modo búsqueda estable: no se cierra al pinchar historial/resultados
  useEffect(() => {
    if (!active) return

    const exitSearch = () => {
      setActive(false)
      inputRef.current?.blur()
    }

    const onKeyDown = (e) => {
      if (e.key === 'Escape') exitSearch()
    }

    const onPointerDown = (e) => {
      const target = e.target
      if (!(target instanceof Node)) return
      if (pageRef.current?.contains(target)) return
      exitSearch()
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown, true)
    }
  }, [active])

  const hasResults =
    results.artists.length > 0 ||
    results.albums.length > 0 ||
    results.tracks.length > 0 ||
    (results.playlists?.length || 0) > 0

  const rememberArtist = useCallback(
    (artist) => {
      addItem({
        type: 'artist',
        id: String(artist.deezerId || artist.id),
        deezerId: artist.deezerId,
        title: artist.name,
        subtitle: '',
        image: artist.image,
      })
    },
    [addItem]
  )

  const rememberAlbum = useCallback(
    (album) => {
      addItem({
        type: 'album',
        id: String(album.deezerId || album.id),
        deezerId: album.deezerId,
        title: album.title,
        subtitle: album.artist || '',
        image: album.cover,
      })
    },
    [addItem]
  )

  const rememberTrack = useCallback(
    (track) => {
      addItem({
        type: 'track',
        id: String(track.id),
        title: track.title,
        subtitle: track.artist || '',
        image: track.thumbnail || track.albumCover,
      })
    },
    [addItem]
  )

  const handlePlay = useCallback(
    (track, queue) => {
      rememberTrack(track)
      primePlaybackIntent()
      addRecent(track)
      addAlbum(track)
      if (queue?.length) {
        playQueue(queue, queue.findIndex((t) => t.id === track.id))
      } else {
        playTrack(track)
      }
    },
    [addRecent, addAlbum, playQueue, playTrack, rememberTrack]
  )

  const handleOpenPlaylist = useCallback(
    async (playlist) => {
      if (!playlist?.deezerId) return
      try {
        const tracks = await fetchPlaylistTracks(playlist.deezerId, 50)
        if (!tracks?.length) return
        addItem({
          type: 'playlist',
          id: String(playlist.deezerId || playlist.id),
          deezerId: playlist.deezerId,
          title: playlist.title,
          subtitle: playlist.owner || '',
          image: playlist.cover,
        })
        primePlaybackIntent()
        playQueue(tracks, 0)
      } catch (err) {
        console.warn('[playlist]', err?.message || err)
      }
    },
    [addItem, playQueue]
  )

  const handlePrimeTrack = useCallback((track) => {
    primePlaybackIntent()
    if (track) prefetchPlayback(track)
  }, [])

  const handleHistorySelect = useCallback(
    (item) => {
      if (!item) return
      setActive(true)

      if (item.type === 'artist' && item.deezerId) {
        navigateWithReturn(navigate, location, `/artist/${item.deezerId}`)
        return
      }
      if (item.type === 'album' && item.deezerId) {
        navigateWithReturn(navigate, location, `/album/${item.deezerId}`)
        return
      }

      const text = (item.type === 'track' ? item.title : item.query || item.title) || ''
      lastSavedQuery.current = ''
      setQuery(text)
      if (text.trim().length >= 2) {
        runSearch(text)
        setActive(false)
        inputRef.current?.blur()
      } else {
        inputRef.current?.focus()
      }
    },
    [navigate, location, runSearch]
  )

  const handleGenreSelect = useCallback(
    (genre) => {
      if (!genre?.id) return
      navigateWithReturn(navigate, location, `/genre/${genre.id}`)
    },
    [navigate, location]
  )

  const handleClearQuery = () => {
    lastSavedQuery.current = ''
    setQuery('')
    runSearch('')
    setActive(true)
    inputRef.current?.focus()
  }

  const handleSubmit = () => {
    const q = query.trim()
    if (q.length < 2) return
    runSearch(q)
    setActive(false)
    inputRef.current?.blur()
  }

  const keepInputFocus = (e) => {
    e.preventDefault()
  }

  // Historial solo al enfocar la barra en modo idle (sin búsqueda enviada)
  const showFocusHistory =
    hasHistory && active && !submittedQuery && !loading && !searchError

  // Géneros en reposo: sin búsqueda enviada y sin estar escribiendo en la barra
  const showGenres =
    !submittedQuery && !loading && !hasResults && !searchError && !active

  // Con resultados: un toque fuera de la barra cierra el foco (no el historial, que ya no se muestra)
  useEffect(() => {
    if (!active || !submittedQuery) return
    const onPointerDown = (e) => {
      const target = e.target
      if (!(target instanceof Node)) return
      if (inputRef.current?.contains(target)) return
      if (target.closest?.('.search-bar')) return
      setActive(false)
      inputRef.current?.blur()
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [active, submittedQuery])

  return (
    <div className={`max-w-lg mx-auto${submittedQuery ? ' search-page--results' : ''}`} ref={pageRef}>
      <div className="search-page-head">
        {!submittedQuery ? (
          <h1 className="search-page-head__title">{t('search.title')}</h1>
        ) : null}

        <div
          className={`search-shell${active ? ' search-shell--focused' : ''}${
            showFocusHistory ? ' search-shell--with-history' : ''
          }${submittedQuery ? ' search-shell--results' : ''}`}
        >
          <div className="search-bar">
            {submittedQuery ? (
              <button
                type="button"
                className="search-bar__back"
                aria-label={t('search.back')}
                onClick={handleClearQuery}
              >
                <ArrowLeft size={20} strokeWidth={2.25} />
              </button>
            ) : (
              <SearchIcon size={18} className="search-bar__icon" />
            )}
            <input
              ref={inputRef}
              type="search"
              value={query}
              onFocus={() => setActive(true)}
              onChange={(e) => {
                const value = e.target.value
                setQuery(value)
                setActive(true)
                // Solo limpia la búsqueda enviada si borras todo el texto
                if (!value.trim() && submittedQuery) {
                  lastSavedQuery.current = ''
                  runSearch('')
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault()
                  setActive(false)
                  inputRef.current?.blur()
                  return
                }
                if (e.key !== 'Enter') return
                e.preventDefault()
                handleSubmit()
              }}
              placeholder={t('search.placeholder')}
              className="search-bar__input"
              enterKeyHint="search"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          {showFocusHistory ? (
            <div className="search-shell__history" onMouseDown={keepInputFocus}>
              <SearchHistory
                filter={query.trim()}
                onSelect={handleHistorySelect}
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="px-4 pb-6">
        {loading && <SkeletonList count={6} />}

        {!loading && searchError && (
          <p className="text-center text-sm text-red-400 py-8 px-2">{searchError}</p>
        )}

        {!loading && !searchError && submittedQuery && !hasResults && (
          <p className="text-center text-sm opacity-40 py-8">
            {t('search.noResults', { q: submittedQuery })}
          </p>
        )}

        {!loading && !searchError && hasResults && (
          <SearchResults
            results={results}
            query={submittedQuery}
            onPlayTrack={handlePlay}
            onPrimeTrack={handlePrimeTrack}
            onOpenArtist={rememberArtist}
            onOpenAlbum={rememberAlbum}
            onOpenPlaylist={handleOpenPlaylist}
          />
        )}

        {showGenres && (
          <section className="search-genres-section">
            <div className="home-section__head mb-3">
              <h2 className="home-section__title home-section__title--sm">
                {t('search.genres')}
              </h2>
              <p className="home-section__sub">{t('search.genresSub')}</p>
            </div>
            <GenreGrid onSelect={handleGenreSelect} />
          </section>
        )}
      </div>
    </div>
  )
}
