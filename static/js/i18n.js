(() => {
  const storageKey = 'pcforge.language';
  const themeKey = 'pcforge.theme';
  const supported = ['en', 'ru', 'tg'];
  const rows = [
    ['Marketplace', 'Маркетплейс', 'Бозор'],
    ['PC Builder', 'Сборщик ПК', 'Ҷамъкунии компютер'],
    ['Components', 'Компоненты', 'Қисмҳо'],
    ['Messages', 'Сообщения', 'Паёмҳо'],
    ['Post Listing', 'Разместить объявление', 'Эълон гузоштан'],
    ['Language', 'Язык', 'Забон'],
    ['Buyer', 'Покупатель', 'Харидор'],
    ['Manager', 'Менеджер', 'Менеҷер'],
    ['Admin', 'Администратор', 'Маъмур'],
    ['New listing', 'Новое объявление', 'Эълони нав'],
    ['Edit listing', 'Редактировать объявление', 'Таҳрири эълон'],
    ['Component', 'Компонент', 'Қисм'],
    ['Price', 'Цена', 'Нарх'],
    ['Condition', 'Состояние', 'Ҳолат'],
    ['Description', 'Описание', 'Тавсиф'],
    ['Save listing', 'Сохранить объявление', 'Захира кардани эълон'],
    ['Add to cart', 'В корзину', 'Ба сабад'],
    ['Added to cart', 'Добавлено в корзину', 'Ба сабад илова шуд'],
    ['My listings', 'Мои объявления', 'Эълонҳои ман'],
    ['My saved builds', 'Сохранённые сборки', 'Ҷамъкуниҳои захирашудаи ман'],
    ['Cart', 'Корзина', 'Сабад'],
    ['Your cart is empty.', 'Корзина пуста.', 'Сабади шумо холӣ аст.'],
    ['Add hardware from the marketplace to get started.', 'Добавьте комплектующие из маркетплейса для оформления.', 'Барои фармоиш қисмҳоро аз бозор илова кунед.'],
    ['You have not posted any listings yet.', 'Вы ещё не размещали объявления.', 'Шумо ҳанӯз эълон нагузоштаед.'],
    ['Sign in to view your account.', 'Войдите, чтобы открыть личный кабинет.', 'Барои дидани ҳисоб ворид шавед.'],
    ['You are not signed in.', 'Вы не вошли в аккаунт.', 'Шумо ба ҳисоб ворид нашудаед.'],
    ['Personal account', 'Личный кабинет', 'Ҳисоби шахсӣ'],
    ['Could not save listing. Check your permissions and fields.', 'Не удалось сохранить объявление. Проверьте права и поля.', 'Захира кардани эълон нашуд. Иҷозат ва майдонҳоро санҷед.'],
    ['Could not load your listings.', 'Не удалось загрузить ваши объявления.', 'Бор кардани эълонҳои шумо нашуд.'],
    ['Could not load your builds.', 'Не удалось загрузить сборки.', 'Бор кардани ҷамъкуниҳои шумо нашуд.'],
    ['Could not load your cart.', 'Не удалось загрузить корзину.', 'Бор кардани сабад нашуд.'],
    ['Could not load your orders.', 'Не удалось загрузить историю заказов.', 'Бор кардани таърихи фармоишҳо нашуд.'],
    ['Remove', 'Удалить', 'Ҳазф кардан'],
    ['Details', 'Подробнее', 'Муфассал'],
    ['PCForge · Marketplace', 'PCForge · Маркетплейс', 'PCForge · Бозор'],
    ['PCForge · Components', 'PCForge · Компоненты', 'PCForge · Қисмҳо'],
    ['PCForge · Builder', 'PCForge · Сборщик ПК', 'PCForge · Ҷамъкунӣ'],
    ['PCForge · Builds', 'PCForge · Сборки', 'PCForge · Ҷамъкуниҳо'],
    ['PCForge · Chat', 'PCForge · Сообщения', 'PCForge · Паёмҳо'],
    ['PCForge · Product Detail', 'PCForge · Объявление', 'PCForge · Эълон'],
    ['PCForge · Sign In', 'PCForge · Вход', 'PCForge · Воридшавӣ'],
    ['PCForge · Create Account', 'PCForge · Создание аккаунта', 'PCForge · Сохтани ҳисоб'],
    ['PCForge · Account', 'PCForge · Личный кабинет', 'PCForge · Ҳисоб'],
    ['Search CPUs, GPUs, motherboards, listings...', 'Поиск процессоров, видеокарт, плат и объявлений…', 'Ҷустуҷӯи протсессор, корти видеоӣ, плата ва эълонҳо…'],
    ['Hardware Marketplace', 'Маркетплейс оборудования', 'Бозори таҷҳизот'],
    ['Community listings from the PCForge catalog.', 'Объявления сообщества из каталога PCForge.', 'Эълонҳои ҷомеа аз феҳристи PCForge.'],
    ['PCFORGE / HARDWARE EXCHANGE', 'PCFORGE / ОБМЕН ОБОРУДОВАНИЕМ', 'PCFORGE / МУБОДИЛАИ ТАҶҲИЗОТ'],
    ['PCFORGE / SPECIFICATIONS', 'PCFORGE / ХАРАКТЕРИСТИКИ', 'PCFORGE / ХУСУСИЯТҲО'],
    ['PCFORGE / WORKBENCH', 'PCFORGE / СБОРОЧНАЯ', 'PCFORGE / ҶАМЪКУНӢ'],
    ['PCFORGE / SESSION', 'PCFORGE / СЕССИЯ', 'PCFORGE / СЕССИЯ'],
    ['PCForge / Account', 'PCForge / Аккаунт', 'PCForge / Ҳисоб'],
    ['Product search', 'Поиск товаров', 'Ҷустуҷӯи молҳо'],
    ['No products', 'Нет товаров', 'Молҳо нестанд'],
    ['There are no active listings yet.', 'Активных объявлений пока нет.', 'Ҳоло эълонҳои фаъол нестанд.'],
    ['Active listings will appear here when sellers post them.', 'Активные объявления появятся здесь, когда продавцы их разместят.', 'Пас аз нашри эълонҳои фурӯшандагон онҳо дар ин ҷо пайдо мешаванд.'],
    ['There are no active listings yet. Check back soon.', 'Активных объявлений пока нет. Загляните позже.', 'Ҳоло эълонҳои фаъол нестанд. Баъдтар боз бинед.'],
    ['No results match your search.', 'По вашему запросу ничего не найдено.', 'Аз рӯи дархости шумо чизе ёфт нашуд.'],
    ['Component catalog', 'Каталог компонентов', 'Феҳристи қисмҳо'],
    ['Search components', 'Поиск компонентов', 'Ҷустуҷӯи қисмҳо'],
    ['List is empty', 'Список пуст', 'Рӯйхат холӣ аст'],
    ['No components have been added to the catalog.', 'Компоненты ещё не добавлены в каталог.', 'Қисмҳо ҳанӯз ба феҳрист илова нашудаанд.'],
    ['The list is empty. No components have been added to the catalog yet.', 'Список пуст. Компоненты ещё не добавлены в каталог.', 'Рӯйхат холӣ аст. Қисмҳо ҳанӯз ба феҳрист илова нашудаанд.'],
    ['Create build', 'Создать сборку', 'Сохтани ҷамъкунӣ'],
    ['Build name', 'Название новой сборки', 'Номи ҷамъкунии нав'],
    ['Available components', 'Доступные компоненты', 'Қисмҳои дастрас'],
    ['The component list is empty.', 'Список компонентов пуст.', 'Рӯйхати қисмҳо холӣ аст.'],
    ['Your builds', 'Ваши сборки', 'Ҷамъкуниҳои шумо'],
    ['No builds yet. Create your first build.', 'Сборок пока нет. Создайте первую сборку.', 'Ҳоло ҷамъкунӣ нест. Аввалин ҷамъкуниро созед.'],
    ['My builds', 'Мои сборки', 'Ҷамъкуниҳои ман'],
    ['No saved builds yet.', 'Сохранённых сборок пока нет.', 'Ҳоло ҷамъкунии захирашуда нест.'],
    ['Conversations', 'Переписки', 'Муколамаҳо'],
    ['Loading conversations…', 'Загрузка переписок…', 'Муколамаҳо бор шуда истодаанд…'],
    ['No messages. Start a conversation from a listing.', 'Нет сообщений. Начните переписку со страницы товара.', 'Паём нест. Аз саҳифаи мол муколамаро оғоз кунед.'],
    ['Sign in to view messages.', 'Войдите, чтобы открыть сообщения.', 'Барои дидани паёмҳо ворид шавед.'],
    ['Write a message…', 'Напишите сообщение…', 'Паём нависед…'],
    ['Send', 'Отправить', 'Фиристодан'],
    ['No messages in this conversation.', 'Нет сообщений в этой переписке.', 'Дар ин муколама паём нест.'],
    ['Listing not found', 'Объявление не найдено', 'Эълон ёфт нашуд'],
    ['Listing not found.', 'Объявление не найдено.', 'Эълон ёфт нашуд.'],
    ['Condition:', 'Состояние:', 'Ҳолат:'],
    ['Seller:', 'Продавец:', 'Фурӯшанда:'],
    ['Account', 'Аккаунт', 'Ҳисоб'],
    ['Sign-in status is determined by the current browser session.', 'Состояние входа определяется текущей сессией браузера.', 'Ҳолати воридшавӣ аз сессияи ҷории браузер муайян мешавад.'],
    ['Sign out', 'Выйти', 'Баромадан'],
    ['PCForge / Hardware exchange', 'PCForge / Обмен оборудованием', 'PCForge / Мубодилаи таҷҳизот'],
    ['PCForge / Specifications', 'PCForge / Характеристики', 'PCForge / Хусусиятҳо'],
    ['PCForge / Workbench', 'PCForge / Сборочная', 'PCForge / Ҷамъкунӣ'],
    ['PCForge / Session', 'PCForge / Сессия', 'PCForge / Сессия'],
    ['Select Component', 'Выберите компонент', 'Қисмро интихоб кунед'],
    ['Sign in to PCForge', 'Войти в PCForge', 'Ба PCForge ворид шавед'],
    ['Create your PCForge account', 'Создать аккаунт PCForge', 'Ҳисоби PCForge созед'],
    ['Sign in', 'Войти', 'Ворид шудан'],
    ['Create account', 'Создать аккаунт', 'Сохтани ҳисоб'],
    ['Username', 'Имя пользователя', 'Номи корбар'],
    ['Password', 'Пароль', 'Рамз'],
    ['Operator Username', 'Имя пользователя', 'Номи корбар'],
    ['Security Passphrase', 'Пароль', 'Рамз'],
    ['Access private hardware rigs, benchmarks & peer exchanges.', 'Получите доступ к частным сборкам, тестам и обмену комплектующими.', 'Ба ҷамъкуниҳои хусусӣ, санҷишҳо ва мубодилаи қисмҳо дастрасӣ пайдо кунед.'],
    ['Case-insensitive hardware operator identifier.', 'Имя пользователя не зависит от регистра.', 'Номи корбар ба ҳарфҳои калон ё хурд вобаста нест.'],
    ['Session Key / Password', 'Ключ сессии / пароль', 'Калиди сессия / рамз'],
    ['Entropy optimal (128-bit) Zero telemetry', 'Оптимальная энтропия (128 бит), без телеметрии', 'Энтропияи беҳтарин (128-бит), бе телеметрия'],
    ['Entropy optimal (128-bit)', 'Оптимальная энтропия (128 бит)', 'Энтропияи беҳтарин (128-бит)'],
    ['Zero telemetry', 'Без телеметрии', 'Бе телеметрия'],
    ['Sign In to Workbench', 'Войти в рабочую среду', 'Ба муҳити корӣ ворид шудан'],
    ['Unregistered operator signature?', 'Ещё нет аккаунта?', 'Ҳисоб надоред?'],
    ['Create Account', 'Создать аккаунт', 'Сохтани ҳисоб'],
    ['Encrypted hardware session token • Zero external analytics • Strict peer-to-peer memory bus guarantees.', 'Зашифрованный токен сессии • Без внешней аналитики • Прямой обмен между участниками.', 'Токени рамзгузоришудаи сессия • Бе таҳлили беруна • Мубодилаи мустақим байни корбарон.'],
    ['Create PCForge Account', 'Создать аккаунт PCForge', 'Ҳисоби PCForge созед'],
    ['Establish an operator handle for saving rigs and contacting peer sellers without telemetry or tracking.', 'Создайте имя пользователя, чтобы сохранять сборки и связываться с продавцами без телеметрии и отслеживания.', 'Барои захира кардани ҷамъкуниҳо ва тамос бо фурӯшандагон бе телеметрия номи корбар созед.'],
    ['Username *', 'Имя пользователя *', 'Номи корбар *'],
    ['Password *', 'Пароль *', 'Рамз *'],
    ['Confirm Password *', 'Подтвердите пароль *', 'Рамзро тасдиқ кунед *'],
    ['Confirm Password', 'Подтвердите пароль', 'Рамзро тасдиқ кунед'],
    ['Choose operator handle', 'Выберите имя пользователя', 'Номи корбарро интихоб кунед'],
    ['Enter password', 'Введите пароль', 'Рамзро ворид кунед'],
    ['Confirm password', 'Повторите пароль', 'Рамзро такрор кунед'],
    ['PASSWORD STRENGTH', 'НАДЁЖНОСТЬ ПАРОЛЯ', 'ҚУВВАТИ РАМЗ'],
    ['ENTROPY: STRONG', 'НАДЁЖНОСТЬ: ВЫСОКАЯ', 'РАМЗ: ҚАВӢ'],
    ['ENTROPY: WEAK', 'НАДЁЖНОСТЬ: НИЗКАЯ', 'РАМЗ: СУСТ'],
    ['Valid format', 'Допустимый формат', 'Формат дуруст аст'],
    ['Use 3–20 letters, numbers, or underscores', 'Используйте 3–20 букв, цифр или подчёркиваний', 'Аз 3 то 20 ҳарф, рақам ё зерхатро истифода баред'],
    ['3–20 characters, alphanumeric & underscores', 'От 3 до 20 символов: буквы, цифры и подчёркивание', 'Аз 3 то 20 аломат: ҳарф, рақам ва зерхат'],
    ['Handle available', 'Имя пользователя доступно', 'Номи корбар дастрас аст'],
    ['Min 8 chars', 'Минимум 8 символов', 'Ҳадди ақал 8 аломат'],
    ['1 Number', '1 цифра', '1 рақам'],
    ['1 Symbol', '1 спецсимвол', '1 аломати махсус'],
    ['Passwords match', 'Пароли совпадают', 'Рамзҳо мувофиқанд'],
    ['Create Account & Initialize Workspace', 'Создать аккаунт и рабочее пространство', 'Ҳисоб ва муҳити кориро созед'],
    ['Already have an operator account? Sign In →', 'Уже есть аккаунт? Войти →', 'Аллакай ҳисоб доред? Ворид шавед →'],
    ['Already have an operator account?', 'Уже есть аккаунт?', 'Аллакай ҳисоб доред?'],
    ['Sign In →', 'Войти →', 'Ворид шавед →'],
    ['All systems operational • Hardware DB v2.4', 'Все системы работают • База оборудования v2.4', 'Ҳама системаҳо фаъоланд • Феҳристи таҷҳизот v2.4'],
    ['All systems operational', 'Все системы работают', 'Ҳама системаҳо фаъоланд'],
    ['Hardware DB v2.4', 'База оборудования v2.4', 'Феҳристи таҷҳизот v2.4'],
    ['CAD HARDWARE VAULT', 'ЗАЩИЩЁННОЕ ХРАНИЛИЩЕ', 'АНБОРИ МУҲОФИЗАТШУДА'],
    ['WebAuthn READY', 'WebAuthn ГОТОВ', 'WebAuthn ТАЙЁР'],
    ['Documentation', 'Документация', 'Ҳуҷҷатҳо'],
    ['Component Guidelines', 'Руководство по компонентам', 'Дастури қисмҳо'],
    ['Peer Safety', 'Безопасность сделок', 'Амнияти муомила'],
    ['Terms', 'Условия', 'Шартҳо'],
    ['Socket', 'Сокет', 'Сокет'],
    ['RAM', 'ОЗУ', 'RAM'],
    ['Average price', 'Средняя цена', 'Нархи миёна'],
    ['Guest', 'Гость', 'Меҳмон'],
    ['Signed in', 'Авторизован', 'Ворид шудааст'],
    ['Browse without signing in', 'Просмотр без входа', 'Боздид бе воридшавӣ'],
    ['You are signed in to PCForge', 'Вы вошли в PCForge', 'Шумо ба PCForge ворид шудед'],
    ['Loading products…', 'Загрузка товаров…', 'Молҳо бор шуда истодаанд…'],
    ['Unable to load listings.', 'Не удалось загрузить объявления.', 'Бор кардани эълонҳо муяссар нашуд.'],
    ['Unable to load components.', 'Не удалось загрузить каталог компонентов.', 'Бор кардани феҳристи қисмҳо муяссар нашуд.'],
    ['Unable to load builds.', 'Не удалось загрузить сборки.', 'Бор кардани ҷамъкуниҳо муяссар нашуд.'],
    ['Unable to load conversations.', 'Не удалось загрузить переписки.', 'Бор кардани муколамаҳо муяссар нашуд.'],
    ['Please check your username and password.', 'Проверьте имя пользователя и пароль.', 'Ном ва рамзи худро санҷед.'],
    ['Check your username and password.', 'Проверьте имя пользователя и пароль.', 'Ном ва рамзи худро санҷед.'],
    ['Passwords do not match.', 'Пароли не совпадают.', 'Рамзҳо мувофиқат намекунанд.'],
    ['Account could not be created. The username may already be in use.', 'Не удалось создать аккаунт. Возможно, имя пользователя уже занято.', 'Ҳисоб сохта нашуд. Эҳтимол, ин номи корбар аллакай истифода мешавад.'],
    ['Sign in to save a build.', 'Войдите, чтобы сохранить сборку.', 'Барои захира кардани ҷамъкунӣ ворид шавед.'],
    ['Could not create the build.', 'Не удалось создать сборку.', 'Сохтани ҷамъкунӣ муяссар нашуд.'],
    ['Could not send the message.', 'Не удалось отправить сообщение.', 'Фиристодани паём муяссар нашуд.'],
    ['Sign in to view your builds.', 'Войдите, чтобы увидеть свои сборки.', 'Барои дидани ҷамъкуниҳо ворид шавед.'],
    ['Sign in to manage builds.', 'Войдите, чтобы управлять сборками.', 'Барои идора кардани ҷамъкуниҳо ворид шавед.'],
    ['Loading your builds…', 'Загрузка ваших сборок…', 'Ҷамъкуниҳои шумо бор шуда истодаанд…'],
    ['Loading builds…', 'Загрузка сборок…', 'Ҷамъкуниҳо бор шуда истодаанд…'],
    ['Loading components…', 'Загрузка компонентов…', 'Қисмҳо бор шуда истодаанд…'],
    ['Loading listing…', 'Загрузка объявления…', 'Эълон бор шуда истодааст…'],
    ['Products', 'Товары', 'Молҳо'],
    ['Add to build', 'В сборку', 'Ба ҷамъкунӣ'],
    ['Buy now', 'Купить', 'Харидан'],
    ['Buy', 'Купить', 'Харидан'],
    ['Chat with seller', 'Написать продавцу', 'Ба фурӯшанда навиштан'],
    ['Write to seller', 'Написать продавцу', 'Ба фурӯшанда навиштан'],
    ['Chat', 'Чат', 'Чат'],
    ['Specifications', 'Характеристики', 'Хусусиятҳо'],
    ['Technical specifications', 'Технические характеристики', 'Хусусиятҳои техникӣ'],
    ['Seller', 'Продавец', 'Фурӯшанда'],
    ['New', 'Новый', 'Нав'],
    ['Used', 'Б/У', 'Истифодашуда'],
    ['Socket:', 'Сокет:', 'Сокет:'],
    ['RAM type', 'Тип RAM', 'Намуди RAM'],
    ['RAM:', 'RAM:', 'RAM:'],
    ['TDP', 'TDP', 'TDP'],
    ['TDP:', 'TDP:', 'TDP:'],
    ['PSU output', 'Мощность БП', 'Иқтидори БП'],
    ['PSU Output', 'Мощность БП', 'Иқтидори БП'],
    ['PSU output:', 'Мощность БП:', 'Иқтидори БП:'],
    ['Form factor', 'Форм-фактор', 'Форм-фактор'],
    ['Form factor:', 'Форм-фактор:', 'Форм-фактор:'],
    ['Length', 'Длина', 'Дарозӣ'],
    ['Length:', 'Длина:', 'Дарозӣ:'],
    ['Height', 'Высота', 'Баландӣ'],
    ['Height:', 'Высота:', 'Баландӣ:'],
    ['Dimensions', 'Размеры', 'Андозаҳо'],
    ['Case clearance', 'Вместимость корпуса', 'Ғунҷоиши корпус'],
    ['Case clearance:', 'Вместимость корпуса:', 'Ғунҷоиши корпус:'],
    ['Max GPU length', 'Макс. длина GPU', 'Дарозии максималии GPU'],
    ['Max cooler height', 'Макс. высота кулера', 'Баландии максималии сардкунанда'],
    ['Average price:', 'Средняя цена:', 'Нархи миёна:'],
    ['Added to build', 'Добавлено в сборку', 'Ба ҷамъкунӣ илова шуд'],
    ['Component added.', 'Компонент добавлен.', 'Қисм илова шуд.'],
    ['Create or select a build first', 'Сначала создайте или выберите сборку сверху', 'Аввал ҷамъкуниро созед ё интихоб кунед'],
    ['Please sign in to add to build.', 'Войдите в аккаунт, чтобы сохранять сборки.', 'Барои захира кардани ҷамъкунӣ ворид шавед.'],
    ['Close', 'Закрыть', 'Пӯшидан'],
    ['Product details', 'Детали товара', 'Тафсилоти мол'],
    ['Product Details', 'Детали товара', 'Тафсилоти мол'],
    ['You cannot purchase your own listing.', 'Вы не можете купить собственный товар.', 'Шумо наметавонед моли худро харед.'],
    ['Buyer actions unavailable for staff/seller.', 'Действия покупателя недоступны для персонала или продавца.', 'Амалҳои харидор барои фурӯшанда дастрас нест.'],
    ['Dialogue with seller', 'Диалог с продавцом', 'Муколама бо фурӯшанда'],
    ['Product context', 'Контекст товара', 'Контексти мол'],
    ['Open in PC Builder', 'Открыть в сборщике', 'Дар ҷамъкунӣ кушоед'],
    ['In build', 'В сборке', 'Дар ҷамъкунӣ'],
    ['Power supply output', 'Мощность блока питания', 'Иқтидори блоки таъминот'],
    ['Admin panel', 'Админ-панель', 'Панели маъмур'],
    ['Admin Panel', 'Админ-панель', 'Панели маъмур'],
    ['Role management', 'Управление ролями', 'Идоракунии нақшҳо'],
    ['User ban management', 'Блокировка пользователей', 'Манъкунии корбарон'],
    ['Dashboard & Broadcast', 'Дашборд и Рассылка', 'Панел ва Пахш'],
    ['Platform statistics', 'Статистика платформы', 'Омори платформа'],
    ['Total listings', 'Всего объявлений', 'Ҳамаи эълонҳо'],
    ['Active chats', 'Активных диалогов', 'Муколамаҳои фаъол'],
    ['Saved builds', 'Сборок пользователей', 'Ҷамъкуниҳо'],
    ['Registered users', 'Пользователей', 'Корбарон'],
    ['Components in catalog', 'Компонентов', 'Қисмҳо'],
    ['Global broadcast', 'Глобальная рассылка', 'Пахши умумӣ'],
    ['Send system broadcast', 'Отправить системное уведомление', 'Фиристодани огоҳинома'],
    ['Notification title', 'Заголовок уведомления', 'Сарлавҳаи огоҳинома'],
    ['Broadcast message', 'Текст рассылки', 'Матни пахш'],
    ['Send to all clients', 'Отправить всем', 'Ба ҳама фиристодан'],
    ['Search users by username or ID…', 'Поиск пользователей по имени или ID…', 'Ҷустуҷӯи корбарон аз рӯи ном ё ID…'],
    ['Role', 'Роль', 'Нақш'],
    ['Status', 'Статус', 'Ҳолат'],
    ['Actions', 'Действия', 'Амалҳо'],
    ['Promote to Manager', 'Назначить менеджером', 'Менеҷер таъин кардан'],
    ['Demote to Buyer', 'Снять менеджера', 'Аз менеҷерӣ гирифтан'],
    ['Block user', 'Заблокировать', 'Манъ кардан'],
    ['Unblock user', 'Разблокировать', 'Аз манъ баровардан'],
    ['Active', 'Активен', 'Фаъол'],
    ['Blocked', 'Заблокирован', 'Манъшуда'],
    ['Superuser', 'Суперпользователь', 'Саркорбар'],
    ['Cannot block yourself', 'Нельзя заблокировать себя', 'Худро манъ кардан мумкин нест'],
    ['Broadcast sent successfully.', 'Уведомление успешно разослано.', 'Огоҳинома бомуваффақият фиристода шуд.'],
    ['User role updated.', 'Роль пользователя обновлена.', 'Нақши корбар нав карда шуд.'],
    ['User status updated.', 'Статус пользователя обновлен.', 'Ҳолати корбар нав карда шуд.'],
    ['System Notification', 'Системное уведомление', 'Огоҳиномаи системавӣ'],
    ['All clients received', 'Доставлено клиентам', 'Ба муштариён расид'],
    ['Switch theme', 'Сменить тему', 'Иваз кардани мавзӯъ'],
    ['Light theme', 'Светлая тема', 'Мавзӯи равшан'],
    ['Dark theme', 'Тёмная тема', 'Мавзӯи торик'],
    ['Checkout', 'Оформить заказ', 'Фармоиш додан'],
    ['Total amount', 'Итоговая сумма', 'Маблағи умумӣ'],
    ['items selected', 'товаров выбрано', 'мол интихоб шуд'],
    ['Order history', 'История заказов', 'Таърихи фармоишҳо'],
    ['No orders yet.', 'Заказов пока нет.', 'Ҳоло фармоишҳо нестанд.'],
    ['Paid', 'Оплачен', 'Пардохтшуда'],
    ['Order', 'Заказ', 'Фармоиш'],
    ['Card payment', 'Оплата банковской картой', 'Пардохт бо корти бонкӣ'],
    ['Enter any test card details to complete simulated checkout.', 'Введите любые тестовые реквизиты карты для подтверждения заказа.', 'Барои тасдиқи фармоиш маълумоти санҷишии кортро ворид кунед.'],
    ['Card number', 'Номер карты', 'Рақами корт'],
    ['Expiry date', 'Срок действия', 'Мӯҳлати амал'],
    ['CVV / CVC', 'CVV / CVC', 'CVV / CVC'],
    ['Cardholder name', 'Имя владельца карты', 'Номи соҳиби корт'],
    ['Fill test card', 'Заполнить тестовыми данными', 'Пур кардани маълумоти санҷишӣ'],
    ['Confirm & Pay', 'Подтвердить и оплатить', 'Тасдиқ ва пардохт'],
    ['Cancel', 'Отмена', 'Бекор кардан'],
    ['Order placed successfully!', 'Заказ успешно оформлен и оплачен!', 'Фармоиш бомуваффақият қабул шуд!'],
    ['New message from', 'Новое сообщение от', 'Паёми нав аз'],
    ['Click to open conversation →', 'Нажмите, чтобы открыть диалог →', 'Барои кушодани муколама пахш кунед →'],
  ];

  const lookup = new Map();
  rows.forEach(([en, ru, tg]) => {
    lookup.set(en, { en, ru, tg });
    lookup.set(ru, { en, ru, tg });
    lookup.set(tg, { en, ru, tg });
  });

  const getLanguage = () => supported.includes(localStorage.getItem(storageKey)) ? localStorage.getItem(storageKey) : 'ru';
  const translateValue = value => {
    const entry = lookup.get(value.trim());
    return entry ? entry[getLanguage()] : value;
  };
  const applyTranslations = root => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || parent.closest('script,style,option[data-language-option]')) return NodeFilter.FILTER_REJECT;
        return lookup.has(node.nodeValue.trim()) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const leading = node.nodeValue.match(/^\s*/)?.[0] || '';
      const trailing = node.nodeValue.match(/\s*$/)?.[0] || '';
      node.nodeValue = leading + translateValue(node.nodeValue.trim()) + trailing;
    });
    root.querySelectorAll?.('input[placeholder],textarea[placeholder]').forEach(input => {
      input.placeholder = translateValue(input.placeholder);
    });
    document.documentElement.lang = getLanguage();
  };

  // Theme management
  const getTheme = () => localStorage.getItem(themeKey) === 'dark' ? 'dark' : 'light';
  const applyTheme = theme => {
    const isDark = theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem(themeKey, isDark ? 'dark' : 'light');
    const toggleBtn = document.querySelector('#pcforge-theme-toggle');
    if (toggleBtn) {
      const icon = toggleBtn.querySelector('.material-symbols-outlined');
      if (icon) icon.textContent = isDark ? 'light_mode' : 'dark_mode';
      toggleBtn.title = translateValue(isDark ? 'Light theme' : 'Dark theme');
      toggleBtn.setAttribute('aria-label', translateValue('Switch theme'));
    }
    window.dispatchEvent(new CustomEvent('pcforge:themechange', { detail: { theme: isDark ? 'dark' : 'light' } }));
  };

  window.pcforgeTheme = {
    get: getTheme,
    set: applyTheme,
    toggle() {
      applyTheme(getTheme() === 'dark' ? 'light' : 'dark');
    }
  };

  window.pcforgeLanguage = {
    get: getLanguage,
    set(language) {
      if (!supported.includes(language)) return;
      localStorage.setItem(storageKey, language);
      applyTranslations(document.body);
      document.title = translateValue(document.title);
      document.querySelector('#pcforge-language')?.setAttribute('aria-label', translateValue('Language'));
      const profile = document.querySelector('header button:last-of-type');
      if (profile && !profile.querySelector('[data-role-badge]')) profile.setAttribute('aria-label', translateValue(localStorage.getItem('pcforge.access') ? 'Account' : 'Sign in'));
      window.dispatchEvent(new CustomEvent('pcforge:languagechange', { detail: { language } }));
    },
    t(value) { return translateValue(value); }
  };

  const installControls = () => {
    const profile = document.querySelector('header button:last-of-type');
    const actions = profile?.parentElement;
    if (!actions) return;

    if (!document.querySelector('#pcforge-theme-toggle')) {
      const themeBtn = document.createElement('button');
      themeBtn.id = 'pcforge-theme-toggle';
      themeBtn.type = 'button';
      themeBtn.className = 'h-8 w-8 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center justify-center transition-colors border border-outline-variant/25';
      const isDark = getTheme() === 'dark';
      themeBtn.title = translateValue(isDark ? 'Light theme' : 'Dark theme');
      themeBtn.setAttribute('aria-label', translateValue('Switch theme'));
      themeBtn.innerHTML = `<span class="material-symbols-outlined text-lg">${isDark ? 'light_mode' : 'dark_mode'}</span>`;
      themeBtn.addEventListener('click', () => window.pcforgeTheme.toggle());
      actions.insertBefore(themeBtn, profile);
    }

    if (!document.querySelector('#pcforge-language')) {
      const select = document.createElement('select');
      select.id = 'pcforge-language';
      select.setAttribute('aria-label', 'Language / Язык / Забон');
      select.className = 'h-8 rounded-lg bg-surface-container px-2 text-body-sm text-on-surface border border-outline-variant/25 focus:outline-none focus:ring-1 focus:ring-primary';
      [['en', 'EN'], ['ru', 'RU'], ['tg', 'TG']].forEach(([value, label]) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        option.dataset.languageOption = 'true';
        select.append(option);
      });
      select.value = getLanguage();
      select.setAttribute('aria-label', translateValue('Language'));
      select.addEventListener('change', () => window.pcforgeLanguage.set(select.value));
      actions.insertBefore(select, profile);
    }
  };

  applyTheme(getTheme());
  applyTranslations(document.body);
  document.title = translateValue(document.title);
  installControls();

  new MutationObserver(records => records.forEach(record => {
    record.addedNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        const value = node.nodeValue.trim();
        if (lookup.has(value)) node.nodeValue = node.nodeValue.replace(value, translateValue(value));
      } else if (node.nodeType === Node.ELEMENT_NODE) applyTranslations(node);
    });
  })).observe(document.body, { subtree: true, childList: true });
})();
