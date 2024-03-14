import { useGameStore } from "@/lib/store";
import { useNavigate } from "react-router-dom";

export function AvatarsPage() {
  const store = useGameStore();
  const navigate = useNavigate();

  function updateAvatar(avatar: string) {
    return () => {
      store.setAvatar(avatar);
      navigate(-1);
    };
  }

  return (
    <div>
      <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl text-center py-10">
        Avatares
      </h1>
      <div className="grid grid-cols-2 gap-4  place-content-center">
        <div
          className="h-36 w-36 rounded-md bg-red-300 justify-self-end"
          onClick={updateAvatar("bg-red-300")}
        />
        <div
          className="h-36 w-36 rounded-md bg-yellow-300"
          onClick={updateAvatar("bg-yellow-300")}
        />
        <div
          className="h-36 w-36 rounded-md bg-pink-300 justify-self-end"
          onClick={updateAvatar("bg-pink-300")}
        />
        <div
          className="h-36 w-36 rounded-md bg-orange-300"
          onClick={updateAvatar("bg-orange-300")}
        />
        <div
          className="h-36 w-36 rounded-md bg-blue-300 justify-self-end"
          onClick={updateAvatar("bg-blue-300")}
        />
        <div
          className="h-36 w-36 rounded-md bg-purple-300"
          onClick={updateAvatar("bg-purple-300")}
        />
        <div
          className="h-36 w-36 rounded-md bg-green-300 justify-self-end"
          onClick={updateAvatar("bg-green-300")}
        />
        <div
          className="h-36 w-36 rounded-md bg-indigo-300"
          onClick={updateAvatar("bg-indigo-300")}
        />
      </div>
    </div>
  );
}
