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
import { UsersBar } from "@/components/users-bar/users-bar";
import { getRandomCardUrl } from "@/lib/cards_urls";
import { useGameStore } from "@/lib/store";
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
      <UsersBar
        activeUser={store.game?.actualAction.activeUser}
        users={store.game?.users}
      />

      <div>
        <div className="flex justify-center my-4">
          <div className="max-w-72 w-full">
            {/* window top bar */}
            <div className="h-8 border-2 rounded-t-xl w-full bg-secondary border-b-0 flex justify-center relative items-center">
              <p className="text-white font-bold">PROBLEMA</p>
              <button className="absolute right-0 text-white mx-4 h-5 w-5 bg-border flex justify-center items-center font-bold">
                <span className="mb-1">x</span>
              </button>
            </div>

            {/* window */}
            <div
              className="flex w-full bg-accent border-2 rounded-b-xl p-6"
              onClick={getCard}
            >
              <div className="relative border-dashed border-[3px] rounded-xl overflow-hidden">
                <img src={cardUrl} className="aspect-[180/271] object-cover" />
              </div>
            </div>
            {/* end centralize window */}
          </div>

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
                    Atenção! O cenário que você descrever será aquele com o qual
                    o grupo irá trabalhar
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

        <div className="flex justify-evenly mt-4">
          <Button>Faz algo</Button>
        </div>
      </div>
    </main>
  );
}
