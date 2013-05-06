﻿/**
 * @license Copyright (c) 2003-2013, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or http://ckeditor.com/license
 */

/**
 * @fileOverview Increase and decrease indent commands.
 */

(function() {
	'use strict';

	CKEDITOR.plugins.add( 'indent', {
		lang: 'af,ar,bg,bn,bs,ca,cs,cy,da,de,el,en-au,en-ca,en-gb,en,eo,es,et,eu,fa,fi,fo,fr-ca,fr,gl,gu,he,hi,hr,hu,is,it,ja,ka,km,ko,ku,lt,lv,mk,mn,ms,nb,nl,no,pl,pt-br,pt,ro,ru,sk,sl,sr-latn,sr,sv,th,tr,ug,uk,vi,zh-cn,zh', // %REMOVE_LINE_CORE%
		icons: 'indent,indent-rtl,outdent,outdent-rtl', // %REMOVE_LINE_CORE%

		init: function( editor ) {
			var that = this;

			// Register commands.
			editor.addCommand( 'indent', new CKEDITOR.plugins.indent.genericDefinition( editor, 'indent' ) ).setupListeners(),
			editor.addCommand( 'outdent', new CKEDITOR.plugins.indent.genericDefinition( editor, 'outdent' ) ).setupListeners();

			// Register dirChanged listener.
			editor.on( 'dirChanged', function( e ) {
				var range = editor.createRange();
				range.setStartBefore( e.data.node );
				range.setEndAfter( e.data.node );

				var walker = new CKEDITOR.dom.walker( range ),
					node;

				while ( ( node = walker.next() ) ) {
					if ( node.type == CKEDITOR.NODE_ELEMENT ) {
						// A child with the defined dir is to be ignored.
						if ( !node.equals( e.data.node ) && node.getDirection() ) {
							range.setStartAfter( node );
							walker = new CKEDITOR.dom.walker( range );
							continue;
						}

						// Switch alignment classes.
						var classes = editor.config.indentClasses;
						if ( classes ) {
							var suffix = ( e.data.dir == 'ltr' ) ? [ '_rtl', '' ] : [ '', '_rtl' ];
							for ( var i = 0; i < classes.length; i++ ) {
								if ( node.hasClass( classes[ i ] + suffix[ 0 ] ) ) {
									node.removeClass( classes[ i ] + suffix[ 0 ] );
									node.addClass( classes[ i ] + suffix[ 1 ] );
								}
							}
						}

						// Switch the margins.
						var marginLeft = node.getStyle( 'margin-right' ),
							marginRight = node.getStyle( 'margin-left' );

						marginLeft ? node.setStyle( 'margin-left', marginLeft ) : node.removeStyle( 'margin-left' );
						marginRight ? node.setStyle( 'margin-right', marginRight ) : node.removeStyle( 'margin-right' );
					}
				}
			});
		}
	});

	CKEDITOR.plugins.indent = {
		/**
		 * A base class for generic command definition, mainly responsible for creating indent
		 * UI buttons, and refreshing UI states.
		 *
		 * Commands of this class do not perform any indentation itself. They
		 * delegate job to content-specific indentation commands (i.e. indentlist).
		 *
		 * @class CKEDITOR.plugins.indent.indentCommand
		 * @param {CKEDITOR.editor} editor The editor instance this command will be
 		 * related to.
		 * @param {String} name Name of the command.
		 */
		genericDefinition: function( editor, name ) {
			this.name = name;
			this.isIndent = this.name == 'indent';
			this.editor = editor;

			// Create and register toolbar button if possible.
			if ( editor.ui.addButton ) {
				editor.ui.addButton( name.charAt( 0 ).toUpperCase() + name.slice( 1 ), {
					label: editor.lang.indent[ name ],
					command: name,
					directional: true,
					toolbar: 'indent,' + ( this.isIndent ? '20' : '10' )
				});
			}
		},

		/**
		 * A base class for specific indentation command definitions responsible for
		 * handling a limited set of elements i.e. indentlist or indentblock.
		 *
		 * Commands of this class perform real indentation and modify DOM structure.
		 * They observe events fired by {@link CKEDITOR.plugins.indent.indentCommand}
		 * and perform defined actions.
		 *
		 * @class CKEDITOR.plugins.indent.indentSomeCommand
		 * @param {CKEDITOR.editor} editor The editor instance this command will be
 		 * related to.
		 * @param {String} name Name of the command.
		 */
		specificDefinition: function( editor, name ) {
			this.name = name;
			this.editor = editor;
			this.isIndent = !!~this.name.indexOf( 'indent' );
			this.execPriority = 10;
			this.setupIndentClasses();
		},

		/**
		 * Registers content-specific commands as a part of indentation system
		 * directed by generic commands. Since a command is registered,
		 * it observes for events of a related generic command.
		 *
		 *		CKEDITOR.plugins.indent.registerCommands( editor, {
		 *			'indentlist': new indentListCommand( editor, 'indentlist' ),
		 *			'outdentlist': new indentListCommand( editor, 'outdentlist' )
		 *		});
		 *
		 * Content-specific commands listen on generic command's `exec` and
		 * try to execute itself, one after another. If some execution is
		 * successful, `event.data.done` is set so no more commands are involved.
		 *
		 * Content-specific commands also listen on generic command's `refresh`
		 * and fill `event.data.states` object with own states. A generic command
		 * uses these data to determine own state and update UI.
		 *
		 * @member CKEDITOR.plugins.indent
		 * @param {CKEDITOR.editor} editor The editor instance this command is
 		 * related to.
		 * @param {Object} commands An object of {@link CKEDITOR.command}.
		 */
		registerCommands: function( editor, commands ) {
			var that = this;

			function setupListeners( editor, command ) {
				// Get generic command associated with this specific command.
				var related = editor.getCommand( command.isIndent ? 'indent' : 'outdent' );

				// Observe generic exec event and execute command when necessary.
				// If the command was successfully handled by the command and
				// DOM has been modified, stop event propagation so no other plugin
				// will bother. Job is done.
				related.on( 'exec', function( event ) {
					if ( event.data.done )
						return;

					if ( editor.execCommand( command.name ) )
						event.data.done = true;

					// Clean up the markers.
					CKEDITOR.dom.element.clearAllMarkers( command.database );
				}, this, null, command.execPriority );

				// Observe generic refresh event and force command refresh.
				// Once refreshed, save command state in event data
				// so generic command plugin can update its own state and UI.
				related.on( 'refresh', function( event ) {
					command.refresh( editor, event.data.path );

					if ( !event.data.states )
						event.data.states = {};

					event.data.states[ command.name ] = command.state;
				});

				// Since specific indent commands have no UI elements,
				// they need to be manually registered as a editor feature.
				// Doing this a this stage.
				editor.addFeature( command );
			}

			editor.on( 'loaded', function() {
				for ( var name in commands )
					setupListeners( editor, this.addCommand( name, commands[ name ] ) );
			} );
		}
	}

	CKEDITOR.plugins.indent.genericDefinition.prototype = {
		context: 'p',

		exec: function() {},

		/**
		 * Attaches event listeners for this generic command. Since indentation
		 * system is event-oriented, generic commands communicate with
		 * content-specific commands using own `exec` and `refresh` events.
		 *
		 * Listener priorities are crucial. Different indentation phases
		 * are executed whit different priorities.
		 *
		 * For `exec` event:
		 *
		 * * 0: Selection and bookmarks are saved by generic command.
		 * * 1-19: Content-specific commands try to indent the code by executing
		 * 	 own {@link CKEDITOR.command#method-exec} methods.
		 * * 20: Bookmarks are re-selected by generic command.
		 *
		 * For `refresh` event:
		 *
		 * * <20: Content-specific commands refresh their states according
		 * 	 to the given path by executing {@link CKEDITOR.command#method-refresh}.
		 * 	 They save their states in `event.data.states` object passed along.
		 * 	 with the event.
		 * * 20: Command state is determined according to what states
		 * 	 have been returned by content-specific commands (`event.data.states`).
		 * 	 UI elements are updated at this stage.
		 */
		setupListeners: function() {
			var editor = this.editor,
				selection, bookmarks;

			// Set the command state according to content-specific
			// command states.
			this.on( 'refresh', function( event ) {
				// If no state comes with event data, disable command.
				var states = [ CKEDITOR.TRISTATE_DISABLED ];

				for ( var s in event.data.states )
					states.push( event.data.states[ s ] );

				// Maybe a little bit shorter?
				if ( CKEDITOR.tools.search( states, CKEDITOR.TRISTATE_ON ) )
					this.setState( CKEDITOR.TRISTATE_ON );
				else if ( CKEDITOR.tools.search( states, CKEDITOR.TRISTATE_OFF ) )
					this.setState( CKEDITOR.TRISTATE_OFF );
				else
					this.setState( CKEDITOR.TRISTATE_DISABLED );
			}, this, null, 20 );

			// Initialization. Save bookmarks and mark event as not handled
			// by any plugin (command) yet.
			this.on( 'exec', function( event ) {
				selection = editor.getSelection();
				bookmarks = selection.createBookmarks( 1 );

				// Mark execution as not handled yet.
				if ( !event.data )
					event.data = {};

				event.data.done = false;
			}, this, null, 0 );

			// Housekeeping. Make sure selectionChange will be called.
			// Also re-select previously saved bookmarks.
			this.on( 'exec', function( event ) {
				editor.forceNextSelectionCheck();
				selection.selectBookmarks( bookmarks );
			}, this, null, 20 );
		}
	};

	CKEDITOR.plugins.indent.specificDefinition.prototype = {
		context: 'p',

		/**
		 * Stores created markers for all command instances so they can eventually be
		 * purged once command is done.
		 */
		database: {},

		/**
		 * Generic indentation procedure for any element shared across
		 * content-specific indentation commands.
		 *
		 *		// Indent element of id equal foo
		 *		var element = CKEDITOR.document.getById( 'foo' );
		 *		command.indentElement( element );
		 *
		 * @param {CKEDITOR.dom.element} element An element to be indented.
		 * @param {String} [dir] Element direction.
		 * @returns {Boolean}
		 */
		indentElement: function( element, dir ) {
			if ( element.getCustomData( 'indent_processed' ) )
				return false;

			var editor = this.editor;

			if ( this.useIndentClasses ) {
				// Transform current class f to indent step index.
				var indentClass = element.$.className.match( this.classNameRegex ),
					indentStep = 0;
				if ( indentClass ) {
					indentClass = indentClass[ 1 ];
					indentStep = this.indentClassMap[ indentClass ];
				}

				// Operate on indent step index, transform indent step index back to class
				// name.
				if ( !this.isIndent )
					indentStep--;
				else
					indentStep++;

				if ( indentStep < 0 )
					return false;

				indentStep = Math.min( indentStep, this.indentClasses.length );
				indentStep = Math.max( indentStep, 0 );
				element.$.className = CKEDITOR.tools.ltrim( element.$.className.replace( this.classNameRegex, '' ) );

				if ( indentStep > 0 )
					element.addClass( this.indentClasses[ indentStep - 1 ] );
			} else {
				var indentCssProperty = this.getIndentCssProperty( element, dir ),
					currentOffset = parseInt( element.getStyle( indentCssProperty ), 10 ),
					indentOffset = editor.config.indentOffset || 40;

				if ( isNaN( currentOffset ) )
					currentOffset = 0;

				currentOffset += ( this.isIndent ? 1 : -1 ) * indentOffset;

				if ( currentOffset < 0 )
					return false;

				currentOffset = Math.max( currentOffset, 0 );
				currentOffset = Math.ceil( currentOffset / indentOffset ) * indentOffset;

				element.setStyle( indentCssProperty, currentOffset ? currentOffset + ( editor.config.indentUnit || 'px' ) : '' );

				if ( element.getAttribute( 'style' ) === '' )
					element.removeAttribute( 'style' );
			}

			CKEDITOR.dom.element.setMarker( this.database, element, 'indent_processed', 1 );

			return true;
		},

		/**
		 * Method that checks if current indentation level for an element
		 * reached the limit determined by {@link CKEDITOR.config#indentClasses}.
		 *
		 * @param {CKEDITOR.dom.element} node An element to be checked.
		 * @returns {Boolean}
		 */
		checkIndentClassLeft: function( node ) {
			var indentClass = node.$.className.match( this.classNameRegex ),
				extraConditions = this.indentClassLeftConditions,
				indentStep = 0;

			// If node has one of the indentClasses:
			//		\-> If it holds the topmost indentClass, then
			//		    no more classes have left.
			//		\-> If it holds any other indentClass, it can use the next one
			//		    or the previous one.
			//		\-> Outdent is always possible. We can remove indentClass.
			if ( indentClass ) {
				indentClass = indentClass[ 1 ];

				return this.isIndent ?
						this.indentClassMap[ indentClass ] != this.indentClasses.length
					:
						true;
			}

			// If node has no class which belongs to indentClasses,
			// then it is at 0-level. It can be indented but not outdented.
			else
				return this.isIndent;
		},

		/**
		 * Method that checks if the element path contains an element handled
		 * by this indentation command.
		 *
		 * @param {CKEDITOR.dom.elementPath} node A path to be checked.
		 * @returns {CKEDITOR.dom.element}
		 */
		getContext: function( path ) {
			return path.contains( this.indentContext );
		},

		/**
		 * Transfers the information about {@link CKEDITOR.config#indentClasses}
		 * to the command object so it's easy to access.
		 */
		setupIndentClasses: function() {
			/**
			 * Determines whether {@link CKEDITOR.config#indentClasses} are in use.
			 *
			 * @property {Boolean} useIndentClasses
			 * @member CKEDITOR.plugins.indent.indentSomeCommand
			 */

			/**
			 * A map of {@link CKEDITOR.config#indentClasses} used by indentation
			 * commands.
			 *
			 * @property {Boolean} indentClassMap
			 * @member CKEDITOR.plugins.indent.indentSomeCommand
			 */
			var editor = this.editor;

			this.indentClasses = editor.config.indentClasses;

			if ( ( this.useIndentClasses = this.indentClasses && this.indentClasses.length > 0 ) ) {
				this.classNameRegex = new RegExp( '(?:^|\\s+)(' + editor.config.indentClasses.join( '|' ) + ')(?=$|\\s)' );
				this.indentClassMap = {};

				for ( var i = 0; i < editor.config.indentClasses.length; i++ )
					this.indentClassMap[ editor.config.indentClasses[ i ] ] = i + 1;
			}
		},

		/**
		 * Determines indent CSS property for an element according to
		 * what is the direction of such element. It can be either `margin-left`
		 * or `margin-right`.
		 *
		 *		// Get indent CSS property of an element.
		 *		var element = CKEDITOR.document.getById( 'foo' );
		 *		command.getIndentCssProperty( element );	// 'margin-left'
		 *
		 * @param {CKEDITOR.dom.element} element An element to be checked.
		 * @param {String} [dir] Element direction.
		 * @returns {String}
		 */
		getIndentCssProperty: function( element, dir ) {
			return ( dir || element.getComputedStyle( 'direction' ) ) == 'ltr' ? 'margin-left' : 'margin-right';
		}
	};
})();

/**
 * Size of each indentation step.
 *
 *		config.indentOffset = 4;
 *
 * @cfg {Number} [indentOffset=40]
 * @member CKEDITOR.config
 */

/**
 * Unit for the indentation style.
 *
 *		config.indentUnit = 'em';
 *
 * @cfg {String} [indentUnit='px']
 * @member CKEDITOR.config
 */

/**
 * List of classes to use for indenting the contents. If it's `null`, no classes will be used
 * and instead the {@link #indentUnit} and {@link #indentOffset} properties will be used.
 *
 *		// Use the classes 'Indent1', 'Indent2', 'Indent3'
 *		config.indentClasses = ['Indent1', 'Indent2', 'Indent3'];
 *
 * @cfg {Array} [indentClasses=null]
 * @member CKEDITOR.config
 */
