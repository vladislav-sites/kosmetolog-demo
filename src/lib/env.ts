/** Сборка для встроенного демо (`npm run build:embed`): без PWA-подсказок и скачивания файлов */
export const IS_EMBED = import.meta.env.MODE === "embed"
