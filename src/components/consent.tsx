import { useId } from "react"
import { Link } from "react-router"
import { cn } from "cn"
import { Checkbox } from "@/components/ui/checkbox"
import { IS_EMBED } from "@/lib/env"

/** Согласие на обработку ПД (152-ФЗ). Отдельно от <label>, чтобы клик не срабатывал дважды. */
export function Consent({ checked, onChange, error }: { checked: boolean; onChange: (v: boolean) => void; error?: boolean }) {
  const id = useId()
  return (
    <div data-error={error ? "" : undefined} className={cn("flex items-start gap-3 text-sm leading-snug", error && "text-destructive")}>
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(v === true)} className="mt-0.5" />
      <span>
        <label htmlFor={id} className="cursor-pointer">
          Даю согласие на обработку персональных данных
        </label>{" "}
        по{" "}
        {/* в новой вкладке: иначе уход на политику стирает заполненную запись */}
        <Link to="/privacy" target={IS_EMBED ? undefined : "_blank"} rel="noopener" className="underline underline-offset-4">
          политике конфиденциальности
        </Link>
      </span>
    </div>
  )
}
