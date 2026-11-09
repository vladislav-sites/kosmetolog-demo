import { Link } from "react-router"
import { ArrowUpRight, Clock } from "lucide-react"
import { cn } from "cn"
import { master } from "@/config/master"
import type { Service, ThemeId } from "@/config/types"
import { actions, useAppState } from "@/lib/store"
import { dur, price } from "@/lib/time"

export function Monogram({ className }: { className?: string }) {
  const initials = master.masterName
    .split(" ")
    .map((w) => w[0])
    .join("")
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-9 place-items-center rounded-full border border-foreground/15 font-heading text-[0.95rem] leading-none",
        className,
      )}
    >
      {initials}
    </span>
  )
}

export function SectionTitle({ eyebrow, title, children, className }: { eyebrow?: string; title: string; children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-6 max-w-2xl", className)}>
      {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
      <h2 className="font-heading text-[1.85rem] leading-[1.1] sm:text-4xl">{title}</h2>
      {children && <p className="mt-3 text-[0.95rem] leading-relaxed text-muted-foreground">{children}</p>}
    </div>
  )
}

/** Плитка-заглушка под фото: арка с инициалом процедуры */
export function PhotoTile({ service, className }: { service: Service; className?: string }) {
  if (service.photo)
    return <img src={service.photo} alt="" className={cn("aspect-[4/5] w-full rounded-xl object-cover", className)} />
  return (
    <div className={cn("grain relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-tint", className)}>
      <div className="arch absolute inset-x-[18%] top-[14%] bottom-0 opacity-90" />
      <span className="absolute bottom-3 left-4 font-heading text-4xl text-foreground/70">{service.title[0]}</span>
    </div>
  )
}

export function ServiceRow({ service, index }: { service: Service; index?: number }) {
  return (
    <Link
      to={`/procedures/${service.id}`}
      className="group grid grid-cols-[auto_1fr_auto] items-start gap-4 border-b border-border py-5 transition-colors first:border-t hover:bg-card/60 sm:gap-6 sm:px-2"
    >
      <span className="w-7 pt-1.5 text-xs font-medium text-muted-foreground tabular-nums">
        {index !== undefined ? String(index + 1).padStart(2, "0") : ""}
      </span>
      <span className="min-w-0">
        <span className="block font-heading text-[1.2rem] leading-snug sm:text-2xl">{service.title}</span>
        <span className="mt-1 block text-sm text-muted-foreground">{service.short}</span>
        <span className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="size-3.5" /> {dur(service.duration)}
          {service.course && <span>· курс {service.course.sessions} процедур</span>}
        </span>
      </span>
      <span className="flex flex-col items-end gap-2 pt-1">
        <span className="whitespace-nowrap text-[0.95rem] font-semibold tabular-nums">{price(service.price, service.priceFrom)}</span>
        <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </span>
    </Link>
  )
}

const THEMES: { id: ThemeId; label: string; swatch: string[] }[] = [
  { id: "violet", label: "Аметист", swatch: ["#0c0916", "#bda6ff", "#e28bff"] },
  { id: "milk", label: "Молочное", swatch: ["#f6f1ea", "#a86a4f", "#2f2420"] },
  { id: "olive", label: "Олива", swatch: ["#f1f0e8", "#8f9a73", "#3f4b33"] },
  { id: "noir", label: "Ночь", swatch: ["#121110", "#c9a27a", "#e2cdb0"] },
]

export function ThemeSwitcher({ compact, className }: { compact?: boolean; className?: string }) {
  const theme = useAppState((s) => s.theme)
  return (
    <div className={cn("flex flex-wrap gap-2", className)} role="radiogroup" aria-label="Оформление">
      {THEMES.map((t) => (
        <button
          key={t.id}
          role="radio"
          aria-checked={theme === t.id}
          onClick={() => actions.setTheme(t.id)}
          className={cn(
            "flex items-center gap-2 rounded-full border px-2 py-1.5 text-xs font-medium transition-colors sm:px-3",
            theme === t.id ? "border-foreground bg-foreground text-background" : "border-border bg-card hover:border-foreground/40",
          )}
        >
          <span className="flex -space-x-1.5 sm:-space-x-1">
            {t.swatch.map((c) => (
              <span key={c} className="size-3 rounded-full ring-1 ring-black/10" style={{ background: c }} />
            ))}
          </span>
          <span className={compact ? "sr-only" : "hidden sm:inline"}>{t.label}</span>
        </button>
      ))}
    </div>
  )
}

export const Disclaimer = ({ className }: { className?: string }) => (
  <p className={cn("text-xs leading-relaxed text-muted-foreground", className)}>
    Имеются противопоказания. Необходима консультация специалиста.
  </p>
)
