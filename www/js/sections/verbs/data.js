/*!
 * E4U — verbs: data (every form written out)
 * Copyright (c) 2026 Serg. All rights reserved.
 *
 * One row per verb: [base, he / she form, Past Simple, past participle, -ing form, ru, uk, sk, flags]
 * flags: a = A1 (otherwise A2), i = irregular. Two accepted forms: 'learned|learnt'.
 * "be" has its own forms (BE): am / is / are, was / were.
 */
const RAW = [
// irregular
['be', 'is', 'was|were', 'been', 'being', 'быть', 'бути', 'byť', 'ai'],
['have', 'has', 'had', 'had', 'having', 'иметь', 'мати', 'mať', 'ai'],
['do', 'does', 'did', 'done', 'doing', 'делать', 'робити', 'robiť', 'ai'],
['go', 'goes', 'went', 'gone', 'going', 'идти, ехать', 'іти, їхати', 'ísť', 'ai'],
['get', 'gets', 'got', 'got', 'getting', 'получать; добираться', 'отримувати; діставатися', 'dostať; dostať sa', 'ai'],
['make', 'makes', 'made', 'made', 'making', 'делать, изготавливать', 'робити, виготовляти', 'robiť, vyrábať', 'ai'],
['take', 'takes', 'took', 'taken', 'taking', 'брать', 'брати', 'brať, vziať', 'ai'],
['come', 'comes', 'came', 'come', 'coming', 'приходить', 'приходити', 'prísť', 'ai'],
['see', 'sees', 'saw', 'seen', 'seeing', 'видеть', 'бачити', 'vidieť', 'ai'],
['know', 'knows', 'knew', 'known', 'knowing', 'знать', 'знати', 'vedieť, poznať', 'ai'],
['think', 'thinks', 'thought', 'thought', 'thinking', 'думать', 'думати', 'myslieť', 'ai'],
['say', 'says', 'said', 'said', 'saying', 'сказать', 'сказати', 'povedať', 'ai'],
['tell', 'tells', 'told', 'told', 'telling', 'рассказывать, говорить кому-то', 'розповідати, казати комусь', 'povedať niekomu, rozprávať', 'ai'],
['give', 'gives', 'gave', 'given', 'giving', 'давать', 'давати', 'dať', 'ai'],
['find', 'finds', 'found', 'found', 'finding', 'находить', 'знаходити', 'nájsť', 'ai'],
['leave', 'leaves', 'left', 'left', 'leaving', 'уходить, уезжать; оставлять', 'іти, їхати; залишати', 'odísť; nechať', 'ai'],
['feel', 'feels', 'felt', 'felt', 'feeling', 'чувствовать', 'відчувати', 'cítiť', 'ai'],
['put', 'puts', 'put', 'put', 'putting', 'класть, ставить', 'класти, ставити', 'položiť', 'ai'],
['bring', 'brings', 'brought', 'brought', 'bringing', 'приносить', 'приносити', 'priniesť', 'ai'],
['begin', 'begins', 'began', 'begun', 'beginning', 'начинать', 'починати', 'začať', 'ai'],
['write', 'writes', 'wrote', 'written', 'writing', 'писать', 'писати', 'písať', 'ai'],
['read', 'reads', 'read', 'read', 'reading', 'читать', 'читати', 'čítať', 'ai'],
['hear', 'hears', 'heard', 'heard', 'hearing', 'слышать', 'чути', 'počuť', 'ai'],
['meet', 'meets', 'met', 'met', 'meeting', 'встречать', 'зустрічати', 'stretnúť', 'ai'],
['run', 'runs', 'ran', 'run', 'running', 'бегать', 'бігати', 'bežať', 'ai'],
['pay', 'pays', 'paid', 'paid', 'paying', 'платить', 'платити', 'platiť', 'ai'],
['sit', 'sits', 'sat', 'sat', 'sitting', 'сидеть', 'сидіти', 'sedieť', 'ai'],
['stand', 'stands', 'stood', 'stood', 'standing', 'стоять', 'стояти', 'stáť', 'ai'],
['speak', 'speaks', 'spoke', 'spoken', 'speaking', 'говорить', 'говорити', 'hovoriť', 'ai'],
['buy', 'buys', 'bought', 'bought', 'buying', 'покупать', 'купувати', 'kúpiť', 'ai'],
['eat', 'eats', 'ate', 'eaten', 'eating', 'есть', 'їсти', 'jesť', 'ai'],
['drink', 'drinks', 'drank', 'drunk', 'drinking', 'пить', 'пити', 'piť', 'ai'],
['sleep', 'sleeps', 'slept', 'slept', 'sleeping', 'спать', 'спати', 'spať', 'ai'],
['swim', 'swims', 'swam', 'swum', 'swimming', 'плавать', 'плавати', 'plávať', 'ai'],
['sing', 'sings', 'sang', 'sung', 'singing', 'петь', 'співати', 'spievať', 'ai'],
['drive', 'drives', 'drove', 'driven', 'driving', 'водить машину', 'керувати машиною', 'šoférovať', 'ai'],
['ride', 'rides', 'rode', 'ridden', 'riding', 'ездить (верхом, на велосипеде)', 'їздити (верхи, на велосипеді)', 'jazdiť (na bicykli, na koni)', 'ai'],
['fly', 'flies', 'flew', 'flown', 'flying', 'летать', 'літати', 'letieť', 'ai'],
['teach', 'teaches', 'taught', 'taught', 'teaching', 'преподавать, учить', 'викладати, навчати', 'učiť', 'ai'],
['learn', 'learns', 'learned|learnt', 'learned|learnt', 'learning', 'учить, учиться', 'вчити, вчитися', 'učiť sa', 'a'],
['understand', 'understands', 'understood', 'understood', 'understanding', 'понимать', 'розуміти', 'rozumieť', 'ai'],
['forget', 'forgets', 'forgot', 'forgotten', 'forgetting', 'забывать', 'забувати', 'zabudnúť', 'ai'],
['lose', 'loses', 'lost', 'lost', 'losing', 'терять; проигрывать', 'губити; програвати', 'stratiť; prehrať', 'ai'],
['win', 'wins', 'won', 'won', 'winning', 'выигрывать', 'вигравати', 'vyhrať', 'ai'],
['sell', 'sells', 'sold', 'sold', 'selling', 'продавать', 'продавати', 'predávať', 'ai'],
['send', 'sends', 'sent', 'sent', 'sending', 'отправлять', 'надсилати', 'poslať', 'ai'],
['spend', 'spends', 'spent', 'spent', 'spending', 'тратить; проводить (время)', 'витрачати; проводити (час)', 'minúť; tráviť (čas)', 'ai'],
['wake', 'wakes', 'woke', 'woken', 'waking', 'просыпаться, будить', 'прокидатися, будити', 'zobudiť (sa)', 'ai'],
['wear', 'wears', 'wore', 'worn', 'wearing', 'носить (одежду)', 'носити (одяг)', 'nosiť (oblečenie)', 'ai'],
['choose', 'chooses', 'chose', 'chosen', 'choosing', 'выбирать', 'обирати', 'vybrať', 'ai'],
['break', 'breaks', 'broke', 'broken', 'breaking', 'ломать, разбивать', 'ламати, розбивати', 'zlomiť, rozbiť', 'ai'],
['catch', 'catches', 'caught', 'caught', 'catching', 'ловить; успевать (на транспорт)', 'ловити; встигати (на транспорт)', 'chytiť; stihnúť', 'ai'],
['cut', 'cuts', 'cut', 'cut', 'cutting', 'резать', 'різати', 'krájať, rezať', 'ai'],
['draw', 'draws', 'drew', 'drawn', 'drawing', 'рисовать', 'малювати', 'kresliť', 'ai'],
['fall', 'falls', 'fell', 'fallen', 'falling', 'падать', 'падати', 'padať', 'ai'],
['grow', 'grows', 'grew', 'grown', 'growing', 'расти; выращивать', 'рости; вирощувати', 'rásť; pestovať', 'ai'],
['keep', 'keeps', 'kept', 'kept', 'keeping', 'хранить, держать', 'тримати, зберігати', 'držať, nechať si', 'ai'],
['build', 'builds', 'built', 'built', 'building', 'строить', 'будувати', 'stavať', 'ai'],
['throw', 'throws', 'threw', 'thrown', 'throwing', 'бросать', 'кидати', 'hodiť', 'ai'],
['become', 'becomes', 'became', 'become', 'becoming', 'становиться', 'ставати', 'stať sa', 'ai'],
['show', 'shows', 'showed', 'shown', 'showing', 'показывать', 'показувати', 'ukázať', 'ai'],
// regular
['work', 'works', 'worked', 'worked', 'working', 'работать', 'працювати', 'pracovať', 'a'],
['play', 'plays', 'played', 'played', 'playing', 'играть', 'грати', 'hrať (sa)', 'a'],
['live', 'lives', 'lived', 'lived', 'living', 'жить', 'жити', 'bývať, žiť', 'a'],
['like', 'likes', 'liked', 'liked', 'liking', 'нравиться, любить', 'подобатися, любити', 'mať rád', 'a'],
['love', 'loves', 'loved', 'loved', 'loving', 'любить', 'кохати, любити', 'milovať', 'a'],
['want', 'wants', 'wanted', 'wanted', 'wanting', 'хотеть', 'хотіти', 'chcieť', 'a'],
['need', 'needs', 'needed', 'needed', 'needing', 'нуждаться', 'потребувати', 'potrebovať', 'a'],
['watch', 'watches', 'watched', 'watched', 'watching', 'смотреть', 'дивитися', 'pozerať', 'a'],
['listen', 'listens', 'listened', 'listened', 'listening', 'слушать', 'слухати', 'počúvať', 'a'],
['cook', 'cooks', 'cooked', 'cooked', 'cooking', 'готовить (еду)', 'готувати (їжу)', 'variť', 'a'],
['clean', 'cleans', 'cleaned', 'cleaned', 'cleaning', 'убирать, чистить', 'прибирати, чистити', 'upratovať, čistiť', 'a'],
['study', 'studies', 'studied', 'studied', 'studying', 'учиться, изучать', 'навчатися, вивчати', 'študovať', 'a'],
['try', 'tries', 'tried', 'tried', 'trying', 'пробовать, стараться', 'пробувати, намагатися', 'skúsiť', 'a'],
['stop', 'stops', 'stopped', 'stopped', 'stopping', 'останавливать(ся)', 'зупиняти(ся)', 'zastaviť (sa)', 'a'],
['walk', 'walks', 'walked', 'walked', 'walking', 'ходить пешком, гулять', 'ходити пішки, гуляти', 'chodiť pešo', 'a'],
['talk', 'talks', 'talked', 'talked', 'talking', 'разговаривать', 'розмовляти', 'rozprávať sa', 'a'],
['help', 'helps', 'helped', 'helped', 'helping', 'помогать', 'допомагати', 'pomáhať', 'a'],
['ask', 'asks', 'asked', 'asked', 'asking', 'спрашивать', 'питати', 'pýtať sa', 'a'],
['answer', 'answers', 'answered', 'answered', 'answering', 'отвечать', 'відповідати', 'odpovedať', 'a'],
['open', 'opens', 'opened', 'opened', 'opening', 'открывать', 'відчиняти', 'otvoriť', 'a'],
['close', 'closes', 'closed', 'closed', 'closing', 'закрывать', 'зачиняти', 'zatvoriť', 'a'],
['start', 'starts', 'started', 'started', 'starting', 'начинать', 'починати', 'začať', 'a'],
['finish', 'finishes', 'finished', 'finished', 'finishing', 'заканчивать', 'закінчувати', 'skončiť', 'a'],
['call', 'calls', 'called', 'called', 'calling', 'звонить; звать', 'дзвонити; кликати', 'volať', 'a'],
['use', 'uses', 'used', 'used', 'using', 'использовать', 'використовувати', 'používať', 'a'],
['look', 'looks', 'looked', 'looked', 'looking', 'смотреть, выглядеть', 'дивитися, виглядати', 'pozrieť sa, vyzerať', 'a'],
['wait', 'waits', 'waited', 'waited', 'waiting', 'ждать', 'чекати', 'čakať', 'a'],
['visit', 'visits', 'visited', 'visited', 'visiting', 'посещать, навещать', 'відвідувати', 'navštíviť', 'a'],
['arrive', 'arrives', 'arrived', 'arrived', 'arriving', 'прибывать', 'прибувати', 'prísť, priletieť', 'a'],
['dance', 'dances', 'danced', 'danced', 'dancing', 'танцевать', 'танцювати', 'tancovať', 'a'],
['enjoy', 'enjoys', 'enjoyed', 'enjoyed', 'enjoying', 'наслаждаться, получать удовольствие', 'насолоджуватися', 'užívať si', 'a'],
['carry', 'carries', 'carried', 'carried', 'carrying', 'нести', 'нести', 'niesť', 'a'],
['plan', 'plans', 'planned', 'planned', 'planning', 'планировать', 'планувати', 'plánovať', 'a'],
['wash', 'washes', 'washed', 'washed', 'washing', 'мыть, стирать', 'мити, прати', 'umývať, prať', 'a'],
['brush', 'brushes', 'brushed', 'brushed', 'brushing', 'чистить (щёткой)', 'чистити (щіткою)', 'čistiť (kefkou)', 'a'],
['move', 'moves', 'moved', 'moved', 'moving', 'двигать; переезжать', 'рухати; переїжджати', 'pohnúť; presťahovať sa', 'a'],
['travel', 'travels', 'travelled|traveled', 'travelled|traveled', 'travelling|traveling', 'путешествовать', 'подорожувати', 'cestovať', 'a'],
['hope', 'hopes', 'hoped', 'hoped', 'hoping', 'надеяться', 'сподіватися', 'dúfať', ''],
['remember', 'remembers', 'remembered', 'remembered', 'remembering', 'помнить', 'пам’ятати', 'pamätať si', ''],
['decide', 'decides', 'decided', 'decided', 'deciding', 'решать', 'вирішувати', 'rozhodnúť sa', ''],
['change', 'changes', 'changed', 'changed', 'changing', 'менять', 'змінювати', 'meniť', ''],
['agree', 'agrees', 'agreed', 'agreed', 'agreeing', 'соглашаться', 'погоджуватися', 'súhlasiť', ''],
];

