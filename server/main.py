"""
Melodix API — resolve mediaId + proxy de catálogo público.
Reproducción de audio: IFrame oficial en el cliente (Demus), no streams aquí.
"""

from __future__ import annotations

import asyncio
import logging
import re
import time
from contextlib import asynccontextmanager
from typing import Any

import httpx
import yt_dlp
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse

from config import CORS_ORIGINS, ENV
from charts import build_top50_es, spotify_configured
from rate_limit import client_key, deezer_limiter, resolve_limiter, stream_limiter
from track_match import rank_entries, score_entry

logger = logging.getLogger("melodix")

_stream_cache: dict[str, dict[str, Any]] = {}
RESOLVE_TTL = 24 * 3600
STREAM_TTL = 4 * 3600
MAX_ENTRIES = 500
YOUTUBE_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")
DEEZER_ALLOW_PREFIXES = (
    "search",
    "track",
    "album",
    "artist",
    "playlist",
    "chart",
    "genre",
    "editorial",
)

_http: httpx.AsyncClient | None = None


def _cache_get(key: str, ttl: int = STREAM_TTL) -> str | None:
    entry = _stream_cache.get(key)
    if entry and (time.time() - entry["ts"]) < ttl:
        return entry["url"]
    return None


def _cache_set(key: str, url: str) -> None:
    if len(_stream_cache) >= MAX_ENTRIES:
        oldest = min(_stream_cache, key=lambda k: _stream_cache[k]["ts"])
        del _stream_cache[oldest]
    _stream_cache[key] = {"url": url, "ts": time.time()}


def _validate_media_id(media_id: str) -> str:
    mid = str(media_id or "").strip()
    if not YOUTUBE_ID_RE.match(mid):
        raise HTTPException(status_code=400, detail="media_id inválido")
    return mid


def _rate_limit(limiter, request: Request, label: str) -> None:
    key = client_key(request)
    if not limiter.allow(key):
        raise HTTPException(status_code=429, detail=f"Demasiadas peticiones ({label})")


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _http
    _http = httpx.AsyncClient(
        timeout=25.0,
        follow_redirects=True,
        limits=httpx.Limits(max_connections=30),
    )
    yield
    await _http.aclose()
    _http = None


app = FastAPI(title="Melodix API", lifespan=lifespan)

_cors_origins = CORS_ORIGINS if CORS_ORIGINS else ([] if ENV == "production" else ["*"])
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Content-Range", "Accept-Ranges", "Content-Length"],
)


@app.get("/health")
@app.get("/api/health")
async def health():
    return {
        "ok": True,
        "status": "ok",
        "cache": len(_stream_cache),
        "env": ENV,
        "owners": {
            "catalog": True,
            "resolve": True,
            "charts": True,
            "streamFallback": True,
        },
        "spotifyConfigured": spotify_configured(),
    }


@app.get("/api/charts/top50-es")
async def charts_top50_es(request: Request, limit: int = 50, force: int = 0):
    """Top 50 España comercial (cache semanal). force=1 regenera la semana."""
    _rate_limit(deezer_limiter, request, "charts")
    if _http is None:
        raise HTTPException(status_code=503, detail="HTTP client no listo")
    capped = max(1, min(int(limit or 50), 50))
    data = await build_top50_es(_http, capped, force=bool(force))
    return {
        "ok": True,
        "source": data.get("source"),
        "week": data.get("week"),
        "weekLabel": data.get("weekLabel"),
        "updatedAt": data.get("updatedAt"),
        "spotifyConfigured": spotify_configured(),
        "tracks": data.get("tracks") or [],
        "cached": bool(data.get("cached")),
    }


def _client_error(message: str) -> str:
    text = str(message or "")
    for token in ("[youtube]", "youtube", "YoutubeDL"):
        text = text.replace(token, "source")
    return text.strip() or "Stream unavailable"


