import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { navigateWithReturn, restoreReturnScroll } from '../utils/navigationReturn'
import { albumDetailPath } from '../utils/albumRoute'
import { useLibraryStore } from '../stores/libraryStore'
import { usePlayerStore } from '../stores/playerStore'
import {
  fetchPanoramaHomeData,
  fetchAlbumDetail,
  invalidatePanoramaCache,
  getPanoramaAlbumsUpdatedAt,
  getPanoramaTopSource,
  getPanoramaTopWeekLabel,
} from '../services/deezerApi'
import { seededShuffle } from '../utils/helpers'
import { buildFeaturedSlides } from '../utils/featuredHero'
import { primePlaybackIntent } from '../utils/playIntent'
import { prefetchPlayback, prefetchPlaybackBatch, prepareAlbumPlayback } from '../services/musicApi'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import { LIKED_PLAYLIST_ID } from '../utils/likedPlaylist'
import { HomeHeader } from '../components/home/HomeHeader'
import { HomeHero } from '../components/home/HomeHero'
import { RecentlyPlayedGrid } from '../components/home/RecentlyPlayedGrid'
import { FeaturedReleases } from '../components/home/FeaturedReleases'
import { PopularArtists } from '../components/home/PopularArtists'
import { TopSongsList } from '../components/home/TopSongsList'
import { PersonalizedRecommendations } from '../components/home/PersonalizedRecommendations'
import { getPersonalizedHomeRecommendations, getPersonalizedNovedades } from '../services/recommendationsService'
import { useStatsStore } from '../stores/statsStore'

function buildPersonalTopTracks(favorites, recent) {
  const ids = new Set()
  const list = []
  for (const t of [...favorites, ...recent]) {
    if (!t?.id || ids.has(t.id)) continue
    ids.add(t.id)
    list.push(t)
    if (list.length >= 10) break
  }
  return list
}

