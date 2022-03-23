(function() {
	CKEDITOR.tools.extend(CKEDITOR.dom.nodeList.prototype, {
		/**
		 * Returns a node list as an array.
		 *
		 * @returns {CKEDITOR.dom.node[]}
		 */
		toArray: function() {
			return CKEDITOR.tools.array.map( this.$, function( nativeEl ) {
				return new CKEDITOR.dom.node( nativeEl );
			} );
		}
	});
})();
