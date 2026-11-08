import { Link, useParams } from "react-router"
import { ArrowLeft, ArrowRight, CalendarClock, Clock, Repeat } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Disclaimer, PhotoTile } from "@/components/bits"
import { useAppState } from "@/lib/store"
import { dur, plural, price } from "@/lib/time"

export default function ProcedurePage() {
  const { id } = useParams()
  const services = useAppState((s) => s.services)
  const categories = useAppState((s) => s.categories)
  const s = services.find((x) => x.id === id && x.active)
  const consult = services.find((x) => x.featured && x.active)

  if (!s)
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <p className="font-heading text-3xl">Процедура не найдена</p>
        <Button asChild variant="outline" className="mt-6 rounded-full">
          <Link to="/procedures">К списку процедур</Link>
        </Button>
      </div>
    )

  const cat = categories.find((c) => c.id === s.categoryId)
  const needsConsult = !s.featured && !!consult

  return (
    <article className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-14">
      <Link to="/procedures" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Все процедуры
      </Link>

      <div className="mt-6 grid gap-10 md:grid-cols-[0.8fr_1.2fr] md:gap-14">
        <div className="min-w-0 md:sticky md:top-24 md:self-start">
          <PhotoTile service={s} className="max-h-[420px] md:max-h-none" />
        </div>

        <div className="min-w-0">
          {cat && <p className="eyebrow mb-3">{cat.title}</p>}
          <h1 className="font-heading text-[2.1rem] leading-[1.05] sm:text-5xl">{s.title}</h1>
          <p className="mt-5 text-[1.02rem] leading-relaxed text-muted-foreground">{s.about}</p>

          <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3">
            <Stat icon={<Clock className="size-4" />} label="Длительность" value={dur(s.duration)} />
            <Stat label="Стоимость" value={price(s.price, s.priceFrom)} />
            {s.course ? (
              <Stat
                icon={<Repeat className="size-4" />}
                label="Курс"
                value={`${s.course.sessions} ${plural(s.course.sessions, "процедура", "процедуры", "процедур")}, раз в ${s.course.intervalDays} дн.`}
                className="col-span-2 sm:col-span-1"
              />
            ) : (
              <Stat icon={<CalendarClock className="size-4" />} label="Восстановление" value="не требуется" className="col-span-2 sm:col-span-1" />
            )}
          </dl>

          {s.effect && (
            <p className="mt-8 border-l-2 border-clay pl-4 font-heading text-xl leading-snug">{s.effect}</p>
          )}

          <Accordion type="multiple" defaultValue={["steps"]} className="mt-8">
            {s.steps && (
              <AccordionItem value="steps">
                <AccordionTrigger className="text-base">Как проходит</AccordionTrigger>
                <AccordionContent>
                  <ol className="space-y-2.5">
                    {s.steps.map((st, i) => (
                      <li key={st} className="flex gap-3 text-[0.95rem]">
                        <span className="w-5 shrink-0 text-muted-foreground tabular-nums">{i + 1}.</span>
                        {st}
                      </li>
                    ))}
                  </ol>
                </AccordionContent>
              </AccordionItem>
            )}
            {s.prep && (
              <AccordionItem value="prep">
                <AccordionTrigger className="text-base">Как подготовиться</AccordionTrigger>
                <AccordionContent>
                  <ul className="list-disc space-y-1.5 pl-5 text-[0.95rem]">
                    {s.prep.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            )}
            {s.contraindications && (
              <AccordionItem value="contra">
                <AccordionTrigger className="text-base">Противопоказания</AccordionTrigger>
                <AccordionContent>
                  <ul className="list-disc space-y-1.5 pl-5 text-[0.95rem]">
                    {s.contraindications.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                  <p className="mt-3 text-sm text-muted-foreground">Полный список уточняю на консультации.</p>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button asChild size="lg" className="h-12 rounded-full px-7">
              <Link to={`/book?service=${s.id}`}>
                Записаться на процедуру <ArrowRight />
              </Link>
            </Button>
            {needsConsult && (
              <Button asChild variant="outline" size="lg" className="h-12 rounded-full bg-transparent px-7">
                <Link to={`/book?service=${consult!.id}`}>Сначала консультация</Link>
              </Button>
            )}
          </div>
          <Disclaimer className="mt-6" />
        </div>
      </div>
    </article>
  )
}

function Stat({ label, value, icon, className }: { label: string; value: string; icon?: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-card p-4 ${className ?? ""}`}>
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="mt-1.5 font-medium">{value}</dd>
    </div>
  )
}