async def _get_audio_url(media_id: str, quality: str = "high") -> str:
    cached = _cache_get(media_id)
    if cached:
        return cached

    fmt = {
        "high": "bestaudio[ext=webm][abr>=128]/bestaudio[ext=webm]/bestaudio/best/best",
        "mid": "bestaudio[abr<=160][abr>=64]/bestaudio/best/best",
        "low": "bestaudio[abr<=80]/bestaudio/best/best",
    }.get(quality, "bestaudio/best/best")

    loop = asyncio.get_running_loop()

    def _pick_url(info: dict[str, Any]) -> str | None:
        fmts = list(info.get("formats") or [])

        def usable(f: dict[str, Any]) -> bool:
            if not f.get("url"):
                return False
            ext = str(f.get("ext") or "")
            proto = str(f.get("protocol") or "")
            if ext == "mhtml" or "mhtml" in proto:
                return False
            acodec = f.get("acodec")
            return acodec not in (None, "none")

        audio_only = [
            f
            for f in fmts
            if usable(f) and f.get("vcodec") in (None, "none")
        ]
        if audio_only:
            return max(audio_only, key=lambda f: f.get("abr") or 0)["url"]

        # Progressive (p.ej. format 18) cuando YouTube no da bestaudio por SABR/bot.
        progressive = [f for f in fmts if usable(f)]
        if progressive:
            progressive.sort(
                key=lambda f: (
                    0 if f.get("vcodec") in (None, "none") else 1,
                    f.get("height") or 9999,
                    -(f.get("abr") or 0),
                )
            )
            return progressive[0]["url"]

        if info.get("url") and "mhtml" not in str(info.get("protocol") or ""):
            return str(info["url"])
        return None

    def _extract() -> str:
        watch_url = f"https://www.youtube.com/watch?v={media_id}"
        last_error: Exception | None = None

        for format_str in (fmt, "bestaudio/best/best", "best[height<=360]/best"):
            opts = {
                "format": format_str,
                "quiet": True,
                "no_warnings": True,
                "noplaylist": True,
                "socket_timeout": 15,
                # Node + EJS: firma YT moderna (sin esto el stream falla → player en 0:00)
                "js_runtimes": {"node": {}},
                "remote_components": {"ejs:github"},
                "extractor_args": {
                    "youtube": {
                        "player_client": ["android", "web", "ios"],
                    }
                },
            }
            try:
                with yt_dlp.YoutubeDL(opts) as ydl:
                    info = ydl.extract_info(watch_url, download=False) or {}
                    url = _pick_url(info)
                    if url:
                        return url
            except Exception as exc:
                last_error = exc
                continue

        raise RuntimeError(_client_error(str(last_error) if last_error else "extract failed"))

    url = await loop.run_in_executor(None, _extract)
    _cache_set(media_id, url)
    return url


