import { useMemo, useState } from "react"
import { addDays, format, startOfDay } from "date-fns"
import { ru } from "date-fns/locale"
import { toast } from "sonner"
import { X } from "lucide-react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { NativeSelect } from "@/components/ui/native-select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { DURATIONS, Field } from "@/components/service-editor"
import { actions, isBusy, useAppState } from "@/lib/store"
import { dayKey, dur, fmtDay, fromMin, parseLocal, toMin } from "@/lib/time"
import { formatPhone, phoneValid } from "@/lib/phone"

const CUSTOM = "__custom__"
/** Мастер может записать и вне графика — поэтому весь день, с шагом 15 минут */
const FIRST = 7 * 60
const LAST_END = 23 * 60
const STEP = 15

/**
 * «Добавить запись» в кабинете: клиентка записалась не через сайт (позвонила, написала),
 * мастер вносит её сама. `day` — открыт, на этот день по умолчанию; `null` — закрыт.
 */
export function BookingEditor({ day, onClose, onAdded }: { day: Date | null; onClose: () => void; onAdded: (d: Date) => void }) {
  return (
    <Sheet open={!!day} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" showCloseButton={false} className="gap-0 overflow-y-auto p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-lg">
        {day && <EditorBody key={dayKey(day)} day={day} onClose={onClose} onAdded={onAdded} />}
      </SheetContent>
    </Sheet>
  )
}

