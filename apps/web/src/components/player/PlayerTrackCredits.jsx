import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { navigateWithReturn } from '../../utils/navigationReturn'
import { albumDetailPath } from '../../utils/albumRoute'
import { getTrackCredits } from '../../utils/formatArtist'
import { enrichTrackWithCredits, resolveArtistIdByName } from '../../services/deezerApi'
import { usePlayerStore } from '../../stores/playerStore'

/**
 * Título → álbum · artista principal + ft. → perfiles.
 * Colapsa el full player al navegar.
 */
export function PlayerTrackCredits({ track }) {
  const navigate = useNavigate()
  const location = useLocation()
  const requestCollapse = usePlayerStore((s) => s.requestCollapse)
  const [pending, setPending] = useState(null)
  const [enrichedTrack, setEnrichedTrack] = useState(track)

  useEffect(() => {
    let cancelled = false
    setEnrichedTrack(track)

    if (!track?.deezerId && !String(track?.id || '').match(/deezer-?\d+/)) {
      return () => {
        cancelled = true
      }
    }

    void enrichTrackWithCredits(track).then((next) => {
      if (cancelled || !next) return
      setEnrichedTrack(next)
      // Actualiza el store si sigue siendo la pista actual (para mini player también)
      const current = usePlayerStore.getState().currentTrack
      if (current?.id === next.id) {
        usePlayerStore.setState({
          currentTrack: {
            ...current,
            contributors: next.contributors,
            featuredArtists: next.featuredArtists,
            title: next.title || current.title,
            artist: next.artist || current.artist,
            artistDeezerId: next.artistDeezerId || current.artistDeezerId,
          },
        })
      }
    })

    return () => {
      cancelled = true
    }
  }, [track?.id, track?.deezerId, track?.title, track?.artist])

  const credits = useMemo(() => getTrackCredits(enrichedTrack || track), [enrichedTrack, track])

  const go = useCallback(
    (path) => {
      if (!path) return
      requestCollapse()
      navigateWithReturn(navigate, location, path)
    },
    [navigate, location, requestCollapse]
  )

  const openAlbum = useCallback(() => {
    const path = albumDetailPath(credits.albumId)
    if (path) go(path)
  }, [credits.albumId, go])

  const openArtist = useCallback(
    async (credit, key) => {
      if (!credit?.name) return
      let id = credit.deezerId ? String(credit.deezerId) : null
      if (!id) {
        setPending(key)
        try {
          id = await resolveArtistIdByName(credit.name)
        } finally {
          setPending(null)
        }
      }
      if (id) go(`/artist/${id}`)
    },
    [go]
  )

  const titleClickable = Boolean(credits.albumId)
  const featured = credits.featured || []

  return (
    <div className="player-credits flex-1 min-w-0 text-left">
      {titleClickable ? (
        <button
          type="button"
          onClick={openAlbum}
          className="player-credits__title player-credits__link"
          aria-label={`Ver álbum de ${credits.title}`}
        >
          {credits.title}
        </button>
      ) : (
        <h2 className="player-credits__title">{credits.title}</h2>
      )}

      <p className="player-credits__artists">
        <button
          type="button"
          onClick={() => openArtist(credits.main, 'main')}
          className={`player-credits__artist player-credits__link${
            pending === 'main' ? ' player-credits__link--busy' : ''
          }`}
          disabled={pending === 'main'}
        >
          {credits.main.name}
        </button>

        {featured.length > 0 ? (
          <>
            <span className="player-credits__ft" aria-hidden>
              {' '}
              ft.{' '}
            </span>
            {featured.map((feat, index) => (
              <span key={`${feat.name}-${index}`}>
                {index > 0 ? (
                  <span className="player-credits__sep" aria-hidden>
                    ,{' '}
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => openArtist(feat, `ft-${index}`)}
                  className={`player-credits__artist player-credits__link${
                    pending === `ft-${index}` ? ' player-credits__link--busy' : ''
                  }`}
                  disabled={pending === `ft-${index}`}
                >
                  {feat.name}
                </button>
              </span>
            ))}
          </>
        ) : null}
      </p>
    </div>
  )
}
