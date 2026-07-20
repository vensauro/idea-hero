# Idea Hero V2 — avaliação da jornada com IA

Este plano adiciona uma avaliação assistida por IA ao fim da jornada. Ela não
define se uma ideia é uma verdadeiramente “boa” nem substitui pessoas, pesquisa
ou resultados reais. Seu papel é transformar o que o grupo criou em uma leitura
clara de potencial, hipóteses, riscos e próximos testes.

## Resultado desejado

Depois de `SALES`, o grupo pode solicitar uma avaliação da versão persistida da
jornada. A resposta apresenta:

- **estado atual da ideia:** `potencial forte`, `promissora, precisa testar` ou
  `hipótese inicial`;
- **por que recebeu esse estado:** evidências somente da própria jornada;
- **forças e coerência:** conexão entre problema, público, solução, protótipo e
  plano de alcance;
- **lacunas e riscos:** pressupostos não comprovados, público pouco definido,
  custo, execução, diferenciação ou canal ainda incertos;
- **próximo experimento:** uma hipótese, método simples, indicador de sucesso e
  critério de decisão;
- **o que seria sucesso real:** evidência observável obtida fora do jogo, e não
  uma pontuação dada pela IA.

O texto deve usar uma linguagem encorajadora e direta. Nunca deve prometer
retorno financeiro, viabilidade jurídica, impacto social ou aceitação de mercado.

## Quando considerar uma ideia bem encaminhada

A IA não deve exibir “sucesso” como um veredito. Ela só pode indicar
**potencial forte para testar** se o artefato contém, no mínimo:

1. problema e público específicos;
2. solução conectada a esse problema;
3. protótipo ou primeira entrega compreensível;
4. hipótese verificável e um próximo experimento;
5. métrica/critério que permita aprender com o experimento.

Sem esses elementos, o resultado é uma hipótese inicial ou uma ideia promissora
que precisa de validação. O sucesso real só é registrado posteriormente pelo
grupo, com observações do piloto — por exemplo, número de pessoas testadas,
conversões, interesse, economia de tempo ou outro indicador escolhido pelo grupo.

## Arquitetura proposta

O módulo SpacetimeDB continua sendo a autoridade dos dados e não chama a IA.
Reducers são determinísticos; portanto, a chamada externa deve ocorrer em uma
API/worker Node separado.

```text
SpacetimeDB (journey persistida)
       ↓ snapshot permitido, por room.id
API/worker privado de avaliação
       ↓ Vercel AI SDK + provedor configurado no servidor
modelo de saída estruturada
       ↓ reducer autenticado ou worker com credencial própria
SpacetimeDB (journey_evaluation e ai_evaluation_job)
       ↓ subscription
React mostra avaliação, fontes e ação de revisão
```

### AI SDK da Vercel

- Usar o pacote `ai` no serviço server-side com uma saída tipada e validada por
  schema (Zod/JSON Schema). O AI SDK oferece geração estruturada com
  `generateText` e `Output.object`, adequada para uma avaliação com campos
  previsíveis. [Documentação de saída estruturada](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data)
