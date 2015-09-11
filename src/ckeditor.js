(function() {
    /* borschik:include:ckeditor/dev/builder/release/ckeditor/ckeditor.js */
    /* borschik:include:ckeditor/dev/builder/release/ckeditor/styles.js */

    // FIXME сделать автосборку всех js
    /* borschik:include:ckeditor/dev/builder/release/ckeditor/plugins/pastefromword/filter/default.js */
    /* borschik:include:ckeditor/dev/builder/release/ckeditor/plugins/clipboard/dialogs/paste.js */
    /* borschik:include:ckeditor/dev/builder/release/ckeditor/plugins/colordialog/dialogs/colordialog.js */
    /* borschik:include:ckeditor/dev/builder/release/ckeditor/plugins/link/dialogs/link.js */
    /* borschik:include:ckeditor/dev/builder/release/ckeditor/plugins/link/dialogs/anchor.js */
    /* borschik:include:ckeditor/dev/builder/release/ckeditor/plugins/table/dialogs/table.js */

    CKEDITOR.disableAutoInline = true;

    // показываем нативное еонтекстное меню
    // в редакторе нет нормального способа через конфиг это отключить
    CKEDITOR.dom.element.prototype.disableContextMenu = function() {};

    /**
     * Теги, которые могут быть пустыми
     */
    [
        'div',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'p',
        'pre'

    ].forEach(function(tagName) {
        CKEDITOR.dtd.$removeEmpty[ tagName ] = false;
    });

    /**
     * Теги, которые не должны быть пустыми
     */
    [
        'blockquote'

    ].forEach(function(tagName) {
        CKEDITOR.dtd.$removeEmpty[ tagName ] = true;
    });

    CKEDITOR.on('dialogDefinition', function(ev) {
        var dialogName = ev.data.name;
        var dialogDefinition = ev.data.definition;

        if (dialogName === 'link') {
            var infoTab = dialogDefinition.getContents('info');
            infoTab.remove('anchorOptions');

            var linkType = infoTab.get('linkType');
            linkType.items = linkType.items.filter(function(item) {
                return (item[1] !== 'anchor');
            });

            dialogDefinition.removeContents('target');
            dialogDefinition.removeContents('upload');
            dialogDefinition.removeContents('advanced');
        }
    });

    (function() {
        var _openDialog = CKEDITOR.editor.prototype.openDialog;

        CKEDITOR.tools.extend(CKEDITOR.editor.prototype, {
            /**
             * Перехват команды показа окна диалога, чтобы иметь возможность подставить своё
             */
            openDialog: function(dialogName, callback) {
                var data = {
                    'callback': callback,
                    'dialogName': dialogName,
                    'canShow': true
                };

                this.fire('checkOpenDialog', data);

                if (data.canShow) {
                    return _openDialog.apply(this, arguments);
                }
            }
        }, true);
    }());

    /* borschik:include:config.js */
}());
