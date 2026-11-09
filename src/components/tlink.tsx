import { forwardRef } from "react"
import { Link, NavLink, useLocation, useNavigate, type LinkProps, type NavLinkProps } from "react-router"
import { autoDir, tap, withTransition, type NavDir } from "@/lib/transition"

type Extra = {
  /** направление анимации; по умолчанию определяется само */
  dir?: NavDir
  /** нажатая кнопка «раскрывается» в следующий экран (экран записи) */
  morph?: boolean
}

function useTransitionClick(to: LinkProps["to"], { dir, morph }: Extra, replace?: boolean) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  return (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    if (e.currentTarget.target === "_blank") return
    e.preventDefault()
    const target = typeof to === "string" ? to : to.pathname ?? ""
    const toPath = target.split("?")[0] || "/"
    if (toPath === pathname && !target.includes("?")) return
    tap()
    const el = e.currentTarget
    if (morph) el.style.setProperty("view-transition-name", "book-sheet")
    withTransition(() => navigate(to, { replace }), morph ? "morph" : dir ?? autoDir(pathname, toPath)).finally(() => {
      if (morph) el.style.removeProperty("view-transition-name")
    })
  }
}

/** Ссылка с анимированным переходом */
export const TLink = forwardRef<HTMLAnchorElement, LinkProps & Extra>(function TLink({ dir, morph, onClick, ...props }, ref) {
  const handle = useTransitionClick(props.to, { dir, morph }, props.replace)
  return (
    <Link
      ref={ref}
      {...props}
      onClick={(e) => {
        onClick?.(e)
        handle(e)
      }}
    />
  )
})

/** То же для пунктов меню (подсветка активного) */
export const TNavLink = forwardRef<HTMLAnchorElement, NavLinkProps & Extra>(function TNavLink({ dir, morph, onClick, ...props }, ref) {
  const handle = useTransitionClick(props.to, { dir, morph }, props.replace)
  return (
    <NavLink
      ref={ref}
      {...props}
      onClick={(e) => {
        onClick?.(e)
        handle(e)
      }}
    />
  )
})
