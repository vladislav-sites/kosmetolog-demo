import { useId } from "react"
import { Link } from "react-router"
import { cn } from "cn"
import { Checkbox } from "@/components/ui/checkbox"

/** Согласие на обработку ПД (152-ФЗ). Отдельно от <label>, чтобы клик не срабатывал дважды. */
export function Consent({ checked, onChange, error }: { checked: boolean; onChange: (v: boolean) => void; error?: boolean }) {
  const id = useId()
  return (
    <div data-error={error ? "" : undefined} className={cn("flex items-start gap-3 text-sm leading-snug", error && "text-destructive")}>
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(v === true)} className="mt-0.5" />
      <span>
        <label htmlFor={id} className="cursor-pointer">
          Согласна на обработку персональных данных
        </label>{" "}
        согласно{" "}
        <Link to="/privacy" className="underline underline-offset-4">
          политике конфиденциальности
        </Link>
      </span>
    </div>
  )
}
