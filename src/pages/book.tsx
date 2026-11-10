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
  // Можно выбрать несколько процедур на один визит — время и стоимость складываются
  const [serviceIds, setServiceIds] = useState<string[]>(pre ? [pre.id] : [])
  const [step, setStep] = useState<Step>(pre ? 1 : 0)
  const [date, setDate] = useState<Date | undefined>(preset?.date)
  const [time, setTime] = useState<string | undefined>(preset?.time)
  const sending = useRef(false)
  const slotsRef = useRef<HTMLDivElement>(null)
  const uid = useId()
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [comment, setComment] = useState("")
  const [consent, setConsent] = useState(false)
  const [tried, setTried] = useState(false)

  // в порядке списка на сайте, а не в порядке нажатий
  const chosen = services.filter((s) => serviceIds.includes(s.id))
  const total = chosen.reduce((m, s) => m + s.duration, 0)
  const sum = chosen.reduce((m, s) => m + s.price, 0)
  const sumFrom = chosen.some((s) => s.priceFrom)
  const titles = chosen.map((s) => s.title).join(" + ")
  const today = startOfDay(new Date())
  const last = addDays(today, master.bookingHorizonDays)

  // Дни, где для выбранных процедур есть хотя бы одно окно
  const openDays = useMemo(() => {
    const set = new Set<string>()
    if (!total) return set
    for (let i = 0; i <= master.bookingHorizonDays; i++) {
      const d = addDays(today, i)
      if (getSlots(d, total, state).length) set.add(dayKey(d))
    }
    return set
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, state])

  const slots = date && total ? getSlots(date, total, state) : []

  useLayoutEffect(() => {
    window.scrollTo({ top: 0 })
  }, [step])

  const toggle = (id: string) => {
    tap()
    setServiceIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
    // длительность поменялась — прежнее время могло перестать подходить
    setDate(undefined)
    setTime(undefined)
  }

  const pickDate = (d: Date | undefined) => {
    setDate(d)
    setTime(undefined)
    // окна появляются ниже календаря — на телефоне их не видно, поэтому подкручиваем к ним
    if (d) requestAnimationFrame(() => slotsRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }))
  }

  const submit = () => {
    if (sending.current) return // двойное касание не создаёт вторую запись
    setTried(true)
    if (!chosen.length || !date || !time || !name.trim() || !phoneValid(phone) || !consent) {
      requestAnimationFrame(() => document.querySelector("[data-error]")?.scrollIntoView({ block: "center", behavior: "smooth" }))
      return
    }
    // Пока заполняли контакты, время могло пройти или его заняли
    if (!getSlots(date, total, getState()).includes(time)) {
      toast.error("Это время уже недоступно — выберите другое")
      setTime(undefined)
      goStep(1)
      return
    }
    sending.current = true
    const b = actions.addBooking({
      serviceId: chosen[0].id,
      serviceTitle: titles,
      price: sum,
      priceFrom: sumFrom || undefined,
      items: chosen.length > 1 ? chosen.map((s) => ({ serviceId: s.id, title: s.title, price: s.price, duration: s.duration })) : undefined,
      duration: total,
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
          <h1 className="font-heading text-3xl sm:text-4xl">Выберите процедуры</h1>
          <p className="mt-2 text-sm text-muted-foreground">Можно отметить несколько — время и стоимость сложатся.</p>
          <div className="mt-6 space-y-2.5">
            {services.map((s) => {
              const on = serviceIds.includes(s.id)
              return (
                <button
                  key={s.id}
                  role="checkbox"
                  aria-checked={on}
                  aria-label={`${s.title}, ${dur(s.duration)}, ${price(s.price, s.priceFrom)}`}
                  onClick={() => toggle(s.id)}
                  className={cn(
                    "press-soft flex w-full items-center gap-3.5 rounded-2xl border p-4 text-left transition-colors",
                    on ? "border-foreground bg-tint/50" : "border-border bg-card hover:border-foreground/40",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-full border transition-colors",
                      on ? "border-foreground bg-foreground text-background" : "border-foreground/30",
                    )}
                  >
                    {on && <Check className="size-3.5" strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block leading-snug font-medium">{s.title}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="size-3.5" /> {dur(s.duration)}
                      </span>
                      {/* консультация: не плашка, а тихая подпись */}
                      {s.featured && <span className="text-clay">с неё лучше начать</span>}
                    </span>
                  </span>
                  <span className="text-sm font-semibold whitespace-nowrap tabular-nums">{price(s.price, s.priceFrom)}</span>
                </button>
              )
            })}
          </div>

          <BottomBar>
            <Button size="lg" className="h-12 w-full rounded-full" disabled={!chosen.length} onClick={() => goStep(1)}>
              {/* без счётчика процедур: на 320 px строка с «от» иначе не помещается */}
              {chosen.length ? `Дальше · ${dur(total)} · ${price(sum, sumFrom)}` : "Выберите процедуру"}
            </Button>
          </BottomBar>
        </section>
      )}

      {/* ——— Шаг 2: дата и время ——— */}
      {step === 1 && chosen.length > 0 && (
        <section className="mt-8 animate-in fade-in">
          <SelectedService title={titles} meta={`${dur(total)} · ${price(sum, sumFrom)}`} onChange={() => goStep(0)} changeLabel={chosen.length > 1 ? "Изменить" : "Изменить или добавить"} />
          <h1 className="mt-8 font-heading text-3xl sm:text-4xl">Когда вам удобно?</h1>
          <div className="mt-5 rounded-2xl border border-border bg-card p-3 sm:p-5">
            <Calendar
              mode="single"
              locale={ru}
              weekStartsOn={1}
              selected={date}
              onSelect={pickDate}
              startMonth={today}
              endMonth={last}
              disabled={(d) => !openDays.has(dayKey(d))}
              className="mx-auto bg-transparent p-0 [--cell-size:--spacing(10)] sm:[--cell-size:--spacing(12)]"
            />
          </div>

          {date && (
            // scroll-mb: снизу висит панель с кнопкой — окна не должны прятаться под ней
            <div ref={slotsRef} className="mt-6 scroll-mt-24 scroll-mb-28 animate-in fade-in lg:scroll-mb-6">
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
      {step === 2 && chosen.length > 0 && date && time && (
        <section className="mt-8 animate-in fade-in">
          <SelectedService
            title={titles}
            meta={`${fmtDay(date)}, ${time} · ${dur(total)}`}
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
            {chosen.length > 1 ? (
              <>
                <p className="border-b border-border py-2 text-muted-foreground">Процедуры</p>
                {chosen.map((s) => (
                  <Row key={s.id} k={s.title} v={`${dur(s.duration)} · ${price(s.price, s.priceFrom)}`} />
                ))}
              </>
            ) : (
              <Row k="Процедура" v={titles} />
            )}
            <Row k="Когда" v={`${fmtDay(date)}, ${time}${chosen.length > 1 ? ` · ${dur(total)}` : ""}`} />
            <Row k="Где" v={profile.address} />
            <Row k={chosen.length > 1 ? "Итого" : "Стоимость"} v={price(sum, sumFrom)} strong />
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
      {/* без заглавной первой буквы: иначе «От 7 000 ₽» и «Ул. Островского» */}
      <span className={cn("text-right", strong && "font-semibold")}>{v}</span>
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
