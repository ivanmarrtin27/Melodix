"""Top 50 España comercial — se regenera 1 vez por semana ISO."""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import time
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import httpx

logger = logging.getLogger("melodix.charts")

# Spotify Top 50 — Spain
SPOTIFY_TOP50_ES_PLAYLIST = "37i9dQZEVXbNFJfN1Vw8d9"
APPLE_TOP_ES_URLS = (
    "https://rss.applemarketingtools.com/api/v2/es/music/most-played/50/songs.json",
    "https://rss.marketingtools.apple.com/api/v2/es/music/most-played/50/songs.json",
)
# Deezer Charts — Top Spain (comercial por país)
DEEZER_TOP_SPAIN_PLAYLIST_ID = 1116190041

DATA_DIR = Path(__file__).resolve().parent / "data"
CACHE_FILE = DATA_DIR / "top50_es_weekly.json"

JUNK_TITLE = re.compile(
    r"karaoke|tribute|instrumental covers|made famous|piano versions|"
    r"sleep|white noise|rain sounds|lofi study|meditation|yoga|"
    r"workout mix|megamix|best of classical",
    re.I,
)
JUNK_ARTIST = re.compile(
    r"karen souza|yiruma|deathpath|triangle des bermudes|dj aky|"
    r"various artists|varios artistas",
    re.I,
)

_token: str | None = None
_token_expires = 0.0
_mem: dict[str, Any] | None = None


def week_key(d: date | None = None) -> str:
    day = d or date.today()
    iso = day.isocalendar()
    return f"{iso.year}-W{iso.week:02d}"


def week_range_label(d: date | None = None) -> str:
    day = d or date.today()
    iso = day.isocalendar()
    monday = date.fromisocalendar(iso.year, iso.week, 1)
    sunday = monday + timedelta(days=6)
    months = (
        "ene",
        "feb",
        "mar",
        "abr",
        "may",
        "jun",
        "jul",
        "ago",
        "sep",
        "oct",
        "nov",
        "dic",
    )
    if monday.month == sunday.month:
        return f"{monday.day}–{sunday.day} {months[monday.month - 1]}"
    return f"{monday.day} {months[monday.month - 1]} – {sunday.day} {months[sunday.month - 1]}"


def spotify_configured() -> bool:
    return bool(
        os.getenv("SPOTIFY_CLIENT_ID", "").strip()
        and os.getenv("SPOTIFY_CLIENT_SECRET", "").strip()
    )


def _is_commercial_entry(title: str, artist: str) -> bool:
    if not title or not artist:
        return False
    if JUNK_TITLE.search(title) or JUNK_ARTIST.search(artist):
        return False
    return True


def _clean_title(title: str) -> str:
    text = str(title or "")
    text = re.sub(
        r"\s*[\(\[]\s*(?:feat\.?|ft\.?|featuring|with|con)\s+[^\)\]]+[\)\]]",
        "",
        text,
        flags=re.I,
    )
    return re.sub(r"\s+", " ", text).strip()


