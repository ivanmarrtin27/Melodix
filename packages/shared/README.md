# @melodix/shared

Lógica portable (web + futuro Expo). Sin React, sin DOM, sin `import.meta.env`.

## Incluye

- `accentColors`, `playbackMode`, `mediaId`
- `formatters`, `shuffle`, `genres` (+ `detectGenre`)
- `trackMatch` (normalize texto), `searchRank` (ranking de búsqueda UI)
- `coverArt` (URLs / thumbs; fetch de portadas queda en web)
- `apiBase` (`resolveApiBase`, `apiUrl`)

## Uso

```js
import { formatDuration, pickProviderMediaId, getNextPlaybackMode } from '@melodix/shared'
```

El scoring YouTube de reproducción vive en `server/track_match.py`, no aquí.
