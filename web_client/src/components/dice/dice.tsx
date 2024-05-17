import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import "./dice.css";

interface DiceProps {
  diceValue: number;
  hasRolled: boolean;
  onClick: () => void;
}
// https://codepen.io/abirana/details/rNMLrPB
export function Dice(props: DiceProps) {
  const [rolled, setRolled] = useState(false);

  useEffect(() => {
    setRolled(props.hasRolled);
  }, [props.hasRolled]);

  return (
    <div
      id="dice"
      className={cn(rolled && "reRoll")}
      data-side={rolled ? props.diceValue : 1}
      onClick={props.onClick}
    >
      <div className="sides side-1">
        <span className="dot dot-1"></span>
      </div>
      <div className="sides side-2">
        <span className="dot dot-1"></span>
        <span className="dot dot-2"></span>
      </div>
      <div className="sides side-3">
        <span className="dot dot-1"></span>
        <span className="dot dot-2"></span>
        <span className="dot dot-3"></span>
      </div>
      <div className="sides side-4">
        <span className="dot dot-1"></span>
        <span className="dot dot-2"></span>
        <span className="dot dot-3"></span>
        <span className="dot dot-4"></span>
      </div>
      <div className="sides side-5">
        <span className="dot dot-1"></span>
        <span className="dot dot-2"></span>
        <span className="dot dot-3"></span>
        <span className="dot dot-4"></span>
        <span className="dot dot-5"></span>
      </div>
      <div className="sides side-6">
        <span className="dot dot-1"></span>
        <span className="dot dot-2"></span>
        <span className="dot dot-3"></span>
        <span className="dot dot-4"></span>
        <span className="dot dot-5"></span>
        <span className="dot dot-6"></span>
      </div>
    </div>
  );
}
