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
      "Você é o jogador da vez nesta etapa.",
      "Observe a carta e defina o cenário que ela inspira.",
      "Registre o cenário para o grupo seguir a jornada.",
    ],
    placeholder: "Neste mundo, as pessoas vivem…",
    next: "Depois, todos contarão suas leituras do problema.",
  },
  PROBLEM: {
    steps: [
      "Você é o jogador da vez nesta etapa.",
      "Peça que todos contem oralmente sua leitura do problema.",
      "Sintetize as histórias e registre o problema do grupo.",
    ],
    placeholder: "O problema central que o grupo identificou é…",
    next: "Depois, cada pessoa vai compartilhar seus insights.",
  },
  INSIGHT: {
    steps: [
      "Use a carta para imaginar uma direção diferente.",
      "Compartilhe um caminho, conexão ou abertura que possa inspirar uma ideia.",
      "Todos os caminhos ficam registrados para alimentar a etapa de Ideias.",
    ],
    placeholder: "Um caminho possível seria…",
    next: "Depois, vocês entram nas duas rodadas de Ideias: criar e votar.",
  },
  SOLUTION: {
    steps: [
      "Primeira rodada: cada pessoa registra uma ideia.",
      "Use o cenário, o problema e os insights como matéria-prima.",
      "Segunda rodada: o jogador da vez abre a votação coletiva.",
    ],
    placeholder: "E se criássemos uma forma de…",
    next: "Depois, uma nova carta abre a rodada de Lapidando.",
  },
  POLISHING: {
    steps: [
      "Uma nova carta aparece para provocar o grupo.",
      "O jogador da vez conduz uma conversa livre sobre a ideia votada.",
      "Não é preciso registrar nada: explorem, divirtam-se e façam brainstorming.",
    ],
    placeholder: "Como podemos lapidar e enriquecer esta ideia?…",
    next: "Depois, o grupo vai prototipar a ideia.",
  },
  PROTOTYPE: {
    steps: [
      "Transformem a ideia em algo que possa ser visto ou encenado.",
      "Mostrem situação, ação e resultado de forma simples.",
      "Escolham a menor versão que conseguem criar agora.",
    ],
    placeholder: "A pessoa começa por… e então consegue…",
    next: "Depois, vocês escolherão uma das cinco possibilidades de teste.",
  },
  TESTING: {
    steps: [
      "Cinco possibilidades aleatórias aparecerão na tela.",
      "Escolham a que melhor usa os recursos existentes para refinar o protótipo.",
      "A escolha mostra um novo caminho para testar e melhorar a ideia.",
    ],
    placeholder: "Qual é a melhor estratégia de teste para esta fase?…",
    next: "Depois, cada pessoa vai propor como conquistar a adesão da galera.",
  },
  CONQUERING: {
    steps: [
      "Cada pessoa registra uma ideia para conquistar a adesão da galera.",
      "O jogador da vez abre a votação, como na etapa de Ideias.",
      "O grupo escolhe a proposta que quer levar adiante.",
    ],
    placeholder: "Para conquistar a adesão da galera, eu proporia...",
    next: "Depois, um agente de IA vai criar o final a partir do histórico.",
  },
  FINAL: {
    steps: [
      "Relembrem o que o grupo criou em cada etapa.",
      "Um agente de IA usa esse histórico para criar o final.",
      "Descubram e compartilhem o resultado da jornada.",
    ],
    placeholder: "Reflexão final sobre a jornada percorrida pelo grupo…",
    next: "Ao concluir, o Idea Hero apresenta o final criado a partir da história do grupo.",
  },
};
