// Roteiro: cenas de abertura/encerramento de cada noite, eventos durante o
// serviço, finais e diário. Cada cena é uma lista de passos:
//   { who, text, mood }                         fala
//   { choice: [{ text, effects, then: [...] }] } escolha curta
//   { if: {...}, then: [...] }                   trecho condicional
//   { endingChoice: true }                       escolha do desfecho (Noite 7)
// Efeitos: { trust: { npc: n }, bond: { par: n }, clue: id, flag: id, journal: id }

export const SPEAKERS = {
  narrador: { name: '', kind: 'narrator' },
  voz: { name: 'A Voz', kind: 'voice' },
  chef: { name: 'Chef', kind: 'chef' },
};

export const CLUES = {
  clue_miravel: { id: 'clue_miravel', name: 'A canção da cozinheira', text: 'Miravel lembra de uma voz que cantava aqui: "Toda receita começa com uma segunda chance."' },
  clue_ferrao: { id: 'clue_ferrao', name: 'O chapéu alto', text: 'Ferrão lembra de quem cuidava da Mesa do Luar: chapéu alto e riso de sino de vento.' },
  clue_voice: { id: 'clue_voice', name: 'O que ficou no fogo', text: 'A panela disse: "Eu sou o que você deixou no fogo."' },
  clue_mora: { id: 'clue_mora', name: 'O nome no caldeirão', text: 'Mora contou que o seu nome foi guardado no caldeirão, junto com a última receita.' },
};

