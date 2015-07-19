(function() {
    window.CKEDITOR_BASEPATH = Daria.Config.staticRoot + '/mail/modules/ckeditor/js/ckeditor/';

    /* borschik:include:js/ckeditor/ckeditor.js */

    /* borschik:include:js/ckeditor/plugins/clipboard/dialogs/paste.js */
    /* borschik:include:js/ckeditor/plugins/colordialog/dialogs/colordialog.js */

    /* borschik:include:js/ckeditor/plugins/link/dialogs/link.js */
    /* borschik:include:js/ckeditor/plugins/link/dialogs/anchor.js */

    /* borschik:include:js/ckeditor/plugins/tabletools/dialogs/tableCell.js */
    /* borschik:include:../../../node_modules/ckeditor-autolink/source/plugin.js */

    /* borschik:include:js/plugins/openlink/plugin.js */
    /* borschik:include:js/plugins/pasteimage/pasteimage.js */
    /* borschik:include:js/plugins/xss/plugin.js */
    /* borschik:include:js/plugins/switchmode/plugin.js */
    /* borschik:include:js/plugins/hotkeys/plugin.js */
    /* borschik:include:js/plugins/view/plugin.js */
    /* borschik:include:js/plugins/signature/plugin.js */
    /* borschik:include:js/plugins/attachment/plugin.js */
    /* borschik:include:js/plugins/dragresize/plugin.js */

    /* borschik:include:js/ckeditor/styles.js */
    /* borschik:include:js/ckeditor/adapters/jquery.js */
    /* borschik:include:js/ckeditor/lang/??.js */

    CKEDITOR.env.cssClass += ' mail-Editor';
    CKEDITOR.disableAutoInline = true;

    CKEDITOR.dtd.$removeEmpty['div'] = false;
    CKEDITOR.dtd.$removeEmpty['h1'] = false;
    CKEDITOR.dtd.$removeEmpty['h2'] = false;
    CKEDITOR.dtd.$removeEmpty['h3'] = false;
    CKEDITOR.dtd.$removeEmpty['h4'] = false;
    CKEDITOR.dtd.$removeEmpty['h5'] = false;
    CKEDITOR.dtd.$removeEmpty['h6'] = false;
    CKEDITOR.dtd.$removeEmpty['p'] = false;
    CKEDITOR.dtd.$removeEmpty['pre'] = false;

    var EDITOR_VALID_ATTRS = [
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

    var EDITOR_VALID_TAGS = [
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

    CKEDITOR.mailEditorFilter = EDITOR_VALID_TAGS.join(' ') + '; ' +
        '*[' + EDITOR_VALID_ATTRS.join(',') + ']; ' +
        '*{*}';

    CKEDITOR.mailEditorConfig = function(config) {
        return _.extend({}, {
            // не вешать класс, сбрасывающий стили тулбара и подвала редактора
            'themeResetAll': false,
            'baseFloatZIndex': 100,
            'enterMode': CKEDITOR.ENTER_DIV,
            'customConfig': '',
            'autoUpdateElement': false,
            'docType': '<!DOCTYPE html>',
            'pasteFilter': CKEDITOR.mailEditorFilter,
            'allowedContent': CKEDITOR.mailEditorFilter,
            'language': Daria.Config.locale,
            'defaultLanguage': Daria.Config.locale,
            'width': '100%',
            'browserContextMenuOnCtrl': true,
            'disableNativeSpellChecker': false,
            'toolbar_Max': [
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
            ]

        }, config);
    };

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

    CKEDITOR.plugins.add( 'tokens', {
        requires : ['richcombo'], //, 'styles' ],
        init : function( editor )
        {
            var config = editor.config,
                lang = editor.lang.format;

            // Gets the list of tags from the settings.
            var tags = []; //new Array();
            //this.add('value', 'drop_text', 'drop_label');
            tags[0]=["[contact_name]", "Name", "Name"];
            tags[1]=["[contact_email]", "email", "email"];
            tags[2]=["[contact_user_name]", "User name", "User name"];

            // Create style objects for all defined styles.

            editor.ui.addRichCombo( 'tokens',
                {
                    label : "Insert tokens",
                    title :"Insert tokens",
                    voiceLabel : "Insert tokens",
                    className : 'cke_format',

                    panel :
                    {
				        css: [ CKEDITOR.skin.getPath( 'editor' ) ].concat( config.contentsCss ),
                        multiSelect : false,
                        voiceLabel : lang.panelVoiceLabel,
				        attributes: { 'aria-label': lang.panelTitle }
                    },

                    init : function() {
                        this.startGroup( "Tokens" );
                        //this.add('value', 'drop_text', 'drop_label');
                        for (var this_tag in tags){
                            this.add(tags[this_tag][0], tags[this_tag][1], tags[this_tag][2]);
                        }
                    },

                    onClick : function( value )
                    {
                    editor.focus();
                    editor.fire( 'saveSnapshot' );
                    editor.insertHtml(value);
                    setTimeout( function() {
                        editor.fire( 'saveSnapshot' );
                    }, 0 );
                    }
                });
        }
    });

}());
