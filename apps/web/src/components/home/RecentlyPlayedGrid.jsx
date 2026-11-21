import { Heart, Infinity, Radio } from 'lucide-react'
import { LIKED_PLAYLIST_ID } from '../../utils/likedPlaylist'
import { resolveDeezerAlbumId } from '../../utils/albumRoute'
import { AlbumCover } from '../ui/AlbumCover'
import { LikedPlaylistCover } from '../ui/LikedPlaylistCover'
import { RippleCard } from '../ui/RippleCard'

function ShortcutTile({ icon, label, onClick }) {
  return (
    <RippleCard onClick={onClick} className="home-shortcut">
      <div className="home-shortcut__icon">{icon}</div>
      <span className="home-shortcut__label">{label}</span>
    </RippleCard>
  )
}

function RecentTile({ cover, fallback, title, subtitle, onClick, liked }) {
  return (
    <RippleCard onClick={onClick} className="home-album-card">
      <div className="home-album-card__cover-wrap">
        {liked ? (
          <LikedPlaylistCover className="home-album-card__cover" size="md" />
        ) : (
          <AlbumCover src={cover} fallback={fallback} alt={title} className="home-album-card__cover" />
        )}
        <div className="home-album-card__shine" aria-hidden />
      </div>
      <p className="home-album-card__title line-clamp-2">{title}</p>
      <p className="home-album-card__artist truncate">{subtitle}</p>
    </RippleCard>
  )
}

export function RecentlyPlayedGrid({
  onPlayLiked,
  onPlayLoop,
  onPlayDayMix,
  onOpenAlbum,
  onOpenPlaylist,
  recentAlbums = [],
  recentPlaylists = [],
}) {

  const hasRecents = recentAlbums.length > 0 || recentPlaylists.length > 0

  return (
    <section className="home-section">
      <div className="home-section__head px-4 mb-3">
        <h2 className="home-section__title">Acceso rápido</h2>
        <p className="home-section__sub">Tus atajos favoritos</p>
      </div>

      <div className="home-shortcut-grid">
        <ShortcutTile
          icon={<Heart size={22} fill="currentColor" />}
          label="Me gusta"
          onClick={onPlayLiked}
        />
        <ShortcutTile
          icon={<Infinity size={24} strokeWidth={2.25} />}
          label="En bucle"
          onClick={onPlayLoop}
        />
        <ShortcutTile
          icon={<Radio size={22} />}
          label="Mix del día"
          onClick={onPlayDayMix}
        />
      </div>

      {hasRecents && (
        <>
          <div className="home-section__head px-4 mt-6 mb-3">
            <h3 className="home-section__title home-section__title--sm">Recientes</h3>
            <p className="home-section__sub">Lo último que abriste</p>
          </div>
          <div className="home-album-row scrollbar-hide">
            {recentPlaylists.slice(0, 4).map((playlist) => (
              <RecentTile
                key={`playlist-${playlist.id}`}
                liked={playlist.isLiked || playlist.id === LIKED_PLAYLIST_ID}
                cover={playlist.cover}
                title={playlist.name}
                subtitle="Lista"
                onClick={() => onOpenPlaylist?.(playlist)}
              />
            ))}
            {recentAlbums.slice(0, 6).map((album) => {
              const albumId = resolveDeezerAlbumId(album)
              return (
                <RecentTile
                  key={`album-${albumId || album.id}`}
                  cover={album.cover}
                  fallback=""
                  title={album.title}
                  subtitle={album.artist}
                  onClick={() => {
                    if (!albumId) return
                    onOpenAlbum?.({ ...album, deezerId: albumId, id: albumId })
                  }}
                />
              )
            })}
          </div>
        </>
      )}

      {!hasRecents && (
        <p className="px-4 text-sm text-white/35 mt-3">
          Explora álbumes y listas para verlos aquí.
        </p>
      )}
    </section>
  )
}
