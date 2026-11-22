/** PAHAD+ dark theme: the same colours as the website's .plus-dark styles. */
export const C = {
  page: "#11181B",
  deep: "#0B1113",
  card: "#182327",
  panel: "#1D353A",
  glass: "rgba(22,32,36,0.72)",
  line: "#2B3A3F",
  ink: "#F4F1EA",
  muted: "#B9BDB6",
  faint: "#8D948F",
  ochre: "#D9A75A",
  ochreLight: "#E6BB78",
  clay: "#C86D51",
  clayLight: "#E8A48C",
  sage: "#6FA399",
  sageDeep: "#1F3936",
  cream: "#3B3124",
  danger: "#F09A82",
  dangerBg: "#3A1F1A",
} as const;

export const R = { sm: 10, md: 16, lg: 24, pill: 999 } as const;

export const F = {
  /** Headings use a serif like the website's display face. */
  display: "serif",
  body: undefined as string | undefined,
} as const;