export default function Home() {
  const navigate = useNavigate()
  const location = useLocation()
  const { recent, favorites, recentAlbums, recentPlaylists, followedArtists, addRecent } =
    useLibraryStore()
  const playTrack = usePlayerStore((s) => s.playTrack)
  const playQueue = usePlayerStore((s) => s.playQueue)

  const [panoramaAlbums, setPanoramaAlbums] = useState([])
  const [novedadesSubtitle, setNovedadesSubtitle] = useState(
    'Urbano, latino y lo más pegado ahora'
  )
  const [loadingNovedades, setLoadingNovedades] = useState(true)
  const [popularArtists, setPopularArtists] = useState([])
  const [topTracks, setTopTracks] = useState([])
  const [topTracksSource, setTopTracksSource] = useState('panorama')
  const [topWeekLabel, setTopWeekLabel] = useState('')
  const [dayMixPool, setDayMixPool] = useState([])
  const [loadingNew, setLoadingNew] = useState(true)
  const [recoTracks, setRecoTracks] = useState([])
  const [recoSubtitle, setRecoSubtitle] = useState('')
  const [recoSource, setRecoSource] = useState('listening')
  const [loadingReco, setLoadingReco] = useState(true)
  const [recoRefreshKey, setRecoRefreshKey] = useState(0)
  const forceRecoRef = useRef(false)
  const forceNovedadesRef = useRef(false)

  const statsArtists = useStatsStore((s) => s.artists)
  const statsGenres = useStatsStore((s) => s.genres)
  const statsTodayDate = useStatsStore((s) => s.todayDate)

  const loadHomeData = useCallback(async ({ refresh = false } = {}) => {
    if (refresh) invalidatePanoramaCache()
    const cacheWarm = Boolean(getPanoramaAlbumsUpdatedAt())
    if (!cacheWarm || refresh) setLoadingNew(true)
    try {
      const { artists, tracks: panoramaTracks } = await fetchPanoramaHomeData({
        albumLimit: 8,
        artistLimit: 16,
        trackLimit: 50,
        refresh,
      })
      setPopularArtists(artists)

      if (panoramaTracks.length > 0) {
        setTopTracks(panoramaTracks.slice(0, 50))
        setDayMixPool(panoramaTracks)
        setTopTracksSource(
          String(getPanoramaTopSource() || '').includes('spotify') ? 'spotify' : 'panorama'
        )
        setTopWeekLabel(getPanoramaTopWeekLabel())
      } else {
        setTopTracksSource('personal')
        setTopWeekLabel('')
      }
    } catch {
      setPopularArtists([])
      setTopTracksSource('personal')
    } finally {
      setLoadingNew(false)
    }
  }, [])

  useEffect(() => {
    loadHomeData()
  }, [loadHomeData])

  // Novedades: comercial primero; se afina con lo que escuchas
  useEffect(() => {
    let cancelled = false
    setLoadingNovedades(true)
    const force = forceNovedadesRef.current
    forceNovedadesRef.current = false
    void getPersonalizedNovedades({
      favorites,
      recent,
      followedArtists,
      force,
      limit: 24,
      stats: {
        artists: statsArtists,
        genres: statsGenres,
        todayDate: statsTodayDate,
      },
    })
      .then((result) => {
        if (cancelled) return
        setPanoramaAlbums(result.albums || [])
        setNovedadesSubtitle(result.subtitle || 'Urbano, latino y lo más pegado ahora')
      })
      .catch(() => {
        if (!cancelled) setPanoramaAlbums([])
      })
      .finally(() => {
        if (!cancelled) setLoadingNovedades(false)
      })
    return () => {
      cancelled = true
    }
  }, [
    favorites,
    recent,
    followedArtists,
    statsArtists,
    statsGenres,
    statsTodayDate,
    recoRefreshKey,
  ])

  useEffect(() => {
    if (topTracksSource !== 'personal') return
    const personal = buildPersonalTopTracks(favorites, recent)
    setTopTracks(personal)
    setDayMixPool(personal)
  }, [favorites, recent, topTracksSource])

  // Prefetch mediaId de las primeras pistas visibles (play casi instantáneo)
  useEffect(() => {
    if (!topTracks?.length) return
    prefetchPlaybackBatch(topTracks, 6)
  }, [topTracks])

  useEffect(() => {
    let cancelled = false
    setLoadingReco(true)
    const force = forceRecoRef.current
    forceRecoRef.current = false
    void getPersonalizedHomeRecommendations({
      favorites,
      recent,
      followedArtists,
      force,
      stats: {
        artists: statsArtists,
        genres: statsGenres,
        todayDate: statsTodayDate,
      },
    })
      .then((result) => {
        if (cancelled) return
        setRecoTracks(result.tracks || [])
        setRecoSubtitle(result.subtitle || '')
        setRecoSource(result.source || 'listening')
      })
      .catch(() => {
        if (!cancelled) setRecoTracks([])
      })
      .finally(() => {
        if (!cancelled) setLoadingReco(false)
      })
    return () => {
      cancelled = true
    }
  }, [favorites, recent, followedArtists, statsArtists, statsGenres, statsTodayDate, recoRefreshKey])

  useEffect(() => {
    if (!loadingNew) restoreReturnScroll()
  }, [loadingNew])

  const refreshHome = useCallback(async () => {
    forceRecoRef.current = true
    forceNovedadesRef.current = true
    setRecoRefreshKey((k) => k + 1)
    await loadHomeData({ refresh: true })
  }, [loadHomeData])
  const { containerRef, pullDistance, handlers } = usePullToRefresh(refreshHome)

  const play = useCallback(
    (track, queue) => {
      primePlaybackIntent()
      addRecent(track)
      if (queue?.length) playQueue(queue, queue.findIndex((t) => t.id === track.id))
      else playTrack(track)
    },
    [addRecent, playQueue, playTrack]
  )

  const primeTrack = useCallback((track) => {
    primePlaybackIntent()
    if (track) prefetchPlayback(track)
  }, [])

  const handlePlayLiked = () => {
    primePlaybackIntent()
    if (favorites.length) play(favorites[0], favorites)
    else navigate(`/library/${LIKED_PLAYLIST_ID}`)
  }

  const handlePlayLoop = () => {
    primePlaybackIntent()
    if (!recent.length) return
    play(recent[0], recent)
  }

  const handlePlayDayMix = () => {
    primePlaybackIntent()
    const pool =
      dayMixPool.length > 0 ? dayMixPool : topTracks.length ? topTracks : favorites
    if (!pool.length) return
    const dayKey = new Date().toISOString().slice(0, 10)
    const queue = seededShuffle(pool, dayKey)
    play(queue[0], queue)
  }

  const featuredSlides = useMemo(
    () =>
      buildFeaturedSlides({
        panoramaAlbums,
        recentAlbums,
        favorites,
        recent,
      }),
    [panoramaAlbums, recentAlbums, favorites, recent]
  )

  const handleOpenFeatured = useCallback(
    (album) => {
      const path = albumDetailPath(album)
      if (!path) return
      navigateWithReturn(navigate, location, path)
    },
    [navigate, location]
  )

  const handlePlayFeatured = useCallback(
    async (album) => {
      const albumId = album?.deezerId || album?.id
      if (!albumId) return
      primePlaybackIntent()
      try {
        const detail = await fetchAlbumDetail(albumId)
        const tracks = detail?.tracks || []
        if (!tracks.length) {
          handleOpenFeatured(album)
          return
        }
        addRecent(tracks[0])
        playQueue(tracks, 0)
        void prepareAlbumPlayback(detail, tracks[0].id).catch(() => {})
      } catch {
        handleOpenFeatured(album)
      }
    },
    [addRecent, playQueue, handleOpenFeatured]
  )

  const homeArtists = useMemo(() => {
    const followed = (followedArtists || []).map((artist) => {
      const deezerId = artist.deezerId || artist.id
      return {
        id: `followed-${artist.id}`,
        deezerId,
        name: artist.name,
        image: artist.image || '',
        isFollowed: true,
      }
    })
    const followedIds = new Set(followed.map((a) => String(a.deezerId)))
    const trending = popularArtists.filter(
      (a) => !followedIds.has(String(a.deezerId || a.id))
    )
    return [...followed, ...trending]
  }, [followedArtists, popularArtists])

  const followedArtistCount = followedArtists?.length ?? 0

  return (
    <div ref={containerRef} {...handlers} className="home-screen max-w-lg mx-auto min-h-full">
      {pullDistance > 0 && (
        <div
          className="home-pull-indicator"
          style={{ height: pullDistance }}
        >
          {pullDistance > 60 ? 'Suelta para actualizar' : 'Desliza hacia abajo'}
        </div>
      )}

      <div className="home-ambient" aria-hidden />
      <div className="home-ambient home-ambient--secondary" aria-hidden />

      <HomeHeader />

      <div className="home-body pb-4">
          <HomeHero
            slides={featuredSlides}
            loading={loadingNew && featuredSlides.length === 0}
            onPlayDayMix={handlePlayDayMix}
            onOpen={handleOpenFeatured}
            onPlay={handlePlayFeatured}
          />

          <RecentlyPlayedGrid
            recentAlbums={recentAlbums}
            recentPlaylists={recentPlaylists}
            onPlayLiked={handlePlayLiked}
            onPlayLoop={handlePlayLoop}
            onPlayDayMix={handlePlayDayMix}
            onOpenAlbum={(album) => {
              const path = albumDetailPath(album)
              if (!path) return
              navigateWithReturn(navigate, location, path)
            }}
            onOpenPlaylist={(playlist) =>
              navigateWithReturn(navigate, location, `/library/${playlist.id}`)
            }
          />

          <FeaturedReleases
            albums={panoramaAlbums}
            loading={loadingNovedades}
            subtitle={novedadesSubtitle}
            onAlbumClick={(album) => {
              const path = albumDetailPath(album)
              if (path) navigateWithReturn(navigate, location, path)
            }}
          />

          <PersonalizedRecommendations
            tracks={recoTracks}
            loading={loadingReco}
            subtitle={recoSubtitle}
            source={recoSource}
            onPrimeTrack={primeTrack}
            onPlayTrack={(track) => play(track, recoTracks)}
            onPlayAll={() => {
              if (!recoTracks.length) return
              play(recoTracks[0], recoTracks)
            }}
          />

          <PopularArtists
            artists={homeArtists}
            followedCount={followedArtistCount}
            onArtistClick={(artist) =>
              navigateWithReturn(
                navigate,
                location,
                `/artist/${artist.deezerId || artist.id}`
              )
            }
          />

          <TopSongsList
            tracks={topTracks}
            subtitle={
              topTracksSource === 'personal'
                ? 'Basado en lo que escuchas tú'
                : topWeekLabel
                  ? `Top 50 comercial · semana ${topWeekLabel}`
                  : 'Top 50 comercial · se actualiza cada semana'
            }
            onPrimeTrack={primeTrack}
            onPlayTrack={(track) => play(track, topTracks)}
          />
        </div>
    </div>
  )
}
