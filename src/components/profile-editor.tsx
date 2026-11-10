import { useEffect, useRef, useState } from "react"
import { Link } from "react-router"
import { toast } from "sonner"
import { ExternalLink, ImagePlus, Plus, Trash2 } from "lucide-react"
import type { Profile } from "@/config/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Portrait, ThemePicker } from "@/components/bits"
import { actions, getState, useAppState } from "@/lib/store"
import { compressImage } from "@/lib/image"
import { formatPhone } from "@/lib/phone"

/** Форма: «Обо мне» редактируется одним текстом (абзацы через пустую строку), стаж — строкой */
type Form = Omit<Profile, "about" | "experienceYears"> & { about: string; experienceYears: string }

const toForm = (p: Profile): Form => ({
  ...p,
  about: p.about.join("\n\n"),
  experienceYears: p.experienceYears ? String(p.experienceYears) : "",
  education: p.education.map((e) => ({ ...e })),
  principles: p.principles.map((x) => ({ ...x })),
})

const clean = (v?: string) => (v ?? "").trim() || undefined

const toProfile = (f: Form): Profile => ({
  name: f.name.replace(/\s+/g, " ").trim(),
  brand: clean(f.brand?.replace(/\s+/g, " ")),
  role: f.role.trim(),
  city: f.city.trim(),
  tagline: f.tagline.trim(),
  intro: f.intro.trim(),
  experienceYears: Math.max(0, Math.min(80, Number(f.experienceYears) || 0)),
  about: f.about
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean),
  education: f.education.map((e) => ({ year: e.year.trim(), title: e.title.trim(), place: e.place.trim() })).filter((e) => e.title),
  principles: f.principles.map((x) => ({ title: x.title.trim(), text: x.text.trim() })).filter((x) => x.title),
  portrait: f.portrait,
  phone: f.phone.replace(/^\+7$/, "").trim(),
  address: f.address.trim(),
  addressNote: clean(f.addressNote),
  telegram: clean(f.telegram),
  whatsapp: clean(f.whatsapp),
  vk: clean(f.vk),
})

/** Черновик живёт вне компонента: переключилась на «Записи» и обратно — правки на месте */
let draft: Form | null = null

type Status = "saved" | "pending" | "error" | "invalid" | "noName"

