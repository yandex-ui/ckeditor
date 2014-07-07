/* bender-tags: editor,unit */

( function() {
	'use strict';

	bender.test( {
		'test editor#ariaEditorHelpLabel event - responded': function() {
			var fired = 0;

			bender.editorBot.create( {
				name: 'editor1',
				config: {
					extraPlugins: 'toolbar',
					removePlugins: 'a11yhelp',
					on: {
						pluginsLoaded: function() {
							this.on( 'ariaEditorHelpLabel', function( evt ) {
								evt.data.label = 'foo';
								fired += 1;
							} );
						}
					}
				}
			}, function( bot ) {
				var editor = bot.editor,
					iframe = editor.window.getFrame(),
					describedBy = iframe.getAttribute( 'aria-describedby' );

				assert.areSame( 1, fired, 'event was fired once' );
				assert.isNotNull( describedBy, 'iframe has aria-describedby attribute' );
				var label = editor.ui.space( 'contents' ).findOne( '#' + describedBy );
				assert.isNotNull( label, 'label element exists within top space' );
				assert.areSame( 'foo', label.getHtml(), 'label\'s content' );
				if ( CKEDITOR.env.ie )
					assert.areSame( editor.title + ', foo', iframe.getAttribute( 'title' ), 'on IE title contains label' );
			} );
		},

		'test editor#ariaEditorHelpLabel event - not responded': function() {
			var fired = 0;

			bender.editorBot.create( {
				name: 'editor2',
				config: {
					extraPlugins: 'toolbar',
					removePlugins: 'a11yhelp',
					on: {
						pluginsLoaded: function() {
							this.on( 'ariaEditorHelpLabel', function( evt ) {
								fired += 1;
							} );
						}
					}
				}
			}, function( bot ) {
				var editor = bot.editor,
					describedBy = editor.window.getFrame().getAttribute( 'aria-describedby' );

				assert.areSame( 1, fired, 'event was fired once' );
				assert.isNull( describedBy, 'iframe does not have aria-describedby attribute' );
			} );
		}
	} );
} )();