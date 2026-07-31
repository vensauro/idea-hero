import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const COLORS = {
  ink: "#292332",
  paper: "#fff9ed",
  paperDeep: "#f2e6d5",
  pink: "#ed3e83",
  pinkDark: "#b82661",
  teal: "#35b7bd",
  tealDark: "#116f75",
  lime: "#d9ed83",
  sun: "#ffd34f",
  purple: "#8b5bb6",
  orange: "#ff8a45",
  white: "#fffdf8",
};

const STAGES = [
  {label: "Cenário", icon: "◌", color: COLORS.pink},
  {label: "Problema", icon: "△", color: COLORS.orange},
  {label: "Insights", icon: "✦", color: COLORS.sun},
  {label: "Ideias", icon: "◇", color: COLORS.teal},
  {label: "Lapidando", icon: "✧", color: COLORS.lime},
  {label: "Protótipo", icon: "▱", color: COLORS.purple},
  {label: "Testando", icon: "↗", color: COLORS.orange},
  {label: "Conquistando", icon: "◎", color: COLORS.pink},
  {label: "Final", icon: "★", color: COLORS.teal},
] as const;

const CARD_IMAGES = [
  "cards/generated/august-deck/01-cd474a25-2a1e-4016-89f4-30251eb2dad6.png",
  "cards/generated/august-deck/17-02bcd3c2-debd-44d6-b2f8-7a4cfaa6b3dd.png",
  "cards/generated/august-deck/24-c09af3b0-eb60-4772-a2d8-113cbed6c735.png",
] as const;

const sceneOpacity = (frame: number, duration: number) =>
  interpolate(frame, [0, 14, duration - 14, duration], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

const PaperBackground = () => (
  <AbsoluteFill
    style={{
      backgroundColor: COLORS.paper,
      backgroundImage: `
        radial-gradient(circle at 12% 8%, rgba(237,62,131,.18), transparent 25rem),
        radial-gradient(circle at 90% 30%, rgba(53,183,189,.18), transparent 28rem),
        linear-gradient(rgba(52,44,59,.07) 2px, transparent 2px),
        linear-gradient(90deg, rgba(52,44,59,.07) 2px, transparent 2px)`,
      backgroundSize: "auto, auto, 48px 48px, 48px 48px",
    }}
  />
);

const Doodle = ({
  children,
  x,
  y,
  rotate = 0,
  color = COLORS.sun,
  size = 96,
}: {
  children: React.ReactNode;
  x: number;
  y: number;
  rotate?: number;
  color?: string;
  size?: number;
}) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: size,
      height: size,
      display: "grid",
      placeItems: "center",
      border: `5px solid ${COLORS.ink}`,
      borderRadius: "50%",
      background: color,
      color: COLORS.ink,
      fontSize: size * 0.5,
      fontWeight: 900,
      transform: `rotate(${rotate}deg)`,
      boxShadow: `8px 8px 0 ${COLORS.ink}`,
    }}
  >
    {children}
  </div>
);

const SceneShell = ({
  children,
  frame,
  duration,
}: {
  children: React.ReactNode;
  frame: number;
  duration: number;
}) => (
  <AbsoluteFill style={{opacity: sceneOpacity(frame, duration)}}>
    <PaperBackground />
    {children}
  </AbsoluteFill>
);

const Kicker = ({children}: {children: React.ReactNode}) => (
  <div
    style={{
      color: COLORS.pinkDark,
      fontSize: 27,
      fontWeight: 900,
      letterSpacing: 5,
      textTransform: "uppercase",
      marginBottom: 18,
    }}
  >
    {children}
  </div>
);

const Caption = ({children}: {children: React.ReactNode}) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 44,
      display: "flex",
      justifyContent: "center",
      zIndex: 50,
    }}
  >
    <div
      style={{
        width: 1480,
        boxSizing: "border-box",
        padding: "18px 34px 20px",
        border: `4px solid ${COLORS.ink}`,
        borderRadius: 22,
        background: "rgba(255,253,248,.96)",
        boxShadow: `8px 8px 0 ${COLORS.ink}`,
        color: COLORS.ink,
        fontSize: 32,
        fontWeight: 760,
        lineHeight: 1.22,
        textAlign: "center",
      }}
    >
      {children}
    </div>
  </div>
);

