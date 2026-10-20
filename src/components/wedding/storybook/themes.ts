export const storybookThemes = ["royal-rajmahal", "lotus-goddess", "calligraphy"] as const;
export function isStorybook(theme: string) {
  return storybookThemes.includes(theme as (typeof storybookThemes)[number]);
}
