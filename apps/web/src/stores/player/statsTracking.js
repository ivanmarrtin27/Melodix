import { useStatsStore } from '../statsStore'

let statsInterval = null
let statsTrack = null
let statsPlaying = false
let statsLastFlushMs = null
const STATS_FLUSH_INTERVAL = 15000
const STATS_TICK_SECONDS = 5

function flushStats(force = false) {
  if (!statsTrack || !statsPlaying || statsLastFlushMs == null) return
  const elapsed = Math.floor((Date.now() - statsLastFlushMs) / 1000)
  if (elapsed <= 0) return
  if (force || elapsed >= STATS_TICK_SECONDS) {
    useStatsStore.getState().recordListeningTime(statsTrack, elapsed)
    statsLastFlushMs = Date.now()
  }
}

function clearStatsInterval() {
  if (statsInterval) clearInterval(statsInterval)
  statsInterval = null
}

export function startStatsTracking(track) {
  clearStatsInterval()
  statsTrack = track
  statsPlaying = true
  statsLastFlushMs = Date.now()
  useStatsStore.getState().recordPlayStart(track)
  statsInterval = setInterval(() => flushStats(true), STATS_FLUSH_INTERVAL)
}

export function pauseStatsTracking() {
  flushStats(true)
  statsPlaying = false
  clearStatsInterval()
}

export function resumeStatsTracking() {
  if (!statsTrack) return
  statsPlaying = true
  statsLastFlushMs = Date.now()
  clearStatsInterval()
  statsInterval = setInterval(() => flushStats(true), STATS_FLUSH_INTERVAL)
}

export function stopStatsTracking() {
  flushStats(true)
  statsTrack = null
  statsPlaying = false
  statsLastFlushMs = null
  clearStatsInterval()
}

export function isStatsPlaying() {
  return statsPlaying
}

export function getStatsTrack() {
  return statsTrack
}

export function flushStatsTick() {
  flushStats(false)
}
