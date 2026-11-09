import { useSyncExternalStore } from "react"
import { addDays, format } from "date-fns"
import { master } from "@/config/master"
import type { Category, Service, ThemeId, WorkDay } from "@/config/types"

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
  categories: Category[]
  services: Service[]
  week: Record<number, WorkDay>
  daysOff: string[]
  theme: ThemeId
  bookings: Booking[]
  gifts: GiftRequest[]
  /** Ровно три номинала сертификата, мастер меняет их в кабинете */
  giftAmounts: number[]
}

const KEY = "cosmo-app-state"
const VERSION = 4

export const GIFT_MIN = 100
export const GIFT_MAX = 1_000_000

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
    categories: master.categories.map((c) => ({ ...c })),
    services: master.services.map((s) => ({ ...s })),
    week: structuredClone(master.week),
    daysOff: [],
    theme: master.theme,
    bookings: master.demo ? demoBookings() : [],
    gifts: [],
    giftAmounts: defaultGiftAmounts(),
  }
}

function defaultGiftAmounts() {
  const a = master.giftAmounts.slice(0, 3)
  while (a.length < 3) a.push(a[a.length - 1] ?? 3000)
  return a
}

/** Подтягивает сохранённые данные старых версий до текущей, ничего не теряя */
function migrate(p: AppState): AppState | null {
  let s = p
  // v1 → v2: разделы процедур стали редактируемыми
  if (s.version === 1) s = { ...s, version: 2, categories: master.categories.map((c) => ({ ...c })) }
  // v2 → v3: номиналы сертификатов стали редактируемыми
  if (s.version === 2) s = { ...s, version: 3, giftAmounts: defaultGiftAmounts() }
  // v3 → v4: появилась тема «Аметист» — один раз показываем её всем, дальше выбор снова запоминается
  if (s.version === 3) s = { ...s, version: 4, theme: master.theme }
  return s.version === VERSION ? s : null
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const migrated = migrate(JSON.parse(raw) as AppState)
      if (migrated) return migrated
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
    const unfeature = patch.featured === true
    commit({
      ...state,
      services: state.services.map((s) => (s.id === id ? { ...s, ...patch } : unfeature ? { ...s, featured: false } : s)),
    })
  },
  /** Новая процедура встаёт в конец своего раздела */
  addService(svc: Omit<Service, "id">): Service {
    const created: Service = { ...svc, id: uid() }
    const list = [...state.services]
    const lastInCat = list.map((s) => s.categoryId).lastIndexOf(svc.categoryId)
    list.splice(lastInCat === -1 ? list.length : lastInCat + 1, 0, created)
    commit({
      ...state,
      services: created.featured ? list.map((s) => (s.id === created.id ? s : { ...s, featured: false })) : list,
    })
    return created
  },
  /** Прошлые и будущие записи хранят название и цену сами, поэтому удаление их не ломает */
  deleteService(id: string) {
    commit({ ...state, services: state.services.filter((s) => s.id !== id) })
  },
  /** Сдвинуть процедуру вверх/вниз внутри её раздела */
  moveService(id: string, dir: -1 | 1) {
    const list = [...state.services]
    const i = list.findIndex((s) => s.id === id)
    if (i === -1) return
    let j = i + dir
    while (j >= 0 && j < list.length && list[j].categoryId !== list[i].categoryId) j += dir
    if (j < 0 || j >= list.length) return
    ;[list[i], list[j]] = [list[j], list[i]]
    commit({ ...state, services: list })
  },
  addCategory(title: string): Category {
    const c: Category = { id: uid(), title: title.trim(), description: "" }
    commit({ ...state, categories: [...state.categories, c] })
    return c
  },
  updateCategory(id: string, patch: Partial<Category>) {
    commit({ ...state, categories: state.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) })
  },
  /** Удалить можно только пустой раздел */
  deleteCategory(id: string) {
    if (state.services.some((s) => s.categoryId === id)) return false
    commit({ ...state, categories: state.categories.filter((c) => c.id !== id) })
    return true
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
  /** Поменять один из трёх номиналов (index 0–2). Возвращает сохранённое значение или null, если сумма не подходит */
  setGiftAmount(index: number, value: number): number | null {
    const v = Math.round(value)
    if (!Number.isFinite(v) || v < GIFT_MIN || v > GIFT_MAX || index < 0 || index > 2) return null
    commit({ ...state, giftAmounts: state.giftAmounts.map((a, i) => (i === index ? v : a)) })
    return v
  },
  setGiftStatus(id: string, status: GiftRequest["status"]) {
    commit({ ...state, gifts: state.gifts.map((g) => (g.id === id ? { ...g, status } : g)) })
  },
  resetDemo() {
    commit(initialState())
  },
}
