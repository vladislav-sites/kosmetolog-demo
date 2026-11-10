import { useParams } from "react-router"
import { TLink } from "@/components/tlink"
import { CalendarPlus, Check, MapPin, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAppState } from "@/lib/store"
import { telegramUrl } from "@/lib/links"
import { IS_EMBED } from "@/lib/env"
import { dur, fmtDay, icsFor, parseLocal, price } from "@/lib/time"

export default function DonePage() {
  const { id } = useParams()
  const bookings = useAppState((s) => s.bookings)
  const services = useAppState((s) => s.services)
  const profile = useAppState((s) => s.profile)
  const b = bookings.find((x) => x.id === id)
  if (!b)
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <p className="font-heading text-3xl">Запись не найдена</p>
        <Button asChild className="mt-6 rounded-full">
          <TLink to="/book" dir="push">
            Записаться
          </TLink>
        </Button>
      </div>
    )

  const svc = services.find((s) => s.id === b.serviceId)
  const start = parseLocal(b.start)
  // подготовка по всем процедурам визита, без повторов
  const ids = b.items?.map((i) => i.serviceId) ?? [b.serviceId]
  const prep = [...new Set(ids.flatMap((id) => services.find((s) => s.id === id)?.prep ?? []))]

  const downloadIcs = () => {
    const blob = new Blob([icsFor(b, [profile.city, profile.address].filter(Boolean).join(", "), profile.name)], { type: "text/calendar;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "zapis.ics"
    document.body.append(a)
    a.click()
    a.remove()
    // Safari не успевает забрать файл, если ссылку отозвать сразу
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6 md:py-20">
      <div className="grid size-16 place-items-center rounded-full bg-primary text-primary-foreground animate-in zoom-in-50">
        <Check className="size-7" />
      </div>
      <h1 className="mt-6 font-heading text-4xl leading-tight sm:text-5xl">{b.name}, вы записаны</h1>
      <p className="mt-3 text-muted-foreground">Я получила вашу запись и напишу накануне, чтобы напомнить о визите.</p>

      <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="bg-tint/70 px-5 py-4">
          <p className="text-xl font-semibold first-letter:uppercase">{fmtDay(start)}</p>
          <p className="text-sm text-muted-foreground">
            {b.start.slice(11)} · {dur(b.duration)}
          </p>
        </div>
        <div className="space-y-3 px-5 py-4 text-sm">
          {b.items ? (
            <>
              {b.items.map((i) => (
                <div key={i.serviceId} className="flex justify-between gap-4">
                  <span>{i.title}</span>
                  <span className="whitespace-nowrap text-muted-foreground tabular-nums">{dur(i.duration)}</span>
                </div>
              ))}
              <div className="flex justify-between gap-4 border-t border-border pt-3">
                <span>Итого</span>
                <span className="font-semibold whitespace-nowrap tabular-nums">{price(b.price, b.priceFrom)}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between gap-4">
              <span>{b.serviceTitle}</span>
              <span className="font-semibold whitespace-nowrap tabular-nums">{price(b.price, b.priceFrom ?? svc?.priceFrom)}</span>
            </div>
          )}
          <div className="flex items-start gap-2 text-muted-foreground">
            <MapPin className="mt-0.5 size-4 shrink-0" />
            <span>{[profile.city, profile.address, profile.addressNote].filter(Boolean).join(", ")}</span>
          </div>
        </div>
      </div>

      {prep.length > 0 && (
        <div className="mt-6 rounded-2xl border border-border p-5">
          <p className="font-medium">Перед визитом</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {prep.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {!IS_EMBED && (
          <Button variant="outline" size="lg" className="h-12 rounded-full bg-transparent" onClick={downloadIcs}>
            <CalendarPlus /> В календарь
          </Button>
        )}
        {profile.telegram && (
          <Button asChild variant="outline" size="lg" className="h-12 rounded-full bg-transparent">
            <a href={telegramUrl(profile.telegram)} target="_blank" rel="noreferrer">
              <MessageCircle /> Написать мне
            </a>
          </Button>
        )}
      </div>
      <Button asChild variant="link" className="mt-6 px-0">
        <TLink to="/" dir="pop">
          На главную
        </TLink>
      </Button>
    </div>
  )
}
