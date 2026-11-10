import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router"
import { addDays, differenceInCalendarDays, format, isSameDay, isToday, startOfDay } from "date-fns"
import { ru } from "date-fns/locale"
import { toast } from "sonner"
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BellRing,
  CalendarDays,
  Check,
  Clock,
  Gift,
  LockKeyhole,
  MessageCircle,
  Palette,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react"
import { cn } from "cn"
import { master } from "@/config/master"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { NativeSelect } from "@/components/ui/native-select"
import { Monogram } from "@/components/bits"
import { DURATIONS, ServiceEditor } from "@/components/service-editor"
import { tap } from "@/lib/transition"
import { cancelSave, flushSave, isSavePending, scheduleSave, useSaveKey, useSavePending } from "@/lib/autosave"
import { ProfileEditor } from "@/components/profile-editor"
import { BookingEditor } from "@/components/booking-editor"
import type { Category, Service } from "@/config/types"
import { actions, getState, GIFT_MAX, GIFT_MIN, useAppState, type Booking, type BookingStatus } from "@/lib/store"
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
  { id: "day", label: "Записи", short: "Записи", icon: CalendarDays },
  { id: "services", label: "Процедуры", short: "Процедуры", icon: Sparkles },
  { id: "page", label: "Моя страница", short: "Страница", icon: Palette },
  { id: "hours", label: "График", short: "График", icon: Clock },
  { id: "gifts", label: "Сертификаты", short: "Подарки", icon: Gift },
] as const
type TabId = (typeof TABS)[number]["id"]

