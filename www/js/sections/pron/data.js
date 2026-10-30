/*!
 * E4U — pronouns: data (the table of forms and sentences written for E4U)
 * Copyright (c) 2026 Serg. All rights reserved.
 *
 * FORMS: one row per person — [subject, object, possessive + noun, possessive alone, reflexive]; '-' = no such form
 * (it has no "its" standing alone here). SENTENCES: [stage, English sentence with one gap, ru, uk, sk];
 * the gap is {answer|hint|wrong,wrong} — the hint is the subject pronoun of the person meant; stage 'sent' is A1,
 * 'refl' (myself, herself) is A2.
 */
export const COLS = ['subj', 'obj', 'poss', 'pron', 'refl'];
export const FORMS = [
  ['I', 'me', 'my', 'mine', 'myself'],
  ['you', 'you', 'your', 'yours', 'yourself'],
  ['he', 'him', 'his', 'his', 'himself'],
  ['she', 'her', 'her', 'hers', 'herself'],
  ['it', 'it', 'its', '-', 'itself'],
  ['we', 'us', 'our', 'ours', 'ourselves'],
  ['they', 'them', 'their', 'theirs', 'themselves'],
].map(r => Object.fromEntries(COLS.map((c, i) => [c, r[i] === '-' ? null : r[i]])));

