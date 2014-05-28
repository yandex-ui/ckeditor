/* bender-tags: editor,unit */

( function() {
	'use strict';

		// http://ckeditor4.t/
	var path = window.location.protocol + '//' + window.location.host,
		// http://ckeditor4.t/tests/tests/core/ckeditor
		folderPath = path + window.location.pathname.slice( 0, window.location.pathname.lastIndexOf( '/' ) ),
		query = CKEDITOR.timestamp ? '?t=' + CKEDITOR.timestamp : '';

	bender.test( {
		'test default BASEPATH': function() {
			var iframe = CKEDITOR.document.getById( 'iframe-default' ),
				doc = iframe.getFrameDocument(),
				defaultPath = CKEDITOR.basePath;

			iframe.on( 'load', function() {
				resume( function() {
					var iCKEDITOR = iframe.$.contentWindow.CKEDITOR;

					assert.areSame( defaultPath  + 'ckeditor.js' + query,
						iCKEDITOR.getUrl( 'ckeditor.js' ) );
					assert.areSame( defaultPath  + 'skins/default/editor.css' + query,
						iCKEDITOR.getUrl( 'skins/default/editor.css' ) );
					assert.areSame( '/skins/default/editor.css' + query,
						iCKEDITOR.getUrl( '/skins/default/editor.css' ) );
					assert.areSame( 'http://www.otherdomain.com/skins/default/editor.css'  + query,
						iCKEDITOR.getUrl( 'http://www.otherdomain.com/skins/default/editor.css' ) );
				} );
			} );

			doc.$.open();
			doc.$.write(
				'<script src="' + defaultPath + 'ckeditor.js"></scr' + 'ipt>' );
			doc.$.close();

			wait();
		},

		'test full BASEPATH': function() {
			var iframe = CKEDITOR.document.getById( 'iframe-full' ),
				doc = iframe.getFrameDocument(),
				secondDomainName = bender.config.secondDomainName;

			iframe.on( 'load', function() {
				resume( function() {
					var iCKEDITOR = iframe.$.contentWindow.CKEDITOR;

					assert.areSame( 'http://' + secondDomainName + '/ckeditor/', iCKEDITOR.basePath );
					assert.areSame( 'http://' + secondDomainName + '/ckeditor/ckeditor.js' + query,
						iCKEDITOR.getUrl( 'ckeditor.js' ) );
					assert.areSame( 'http://' + secondDomainName + '/ckeditor/skins/default/editor.css' + query,
						iCKEDITOR.getUrl( 'skins/default/editor.css' ) );
					assert.areSame( '/skins/default/editor.css' + query,
						iCKEDITOR.getUrl( '/skins/default/editor.css' ) );
					assert.areSame( 'http://www.otherdomain.com/skins/default/editor.css' + query,
						iCKEDITOR.getUrl( 'http://www.otherdomain.com/skins/default/editor.css' ) );
				} );
			} );

			doc.$.open();
			doc.$.write(
				'<script>CKEDITOR_BASEPATH = "http://' + secondDomainName + '/ckeditor/";</scr' + 'ipt>' +
				'<script src="' + CKEDITOR.getUrl( 'ckeditor.js' ) + '"></scr' + 'ipt>' );
			doc.$.close();

			wait();
		},

		'test absolute BASEPATH': function() {
			var iframe = CKEDITOR.document.getById( 'iframe-absolute' ),
				doc = iframe.getFrameDocument();

			iframe.on( 'load', function() {
				resume( function() {
					var iCKEDITOR = iframe.$.contentWindow.CKEDITOR;

					assert.areSame( path +'/ckeditor/', iCKEDITOR.basePath );
					assert.areSame( path + '/ckeditor/ckeditor.js' + query,
						iCKEDITOR.getUrl( 'ckeditor.js' ) );
					assert.areSame( path + '/ckeditor/skins/default/editor.css' + query,
						iCKEDITOR.getUrl( 'skins/default/editor.css' ) );
					assert.areSame( '/skins/default/editor.css' + query,
						iCKEDITOR.getUrl( '/skins/default/editor.css' ) );
					assert.areSame( 'http://www.otherdomain.com/skins/default/editor.css' + query,
						iCKEDITOR.getUrl( 'http://www.otherdomain.com/skins/default/editor.css' ) );
				} );
			} );

			doc.$.open();
			doc.$.write(
				'<script>CKEDITOR_BASEPATH = "/ckeditor/";</scr' + 'ipt>' +
				'<script src="' + CKEDITOR.getUrl( 'ckeditor.js' ) + '"></scr' + 'ipt>' );
			doc.$.close();

			wait();
		},

		'test relative BASEPATH': function() {
			var iframe = CKEDITOR.document.getById( 'iframe-relative' ),
				doc = iframe.getFrameDocument();

			iframe.on( 'load', function() {
				resume( function() {
					var iCKEDITOR = iframe.$.contentWindow.CKEDITOR;

					assert.areSame( path + '/tests/tests/core/ckeditor/../../../ckeditor/', iCKEDITOR.basePath );
					assert.areSame( folderPath + '/../../../ckeditor/ckeditor.js' + query,
						iCKEDITOR.getUrl( 'ckeditor.js' ) );
					assert.areSame( folderPath + '/../../../ckeditor/skins/default/editor.css' + query,
						iCKEDITOR.getUrl( 'skins/default/editor.css' ) );
					assert.areSame( '/skins/default/editor.css' + query,
						iCKEDITOR.getUrl( '/skins/default/editor.css' ) );
					assert.areSame( 'http://www.otherdomain.com/skins/default/editor.css' + query,
						iCKEDITOR.getUrl( 'http://www.otherdomain.com/skins/default/editor.css' ) );
				} );
			} );

			doc.$.open();
			doc.$.write(
				'<script>CKEDITOR_BASEPATH = "../../../ckeditor/";</scr' + 'ipt>' +
				'<script src="' + CKEDITOR.getUrl( 'ckeditor.js' ) + '"></scr' + 'ipt>' );
			doc.$.close();

			wait();
		},

		'test protocol relative BASEPATH': function() {
			var iframe = CKEDITOR.document.getById( 'iframe-protocol-relative' ),
				doc = iframe.getFrameDocument(),
				secondDomainName = bender.config.secondDomainName;

			iframe.on( 'load', function() {
				resume( function() {
					var iCKEDITOR = iframe.$.contentWindow.CKEDITOR;

					assert.areSame( '//' + secondDomainName + '/ckeditor/', iCKEDITOR.basePath );
					assert.areSame( '//' + secondDomainName + '/ckeditor/ckeditor.js' + query,
						iCKEDITOR.getUrl( 'ckeditor.js' ) );
					assert.areSame( '//' + secondDomainName + '/ckeditor/skins/default/editor.css' + query,
						iCKEDITOR.getUrl( 'skins/default/editor.css' ) );
					assert.areSame( '/skins/default/editor.css' + query,
						iCKEDITOR.getUrl( '/skins/default/editor.css' ) );
					assert.areSame( 'http://www.otherdomain.com/skins/default/editor.css' + query,
						iCKEDITOR.getUrl( 'http://www.otherdomain.com/skins/default/editor.css' ) );
				} );
			} );

			doc.$.open();
			doc.$.write(
				'<script>CKEDITOR_BASEPATH = "//' + secondDomainName + '/ckeditor/";</scr' + 'ipt>' +
				'<script src="' + CKEDITOR.getUrl( 'ckeditor.js' ) + '"></scr' + 'ipt>' );
			doc.$.close();

			wait();
		}
	} );
} )();