function Cabinet() {
  const [tab, setTab] = useState<TabId>("day")
  const s = useAppState((st) => st)
  const newCount = s.bookings.filter((b) => b.status === "new" && parseLocal(b.start) >= startOfDay(new Date())).length
  const giftCount = s.gifts.filter((g) => g.status === "new").length
  const countOf = (id: TabId) => (id === "day" ? newCount : id === "gifts" ? giftCount : 0)

  /** Смена вкладки — просто переключение, без перелистывания (так попросил пользователь) */
  const go = (id: TabId) => {
    if (id === tab) return
    tap()
    setTab(id)
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="glass-bar sticky top-0 z-30 [view-transition-name:site-header]">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4 sm:px-6">
          <Link to="/" className="grid size-9 place-items-center rounded-full border border-border hover:bg-muted" aria-label="На сайт">
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0 leading-tight">
            <p className="text-[0.7rem] text-muted-foreground">Кабинет</p>
            <p className="truncate font-heading text-[1.05rem]">{s.profile.name}</p>
          </div>
          {master.demo && <ResetDemoButton />}
        </div>
        {/* на компьютере вкладки сверху */}
        <nav className="mx-auto hidden max-w-5xl gap-1 px-6 pb-2 lg:flex">
          {TABS.map((t) => {
            const count = countOf(t.id)
            return (
              <button
                key={t.id}
                onClick={() => go(t.id)}
                className={cn(
                  "press flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm transition-colors",
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

      <main className="mx-auto max-w-5xl px-4 pt-6 pb-32 [view-transition-name:page] sm:px-6 md:pt-10 lg:pb-10">
        {tab === "day" && <DayTab />}
        {tab === "services" && <ServicesTab />}
        {tab === "hours" && <HoursTab />}
        {tab === "gifts" && <GiftsTab />}
        {tab === "page" && <ProfileEditor />}
      </main>

      {/* на телефоне вкладки снизу — под большим пальцем, как на сайте */}
      <nav
        aria-label="Разделы кабинета"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] lg:hidden"
      >
        <div className="glass pointer-events-auto mx-auto grid max-w-md grid-cols-5 rounded-[1.75rem] p-1.5 [view-transition-name:tabbar]">
          {TABS.map((t) => {
            const count = countOf(t.id)
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => go(t.id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "press relative flex min-w-0 flex-col items-center gap-0.5 rounded-[1.3rem] py-2 text-[0.64rem] text-muted-foreground transition-colors",
                  active && "bg-foreground/10 font-semibold text-foreground",
                )}
              >
                <t.icon className="size-5" strokeWidth={1.7} />
                <span className="max-w-full truncate text-[0.6rem] tracking-[-0.01em] min-[360px]:text-[0.64rem]">{t.short}</span>
                {count > 0 && (
                  <span className="absolute top-1 right-[calc(50%-1.15rem)] min-w-4 rounded-full bg-clay px-1 text-center text-[0.6rem] leading-4 font-semibold text-white tabular-nums">
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

/** «Сбросить демо» стирает всё — поэтому в два касания: первое спрашивает, второе сбрасывает */
function ResetDemoButton() {
  const [asking, setAsking] = useState(false)
  useEffect(() => {
    if (!asking) return
    const t = window.setTimeout(() => setAsking(false), 4000)
    return () => window.clearTimeout(t)
  }, [asking])

  if (!asking)
    return (
      <Button variant="ghost" size="sm" aria-label="Сбросить демо-данные" className="ml-auto shrink-0 rounded-full text-muted-foreground" onClick={() => setAsking(true)}>
        <RotateCcw /> <span className="hidden min-[400px]:inline">Сбросить демо</span>
      </Button>
    )
  return (
    <div className="ml-auto flex shrink-0 items-center gap-1 animate-in fade-in">
      <Button
        variant="destructive"
        size="sm"
        className="rounded-full"
        onClick={() => {
          setAsking(false)
          actions.resetDemo()
          toast.success("Демо-данные сброшены")
        }}
      >
        Да, сбросить всё
      </Button>
      <Button variant="ghost" size="icon-sm" aria-label="Не сбрасывать" className="rounded-full" onClick={() => setAsking(false)}>
        <X />
      </Button>
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
  const [adding, setAdding] = useState<Date | null>(null)
  // столько же дней, сколько открыто для записи на сайте — иначе дальние записи не видно;
  // мастер может вписать запись и дальше — тогда лента дотягивается до неё
  const furthest = s.bookings
    .filter((b) => b.status !== "cancelled")
    .reduce((m, b) => Math.max(m, differenceInCalendarDays(parseLocal(b.start), new Date())), 0)
  const days = Array.from({ length: Math.max(master.bookingHorizonDays, furthest) + 1 }, (_, i) => addDays(startOfDay(new Date()), i))

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
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-2xl">Записи</h2>
        <Button className="rounded-full" onClick={() => setAdding(day)}>
          <Plus /> Добавить запись
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Kpi label="Сегодня" value={String(todayCount)} hint="записей" />
        <Kpi label="7 дней" value={rub(weekRevenue)} hint="ожидается" />
        <Kpi
          label="Новые"
          value={String(s.bookings.filter((b) => b.status === "new" && parseLocal(b.start) >= startOfDay(new Date())).length)}
          hint="подтвердить"
        />
      </div>

      <div className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0">
        {days.map((d) => {
          const n = s.bookings.filter((b) => b.status !== "cancelled" && isSameDay(parseLocal(b.start), d)).length
          const off = !s.week[d.getDay()].enabled || s.daysOff.includes(dayKey(d))
          const active = isSameDay(d, day)
          return (
            <button
              key={d.toISOString()}
              data-day-active={active || undefined}
              onClick={() => setDay(d)}
              className={cn(
                "flex w-14 shrink-0 flex-col items-center rounded-2xl border py-2.5 transition-colors",
                active ? "border-foreground bg-foreground text-background" : "border-border bg-card hover:border-foreground/40",
                off && !active && "opacity-50",
              )}
            >
              <span className="text-[0.65rem] uppercase">{format(d, "EEEEEE", { locale: ru })}</span>
              <span className="text-lg leading-tight font-semibold tabular-nums">{format(d, "d")}</span>
              <span className={cn("mt-0.5 size-1.5 rounded-full", n ? (active ? "bg-background" : "bg-clay") : "bg-transparent")} />
            </button>
          )
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold first-letter:uppercase">{format(day, "d MMMM, EEEE", { locale: ru })}</h2>
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

      <BookingEditor
        day={adding}
        onClose={() => setAdding(null)}
        onAdded={(d) => {
          setDay(startOfDay(d))
          // лента дней прокручивается к выбранному дню
          requestAnimationFrame(() => document.querySelector("[data-day-active]")?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" }))
        }}
      />
    </section>
  )
}

function BookingCard({ b }: { b: Booking }) {
  const st = STATUS[b.status]
  const start = parseLocal(b.start)
  const end = bookingEnd(b)
  const digits = b.phone.replace(/\D/g, "")
  // Отмена — только после «Да, отменить»: одно касание мимо не должно снимать клиентку с записи
  const [asking, setAsking] = useState(false)

  const cancel = () => {
    const prev = b.status
    setAsking(false)
    actions.setBookingStatus(b.id, "cancelled")
    toast("Запись отменена — время снова свободно", {
      action: { label: "Вернуть", onClick: () => actions.setBookingStatus(b.id, prev) },
    })
  }

  /** Вернуть отменённую — если за это время на её место никто не записался */
  const restore = () => {
    const busy = getState().bookings.some(
      (x) => x.id !== b.id && x.status !== "cancelled" && parseLocal(x.start) < end && bookingEnd(x) > start,
    )
    if (busy) {
      toast.error("Это время уже занято другой записью — вернуть не получится")
      return
    }
    actions.setBookingStatus(b.id, "confirmed")
    toast.success(`Запись вернулась: ${b.name}, ${format(start, "HH:mm")}`)
  }

  return (
    <div className={cn("grid grid-cols-[4.5rem_1fr] gap-4 rounded-2xl border border-border bg-card p-4", b.status === "cancelled" && "opacity-60")}>
      <div className="border-r border-border pr-3">
        <p className="text-lg font-semibold tabular-nums">{format(start, "HH:mm")}</p>
        <p className="text-xs text-muted-foreground tabular-nums">до {format(end, "HH:mm")}</p>
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{b.name}</p>
          <span className={cn("rounded-full px-2 py-0.5 text-[0.65rem] font-semibold", st.cls)}>{st.label}</span>
          {b.source === "master" && <span className="text-[0.7rem] text-muted-foreground">добавлена вами</span>}
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {b.serviceTitle} · {dur(b.duration)} · {b.priceFrom && "от "}
          {rub(b.price)}
          {!digits && " · без телефона"}
        </p>
        {b.comment && <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-sm">«{b.comment}»</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          {digits && (
            <>
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
            </>
          )}
          {b.status === "new" && (
            <Button size="sm" className="rounded-full" onClick={() => actions.setBookingStatus(b.id, "confirmed")}>
              <Check /> Подтвердить
            </Button>
          )}
          {/* «Пришла» — только когда время визита наступило: отметить завтрашний визит нельзя */}
          {b.status === "confirmed" && start <= new Date() && (
            <Button size="sm" variant="secondary" className="rounded-full" onClick={() => actions.setBookingStatus(b.id, "done")}>
              <Check /> Пришла
            </Button>
          )}
          {(b.status === "new" || b.status === "confirmed") && !asking && (
            <Button size="sm" variant="ghost" className="rounded-full text-destructive hover:text-destructive" onClick={() => setAsking(true)}>
              <X /> Отменить
            </Button>
          )}
          {/* «Пришла» нажали по ошибке — вернуть в подтверждённые */}
          {b.status === "done" && (
            <Button size="sm" variant="ghost" className="rounded-full text-muted-foreground" onClick={() => actions.setBookingStatus(b.id, "confirmed")}>
              <RotateCcw /> Ещё не пришла
            </Button>
          )}
          {b.status === "cancelled" && (
            <Button size="sm" variant="outline" className="rounded-full bg-transparent" onClick={restore}>
              <RotateCcw /> Вернуть запись
            </Button>
          )}
        </div>

        {asking && (
          <div role="alertdialog" aria-label="Подтвердите отмену" className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3 animate-in fade-in">
            {/* имя — отдельно, без склонения: клиентки пишут его как угодно */}
            <p className="text-sm font-medium">Отменить запись?</p>
            <p className="text-sm">
              {b.name}, {format(start, "HH:mm")} · {b.serviceTitle}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">Время снова станет свободным для записи на сайте.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="destructive" className="rounded-full" onClick={cancel}>
                Да, отменить
              </Button>
              <Button size="sm" variant="outline" className="rounded-full bg-transparent" autoFocus onClick={() => setAsking(false)}>
                Нет, оставить
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Kpi({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 sm:p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-[1.05rem] leading-tight font-semibold whitespace-nowrap tabular-nums sm:text-xl">{value}</p>
      <p className="text-[0.7rem] text-muted-foreground">{hint}</p>
    </div>
  )
}

/* ———————————————— Услуги ———————————————— */

function ServicesTab() {
  const services = useAppState((s) => s.services)
  const categories = useAppState((s) => s.categories)
  const [editing, setEditing] = useState<Service | null | undefined>(undefined)
  const [renaming, setRenaming] = useState<string | null>(null)

  const groups = [
    ...categories.map((c) => ({ cat: c as Category | null, items: services.filter((s) => s.categoryId === c.id) })),
    { cat: null, items: services.filter((s) => !categories.some((c) => c.id === s.categoryId)) },
  ].filter((g) => g.cat || g.items.length)

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl">Процедуры и цены</h2>
          <p className="mt-1 text-sm text-muted-foreground">Всё сохраняется само и сразу видно на сайте. Длительность — сколько времени занимает запись.</p>
          <AutosaveStatus />
        </div>
        <Button className="rounded-full" onClick={() => setEditing(null)}>
          <Plus /> Новая процедура
        </Button>
      </div>

      <div className="mt-6 space-y-8">
        {groups.map(({ cat, items }) => (
          <div key={cat?.id ?? "none"}>
            <div className="mb-2.5 flex min-h-9 items-center gap-2">
              {cat && renaming === cat.id ? (
                <Input
                  autoFocus
                  defaultValue={cat.title}
                  aria-label="Название раздела"
                  className="h-9 max-w-xs rounded-xl"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur()
                    if (e.key === "Escape") setRenaming(null)
                  }}
                  onBlur={(e) => {
                    const v = e.target.value.trim()
                    if (v && v !== cat.title) actions.updateCategory(cat.id, { title: v })
                    setRenaming(null)
                  }}
                />
              ) : (
                <>
                  <h3 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">{cat?.title ?? "Без раздела"}</h3>
                  {cat && (
                    <button onClick={() => setRenaming(cat.id)} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`Переименовать раздел «${cat.title}»`}>
                      <Pencil className="size-3.5" />
                    </button>
                  )}
                  {cat && items.length === 0 && (
                    <button
                      onClick={() => actions.deleteCategory(cat.id) && toast(`Раздел «${cat.title}» удалён`)}
                      className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                      aria-label={`Удалить пустой раздел «${cat.title}»`}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </>
              )}
            </div>
            {items.length === 0 && <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">В разделе пока нет процедур</p>}
            <div className="space-y-2.5">
              {items.map((svc, i) => (
                <ServiceCard key={svc.id} svc={svc} first={i === 0} last={i === items.length - 1} onEdit={() => setEditing(svc)} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <ServiceEditor service={editing} onClose={() => setEditing(undefined)} />
    </section>
  )
}

function ServiceCard({ svc, first, last, onEdit }: { svc: Service; first: boolean; last: boolean; onEdit: () => void }) {
  return (
          <div className={cn("rounded-2xl border border-border bg-card p-4", !svc.active && "opacity-60")}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">
                  {svc.title}
                  {svc.featured && <span className="ml-2 rounded-full bg-tint px-2 py-0.5 align-middle text-[0.65rem] font-semibold tracking-wide uppercase">консультация</span>}
                </p>
                {svc.short && <p className="mt-0.5 text-xs text-muted-foreground">{svc.short}</p>}
              </div>
              <label className="flex shrink-0 items-center gap-2 text-xs whitespace-nowrap text-muted-foreground">
                {svc.active ? "на сайте" : "скрыта"}
                <Switch checked={svc.active} onCheckedChange={(v) => actions.updateService(svc.id, { active: v })} aria-label={`Показывать «${svc.title}» на сайте`} />
              </label>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:max-w-md">
              <PriceField svc={svc} />
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">Длительность</span>
                <NativeSelect
                  value={String(svc.duration)}
                  onChange={(e) => actions.updateService(svc.id, { duration: Number(e.target.value) })}
                  aria-label={`Длительность «${svc.title}»`}
                >
                  {[...new Set([...DURATIONS, svc.duration])]
                    .sort((a, b) => a - b)
                    .map((d) => (
                      <option key={d} value={d}>
                        {dur(d)}
                      </option>
                    ))}
                </NativeSelect>
              </label>
            </div>
            <div className="mt-3 flex items-center gap-1">
              <Button variant="outline" size="sm" className="rounded-full bg-transparent" onClick={onEdit}>
                <Pencil /> Изменить
              </Button>
              <Button variant="ghost" size="icon-sm" className="ml-auto rounded-full" disabled={first} onClick={() => actions.moveService(svc.id, -1)} aria-label="Выше">
                <ArrowUp />
              </Button>
              <Button variant="ghost" size="icon-sm" className="rounded-full" disabled={last} onClick={() => actions.moveService(svc.id, 1)} aria-label="Ниже">
                <ArrowDown />
              </Button>
            </div>
          </div>
  )
}

/**
 * Цена процедуры: сохраняется сама через секунду после ввода, при уходе с поля и при сворачивании
 * приложения (`lib/autosave.ts`). Пустое поле не сохраняется — бесплатно = явный 0.
 */
function PriceField({ svc }: { svc: Service }) {
  const key = useSaveKey()
  const [v, setV] = useState(String(svc.price))
  const [justSaved, setJustSaved] = useState(false)
  const focused = useRef(false)

  // цену поменяли не отсюда (редактор процедуры, «Сбросить демо») — показываем новую, если сейчас не печатают
  useEffect(() => {
    if (!focused.current && !isSavePending(key)) setV(String(svc.price))
  }, [svc.price, key])

  // «✓ сохранено» у поля гаснет через пару секунд
  useEffect(() => {
    if (!justSaved) return
    const t = window.setTimeout(() => setJustSaved(false), 2000)
    return () => window.clearTimeout(t)
  }, [justSaved])

  const save = (raw: string) => {
    if (raw.trim() === "") return
    const n = Math.max(0, Math.round(Number(raw)) || 0)
    const cur = getState().services.find((s) => s.id === svc.id)
    if (!cur || n === cur.price) return
    actions.updateService(svc.id, { price: n })
    setJustSaved(true)
  }

  return (
    <label className="space-y-1">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        Цена, ₽
        {justSaved && <span className="text-emerald-700 animate-in fade-in dark:text-emerald-400">✓ сохранено</span>}
      </span>
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        step={100}
        value={v}
        onFocus={() => (focused.current = true)}
        onChange={(e) => {
          const raw = e.target.value
          setV(raw)
          setJustSaved(false)
          if (raw.trim() === "") cancelSave(key)
          else scheduleSave(key, () => save(raw))
        }}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        onBlur={() => {
          focused.current = false
          flushSave(key)
          // стёрла и ушла — возвращаем сохранённую цену, а не ставим «Бесплатно»
          if (v.trim() === "") setV(String(getState().services.find((s) => s.id === svc.id)?.price ?? svc.price))
        }}
        className="h-10 rounded-xl tabular-nums"
      />
    </label>
  )
}

/**
 * Номинал сертификата — сохраняется так же, как цена. Сумма вне диапазона не сохраняется:
 * пока печатает — тихая подсказка, ушла с поля — возвращаем прежнюю сумму и говорим почему.
 */
function AmountField({ index, amount }: { index: number; amount: number }) {
  const key = useSaveKey()
  const [v, setV] = useState(String(amount))
  const focused = useRef(false)
  const valid = (raw: string) => {
    const n = Number(raw.replace(/\s/g, ""))
    return raw.trim() !== "" && Number.isFinite(n) && n >= GIFT_MIN && n <= GIFT_MAX
  }

  useEffect(() => {
    if (!focused.current && !isSavePending(key)) setV(String(amount))
  }, [amount, key])

  const save = (raw: string) => {
    const n = Number(raw.replace(/\s/g, ""))
    if (n !== getState().giftAmounts[index]) actions.setGiftAmount(index, n)
  }

  return (
    <label className="min-w-0 space-y-1">
      <span className="text-xs text-muted-foreground">Номинал {index + 1}, ₽</span>
      <Input
        inputMode="numeric"
        value={v}
        aria-label={`Номинал ${index + 1}, рублей`}
        aria-invalid={!valid(v) || undefined}
        onFocus={() => (focused.current = true)}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^\d\s]/g, "")
          setV(raw)
          if (valid(raw)) scheduleSave(key, () => save(raw))
          else cancelSave(key)
        }}
        onBlur={() => {
          focused.current = false
          flushSave(key)
          if (!valid(v)) {
            const cur = getState().giftAmounts[index]
            setV(String(cur))
            toast.error(`Номинал ${index + 1}: сумма от ${rub(GIFT_MIN)} до ${rub(GIFT_MAX)}, осталась прежняя — ${rub(cur)}`)
          }
        }}
        className="h-10 rounded-xl tabular-nums"
      />
    </label>
  )
}

/** Строка под заголовком вкладки: как на «Моей странице» */
function AutosaveStatus() {
  const pending = useSavePending()
  return (
    <p role="status" aria-live="polite" className={cn("mt-2 text-xs font-medium", pending ? "text-muted-foreground" : "text-emerald-700 dark:text-emerald-400")}>
      {pending ? "Сохраняю…" : "✓ Всё сохранено — уже на сайте"}
    </p>
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
                  {/* конец не раньше начала — иначе день молча пропадает из записи */}
                  <TimeSelect label={`${DAY_NAMES[d]}: начало`} value={w.from} disable={(t) => t >= w.to} onChange={(v) => actions.setWorkDay(d, { from: v })} />
                  <span className="text-muted-foreground">—</span>
                  <TimeSelect label={`${DAY_NAMES[d]}: конец`} value={w.to} disable={(t) => t <= w.from} onChange={(v) => actions.setWorkDay(d, { to: v })} />
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

function TimeSelect({ value, onChange, label, disable }: { value: string; onChange: (v: string) => void; label: string; disable: (t: string) => boolean }) {
  return (
    <NativeSelect value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} wrapperClassName="w-24" className="h-9 tabular-nums">
      {TIMES.map((t) => (
        <option key={t} value={t} disabled={t !== value && disable(t)}>
          {t}
        </option>
      ))}
    </NativeSelect>
  )
}

/* ———————————————— Сертификаты ———————————————— */

function GiftsTab() {
  const gifts = useAppState((s) => s.gifts)
  const amounts = useAppState((s) => s.giftAmounts)
  return (
    <section>
      <h2 className="font-heading text-2xl">Сертификаты</h2>

      <div className="mt-5 rounded-2xl border border-border bg-card p-4">
        <p className="font-medium">Номиналы на сайте</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Три суммы, из которых выбирают покупатели. Любая сумма от {rub(GIFT_MIN)} до {rub(GIFT_MAX)}.
        </p>
        <AutosaveStatus />
        <div className="mt-3 grid grid-cols-3 gap-2 sm:max-w-md">
          {amounts.map((a, i) => (
            <AmountField key={i} index={i} amount={a} />
          ))}
        </div>
      </div>

      <p className="mt-8 font-medium">Заявки</p>
      <p className="mt-0.5 text-sm text-muted-foreground">Свяжитесь, примите оплату и отправьте открытку.</p>
      <div className="mt-4 space-y-2.5">
        {gifts.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Заявок пока нет. Попробуйте оформить сертификат на сайте — заявка появится здесь.
          </p>
        )}
        {[...gifts].reverse().map((g) => (
          <div key={g.id} className={cn("flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-border bg-card p-4", g.status === "done" && "opacity-60")}>
            <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-tint">
              <Gift className="size-5 text-clay" />
            </div>
            {/* min-w: на узком экране кнопка уходит на свою строку, а не сжимает текст */}
            <div className="min-w-[11rem] flex-1">
              <p className="font-medium tabular-nums">{rub(g.amount)}</p>
              {g.forName && <p className="text-sm break-words">Кому: {g.forName}</p>}
              <p className="text-sm text-muted-foreground">
                {g.buyerName}, <span className="whitespace-nowrap">{g.phone}</span> ·{" "}
                <span className="whitespace-nowrap">{format(new Date(g.createdAt), "d MMM, HH:mm", { locale: ru })}</span>
              </p>
            </div>
            {g.status === "new" ? (
              <Button size="sm" className="rounded-full" onClick={() => actions.setGiftStatus(g.id, "done")}>
                <Check /> Выдан
              </Button>
            ) : (
              // нажала «Выдан» по ошибке — можно вернуть в новые
              <Button size="sm" variant="ghost" className="rounded-full text-muted-foreground" onClick={() => actions.setGiftStatus(g.id, "new")}>
                <RotateCcw /> Не выдан
              </Button>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
