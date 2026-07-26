export function formatCredits(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}
