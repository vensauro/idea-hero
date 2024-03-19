import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <main className="min-h-screen flex flex-col">
      <div className="flex justify-end p-6">
        <img src="/menu-hamburguer.svg" alt="burguer menu" className="h-5" />
      </div>
      <h1 className="scroll-m-20 flex justify-center items-center">
        <img src="/idea-hero-logo.svg" alt="IDEA HERO" className="h-32" />
      </h1>
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-72 w-full">
          <div className="h-8 border-2 rounded-t-md w-full bg-primary border-b-0 flex justify-end items-center">
            <span className="text-white mx-4 h-5 w-5 bg-border flex justify-center items-center font-bold">
              <span className="mb-1">x</span>
            </span>
          </div>
          <div className="flex flex-col gap-4 w-full bg-[#fff6e5] px-6 py-8 border-2 border-[#665e68] rounded-b-md">
            <Link
              className={cn(
                buttonVariants({ variant: "default" }),
                "border-t-[3px] border-l-[5px] border-b-[6px] border-r-[8px]"
              )}
              to="/start"
            >
              CRIAR UMA SALA
            </Link>
            <Link
              className={cn(
                buttonVariants({ variant: "secondary" }),
                "border-t-[3px] border-l-[5px] border-b-[6px] border-r-[8px]"
              )}
              to="/enter"
            >
              ENTRAR EM UMA SALA
            </Link>
          </div>
        </div>
      </div>
      <img src="/home-footer-icon.svg" alt="IDEA HERO" className="h-52" />
    </main>
  );
}
