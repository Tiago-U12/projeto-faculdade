export const SAVE_KEY = 'aysha-park-prototype-v1';

export const FRUITS = [
  { id: 'fruta-1', name: 'Manga-dourada', texture: 'fruit-gold', x: 840, y: 570 },
  { id: 'fruta-2', name: 'Fruta-do-sol', texture: 'fruit-pink', x: 1460, y: 690 },
  { id: 'fruta-3', name: 'Amora-lunar', texture: 'fruit-purple', x: 1200, y: 1120 },
];

export const DIALOGUES = {
  intro: [
    { speaker: 'Aysha', text: 'Então este é o Aysha Park… Tem uma aventura escondida em cada cantinho!' },
    { speaker: 'Jenny', text: 'E uma gata muito preparada. Eu supervisiono, você explora.' },
    { speaker: 'Jenny', text: 'O Tico está ali no jardim. Parece uma emergência… de lanche.' },
  ],
  ticoStart: [
    { speaker: 'Tico', text: 'Oi, Aysha! Eu estava brincando e perdi as frutas da minha cesta…' },
    { speaker: 'Aysha', text: 'Eu ajudo! Vamos seguir esses rastros pelo jardim.' },
    { speaker: 'Tico', text: 'São três frutas bem coloridas. Minha barriga agradece desde já!' },
    { speaker: 'Jenny', text: 'Três chifres e nenhuma fruta. Um talento raro.' },
  ],
  ticoWaiting: [
    { speaker: 'Tico', text: 'Achou minhas três frutas? Elas ficaram espalhadas pelo jardim.' },
    { speaker: 'Jenny', text: 'Vamos seguir as pegadas. Se eu fosse uma fruta, ficaria perto das flores.' },
  ],
  ticoComplete: [
    { speaker: 'Tico', text: 'Você voltou pra me ajudar! Minha cesta está cheia outra vez!' },
    { speaker: 'Tico', text: 'Este Emblema da Amizade é seu. Quando precisar de mim, é só chamar!' },
    { speaker: 'Jenny', text: 'Missão cumprida. Agora podemos acrescentar “resgate de lanche” ao currículo.' },
    { speaker: 'Aysha', text: 'Combinado, Tico. Foi bom explorar com vocês!' },
  ],
  jennyHints: [
    'O Tico está perto da cesta. Vamos descobrir o que aconteceu?',
    'Olhe as pegadas na trilha. Elas passam perto das frutas brilhantes.',
    'Tem uma fruta dourada, uma rosa e uma roxinha. Uma salada bem elegante.',
    'Já temos tudo? Vamos levar as três frutas de volta ao Tico!',
    'O jardim continua aberto para explorar. Eu cuido da supervisão felina.',
  ],
};