export const DIALOGUES = {
  n1_intro: [
    { who: 'narrador', text: 'A taberna Mesa do Luar estava fechada havia muitos anos. Até hoje à noite.' },
    { who: 'narrador', text: 'Você acorda flutuando sobre o fogão. Não lembra do próprio nome, mas lembra direitinho de como se fatia um cogumelo.' },
    { who: 'voz', text: '...Acende o fogo. Eles estão com fome.' },
    { who: 'chef', mood: 'surprised', text: 'Quem disse isso? O caldeirão? Caldeirão fala agora?' },
    { who: 'brutus', mood: 'happy', text: 'Ô DE CASA! TEM COMIDA AÍ? Eu ouvi barulho de panela!' },
    { who: 'narrador', text: 'A cozinha abre, o chef é um fantasma e ninguém avisou à vigilância sanitária.' },
  ],
  n1_outro: [
    { who: 'brutus', mood: 'happy', text: 'Fantasma que cozinha. Agora o Brutus já viu de tudo. Volto amanhã com fome dobrada!' },
    { who: 'liria', mood: 'happy', text: 'Obrigada, chef. Fazia tempo que este salão não tinha cheiro de casa.' },
    { who: 'drogon', mood: 'happy', text: 'E-eu anotei tudo. Para a minha futura coluna de crítica gastronômica.' },
    { who: 'voz', text: 'Uma mesa a mais... uma história a menos esquecida.' },
    {
      choice: [
        {
          text: 'Perguntar: "Quem está aí?"',
          effects: { journal: 'voice_first' },
          then: [{ who: 'narrador', text: 'O caldeirão borbulha uma vez, como quem ri baixinho. E fica em silêncio.' }],
        },
        {
          text: 'Fingir que não ouviu e lavar a louça',
          effects: { journal: 'voice_first' },
          then: [{ who: 'narrador', text: 'Você esfrega as panelas com força. A voz não insiste. Ainda.' }],
        },
      ],
    },
  ],

  n2_intro: [
    { who: 'nira', mood: 'neutral', text: 'Então é verdade: tem um fantasma cozinhando aqui. Prazer, Nira. Construtora, ferreira e faminta.' },
    { who: 'nira', mood: 'neutral', text: 'E esse forno? Tá mais frio que caverna de gelo. Eu conserto. Em troca, quero Raízes Douradas sempre que eu passar.' },
    {
      choice: [
        {
          text: 'Aceitar a ajuda de Nira',
          effects: { trust: { nira: 0.5 } },
          then: [{ who: 'nira', mood: 'happy', text: 'Fechado! Uma marretada aqui, uma runa ali... pronto, forno vivo de novo.' }],
        },
        {
          text: '"Pode deixar, eu me viro!"',
          effects: { trust: { nira: 0.25 } },
          then: [
            { who: 'nira', mood: 'happy', text: 'Teimosia de anã, hein? Gostei. Vou consertar mesmo assim, de graça.' },
          ],
        },
      ],
    },
    { who: 'narrador', text: 'O Armário Arcano rangeu e abriu: Água do Luar. Na Despensa Rústica apareceu Queijo da Montanha.' },
    { who: 'narrador', text: 'Dica: clientes adoram rapidez e pratos no ponto. Avaliações de 4★ ou mais contam como boas.' },
  ],
  n2_outro: [
    { who: 'nira', mood: 'happy', text: 'O forno agradece. Eu também. Amanhã trago uns amigos esquisitos.' },
    { who: 'liria', mood: 'neutral', text: 'Chef, um aviso: Brutus jura que os orcs inventaram a batata. Minha avó jurava que foram os elfos.' },
    { who: 'liria', mood: 'neutral', text: 'Quando os dois estiverem aqui juntos... prepare-se.' },
  ],

  n3_intro: [
    { who: 'grix', mood: 'happy', text: 'Grix, inventor, às suas ordens! Consertei o Sino da Harmonia da taberna. Quase não explodiu!' },
    { who: 'miravel', mood: 'neutral', text: 'Hm. Um chef fantasma e um goblin com ferramentas. Que noite promissora... para desastres.' },
    { who: 'narrador', text: 'Tensão: quando clientes se estranham, a barra de tensão sobe. Ela mostra texto e ícone, não só cor.' },
    { who: 'narrador', text: 'Para acalmar um conflito: toque o Sino da Harmonia, converse com um deles de mãos vazias ou sirva um prato da paz (como a Salada da Paz).' },
    { who: 'narrador', text: 'Preferências aparecem nos pedidos e no Livro. Lembrar do que cada um gosta rende estrelas.' },
  ],
  n3_outro: [
    { if: { statMin: ['conflictsResolved', 1] }, then: [{ who: 'brutus', mood: 'happy', text: 'Tá bom, tá bom. Talvez a batata seja de todo mundo.' }] },
    { who: 'miravel', mood: 'neutral', text: 'Chef. Essa voz que sai do caldeirão... eu já a ouvi antes. Anos atrás, aqui mesmo.' },
    {
      choice: [
        {
          text: 'Perguntar a Miravel sobre a voz',
          effects: { clue: 'clue_miravel', trust: { miravel: 0.3 } },
          then: [
            { who: 'miravel', mood: 'neutral', text: 'Ela cantava enquanto cozinhava. Dizia que toda receita começa com uma segunda chance.' },
            { who: 'miravel', mood: 'happy', text: 'Não me olhe assim. Até magas sarcásticas têm boas lembranças.' },
          ],
        },
        {
          text: 'Mudar de assunto',
          effects: { trust: { miravel: 0.1 } },
          then: [{ who: 'miravel', mood: 'neutral', text: 'Como quiser. Mistérios esfriam como sopa.' }],
        },
      ],
    },
  ],

  n4_intro: [
    { who: 'ferrao', mood: 'neutral', text: 'Saudações! Sir Ferrão, cavaleiro da Ordem da... bem, de uma ordem. Trouxe peixes do Lago Abissal.' },
    { who: 'ferrao', mood: 'neutral', text: 'Eu já pesquei aqui, sabe. Quando esta taberna tinha outro nome.' },
    { who: 'grix', mood: 'happy', text: 'E eu montei uma grelha nova! Só pega fogo onde deve. Geralmente.' },
    { who: 'narrador', text: 'Novo: Grelha e Peixe Abissal. O Peixe das Profundezas vai na grelha.' },
  ],
  n4_ferrao: [
    { who: 'ferrao', mood: 'happy', text: 'Este sabor... Quem cuidava daqui servia peixe assim, com folhas élficas.' },
    { who: 'ferrao', mood: 'neutral', text: 'Chamavam a taberna de Mesa do Luar. Ninguém lembra por que fechou.' },
    {
      choice: [
        {
          text: 'Perguntar quem cuidava da taberna',
          effects: { clue: 'clue_ferrao', trust: { ferrao: 0.3 } },
          then: [
            { who: 'ferrao', mood: 'neutral', text: 'Ninguém lembra o nome. Só que cozinhava de chapéu alto... e ria igual sino de vento.' },
            { who: 'ferrao', mood: 'surprised', text: 'Ahn... um chapéu bem parecido com o seu, aliás.' },
          ],
        },
        {
          text: 'Agradecer e voltar ao fogão',
          effects: { trust: { ferrao: 0.4 } },
          then: [{ who: 'ferrao', mood: 'happy', text: 'Claro, claro! Não quero atrapalhar. Desculpe. Obrigado!' }],
        },
      ],
    },
  ],
  n4_outro: [
    { who: 'miravel', mood: 'neutral', text: 'Drogon, querido, você anota até o barulho da colher. Isso é crítica ou fofoca?' },
    { who: 'drogon', mood: 'sad', text: 'É... é crítica! Uma coluna séria! Chef, diz pra ela!' },
    {
      choice: [
        {
          text: 'Defender o caderno de Drogon',
          effects: { trust: { drogon: 0.4 }, bond: { critica: 0.5 } },
          then: [
            { who: 'chef', mood: 'happy', text: 'Toda grande crítica começa com um caderno chamuscado.' },
            { who: 'miravel', mood: 'neutral', text: 'Hm. Tá. Eu leio a primeira coluna. Só a primeira.' },
          ],
        },
        {
          text: 'Ficar fora disso e servir sobremesa',
          effects: { trust: { miravel: 0.2 } },
          then: [{ who: 'narrador', text: 'Você serve um biscoito para cada um. A discussão perde o fôlego.' }],
        },
      ],
    },
  ],

  n5_intro: [
    { who: 'miravel', mood: 'neutral', text: 'Cristal de Névoa. Guarda lembranças. Lasque na tábua com cuidado... ou não, eu só dou conselhos.' },
    { who: 'grix', mood: 'happy', text: 'Eu instalei o cristal no Armário Arcano! Ele zumbe. Isso é normal? Acho que é normal.' },
    { who: 'narrador', text: 'Novo: Cristal de Névoa e Caldo Cintilante. Hoje o caldeirão está estranho. Fique atento.' },
  ],
  n5_voice: [
    { who: 'voz', text: 'Você prometeu... uma mesa para todos.' },
    {
      choice: [
        {
          text: '"Quem é você?"',
          effects: { journal: 'voice_answer' },
          then: [
            { who: 'voz', text: 'Eu sou o que você deixou no fogo. Termine o que começou.' },
          ],
        },
        {
          text: '"Agora não, tenho pedidos!"',
          effects: { journal: 'voice_answer' },
          then: [
            { who: 'voz', text: 'Sempre tantos pedidos... Eu sou o que você deixou no fogo. Termine o que começou.' },
          ],
        },
      ],
    },
    { who: 'narrador', text: 'Pista descoberta. A voz se cala, mas o caldeirão continua morno, como uma mão no ombro.' },
  ],
  n5_outro: [
    { who: 'drogon', mood: 'happy', text: 'Chef! Minha primeira crítica: "Mesa do Luar: onde até o caldeirão tem opinião." Cinco escamas!' },
    { who: 'miravel', mood: 'neutral', text: 'Revisei o texto. Tirei duas vírgulas e um "uau". De nada.' },
    { who: 'narrador', text: 'Ao fechar a porta, você vê um vulto azul observando da janela. Ele sorri e desaparece.' },
  ],

  n6_intro: [
    { who: 'mora', mood: 'neutral', text: 'Boa noite, pequeno chef. Faz tanto tempo que você não me vê... e tão pouco para mim.' },
    { who: 'mora', mood: 'neutral', text: 'Hoje, sirva Brutus e Líria juntos. E em paz. Quero ver esta mesa como ela era.' },
    { who: 'narrador', text: 'Novo: Gelatina de Slime e Pudim Espectral. Objetivo: servir Brutus e Líria, ambos com 4★ ou mais, enquanto estão juntos no salão.' },
  ],
  n6_outro: [
    { if: { flag: 'harmony_batata' }, then: [{ who: 'liria', mood: 'happy', text: 'Brutus, você... dividiu sua batata comigo?' }, { who: 'brutus', mood: 'happy', text: 'Não conta pra ninguém. Orc tem reputação.' }] },
    { who: 'mora', mood: 'neutral', text: 'Você não se lembra, mas esta taberna era sua. Você prometeu que aqui caberiam todos.' },
    {
      choice: [
        {
          text: 'Perguntar por que ninguém lembra o seu nome',
          effects: { clue: 'clue_mora', trust: { mora: 0.3 } },
          then: [
            { who: 'mora', mood: 'neutral', text: 'Porque você o guardou no caldeirão, junto com a última receita: o Banquete do Reencontro.' },
            { who: 'mora', mood: 'happy', text: 'Amanhã todos virão. Raiz, javali e cristal. Você sabe o resto.' },
          ],
        },
        {
          text: 'Dizer que prefere não saber agora',
          effects: { trust: { mora: 0.6 } },
          then: [
            { who: 'mora', mood: 'happy', text: 'A verdade espera. Ela é paciente como um bom ensopado.' },
            { who: 'mora', mood: 'neutral', text: 'Amanhã todos virão. Raiz, javali e cristal: o Banquete do Reencontro.' },
          ],
        },
      ],
    },
  ],

  n7_intro: [
    { who: 'narrador', text: 'Última noite. O salão está enfeitado e todos os bancos têm nome.' },
    { who: 'mora', mood: 'neutral', text: 'O Banquete do Reencontro: raiz, javali e cristal, no caldeirão. A receita que você nunca conseguiu servir.' },
    { who: 'voz', text: 'Uma mesa para todos. Só falta você.' },
    { who: 'narrador', text: 'Mora será a última a chegar. Atenda todo mundo e sirva o banquete a ela.' },
  ],
  n7_outro: [
    { who: 'mora', mood: 'happy', text: 'A casa está cheia. O fogo está aceso. E agora, chef?' },
    { endingChoice: true },
  ],
};

