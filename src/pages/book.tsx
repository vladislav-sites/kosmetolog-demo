import { useId, useLayoutEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router"
import { toast } from "sonner"
import { addDays, startOfDay } from "date-fns"
import { ru } from "react-day-picker/locale"
import { ArrowLeft, Check, Clock } from "lucide-react"
import { cn } from "cn"
import { master } from "@/config/master"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Consent } from "@/components/consent"
import { actions, getState, useAppState } from "@/lib/store"
import { dayKey, dur, fmtDay, getSlots, parseLocal, price } from "@/lib/time"
import { formatPhone, phoneValid } from "@/lib/phone"
import { tap, withTransition } from "@/lib/transition"

type Step = 0 | 1 | 2

export default function BookPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const state = useAppState((s) => s)
  const profile = state.profile
  const services = state.services.filter((s) => s.active)

  const pre = services.find((s) => s.id === params.get("service"))
  // ?at=2026-11-10T10:00 — из плашки «Ближайшее окно»: сразу отмечаем этот день и время, если оно ещё свободно
  const [preset] = useState(() => {
    const at = params.get("at")
    if (!pre || !at) return undefined
    const d = parseLocal(at)
    const t = at.slice(11, 16)
    return getSlots(d, pre.duration, state).includes(t) ? { date: startOfDay(d), time: t } : undefined
  })
  const [serviceId, setServiceId] = useState<string | undefined>(pre?.id)
  const [step, setStep] = useState<Step>(pre ? 1 : 0)
  const [date, setDate] = useState<Date | undefined>(preset?.date)
  const [time, setTime] = useState<string | undefined>(preset?.time)
  const sending = useRef(false)
  const uid = useId()
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [comment, setComment] = useState("")
  const [consent, setConsent] = useState(false)
  const [tried, setTried] = useState(false)

  const service = services.find((s) => s.id === serviceId)
  const today = startOfDay(new Date())
  const last = addDays(today, master.bookingHorizonDays)

  // Дни, где для выбранной услуги есть хотя бы одно окно
  const openDays = useMemo(() => {
    const set = new Set<string>()
    if (!service) return set
    for (let i = 0; i <= master.bookingHorizonDays; i++) {
      const d = addDays(today, i)
      if (getSlots(d, service.duration, state).length) set.add(dayKey(d))
    }
    return set
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service, state])

  const slots = date && service ? getSlots(date, service.duration, state) : []

  useLayoutEffect(() => {
    window.scrollTo({ top: 0 })
  }, [step])

  const submit = () => {
    if (sending.current) return // двойное касание не создаёт вторую запись
    setTried(true)
    if (!service || !date || !time || !name.trim() || !phoneValid(phone) || !consent) {
      requestAnimationFrame(() => document.querySelector("[data-error]")?.scrollIntoView({ block: "center", behavior: "smooth" }))
      return
    }
    // Пока заполняли контакты, время могло пройти или его заняли
    if (!getSlots(date, service.duration, getState()).includes(time)) {
      toast.error("Это время уже недоступно — выберите другое")
      setTime(undefined)
      goStep(1)
      return
    }
    sending.current = true
    const b = actions.addBooking({
      serviceId: service.id,
      serviceTitle: service.title,
      price: service.price,
      duration: service.duration,
      start: `${dayKey(date)}T${time}`,
      name: name.trim(),
      phone,
      comment: comment.trim() || undefined,
    })
    tap(14)
    withTransition(() => navigate(`/done/${b.id}`, { replace: true }), "push")
  }

  /** Шаги записи листаются: вперёд — новый экран въезжает справа, назад — возвращается слева */
  const goStep = (to: Step) => {
    if (to === step) return
    tap()
    withTransition(() => setStep(to), to > step ? "push" : "pop")
  }
  const back = () => (step === 0 ? navigate(-1) : goStep((step - 1) as Step))
  const STEPS = ["Процедура", "Дата и время", "Контакты"]

  return (
    <div className="mx-auto max-w-2xl bg-background px-4 pt-6 pb-36 [view-transition-name:book-sheet] sm:px-6 md:pt-12 lg:pb-20">
      <div className="flex items-center gap-3">
        <button onClick={back} className="grid size-10 place-items-center rounded-full border border-border hover:bg-muted" aria-label="Назад">
          <ArrowLeft className="size-4" />
        </button>
        <ol className="flex flex-1 gap-1.5" aria-label="Шаги записи">
          {STEPS.map((s, i) => (
            <li key={s} className="flex-1">
              <span className={cn("block h-1 rounded-full transition-colors", i <= step ? "bg-foreground" : "bg-border")} />
              <span className={cn("mt-1.5 hidden text-xs sm:block", i === step ? "font-medium" : "text-muted-foreground")}>{s}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* ——— Шаг 1: процедура ——— */}
      {step === 0 && (
        <section className="mt-8 animate-in fade-in">
          <h1 className="font-heading text-3xl sm:text-4xl">Выберите процедуру</h1>
          <p className="mt-2 text-sm text-muted-foreground">Если записываетесь впервые — начните с консультации.</p>
          <div className="mt-6 space-y-2.5">
            {services.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  tap()
                  withTransition(() => {
                    setServiceId(s.id)
                    setDate(undefined)
                    setTime(undefined)
                    setStep(1)
                  }, "push")
                }}
                className={cn(
                  "press-soft flex w-full items-center gap-4 rounded-2xl border bg-card p-4 text-left hover:border-foreground/40",
                  serviceId === s.id ? "border-foreground" : "border-border",
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 font-medium">
                    {s.title}
                    {s.featured && <span className="rounded-full bg-tint px-2 py-0.5 text-[0.65rem] font-semibold tracking-wide uppercase">для начала</span>}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="size-3.5" /> {dur(s.duration)}
                  </span>
                </span>
                <span className="text-sm font-semibold whitespace-nowrap tabular-nums">{price(s.price, s.priceFrom)}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ——— Шаг 2: дата и время ——— */}
      {step === 1 && service && (
        <section className="mt-8 animate-in fade-in">
          <SelectedService title={service.title} meta={`${dur(service.duration)} · ${price(service.price, service.priceFrom)}`} onChange={() => goStep(0)} />
          <h1 className="mt-8 font-heading text-3xl sm:text-4xl">Когда вам удобно?</h1>
          <div className="mt-5 rounded-2xl border border-border bg-card p-3 sm:p-5">
            <Calendar
              mode="single"
              locale={ru}
              weekStartsOn={1}
              selected={date}
              onSelect={(d) => {
                setDate(d)
                setTime(undefined)
              }}
              startMonth={today}
              endMonth={last}
              disabled={(d) => !openDays.has(dayKey(d))}
              className="mx-auto bg-transparent p-0 [--cell-size:--spacing(10)] sm:[--cell-size:--spacing(12)]"
            />
          </div>

          {date && (
            <div className="mt-6 animate-in fade-in">
              <p className="text-sm font-medium first-letter:uppercase">{fmtDay(date)}</p>
              {slots.length ? (
                <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {slots.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTime(t)}
                      aria-pressed={time === t}
                      className={cn(
                        "press h-11 rounded-xl border text-sm tabular-nums",
                        time === t ? "border-foreground bg-foreground text-background" : "border-border bg-card hover:border-foreground/40",
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">На этот день свободных окон нет.</p>
              )}
            </div>
          )}
          {!date && <p className="mt-4 text-sm text-muted-foreground">Выберите день — покажу свободное время.</p>}

          <BottomBar>
            <Button size="lg" className="h-12 w-full rounded-full" disabled={!date || !time} onClick={() => goStep(2)}>
              {date && time ? `Дальше · ${time}` : "Выберите время"}
            </Button>
          </BottomBar>
        </section>
      )}

      {/* ——— Шаг 3: контакты ——— */}
      {step === 2 && service && date && time && (
        <section className="mt-8 animate-in fade-in">
          <SelectedService
            title={service.title}
            meta={`${fmtDay(date)}, ${time} · ${dur(service.duration)}`}
            onChange={() => goStep(1)}
            changeLabel="Изменить время"
          />
          <h1 className="mt-8 font-heading text-3xl sm:text-4xl">Как с вами связаться?</h1>
          <div className="mt-6 space-y-5">
            <Field id={`${uid}-name`} label="Имя" error={tried && !name.trim() ? "Как к вам обращаться?" : undefined}>
              <Input
                id={`${uid}-name`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="given-name"
                placeholder="Анна"
                className="h-12 rounded-xl bg-card text-base"
              />
            </Field>
            <Field id={`${uid}-phone`} label="Телефон" error={tried && !phoneValid(phone) ? "Проверьте номер" : undefined}>
              <Input
                id={`${uid}-phone`}
                type="tel"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                inputMode="tel"
                autoComplete="tel"
                placeholder="+7 (900) 000-00-00"
                className="h-12 rounded-xl bg-card text-base tabular-nums"
              />
            </Field>
            <Field id={`${uid}-comment`} label="Комментарий" hint="необязательно">
              <Textarea
                id={`${uid}-comment`}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Например: первый раз, хочу разобраться с высыпаниями"
                className="min-h-24 rounded-xl bg-card text-base"
              />
            </Field>
            <Consent checked={consent} onChange={setConsent} error={tried && !consent} />
          </div>

          <div className="mt-8 rounded-2xl border border-border bg-card p-5 text-sm">
            <Row k="Процедура" v={service.title} />
            <Row k="Когда" v={`${fmtDay(date)}, ${time}`} />
            <Row k="Где" v={profile.address} />
            <Row k="Стоимость" v={price(service.price, service.priceFrom)} strong />
            <p className="mt-3 text-xs text-muted-foreground">Оплата на месте. Если планы поменяются — предупредите, пожалуйста, за сутки.</p>
          </div>

          <BottomBar>
            <Button size="lg" className="h-12 w-full rounded-full" onClick={submit}>
              <Check /> Записаться
            </Button>
          </BottomBar>
        </section>
      )}
    </div>
  )
}

function SelectedService({ title, meta, onChange, changeLabel = "Изменить" }: { title: string; meta: string; onChange: () => void; changeLabel?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-tint/70 px-4 py-3">
      <span className="min-w-0 flex-1">
        <span className="block leading-snug font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground first-letter:uppercase">{meta}</span>
      </span>
      <button onClick={onChange} className="max-w-[7rem] shrink-0 text-right text-sm leading-snug font-medium underline underline-offset-4">
        {changeLabel}
      </button>
    </div>
  )
}

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="flex items-baseline gap-2">
        {label}
        {hint && <span className="text-xs font-normal text-muted-foreground">{hint}</span>}
      </Label>
      {children}
      {error && (
        <p data-error className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border py-2 last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className={cn("text-right first-letter:uppercase", strong && "font-semibold")}>{v}</span>
    </div>
  )
}

function BottomBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] lg:static lg:mt-8 lg:p-0">
      <div className="glass lg-unglass mx-auto max-w-2xl rounded-[1.75rem] p-2 lg:p-0">{children}</div>
    </div>
  )
}
