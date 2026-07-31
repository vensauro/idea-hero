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

const C = {
  ink: "#292332",
  paper: "#fff9ed",
  pink: "#ed3e83",
  pinkDark: "#b82661",
  teal: "#35b7bd",
  lime: "#d9ed83",
  sun: "#ffd34f",
  purple: "#8b5bb6",
  orange: "#ff8a45",
  white: "#fffdf8",
};

const STAGES = [
  ["Cenário", "◌", C.pink],
  ["Desafio", "△", C.orange],
  ["Pistas", "✦", C.sun],
  ["Caminhos", "◇", C.teal],
  ["Detalhes", "✧", C.lime],
  ["Ganha forma", "▱", C.purple],
  ["Experimentar", "↗", C.orange],
  ["Companheiros", "◎", C.pink],
  ["Surpresa", "★", C.teal],
] as const;

const enter = (frame: number, fps: number, delay = 0) =>
  spring({
    frame: frame - delay,
    fps,
    config: {damping: 14, stiffness: 130, mass: 0.72},
  });

const sceneOpacity = (frame: number, duration: number) =>
  interpolate(frame, [0, 10, duration - 10, duration], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

const Background = ({accent = C.pink}: {accent?: string}) => (
  <AbsoluteFill
    style={{
      backgroundColor: C.paper,
      backgroundImage: `
        radial-gradient(circle at 18% 12%, ${accent}30, transparent 36rem),
        radial-gradient(circle at 90% 76%, ${C.teal}24, transparent 34rem),
        linear-gradient(rgba(41,35,50,.065) 2px, transparent 2px),
        linear-gradient(90deg, rgba(41,35,50,.065) 2px, transparent 2px)`,
      backgroundSize: "auto, auto, 48px 48px, 48px 48px",
    }}
  />
);

const Shell = ({
  children,
  duration,
  accent,
}: {
  children: React.ReactNode;
  duration: number;
  accent?: string;
}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{opacity: sceneOpacity(frame, duration)}}>
      <Background accent={accent} />
      {children}
    </AbsoluteFill>
  );
};

const Eyebrow = ({children}: {children: React.ReactNode}) => (
  <div
    style={{
      color: C.pinkDark,
      fontSize: 30,
      fontWeight: 950,
      letterSpacing: 6,
      textTransform: "uppercase",
      textAlign: "center",
    }}
  >
    {children}
  </div>
);

const FocusText = ({
  children,
  size = 106,
  color = C.ink,
}: {
  children: React.ReactNode;
  size?: number;
  color?: string;
}) => (
  <div
    style={{
      color,
      fontFamily: '"Palmer Lake", Inter, Arial, sans-serif',
      fontSize: size,
      fontWeight: 400,
      lineHeight: 0.95,
      textAlign: "center",
      textWrap: "balance",
    }}
  >
    {children}
  </div>
);

const Progress = ({active}: {active: number}) => (
  <div
    style={{
      position: "absolute",
      left: 110,
      right: 110,
      bottom: 108,
      display: "flex",
      gap: 16,
      justifyContent: "center",
    }}
  >
    {STAGES.map(([label, , color], index) => (
      <div
        key={label}
        style={{
          width: index === active ? 84 : 22,
          height: 22,
          border: `3px solid ${C.ink}`,
          borderRadius: 20,
          background: index <= active ? color : C.white,
          transition: "width 200ms ease",
        }}
      />
    ))}
  </div>
);

const Intro = ({duration}: {duration: number}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const secondBeat = frame >= 87;
  const local = secondBeat ? frame - 87 : frame;
  const scale = enter(local, fps);
  return (
    <Shell duration={duration} accent={C.teal}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          padding: "160px 90px",
        }}
      >
        <div style={{textAlign: "center", transform: `scale(${scale})`}}>
          {secondBeat ? (
            <>
              <Eyebrow>O Idea Hero é</Eyebrow>
              <div style={{marginTop: 70}}>
                <FocusText size={126}>
                  uma aventura
                  <br />
                  <span style={{color: C.teal}}>colaborativa</span>
                  <br />
                  de criatividade
                </FocusText>
              </div>
            </>
          ) : (
            <>
              <Img
                src={staticFile("idea-hero-logo.svg")}
                style={{
                  width: 760,
                  filter: `drop-shadow(14px 16px 0 rgba(41,35,50,.2))`,
                }}
              />
              <div style={{marginTop: 70}}>
                <Eyebrow>O que é?</Eyebrow>
              </div>
            </>
          )}
        </div>
      </div>
    </Shell>
  );
};

