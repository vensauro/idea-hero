export function replaceTemplate(
  template: string,
  variables: { [key: string]: string | number }
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    return key in variables ? variables[key].toString() : `{${key}}`;
  });
}
