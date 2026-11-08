import { useEffect, useState } from "react"
import { Share, SquarePlus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { master } from "@/config/master"

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

const KEY = "cosmo-install-dismissed"

/** Подсказка «добавить на экран» — превращает ссылку в иконку-приложение */
export function InstallHint() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null)
  const [show, setShow] = useState(false)
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true

  useEffect(() => {
    let dismissed = false
    try {
      dismissed = localStorage.getItem(KEY) === "1"
    } catch {
      /* ignore */
    }
    if (standalone || dismissed) return
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BIPEvent)
      setShow(true)
    }
    window.addEventListener("beforeinstallprompt", onPrompt)
    const t = isIOS ? window.setTimeout(() => setShow(true), 4000) : undefined
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt)
      if (t) window.clearTimeout(t)
    }
  }, [isIOS, standalone])

  const close = () => {
    setShow(false)
    try {
      localStorage.setItem(KEY, "1")
    } catch {
      /* ignore */
    }
  }

  if (!show) return null

  return (
    <div className="fixed inset-x-3 bottom-24 z-40 mx-auto max-w-md animate-in fade-in slide-in-from-bottom-4 md:bottom-6 md:right-6 md:left-auto md:mx-0 md:w-96">
      <div className="flex items-start gap-3 rounded-2xl border border-border bg-popover p-4 shadow-xl shadow-black/10">
        <SquarePlus className="mt-0.5 size-5 shrink-0 text-clay" />
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-medium">Добавьте {master.brand} на экран</p>
          {deferred ? (
            <p className="mt-1 text-muted-foreground">Записываться можно будет в одно касание, как в приложении.</p>
          ) : (
            <p className="mt-1 text-muted-foreground">
              Нажмите <Share className="inline size-3.5 -translate-y-px" /> «Поделиться», затем «На экран „Домой“».
            </p>
          )}
          {deferred && (
            <Button
              size="sm"
              className="mt-3 rounded-full px-4"
              onClick={async () => {
                await deferred.prompt()
                close()
              }}
            >
              Установить
            </Button>
          )}
        </div>
        <button onClick={close} aria-label="Закрыть" className="rounded-full p-1 text-muted-foreground hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}
