export type StageName =
  | "SCENARIO"
  | "PROBLEM"
  | "INSIGHT"
  | "SOLUTION"
  | "POLISHING"
  | "PROTOTYPE"
  | "TESTING"
  | "CONQUERING"
  | "FINAL";

export const STAGE_GUIDANCE: Record<
  StageName,
  {
    steps: readonly [string, string, string];
    placeholder: string;
    next: string;
  }
> = {
  SCENARIO: {
    steps: [
      "Você é o narrador desta etapa.",
      "Observe a carta e descreva o mundo à luz dela.",
      "O grupo ouvirá e avançará com o cenário que você registrar.",
    ],
    placeholder: "Neste mundo, as pessoas vivem…",
    next: "Depois, o grupo vai procurar uma tensão dentro deste cenário.",
  },
  PROBLEM: {
    steps: [
      "Você é o facilitador desta etapa.",
      "Peça que todos narrem oralmente sua leitura do problema.",
      "Sintetize as perspectivas e registre a visão coletiva.",
    ],
    placeholder: "O problema central que o grupo identificou é…",
    next: "Depois, vocês investigarão o que ainda não foi percebido.",
  },
  INSIGHT: {
    steps: [
      "Mude o ponto de vista sugerido pela carta.",
      "Procure uma causa, comportamento ou recurso escondido.",
      "Registre uma descoberta capaz de mudar o rumo da ideia.",
    ],
    placeholder: "Talvez o problema exista porque…",
    next: "Depois, esses insights alimentarão soluções inesperadas.",
  },
  SOLUTION: {
    steps: [
      "Use a carta como provocação, não como resposta literal.",
      "Conecte cenário, problema e insight.",
      "Proponha uma solução em uma frase clara e ousada.",
    ],
    placeholder: "E se criássemos uma forma de…",
    next: "Depois, a proposta será lapidada em uma rodada oral.",
  },
  POLISHING: {
    steps: [
      "Uma nova carta foi revelada como provocação.",
      "Debatam oralmente sobre como lapidar a ideia vencedora.",
      "Quando o grupo estiver satisfeito, avancem juntos.",
    ],
    placeholder: "Como podemos lapidar e enriquecer esta ideia?…",
    next: "Depois, o grupo vai construir um protótipo visual da ideia.",
  },
  PROTOTYPE: {
    steps: [
      "Imagine uma pessoa usando a solução.",
      "Descreva situação, ação e resultado observável.",
      "Escolha a menor versão que pode ser mostrada hoje.",
    ],
    placeholder: "A pessoa começa por… e então consegue…",
    next: "Depois, essa representação enfrentará uma condição real de teste.",
  },
  TESTING: {
    steps: [
      "Cinco opções de teste aparecerão na tela.",
      "Votem na opção que melhor testa o protótipo.",
      "O custo será descontado do runway da equipe.",
    ],
    placeholder: "Qual é a melhor estratégia de teste para esta fase?…",
    next: "Depois, vocês criarão estratégias para conquistar adesão.",
  },
  CONQUERING: {
    steps: [
      "Pensem em como convencer pessoas a aderirem à ideia.",
      "Cada um registra uma proposta de conquista.",
      "O grupo vota na melhor estratégia.",
    ],
    placeholder: "Para conquistar adesão, eu proporia...",
    next: "Depois, a jornada será consolidada com a ajuda da inteligência artificial.",
  },
  FINAL: {
    steps: [
      "Relembre o valor construído durante a jornada.",
      "A IA vai consolidar toda a história.",
      "Descubra o documento final da jornada do grupo.",
    ],
    placeholder: "Reflexão final sobre a jornada percorrida pelo grupo…",
    next: "Ao concluir, o Idea Hero montará o documento de toda a jornada.",
  },
};
