import { flushSync } from "react-dom"

/**
 * Анимированные переходы между экранами (View Transitions API — Safari 18+, Chrome).
 * Там, где браузер не умеет, экран просто меняется без анимации.
 *
 * none       — без анимации: переключение вкладок нижнего меню (пользователь попросил без перелистывания)
 * push / pop — открыть вложенный экран поверх и вернуться назад
 * morph      — нажатая кнопка «раскрывается» в следующий экран (запись)
 */
export type NavDir = "none" | "push" | "pop" | "morph"

type VT = { finished: Promise<void>; ready: Promise<void>; updateCallbackDone: Promise<void>; skipTransition?: () => void }
type DocWithVT = Document & { startViewTransition?: (cb: () => void) => VT }

export function withTransition(update: () => void, dir: NavDir): Promise<void> {
  const doc = document as DocWithVT
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  if (dir === "none" || !doc.startViewTransition || reduce) {
    update()
    return Promise.resolve()
  }
  const root = document.documentElement
  root.dataset.nav = dir
  // Экран меняется ровно один раз: либо внутри анимации, либо — если браузер
  // почему-то не начал её за 0,7 с (страница не рисуется) — сразу, без анимации.
  let ran = false
  const run = () => {
    if (ran) return
    ran = true
    flushSync(update)
  }
  const t = doc.startViewTransition(run)
  const guard = window.setTimeout(() => {
    if (ran) return
    t.skipTransition?.()
    run()
  }, 700)
  t.ready.catch(() => {}) // пропущенная анимация — не ошибка
  t.updateCallbackDone.catch(() => {}).finally(() => window.clearTimeout(guard))
  return t.finished
    .catch(() => {})
    .finally(() => {
      if (root.dataset.nav === dir) delete root.dataset.nav
    })
}

/** Короткий «тик» под пальцем там, где телефон это умеет (Android). На iPhone — без вибрации. */
export function tap(ms = 8) {
  try {
    // только после настоящего касания — иначе браузер ругается в консоль
    const ua = (navigator as Navigator & { userActivation?: { isActive: boolean } }).userActivation
    if (ua && !ua.isActive) return
    navigator.vibrate?.(ms)
  } catch {
    /* ignore */
  }
}

/** Вкладки нижнего меню сайта */
export const CLIENT_TABS = ["/", "/procedures", "/about", "/gift"]

const isTab = (path: string) => CLIENT_TABS.includes(path === "" ? "/" : path)

/** По умолчанию: между вкладками — просто переключаем, вглубь — открываем поверх, к вкладке — назад */
export function autoDir(fromPath: string, toPath: string): NavDir {
  if (isTab(fromPath) && isTab(toPath)) return "none"
  if (isTab(toPath)) return "pop"
  return "push"
}
