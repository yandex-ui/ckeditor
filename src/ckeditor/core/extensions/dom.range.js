(function() {
	'use strict';

	CKEDITOR.tools.extend(CKEDITOR.dom.range.prototype, {
		getClientRects: ( function() {
			if ( document.getSelection !== undefined ) {
				return function( isAbsolute ) {
					// We need to create native range so we can call native getClientRects.
					var range = this.root.getDocument().$.createRange(),
						rectList;

					range.setStart( this.startContainer.$, this.startOffset );
					range.setEnd( this.endContainer.$, this.endOffset );

					rectList = range.getClientRects();

					rectList = fixWidgetsRects( rectList, this );

					if ( !rectList.length ) {
						rectList = fixEmptyRectList( rectList, range, this );
					}

					return CKEDITOR.tools.array.map( rectList, function( item ) {
						return convertRect( item, isAbsolute, this );
					}, this );
				};
			} else {
				return function( isAbsolute ) {
					return [ convertRect( getRect( this.createBookmark() ), isAbsolute, this ) ];
				};
			}

			// Remove all widget rects except for outermost one.
			function fixWidgetsRects( rectList, context ) {
				var rectArray = CKEDITOR.tools.array.map( rectList, function( item ) {
						return item;
					} ),
					newRange = new CKEDITOR.dom.range( context.root ),
					widgetElements,
					widgetRects,
					widgetRange,
					documentFragment,
					moveStart,
					moveEnd;

				// In case of ranges start and end container set as widget wrapper, document container won't contain wrapper and we can't find its id.
				// Let's move ranges to parent element to fix that.
				if ( context.startContainer instanceof CKEDITOR.dom.element ) {
					moveStart = context.startOffset === 0 && context.startContainer.hasAttribute( 'data-widget' );
				}
				if ( context.endContainer instanceof CKEDITOR.dom.element ) {
					moveEnd = context.endOffset === ( context.endContainer.getChildCount ? context.endContainer.getChildCount() : context.endContainer.length );
					moveEnd = moveEnd && context.endContainer.hasAttribute( 'data-widget' );
				}

				if ( moveStart ) {
					newRange.setStart( context.startContainer.getParent(), context.startContainer.getIndex() );
				}
				if ( moveEnd ) {
					newRange.setEnd( context.endContainer.getParent(), context.endContainer.getIndex() + 1 );
				}
				if ( moveStart || moveEnd ) {
					context = newRange;
				}

				documentFragment = context.cloneContents();

				// Find all widget elements.
				widgetElements = documentFragment.find( '[data-cke-widget-id]' ).toArray();
				widgetElements = CKEDITOR.tools.array.map( widgetElements, function( item ) {
					var editor = context.root.editor,
						id = item.getAttribute( 'data-cke-widget-id' );
					return editor.widgets.instances[ id ].element;
				} );

				if ( !widgetElements ) {
					return;
				}

				// Once we have all widgets, get all theirs rects.
				widgetRects = CKEDITOR.tools.array.map( widgetElements, function( element ) {
					var rects,
						container = element.getParent().hasClass( 'cke_widget_wrapper' ) ? element.getParent() : element;
					widgetRange = this.root.getDocument().$.createRange();

					widgetRange.setStart( container.getParent().$, container.getIndex() );
					widgetRange.setEnd( container.getParent().$, container.getIndex() + 1 );

					rects = widgetRange.getClientRects();
					// Still some browsers might have wrong rect for widget.element so lets make sure it is correct.
					rects.widgetRect = element.getClientRect();

					return rects;
				}, context );

				CKEDITOR.tools.array.forEach( widgetRects, function( item ) {
					var found;
					cleanWidgetRects( 0 );

					function cleanWidgetRects( startIndex ) {
						CKEDITOR.tools.array.forEach( rectArray, function( rectArrayItem, index ) {
							var compare = CKEDITOR.tools.objectCompare( item[ startIndex ], rectArrayItem );

							if ( !compare ) {
								compare = CKEDITOR.tools.objectCompare( item.widgetRect, rectArrayItem );
							}

							if ( compare ) {
								// Find widget rect in rectArray and remove following rects that represent widget child elements.
								Array.prototype.splice.call( rectArray, index, item.length - startIndex, item.widgetRect );
								found = true;
							}
						} );

						if ( !found ) {
							if ( startIndex < rectArray.length - 1 ) {
								// If first rect isn't existing inside rectArray lets take another element for reference.
								cleanWidgetRects( startIndex + 1 );
							} else {
								// If none of widgets rect is found add widget element rect to rect list.
								rectArray.push( item.widgetRect );
							}
						}
					}
				} );

				return rectArray;
			}

			// Create rectList when browser natively doesn't return it.
			function fixEmptyRectList( rectList, range, context ) {
				var first,
					textNode,
					itemToInsertAfter;

				if ( !range.collapsed ) {
					// In some cases ( eg. ranges contain only image ) IE will return empty rectList.

					rectList = [ getRect( context.createBookmark() ) ];
				} else if ( context.startContainer instanceof CKEDITOR.dom.element ) {
					// If collapsed ranges are in element add textNode and return its rects.

					first = context.checkStartOfBlock();
					textNode = new CKEDITOR.dom.text( '\u200b' );

					if ( first ) {
						context.startContainer.append( textNode, true );
					} else {
						if ( context.startOffset === 0 ) {
							textNode.insertBefore( context.startContainer.getFirst() );
						} else {
							itemToInsertAfter = context.startContainer.getChildren().getItem( context.startOffset - 1 );
							textNode.insertAfter( itemToInsertAfter );
						}
					}

					// Create native collapsed ranges inside just created textNode.
					range.setStart( textNode.$, 0 );
					range.setEnd( textNode.$, 0 );

					rectList = range.getClientRects();
					textNode.remove();
				} else if ( context.startContainer instanceof CKEDITOR.dom.text ) {
					if ( context.startContainer.getText() === '' ) {
						// In case of empty text fill it with zero width space.
						context.startContainer.setText( '\u200b' );
						rectList = range.getClientRects();

						context.startContainer.setText( '' );

					} else {
						// If there is text node which isn't empty, but still no rects are returned use IE8 polyfill.
						// This happens with selection at the end of line in IE.
						rectList = [ getRect( context.createBookmark() ) ];
					}
				}
				return rectList;
			}

			// Extending empty object with rect, to prevent inheriting from DOMRect, same approach as in CKEDITOR.dom.element.getClientRect().
			function convertRect( rect, isAbsolute, context ) {
				var newRect = CKEDITOR.tools.extend( {}, rect );

				if ( isAbsolute ) {
					newRect = CKEDITOR.tools.getAbsoluteRectPosition( context.document.getWindow(), newRect );
				}

				// Some browsers might not return width and height.
				!newRect.width && ( newRect.width = newRect.right - newRect.left );
				!newRect.height && ( newRect.height = newRect.bottom - newRect.top );
				return newRect;
			}

			// Fallback helper for browsers that don't support native getClientRects().
			function getRect( bookmark ) {
				var start = bookmark.startNode,
					end = bookmark.endNode,
					rects;

				// Inserting zero width space, to prevent some strange rects returned by IE.
				start.setText( '\u200b' );
				start.removeStyle( 'display' );

				if ( end ) {
					end.setText( '\u200b' );
					end.removeStyle( 'display' );

					rects = [ start.getClientRect(), end.getClientRect() ];

					end.remove();
				} else {
					rects = [ start.getClientRect(), start.getClientRect() ];
				}
				start.remove();

				return {
					right: Math.max( rects[ 0 ].right, rects[ 1 ].right ),
					bottom: Math.max( rects[ 0 ].bottom, rects[ 1 ].bottom ),
					left: Math.min( rects[ 0 ].left, rects[ 1 ].left ),
					top: Math.min( rects[ 0 ].top, rects[ 1 ].top ),
					width: Math.abs( rects[ 0 ].left - rects[ 1 ].left ),
					height: Math.max( rects[ 0 ].bottom, rects[ 1 ].bottom ) - Math.min( rects[ 0 ].top, rects[ 1 ].top )
				};
			}
		} )()
	}, true);
})();
