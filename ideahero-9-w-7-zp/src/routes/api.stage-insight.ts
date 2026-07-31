import { createGoogle } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { z } from "zod";

export type StageInsightRequest = {
  stage:
    | "TESTING_OPTIONS"
    | "CONQUERING_QUESTION"
    | "TESTING"
    | "CONQUERING"
    | "FINAL";
  context: string;
};

const TEST_OPTIONS_SCHEMA = z.object({
  question: z.string().min(12).max(180),
  options: z
    .array(
      z.object({
        key: z.string().regex(/^[A-E]$/),
        title: z.string().min(4).max(80),
        description: z.string().min(8).max(180),
        cost: z.number().int().min(0).max(2_000),
        impact: z.string().min(8).max(160),
      }),
    )
    .length(5),
});

const QUESTION_SCHEMA = z.object({
  question: z.string().min(12).max(180),
});

const REACTION_SCHEMA = z.object({
  headline: z.string().min(4).max(120),
  body: z.string().min(4).max(280),
  options: z
    .array(
      z.object({
        key: z.string().min(1).max(2),
        title: z.string().min(2).max(80),
        description: z.string().min(4).max(160),
        learning: z.string().min(2).max(40),
      }),
    )
    .length(3),
});

const PUBLIC_REACTION_SCHEMA = z.object({
  headline: z.string().min(4).max(120),
  body: z.string().min(4).max(280),
});

const JOURNEY_SCHEMA = z.object({
  title: z.string().min(4).max(80),
  summary: z.string().min(8).max(400),
});

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

const STORYTELLING_TONE = `Preserve o universo, a linguagem e as imagens que o grupo criou. Quando a historia for fantastica, narre como uma aventura de RPG magico: pessoas, lugares e descobertas fazem parte de uma jornada encantada. Nao acrescente elementos que nao existam no historico.`;

function testingReactionPrompt(context: string) {
  return `Voce e a voz do mercado em um jogo colaborativo de ideia em portugues brasileiro.
Neste momento, o grupo acabou de escolher uma forma de testar o prototipo com recursos. Descreva a reacao das pessoas que participaram do teste diante do prototipo e da ideia construida, com base exclusivamente na historia abaixo.

Historia construida pela equipe ate agora:
"""
${context}
"""

Devolva apenas o objeto solicitado:
- headline: um titulo curto e concreto descrevendo a reacao observada (ex.: "As pessoas gostaram, mas nao souberam por onde comecar"). Precisa ser realista, especifico e coerente com a ideia da equipe. Nao use termos genericos vazios.
- body: uma frase (ate 280 caracteres) explicando o que aconteceu e o que ficou evidente. Baseie-se na historia; nao invente produtos, numeros ou promessas que nao existem.
- options: exatamente 3 caminhos distintos que a equipe pode escolher para responder a essa reacao. Cada item:
  - key: "A", "B" ou "C"
  - title: nome curto da acao (ate 80 caracteres)
  - description: o que fazer (ate 160 caracteres)
  - learning: uma palavra ou expressao curta (ate 40 caracteres) que sintetiza o aprendizado da escolha

${STORYTELLING_TONE}`;
}

function publicReactionPrompt(context: string) {
  return `Voce e a voz do publico em um jogo colaborativo de ideia em portugues brasileiro.
O grupo acabou de decidir como convidar pessoas a participar da ideia. Descreva a reacao do publico-alvo ao conhecer esse convite, usando exclusivamente a historia abaixo.

Historia construida pela equipe ate agora:
"""
${context}
"""

Devolva apenas o objeto solicitado:
- headline: um titulo curto e concreto descrevendo a reacao observada (ex.: "As pessoas se interessaram, mas ainda nao entenderam como participar"). Seja realista, especifico e coerente com a ideia da equipe.
- body: uma unica frase de ate 280 caracteres relatando o que o publico sentiu, entendeu ou questionou. Nao proponha proximos passos, alternativas, escolhas ou votos. Nao invente produtos, numeros ou promessas.

Esta e apenas uma reacao informativa, nao uma nova decisao da equipe. Nao descreva o convite como vitoria, conquista, dominacao ou recompensa. ${STORYTELLING_TONE}`;
}

