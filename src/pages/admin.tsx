import { useMemo, useState } from "react"
import { Link } from "react-router"
import { addDays, differenceInCalendarDays, format, isSameDay, isToday, startOfDay } from "date-fns"
import { ru } from "date-fns/locale"
import { toast } from "sonner"
import {
  ArrowLeft,
  BellRing,
  CalendarDays,
  Check,
  Clock,
  Gift,
  LockKeyhole,
  MessageCircle,
  Palette,
  Phone,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react"
import { cn } from "cn"
import { master } from "@/config/master"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Monogram, ThemeSwitcher } from "@/components/bits"
import { actions, useAppState, type Booking, type BookingStatus } from "@/lib/store"
import { bookingEnd, dayKey, dur, fromMin, parseLocal, rub } from "@/lib/time"

const AUTH = "cosmo-admin-ok"

export default function AdminPage() {
  const [ok, setOk] = useState(() => {
    try {
      return sessionStorage.getItem(AUTH) === "1"
    } catch {
      return false
    }
  })
  if (!ok) return <PinGate onOk={() => setOk(true)} />
  return <Cabinet />
}

function PinGate({ onOk }: { onOk: () => void }) {
  const [pin, setPin] = useState("")
  const [err, setErr] = useState(false)
  const check = (v: string) => {
    setPin(v)
    setErr(false)
    if (v.length === master.adminPin.length) {
      if (v === master.adminPin) {
        try {
          sessionStorage.setItem(AUTH, "1")
        } catch {
          /* ignore */
        }
        onOk()
      } else {
        setErr(true)
        setPin("")
      }
    }
  }
  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-xs text-center">
        <Monogram className="mx-auto size-14 text-xl" />
        <h1 className="mt-5 font-heading text-3xl">Кабинет мастера</h1>
        <p className="mt-2 text-sm text-muted-foreground">Введите PIN-код</p>
        <Input
          autoFocus
          inputMode="numeric"
          type="password"
          value={pin}
          onChange={(e) => check(e.target.value.replace(/\D/g, "").slice(0, master.adminPin.length))}
          className={cn("mx-auto mt-6 h-14 w-40 rounded-2xl bg-card text-center text-2xl tracking-[0.5em]", err && "border-destructive")}
          aria-label="PIN-код"
        />
        {err && <p className="mt-2 text-sm text-destructive">Неверный PIN</p>}
        {master.demo && <p className="mt-6 text-xs text-muted-foreground">Демо-PIN: {master.adminPin}</p>}
        <Link to="/" className="mt-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> На сайт
        </Link>
      </div>
    </div>
  )
}

const TABS = [
  { id: "day", label: "Записи", icon: CalendarDays },
  { id: "repeat", label: "Позвать снова", icon: BellRing },
  { id: "services", label: "Услуги и цены", icon: Sparkles },
  { id: "hours", label: "График", icon: Clock },
  { id: "gifts", label: "Сертификаты", icon: Gift },
  { id: "look", label: "Оформление", icon: Palette },
] as const
type TabId = (typeof TABS)[number]["id"]

