/**
 * The public "Local Films & Documentaries" page (/films). Its title and intro are editable
 * from Admin → Videos and stored in the settings table; these defaults apply until then.
 * No "server-only": the Header (a client component) and admin pages share these values.
 */
export const FILMS_TITLE_SETTING = "films:title";
export const FILMS_INTRO_SETTING = "films:intro";

export const FILMS_DEFAULTS = {
  title: "Local Films & Documentaries",
  intro: "Films and documentaries from the Darjeeling hills, the Terai, the Dooars and the wider Himalaya.",
} as const;

export const FILMS_PATH = "/films";

export type FilmsPage = { title: string; intro: string };
