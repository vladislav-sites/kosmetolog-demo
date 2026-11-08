import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { HashRouter, MemoryRouter } from "react-router"
import "./index.css"
import App from "./App"
import { IS_EMBED } from "./lib/env"

// В обычном хостинге — адреса вида #/procedures (работает «назад» в браузере).
// Во встроенном демо (страница claude.ai) — навигация в памяти; #admin открывает кабинет.
const router = IS_EMBED ? (
  <MemoryRouter initialEntries={[location.hash === "#admin" ? "/admin" : "/"]}>
    <App />
  </MemoryRouter>
) : (
  <HashRouter>
    <App />
  </HashRouter>
)

createRoot(document.getElementById("root")!).render(<StrictMode>{router}</StrictMode>)