function Cabinet() {
  const [tab, setTab] = useState<TabId>("day")
  const s = useAppState((st) => st)
  const newCount = s.bookings.filter((b) => b.status === "new" && parseLocal(b.start) >= startOfDay(new Date())).length
  const giftCount = s.gifts.filter((g) => g.status === "new").length
  const repeatCount = useRepeatList().length

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4 sm:px-6">
          <Link to="/" className="grid size-9 place-items-center rounded-full border border-border hover:bg-muted" aria-label="На сайт">
            <ArrowLeft className="size-4" />
          </Link>
          <div className="leading-tight">
            <p className="text-[0.7rem] text-muted-foreground">Кабинет</p>
            <p className="font-heading text-[1.05rem]">{master.masterName}</p>
          </div>
          {master.demo && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto rounded-full text-muted-foreground"
              onClick={() => {
                actions.resetDemo()
                toast.success("Демо-данные сброшены")
              }}
            >
              <RotateCcw /> Сбросить демо
            </Button>
          )}
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:px-6">
          {TABS.map((t) => {
            const count = t.id === "day" ? newCount : t.id === "gifts" ? giftCount : t.id === "repeat" ? repeatCount : 0
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm transition-colors",
                  tab === t.id ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <t.icon className="size-4" />
                {t.label}
                {count > 0 && (
                  <span className={cn("rounded-full px-1.5 text-[0.65rem] font-semibold tabular-nums", tab === t.id ? "bg-background/20" : "bg-clay text-white")}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 md:py-10">
        {tab === "day" && <DayTab />}
        {tab === "repeat" && <RepeatTab />}
        {tab === "services" && <ServicesTab />}
        {tab === "hours" && <HoursTab />}
        {tab === "gifts" && <GiftsTab />}
        {tab === "look" && (
          <section>
            <h2 className="font-heading text-2xl">Оформление</h2>
            <p className="mt-1 text-sm text-muted-foreground">Меняется сразу у всех клиенток.</p>
            <div className="mt-5">
              <ThemeSwitcher />
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

/* ———————————————— Записи по дням ———————————————— */

const STATUS: Record<BookingStatus, { label: string; cls: string }> = {
  new: { label: "Новая", cls: "bg-clay text-white" },
  confirmed: { label: "Подтверждена", cls: "bg-emerald-600/15 text-emerald-700 dark:text-emerald-300" },
  done: { label: "Пришла", cls: "bg-muted text-muted-foreground" },
  cancelled: { label: "Отменена", cls: "bg-destructive/10 text-destructive line-through" },
}

function DayTab() {
  const s = useAppState((st) => st)
  const [day, setDay] = useState(startOfDay(new Date()))
  const days = Array.from({ length: 21 }, (_, i) => addDays(startOfDay(new Date()), i))

  const list = s.bookings
    .filter((b) => isSameDay(parseLocal(b.start), day))
    .sort((a, b) => a.start.localeCompare(b.start))

  const weekRevenue = s.bookings
    .filter((b) => b.status !== "cancelled")
    .filter((b) => {
      const d = differenceInCalendarDays(parseLocal(b.start), new Date())
      return d >= 0 && d < 7
    })
    .reduce((sum, b) => sum + b.price, 0)
  const todayCount = s.bookings.filter((b) => b.status !== "cancelled" && isToday(parseLocal(b.start))).length
  const wd = s.week[day.getDay()]
  const isOff = s.daysOff.includes(dayKey(day))

  return (
    <section>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Kpi label="Сегодня" value={String(todayCount)} hint="записей" />
        <Kpi label="7 дней" value={rub(weekRevenue)} hint="ожидается" />
        <Kpi label="Новые" value={String(s.bookings.filter((b) => b.status === "new").length)} hint="подтвердить" />
      </div>

      <div className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0">
        {days.map((d) => {
          const n = s.bookings.filter((b) => b.status !== "cancelled" && isSameDay(parseLocal(b.start), d)).length
          const off = !s.week[d.getDay()].enabled || s.daysOff.includes(dayKey(d))
          const active = isSameDay(d, day)
          return (
            <button
              key={d.toISOString()}
              onClick={() => setDay(d)}
              className={cn(
                "flex w-14 shrink-0 flex-col items-center rounded-2xl border py-2.5 transition-colors",
                active ? "border-foreground bg-foreground text-background" : "border-border bg-card hover:border-foreground/40",
                off && !active && "opacity-50",
              )}
            >
              <span className="text-[0.65rem] uppercase">{format(d, "EEEEEE", { locale: ru })}</span>
              <span className="font-heading text-xl leading-tight tabular-nums">{format(d, "d")}</span>
              <span className={cn("mt-0.5 size-1.5 rounded-full", n ? (active ? "bg-background" : "bg-clay") : "bg-transparent")} />
            </button>
          )
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-2xl first-letter:uppercase">{format(day, "d MMMM, EEEE", { locale: ru })}</h2>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {wd.enabled ? (
            <>
              <span>
                {isOff ? "Выходной" : `${wd.from}–${wd.to}`}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full bg-transparent"
                onClick={() => {
                  actions.toggleDayOff(dayKey(day))
                  toast(isOff ? "День открыт для записи" : "День закрыт для записи")
                }}
              >
                {isOff ? "Открыть день" : "Закрыть день"}
              </Button>
            </>
          ) : (
            <span>Выходной по графику</span>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        {list.length === 0 && <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Записей нет</p>}
        {list.map((b) => (
          <BookingCard key={b.id} b={b} />
        ))}
      </div>
    </section>
  )
}

function BookingCard({ b }: { b: Booking }) {
  const st = STATUS[b.status]
  const start = parseLocal(b.start)
  const end = bookingEnd(b)
  const digits = b.phone.replace(/\D/g, "")
  return (
    <div className={cn("grid grid-cols-[4.5rem_1fr] gap-4 rounded-2xl border border-border bg-card p-4", b.status === "cancelled" && "opacity-60")}>
      <div className="border-r border-border pr-3">
        <p className="font-heading text-xl tabular-nums">{format(start, "HH:mm")}</p>
        <p className="text-xs text-muted-foreground tabular-nums">до {format(end, "HH:mm")}</p>
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{b.name}</p>
          <span className={cn("rounded-full px-2 py-0.5 text-[0.65rem] font-semibold", st.cls)}>{st.label}</span>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {b.serviceTitle} · {dur(b.duration)} · {rub(b.price)}
        </p>
        {b.comment && <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-sm">«{b.comment}»</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm" className="rounded-full bg-transparent">
            <a href={`tel:+${digits}`}>
              <Phone /> Позвонить
            </a>
          </Button>
          <Button asChild variant="outline" size="sm" className="rounded-full bg-transparent">
            <a href={`https://wa.me/${digits}`} target="_blank" rel="noreferrer">
              <MessageCircle /> Написать
            </a>
          </Button>
          {b.status === "new" && (
            <Button size="sm" className="rounded-full" onClick={() => actions.setBookingStatus(b.id, "confirmed")}>
              <Check /> Подтвердить
            </Button>
          )}
          {b.status === "confirmed" && (
            <Button size="sm" variant="secondary" className="rounded-full" onClick={() => actions.setBookingStatus(b.id, "done")}>
              <Check /> Пришла
            </Button>
          )}
          {(b.status === "new" || b.status === "confirmed") && (
            <Button
              size="sm"
              variant="ghost"
              className="rounded-full text-destructive hover:text-destructive"
              onClick={() => {
                actions.setBookingStatus(b.id, "cancelled")
                toast("Запись отменена — время снова свободно")
              }}
            >
              <X /> Отменить
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function Kpi({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 sm:p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-heading text-[1.05rem] leading-tight whitespace-nowrap tabular-nums sm:text-2xl">{value}</p>
      <p className="text-[0.7rem] text-muted-foreground">{hint}</p>
    </div>
  )
}

/* ———————————————— Позвать снова ———————————————— */

function useRepeatList() {
  const s = useAppState((st) => st)
  return useMemo(() => {
    const now = new Date()
    const byPhone = new Map<string, Booking[]>()
    for (const b of s.bookings) {
      const k = b.phone.replace(/\D/g, "")
      byPhone.set(k, [...(byPhone.get(k) ?? []), b])
    }
    const out: { last: Booking; due: Date; overdue: number }[] = []
    for (const list of byPhone.values()) {
      const hasFuture = list.some((b) => b.status !== "cancelled" && parseLocal(b.start) > now)
      if (hasFuture) continue
      const last = list.filter((b) => b.status === "done").sort((a, b) => b.start.localeCompare(a.start))[0]
      if (!last) continue
      const svc = s.services.find((x) => x.id === last.serviceId)
      if (!svc?.repeatAfterDays) continue
      const due = addDays(parseLocal(last.start), svc.repeatAfterDays)
      const overdue = differenceInCalendarDays(now, due)
      if (overdue >= -3) out.push({ last, due, overdue })
    }
    return out.sort((a, b) => b.overdue - a.overdue)
  }, [s])
}

function RepeatTab() {
  const list = useRepeatList()
  return (
    <section>
      <h2 className="font-heading text-2xl">Позвать снова</h2>
      <p className="mt-1 max-w-xl text-sm text-muted-foreground">
        Клиентки, которым пора на следующую процедуру по курсу или на повтор, — и у которых ещё нет записи. Одно касание — и готовое сообщение открыто в
        WhatsApp.
      </p>
      <div className="mt-6 space-y-2.5">
        {list.length === 0 && <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Пока никого — все записаны</p>}
        {list.map(({ last, due, overdue }) => {
          const digits = last.phone.replace(/\D/g, "")
          const text = `${last.name}, добрый день! Это ${master.masterName.split(" ")[0]}, косметолог. Подошло время для следующей процедуры «${last.serviceTitle}». Подобрать вам удобное время?`
          return (
            <div key={last.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{last.name}</p>
                <p className="text-sm text-muted-foreground">
                  {last.serviceTitle} · была {format(parseLocal(last.start), "d MMMM", { locale: ru })}
                </p>
                <p className={cn("mt-1 text-xs font-medium", overdue > 0 ? "text-clay" : "text-muted-foreground")}>
                  {overdue > 0 ? `пора ${overdue} дн. назад` : overdue === 0 ? "пора сегодня" : `пора ${format(due, "d MMMM", { locale: ru })}`}
                </p>
              </div>
              <Button asChild size="sm" className="rounded-full">
                <a href={`https://wa.me/${digits}?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">
                  <MessageCircle /> Напомнить
                </a>
              </Button>
            </div>
          )
        })}
      </div>
    </section>
  )
}

/* ———————————————— Услуги ———————————————— */

const DURATIONS = Array.from({ length: 11 }, (_, i) => 30 + i * 15)

function ServicesTab() {
  const services = useAppState((s) => s.services)
  return (
    <section>
      <h2 className="font-heading text-2xl">Услуги и цены</h2>
      <p className="mt-1 text-sm text-muted-foreground">Изменения сразу видны на сайте. Длительность — сколько времени занимает запись.</p>
      <div className="mt-6 space-y-2.5">
        {services.map((svc) => (
          <div key={svc.id} className={cn("rounded-2xl border border-border bg-card p-4", !svc.active && "opacity-60")}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">{svc.title}</p>
                <p className="text-xs text-muted-foreground">{master.categories.find((c) => c.id === svc.categoryId)?.title}</p>
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                {svc.active ? "на сайте" : "скрыта"}
                <Switch checked={svc.active} onCheckedChange={(v) => actions.updateService(svc.id, { active: v })} />
              </label>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:max-w-md">
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">Цена, ₽</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={100}
                  defaultValue={svc.price}
                  onBlur={(e) => {
                    const v = Math.max(0, Number(e.target.value) || 0)
                    if (v !== svc.price) {
                      actions.updateService(svc.id, { price: v })
                      toast.success(`${svc.title}: ${rub(v)}`)
                    }
                  }}
                  className="h-10 rounded-xl tabular-nums"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">Длительность</span>
                <Select value={String(svc.duration)} onValueChange={(v) => actions.updateService(svc.id, { duration: Number(v) })}>
                  <SelectTrigger className="h-10 w-full rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[...new Set([...DURATIONS, svc.duration])]
                      .sort((a, b) => a - b)
                      .map((d) => (
                        <SelectItem key={d} value={String(d)}>
                          {dur(d)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </label>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ———————————————— График ———————————————— */

const WEEK = [1, 2, 3, 4, 5, 6, 0]
const DAY_NAMES = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"]
const TIMES = Array.from({ length: 31 }, (_, i) => fromMin(7 * 60 + i * 30))

function HoursTab() {
  const week = useAppState((s) => s.week)
  return (
    <section>
      <h2 className="font-heading text-2xl">График работы</h2>
      <p className="mt-1 text-sm text-muted-foreground">Отдельные выходные закрываются во вкладке «Записи» — кнопкой «Закрыть день».</p>
      <div className="mt-6 divide-y divide-border rounded-2xl border border-border bg-card">
        {WEEK.map((d) => {
          const w = week[d]
          return (
            <div key={d} className="flex flex-wrap items-center gap-3 p-4">
              <Switch checked={w.enabled} onCheckedChange={(v) => actions.setWorkDay(d, { enabled: v })} aria-label={DAY_NAMES[d]} />
              <span className={cn("w-32 text-sm font-medium", !w.enabled && "text-muted-foreground")}>{DAY_NAMES[d]}</span>
              {w.enabled ? (
                <div className="ml-auto flex items-center gap-2">
                  <TimeSelect value={w.from} onChange={(v) => actions.setWorkDay(d, { from: v })} />
                  <span className="text-muted-foreground">—</span>
                  <TimeSelect value={w.to} onChange={(v) => actions.setWorkDay(d, { to: v })} />
                </div>
              ) : (
                <span className="ml-auto text-sm text-muted-foreground">выходной</span>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function TimeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-24 rounded-xl tabular-nums">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {TIMES.map((t) => (
          <SelectItem key={t} value={t} className="tabular-nums">
            {t}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/* ———————————————— Сертификаты ———————————————— */

function GiftsTab() {
  const gifts = useAppState((s) => s.gifts)
  return (
    <section>
      <h2 className="font-heading text-2xl">Сертификаты</h2>
      <p className="mt-1 text-sm text-muted-foreground">Заявки с сайта. Свяжитесь, примите оплату и отправьте открытку.</p>
      <div className="mt-6 space-y-2.5">
        {gifts.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Заявок пока нет. Попробуйте оформить сертификат на сайте — заявка появится здесь.
          </p>
        )}
        {[...gifts].reverse().map((g) => (
          <div key={g.id} className={cn("flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-4", g.status === "done" && "opacity-60")}>
            <div className="grid size-11 place-items-center rounded-xl bg-tint">
              <Gift className="size-5 text-clay" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium tabular-nums">
                {rub(g.amount)} {g.forName && <span className="font-normal text-muted-foreground">для {g.forName}</span>}
              </p>
              <p className="text-sm text-muted-foreground">
                {g.buyerName}, {g.phone} · {format(new Date(g.createdAt), "d MMM, HH:mm", { locale: ru })}
              </p>
            </div>
            {g.status === "new" ? (
              <Button size="sm" className="rounded-full" onClick={() => actions.setGiftStatus(g.id, "done")}>
                <Check /> Выдан
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">выдан</span>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