def _load_disk() -> dict[str, Any] | None:
    try:
        if not CACHE_FILE.exists():
            return None
        data = json.loads(CACHE_FILE.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            return None
        if data.get("week") != week_key():
            return None
        tracks = data.get("tracks") or []
        if len(tracks) < 15:
            return None
        return data
    except Exception as exc:
        logger.warning("No se pudo leer cache semanal: %s", exc)
        return None


def _save_disk(payload: dict[str, Any]) -> None:
    try:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        CACHE_FILE.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    except Exception as exc:
        logger.warning("No se pudo guardar cache semanal: %s", exc)


async def _spotify_token(client: httpx.AsyncClient) -> str | None:
    global _token, _token_expires
    if _token and time.time() < _token_expires - 30:
        return _token

    cid = os.getenv("SPOTIFY_CLIENT_ID", "").strip()
    secret = os.getenv("SPOTIFY_CLIENT_SECRET", "").strip()
    if not cid or not secret:
        return None

    res = await client.post(
        "https://accounts.spotify.com/api/token",
        data={"grant_type": "client_credentials"},
        auth=(cid, secret),
        timeout=15.0,
    )
    if res.status_code != 200:
        logger.warning("Spotify token falló: %s", res.status_code)
        return None
    data = res.json()
    _token = data.get("access_token")
    _token_expires = time.time() + float(data.get("expires_in") or 3600)
    return _token


async def _fetch_spotify_entries(client: httpx.AsyncClient) -> list[dict[str, str]]:
    token = await _spotify_token(client)
    if not token:
        return []

    entries: list[dict[str, str]] = []
    url = f"https://api.spotify.com/v1/playlists/{SPOTIFY_TOP50_ES_PLAYLIST}/tracks"
    params: dict[str, Any] | None = {
        "limit": 50,
        "market": "ES",
        "fields": "items(track(name,artists(name),album(name,images))),next",
    }

    while url and len(entries) < 50:
        res = await client.get(
            url,
            headers={"Authorization": f"Bearer {token}"},
            params=params,
            timeout=20.0,
        )
        params = None
        if res.status_code != 200:
            logger.warning("Spotify playlist falló: %s", res.status_code)
            return []
        payload = res.json()
        for row in payload.get("items") or []:
            track = row.get("track") or {}
            name = track.get("name")
            artists = track.get("artists") or []
            artist = artists[0].get("name") if artists else ""
            if not _is_commercial_entry(name or "", artist):
                continue
            album = (track.get("album") or {}).get("name") or ""
            images = (track.get("album") or {}).get("images") or []
            image = images[0].get("url") if images else ""
            entries.append(
                {"title": name, "artist": artist, "album": album, "image": image}
            )
            if len(entries) >= 50:
                break
        url = payload.get("next")

    return entries[:50]


async def _fetch_apple_entries(client: httpx.AsyncClient) -> list[dict[str, str]]:
    payload = None
    for url in APPLE_TOP_ES_URLS:
        try:
            res = await client.get(url, timeout=25.0, follow_redirects=True)
            if res.status_code == 200:
                payload = res.json()
                break
            logger.warning("Apple Music chart %s → %s", url, res.status_code)
        except Exception as exc:
            logger.warning("Apple Music chart error (%s): %s", url, exc)
    if not payload:
        return []

    results = ((payload or {}).get("feed") or {}).get("results") or []
    entries: list[dict[str, str]] = []
    for row in results[:50]:
        title = row.get("name") or ""
        artist = row.get("artistName") or ""
        main = re.split(r"\s+&\s+|\s+,\s+", artist, maxsplit=1)[0].strip()
        if not _is_commercial_entry(title, main or artist):
            continue
        entries.append(
            {
                "title": title,
                "artist": main or artist,
                "album": "",
                "image": row.get("artworkUrl100") or "",
            }
        )
    return entries


async def _fetch_deezer_spain_entries(client: httpx.AsyncClient) -> list[dict[str, str]]:
    """Fallback comercial: playlist Top Spain de Deezer Charts."""
    entries: list[dict[str, str]] = []
    index = 0
    while len(entries) < 50 and index < 100:
        res = await client.get(
            f"https://api.deezer.com/playlist/{DEEZER_TOP_SPAIN_PLAYLIST_ID}/tracks",
            params={"limit": 50, "index": index},
            timeout=20.0,
        )
        if res.status_code == 429:
            await asyncio.sleep(1.2)
            continue
        if res.status_code != 200:
            break
        payload = res.json() or {}
        batch = payload.get("data") or []
        if not batch:
            break
        for raw in batch:
            title = raw.get("title") or ""
            artist = (raw.get("artist") or {}).get("name") or ""
            if not _is_commercial_entry(title, artist):
                continue
            album = raw.get("album") or {}
            cover = (
                album.get("cover_xl")
                or album.get("cover_big")
                or album.get("cover_medium")
                or ""
            )
            entries.append(
                {
                    "title": title,
                    "artist": artist,
                    "album": album.get("title") or "",
                    "image": cover,
                    "deezerId": raw.get("id"),
                    "duration": raw.get("duration") or 0,
                    "albumDeezerId": album.get("id"),
                    "artistDeezerId": (raw.get("artist") or {}).get("id"),
                    "preview": raw.get("preview"),
                    "rank": raw.get("rank") or 0,
                }
            )
            if len(entries) >= 50:
                break
        if not payload.get("next") or len(batch) < 50:
            break
        index += len(batch)
        await asyncio.sleep(0.15)
    return entries[:50]


def _track_from_deezer_raw(raw: dict[str, Any], fallback: dict[str, str] | None = None) -> dict[str, Any]:
    album = raw.get("album") or {}
    artist_obj = raw.get("artist") or {}
    cover = (
        album.get("cover_xl")
        or album.get("cover_big")
        or album.get("cover_medium")
        or (fallback or {}).get("image")
        or ""
    )
    return {
        "id": f"deezer-{raw.get('id')}",
        "deezerId": raw.get("id"),
        "albumDeezerId": album.get("id") or (fallback or {}).get("albumDeezerId"),
        "album": album.get("title") or (fallback or {}).get("album") or "",
        "source": "deezer",
        "title": raw.get("title") or (fallback or {}).get("title") or "",
        "artist": artist_obj.get("name") or (fallback or {}).get("artist") or "",
        "artistDeezerId": artist_obj.get("id") or (fallback or {}).get("artistDeezerId"),
        "duration": raw.get("duration") or (fallback or {}).get("duration") or 0,
        "thumbnail": cover,
        "albumCover": cover,
        "preview": raw.get("preview") or (fallback or {}).get("preview"),
        "rank": raw.get("rank") or (fallback or {}).get("rank") or 0,
    }


async def _deezer_match(
    client: httpx.AsyncClient, title: str, artist: str
) -> dict[str, Any] | None:
    queries = [
        f'track:"{_clean_title(title)}" artist:"{artist}"',
        f"{_clean_title(title)} {artist}",
        f"{title} {artist}",
    ]
    for q in queries:
        for attempt in range(3):
            try:
                res = await client.get(
                    "https://api.deezer.com/search/track",
                    params={"q": q, "limit": 8},
                    timeout=12.0,
                )
                if res.status_code == 429:
                    await asyncio.sleep(0.7 * (attempt + 1))
                    continue
                if res.status_code != 200:
                    break
                rows = (res.json() or {}).get("data") or []
                if not rows:
                    break
                # Prefiere match comercial (rank alto + artista similar)
                artist_l = artist.lower()
                scored = sorted(
                    rows,
                    key=lambda r: (
                        1
                        if artist_l
                        and artist_l
                        in str((r.get("artist") or {}).get("name") or "").lower()
                        else 0,
                        int(r.get("rank") or 0),
                    ),
                    reverse=True,
                )
                for raw in scored:
                    t = raw.get("title") or ""
                    a = (raw.get("artist") or {}).get("name") or ""
                    if not _is_commercial_entry(t, a):
                        continue
                    return _track_from_deezer_raw(raw)
                break
            except Exception:
                await asyncio.sleep(0.25)
                continue
    return None


async def _resolve_entries(
    client: httpx.AsyncClient, entries: list[dict[str, str]], limit: int
) -> list[dict[str, Any]]:
    tracks: list[dict[str, Any]] = []
    seen: set[str] = set()
    sem = asyncio.Semaphore(3)

    async def one(entry: dict[str, str]) -> dict[str, Any] | None:
        # Ya viene resuelto desde Deezer playlist
        if entry.get("deezerId"):
            return {
                "id": f"deezer-{entry['deezerId']}",
                "deezerId": entry["deezerId"],
                "albumDeezerId": entry.get("albumDeezerId"),
                "album": entry.get("album") or "",
                "source": "deezer",
                "title": entry.get("title") or "",
                "artist": entry.get("artist") or "",
                "artistDeezerId": entry.get("artistDeezerId"),
                "duration": entry.get("duration") or 0,
                "thumbnail": entry.get("image") or "",
                "albumCover": entry.get("image") or "",
                "preview": entry.get("preview"),
                "rank": entry.get("rank") or 0,
            }
        async with sem:
            matched = await _deezer_match(client, entry["title"], entry["artist"])
            if matched and entry.get("image") and not matched.get("thumbnail"):
                matched["thumbnail"] = entry["image"]
                matched["albumCover"] = entry["image"]
            await asyncio.sleep(0.08)
            return matched

    resolved = await asyncio.gather(*(one(e) for e in entries[: max(limit, 50)]))
    for row in resolved:
        if not row or not row.get("id") or row["id"] in seen:
            continue
        if not _is_commercial_entry(row.get("title") or "", row.get("artist") or ""):
            continue
        seen.add(row["id"])
        tracks.append(row)
        if len(tracks) >= limit:
            break
    return tracks


async def build_top50_es(
    client: httpx.AsyncClient, limit: int = 50, force: bool = False
) -> dict[str, Any]:
    """Top 50 comercial ES. Cache semanal en disco (+ memoria)."""
    global _mem
    wk = week_key()
    label = week_range_label()

    if not force and _mem and _mem.get("week") == wk and len(_mem.get("tracks") or []) >= 15:
        return {
            "source": _mem.get("source"),
            "week": wk,
            "weekLabel": label,
            "updatedAt": _mem.get("updatedAt"),
            "tracks": (_mem.get("tracks") or [])[:limit],
            "cached": True,
        }

    if not force:
        disk = _load_disk()
        if disk:
            _mem = disk
            return {
                "source": disk.get("source"),
                "week": wk,
                "weekLabel": label,
                "updatedAt": disk.get("updatedAt"),
                "tracks": (disk.get("tracks") or [])[:limit],
                "cached": True,
            }

    source = "empty"
    entries: list[dict[str, str]] = []

    if spotify_configured():
        entries = await _fetch_spotify_entries(client)
        if entries:
            source = "spotify"

    if len(entries) < 20:
        apple = await _fetch_apple_entries(client)
        if apple:
            # Prioriza Spotify; completa con Apple manteniendo orden comercial
            if not entries:
                entries = apple
                source = "apple"
            else:
                seen = {(e["title"].lower(), e["artist"].lower()) for e in entries}
                for row in apple:
                    key = (row["title"].lower(), row["artist"].lower())
                    if key in seen:
                        continue
                    entries.append(row)
                    seen.add(key)
                    if len(entries) >= 50:
                        break
                source = "spotify+apple"

    if len(entries) < 20:
        deezer_es = await _fetch_deezer_spain_entries(client)
        if deezer_es:
            if not entries:
                entries = deezer_es
                source = "deezer-spain"
            else:
                seen = {(e["title"].lower(), e["artist"].lower()) for e in entries}
                for row in deezer_es:
                    key = (row["title"].lower(), row["artist"].lower())
                    if key in seen:
                        continue
                    entries.append(row)
                    seen.add(key)
                    if len(entries) >= 50:
                        break
                if source == "empty":
                    source = "deezer-spain"

    tracks = await _resolve_entries(client, entries, limit=max(limit, 50))

    # Rellena hasta 50 con Top Spain comercial si faltan matches
    if len(tracks) < 45:
        filler = await _fetch_deezer_spain_entries(client)
        seen = {str(t.get("id")) for t in tracks}
        for row in filler:
            tid = f"deezer-{row.get('deezerId')}" if row.get("deezerId") else None
            if not tid or tid in seen:
                continue
            if not _is_commercial_entry(row.get("title") or "", row.get("artist") or ""):
                continue
            tracks.append(
                {
                    "id": tid,
                    "deezerId": row.get("deezerId"),
                    "albumDeezerId": row.get("albumDeezerId"),
                    "album": row.get("album") or "",
                    "source": "deezer",
                    "title": row.get("title") or "",
                    "artist": row.get("artist") or "",
                    "artistDeezerId": row.get("artistDeezerId"),
                    "duration": row.get("duration") or 0,
                    "thumbnail": row.get("image") or "",
                    "albumCover": row.get("image") or "",
                    "preview": row.get("preview"),
                    "rank": row.get("rank") or 0,
                }
            )
            seen.add(tid)
            if len(tracks) >= 50:
                break
        if source in ("apple", "spotify", "spotify+apple") and filler:
            source = f"{source}+spain"

    updated_at = datetime.now(timezone.utc).isoformat()

    payload = {
        "week": wk,
        "weekLabel": label,
        "source": source,
        "updatedAt": updated_at,
        "tracks": tracks[:50],
    }
    if len(tracks) >= 15:
        _mem = payload
        _save_disk(payload)

    return {
        "source": source,
        "week": wk,
        "weekLabel": label,
        "updatedAt": updated_at,
        "tracks": tracks[:limit],
        "cached": False,
    }
