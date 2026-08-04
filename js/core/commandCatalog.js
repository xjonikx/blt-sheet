/**
 * Каталог реальных команд стрима (кнопки шлют это в чат).
 * prompt: если задан — перед отправкой спросит доп. аргументы.
 */

/** @typedef {{ cmd: string, label: string, hint?: string, prompt?: string, collect?: boolean }} CmdDef */

/** @type {Record<string, { title: string, order: number, commands: CmdDef[] }>} */
export const COMMAND_GROUPS = {
  main: {
    title: "Основные",
    order: 10,
    commands: [
      { cmd: "!help", label: "!help", hint: "Список команд" },
      { cmd: "!инв", label: "!инв", hint: "Инвентарь / класс / снаряга", collect: true },
      { cmd: "!золото", label: "!золото", hint: "Золото героя", collect: true },
      { cmd: "!стат", label: "!стат", hint: "Статистика", collect: true },
      { cmd: "!дост", label: "!дост", hint: "Достижения", collect: true },
      { cmd: "!класс", label: "!класс", hint: "Список классов", collect: true },
      {
        cmd: "!класс",
        label: "!класс …",
        hint: "Назначить класс",
        prompt: "Название класса (например: пехотинец)",
      },
      { cmd: "!снаряга", label: "!снаряга", hint: "Прокачать снаряжение" },
      { cmd: "!новаяснаряга", label: "!новаяснаряга", hint: "Рандом снаряги по уровню" },
    ],
  },
  attrs: {
    title: "Атрибуты и навыки",
    order: 20,
    commands: [
      { cmd: "!атр", label: "!атр", hint: "Показать атрибуты", collect: true },
      {
        cmd: "!улатр",
        label: "!улатр …",
        hint: "Прокачать атрибут",
        prompt: "Атрибут (например: ЭНГ)",
      },
      { cmd: "!нав", label: "!нав", hint: "Показать навыки", collect: true },
      {
        cmd: "!фокус",
        label: "!фокус …",
        hint: "Фокус на навык",
        prompt: "Навык (например: лук)",
      },
      { cmd: "!одноруч", label: "!одноруч", hint: "ХР одноручное" },
      { cmd: "!двуруч", label: "!двуруч", hint: "ХР двуручное" },
      { cmd: "!древковое", label: "!древковое", hint: "ХР древковое" },
      { cmd: "!лук", label: "!лук", hint: "ХР лук" },
      { cmd: "!арбалет", label: "!арбалет", hint: "ХР арбалет" },
      { cmd: "!метательное", label: "!метательное", hint: "ХР метательное" },
      { cmd: "!верховая", label: "!верховая", hint: "ХР верховая" },
      { cmd: "!атлетика", label: "!атлетика", hint: "ХР атлетика" },
    ],
  },
  equip: {
    title: "Снять / надеть",
    order: 30,
    commands: [
      {
        cmd: "!надеть",
        label: "!надеть …",
        hint: "Пример: 1 оружие1",
        prompt: "Номер и слот (например: 1 оружие1)",
      },
      {
        cmd: "!снять",
        label: "!снять …",
        hint: "Слот: шлем, броня, оружие1…",
        prompt: "Название слота (например: оружие1)",
      },
    ],
  },
  storage: {
    title: "Склад",
    order: 40,
    commands: [
      { cmd: "!склад", label: "!склад", hint: "Показать склад", collect: true },
      {
        cmd: "!склад store",
        label: "!склад store …",
        hint: "В склад с крафта",
        prompt: "Номер предмета",
      },
      {
        cmd: "!склад take",
        label: "!склад take …",
        hint: "Взять со склада",
        prompt: "Номер предмета",
      },
      {
        cmd: "!склад sell",
        label: "!склад sell …",
        hint: "Продать предмет",
        prompt: "Номер или all",
      },
      { cmd: "!склад sell all", label: "!склад sell all", hint: "Продать весь склад" },
    ],
  },
  retinue: {
    title: "Свита",
    order: 50,
    commands: [
      { cmd: "!свита", label: "!свита", hint: "Купить подчинённого" },
      { cmd: "!свита all", label: "!свита all", hint: "Купить / прокачать всех" },
      {
        cmd: "!свита",
        label: "!свита …",
        hint: "Кол-во + клан/воин",
        prompt: "Аргументы (например: 1 Дондаррион cavalry)",
      },
      {
        cmd: "!свита clear",
        label: "!свита clear …",
        hint: "Уволить по номеру",
        prompt: "Номер или all",
      },
      { cmd: "!свита clear all", label: "!свита clear all", hint: "Уволить всех" },
      { cmd: "!списоксвиты", label: "!списоксвиты", hint: "Список свиты", collect: true },
    ],
  },
  craft: {
    title: "Крафт",
    order: 60,
    commands: [
      { cmd: "!крафтмаунт", label: "!крафтмаунт" },
      { cmd: "!крафтброня", label: "!крафтброня" },
      { cmd: "!крафторужие", label: "!крафторужие" },
      { cmd: "!крафтщит", label: "!крафтщит" },
      {
        cmd: "!ковка",
        label: "!ковка …",
        hint: "шлем, броня, лук…",
        prompt: "Наименование (шлем, броня, оружие1…)",
      },
      { cmd: "!крафтинв", label: "!крафтинв", hint: "Крафтовый инвентарь", collect: true },
      {
        cmd: "!датьимя",
        label: "!датьимя …",
        hint: "Имя предмета",
        prompt: "Номер и имя (например: 3 Меч)",
      },
      {
        cmd: "!отдать",
        label: "!отдать …",
        hint: "Передать зрителю",
        prompt: "Номер и ник (например: 3 nickname)",
      },
      {
        cmd: "!выбросить",
        label: "!выбросить …",
        hint: "Выбросить предмет",
        prompt: "Номер предмета",
      },
    ],
  },
  events: {
    title: "Турик / аук",
    order: 70,
    commands: [
      {
        cmd: "!ставка",
        label: "!ставка …",
        hint: "Цвет и золото",
        prompt: "Например: красный 100",
      },
      {
        cmd: "!аук",
        label: "!аук …",
        hint: "Предмет и старт",
        prompt: "Например: 3 1000",
      },
      {
        cmd: "!аукставка",
        label: "!аукставка …",
        hint: "Ставка на аук",
        prompt: "Сумма золота",
      },
    ],
  },
  other: {
    title: "Прочее",
    order: 80,
    commands: [
      {
        cmd: "!сказать",
        label: "!сказать …",
        hint: "Сообщение на экран",
        prompt: "Текст сообщения",
      },
      {
        cmd: "!сменить gender",
        label: "!сменить gender …",
        hint: "male / female",
        prompt: "male или female",
      },
      {
        cmd: "!ник",
        label: "!ник …",
        hint: "Имя героя",
        prompt: "Новый ник",
      },
      {
        cmd: "!датьголд",
        label: "!датьголд …",
        hint: "Ник и сумма",
        prompt: "Например: nickname 500",
      },
      { cmd: "!увал да", label: "!увал да", hint: "Удалить героя (осторожно!)" },
    ],
  },
};

export const EQUIP_SLOTS = [
  "шлем",
  "плечи",
  "броня",
  "руки",
  "ноги",
  "лошадь",
  "седло",
  "оружие1",
  "оружие2",
  "оружие3",
  "оружие4",
];
