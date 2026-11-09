export type ThemeId = "violet" | "milk" | "olive" | "noir"

export type Service = {
  id: string
  categoryId: string
  title: string
  /** Короткая строка для карточки */
  short: string
  /** Длительность в минутах — на это время занимается слот */
  duration: number
  price: number
  /** «от» перед ценой */
  priceFrom?: boolean
  /** Описание для страницы процедуры */
  about: string
  steps?: string[]
  effect?: string
  /** Рекомендованный курс */
  course?: { sessions: number; intervalDays: number }
  /** Через сколько дней звать повторно (для напоминаний в кабинете) */
  repeatAfterDays?: number
  prep?: string[]
  contraindications?: string[]
  photo?: string
  active: boolean
  /** Показывать первой — консультация */
  featured?: boolean
}

export type Category = { id: string; title: string; description: string }

export type WorkDay = { enabled: boolean; from: string; to: string }

export type MasterConfig = {
  brand: string
  masterName: string
  role: string
  city: string
  address: string
  addressNote?: string
  phone: string
  telegram?: string
  whatsapp?: string
  vk?: string
  instagram?: string
  mapUrl?: string
  tagline: string
  intro: string
  about: string[]
  experienceYears: number
  education: { year: string; title: string; place: string }[]
  principles: { title: string; text: string }[]
  portrait?: string
  theme: ThemeId
  categories: Category[]
  services: Service[]
  /** 0 = воскресенье … 6 = суббота */
  week: Record<number, WorkDay>
  slotStepMin: number
  bookingHorizonDays: number
  minLeadHours: number
  giftAmounts: number[]
  adminPin: string
  legalName: string
  /** Показывать панель «демо» со сменой оформления */
  demo: boolean
}
