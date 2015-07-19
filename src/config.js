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
        'ul'
    ];

    var allowFilter = validTags.join(' ') + '; *[' + validAttrs.join(',') + ']; *{*}';

    CKEDITOR.editorConfig = function(config) {
        config.baseFloatZIndex = 100;
        config.enterMode = CKEDITOR.ENTER_DIV;
        config.customConfig = '';
        config.autoUpdateElement = false;
        config.docType = '<!DOCTYPE html>';
        config.pasteFilter = allowFilter;
        config.allowedContent = allowFilter;
        config.width = '100%';
        config.browserContextMenuOnCtrl = true;
        config.disableNativeSpellChecker = false;
        config.uiColor = '#ffffff';

        config.toolbar_Max = [
            { name: 'attachment', items: [ 'Attachment' ] },
            { name: 'clipboard', items: [ 'Undo', 'Redo' ] },
            { name: 'basicstyles', items: [ 'Bold', 'Italic', 'Underline', 'Strike' ] },
            { name: 'links', items: [ 'Link', 'Unlink' ] },
            { name: 'blockquote', items: [ 'Blockquote' ] },
            { name: 'styles', items: [ 'TextColor', 'BGColor' ] },
            { name: 'fontstyles', items: [ 'Font', 'FontSize' ] },
            { name: 'paragraph', items: [ 'NumberedList', 'BulletedList' ] },
            { name: 'align', items: [ 'JustifyLeft', 'JustifyCenter', 'JustifyRight', 'JustifyBlock' ] },
            { name: 'tools', items: [ 'Maximize' ] },
            { name: 'removeformat', items: [ 'RemoveFormat' ] },
            { name: 'switchmode', items: [ 'SwitchMode' ] }
        ];
    };

}());
