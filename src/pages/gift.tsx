import { useState } from "react"
import { Link } from "react-router"
import { Check, Gift } from "lucide-react"
import { cn } from "cn"
import { master } from "@/config/master"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Consent } from "@/components/consent"
import { actions, useAppState } from "@/lib/store"
import { rub } from "@/lib/time"
import { formatPhone, phoneValid } from "@/lib/phone"

export default function GiftPage() {
  const amounts = useAppState((s) => s.giftAmounts)
  const [picked, setPicked] = useState(1)
  const amount = amounts[picked] ?? amounts[0]
  const [forName, setForName] = useState("")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [consent, setConsent] = useState(false)
  const [tried, setTried] = useState(false)
  const [sent, setSent] = useState(false)

  const submit = () => {
    setTried(true)
    if (!name.trim() || !phoneValid(phone) || !consent) return
    actions.addGift({ amount, buyerName: name.trim(), phone, forName: forName.trim() || undefined })
    setSent(true)
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 md:py-16 lg:grid-cols-2 lg:gap-16">
      {/* Превью сертификата */}
      <div className="mx-auto w-full max-w-md lg:sticky lg:top-24 lg:max-w-none lg:self-start">
        <div className="grain relative flex min-h-48 w-full flex-col overflow-hidden rounded-3xl bg-primary p-5 text-primary-foreground shadow-2xl shadow-black/15 sm:min-h-60 sm:p-8">
          <div className="arch absolute -right-4 -bottom-24 h-52 w-32 opacity-35 sm:-bottom-20 sm:h-64 sm:w-44" />
          <div className="relative flex flex-1 flex-col justify-between gap-5">
            <div className="flex items-center justify-between">
              <span className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase opacity-70">Подарочный сертификат</span>
              <Gift className="size-5 opacity-70" />
            </div>
            <div>
              <p
                className={cn(
                  "leading-none font-extralight tracking-tight whitespace-nowrap tabular-nums",
                  amount >= 100_000 ? "text-[2rem] sm:text-5xl" : "text-[2.6rem] sm:text-6xl",
                )}
              >
                {rub(amount)}
              </p>
              <p className="mt-2 text-sm opacity-80">{forName.trim() ? `для ${forName.trim()}` : "на любые процедуры"}</p>
            </div>
            <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 text-xs opacity-80">
              <span className="font-heading text-base">{master.brand}</span>
              <span>действует 6 месяцев</span>
            </div>
          </div>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">Пришлю открытку в мессенджер — перешлёте её сами или распечатаете.</p>
      </div>

      <div>
        <p className="eyebrow mb-3">Подарок</p>
        <h1 className="font-heading text-4xl leading-[1.05] sm:text-5xl">Сертификат на уход</h1>
        <p className="mt-4 text-muted-foreground">Можно подарить сумму — получатель сам выберет процедуру после консультации.</p>

        {sent ? (
          <div className="mt-10 rounded-2xl border border-border bg-card p-6 animate-in fade-in">
            <div className="grid size-12 place-items-center rounded-full bg-primary text-primary-foreground">
              <Check className="size-5" />
            </div>
            <p className="mt-4 font-heading text-2xl">Заявка отправлена</p>
            <p className="mt-2 text-sm text-muted-foreground">Свяжусь с вами в ближайшее время, чтобы договориться об оплате и прислать сертификат.</p>
            <Button asChild variant="outline" className="mt-6 rounded-full bg-transparent">
              <Link to="/">На главную</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            <div>
              <Label>Номинал</Label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {amounts.map((v, i) => (
                  <button
                    key={i}
                    onClick={() => setPicked(i)}
                    aria-pressed={picked === i}
                    className={cn(
                      "h-12 min-w-0 rounded-xl border px-1 text-sm font-medium whitespace-nowrap tabular-nums transition-colors",
                      picked === i ? "border-foreground bg-foreground text-background" : "border-border bg-card hover:border-foreground/40",
                    )}
                  >
                    {rub(v)}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>
                Кому <span className="text-xs font-normal text-muted-foreground">необязательно</span>
              </Label>
              <Input value={forName} onChange={(e) => setForName(e.target.value)} placeholder="Имя получателя" className="h-12 rounded-xl bg-card text-base" />
            </div>
            <div className="space-y-2">
              <Label>Ваше имя</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-12 rounded-xl bg-card text-base" />
              {tried && !name.trim() && <p className="text-xs text-destructive">Как к вам обращаться?</p>}
            </div>
            <div className="space-y-2">
              <Label>Телефон</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                onFocus={() => !phone && setPhone("+7")}
                inputMode="tel"
                placeholder="+7 (900) 000-00-00"
                className="h-12 rounded-xl bg-card text-base tabular-nums"
              />
              {tried && !phoneValid(phone) && <p className="text-xs text-destructive">Проверьте номер</p>}
            </div>
            <Consent checked={consent} onChange={setConsent} error={tried && !consent} />
            <Button size="lg" className="h-12 w-full rounded-full sm:w-auto sm:px-8" onClick={submit}>
              Оформить сертификат на {rub(amount)}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
