import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Play, Shuffle, GripVertical, Check } from 'lucide-react'
import { LikedPlaylistCover } from '../components/ui/LikedPlaylistCover'
import { useLibraryStore } from '../stores/libraryStore'
import { isLikedPlaylistId } from '../utils/likedPlaylist'
import { usePlayerStore } from '../stores/playerStore'
import { useLongPress } from '../hooks/useLongPress'
import { formatTrackArtists } from '../utils/formatArtist'
import { formatDuration, shuffleArray } from '../utils/helpers'
import { ContextMenu } from '../components/library/ContextMenu'
import { Modal } from '../components/ui/Modal'
import { RippleCard } from '../components/ui/RippleCard'
import { PlaylistActionsBar } from '../components/library/PlaylistActionsBar'
import { SortPlaylistSheet } from '../components/library/SortPlaylistSheet'
import { AddTracksToPlaylistSheet } from '../components/library/AddTracksToPlaylistSheet'
import { ImportPlaylistSheet } from '../components/library/ImportPlaylistSheet'
import { CreatePlaylistModal } from '../components/library/CreatePlaylistModal'

export default function PlaylistDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const playlist = useLibraryStore((s) => s.getPlaylist(id))
  const {
    removeFromPlaylist,
    toggleFavorite,
    isFavorite,
    playlists,
    addToPlaylist,
    addTracksToPlaylist,
    addRecentPlaylist,
    reorderPlaylistTracks,
    sortPlaylistTracks,
    updatePlaylist,
  } = useLibraryStore()
  const playQueue = usePlayerStore((s) => s.playQueue)

  const [menu, setMenu] = useState({ open: false, track: null, x: 0, y: 0 })
  const [showPlaylists, setShowPlaylists] = useState(false)
  const [selectedTrack, setSelectedTrack] = useState(null)
  const [sortOpen, setSortOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [reorderMode, setReorderMode] = useState(false)
  const [dragIndex, setDragIndex] = useState(null)

  const isLiked = isLikedPlaylistId(id)

  useEffect(() => {
    if (playlist) addRecentPlaylist(playlist)
  }, [playlist?.id, playlist?.name, playlist?.tracks?.length, addRecentPlaylist])

  const handleAction = (actionId) => {
    if (actionId === 'edit') setEditOpen(true)
    else if (actionId === 'sort') setSortOpen(true)
    else if (actionId === 'add') setAddOpen(true)
    else if (actionId === 'import') setImportOpen(true)
  }

  const handleSortSelect = (sortBy) => {
    if (sortBy === 'manual') {
      setReorderMode(true)
      return
    }
    sortPlaylistTracks(id, sortBy)
    setReorderMode(false)
  }

  const handleAddTrack = (track) => {
    addToPlaylist(id, track)
  }

  const handleImport = (tracks) => {
    addTracksToPlaylist(id, tracks)
  }

  if (!playlist) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-6 text-center">
        <p className="opacity-60">Lista no encontrada</p>
        <button
          onClick={() => navigate('/library')}
          className="mt-4 text-sm underline opacity-60"
        >
          Volver
        </button>
      </div>
    )
  }

  const handlePlayAll = () => {
    if (playlist.tracks.length) playQueue(playlist.tracks, 0)
  }

  const handleShuffle = () => {
    if (playlist.tracks.length) {
      const shuffled = shuffleArray(playlist.tracks)
      playQueue(shuffled, 0)
    }
  }

  const openMenu = (track, e) => {
    if (reorderMode) return
    const touch = e.touches?.[0] || e
    setMenu({
      open: true,
      track,
      x: touch.clientX || window.innerWidth / 2,
      y: touch.clientY || window.innerHeight / 2,
    })
  }

  const onDragStart = (index) => setDragIndex(index)

  const onDragOver = (e, index) => {
    e.preventDefault()
    if (dragIndex == null || dragIndex === index) return
    reorderPlaylistTracks(id, dragIndex, index)
    setDragIndex(index)
  }

  const onDragEnd = () => setDragIndex(null)

  return (
    <div className="max-w-lg mx-auto pb-6">
      <div className="relative">
        {isLiked ? (
          <LikedPlaylistCover className="w-full aspect-square max-h-72" size="xl" />
        ) : (
          <img
            src={playlist.cover}
            alt=""
            className="w-full aspect-square object-cover max-h-72"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-transparent to-transparent" />
        <button
          onClick={() => navigate('/library')}
          className="absolute top-4 left-4 p-2 rounded-full bg-black/40 backdrop-blur-sm"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      <div className="px-4 -mt-8 relative">
        <h1 className="text-2xl font-bold mb-1">{playlist.name}</h1>
        <p className="text-sm opacity-60 mb-4">
          {playlist.tracks.length} canciones
          {isLiked ? ' · Lista predeterminada' : ''}
        </p>

        <div className="flex gap-3 mb-4">
          <button
            onClick={handlePlayAll}
            disabled={!playlist.tracks.length}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-black transition-transform duration-200 active:scale-95 disabled:opacity-40"
            style={{ background: 'var(--accent-color)' }}
          >
            <Play size={18} fill="black" />
            Reproducir todo
          </button>
          <button
            onClick={handleShuffle}
            disabled={!playlist.tracks.length}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full font-medium border transition-colors duration-200 disabled:opacity-40"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <Shuffle size={18} />
            Mezclar
          </button>
        </div>

        <div className="mb-5">
          <PlaylistActionsBar onAction={handleAction} showEdit={!isLiked} />
        </div>

        {reorderMode && (
          <div className="flex items-center justify-between gap-3 mb-4 p-3 rounded-xl border"
            style={{ borderColor: 'var(--accent-color)' }}
          >
            <p className="text-sm flex-1">
              Arrastra las canciones para cambiar el orden.
            </p>
            <button
              type="button"
              onClick={() => setReorderMode(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-black shrink-0"
              style={{ background: 'var(--accent-color)' }}
            >
              <Check size={14} />
              Listo
            </button>
          </div>
        )}

        {playlist.tracks.length === 0 ? (
          <p className="text-sm opacity-40 text-center py-8">
            {isLiked
              ? 'Aún no tienes canciones favoritas. Pulsa ❤️ o usa Añadir.'
              : 'Lista vacía. Usa Añadir, Importar o el buscador.'}
          </p>
        ) : (
          <div className="space-y-1">
            {playlist.tracks.map((track, i) => (
              <TrackRow
                key={`${track.id}-${i}`}
                track={track}
                index={i}
                reorderMode={reorderMode}
                isDragging={dragIndex === i}
                onPlay={() => !reorderMode && playQueue(playlist.tracks, i)}
                onLongPress={(e) => openMenu(track, e)}
                onDragStart={() => onDragStart(i)}
                onDragOver={(e) => onDragOver(e, i)}
                onDragEnd={onDragEnd}
              />
            ))}
          </div>
        )}
      </div>

      <ContextMenu
        open={menu.open}
        position={{ x: menu.x, y: menu.y }}
        onClose={() => setMenu({ ...menu, open: false })}
        isFavorite={menu.track ? isFavorite(menu.track.id) : false}
        onFavorite={() => menu.track && toggleFavorite(menu.track)}
        onDelete={() => menu.track && removeFromPlaylist(id, menu.track.id)}
        onAddToList={() => {
          setSelectedTrack(menu.track)
          setShowPlaylists(true)
        }}
      />

      <Modal
        open={showPlaylists}
        onClose={() => setShowPlaylists(false)}
        title="Añadir a lista"
      >
        <div className="space-y-2">
          {playlists
            .filter((p) => p.id !== id && !isLikedPlaylistId(p.id))
            .map((pl) => (
              <button
                key={pl.id}
                onClick={() => {
                  addToPlaylist(pl.id, selectedTrack)
                  setShowPlaylists(false)
                }}
                className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-white/5"
              >
                <img src={pl.cover} alt="" className="w-10 h-10 rounded-lg object-cover" />
                <span className="font-medium">{pl.name}</span>
              </button>
            ))}
        </div>
      </Modal>

      <SortPlaylistSheet
        open={sortOpen}
        onClose={() => setSortOpen(false)}
        onSelect={handleSortSelect}
      />

      <AddTracksToPlaylistSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        playlistName={playlist.name}
        onAddTrack={handleAddTrack}
        existingTrackIds={(playlist.tracks || []).map((t) => t.id)}
      />

      <ImportPlaylistSheet
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={handleImport}
      />

      <CreatePlaylistModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        playlistToEdit={playlist}
        onUpdate={(playlistId, data) => updatePlaylist(playlistId, data)}
      />
    </div>
  )
}

function TrackRow({
  track,
  index,
  reorderMode,
  isDragging,
  onPlay,
  onLongPress,
  onDragStart,
  onDragOver,
  onDragEnd,
}) {
  const longPress = useLongPress(onLongPress, 500)

  return (
    <RippleCard
      draggable={reorderMode}
      onDragStart={reorderMode ? onDragStart : undefined}
      onDragOver={reorderMode ? onDragOver : undefined}
      onDragEnd={reorderMode ? onDragEnd : undefined}
      onClick={onPlay}
      {...(reorderMode ? {} : longPress)}
      className={`flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 ${
        isDragging ? 'opacity-60 ring-1 ring-white/20' : ''
      }`}
    >
      {reorderMode ? (
        <span className="text-white/35 w-5 flex justify-center cursor-grab active:cursor-grabbing">
          <GripVertical size={18} />
        </span>
      ) : (
        <span className="text-sm opacity-40 w-5 text-center">{index + 1}</span>
      )}
      <img
        src={track.thumbnail}
        alt=""
        className="w-11 h-11 rounded-lg object-cover pointer-events-none"
      />
      <div className="flex-1 min-w-0 pointer-events-none">
        <p className="text-sm font-medium truncate">{track.title}</p>
        <p className="text-xs opacity-60 truncate">{formatTrackArtists(track)}</p>
      </div>
      <span className="text-xs opacity-40 tabular-nums pointer-events-none">
        {formatDuration(track.duration)}
      </span>
    </RippleCard>
  )
}
