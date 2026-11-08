import { useState } from "react"
import { Link } from "react-router"
import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Disclaimer } from "@/components/bits"
import { useAppState } from "@/lib/store"
import { dur, price } from "@/lib/time"

/**
 * Квиз вместо ИИ-ассистента: ничего не диагностирует,
 * только подсказывает, с чего начать, и ведёт на консультацию.
 */
const QUESTIONS = [
  {
    id: "concern",
    q: "Что беспокоит больше всего?",
    options: [
      ["pores", "Расширенные поры, чёрные точки"],
      ["acne", "Высыпания или следы постакне"],
      ["tone", "Неровный тон, пигментация, тусклость"],
      ["puffy", "Отёки, уставший вид, «поплывший» овал"],
      ["dry", "Сухость, стянутость, шелушение"],
    ],
  },
  {
    id: "skin",
    q: "Какая у вас кожа?",
    options: [
      ["oily", "Жирная или комбинированная"],
      ["normal", "Нормальная"],
      ["dry", "Сухая"],
      ["sensitive", "Чувствительная, легко краснеет"],
      ["unknown", "Не знаю"],
    ],
  },
  {
    id: "exp",
    q: "Бывали у косметолога?",
    options: [
      ["never", "Нет, впервые"],
      ["long", "Да, но давно"],
      ["regular", "Да, хожу регулярно"],
    ],
  },
  {
    id: "flags",
    q: "Есть ли сейчас что-то из этого: беременность, свежий загар, активные воспаления?",
    options: [
      ["no", "Нет"],
      ["yes", "Да"],
      ["unsure", "Не уверена"],
    ],
  },
] as const

type Answers = Partial<Record<(typeof QUESTIONS)[number]["id"], string>>

function recommend(a: Answers) {
  const sensitive = a.skin === "sensitive"
  const map: Record<string, string> = {
    pores: sensitive ? "us-clean" : "combo-clean",
    acne: sensitive ? "almond-peel" : "pro-peel",
    tone: sensitive || a.exp === "never" ? "almond-peel" : "pro-peel",
    puffy: "sculpt-massage",
    dry: "hydra-care",
  }
  const candidate = map[a.concern ?? "dry"]
  const consultFirst = a.exp === "never" || a.flags !== "no" || candidate === "pro-peel"
  return { candidate, consultFirst }
}

export default function QuizPage() {
  const services = useAppState((s) => s.services)
  const [i, setI] = useState(0)
  const [a, setA] = useState<Answers>({})
  const done = i >= QUESTIONS.length

  if (done) {
    const { candidate, consultFirst } = recommend(a)
    const svc = services.find((s) => s.id === candidate && s.active)
    const consult = services.find((s) => s.featured && s.active)
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 md:py-20">
        <p className="eyebrow">Результат</p>
        <h1 className="mt-3 font-heading text-4xl leading-tight sm:text-5xl">
          {consultFirst ? "Начнём с консультации" : "Можно начинать с процедуры"}
        </h1>
        <p className="mt-4 text-muted-foreground">
          {consultFirst
            ? "Сначала посмотрю кожу и уточню противопоказания — так мы точно не сделаем лишнего. Вероятнее всего, дальше предложу:"
            : "По вашим ответам лучше всего подойдёт эта процедура. На месте всё равно коротко посмотрю кожу перед началом."}
        </p>

        {svc && (
          <Link
            to={`/procedures/${svc.id}`}
            className="mt-8 block rounded-2xl border border-border bg-card p-5 transition-colors hover:border-foreground/40"
          >
            <p className="font-heading text-2xl">{svc.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{svc.short}</p>
            <p className="mt-3 text-sm">
              {dur(svc.duration)} · <span className="font-semibold">{price(svc.price, svc.priceFrom)}</span>
            </p>
          </Link>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" className="h-12 rounded-full px-7">
            <Link to={`/book?service=${consultFirst ? consult?.id ?? "" : svc?.id ?? ""}`}>
              {consultFirst ? `Записаться на консультацию · ${consult ? price(consult.price) : ""}` : "Записаться"} <ArrowRight />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="h-12 rounded-full"
            onClick={() => {
              setA({})
              setI(0)
            }}
          >
            <RotateCcw /> Пройти заново
          </Button>
        </div>
        <p className="mt-8 text-xs text-muted-foreground">Это подсказка, а не диагноз. Решение о процедуре принимается на консультации.</p>
        <Disclaimer className="mt-1" />
      </div>
    )
  }

  const q = QUESTIONS[i]
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 md:py-16">
      <div className="flex items-center gap-3">
        {i > 0 ? (
          <button onClick={() => setI(i - 1)} className="grid size-10 place-items-center rounded-full border border-border hover:bg-muted" aria-label="Назад">
            <ArrowLeft className="size-4" />
          </button>
        ) : (
          <Link to="/" className="grid size-10 place-items-center rounded-full border border-border hover:bg-muted" aria-label="На главную">
            <ArrowLeft className="size-4" />
          </Link>
        )}
        <div className="flex flex-1 gap-1.5">
          {QUESTIONS.map((x, k) => (
            <span key={x.id} className={cn("h-1 flex-1 rounded-full", k <= i ? "bg-foreground" : "bg-border")} />
          ))}
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {i + 1}/{QUESTIONS.length}
        </span>
      </div>

      <h1 key={q.id} className="mt-10 font-heading text-3xl leading-tight animate-in fade-in slide-in-from-bottom-2 sm:text-4xl">
        {q.q}
      </h1>
      <div key={q.id + "-o"} className="mt-8 space-y-2.5 animate-in fade-in">
        {q.options.map(([val, label]) => (
          <button
            key={val}
            onClick={() => {
              setA({ ...a, [q.id]: val })
              setI(i + 1)
            }}
            className={cn(
              "flex w-full items-center justify-between gap-4 rounded-2xl border bg-card px-5 py-4 text-left transition-colors hover:border-foreground/40",
              a[q.id] === val ? "border-foreground" : "border-border",
            )}
          >
            {label}
            <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  )
}
