/* bender-tags: editor, clipboard, 13872 */
/* bender-ckeditor-plugins: toolbar, clipboard */

'use strict';

bender.editors = {
	classic: {
		config: {
			readOnly: true
		}
	},
	classic_editable: {},
	inline: {
		creator: 'inline',
		config: {
			readOnly: true
		}
	},
	inline_editable: {
		creator: 'inline'
	}
};

var tests = {
	setUp: function() {
		this.initPasteSpy = sinon.spy( CKEDITOR.plugins.clipboard, 'initPasteDataTransfer' );
	},

	tearDown: function() {
		this.initPasteSpy.restore();
	},

	'test if cut is prevented in read-only editor': function( editor, bot ) {
		var content = '<p>[Some] text</p>',
			expected = editor.readOnly ? content : '<p>^ text</p>';

		bot.setHtmlWithSelection( content );

		editor.editable().fire( 'cut', new CKEDITOR.dom.event( {} ) );

		assert.areSame( expected, bot.htmlWithSelection() );
		assert.areSame( !editor.readOnly, CKEDITOR.plugins.clipboard.initPasteDataTransfer.called );
	}
};

tests = bender.tools.createTestsForEditors( CKEDITOR.tools.objectKeys( bender.editors ), tests );

bender.test( tests );