const Pop = ({
  children,
  frame,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  frame: number;
  delay?: number;
  style?: React.CSSProperties;
}) => {
  const {fps} = useVideoConfig();
  const scale = spring({
    frame: frame - delay,
    fps,
    config: {damping: 13, stiffness: 150, mass: 0.7},
  });
  return (
    <div style={{transform: `scale(${scale})`, ...style}}>{children}</div>
  );
};

const IntroScene = ({duration}: {duration: number}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const rise = spring({frame, fps, config: {damping: 14}});
  return (
    <SceneShell frame={frame} duration={duration}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 90,
          paddingBottom: 80,
        }}
      >
        <div
          style={{
            width: 680,
            transform: `translateY(${interpolate(rise, [0, 1], [80, 0])}px)`,
          }}
        >
          <Img
            src={staticFile("idea-hero-logo.svg")}
            style={{
              width: 540,
              filter: `drop-shadow(10px 12px 0 rgba(41,35,50,.22))`,
            }}
          />
          <div
            style={{
              marginTop: 26,
              fontSize: 58,
              lineHeight: 1.04,
              fontWeight: 900,
              color: COLORS.ink,
            }}
          >
            Uma ideia construída
            <br />
            <span style={{color: COLORS.pink}}>por todo o grupo.</span>
          </div>
        </div>
        <div style={{position: "relative", width: 650, height: 650}}>
          {CARD_IMAGES.map((src, index) => (
            <Pop
              key={src}
              frame={frame}
              delay={index * 8}
              style={{
                position: "absolute",
                left: 125 + index * 70,
                top: 65 + index * 60,
                transformOrigin: "center bottom",
              }}
            >
              <div
                style={{
                  width: 330,
                  height: 470,
                  padding: 14,
                  border: `6px solid ${COLORS.ink}`,
                  borderRadius: 26,
                  background: COLORS.white,
                  boxShadow: `14px 14px 0 ${COLORS.ink}`,
                  transform: `rotate(${[-10, 3, 13][index]}deg)`,
                  overflow: "hidden",
                }}
              >
                <Img
                  src={staticFile(src)}
                  style={{width: "100%", height: "100%", objectFit: "cover"}}
                />
              </div>
            </Pop>
          ))}
        </div>
      </div>
      <Doodle x={112} y={90} rotate={-9} color={COLORS.lime}>
        ✦
      </Doodle>
      <Doodle x={1690} y={760} rotate={8} color={COLORS.teal}>
        ?
      </Doodle>
      <Caption>
        Uma grande ideia pode começar com uma imagem — mas cresce quando todo
        mundo participa.
      </Caption>
    </SceneShell>
  );
};

