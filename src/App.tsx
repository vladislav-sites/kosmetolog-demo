import { useEffect, useLayoutEffect } from "react"
import { Route, Routes, useLocation } from "react-router"
import { Toaster } from "@/components/ui/sonner"
import { useAppState } from "@/lib/store"
import { ClientLayout } from "@/components/client-layout"
import HomePage from "@/pages/home"
import ProceduresPage from "@/pages/procedures"
import ProcedurePage from "@/pages/procedure"
import BookPage from "@/pages/book"
import DonePage from "@/pages/done"
import AboutPage from "@/pages/about"
import GiftPage from "@/pages/gift"
import PrivacyPage from "@/pages/privacy"
import AdminPage from "@/pages/admin"

/** Каждый переход на «Запись» начинает запись заново, даже если уже открыта форма */
function BookRoute() {
  const { key } = useLocation()
  return <BookPage key={key} />
}

const THEME_COLOR = { milk: "#f6f1ea", olive: "#f1f0e8", noir: "#121110" } as const

export default function App() {
  const theme = useAppState((s) => s.theme)
  const { pathname } = useLocation()

  useEffect(() => {
    // data-skin, а не data-theme: data-theme занят светлой/тёмной темой страницы-хозяина
    document.documentElement.dataset.skin = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[theme])
  }, [theme])

  // Наверх — синхронно, внутри анимации перехода, чтобы новый экран не «прыгал»
  useLayoutEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])

  return (
    <>
      <Routes>
        <Route path="/admin" element={<AdminPage />} />
        <Route element={<ClientLayout />}>
          <Route index element={<HomePage />} />
          <Route path="procedures" element={<ProceduresPage />} />
          <Route path="procedures/:id" element={<ProcedurePage />} />
          <Route path="book" element={<BookRoute />} />
          <Route path="done/:id" element={<DonePage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="gift" element={<GiftPage />} />
          <Route path="privacy" element={<PrivacyPage />} />
          <Route path="*" element={<HomePage />} />
        </Route>
      </Routes>
      <Toaster position="top-center" />
    </>
  )
}
