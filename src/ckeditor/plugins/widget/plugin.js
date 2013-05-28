/**
 * @license Copyright (c) 2003-2012, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.html or http://ckeditor.com/license
 */

'use strict';

(function() {

	CKEDITOR.plugins.add( 'widget', {
		requires: 'dialog,menubutton',
		icons: 'widget',

		onLoad: function() {
			CKEDITOR.addCss(
				'.cke_widget_wrapper:hover{' +
					'outline:2px solid yellow;' +
					'cursor:default' +
				'}' +
				'.cke_widget_wrapper:hover .cke_widget_editable{' +
					'outline:2px solid yellow' +
				'}' +
				'.cke_widget_wrapper.cke_widget_focused{' +
					'outline:2px solid #ace' +
				'}' +
				'.cke_widget_selected{' +
					'background:rgba(170,205,240,.2)' +
				'}'
				// %REMOVE_START%
				+
				'.cke_widget_wrapper:hover:after{' +
					'content:"id: " attr(data-widget-id);' +
					'position:absolute;' +
					'top:0;' +
					'right:0;' +
					'padding:2px 4px;' +
					'background:#EEE;' +
					'border:solid 1px #DDD;' +
					'border-radius:2px;' +
					'color:#BBB;' +
					'font:bold 10px sans-serif' +
				'}'
				// %REMOVE_END%
			);
		},

		beforeInit: function( editor ) {
			editor.widgets = new Repository( editor );
		},

		afterInit: function( editor ) {
			addWidgetButtons( editor );
		}
	});

	/**
	 * @class CKEDITOR.plugins.widget.repository
	 * @mixins CKEDITOR.event
	 */
	function Repository( editor ) {
		this.editor = editor;
		this.registered = {};
		this.instances = {};
		this.selected = [];
		this.focused = null;
		this._ = {
			nextId: 0,
			upcasts: []
		};

		setupDataProcessing( this );
		setupWidgetsObserver( this );
		setupSelectionObserver( this );
		setupMouseObserver( this );
	}

	Repository.prototype = {
		/**
		 * Minimum interval between selection checks.
		 *
		 * @private
		 */
		MIN_SELECTION_CHECK_INTERVAL: 500,

		/**
		 * Minimum interval between widgets checks.
		 *
		 * @private
		 */
		MIN_WIDGETS_CHECK_INTERVAL: 1000,

		/**
		 * Adds widget definition to the repository.
		 *
		 * @param {String} name
		 * @param {CKEDITOR.plugins.widget.definition} widgetDef
		 * @returns {CKEDITOR.plugins.widget.registeredDefinition}
		 */
		add: function( name, widgetDef ) {
			// Create prototyped copy of original widget defintion, so we won't modify it.
			widgetDef = CKEDITOR.tools.prototypedCopy( widgetDef );
			widgetDef.name = name;
			widgetDef.commandName = 'widget' + CKEDITOR.tools.capitalize( name );
			// Clone config too.
			widgetDef.config = CKEDITOR.tools.prototypedCopy( widgetDef.config );
			widgetDef._ = widgetDef._ || {};

			this.editor.fire( 'widgetDefinition', widgetDef );

			addWidgetDialog( widgetDef );
			addWidgetCommand( this.editor, widgetDef );
			addWidgetProcessors( this, widgetDef );

			this.registered[ name ] = widgetDef;

			return widgetDef;
		},

		/**
		 * Checks selection to update widgets states (select and focus).
		 *
		 * This method is triggered by {@link #event-checkSelection} event.
		 */
		checkSelection: function() {
			var sel = this.editor.getSelection(),
				selectedElement = sel.getSelectedElement(),
				updater = stateUpdater( this ),
				widget;

			// Widget is focused so commit and finish checking.
			if ( selectedElement && ( widget = this.getByElement( selectedElement, true ) ) )
				return updater.focus( widget ).select( widget ).commit();

			var range = sel.getRanges()[ 0 ];

			// No ranges or collapsed range mean that nothing is selected, so commit and finish checking.
			if ( !range || range.collapsed )
				return updater.commit();

			// Range is not empty, so create walker checking for wrappers.
			var walker = new CKEDITOR.dom.walker( range ),
				wrapper;

			walker.evaluator = isWidgetWrapper2;

			while ( ( wrapper = walker.next() ) )
				updater.select( this.getByElement( wrapper ) );

			updater.commit();
		},

		/**
		 * Checks if all widgets instances are still present in DOM.
		 * Destroys those which are not.
		 *
		 * This method is triggered by {@link #event-checkWidigets} event.
		 */
		checkWidgets: function() {
			if ( this.editor.mode != 'wysiwyg' )
				return;

			var toBeDestroyed = [],
				editable = this.editor.editable(),
				instances = this.instances,
				id;

			if ( !editable )
				return;

			for ( id in instances ) {
				if ( !editable.contains( instances[ id ].wrapper ) )
					this.destroy( instances[ id ], true );
			}
		},

		/**
		 * Removes and destroys widget instance.
		 *
		 * @param {CKEDITOR.plugins.widget} widget
		 * @param {Boolean} [offline] Whether widget is offline (detached from DOM tree) -
		 * in this case DOM (attributes, classes, etc.) will not be cleaned up.
		 */
		destroy: function( widget, offline ) {
			widget.destroy( offline );
			delete this.instances[ widget.id ];
			this.fire( 'instanceDestroyed', widget );
		},

		/**
		 * Removes and destroys all widgets instances.
		 *
		 * @param {Boolean} [offline] Whether widgets are offline (detached from DOM tree) -
		 * in this case DOM (attributes, classes, etc.) will not be cleaned up.
		 */
		destroyAll: function( offline ) {
			var instances = this.instances,
				widget;

			for ( var id in instances ) {
				widget = instances[ id ]
				widget.destroy( offline );
				delete instances[ id ];
				this.fire( 'instanceDestroyed', widget );
			}
		},

		/**
		 * Gets widget instance by element which may be
		 * widget's wrapper or any of its children.
		 *
		 * @param {CKEDITOR.dom.element} element
		 * @param {Boolean} [checkWrapperOnly] Check only if `element` equals wrapper.
		 * @returns {CKEDITOR.plugins.widget} Widget instance or `null`.
		 */
		getByElement: function( element, checkWrapperOnly ) {
			if ( !element )
				return null;

			var wrapper;

			for ( var id in this.instances ) {
				wrapper = this.instances[ id ].wrapper;
				if ( wrapper.equals( element ) || ( !checkWrapperOnly && wrapper.contains( element ) ) )
					return this.instances[ id ];
			}

			return null;
		},

		/**
		 * Initializes widget on given element if widget hasn't
		 * been initialzed on it yet.
		 *
		 * @param {CKEDITOR.dom.element} element
		 * @param {String/CKEDITOR.plugins.widget.definition} widget Name of a widget type or a widget definition.
		 * Widget definition should be previously registered by {@link CKEDITOR.plugins.widget.repository#add}.
		 * @returns {CKEDITOR.plugins.widget} The widget instance or null if there's no widget for given element.
		 */
		initOn: function( element, widgetDef ) {
			if ( !widgetDef )
				widgetDef = this.registered[ element.data( 'widget' ) ];
			else if ( typeof widgetDef == 'string' )
				widgetDef = this.registered[ widgetDef ];

			if ( !widgetDef )
				return null;

			// Wrap element if still wasn't wrapped (was added during runtime by method that skips dataProcessor).
			var wrapper = this.wrapElement( element, widgetDef.name );

			if ( wrapper ) {
				// Check if widget wrapper is new (widget hasn't been initialzed on it yet).
				// This class will be removed by widget constructor to avoid locking snapshot twice.
				if ( wrapper.hasClass( 'cke_widget_new' ) ) {
					var widget = new Widget( this, this._.nextId++, element, widgetDef );
					this.instances[ widget.id ] = widget;

					return widget;
				}

				// Widget already has been initialized, so try to widget by element
				return this.getByElement( element );
			}

			// No wrapper means that there's no widget for this element.
			return null;
		},

		/**
		 * Initializes widgets on all elements which were wrapped by {@link #wrapElement} and
		 * haven't been initialized yet.
		 *
		 * @param {CKEDITOR.dom.element} [container=editor.editable()] Container which will be checked for not
		 * initialized widgets. Defaults to editor's editable element.
		 * @returns {CKEDITOR.plugins.widget[]} Array of widget instances which have been initialized.
		 */
		initOnAll: function( container ) {
			var newWidgets = ( container || this.editor.editable() ).find( '.cke_widget_new' ),
				newInstances = [],
				instance;

			// Since locking and unlocking snasphot isn't a lightweight operation
			// lock it here so all '(un)lockSnapshot' events (which will be fired in Widget constructors)
			// will be ignored.
			this.editor.fire( 'lockSnapshot' );

			for ( var i = newWidgets.count(); i--; ) {
				instance = this.initOn( newWidgets.getItem( i ).getFirst( isWidgetElement2 ) );
				if ( instance )
					newInstances.push( instance );
			}

			this.editor.fire( 'unlockSnapshot' );

			return newInstances;
		},

		/**
		 * Wraps element with a widget container.
		 *
		 * If this method is called on {@link CKEDITOR.htmlParser.element}, then it will
		 * also take care of fixing DOM after wrapping (wrapper may not be allowed in element's parent).
		 *
		 * @param {CKEDITOR.dom.element/CKEDITOR.htmlParser.element} The widget element to be wrapperd.
		 * @param {String} [widgetName]
		 * @returns {CKEDITOR.dom.element/CKEDITOR.htmlParser.element} The wrapper element or `null` if
		 * widget of this type is not registered.
		 */
		wrapElement: function( element, widgetName ) {
			var wrapper = null;

			if ( element instanceof CKEDITOR.dom.element ) {
				var widget = this.registered[ widgetName || element.data( 'widget' ) ];
				if ( !widget )
					return null;

				// Do not wrap already wrapped element.
				wrapper = element.getParent();
				if ( wrapper && wrapper.type == CKEDITOR.NODE_ELEMENT && wrapper.data( 'widget-wrapper' ) )
					return wrapper;

				// Lock snapshot during making changes to DOM.
				this.editor.fire( 'lockSnapshot' );

				wrapper = new CKEDITOR.dom.element( widget.inline ? 'span' : 'div' );
				wrapper.setAttributes( wrapperAttributes );
				wrapper.replace( element );
				element.appendTo( wrapper );

				this.editor.fire( 'unlockSnapshot' );
			}
			else if ( element instanceof CKEDITOR.htmlParser.element ) {
				var widget = this.registered[ widgetName || element.attributes[ 'data-widget' ] ];
				if ( !widget )
					return null;

				wrapper = element.parent;
				if ( wrapper && wrapper.type == CKEDITOR.NODE_ELEMENT && wrapper.attributes[ 'data-widget-wrapper' ] )
					return wrapper;

				wrapper = new CKEDITOR.htmlParser.element( widget.inline ? 'span' : 'div', wrapperAttributes );

				var parent = element.parent,
					index = element.getIndex();

				element.remove();
				wrapper.add( element );

				// Insert wrapper fixing DOM (splitting parents if wrapper is not allowed inside them).
				insertElement( parent, index, wrapper );
			}

			return wrapper;
		}
	};

	CKEDITOR.event.implementOn( Repository.prototype );

	/**
	 * @class CKEDITOR.plugins.widget
	 * @mixins CKEDITOR.event
	 */
	function Widget( widgetsRepo, id, element, widgetDef ) {
		var editor = widgetsRepo.editor;

		// Extend this widget with widgetDef-specific methods and properties.
		CKEDITOR.tools.extend( this, widgetDef, {
			/**
			 * The editor instance.
			 *
			 * @readonly
			 * @property {CKEDITOR.editor}
			 */
			editor: editor,

			/**
			 * This widget's unique (per editor instance) id.
			 *
			 * @readonly
			 * @property {Number}
			 */
			id: id,

			/**
			 * Widget's main element.
			 *
			 * @readonly
			 * @property {CKEDITOR.dom.element}
			 */
			element: element,

			/**
			 * Widget's data object.
			 *
			 * Data can only be set by {@link #setData} method.
			 *
			 * @readonly
			 */
			data: CKEDITOR.tools.extend( {}, widgetDef.defaults ),

			/**
			 * Is data ready. Set to `true` when data from all sources
			 * ({@link CKEDITOR.plugins.widget.definition#defaults}, set
			 * in {@link #init} method and loaded from widget's element)
			 * are finally loaded. This is immediately followed by first {@link #event-data}.
			 *
			 * @readonly
			 */
			dataReady: false,

			// WAAARNING: Overwrite widgetDef's priv object, because otherwise violent unicorn's gonna visit you.
			_: {
				// Cache choosen fn.
				downcastFn: widgetDef.config.downcast && widgetDef.downcasts[ widgetDef.config.downcast ],
			}
		}, true );

		/**
		 * Object of widget's component elements.
		 *
		 * For every `partName => selector` pair in {@link CKEDITOR.plugins.widget.definition#parts}
		 * one `partName => element` pair is added to this object during
		 * widget initialization.
		 *
		 * @property {Object} parts
		 */

		widgetsRepo.fire( 'instanceCreated', this );

		// Lock snapshot during making changed to DOM.
		editor.fire( 'lockSnapshot' );

		setupWidget( this );

		this.init && this.init();

		setupWidgetData( this );

		// Finally mark widget as inited.
		this.wrapper.setAttribute( 'data-widget-wrapper-inited', 1 );

		// Disable contenteditable on the wrapper once the initialization process
		// is over and selection is set (i.e. after setupPasted). This prevents
		// from selection being put at the beginning of editable.
		this.wrapper.setAttribute( 'contenteditable', false );

		// Unlock snapshot after we've done all changes.
		editor.fire( 'unlockSnapshot' );
	}

	Widget.prototype = {
		/**
		 * Destroys this widget instance.
		 *
		 * Use {@link CKEDITOR.plugins.widget.repository#destroy} when possible instead of this method.
		 *
		 * This method fires {#event-destroy} event.
		 *
		 * @param {Boolean} [offline] Whether widget is offline (detached from DOM tree) -
		 * in this case DOM (attributes, classes, etc.) will not be cleaned up.
		 */
		destroy: function( offline ) {
			var editor = this.editor;

			this.fire( 'destroy' );

			/* TMP
			// Remove editables from focusmanager.
			if ( this.editables ) {
				for ( var name in this.editables )
					editor.focusManager.remove( this.editables[ name ] );
			}
			*/

			if ( !offline ) {
				this.element.removeAttribute( 'data-widget-data' );
				this.wrapper.removeAttributes( [ 'contenteditable', 'data-widget-id', 'data-widget-wrapper-inited' ] );
				this.wrapper.addClass( 'cke_widget_new' );
			}

			this.wrapper = null;
		},

		/* TMP
		edit: function() {
			if ( !this.dialog )
				return;

			var that = this;

			this.editor.widgets.fire( 'widgetEdit', this );

			this.editor.openDialog( this.dialogName, function( dialog ) {
				this.on( 'show', function( event ) {
					that.editor.fire( 'saveSnapshot' );
					that.updateData();
					this.setupContent( that );
					event.removeListener();
				});
				this.on( 'ok', function( event ) {
					this.commitContent( that );
					that.updateData();
					that.editor.fire( 'saveSnapshot' );
					event.removeListener();
				});
				this.on( 'hide', function( event ) {
					that.select( 1 );
					that.updateData();
					event.removeListener();
				});
			} );
		},
		*/

		/**
		 * Gets widget's output element.
		 *
		 * @param {CKEDITOR.htmlParser.element} [element] Widget element
		 * which may be returned as output after being cleaned up.
		 * @returns {CKEDITOR.htmlParser.element}
		 */
		getOutput: function( element ) {
			if ( this.template )
				element = CKEDITOR.htmlParser.fragment.fromHtml( this.template.output( this.data ) ).children[ 0 ];
			else {
				if ( !element )
					element = CKEDITOR.htmlParser.fragment.fromHtml( this.element.getOuterHtml() ).children[ 0 ];

				delete element.attributes[ 'data-widget-data' ];
			}

			return this.fire( 'getOutput', element );
		},

		/**
		 * Checks if widget has already been initialized. This means, for example,
		 * that widget has mask, element styles have been transferred to wrapper etc.
		 *
		 * @returns {Boolean}
		 */
		isInited: function() {
			return !!( this.wrapper && this.wrapper.hasAttribute( 'data-widget-wrapper-inited' ) );
		},

		/**
		 * Focuses widget by selecting it.
		 */
		focus: function() {
			// Always focus editor (not only when focusManger.hasFocus is false) (because of #10483).
			this.editor.focus();

			var sel = this.editor.getSelection();
			if ( sel )
				sel.fake( this.wrapper );
		},

		/**
		 * Sets widget value(s) in {@link #propeorty-data} object.
		 * If given value(s) modifies current ones {@link #event-data} event is fired.
		 *
		 *		this.setData( 'align', 'left' );
		 *		this.data.align; // -> 'left'
		 *
		 *		this.setData( { align: 'right', opened: false } );
		 *		this.data.align; // -> 'right'
		 *		this.data.opened; // -> false
		 *
		 * Set values are stored in {@link #element}'s attribute (`data-widget-data`),
		 * in JSON string, so therefore {@link #property-data} should contain
		 * only serializable data.
		 *
		 * @param {String/Object} keyOrData
		 * @param {Object} value
		 * @chainable
		 */
		setData: function( key, value ) {
			var data = this.data,
				modified = 0;

			if ( typeof key == 'string' ) {
				if ( data[ key ] !== value ) {
					data[ key ] = value;
					modified = 1;
				}
			}
			else {
				var newData = key;

				for ( key in newData ) {
					if ( data[ key ] !== newData[ key ] ) {
						modified = 1;
						data[ key ] = newData[ key ];
					}
				}
			}

			// Block firing data event and overwriting data element before setupWidgetData is executed.
			if ( modified && this.dataReady ) {
				writeDataToElement( this );
				this.fire( 'data', data );
			}

			return this;
		},

		/**
		 * Changes widget's focus state. Usually executed automatically after
		 * widget has been focused by {@link #focus} method or selection was moved
		 * out of widget.
		 *
		 * @param {Boolean} selected Whether to select or deselect this widget.
		 * @chainable
		 */
		setFocused: function( focused ) {
			this.wrapper[ focused ? 'addClass' : 'removeClass' ]( 'cke_widget_focused' );
			this.fire( focused ? 'focus' : 'blur' );
			return this;
		},

		/**
		 * Changes widget's select state. Usually executed automatically after
		 * widget has been selected by {@link #focus} method or selection was moved
		 * out of widget.
		 *
		 * @param {Boolean} selected Whether to select or deselect this widget.
		 * @chainable
		 */
		setSelected: function( selected ) {
			this.wrapper[ selected ? 'addClass' : 'removeClass' ]( 'cke_widget_selected' );
			this.fire(  selected ? 'select' : 'deselect' );
			return this;
		},

		/* TMP
		// Since webkit (also FF) destroys the selection when pasting a widget (only a widget,
		// NOTHING more), we can detect this case since we marked such widget with
		// an attribute. We restore the caret after the widget once it is ready and
		// remove the attribute so it looks pretty much like a regular, non-pathological paste.
		setupPasted: function() {
			if ( this.element.hasAttribute( 'data-widget-cbin-direct' ) ) {
				var range = new CKEDITOR.dom.range( this.editor.document ),
					siblingWidget;

				// If there's a widget right after this one, we cannot move the caret after it.
				// Select this widget in such case.
				if ( getSiblingWidget( this.editor, this.wrapper, 1 ) )
					this.select();

				// Also if, somehow, there's no space to move caret (i.e. first and only child
				// of editable), basically select this widget.
				else if ( !range.moveToClosestEditablePosition( this.wrapper, 1 ) )
					this.select();

				// If there's a possibility to move the caret, let's do it.
				else
					range.select();

				// Clean-up the mess we did. The better is, the less attributes we have.
				this.element.removeAttribute( 'data-widget-cbin-direct' );

				this.editor.widgets.fire( 'widgetSetupPasted', this );
			}
		},

		// If the widget has an appropriate attribute, i.e. it was selected when
		// being deleted, this attribute allows re-selecting it on undo.
		setupSelected: function() {
			if ( this.element.hasAttribute( 'data-widget-selected' ) ) {
				this.element.removeAttribute( 'data-widget-selected' );
				this.editor.widgets.fire( 'widgetSetupSelected', this );
				this.select();
			}
		}
		*/
	};

	CKEDITOR.event.implementOn( Widget.prototype );

	/*
	var whitespaceEval = new CKEDITOR.dom.walker.whitespaces(),
		bookmarkEval = new CKEDITOR.dom.walker.bookmark();

	function nonWhitespaceOrBookmarkEval( node ) {
		// Whitespaces and bookmark nodes are to be ignored.
		return !whitespaceEval( node ) && !bookmarkEval( node );
	}

	function inEditable( widget, target ) {
		var editables = widget.editables,
			inEditable,
			name, editable;

		if ( editables ) {
			for ( name in editables ) {
				if ( ( editable = editables[ name ] ).equals( target ) || editable.contains( target ) )
					return true;
			}
		}

		return false;
	}

	// Iterates over all widgets and all widget editables
	// to check if the element is is a child of editable or editable itself.
	function inEditables( editor, element ) {
		if ( !element )
			return false;

		var instances = editor.widgets.instances;

		for ( var i = instances.length ; i-- ; ) {
			if ( inEditable( instances[ i ], element ) )
				return true;
		}

		return false;
	}

	function getSelectedWidget( editor, element ) {
		var initialElement = element;

		if ( element.type == CKEDITOR.NODE_TEXT )
			element = element.getParent();

		var editable = editor.editable();

		while ( element && !element.hasAttribute( 'data-widget-wrapper' ) ) {
			if ( element.equals( editable ) )
				return null;

			element = element.getParent();
		}

		if ( element && element.hasAttribute( 'data-widget-id' ) ) {
			var widget = editor.widgets.getByElement( element );

			if ( !inEditable( widget, initialElement ) )
				return widget;
		}

		return null;
	}

	function getWidgetFromSelection( editor, selection ) {
		var selectionInstance = selection || editor.getSelection();

		// FF moves the caret to the inside of the widget and getSelectedElement is null.
		// Retrieve widget via getStartElement then.
		var element = selectionInstance.getSelectedElement() || selectionInstance.getStartElement(),
			widget;

		if ( !element )
			return null;

		if ( ( widget = getSelectedWidget( editor, element ) ) )
			return widget;

		return null;
	}

	// Check if there's a widget instance in the neighbourhood
	// of the element (previous or next node, ignoring whitespaces and bookmarks).
	// If found, such instance is returned.
	function getSiblingWidget( editor, element, getNext ) {
		var widget;

		if ( ( widget = editor.widgets.getByElement( element[ getNext ? 'getNext' : 'getPrevious' ]( nonWhitespaceOrBookmarkEval ) ) ) )
			return widget;

		return null;
	}

	function addContextMenu( editor, widgetName, commandName ) {
		if ( editor.contextMenu ) {
			var groupName = 'widget' + CKEDITOR.tools.capitalize( widgetName ) + 'Group';

			editor.addMenuGroup( groupName );
			editor.addMenuItem( commandName, {
				label: 'Edit ' + CKEDITOR.tools.capitalize( widgetName ),
				icon: 'icons/foo.png',
				command: commandName,
				group: groupName
			});

			editor.contextMenu.addListener( function( element ) {
				if ( !element )
					return null;

				var selected = getWidgetFromSelection( editor ) || editor.widgets.selected;

				if ( selected && selected.name == widgetName ) {
					var menu = {};
					menu[ commandName ] = CKEDITOR.TRISTATE_OFF;
					return menu;
				}
			});
		}
	}
	function copyDataByCopyBin( evt, editor, editable, selected, key ) {
		var copybin = new CKEDITOR.dom.element( 'div', editor.document ),
			isCut = key == CKEDITOR.CTRL + 88;

		editable.append( copybin );

		var clone = CKEDITOR.dom.element.createFromHtml( selected.getHtml() ),
			cloneElements = clone.getElementsByTag( '*' ),
			i = 0,
			element;


		// By default, web browsers ignore hidden elements when copying
		// to the clipboard. To have them copied and properly pasted, they must
		// be marked by an attribute and have display:none style removed.
		while ( ( element = cloneElements.getItem( i++ ) ) ) {
			if ( element.getStyle( 'display' ) == 'none' ) {
				element.setAttribute( 'data-widget-hidden', 1 );
				element.removeStyle( 'display' );
			}
		}

		// Mark the widget with an attribute to let know that widget was the ONLY
		// thing copied to the clipboard. Since webkit (and FF as well) destroys selection when
		// pasting the widget (and only a single widget, nothing more), this will help
		// us with moving the caret after the widget once it is ready.
		clone.setAttribute( 'data-widget-cbin-direct', 1 );

		// (#9909) insert dummy nodes to fix webkit issues. This will also
		// let us extract the widget in Firefox, since it's copied with additional
		// wrapper.
		copybin.setHtml( 'cke-dummy-before[' + clone.getOuterHtml() + ']cke-dummy-after' );

		// Don't let the selected widget call blur when being removed during cutting.
		isCut && selected.removeBlurListeners();

		// Once the clone of the widget is inside of copybin, select
		// the entire contents. This selection will be copied by the
		// native browser's clipboard system.
		var range = new CKEDITOR.dom.range( editor.document );
		range.selectNodeContents( copybin );
		range.select();

		setTimeout( function() {
			// Fool the undo system. Make all the changes a single snapshot.
			editor.fire( 'lockSnapshot' );

			copybin.remove();

			// In case of CTRL+X, put selection to the closest previous
			// editable position to simulate a real, native cutting process.
			if ( isCut ) {
				range.moveToClosestEditablePosition( selected.wrapper );
				range.select();

				delete editor.widgets.selected;

				// Remove widget from DOM when cutting.
				selected.wrapper.remove();

				if ( CKEDITOR.env.gecko )
					editor.focus();
			} else
				selected.select();

 			// Unlock the undo so it operates normally.
			editor.fire( 'unlockSnapshot' );
		}, 0 );
	}
	*/

	//
	// REPOSITORY helpers -----------------------------------------------------
	//

	var wrapperAttributes = {
		// tabindex="-1" means that it can receive focus by code.
		tabindex: -1,
		'data-widget-wrapper': 1,
		style: 'position:relative;' + CKEDITOR.tools.cssVendorPrefix( 'user-select', 'none', 1 ),
		// Class cke_widget_new marks widgets which haven't been initialized yet.
		'class': 'cke_widget_wrapper cke_widget_new'
	};

	function addWidgetButtons( editor ) {
		var widgets = editor.widgets.registered,
			widget,
			widgetName,
			widgetButton,
			commandName,
			allowedContent = [],
			rule,
			buttons = {},
			buttonsStates = {},
			hasButtons = 0,
			menuGroup = 'widgetButton';

		for ( widgetName in widgets ) {
			widget = widgets[ widgetName ];
			commandName = widget.commandName;

			// Create button if defined.
			widgetButton = widget.button;
			if ( widgetButton ) {
				buttons[ commandName ] = {
					label: widgetButton.label,
					group: menuGroup,
					command: commandName
				};
				buttonsStates[ commandName ] = CKEDITOR.TRISTATE_OFF;
				hasButtons = 1;

				if ( widget.allowedContent )
					allowedContent.push( widget.allowedContent );
				if ( widget.widgetTags ) {
					rule = {};
					rule[ widget.widgetTags ] = {
						attributes: /^data-widget/
					};
					allowedContent.push( rule );
				}
			}

			/* TMP
			 * addContextMenu( editor, widgetName, commandName );
			 */
		}

		if ( hasButtons ) {
			editor.addMenuGroup( menuGroup );
			editor.addMenuItems( buttons );

			editor.ui.add( 'Widget', CKEDITOR.UI_MENUBUTTON, {
				allowedContent: allowedContent,
				label: 'Widget',
				title: 'Widgets',
				modes: { wysiwyg:1 },
				toolbar: 'insert,1',
				onMenu: function() {
					return buttonsStates;
				}
			});
		}
	}

	// Create command - first check if widget.command is defined,
	// if not - try to create generic one based on widget.template
	function addWidgetCommand( editor, widget ) {
		if ( widget.command )
			editor.addCommand( widget.commandName, widget.command );
		else {
			editor.addCommand( widget.commandName, {
				exec: function() {
					var selected = editor.widgets.selected;
					// If a widget of the same type is selected, start editing.
					if ( selected && selected.name == widget.name )
						selected.edit && selected.edit();

					// Otherwise, create a brand-new widget from template.
					else if ( widget.template ) {
						var	element = CKEDITOR.dom.element.createFromHtml( widget.template.output( widget.defaults ) ),
							wrapper = new CKEDITOR.dom.element( widget.inline ? 'span' : 'div' ),
							instance;

						wrapper.setAttributes( wrapperAttributes );
						wrapper.append( element );

						editor.insertElement( wrapper );
						instance = editor.widgets.initOn( element, widget );
						/* TMP
						instance.select();
						instance.edit && instance.edit();
						*/
					}
				}
			});
		}
	}

	function addWidgetDialog( widgetDef ) {
		// If necessary, Create dialog for this registered widget.
		if ( widgetDef.dialog ) {
			// Generate the name for this dialog.
			var dialogName = widgetDef.dialogName = 'widget' +
				CKEDITOR.tools.capitalize( widgetDef.name ) + 'Dialog';

			CKEDITOR.dialog.add( dialogName, function( editor ) {
				// Widget dialog definition is extended with generic
				// properties and methods.
				var dialog = widgetDef.dialog,
					elements = dialog.elements;

				delete dialog.elements;

				return CKEDITOR.tools.extend( {
						minWidth: 200,
						minHeight: 100
					}, {
						contents: [
							{ elements: elements }
						]
					},
					dialog,
				true );
			} );
		}
	}

	function addWidgetProcessors( widgetsRepo, widgetDef ) {
		var upcasts = widgetDef.config.upcasts;

		if ( !upcasts )
			return;

		// Single rule activated by setting config.upcasts = true.
		// wDef.upcasts has to be a function.
		if ( upcasts === true )
			return widgetsRepo._.upcasts.push( [ widgetDef.upcasts, widgetDef.name ] );

		// Multiple rules.
		upcasts = upcasts.split( ',' );

		while ( upcasts.length )
			widgetsRepo._.upcasts.push( [ widgetDef.upcasts[ upcasts.pop() ], widgetDef.name ] );
	}

	function blurWidget( widgetsRepo, widget ) {
		widgetsRepo.focused = null;

		if ( widget.isInited() ) {
			// Widget could be destroyed in the meantime - e.g. data could be set.
			widgetsRepo.fire( 'widgetBlurred', { widget: widget } );
			widget.setFocused( false );
		}
	}

	// Unwraps widget element and clean up element.
	//
	// This function is used to clean up pasted widgets.
	// It should have similar result to widget#destroy plus
	// some additional adjustments, specific for pasting.
	//
	// @param {CKEDITOR.htmlParser.element} el
	function cleanUpWidgetElement( el ) {
		var parent = el.parent;
		if ( parent.type == CKEDITOR.NODE_ELEMENT && parent.attributes[ 'data-widget-wrapper' ] )
			parent.replaceWith( el );
	}

	// Similar to cleanUpWidgetElement, but works on DOM and finds
	// widget elements by its own.
	//
	// Unlike cleanUpWidgetElement it will wrap element back.
	//
	// @param {CKEDITOR.dom.element} container
	function cleanUpAllWidgetElements( widgetsRepo, container ) {
		var wrappers = container.find( '.cke_widget_wrapper' ),
			wrapper, element,
			i = 0,
			l = wrappers.count();

		for ( ; i < l; ++i ) {
			wrapper = wrappers.getItem( i );
			element = wrapper.getFirst( isWidgetElement2 );
			// If wrapper contains widget element - unwrap it and wrap again.
			if ( element.type == CKEDITOR.NODE_ELEMENT && element.data( 'widget' ) ) {
				element.replace( wrapper );
				widgetsRepo.wrapElement( element );
			}
			// Otherwise - something is wrong... clean this up.
			else
				wrapper.remove();
		}
	}

	// Inserts element at given index.
	// It will check DTD and split ancestor elements up to the first
	// that can contain this element.
	//
	// @param {CKEDITOR.htmlParser.element} parent
	// @param {Number} index
	// @param {CKEDITOR.htmlParser.element} element
	function insertElement( parent, index, element ) {
		// Do not split doc fragment...
		if ( parent.type == CKEDITOR.NODE_ELEMENT ) {
			var parentAllows = CKEDITOR.dtd[ parent.name ];
			// Parent element is known (included in DTD) and cannot contain
			// this element.
			if ( parentAllows && !parentAllows[ element.name ] ) {
				var parent2 = parent.split( index ),
					parentParent = parent.parent;

				// Element will now be inserted at right parent's index.
				index = parent2.getIndex();

				// If left part of split is empty - remove it.
				if ( !parent.children.length ) {
					index -= 1;
					parent.remove();
				}

				// If right part of split is empty - remove it.
				if ( !parent2.children.length )
					parent2.remove();

				// Try inserting as grandpas' children.
				return insertElement( parentParent, index, element );
			}
		}

		// Finally we can add this element.
		parent.add( element, index );
	}

	// @param {CKEDITOR.htmlParser.element}
	function isWidgetElement( element ) {
		return element.type == CKEDITOR.NODE_ELEMENT && !!element.attributes[ 'data-widget' ];
	}

	// @param {CKEDITOR.dom.element}
	function isWidgetElement2( element ) {
		return element.type == CKEDITOR.NODE_ELEMENT && element.hasAttribute( 'data-widget' );
	}

	// @param {CKEDITOR.dom.element}
	function isWidgetWrapper2( element ) {
		return element.type == CKEDITOR.NODE_ELEMENT && element.hasAttribute( 'data-widget-wrapper' );
	}

	/*
	function onKey( evt ) {
		var editor = evt.editor,
			sel = editor.widgets.selected,
			key = evt.data.keyCode,
			editable = editor.editable(),
			range = new CKEDITOR.dom.range( editor.document );

		if ( sel ) {
			// When there's a selected widget instance.
			switch ( key ) {
				case 13:	// RETURN
					sel.edit && sel.edit();
					evt.cancel();
					break;

				case CKEDITOR.CTRL + 88:	// CTRL+X
				case CKEDITOR.CTRL + 67:	// CTRL+C
					copyDataByCopyBin( evt, editor, editable, sel, key );
					break;
			}
		}
		else {
			// When there's no selected widget.
			switch ( key ) {
				// Observe where does the caret go when ARROW UP|DOWN key
				// is pressed. If it goes into an existing widget instance,
				// select this instance.
				case 38: 	// ARROW UP
				case 40: 	// ARROW BOTTOM
					var range = editor.getSelection().getRanges()[ 0 ],
						startContainer = range.startContainer;

					// If startContainer before the caret moves belongs to some
					// editable, then we navigate INSIDE of the widget.
					// Abort widget selection procedure in such case.
					if ( inEditables( editor, startContainer ) )
						return;

					setTimeout( function() {
						range = editor.getSelection().getRanges()[ 0 ];

						var widget = editor.widgets.getByElement( range.startContainer );
						widget && widget.select();
					}, 0 );
					break;

				// Navigate thorough widgets with ARROW LEFT|RIGHT keys.
				case 37: 	// ARROW LEFT
				case 39: 	// ARROW RIGHT
					var instances = editor.widgets.instances,
						selRange = editor.getSelection().getRanges()[ 0 ],
						startContainer = selRange.startContainer,
						wrapper;

					// If startContainer before the caret moves belongs to some
					// editable, then we navigate INSIDE of the widget.
					// Abort widget selection procedure in such case.
					if ( inEditables( editor, startContainer ) )
						return;

					selRange.collapse();
					selRange.optimize();

					// Iterate over all widget instances and check whether
					// current selection range matches some of the closest
					// focus spaces.
					for ( var i = instances.length; i-- ; ) {
						wrapper = instances[ i ].wrapper;

						if ( range.moveToClosestEditablePosition( wrapper, key == 37 ) &&
							 range.startContainer.equals( selRange.startContainer ) &&
							 range.startOffset == selRange.startOffset ) {
							instances[ i ].select();
							evt.cancel();
						}
					}
			}
		}

		switch ( key ) {
			case CKEDITOR.CTRL + 65:	// CTRL+A
				var element = editor.getSelection().getStartElement();

				if ( !element )
					return;

				while ( element ) {
					if ( element.equals( editable ) )
						return;

					if ( element.hasClass( 'cke_widget_editable' ) )
						break;

					element = element.getParent();
				}

				range.selectNodeContents( element );
				range.select();

				evt.cancel();
		}
	}

	function onPaste( evt ) {
		var data = evt.data.dataValue;

		if ( data.match( /data-widget-cbin-direct/g ) ) {
			// Clean DIV wrapper added by FF when copying.
			data = data.replace( /^<div>(.*)<\/div>$/g, '$1' );

			// Clean widget markers.
			data = data.replace( /^(<span[^>]*>)?cke-dummy-before\[(<\/span>)?/g, '' );
			data = data.replace( /(<span[^>]*>)?\]cke-dummy-after(<\/span>|<br>)?$/g, '' );

			evt.data.dataValue = data;
		}
	}
	*/

	// Set up data processing like:
	// * toHtml/toDataFormat,
	// * pasting handling,
	// * undo/redo handling.
	function setupDataProcessing( widgetsRepo ) {
		var editor = widgetsRepo.editor,
			snapshotLoaded = 0;

		editor.on( 'contentDomUnload', function() {
			widgetsRepo.destroyAll( true );
		} );

		editor.on( 'dataReady', function() {
			// Clean up all widgets loaded from snapshot.
			if ( snapshotLoaded ) {
				// By locking and unlocking we'll updated snapshot loaded
				// a moment ago. We need that because entire wrapper
				// will be rebuilt and e.g. widget id will be modified.
				editor.fire( 'lockSnapshot' );
				cleanUpAllWidgetElements( widgetsRepo, editor.editable() );
				editor.fire( 'unlockSnapshot' );
			}
			snapshotLoaded = 0;

			// Some widgets were destroyed on contentDomUnload,
			// some on loadSnapshot, but that does not include
			// e.g. setHtml on inline editor or widgets removed just
			// before setting data.
			widgetsRepo.destroyAll( true );
			widgetsRepo.initOnAll();
		} );

		editor.on( 'afterPaste', function() {
			// Init is enough (no clean up needed),
			// because inserted widgets were cleaned up by toHtml.
			widgetsRepo.initOnAll();
		} );

		// Set flag so dataReady will know that additional
		// cleanup is needed, because snapshot containing widgets was loaded.
		editor.on( 'loadSnapshot', function( evt ) {
			// Primitive but sufficient check which will prevent from executing
			// heavier cleanUpAllWidgetElements if not needed.
			if ( ( /data-widget/ ).test( evt.data ) )
				snapshotLoaded = 1;

			widgetsRepo.destroyAll( true );
		}, null, null, 9 );

		var upcasts = widgetsRepo._.upcasts;

		editor.on( 'toHtml', function( evt ) {
			var toBeWrapped = [],
				element;

			evt.data.dataValue.forEach( function( element ) {
				// Wrapper found - find widget element, add it to be
				// cleaned up (unwrapped) and wrapped and stop iterating in this branch.
				if ( 'data-widget-wrapper' in element.attributes ) {
					element = element.getFirst( isWidgetElement );

					if ( element )
						toBeWrapped.push( element );

					// Do not iterate over ancestors.
					return false;
				}
				// Widget element found - add it to be cleaned up (just in case)
				// and wrapped and stop iterating in this branch.
				else if ( 'data-widget' in element.attributes ) {
					toBeWrapped.push( element );

					// Do not iterate over ancestors.
					return false;
				}
				else if ( upcasts.length ) {
					var upcast, upcasted,
						i = 0,
						l = upcasts.length;

					for ( ; i < l; ++i ) {
						upcast = upcasts[ i ];

						if ( ( upcasted = upcast[ 0 ]( element ) ) ) {
							// If upcast function returned element, upcast this one.
							// It can be e.g. a new element wrapping the original one.
							if ( upcasted instanceof CKEDITOR.htmlParser.element )
								element = upcasted;

							element.attributes[ 'data-widget' ] = upcast[ 1 ];
							toBeWrapped.push( element );

							// Do not iterate over ancestors.
							return false;
						}
					}
				}
			}, CKEDITOR.NODE_ELEMENT );

			// Clean up and wrap all queued elements.
			while ( ( element = toBeWrapped.pop() ) ) {
				cleanUpWidgetElement( element );
				widgetsRepo.wrapElement( element );
			}
		}, null, null, 10 );

		editor.dataProcessor.htmlFilter.addRules( {
			elements: {
				$: function( element ) {
					if ( 'data-widget-id' in element.attributes ) {
						var widget = widgetsRepo.instances[ element.attributes[ 'data-widget-id' ] ];

						if ( widget ) {
							var widgetElement = element.getFirst( isWidgetElement );
							return widget._.downcastFn ?
								widget._.downcastFn( widgetElement, widget ) :
								widget.getOutput( widgetElement );
						}

						return false;
					}
				}
			}
		} );
	}

	// Setup mouse observer which will trigger:
	// * widget focus on widget click.
	function setupMouseObserver( widgetsRepo ) {
		var editor = widgetsRepo.editor;

		editor.on( 'contentDom', function() {
			var editable = editor.editable();

			editable.attachListener( editable.isInline() ? editable : editor.document, 'mousedown', function( evt ) {
				var widget;

				if ( ( widget = widgetsRepo.getByElement( evt.data.getTarget() ) ) ) {
					evt.data.preventDefault();
					widget.focus();
				}
			} );
		} );
	}

	// Setup selection observer which will trigger:
	// * widget select & focus on selection change,
	// * deselecting and blurring all widgets on data,
	// * blurring widget on editor blur.
	function setupSelectionObserver( widgetsRepo ) {
		var editor = widgetsRepo.editor,
			buffer = CKEDITOR.tools.eventsBuffer( widgetsRepo.MIN_SELECTION_CHECK_INTERVAL,	fireSelectionCheck );

		editor.on( 'afterSelectionCheck', function( evt ) {
			// If selectionChange was fired - check selection immediately.
			if ( evt.data.changed ) {
				buffer.reset();
				buffer.input();
			}
			// If selectionChange wasn't fired buffer events.
			else
				buffer.input();
		} );

		widgetsRepo.on( 'checkSelection', widgetsRepo.checkSelection, widgetsRepo );

		// Invalidate old widgets early - immediately on dataReady.
		editor.on( 'dataReady', function( evt ) {
			// Deselect and blur all widgets.
			stateUpdater( widgetsRepo ).commit();
		} );

		editor.on( 'blur', function() {
			var widget;

			if ( ( widget = widgetsRepo.focused ) )
				blurWidget( widgetsRepo, widget );
		} );

		function fireSelectionCheck() {
			widgetsRepo.fire( 'checkSelection' );
		}
	}

	// Setup observer which will trigger checkWidgets on:
	// * keyup.
	function setupWidgetsObserver( widgetsRepo ) {
		var editor = widgetsRepo.editor,
			buffer = CKEDITOR.tools.eventsBuffer( widgetsRepo.MIN_WIDGETS_CHECK_INTERVAL, function() {
				widgetsRepo.fire( 'checkWidgets' );
			} ),
			ignoredKeys = { 16:1,17:1,18:1,37:1,38:1,39:1,40:1,225:1 }; // SHIFT,CTRL,ALT,LEFT,UP,RIGHT,DOWN,RIGHT ALT(FF)

		editor.on( 'contentDom', function() {
			var editable = editor.editable();

			// Schedule check on keyup, but not more often than once per MIN_CHECK_DELAY.
			editable.attachListener( editable.isInline() ? editable : editor.document, 'keyup', function( evt ) {
				if ( !( evt.data.getKey() in ignoredKeys ) )
					buffer.input();
			}, null, null, 999 );
		} );

		editor.on( 'contentDomUnload', buffer.reset );

		widgetsRepo.on( 'checkWidgets', widgetsRepo.checkWidgets, widgetsRepo );
	}

	// Helper for coordinating which widgets should be
	// selected/deselected and which one should be focused/blurred.
	function stateUpdater( widgetsRepo ) {
		var currentlySelected = widgetsRepo.selected,
			toBeSelected = [],
			toBeDeselected = currentlySelected.slice( 0 ),
			focused = null;

		return {
			select: function( widget ) {
				if ( CKEDITOR.tools.indexOf( currentlySelected, widget ) < 0 )
					toBeSelected.push( widget );

				var index = CKEDITOR.tools.indexOf( toBeDeselected, widget );
				if ( index >= 0 )
					toBeDeselected.splice( index, 1 );

				return this;
			},

			focus: function( widget ) {
				focused = widget;
				return this;
			},

			commit: function() {
				var focusedChanged = widgetsRepo.focused !== focused,
					widget;

				if ( focusedChanged && ( widget = widgetsRepo.focused ) ) {
					blurWidget( widgetsRepo, widget );
				}

				while ( ( widget = toBeDeselected.pop() ) ) {
					currentlySelected.splice( CKEDITOR.tools.indexOf( currentlySelected, widget ), 1 );
					// Widget could be destroyed in the meantime - e.g. data could be set.
					if ( widget.isInited() )
						widget.setSelected( false );
				}

				if ( focusedChanged && focused ) {
					widgetsRepo.focused = focused;
					widgetsRepo.fire( 'widgetFocused', { widget: focused } );
					focused.setFocused( true );
				}

				while ( ( widget = toBeSelected.pop() ) ) {
					currentlySelected.push( widget );
					widget.setSelected( true );
				}
			}
		};
	}


	//
	// WIDGET helpers ---------------------------------------------------------
	//

	/* TMP
	// Makes widget editables editable, selectable, etc.
	// Adds necessary classes, properties, and styles.
	// Also adds editables to focusmanager.
	function setupEditables( widget ) {
		if ( !widget.editables )
			return;

		var editables = widget.editables(),
			editable, name;

		// Initialize nested editables.
		for ( name in editables ) {
			editable = editables[ name ];
			editable.setAttribute( 'contenteditable', true );
			editable.setStyle( 'cursor', 'text' );
			editable.setStyles( CKEDITOR.tools.cssVendorPrefix( 'user-select', 'text' ) );
			editable.addClass( 'cke_widget_editable' );
			editable.setAttribute( 'data-widget-editable' );
			widget.editor.focusManager.add( editable );

			// Fix DEL and BACKSPACE behaviour in widget editables. Make sure
			// widget pressing BACKSPACE|DEL at the very beginning|end of editable
			// won't move caret outside of editable.
			(function( editable ) {
				editable.on( 'keydown', function( evt ) {
					var key = evt.data.getKey(),
						range = widget.editor.getSelection().getRanges()[ 0 ];

					if ( key == 8 || key == 46 ) {
						if ( range.collapsed &&
							range.checkBoundaryOfElement( editable, CKEDITOR[ key == 8 ? 'START' : 'END' ] ) ) {
								evt.data.preventDefault();
						}

						evt.data.stopPropagation();
					}
				} );
			})( editable );
		}

		widget.editables = editables;
	}

	function setupMask( widget ) {
		// When initialized for the first time.
		if ( widget.needsMask ) {
			var img = CKEDITOR.dom.element.createFromHtml(
				'<img src="data:image/gif;base64,R0lGODlhAQABAPABAP///wAAACH5BAEKAAAALAAAAAABAAEAAAICRAEAOw%3D%3D" ' +
				'style="position:absolute;width:100%;height:100%;top:0;left:0;" draggable="false">', widget.editor.document );

			img.appendTo( widget.wrapper );
		}
	}
	*/

	// Replace parts object containing:
	// partName => selector pairs
	// with:
	// partName => element pairs
	function setupParts( widget ) {
		if ( widget.parts ) {
			var parts = {},
				el, partName;

			for ( partName in widget.parts ) {
				el = widget.element.findOne( widget.parts[ partName ] );
				parts[ partName ] = el;
			}
			widget.parts = parts;
		}
	}

	function setupWidget( widget ) {
		setupWrapper( widget );
		setupParts( widget );
		// setupEditables( widget );
		// setupMask( widget );

		// TODO should be executed on paste/undo/redo only.
		// this.setupSelected();
		// this.setupPasted();

		widget.wrapper.removeClass( 'cke_widget_new' );
	}

	function setupWidgetData( widget ) {
		var widgetDataAttr = widget.element.data( 'widget-data' );

		if ( widgetDataAttr )
			widget.setData( JSON.parse( widgetDataAttr ) );

		// Unblock data and...
		widget.dataReady = true;

		// Write data to element because this was blocked when data wasn't ready.
		writeDataToElement( widget );

		// Fire data event first time, because this was blocked when data wasn't ready.
		widget.fire( 'data', widget.data );
	}

	function setupWrapper( widget ) {
		// Retrieve widget wrapper. Assign an id to it.
		var wrapper = widget.wrapper = widget.element.getParent();
		wrapper.setAttribute( 'data-widget-id', widget.id );
	}

	function writeDataToElement( widget ) {
		widget.element.data( 'widget-data', JSON.stringify( widget.data ) );
	}

	//
	// EXPOSE PUBLIC API ------------------------------------------------------
	//

	CKEDITOR.plugins.widget = Widget;
	Widget.repository = Repository;
})();

