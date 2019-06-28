/**
 * Отключено специально: contextmenu, tabletools, tableresize
 */

/* exported CKBUILDER_CONFIG */
var CKBUILDER_CONFIG = {
    skin: 'clean',
    ignore: [
        '.bender',
        '.DS_Store',
        '.editorconfig',
        '.gitattributes',
        '.gitignore',
        '.gitmodules',
        '.idea',
        '.jscsrc',
        '.jshintignore',
        '.jshintrc',
        '.mailmap',
        '.npmignore',
        'bender-err.log',
        'bender-out.log',
        'bender.js',
        'CHANGES.md',
        'config.js',
        'dev',
        'gruntfile.js',
        'LICENSE.md',
        'node_modules',
        'package.json',
        'README.md',
        'samples',
        'tests'
    ],
    languages: {
        'az': 1, // !!
        'be': 1, // !!
        'en': 1,
        'hy': 1, // !!
        'ka': 1,
        'kk': 1, // !!
        'ru': 1,
        'ro': 1,
        'tr': 1,
        'tt': 1,
        'uk': 1
    },
    plugins: {
        a11yhelp: 0,
        about: 0,
        autocomplete: 1, // автокомплит в композе
        autogrow: 1, // авторазмер по содержимому
        autolink2: 1, // автосоздание ссылок по Enter
        basicstyles: 1, // базовые операции редакторования текста: жирн, курсив и проч
        bidi: 1, // ???
        blockquote: 1, // позволяет использовать тег цитирования
        clipboard: 1, // операции вставки, вырезания и копирования
        colorbutton: 1, // кнопки выбора цвета текста и цвета фона текста
        colordialog: 1, // диалог выбора цвета для кнопок цвета текста и фона
        contextmenu: 0, // добавляет контекстное меню
        dialogadvtab: 1, // вкладки для диалоговых окон
        div: 0, // кнопка создать div контейнер
        divarea: 1, // замена iframe на div
        elementspath: 0, // вывод пути вложенности элементов в подвале редактора
        enterkey: 1, // реализует настройку enterMode - какой тег будет подставлен по клику на Enter
        entities: 1, // экранирование HTML
        exbutton: 1, // дополнение прототипа кнопок
        exselection: 1, // дополнительный функции работы с фокусом и выделением
        filebrowser: 0,
        filetools: 1,
        find: 0, // поиск и замена
        flash: 0,
        floatingspace: 0, // для инлайнового редактор определение лучшего расположения тулбара
        font: 1, // кнопки изменения шрифта и размера
        format: 1,
        forms: 0, // добавление элементов формы
        horizontalrule: 0, // кнопка вставки hr
        htmlplaceholder: 1, // html плейсхолдер
        htmlwriter: 1, // возможности форматирования html
        iframe: 0,
        image: 0, // вставка/изменение изображения через окно
        image2: 0,
        imgresize: 1, // ресайзер картинок для вебкита
        indentblock: 1, // возможность настраивать отступ в текстовых блоках
        indentlist: 1, // кнопки добавления списков
        justify: 1, // выравнивание текста
        link: 1, // редактирование/добавление ссылки
        list: 1, // обеспечивает возможность вставки/удаления списков
        liststyle: 0, // зависит от contextmenu
        magicline: 0, // выводит линию добавления переноса под курсором
        maximize: 1,
        newpage: 0, // добавляет кнопку открыть в новом окне
        openlink: 1, // открыть ссылку в новом окне
        pagebreak: 0, // кнопка добавления разрыва страницы
        pastefile: 1, // обработка вставки картинок/аттачей
        pastefromword: 1, // вставить из Word
        pastetext: 0, // вставлять всегда как plain
        prettydrop: 1, // выделение вставленного содержимого при перетаскивании
        preview: 0, // кнопка предварительного просмотра
        print: 0, // кнопка печати
        quotebreak: 1, // разрыв всех уровней цитирования
        removeformat: 1, // кнопка убрать форматирование
        resize: 1,
        save: 0, // кнопка сохранения
        selectall: 0, // добавляет кнопку "выделить всё"
        showblocks: 0, // добавляет кнопку показать блоки
        showborders: 1, // показать бордеры у таблиц
        smiley: 0,
        sourcearea: 1, // показать исходный документ
        specialchar: 0, // специальные символы
        stylescombo: 0, // добавляит кнопку выбора специальных стилей
        svgicons: 1, // svg иконки для темы clean
        switchmode: 1, // переключение режима оформления
        tab: 1, // обработка навигации по табам
        table: 1,
        tableresize: 0,
        tabletools: 0, // зависит от contextmenu
        templates: 0, // диалог выбора шаблонов
        textmatch: 1, // содержит полезные функции для зравнения текста по ренджу
        textwatcher: 1, // наблюдает за печатаемым текстом, генерит события при остановке печати
        toolbar: 1,
        translate: 1, // интерфейс переводчика
        undo: 1,
        wysiwygarea: 1,
        xss: 1 // набор фильтров против xss
    }
};