const JourneyScene = ({duration}: {duration: number}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const reveal = spring({frame, fps, config: {damping: 15}});
  return (
    <SceneShell frame={frame} duration={duration}>
      <div style={{position: "absolute", inset: "100px 120px 150px"}}>
        <Kicker>O fluxo do jogo</Kicker>
        <h1
          style={{
            margin: 0,
            color: COLORS.ink,
            fontSize: 74,
            lineHeight: 1,
            fontWeight: 950,
          }}
        >
          Nove etapas. Três capítulos.
        </h1>
        <div style={{position: "absolute", left: 70, top: 190, width: 650, height: 650}}>
          <div
            style={{
              position: "absolute",
              left: 215,
              top: 215,
              width: 220,
              height: 220,
              border: `6px solid ${COLORS.ink}`,
              borderRadius: "50%",
              background: COLORS.white,
              boxShadow: `10px 10px 0 ${COLORS.ink}`,
              display: "grid",
              placeItems: "center",
              textAlign: "center",
              color: COLORS.ink,
              fontWeight: 950,
              fontSize: 34,
              transform: `scale(${reveal})`,
            }}
          >
            IDEA
            <br />
            HERO
          </div>
          {STAGES.map((stage, index) => {
            const angle = (index / STAGES.length) * Math.PI * 2 - Math.PI / 2;
            const radius = 265;
            const x = 288 + Math.cos(angle) * radius;
            const y = 288 + Math.sin(angle) * radius;
            return (
              <Pop
                key={stage.label}
                frame={frame}
                delay={index * 3}
                style={{position: "absolute", left: x, top: y}}
              >
                <div
                  style={{
                    width: 82,
                    height: 82,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: "50%",
                    border: `5px solid ${COLORS.ink}`,
                    background: stage.color,
                    boxShadow: `6px 6px 0 ${COLORS.ink}`,
                    color: COLORS.ink,
                    fontSize: 39,
                    fontWeight: 950,
                  }}
                >
                  {index + 1}
                </div>
              </Pop>
            );
          })}
        </div>
        <div
          style={{
            position: "absolute",
            right: 40,
            top: 230,
            width: 700,
            display: "grid",
            gap: 28,
          }}
        >
          {[
            ["1", "Descobrir", "Cenário · Problema · Insights", COLORS.pink],
            ["2", "Criar", "Ideias · Lapidando · Protótipo", COLORS.teal],
            ["3", "Lançar", "Testando · Conquistando · Final", COLORS.sun],
          ].map(([number, title, text, color], index) => (
            <Pop key={title} frame={frame} delay={8 + index * 7}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "92px 1fr",
                  gap: 22,
                  alignItems: "center",
                  padding: "23px 30px",
                  border: `5px solid ${COLORS.ink}`,
                  borderRadius: 24,
                  background: COLORS.white,
                  boxShadow: `9px 9px 0 ${COLORS.ink}`,
                }}
              >
                <div
                  style={{
                    width: 76,
                    height: 76,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: "50%",
                    background: color,
                    border: `4px solid ${COLORS.ink}`,
                    fontSize: 38,
                    fontWeight: 950,
                  }}
                >
                  {number}
                </div>
                <div>
                  <strong style={{fontSize: 42, color: COLORS.ink}}>{title}</strong>
                  <div style={{fontSize: 25, color: COLORS.ink, marginTop: 5}}>
                    {text}
                  </div>
                </div>
              </div>
            </Pop>
          ))}
        </div>
      </div>
      <Caption>
        O grupo percorre nove etapas, organizadas em três capítulos: Descobrir,
        Criar e Lançar.
      </Caption>
    </SceneShell>
  );
};

