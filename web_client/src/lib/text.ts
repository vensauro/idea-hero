export const texts = {
  collaboration: {
    lobby: {
      instructions: {
        title: "Instruções",
        content: [
          "Olha, vamos gastar dinheiro ao decorrer do jogo",
          "Cada turno jogado custa 1000 créditos para a equipe belezzz???",
        ],
      },
    },
    scenario_stage: {
      instructions: {
        title: "Instruções",
        content: [
          "Retire uma carta de inspiração ou proponha um cenário especifico em que deseje trabalhar.",
          "Atenção! O cenário que você descrever será aquele com o qual o grupo irá trabalhar",
        ],
      },
      card_text: {
        not_active_users_content: [
          "Espere {activeUser.name} selecionar o cenário!",
          "O cenário pode ser um pre definido pelo grupo, ou baseado na carta tirada por {activeUser.name}",
        ],
        active_user_content: ["Tirar Carta"],
      },
    },
    problem_stage: {
      instructions: {
        title: "Instruções",
        content: [
          "De acordo a carta de inspiração e o cenário, proponha um problema especifico em que deseje trabalhar.",
        ],
      },
    },
    problem_investment_stage: {
      instructions: {
        title: "Instruções",
        content: [
          "Em sigilo, escolha o jogador que apresentou o problema em que você deseja investir e defina um valor ou invista $1000 para mais uma rodada",
          "O resultado é definido pelo investimento coletivo",
        ],
      },
    },
    problem_ending_stage: {
      instructions: {
        title: "Instruções",
        active_user_content: [
          "Agora que o problema foi decidido e tivemos as perguntas iniciais, recapitule o ocorrido e sua opinião final sobre o discorrido!",
        ],
        not_active_users_content: [
          "Estamos fazendo uma rodada de imersão no problema, faça pelo menos uma pergunta a {problemWinner.name}",
        ],
      },
      card_text: {
        content: [
          "Continuaremos com o problema de {problemWinner.name}!",
          "Esse problema recebeu {problemWinner.value} pontos de investimento",
          "Recomendamos recapitular o que ocorreu até agora!",
        ],
      },
    },
    insights_stage: {
      instructions: {
        title: "Instruções",
        content: [
          "Busque um insight para resolver o problema na sua carta de inspiração. Lembre-se um insight ainda não é uma solução, mas um caminho possível para ser adotado.",
        ],
      },
      card_text: {
        content: [""],
      },
    },
    insights_ending_stage: {
      instructions: {
        title: "Instruções",
        content: [
          "Arremate os insights escolhidos até aqui. Caso não esteja satisfeito com o resultado, você pode fazer suas considerações e propor uma nova rodada, mas lembre-se que a contribuição de cada jogador tem um custo de 1000 pontos",
        ],
      },
      card_text: {
        content: ["{activeUser.name} está escolhendo o insight!"],
      },
    },
    solutions_stage: {
      instructions: {
        title: "Instruções",
        content: [
          "Transforme o insight escolhido em solução, utilize as ideias já existente dos outros jogadores",
        ],
      },
      not_active_user_bottom_text: [
        "É a vez de {activeUser.name} ajudar na construção da solução",
      ],
    },
    solutions_selection_stage: {
      instructions: {
        title: "Instruções",
        content: [
          "Você foi o que mais investiu ao decorrer do caminho, assim investindo metade dos seus pontos você irá propor a solução definitiva!",
        ],
      },
      card_text: {
        content: ["{activeUser.name} está definindo a solução"],
      },
      not_active_user_bottom_text: [
        "É a vez de {activeUser.name} ajudar na construção da solução",
      ],
    },
    solutions_advocate_state: {
      instructions: {
        title: "Instruções",
        content: [
          "Você irá assumir o papel de advogado do diabo! Questione a solução proposta para que vocês entendam os problemas possíveis",
        ],
      },
      card_text: {
        content: ["{activeUser.name} é o advogado do diabo"],
      },
      not_active_user_bottom_text: [
        "É a vez de {activeUser.name} ajudar na construção da solução",
      ],
    },
    prototype_state: {
      instructions: {
        title: "Instruções",
        active_user_content: [
          "Até agora, você foi quem menos investiu nesse projeto. Faça a sua parte investindo 20% dos pontos da mesa. Você pode definir como a solução definida será prototipada. Pode ser com desenhos, maquetes, encenações ou o que a sua criatividade e a realidade á sua volta permitir.",
        ],
        not_active_users_content: [
          "{activeUser.name} está liderando a criação do protótipo da solução criada por vocês, ajude na criação!",
        ],
      },
      card_text: {
        content: [
          "ajude {activeUser.name} na",
          "produção do protótipo, o tempo está contando",
        ],
      },
      not_active_user_bottom_text: ["{activeUser.name} está com o protótipo"],
    },
  },
  pilot_state: {
    instructions: {
      title: "Instruções",
      content: [
        "Chegou a hora de levar o protótipo de vocês para o público mais amplo. Tudo pronto para iniciar o teste?.",
        "O valor do teste será sorteado X vezes o valor investido no protótipo",
        "Depois será definido se o teste funcionou, caso tenha falhado vocês voltarão ao protótipo",
      ],
    },
  },
  marketing_state: {
    instructions: {
      title: "Instruções",
      active_user_content: [
        "Defina o valor do produto em sigilo e em que Mídias de marketing irão investir. Você está com todo recurso do grupo em mãos.",
        "Que tal conversar com o grupo para decidir como utilizar?",
      ],
      not_active_users_content: [
        "Defina o valor do produto em sigilo, converse com {store.game.actualAction.activeUser.name} para saber em quais métodos de marketing investir",
      ],
    },
    form: {
      cost: {
        label: "Quanto custa para o usuário?",
        placeholder: "Valor do produto",
      },
      midias: "Em que mídias você vai investir?",
    },
  },
  sales_state: {
    win: ["Parabens"],
    lose: ["Não foi dessa vez"],
  },
};
