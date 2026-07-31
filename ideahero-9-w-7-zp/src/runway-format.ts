export function formatCredits(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

export function formatAbbreviatedCredits(value: number) {
  if (Math.abs(value) >= 1_000_000) {
    const formatted = (value / 1_000_000).toFixed(1).replace(/\.0$/, "");
    return `${formatted}M`;
  }
  if (Math.abs(value) >= 1_000) {
    const formatted = (value / 1_000).toFixed(value % 1000 === 0 ? 0 : 1);
    return `${formatted}k`;
  }
  return value.toString();
}