const GuidanceScene = ({duration}: {duration: number}) => {
  const frame = useCurrentFrame();
  const count = Math.min(4, Math.max(0, Math.floor((frame - 40) / 22) + 1));
  return (
    <SceneShell frame={frame} duration={duration}>
      <div style={{position: "absolute", inset: "92px 190px 160px"}}>
        <Kicker>Antes de revelar a carta</Kicker>
        <div
          style={{
            position: "relative",
            width: 1280,
            margin: "32px auto",
            padding: "52px 66px",
            border: `6px solid ${COLORS.ink}`,
            borderRadius: 32,
            background: COLORS.white,
            boxShadow: `16px 16px 0 ${COLORS.ink}`,
            transform: `rotate(${interpolate(frame, [0, 15], [-2, 0], {
              extrapolateRight: "clamp",
            })}deg)`,
          }}
        >
          <div style={{display: "flex", alignItems: "center", gap: 28}}>
            <div
              style={{
                width: 86,
                height: 86,
                display: "grid",
                placeItems: "center",
                border: `5px solid ${COLORS.ink}`,
                borderRadius: "50%",
                background: COLORS.sun,
                fontSize: 42,
                fontWeight: 950,
              }}
            >
              1
            </div>
            <div>
              <div style={{fontSize: 27, color: COLORS.pinkDark, fontWeight: 900}}>
                CENÁRIO
              </div>
              <h1 style={{fontSize: 58, margin: "4px 0", color: COLORS.ink}}>
                Todos prontos para imaginar?
              </h1>
            </div>
          </div>
          <div
            style={{
              marginTop: 32,
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 18,
            }}
          >
            {[
              "Leia a orientação",
              "Entenda seu papel",
              "Confirme com o grupo",
            ].map((text, index) => (
              <Pop frame={frame} delay={12 + index * 7} key={text}>
                <div
                  style={{
                    minHeight: 135,
                    padding: 24,
                    border: `4px solid ${COLORS.ink}`,
                    borderRadius: 20,
                    background: [COLORS.paper, COLORS.lime, "#e6f7f7"][index],
                    fontSize: 28,
                    fontWeight: 850,
                    color: COLORS.ink,
                  }}
                >
                  <span style={{fontSize: 38, marginRight: 12}}>
                    {["○", "✦", "✓"][index]}
                  </span>
                  {text}
                </div>
              </Pop>
            ))}
          </div>
          <div
            style={{
              marginTop: 30,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{display: "flex", gap: 12}}>
              {["IV", "MA", "LU", "RA"].map((initials, index) => (
                <div
                  key={initials}
                  style={{
                    width: 64,
                    height: 64,
                    display: "grid",
                    placeItems: "center",
                    border: `4px solid ${COLORS.ink}`,
                    borderRadius: "50%",
                    background: index < count ? COLORS.teal : COLORS.paperDeep,
                    color: COLORS.ink,
                    fontWeight: 950,
                    fontSize: 22,
                  }}
                >
                  {index < count ? "✓" : initials}
                </div>
              ))}
              <div style={{alignSelf: "center", fontSize: 25, fontWeight: 800}}>
                {count}/4 confirmaram
              </div>
            </div>
            <div
              style={{
                padding: "18px 36px",
                border: `4px solid ${COLORS.ink}`,
                borderRadius: 16,
                background: count === 4 ? COLORS.pink : COLORS.paperDeep,
                color: count === 4 ? COLORS.white : COLORS.ink,
                fontSize: 27,
                fontWeight: 950,
                boxShadow: count === 4 ? `6px 6px 0 ${COLORS.ink}` : "none",
              }}
            >
              LI E ENTENDI
            </div>
          </div>
        </div>
      </div>
      <Caption>
        Todos leem a orientação e confirmam. Só então a carta é revelada e o
        tempo começa.
      </Caption>
    </SceneShell>
  );
};

const StageCard = ({
  index,
  frame,
  delay,
  wide = false,
}: {
  index: number;
  frame: number;
  delay: number;
  wide?: boolean;
}) => {
  const stage = STAGES[index];
  return (
    <Pop frame={frame} delay={delay}>
      <div
        style={{
          width: wide ? 520 : 400,
          minHeight: wide ? 190 : 220,
          padding: 27,
          border: `5px solid ${COLORS.ink}`,
          borderRadius: 25,
          background: COLORS.white,
          boxShadow: `9px 9px 0 ${COLORS.ink}`,
          color: COLORS.ink,
        }}
      >
        <div style={{display: "flex", alignItems: "center", gap: 18}}>
          <div
            style={{
              width: 70,
              height: 70,
              display: "grid",
              placeItems: "center",
              borderRadius: "50%",
              border: `4px solid ${COLORS.ink}`,
              background: stage.color,
              fontSize: 35,
              fontWeight: 950,
            }}
          >
            {stage.icon}
          </div>
          <div>
            <div style={{fontSize: 21, fontWeight: 950, color: COLORS.pinkDark}}>
              ETAPA {index + 1}
            </div>
            <div style={{fontSize: 38, fontWeight: 950}}>{stage.label}</div>
          </div>
        </div>
        <div style={{marginTop: 20, fontSize: 24, lineHeight: 1.25}}>
          {
            [
              "Imagine o mundo inspirado pela carta.",
              "Sintetize as histórias em um desafio.",
              "Cada pessoa abre um novo caminho.",
              "Crie propostas e escolha uma em votação.",
              "Explore livremente com uma nova carta.",
              "Mostre a menor versão da ideia.",
              "Escolha uma prova criada para a jornada.",
              "Convide as pessoas a aderir.",
              "Transforme a história em manifesto.",
            ][index]
          }
        </div>
      </div>
    </Pop>
  );
};

const DiscoverScene = ({duration}: {duration: number}) => {
  const frame = useCurrentFrame();
  return (
    <SceneShell frame={frame} duration={duration}>
      <div style={{position: "absolute", inset: "92px 135px 160px"}}>
        <Kicker>Capítulo 1 · Descobrir</Kicker>
        <h1 style={{fontSize: 68, color: COLORS.ink, margin: 0}}>
          Do mundo imaginado ao insight coletivo
        </h1>
        <div
          style={{
            marginTop: 75,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 42,
          }}
        >
          {[0, 1, 2].map((index) => (
            <React.Fragment key={index}>
              <StageCard index={index} frame={frame} delay={index * 9} />
              {index < 2 ? (
                <div style={{fontSize: 62, color: COLORS.ink, fontWeight: 950}}>→</div>
              ) : null}
            </React.Fragment>
          ))}
        </div>
        <div
          style={{
            position: "absolute",
            right: 80,
            top: 5,
            padding: "14px 24px",
            border: `4px solid ${COLORS.ink}`,
            borderRadius: 18,
            background: COLORS.sun,
            boxShadow: `6px 6px 0 ${COLORS.ink}`,
            fontSize: 28,
            fontWeight: 950,
            transform: "rotate(3deg)",
          }}
        >
          ⏱ 05:00
        </div>
      </div>
      <Caption>
        Em Cenário imaginamos o mundo. Em Problema definimos o desafio. Nos
        Insights, cada pessoa abre um novo caminho.
      </Caption>
    </SceneShell>
  );
};

const CreateScene = ({duration}: {duration: number}) => {
  const frame = useCurrentFrame();
  const vote = frame > 100;
  return (
    <SceneShell frame={frame} duration={duration}>
      <div style={{position: "absolute", inset: "92px 125px 150px"}}>
        <Kicker>Capítulo 2 · Criar</Kicker>
        <h1 style={{fontSize: 68, color: COLORS.ink, margin: 0}}>
          Criar, escolher, lapidar e prototipar
        </h1>
        <div style={{display: "grid", gridTemplateColumns: "1.05fr .95fr", gap: 55, marginTop: 55}}>
          <div>
            <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20}}>
              {[
                ["Um ritual de boas-vindas", "IV"],
                ["Um mapa de encontros", "MA"],
                ["Uma caixa de histórias", "LU"],
                ["Uma rede de pequenos gestos", "RA"],
              ].map(([idea, initials], index) => (
                <Pop frame={frame} delay={index * 6} key={idea}>
                  <div
                    style={{
                      minHeight: 150,
                      padding: 23,
                      border: `4px solid ${COLORS.ink}`,
                      borderRadius: 18,
                      background: vote && index === 3 ? COLORS.lime : COLORS.white,
                      boxShadow: `7px 7px 0 ${COLORS.ink}`,
                    }}
                  >
                    <span style={{color: COLORS.pinkDark, fontWeight: 950, fontSize: 21}}>
                      {vote ? (index === 3 ? "★ 3 VOTOS" : "1 VOTO") : initials}
                    </span>
                    <div style={{fontSize: 27, fontWeight: 850, marginTop: 12, color: COLORS.ink}}>
                      {idea}
                    </div>
                  </div>
                </Pop>
              ))}
            </div>
            <div
              style={{
                marginTop: 29,
                display: "inline-block",
                padding: "17px 30px",
                border: `4px solid ${COLORS.ink}`,
                borderRadius: 16,
                background: COLORS.pink,
                boxShadow: `6px 6px 0 ${COLORS.ink}`,
                color: COLORS.white,
                fontSize: 27,
                fontWeight: 950,
              }}
            >
              {vote ? "IDEIA ESCOLHIDA!" : "ABRIR VOTAÇÃO"}
            </div>
          </div>
          <div
            style={{
              position: "relative",
              height: 520,
              padding: 34,
              border: `5px solid ${COLORS.ink}`,
              borderRadius: 28,
              background: COLORS.white,
              boxShadow: `12px 12px 0 ${COLORS.ink}`,
            }}
          >
            <div style={{fontSize: 25, color: COLORS.pinkDark, fontWeight: 950}}>
              PROTÓTIPO COLABORATIVO
            </div>
            <div
              style={{
                height: 330,
                marginTop: 22,
                border: `4px dashed ${COLORS.ink}`,
                borderRadius: 20,
                background: COLORS.paper,
                overflow: "hidden",
                position: "relative",
              }}
            >
              <svg width="100%" height="100%" viewBox="0 0 700 330">
                <path
                  d="M75 250 C170 120, 270 290, 390 130 S580 110, 625 230"
                  fill="none"
                  stroke={COLORS.teal}
                  strokeWidth="18"
                  strokeLinecap="round"
                  strokeDasharray="1100"
                  strokeDashoffset={interpolate(frame, [20, 180], [1100, 0], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  })}
                />
                <circle cx="78" cy="250" r="28" fill={COLORS.pink} stroke={COLORS.ink} strokeWidth="7" />
                <circle cx="625" cy="230" r="28" fill={COLORS.sun} stroke={COLORS.ink} strokeWidth="7" />
                <path d="M310 190 l30 -55 l30 55 z" fill={COLORS.lime} stroke={COLORS.ink} strokeWidth="7" />
              </svg>
            </div>
            <div style={{display: "flex", gap: 12, marginTop: 19}}>
              {["✎ Desenho", "▣ Foto", "◉ Áudio", "✦ IA"].map((tool, index) => (
                <div
                  key={tool}
                  style={{
                    padding: "10px 15px",
                    border: `3px solid ${COLORS.ink}`,
                    borderRadius: 12,
                    background: [COLORS.sun, COLORS.lime, COLORS.teal, COLORS.pink][index],
                    fontSize: 20,
                    fontWeight: 900,
                  }}
                >
                  {tool}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <Caption>
        Todos criam ideias e votam. Depois, uma nova carta ajuda a lapidar e o
        grupo constrói um protótipo.
      </Caption>
    </SceneShell>
  );
};

const TestingScene = ({duration}: {duration: number}) => {
  const frame = useCurrentFrame();
  const selected = Math.min(4, Math.max(-1, Math.floor((frame - 110) / 45)));
  return (
    <SceneShell frame={frame} duration={duration}>
      <div style={{position: "absolute", inset: "84px 105px 150px"}}>
        <Kicker>Capítulo 3 · Lançar</Kicker>
        <div style={{display: "flex", justifyContent: "space-between", alignItems: "end"}}>
          <h1 style={{fontSize: 66, color: COLORS.ink, margin: 0}}>
            Cinco testes criados para esta jornada
          </h1>
          <div
            style={{
              padding: "13px 22px",
              border: `4px solid ${COLORS.ink}`,
              borderRadius: 15,
              background: COLORS.sun,
              fontSize: 25,
              fontWeight: 950,
              boxShadow: `5px 5px 0 ${COLORS.ink}`,
            }}
          >
            ✦ GERADO POR IA
          </div>
        </div>
        <div
          style={{
            marginTop: 48,
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 20,
          }}
        >
          {[
            ["A", "Conversa relâmpago", "0"],
            ["B", "Protótipo na rua", "500"],
            ["C", "Teste de ritual", "900"],
            ["D", "Desafio surpresa", "1.400"],
            ["E", "Experiência completa", "2.000"],
          ].map(([letter, title, cost], index) => (
            <Pop frame={frame} delay={index * 6} key={letter}>
              <div
                style={{
                  minHeight: 325,
                  padding: 25,
                  border: `5px solid ${COLORS.ink}`,
                  borderRadius: 23,
                  background: selected === index ? COLORS.lime : COLORS.white,
                  boxShadow: `9px 9px 0 ${COLORS.ink}`,
                  transform: selected === index ? "translateY(-15px) rotate(-1deg)" : undefined,
                }}
              >
                <div
                  style={{
                    width: 58,
                    height: 58,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: "50%",
                    border: `4px solid ${COLORS.ink}`,
                    background: [COLORS.pink, COLORS.orange, COLORS.sun, COLORS.teal, COLORS.purple][index],
                    color: index === 4 ? COLORS.white : COLORS.ink,
                    fontSize: 30,
                    fontWeight: 950,
                  }}
                >
                  {letter}
                </div>
                <div style={{marginTop: 23, fontSize: 29, fontWeight: 950, color: COLORS.ink}}>
                  {title}
                </div>
                <div style={{marginTop: 14, fontSize: 21, lineHeight: 1.3, color: COLORS.ink}}>
                  Uma prova concreta usando o protótipo e o histórico do grupo.
                </div>
                <div style={{marginTop: 22, color: COLORS.pinkDark, fontSize: 24, fontWeight: 950}}>
                  {cost} créditos
                </div>
              </div>
            </Pop>
          ))}
        </div>
        <div
          style={{
            marginTop: 35,
            display: "flex",
            justifyContent: "center",
            gap: 24,
            fontSize: 25,
            fontWeight: 900,
            color: COLORS.ink,
          }}
        >
          <span>1. Escolha o teste</span>
          <span style={{color: COLORS.pink}}>→</span>
          <span>2. Observe a reação</span>
          <span style={{color: COLORS.pink}}>→</span>
          <span>3. Vote em como responder</span>
        </div>
      </div>
      <Caption>
        Em Testando, a IA cria cinco possibilidades. A equipe escolhe, observa a
        reação e vota em como responder.
      </Caption>
    </SceneShell>
  );
};

const ConqueringScene = ({duration}: {duration: number}) => {
  const frame = useCurrentFrame();
  return (
    <SceneShell frame={frame} duration={duration}>
      <div style={{position: "absolute", inset: "95px 130px 150px"}}>
        <Kicker>Etapa 8 · Conquistando</Kicker>
        <h1 style={{fontSize: 68, margin: 0, color: COLORS.ink}}>
          Como conquistar a adesão da galera?
        </h1>
        <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 55, marginTop: 58}}>
          <div style={{display: "grid", gap: 18}}>
            {[
              "Começar com um encontro aberto",
              "Convidar embaixadores da comunidade",
              "Criar um desafio de sete dias",
            ].map((idea, index) => (
              <Pop frame={frame} delay={index * 8} key={idea}>
                <div
                  style={{
                    padding: "24px 29px",
                    border: `5px solid ${COLORS.ink}`,
                    borderRadius: 20,
                    background: index === 1 ? COLORS.lime : COLORS.white,
                    boxShadow: `8px 8px 0 ${COLORS.ink}`,
                    color: COLORS.ink,
                    fontSize: 29,
                    fontWeight: 850,
                  }}
                >
                  <span style={{color: COLORS.pinkDark, marginRight: 17}}>
                    {index === 1 ? "★" : "○"}
                  </span>
                  {idea}
                </div>
              </Pop>
            ))}
          </div>
          <Pop frame={frame} delay={30}>
            <div
              style={{
                padding: 40,
                border: `5px solid ${COLORS.ink}`,
                borderRadius: 28,
                background: COLORS.white,
                boxShadow: `12px 12px 0 ${COLORS.ink}`,
              }}
            >
              <div style={{fontSize: 24, color: COLORS.pinkDark, fontWeight: 950}}>
                REAÇÃO DO PÚBLICO · IA
              </div>
              <h2 style={{fontSize: 45, margin: "18px 0", color: COLORS.ink}}>
                “Queremos experimentar juntos.”
              </h2>
              <p style={{fontSize: 28, lineHeight: 1.4, color: COLORS.ink}}>
                A proposta escolhida aproxima a ideia das pessoas e transforma
                curiosidade em participação.
              </p>
            </div>
          </Pop>
        </div>
      </div>
      <Caption>
        Em Conquistando, cada jogador propõe uma forma de ganhar adesão e o grupo
        escolhe a melhor.
      </Caption>
    </SceneShell>
  );
};