export function ProfileEditor() {
  const profile = useAppState((s) => s.profile)
  const [f, setF] = useState<Form>(() => draft ?? toForm(profile))
  const [status, setStatus] = useState<Status>("saved")
  const [busyPhoto, setBusyPhoto] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const fRef = useRef(f)
  const timer = useRef<number | undefined>(undefined)

  /**
   * Автосохранение, как везде в кабинете: текст — через секунду после того, как перестала печатать,
   * удаление, добавление, фото — сразу. Кнопки «Сохранить» нет.
   */
  const flush = () => {
    window.clearTimeout(timer.current)
    timer.current = undefined
    const cur = fRef.current
    const saved = getState().profile
    const emptyTagline = !cur.tagline.trim()
    const emptyName = !cur.name.trim()
    // Пустые заголовок и имя не сохраняем — на сайте остаются прежние, всё остальное сохраняется
    const base = toProfile(cur)
    const next = { ...base, tagline: emptyTagline ? saved.tagline : base.tagline, name: emptyName ? saved.name : base.name }
    ownSave.current = next
    if (JSON.stringify(next) !== JSON.stringify(saved) && !actions.saveProfile(next)) {
      setStatus("error")
      toast.error("Не хватило места для фото — изменения не сохранились. Попробуйте фото поменьше.")
      const back = toForm(getState().profile)
      fRef.current = back
      draft = null
      setF(back)
      return
    }
    draft = emptyTagline || emptyName ? cur : null
    setStatus(emptyName ? "noName" : emptyTagline ? "invalid" : "saved")
  }

  const update = (patch: Partial<Form>, now = false) => {
    const next = { ...fRef.current, ...patch }
    fRef.current = next
    draft = next
    setF(next)
    setStatus("pending")
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(flush, now ? 0 : 900)
  }

  // Ушла на другую вкладку кабинета, не дождавшись автосохранения, — сохраняем сразу
  useEffect(() => () => {
    if (timer.current !== undefined) flush()
  }, [])

  // Свернула или закрыла приложение, не дождавшись автосохранения, — тоже сохраняем сразу
  const flushRef = useRef(flush)
  flushRef.current = flush
  useEffect(() => {
    const now = () => {
      if (timer.current !== undefined) flushRef.current()
    }
    const onVis = () => document.visibilityState === "hidden" && now()
    document.addEventListener("visibilitychange", onVis)
    window.addEventListener("pagehide", now)
    return () => {
      document.removeEventListener("visibilitychange", onVis)
      window.removeEventListener("pagehide", now)
    }
  }, [])

  // Профиль поменялся не отсюда («Сбросить демо», другая вкладка браузера) — показываем актуальное
  const ownSave = useRef(profile)
  useEffect(() => {
    if (timer.current !== undefined || profile === ownSave.current) return
    if (JSON.stringify(profile) === JSON.stringify(toProfile(fRef.current))) return
    draft = null
    const fresh = toForm(profile)
    fRef.current = fresh
    setF(fresh)
    setStatus("saved")
  }, [profile])

  const taglineEmpty = !f.tagline.trim()
  const nameEmpty = !f.name.trim()

  const pickPhoto = async (file?: File) => {
    if (!file) return
    setBusyPhoto(true)
    try {
      update({ portrait: await compressImage(file, 1100) }, true)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не получилось загрузить фото")
    } finally {
      setBusyPhoto(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  return (
    <section className="pb-28">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl">Моя страница</h2>
          <p className="mt-1 text-sm text-muted-foreground">Фото, тексты и контакты на сайте. Всё сохраняется само.</p>
          <SaveStatus status={status} />
        </div>
        <Button asChild variant="outline" size="sm" className="rounded-full bg-transparent">
          <Link to="/" target="_blank">
            <ExternalLink /> Открыть сайт
          </Link>
        </Button>
      </div>

      <div className="mt-6 space-y-4">
        {/* ——— Имя и студия ——— */}
        <Card title="Имя и студия" hint="Видно в шапке сайта, на сертификате и на заставке при открытии приложения.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="pf-name" label="Имя и фамилия" error={nameEmpty ? "Без имени сайт будет безымянным" : undefined}>
              <Input
                id="pf-name"
                value={f.name}
                maxLength={40}
                autoComplete="name"
                onChange={(e) => update({ name: e.target.value })}
                placeholder="Вера Лаврова"
                className="h-11 rounded-xl"
              />
            </Field>
            <Field id="pf-brand" label="Название студии" hint="необязательно">
              <Input
                id="pf-brand"
                value={f.brand ?? ""}
                maxLength={40}
                onChange={(e) => update({ brand: e.target.value })}
                placeholder="Например: Тихая кожа"
                className="h-11 rounded-xl"
              />
            </Field>
          </div>
          <p className="text-xs text-muted-foreground">Нет названия — оставьте поле пустым: тогда на сайте везде будет ваше имя.</p>
        </Card>

        {/* ——— Оформление: сразу после имени, чтобы не искать в самом низу ——— */}
        <Card title="Цвета сайта" hint="Нажмите на вариант — сайт сразу перекрасится. Видно и на этой странице.">
          <ThemePicker />
        </Card>

        {/* ——— Фото ——— */}
        <Card title="Фото">
          <div className="flex flex-wrap items-center gap-5">
            <Portrait src={f.portrait} className="w-24 shrink-0 sm:w-32 [&>span]:text-4xl sm:[&>span]:text-5xl" />
            <div className="min-w-40 flex-1 space-y-3">
              <p className="text-sm text-muted-foreground">Лучше вертикальное фото, лицо ближе к центру. Большие фото с телефона уменьшаются автоматически.</p>
              <div className="flex flex-wrap gap-2">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickPhoto(e.target.files?.[0])} />
                <Button className="rounded-full" disabled={busyPhoto} onClick={() => fileRef.current?.click()}>
                  <ImagePlus /> {busyPhoto ? "Обрабатываю…" : f.portrait ? "Заменить фото" : "Загрузить фото"}
                </Button>
                {f.portrait && (
                  <Button variant="ghost" className="rounded-full text-destructive hover:text-destructive" onClick={() => update({ portrait: undefined }, true)}>
                    <Trash2 /> Убрать
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* ——— Главный экран ——— */}
        <Card title="Главный экран">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="pf-role" label="Специализация">
              <Input id="pf-role" value={f.role} onChange={(e) => update({ role: e.target.value })} placeholder="косметолог-эстетист" className="h-11 rounded-xl" />
            </Field>
            <Field id="pf-city" label="Город">
              <Input id="pf-city" value={f.city} onChange={(e) => update({ city: e.target.value })} placeholder="Казань" className="h-11 rounded-xl" />
            </Field>
          </div>
          <Field id="pf-tagline" label="Заголовок" hint={`${f.tagline.length}/120`} error={taglineEmpty ? "Без заголовка главный экран будет пустым" : undefined}>
            <Textarea
              id="pf-tagline"
              value={f.tagline}
              maxLength={120}
              onChange={(e) => update({ tagline: e.target.value.replace(/\n/g, " ") })}
              className="min-h-16 rounded-xl text-base"
            />
          </Field>
          <Field id="pf-intro" label="Текст под заголовком" hint={`${f.intro.length}/400`}>
            <Textarea id="pf-intro" value={f.intro} maxLength={400} onChange={(e) => update({ intro: e.target.value })} className="min-h-24 rounded-xl" />
          </Field>
          <Field id="pf-years" label="Лет практики" hint="0 или пусто — не показывать">
            <Input
              id="pf-years"
              inputMode="numeric"
              value={f.experienceYears}
              onChange={(e) => update({ experienceYears: e.target.value.replace(/\D/g, "").slice(0, 2) })}
              className="h-11 w-28 rounded-xl tabular-nums"
            />
          </Field>
        </Card>

        {/* ——— Обо мне ——— */}
        <Card title="Обо мне" hint="Страница «Обо мне». Новый абзац — через пустую строку.">
          <Textarea id="pf-about" aria-label="Обо мне" value={f.about} onChange={(e) => update({ about: e.target.value })} className="min-h-36 rounded-xl" />
        </Card>

        {/* ——— Образование ——— */}
        <Card title="Образование">
          <div className="space-y-3">
            {f.education.map((e, i) => (
              <div key={i} className="space-y-2 rounded-xl border border-border p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <Input
                    aria-label="Год"
                    inputMode="numeric"
                    value={e.year}
                    placeholder="Год"
                    onChange={(ev) => update({ education: f.education.map((x, j) => (j === i ? { ...x, year: ev.target.value.replace(/[^\d–-]/g, "").slice(0, 9) } : x)) })}
                    className="h-10 w-24 rounded-lg tabular-nums"
                  />
                  <RemoveButton label="Удалить строку образования" onClick={() => update({ education: f.education.filter((_, j) => j !== i) }, true)} />
                </div>
                <div className="min-w-0 space-y-2">
                  <Textarea
                    aria-label="Что окончили"
                    rows={1}
                    value={e.title}
                    placeholder="Курс, специальность"
                    onChange={(ev) =>
                      update({ education: f.education.map((x, j) => (j === i ? { ...x, title: ev.target.value.replace(/\n/g, " ") } : x)) })
                    }
                    className="min-h-10 resize-none rounded-lg py-2"
                  />
                  <Input
                    aria-label="Где"
                    value={e.place}
                    placeholder="Где учились"
                    onChange={(ev) => update({ education: f.education.map((x, j) => (j === i ? { ...x, place: ev.target.value } : x)) })}
                    className="h-10 rounded-lg"
                  />
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" className="rounded-full bg-transparent" onClick={() => update({ education: [...f.education, { year: "", title: "", place: "" }] })}>
              <Plus /> Добавить
            </Button>
          </div>
        </Card>

        {/* ——— Как я работаю ——— */}
        <Card title="Как я работаю" hint="Блок на главной. Удалите все пункты — блок пропадёт с сайта.">
          <div className="space-y-3">
            {f.principles.map((x, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto] items-start gap-2 rounded-xl border border-border p-2.5">
                <div className="min-w-0 space-y-2">
                  <Textarea
                    aria-label="Заголовок пункта"
                    rows={1}
                    value={x.title}
                    placeholder="Например: Только одноразовые расходники"
                    onChange={(ev) => update({ principles: f.principles.map((y, j) => (j === i ? { ...y, title: ev.target.value.replace(/\n/g, " ") } : y)) })}
                    className="min-h-10 resize-none rounded-lg py-2"
                  />
                  <Textarea
                    aria-label="Пояснение"
                    value={x.text}
                    placeholder="Пояснение (можно не писать)"
                    onChange={(ev) => update({ principles: f.principles.map((y, j) => (j === i ? { ...y, text: ev.target.value } : y)) })}
                    className="min-h-16 rounded-lg"
                  />
                </div>
                <RemoveButton label="Удалить пункт" onClick={() => update({ principles: f.principles.filter((_, j) => j !== i) }, true)} />
              </div>
            ))}
            {f.principles.length < 6 && (
              <Button variant="outline" size="sm" className="rounded-full bg-transparent" onClick={() => update({ principles: [...f.principles, { title: "", text: "" }] })}>
                <Plus /> Добавить пункт
              </Button>
            )}
          </div>
        </Card>

        {/* ——— Контакты ——— */}
        <Card title="Контакты и адрес" hint="Ссылка «Открыть на карте» строится по адресу сама.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="pf-phone" label="Телефон">
              <Input
                id="pf-phone"
                inputMode="tel"
                value={f.phone}
                onFocus={() => !f.phone && update({ phone: "+7" })}
                onChange={(e) => update({ phone: formatPhone(e.target.value) })}
                className="h-11 rounded-xl tabular-nums"
              />
            </Field>
            <Field id="pf-address" label="Адрес">
              <Input id="pf-address" value={f.address} onChange={(e) => update({ address: e.target.value })} placeholder="ул. Островского, 38, каб. 4" className="h-11 rounded-xl" />
            </Field>
            <Field id="pf-note" label="Как найти вход" hint="необязательно">
              <Input id="pf-note" value={f.addressNote ?? ""} onChange={(e) => update({ addressNote: e.target.value })} placeholder="вход со двора, домофон 4" className="h-11 rounded-xl" />
            </Field>
            <Field id="pf-tg" label="Telegram" hint="ник или ссылка">
              <Input id="pf-tg" value={f.telegram ?? ""} onChange={(e) => update({ telegram: e.target.value })} placeholder="@ваш_ник" className="h-11 rounded-xl" />
            </Field>
            <Field id="pf-wa" label="WhatsApp" hint="номер">
              <Input
                id="pf-wa"
                inputMode="tel"
                value={f.whatsapp ?? ""}
                onChange={(e) => update({ whatsapp: e.target.value.replace(/[^\d+\s()-]/g, "") })}
                placeholder="+7 900 000-00-00"
                className="h-11 rounded-xl tabular-nums"
              />
            </Field>
            <Field id="pf-vk" label="ВКонтакте" hint="ник или ссылка">
              <Input id="pf-vk" value={f.vk ?? ""} onChange={(e) => update({ vk: e.target.value })} placeholder="vk.com/…" className="h-11 rounded-xl" />
            </Field>
          </div>
        </Card>      </div>

    </section>
  )
}

function SaveStatus({ status }: { status: Status }) {
  const map: Record<Status, { text: string; cls: string }> = {
    saved: { text: "✓ Всё сохранено — уже на сайте", cls: "text-emerald-700 dark:text-emerald-400" },
    pending: { text: "Сохраняю…", cls: "text-muted-foreground" },
    error: { text: "Не сохранилось — фото слишком большое", cls: "text-destructive" },
    invalid: { text: "Заголовок пустой — на сайте остался прежний. Остальное сохранено.", cls: "text-destructive" },
    noName: { text: "Имя пустое — на сайте осталось прежнее. Остальное сохранено.", cls: "text-destructive" },
  }
  const s = map[status]
  return (
    <p role="status" aria-live="polite" className={`mt-2 text-xs font-medium ${s.cls}`}>
      {s.text}
    </p>
  )
}

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
      <div>
        <p className="font-medium">{title}</p>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={id} className="flex flex-wrap items-baseline gap-x-2">
        {label}
        {hint && <span className="text-xs font-normal text-muted-foreground tabular-nums">{hint}</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label={label} className="grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-destructive">
      <Trash2 className="size-4" />
    </button>
  )
}
