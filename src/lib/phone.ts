/** Маска +7 (900) 123-45-67 */
export function formatPhone(input: string) {
  let d = input.replace(/\D/g, "")
  // Номер целиком дописали после «+7» (вставили +7 900… или набрали 8 900…) — лишняя 7 впереди
  if (d.length > 11 && /^7[78]/.test(d)) d = d.slice(1)
  if (d.startsWith("8")) d = "7" + d.slice(1)
  if (!d.startsWith("7")) d = "7" + d
  d = d.slice(0, 11)
  const p = d.slice(1)
  let out = "+7"
  if (p.length) out += " (" + p.slice(0, 3)
  if (p.length >= 3) out += ")"
  if (p.length > 3) out += " " + p.slice(3, 6)
  if (p.length > 6) out += "-" + p.slice(6, 8)
  if (p.length > 8) out += "-" + p.slice(8, 10)
  return out
}

export const phoneValid = (v: string) => v.replace(/\D/g, "").length === 11
