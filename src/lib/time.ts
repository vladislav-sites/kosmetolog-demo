import { addMinutes, format, isSameDay } from "date-fns"
import { ru } from "date-fns/locale"
import { master } from "@/config/master"
import type { AppState, Booking } from "./store"

export const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + m
}
export const fromMin = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`

export const dayKey = (d: Date) => format(d, "yyyy-MM-dd")

export const parseLocal = (s: string) => {
  const [date, time = "00:00"] = s.split("T")
  const [y, mo, d] = date.split("-").map(Number)
  const [h, mi] = time.split(":").map(Number)
  return new Date(y, mo - 1, d, h, mi)
}

export const bookingEnd = (b: Booking) => addMinutes(parseLocal(b.start), b.duration)

/** Свободные времена начала на дату для услуги заданной длительности */
export function getSlots(date: Date, duration: number, s: AppState, now = new Date()): string[] {
  const wd = s.week[date.getDay()]
  if (!wd?.enabled || s.daysOff.includes(dayKey(date))) return []
  const open = toMin(wd.from)
  const close = toMin(wd.to)
  const busy = s.bookings
    .filter((b) => b.status !== "cancelled" && isSameDay(parseLocal(b.start), date))
    .map((b) => {
      const st = parseLocal(b.start)
      const m = st.getHours() * 60 + st.getMinutes()
      return [m, m + b.duration] as const
    })
  const earliest = now.getTime() + master.minLeadHours * 3600_000
  const out: string[] = []
  for (let t = open; t + duration <= close; t += master.slotStepMin) {
    const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), Math.floor(t / 60), t % 60)
    if (startDate.getTime() < earliest) continue
    if (busy.some(([a, b]) => t < b && t + duration > a)) continue
    out.push(fromMin(t))
  }
  return out
}

export const rub = (n: number) => new Intl.NumberFormat("ru-RU").format(n) + " ₽"

export const price = (n: number, from?: boolean) => (from ? "от " : "") + rub(n)

export function dur(min: number) {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (!h) return `${m} мин`
  if (!m) return `${h} ч`
  return `${h} ч ${m} мин`
}

export const fmtDay = (d: Date) => format(d, "d MMMM, EEEE", { locale: ru })
export const fmtDayShort = (d: Date) => format(d, "d MMM, EEEEEE", { locale: ru })

export function plural(n: number, one: string, few: string, many: string) {
  const a = Math.abs(n) % 100
  const b = a % 10
  if (a > 10 && a < 20) return many
  if (b > 1 && b < 5) return few
  if (b === 1) return one
  return many
}

/** Файл .ics, чтобы клиентка добавила визит в свой календарь */
export function icsFor(b: Booking, address: string) {
  const st = parseLocal(b.start)
  const en = bookingEnd(b)
  const f = (d: Date) => format(d, "yyyyMMdd'T'HHmmss")
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//cosmo-app//RU",
    "BEGIN:VEVENT",
    `UID:${b.id}@cosmo-app`,
    `DTSTAMP:${f(new Date())}`,
    `DTSTART:${f(st)}`,
    `DTEND:${f(en)}`,
    `SUMMARY:${b.serviceTitle} — ${master.masterName}`,
    `LOCATION:${master.city}, ${address}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT3H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Напоминание о визите",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n")
}
