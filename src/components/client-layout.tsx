import { useState } from "react"
import { Link, Outlet, useLocation } from "react-router"
import { TLink, TNavLink } from "@/components/tlink"
import { CalendarPlus, Gift, Home, Sparkles, UserRound, Palette, X } from "lucide-react"
import { cn } from "cn"
import { master } from "@/config/master"
import { Button } from "@/components/ui/button"
import { Disclaimer, Monogram, ThemeSwitcher } from "@/components/bits"
import { InstallHint } from "@/components/install-hint"
import { IS_EMBED } from "@/lib/env"
import { mapUrl, useAppState } from "@/lib/store"
import { telegramUrl, vkUrl } from "@/lib/links"

const NAV = [
  { to: "/", label: "Главная", icon: Home, end: true },
  { to: "/procedures", label: "Процедуры", icon: Sparkles },
  { to: "/about", label: "Обо мне", icon: UserRound },
  { to: "/gift", label: "Подарок", icon: Gift },
]

export function ClientLayout() {
  const { pathname } = useLocation()
  const p = useAppState((s) => s.profile)
  const [demoOpen, setDemoOpen] = useState(true)
  const inBooking = pathname.startsWith("/book")

  return (
    <div className="flex min-h-dvh flex-col">
      {master.demo && demoOpen && (
        <div className="border-b border-border bg-card/70">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 sm:gap-4 sm:px-6">
            <span className="hidden items-center gap-1.5 text-xs font-medium text-muted-foreground min-[360px]:flex">
              <Palette className="size-3.5" /> <span className="hidden sm:inline">Демо · оформление:</span>
            </span>
            <ThemeSwitcher className="flex-nowrap gap-1.5 sm:gap-2" />
            <Link to="/admin" className="text-xs font-medium whitespace-nowrap underline underline-offset-4 hover:text-clay">
              Кабинет<span className="hidden sm:inline"> мастера</span> →
            </Link>
            <button onClick={() => setDemoOpen(false)} className="ml-auto rounded-full p-1 text-muted-foreground hover:text-foreground" aria-label="Скрыть демо-панель">
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      <header className="glass-bar sticky top-0 z-30 [view-transition-name:site-header]">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <TLink to="/" className="flex items-center gap-3">
            <Monogram />
            <span className="leading-tight whitespace-nowrap">
              <span className="block font-heading text-[1.05rem]">{master.brand}</span>
              <span className="block text-[0.7rem] text-muted-foreground">{p.role}</span>
            </span>
          </TLink>
          <nav className="ml-auto hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <TNavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  cn("press rounded-full px-3.5 py-2 text-sm hover:bg-muted", isActive && "bg-muted font-medium")
                }
              >
                {n.label}
              </TNavLink>
            ))}
          </nav>
          <Button asChild className="ml-2 hidden h-10 rounded-full px-5 lg:inline-flex">
            <TLink to="/book" dir="push">
              Записаться
            </TLink>
          </Button>
        </div>
      </header>

      <main className="flex-1 [view-transition-name:page]">
        <Outlet />
      </main>

      <footer className={cn("border-t border-border bg-card/50 pb-28 lg:pb-0", inBooking && "hidden lg:block")}>
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <Monogram />
              <span className="font-heading text-lg">{master.brand}</span>
            </div>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">{p.tagline}</p>
            <Disclaimer className="mt-4 max-w-xs" />
          </div>
          <div className="text-sm">
            <p className="eyebrow mb-3">Адрес</p>
            <p>{[p.city, p.address].filter(Boolean).join(", ")}</p>
            {p.addressNote && <p className="text-muted-foreground">{p.addressNote}</p>}
            <a href={mapUrl(p)} target="_blank" rel="noreferrer" className="mt-2 inline-block underline underline-offset-4 hover:text-clay">
              Открыть на карте
            </a>
          </div>
          <div className="text-sm">
            <p className="eyebrow mb-3">Связь</p>
            {p.phone && (
              <a href={`tel:${p.phone.replace(/[^\d+]/g, "")}`} className="block hover:text-clay">
                {p.phone}
              </a>
            )}
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {p.telegram && (
                <a href={telegramUrl(p.telegram)} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-clay">
                  Telegram
                </a>
              )}
              {p.whatsapp && (
                <a href={`https://wa.me/${p.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-clay">
                  WhatsApp
                </a>
              )}
              {p.vk && (
                <a href={vkUrl(p.vk)} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-clay">
                  ВКонтакте
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 border-t border-border px-4 py-5 text-xs text-muted-foreground sm:px-6">
          <span>{master.legalName}</span>
          <Link to="/privacy" className="hover:text-foreground">
            Политика конфиденциальности
          </Link>
          <Link to="/admin" className="ml-auto hover:text-foreground">
            Вход для мастера
          </Link>
        </div>
      </footer>

      {!IS_EMBED && <InstallHint />}

      {/* Нижняя навигация — парящая стеклянная «пилюля», как в iOS */}
      {!inBooking && (
        <nav
          aria-label="Меню"
          className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] [view-transition-name:tabbar] lg:hidden"
        >
          <div className="glass pointer-events-auto mx-auto grid max-w-md grid-cols-5 items-end rounded-[1.75rem] p-1.5">
            {NAV.slice(0, 2).map((n) => (
              <TabLink key={n.to} {...n} />
            ))}
            {/* «Запись»: капля пружинит под пальцем и раскрывается в экран записи */}
            <TLink to="/book" morph className="group -mt-7 flex flex-col items-center gap-1 rounded-full pb-1.5" aria-label="Записаться">
              <span className="glass-primary grid size-14 place-items-center rounded-full text-primary-foreground transition-transform duration-300 ease-[cubic-bezier(0.3,1.6,0.5,1)] group-active:scale-[0.86] group-active:duration-75">
                <CalendarPlus className="size-6 transition-transform duration-300 group-active:rotate-[-8deg]" />
              </span>
              <span className="text-[0.66rem] font-semibold">Запись</span>
            </TLink>
            {NAV.slice(2).map((n) => (
              <TabLink key={n.to} {...n} />
            ))}
          </div>
        </nav>
      )}
    </div>
  )
}

function TabLink({ to, label, icon: Icon, end }: (typeof NAV)[number]) {
  return (
    <TNavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "press flex min-w-0 flex-col items-center gap-0.5 rounded-[1.3rem] py-2 text-[0.66rem] text-muted-foreground",
          isActive && "bg-foreground/10 font-semibold text-foreground",
        )
      }
    >
      <Icon className="size-5" strokeWidth={1.7} />
      {label}
    </TNavLink>
  )
}
