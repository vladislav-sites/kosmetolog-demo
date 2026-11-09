/**
 * Мастер может вписать ник как угодно: «@vera», «vera», «t.me/vera», полную ссылку.
 * Приводим к нормальной ссылке.
 */
const handle = (v: string, hosts: RegExp) =>
  v
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(hosts, "")
    .replace(/^@/, "")
    .replace(/\/+$/, "")

export const telegramUrl = (v: string) => `https://t.me/${handle(v, /^(www\.)?(t\.me|telegram\.me)\//i)}`
export const vkUrl = (v: string) => `https://vk.com/${handle(v, /^(www\.|m\.)?vk\.com\//i)}`
