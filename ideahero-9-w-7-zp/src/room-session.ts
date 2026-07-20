export type RoomSession<T> = {
  status: string;
  joinedAt: number;
  value: T;
};

export function latestOpenSession<T>(sessions: readonly RoomSession<T>[]) {
  return sessions
    .filter((session) => session.status !== "FINISHED")
    .sort((left, right) => right.joinedAt - left.joinedAt)[0];
}
