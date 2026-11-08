import { Link } from "react-router"
import { ArrowRight, GraduationCap } from "lucide-react"
import { master } from "@/config/master"
import { Button } from "@/components/ui/button"
import { plural } from "@/lib/time"
import { useAppState } from "@/lib/store"

export default function AboutPage() {
  const consult = useAppState((s) => s.services).find((x) => x.featured && x.active)
  const initials = master.masterName
    .split(" ")
    .map((w) => w[0])
    .join("")
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-16">
      <div className="grid gap-10 md:grid-cols-[0.85fr_1.15fr] md:gap-16">
        <div className="mx-auto w-full max-w-sm md:sticky md:top-24 md:self-start">
          <div className="grain arch relative aspect-[4/5] w-full overflow-hidden">
            {master.portrait ? (
              <img src={master.portrait} alt={master.masterName} className="absolute inset-0 size-full object-cover" />
            ) : (
              <span className="absolute inset-0 grid place-items-center font-heading text-[7rem] text-white/70 mix-blend-soft-light">{initials}</span>
            )}
          </div>
        </div>

        <div>
          <p className="eyebrow mb-4">Обо мне</p>
          <h1 className="font-heading text-4xl leading-[1.05] sm:text-5xl">{master.masterName}</h1>
          <p className="mt-2 text-muted-foreground">
            {master.role}, {master.experienceYears} {plural(master.experienceYears, "год", "года", "лет")} практики
          </p>
          <div className="mt-8 space-y-4 text-[1.05rem] leading-relaxed">
            {master.about.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>

          <h2 className="mt-14 flex items-center gap-2 font-heading text-2xl">
            <GraduationCap className="size-5 text-clay" /> Образование
          </h2>
          <ol className="mt-5">
            {master.education.map((e) => (
              <li key={e.title} className="grid grid-cols-[4rem_1fr] gap-4 border-t border-border py-4 last:border-b">
                <span className="pt-0.5 font-semibold text-clay tabular-nums">{e.year}</span>
                <span>
                  <span className="block font-medium">{e.title}</span>
                  <span className="text-sm text-muted-foreground">{e.place}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-muted-foreground">Оригиналы дипломов и сертификатов — в кабинете, покажу по просьбе.</p>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {master.principles.map((p) => (
              <div key={p.title}>
                <p className="font-medium">{p.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{p.text}</p>
              </div>
            ))}
          </div>

          <Button asChild size="lg" className="mt-12 h-12 rounded-full px-7">
            <Link to={consult ? `/book?service=${consult.id}` : "/book"}>
              {consult ? "Записаться на консультацию" : "Записаться"} <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
