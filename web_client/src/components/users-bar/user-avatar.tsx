import { cn } from "@/lib/utils";
import { Avatar } from "../ui/avatar";
import { AvatarImage } from "@radix-ui/react-avatar";

interface UserAvatarProps {
  connected?: boolean;
  color: string;
  avatarImage: string;
  name: string;
  points?: number;
  showPoints?: boolean;
}
export function UserAvatar({
  connected = false,
  color,
  avatarImage,
  name,
  points = 0,
  showPoints = false,
}: UserAvatarProps) {
  return (
    <div className="flex flex-col justify-center items-center">
      {showPoints && (
        <div className="-mb-2 z-10 w-full flex justify-center relative">
          <span className="rounded-full min-w-16 text-sm h-4 leading-4 text-center text-white bg-secondary">
            {points}
          </span>
        </div>
      )}
      <Avatar className={cn(color, connected ? "opacity-100" : "opacity-25")}>
        <AvatarImage src={avatarImage} alt={`${name} avatar`} />
      </Avatar>
      <div className="-mt-2 z-10 w-full flex justify-center relative">
        <span className="rounded-full min-w-16 text-sm h-4 leading-4 text-center text-white bg-secondary">
          {name}
        </span>
      </div>
    </div>
  );
}