async def _resolve_media_candidates(
    title: str,
    artist: str,
    album: str = "",
    duration: int | None = None,
    limit: int = 5,
    prefer_explicit: bool = True,
) -> list[str]:
    """limit=1 = ruta rápida (1–2 búsquedas). limit>1 = más candidatos para reintentos."""
    ex_tag = "ex1" if prefer_explicit else "ex0"
    cache_key = f"resolve:cands:v9:{ex_tag}:{title}:{artist}:{album}:{duration or 0}:{limit}"
    cached = _cache_get(cache_key, RESOLVE_TTL)
    if cached:
        return [x for x in cached.split(",") if x]

    single_key = f"resolve:v9:{ex_tag}:{title}:{artist}:{album}:{duration or 0}"
    if limit == 1:
        hit = _cache_get(single_key, RESOLVE_TTL)
        if hit:
            return [hit]

    fast = limit <= 1
    # Prioriza master de estudio; excluye live/concierto en la query de YT
    exclude = (
        '-live -concert -"en vivo" -"live performance" -"official live" '
        '-unplugged -coliseo -"san juan" -fancam -gira'
    )
    queries = (
        [
            f'{artist} {title} "official audio" {exclude}',
            f"{artist} {title} topic {exclude}",
            f"{artist} {title} {album}".strip() if album else f"{artist} {title} {exclude}",
            f"{artist} {title} {exclude}",
        ]
        if fast
        else [
            f'{artist} {title} "official audio" {exclude}',
            f'{artist} {title} "official video" {exclude}',
            f"{artist} {title} topic {exclude}",
            f"{artist} {title} {album}".strip() if album else f"{artist} {title} {exclude}",
            f"{artist} {title} explicit {exclude}",
            f"{artist} {title} {exclude}",
            f'{title} {artist} "official audio" {exclude}',
        ]
    )
    # Quitar vacíos / duplicados
    seen_q: set[str] = set()
    queries = [q for q in queries if q and not (q in seen_q or seen_q.add(q))]
    if album and not fast and f"{artist} {title} {album}" not in seen_q:
        queries.append(f"{artist} {title} {album}")

    search_n = 6 if fast else 8
    opts = {
        "quiet": True,
        "no_warnings": True,
        "extract_flat": True,
        "noplaylist": True,
        "default_search": f"ytsearch{search_n}",
    }

    loop = asyncio.get_running_loop()

    def _search() -> list[str]:
        seen: set[str] = set()
        pool: list[dict] = []

        with yt_dlp.YoutubeDL(opts) as ydl:
            for query in queries:
                try:
                    result = ydl.extract_info(f"ytsearch{search_n}:{query}", download=False)
                    for entry in result.get("entries") or []:
                        if not entry or not entry.get("id"):
                            continue
                        eid = entry["id"]
                        if eid in seen:
                            continue
                        seen.add(eid)
                        pool.append(entry)
                    if fast and pool:
                        ranked_early = rank_entries(
                            pool,
                            title=title,
                            artist=artist,
                            album=album,
                            duration=duration,
                            prefer_explicit=prefer_explicit,
                            limit=1,
                        )
                        # Solo early-exit con match de estudio sólido (Topic / official / score alto)
                        if ranked_early:
                            best = ranked_early[0]
                            best_score = score_entry(
                                best,
                                title=title,
                                artist=artist,
                                album=album,
                                duration=duration,
                                prefer_explicit=prefer_explicit,
                            )
                            ch = " ".join(
                                str(
                                    best.get("channel")
                                    or best.get("uploader")
                                    or best.get("uploader_id")
                                    or ""
                                )
                                .lower()
                                .split()
                            )
                            title_l = str(best.get("title") or "").lower()
                            solid = (
                                best_score >= 110
                                or "topic" in ch
                                or "official audio" in title_l
                                or "audio oficial" in title_l
                            )
                            if solid:
                                return [best["id"]]
                except Exception:
                    continue

        ranked = rank_entries(
            pool,
            title=title,
            artist=artist,
            album=album,
            duration=duration,
            prefer_explicit=prefer_explicit,
            limit=max(limit, 1),
        )
        return [e["id"] for e in ranked if e.get("id")]

    timeout = 10.0 if fast else 16.0
    try:
        ids = await asyncio.wait_for(loop.run_in_executor(None, _search), timeout=timeout)
    except asyncio.TimeoutError as exc:
        raise HTTPException(status_code=503, detail="Timeout") from exc

    ids = ids[: max(1, limit)]
    if ids:
        _cache_set(cache_key, ",".join(ids))
        _cache_set(single_key, ids[0])
    return ids


async def _resolve_media_id(
    title: str,
    artist: str,
    album: str = "",
    duration: int | None = None,
    prefer_explicit: bool = True,
) -> str:
    ids = await _resolve_media_candidates(
        title, artist, album, duration, limit=1, prefer_explicit=prefer_explicit
    )
    if not ids:
        raise HTTPException(status_code=404, detail="Not found")
    return ids[0]


