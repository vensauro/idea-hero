export type RoomSession<T> = {
  status: string;
  joinedAt: number;
  active?: boolean;
  value: T;
};

export function latestOpenSession<T>(sessions: readonly RoomSession<T>[]) {
  const activeSessions = sessions.filter((session) => session.active !== false);
  const ongoingSession = activeSessions
    .filter((session) => session.status !== "FINISHED")
    .sort((left, right) => right.joinedAt - left.joinedAt)[0];

  // Keep a completed journey selected until the player explicitly leaves it.
  // Otherwise App never reaches JourneyResult and falls back to room entry.
  return (
    ongoingSession ??
    activeSessions
      .filter((session) => session.status === "FINISHED")
      .sort((left, right) => right.joinedAt - left.joinedAt)[0]
  );
}
