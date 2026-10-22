export type Difficulty='facil'|'intermediario'|'dificil';
export type Scope='aula'|'aprofundamento'|'desafio';
export type Mode='aprender'|'simulado'|'revisao'|'misto';
export type Question={id:string;disciplina:'fullstack'|'calculo2';topic:string;stem:string;options:string[];correctIndex:number;explanation:string;difficulty:Difficulty;scope:Scope;status:'approved'|'needs-review'|'rejected';sourceRefs:string[]};
export type Config={disciplina:Question['disciplina'];topics:string[];scope:Scope;mode:Mode;size:number};
export type SessionItem={question:Question;options:string[];correctIndex:number};
export type Attempt={id:string;date:string;discipline:string;answers:{questionId:string;topic:string;correct:boolean}[]};
export function eligible(all:Question[],cfg:Config,allowReview=false){
 return all.filter(q=>q.disciplina===cfg.disciplina && cfg.topics.includes(q.topic) && (allowReview||q.status==='approved') && (cfg.scope==='desafio'||(cfg.scope==='aprofundamento'&&q.scope!=='desafio')||q.scope==='aula'));
}
export function shuffle<T>(arr:T[],random=Math.random):T[]{const out=[...arr];for(let i=out.length-1;i>0;i--){let j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
export function prepare(list:Question[],count:number,random=Math.random):SessionItem[]{return shuffle(list,random).slice(0,count).map(q=>{const order=shuffle(q.options.map((text,index)=>({text,index})),random);return {question:q,options:order.map(o=>o.text),correctIndex:order.findIndex(o=>o.index===q.correctIndex)};});}
export function validateQuestion(q:Question):string[]{let errors:string[]=[];if(!q.id||!q.topic||!q.stem)errors.push('Identidade, assunto ou enunciado ausente');if(q.options.length<2||new Set(q.options).size!==q.options.length)errors.push('Alternativas insuficientes/duplicadas');if(!Number.isInteger(q.correctIndex)||q.correctIndex<0||q.correctIndex>=q.options.length)errors.push('Índice do gabarito inválido');if(!q.explanation||!q.sourceRefs.length)errors.push('Falta explicação ou referência');return errors;}
const STORAGE='study-mastery-attempts-v02';
export function readAttempts():Attempt[]{try{return JSON.parse(localStorage.getItem(STORAGE)||'[]')}catch{return []}}
export function storeAttempt(a:Attempt){try{localStorage.setItem(STORAGE,JSON.stringify([a,...readAttempts()].slice(0,150)))}catch{}}
export function weakTopics(attempts:Attempt[]):string[]{const map=new Map<string,{good:number,total:number}>();attempts.flatMap(a=>a.answers).forEach(x=>{let s=map.get(x.topic)||{good:0,total:0};s.total++;if(x.correct)s.good++;map.set(x.topic,s)});return [...map.entries()].sort((a,b)=>a[1].good/a[1].total-b[1].good/b[1].total).map(x=>x[0]);}
