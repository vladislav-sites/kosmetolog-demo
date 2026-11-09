import { Fragment, useEffect, useState, type CSSProperties } from "react"
import { getState, initialsOf } from "@/lib/store"
import { IS_EMBED } from "@/lib/env"

const KEY = "cosmo-splash-seen"

/**
 * Решается один раз при загрузке: открыла приложение — заставка, перезагрузила страницу — уже нет.
 * Открыли сразу кабинет — заставки нет и потом, при переходе на сайт.
 */
let pending = (() => {
  if (IS_EMBED || location.hash.startsWith("#/admin")) return false
  try {
    if (sessionStorage.getItem(KEY)) return false
    sessionStorage.setItem(KEY, "1")
  } catch {
    /* хранилище недоступно — покажем, ничего страшного */
  }
  return true
})()

/**
 * Заставка при входе: буквы имени по одной проявляются из размытия, под ними
 * тонкая линия и название студии (если мастер его указала). Потом всё растворяется.
 * Касание — пропустить.
 */
export function Splash() {
  // Показали один раз — больше не показываем, даже если компонент смонтируется заново (зашла в кабинет и вернулась)
  const [show, setShow] = useState(() => pending)
  useEffect(() => {
    pending = false
  }, [])
  const [leaving, setLeaving] = useState(false)
  const { name, brand } = getState().profile

  const chars = Array.from(name)
  // Длинное имя не должно тянуть заставку: на все буквы — не больше ~0,75 с
  const step = Math.min(55, 750 / Math.max(chars.length, 1))
  const nameDone = 250 + chars.length * step + 650
  const hold = nameDone + (brand ? 900 : 450)

  useEffect(() => {
    if (!show) return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const t = window.setTimeout(() => setLeaving(true), reduce ? 900 : hold)
    return () => window.clearTimeout(t)
  }, [show, hold])

  if (!show) return null

  let i = 0
  const words = name.split(/\s+/).filter(Boolean)

  return (
    <div
      className="splash"
      data-leaving={leaving || undefined}
      onClick={() => setLeaving(true)}
      onAnimationEnd={(e) => e.target === e.currentTarget && leaving && setShow(false)}
      aria-hidden
    >
      <div className="splash-inner">
        <span className="splash-mono font-heading">{initialsOf(name)}</span>
        <p className="splash-name font-heading" style={{ "--longest": Math.max(8, ...words.map((w) => w.length)) } as CSSProperties}>
          {/* Слово — неразрывный блок, пробелы между словами обычные: длинное имя переносится по словам, а не по буквам */}
          {words.map((w, wi) => (
            <Fragment key={wi}>
              {wi > 0 && " "}
              <span className="inline-block whitespace-nowrap">
                {Array.from(w).map((ch) => (
                  <span key={i} className="splash-ch" style={{ "--d": `${250 + i++ * step}ms` } as CSSProperties}>
                    {ch}
                  </span>
                ))}
              </span>
            </Fragment>
          ))}
        </p>
        <span className="splash-line" style={{ "--d": `${nameDone - 350}ms` } as CSSProperties} />
        {brand && (
          <p className="splash-brand" style={{ "--d": `${nameDone - 200}ms` } as CSSProperties}>
            {brand}
          </p>
        )}
      </div>
    </div>
  )
}
