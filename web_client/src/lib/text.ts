import { get } from "radash";

export function replaceTemplate(template: string, variables: unknown): string {
  return template.replace(/\{((?:\w+(?:\.\w+)*)+)\}/g, (_, key) => {
    return get(variables, key);
  });
}
