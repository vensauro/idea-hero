export const MIN_PARTICIPANTS = 2;
export const MAX_PARTICIPANTS = 6;

type LobbyPlayer = { ready: boolean };

export function lobbyStartState(players: readonly LobbyPlayer[]) {
  const missingParticipants = Math.max(MIN_PARTICIPANTS - players.length, 0);
  const allReady =
    players.length > 0 && players.every((player) => player.ready);

  return {
    allReady,
    canStart: missingParticipants === 0 && allReady,
    missingParticipants,
  };
}
