/*!
 * E4U — adjectives: data (every form written out)
 * Copyright (c) 2026 Serg. All rights reserved.
 *
 * One row per adjective: [adjective, comparative, superlative (without "the"), opposite(s) or '-', ru, uk, sk, flags]
 * Two right forms: 'friendlier|more friendly'; two opposites: 'new|young' (the first is asked, both are right).
 * Colours have no comparison here ('-'). flags: a = A1 (otherwise A2). The words: the A1 coursebooks' wordlists
 * (Navigate A1 units 3, 5, 6, 9) and the usual pairs of opposites.
 */
const RAW = [
// size, age, quality
['big', 'bigger', 'biggest', 'small', 'большой', 'великий', 'veľký', 'a'],
['small', 'smaller', 'smallest', 'big', 'маленький', 'маленький', 'malý', 'a'],
['long', 'longer', 'longest', 'short', 'длинный', 'довгий', 'dlhý', 'a'],
['short', 'shorter', 'shortest', 'long|tall', 'короткий; невысокий', 'короткий; невисокий', 'krátky; nízky', 'a'],
['tall', 'taller', 'tallest', 'short', 'высокий (о росте)', 'високий (на зріст)', 'vysoký (postavou)', 'a'],
['high', 'higher', 'highest', 'low', 'высокий', 'високий', 'vysoký', 'a'],
['low', 'lower', 'lowest', 'high', 'низкий', 'низький', 'nízky', 'a'],
['wide', 'wider', 'widest', 'narrow', 'широкий', 'широкий', 'široký', ''],
['narrow', 'narrower', 'narrowest', 'wide', 'узкий', 'вузький', 'úzky', ''],
['old', 'older', 'oldest', 'new|young', 'старый', 'старий', 'starý', 'a'],
['new', 'newer', 'newest', 'old', 'новый', 'новий', 'nový', 'a'],
['young', 'younger', 'youngest', 'old', 'молодой', 'молодий', 'mladý', 'a'],
['good', 'better', 'best', 'bad', 'хороший', 'добрий, гарний', 'dobrý', 'a'],
['bad', 'worse', 'worst', 'good', 'плохой', 'поганий', 'zlý', 'a'],
['nice', 'nicer', 'nicest', '-', 'приятный, милый', 'приємний, милий', 'pekný, milý', 'a'],
['great', 'greater', 'greatest', '-', 'отличный; великий', 'чудовий; великий', 'skvelý; veľký', 'a'],
['heavy', 'heavier', 'heaviest', 'light', 'тяжёлый', 'важкий', 'ťažký (váhou)', 'a'],
['light', 'lighter', 'lightest', 'heavy|dark', 'лёгкий; светлый', 'легкий; світлий', 'ľahký; svetlý', 'a'],
['dark', 'darker', 'darkest', 'light', 'тёмный', 'темний', 'tmavý', 'a'],
['full', 'fuller', 'fullest', 'empty', 'полный', 'повний', 'plný', 'a'],
['empty', 'emptier', 'emptiest', 'full', 'пустой', 'порожній', 'prázdny', 'a'],
['strong', 'stronger', 'strongest', 'weak', 'сильный', 'сильний', 'silný', 'a'],
['weak', 'weaker', 'weakest', 'strong', 'слабый', 'слабкий', 'slabý', ''],
['thin', 'thinner', 'thinnest', 'fat', 'худой; тонкий', 'худий; тонкий', 'chudý; tenký', 'a'],
['fat', 'fatter', 'fattest', 'thin', 'толстый', 'товстий', 'tučný, tlstý', ''],
// weather and temperature
['hot', 'hotter', 'hottest', 'cold', 'жаркий, горячий', 'спекотний, гарячий', 'horúci', 'a'],
['cold', 'colder', 'coldest', 'hot|warm', 'холодный', 'холодний', 'studený', 'a'],
['warm', 'warmer', 'warmest', 'cold|cool', 'тёплый', 'теплий', 'teplý', 'a'],
['cool', 'cooler', 'coolest', 'warm', 'прохладный', 'прохолодний', 'chladný', 'a'],
['wet', 'wetter', 'wettest', 'dry', 'мокрый', 'мокрий', 'mokrý', ''],
['dry', 'drier|dryer', 'driest|dryest', 'wet', 'сухой', 'сухий', 'suchý', ''],
['sunny', 'sunnier', 'sunniest', '-', 'солнечный', 'сонячний', 'slnečný', 'a'],
// speed, time, distance
['fast', 'faster', 'fastest', 'slow', 'быстрый', 'швидкий', 'rýchly', 'a'],
['slow', 'slower', 'slowest', 'fast', 'медленный', 'повільний', 'pomalý', 'a'],
['early', 'earlier', 'earliest', 'late', 'ранний', 'ранній', 'skorý', 'a'],
['late', 'later', 'latest', 'early', 'поздний', 'пізній', 'neskorý', 'a'],
['near', 'nearer', 'nearest', 'far', 'близкий', 'близький', 'blízky', 'a'],
['far', 'further|farther', 'furthest|farthest', 'near', 'далёкий', 'далекий', 'ďaleký', 'a'],
// money, places, things
['cheap', 'cheaper', 'cheapest', 'expensive', 'дешёвый', 'дешевий', 'lacný', 'a'],
['expensive', 'more expensive', 'most expensive', 'cheap', 'дорогой', 'дорогий', 'drahý', 'a'],
['rich', 'richer', 'richest', 'poor', 'богатый', 'багатий', 'bohatý', 'a'],
['poor', 'poorer', 'poorest', 'rich', 'бедный', 'бідний', 'chudobný', 'a'],
['clean', 'cleaner', 'cleanest', 'dirty', 'чистый', 'чистий', 'čistý', 'a'],
['dirty', 'dirtier', 'dirtiest', 'clean', 'грязный', 'брудний', 'špinavý', 'a'],
['quiet', 'quieter', 'quietest', 'noisy', 'тихий', 'тихий', 'tichý', 'a'],
['noisy', 'noisier', 'noisiest', 'quiet', 'шумный', 'галасливий', 'hlučný', 'a'],
['loud', 'louder', 'loudest', 'quiet', 'громкий', 'гучний', 'hlasný', ''],
['busy', 'busier', 'busiest', 'quiet', 'занятой; оживлённый', 'зайнятий; людний', 'zaneprázdnený; rušný', 'a'],
['safe', 'safer', 'safest', 'dangerous', 'безопасный', 'безпечний', 'bezpečný', 'a'],
['dangerous', 'more dangerous', 'most dangerous', 'safe', 'опасный', 'небезпечний', 'nebezpečný', 'a'],
['modern', 'more modern', 'most modern', 'traditional', 'современный', 'сучасний', 'moderný', 'a'],
['traditional', 'more traditional', 'most traditional', 'modern', 'традиционный', 'традиційний', 'tradičný', 'a'],
['comfortable', 'more comfortable', 'most comfortable', 'uncomfortable', 'удобный', 'зручний', 'pohodlný', 'a'],
['beautiful', 'more beautiful', 'most beautiful', 'ugly', 'красивый', 'гарний, вродливий', 'krásny', 'a'],
['ugly', 'uglier', 'ugliest', 'beautiful', 'некрасивый, уродливый', 'негарний, потворний', 'škaredý', 'a'],
['famous', 'more famous', 'most famous', '-', 'знаменитый', 'відомий', 'slávny', 'a'],
['important', 'more important', 'most important', '-', 'важный', 'важливий', 'dôležitý', 'a'],
['popular', 'more popular', 'most popular', '-', 'популярный', 'популярний', 'populárny', 'a'],
['delicious', 'more delicious', 'most delicious', '-', 'очень вкусный', 'дуже смачний', 'chutný, lahodný', 'a'],
// people and feelings
['happy', 'happier', 'happiest', 'sad|unhappy', 'счастливый', 'щасливий', 'šťastný', 'a'],
['sad', 'sadder', 'saddest', 'happy', 'грустный', 'сумний', 'smutný', 'a'],
['interesting', 'more interesting', 'most interesting', 'boring', 'интересный', 'цікавий', 'zaujímavý', 'a'],
['boring', 'more boring', 'most boring', 'interesting|exciting', 'скучный', 'нудний', 'nudný', 'a'],
['exciting', 'more exciting', 'most exciting', 'boring', 'захватывающий', 'захопливий', 'vzrušujúci', 'a'],
['easy', 'easier', 'easiest', 'difficult|hard', 'лёгкий (несложный)', 'легкий (нескладний)', 'ľahký (jednoduchý)', 'a'],
['difficult', 'more difficult', 'most difficult', 'easy', 'трудный', 'складний', 'ťažký (náročný)', 'a'],
['friendly', 'friendlier|more friendly', 'friendliest|most friendly', 'unfriendly', 'дружелюбный', 'привітний', 'priateľský', 'a'],
['funny', 'funnier', 'funniest', 'serious', 'смешной', 'смішний', 'vtipný', 'a'],
['serious', 'more serious', 'most serious', 'funny', 'серьёзный', 'серйозний', 'vážny', ''],
['clever', 'cleverer|more clever', 'cleverest|most clever', 'stupid', 'умный', 'розумний', 'múdry', 'a'],
['stupid', 'stupider|more stupid', 'stupidest|most stupid', 'clever', 'глупый', 'дурний', 'hlúpy', ''],
['polite', 'more polite|politer', 'most polite|politest', 'rude', 'вежливый', 'ввічливий', 'zdvorilý', ''],
['rude', 'ruder', 'rudest', 'polite', 'грубый', 'грубий', 'drzý, nezdvorilý', ''],
['lucky', 'luckier', 'luckiest', 'unlucky', 'везучий', 'везучий', 'mať šťastie (šťastný)', 'a'],
['healthy', 'healthier', 'healthiest', 'unhealthy', 'здоровый, полезный', 'здоровий, корисний', 'zdravý', 'a'],
['hungry', 'hungrier', 'hungriest', '-', 'голодный', 'голодний', 'hladný', 'a'],
['tired', 'more tired', 'most tired', '-', 'уставший', 'втомлений', 'unavený', 'a'],
// A2 — from the A2 coursebook's wordlist (Navigate A2 units 7–12)
['fit', 'fitter', 'fittest', '-', 'в хорошей форме', 'у добрій формі', 'v dobrej kondícii', ''],
['cloudy', 'cloudier', 'cloudiest', 'sunny', 'облачный', 'хмарний', 'zamračený', ''],
['foggy', 'foggier', 'foggiest', '-', 'туманный', 'туманний', 'hmlistý', ''],
['icy', 'icier', 'iciest', '-', 'обледенелый, ледяной', 'ожеледний, крижаний', 'zľadovatený', ''],
['mild', 'milder', 'mildest', '-', 'мягкий (о погоде)', 'м’який (про погоду)', 'mierny', ''],
['deep', 'deeper', 'deepest', 'shallow', 'глубокий', 'глибокий', 'hlboký', ''],
['large', 'larger', 'largest', 'small', 'большой (по размеру)', 'великий (за розміром)', 'veľký (rozmerom)', ''],
['close', 'closer', 'closest', 'far', 'близкий (о друге, месте)', 'близький (про друга, місце)', 'blízky (o priateľovi, mieste)', ''],
['crazy', 'crazier', 'craziest', '-', 'сумасшедший', 'божевільний', 'šialený', ''],
['awful', 'more awful', 'most awful', '-', 'ужасный', 'жахливий', 'hrozný', ''],
['brilliant', 'more brilliant', 'most brilliant', '-', 'блестящий, отличный', 'блискучий, чудовий', 'vynikajúci', ''],
['lovely', 'lovelier|more lovely', 'loveliest|most lovely', '-', 'прелестный, чудесный', 'прекрасний, чарівний', 'nádherný, milý', ''],
['colourful', 'more colourful', 'most colourful', '-', 'красочный, яркий', 'барвистий, яскравий', 'pestrý, farebný', ''],
['local', '-', '-', '-', 'местный', 'місцевий', 'miestny', ''],
['married', '-', '-', 'single', 'женатый, замужем', 'одружений, заміжня', 'ženatý, vydatá', 'a'],
// A2 — from the A2 word list (the words only)
['tiny', 'tinier', 'tiniest', 'huge|big', 'крошечный', 'крихітний', 'maličký', ''],
['huge', '-', '-', 'tiny|small', 'огромный', 'величезний', 'obrovský', ''],
['terrible', 'more terrible', 'most terrible', '-', 'ужасный', 'жахливий', 'hrozný', ''],
['excellent', '-', '-', '-', 'блестящий, отличный', 'блискучий, чудовий', 'vynikajúci', ''],
['wonderful', 'more wonderful', 'most wonderful', '-', 'замечательный', 'дивовижний', 'úžasný', ''],
['pretty', 'prettier', 'prettiest', 'ugly', 'хорошенький', 'гарненький', 'pekný (o dievčati, veci)', ''],
['handsome', 'more handsome|handsomer', 'most handsome|handsomest', '-', 'красивый (о мужчине)', 'вродливий (про чоловіка)', 'pekný (o mužovi)', ''],
['cute', 'cuter', 'cutest', '-', 'милый, симпатичный', 'милий, симпатичний', 'zlatý, roztomilý', ''],
['angry', 'angrier', 'angriest', '-', 'сердитый', 'сердитий', 'nahnevaný', ''],
['excited', 'more excited', 'most excited', 'bored', 'радостно взволнованный', 'радісно схвильований', 'nadšený', ''],
['bored', 'more bored', 'most bored', 'excited', 'скучающий', 'знуджений', 'znudený', ''],
['different', 'more different', 'most different', 'similar', 'разный, другой', 'різний, інший', 'rozdielny, iný', ''],
['similar', 'more similar', 'most similar', 'different', 'похожий', 'схожий', 'podobný', ''],
['real', '-', '-', 'fake', 'настоящий', 'справжній', 'skutočný, pravý', ''],
['fake', '-', '-', 'real', 'поддельный', 'підроблений', 'falošný', ''],
['tidy', 'tidier', 'tidiest', 'messy', 'аккуратный, прибранный', 'охайний, прибраний', 'upratovaný, poriadny', ''],
['messy', 'messier', 'messiest', 'tidy', 'неубранный, неряшливый', 'неприбраний, неохайний', 'neporiadny', ''],
['soft', 'softer', 'softest', 'hard', 'мягкий', 'м’який', 'mäkký', ''],
['hard', 'harder', 'hardest', 'soft|easy', 'твёрдый; трудный', 'твердий; важкий', 'tvrdý; ťažký', ''],
['smooth', 'smoother', 'smoothest', 'rough', 'гладкий', 'гладкий', 'hladký', ''],
['rough', 'rougher', 'roughest', 'smooth', 'шершавый, грубый', 'шорсткий, грубий', 'drsný', ''],
['quick', 'quicker', 'quickest', 'slow', 'быстрый', 'швидкий', 'rýchly', ''],
['lazy', 'lazier', 'laziest', 'hard-working', 'ленивый', 'лінивий', 'lenivý', ''],
['hard-working', 'more hard-working', 'most hard-working', 'lazy', 'трудолюбивый', 'працьовитий', 'pracovitý', ''],
['kind', 'kinder', 'kindest', 'unkind', 'добрый', 'добрий', 'láskavý', ''],
['honest', 'more honest', 'most honest', '-', 'честный', 'чесний', 'čestný', ''],
['brave', 'braver', 'bravest', '-', 'смелый', 'сміливий', 'statočný, odvážny', ''],
['shy', 'shyer', 'shyest', '-', 'застенчивый', 'сором’язливий', 'hanblivý', ''],
['calm', 'calmer', 'calmest', 'nervous', 'спокойный', 'спокійний', 'pokojný', ''],
['nervous', 'more nervous', 'most nervous', 'calm', 'нервничающий', 'знервований', 'nervózny', ''],
['possible', '-', '-', 'impossible', 'возможный', 'можливий', 'možný', ''],
['impossible', '-', '-', 'possible', 'невозможный', 'неможливий', 'nemožný', ''],
['public', '-', '-', 'private', 'общественный', 'громадський', 'verejný', ''],
['private', '-', '-', 'public', 'частный, личный', 'приватний, особистий', 'súkromný', ''],
['foreign', '-', '-', '-', 'иностранный', 'іноземний', 'cudzí, zahraničný', ''],
['common', 'more common|commoner', 'most common|commonest', 'rare', 'распространённый, частый', 'поширений, частий', 'bežný', ''],
['fresh', 'fresher', 'freshest', '-', 'свежий', 'свіжий', 'čerstvý', ''],
['sweet', 'sweeter', 'sweetest', '-', 'сладкий', 'солодкий', 'sladký', ''],
['salty', 'saltier', 'saltiest', '-', 'солёный', 'солоний', 'slaný', ''],
['sour', 'sourer', 'sourest', '-', 'кислый', 'кислий', 'kyslý', ''],
['thirsty', 'thirstier', 'thirstiest', '-', 'испытывающий жажду', 'спраглий', 'smädný', ''],
['ill', '-', '-', '-', 'больной', 'хворий', 'chorý', ''],
['sick', 'sicker', 'sickest', '-', 'больной', 'хворий', 'chorý', ''],
['ready', '-', '-', '-', 'готовый', 'готовий', 'pripravený', ''],
['convenient', 'more convenient', 'most convenient', '-', 'удобный (по времени, месту)', 'зручний (за часом, місцем)', 'vhodný (časom, miestom)', ''],
['exhausted', '-', '-', '-', 'измученный', 'виснажений', 'vyčerpaný', ''],
['humid', 'more humid', 'most humid', 'dry', 'влажный (о воздухе)', 'вологий (про повітря)', 'vlhký (o vzduchu)', ''],
['careful', 'more careful', 'most careful', 'careless', 'осторожный, внимательный', 'обережний, уважний', 'opatrný, pozorný', ''],
['careless', 'more careless', 'most careless', 'careful', 'небрежный, невнимательный', 'недбалий, неуважний', 'nedbalý, nepozorný', ''],
// colours (no comparison here)
['black', '-', '-', 'white', 'чёрный', 'чорний', 'čierny', 'a'],
['white', '-', '-', 'black', 'белый', 'білий', 'biely', 'a'],
['red', '-', '-', '-', 'красный', 'червоний', 'červený', 'a'],
['green', '-', '-', '-', 'зелёный', 'зелений', 'zelený', 'a'],
['blue', '-', '-', '-', 'синий, голубой', 'синій, блакитний', 'modrý', 'a'],
['yellow', '-', '-', '-', 'жёлтый', 'жовтий', 'žltý', 'a'],
['orange', '-', '-', '-', 'оранжевый', 'помаранчевий', 'oranžový', 'a'],
['grey', '-', '-', '-', 'серый', 'сірий', 'sivý', 'a'],
['brown', '-', '-', '-', 'коричневый', 'коричневий', 'hnedý', 'a'],
['pink', '-', '-', '-', 'розовый', 'рожевий', 'ružový', 'a'],
['purple', '-', '-', '-', 'фиолетовый', 'фіолетовий', 'fialový', 'a'],
];

