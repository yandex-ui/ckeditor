# ckeditor

- для почты ветка **mail**

## Сборка

В репозитории содержаться настройки сборки, основные настройки редактора и примеры использования.

Основной код содержиться в репозитории [ckeditor-dev](https://github.com/yandex-ui/ckeditor-dev), который подключен в директорию `src/ckeditor`.

При любом изменении редактора необходимо выполнить его пересборку.

Для этого обязательно должен быть установлен [JDK](http://www.oracle.com/technetwork/java/javase/downloads/jdk8-downloads-2133151.html).

Затем в консоли запускаем
```
$ make
```
и ждем завершения.

Коммитим всё что будет измененено после пересборки.

## Обновление кода ядра или плагинов

Обновление кода ядра или стандартный плагинов выполняется в репозитории [ckeditor-dev](https://github.com/yandex-ui/ckeditor-dev).

Сторонние плагины подключаются к этому репозиторию сабмодулями в папку `plugins`.
Дополнительные темы подключаются сабмодулями в папку `skins`.

Выполнять пересборку ядра после обновления кода или обновления сабмодуля плагина/темы не надо.
Сборка всегда выполняется только в репозитории `ckeditor`.

## Обновление темы clean

Тема [clean](https://github.com/yandex-ui/ckeditor-skin-clean) подключена к репозиторию `ckeditor-dev` сабмодулем в папку `skins/clean`.

После выполнения любых изменений в стилях или добавлении/изменении иконок необходимо пересобрать тему в её репозитории.

После этого обновить сабмодуль в репозитории `ckeditor-dev`.
Затем обновить сабмодуль `ckeditor-dev` в репозитории `ckeditor` и выполнить общую пересборку редактора.

*Временно:* при изменении темы сборка `ckeditor` не выполняется, т.к. не видит изменений. В этом случае перед началом сборки необходимо выполнить `make clean`;
