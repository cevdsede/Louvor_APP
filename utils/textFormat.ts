const lowercaseWords = new Set(['da', 'de', 'do', 'das', 'dos', 'e']);

export const toTitleCasePt = (value?: string | null) =>
  (value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('pt-BR')
    .split(' ')
    .map((word, index) => {
      if (index > 0 && lowercaseWords.has(word)) return word;
      return word.charAt(0).toLocaleUpperCase('pt-BR') + word.slice(1);
    })
    .join(' ');

export const nullableTitleCasePt = (value?: string | null) => {
  const formatted = toTitleCasePt(value);
  return formatted || null;
};
