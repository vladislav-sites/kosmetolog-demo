/**
 * Сжимает фото с телефона (часто 3–10 МБ) до разумного размера прямо в браузере:
 * длинная сторона не больше maxSide, JPEG. На выходе — data URL, его можно сохранить.
 * На сервере потом будет то же самое, только файл отправится на хостинг.
 */
export async function compressImage(file: File, maxSide = 1200, quality = 0.82): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Это не изображение")
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error("Не получилось открыть фото"))
      i.src = url
    })
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
    const w = Math.round(img.naturalWidth * scale)
    const h = Math.round(img.naturalHeight * scale)
    const canvas = document.createElement("canvas")
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Не получилось обработать фото")
    ctx.drawImage(img, 0, 0, w, h)
    return canvas.toDataURL("image/jpeg", quality)
  } finally {
    URL.revokeObjectURL(url)
  }
}
