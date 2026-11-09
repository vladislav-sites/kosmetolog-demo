import { TLink } from "@/components/tlink"
import { ArrowUpRight, Clock } from "lucide-react"
import { cn } from "cn"
import type { Service, ThemeId } from "@/config/types"
import { actions, initialsOf, useAppState } from "@/lib/store"
import { dur, price } from "@/lib/time"

export function Monogram({ className }: { className?: string }) {
  const initials = initialsOf(useAppState((s) => s.profile.name))
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

/** Фото мастера в арке. Пока фото нет — инициалы на градиенте. */
export function Portrait({ src, className }: { src?: string; className?: string }) {
  const name = useAppState((s) => s.profile.name)
  const initials = initialsOf(name)
  return (
    <div className={cn("grain arch relative aspect-[4/5] w-full overflow-hidden", className)}>
      {src ? (
        <img src={src} alt={name} className="absolute inset-0 size-full object-cover" />
      ) : (
        <span className="absolute inset-0 grid place-items-center font-heading text-[7rem] leading-none text-white/70 mix-blend-soft-light sm:text-[9rem]">
          {initials}
        </span>
      )}
    </div>
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
    <TLink
      to={`/procedures/${service.id}`}
      dir="push"
      className="press-soft group grid grid-cols-[auto_1fr_auto] items-start gap-4 border-b border-border py-5 first:border-t hover:bg-card/60 active:bg-card/80 sm:gap-6 sm:px-2"
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
    </TLink>
  )
}

/** Цвета для превью — те же, что в index.css: фон, текст, кнопка, текст кнопки, акцент, карточка */
type Palette = { bg: string; fg: string; primary: string; primaryFg: string; accent: string; card: string; tint: string }

const THEMES: { id: ThemeId; label: string; note: string; swatch: string[]; p: Palette }[] = [
  {
    id: "noir",
    label: "Шоколад",
    note: "тёмная, шампань",
    swatch: ["#121110", "#c9a27a", "#e2cdb0"],
    p: { bg: "#121110", fg: "#ece4da", primary: "#e2cdb0", primaryFg: "#1a1714", accent: "#c9a27a", card: "#1b1917", tint: "#2c2621" },
  },
  {
    id: "milk",
    label: "Молоко",
    note: "светлая, кофейная",
    swatch: ["#f6f1ea", "#a86a4f", "#2f2420"],
    p: { bg: "#f6f1ea", fg: "#2a211d", primary: "#2f2420", primaryFg: "#f8f3ec", accent: "#a86a4f", card: "#fbf8f4", tint: "#e8d5c4" },
  },
  {
    id: "rose",
    label: "Румянец",
    note: "нежно-розовая",
    swatch: ["#fbf0f1", "#f7d3da", "#7e3348"],
    p: { bg: "#fbf0f1", fg: "#3b2329", primary: "#7e3348", primaryFg: "#fff5f6", accent: "#b0526b", card: "#fff8f8", tint: "#f7d3da" },
  },
]

/** Выбор оформления в кабинете: крупные карточки с мини-превью сайта */
export function ThemePicker() {
  const theme = useAppState((s) => s.theme)
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3" role="radiogroup" aria-label="Оформление сайта">
      {THEMES.map(({ id, label, note, p }) => {
        const on = theme === id
        return (
          <button
            key={id}
            role="radio"
            aria-checked={on}
            onClick={() => actions.setTheme(id)}
            className={cn(
              "press-soft min-w-0 rounded-[1rem] border p-1.5 text-left transition-colors sm:p-2",
              on ? "border-foreground ring-1 ring-foreground" : "border-border hover:border-foreground/40",
            )}
          >
            {/* мини-страница: шапка, заголовок, кнопка, плашка */}
            <span className="block overflow-hidden rounded-[0.7rem] p-2 sm:p-3" style={{ background: p.bg, color: p.fg }}>
              <span className="flex items-center gap-1">
                <span className="size-2.5 rounded-full border sm:size-3" style={{ borderColor: p.fg + "33" }} />
                <span className="h-1 w-6 rounded-full sm:w-8" style={{ background: p.fg, opacity: 0.7 }} />
              </span>
              <span className="mt-2.5 block h-1.5 w-[85%] rounded-full sm:mt-3 sm:h-2" style={{ background: p.fg }} />
              <span className="mt-1 block h-1.5 w-[60%] rounded-full sm:h-2" style={{ background: p.fg }} />
              <span className="mt-2.5 flex items-center gap-1 sm:mt-3">
                <span className="h-3.5 w-9 rounded-full sm:h-4 sm:w-12" style={{ background: p.primary }} />
                <span className="size-2 rounded-full" style={{ background: p.accent }} />
              </span>
              <span className="mt-2.5 block h-5 rounded-md sm:mt-3 sm:h-6" style={{ background: p.tint }} />
            </span>
            {/* без обрезки «…»: на узком телефоне подпись просто переносится */}
            <span className="mt-2 block px-0.5 text-[0.8rem] leading-tight font-medium break-words sm:text-sm">{label}</span>
            <span className="mt-0.5 block px-0.5 text-[0.7rem] leading-tight break-words text-muted-foreground">{on ? "✓ на сайте" : note}</span>
          </button>
        )
      })}
    </div>
  )
}

export function ThemeSwitcher({ compact, className }: { compact?: boolean; className?: string }) {
  const theme = useAppState((s) => s.theme)
  return (
    <div className={cn("flex flex-wrap gap-2", className)} role="radiogroup" aria-label="Оформление">
      {THEMES.map((t) => (
        <button
          key={t.id}
          role="radio"
          aria-checked={theme === t.id}
          aria-label={t.label}
          title={t.label}
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
