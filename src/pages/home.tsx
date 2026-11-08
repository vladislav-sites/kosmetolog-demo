import { useMemo } from "react"
import { Link } from "react-router"
import { addDays, isToday, isTomorrow } from "date-fns"
import { ArrowRight, Gift, MapPin, Sparkles } from "lucide-react"
import { master } from "@/config/master"
import { Button } from "@/components/ui/button"
import { SectionTitle, ServiceRow } from "@/components/bits"
import { useAppState } from "@/lib/store"
import { fmtDayShort, getSlots, plural, price } from "@/lib/time"

const DAYS = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"]

export default function HomePage() {
  const s = useAppState((st) => st)
  const consult = s.services.find((x) => x.featured && x.active)
  const services = s.services.filter((x) => x.active && !x.featured)

  const nextSlot = useMemo(() => {
    if (!consult) return null
    for (let i = 0; i < master.bookingHorizonDays; i++) {
      const d = addDays(new Date(), i)
      const slots = getSlots(d, consult.duration, s)
      if (slots.length) return { d, time: slots[0] }
    }
    return null
  }, [consult, s])

  const nextLabel = nextSlot
    ? `${isToday(nextSlot.d) ? "сегодня" : isTomorrow(nextSlot.d) ? "завтра" : fmtDayShort(nextSlot.d)}, ${nextSlot.time}`
    : null

  return (
    <>
      {/* ——— Первый экран ——— */}
      <section className="mx-auto grid max-w-6xl items-center gap-14 px-4 pt-8 pb-16 sm:px-6 md:pt-16 md:pb-20 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
        <div className="min-w-0">
          <p className="eyebrow mb-5">
            {master.role} · {master.city}
          </p>
          <h1 className="font-heading text-[2.6rem] leading-[1.02] text-balance sm:text-6xl">{master.tagline}</h1>
          <p className="mt-6 max-w-lg text-[1.02rem] leading-relaxed text-muted-foreground">{master.intro}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 rounded-full px-7 text-[0.95rem]">
              <Link to={consult ? `/book?service=${consult.id}` : "/book"}>
                Записаться на консультацию <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 rounded-full bg-transparent px-7 text-[0.95rem]">
              <Link to="/quiz">
                <Sparkles /> Подобрать процедуру
              </Link>
            </Button>
          </div>
          <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-border pt-6">
            <Fact value={String(master.experienceYears)} label={plural(master.experienceYears, "год практики", "года практики", "лет практики")} />
            <Fact value="1:1" label="только вы и мастер" />
            <Fact value={consult ? price(consult.price) : "—"} label="консультация" />
          </dl>
        </div>

        <div className="relative mx-auto w-full max-w-[19rem] sm:max-w-sm lg:max-w-none">
          <div className="grain arch relative aspect-[4/5] w-full overflow-hidden">
            {master.portrait && <img src={master.portrait} alt={master.masterName} className="absolute inset-0 size-full object-cover" />}
            {!master.portrait && (
              <div className="absolute inset-0 grid place-items-center">
                <span className="font-heading text-[7rem] leading-none text-white/70 mix-blend-soft-light sm:text-[9rem]">
                  {master.masterName
                    .split(" ")
                    .map((w) => w[0])
                    .join("")}
                </span>
              </div>
            )}
          </div>
          {nextLabel && (
            <Link
              to={consult ? `/book?service=${consult.id}` : "/book"}
              className="absolute -bottom-5 left-1/2 flex w-[86%] -translate-x-1/2 items-center gap-3 rounded-2xl border border-border bg-popover/95 px-4 py-3 shadow-lg shadow-black/5 backdrop-blur transition-transform hover:-translate-y-0.5 lg:-left-8 lg:w-auto lg:translate-x-0"
            >
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500/60" />
                <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
              </span>
              <span className="text-sm leading-tight">
                <span className="block text-xs text-muted-foreground">Ближайшее окно</span>
                <span className="font-medium">{nextLabel}</span>
              </span>
              <ArrowRight className="ml-auto size-4 text-muted-foreground" />
            </Link>
          )}
        </div>
      </section>

      {/* ——— Процедуры ——— */}
      <section className="mx-auto max-w-6xl border-t border-border px-4 py-14 sm:px-6 md:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionTitle eyebrow="Процедуры и цены" title="Что я делаю" className="mb-6" />
          <Link to="/procedures" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-4 hover:text-clay">
            Все процедуры <ArrowRight className="size-4" />
          </Link>
        </div>
        <div>
          {services.slice(0, 5).map((svc, i) => (
            <ServiceRow key={svc.id} service={svc} index={i} />
          ))}
        </div>
      </section>

      {/* ——— Подбор ——— */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grain relative overflow-hidden rounded-3xl bg-primary px-6 py-10 text-primary-foreground sm:px-10 md:py-14">
          <div className="relative z-10 max-w-xl">
            <p className="text-[0.7rem] font-semibold tracking-[0.18em] uppercase opacity-70">Не знаете, с чего начать?</p>
            <h2 className="mt-3 font-heading text-3xl leading-tight sm:text-4xl">Ответьте на 4 вопроса — подскажу, с какой процедуры начать</h2>
            <Button asChild variant="secondary" size="lg" className="mt-7 h-12 rounded-full px-7">
              <Link to="/quiz">
                Пройти за минуту <ArrowRight />
              </Link>
            </Button>
          </div>
          <div className="arch absolute -right-16 -bottom-24 h-80 w-64 opacity-40 sm:right-10 sm:h-96 sm:w-72" />
        </div>
      </section>

      {/* ——— Принципы ——— */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-20">
        <SectionTitle eyebrow="Как я работаю" title="Три правила кабинета" />
        <div className="grid gap-8 sm:grid-cols-3">
          {master.principles.map((p) => (
            <div key={p.title} className="border-t border-foreground/80 pt-5">
              <p className="font-heading text-xl">{p.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.text}</p>
            </div>
          ))}
        </div>
        <Link to="/about" className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-4 hover:text-clay">
          Образование и дипломы <ArrowRight className="size-4" />
        </Link>
      </section>

      {/* ——— Сертификат + адрес ——— */}
      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-16 sm:px-6 md:grid-cols-2">
        <Link to="/gift" className="group flex flex-col justify-between gap-8 rounded-3xl border border-border bg-tint/60 p-7 transition-colors hover:bg-tint">
          <Gift className="size-7 text-clay" strokeWidth={1.5} />
          <div>
            <p className="font-heading text-2xl">Подарочный сертификат</p>
            <p className="mt-2 text-sm text-muted-foreground">На сумму или на процедуру. Красивая открытка — в мессенджер или распечатанной.</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium">
              Оформить <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </span>
          </div>
        </Link>
        <div className="flex flex-col justify-between gap-8 rounded-3xl border border-border bg-card p-7">
          <MapPin className="size-7 text-clay" strokeWidth={1.5} />
          <div>
            <p className="font-heading text-2xl">
              {master.city}, {master.address}
            </p>
            {master.addressNote && <p className="mt-1 text-sm text-muted-foreground">{master.addressNote}</p>}
            <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                <li key={d} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{DAYS[d]}</span>
                  <span className="tabular-nums">{s.week[d].enabled ? `${s.week[d].from}–${s.week[d].to}` : "—"}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  )
}

function Fact({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd className="text-[1.35rem] leading-none font-light tracking-tight whitespace-nowrap tabular-nums">{value}</dd>
      <dd className="mt-1.5 text-xs text-muted-foreground">{label}</dd>
    </div>
  )
}
