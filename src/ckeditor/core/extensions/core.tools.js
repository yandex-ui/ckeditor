(function() {
	'use strict';

	function DebounceBuffer( minInterval, output, context ) {
		CKEDITOR.tools.buffers.throttle.call( this, minInterval, output, context );

		var that = this;

		this.input = function() {
			that._args = Array.prototype.slice.call( arguments );

			if ( that._scheduledTimer && that._reschedule() === false ) {
				return;
			}

			that._scheduledTimer = setTimeout( triggerOutput, that._minInterval );

			function triggerOutput() {
				that._lastOutput = ( new Date() ).getTime();
				that._scheduledTimer = 0;

				that._call();
			}
		};
	}

	DebounceBuffer.prototype = CKEDITOR.tools.prototypedCopy( CKEDITOR.tools.buffers.throttle.prototype );

	CKEDITOR.tools.buffers.debounce = DebounceBuffer;

	CKEDITOR.tools.debounce = function( minInterval, output, contextObj ) {
		return new this.buffers.debounce( minInterval, output, contextObj );
	};
})();
