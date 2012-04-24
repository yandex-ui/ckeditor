﻿﻿
/*
Copyright (c) 2003-2011, CKSource - Frederico Knabben. All rights reserved.
For licensing, see LICENSE.html or http://ckeditor.com/license
*/

/**
 * @fileOverview The "showblocks" plugin. Enable it will make all block level
 *               elements being decorated with a border and the element name
 *               displayed on the left-right corner.
 */

(function() {
	var commandDefinition = {
		readOnly: 1,
		preserveState: true,
		editorFocus: false,

		exec: function( editor ) {
			this.toggleState();
			this.refresh( editor );
		},

		refresh: function( editor ) {
			if ( editor.document ) {
				var funcName = ( this.state == CKEDITOR.TRISTATE_ON ) ? 'addClass' : 'removeClass';
				editor.editable()[ funcName ]( 'cke_show_blocks' );
			}
		}
	};

	CKEDITOR.plugins.add( 'showblocks', {
		onLoad: function() {
			var cssTemplate = '.%2 p,' +
				'.%2 div,' +
				'.%2 pre,' +
				'.%2 address,' +
				'.%2 blockquote,' +
				'.%2 h1,' +
				'.%2 h2,' +
				'.%2 h3,' +
				'.%2 h4,' +
				'.%2 h5,' +
				'.%2 h6' +
				'{' +
					'background-repeat: no-repeat;' +
					'border: 1px dotted gray;' +
					'padding-top: 8px;' +
				'}' +

				'.%2 p' +
				'{' +
					'%1p.png);' +
				'}' +

				'.%2 div' +
				'{' +
					'%1div.png);' +
				'}' +

				'.%2 pre' +
				'{' +
					'%1pre.png);' +
				'}' +

				'.%2 address' +
				'{' +
					'%1address.png);' +
				'}' +

				'.%2 blockquote' +
				'{' +
					'%1blockquote.png);' +
				'}' +

				'.%2 h1' +
				'{' +
					'%1h1.png);' +
				'}' +

				'.%2 h2' +
				'{' +
					'%1h2.png);' +
				'}' +

				'.%2 h3' +
				'{' +
					'%1h3.png);' +
				'}' +

				'.%2 h4' +
				'{' +
					'%1h4.png);' +
				'}' +

				'.%2 h5' +
				'{' +
					'%1h5.png);' +
				'}' +

				'.%2 h6' +
				'{' +
					'%1h6.png);' +
				'}';

			// Styles with contents direction awareness.
			function cssWithDir( dir ) {
				var template = '.%1.%2 p,' +
					'.%1.%2 div,' +
					'.%1.%2 pre,' +
					'.%1.%2 address,' +
					'.%1.%2 blockquote,' +
					'.%1.%2 h1,' +
					'.%1.%2 h2,' +
					'.%1.%2 h3,' +
					'.%1.%2 h4,' +
					'.%1.%2 h5,' +
					'.%1.%2 h6' +
					'{' +
						'background-position: top %3;' +
						'padding-%3: 8px;' +
					'}';

				return template.replace( /%1/g, 'cke_show_blocks' ).replace( /%2/g, 'cke_contents_' + dir ).replace( /%3/g, dir == 'rtl' ? 'right' : 'left' );
			}

			CKEDITOR.addCss( cssTemplate.replace( /%1/g, 'background-image: url(' + CKEDITOR.getUrl( this.path ) + 'images/block_' ).replace( /%2/g, 'cke_show_blocks ' ) + cssWithDir( 'ltr' ) + cssWithDir( 'rtl' ) );
		},
		init: function( editor ) {
			var command = editor.addCommand( 'showblocks', commandDefinition );
			command.canUndo = false;

			if ( editor.config.startupOutlineBlocks )
				command.setState( CKEDITOR.TRISTATE_ON );

			editor.ui.addButton( 'ShowBlocks', {
				label: editor.lang.showBlocks,
				command: 'showblocks'
			});

			// Refresh the command on setData.
			editor.on( 'mode', function() {
				if ( command.state != CKEDITOR.TRISTATE_DISABLED )
					command.refresh( editor );
			});

			// Refresh the command on setData.
			editor.on( 'contentDom', function() {
				if ( command.state != CKEDITOR.TRISTATE_DISABLED )
					command.refresh( editor );
			});
		}
	});
})();

/**
 * Whether to automaticaly enable the "show block" command when the editor
 * loads. (StartupShowBlocks in FCKeditor)
 * @name CKEDITOR.config.startupOutlineBlocks
 * @type Boolean
 * @default false
 * @example
 * config.startupOutlineBlocks = true;
 */