function EditorBody({ day, onClose, onAdded }: { day: Date; onClose: () => void; onAdded: (d: Date) => void }) {
  const s = useAppState((st) => st)
  const today = startOfDay(new Date())
  const [date, setDate] = useState(dayKey(day < today ? today : day))
  const [serviceId, setServiceId] = useState("")
  const [customTitle, setCustomTitle] = useState("")
  const [duration, setDuration] = useState(60)
  const [priceStr, setPriceStr] = useState("")
  const [time, setTime] = useState("")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [comment, setComment] = useState("")
  const [tried, setTried] = useState(false)

  const pickService = (id: string) => {
    setServiceId(id)
    const svc = s.services.find((x) => x.id === id)
    if (svc) {
      setDuration(svc.duration)
      setPriceStr(String(svc.price))
    }
  }

  // Процедуры по разделам; скрытые с сайта тоже можно выбрать — мастер их всё равно делает
  const groups = [
    ...s.categories.map((c) => ({ title: c.title, items: s.services.filter((x) => x.categoryId === c.id) })),
    { title: "Без раздела", items: s.services.filter((x) => !s.categories.some((c) => c.id === x.categoryId)) },
  ].filter((g) => g.items.length)

  const dateObj = date ? parseLocal(date) : null
  const wd = dateObj ? s.week[dateObj.getDay()] : undefined
  const isOff = !!date && s.daysOff.includes(date)
  const workFrom = wd?.enabled && !isOff ? toMin(wd.from) : null
  const workTo = wd?.enabled && !isOff ? toMin(wd.to) : null

  const times = useMemo(() => {
    if (!date) return []
    const out: { t: string; busy: boolean; outside: boolean }[] = []
    for (let m = FIRST; m + duration <= LAST_END; m += STEP) {
      const t = fromMin(m)
      out.push({
        t,
        busy: isBusy(s.bookings, `${date}T${t}`, duration),
        outside: workFrom === null || workTo === null || m < workFrom || m + duration > workTo,
      })
    }
    return out
  }, [date, duration, s.bookings, workFrom, workTo])

  const free = times.filter((x) => !x.busy)
  // Сначала — первое свободное время в рабочие часы; выбранное время стало занятым (сменили день или длительность) — тоже сюда
  const fallback = (free.find((x) => !x.outside) ?? free[0])?.t ?? ""
  const chosenTime = free.some((x) => x.t === time) ? time : fallback

  const phoneDigits = phone.replace(/\D/g, "")
  const phoneEmpty = phoneDigits.length <= 1 // в поле осталось только «+7»
  const price = priceStr.trim() === "" ? undefined : Math.max(0, Math.round(Number(priceStr.replace(/\s/g, "")) || 0))
  const service = s.services.find((x) => x.id === serviceId)

  const errors = {
    date: !date ? "Выберите день" : dateObj && dateObj < today ? "Этот день уже прошёл" : "",
    time: date && !chosenTime ? "На этот день нет свободного времени такой длины" : "",
    service: !serviceId ? "Какая процедура?" : serviceId === CUSTOM && !customTitle.trim() ? "Как называется процедура?" : "",
    price: price === undefined ? "Укажите цену" : "",
    name: !name.trim() ? "Как зовут клиентку?" : "",
    phone: !phoneEmpty && !phoneValid(phone) ? "Допишите номер или сотрите его" : "",
  }
  const hasErrors = Object.values(errors).some(Boolean)

  const save = () => {
    setTried(true)
    if (hasErrors) {
      requestAnimationFrame(() => document.querySelector("[data-editor-error]")?.scrollIntoView({ block: "center", behavior: "smooth" }))
      return
    }
    const created = actions.addManualBooking({
      serviceId: service?.id ?? "",
      serviceTitle: service?.title ?? customTitle.trim(),
      price: price ?? 0,
      start: `${date}T${chosenTime}`,
      duration,
      name: name.trim(),
      phone: phoneEmpty ? "" : phone,
      comment: comment.trim() || undefined,
    })
    if (!created) {
      toast.error("Это время только что заняли — выберите другое")
      return
    }
    toast.success(`Запись добавлена: ${created.name}, ${format(parseLocal(created.start), "d MMMM в HH:mm", { locale: ru })}`)
    onAdded(parseLocal(date))
    onClose()
  }

  const dayNote = !dateObj
    ? ""
    : !wd?.enabled
      ? "Выходной по графику — запись всё равно добавится"
      : isOff
        ? "День закрыт для записи на сайте — запись всё равно добавится"
        : `Рабочий день, ${wd.from}–${wd.to}`

  return (
    <>
      <SheetHeader className="glass-bar sticky top-0 z-10 px-5 py-4 pr-14">
        <button onClick={onClose} aria-label="Закрыть" className="absolute top-3.5 right-3.5 grid size-9 place-items-center rounded-full hover:bg-muted">
          <X className="size-4" />
        </button>
        <SheetTitle className="font-heading text-xl">Новая запись</SheetTitle>
        <SheetDescription>Для клиенток, которые записались не через сайт. Время сразу станет занятым на сайте.</SheetDescription>
      </SheetHeader>

      <div className="space-y-6 px-5 py-5">
        <Field id="bk-service" label="Процедура" error={tried ? errors.service : ""}>
          <NativeSelect id="bk-service" value={serviceId} onChange={(e) => pickService(e.target.value)} className={cn("h-11", !serviceId && "text-muted-foreground")}>
            <option value="" disabled>
              Выберите процедуру
            </option>
            {groups.map((g) => (
              <optgroup key={g.title} label={g.title}>
                {g.items.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.title}
                    {!x.active ? " (скрыта с сайта)" : ""}
                  </option>
                ))}
              </optgroup>
            ))}
            <option value={CUSTOM}>+ Другая процедура…</option>
          </NativeSelect>
          {serviceId === CUSTOM && (
            <Input
              autoFocus
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="Например: Коррекция бровей"
              aria-label="Название процедуры"
              className="mt-2 h-11 rounded-xl"
            />
          )}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field id="bk-dur" label="Длительность">
            <NativeSelect id="bk-dur" value={String(duration)} onChange={(e) => setDuration(Number(e.target.value))} className="h-11">
              {[...new Set([...DURATIONS, duration])]
                .sort((a, b) => a - b)
                .map((d) => (
                  <option key={d} value={d}>
                    {dur(d)}
                  </option>
                ))}
            </NativeSelect>
          </Field>
          <Field id="bk-price" label="Цена, ₽" error={tried ? errors.price : ""}>
            <Input
              id="bk-price"
              inputMode="numeric"
              value={priceStr}
              onChange={(e) => setPriceStr(e.target.value.replace(/[^\d\s]/g, ""))}
              placeholder="0"
              className="h-11 rounded-xl tabular-nums"
            />
          </Field>
        </div>

        {/* на телефоне друг под другом: в половину ширины дата не влезает рядом со значком календаря */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="bk-date" label="День" error={tried ? errors.date : ""}>
            <Input
              id="bk-date"
              type="date"
              value={date}
              min={dayKey(today)}
              max={dayKey(addDays(today, 365))}
              onChange={(e) => setDate(e.target.value)}
              className="h-11 rounded-xl tabular-nums"
            />
          </Field>
          <Field id="bk-time" label="Время" error={tried ? errors.time : ""}>
            <NativeSelect id="bk-time" value={chosenTime} onChange={(e) => setTime(e.target.value)} disabled={!free.length} className="h-11 tabular-nums">
              {!free.length && <option value="">Нет времени</option>}
              {times.map((x) => (
                <option key={x.t} value={x.t} disabled={x.busy}>
                  {x.t}
                  {x.busy ? " — занято" : x.outside ? " · вне графика" : ""}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
        {dateObj && (
          <p className="-mt-3 text-xs text-muted-foreground first-letter:uppercase">
            {fmtDay(dateObj)}
            {chosenTime ? `, ${chosenTime}–${fromMin(toMin(chosenTime) + duration)}` : ""} · {dayNote}
          </p>
        )}

        <Field id="bk-name" label="Имя клиентки" error={tried ? errors.name : ""}>
          <Input id="bk-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Анна" autoComplete="off" className="h-11 rounded-xl" />
        </Field>

        <Field id="bk-phone" label="Телефон" hint="необязательно" error={tried ? errors.phone : ""}>
          <Input
            id="bk-phone"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "") ? formatPhone(e.target.value) : "")}
            placeholder="+7 (900) 000-00-00"
            className="h-11 rounded-xl tabular-nums"
          />
        </Field>

        <Field id="bk-comment" label="Заметка" hint="необязательно, видите только вы">
          <Textarea id="bk-comment" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Например: записалась по телефону, чувствительная кожа" className="min-h-20 rounded-xl" />
        </Field>
      </div>

      <div className="glass-bar pb-safe sticky bottom-0 z-10 mt-auto flex gap-2 border-t border-b-0 border-t-(--glass-border) px-5 pt-3">
        <Button size="lg" className="h-12 flex-1 rounded-full" onClick={save}>
          Добавить запись
        </Button>
        <Button size="lg" variant="outline" className="h-12 rounded-full bg-transparent" onClick={onClose}>
          Отмена
        </Button>
      </div>
    </>
  )
}
