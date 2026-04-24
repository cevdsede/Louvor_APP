export const getDisplayName = (person?: Record<string, any> | null, fallback = ''): string => {
  if (!person) return fallback;

  const value =
    person.display_name ||
    person.displayName ||
    person.nome_exibicao ||
    person.nome ||
    person.name ||
    person.email?.split?.('@')?.[0] ||
    fallback;

  return String(value || fallback);
};
