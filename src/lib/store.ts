import { useSyncExternalStore } from "react"
import { addDays, format } from "date-fns"
import { master } from "@/config/master"
import type { Service, ThemeId, WorkDay } from "@/config/types"

/**
 * Слой данных. Сейчас всё хранится в браузере (localStorage) — для демо.
 * При запуске на реального мастера эти функции заменяются вызовами API
 * (сервер в РФ), интерфейс при этом не меняется.
 */

export type BookingStatus = "new" | "confirmed" | "done" | "cancelled"

export type Booking = {
  id: string
  serviceId: string
  serviceTitle: string
  price: number
  /** Локальное время, "YYYY-MM-DDTHH:mm" */
  start: string
  duration: number
  name: string
  phone: string
  comment?: string
  status: BookingStatus
  createdAt: string
}

export type GiftRequest = {
  id: string
  amount: number
  buyerName: string
  phone: string
  forName?: string
  status: "new" | "done"
  createdAt: string
}

export type AppState = {
  version: number
  services: Service[]
  week: Record<number, WorkDay>
  daysOff: string[]
  theme: ThemeId
  bookings: Booking[]
  gifts: GiftRequest[]
}

const KEY = "cosmo-app-state"
const VERSION = 1

export const uid = () => Math.random().toString(36).slice(2, 10)

function demoBookings(): Booking[] {
  const today = new Date()
  const d = (offset: number) => format(addDays(today, offset), "yyyy-MM-dd")
  const svc = (id: string) => master.services.find((s) => s.id === id)!
  const mk = (offset: number, time: string, serviceId: string, name: string, phone: string, status: BookingStatus): Booking => {
    const s = svc(serviceId)
    return {
      id: uid(),
      serviceId,
      serviceTitle: s.title,
      price: s.price,
      start: `${d(offset)}T${time}`,
      duration: s.duration,
      name,
      phone,
      status,
      createdAt: new Date().toISOString(),
    }
  }
  return [
    mk(-40, "12:00", "us-clean", "Алина", "+7 900 111-22-33", "done"),
    mk(-16, "15:00", "almond-peel", "Марина", "+7 900 222-33-44", "done"),
    mk(-9, "11:00", "sculpt-massage", "Ольга", "+7 900 333-44-55", "done"),
    mk(1, "11:00", "consult", "Екатерина", "+7 900 444-55-66", "new"),
    mk(1, "14:00", "combo-clean", "Диана", "+7 900 555-66-77", "confirmed"),
    mk(2, "12:30", "almond-peel", "Марина", "+7 900 222-33-44", "confirmed"),
    mk(3, "16:00", "hydra-care", "Ксения", "+7 900 666-77-88", "new"),
  ]
}

function initialState(): AppState {
  return {
    version: VERSION,
    services: master.services.map((s) => ({ ...s })),
    week: structuredClone(master.week),
    daysOff: [],
    theme: master.theme,
    bookings: master.demo ? demoBookings() : [],
    gifts: [],
  }
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppState
      if (parsed.version === VERSION) return parsed
    }
  } catch {
    /* хранилище недоступно — работаем в памяти */
  }
  return initialState()
}

let state: AppState = load()
const listeners = new Set<() => void>()

function commit(next: AppState) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      state = load()
      l()
    }
  }
  window.addEventListener("storage", onStorage)
  return () => {
    listeners.delete(l)
    window.removeEventListener("storage", onStorage)
  }
}

export function useAppState<T>(select: (s: AppState) => T): T {
  return useSyncExternalStore(subscribe, () => select(state))
}

export const getState = () => state

export const actions = {
  addBooking(b: Omit<Booking, "id" | "status" | "createdAt">): Booking {
    const booking: Booking = { ...b, id: uid(), status: "new", createdAt: new Date().toISOString() }
    commit({ ...state, bookings: [...state.bookings, booking] })
    return booking
  },
  setBookingStatus(id: string, status: BookingStatus) {
    commit({ ...state, bookings: state.bookings.map((b) => (b.id === id ? { ...b, status } : b)) })
  },
  updateService(id: string, patch: Partial<Service>) {
    commit({ ...state, services: state.services.map((s) => (s.id === id ? { ...s, ...patch } : s)) })
  },
  setWorkDay(day: number, patch: Partial<WorkDay>) {
    commit({ ...state, week: { ...state.week, [day]: { ...state.week[day], ...patch } } })
  },
  toggleDayOff(date: string) {
    const has = state.daysOff.includes(date)
    commit({ ...state, daysOff: has ? state.daysOff.filter((d) => d !== date) : [...state.daysOff, date] })
  },
  setTheme(theme: ThemeId) {
    commit({ ...state, theme })
  },
  addGift(g: Omit<GiftRequest, "id" | "status" | "createdAt">) {
    commit({ ...state, gifts: [...state.gifts, { ...g, id: uid(), status: "new", createdAt: new Date().toISOString() }] })
  },
  setGiftStatus(id: string, status: GiftRequest["status"]) {
    commit({ ...state, gifts: state.gifts.map((g) => (g.id === id ? { ...g, status } : g)) })
  },
  resetDemo() {
    commit(initialState())
  },
}
