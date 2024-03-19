import { cn } from "@/lib/utils";
import { Avatar, AvatarImage } from "../ui/avatar";
import { GameUser } from "#/game";

interface UsersBarProps {
  activeUser?: GameUser;
  users?: GameUser[];
}
export function UsersBar({ activeUser, users = [] }: UsersBarProps) {
  const notActiveUsers = users.filter((e) => e.id !== activeUser?.id);
  const midLength = Math.round((notActiveUsers.length - 1) / 2);

  return (
    <div className="flex items-center overflow-y-auto gap-3 bg-accent p-2 h-[146px]">
      {notActiveUsers
        .filter((e) => e.id !== activeUser?.id)
        .slice(0, midLength)
        .map((user) => (
          <div key={user.id}>
            <Avatar
              className={cn(
                user.avatar.color,
                user.connected ? "opacity-100" : "opacity-25"
              )}
            >
              <AvatarImage
                src={user.avatar.image}
                alt={`${user.name} avatar`}
              />
            </Avatar>
            <div className="-mt-2 z-10 w-full flex justify-center relative">
              <span className="rounded-full min-w-16 text-base text-center text-white bg-secondary">
                {user.name}
              </span>
            </div>
          </div>
        ))}
      <div>
        <Avatar
          className={cn(
            activeUser?.avatar.color,
            activeUser?.connected ? "opacity-100" : "opacity-25",
            "h-24 w-24"
          )}
        >
          <AvatarImage
            src={activeUser?.avatar.image}
            alt={`${activeUser?.name} avatar`}
          />
        </Avatar>
        <div className="-mt-2 z-10 w-full flex justify-center relative">
          <span className="rounded-full min-w-16 text-base text-center text-white bg-primary">
            {activeUser?.name}
          </span>
        </div>
      </div>
      {notActiveUsers
        .filter((e) => e.id !== activeUser?.id)
        .slice(midLength)
        .map((user) => (
          <div key={user.id}>
            <Avatar
              className={cn(
                user.avatar.color,
                user.connected ? "opacity-100" : "opacity-25"
              )}
            >
              <AvatarImage
                src={user.avatar.image}
                alt={`${user.name} avatar`}
              />
            </Avatar>
            <div className="-mt-2 z-10 w-full flex justify-center relative">
              <span className="rounded-full min-w-16 text-base text-center text-white bg-secondary">
                {user.name}
              </span>
            </div>
          </div>
        ))}
    </div>
  );
}
