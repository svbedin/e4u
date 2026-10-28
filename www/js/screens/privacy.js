/*!
 * E4U — privacy notice for testers (Settings → Privacy), in every interface language
 * Copyright (c) 2026 Serg. All rights reserved.
 *
 * Keep it in step with what the server really stores (worker/index.js, ARCHITECTURE.md).
 * **bold** marks the start of a paragraph; tools/check.mjs checks that all four languages have the same paragraphs.
 */
import { T, getLang } from '../core/i18n.js';
import { register } from '../core/router.js';
import { backBar } from '../core/ui.js';
import { esc } from '../core/util.js';

export const PRIVACY = {
  ru: [
    'E4U — частный проект автора (Serg) на этапе тестирования. Здесь коротко о том, какие данные о вас хранятся и зачем.',
    '**Что хранится:** ваш e-mail; язык писем; даты приглашения и удаления; когда вы последний раз входили по коду и открывали приложение. Если вы пишете через «Сообщить об ошибке» или «Написать автору», автору на почту приходят ваш текст, текущее задание, версия приложения и тип устройства.',
    '**Что не хранится на сервере:** ваш прогресс в игре (очки, рекорды, ошибки). Он остаётся только на вашем устройстве — кроме итогов раундов, если вы участвуете в турнире, и общей статистики заданий: после раунда на сервер уходит, какие задания решены верно, а какие с ошибкой, и какой ответ был выбран. Без почты и имени — общими счётчиками для всех тестеров; по ним автор находит трудные места и ошибки в заданиях.',
    '**Сбои:** если в приложении случается ошибка, на сервер анонимно уходит её техническое описание: текст ошибки, файл и строка программы, экран, версия E4U и тип устройства (Android, iPhone или компьютер). Без почты и имени — общими счётчиками, чтобы автор находил и исправлял ошибки. Файл прогресса («Настройки → Прогресс») вы сохраняете сами, на сервер он не уходит.',
    '**Турнир:** участие добровольное. Если вы задали имя в турнире, другие тестеры видят это имя и ваши результаты: очки за неделю, число раундов, точность и рекорды Блица. Почта не показывается. «Выйти из турнира» удаляет имя и все результаты.',
    '**Напоминания:** включаются по желанию в настройках. Тогда сервер хранит технический адрес уведомлений вашего устройства (его выдаёт Google, Apple, Mozilla или Microsoft — через их службу напоминание и приходит), выбранное время, часовой пояс, дату последней тренировки дня и время, когда закончится текущий вход по коду (чтобы предупредить накануне). Без почты и имени. Текст напоминания телефон показывает сам; если выключить напоминание, эти данные удаляются.',
    '**Зачем:** чтобы пускать в приложение только приглашённых, сообщать о доступе по почте и отвечать на ваши сообщения. Никакой рекламы; данные не продаются и не передаются никому, кроме сервисов ниже.',
    '**Где:** Cloudflare (вход по коду, сайт, хранение данных), Resend (отправка писем, сервер в ЕС), почта автора (ваши сообщения).',
    '**Как долго:** пока идёт тестирование. Чтобы узнать, что о вас хранится, или удалить всё полностью, напишите автору через «Написать автору» или ответьте на любое письмо от E4U.',
  ],
  en: [
    'E4U is a private project by its author (Serg), currently in testing. Here is, in short, what data about you is kept and why.',
    '**What is kept:** your e-mail address; the language of your e-mails; when you were invited and removed; when you last signed in with a code and last opened the app. If you write via “Report a problem” or “Write to the author”, the author receives your text, the current task, the app version and the device type by e-mail.',
    '**What is not kept on the server:** your game progress (points, records, mistakes). It stays on your device only — except round results if you take part in the tournament, and the shared task statistics: after a round the server receives which tasks were answered right or wrong and which answer was chosen. No e-mail or name — shared counters for all testers; the author uses them to find hard places and mistakes in the tasks.',
    '**Crashes:** if an error happens in the app, a technical description of it is sent to the server anonymously: the error text, the file and line of the program, the screen, the E4U version and the kind of device (Android, iPhone or computer). No e-mail and no name — shared counters, so the author can find and fix errors. The progress file (Settings → Progress) is saved by you and is not sent to the server.',
    '**Tournament:** taking part is voluntary. If you set a tournament name, other testers see that name and your results: points this week, number of rounds, accuracy and Blitz records. Your e-mail is never shown. “Leave the tournament” deletes your name and all results.',
    '**Reminders:** optional, switched on in the settings. Then the server keeps your device’s technical notification address (issued by Google, Apple, Mozilla or Microsoft, whose service delivers the reminder), the time you chose, your time zone, the date of your last daily training and when your current sign-in with a code ends (to warn you the day before). No e-mail or name. The phone shows the reminder text itself; switching the reminder off deletes this data.',
    '**Why:** to let in invited people only, to tell you about your access by e-mail and to answer your messages. No advertising; the data is not sold or shared with anyone except the services below.',
    '**Where:** Cloudflare (sign-in with a code, the website, data storage), Resend (sending e-mails, server in the EU), the author’s mailbox (your messages).',
    '**How long:** while testing lasts. To find out what is kept about you, or to have it all deleted, write to the author via “Write to the author” or reply to any e-mail from E4U.',
  ],
  uk: [
    'E4U — приватний проєкт автора (Serg) на етапі тестування. Тут коротко про те, які дані про вас зберігаються і навіщо.',
    '**Що зберігається:** ваша e-mail-адреса; мова листів; дати запрошення та видалення; коли ви востаннє входили за кодом і відкривали застосунок. Якщо ви пишете через «Повідомити про помилку» або «Написати авторові», авторові на пошту надходять ваш текст, поточне завдання, версія застосунку й тип пристрою.',
    '**Що не зберігається на сервері:** ваш прогрес у грі (бали, рекорди, помилки). Він залишається лише на вашому пристрої — крім підсумків раундів, якщо ви берете участь у турнірі, і спільної статистики завдань: після раунду на сервер надходить, які завдання виконано правильно, а які з помилкою, і яку відповідь обрано. Без пошти та імені — спільними лічильниками для всіх тестувальників; за ними автор знаходить складні місця й помилки в завданнях.',
    '**Збої:** якщо в застосунку стається помилка, на сервер анонімно надходить її технічний опис: текст помилки, файл і рядок програми, екран, версія E4U і тип пристрою (Android, iPhone або комп’ютер). Без пошти та імені — спільними лічильниками, щоб автор знаходив і виправляв помилки. Файл прогресу («Налаштування → Прогрес») ви зберігаєте самі, на сервер він не надходить.',
    '**Турнір:** участь добровільна. Якщо ви задали ім’я в турнірі, інші тестувальники бачать це ім’я та ваші результати: бали за тиждень, кількість раундів, точність і рекорди Бліцу. Пошта не показується. «Вийти з турніру» видаляє ім’я та всі результати.',
    '**Нагадування:** вмикаються за бажанням у налаштуваннях. Тоді сервер зберігає технічну адресу сповіщень вашого пристрою (її видає Google, Apple, Mozilla або Microsoft — через їхню службу нагадування й надходить), обраний час, часовий пояс, дату останнього тренування дня і час, коли закінчиться поточний вхід за кодом (щоб попередити напередодні). Без пошти та імені. Текст нагадування телефон показує сам; якщо вимкнути нагадування, ці дані видаляються.',
    '**Навіщо:** щоб пускати в застосунок лише запрошених, повідомляти про доступ поштою й відповідати на ваші повідомлення. Жодної реклами; дані не продаються й не передаються нікому, крім сервісів нижче.',
    '**Де:** Cloudflare (вхід за кодом, сайт, зберігання даних), Resend (надсилання листів, сервер у ЄС), пошта автора (ваші повідомлення).',
    '**Як довго:** поки триває тестування. Щоб дізнатися, що про вас зберігається, або видалити все повністю, напишіть авторові через «Написати авторові» або дайте відповідь на будь-який лист від E4U.',
  ],
  es: [
    'E4U es un proyecto privado de su autor (Serg) en fase de pruebas. Aquí tienes, en breve, qué datos sobre ti se guardan y para qué.',
    '**Qué se guarda:** tu dirección de correo; el idioma de tus correos; cuándo fuiste invitado y dado de baja; cuándo entraste por última vez con un código y abriste la aplicación. Si escribes mediante «Informar de un error» o «Escribir al autor», el autor recibe por correo tu texto, la tarea actual, la versión de la aplicación y el tipo de dispositivo.',
    '**Qué no se guarda en el servidor:** tu progreso en el juego (puntos, récords, errores). Se queda solo en tu dispositivo, salvo los resultados de las rondas si participas en el torneo y las estadísticas comunes de las tareas: tras una ronda el servidor recibe qué tareas se respondieron bien o mal y qué respuesta se eligió. Sin correo ni nombre: contadores comunes para todos los testers; con ellos el autor encuentra los puntos difíciles y los errores en las tareas.',
    '**Fallos:** si se produce un error en la aplicación, se envía al servidor de forma anónima una descripción técnica: el texto del error, el archivo y la línea del programa, la pantalla, la versión de E4U y el tipo de dispositivo (Android, iPhone u ordenador). Sin correo ni nombre — contadores comunes, para que el autor encuentre y corrija errores. El archivo de progreso (Ajustes → Progreso) lo guardas tú y no se envía al servidor.',
    '**Torneo:** participar es voluntario. Si eliges un nombre en el torneo, los demás probadores ven ese nombre y tus resultados: puntos de la semana, número de rondas, precisión y récords de Relámpago. Tu correo no se muestra. «Salir del torneo» borra el nombre y todos los resultados.',
    '**Recordatorios:** opcionales, se activan en los ajustes. Entonces el servidor guarda la dirección técnica de notificaciones de tu dispositivo (la da Google, Apple, Mozilla o Microsoft, cuyo servicio entrega el recordatorio), la hora elegida, tu zona horaria, la fecha de tu último entrenamiento del día y cuándo termina tu acceso actual con código (para avisarte el día antes). Sin correo ni nombre. El teléfono muestra el texto del recordatorio por sí mismo; al desactivar el recordatorio, estos datos se borran.',
    '**Para qué:** para dejar entrar solo a las personas invitadas, informarte del acceso por correo y responder a tus mensajes. Sin publicidad; los datos no se venden ni se ceden a nadie, salvo a los servicios indicados abajo.',
    '**Dónde:** Cloudflare (acceso con código, sitio web, almacenamiento de datos), Resend (envío de correos, servidor en la UE), el correo del autor (tus mensajes).',
    '**Cuánto tiempo:** mientras duren las pruebas. Para saber qué se guarda sobre ti o para borrarlo todo, escribe al autor mediante «Escribir al autor» o responde a cualquier correo de E4U.',
  ],
  sk: [
    'E4U je súkromný projekt autora (Serg) vo fáze testovania. Tu je stručne, aké údaje o vás uchovávame a prečo.',
    '**Čo sa uchováva:** vaša e-mailová adresa; jazyk e-mailov; dátumy pozvania a odobratia; kedy ste sa naposledy prihlásili kódom a otvorili aplikáciu. Ak píšete cez „Nahlásiť chybu“ alebo „Napísať autorovi“, autorovi príde e-mailom váš text, aktuálna úloha, verzia aplikácie a typ zariadenia.',
    '**Čo sa na serveri neuchováva:** váš pokrok v hre (body, rekordy, chyby). Zostáva iba vo vašom zariadení — okrem výsledkov kôl, ak sa zapojíte do turnaja, a spoločnej štatistiky úloh: po kole server dostane, ktoré úlohy boli vyriešené správne a ktoré s chybou a akú odpoveď ste zvolili. Bez e-mailu a mena — spoločnými počítadlami pre všetkých testerov; autor podľa nich nachádza ťažké miesta a chyby v úlohách.',
    '**Chyby aplikácie:** ak v aplikácii nastane chyba, na server sa anonymne odošle jej technický opis: text chyby, súbor a riadok programu, obrazovka, verzia E4U a typ zariadenia (Android, iPhone alebo počítač). Bez e-mailu a mena — spoločné počítadlá, aby autor chyby našiel a opravil. Súbor s pokrokom (Nastavenia → Pokrok) si ukladáte sami, na server sa neodosiela.',
    '**Turnaj:** účasť je dobrovoľná. Ak si zvolíte meno v turnaji, ostatní testeri uvidia toto meno a vaše výsledky: body za týždeň, počet kôl, presnosť a rekordy Blesku. E-mail sa nezobrazuje. „Odísť z turnaja“ vymaže meno aj všetky výsledky.',
    '**Pripomienky:** zapínajú sa podľa želania v nastaveniach. Vtedy server uchováva technickú adresu oznámení vášho zariadenia (vydáva ju Google, Apple, Mozilla alebo Microsoft — cez ich službu pripomienka príde), zvolený čas, časové pásmo, dátum posledného tréningu dňa a čas, keď sa skončí aktuálne prihlásenie kódom (aby sme vás deň vopred upozornili). Bez e-mailu a mena. Text pripomienky zobrazí telefón sám; ak pripomienku vypnete, tieto údaje sa vymažú.',
    '**Prečo:** aby do aplikácie mali prístup len pozvaní, aby sme vás e-mailom informovali o prístupe a mohli odpovedať na vaše správy. Žiadna reklama; údaje nepredávame ani neposkytujeme nikomu okrem služieb uvedených nižšie.',
    '**Kde:** Cloudflare (prihlásenie kódom, stránka, ukladanie údajov), Resend (odosielanie e-mailov, server v EÚ), e-mail autora (vaše správy).',
    '**Ako dlho:** počas testovania. Ak chcete vedieť, čo o vás uchovávame, alebo chcete všetko vymazať, napíšte autorovi cez „Napísať autorovi“ alebo odpovedzte na ktorýkoľvek e-mail od E4U.',
  ],
};

const para = s => `<p>${esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')}</p>`;

register('privacy', () => `<div class="screen">
  ${backBar('settings')}
  <h1 class="long">${T('privacy')}</h1>
  <div class="prose">${(PRIVACY[getLang()] || PRIVACY.en).map(para).join('')}</div>
</div>`);