function journeyPrompt(context: string) {
  return `Voce narra o epilogo de uma jornada colaborativa de ideia em portugues brasileiro.
Reescreva, a partir da historia abaixo, um titulo e um resumo que unifiquem o que o grupo construiu ao longo da jornada e mostrem como a ideia convida outras pessoas a participar.

Historia construida pela equipe:
"""
${context}
"""

Devolva apenas o objeto solicitado:
- title: um titulo memoravel para a ideia (ate 80 caracteres). Pode ser criativo, mas precisa refletir a ideia real.
- summary: um paragrafo (ate 400 caracteres) que consolide cenario, problema, solucao, prototipo e o convite para participar em uma narrativa unica. O convite e uma forma de as pessoas se aproximarem da ideia; nao e uma vitoria, conquista, dominio ou resultado garantido. Use apenas o que existe na historia; nao invente dados, metricas ou promessas.

${STORYTELLING_TONE}`;
}

function testingOptionsPrompt(context: string) {
  return `Voce e um estrategista de testes em um jogo colaborativo de ideia em portugues brasileiro.
Com base exclusivamente na historia abaixo, proponha exatamente 5 formas praticas e diferentes de testar o prototipo.

Historia construida pela equipe:
"""
${context}
"""

Devolva um objeto com question e options. question deve ser uma pergunta concreta que ajude o grupo a escolher o teste certo. options deve ser uma lista com 5 opcoes; cada item deve ter key ("A" a "E", sem repetir), title, description, cost (inteiro entre 0 e 2.000 creditos) e impact.
As opcoes devem ser viaveis para um grupo pequeno, ter niveis de investimento variados e testar hipoteses diferentes. Nao invente fatos sobre a ideia ou o publico. Nao mencione desenhos, fotografias, imagens, audios, artefatos ou materiais especificos, a menos que estejam explicitamente registrados na historia. ${STORYTELLING_TONE}`;
}

function conqueringQuestionPrompt(context: string) {
  return `Voce facilita a etapa de convite ao mundo em um jogo colaborativo de ideia em portugues brasileiro.
Com base exclusivamente na historia abaixo, escreva uma unica pergunta concreta que ajude o grupo a propor como convidar pessoas a participar desta ideia.

Historia construida pela equipe:
"""
${context}
"""

A pergunta deve ter ate 180 caracteres, estimular propostas praticas e especificas, e nao inventar fatos sobre a ideia ou o publico. Nao use vitoria, conquista ou convencimento como objetivo. ${STORYTELLING_TONE} Devolva apenas o objeto solicitado com a propriedade question.`;
}

export async function action({ request }: { request: Request }) {
  if (request.method !== "POST") {
    return json({ error: "Use POST para gerar a reacao da etapa." }, 405);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return json({ error: "A geracao por IA ainda nao esta configurada." }, 503);
  }

  try {
    const payload = (await request.json()) as Partial<StageInsightRequest>;
    const stage = payload.stage;
    const context = String(payload.context ?? "").trim();

    if (context.length < 8) {
      return json({ error: "Contexto da jornada insuficiente." }, 400);
    }

    const google = createGoogle({ apiKey });

    if (stage === "TESTING_OPTIONS") {
      const result = await generateText({
        model: google("gemini-flash-latest"),
        output: Output.object({ schema: TEST_OPTIONS_SCHEMA }),
        prompt: testingOptionsPrompt(context),
      });
      return json(result.output);
    }

    if (stage === "CONQUERING_QUESTION") {
      const result = await generateText({
        model: google("gemini-flash-latest"),
        output: Output.object({ schema: QUESTION_SCHEMA }),
        prompt: conqueringQuestionPrompt(context),
      });
      return json(result.output);
    }

    if (stage === "FINAL") {
      const result = await generateText({
        model: google("gemini-flash-latest"),
        output: Output.object({ schema: JOURNEY_SCHEMA }),
        prompt: journeyPrompt(context),
      });
      return json(result.output);
    }

    if (stage === "CONQUERING") {
      const result = await generateText({
        model: google("gemini-flash-latest"),
        output: Output.object({ schema: PUBLIC_REACTION_SCHEMA }),
        prompt: publicReactionPrompt(context),
      });
      return json(result.output);
    }

    if (stage !== "TESTING") {
      return json({ error: "Etapa invalida para reacao da IA." }, 400);
    }

    const result = await generateText({
      model: google("gemini-flash-latest"),
      output: Output.object({ schema: REACTION_SCHEMA }),
      prompt: testingReactionPrompt(context),
    });
    return json(result.output);
  } catch (error) {
    console.error("Stage insight generation failed", error);
    return json(
      { error: "Nao foi possivel gerar a reacao agora. Tente novamente." },
      502,
    );
  }
}