export const ENDINGS = {
  mesa: {
    id: 'mesa',
    name: 'Mesa Compartilhada',
    choice: 'Manter a mesa aberta para todos',
    condition: 'Confiança média 3 ou mais e pelo menos 2 reconciliações.',
    text: [
      'Brutus e Líria dividem a mesma travessa de batatas e discutem só por esporte.',
      'Grix conserta a armadura de Sir Ferrão, sem pólvora. Drogon publica a coluna, com Miravel de revisora. Nira reforma o salão inteiro, de graça e reclamando.',
      'Você fica. Não porque está preso, mas porque escolheu. A Mesa do Luar nunca mais fechou: virou o lugar onde pessoas improváveis sentam juntas.',
    ],
  },
  lenda: {
    id: 'lenda',
    name: 'Lenda da Panela Assombrada',
    choice: 'Fazer da taberna uma lenda',
    condition: 'Sempre disponível ao concluir o banquete.',
    text: [
      'A fila dá volta na dungeon. A crítica de Drogon vira o livro mais vendido do subsolo.',
      'Aventureiros atravessam três andares de armadilhas só para provar a Sopa da Lua do chef fantasma.',
      'Você escolhe manter a casa aberta. Algumas cadeiras ainda esperam amizades que não aconteceram, mas o fogo nunca apaga. E a fama, convenhamos, cai bem num chapéu alto.',
    ],
  },
  segredo: {
    id: 'segredo',
    name: 'Segredo do Luar',
    choice: 'Descobrir quem eu fui',
    condition: 'Pelo menos 3 pistas e o Banquete servido no ponto.',
    text: [
      'No fundo do caldeirão, o cristal brilha e devolve uma lembrança: seu nome era Luar. A taberna tinha o seu nome.',
      'A voz era a sua própria, guardada no fogo com uma promessa que você não conseguiu cumprir em vida: uma mesa para todos.',
      'Você escolhe que memória preservar: a primeira sopa servida a um estranho que virou amigo. A voz silencia. Agora ela mora em você.',
    ],
  },
};

