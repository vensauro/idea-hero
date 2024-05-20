import { cn } from "@/lib/utils";
import "./coin.css";

interface CoinProps {
  approved: boolean;
}
// https://codepen.io/hisivasankar/pen/yWZbPJ
// https://codepen.io/keiwo/pen/ZONRgx
export function Coin(props: CoinProps) {
  return (
    <div
      className={cn("coin", props.approved ? "animate-heads" : "animate-tails")}
    >
      <p
        className={cn(
          "w-32 absolute -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2",
          "text-white text-xl",
          "flex justify-center items-center"
        )}
      >
        Aprovado!
      </p>
      <div className="heads">
        <p
          className={cn(
            "rotated-text w-32 absolute top-1/2 left-1/2",
            "text-white text-xl",
            "flex justify-center items-center"
          )}
        >
          Não Aprovado!
        </p>
      </div>
      <div className="tails flex justify-center items-center"></div>
    </div>
  );
}