const FinalScene = ({duration}: {duration: number}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const zoom = spring({frame, fps, config: {damping: 16, mass: 0.8}});
  return (
    <SceneShell frame={frame} duration={duration}>
      <div
        style={{
          position: "absolute",
          inset: "75px 115px 120px",
          display: "grid",
          gridTemplateColumns: ".8fr 1.2fr",
          gap: 75,
          alignItems: "center",
        }}
      >
        <div>
          <Img
            src={staticFile("idea-hero-logo.svg")}
            style={{
              width: 480,
              filter: `drop-shadow(10px 12px 0 rgba(41,35,50,.2))`,
              transform: `scale(${zoom})`,
            }}
          />
          <h1 style={{fontSize: 63, lineHeight: 1.02, color: COLORS.ink, margin: "28px 0 0"}}>
            Imaginar.
            <br />
            Criar.
            <br />
            <span style={{color: COLORS.pink}}>Transformar juntos.</span>
          </h1>
        </div>
        <Pop frame={frame} delay={8}>
          <div
            style={{
              padding: "46px 55px",
              border: `6px solid ${COLORS.ink}`,
              borderRadius: 30,
              background: COLORS.white,
              boxShadow: `15px 15px 0 ${COLORS.ink}`,
              transform: "rotate(1deg)",
            }}
          >
            <div style={{color: COLORS.pinkDark, fontSize: 25, fontWeight: 950, letterSpacing: 3}}>
              MANIFESTO CRIADO POR IA
            </div>
            <h2 style={{fontSize: 54, lineHeight: 1.03, color: COLORS.ink, margin: "20px 0"}}>
              Pequenos gestos,
              <br />
              grandes encontros
            </h2>
            <p style={{fontSize: 27, lineHeight: 1.4, color: COLORS.ink}}>
              Criamos uma experiência que transforma histórias individuais em
              caminhos compartilhados — e convida cada pessoa a fazer parte.
            </p>
            <div style={{display: "flex", gap: 15, marginTop: 30}}>
              {["COMPARTILHAR", "PUBLICAR", "BAIXAR"].map((action, index) => (
                <div
                  key={action}
                  style={{
                    padding: "13px 19px",
                    border: `3px solid ${COLORS.ink}`,
                    borderRadius: 12,
                    background: [COLORS.pink, COLORS.teal, COLORS.sun][index],
                    color: index < 2 ? COLORS.white : COLORS.ink,
                    fontSize: 20,
                    fontWeight: 950,
                  }}
                >
                  {action}
                </div>
              ))}
            </div>
          </div>
        </Pop>
      </div>
      <Caption>
        No final, a IA reúne toda a história em um manifesto compartilhável.
        Idea Hero: imaginar, criar e transformar juntos.
      </Caption>
    </SceneShell>
  );
};

