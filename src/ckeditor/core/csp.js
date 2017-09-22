( function() {
	'use strict';

	var JAVASCRIPT_PROTOCOL_EXP = /^\s*javascript\s*:(.*)$/i;
	var USELESS_JAVASCRIPT_EXP = /^\s*void\s*\(?\s*(?:'[^']*'|"[^"]*"|\d*)\s*\)?\s*;?\s*$/i;

	var EVENTS_MAP = {
		onmousedown: true,
		onkeydown: true,
		onkeypress: true,
		onfocus: true,
		onblur: true,
		onclick: true,
		onload: true,
		onmouseover: true,
		onmouseout: true,
		onmouseup: true
	};

	var SVG_NS = 'http://www.w3.org/2000/svg';
	var SVG_XLINK_NS = 'http://www.w3.org/1999/xlink';

	function TrustScriptInjector() {
		this._stack = [];
		this._flushPhase = false;
		this._KEY = '__cspTrustFunctions';

		CKEDITOR[ this._KEY ] = CKEDITOR[ this._KEY ] || {};
	}

	CKEDITOR.tools.extend( TrustScriptInjector.prototype, {

		addEventListener: function( element, eventName, body ) {
			var fn = this.createFunction( body, [ 'event' ] );

			var listener = function( event ) {
				var result = fn.call( this, event );
				if ( result === false ) {
					event.preventDefault();
				}
			};

			element.addEventListener( eventName, listener, false );
		},

		addHrefJavascript: function( element, body ) {
			var match = body.match( JAVASCRIPT_PROTOCOL_EXP );
			if ( !match ) {
				return;
			}

			var fn = null;
			if ( !USELESS_JAVASCRIPT_EXP.test( match[ 1 ] ) ) {
				fn = this.createFunction( 'return ' + match[ 1 ] );
			}

			var listener = function( event ) {
				event.preventDefault();
				if ( fn ) {
					fn();
				}
			};

			element.addEventListener( 'click', listener, false );
		},

		createFunction: function( body, args ) {
			var functions = CKEDITOR[ this._KEY ];
			var id = body;

			if ( !functions.hasOwnProperty( id ) ) {
				functions[ id ] = null;

				var quotedId = '"' + id.replace(/"/g, '\\$&') + '"';

				this._stack.push(
					'CKEDITOR["' + this._KEY + '"][' + quotedId + '] = ' +
					'function(' + ( args || [] ).join(',') + '){' + body + '};'
				);

				this._startFlushPhase();
			}

			return function() {
				var fn = functions[ id ];
				if ( !fn ) {
					console.error( 'CKEDITOR.csp: Trust function "' + body + '" is not initialized!' );
				} else {
					return fn.apply( this, arguments );
				}
			};
		},

		_startFlushPhase: function() {
			if ( !this._flushPhase ) {
				this._flushPhase = true;
				setTimeout( this._finishFlushPhase.bind( this ) );
			}
		},

		_finishFlushPhase: function() {
			this._flushPhase = false;

			var head = document.querySelector( 'head' );
			var script = document.createElement( 'script' );
			script.type = 'text/javascript';
			script.setAttribute( 'nonce', CKEDITOR.env.nonce );

			script.text = this._stack.join( '' );
			this._stack.length = 0;

			head.appendChild( script );
		}

	} );



	function TrustScriptBinderSection() {
		this.className = null;
		this._stack = [];
	}

	CKEDITOR.tools.extend( TrustScriptBinderSection.prototype, {

		addHrefJavascript: function( body ) {
			var match = body.match( JAVASCRIPT_PROTOCOL_EXP );
			if ( !match ) {
				return;
			}

			var content = '';
			if ( !USELESS_JAVASCRIPT_EXP.test( match[ 1 ] ) ) {
				content = 'return ' + match[ 1 ] + ';';
			}

			this._stack.push(
				'element.addEventListener( "click", function( event ) {' +
				'event.preventDefault(); ' + content + ' }, false );'
			);
		},

		addEventListener: function( eventName, body, tagName ) {
			var elementName = 'element';

			if ( tagName === 'body' && eventName === 'load' ) {
				elementName = 'window';
			} else {
				this._useClassNameBinding();
			}

			this._stack.push(
				elementName + '.addEventListener( "' + eventName + '", function( event ) {' +
				'var result = ( function() { ' + body + ' } )();' +
				'if ( result === false ) { event.preventDefault(); }' +
				'}, false );'
			);
		},

		getScript: function() {
			var content = this._stack.join( '' );

			if ( !this.className ) {
				return content;
			}

			return (
				'( function( element ) { ' +
				content +
				'} )( document.querySelector( ".' + this.className + '" ) );'
			);
		},

		isNotEmpty: function() {
			return this._stack.length !== 0;
		},

		_useClassNameBinding: function() {
			if ( !this.className ) {
				this.className = '_cke_csp_' + Math.random().toString( 36 ).slice( 2 );
			}
		}

	} );


	function TrustScriptBinder() {
		this._sections = [];
	}

	CKEDITOR.tools.extend( TrustScriptBinder.prototype, {

		createSection: function() {
			var section = new TrustScriptBinderSection();
			this._sections.push( section );
			return section;
		},

		getScript: function() {
			return (
				'<script type="text/javascript" nonce="' + CKEDITOR.env.nonce + '">' +
				this._sections.map( function( section ) {
					return section.getScript();
				} ).join( '' ) +
				'</script>'
			);
		},

		isNotEmpty: function() {
			return this._sections.length !== 0;
		},

		reset: function() {
			this._sections.length = 0;
		}

	} );


	function Csp() {
		this._scriptInjector = new TrustScriptInjector();
	}

	CKEDITOR.tools.extend( Csp.prototype, {

		trustSetInnerHtml: function( target, html ) {
			if ( !CKEDITOR.env.nonce ) {
				target.innerHTML = html;
				return;
			}

			var scriptInjector = this._scriptInjector;
			var parser = new CKEDITOR.htmlParser();
			var fragment = document.createDocumentFragment();
			var stack = [ fragment ];
			var svg = false;

			parser.onTagOpen = function( tagName, attributes, selfClosing ) {
				if ( tagName === 'svg' ) {
					svg = true;
				}

				var element;
				if ( svg ) {
					element = document.createElementNS( SVG_NS, tagName );
				} else {
					element = document.createElement( tagName );
				}

				for ( var name in attributes ) {
					if ( attributes.hasOwnProperty( name ) ) {
						var value = attributes[ name ];

						if ( name === 'href' && JAVASCRIPT_PROTOCOL_EXP.test( value ) ) {
							scriptInjector.addHrefJavascript( element, value );
							continue;
						}

						if ( EVENTS_MAP.hasOwnProperty( name ) ) {
							scriptInjector.addEventListener( element, name.slice( 2 ), value );
							continue;
						}

						if ( name.substring( 0, 2 ) === 'on' ) {
							console.error( 'CKEDITOR.csp: Event "' + name + '" is not found in EVENTS_MAP!' );
						}

						if ( svg && name === 'xlink:href' ) {
							element.setAttributeNS( SVG_XLINK_NS, 'href', value );
							continue;
						}

						element.setAttribute( name, value );
					}
				}

				var container = stack[ stack.length - 1 ];
				container.appendChild( element );

				if ( !selfClosing ) {
					stack.push( element );
				}
			};

			parser.onTagClose = function( tagName ) {
				if ( tagName === 'svg' ) {
					svg = false;
				}

				stack.pop();
			};

			parser.onText = function( text ) {
				var container = stack[ stack.length - 1 ];
				container.appendChild( document.createTextNode( CKEDITOR.tools.htmlDecode( text ) ) );
			};

			parser.onComment = function( comment ) {
				var container = stack[ stack.length - 1 ];
				container.appendChild( document.createComment( comment ) );
			};

			parser.parse( html );

			target.innerHTML = '';

			var nodes = Array.prototype.slice.call( fragment.childNodes );
			nodes.forEach( function( node ) {
				target.appendChild( node );
			} );
		},


		trustWriteHtml: function( doc, html ) {
			if ( !CKEDITOR.env.nonce ) {
				return doc.write( html );
			}

			var binder = new TrustScriptBinder();
			var parser = new CKEDITOR.htmlParser();
			var output = [];

			parser.onTagOpen = function( tagName, attributes, selfClosing ) {
				if ( tagName === '!doctype' ) {
					tagName = tagName.toUpperCase();
				}

				output.push( '<' + tagName );

				if ( tagName === 'script' ) {
					attributes.nonce = CKEDITOR.env.nonce;
				}

				var section = null;

				for ( var name in attributes ) {
					if ( attributes.hasOwnProperty( name ) ) {
						var value = attributes[ name ];

						if ( name === 'href' && JAVASCRIPT_PROTOCOL_EXP.test( value ) ) {
							if ( !section ) {
								section = binder.createSection();
							}
							section.addHrefJavascript( value );
							continue;
						}

						if ( EVENTS_MAP.hasOwnProperty( name ) ) {
							if ( !section ) {
								section = binder.createSection();
							}
							section.addEventListener( name.slice( 2 ), value, tagName );
							continue;
						}

						if ( name.substring( 0, 2 ) === 'on' ) {
							console.error( 'CKEDITOR.csp: Event "' + name + '" is not found in EVENTS_MAP!' );
						}

						if ( name === 'class' ) {
							continue;
						}

						if ( value === '' ) {
							output.push( ' ' + name );
						} else {
							output.push( ' ' + name + '="' + CKEDITOR.tools.htmlEncodeAttr( value ) + '"' );
						}
					}
				}

				if ( section && section.isNotEmpty() && section.className ) {
					attributes.class = ( attributes.class || '' ) + ' ' + section.className;
				}

				if ( attributes.class ) {
					output.push( ' class="' + CKEDITOR.tools.htmlEncodeAttr( attributes.class ) + '"' );
				}

				if ( selfClosing ) {
					output.push( '/' );
				}
				output.push( '>' );
			};

			parser.onTagClose = function( tagName ) {
				if ( tagName === 'body' && binder.isNotEmpty() ) {
					output.push( binder.getScript() );
					binder.reset();
				}

				output.push( '</' + tagName + '>' );
			};

			parser.onText = function( text ) {
				output.push( text );
			};

			parser.onCDATA = function( cdata ) {
				output.push( cdata );
			};

			parser.onComment = function( comment ) {
				output.push( comment );
			};

			parser.parse( html );

			if ( binder.isNotEmpty() ) {
				output.push( binder.getScript() );
			}

			return doc.write( output.join( '' ) );
		},


		trustSetAttribute: function( element, name, value ) {
			if ( CKEDITOR.env.nonce && name === 'href' ) {
				var match = String( value ).match( JAVASCRIPT_PROTOCOL_EXP );

				if ( match && USELESS_JAVASCRIPT_EXP.test( match[ 1 ] ) ) {
					return;
				}
			}

			element.setAttribute( name, value );
		}


	} );


	CKEDITOR.csp = new Csp();

} )();

