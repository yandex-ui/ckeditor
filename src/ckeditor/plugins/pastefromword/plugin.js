﻿/*
Copyright (c) 2003-2011, CKSource - Frederico Knabben. All rights reserved.
For licensing, see LICENSE.html or http://ckeditor.com/license
*/ ( function() {
	CKEDITOR.plugins.add( 'pastefromword', {
		requires: [ 'clipboard' ],

		init: function( editor ) {
			var commandName = 'pastefromword',
				// Flag indicate this command is actually been asked instead of a generic pasting.
				forceFromWord = 0,
				path = this.path;

			editor.addCommand( commandName, {
				// Snapshots are done manually by editable.insertXXX methods.
				canUndo: false,
				async: true,

				exec: function( editor ) {
					var cmd = this;

					forceFromWord = 1;
					editor.on( 'beforePaste', forceHtmlMode );

					editor.getClipboardData( function( data ) {
						data && editor.fire( 'paste', { type: 'html', data: data.data } );

						editor.fire( 'afterCommandExec', {
							name: commandName,
							command: cmd,
							returnValue: !!data
						});
					});
				}
			});

			// Register the toolbar button.
			editor.ui.addButton( 'PasteFromWord', {
				label: editor.lang.pastefromword.toolbar,
				command: commandName
			});

			editor.on( 'pasteState', function( evt ) {
				editor.getCommand( commandName ).setState( evt.data );
			});

			// Features bring by this command beside the normal process:
			// 1. No more bothering of user about the clean-up.
			// 2. Perform the clean-up even if content is not from MS-Word.
			// (e.g. from a MS-Word similar application.)
			// 3. Listen with high priority (3), so clean up is done before content
			// type sniffing (priority = 6).
			editor.on( 'paste', function( evt ) {
				var data = evt.data,
					mswordHtml = data.data;

				// MS-WORD format sniffing.
				if ( mswordHtml && ( forceFromWord || ( /(class=\"?Mso|style=\"[^\"]*\bmso\-|w:WordDocument)/ ).test( mswordHtml ) ) ) {
					// If filter rules aren't loaded then cancel 'paste' event,
					// load them and when they'll get loaded fire new paste event
					// for which data will be filtered in second execution of
					// this listener.
					var isLazyLoad = loadFilterRules( path, function() {
						// Event continuation with the original data.
						if ( isLazyLoad )
							editor.fire( 'paste', data );
						else if ( !editor.config.pasteFromWordPromptCleanup || ( forceFromWord || confirm( editor.lang.pastefromword.confirmCleanup ) ) ) {
							data.data = CKEDITOR.cleanWord( mswordHtml, editor );
						}
					});

					// The cleanup rules are to be loaded, we should just cancel
					// this event.
					isLazyLoad && evt.cancel();
				}
			}, null, null, 3 );

			function resetFromWord( evt ) {
				evt && evt.removeListener();
				editor.removeListener( 'beforePaste', forceHtmlMode );
				forceFromWord && setTimeout( function() {
					forceFromWord = 0;
				}, 0 );
			};
		}

	});

	function loadFilterRules( path, callback ) {
		var isLoaded = CKEDITOR.cleanWord;

		if ( isLoaded )
			callback();
		else {
			var filterFilePath = CKEDITOR.getUrl( CKEDITOR.config.pasteFromWordCleanupFile || ( path + 'filter/default.js' ) );

			// Load with busy indicator.
			CKEDITOR.scriptLoader.load( filterFilePath, callback, null, true );
		}

		return !isLoaded;
	}

	function forceHtmlMode( evt ) {
		evt.data.type = 'html';
	}
})();


/**
 * Whether to prompt the user about the clean up of content being pasted from
 * MS Word.
 * @name CKEDITOR.config.pasteFromWordPromptCleanup
 * @since 3.1
 * @type Boolean
 * @default undefined
 * @example
 * config.pasteFromWordPromptCleanup = true;
 */

/**
 * The file that provides the MS Word cleanup function for pasting operations.
 * Note: This is a global configuration shared by all editor instances present
 * in the page.
 * @name CKEDITOR.config.pasteFromWordCleanupFile
 * @since 3.1
 * @type String
 * @default 'default'
 * @example
 * // Load from 'pastefromword' plugin 'filter' sub folder (custom.js file).
 * CKEDITOR.config.pasteFromWordCleanupFile = 'custom';
 */
