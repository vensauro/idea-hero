import { UsersBar } from "@/components/users-bar/users-bar";
import { useGameStore } from "@/lib/store";
import { Outlet } from "react-router-dom";

export function BoardPage() {
  const store = useGameStore();

  return (
    <main className="min-h-screen flex flex-col ">
      <UsersBar activeUserId={store.game?.owner.id} users={store.game?.users} />
      <div className="my-5">
        <div className="flex flex-col items-center justify-center px-2">
          <Outlet />
        </div>
      </div>
    </main>
  );
}
