import { Avatar, useGameStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { draw } from "radash";
import { useNavigate } from "react-router-dom";

function getRandomBgColor() {
  return draw([
    "bg-red-300",
    "bg-yellow-300",
    "bg-blue-300",
    "bg-orange-300",
    "bg-green-300",
    "bg-indigo-300",
    "bg-[#ccf0f2]",
  ]) as string;
}
export function AvatarsPage() {
  const store = useGameStore();
  const navigate = useNavigate();

  function updateAvatar(avatar: Avatar) {
    return () => {
      store.setAvatar(avatar);
      navigate(-1);
    };
  }

  return (
    <div>
      <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl text-center bg-primary text-white">
        Avatares
      </h1>
      <div className="grid grid-cols-2 gap-4  place-content-center mt-2">
        {Array.from({ length: 8 }, (_, idx) => {
          const bgColor = getRandomBgColor();
          const imageUrl = `/avatars/avatar_${idx + 1}.png`;
          return (
            <div
              className={cn(
                "h-36 w-36 flex justify-center items-center rounded-md",
                idx % 2 === 0 ? "justify-self-end" : "justify-self-start",
                bgColor
              )}
              onClick={updateAvatar({ image: imageUrl, color: bgColor })}
            >
              <img src={imageUrl} className="h-32" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
