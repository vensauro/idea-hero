import { random } from "radashi";

/**
 * Draw a random item from a list. Returns
 * null if the list is empty
 */
export function draw<T>(array: readonly [T, ...T[]]): T;
export function draw(array: readonly []): null;
export function draw<T>(array: readonly [] | readonly [T, ...T[]]): null;
export function draw<T>(array: readonly T[]): T | null {
  const max = array.length;
  if (max === 0) {
    return null;
  }
  const index = random(0, max - 1);
  return array[index];
}

interface GameUser {
  name: string;
  score: number;
}

const users: GameUser[] = [
  { name: "Alice", score: 10 },
  { name: "Bob", score: 15 },
  { name: "Charlie", score: 20 },
];

const emptyUsers: GameUser[] = [];

// const result1 = draw([users[0], users[1], users[2]]); // result1 is null
// const result2 = draw(users); // result2 is a GameUser

const a = draw([]);
