import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

export type BoardState =
  | "SCENARIO"
  | "PROBLEM"
  | "INSIGHT"
  | "SOLUTION"
  | "PROTOTYPE"
  | "PILOT"
  | "MARKETING"
  | "SALES";
interface BoardSvgProps {
  active?: BoardState;
}
export function BoardSvg({ active }: BoardSvgProps) {
  const navigate = useNavigate();

  return (
    <svg
      width="102.36582mm"
      height="102.36582mm"
      viewBox="0 0 102.36582 102.36582"
      version="1.1"
      id="svg1"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        // font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-family:BLOMBERG;-inkscape-font-specification:BLOMBERG;stroke-width:0.4231
        fontStyle: "normal",
        fontVariant: "normal",
        fontWeight: "normal",
        fontStretch: "normal",
        fontFamily: "Palm Laker Print",
        fontSize: ".56rem",
      }}
    >
      <defs id="defs1" />
      <circle
        style={{
          fill: "#665e68",
          fillOpacity: 1,
          strokeWidth: 0.264583,
        }}
        id="path6"
        r="51.182911"
        cy="51.182911"
        cx="51.182911"
      />
      <g id="layer1" transform="translate(-53.817138,-97.332057)">
        <g id="g18">
          <path
            className={cn(
              "fill-primary stroke-[0.264583]",
              active === "PROBLEM" && "fill-border"
            )}
            onClick={() => navigate("/board/problem")}
            d="M 104.36056,98.153182 C 92.053635,98.324824 80.235044,102.99465 71.134676,111.28158 l 33.225884,33.22536 z"
            id="PROBLEM"
          />
          <text
            // xml:space="preserve"
            style={{ fill: "#fff6e5", strokeWidth: 0.4231 }}
            // style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:5.07721px;font-family:BLOMBERG;-inkscape-font-specification:BLOMBERG;fill:#000000;stroke-width:0.4231"
            x="82.904678"
            y="120.13992"
            id="text1"
          >
            <tspan
              id="tspan1"
              style={{ strokeWidth: 0.4231 }}
              // style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-family:BLOMBERG;-inkscape-font-specification:BLOMBERG;stroke-width:0.4231"
              x="82.904678"
              y="120.13992"
            >
              Problema
            </tspan>
          </text>
        </g>
        <g id="g17">
          <path
            className={cn(
              "fill-primary stroke-[0.264583]",
              active === "INSIGHT" && "fill-border"
            )}
            onClick={() => navigate("/board/insight")}
            d="m 105.63955,98.153182 v 46.354278 l 33.22588,-33.22588 c -9.10037,-8.28693 -20.91896,-12.956755 -33.22588,-13.128398 z"
            id="INSIGHT"
          />
          <text
            // xml:space="preserve"
            style={{ fill: "#fff6e5", strokeWidth: 0.4231 }}
            // style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:5.07721px;font-family:BLOMBERG;-inkscape-font-specification:BLOMBERG;fill:#000000;stroke-width:0.4231"
            x="106.96132"
            y="120.12123"
            id="text2"
          >
            <tspan
              id="tspan2"
              style={{ strokeWidth: 0.4231 }}
              // style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-family:BLOMBERG;-inkscape-font-specification:BLOMBERG;stroke-width:0.4231"
              x="106.96132"
              y="120.12123"
            >
              Insights
            </tspan>
          </text>
        </g>
        <g id="g24">
          <path
            className={cn(
              "fill-primary stroke-[0.264583]",
              active === "SOLUTION" && "fill-border"
            )}
            onClick={() => navigate("/board/solution")}
            d="m 139.76976,112.18592 -33.22588,33.22588 h 48.62753 c -0.78539,-12.61488 -6.28261,-24.47401 -15.40165,-33.22588 z"
            id="SOLUTION"
          />
          <text
            // xml:space="preserve"
            style={{ fill: "#fff6e5", strokeWidth: 0.4231 }}
            // style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:5.07721px;font-family:BLOMBERG;-inkscape-font-specification:BLOMBERG;fill:#000000;stroke-width:0.4231"
            x="123.42113"
            y="136.41885"
            id="text3"
          >
            <tspan
              id="tspan3"
              style={{ strokeWidth: 0.4231 }}
              // style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-family:BLOMBERG;-inkscape-font-specification:BLOMBERG;stroke-width:0.4231"
              x="123.42113"
              y="136.41885"
            >
              Solucao
            </tspan>
          </text>
        </g>
        <g id="g23">
          <path
            className={cn(
              "fill-primary stroke-[0.264583]",
              active === "PROTOTYPE" && "fill-border"
            )}
            // style="fill:#cccccc;stroke-width:0.264583"
            onClick={() => navigate("/board/prototype")}
            d="m 106.5444,146.69079 35.72392,35.72392 c 8.44354,-9.27731 13.12327,-21.37034 13.12426,-33.91473 -0.0324,-0.60379 -0.0756,-1.20695 -0.12971,-1.80919 z"
            id="PROTOTYPE"
          />
          <text
            // xml:space="preserve"
            style={{ fill: "#fff6e5", strokeWidth: 0.4231 }}
            // style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:5.07721px;font-family:BLOMBERG;-inkscape-font-specification:BLOMBERG;fill:#000000;stroke-width:0.4231"
            x="123.24025"
            y="159.74782"
            id="text4"
          >
            <tspan
              id="tspan4"
              style={{ strokeWidth: 0.4231 }}
              // style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-family:BLOMBERG;-inkscape-font-specification:BLOMBERG;stroke-width:0.4231"
              x="123.24025"
              y="159.74782"
            >
              Prototipo
            </tspan>
          </text>
        </g>
        <g id="g22">
          <path
            className={cn(
              "fill-primary stroke-[0.264583]",
              active === "PILOT" && "fill-border"
            )}
            // style="fill:#cccccc;stroke-width:0.264583"
            onClick={() => navigate("/board/pilot")}
            d="m 105.63955,147.59461 v 51.28214 c 13.5169,-0.1741 26.39709,-5.77164 35.74665,-15.53497 z"
            id="PILOT"
          />
          <text
            style={{ fill: "#fff6e5", strokeWidth: 0.4231 }}
            // xml:space="preserve"
            // style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:5.07721px;font-family:BLOMBERG;-inkscape-font-specification:BLOMBERG;fill:#000000;stroke-width:0.4231"
            x="109.09145"
            y="174.95509"
            id="text5"
          >
            <tspan
              id="tspan5"
              style={{ strokeWidth: 0.4231 }}
              // style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-family:BLOMBERG;-inkscape-font-specification:BLOMBERG;stroke-width:0.4231"
              x="109.09145"
              y="174.95509"
            >
              MVP
            </tspan>
          </text>
        </g>
        <g id="g21">
          <path
            className={cn(
              "fill-primary stroke-[0.264583]",
              active === "MARKETING" && "fill-border"
            )}
            // style="fill:#cccccc;stroke-width:0.264583"
            onClick={() => navigate("/board/marketing")}
            d="m 104.36056,147.59513 -35.67483,35.67482 c 9.325145,9.76112 22.176825,15.3726 35.67483,15.57683 z"
            id="MARKETING"
          />
          <text
            // xml:space="preserve"
            style={{ fill: "#fff6e5", strokeWidth: 0.4231 }}
            // style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:5.07721px;font-family:BLOMBERG;-inkscape-font-specification:BLOMBERG;fill:#000000;stroke-width:0.4231"
            x="81.498062"
            y="174.94565"
            id="text6"
          >
            <tspan
              id="tspan6"
              style={{ strokeWidth: 0.4231 }}
              // style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-family:BLOMBERG;-inkscape-font-specification:BLOMBERG;stroke-width:0.4231"
              x="81.498062"
              y="174.94565"
            >
              Marketing
            </tspan>
          </text>
        </g>
        <g id="g20">
          <path
            className={cn(
              "fill-primary stroke-[0.264583]",
              active === "INSIGHT" && "fill-border"
            )}
            // style="fill:#cccccc;stroke-width:0.264583"
            onClick={() => navigate("/board/sales")}
            d="m 54.737227,146.69079 c -0.05409,0.60224 -0.09733,1.2054 -0.129707,1.80919 0.02677,12.53407 4.723695,24.6083 13.173872,33.86563 l 35.674828,-35.67482 z"
            id="SALES"
          />
          <text
            style={{ fill: "#fff6e5", strokeWidth: 0.4231 }}
            // xml:space="preserve"
            // style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:5.07721px;font-family:BLOMBERG;-inkscape-font-specification:BLOMBERG;fill:#000000;stroke-width:0.4231"
            x="64.636116"
            y="159.75198"
            id="text7"
          >
            <tspan
              id="tspan7"
              style={{ strokeWidth: 0.4231 }}
              // style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-family:BLOMBERG;-inkscape-font-specification:BLOMBERG;stroke-width:0.4231"
              x="64.636116"
              y="159.75198"
            >
              Vendas
            </tspan>
          </text>
        </g>
        <g id="g19">
          <path
            className={cn(
              "fill-primary stroke-[0.264583]",
              active === "SCENARIO" && "fill-border"
            )}
            // style="fill:#cccccc;stroke-width:0.264583"
            onClick={() => navigate("/board/scenario")}
            d="m 70.230339,112.18592 c -9.119035,8.75187 -14.616258,20.611 -15.401644,33.22588 h 48.628035 z"
            id="SCENARIO"
          />
          <text
            style={{ fill: "#fff6e5", strokeWidth: 0.4231 }}
            // xml:space="preserve"
            // style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:5.07721px;font-family:BLOMBERG;-inkscape-font-specification:BLOMBERG;fill:#000000;stroke-width:0.4231"
            x="66.264008"
            y="136.41885"
            id="text8"
          >
            <tspan
              id="tspan8"
              style={{ strokeWidth: 0.4231 }}
              // style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-family:BLOMBERG;-inkscape-font-specification:BLOMBERG;stroke-width:0.4231"
              x="66.264008"
              y="136.41885"
            >
              Cenario
            </tspan>
          </text>
        </g>
      </g>
    </svg>
  );
}
