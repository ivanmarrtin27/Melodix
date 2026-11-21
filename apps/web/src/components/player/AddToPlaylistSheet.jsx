import { useState } from 'react'
import { Plus, ListMusic, Heart } from 'lucide-react'
import { isLikedPlaylistId } from '../../utils/likedPlaylist'
import { Modal } from '../ui/Modal'
import { useLibraryStore } from '../../stores/libraryStore'
import { CreatePlaylistModal } from '../library/CreatePlaylistModal'
import { generateCoverFromName } from '../../utils/helpers'

export function AddToPlaylistSheet({ open, onClose, track }) {
  const { playlists, addToPlaylist, createPlaylist } = useLibraryStore()
  const [createOpen, setCreateOpen] = useState(false)
  const [addedTo, setAddedTo] = useState(null)

  const handleAdd = (playlistId, playlistName) => {
    if (!track) return
    addToPlaylist(playlistId, track)
    setAddedTo(playlistName)
    setTimeout(() => {
      setAddedTo(null)
      onClose()
    }, 600)
  }

  const handleCreate = ({ name, cover }) => {
    const playlist = createPlaylist({ name, cover: cover || generateCoverFromName(name) })
    if (track) addToPlaylist(playlist.id, track)
    setCreateOpen(false)
    onClose()
  }

  const handleClose = () => {
    setAddedTo(null)
    onClose()
  }

  if (!track) return null

  return (
    <>
      <Modal open={open} onClose={handleClose} title="Añadir a lista">
        {addedTo ? (
          <p className="text-center py-8 text-sm" style={{ color: 'var(--accent-color)' }}>
            Añadido a «{addedTo}»
          </p>
        ) : (
          <div className="space-y-3">
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
                <p className="text-xs opacity-50">Crear y añadir esta canción</p>
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
                      {isLikedPlaylistId(pl.id) ? (
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
                          style={{
                            background:
                              'linear-gradient(135deg, #450af5 0%, #6d28d9 50%, #c4b5fd 100%)',
                          }}
                        >
                          <Heart size={20} fill="white" className="text-white" />
                        </div>
                      ) : pl.cover ? (
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
