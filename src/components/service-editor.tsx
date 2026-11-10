import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Trash2, X } from "lucide-react"
import { cn } from "cn"
import type { Service } from "@/config/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { NativeSelect } from "@/components/ui/native-select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { actions, useAppState } from "@/lib/store"
import { dur } from "@/lib/time"
import { compressImage } from "@/lib/image"
import { ImagePlus } from "lucide-react"

export const DURATIONS = Array.from({ length: 16 }, (_, i) => 15 + i * 15) // 15 мин … 4 ч
const NEW_CAT = "__new__"

const lines = (v: string) =>
  v
    .split("\n")
    .map((s) => s.replace(/^[\s•\-–—\d.)]+/, "").trim())
    .filter(Boolean)
const unlines = (a?: string[]) => (a ?? []).join("\n")
const num = (v: string) => (v.trim() === "" ? undefined : Math.max(0, Math.round(Number(v.replace(/\s/g, "")) || 0)))

type Form = {
  title: string
  categoryId: string
  newCategory: string
  short: string
  price: string
  priceFrom: boolean
  duration: number
  about: string
  steps: string
  effect: string
  prep: string
  contraindications: string
  courseSessions: string
  courseInterval: string
  active: boolean
  featured: boolean
  photo?: string
}

function toForm(s: Service | undefined, fallbackCat: string): Form {
  return {
    title: s?.title ?? "",
    categoryId: s?.categoryId ?? fallbackCat,
    newCategory: "",
    short: s?.short ?? "",
    price: s ? String(s.price) : "",
    priceFrom: s?.priceFrom ?? false,
    duration: s?.duration ?? 60,
    about: s?.about ?? "",
    steps: unlines(s?.steps),
    effect: s?.effect ?? "",
    prep: unlines(s?.prep),
    contraindications: unlines(s?.contraindications),
    courseSessions: s?.course ? String(s.course.sessions) : "",
    courseInterval: s?.course ? String(s.course.intervalDays) : "",
    active: s?.active ?? true,
    featured: s?.featured ?? false,
    photo: s?.photo,
  }
}

/**
 * Редактор процедуры в кабинете мастера.
 * `service` — существующая процедура, `null` — новая, `undefined` — закрыт.
 */
export function ServiceEditor({ service, onClose }: { service: Service | null | undefined; onClose: () => void }) {
  const open = service !== undefined
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" showCloseButton={false} className="gap-0 overflow-y-auto p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-lg">
        {open && <EditorBody key={service?.id ?? "new"} service={service ?? undefined} onClose={onClose} />}
      </SheetContent>
    </Sheet>
  )
}

