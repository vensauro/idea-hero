import { GameUser } from "#/game";
import { UserAvatar } from "./user-avatar";

interface UsersBarProps {
  activeUser?: GameUser;
  users?: GameUser[];
}
export function UsersBar({ activeUser, users = [] }: UsersBarProps) {
  const notActiveUsers = users.filter((e) => e.id !== activeUser?.id);
  const midLength = Math.round((notActiveUsers.length - 1) / 2);

  return (
    <div className="flex justify-center items-center overflow-y-auto gap-3 bg-accent p-2 h-[146px]">
      {notActiveUsers
        .filter((e) => e.id !== activeUser?.id)
        .slice(0, midLength)
        .map((user) => (
          <UserAvatar
            key={user.id}
            color={user.avatar.color}
            connected={user.connected}
            avatarImage={user.avatar.image}
            name={user.name}
            points={user.points}
            showPoints
          />
        ))}
      {activeUser && (
        <UserAvatar
          key={activeUser.id}
          color={activeUser.avatar.color}
          connected={activeUser.connected}
          avatarImage={activeUser.avatar.image}
          name={activeUser.name}
          points={activeUser.points}
          showPoints
          big
        />
      )}

      {notActiveUsers
        .filter((e) => e.id !== activeUser?.id)
        .slice(midLength)
        .map((user) => (
          <UserAvatar
            key={user.id}
            color={user.avatar.color}
            connected={user.connected}
            avatarImage={user.avatar.image}
            name={user.name}
            points={user.points}
            showPoints
          />
        ))}
    </div>
  );
}