async def _stream_response(media_id: str, quality: str, request: Request):
    if _http is None:
        raise HTTPException(status_code=503, detail="Servidor iniciando")

    media_id = _validate_media_id(media_id)
    url = await _get_audio_url(media_id, quality)
    range_h = request.headers.get("range", "bytes=0-")

    resp = await _http.get(
        url,
        headers={
            "Range": range_h,
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
            ),
        },
    )

    if resp.status_code not in (200, 206):
        _stream_cache.pop(media_id, None)
        url = await _get_audio_url(media_id, quality)
        resp = await _http.get(url, headers={"Range": range_h})

    ct = resp.headers.get("content-type", "audio/webm")
    if "text" in ct or "html" in ct:
        ct = "audio/webm"

    headers = {
        "Content-Type": ct,
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-cache",
    }
    if "content-length" in resp.headers:
        headers["Content-Length"] = resp.headers["content-length"]
    if resp.status_code == 206 and "content-range" in resp.headers:
        headers["Content-Range"] = resp.headers["content-range"]

    return StreamingResponse(
        resp.aiter_bytes(chunk_size=65536),
        status_code=resp.status_code,
        headers=headers,
    )


@app.get("/api/media/stream/{media_id}")
async def stream_media(media_id: str, request: Request, quality: str = "high"):
    _rate_limit(stream_limiter, request, "stream")
    return await _stream_response(media_id, quality, request)


@app.get("/api/stream/{media_id}")
async def stream_legacy(media_id: str, request: Request, quality: str = "high"):
    _rate_limit(stream_limiter, request, "stream")
    return await _stream_response(media_id, quality, request)


@app.get("/api/media/resolve")
async def resolve_media(
    request: Request,
    title: str,
    artist: str,
    album: str = "",
    duration: int | None = None,
    limit: int = 1,
    prefer_explicit: bool = True,
):
    _rate_limit(resolve_limiter, request, "resolve")
    lim = max(1, min(int(limit or 1), 8))
    if lim == 1:
        media_id = await _resolve_media_id(
            title, artist, album, duration, prefer_explicit=prefer_explicit
        )
        return {"mediaId": media_id, "candidates": [media_id]}
    candidates = await _resolve_media_candidates(
        title, artist, album, duration, limit=lim, prefer_explicit=prefer_explicit
    )
    if not candidates:
        raise HTTPException(status_code=404, detail="Not found")
    return {"mediaId": candidates[0], "candidates": candidates}


@app.get("/api/resolve")
async def resolve_legacy(
    request: Request,
    title: str,
    artist: str,
    album: str = "",
    duration: int | None = None,
    limit: int = 1,
    prefer_explicit: bool = True,
):
    _rate_limit(resolve_limiter, request, "resolve")
    lim = max(1, min(int(limit or 1), 8))
    candidates = await _resolve_media_candidates(
        title, artist, album, duration, limit=lim, prefer_explicit=prefer_explicit
    )
    if not candidates:
        raise HTTPException(status_code=404, detail="Not found")
    return {
        "mediaId": candidates[0],
        "videoId": candidates[0],
        "candidates": candidates,
    }


@app.api_route("/api/catalog/{path:path}", methods=["GET"])
@app.api_route("/api/deezer/{path:path}", methods=["GET"])  # alias legado
async def catalog_proxy(path: str, request: Request):
    _rate_limit(deezer_limiter, request, "catalog")
    if _http is None:
        raise HTTPException(status_code=503, detail="Servidor iniciando")

    clean = str(path or "").lstrip("/")
    root = clean.split("/", 1)[0].lower()
    if root not in DEEZER_ALLOW_PREFIXES:
        raise HTTPException(status_code=400, detail="Ruta de catálogo no permitida")

    url = f"https://api.deezer.com/{clean}"
    params = dict(request.query_params)
    last_exc: Exception | None = None
    resp = None
    for attempt in range(4):
        try:
            resp = await _http.get(url, params=params)
        except httpx.HTTPError as exc:
            last_exc = exc
            await asyncio.sleep(0.35 * (attempt + 1))
            continue

        if resp.status_code != 429:
            break
        retry_after = resp.headers.get("retry-after")
        try:
            wait_s = float(retry_after) if retry_after else 0.6 * (2**attempt)
        except ValueError:
            wait_s = 0.6 * (2**attempt)
        await asyncio.sleep(min(wait_s, 6.0))

    if resp is None:
        raise HTTPException(status_code=502, detail=f"Error de catálogo: {last_exc}") from last_exc

    return Response(
        content=resp.content,
        status_code=resp.status_code,
        media_type=resp.headers.get("content-type", "application/json"),
    )
