"""Scoring para emparejar metadata de catálogo con resultados de YouTube."""

from __future__ import annotations

import re
import unicodedata

LYRIC_CHANNEL = re.compile(
    r"(?:\b(?:lyrics?|letras?|letra|karaoke|lyric\s*video)\b|"
    r"lycris|beatcloud|po[\s-]?music)",
    re.I,
)
# Versiones clean / radio → palabras pitadas o sustituidas
CLEAN_VERSION = re.compile(
    r"\b(clean(?:\s*version)?|radio\s*edit|censurad[oa]s?|censored|"
    r"no\s*explicit|family\s*friendly|bleep(?:ed)?|muted\s*words?|"
    r"sin\s*groser[ií]as|edited\s*version|pg[\s-]?13)\b",
    re.I,
)
# Pitch / tempo alterados → “suena muy rápido” o raro
ALTERED_TEMPO = re.compile(
    r"\b(sped\s*up|speed\s*up|speedup|nightcore|night\s*core|"
    r"slowed(?:\s*(?:down|reverb))?|super\s*slowed|reverb|"
    r"8d\s*audio|tiktok(?:\s*version)?|chipmunk|pitched|"
    r"bass\s*boost(?:ed)?|earrape|s3rl|cut\s*version|"
    r"1\.?25x|1\.?5x|2x\s*speed|"
    r"\d{2,3}\s*bpm|bpm\s*(?:mix|edit|version|extended)?|"
    r"dj\s*mix|extended\s*(?:dj\s*)?mix|mash\s*up|mashup|bootleg|"
    r"alternative\s*version|alt(?:ernative)?\s*version|"
    r"acelerad[oa]s?|fast\s*version|speed\s*version|"
    r"instrumental(?:\s*version)?)\b",
    re.I,
)
# Remezclas no pedidas (solo si el título buscado no las pide)
UNWANTED_REMIX = re.compile(
    r"\b(remix|vip\s*mix|club\s*mix|radio\s*mix|edit\s*mix)\b",
    re.I,
)
# Conciertos / directos / “Official Live Performance” (NO master de estudio)
# Evita false positives en canciones cuyo título lleva “Live” (p.ej. Live Your Life).
LIVE_RECORDING = re.compile(
    r"(?:"
    r"\b(?:official\s+)?live\s+"
    r"(?:performance|session|version|audio|video|at|from|in|on|show|concert|stream|edition)\b|"
    r"\b(?:performance|session|concert|show)\s+live\b|"
    r"\bofficial\s+live\b|"
    r"\bvevo\s+live\b|"
    # “Qué Pasaría Live San Juan”, “Cosa Nuestra Live”, “… Live” al final
    r"\blive\s+(?:san\s+juan|puerto\s+rico|pr\b|madrid|barcelona|miami|nyc|la\b|"
    r"coliseo|estadio|teatro|arena|plaza|stadium|festival|residency)\b|"
    r"\blive\s*$|"
    r"\ben\s+vivo\b|"
    r"\ben\s+directo\b|"
    r"\bgrabad[oa]s?\s+en\s+vivo\b|"
    r"\bgrabaci[oó]n\s+en\s+vivo\b|"
    r"\bconcierto\b|"
    r"\bconcert(?:\s+version)?\b|"
    r"\bfrom\s+the\s+(?:tour|show|concert|stadium|arena|vault)\b|"
    r"\bon\s+tour\b|"
    r"\btour\s+(?:live|version|edition|recording)\b|"
    r"\bgira\b|"
    r"\bon\s+stage\b|"
    r"\bdesde\s+(?:el\s+)?(?:escenario|estadio|teatro|arena|plaza)\b|"
    r"\ben\s+el\s+(?:coliseo|estadio|teatro|arena|plaza|escenario)\b|"
    r"\bunplugged\b|"
    r"\bmtv\s+unplugged\b|"
    r"\bfancam\b|"
    r"\bfan\s*cam\b|"
    r"\baudience\s+(?:recording|rec)\b|"
    r"\brehearsal\b|"
    r"\bensayo\b|"
    r"\brecorded\s+live\b|"
    r"\blive\s+recording\b|"
    r"\blive\s+at\b|"
    r"\blive\s+in\b|"
    r"\blive\s+from\b|"
    # Solo etiquetas de versión: (Live), [Live], (Live at …), - Live al final
    r"[\(\[]\s*live(?:\s+(?:performance|session|version|at|from|in|on|show|concert)[^)\]]*)?\s*[\)\]]|"
    r"[\-–—]\s*live(?:\s+(?:performance|session|version|at|from|in|on|show|concert)\b)?\s*$"
    r")",
    re.I,
)
# Token “live” suelto en el candidato (p.ej. “Cosa Nuestra Live”) si el catálogo no lo pide
BARE_LIVE_TOKEN = re.compile(r"\blive\b", re.I)
EXPLICIT_HINT = re.compile(r"\b(explicit|uncensored|album\s*version)\b", re.I)
OFFICIAL_STUDIO_HINT = re.compile(
    r"\b(official\s*audio|audio\s*oficial|official\s*video|video\s*oficial|"
    r"official\s*visuali[sz]er|visuali[sz]er)\b",
    re.I,
)
TOPIC_CHANNEL = re.compile(r"\btopic\b", re.I)