export const IdeaHeroTutorial = () => (
  <AbsoluteFill
    style={{
      fontFamily: "Inter, Arial, sans-serif",
      background: COLORS.paper,
      overflow: "hidden",
    }}
  >
    <style>{`
      @font-face {
        font-family: "Palmer Lake";
        src: url("${staticFile("fonts/PalmerLakePrint-Regular.otf")}") format("opentype");
      }
      h1, h2 { font-family: "Palmer Lake", Inter, Arial, sans-serif; font-weight: 400 !important; }
    `}</style>
    <Audio src={staticFile("video/narration.wav")} volume={1} />
    <Sequence from={0} durationInFrames={180}>
      <IntroScene duration={180} />
    </Sequence>
    <Sequence from={180} durationInFrames={240}>
      <JourneyScene duration={240} />
    </Sequence>
    <Sequence from={420} durationInFrames={240}>
      <GuidanceScene duration={240} />
    </Sequence>
    <Sequence from={660} durationInFrames={420}>
      <DiscoverScene duration={420} />
    </Sequence>
    <Sequence from={1080} durationInFrames={360}>
      <CreateScene duration={360} />
    </Sequence>
    <Sequence from={1440} durationInFrames={360}>
      <TestingScene duration={360} />
    </Sequence>
    <Sequence from={1800} durationInFrames={240}>
      <ConqueringScene duration={240} />
    </Sequence>
    <Sequence from={2040} durationInFrames={210}>
      <FinalScene duration={210} />
    </Sequence>
  </AbsoluteFill>
);
