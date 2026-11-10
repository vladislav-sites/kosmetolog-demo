import { useSyncExternalStore } from "react"
import { addDays, format } from "date-fns"
import { master } from "@/config/master"
import type { Category, Profile, Service, ThemeId, WorkDay } from "@/config/types"
import { fromMin, parseLocal, toMin } from "@/lib/time"

/**
 * Слой данных. Сейчас всё хранится в браузере (localStorage) — для демо.
 * При запуске на реального мастера эти функции заменяются вызовами API
 * (сервер в РФ), интерфейс при этом не меняется.
 */

export type BookingStatus = "new" | "confirmed" | "done" | "cancelled"

/** Одна процедура внутри записи, когда клиентка выбрала несколько сразу */
export type BookingItem = { serviceId: string; title: string; price: number; duration: number }

export type Booking = {
  id: string
  /** Первая (или единственная) процедура */
  serviceId: string
  /** Несколько процедур — названия через « + » */
  serviceTitle: string
  /** Сумма по всем процедурам */
  price: number
  /** «от» перед суммой — если хоть у одной процедуры цена «от» */
  priceFrom?: boolean
  /** Есть, только если процедур в записи больше одной. Необязательное — старые сохранения подходят без шага в `migrate` */
  items?: BookingItem[]
  /** Локальное время, "YYYY-MM-DDTHH:mm" */
  start: string
  duration: number
  name: string
  /** Пустая строка — мастер добавила запись без телефона */
  phone: string
  comment?: string
  status: BookingStatus
  createdAt: string
  /** "master" — мастер внесла запись сама в кабинете; нет поля — клиентка записалась через сайт.
   *  Поле необязательное, поэтому старые сохранения подходят без шага в `migrate`. */
  source?: "master"
}

/** Пересекается ли время с другой (не отменённой) записью */
export function isBusy(bookings: Booking[], start: string, duration: number, ignoreId?: string) {
  const a = parseLocal(start).getTime()
  const b = a + duration * 60_000
  return bookings.some((x) => {
    if (x.id === ignoreId || x.status === "cancelled") return false
    const xa = parseLocal(x.start).getTime()
    return a < xa + x.duration * 60_000 && b > xa
  })
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
  /** Тексты, фото и контакты — «Моя страница» в кабинете */
  profile: Profile
}

const KEY = "cosmo-app-state"
const VERSION = 6

const THEME_IDS: ThemeId[] = ["noir", "milk", "rose"]

export const GIFT_MIN = 100
export const GIFT_MAX = 1_000_000

export const uid = () => Math.random().toString(36).slice(2, 10)

/**
 * Демо-записи. Дни и время подгоняются под график из master.ts: запись всегда в рабочий день
 * и в рабочие часы — иначе в демо видно запись, на которую через сайт попасть невозможно.
 */
function demoBookings(): Booking[] {
  const today = new Date()
  const svc = (id: string) => master.services.find((s) => s.id === id)!
  const works = (d: Date) => master.week[d.getDay()]?.enabled
  /** Ближайший рабочий день от today+offset в сторону dir */
  const workDay = (offset: number, dir: 1 | -1) => {
    let d = addDays(today, offset)
    for (let i = 0; i < 14 && !works(d); i++) d = addDays(d, dir)
    return d
  }
  /** Рабочие дни, начиная с завтрашнего */
  const upcoming: Date[] = []
  for (let i = 1; upcoming.length < 3 && i < 30; i++) if (works(addDays(today, i))) upcoming.push(addDays(today, i))

  const mk = (day: Date, afterOpen: number, serviceId: string, name: string, phone: string, status: BookingStatus): Booking => {
    const s = svc(serviceId)
    const wd = master.week[day.getDay()]
    // через afterOpen минут после открытия, но так, чтобы процедура закончилась до закрытия
    const t = Math.max(toMin(wd.from), Math.min(toMin(wd.from) + afterOpen, toMin(wd.to) - s.duration))
    return {
      id: uid(),
      serviceId,
      serviceTitle: s.title,
      price: s.price,
      priceFrom: s.priceFrom,
      start: `${format(day, "yyyy-MM-dd")}T${fromMin(t)}`,
      duration: s.duration,
      name,
      phone,
      status,
      createdAt: new Date().toISOString(),
    }
  }
  const [d1, d2, d3] = upcoming
  return [
    mk(workDay(-40, -1), 120, "us-clean", "Алина", "+7 900 111-22-33", "done"),
    mk(workDay(-16, -1), 180, "almond-peel", "Марина", "+7 900 222-33-44", "done"),
    mk(workDay(-9, -1), 60, "sculpt-massage", "Ольга", "+7 900 333-44-55", "done"),
    ...(d1
      ? [
          mk(d1, 0, "consult", "Екатерина", "+7 900 444-55-66", "new"),
          mk(d1, 120, "combo-clean", "Диана", "+7 900 555-66-77", "confirmed"),
        ]
      : []),
    ...(d2 ? [mk(d2, 30, "almond-peel", "Марина", "+7 900 222-33-44", "confirmed")] : []),
    ...(d3 ? [mk(d3, 180, "hydra-care", "Ксения", "+7 900 666-77-88", "new")] : []),
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
    profile: defaultProfile(),
  }
}