export const ENDING_IDS = Object.keys(ENDINGS);

export const JOURNAL = {
  night1: 'Noite 1 — A Mesa do Luar reabriu. Brutus, Líria e Drogon Jr. foram os primeiros clientes.',
  voice_first: 'Uma voz fala de dentro do caldeirão. Ninguém mais parece estranhar.',
  night2: 'Noite 2 — Nira consertou o forno. A taberna voltou a ter cheiro de lar.',
  night3: 'Noite 3 — Grix consertou o Sino da Harmonia. Miravel desconfia da voz na cozinha.',
  night4: 'Noite 4 — Sir Ferrão trouxe peixes e lembranças da antiga Mesa do Luar.',
  night5: 'Noite 5 — A panela falou com todas as letras. O caderno de Drogon ganhou a primeira crítica.',
  voice_answer: '"Eu sou o que você deixou no fogo."',
  night6: 'Noite 6 — Mora voltou. Ela conhece o passado da taberna e o seu.',
  night7: 'Noite 7 — O Banquete do Reencontro foi servido.',
};

// Linhas do espírito-guia exibidas no Diário, por final, em linguagem natural.
export const ENDING_HINTS = {
  mesa: 'Aproxime os rivais (sino, conversa e pratos da paz) e conquiste a confiança dos clientes.',
  lenda: 'Basta sobreviver às sete noites. Boas avaliações deixam a lenda mais brilhante.',
  segredo: 'Escute quem lembra da antiga taberna. Pistas aparecem em conversas e escolhas.',
};