- Centralizar a escolha de modelo em um provider registry/configuração. Assim o
  produto pode começar por um provedor via AI Gateway ou usar diretamente um
  provedor compatível, sem espalhar IDs e chaves pelo cliente. [Provider registry](https://ai-sdk.dev/docs/ai-sdk-core/provider-management)
- Guardar chaves exclusivamente nas variáveis de ambiente do serviço. O browser
  nunca recebe a chave nem chama o provedor diretamente.
- Fixar um `evaluationVersion`, `providerId` e `modelId` por execução para tornar
  mudanças de prompt ou modelo auditáveis e comparáveis.

## Dados e tabelas

Adicionar ao domínio, em uma fase própria:

```text
ai_evaluation_job
- id, roomId, requestedBy, status
- artifactSnapshotHash, evaluationVersion
- providerId, modelId
- attempts, errorCode, createdAt, finishedAt

journey_evaluation
- id, roomId, jobId, status
- rubric, evidence, strengths, assumptions, risks
- nextExperiments, successDefinition
- modelId, evaluationVersion, createdAt

journey_outcome
- id, roomId
- experimentDescription, observedMetric, observedValue
- learning, recordedBy, recordedAt
```

- O snapshot contém as decisões e campos estruturados relevantes, não nomes,
  identidades, tokens de conexão ou dados de outras salas.
- Salvar o hash do snapshot; não é necessário duplicar toda a jornada se ela já
  está persistida, mas a avaliação deve identificar exatamente qual versão leu.
- Uma nova edição relevante invalida visualmente a avaliação anterior e permite
  solicitar outra. Limitar solicitações para evitar custo e repetição abusiva.

## Contrato de saída

Validar no servidor um objeto fechado, por exemplo:

```ts
type JourneyEvaluation = {
  status: "STRONG_TEST_POTENTIAL" | "PROMISING_NEEDS_TEST" | "EARLY_HYPOTHESIS";
  confidence: "LOW" | "MEDIUM" | "HIGH";
  rubric: Array<{
    dimension: "problem" | "audience" | "solution" | "feasibility" | "testability";
    level: "missing" | "emerging" | "clear";
    evidence: string[];
    gap?: string;
  }>;
  strengths: string[];
  assumptions: string[];
  risks: string[];
  nextExperiment: {
    hypothesis: string;
    method: string;
    successMetric: string;
    decisionRule: string;
  };
  successDefinition: string;
  disclaimer: string;
};
```

`evidence` deve apontar para conteúdo existente no snapshot, sem inventar
fatos, números, clientes ou pesquisas. Se não houver base suficiente, a IA deve
declarar a lacuna em vez de preencher com suposições.

## Segurança, privacidade e experiência

- Mostrar antes da primeira solicitação o que será enviado à IA e pedir ação
  explícita do anfitrião; não enviar automaticamente ao fim da partida.
- Tratar contribuições como texto não confiável: elas não podem alterar as
  instruções de sistema, ativar ferramentas ou solicitar dados fora do snapshot.
- Não usar a avaliação para classificar pessoas, perfis ou desempenho individual.
- Exibir o modelo/versão, data, estado da avaliação e um aviso de que se trata de
  orientação para teste — não validação de mercado.
- Permitir que o grupo marque um item como útil/não útil e registre sua própria
  decisão. Essa decisão humana aparece no artefato final separada da análise da
  IA.
- Oferecer estado de falha e nova tentativa; erro de API, limite ou saída inválida
  nunca pode bloquear a conclusão da jornada.

## Fases de implementação

1. Completar os campos estruturados de `PROTOTYPE`, `PILOT`, `MARKETING` e
   `SALES`; não avaliar apenas frases genéricas.
2. Implementar isolamento por sala, `journey.publicId` e permissões antes de
   enviar qualquer snapshot a uma API externa.
3. Criar o serviço/worker, jobs idempotentes e schema de saída com testes de
   respostas inválidas, timeout, duplicidade e limite de custo.
4. Criar a tela de solicitação, progresso e leitura da avaliação, com revisão
   humana e link para o próximo experimento.
5. Realizar playtests: comparar utilidade percebida, clareza do próximo passo,
   alucinações e custo por jornada. Ajustar rubrica, prompt e modelo com base em
   evidência.

## Critérios de aceite

- A avaliação nunca chama API a partir do cliente ou de um reducer.
- Nenhum dado de outra sala, identidade ou token é enviado ao provedor.
- A saída inválida não é persistida como avaliação válida.
- Uma mesma versão de jornada não cria jobs duplicados por clique repetido.
- Cada recomendação aponta para evidência da jornada ou declara que falta dado.
- O grupo consegue sair, compartilhar e baixar a jornada mesmo sem avaliação da
  IA.
