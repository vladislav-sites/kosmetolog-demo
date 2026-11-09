import { useMemo } from "react"
import { TLink } from "@/components/tlink"
import { addDays, isToday, isTomorrow } from "date-fns"
import { ArrowRight, Gift, MapPin } from "lucide-react"
import { master } from "@/config/master"
import { Button } from "@/components/ui/button"
import { cn } from "cn"
import { Portrait, SectionTitle, ServiceRow } from "@/components/bits"
import { mapUrl, useAppState } from "@/lib/store"
import { dayKey, fmtDayShort, getSlots, plural, price } from "@/lib/time"

const DAYS = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"]

export default function HomePage() {
  const s = useAppState((st) => st)
  const p = s.profile
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
            {[p.role, p.city].filter(Boolean).join(" · ")}
          </p>
          <h1 className="font-heading text-[2.6rem] leading-[1.02] text-balance sm:text-6xl">{p.tagline}</h1>
          {p.intro && <p className="mt-6 max-w-lg text-[1.02rem] leading-relaxed whitespace-pre-line text-muted-foreground">{p.intro}</p>}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 rounded-full px-7 text-[0.95rem]">
              <TLink to={consult ? `/book?service=${consult.id}` : "/book"} morph>
                Записаться на консультацию <ArrowRight />
              </TLink>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 rounded-full bg-transparent px-7 text-[0.95rem]">
              <TLink to="/procedures">Процедуры и цены</TLink>
            </Button>
          </div>
          <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-border pt-6">
            {p.experienceYears > 0 && (
              <Fact value={String(p.experienceYears)} label={plural(p.experienceYears, "год практики", "года практики", "лет практики")} />
            )}
            <Fact value="1:1" label="только вы и мастер" />
            {/* выключенная или удалённая консультация = консультация бесплатно */}
            <Fact value={consult ? price(consult.price) : "Бесплатно"} label="консультация" />
          </dl>
        </div>

        <div className="relative mx-auto w-full max-w-[19rem] sm:max-w-sm lg:max-w-none">
          <Portrait src={p.portrait} />
          {nextLabel && (
            <TLink
              to={`/book?service=${consult!.id}&at=${dayKey(nextSlot!.d)}T${nextSlot!.time}`}
              morph
              className="glass press absolute -bottom-5 left-1/2 flex w-[86%] -translate-x-1/2 items-center gap-3 rounded-2xl px-4 py-3 transition-transform hover:-translate-y-0.5 lg:-left-8 lg:w-auto lg:translate-x-0"
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
            </TLink>
          )}
        </div>
      </section>

      {/* ——— Процедуры ——— */}
      <section className="mx-auto max-w-6xl border-t border-border px-4 py-14 sm:px-6 md:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionTitle eyebrow="Процедуры и цены" title="Что я делаю" className="mb-6" />
          <TLink to="/procedures" className="press mb-6 inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-4 hover:text-clay">
            Все процедуры <ArrowRight className="size-4" />
          </TLink>
        </div>
        <div>
          {services.slice(0, 5).map((svc, i) => (
            <ServiceRow key={svc.id} service={svc} index={i} />
          ))}
        </div>
      </section>

      {/* ——— С чего начать: консультация ——— */}
      {consult && (
        <section className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="gift-card grain relative overflow-hidden rounded-3xl px-6 py-10 sm:px-10 md:py-14">
            <div className="relative z-10 max-w-xl">
              <p className="text-[0.7rem] font-semibold tracking-[0.18em] uppercase opacity-70">Не знаете, с чего начать?</p>
              <h2 className="mt-3 font-heading text-3xl leading-tight sm:text-4xl">Начните с консультации — подберём уход и процедуры под вашу кожу</h2>
              <Button asChild variant="secondary" size="lg" className="mt-7 h-12 rounded-full px-7">
                <TLink to={`/book?service=${consult.id}`} morph>
                  Записаться · {price(consult.price)} <ArrowRight />
                </TLink>
              </Button>
            </div>
            <div className="arch absolute -right-16 -bottom-24 h-80 w-64 opacity-40 sm:right-10 sm:h-96 sm:w-72" />
          </div>
        </section>
      )}

      {/* ——— Как я работаю (мастер пишет сама, блок скрыт, если пусто) ——— */}
      {p.principles.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-20">
          <SectionTitle title="Как я работаю" />
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {p.principles.map((pr, i) => (
              <div key={i} className="border-t border-foreground/80 pt-5">
                <p className="font-heading text-xl">{pr.title}</p>
                {pr.text && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{pr.text}</p>}
              </div>
            ))}
          </div>
          <TLink to="/about" className="press mt-8 inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-4 hover:text-clay">
            Обо мне и образование <ArrowRight className="size-4" />
          </TLink>
        </section>
      ) : (
        <div className="h-14 md:h-20" />
      )}

      {/* ——— Сертификат + адрес ——— */}
      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-16 sm:px-6 md:grid-cols-2">
        <TLink to="/gift" className="press-soft group flex flex-col justify-between gap-8 rounded-3xl border border-border bg-tint/60 p-7 hover:bg-tint">
          <Gift className="size-7 text-clay" strokeWidth={1.5} />
          <div>
            <p className="font-heading text-2xl">Подарочный сертификат</p>
            <p className="mt-2 text-sm text-muted-foreground">На сумму или на процедуру. Красивая открытка — в мессенджер или распечатанной.</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium">
              Оформить <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </span>
          </div>
        </TLink>
        <div className="flex flex-col justify-between gap-8 rounded-3xl border border-border bg-card p-7">
          <MapPin className="size-7 text-clay" strokeWidth={1.5} />
          <div>
            <p className="font-heading text-2xl">{[p.city, p.address].filter(Boolean).join(", ")}</p>
            {p.addressNote && <p className="mt-1 text-sm text-muted-foreground">{p.addressNote}</p>}
            <a href={mapUrl(p)} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm underline underline-offset-4 hover:text-clay">
              Открыть на карте
            </a>
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
      <dd
        className={cn(
          "leading-none font-light tracking-tight whitespace-nowrap tabular-nums",
          /\d/.test(value) ? "text-[1.35rem]" : "pt-1 text-[1.05rem] font-normal",
        )}
      >
        {value}
      </dd>
      <dd className="mt-1.5 text-xs text-muted-foreground">{label}</dd>
    </div>
  )
}
