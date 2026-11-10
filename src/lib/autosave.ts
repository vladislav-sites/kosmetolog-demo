import { useEffect, useRef, useSyncExternalStore } from "react"

/**
 * Автосохранение полей в кабинете (цены, номиналы):
 *  - через `delay` после того, как мастер перестала печатать (один раз за паузу, не каждую секунду);
 *  - сразу, когда ушла с поля;
 *  - сразу, когда свернула или закрыла приложение (visibilitychange / pagehide) — иначе
 *    «ввела цену и смахнула приложение» терялось.
 * Сохранение одной цены — запись в localStorage, доли миллисекунды: тормозов от этого нет.
 */

type Job = { timer: number; run: () => void }
const jobs = new Map<object, Job>()
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

export function scheduleSave(key: object, run: () => void, delay = 1000) {
  const old = jobs.get(key)
  if (old) window.clearTimeout(old.timer)
  jobs.set(key, { run, timer: window.setTimeout(() => flushSave(key), delay) })
  notify()
}

/** Сохранить сейчас, если что-то ждёт сохранения */
export function flushSave(key: object) {
  const job = jobs.get(key)
  if (!job) return
  window.clearTimeout(job.timer)
  jobs.delete(key)
  job.run()
  notify()
}

/** Отменить ожидающее сохранение (например, ввод оказался пустым) */
export function cancelSave(key: object) {
  const job = jobs.get(key)
  if (!job) return
  window.clearTimeout(job.timer)
  jobs.delete(key)
  notify()
}

export const isSavePending = (key: object) => jobs.has(key)

export function flushAllSaves() {
  for (const key of [...jobs.keys()]) flushSave(key)
}

if (typeof window !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushAllSaves()
  })
  window.addEventListener("pagehide", flushAllSaves)
}

/** true — что-то ещё ждёт сохранения (для строки «Сохраняю…» / «✓ Всё сохранено») */
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}
const anyPending = () => jobs.size > 0

export function useSavePending() {
  return useSyncExternalStore(subscribe, anyPending)
}

/** Ключ поля для scheduleSave; при уходе с вкладки кабинета (размонтировании) — сохранить сразу */
export function useSaveKey() {
  const key = useRef({}).current
  useEffect(() => () => flushSave(key), [key])
  return key
}