const Purpose = ({duration}: {duration: number}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const scale = enter(frame, fps, 3);
  return (
    <Shell duration={duration} accent={C.pink}>
      <div
        style={{
          position: "absolute",
          inset: "170px 80px 150px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 70,
        }}
      >
        <Eyebrow>Uma aventura colaborativa</Eyebrow>
        <div style={{transform: `scale(${scale})`}}>
          <FocusText size={118}>
            Construir e <span style={{color: C.pink}}>emplacar</span>
            <br />
            uma ideia criativa
          </FocusText>
        </div>
        <div
          style={{
            padding: "26px 44px",
            border: `5px solid ${C.ink}`,
            borderRadius: 28,
            background: C.sun,
            boxShadow: `10px 10px 0 ${C.ink}`,
            color: C.ink,
            fontSize: 42,
            fontWeight: 900,
          }}
        >
          para resolver um problema
        </div>
      </div>
    </Shell>
  );
};

const Journey = ({duration}: {duration: number}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  // These anchors come from the timestamped Gemini narration. The steps are
  // deliberately uneven because the spoken descriptions are uneven too.
  const stageStartFrames = [0, 154, 289, 360, 438, 493, 543, 619, 722];
  const active = stageStartFrames.reduce(
    (current, start, index) => (frame >= start ? index : current),
    0,
  );
  const local = frame - stageStartFrames[active];
  const [label, icon, color] = STAGES[active];
  const scale = enter(local, fps);
  const rotate = interpolate(scale, [0, 1], [-8, 0]);
  return (
    <Shell duration={duration} accent={color}>
      <div style={{position: "absolute", inset: "150px 75px 190px"}}>
        <Eyebrow>A história avança em nove etapas</Eyebrow>
        <div
          style={{
            height: "100%",
            display: "grid",
            placeItems: "center",
            paddingBottom: 100,
          }}
        >
          <div
            style={{
              width: 820,
              minHeight: 760,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 58,
              border: `7px solid ${C.ink}`,
              borderRadius: 52,
              background: C.white,
              boxShadow: `20px 22px 0 ${C.ink}`,
              transform: `scale(${scale}) rotate(${rotate}deg)`,
            }}
          >
            <div
              style={{
                width: 240,
                height: 240,
                display: "grid",
                placeItems: "center",
                border: `7px solid ${C.ink}`,
                borderRadius: "50%",
                background: color,
                color: C.ink,
                fontSize: 124,
                fontWeight: 950,
              }}
            >
              {icon}
            </div>
            <div style={{fontSize: 38, fontWeight: 950, color: C.pinkDark}}>
              ETAPA {active + 1}
            </div>
            <FocusText size={136}>{label}</FocusText>
          </div>
        </div>
      </div>
      <Progress active={active} />
    </Shell>
  );
};

const Surprise = ({duration}: {duration: number}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const reveal = enter(frame, fps, 12);
  return (
    <Shell duration={duration} accent={C.purple}>
      <div
        style={{
          position: "absolute",
          inset: "140px 75px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 65,
        }}
      >
        <div
          style={{
            padding: "22px 42px",
            border: `5px solid ${C.ink}`,
            borderRadius: 20,
            background: C.sun,
            boxShadow: `9px 9px 0 ${C.ink}`,
            fontSize: 44,
            fontWeight: 950,
            transform: "rotate(-3deg)",
          }}
        >
          NO FIM...
        </div>
        <div style={{transform: `scale(${reveal})`}}>
          <FocusText size={170} color={C.pink}>
            SURPRESA!
          </FocusText>
        </div>
        <div
          style={{
            width: 820,
            padding: "42px 46px",
            border: `6px solid ${C.ink}`,
            borderRadius: 34,
            background: C.white,
            boxShadow: `14px 14px 0 ${C.ink}`,
            textAlign: "center",
          }}
        >
          <div style={{color: C.pinkDark, fontSize: 30, fontWeight: 950}}>
            MANIFESTO CRIADO POR IA
          </div>
          <div
            style={{
              marginTop: 25,
              color: C.ink,
              fontFamily: '"Palmer Lake", Inter, Arial, sans-serif',
              fontSize: 72,
              lineHeight: 1,
            }}
          >
            Um resultado muito inusitado
          </div>
        </div>
      </div>
    </Shell>
  );
};

