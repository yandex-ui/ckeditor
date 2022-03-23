/* bender-tags: editor,unit,clipboard,pastefromword */
/* bender-ckeditor-plugins: clipboard,pastefromword,ajax */
/* global assertPasteEvent */

( function() {
	'use strict';

	bender.editor = true;

	var compat = bender.tools.compatHtml,
		engineName = CKEDITOR.env.webkit ? 'webkit' :
			CKEDITOR.env.ie ? 'ie' :
			CKEDITOR.env.gecko ? 'gecko' :
			null;

	function testWordFilter( editor ) {
		return function( input, output ) {
			assertPasteEvent( editor, { dataValue: input },
			function( data, msg ) {
				assert.areSame( compat( output ), compat( data.dataValue ), msg );
			}, 'tc1', true );
		};
	}

	bender.test( {
		'test tc1 - word2003': function() {
			if ( !engineName )
				assert.ignore();

			bender.tools.testExternalInputOutput( '_assets/tc1_word2010_' + engineName + '.html', testWordFilter( this.editor ) );
		}
	} );
} )();