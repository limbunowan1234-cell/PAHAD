/** Dates in Indian time, as on the website. */
export function plusDate(v: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  if (!v) return "";
  const d = new Date(v.length === 10 ? `${v}T00:00:00+05:30` : v);
  if (Number.isNaN(d.getTime())) return v;
  try {
    return new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", ...opts }).format(d);
  } catch {
    return d.toDateString();
  }
}

export const dateTime = (v: string) =>
  plusDate(v, v.length > 10 ? { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" } : { weekday: "short", day: "numeric", month: "short", year: "numeric" });

export const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "P";

export const waLink = (n: string) => {
  const digits = n.replace(/\D/g, "");
  return `https://wa.me/${digits.length === 10 ? `91${digits}` : digits}`;
};

/** Plain text for previews: drops markdown marks such as ## and **. */
export const plain = (s: string) => s.replace(/^#+\s*/gm, "").replace(/\*\*|__|`/g, "").replace(/\s+/g, " ").trim();
