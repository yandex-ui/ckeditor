(function() {
    var validAttrs = [
        'align',
        'alt',
        'bgcolor',
        'border',
        'rowspan',
        'colspan',
        'cellpadding',
        'cellspacing',
        'cite',
        'class',
        'color',
        'face',
        'href',
        'lang',
        'link',
        'noshade',
        'size',
        'src',
        'style',
        'target',
        'title',
        'type',
        'valign',
        'vlink',
        'width',
        'height'
    ];

    var validTags = [
        'a',
        'b',
        'blockquote',
        'br',
        'div',
        'em',
        'font',
        'hr',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'i',
        'img',
        'li',
        'ol',
        'p',
        'pre',
        'span',
        'strong',
        'table',
        'tbody',
        'td',
        'tr',
        'u',
        'ul',
        's'
    ];

    var allowFilter = validTags.join(' ') + '; *[' + validAttrs.join(',') + ']; *{*}';

    CKEDITOR.editorConfig = function(config) {
        config.allowedContent = allowFilter;
        config.autoUpdateElement = false;
        config.baseFloatZIndex = 100;
        config.browserContextMenuOnCtrl = true;
        config.customConfig = '';
        config.disableNativeSpellChecker = false;
        config.disallowedContent = '*{position,z-index}';
        config.docType = '<!DOCTYPE html>';
        config.enterMode = CKEDITOR.ENTER_DIV;
        config.pasteFilter = allowFilter;
        config.pasteFromWordNumberedHeadingToList = true;
        config.pasteFromWordRemoveFontStyles = false;
        config.pasteFromWordRemoveStyles = false;
        config.uiColor = '#ffffff';
        config.width = '100%';

        config.toolbar = [
            { 'name': 'attachment', 'items': [ 'Attachment' ] },
            { 'name': 'clipboard', 'items': [ 'Undo', 'Redo', 'PasteFromWord' ] },
            { 'name': 'basicstyles', 'items': [ 'Bold', 'Italic', 'Underline', 'Strike' ] },
            { 'name': 'links', 'items': [ 'Link', 'Unlink' ] },
            { 'name': 'blockquote', 'items': [ 'Blockquote' ] },
            { 'name': 'styles', 'items': [ 'TextColor', 'BGColor' ] }, // 'MailTextColor', 'MailBGColor'
            { 'name': 'fontstyles', 'items': [ 'Font', 'FontSize' ] }, // 'MailFont', 'MailFontSize'
            { 'name': 'emoticons', 'items': [ 'Emoticons' ] },
            { 'name': 'paragraph', 'items': [ 'NumberedList', 'BulletedList' ] },
            { 'name': 'align', 'items': [ 'JustifyLeft', 'JustifyCenter', 'JustifyRight' ] },
            { 'name': 'tools', 'items': [ 'Maximize' ] },
            { 'name': 'removeformat', 'items': [ 'RemoveFormat' ] },
            { 'name': 'switchmode', 'items': [ 'SwitchMode' ] }
        ];

        return config;
    };

}());