const split = s => (s === '-' ? [] : s.split('|'));
export const ADJ = RAW.map(([a, comp, sup, opp, ru, uk, sk, fl]) => ({
  a, comp: split(comp), sup: split(sup), opp: split(opp), t: { ru, uk, sk }, a1: fl.includes('a'),
}));

/** Adverbs (A2): how something is done — slow → slowly. Written out: -y → -ily (easy — easily), the irregular good — well,
 *  and the ones that do not change (fast, hard, early, late). Only adjectives whose adverb is usual at A2. */
export const ADV = {
  quick: 'quickly', slow: 'slowly', loud: 'loudly', quiet: 'quietly', careful: 'carefully', careless: 'carelessly',
  bad: 'badly', beautiful: 'beautifully', polite: 'politely', rude: 'rudely', dangerous: 'dangerously', safe: 'safely',
  serious: 'seriously', nervous: 'nervously', calm: 'calmly', honest: 'honestly', brave: 'bravely', kind: 'kindly',
  comfortable: 'comfortably', terrible: 'terribly', wonderful: 'wonderfully', different: 'differently', strong: 'strongly',
  sad: 'sadly', real: 'really', easy: 'easily', happy: 'happily', angry: 'angrily', lucky: 'luckily', heavy: 'heavily',
  noisy: 'noisily', good: 'well', fast: 'fast', hard: 'hard', early: 'early', late: 'late',
};
/** Adverbs a learner might write: -ly on anything (goodly, fastly), -y kept (easyly), one l too few or too many
 *  (carefuly, slowlly), the adjective itself, and the traps hardly and lately (they mean something else). */
