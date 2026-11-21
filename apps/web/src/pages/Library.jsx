import { useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { navigateWithReturn } from '../utils/navigationReturn'
import { Plus, Music, Disc3 } from 'lucide-react'
import { useLibraryStore } from '../stores/libraryStore'
import { formatDate } from '../utils/helpers'
import { useSwipeDelete } from '../hooks/useSwipeDelete'
import { useLongPress } from '../hooks/useLongPress'
import { CreatePlaylistModal } from '../components/library/CreatePlaylistModal'
import { RippleCard } from '../components/ui/RippleCard'
import { LikedPlaylistCover } from '../components/ui/LikedPlaylistCover'
import { isLikedPlaylistId, LIKED_PLAYLIST_ID } from '../utils/likedPlaylist'

function LikedPlaylistItem({ playlist, onOpen }) {
  return (
    <RippleCard
      onClick={onOpen}
      className="flex items-center gap-3 p-3 rounded-xl transition-transform duration-200"
      style={{ background: 'var(--bg-card)' }}
    >
      <LikedPlaylistCover className="w-14 h-14 rounded-xl shrink-0" size="sm" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{playlist.name}</p>
        <p className="text-xs opacity-60">
          {playlist.tracks.length} canción{playlist.tracks.length === 1 ? '' : 'es'} · Lista
          predeterminada
        </p>
      </div>
    </RippleCard>
  )
}

function PlaylistItem({ playlist, onOpen, onEdit, onDelete }) {
  const longPressTriggered = useRef(false)

  const longPress = useLongPress(() => {
    longPressTriggered.current = true
    onEdit(playlist)
  }, 550)

  const { offset, handlers } = useSwipeDelete(() => {
    if (confirm(`¿Eliminar "${playlist.name}"?`)) onDelete(playlist.id)
  })

  const handleClick = () => {
    if (longPressTriggered.current) {
      longPressTriggered.current = false
      return
    }
    onOpen()
  }

  return (
    <div className="relative overflow-hidden rounded-xl">
      <div
        className="absolute inset-y-0 right-0 flex items-center px-4 bg-red-500 text-white text-sm font-medium"
        style={{ width: Math.max(offset, 0) }}
      >
        Eliminar
      </div>
      <RippleCard
        {...handlers}
        {...longPress}
        onClick={handleClick}
        className="flex items-center gap-3 p-3 rounded-xl transition-transform duration-200"
        style={{
          background: 'var(--bg-card)',
          transform: `translateX(-${offset}px)`,
        }}
      >
        <img
          src={playlist.cover}
          alt=""
          className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{playlist.name}</p>
          <p className="text-xs opacity-60">
            {playlist.tracks.length} canciones · {formatDate(playlist.createdAt)}
          </p>
        </div>
      </RippleCard>
    </div>
  )
}

export default function Library() {
  const navigate = useNavigate()
  const location = useLocation()
  const playlists = useLibraryStore((s) => s.playlists)
  const favoriteAlbums = useLibraryStore((s) => s.favoriteAlbums)
  const createPlaylist = useLibraryStore((s) => s.createPlaylist)
  const updatePlaylist = useLibraryStore((s) => s.updatePlaylist)
  const deletePlaylist = useLibraryStore((s) => s.deletePlaylist)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPlaylist, setEditingPlaylist] = useState(null)

  const likedPlaylist = playlists.find((p) => isLikedPlaylistId(p.id))
  const userPlaylists = playlists.filter((p) => !isLikedPlaylistId(p.id))

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Tu biblioteca</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="w-10 h-10 flex items-center justify-center rounded-full text-black transition-transform duration-200 active:scale-90"
          style={{ background: 'var(--accent-color)' }}
        >
          <Plus size={22} />
        </button>
      </div>

      <div className="space-y-2">
        {likedPlaylist && (
          <LikedPlaylistItem
            playlist={likedPlaylist}
            onOpen={() => navigate(`/library/${LIKED_PLAYLIST_ID}`)}
          />
        )}

        {userPlaylists.length === 0 ? (
          <p className="text-sm opacity-45 text-center py-6 px-2">
            Crea playlists con + para organizar más música aparte de tus favoritos.
          </p>
        ) : (
          <>
            <p className="text-[11px] opacity-40 px-1 pb-1">
              Mantén pulsada una lista para editar nombre o portada
            </p>
            {userPlaylists.map((pl) => (
              <PlaylistItem
                key={pl.id}
                playlist={pl}
                onOpen={() => navigate(`/library/${pl.id}`)}
                onEdit={(p) => setEditingPlaylist(p)}
                onDelete={deletePlaylist}
              />
            ))}
          </>
        )}
      </div>

      {favoriteAlbums.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <Disc3 size={20} className="opacity-70" />
            Álbumes guardados
          </h2>
          <div className="space-y-2">
            {favoriteAlbums.map((album) => (
              <RippleCard
                key={album.id}
                onClick={() =>
                  navigateWithReturn(
                    navigate,
                    location,
                    `/album/${album.deezerId || album.id}`
                  )
                }
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: 'var(--bg-card)' }}
              >
                <img
                  src={album.cover}
                  alt=""
                  className="w-14 h-14 rounded-lg object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{album.title}</p>
                  <p className="text-xs opacity-60 truncate">
                    {album.artist} · {album.trackCount || 0} canciones
                  </p>
                </div>
              </RippleCard>
            ))}
          </div>
        </div>
      )}

      {userPlaylists.length === 0 && !likedPlaylist && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mb-4 opacity-30"
            style={{ background: 'var(--border-color)' }}
          >
            <Music size={36} />
          </div>
          <p className="text-sm opacity-60">Cargando tu biblioteca…</p>
        </div>
      )}

      <div className="mt-8 p-4 rounded-xl" style={{ background: 'var(--bg-card)' }}>
        <h3 className="text-sm font-semibold mb-2">Colaboración</h3>
        <p className="text-xs opacity-50">
          Abre una lista y usa invitar para compartir un código con amigos. Con Supabase
          la lista se sincroniza en la nube.
        </p>
      </div>

      <CreatePlaylistModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={createPlaylist}
      />

      <CreatePlaylistModal
        open={Boolean(editingPlaylist)}
        onClose={() => setEditingPlaylist(null)}
        playlistToEdit={editingPlaylist}
        onUpdate={(id, data) => updatePlaylist(id, data)}
      />
    </div>
  )
}
