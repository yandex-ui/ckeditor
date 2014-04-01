/**
 * @license Copyright (c) 2003-2014, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or http://ckeditor.com/license
 */

 /**
 * @fileOverview Rich code snippets for CKEditor.
 */

'use strict';

( function() {

	CKEDITOR.plugins.add( 'codesnippet', {
		requires: 'widget,dialog',
		lang: 'en', // %REMOVE_LINE_CORE%
		icons: 'codesnippet',
		hidpi: true,

		onLoad: function( editor ) {
			CKEDITOR.addCss( '.cke_snippet_wrapper{' +
				'font-family:monospace;' +
				'background:#fafafa;' +
				'border-top:1px solid #ccc;' +
				'border-bottom:1px solid #ccc;' +
			'}' +
			'.cke_snippet_wrapper > pre{' +
				'margin:0px auto;' +
				'padding:10px' +
			'}' );
			CKEDITOR.dialog.add( 'codeSnippet', this.path + 'dialogs/codesnippet.js' );
		},

		afterInit: function( editor ) {
			ensurePluginNamespaceExists( editor );
			registerWidget( editor );

			editor.ui.addButton && editor.ui.addButton( 'CodeSnippet', {
				label: editor.lang.codesnippet.button,
				command: 'codeSnippet',
				toolbar: 'insert,10'
			} );

			// At the very end, if no custom highlighter was set so far (by plugin#setHighlighter)
			// we will set default one.
			if ( !editor._.codesnippet.highlighter ) {
				CKEDITOR.plugins.codesnippet.setDefaultHighlighter( editor );

				var path = CKEDITOR.getUrl( this.path ),
					cssCode = path + 'lib/highlight/styles/' + ( editor.config.codeSnippet_template || 'default' ) + '.css';

				if ( editor._.codesnippet.highlighter == defaultHighlighter && !window.hljs && isBrowserSupported ) {
					// Inserting required styles/javascript.
					// Default highlighter was not changed, and hljs is not available, so
					// it wasn't inserted to the document.
					CKEDITOR.scriptLoader.load( path + 'lib/highlight/highlight.pack.js' );
				}

				// Adding css file to config.contentsCss, such logic will most likely
				// go to editor soon with issue #11532.
				if ( editor.config.contentsCss ) {
					if ( CKEDITOR.tools.isArray( editor.config.contentsCss ) )
						editor.config.contentsCss.push( cssCode );
					else
						editor.config.contentsCss = [ cssCode, editor.config.contentsCss ];
				} else
					editor.config.contentsCss = [ cssCode ];
			}
		}
	} );

	/**
	 * Public API for codesnippet plugin. You are able to set a custom syntax highlighters using
	 * {@link CKEDITOR.plugins.codesnippet#setHighlighter setHighlighter} method. You can also
	 * restore original highlighter by calling
	 * {@link CKEDITOR.plugins.codesnippet#setDefaultHighlighter setDefaultHighlighter}
	 *
	 * @since 4.4
	 * @class CKEDITOR.plugins.codesnippet
	 */
	CKEDITOR.plugins.codesnippet = {
		/**
		 * Sets custom syntax highlighter function.
		 * @member CKEDITOR.plugins.codesnippet
		 * @param {CKEDITOR.editor} editor
		 * @param {Object} defaultLanguages Default languages for given highlighter.
		 *
		 * **Note:** if {@link CKEDITOR.config.codeSnippet_langs} is set, **it will
		 * overwrite** languages given in this variable.
		 * @param {Function} highlightHandlerFn
		 *
		 *	Function `highlightHandlerFn` takes 3 parameters:
		 *
		 *	* code - string - plain text code to be formatted
		 *	* lang - string - language identifier taken from {@link CKEDITOR.config.codeSnippet_langs}
		 *	* callback - function - function which takes a string as an argument and writes it as output inside of a snippet widget
		 */
		setHighlighter: function( editor, languages, highlightHandlerFn ) {
			ensurePluginNamespaceExists( editor );
			var codeSnippetScope = editor._.codesnippet;

			codeSnippetScope.highlighter = highlightHandlerFn;
			codeSnippetScope.langs = editor.config.codeSnippet_langs ? editor.config.codeSnippet_langs : languages;
			// We might escape special regex chars below, but we expect that there should be no crazy values used
			// as lang keys.
			codeSnippetScope.langsRegex = new RegExp( '(?:^|\\s)language-(' + CKEDITOR.tools.objectKeys( codeSnippetScope.langs ).join( '|' ) + ')(?:\\s|$)' );
		},

		/**
		 * Restores default syntax highlighter for the plugin, which by default
		 * is highlight.js library.
		 *
		 * @member CKEDITOR.plugins.codesnippet
		 * @param {CKEDITOR.editor} editor
		 */
		setDefaultHighlighter: function( editor ) {
			this.setHighlighter( editor, defaults, defaultHighlighter );
		}
	};

	// Default languages object.
	var defaultHighlighter = function( code, lang, callback ) {
			if ( !isBrowserSupported )
				return;

			var hljs = window.hljs,
				// Ensure that language is supported by hljs.
				snippetLang = hljs.getLanguage( lang ) ? [ lang ] : undefined,
				result = hljs.highlightAuto( code, snippetLang );

			if ( result )
				callback( result.value );
		},
		defaults = {
			bash: 'Bash',
			cs: 'C#',
			ruby: 'Ruby',
			diff: 'Diff',
			javascript: 'JavaScript',
			xml: 'XML',
			markdown: 'Markdown',
			css: 'CSS',
			http: 'HTTP',
			java: 'Java',
			php: 'PHP',
			python: 'Python',
			sql: 'SQL',
			ini: 'INI',
			perl: 'Perl',
			objectivec: 'Objective-C',
			coffeescript: 'CoffeeScript',
			nginx: 'Nginx',
			json: 'JSON',
			apache: 'Apache',
			cpp: 'C++',
			makefile: 'Makefile'
		},
		isBrowserSupported = !CKEDITOR.env.ie || CKEDITOR.env.version > 8;

	// Encapsulates snippet widget registration code.
	// @param {CKEDITOR.editor} editor
	function registerWidget( editor ) {

		var preClass = editor.config.codeSnippet_class || 'hljs',
			newLineRegex = /\r?\n/g;

		editor.widgets.add( 'codeSnippet', {
			allowedContent: 'pre; code(language-*)',
			template: '<div class="cke_snippet_wrapper"><pre class="' + preClass + '"></pre></div>',
			dialog: 'codeSnippet',
			mask: true,
			defaults: {
				lang: '',
				code: ''
			},

			parts: {
				pre: 'pre'
			},

			doReformat: function() {
				var that = this,
					widgetData = this.data,
					callback = function( formattedCode ) {
						if ( isBrowserSupported )
							that.parts.pre.setHtml( formattedCode );
						else {
							/**
							 * IE8 (not supported browser) have issue with new line chars, when using innerHTML.
							 * It will simply strip it.
							 */
							that.parts.pre.$.innerHTML = formattedCode.replace( newLineRegex, '<br>' );
						}
					};
				// Set plain code first, so even if custom handler will not call it the code will be there.
				callback( CKEDITOR.tools.htmlEncode( widgetData.code ) );
				// Call higlighter to apply its custom highlighting.
				editor._.codesnippet.highlighter( widgetData.code, widgetData.lang, callback );
			},

			data: function( evt ) {
				var curData = evt.data;

				if ( curData.code )
					this.parts.pre.setHtml( CKEDITOR.tools.htmlEncode( curData.code ) );
				// Lang needs to be specified in order to apply formatting.
				if ( curData.lang )
					this.doReformat();
			},

			// Upcasts <pre><code [class="language-*"]>...</code></pre>
			upcast: function( el, data ) {
				var elClassAttr = el.attributes[ 'class' ],
					// Note, here we assume that it's code, we'll validate it
					// few lines later.
					childrenArray = getNonEmptyChildren( el ),
					code,
					matchResult;

				if ( el.name != 'pre' || childrenArray.length !== 1 || childrenArray[ 0 ].name != 'code' )
					return;

				code = childrenArray[ 0 ];

				// Read language-* from <code> class attribute.
				matchResult = editor._.codesnippet.langsRegex.exec( code.attributes[ 'class' ] );
				if ( matchResult )
					data.lang = matchResult[ 1 ];

				data.code = code.getHtml();
				el.attributes[ 'class' ] = elClassAttr ? elClassAttr + ' ' + preClass : preClass;

				// Remove <code>. The internal form is <pre>.
				code.replaceWithChildren();

				// Wrap <pre> with wrapper. It is to hold bar, etc.
				return el.wrapWith( new CKEDITOR.htmlParser.element( 'div', {
					'class': 'cke_snippet_wrapper'
				} ) );
			},

			// Downcasts to <pre><code [class="language-*"]>...</code></pre>
			downcast: function( el ) {
				var retPreElement = new CKEDITOR.htmlParser.element( 'pre' ),
					code = new CKEDITOR.htmlParser.element( 'code' ),
					encodedSnippetCode = CKEDITOR.tools.htmlEncode( this.data.code );

				retPreElement.add( code );
				code.add( new CKEDITOR.htmlParser.text( encodedSnippetCode ) );

				if ( this.data.lang )
					code.attributes[ 'class' ] = 'language-' + this.data.lang;

				return retPreElement;
			}
		} );

		// Returns **array** of children elements, with whitespace-only text nodes
		// filtered out.
		// @param {CKEDITOR.htmlParser.element} parentElement
		// @return Array - array of CKEDITOR.htmlParser.node
		var whitespaceOnlyRegex = /^[\s\n\r]*$/,
			getNonEmptyChildren = function( parentElement ) {
				var ret = [],
					preChildrenList = parentElement.children,
					curNode;

				// Filter out empty text nodes.
				for ( var i = preChildrenList.length-1; i >= 0; i-- ) {
					curNode = preChildrenList[ i ];

					if ( curNode.type  == CKEDITOR.NODE_TEXT && curNode.value.match( whitespaceOnlyRegex ) )
						continue;

					ret.push( curNode );
				}

				return ret;
			};
	}

	function ensurePluginNamespaceExists( editor ) {
		// Create a protected namespace if it's not already there.
		if ( !editor._.codesnippet )
			editor._.codesnippet = {};
	}
} )();

/**
 * Allows to setup custom class for pre element inside editor editable.
 *
 * @since 4.4
 * @cfg {String} [codeSnippet_class='hljs']
 * @member CKEDITOR.config
 */

/**
 * Allows to set a template for highlihgt.js, you can browse templates at http://highlightjs.org/static/test.html
 *
 *		config.codeSnippet_template = 'pojoaque';
 *
 * @since 4.4
 * @cfg {String} [codeSnippet_template='default']
 * @member CKEDITOR.config
 */

/**
 * An object listing available languages.
 *
 *		config.codeSnippet_langs = {
 *			javascript: 'JavaScript',
 *			php: 'PHP'
 *		};
 *
 * @since 4.4
 * @cfg {Object} [codeSnippet_langs=null]
 * @member CKEDITOR.config
 */

/**
 * Tabulation string used in codesnippet edit dialog. Common values are 4x space/ tab character.
 *
 *		config.codeSnippet_tabulation = "\t";
 *
 * @since 4.4
 * @cfg {Object} [codeSnippet_tabulation="    "]
 * @member CKEDITOR.config
 */