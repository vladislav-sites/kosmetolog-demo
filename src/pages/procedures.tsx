import { useState } from "react"
import { cn } from "cn"
import { master } from "@/config/master"
import { Disclaimer, SectionTitle, ServiceRow } from "@/components/bits"
import { useAppState } from "@/lib/store"

export default function ProceduresPage() {
  const services = useAppState((s) => s.services)
  const [cat, setCat] = useState<string>("all")
  const cats = master.categories.filter((c) => services.some((s) => s.active && s.categoryId === c.id))
  const shown = cats.filter((c) => cat === "all" || c.id === cat)

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 md:py-16">
      <SectionTitle eyebrow="Процедуры и цены" title="Процедуры">
        Цена указана за одну процедуру. Точный план и стоимость курса — после консультации.
      </SectionTitle>

      <div className="-mx-4 mb-8 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
        {[{ id: "all", title: "Все" }, ...cats].map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(c.id)}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-sm transition-colors",
              cat === c.id ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground/40",
            )}
          >
            {c.title}
          </button>
        ))}
      </div>

      <div className="space-y-12">
        {shown.map((c) => (
          <section key={c.id}>
            <div className="mb-3 flex items-baseline justify-between gap-4">
              <h2 className="font-heading text-2xl">{c.title}</h2>
              <p className="text-right text-xs text-muted-foreground">{c.description}</p>
            </div>
            {services
              .filter((s) => s.active && s.categoryId === c.id)
              .map((s, i) => (
                <ServiceRow key={s.id} service={s} index={i} />
              ))}
          </section>
        ))}
      </div>
      <Disclaimer className="mt-10" />
    </div>
  )
}
