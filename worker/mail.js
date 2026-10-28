/*!
 * E4U — e-mails to testers: invitation, welcome back, access ended, one-off notices (en, ru, sk, es, uk)
 * Copyright (c) 2026 Serg. All rights reserved.
 *
 * Sent through Resend (https://resend.com). Needs the secret RESEND_API_KEY and the var MAIL_FROM;
 * without them nothing is sent and the admin screen says so.
 */
const T = {
  invite: {
    // the install steps are in the e-mail itself (no attachment): same as INSTALL.md, in the e-mail's language
    ru: { subject: 'Приглашение в E4U',
      lines: ['Здравствуйте!', 'Вас пригласили тестировать E4U — игровой тренажёр английского языка.', '{link}', 'Как начать:',
        '1. Откройте ссылку выше: на iPhone — в Safari, на Android — в Chrome.',
        '2. Введите этот e-mail ({email}) и нажмите «Send me a code», затем введите код из письма (если письма нет — проверьте «Спам»).',
        '3. Установите приложение. iPhone: «Поделиться» → «На экран „Домой“» → «Добавить». Android: кнопка «Установить приложение» на главной странице E4U или меню ⋮ → «Установить приложение» (не просто ярлык).',
        '4. Открывайте E4U значком на главном экране. В первый раз ещё раз введите e-mail и код; дальше код спрашивается раз в 7 дней.',
        'Приятной игры!'] },
    en: { subject: 'You’re invited to test E4U',
      lines: ['Hello!', 'You’ve been invited to test E4U, a game for learning English.', '{link}', 'How to start:',
        '1. Open the link above: in Safari on iPhone, in Chrome on Android.',
        '2. Enter this e-mail ({email}), tap “Send me a code”, then enter the code from the e-mail (no e-mail? check your Spam folder).',
        '3. Install the app. iPhone: Share → Add to Home Screen → Add. Android: the “Install the app” button on the E4U home page, or menu ⋮ → Install app (not just a shortcut).',
        '4. Open E4U from its icon on the home screen. The first time, enter your e-mail and code once more; after that the code is asked once every 7 days.',
        'Have fun!'] },
    uk: { subject: 'Запрошення до тестування E4U',
      lines: ['Вітаємо!', 'Вас запрошено тестувати E4U — ігровий тренажер англійської мови.', '{link}', 'Як почати:',
        '1. Відкрийте посилання вище: на iPhone — у Safari, на Android — у Chrome.',
        '2. Введіть цю e-mail-адресу ({email}) й натисніть «Send me a code», потім введіть код із листа (якщо листа немає — перевірте «Спам»).',
        '3. Встановіть застосунок. iPhone: «Поділитися» → «На початковий екран» → «Додати». Android: кнопка «Встановити застосунок» на головній сторінці E4U або меню ⋮ → «Установити додаток» (не просто ярлик).',
        '4. Відкривайте E4U значком на головному екрані. Першого разу ще раз введіть e-mail і код; далі код запитується раз на 7 днів.',
        'Приємної гри!'] },
    sk: { subject: 'Pozvánka na testovanie aplikácie E4U',
      lines: ['Dobrý deň,', 'pozývame vás testovať E4U — hravý tréner angličtiny.', '{link}', 'Ako začať:',
        '1. Otvorte odkaz vyššie: na iPhone v Safari, na Androide v Chrome.',
        '2. Zadajte tento e-mail ({email}), ťuknite na „Send me a code“ a potom zadajte kód z e-mailu (ak e-mail neprišiel, pozrite si priečinok Spam).',
        '3. Nainštalujte aplikáciu. iPhone: Zdieľať → Pridať na plochu → Pridať. Android: tlačidlo „Nainštalovať aplikáciu“ na úvodnej stránke E4U alebo ponuka ⋮ → Inštalovať aplikáciu (nie iba odkaz).',
        '4. Otvárajte E4U ikonou na ploche. Prvýkrát zadajte e-mail a kód ešte raz; potom si aplikácia kód vypýta raz za 7 dní.',
        'Príjemnú hru!'] },
    es: { subject: 'Invitación para probar E4U',
      lines: ['¡Hola!', 'Te han invitado a probar E4U, un juego para aprender eslovaco.', '{link}', 'Cómo empezar:',
        '1. Abre el enlace de arriba: en iPhone con Safari, en Android con Chrome.',
        '2. Escribe este correo ({email}), pulsa «Send me a code» y luego introduce el código del correo (¿no te ha llegado? revisa la carpeta de spam).',
        '3. Instala la aplicación. iPhone: Compartir → Añadir a pantalla de inicio → Añadir. Android: botón «Instalar la aplicación» en la página principal de E4U, o menú ⋮ → Instalar aplicación (no solo un acceso directo).',
        '4. Abre E4U con su icono en la pantalla de inicio. La primera vez, vuelve a escribir tu correo y el código; después el código se pide una vez cada 7 días.',
        '¡Que lo disfrutes!'] },
  },
  back: {
    ru: { subject: 'С возвращением в E4U!',
      lines: ['Здравствуйте!', 'Ваш доступ к E4U снова открыт.', '{link}',
        'Войдите с этим e-mail ({email}) — на почту придёт код.', 'Рады снова вас видеть!'] },
    en: { subject: 'Welcome back to E4U!',
      lines: ['Hello!', 'Your access to E4U is open again.', '{link}',
        'Sign in with this e-mail ({email}) and a code will be sent to you.', 'Good to have you back!'] },
    uk: { subject: 'З поверненням до E4U!',
      lines: ['Вітаємо!', 'Ваш доступ до E4U знову відкрито.', '{link}',
        'Увійдіть із цією e-mail-адресою ({email}) — на пошту надійде код.', 'Раді знову вас бачити!'] },
    sk: { subject: 'Vitajte späť v aplikácii E4U!',
      lines: ['Dobrý deň,', 'váš prístup do aplikácie E4U je opäť otvorený.', '{link}',
        'Prihláste sa s týmto e-mailom ({email}) — príde vám kód.', 'Tešíme sa, že ste späť!'] },
    es: { subject: '¡Bienvenido/a de nuevo a E4U!',
      lines: ['¡Hola!', 'Tu acceso a E4U vuelve a estar abierto.', '{link}',
        'Entra con este correo ({email}) y te llegará un código.', '¡Qué bien tenerte de vuelta!'] },
  },
  // a one-off notice (NOTICES): Android made only a shortcut while the manifest was behind Cloudflare Access (till 27.10.2026)
  android: {
    ru: { subject: 'E4U на Android: установите приложение заново',
      lines: ['Здравствуйте!', 'Мы исправили установку E4U на Android. Если у значка E4U на вашем телефоне в углу маленький значок Chrome — это ярлык, а не приложение. Пожалуйста, переустановите:',
        '1. Удалите значок E4U с экрана.', '2. Откройте эту ссылку в Chrome:', '{link}',
        '3. Меню ⋮ → «Установить приложение» (или «Добавить на главный экран» → «Установить»).',
        'Прогресс сохранится. Если у вас iPhone, ничего делать не нужно.', 'Спасибо, что тестируете E4U!'] },
    en: { subject: 'E4U on Android: please reinstall the app',
      lines: ['Hello!', 'We have fixed installing E4U on Android. If the E4U icon on your phone has a small Chrome badge in the corner, it is a shortcut, not the app. Please reinstall it:',
        '1. Remove the E4U icon from your home screen.', '2. Open this link in Chrome:', '{link}',
        '3. Menu ⋮ → Install app (or Add to Home screen → Install).',
        'Your progress stays. If you have an iPhone, there is nothing to do.', 'Thank you for testing E4U!'] },
    uk: { subject: 'E4U на Android: встановіть застосунок заново',
      lines: ['Вітаємо!', 'Ми виправили встановлення E4U на Android. Якщо на значку E4U у вашому телефоні в куті є маленький значок Chrome — це ярлик, а не застосунок. Будь ласка, перевстановіть:',
        '1. Видаліть значок E4U з екрана.', '2. Відкрийте це посилання в Chrome:', '{link}',
        '3. Меню ⋮ → «Установити додаток» (або «Додати на головний екран» → «Установити»).',
        'Прогрес збережеться. Якщо у вас iPhone, нічого робити не потрібно.', 'Дякуємо, що тестуєте E4U!'] },
    sk: { subject: 'E4U na Androide: nainštalujte aplikáciu znova',
      lines: ['Dobrý deň,', 'opravili sme inštaláciu aplikácie E4U na Androide. Ak má ikona E4U vo vašom telefóne v rohu malú ikonu Chrome, je to odkaz, nie aplikácia. Prosím, nainštalujte ju znova:',
        '1. Odstráňte ikonu E4U z plochy.', '2. Otvorte tento odkaz v Chrome:', '{link}',
        '3. Ponuka ⋮ → Inštalovať aplikáciu (alebo Pridať na plochu → Inštalovať).',
        'Váš postup zostane zachovaný. Ak máte iPhone, nemusíte nič robiť.', 'Ďakujeme, že testujete E4U!'] },
    es: { subject: 'E4U en Android: vuelve a instalar la aplicación',
      lines: ['¡Hola!', 'Hemos arreglado la instalación de E4U en Android. Si el icono de E4U en tu teléfono tiene un pequeño icono de Chrome en la esquina, es un acceso directo, no la aplicación. Por favor, reinstálala:',
        '1. Quita el icono de E4U de la pantalla de inicio.', '2. Abre este enlace en Chrome:', '{link}',
        '3. Menú ⋮ → Instalar aplicación (o Añadir a pantalla de inicio → Instalar).',
        'Tu progreso se conserva. Si tienes un iPhone, no tienes que hacer nada.', '¡Gracias por probar E4U!'] },
  },
  removed: {
    ru: { subject: 'Доступ к E4U закрыт',
      lines: ['Здравствуйте!', 'Ваш доступ к тестированию E4U закрыт. Спасибо за участие!',
        'Если это ошибка, просто ответьте на это письмо.'] },
    en: { subject: 'Your access to E4U has ended',
      lines: ['Hello!', 'Your access to test E4U has ended. Thank you for taking part!',
        'If this is a mistake, just reply to this e-mail.'] },
    uk: { subject: 'Доступ до E4U закрито',
      lines: ['Вітаємо!', 'Ваш доступ до тестування E4U закрито. Дякуємо за участь!',
        'Якщо це помилка, просто дайте відповідь на цей лист.'] },
    sk: { subject: 'Prístup do aplikácie E4U bol ukončený',
      lines: ['Dobrý deň,', 'váš prístup k testovaniu aplikácie E4U bol ukončený. Ďakujeme za účasť!',
        'Ak ide o omyl, jednoducho odpovedzte na tento e-mail.'] },
    es: { subject: 'Tu acceso a E4U ha terminado',
      lines: ['¡Hola!', 'Tu acceso para probar E4U ha terminado. ¡Gracias por participar!',
        'Si es un error, simplemente responde a este correo.'] },
  },
};
const SIGN = { ru: 'Serg, автор E4U', en: 'Serg, author of E4U', uk: 'Serg, автор E4U', sk: 'Serg, autor aplikácie E4U', es: 'Serg, autor de E4U' };
// GDPR: where the privacy notice is (invitation, welcome back) and how to have the data deleted (removal)
const PRIVACY_LINE = {
  ru: 'Какие данные о вас хранятся — в приложении: Настройки → Конфиденциальность.',
  en: 'What data is kept about you: in the app, Settings → Privacy.',
  uk: 'Які дані про вас зберігаються — у застосунку: Налаштування → Конфіденційність.',
  sk: 'Aké údaje o vás uchovávame — v aplikácii: Nastavenia → Ochrana súkromia.',
  es: 'Qué datos se guardan sobre ti: en la aplicación, Ajustes → Privacidad.',
};
const ERASE_LINE = {
  ru: 'Если хотите, чтобы мы полностью удалили ваши данные, тоже просто ответьте на это письмо.',
  en: 'If you want your data deleted completely, just reply to this e-mail as well.',
  uk: 'Якщо хочете, щоб ми повністю видалили ваші дані, теж просто дайте відповідь на цей лист.',
  sk: 'Ak chcete, aby sme vaše údaje úplne vymazali, aj vtedy jednoducho odpovedzte na tento e-mail.',
  es: 'Si quieres que borremos por completo tus datos, responde también a este correo.',
};
export const MAIL_LANGS = Object.keys(SIGN);
/** One-off letters the owner can send to every tester (POST /api/testers/notice). */
export const NOTICES = ['android'];

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Build one e-mail. kind: 'invite' | 'back' | 'removed' | a notice ('android'). */
export function compose(kind, lang, email, appUrl) {
  const L = SIGN[lang] ? lang : 'en';
  const t = T[kind][L], sign = SIGN[L];
  const lines = kind === 'removed' ? [...t.lines, ERASE_LINE[L]] : [...t.lines.slice(0, -1), PRIVACY_LINE[L], t.lines.at(-1)];
  const fill = s => s.replace('{email}', email);
  const text = [...lines.map(l => l === '{link}' ? appUrl : fill(l)), '', sign].join('\n\n');
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#151A33;max-width:520px">${
    lines.map(l => l === '{link}'
      ? `<p><a href="${esc(appUrl)}" style="display:inline-block;background:#1F3FB0;color:#fff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:12px">E4U</a><br><span style="font-size:13px;color:#5A6082">${esc(appUrl)}</span></p>`
      : `<p>${esc(fill(l))}</p>`).join('')
  }<p style="color:#5A6082">${esc(sign)}</p></div>`;
  return { subject: t.subject, text, html };
}

/** A tester's report to the owner (always in Russian: it is read by the owner). */
export function composeReport(from, text, context, meta) {
  const parts = [`От: ${from}`, '', text, ...(context ? ['', '— Задание —', context] : []), '', '— Техническое —', meta];
  const body = parts.join('\n');
  return {
    subject: `E4U: ${context ? 'ошибка в задании' : 'сообщение'} от ${from}`,
    text: body,
    html: `<pre style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;white-space:pre-wrap;color:#151A33">${esc(body)}</pre>`,
  };
}

/** Send through Resend. Returns 'sent' | 'off' (not configured) | 'failed'.
 *  Replies go to the owner unless replyTo says otherwise (a report: straight to the tester). */
export async function send(env, to, msg, attachment, replyTo) {
  if (!env.RESEND_API_KEY || !env.MAIL_FROM) return 'off';
  replyTo = replyTo || String(env.ADMIN_EMAILS || '').split(',')[0].trim().toLowerCase();
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${String(env.RESEND_API_KEY).trim()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.MAIL_FROM, to: [to], subject: msg.subject, text: msg.text, html: msg.html,
      ...(replyTo ? { reply_to: replyTo } : {}),
      ...(attachment ? { attachments: [attachment] } : {}),
    }),
  }).catch(e => ({ ok: false, status: 0, text: async () => String(e) }));
  if (res.ok) return 'sent';
  console.error('mail error:', res.status, await res.text());
  return 'failed';
}
