import { useState } from 'react'
import { Plus, ListMusic } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { useLibraryStore } from '../../stores/libraryStore'
import { CreatePlaylistModal } from './CreatePlaylistModal'
import { generateCoverFromName } from '../../utils/helpers'

export function AddAlbumToPlaylistSheet({ open, onClose, album }) {
  const { playlists, addTracksToPlaylist, createPlaylist } = useLibraryStore()
  const [createOpen, setCreateOpen] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const tracks = album?.tracks || []

  const handleAdd = (playlistId, playlistName) => {
    if (!tracks.length) return
    const added = addTracksToPlaylist(playlistId, tracks, album)
    if (added === 0) {
      setFeedback(`Ya estaba en «${playlistName}»`)
    } else {
      setFeedback(
        added === 1
          ? `1 canción añadida a «${playlistName}»`
          : `${added} canciones añadidas a «${playlistName}»`
      )
    }
    setTimeout(() => {
      setFeedback(null)
      onClose()
    }, 900)
  }

  const handleCreate = ({ name, cover }) => {
    const playlist = createPlaylist({ name, cover: cover || generateCoverFromName(name) })
    const added = addTracksToPlaylist(playlist.id, tracks, album)
    setCreateOpen(false)
    setFeedback(
      added > 0
        ? `Álbum añadido a «${name}» (${added} canciones)`
        : `Lista «${name}» creada`
    )
    setTimeout(() => {
      setFeedback(null)
      onClose()
    }, 900)
  }

  const handleClose = () => {
    setFeedback(null)
    onClose()
  }

  if (!album) return null

  return (
    <>
      <Modal open={open} onClose={handleClose} title="Guardar álbum en lista">
        {feedback ? (
          <p className="text-center py-8 text-sm" style={{ color: 'var(--accent-color)' }}>
            {feedback}
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-xs opacity-50 text-center pb-1">
              {tracks.length} canciones de «{album.title}»
            </p>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-3 w-full p-4 rounded-xl border border-dashed transition-colors hover:bg-white/5"
              style={{ borderColor: 'var(--accent-color)' }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'var(--accent-color)' }}
              >
                <Plus size={22} className="text-black" />
              </div>
              <div className="text-left">
                <p className="font-semibold">Nueva lista</p>
                <p className="text-xs opacity-50">Crear y añadir todo el álbum</p>
              </div>
            </button>

            {playlists.length > 0 && (
              <>
                <p className="text-xs opacity-45 font-medium uppercase tracking-wider pt-2">
                  Tus listas
                </p>
                <div className="space-y-1 max-h-[40vh] overflow-y-auto">
                  {playlists.map((pl) => (
                    <button
                      key={pl.id}
                      type="button"
                      onClick={() => handleAdd(pl.id, pl.name)}
                      className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-white/8 transition-colors text-left"
                    >
                      {pl.cover ? (
                        <img src={pl.cover} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0 opacity-40"
                          style={{ background: 'var(--border-color)' }}
                        >
                          <ListMusic size={20} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{pl.name}</p>
                        <p className="text-xs opacity-50">{pl.tracks.length} canciones</p>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {playlists.length === 0 && (
              <p className="text-sm opacity-45 text-center py-4">
                Aún no tienes listas. Crea la primera arriba.
              </p>
            )}
          </div>
        )}
      </Modal>

      <CreatePlaylistModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />
    </>
  )
}