const Group = ({duration}: {duration: number}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const cardBeat = frame >= 180;
  const local = cardBeat ? frame - 180 : frame;
  return (
    <Shell duration={duration} accent={C.teal}>
      <div style={{position: "absolute", inset: "150px 70px 120px"}}>
        <Eyebrow>Como funciona?</Eyebrow>
        <div
          style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: 80,
            paddingBottom: 120,
          }}
        >
          {cardBeat ? (
            <div style={{transform: `scale(${enter(local, fps)})`, textAlign: "center"}}>
              <div
                style={{
                  width: 520,
                  height: 730,
                  margin: "0 auto 70px",
                  padding: 18,
                  border: `7px solid ${C.ink}`,
                  borderRadius: 34,
                  background: C.white,
                  boxShadow: `16px 18px 0 ${C.ink}`,
                  transform: "rotate(4deg)",
                }}
              >
                <Img
                  src={staticFile(
                    "cards/generated/august-deck/17-02bcd3c2-debd-44d6-b2f8-7a4cfaa6b3dd.png",
                  )}
                  style={{width: "100%", height: "100%", objectFit: "cover", borderRadius: 20}}
                />
              </div>
              <FocusText size={91}>
                provocações visuais
                <br />
                <span style={{color: C.teal}}>viram uma ideia compartilhada</span>
              </FocusText>
            </div>
          ) : (
            <>
              <FocusText size={144}>
                <span style={{color: C.teal}}>3 a 5</span> pessoas
              </FocusText>
              <div style={{display: "flex", justifyContent: "center", gap: 18}}>
                {["IV", "MA", "LU", "RA", "CA"].map((name, index) => {
                  const scale = enter(frame, fps, index * 7);
                  return (
                    <div
                      key={name}
                      style={{
                        width: 150,
                        height: 150,
                        display: "grid",
                        placeItems: "center",
                        border: `6px solid ${C.ink}`,
                        borderRadius: "50%",
                        background: [C.pink, C.orange, C.sun, C.teal, C.lime][index],
                        boxShadow: `8px 9px 0 ${C.ink}`,
                        color: C.ink,
                        fontSize: 42,
                        fontWeight: 950,
                        transform: `scale(${scale}) translateY(${index % 2 ? 50 : 0}px)`,
                      }}
                    >
                      {name}
                    </div>
                  );
                })}
              </div>
              <div style={{color: C.ink, fontSize: 48, fontWeight: 850}}>
                percorrem nove etapas
              </div>
            </>
          )}
        </div>
      </div>
    </Shell>
  );
};

const Cards = ({duration}: {duration: number}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const beat = frame < 82 ? 0 : frame < 221 ? 1 : 2;
  const local = beat === 0 ? frame : beat === 1 ? frame - 82 : frame - 221;
  const scale = enter(local, fps);
  return (
    <Shell duration={duration} accent={[C.pink, C.sun, C.teal][beat]}>
      <div
        style={{
          position: "absolute",
          inset: "130px 70px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 70,
        }}
      >
        {beat === 0 ? (
          <div style={{transform: `scale(${scale})`}}>
            <FocusText size={120}>
              As cartas não dão
              <br />
              <span style={{color: C.pink}}>respostas prontas.</span>
            </FocusText>
          </div>
        ) : beat === 1 ? (
          <div style={{transform: `scale(${scale})`}}>
            <FocusText size={132}>
              Elas provocam
              <br />
              <span style={{color: C.orange}}>a criatividade</span>
            </FocusText>
          </div>
        ) : (
          <div style={{transform: `scale(${scale})`}}>
            <FocusText size={118}>
              Você imagina.
              <br />
              <span style={{color: C.teal}}>Você cria livremente.</span>
            </FocusText>
          </div>
        )}
      </div>
    </Shell>
  );
};