export const VERBS = RAW.map(([base, s, past, pp, ing, ru, uk, sk, fl]) => ({
  v: base, s, past: past.split('|'), pp: pp.split('|'), ing: ing.split('|'), t: { ru, uk, sk }, a: fl.includes('a'), irr: fl.includes('i'),
}));

/** Persons for the tasks (it and the polite you are left out: they add nothing new). */
export const PERS = ['I', 'you', 'he', 'she', 'we', 'they'];
const THIRD = p => p === 'he' || p === 'she';
/** to be: Present Simple and Past Simple by person */
export const BE = { pres: { I: 'am', you: 'are', he: 'is', she: 'is', we: 'are', they: 'are' }, past: { I: 'was', you: 'were', he: 'was', she: 'was', we: 'were', they: 'were' } };
/** have got: he / she has got */
export const HAVE_AUX = p => (THIRD(p) ? 'has' : 'have');

/** The stages (what is asked): to be, Present Simple, Present Continuous, Past Simple; past participle is A2. */
export const STAGES = ['be', 'pres', 'cont', 'past', 'pp'];
export const A2_STAGES = ['pp'];

/** The form asked in a stage for a person: { lead, form, alts } — lead is shown before the gap. */
export function formFor(V, stage, p) {
  if (stage === 'be') return { lead: p, form: BE.pres[p], alts: [] };
  if (stage === 'pres') return { lead: p, form: THIRD(p) ? V.s : V.v, alts: [] };
  if (stage === 'cont') return { lead: `${p} ${BE.pres[p]}`, form: V.ing[0], alts: V.ing.slice(1) };
  if (stage === 'past') return V.v === 'be' ? { lead: p, form: BE.past[p], alts: [] } : { lead: p, form: V.past[0], alts: V.past.slice(1) };
  return { lead: `${p} ${HAVE_AUX(p)}`, form: V.pp[0], alts: V.pp.slice(1) };  // pp: I have gone, she has gone
}
/** Which stages a verb takes part in: "be" only in its own stage and in the past; the others not in "be". */
export const fits = (V, stage) => (stage === 'be' ? V.v === 'be' : V.v === 'be' ? stage === 'past' : true);
/** Mistakes learners make with a form: the -ed past of an irregular verb, the plain -s, -ing without the doubled letter. */
export function wrongForms(V, stage, p) {
  const all = [V.v, V.s, ...V.past, ...V.pp, ...V.ing];
  const made = [/e$/.test(V.v) ? V.v + 'd' : V.v + 'ed', V.v + 's', /e$/.test(V.v) ? V.v + 'ing' : V.v.replace(/([^aeiou])([aeiou])([^aeiouwy])$/, '$1$2$3') + 'ing'];
  if (stage === 'be' || (V.v === 'be' && stage === 'past')) return ['am', 'is', 'are', 'was', 'were', 'be', 'been'];
  if (stage === 'pres') made.push(THIRD(p) ? V.v : V.s);
  return [...all, ...made];
}