def _normalize(value: str = "") -> str:
    text = unicodedata.normalize("NFD", str(value or ""))
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    text = "".join(c.lower() if c.isalnum() or c.isspace() else " " for c in text)
    return " ".join(text.split())


def _compact(value: str = "") -> str:
    return _normalize(value).replace(" ", "")


def _title_tokens(title: str) -> list[str]:
    return [t for t in _normalize(title).split() if len(t) > 1]


def _catalog_wants_live(title: str) -> bool:
    """Solo si el catálogo ya pide una versión en vivo (p.ej. 'X (En Vivo)')."""
    raw = str(title or "")
    return bool(LIVE_RECORDING.search(raw) or BARE_LIVE_TOKEN.search(raw))


def _is_unwanted_live(cand_blob: str, catalog_title: str) -> bool:
    """Rechaza conciertos salvo que el catálogo pida explícitamente live."""
    if _catalog_wants_live(catalog_title):
        return False
    if LIVE_RECORDING.search(cand_blob):
        return True
    # “Title Live …” / “… Live” cuando el tema de estudio no lleva “live”
    return bool(BARE_LIVE_TOKEN.search(cand_blob))


def _score_title(cand_title: str, want_title: str) -> int:
    if not cand_title or not want_title:
        return 0
    if cand_title == want_title:
        return 70
    if _compact(cand_title) == _compact(want_title):
        return 65
    c, w = _compact(cand_title), _compact(want_title)
    if w in c or c in w:
        return 55
    tokens = _title_tokens(want_title)
    if not tokens:
        return 0
    hits = sum(1 for t in tokens if t in cand_title)
    ratio = hits / len(tokens)
    if ratio >= 1:
        return 50
    if ratio >= 0.75:
        return 35
    if ratio >= 0.5:
        return 18
    return 0


def _score_artist(entry_title: str, want_artist: str, channel: str = "") -> int:
    if not want_artist:
        return 0
    text = _normalize(f"{entry_title} {channel}")
    if want_artist in text:
        return 28
    # Coincidir primer token (Aissa, Bad, etc.)
    first = want_artist.split()[0] if want_artist.split() else ""
    if len(first) > 2 and first in text:
        return 14
    # Feat / several artists: probar tokens largos
    parts = [p for p in re.split(r"\s*(?:,|&|feat\.?|ft\.?|with)\s*", want_artist) if p]
    hits = sum(1 for p in parts if len(p) > 2 and p in text)
    if hits >= 2:
        return 22
    if hits == 1 and len(parts) > 1:
        return 10
    return -18


def _score_album(entry_title: str, want_album: str) -> int:
    if not want_album:
        return 0
    w = _normalize(want_album)
    t = _normalize(entry_title)
    if w in t:
        return 18
    return 0


def _score_duration(
    entry_duration: int | None,
    want_duration: int | None,
    *,
    lenient: bool = False,
) -> int:
    if not want_duration or not entry_duration:
        return 0
    want = int(want_duration)
    got = int(entry_duration)
    if want <= 0:
        return 0
    diff = abs(got - want)
    ratio = got / want

    # Sped-up / remix / live largo suele desviarse
    if not lenient and (ratio < 0.90 or ratio > 1.18):
        return -999
    # Clips oficiales suelen durar más (intro/outro) que el master de catálogo
    if lenient and got >= want and (got - want) <= 50:
        return 14
    if diff <= 3:
        return 30
    if diff <= 8:
        return 16
    if diff <= 12:
        return 6
    if diff > 18:
        return -35
    return 0


