(function() {
    /* borschik:include:ckeditor/dev/builder/release/ckeditor/ckeditor.js */
    /* borschik:include:ckeditor/dev/builder/release/ckeditor/styles.js */

    // FIXME сделать автосборку всех js
    /* borschik:include:ckeditor/dev/builder/release/ckeditor/plugins/clipboard/dialogs/paste.js */
    /* borschik:include:ckeditor/dev/builder/release/ckeditor/plugins/colordialog/dialogs/colordialog.js */
    /* borschik:include:ckeditor/dev/builder/release/ckeditor/plugins/link/dialogs/link.js */
    /* borschik:include:ckeditor/dev/builder/release/ckeditor/plugins/link/dialogs/anchor.js */
    /* borschik:include:ckeditor/dev/builder/release/ckeditor/plugins/table/dialogs/table.js */
    /* borschik:include:ckeditor/dev/builder/release/ckeditor/plugins/tabletools/dialogs/tableCell.js */

    CKEDITOR.disableAutoInline = true;

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

    /* borschik:include:config.js */
}());
