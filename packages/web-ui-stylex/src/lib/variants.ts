/** Selects one style namespace from a variant map.
    Replaces class-variance-authority: with StyleX the "merge" is done by
    stylex.props at the call site, so this only needs to pick. */
export function variant<M extends Record<string, unknown>>(
  map: M,
  key: keyof M | undefined,
  fallback: keyof M,
): M[keyof M] {
  return map[key ?? fallback];
}
