/**
 * @license Copyright (c) 2003-2013, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.html or http://ckeditor.com/license
 */

(function() {
	'use strict';

	var DTD = CKEDITOR.dtd,
		copy = CKEDITOR.tools.copy,
		trim = CKEDITOR.tools.trim,
		TEST_VALUE = 'cke-test';

	/**
	 * @class
	 */
	CKEDITOR.filter = function( editorOrRules ) {
		/**
		 * Whether custom {@link CKEDITOR.config#allowedContent} was set.
		 *
		 * @property {Boolean} customConfig
		 */

		/**
		 * Array of rules added by {@link #allow} method.
		 *
		 * Rules in this array are slightly modified version of those
		 * which were added.
		 *
		 * This property is useful for debugging issues with rules string parsing
		 * or for checking what rules were automatically added by editor features.
		 */
		this.allowedContent = [];

		/**
		 * Whether filter is disabled.
		 *
		 * To disable filter set {@link CKEDITOR.config#allowedContent} to `true`
		 * or use {@link #disable} method.
		 *
		 * @readonly
		 */
		this.disabled = false;

		/**
		 * Editor instance if not a standalone filter.
		 *
		 * @property {CKEDITOR.editor} [=null]
		 */
		this.editor = null;

		/**
		 * Enter mode used by filter when deciding how to strip disallowed elements.
		 *
		 * For editor's filter it will be set to {@link CKEDITOR.config#enterMode} unless this
		 * is a blockless (see {@link CKEDITOR.editor#blockless}) editor - in this case
		 * {@link CKEDITOR#ENTER_BR} will be forced.
		 *
		 * For standalone filter it will be by default set to {@link CKEDITOR#ENTER_P}.
		 *
		 * @property {CKEDITOR.ENTER_P/CKEDITOR.ENTER_DIV/CKEDITOR.ENTER_BR}
		 */
		this.enterMode = CKEDITOR.ENTER_P;

		this._ = {
			// Optimized allowed content rules.
			rules: {},
			// Object: element name => array of transformations groups.
			transformations: {},
			cachedTests: {}
		};

		if ( editorOrRules instanceof CKEDITOR.editor ) {
			var editor = this.editor = editorOrRules;
			this.customConfig = true;

			var allowedContent = editor.config.allowedContent,
				enterMode;

			// Disable filter completely by setting config.allowedContent = true.
			if ( allowedContent === true ) {
				this.disabled = true;
				return;
			}

			if ( !allowedContent )
				this.customConfig = false;

			// Force ENTER_BR for blockless editable.
			this.enterMode = enterMode = ( editor.blockless ? CKEDITOR.ENTER_BR : editor.config.enterMode );

			this.allow( 'br ' + ( enterMode == CKEDITOR.ENTER_P ? 'p' : enterMode == CKEDITOR.ENTER_DIV ? 'div' : '' ), 'default', 1 );
			this.allow( allowedContent, 'config', 1 );
			this.allow( editor.config.extraAllowedContent, 'extra', 1 );

			//
			// Add filter listeners to toHTML and toDataFormat events.
			//

			// Filter incoming "data".
			// Add element filter before htmlDataProcessor.dataFilter
			// when purifying input data to correct html.
			this._.toHtmlListener = editor.on( 'toHtml', function( evt ) {
				this.applyTo( evt.data.dataValue, true );
			}, this, null, 6 );

			// Filter outcoming "data".
			// Add element filter  after htmlDataProcessor.htmlFilter
			// when preparing output data HTML.
			this._.toDataFormatListener = editor.on( 'toDataFormat', function( evt ) {
				this.applyTo( evt.data.dataValue );
			}, this, null, 11 );
		}
		// Rules object passed in editorOrRules argument - initialize standalone filter.
		else {
			this.customConfig = false;
			this.allow( editorOrRules, 'default', 1 );
		}
	};

	CKEDITOR.filter.prototype = {
		/**
		 * Adds specified rules to the filter.
		 *
		 * @param {Object/String/CKEDITOR.style/Object[]/String[]/CKEDITOR.style[]} newRules
		 * @param {String} [featureName] Name of a feature that allows this content.
		 * @param {Boolean} [overrideCustom] By default this method will reject any rules
		 * if default {@link CKEDITOR.config#allowedContent} is defined. Pass `true`
		 * to force rules addition.
		 * @returns {Boolean} Whether rules were accepted.
		 */
		allow: function( newRules, featureName, overrideCustom ) {
			if ( this.disabled )
				return false;

			// Don't override custom user's configuration if not explicitly requested.
			if ( this.customConfig && !overrideCustom )
				return false;

			if ( !newRules )
				return false;

			// Clear cache, because new rules could change results of checks.
			this._.cachedChecks = {};

			var i, ret;

			if ( typeof newRules == 'string' )
				newRules = parseRulesString( newRules );
			else if ( newRules instanceof CKEDITOR.style )
				newRules = convertStyleToRules( newRules );
			else if ( CKEDITOR.tools.isArray( newRules ) ) {
				for ( i = 0; i < newRules.length; ++i )
					ret = this.allow( newRules[ i ], featureName, overrideCustom );
				return ret; // Return last status.
			}

			var groupName, rule,
				rulesToOptimize = [];

			for ( groupName in newRules ) {
				// { 'p h1': true } => { 'p h1': {} }.
				if ( typeof rule == 'boolean' )
					rule = {};
				// { 'p h1': func } => { 'p h1': { match: func } }.
				else if ( typeof rule == 'function' )
					rule = { match: rule };
				// Clone (shallow) rule, because we'll modify it later.
				else
					rule = copy( newRules[ groupName ] );

				// If this is not an unnamed rule ({ '$1' => { ... } })
				// move elements list to property.
				if ( groupName.charAt( 0 ) != '$' )
					rule.elements = groupName;

				if ( featureName )
					rule.featureName = featureName.toLowerCase();

				// Save rule and remember to optimize it.
				this.allowedContent.push( rule );
				rulesToOptimize.push( rule );
			}

			optimizeRules( this._.rules, rulesToOptimize );

			return true;
		},

		/**
		 * Apply this filter to passed fragment or element. The result
		 * of filtering is DOM tree without disallowed content.
		 *
		 * @param {CKEDITOR.htmlParser.fragment/CKEDITOR.htmlParser.element} fragment Node to be filtered.
		 * @param {Boolean} toHtml Set to `true` if filter is used together with {@link CKEDITOR.htmlDataProcessor#toHtml}.
		 */
		applyTo: function( fragment, toHtml ) {
			var toBeRemoved = [],
				rules = this._.rules,
				transformations = this._.transformations,
				filterFn = getFilterFunction( this ),
				protectedRegexs = this.editor && this.editor.config.protectedSource;

			// Filter all children, skip root (fragment or editable-like wrapper used by data processor).
			fragment.forEach( function( el ) {
					if ( el.type == CKEDITOR.NODE_ELEMENT )
						filterFn( el, rules, transformations, toBeRemoved, toHtml );
					else if ( el.type == CKEDITOR.NODE_COMMENT && el.value.match( /^{cke_protected}(?!{C})/ ) ) {
						if ( !filterProtectedElement( el, protectedRegexs, filterFn, rules, transformations, toHtml ) )
							toBeRemoved.push( el );
					}
				}, null, true );

			var node, element, check,
				toBeChecked = [],
				enterTag = [ 'p', 'br', 'div' ][ this.enterMode - 1 ];

			// Remove elements in reverse order - from leaves to root, to avoid conflicts.
			while ( ( node = toBeRemoved.pop() ) ) {
				if ( node.type == CKEDITOR.NODE_ELEMENT )
					removeElement( node, enterTag, toBeChecked );
				// This is a comment securing rejected element - remove it completely.
				else
					node.remove();
			}

			// Check elements that have been marked as possibly invalid.
			while ( ( check = toBeChecked.pop() ) ) {
				element = check.el;
				// Element has been already removed.
				if ( !element.parent )
					continue;

				switch ( check.check ) {
					// Check if element itself is correct.
					case 'it':
						// Check if element included in $removeEmpty has no children.
						if ( DTD.$removeEmpty[ element.name ] && !element.children.length )
							removeElement( element, enterTag, toBeChecked );
						// Check if that is invalid element.
						else if ( !validateElement( element ) )
							removeElement( element, enterTag, toBeChecked );
						break;

					// Check if element is in correct context. If not - remove element.
					case 'el-up':
						// Check if e.g. li is a child of body after ul has been removed.
						if ( element.parent.type != CKEDITOR.NODE_DOCUMENT_FRAGMENT &&
							!DTD[ element.parent.name ][ element.name ]
						)
							removeElement( element, enterTag, toBeChecked );
						break;

					// Check if element is in correct context. If not - remove parent.
					case 'parent-down':
						if ( element.parent.type != CKEDITOR.NODE_DOCUMENT_FRAGMENT &&
							!DTD[ element.parent.name ][ element.name ]
						)
							removeElement( element.parent, enterTag, toBeChecked );
						break;
				}

			}
		},

		/**
		 * Check whether feature can be enabled. Unlike the {@link #addFeature}
		 * this method always checks the feature, even when default configuration
		 * for {@link CKEDITOR.config#allowedContent} is used.
		 *
		 * @param feature
		 * @param feature.allowedContent HTML that can be generated by this feature.
		 * @param feature.requiredContent Minimal HTML that this feature must be allowed to
		 * generate for it to be able to function at all.
		 * @returns {Boolean} Whether this feature can be enabled.
		 */
		checkFeature: function( feature ) {
			if ( this.disabled )
				return true;

			if ( !feature )
				return true;

			// Some features may want to register other feature.
			// E.g. button may return command bound to it.
			if ( feature.toFeature )
				feature = feature.toFeature( this.editor );

			return !feature.requiredContent || this.check( feature.requiredContent );
		},

		/**
		 * Disable allowed content filter.
		 */
		disable: function() {
			this.disabled = true;
			if ( this._.toHtmlListener )
				this._.toHtmlListener.removeListener();
			if ( this._.toDataFormatListener )
				this._.toDataFormatListener.removeListener();
		},

		/**
		 * Add array of Feature's content forms. All forms
		 * will be then transformed to the first form which is allowed.
		 *
		 *		editor.filter.allow( 'i' );
		 *		editor.filter.addContentForms( [
		 *			'em',
		 *			'i',
		 *			[ 'span', function( el ) {
		 *				return el.styles[ 'font-style' ] == 'italic';
		 *			} ]
		 *		] );
		 *		// Now <em> and <span style="font-style:italic"> will be replaced with <i>
		 *		// because this is the first allowed form.
		 *
		 * This method is used by editor to add {@link CKEDITOR.feature#contentForms}
		 * when adding feature by {@link #addFeature} or {@link CKEDITOR.editor#addFeature}.
		 *
		 * @param {Array} forms
		 */
		addContentForms: function( forms ) {
			if ( this.disabled )
				return;

			if ( !forms )
				return;

			var i, form,
				transfGroups = [],
				preferredForm;

			// First, find preferred form - this is, first allowed.
			for ( i = 0; i < forms.length && !preferredForm; ++i ) {
				form = forms[ i ];

				// Check only strings and styles - array format isn't supported by #check().
				if ( ( typeof form == 'string' || form instanceof CKEDITOR.style ) && this.check( form ) )
					preferredForm = form;
			}

			// This feature doesn't have preferredForm, so ignore it.
			if ( !preferredForm )
				return;

			for ( i = 0; i < forms.length; ++i )
				transfGroups.push( getContentFormTransformationGroup( forms[ i ], preferredForm ) );

			this.addTransformations( transfGroups );
		},

		/**
		 * Checks whether a feature can be enabled for the HTML restrictions in place
		 * for the current CKEditor instance, based on the HTML the feature might
		 * generate and the minimal HTML the feature needs to be able to generate.
		 *
		 * @param feature
		 * @param feature.allowedContent HTML that can be generated by this feature.
		 * @param feature.requiredContent Minimal HTML that this feature must be allowed to
		 * generate for it to be able to function at all.
		 * @param {String} feature.name Name of this feature.
		 * @returns {Boolean} Whether this feature can be enabled.
		 */
		addFeature: function( feature ) {
			if ( this.disabled )
				return true;

			if ( !feature )
				return true;

			// Some features may want to register other feature.
			// E.g. button may return command bound to it.
			if ( feature.toFeature )
				feature = feature.toFeature( this.editor );

			// If default configuration (will be checked inside #allow()),
			// then add allowed content rules.
			this.allow( feature.allowedContent, feature.name );

			this.addTransformations( feature.contentTransformations );
			this.addContentForms( feature.contentForms );

			// If custom configuration, then check if required content is allowed.
			if ( this.customConfig && feature.requiredContent )
				return this.check( feature.requiredContent );

			return true;
		},

		/**
		 * Add an array of content transformations groups. One group
		 * may contain many transformations rules, but only the first
		 * matching rule in a group is executed.
		 *
		 * Single transformation rule is an object with 4 properties:
		 *
		 *	* `check` (optional) - if set and {@link CKEDITOR.filter} doesn't
		 *		accept this allowed content rule, this transformation rule
		 *		won't be executed (it doesn't *match*). This value is passed
		 *		to {@link #check}.
		 *	* `element` (optional) - this string property tells filter on which
		 *		element this transformation can be ran. It's optional, because
		 *		element's name can be obtained from `check` (if it's a String format)
		 *		or `left` (if it's a {@link CKEDITOR.style} instance).
		 *	* `left` (optional) - a function accepting element or {@link CKEDITOR.style}
		 *		instance verifying whether transformation should be
		 *		executed on this specific element. If it returns `false` or element
		 *		doesn't match this style this transformation rule doesn't *match*.
		 *	* `right` - a function accepting element and {@link CKEDITOR.filter.transformationsTools}
		 *		or a string containing name of {@link CKEDITOR.filter.transformationsTools} method
		 *		that should be called on element.
		 *
		 * There's also a shorthand format. Transformation rule can be defined by
		 * single string `'check:right'`. String before `':'` will be used as
		 * a `check` property and the second part as `right`.
		 *
		 * Transformation rules can be grouped. Filter will try to apply
		 * first rule in a group. If it *matches* it will ignore next rules and
		 * go to the next group. If it doesn't *match* it will check next one.
		 *
		 * Examples:
		 *
		 *		editor.filter.addTransformations( [
		 *			// First group.
		 *			[
		 *				// First rule. If table{width} is allowed
		 *				// executes {@link CKEDITOR.filter.transformationsTools#sizeToStyle} on table element.
		 *				'table{width}: sizeToStyle',
		 *				// Second rule shouldn't be executed if first was.
		 *				'table[width]: sizeToAttribute'
		 *			],
		 *			// Second group.
		 *			[
		 *				// This rule will add foo="1" attribute to all images that
		 *				// don't have it.
		 *				{
		 *					element: 'img',
		 *					left: function( el ) {
		 *						return !el.attributes.foo;
		 *					},
		 *					right: function( el, tools ) {
		 *						el.attributes.foo = '1';
		 *					}
		 *				}
		 *			]
		 *		] );
		 *
		 * This method is used by editor to add {@link CKEDITOR.feature#contentTransformations}
		 * when adding feature by {@link #addFeature} or {@link CKEDITOR.editor#addFeature}.
		 *
		 * @param {Array} transformations
		 */
		addTransformations: function( transformations ) {
			if ( this.disabled )
				return;

			if ( !transformations )
				return;

			var optimized = this._.transformations,
				group, i;

			for ( i = 0; i < transformations.length; ++i ) {
				group = optimizeTransformationsGroup( transformations[ i ] );

				if ( !optimized[ group.name ] )
					optimized[ group.name ] = [];

				optimized[ group.name ].push( group.rules );
			}
		},

		/**
		 * Check whether content defined in test argument is allowed
		 * by this filter.
		 *
		 * Unless `strictCheck` is set to `true` this method checks
		 * if all parts of the `test` (styles, attributes and classes)
		 * are accepted by the filter, not whether element with
		 * these properties only would be accepted.
		 *
		 * For example:
		 *
		 *		// Rule: 'img[!src,alt]'
		 *		filter.check( 'img[alt]' ); // -> true
		 *		filter.check( 'img[alt]', true, true ); // -> false
		 *
		 * Second check returned false because of `src` is required.
		 *
		 * @param {String/CKEDITOR.style} test
		 * @param {Boolean} [applyTransformations=true] Whether to use registered transformations.
		 * @param {Boolean} [strictCheck] Whether fitler should check if element with exactly
		 * these properties is allowed.
		 * @returns {Boolean} Returns `true` if content is allowed.
		 */
		check: function( test, applyTransformations, strictCheck ) {
			if ( this.disabled )
				return true;

			var element, result, cacheKey;

			if ( typeof test == 'string' ) {
				cacheKey = test + '<' + ( applyTransformations === false ? '0' : '1' ) + ( strictCheck ? '1' : '0' ) + '>';

				// Check if result of this check hasn't been already cached.
				if ( cacheKey in this._.cachedChecks )
					return this._.cachedChecks[ cacheKey ];

				// Create test element from string.
				element = mockElementFromString( test );
			} else
				// Create test element from CKEDITOR.style.
				element = mockElementFromStyle( test );

			// Make a deep copy.
			var clone = CKEDITOR.tools.clone( element ),
				toBeRemoved = [],
				transformations, i;

			// Apply transformations to original element.
			// Transformations will be applied to clone by the filter function.
			if ( applyTransformations !== false && ( transformations = this._.transformations[ element.name ] ) ) {
				for ( i = 0; i < transformations.length; ++i )
					applyTransformationsGroup( this, element, transformations[ i ] );

				// Transformations could modify styles or classes, so they need to be copied
				// to attributes object.
				updateAttributes( element );
			}

			// Filter clone of mocked element.
			// Do not run transformations.
			getFilterFunction( this )( clone, this._.rules, applyTransformations === false ? false : this._.transformations, toBeRemoved, false, !strictCheck, !strictCheck );

			// Element has been marked for removal.
			if ( toBeRemoved.length > 0 )
				result = false;
			// Compare only left to right, because clone may be only trimmed version of original element.
			else if ( !CKEDITOR.tools.objectCompare( element.attributes, clone.attributes, true ) )
				result = false;
			else
				result = true;

			// Cache result of this test - we can build cache only for string tests.
			if ( typeof test == 'string' )
				this._.cachedChecks[ cacheKey ] = result;

			return result;
		}
	};

	// Apply ACR to an element
	// @param rule
	// @param element
	// @param status Object containing status of element's filtering.
	// @param {Boolean} isSpecific True if this is specific element's rule, false if generic.
	// @param {Boolean} skipRequired If true don't check if element has all required properties.
	function applyRule( rule, element, status, isSpecific, skipRequired ) {
		var name = element.name;

		// This generic rule doesn't apply to this element - skip it.
		if ( !isSpecific && rule.elements && !rule.elements( name ) )
			return;

		// This rule doesn't match this element - skip it.
		if ( rule.match ) {
			if ( !rule.match( element ) )
				return;
		}

		// If element doesn't have all required styles/attrs/classes
		// this rule doesn't match it.
		if ( !skipRequired && !hasAllRequired( rule, element ) )
			return;

		// If this rule doesn't validate properties only mark element as valid.
		if ( !rule.propertiesOnly )
			status.valid = true;

		// Apply rule only when all attrs/styles/classes haven't been marked as valid.
		if ( !status.allAttributes )
			status.allAttributes = applyRuleToHash( rule.attributes, element.attributes, status.validAttributes );

		if ( !status.allStyles )
			status.allStyles = applyRuleToHash( rule.styles, element.styles, status.validStyles );

		if ( !status.allClasses )
			status.allClasses = applyRuleToArray( rule.classes, element.classes, status.validClasses );
	}

	// Apply itemsRule to items (only classes are kept in array).
	// Push accepted items to validItems array.
	// Return true when all items are valid.
	function applyRuleToArray( itemsRule, items, validItems ) {
		if ( !itemsRule )
			return;

		// True means that all elements of array are accepted (the asterix was used for classes).
		if ( itemsRule === true )
			return true;

		for ( var i = 0, l = items.length, item; i < l; ++i ) {
			item = items[ i ];
			if ( !validItems[ item ] )
				validItems[ item ] = itemsRule( item );
		}

		return false;
	}

	function applyRuleToHash( itemsRule, items, validItems ) {
		if ( !itemsRule )
			return;

		if ( itemsRule === true )
			return true;

		for ( var name in items ) {
			if ( !validItems[ name ] )
				validItems[ name ] = itemsRule( name, items[ name ] );
		}

		return false;
	}

	// Convert CKEDITOR.style to filter's rule.
	function convertStyleToRules( style ) {
		var styleDef = style.getDefinition(),
			rules = {},
			rule,
			attrs = styleDef.attributes;

		rules[ styleDef.element ] = rule = {
			styles: styleDef.styles,
			requiredStyles: styleDef.styles && CKEDITOR.tools.objectKeys( styleDef.styles )
		};

		if ( attrs ) {
			attrs = copy( attrs );
			rule.classes = attrs[ 'class' ] ? attrs[ 'class' ].split( /\s+/ ) : null;
			rule.requiredClasses = rule.classes;
			delete attrs[ 'class' ];
			rule.attributes = attrs;
			rule.requiredAttributes = attrs && CKEDITOR.tools.objectKeys( attrs );
		}

		return rules;
	}

	// Extract required properties from props (if it is a string or array -
	// other formats cannot contain required properties) and push them to req array.
	// Return props array with removed '!' characters from items' names.
	// It has to be returned because when props passed in string the
	// reference will be broken.
	function extractRequired( props, req ) {
		var prop, i;

		if ( typeof props == 'string' )
			props = props.split( /\s*,\s*/ );

		// Not an array - may be a function or object.
		if ( typeof props != 'object' || !props.length )
			return props;

		for ( i = 0; i < props.length; ++i ) {
			prop = props[ i ];
			if ( prop.indexOf( '!' ) == 0 )
				req.push( ( props[ i ] = prop.slice( 1 ) ) );
		}

		return props;
	}

	// Filter element protected with a comment.
	// Returns true if protected content is ok, false otherwise.
	function filterProtectedElement( comment, protectedRegexs, filterFn, rules, transformations, toHtml ) {
		var source = decodeURIComponent( comment.value.replace( /^{cke_protected}/, '' ) ),
			protectedFrag,
			toBeRemoved = [],
			node, i, match;

		// Protected element's and protected source's comments look exactly the same.
		// Check if what we have isn't a protected source instead of protected script/noscript.
		if ( protectedRegexs ) {
			for ( i = 0; i < protectedRegexs.length; ++i ) {
				if ( ( match = source.match( protectedRegexs[ i ] ) ) &&
					match[ 0 ].length == source.length	// Check whether this pattern matches entire source
														// to avoid '<script>alert("<? 1 ?>")</script>' matching
														// the PHP's protectedSource regexp.
				)
					return true;
			}
		}

		protectedFrag = CKEDITOR.htmlParser.fragment.fromHtml( source );

		if ( protectedFrag.children.length == 1 && ( node = protectedFrag.children[ 0 ] ).type == CKEDITOR.NODE_ELEMENT )
			filterFn( node, rules, transformations, toBeRemoved, toHtml );

		// If protected element has been marked to be removed, return 'false' - comment was rejected.
		return !toBeRemoved.length;
	}

	// Returns function that accepts {@link CKEDITOR.htmlParser.element}
	// and filters it basing on allowed content rules registered by
	// {@link #allow} method.
	//
	// @param {CKEDITOR.filter} that
	function getFilterFunction( that ) {
		// Return cached function.
		if ( that._.filterFunction )
			return that._.filterFunction;

		var unprotectElementsNamesRegexp = /^cke:(object|embed|param)$/,
			protectElementsNamesRegexp = /^(object|embed|param)$/;

		// Return and cache created function.
		// @param {CKEDITOR.htmlParser.element}
		// @param optimizedRules Rules to be used.
		// @param [transformations] Transformations to be applied.
		// @param {Array} toBeRemoved Array into which elements rejected by the filter will be pushed.
		// @param {Boolean} [toHtml] Set to true if filter used together with htmlDP#toHtml
		// @param {Boolean} [skipRequired] Whether element's required properties shouldn't be verified.
		// @param {Boolean} [skipFinalValidation] Whether to not perform final element validation (a,img).
		return that._.filterFunction = function( element, optimizedRules, transformations, toBeRemoved, toHtml, skipRequired, skipFinalValidation ) {
			var name = element.name,
				i, l, trans;

			// Unprotect elements names previously protected by htmlDataProcessor
			// (see protectElementNames and protectSelfClosingElements functions).
			// Note: body, title, etc. are not protected by htmlDataP (or are protected and then unprotected).
			if ( toHtml )
				element.name = name = name.replace( unprotectElementsNamesRegexp, '$1' );

			// If transformations are set apply all groups.
			if ( ( transformations = transformations && transformations[ name ] ) ) {
				populateProperties( element );

				for ( i = 0; i < transformations.length; ++i )
					applyTransformationsGroup( that, element, transformations[ i ] );
			}

			// Name could be changed by transformations.
			name = element.name;

			var rules = optimizedRules.elements[ name ],
				genericRules = optimizedRules.generic,
				status = {
					// Whether any of rules accepted element.
					// If not - it will be stripped.
					valid: false,
					// Objects containing accepted attributes, classes and styles.
					validAttributes: {},
					validClasses: {},
					validStyles: {},
					// Whether all are valid.
					// If we know that all element's attrs/classes/styles are valid
					// we can skip their validation, to improve performance.
					allAttributes: false,
					allClasses: false,
					allStyles: false
				};

			// Early return - if there are no rules for this element (specific or generic), remove it.
			if ( !rules && !genericRules ) {
				toBeRemoved.push( element );
				return;
			}

			// Could not be done yet if there were no transformations and if this
			// is real (not mocked) object.
			populateProperties( element );

			if ( rules ) {
				for ( i = 0, l = rules.length; i < l; ++i )
					applyRule( rules[ i ], element, status, true, skipRequired );
			}

			if ( genericRules ) {
				for ( i = 0, l = genericRules.length; i < l; ++i )
					applyRule( genericRules[ i ], element, status, false, skipRequired );
			}

			// Finally, if after running all filter rules it still hasn't been allowed - remove it.
			if ( !status.valid ) {
				toBeRemoved.push( element );
				return;
			}

			// Update element's attributes based on status of filtering.
			updateElement( element, status );

			if ( !skipFinalValidation && !validateElement( element ) ) {
				toBeRemoved.push( element );
				return;
			}

			// Protect previously unprotected elements.
			if ( toHtml )
				element.name = element.name.replace( protectElementsNamesRegexp, 'cke:$1' );
		};
	}

	// Check whether element has all properties (styles,classes,attrs) required by a rule.
	function hasAllRequired( rule, element ) {
		var required = rule.required;

		if ( !required )
			return true;

		var i, reqs, existing;

		if ( ( reqs = required.classes ) ) {
			existing = element.classes;
			for ( i = 0; i < reqs.length; ++i ) {
				if ( CKEDITOR.tools.indexOf( existing, reqs[ i ] ) == -1 )
					return false;
			}
		}

		return hasAllRequiredInHash( element.styles, required.styles ) &&
			hasAllRequiredInHash( element.attributes, required.attributes );
	}

	// Check whether all items in required (array) exist in existing (object).
	function hasAllRequiredInHash( existing, required ) {
		if ( !required )
			return true;

		for ( var i = 0; i < required.length; ++i ) {
			if ( !( required[ i ] in existing ) )
				return false;
		}

		return true;
	}

	// Create pseudo element that will be passed through filter
	// to check if tested string is allowed.
	function mockElementFromString( str ) {
		var element = parseRulesString( str )[ '$1' ],
			styles = element.styles,
			classes = element.classes;

		element.name = element.elements;
		element.classes = classes = ( classes ? classes.split( /\s*,\s*/ ) : [] );
		element.styles = mockHash( styles );
		element.attributes = mockHash( element.attributes );
		element.children = [];

		if ( classes.length )
			element.attributes[ 'class' ] = classes.join( ' ' );
		if ( styles )
			element.attributes.style = CKEDITOR.tools.writeCssText( element.styles );

		return element;
	}

	// Create pseudo element that will be passed through filter
	// to check if tested style is allowed.
	function mockElementFromStyle( style ) {
		var styleDef = style.getDefinition(),
			styles = styleDef.styles,
			attrs = styleDef.attributes || {};

		if ( styles ) {
			styles = copy( styles );
			attrs.style = CKEDITOR.tools.writeCssText( styles, true );
		} else
			styles = {};

		var el = {
			name: styleDef.element,
			attributes: attrs,
			classes: attrs[ 'class' ] ? attrs[ 'class' ].split( /\s+/ ) : [],
			styles: styles,
			children: []
		};

		return el;
	}

	// Mock hash based on string.
	// 'a,b,c' => { a: 'cke-test', b: 'cke-test', c: 'cke-test' }
	// Used to mock styles and attributes objects.
	function mockHash( str ) {
		// It may be a null or empty string.
		if ( !str )
			return {};

		var keys = str.split( /\s*,\s*/ ).sort(),
			obj = {}

		while ( keys.length )
			obj[ keys.shift() ] = TEST_VALUE;

		return obj;
	}

	var validators = { elements:1,styles:1,attributes:1,classes:1 },
		validatorsRequired = {
			styles: 'requiredStyles',
			attributes: 'requiredAttributes',
			classes: 'requiredClasses'
		};

	// Optimize rule's validators (for elements, styles, etc.).
	// If any of these validators is a wildcard return true,
	// what means that this rule is a priority.
	// It should be applied in the first order, because it will
	// mark many properties as valid without checking them,
	// so next rules will be able to skip them saving time.
	function optimizeValidators( rule ) {
		var validator, allReqs, reqProp,
			priority = false,
			reqs = {},
			hasReq;

		for ( var i in validators ) {
			allReqs = [];

			if ( ( validator = rule[ i ] ) ) {
				// Extract required properties (those with '!') to the allReqs array.
				validator = extractRequired( validator, allReqs );
				// True means that this is a wildcard, so this rule have a high priority.
				if ( ( rule[ i ] = validatorFunction( validator ) ) === true )
					priority = true;
			}

			// Add names from requiredClasses/Attrs/Styles to allReqs array.
			if ( ( reqProp = rule[ validatorsRequired[ i ] ] ) ) {
				if ( typeof reqProp == 'string' )
					reqProp = reqProp.split( /\s*,\s*/ );
				allReqs = allReqs.concat( reqProp );
			}

			if ( allReqs.length ) {
				reqs[ i ] = allReqs;
				hasReq = 1;
			}
		}

		return {
			priority: priority,
			required: hasReq ? reqs : null
		};
	}

	// Add optimized version of rule to optimizedRules object.
	function optimizeRules( optimizedRules, rules ) {
		var elementsRules = optimizedRules.elements || {},
			genericRules = optimizedRules.generic || [],
			i, l, rule, elements, element, optResult;

		for ( i = 0, l = rules.length; i < l; ++i ) {
			// Shallow copy. Do not modify original rule.
			rule = copy( rules[ i ] );

			// If elements list was explicitly defined,
			// add this rule for every defined element.
			if ( typeof rule.elements == 'string' ) {
				// Do not optimize rule.elements.
				elements = trim( rule.elements );
				delete rule.elements;
				optResult = optimizeValidators( rule );

				// E.g. "*(xxx)[xxx]" - it's a generic rule that
				// validates properties only.
				if ( elements == '*' ) {
					rule.propertiesOnly = true;
					// Add priority rules at the beginning.
					genericRules[ optResult.priority ? 'unshift' : 'push' ]( rule );
				} else {
					elements = elements.split( /\s+/ );

					while ( ( element = elements.pop() ) ) {
						if ( !elementsRules[ element ] )
							elementsRules[ element ] = [ rule ];
						else
							elementsRules[ element ][ optResult.priority ? 'unshift' : 'push' ]( rule );
					}
				}
			} else {
				optResult = optimizeValidators( rule );

				// Add priority rules at the beginning.
				genericRules[ optResult.priority ? 'unshift' : 'push' ]( rule );
			}

			rule.required = optResult.required;
		}

		optimizedRules.elements = elementsRules;
		optimizedRules.generic = genericRules.length ? genericRules : null;
	}

	//                  <   elements   ><                      styles, attributes and classes                       >< separator >
	var rulePattern = /^([a-z0-9*\s]+)((?:\s*{[!\w\-,\s\*]+}\s*|\s*\[[!\w\-,\s\*]+\]\s*|\s*\([!\w\-,\s\*]+\)\s*){0,3})(?:;\s*|$)/i,
		groupsPatterns = {
			styles: /{([^}]+)}/,
			attrs: /\[([^\]]+)\]/,
			classes: /\(([^\)]+)\)/
		};

	function parseRulesString( input ) {
		var match,
			props, styles, attrs, classes,
			rules = {},
			groupNum = 1;

		input = trim( input );

		while ( ( match = input.match( rulePattern ) ) ) {
			if ( ( props = match[ 2 ] ) ) {
				styles = parseProperties( props, 'styles' );
				attrs = parseProperties( props, 'attrs' );
				classes = parseProperties( props, 'classes' );
			} else
				styles = attrs = classes = null;

			// Add as an unnamed rule, because there can be two rules
			// for one elements set defined in string format.
			rules[ '$' + groupNum++ ] = {
				elements: match[ 1 ],
				classes: classes,
				styles: styles,
				attributes: attrs
			};

			// Move to the next group.
			input = input.slice( match[ 0 ].length );
		}

		return rules;
	}

	// Extract specified properties group (styles, attrs, classes) from
	// what stands after the elements list in string format of allowedContent.
	function parseProperties( properties, groupName ) {
		var group = properties.match( groupsPatterns[ groupName ] );
		return group ? trim( group[ 1 ] ) : null;
	}

	function populateProperties( element ) {
		// Parse classes and styles if that hasn't been done before.
		if ( !element.styles )
			element.styles = CKEDITOR.tools.parseCssText( element.attributes.style || '', 1 );
		if ( !element.classes )
			element.classes = element.attributes[ 'class' ] ? element.attributes[ 'class' ].split( /\s+/ ) : [];
	}

	// Copy element's styles and classes back to attributes array.
	function updateAttributes( element ) {
		var attrs = element.attributes,
			stylesArr = [],
			name, styles;

		// Will be recreated later if any of styles/classes exists.
		delete attrs.style;
		delete attrs[ 'class' ];

		if ( ( styles = CKEDITOR.tools.writeCssText( element.styles, true ) ) )
			attrs.style = styles;

		if ( element.classes.length )
			attrs[ 'class' ] = element.classes.sort().join( ' ' );
	}

	// Update element object based on status of filtering.
	function updateElement( element, status ) {
		var validAttrs = status.validAttributes,
			validStyles = status.validStyles,
			validClasses = status.validClasses,
			attrs = element.attributes,
			styles = element.styles,
			origClasses = attrs[ 'class' ],
			origStyles = attrs.style,
			name,
			stylesArr = [],
			classesArr = [],
			internalAttr = /^data-cke-/;

		// Will be recreated later if any of styles/classes were passed.
		delete attrs.style;
		delete attrs[ 'class' ];

		if ( !status.allAttributes ) {
			// We can safely remove class and styles attributes because they will be serialized later.
			for ( name in attrs ) {
				// If not valid and not internal attribute delete it.
				if ( !validAttrs[ name ] && !internalAttr.test( name ) )
					delete attrs[ name ];
			}
		}

		if ( !status.allStyles ) {
			for ( name in styles ) {
				if ( validStyles[ name ] )
					stylesArr.push( name + ':' + styles[ name ] );
			}
			if ( stylesArr.length )
				attrs.style = stylesArr.sort().join( '; ' );
		}
		else if ( origStyles )
			attrs.style = origStyles;

		if ( !status.allClasses ) {
			for ( name in validClasses ) {
				if ( validClasses[ name ] )
					classesArr.push( name );
			}
			if ( classesArr.length )
				attrs[ 'class' ] = classesArr.sort().join( ' ' );
		}
		else if ( origClasses )
			attrs[ 'class' ] = origClasses;
	}

	function validateElement( element ) {
		var attrs;

		switch ( element.name ) {
			case 'a':
				attrs = element.attributes;
				if ( !attrs.href && !attrs.name )
					return false;
				if ( !attrs.name && !element.children.length )
					return false;
				break;
			case 'img':
				if ( !element.attributes.src )
					return false;
				break;
		}

		return true;
	}

	// Create validator function based on multiple
	// accepted validator formats:
	// function, string ('a,b,c'), regexp, array (['a','b','c']) and object ({a:1,b:2,c:3})
	function validatorFunction( validator ) {
		if ( validator == '*' )
			return true;

		var type = typeof validator;
		if ( type == 'object' )
			type = validator.test ? 'regexp' :
				validator.push ? 'array' :
				type;

		switch ( type ) {
			case 'function':
				return validator;
			case 'string':
				var arr = trim( validator ).split( /\s*,\s*/ );
				return function( value ) {
					return CKEDITOR.tools.indexOf( arr, value ) > -1;
				};
			case 'regexp':
				return function( value ) {
					return validator.test( value );
				};
			case 'array':
				return function( value ) {
					return CKEDITOR.tools.indexOf( validator, value ) > -1;
				};
			case 'object':
				return function( value ) {
					return value in validator;
				};
		}
	}

	//
	// REMOVE ELEMENT ---------------------------------------------------------
	//

	// Checks whether node is allowed by DTD.
	function allowedIn( node, parentDtd ) {
		if ( node.type == CKEDITOR.NODE_ELEMENT )
			return parentDtd[ node.name ];
		if ( node.type == CKEDITOR.NODE_TEXT )
			return parentDtd[ '#' ];
		return true;
	}

	// Check whether all children will be valid in new context.
	// Note: it doesn't verify if text node is valid, because
	// new parent should accept them.
	function checkChildren( children, newParentName ) {
		var allowed = DTD[ newParentName ];

		for ( var i = 0, l = children.length, child; i < l; ++i ) {
			child = children[ i ];
			if ( child.type == CKEDITOR.NODE_ELEMENT && !allowed[ child.name ] )
				return false;
		}

		return true;
	}

	function createBr() {
		return new CKEDITOR.htmlParser.element( 'br' );
	}

	// Whether this is an inline element or text.
	function inlineNode( node ) {
		return node.type == CKEDITOR.NODE_TEXT ||
			node.type == CKEDITOR.NODE_ELEMENT && DTD.$inline[ node.name ];
	}

	function isBrOrBlock( node ) {
		return node.type == CKEDITOR.NODE_ELEMENT &&
			( node.name == 'br' || DTD.$block[ node.name ] );
	}

	// Try to remove element in the best possible way.
	//
	// @param {Array} toBeChecked After executing this function
	// this array will contain elements that should be checked
	// because they were marked as potentially:
	// * in wrong context (e.g. li in body),
	// * empty elements from $removeEmpty,
	// * incorrect img/a/other element validated by validateElement().
	function removeElement( element, enterTag, toBeChecked ) {
		var name = element.name;

		if ( DTD.$empty[ name ] || !element.children.length ) {
			// Special case - hr in br mode should be replaced with br, not removed.
			if ( name == 'hr' && enterTag == 'br' )
				element.replaceWith( createBr() );
			else {
				// Parent might become an empty inline specified in $removeEmpty or empty a[href].
				if ( element.parent )
					toBeChecked.push( { check: 'it', el: element.parent } );

				element.remove();
			}
		} else if ( DTD.$block[ name ] || name == 'tr' )
			if ( enterTag == 'br' )
				stripBlockBr( element, toBeChecked );
			else
				stripBlock( element, enterTag, toBeChecked );
		else {
			// Parent might become an empty inline specified in $removeEmpty or empty a[href].
			if ( element.parent )
				toBeChecked.push( { check: 'it', el: element.parent } );
			element.replaceWithChildren();
		}
	}

	// Strip element block, but leave its content.
	// Works in 'div' and 'p' enter modes.
	function stripBlock( element, enterTag, toBeChecked ) {
		var children = element.children;

		// First, check if element's children may be wrapped with <p/div>.
		// Ignore that <p/div> may not be allowed in element.parent.
		// This will be fixed when removing parent or by toBeChecked rule.
		if ( checkChildren( children, enterTag ) ) {
			element.name = enterTag;
			element.attributes = {};
			// Check if this p/div was put in correct context.
			// If not - strip parent.
			toBeChecked.push( { check: 'parent-down', el: element } );
			return;
		}

		var parent = element.parent,
			shouldAutoP = parent.type == CKEDITOR.NODE_DOCUMENT_FRAGMENT || parent.name == 'body',
			i, j, child, p, node,
			toBeRemoved = [];

		for ( i = children.length; i > 0; ) {
			child = children[ --i ];

			// If parent requires auto paragraphing and child is inline node,
			// insert this child into newly created paragraph.
			if ( shouldAutoP && inlineNode( child )  ) {
				if ( !p ) {
					p = new CKEDITOR.htmlParser.element( enterTag );
					p.insertAfter( element );

					// Check if this p/div was put in correct context.
					// If not - strip parent.
					toBeChecked.push( { check: 'parent-down', el: p } );
				}
				p.add( child, 0 );
			}
			// Child which doesn't need to be auto paragraphed.
			else {
				p = null;
				child.insertAfter( element );
				// If inserted into invalid context, mark it and check
				// after removing all elements.
				if ( parent.type != CKEDITOR.NODE_DOCUMENT_FRAGMENT &&
					child.type == CKEDITOR.NODE_ELEMENT &&
					!DTD[ parent.name ][ child.name ]
				)
					toBeChecked.push( { check: 'el-up', el: child } );
			}
		}

		// All children have been moved to element's parent, so remove it.
		element.remove();
	}

	// Prepend/append block with <br> if isn't
	// already prepended/appended with <br> or block and
	// isn't first/last child of its parent.
	// Then replace element with its children.
	// <p>a</p><p>b</p> => <p>a</p><br>b => a<br>b
	function stripBlockBr( element, toBeChecked ) {
		var br;

		if ( element.previous && !isBrOrBlock( element.previous ) ) {
			br = createBr();
			br.insertBefore( element );
		}

		if ( element.next && !isBrOrBlock( element.next ) ) {
			br = createBr();
			br.insertAfter( element );
		}

		element.replaceWithChildren();
	}

	//
	// TRANSFORMATIONS --------------------------------------------------------
	//

	// Apply given transformations group to the element.
	function applyTransformationsGroup( filter, element, group ) {
		var i, rule;

		for ( i = 0; i < group.length; ++i ) {
			rule = group[ i ];

			// Test with #check or #left only if it's set.
			// Do not apply transformations because that creates infinite loop.
			if ( ( !rule.check || filter.check( rule.check, false ) ) &&
				( !rule.left || rule.left( element ) ) ) {
				rule.right( element, transformationsTools );
				return; // Only first matching rule in a group is executed.
			}
		}
	}

	// Check whether element matches CKEDITOR.style.
	// The element can be a "superset" of style,
	// e.g. it may have more classes, but need to have
	// at least those defined in style.
	function elementMatchesStyle( element, style ) {
		var def = style.getDefinition(),
			defAttrs = def.attributes,
			defStyles = def.styles,
			attrName, styleName,
			classes, classPattern, cl;

		if ( element.name != def.element )
			return false;

		for ( attrName in defAttrs ) {
			if ( attrName == 'class' ) {
				classes = defAttrs[ attrName ].split( /\s+/ );
				classPattern = element.classes.join( '|' );
				while ( ( cl = classes.pop() ) ) {
					if ( classPattern.indexOf( cl ) == -1 )
						return false;
				}
			} else {
				if ( element.attributes[ attrName ] != defAttrs[ attrName ] )
					return false;
			}
		}

		for ( styleName in defStyles ) {
			if ( element.styles[ styleName ] != defStyles[ styleName ] )
				return false;
		}

		return true;
	}

	// Return transformation group for content form.
	// One content form makes one transformation rule in one group.
	function getContentFormTransformationGroup( form, preferredForm ) {
		var element, left;

		if ( typeof form == 'string' )
			element = form;
		else if ( form instanceof CKEDITOR.style ) {
			left = form;
		}
		else {
			element = form[ 0 ];
			left = form[ 1 ];
		}

		return [ {
			element: element,
			left: left,
			right: function( el, tools ) {
				tools.transform( el, preferredForm );
			}
		} ];
	}

	// Obtain element's name from transformation rule.
	// It will be defined by #element, or #check or #left (styleDef.element).
	function getElementNameForTransformation( rule, check ) {
		if ( rule.element )
			return rule.element;
		if ( check )
			return check.match( /^([a-z0-9]+)/i )[ 0 ];
		return rule.left.getDefinition().element;
	}

	function getMatchStyleFn( style ) {
		return function( el ) {
			return elementMatchesStyle( el, style );
		};
	}

	function getTransformationFn( toolName ) {
		return function( el, tools ) {
			tools[ toolName ]( el );
		};
	}

	function optimizeTransformationsGroup( rules ) {
		var groupName, i, rule,
			check, left, right,
			optimizedRules = [];

		for ( i = 0; i < rules.length; ++i ) {
			rule = rules[ i ];

			if ( typeof rule == 'string' ) {
				rule = rule.split( /\s*:\s*/ );
				check = rule[ 0 ];
				left = null;
				right = rule[ 1 ];
			} else {
				check = rule.check;
				left = rule.left;
				right = rule.right;
			}

			// Extract element name.
			if ( !groupName )
				groupName = getElementNameForTransformation( rule, check );

			if ( left instanceof CKEDITOR.style )
				left = getMatchStyleFn( left );

			optimizedRules.push( {
				// It doesn't make sense to test against name rule (e.g. 'table'), so don't save it.
				check: check == groupName ? null : check,

				left: left,

				// Handle shorthand format. E.g.: 'table[width]:sizeToAttribute'.
				right: typeof right == 'string' ? getTransformationFn( right ) : right
			} );
		}

		return {
			name: groupName,
			rules: optimizedRules
		};
	}

	/**
	 * Singleton containing tools useful for transformations rules.
	 *
	 * @class CKEDITOR.filter.transformationsTools
	 * @singleton
	 */
	var transformationsTools = CKEDITOR.filter.transformationsTools = {
		/**
		 * Convert `width` and `height` attributes to styles.
		 *
		 * @param {CKEDITOR.htmlParser.element} element
		 */
		sizeToStyle: function( element ) {
			this.lengthToStyle( element, 'width' );
			this.lengthToStyle( element, 'height' );
		},

		/**
		 * Convert `width` and `height` styles to attributes.
		 *
		 * @param {CKEDITOR.htmlParser.element} element
		 */
		sizeToAttribute: function( element ) {
			this.lengthToAttribute( element, 'width' );
			this.lengthToAttribute( element, 'height' );
		},

		/**
		 * Convert length in `attrName` attribute to a valid CSS length (like `width` or `height`).
		 *
		 * @param {CKEDITOR.htmlParser.element} element
		 * @param {String} attrName Name of an attribute that will be converted.
		 * @param {String} [styleName=attrName] Name of a style into which attribute will be converted.
		 */
		lengthToStyle: function( element, attrName, styleName ) {
			styleName = styleName || attrName;

			if ( !( styleName in element.styles ) ) {
				var value = element.attributes[ attrName ];

				if ( value ) {
					if ( ( /^\d+$/ ).test( value ) )
						value += 'px';

					element.styles[ styleName ] = value;
				}
			}

			delete element.attributes[ attrName ];
		},

		/**
		 * Convert length in `styleName` style to a valid length attribute (like `width` or `height`).
		 *
		 * @param {CKEDITOR.htmlParser.element} element
		 * @param {String} styleName Name of a style that will be converted.
		 * @param {String} [attrName=styleName] Name of an attribute into which style will be converted.
		 */
		lengthToAttribute: function( element, styleName, attrName ) {
			attrName = attrName || styleName;

			if ( !( attrName in element.attributes ) ) {
				var value = element.styles[ styleName ],
					match = value && value.match( /^(\d+)(?:\.\d*)?px$/ );

				if ( match )
					element.attributes[ attrName ] = match[ 1 ];
				// Pass the TEST_VALUE used by filter#check when mocking element.
				else if ( value == TEST_VALUE )
					element.attributes[ attrName ] = TEST_VALUE;
			}

			delete element.styles[ styleName ];
		},

		/**
		 * Check whether element matches given {@link CKEDITOR.style}.
		 * The element can be a "superset" of style, e.g. it may have
		 * more classes, but need to have at least those defined in style.
		 *
		 * @param {CKEDITOR.htmlParser.element} element
		 * @param {CKEDITOR.style} style
		 */
		matchesStyle: elementMatchesStyle,

		/*
		 * Transform element to given form.
		 *
		 * Form may be a:
		 * 	* {@link CKEDITOR.style},
		 *	* string - the new name of an element,
		 *
		 * @param {CKEDITOR.htmlParser.element} el
		 * @param {CKEDITOR.style/String} form
		 */
		transform: function( el, form ) {
			if ( typeof form == 'string' )
				el.name = form;
			// Form is an instance of CKEDITOR.style.
			else {
				var def = form.getDefinition(),
					defStyles = def.styles,
					defAttrs = def.attributes,
					attrName, styleName,
					existingClassesPattern, defClasses, cl;

				el.name = def.element;

				for ( attrName in defAttrs ) {
					if ( attrName == 'class' ) {
						existingClassesPattern = el.classes.join( '|' );
						defClasses = defAttrs[ attrName ].split( /\s+/ );

						while ( ( cl = defClasses.pop() ) ) {
							if ( existingClassesPattern.indexOf( cl ) == -1 )
								el.classes.push( cl );
						}
					} else {
						el.attributes[ attrName ] = defAttrs[ attrName ];
					}
				}

				for ( styleName in defStyles ) {
					el.styles[ styleName ] = defStyles[ styleName ];
				}
			}
		}
	};

})();