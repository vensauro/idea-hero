import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getRandomCardUrl } from "@/lib/cards_urls";
import { useGameStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function CardPage() {
  const store = useGameStore();
  const [cardUrl, setCardUrl] = useState("");

  function getCard() {
    const canGetCard = store.isOwner() && cardUrl === "";
    if (canGetCard) {
      setCardUrl(getRandomCardUrl());
    }
  }

  console.log(store);
  return (
    <main className="min-h-screen flex flex-col ">
      <div className="flex overflow-y-auto gap-3 bg-neutral-300 p-2">
        {store.game?.users.map((user) => (
          <div key={user.id}>
            <Avatar
              className={cn(
                user.avatar,
                user.connected ? "opacity-100" : "opacity-25"
              )}
            >
              {/* <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" /> */}
            </Avatar>
            <div className="-mt-2 z-10 w-full flex justify-center relative">
              <span className="bg-slate-400 p-1">{user.name}</span>
            </div>
          </div>
        ))}
      </div>
      <div>
        <div className="flex justify-center my-4">
          <div
            className="max-w-[90%] bg-slate-400 rounded-md overflow-hidden"
            onClick={getCard}
          >
            <img src={cardUrl} className="aspect-[180/271] object-cover" />
            <Dialog defaultOpen={store.isOwner()}>
              {/* <DialogTrigger asChild>
                <Button variant="outline">Edit Profile</Button>
              </DialogTrigger> */}
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Instruções</DialogTitle>
                  <DialogDescription>
                    <p>
                      Retire uma carta de inspiração ou proponha um cenário
                      especifico em que deseje trabalhar.
                    </p>
                    <p>
                      Atenção! O cenário que você descrever será aquele com o
                      qual o grupo irá trabalhar
                    </p>
                  </DialogDescription>
                </DialogHeader>

                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="submit">Continuar</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <div className="flex justify-evenly mt-4">
          <Button>Faz algo</Button>
        </div>
      </div>
    </main>
  );
}