def _score_channel_quality(entry: dict, want_artist: str, *, prefer_explicit: bool = True) -> int:
    """Prioriza Topic / canal del artista / audio oficial; penaliza letras y clean."""
    title = str(entry.get("title") or "")
    channel = str(
        entry.get("channel")
        or entry.get("uploader")
        or entry.get("uploader_id")
        or ""
    )
    blob = f"{title} {channel}"
    score = 0
    ch_n = _normalize(channel)
    title_n = _normalize(title)
    artist_n = _normalize(want_artist)

    # Auto-generated official audio (distribuidora) — mejor señal de master
    if TOPIC_CHANNEL.search(ch_n) or ch_n.endswith(" topic"):
        score += 40
    if artist_n and artist_n in ch_n:
        score += 22
    if OFFICIAL_STUDIO_HINT.search(title):
        score += 28
        if "official audio" in title_n or "audio oficial" in title_n:
            score += 12
        if "official video" in title_n or "video oficial" in title_n:
            score += 8

    # Letras fan → audio raro / pitch raro
    if LYRIC_CHANNEL.search(blob):
        score -= 45
    if LYRIC_CHANNEL.search(ch_n):
        score -= 20
    if prefer_explicit and CLEAN_VERSION.search(blob):
        score -= 70
    elif CLEAN_VERSION.search(blob):
        score -= 10
    if prefer_explicit and EXPLICIT_HINT.search(blob):
        score += 18
    if any(x in title_n for x in ("cover", "karaoke", "reaction", "tutorial", "tribute")):
        score -= 50
    if "vevo" in ch_n or "vevo" in title_n:
        # VEVO a veces publica Official Live Performance — el rechazo live ya filtra
        score += 10

    return score


MIN_MATCH_SCORE = 55


def _want_prefers_explicit(title: str, prefer_explicit: bool) -> bool:
    """Si el catálogo ya pide clean, no forzamos explicit."""
    if not prefer_explicit:
        return False
    if CLEAN_VERSION.search(str(title or "")):
        return False
    return True


def score_entry(
    entry: dict,
    *,
    title: str,
    artist: str,
    album: str = "",
    duration: int | None = None,
    prefer_explicit: bool = True,
) -> int:
    entry_title = _normalize(entry.get("title") or "")
    want_title = _normalize(title)
    want_artist = _normalize(artist)
    channel = str(
        entry.get("channel")
        or entry.get("uploader")
        or entry.get("uploader_id")
        or ""
    )
    ch_n = _normalize(channel)
    want_explicit = _want_prefers_explicit(title, prefer_explicit)
    raw_title = str(entry.get("title") or "")
    blob = f"{raw_title} {channel}"

    title_score = _score_title(entry_title, want_title)
    if title_score < 25:
        return -1

    # Descartar clean / tempo alterado / DJ mix / alternative…
    if want_explicit and CLEAN_VERSION.search(blob):
        return -1
    if ALTERED_TEMPO.search(blob):
        return -1
    want_wants_remix = bool(UNWANTED_REMIX.search(str(title or "")))
    if not want_wants_remix and UNWANTED_REMIX.search(blob):
        return -1

    # Conciertos / Official Live Performance / en vivo → nunca si el catálogo pide estudio
    if _is_unwanted_live(blob, title):
        return -1

    is_mv = (
        "vevo" in ch_n
        or "official video" in entry_title
        or "video oficial" in entry_title
    ) and not _is_unwanted_live(blob, title)

    score = title_score
    score += _score_artist(entry_title, want_artist, channel)
    score += _score_album(entry_title, album)
    dur_score = _score_duration(entry.get("duration"), duration, lenient=is_mv)
    if dur_score <= -900:
        return -1
    score += dur_score
    score += _score_channel_quality(entry, artist, prefer_explicit=want_explicit)

    # Preferencia fuerte por Topic / Official Audio cuando hay duración alineada
    if TOPIC_CHANNEL.search(ch_n) and dur_score >= 16:
        score += 15
    if OFFICIAL_STUDIO_HINT.search(raw_title) and dur_score >= 16:
        score += 10

    return score


def pick_best_entry(
    entries: list[dict],
    *,
    title: str,
    artist: str,
    album: str = "",
    duration: int | None = None,
    prefer_explicit: bool = True,
) -> dict | None:
    ranked = rank_entries(
        entries,
        title=title,
        artist=artist,
        album=album,
        duration=duration,
        prefer_explicit=prefer_explicit,
        limit=1,
    )
    return ranked[0] if ranked else None


def rank_entries(
    entries: list[dict],
    *,
    title: str,
    artist: str,
    album: str = "",
    duration: int | None = None,
    prefer_explicit: bool = True,
    limit: int = 5,
) -> list[dict]:
    scored: list[tuple[int, dict]] = []
    for entry in entries:
        if not entry:
            continue
        s = score_entry(
            entry,
            title=title,
            artist=artist,
            album=album,
            duration=duration,
            prefer_explicit=prefer_explicit,
        )
        if s >= MIN_MATCH_SCORE:
            scored.append((s, entry))
    scored.sort(key=lambda row: row[0], reverse=True)
    return [entry for _, entry in scored[: max(1, limit)]]
