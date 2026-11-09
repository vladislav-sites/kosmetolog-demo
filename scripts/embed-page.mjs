// Превращает dist-embed/index.html во фрагмент страницы для публикации на claude.ai:
// без doctype/html/head/body (их добавляет хостинг), только title, стили, корень и скрипт.
import { readFileSync, writeFileSync, readdirSync } from "node:fs"

const html = readFileSync("dist-embed/index.html", "utf8")
const css = [...html.matchAll(/<link rel="stylesheet"[^>]*href="\.\/(assets\/[^"]+\.css)"/g)].map((m) => m[1])
const js = [...html.matchAll(/<script type="module"[^>]*src="\.\/(assets\/[^"]+\.js)"/g)].map((m) => m[1])
if (!css.length || !js.length) throw new Error("не нашёл ассеты в dist-embed/index.html")

const page = `<title>Косметолог Вера Лаврова</title>
${css.map((h) => `<link rel="stylesheet" href="${h}">`).join("\n")}
<script>document.documentElement.dataset.skin = "noir"</script>
<div id="root"></div>
${js.map((s) => `<script type="module" src="${s}"></script>`).join("\n")}
`
writeFileSync("dist-embed/page.html", page)

const files = Object.fromEntries(readdirSync("dist-embed/assets").map((f) => [`assets/${f}`, `dist-embed/assets/${f}`]))
writeFileSync("dist-embed/files.json", JSON.stringify(files, null, 2))
console.log(`page.html готов, файлов: ${Object.keys(files).length}`)
