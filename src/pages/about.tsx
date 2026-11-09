import { TLink } from "@/components/tlink"
import { ArrowRight, GraduationCap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Portrait } from "@/components/bits"
import { plural } from "@/lib/time"
import { useAppState } from "@/lib/store"

export default function AboutPage() {
  const consult = useAppState((s) => s.services).find((x) => x.featured && x.active)
  const p = useAppState((s) => s.profile)
  const sub = [p.role, p.experienceYears > 0 && `${p.experienceYears} ${plural(p.experienceYears, "год", "года", "лет")} практики`]
    .filter(Boolean)
    .join(", ")

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-16">
      <div className="grid gap-10 md:grid-cols-[0.85fr_1.15fr] md:gap-16">
        <div className="mx-auto w-full max-w-sm md:sticky md:top-24 md:self-start">
          <Portrait src={p.portrait} />
        </div>

        <div className="min-w-0">
          <p className="eyebrow mb-4">Обо мне</p>
          <h1 className="font-heading text-4xl leading-[1.05] sm:text-5xl">{p.name}</h1>
          {sub && <p className="mt-2 text-muted-foreground first-letter:uppercase">{sub}</p>}
          {p.about.length > 0 && (
            <div className="mt-8 space-y-4 text-[1.05rem] leading-relaxed">
              {p.about.map((para, i) => (
                <p key={i} className="whitespace-pre-line">
                  {para}
                </p>
              ))}
            </div>
          )}

          {p.education.length > 0 && (
            <>
              <h2 className="mt-14 flex items-center gap-2 font-heading text-2xl">
                <GraduationCap className="size-5 text-clay" /> Образование
              </h2>
              <ol className="mt-5">
                {p.education.map((e, i) => (
                  <li key={i} className="grid grid-cols-[4rem_1fr] gap-4 border-t border-border py-4 last:border-b">
                    <span className="pt-0.5 font-semibold text-clay tabular-nums">{e.year}</span>
                    <span className="min-w-0">
                      <span className="block font-medium">{e.title}</span>
                      {e.place && <span className="text-sm text-muted-foreground">{e.place}</span>}
                    </span>
                  </li>
                ))}
              </ol>
            </>
          )}

          {p.principles.length > 0 && (
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {p.principles.map((pr, i) => (
                <div key={i}>
                  <p className="font-medium">{pr.title}</p>
                  {pr.text && <p className="mt-1 text-sm text-muted-foreground">{pr.text}</p>}
                </div>
              ))}
            </div>
          )}

          <Button asChild size="lg" className="mt-12 h-12 rounded-full px-7">
            <TLink to={consult ? `/book?service=${consult.id}` : "/book"} morph>
              {consult ? "Записаться на консультацию" : "Записаться"} <ArrowRight />
            </TLink>
          </Button>
        </div>
      </div>
    </div>
  )
}
