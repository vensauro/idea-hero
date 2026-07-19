export type StageName =
  | "SCENARIO"
  | "PROBLEM"
  | "INSIGHT"
  | "SOLUTION"
  | "PROTOTYPE"
  | "PILOT"
  | "MARKETING"
  | "SALES";

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
      "Observe a carta por alguns segundos.",
      "Diga o que existe nesse mundo — sem buscar resposta certa.",
      "Registre uma frase que dê contexto ao grupo.",
    ],
    placeholder: "Neste mundo, as pessoas…",
    next: "Depois, o grupo vai procurar uma tensão dentro deste cenário.",
  },
  PROBLEM: {
    steps: [
      "Olhe para a carta como uma tensão ou necessidade.",
      "Pense em quem sente essa dificuldade com mais força.",
      "Formule o problema sem antecipar uma solução.",
    ],
    placeholder: "O desafio é que [pessoa] não consegue…",
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
    next: "Depois, a proposta ganhará forma em um protótipo simples.",
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
  PILOT: {
    steps: [
      "Transforme a carta em uma condição inesperada do teste.",
      "Decida o que observar para aprender.",
      "Registre o ajuste que a ideia precisará fazer.",
    ],
    placeholder: "Se acontecer…, aprenderemos que precisamos…",
    next: "Depois, vocês decidirão como contar o valor da solução.",
  },
  MARKETING: {
    steps: [
      "Escolha quem precisa ouvir esta história primeiro.",
      "Conecte a imagem a uma emoção ou promessa.",
      "Combine público, mensagem e canal em uma frase.",
    ],
    placeholder: "Para [público], nossa mensagem será… por meio de…",
    next: "Depois, a jornada termina com impacto, aliados e próximo passo.",
  },
  SALES: {
    steps: [
      "Relembre o valor construído durante a jornada.",
      "Imagine a primeira evidência concreta de impacto.",
      "Escolha um próximo passo pequeno, real e assumido pelo grupo.",
    ],
    placeholder: "Nosso primeiro passo real será…",
    next: "Ao concluir, o Idea Hero montará o documento de toda a jornada.",
  },
};
