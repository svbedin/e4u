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
['married', '-', '-', 'single', 'женатый, замужем', 'одружений, заміжня', 'ženatý, vydatá', 'a'],
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