function EditorBody({ service, onClose }: { service?: Service; onClose: () => void }) {
  const categories = useAppState((s) => s.categories)
  const [f, setF] = useState<Form>(() => toForm(service, categories[0]?.id ?? NEW_CAT))
  const [tried, setTried] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }))
  const newCatRef = useRef<HTMLInputElement>(null)

  // Выбрали «Новый раздел» — курсор в поле названия. С задержкой: список сначала возвращает фокус на себя.
  useEffect(() => {
    if (f.categoryId !== NEW_CAT || !newCatRef.current) return
    const t = window.setTimeout(() => newCatRef.current?.focus(), 60)
    return () => window.clearTimeout(t)
  }, [f.categoryId])

  const isNew = !service
  const priceNum = num(f.price)
  const errors = {
    title: !f.title.trim() ? "Как называется процедура?" : "",
    price: priceNum === undefined ? "Укажите цену" : "",
    category: f.categoryId === NEW_CAT && !f.newCategory.trim() ? "Название нового раздела" : "",
  }
  const hasErrors = Object.values(errors).some(Boolean)

  const save = () => {
    setTried(true)
    if (hasErrors) {
      requestAnimationFrame(() => document.querySelector("[data-editor-error]")?.scrollIntoView({ block: "center", behavior: "smooth" }))
      return
    }
    const categoryId = f.categoryId === NEW_CAT ? actions.addCategory(f.newCategory).id : f.categoryId
    const sessions = num(f.courseSessions)
    const interval = num(f.courseInterval)
    const steps = lines(f.steps)
    const prep = lines(f.prep)
    const contra = lines(f.contraindications)
    const data: Omit<Service, "id"> = {
      title: f.title.trim(),
      categoryId,
      short: f.short.trim(),
      price: priceNum ?? 0,
      priceFrom: f.priceFrom || undefined,
      duration: f.duration,
      about: f.about.trim(),
      steps: steps.length ? steps : undefined,
      effect: f.effect.trim() || undefined,
      prep: prep.length ? prep : undefined,
      contraindications: contra.length ? contra : undefined,
      course: sessions && interval ? { sessions, intervalDays: interval } : undefined,
      photo: f.photo,
      active: f.active,
      featured: f.featured || undefined,
    }
    const ok = isNew ? !!actions.addService(data) : actions.updateService(service.id, data)
    if (!ok) {
      toast.error("Не хватило места для фото. Попробуйте фото поменьше или уберите его.")
      return
    }
    toast.success(isNew ? (f.active ? "Процедура добавлена — она уже на сайте" : "Процедура добавлена (скрыта с сайта)") : "Сохранено")
    onClose()
  }

  const fileRef = useRef<HTMLInputElement>(null)
  const [busyPhoto, setBusyPhoto] = useState(false)
  const pickPhoto = async (file?: File) => {
    if (!file) return
    setBusyPhoto(true)
    try {
      set("photo", await compressImage(file, 1000))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не получилось загрузить фото")
    } finally {
      setBusyPhoto(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  const remove = () => {
    if (!service) return
    actions.deleteService(service.id)
    toast("Процедура удалена. Уже сделанные записи на неё остались в расписании.")
    onClose()
  }

  return (
    <>
      <SheetHeader className="glass-bar sticky top-0 z-10 px-5 py-4 pr-14">
        <button onClick={onClose} aria-label="Закрыть" className="absolute top-3.5 right-3.5 grid size-9 place-items-center rounded-full hover:bg-muted">
          <X className="size-4" />
        </button>
        <SheetTitle className="font-heading text-xl">{isNew ? "Новая процедура" : "Изменить процедуру"}</SheetTitle>
        <SheetDescription>Всё, что здесь заполнено, клиенты видят на странице процедуры.</SheetDescription>
      </SheetHeader>

      <div className="space-y-6 px-5 py-5">
        <Field id="svc-title" label="Название" error={tried ? errors.title : ""}>
          <Input id="svc-title" value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="Например: Биоревитализация" className="h-11 rounded-xl" />
        </Field>

        <Field id="svc-cat" label="Раздел" error={tried ? errors.category : ""}>
          <NativeSelect id="svc-cat" value={f.categoryId} onChange={(e) => set("categoryId", e.target.value)} className="h-11">
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
            <option value={NEW_CAT}>+ Новый раздел…</option>
          </NativeSelect>
          {f.categoryId === NEW_CAT && (
            <Input
              ref={newCatRef}
              value={f.newCategory}
              onChange={(e) => set("newCategory", e.target.value)}
              placeholder="Например: Массаж"
              aria-label="Название нового раздела"
              className="mt-2 h-11 rounded-xl"
            />
          )}
        </Field>

        <div className="space-y-2">
          <p className="text-sm font-medium">Фото</p>
          <div className="flex items-center gap-4">
            <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-tint">
              {f.photo ? <img src={f.photo} alt="" className="size-full object-cover" /> : <ImagePlus className="size-6 text-muted-foreground" />}
            </div>
            <div className="flex flex-wrap gap-2">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickPhoto(e.target.files?.[0])} />
              <Button variant="outline" size="sm" className="rounded-full bg-transparent" disabled={busyPhoto} onClick={() => fileRef.current?.click()}>
                {busyPhoto ? "Обрабатываю…" : f.photo ? "Заменить" : "Загрузить фото"}
              </Button>
              {f.photo && (
                <Button variant="ghost" size="sm" className="rounded-full text-destructive hover:text-destructive" onClick={() => set("photo", undefined)}>
                  Убрать
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field id="svc-price" label="Цена, ₽" error={tried ? errors.price : ""}>
            <Input
              id="svc-price"
              inputMode="numeric"
              value={f.price}
              onChange={(e) => set("price", e.target.value.replace(/[^\d\s]/g, ""))}
              className="h-11 rounded-xl tabular-nums"
            />
          </Field>
          <Field id="svc-dur" label="Длительность">
            <NativeSelect id="svc-dur" value={String(f.duration)} onChange={(e) => set("duration", Number(e.target.value))} className="h-11">
              {[...new Set([...DURATIONS, f.duration])]
                .sort((a, b) => a - b)
                .map((d) => (
                  <option key={d} value={d}>
                    {dur(d)}
                  </option>
                ))}
            </NativeSelect>
          </Field>
        </div>
        <div className="-mt-3 flex items-center gap-2 text-sm">
          <Checkbox id="svc-from" checked={f.priceFrom} onCheckedChange={(v) => set("priceFrom", v === true)} />
          <label htmlFor="svc-from" className="cursor-pointer">
            Писать «от» перед ценой
          </label>
        </div>

        <Field id="svc-short" label="Коротко" hint="одна строка в списке процедур">
          <Input id="svc-short" value={f.short} onChange={(e) => set("short", e.target.value)} placeholder="Глубокое увлажнение и сияние" className="h-11 rounded-xl" />
        </Field>

        <Field id="svc-about" label="Описание">
          <Textarea id="svc-about" value={f.about} onChange={(e) => set("about", e.target.value)} placeholder="Что это за процедура и кому подходит" className="min-h-24 rounded-xl" />
        </Field>

        <Field id="svc-effect" label="Результат" hint="необязательно">
          <Input id="svc-effect" value={f.effect} onChange={(e) => set("effect", e.target.value)} placeholder="Кожа напитана, ровный тон" className="h-11 rounded-xl" />
        </Field>

        <Field id="svc-steps" label="Как проходит" hint="каждый этап с новой строки">
          <Textarea id="svc-steps" value={f.steps} onChange={(e) => set("steps", e.target.value)} placeholder={"Очищение\nПроцедура\nУспокаивающая маска"} className="min-h-24 rounded-xl" />
        </Field>

        <Field id="svc-prep" label="Как подготовиться" hint="с новой строки, необязательно">
          <Textarea id="svc-prep" value={f.prep} onChange={(e) => set("prep", e.target.value)} className="min-h-20 rounded-xl" />
        </Field>

        <Field id="svc-contra" label="Противопоказания" hint="с новой строки">
          <Textarea id="svc-contra" value={f.contraindications} onChange={(e) => set("contraindications", e.target.value)} className="min-h-20 rounded-xl" />
        </Field>

        <fieldset className="space-y-3 rounded-2xl border border-border p-4">
          <legend className="px-1 text-sm font-medium">Курс</legend>
          <div className="grid grid-cols-2 gap-3">
            <Field id="svc-sessions" label="Процедур в курсе">
              <Input id="svc-sessions" inputMode="numeric" value={f.courseSessions} onChange={(e) => set("courseSessions", e.target.value.replace(/\D/g, ""))} placeholder="—" className="h-11 rounded-xl tabular-nums" />
            </Field>
            <Field id="svc-interval" label="Раз в … дней">
              <Input id="svc-interval" inputMode="numeric" value={f.courseInterval} onChange={(e) => set("courseInterval", e.target.value.replace(/\D/g, ""))} placeholder="—" className="h-11 rounded-xl tabular-nums" />
            </Field>
          </div>
        </fieldset>

        <div className="space-y-4 rounded-2xl border border-border p-4">
          <Toggle id="svc-active" label="Показывать на сайте" hint="Скрытая процедура не видна клиентам и недоступна для записи" checked={f.active} onChange={(v) => set("active", v)} />
          <Toggle id="svc-featured" label="Это консультация" hint="Первый шаг для новых клиентов: на сайте подписана «с неё лучше начать», на неё ведёт плашка «Ближайшее окно»" checked={f.featured} onChange={(v) => set("featured", v)} />
        </div>

        {!isNew && (
          <div className="rounded-2xl border border-destructive/30 p-4">
            {confirmDelete ? (
              <div className="space-y-3">
                <p className="text-sm">Удалить «{service.title}»? Вернуть её можно будет только заново создав.</p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="destructive" className="rounded-full" onClick={remove}>
                    <Trash2 /> Да, удалить
                  </Button>
                  <Button variant="ghost" className="rounded-full" onClick={() => setConfirmDelete(false)}>
                    Отмена
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="ghost" className="rounded-full px-2 text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2 /> Удалить процедуру
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="glass-bar pb-safe sticky bottom-0 z-10 mt-auto flex gap-2 border-t border-b-0 border-t-(--glass-border) px-5 pt-3">
        <Button size="lg" className="h-12 flex-1 rounded-full" onClick={save}>
          {isNew ? "Добавить процедуру" : "Сохранить"}
        </Button>
        <Button size="lg" variant="outline" className="h-12 rounded-full bg-transparent" onClick={onClose}>
          Отмена
        </Button>
      </div>
    </>
  )
}

export function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={id} className="flex flex-wrap items-baseline gap-x-2">
        {label}
        {hint && <span className="text-xs font-normal text-muted-foreground">{hint}</span>}
      </Label>
      {children}
      {error && (
        <p data-editor-error className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

function Toggle({ id, label, hint, checked, onChange }: { id: string; label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <label htmlFor={id} className={cn("cursor-pointer text-sm")}>
        <span className="block font-medium">{label}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} className="mt-0.5 shrink-0" />
    </div>
  )
}