/**
 * Event fired before {@link #method-getOutput} method returns data.
 * It allows additional modifications to the returned element.
 *
 * @event getOutput
 * @member CKEDITOR.plugins.widget
 * @param {CKEDITOR.htmlParser.element} data The element that will be returned.
 */

/**
 * Event fired when widget is about to be destroyed, but before it is
 * fully torn down.
 *
 * @event destroy
 * @member CKEDITOR.plugins.widget
 */

/**
 * Event fired when widget is focused.
 *
 * Widget can be focused by executing {@link #method-focus}.
 *
 * @event focus
 * @member CKEDITOR.plugins.widget
 */

/**
 * Event fired when widget is blurred.
 *
 * @event blur
 * @member CKEDITOR.plugins.widget
 */

/**
 * Event fired when widget is selected.
 *
 * @event select
 * @member CKEDITOR.plugins.widget
 */

/**
 * Event fired when widget is deselected.
 *
 * @event deselect
 * @member CKEDITOR.plugins.widget
 */

/**
 * Event fired when widget instance is created, but before it is fully
 * initialized.
 *
 * @event instanceCreated
 * @member CKEDITOR.plugins.widget.repository
 * @param {CKEDITOR.plugins.widget} data The widget instance.
 */

/**
 * Event fired when widget instance was destroyed.
 *
 * See also {@link CKEDITOR.plugins.widget#event-destroy}.
 *
 * @event instanceDestroyed
 * @member CKEDITOR.plugins.widget.repository
 * @param {CKEDITOR.plugins.widget} data The widget instance.
 */

/**
 * Event fired to trigger selection check.
 *
 * See {@link #method-checkSelection} method.
 *
 * @event checkSelection
 * @member CKEDITOR.plugins.widget.repository
 */

/**
 * Event fired to trigger widgets check.
 *
 * See {@link #method-checkWidgets} method.
 *
 * @event checkWidgets
 * @member CKEDITOR.plugins.widget.repository
 */