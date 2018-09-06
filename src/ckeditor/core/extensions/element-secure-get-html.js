(function() {
	'use strict';

	CKEDITOR.tools.extend( CKEDITOR.dom.element.prototype, {
		getHtml: function() {
			var serializer = new XMLSerializer();
			var retval = Array.prototype.slice.call(this.$.childNodes).map(function(node) {
				return serializer.serializeToString(node);
			}).join('');

			// Strip <?xml:namespace> tags in IE. (#3341).
			return CKEDITOR.env.ie ? retval.replace( /<\?[^>]*>/g, '' ) : retval;
		}
	}, true);
})();
