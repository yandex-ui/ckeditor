(function() {
	'use strict';

	CKEDITOR.tools.extend(CKEDITOR.dom.documentFragment.prototype, {
		/**
		 * Wrapper for `querySelectorAll`. Returns a list of elements within this document that match
		 * the specified `selector`.
		 *
		 * **Note:** The returned list is not a live collection (like the result of native `querySelectorAll`).
		 *
		 * @since 4.3
		 * @param {String} selector A valid [CSS selector](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors).
		 * @returns {CKEDITOR.dom.nodeList}
		 */
		find: function( selector ) {
			return new CKEDITOR.dom.nodeList( this.$.querySelectorAll( selector ) );
		},

		/**
		 * Wrapper for `querySelector`. Returns the first element within this document that matches
		 * the specified `selector`.
		 *
		 * @since 4.3
		 * @param {String} selector A valid [CSS selector](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors).
		 * @returns {CKEDITOR.dom.element}
		 */
		findOne: function( selector ) {
			var el = this.$.querySelector( selector );

			return el ? new CKEDITOR.dom.element( el ) : null;
		}
	}, true);
})();
