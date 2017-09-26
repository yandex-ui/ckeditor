( function() {
	'use strict';

	var JS_PROTOCOL_REG_EXP = /^\s*javascript\s*:(.*)$/i;
	var USELESS_JS_REG_EXP = /^\s*void\s*\(?\s*(?:'[^']*'|"[^"]*"|\d*)\s*\)?\s*;?\s*$/i;

	function TrustScriptInjector() {
		this._stack = [];
		this._flushPhase = false;
		this._KEY = '__cspTrustFunctions';

		CKEDITOR[ this._KEY ] = CKEDITOR[ this._KEY ] || {};
	}

	CKEDITOR.tools.extend( TrustScriptInjector.prototype, {

		createEventFunction: function( body ) {
			return this.createFunction( body, [ 'event' ] );
		},

		createHrefFunction: function( body ) {
			return this.createFunction( 'return ' + body );
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

			if ( this._stack.length > 0 ) {
				var head = document.querySelector( 'head' );
				var script = document.createElement( 'script' );
				script.type = 'text/javascript';
				script.setAttribute( 'nonce', CKEDITOR.env.nonce );

				script.text = this._stack.join( '' );
				this._stack.length = 0;

				head.appendChild( script );
			}
		}

	} );


	function TrustScriptBinderSection() {
		this.className = null;
		this._stack = [];
	}

	CKEDITOR.tools.extend( TrustScriptBinderSection.prototype, {

		addHrefJavascript: function( body ) {
			var match = body.match( JS_PROTOCOL_REG_EXP );
			if ( !match ) {
				return;
			}

			var content = '';
			if ( !USELESS_JS_REG_EXP.test( match[ 1 ] ) ) {
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

	var TAG_REG_EXP = /<[^>]+>/g;
	var EVENTS_REG_EXP = /(\s)on(mousedown|mouseover|mouseout|mouseup|keydown|keypress|focus|blur|click)\s*=\s*("[^"]*"|'[^']*')/gi;
	var HREF_JS_REG_EXP = /(\s)href\s*=\s*(?:(")\s*javascript\s*:([^"]*)"|(')\s*javascript\s*:([^']*)')/gi;

	CKEDITOR.tools.extend( Csp.prototype, {

		trustSetInnerHtml: function( target, html ) {
			if ( !CKEDITOR.env.nonce ) {
				target.innerHTML = html;
				return;
			}

			var scriptInjector = this._scriptInjector;

			var output = html
				.replace( TAG_REG_EXP, function( tag ) {
					return tag
						.replace( EVENTS_REG_EXP, function( match, space, eventName, body ) {
							scriptInjector.createEventFunction( body.slice( 1, -1 ) );

							return space + 'data-cke-csp-event-' + eventName + '=' + body;
						} )
						.replace( HREF_JS_REG_EXP, function( match, space, quote, body ) {
							var prefix = '';
							if ( USELESS_JS_REG_EXP.test( body ) ) {
								prefix = 'useless-';

							} else {
								scriptInjector.createHrefFunction( body );
							}

							return space + 'data-cke-csp-href-' + prefix + 'javascript=' + quote + body + quote;
						} );
				} );

			target.innerHTML = output;

			var eventsUsed = {};
			output.replace( /data-cke-csp-event-([^\s=]+)[\s=]/gi, function( match, eventName ) {
				eventsUsed[ eventName ] = true;
			} );

			Object.keys( eventsUsed ).forEach(function( eventName ) {
				var dataAttrName = 'data-cke-csp-event-' + eventName;
				var nodes = target.querySelectorAll( '[' + dataAttrName + ']' );

				[].forEach.call( nodes || [], function( node ) {
					node.addEventListener( eventName, function( event ) {
						var node = this;
						if ( !node.hasAttribute( dataAttrName ) ) {
							return;
						}
						var body = node.getAttribute( dataAttrName );
						var fn = scriptInjector.createEventFunction( body );
						var result = fn.call( this, event );
						if ( result === false ) {
							event.preventDefault();
						}
					} );
				} );
			} );

			var jsHrefUsed = /data-cke-csp-href-/i.test( output );

			if ( jsHrefUsed ) {
				var nodes = target.querySelectorAll(
					'[data-cke-csp-href-useless-javascript], [data-cke-csp-href-javascript]'
				);

				[].forEach.call( nodes || [], function( node ) {
					node.addEventListener( 'click', function( event ) {
						var node = this;
						if ( node.hasAttribute( 'data-cke-csp-href-useless-javascript' ) ) {
							event.preventDefault();
							return;
						}
						var hrefDataName = 'data-cke-csp-href-javascript';
						if ( !node.hasAttribute( hrefDataName ) ) {
							return;
						}
						event.preventDefault();

						var body = node.getAttribute( hrefDataName );
						var fn = scriptInjector.createHrefFunction( body );
						fn();
					} );
				} );
			}
		},


		trustWriteHtml: function( doc, html ) {
			if ( !CKEDITOR.env.nonce ) {
				return doc.write( html );
			}

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

						if ( name === 'href' && JS_PROTOCOL_REG_EXP.test( value ) ) {
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
				var match = String( value ).match( JS_PROTOCOL_REG_EXP );

				if ( match && USELESS_JS_REG_EXP.test( match[ 1 ] ) ) {
					return;
				}
			}

			element.setAttribute( name, value );
		}


	} );


	CKEDITOR.csp = new Csp();

} )();