const Modes = ({duration}: {duration: number}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const items = [
    ["Contribuir", "uma ideia de cada vez", C.pink],
    ["Sintetizar", "juntar as histórias", C.orange],
    ["Votar", "escolher em grupo", C.teal],
    ["Conversar", "explorar livremente", C.lime],
    ["Prototipar", "desenhar e fotografar", C.purple],
  ] as const;
  const segment = duration / items.length;
  const active = Math.min(items.length - 1, Math.floor(frame / segment));
  const local = frame - active * segment;
  const [title, subtitle, color] = items[active];
  const scale = enter(local, fps);
  return (
    <Shell duration={duration} accent={color}>
      <div
        style={{
          position: "absolute",
          inset: "150px 75px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 80,
        }}
      >
        <Eyebrow>Uma surpresa a cada passo</Eyebrow>
        <div
          style={{
            width: 820,
            minHeight: 740,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: 55,
            border: `7px solid ${C.ink}`,
            borderRadius: 52,
            background: color,
            boxShadow: `18px 20px 0 ${C.ink}`,
            transform: `scale(${scale})`,
          }}
        >
          <FocusText size={138}>{title}</FocusText>
          <div
            style={{
              maxWidth: 650,
              padding: "22px 34px",
              border: `4px solid ${C.ink}`,
              borderRadius: 22,
              background: C.white,
              color: C.ink,
              fontSize: 43,
              fontWeight: 850,
              textAlign: "center",
            }}
          >
            {subtitle}
          </div>
        </div>
      </div>
    </Shell>
  );
};

const CallToAction = ({duration}: {duration: number}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const scale = enter(frame, fps);
  return (
    <Shell duration={duration} accent={C.pink}>
      <div
        style={{
          position: "absolute",
          inset: "120px 65px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 85,
          textAlign: "center",
        }}
      >
        <Img
          src={staticFile("idea-hero-logo.svg")}
          style={{width: 660, filter: `drop-shadow(12px 14px 0 rgba(41,35,50,.2))`}}
        />
        <div style={{transform: `scale(${scale})`}}>
          <FocusText size={126}>
            Agora é
            <br />
            <span style={{color: C.pink}}>com vocês!</span>
          </FocusText>
        </div>
        <div
          style={{
            width: 820,
            padding: "34px 44px",
            border: `6px solid ${C.ink}`,
            borderRadius: 28,
            background: C.sun,
            boxShadow: `12px 12px 0 ${C.ink}`,
            color: C.ink,
            fontSize: 52,
            lineHeight: 1.15,
            fontWeight: 950,
          }}
        >
          Criem uma sala
          <br />e divirtam-se!
        </div>
      </div>
    </Shell>
  );
};

export const IdeaHeroVertical = () => (
  <AbsoluteFill style={{background: C.paper, overflow: "hidden", fontFamily: "Inter, Arial, sans-serif"}}>
    <style>{`
      @font-face {
        font-family: "Palmer Lake";
        src: url("${staticFile("fonts/PalmerLakePrint-Regular.otf")}") format("opentype");
      }
    `}</style>
    <Audio src={staticFile("video/narration-vertical.wav")} volume={1} />
    <Sequence from={0} durationInFrames={237}>
      <Intro duration={237} />
    </Sequence>
    <Sequence from={237} durationInFrames={180}>
      <Purpose duration={180} />
    </Sequence>
    <Sequence from={417} durationInFrames={780}>
      <Journey duration={780} />
    </Sequence>
    <Sequence from={1197} durationInFrames={240}>
      <Surprise duration={240} />
    </Sequence>
    <Sequence from={1437} durationInFrames={360}>
      <Group duration={360} />
    </Sequence>
    <Sequence from={1797} durationInFrames={450}>
      <Cards duration={450} />
    </Sequence>
    <Sequence from={2247} durationInFrames={570}>
      <Modes duration={570} />
    </Sequence>
    <Sequence from={2817} durationInFrames={243}>
      <CallToAction duration={243} />
    </Sequence>
  </AbsoluteFill>
);
