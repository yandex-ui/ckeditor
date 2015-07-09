/* bender-tags: editor,unit */
/* bender-ckeditor-plugins: embed,autoembed,enterkey,undo,link */
/* bender-include: ../embedbase/_helpers/tools.js, ../clipboard/_helpers/pasting.js */

/* global embedTools, assertPasteEvent */

'use strict';

function correctJsonpCallback( urlTemplate, urlParams, callback ) {
	callback( {
		'url': decodeURIComponent( urlParams.url ),
		'type': 'rich',
		'version': '1.0',
		'html': '<img src="' + decodeURIComponent( urlParams.url ) + '">'
	} );
}

var jsonpCallback;

function testIsEmbedded( pastedText ) {
	var expectedRegExp = /data-cke-autoembed="\d+"/;

	assertPasteEvent( this.editor, { dataValue: pastedText }, function( data ) {
		// Use prepInnerHtml to make sure attr are sorted.
		assert.isMatching( expectedRegExp, bender.tools.html.prepareInnerHtmlForComparison( data.dataValue ) );
	} );
}

embedTools.mockJsonp( function() {
	jsonpCallback.apply( this, arguments );
} );

bender.editor = {
	creator: 'inline'
};

bender.test( {
	setUp: function() {
		jsonpCallback = correctJsonpCallback;
	},

	'test working example': function() {
		var bot = this.editorBot;

		this.editor.once( 'paste', function( evt ) {
			assert.isMatching( /^<a data-cke-autoembed="\d+" href="https:\/\/foo.bar\/g\/200\/300">https:\/\/foo.bar\/g\/200\/300<\/a>$/, evt.data.dataValue );
		}, null, null, 900 );

		bot.setData( '<p>This is an embed</p>', function() {
			bot.editor.focus();

			var range = this.editor.createRange();
			range.setStart( this.editor.editable().findOne( 'p' ).getFirst(), 10 );
			range.collapse( true );
			this.editor.getSelection().selectRanges( [ range ] );

			this.editor.execCommand( 'paste', 'https://foo.bar/g/200/300' );

			// Note: afterPaste is fired asynchronously, but we can test editor data immediately.
			assert.areSame( '<p>This is an<a href="https://foo.bar/g/200/300">https://foo.bar/g/200/300</a> embed</p>', bot.getData() );

			wait( function() {
				assert.areSame( '<p>This is an</p><div data-oembed-url="https://foo.bar/g/200/300"><img src="https://foo.bar/g/200/300" /></div><p>embed</p>', bot.getData() );
			}, 200 );
		} );
	},

	'test embedding when request failed': function() {
		var bot = this.editorBot;
		jsonpCallback = function( urlTemplate, urlParams, callback, errorCallback ) {
			errorCallback();
		};

		bot.setData( '', function() {
			bot.editor.focus();
			this.editor.execCommand( 'paste', 'https://foo.bar/g/200/302' );

			// Note: afterPaste is fired asynchronously, but we can test editor data immediately.
			assert.areSame(
				'<p><a href="https://foo.bar/g/200/302">https://foo.bar/g/200/302</a></p>',
				bot.getData( 1 ),
				'link was pasted correctly'
			);

			wait( function() {
				assert.areSame(
					'<p><a href="https://foo.bar/g/200/302">https://foo.bar/g/200/302</a></p>',
					bot.getData( 1 ),
					'link was not auto embedded'
				);
			}, 200 );
		} );
	},

	'test when user splits the link before the request is finished': function() {
		var bot = this.editorBot;

		bot.setData( '', function() {
			bot.editor.focus();
			this.editor.execCommand( 'paste', 'https://foo.bar/g/200/304' );

			// Note: afterPaste is fired asynchronously, but we can test editor data immediately.
			assert.areSame( '<p><a href="https://foo.bar/g/200/304">https://foo.bar/g/200/304</a></p>', bot.getData( 1 ) );

			var range = this.editor.createRange();
			range.setStart( this.editor.editable().findOne( 'a' ).getFirst(), 5 );
			range.setEnd( this.editor.editable().findOne( 'a' ).getFirst(), 8 );
			this.editor.getSelection().selectRanges( [ range ] );
			this.editor.execCommand( 'enter' );

			assert.areSame(
				'<p><a href="https://foo.bar/g/200/304">https</a></p><p><a href="https://foo.bar/g/200/304">foo.bar/g/200/304</a></p>',
				bot.getData(),
				'enter key worked'
			);

			// It is not clear what should happen when the link was split, so we decided to embed only the first part.
			wait( function() {
				assert.areSame(
					'<div data-oembed-url="https://foo.bar/g/200/304"><img src="https://foo.bar/g/200/304" /></div>' +
					'<p><a href="https://foo.bar/g/200/304">foo.bar/g/200/304</a></p>',
					bot.getData( 1 ),
					'the first part of the link was auto embedded'
				);
			}, 200 );
		} );
	},

	// #13420.
	'test link with encodable characters': function() {
		var links = [
			// Mind that links differ in a part g/200/3xx so it is easier and faster
			// to check which link failed the test.

			// Pasting a link alone:
			// No encoding:
			'https://foo.bar/g/200/301?foo="æåãĂĄ"',

			// Partially encoded:
			'https://foo.bar/g/200/302?foo=%22%20æåãĂĄ%22',

			// Fully encoded:
			'https://foo.bar/g/200/303?foo=%22%20%C3%A6%C3%A5%C3%A3%C4%82%C4%84%22',

			// Encoded twice:
			'https://foo.bar/g/200/304?foo=%2522%2520%25C3%25A6%25C3%25A5%25C3%25A3%25C4%2582%25C4%2584%2522',

			// &amp; not encoded:
			'https://foo.bar/g/200/305?foo="æåãĂĄ"&bar=bar',

			// &amp; encoded:
			'https://foo.bar/g/200/306?foo="æåãĂĄ"&amp;bar=bar',

			// Pasting <a> element:
			// &amp;:
			'<a href="https://foo.bar/g/200/307?foo=%20æåãĂĄ%20&amp;bar=bar">https://foo.bar/g/200/307?foo=%20æåãĂĄ%20&amp;bar=bar</a>',

			// Quote sign:
			'<a href="https://foo.bar/g/200/310?foo=&quot;æåãĂĄ&quot;">https://foo.bar/g/200/310?foo=&quot;æåãĂĄ&quot;</a>',
			'<a href="https://foo.bar/g/200/310?foo=%22æåãĂĄ%22">https://foo.bar/g/200/310?foo="æåãĂĄ"</a>',
			'<a href="https://foo.bar/g/200/311?foo=%22æåãĂĄ%22">https://foo.bar/g/200/311?foo=%22æåãĂĄ%22</a>',

			// Mixed encoding:
			'<a href="https://foo.bar/g/200/312?foo=%22%20%C3%A6%C3%A5%C3%A3%C4%82%C4%84%22">https://foo.bar/g/200/312?foo=%22%20æåãĂĄ%22</a>'
		];

		for ( var i = 0; i < links.length; i++ ) {
			testIsEmbedded.call( this, links[i] );
		}
	},

	'test uppercase link is auto embedded': function() {
		var pastedText = '<A href="https://foo.bar/bom">https://foo.bar/bom</A>',
			expected = /^<a data-cke-autoembed="\d+" href="https:\/\/foo.bar\/bom">https:\/\/foo.bar\/bom<\/a>$/;

		assertPasteEvent( this.editor, { dataValue: pastedText }, function( data ) {
			// Use prepInnerHtml to make sure attr are sorted.
			assert.isMatching( expected, bender.tools.html.prepareInnerHtmlForComparison( data.dataValue ) );
		} );
	},

	'test link with attributes is auto embedded': function() {
		var pastedText = '<a id="kitty" name="colonelMeow" href="https://foo.bar/bom">https://foo.bar/bom</a>',
			expected = /^<a data-cke-autoembed="\d+" href="https:\/\/foo.bar\/bom" id="kitty" name="colonelMeow">https:\/\/foo.bar\/bom<\/a>$/;

		assertPasteEvent( this.editor, { dataValue: pastedText }, function( data ) {
			// Use prepInnerHtml to make sure attr are sorted.
			assert.isMatching( expected, bender.tools.html.prepareInnerHtmlForComparison( data.dataValue ) );
		} );
	},

	'test anchor is not auto embedded': function() {
		var pastedText = '<a id="foo">Not a link really.</a>';

		assertPasteEvent( this.editor, { dataValue: pastedText }, { dataValue: pastedText, type: 'html' } );
	},

	// Because it means that user copied a linked text, not a link.
	'test link with text different than its href is not auto embedded': function() {
		var pastedText = '<a href="https://foo.bar/g/300/300">Foo bar.</a>';

		assertPasteEvent( this.editor, { dataValue: pastedText }, { dataValue: pastedText, type: 'html' } );
	},

	'test 2 step undo': function() {
		var bot = this.editorBot,
			editor = bot.editor,
			pastedText = 'https://foo.bar/g/200/382',
			finalData = '<p>foo</p><div data-oembed-url="' + pastedText + '"><img src="' + pastedText + '" /></div><p>bar</p>',
			linkData = '<p>foo<a href="' + pastedText + '">' + pastedText + '</a>bar</p>',
			initialData = '<p>foobar</p>';

		bot.setData( '', function() {
			editor.focus();
			bender.tools.selection.setWithHtml( editor, '<p>foo{}bar</p>' );
			editor.resetUndo();

			editor.execCommand( 'paste', pastedText );

			wait( function() {
				assert.areSame( finalData, editor.getData(), 'start' );

				editor.execCommand( 'undo' );
				assert.areSame( linkData, editor.getData(), 'after 1st undo' );

				editor.execCommand( 'undo' );
				assert.areSame( initialData, editor.getData(), 'after 2nd undo' );

				assert.areSame( CKEDITOR.TRISTATE_DISABLED, editor.getCommand( 'undo' ).state, 'undo is disabled' );

				editor.execCommand( 'redo' );
				assert.areSame( linkData, editor.getData(), 'after 1st redo' );

				editor.execCommand( 'redo' );
				assert.areSame( finalData, editor.getData(), 'after 2nd redo' );

				assert.areSame( CKEDITOR.TRISTATE_DISABLED, editor.getCommand( 'redo' ).state, 'redo is disabled' );
			}, 200 );
		} );
	},

	'test internal paste is not auto embedded - text URL': function() {
		var	editor = this.editor,
			pastedText = 'https://foo.bar/g/185/310';

		this.editor.once( 'paste', function( evt ) {
			evt.data.dataTransfer.sourceEditor = editor;
		}, null, null, 1 );

		this.editor.once( 'paste', function( evt ) {
			evt.cancel();
			assert.areSame( pastedText, evt.data.dataValue );
		}, null, null, 900 );

		this.editor.execCommand( 'paste', pastedText );
	},

	'test internal paste is not auto embedded - link': function() {
		var	editor = this.editor,
			pastedText = '<a href="https://foo.bar/g/185/310">https://foo.bar/g/185/310</a>';

		this.editor.once( 'paste', function( evt ) {
			evt.data.dataTransfer.sourceEditor = editor;
		}, null, null, 1 );

		this.editor.once( 'paste', function( evt ) {
			evt.cancel();
			assert.areSame( pastedText, evt.data.dataValue );
		}, null, null, 900 );

		this.editor.execCommand( 'paste', pastedText );
	}
} );