export function advWrong(A) {
  const a = A.a, right = ADV[a];
  const made = [a + 'ly', a.replace(/y$/, 'yly'), a.replace(/le$/, 'ly'), a.replace(/e$/, 'ly'), a + 'lly', a.replace(/l$/, 'ly'), a + 'ely', a];
  return [...new Set(made)].filter(f => f !== right);
}

// a consonant that could be doubled by mistake (cheap — cheapper), not after a double one (small)
const dbl = (b, end) => (/[bcdfgklmnprstvz]$/.test(b) && !/(.)\1$/.test(b) ? b + b.slice(-1) + end : null);
const stem = b => b.replace(/e$/, '');

/** Comparatives a learner might write: -er on anything (gooder, expensiver, happyer), no doubling (biger) or doubling
 *  where there is none (cheapper), more + -er (more bigger, more expensiver), more + a short word (more big),
 *  the superlative in the place of the comparative (biggest … than). */
export function compWrong(A) {
  const b = A.a, long = A.comp[0].startsWith('more ');
  const out = [stem(b) + 'er', dbl(b, 'er'), long ? 'more ' + stem(b) + 'er' : 'more ' + A.comp[0], long ? null : 'more ' + b, A.sup[0]];
  return [...new Set(out)].filter(f => f && !A.comp.includes(f));
}
/** Superlatives a learner might write (without "the"): the same mistakes with -est and most, or the comparative. */
export function supWrong(A) {
  const b = A.a, long = A.sup[0].startsWith('most ');
  const out = [stem(b) + 'est', dbl(b, 'est'), long ? 'most ' + stem(b) + 'est' : 'most ' + A.sup[0], long ? null : 'most ' + b, A.comp[0]];
  return [...new Set(out)].filter(f => f && !A.sup.includes(f));
}