export const SENTENCES = [
['sent', 'Can you help {me|I|my,mine}?', 'Можешь мне помочь?', 'Можеш мені допомогти?', 'Môžeš mi pomôcť?'],
['sent', 'I love {her|she|hers,she’s} very much.', 'Я её очень люблю.', 'Я її дуже кохаю.', 'Veľmi ju ľúbim.'],
['sent', 'This is {my|I|me,mine} sister.', 'Это моя сестра.', 'Це моя сестра.', 'To je moja sestra.'],
['sent', 'This bag is {mine|I|my,me}.', 'Эта сумка моя.', 'Ця сумка моя.', 'Táto taška je moja.'],
['sent', '{He|he|Him,His} lives in London.', 'Он живёт в Лондоне.', 'Він живе в Лондоні.', 'Býva v Londýne.'],
['sent', 'I don’t know {him|he|his,he’s}.', 'Я его не знаю.', 'Я його не знаю.', 'Nepoznám ho.'],
['sent', 'Is this {your|you|yours,you’re} phone?', 'Это твой телефон?', 'Це твій телефон?', 'Je to tvoj telefón?'],
['sent', 'Is this phone {yours|you|your,you’re}?', 'Этот телефон твой?', 'Цей телефон твій?', 'Je tento telefón tvoj?'],
['sent', 'We visit {them|they|their,theirs} every summer.', 'Мы навещаем их каждое лето.', 'Ми відвідуємо їх щоліта.', 'Každé leto ich navštevujeme.'],
['sent', '{Their|they|They,There} house is very big.', 'Их дом очень большой.', 'Їхній будинок дуже великий.', 'Ich dom je veľmi veľký.'],
['sent', 'The house is {theirs|they|their,them}.', 'Этот дом их.', 'Цей будинок їхній.', 'Ten dom je ich.'],
['sent', 'Come with {us|we|our,ours}!', 'Пойдём с нами!', 'Ходімо з нами!', 'Poď s nami!'],
['sent', '{Our|we|Us,Ours} teacher is from Scotland.', 'Наш учитель из Шотландии.', 'Наш учитель із Шотландії.', 'Náš učiteľ je zo Škótska.'],
['sent', 'The red car is {ours|we|our,us}.', 'Красная машина наша.', 'Червона машина наша.', 'To červené auto je naše.'],
['sent', 'Tom and {I|I|me,my} are friends.', 'Мы с Томом друзья.', 'Ми з Томом друзі.', 'S Tomom sme kamaráti.'],
['sent', 'She gave {him|he|his,himself} a book.', 'Она дала ему книгу.', 'Вона дала йому книжку.', 'Dala mu knihu.'],
['sent', 'The dog likes {its|it|it’s,its’} bed.', 'Собака любит свою лежанку.', 'Собака любить свою лежанку.', 'Pes má rád svoj pelech.'],
['sent', 'Where is my umbrella? I can’t find {it|it|its,them}.', 'Где мой зонт? Не могу его найти.', 'Де моя парасолька? Не можу її знайти.', 'Kde je môj dáždnik? Neviem ho nájsť.'],
['sent', 'Anna is my friend. I often call {her|she|hers,herself}.', 'Анна моя подруга. Я часто ей звоню.', 'Анна — моя подруга. Я часто їй телефоную.', 'Anna je moja kamarátka. Často jej volám.'],
['sent', 'Is that pen {his|he|him,he’s}?', 'Та ручка его?', 'Та ручка його?', 'Je tamto pero jeho?'],
['sent', 'Peter and {his|he|him,her} wife live here.', 'Питер и его жена живут здесь.', 'Пітер і його дружина живуть тут.', 'Peter a jeho manželka tu bývajú.'],
['sent', 'Mary and {her|she|his,hers} husband are doctors.', 'Мэри и её муж врачи.', 'Мері та її чоловік лікарі.', 'Mary a jej manžel sú lekári.'],
['sent', 'Listen to {me|I|my,mine}, please.', 'Послушай меня, пожалуйста.', 'Послухай мене, будь ласка.', 'Počúvaj ma, prosím.'],
['sent', 'They like {us|we|our,ours} very much.', 'Мы им очень нравимся.', 'Ми їм дуже подобаємося.', 'Veľmi sa im páčime.'],
['sent', 'Excuse me, is this seat {yours|you|your,you’re}?', 'Извините, это место ваше?', 'Перепрошую, це місце ваше?', 'Prepáčte, je toto miesto vaše?'],
['sent', 'I’m not hungry, but {they|they|them,their} are.', 'Я не голоден, а они голодны.', 'Я не голодний, а вони голодні.', 'Ja nie som hladný, ale oni áno.'],
['sent', '{We|we|Us,Our} live in a small flat.', 'Мы живём в маленькой квартире.', 'Ми живемо в маленькій квартирі.', 'Bývame v malom byte.'],
['sent', 'Please tell {them|they|their,theirs} about it.', 'Расскажи им об этом, пожалуйста.', 'Розкажи їм про це, будь ласка.', 'Povedz im o tom, prosím.'],
['sent', 'My sister has got a cat. {Its|it|It’s,Her} name is Lucy.', 'У моей сестры есть кошка. Её зовут Люси.', 'У моєї сестри є кішка. Її звати Люсі.', 'Moja sestra má mačku. Volá sa Lucy.'],
['sent', 'Ben is my brother. {He|he|Him,His} is a doctor.', 'Бен — мой брат. Он врач.', 'Бен — мій брат. Він лікар.', 'Ben je môj brat. Je lekár.'],
// A2 — myself, herself: "сам, себя"
['refl', 'I cut {myself|I|me,my} with a knife.', 'Я порезался ножом.', 'Я порізався ножем.', 'Porezal som sa nožom.'],
['refl', 'She looked at {herself|she|her,hers} in the mirror.', 'Она посмотрела на себя в зеркало.', 'Вона подивилася на себе в дзеркало.', 'Pozrela sa na seba do zrkadla.'],
['refl', 'We enjoyed {ourselves|we|us,ourself} at the party.', 'Мы хорошо повеселились на вечеринке.', 'Ми добре розважилися на вечірці.', 'Na oslave sme sa dobre zabavili.'],
['refl', 'Did you make it {yourself|you|your,yours}?', 'Ты сделал это сам?', 'Ти зробив це сам?', 'Urobil si to sám?'],
['refl', 'He lives by {himself|he|him,hisself}.', 'Он живёт один.', 'Він живе сам.', 'Býva sám.'],
['refl', 'The children can dress {themselves|they|them,theirselves}.', 'Дети умеют одеваться сами.', 'Діти вміють одягатися самі.', 'Deti sa vedia samy obliecť.'],
];