function defaultProfile(): Profile {
  return {
    name: master.masterName,
    brand: master.brand?.trim() || undefined,
    role: master.role,
    city: master.city,
    tagline: master.tagline,
    intro: master.intro,
    experienceYears: master.experienceYears,
    about: [...master.about],
    education: master.education.map((e) => ({ ...e })),
    principles: master.principles.map((p) => ({ ...p })),
    portrait: master.portrait,
    phone: master.phone,
    address: master.address,
    addressNote: master.addressNote,
    telegram: master.telegram,
    whatsapp: master.whatsapp,
    vk: master.vk,
  }
}

/** Как подписывать сайт: название студии, а если его нет — имя мастера */
export const brandOf = (p: Pick<Profile, "name" | "brand">) => p.brand || p.name

export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("")

/** Ссылка на Яндекс Карты строится из города и адреса — отдельно её вводить не нужно */
export const mapUrl = (p: Pick<Profile, "city" | "address">) =>
  `https://yandex.ru/maps/?text=${encodeURIComponent(`${p.city}, ${p.address}`)}`

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
  // v3 → v4: тогда добавляли тему «Аметист» (потом убрана) — сохранённая тема сбрасывается на основную
  if (s.version === 3) s = { ...s, version: 4, theme: master.theme }
  // v4 → v5: тексты, фото и контакты стали редактируемыми («Моя страница»)
  if (s.version === 4) s = { ...s, version: 5, profile: defaultProfile() }
  // v5 → v6: имя мастера и название студии тоже правятся в кабинете
  if (s.version === 5)
    s = { ...s, version: 6, profile: { ...s.profile, name: master.masterName, brand: master.brand?.trim() || undefined } }
  if (s.version !== VERSION) return null
  // Сохранённая тема могла быть удалена из шаблона (например, «Аметист») — тогда берём основную
  if (!THEME_IDS.includes(s.theme)) s = { ...s, theme: master.theme }
  return s
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

/** Возвращает false, если сохранить не удалось (например, кончилось место под фото) */
function commit(next: AppState): boolean {
  state = next
  let saved = true
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    saved = false
  }
  listeners.forEach((l) => l())
  return saved
}

/** Сохранить, а если не вышло — вернуть как было, чтобы на экране не осталось несохранённого */
function commitOrRollback(next: AppState): boolean {
  const prev = state
  if (commit(next)) return true
  commit(prev)
  return false
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
  /** Запись, которую мастер внесла сама (клиентка позвонила, написала в мессенджер).
   *  Сразу подтверждена. null — время уже занято другой записью. */
  addManualBooking(b: Omit<Booking, "id" | "status" | "createdAt" | "source">): Booking | null {
    if (isBusy(state.bookings, b.start, b.duration)) return null
    const booking: Booking = { ...b, id: uid(), status: "confirmed", source: "master", createdAt: new Date().toISOString() }
    commit({ ...state, bookings: [...state.bookings, booking] })
    return booking
  },
  setBookingStatus(id: string, status: BookingStatus) {
    commit({ ...state, bookings: state.bookings.map((b) => (b.id === id ? { ...b, status } : b)) })
  },
  /** false — не сохранилось (не хватило места, обычно из-за фото); изменения откатываются */
  updateService(id: string, patch: Partial<Service>): boolean {
    const unfeature = patch.featured === true
    return commitOrRollback({
      ...state,
      services: state.services.map((s) => (s.id === id ? { ...s, ...patch } : unfeature ? { ...s, featured: false } : s)),
    })
  },
  /** Новая процедура встаёт в конец своего раздела. null — не сохранилась */
  addService(svc: Omit<Service, "id">): Service | null {
    const created: Service = { ...svc, id: uid() }
    const list = [...state.services]
    const lastInCat = list.map((s) => s.categoryId).lastIndexOf(svc.categoryId)
    list.splice(lastInCat === -1 ? list.length : lastInCat + 1, 0, created)
    const ok = commitOrRollback({
      ...state,
      services: created.featured ? list.map((s) => (s.id === created.id ? s : { ...s, featured: false })) : list,
    })
    return ok ? created : null
  },
  saveProfile(profile: Profile): boolean {
    return commitOrRollback({ ...state, profile })
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
