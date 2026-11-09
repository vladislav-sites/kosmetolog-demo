import { useState } from "react"
import { Link, NavLink, Outlet, useLocation } from "react-router"
import { CalendarPlus, Gift, Home, Sparkles, UserRound, Palette, X } from "lucide-react"
import { cn } from "cn"
import { master } from "@/config/master"
import { Button } from "@/components/ui/button"
import { Disclaimer, Monogram, ThemeSwitcher } from "@/components/bits"
import { InstallHint } from "@/components/install-hint"
import { IS_EMBED } from "@/lib/env"

const NAV = [
  { to: "/", label: "Главная", icon: Home, end: true },
  { to: "/procedures", label: "Процедуры", icon: Sparkles },
  { to: "/about", label: "Обо мне", icon: UserRound },
  { to: "/gift", label: "Подарок", icon: Gift },
]

export function ClientLayout() {
  const { pathname } = useLocation()
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

      <header className="glass-bar sticky top-0 z-30">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-3">
            <Monogram />
            <span className="leading-tight whitespace-nowrap">
              <span className="block font-heading text-[1.05rem]">{master.brand}</span>
              <span className="block text-[0.7rem] text-muted-foreground">{master.role}</span>
            </span>
          </Link>
          <nav className="ml-auto hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  cn("rounded-full px-3.5 py-2 text-sm transition-colors hover:bg-muted", isActive && "bg-muted font-medium")
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <Button asChild className="ml-2 hidden h-10 rounded-full px-5 lg:inline-flex">
            <Link to="/book">Записаться</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className={cn("border-t border-border bg-card/50 pb-28 lg:pb-0", inBooking && "hidden lg:block")}>
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <Monogram />
              <span className="font-heading text-lg">{master.brand}</span>
            </div>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">{master.tagline}</p>
            <Disclaimer className="mt-4 max-w-xs" />
          </div>
          <div className="text-sm">
            <p className="eyebrow mb-3">Адрес</p>
            <p>
              {master.city}, {master.address}
            </p>
            {master.addressNote && <p className="text-muted-foreground">{master.addressNote}</p>}
            {master.mapUrl && (
              <a href={master.mapUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block underline underline-offset-4 hover:text-clay">
                Открыть на карте
              </a>
            )}
          </div>
          <div className="text-sm">
            <p className="eyebrow mb-3">Связь</p>
            <a href={`tel:${master.phone.replace(/[^\d+]/g, "")}`} className="block hover:text-clay">
              {master.phone}
            </a>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {master.telegram && (
                <a href={`https://t.me/${master.telegram}`} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-clay">
                  Telegram
                </a>
              )}
              {master.whatsapp && (
                <a href={`https://wa.me/${master.whatsapp}`} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-clay">
                  WhatsApp
                </a>
              )}
              {master.vk && (
                <a href={`https://vk.com/${master.vk}`} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-clay">
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
          className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] lg:hidden"
        >
          <div className="glass pointer-events-auto mx-auto grid max-w-md grid-cols-5 items-end rounded-[1.75rem] p-1.5">
            {NAV.slice(0, 2).map((n) => (
              <TabLink key={n.to} {...n} />
            ))}
            <Link to="/book" className="-mt-7 flex flex-col items-center gap-1 pb-1.5" aria-label="Записаться">
              <span className="glass-primary grid size-14 place-items-center rounded-full text-primary-foreground transition-transform active:scale-95">
                <CalendarPlus className="size-6" />
              </span>
              <span className="text-[0.66rem] font-semibold">Запись</span>
            </Link>
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
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "flex min-w-0 flex-col items-center gap-0.5 rounded-[1.3rem] py-2 text-[0.66rem] text-muted-foreground transition-colors",
          isActive && "bg-foreground/10 font-semibold text-foreground",
        )
      }
    >
      <Icon className="size-5" strokeWidth={1.7} />
      {label}
    </NavLink>
  )
}
