/**
 * @license Copyright (c) 2003-2015, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or http://ckeditor.com/license
 */

/* exported CKBUILDER_CONFIG */

var CKBUILDER_CONFIG = {
	skin: 'moono',
	ignore: [
		'bender.js',
		'.bender',
		'bender-err.log',
		'bender-out.log',
		'dev',
		'.DS_Store',
		'.editorconfig',
		'.gitignore',
		'.gitattributes',
		'gruntfile.js',
		'.idea',
		'.jscsrc',
		'.jshintignore',
		'.jshintrc',
		'.mailmap',
		'node_modules',
		'package.json',
		'README.md',
		'LICENSE.md',
		'CHANGES.md',
		'samples',
		'.npmignore',
		'tests',
		'config.js'
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
		// ресайзер картинок для вебкита
		imgresize: 1,
		// автосоздание ссылок по Enter
		autolink2: 1,
	    filetools: 1,
	    tableresize: 1,
	    // замена iframe на div
	    divarea: 1,
		a11yhelp: 0,
		about: 0,
		// базовые операции редакторования текста: жирн, курсив и проч
		basicstyles: 1,
		// ???
		bidi: 1,
		// позволяет использовать тег цитирования
		blockquote: 1,
		// операции вставки, вырезания и копирования
		clipboard: 1,
		// кнопки выбора цвета текста и цвета фона текста
		colorbutton: 1,
		// диалог выбора цвета для кнопок цвета текста и фона
		colordialog: 1,
		// добавляет контекстное меню
		contextmenu: 1,
		// вкладки для диалоговых окон
		dialogadvtab: 1,
		// кнопка создать div контейнер
		div: 0,
		// вывод пути вложенности элементов в подвале редактора
		elementspath: 0,
		// реализует настройку enterMode - какой тег будет подставлен по клику на Enter
		enterkey: 1,
		// экранирование HTML
		entities: 1,
		filebrowser: 0,
		// поиск и замена
		find: 0,
		flash: 0,
		// для инлайнового редактор определение лучшего расположения тулбара
		floatingspace: 0,
		// кнопки изменения шрифта и размера
		font: 1,
		format: 1,
		// добавление элементов формы
		forms: 0,
		// кнопка вставки hr
		horizontalrule: 0,
		// возможности форматирования html
		htmlwriter: 1,
		iframe: 0,
		// вставка/изменение изображения через окно
		image: 0,
		image2: 0,
		// кнопки добавления списков
		indentlist: 1,
		// возможность настраивать отступ в текстовых блоках
		indentblock: 1,
		// выравнивание текста
		justify: 1,
		// редактирование/добавление ссылки
		link: 1,
		// обеспечивает возможность вставки/удаления списков
		list: 1,
		// зависит от contextmenu
		liststyle: 0,
		// выводит линию добавления переноса под курсором
		magicline: 0,
		maximize: 1,
		// добавляет кнопку открыть в новом окне
		newpage: 0,
		// кнопка добавления разрыва страницы
		pagebreak: 0,
		// вставить из Word
		pastefromword: 0,
		// вставлять всегда как plain
		pastetext: 0,
		// кнопка предварительного просмотра
		preview: 0,
		// кнопка печати
		print: 0,
		// кнопка убрать форматирование
		removeformat: 1,
		resize: 1,
		// кнопка сохранения
		save: 0,
		// добавляет кнопку "выделить всё"
		selectall: 0,
		// добавляет кнопку показать блоки
		showblocks: 0,
		// показать бордеры у таблиц
		showborders: 1,
		smiley: 0,
		// показать исходный документ
		sourcearea: 1,
		// специальные символы
		specialchar: 0,
		// добавляит кнопку выбора специальных стилей
		stylescombo: 0,
		// обработка навигации по табам
		tab: 1,
		table: 1,
		// зависит от contextmenu
		tabletools: 1,
		// диалог выбора шаблонов
		templates: 0,
		toolbar: 1,
		undo: 1,
		wysiwygarea: 1
	}
};
