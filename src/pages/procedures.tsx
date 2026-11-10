import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "cn"
import { Disclaimer, SectionTitle, ServiceRow } from "@/components/bits"
import { useAppState } from "@/lib/store"

export default function ProceduresPage() {
  const services = useAppState((s) => s.services)
  const categories = useAppState((s) => s.categories)
  const [cat, setCat] = useState<string>("all")
  const cats = categories.filter((c) => services.some((s) => s.active && s.categoryId === c.id))
  const shown = cats.filter((c) => cat === "all" || c.id === cat)

  const row = useRef<HTMLDivElement>(null)
  const [fade, setFade] = useState(false)
  const updateFade = useCallback(() => {
    const el = row.current
    // 20 px запаса = правый отступ ряда: последний фильтр уже целиком виден — затухание не нужно
    if (el) setFade(el.scrollLeft + el.clientWidth < el.scrollWidth - 20)
  }, [])
  useEffect(() => {
    updateFade()
    window.addEventListener("resize", updateFade)
    return () => window.removeEventListener("resize", updateFade)
  }, [updateFade, cats.length])

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 md:py-16">
      <SectionTitle eyebrow="Процедуры и цены" title="Процедуры">
        Цена указана за одну процедуру. Точный план и стоимость курса — после консультации.
      </SectionTitle>

      {/* Не все фильтры влезают на телефон — у правого края лёгкое затухание: видно, что ряд листается вбок.
          Долистали до конца — затухание пропадает */}
      <div
        ref={row}
        onScroll={updateFade}
        className={cn(
          "-mx-4 mb-8 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0",
          fade && "[mask-image:linear-gradient(to_right,#000_calc(100%-3.5rem),transparent)]",
        )}
      >
        {[{ id: "all", title: "Все" }, ...cats].map((c) => (
          <button
            key={c.id}
            onClick={(e) => {
              setCat(c.id)
              // выбранный фильтр целиком в кадре (с отступом), даже если был обрезан краем
              const el = row.current
              const b = e.currentTarget
              if (!el) return
              const pad = 16
              const left = b.offsetLeft - el.offsetLeft
              const to =
                left + b.offsetWidth + pad > el.scrollLeft + el.clientWidth
                  ? left + b.offsetWidth + pad - el.clientWidth
                  : left - pad < el.scrollLeft
                    ? Math.max(0, left - pad)
                    : null
              // чуть позже: иначе перерисовка списка сразу после нажатия обрывает плавную прокрутку
              if (to !== null) setTimeout(() => el.scrollTo({ left: to, behavior: "smooth" }), 60)
            }}
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
