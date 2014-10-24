/* bender-tags: editor,unit,clipboard,widget */
/* bender-ckeditor-plugins: uploadwidget,uploadimage,toolbar,image2 */
/* bender-include: %BASE_PATH%/plugins/clipboard/_helpers/pasting.js */

/*global pasteFiles */

'use strict';

( function() {
	var editors, editorBots, uploadCount, loadAndUploadCount, lastUploadUrl, resumeAfter;

	var editorsDefinitions = {
		classic: {
			name: 'classic',
			creator: 'replace',
			config: {
				extraPlugins: 'uploadimage,image',
				removePlugins: 'image2',
				imageUploadUrl: 'http://foo/upload'
			}
		},
		inline: {
			name: 'inline',
			creator: 'inline',
			config: {
				extraPlugins: 'uploadimage,image2',
				filebrowserImageUploadUrl: 'http://foo/upload?type=Images'
			}
		}
	};

	function assertUploadingWidgets( editor, expectedSrc ) {
		var widgets = editor.editable().find( 'img[data-widget="uploadimage"]' ),
			widget, i;

		assert.areSame( 1, widgets.count(), 'Expected widgets count should be 1' );

		for ( i = 0; i < widgets.count(); i++ ) {
			widget = widgets.getItem( i );
			assert.areSame( '0', widget.getAttribute( 'data-cke-upload-id' ) );
			assert.areSame( expectedSrc, widget.getAttribute( 'src' ).substring( 0, 55 ) );
		}
	}

	var tests = {
		'init': function() {
			resumeAfter = bender.tools.resumeAfter;
		},

		'setUp': function() {
			var editorName;

			uploadCount = 0;
			loadAndUploadCount = 0;

			CKEDITOR.filetools.FileLoader.prototype.loadAndUpload = function( url ) {
				loadAndUploadCount++;
				lastUploadUrl = url;
			};

			CKEDITOR.filetools.FileLoader.prototype.load = function() {};

			CKEDITOR.filetools.FileLoader.prototype.upload = function( url ) {
				uploadCount++;
				lastUploadUrl = url;
			};

			for ( editorName in editors ) {
				// Clear uploads repository.
				editors[ editorName ].uploadsRepository._.loaders = [];
			}
		},

		'test classic with image1 (integration test)': function() {
			var editor = editors.classic;

			pasteFiles( editor, [ bender.tools.getTestFile( 'test.jpg' ) ] );

			assertUploadingWidgets( editor, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPC' );
			assert.areSame( '', editor.getData(), 'getData on loading.' );

			var loader = editor.uploadsRepository.get( 0 );

			loader.data = bender.tools.pngBase64;
			loader.changeStatusAndFire( 'uploading' );

			assertUploadingWidgets( editor, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABC' );
			assert.areSame( '', editor.getData(), 'getData on uploading.' );

			loader.url = 'http://foo/test.jpg';
			loader.changeStatusAndFire( 'uploaded' );

			assert.areSame( '<p><img src="http://foo/test.jpg" style="height:1px; width:1px" /></p>', editor.getData() );
			assert.areSame( 0, editor.editable().find( 'img[data-widget="image"]' ).count() );

			assert.areSame( 1, loadAndUploadCount );
			assert.areSame( 0, uploadCount );
			assert.areSame( 'http://foo/upload', lastUploadUrl );
		},

		'test inline with image2 (integration test)': function() {
			var editor = editors.inline;

			pasteFiles( editor, [ bender.tools.getTestFile( 'test.jpg' ) ] );

			assertUploadingWidgets( editor, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPC' );
			assert.areSame( '', editor.getData(), 'getData on loading.' );

			var loader = editor.uploadsRepository.get( 0 );

			loader.data = bender.tools.pngBase64;
			loader.changeStatusAndFire( 'uploading' );

			assertUploadingWidgets( editor, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABC' );
			assert.areSame( '', editor.getData(), 'getData on uploading.' );

			loader.url = 'http://foo/test.jpg';
			loader.changeStatusAndFire( 'uploaded' );

			assert.areSame( '<p><img width="1" height="1" alt="" src="http://foo/test.jpg" /></p>', editor.getData() );
			assert.areSame( 1, editor.editable().find( 'img[data-widget="image"]' ).count() );

			assert.areSame( 1, loadAndUploadCount );
			assert.areSame( 0, uploadCount );
			assert.areSame( 'http://foo/upload?type=Images&responseType=json', lastUploadUrl );
		},

		'test paste img as html (integration test)': function() {
			var bot = editorBots.classic,
				editor = editors.classic;

			bot.setData( '', function() {
				pasteFiles( editor, [], '<p>x<img src="' + bender.tools.pngBase64 + '">x</p>' );

				assertUploadingWidgets( editor, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABC' );
				assert.areSame( '<p>xx</p>', editor.getData(), 'getData on loading.' );

				var loader = editor.uploadsRepository.get( 0 );

				loader.data = bender.tools.pngBase64;
				loader.changeStatusAndFire( 'uploading' );

				assertUploadingWidgets( editor, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABC' );
				assert.areSame( '<p>xx</p>', editor.getData(), 'getData on uploading.' );

				loader.url = 'http://foo/test.jpg';
				loader.changeStatusAndFire( 'uploaded' );

				assert.areSame( '<p>x<img src="http://foo/test.jpg" style="height:1px; width:1px" />x</p>', editor.getData() );
				assert.areSame( 0, editor.editable().find( 'img[data-widget="image"]' ).count() );

				assert.areSame( 0, loadAndUploadCount );
				assert.areSame( 1, uploadCount );
				assert.areSame( 'http://foo/upload', lastUploadUrl );
			} );
		},

		'test supportedExtensions png': function() {
			var editor = editors.classic;

			resumeAfter( editor, 'paste', function() {
				assertUploadingWidgets( editor, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPC' );
			} );

			pasteFiles( editor, [ bender.tools.getTestFile( 'test.png' ) ] );

			wait();
		},

		'test supportedExtensions jpg': function() {
			var editor = editors.classic;

			resumeAfter( editor, 'paste', function() {
				assertUploadingWidgets( editor, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPC' );
			} );

			pasteFiles( editor, [ bender.tools.getTestFile( 'test.jpg' ) ] );

			wait();
		},

		'test supportedExtensions jpeg': function() {
			var editor = editors.classic;

			resumeAfter( editor, 'paste', function() {
				assertUploadingWidgets( editor, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPC' );
			} );

			pasteFiles( editor, [ bender.tools.getTestFile( 'test.jpeg' ) ] );

			wait();
		},

		'test supportedExtensions gif': function() {
			var editor = editors.classic;

			resumeAfter( editor, 'paste', function() {
				assertUploadingWidgets( editor, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPC' );
			} );

			pasteFiles( editor, [ bender.tools.getTestFile( 'test.gif' ) ] );

			wait();
		},

		'test not supportedExtensions txt': function() {
			var bot = editorBots.classic,
				editor = editors.classic;

			bot.setData( '', function() {
				resumeAfter( editor, 'paste', function() {
					assert.areSame( 0, editor.editable().find( 'img[data-widget="uploadimage"]' ).count() );
				} );

				pasteFiles( editor, [ bender.tools.getTestFile( 'test.txt' ) ] );

				wait();
			} );
		},

		'test paste single image': function() {
			var editor = editors.classic;

			resumeAfter( editor, 'paste', function( evt ) {
				var img = CKEDITOR.dom.element.createFromHtml( evt.data.dataValue );

				assert.areSame( '0', img.getAttribute( 'data-cke-upload-id' ) );
				assert.areSame( 'uploadimage', img.getAttribute( 'data-widget' ) );

				assert.areSame( 0, loadAndUploadCount );
				assert.areSame( 1, uploadCount );
			} );

			editor.fire( 'paste', {
				dataTransfer: new CKEDITOR.plugins.clipboard.dataTransfer(),
				dataValue: '<img src="' + bender.tools.pngBase64 + '">'
			} );

			wait();
		},

		'test paste nested image': function() {
			var editor = editors.classic;

			resumeAfter( editor, 'paste', function( evt ) {
				var imgs = CKEDITOR.dom.element.createFromHtml( evt.data.dataValue ).find( 'img[data-widget="uploadimage"]' ),
					img, i;

				assert.areSame( 2, imgs.count(), 'Expected imgs count should be 2' );

				for ( i = 0; i < imgs.count(); i++ ) {
					img = imgs.getItem( i );
					assert.areSame( i + '', img.getAttribute( 'data-cke-upload-id' ) );
				}

				assert.areSame( 0, loadAndUploadCount );
				assert.areSame( 2, uploadCount );
			} );

			editor.fire( 'paste', {
				dataTransfer: new CKEDITOR.plugins.clipboard.dataTransfer(),
				dataValue: '<div>x<img src="' + bender.tools.pngBase64 + '">x' +
							'<p>x<img src="' + bender.tools.pngBase64 + '">x</p></div>'
			} );

			wait();
		},

		'test paste no image': function() {
			var editor = editors.classic;

			resumeAfter( editor, 'paste', function( evt ) {
				assert.areSame( 'foo', evt.data.dataValue );

				assert.areSame( 0, loadAndUploadCount );
				assert.areSame( 0, uploadCount );
			} );

			editor.fire( 'paste', {
				dataTransfer: new CKEDITOR.plugins.clipboard.dataTransfer(),
				dataValue: 'foo'
			} );

			wait();
		},

		'test paste no data in image': function() {
			var editor = editors.classic;

			resumeAfter( editor, 'paste', function( evt ) {
				var img = CKEDITOR.dom.element.createFromHtml( evt.data.dataValue );

				assert.isNull( img.getAttribute( 'data-cke-upload-id' ) );
				assert.isNull( img.getAttribute( 'data-widget' ) );

				assert.areSame( 0, loadAndUploadCount );
				assert.areSame( 0, uploadCount );
			} );

			editor.fire( 'paste', {
				dataTransfer: new CKEDITOR.plugins.clipboard.dataTransfer(),
				dataValue: '<img src="http://foo/bar.jpg">'
			} );

			wait();
		},

		'test paste image already marked': function() {
			var editor = editors.classic,
				uploads = editor.uploadsRepository;

			resumeAfter( editor, 'paste', function( evt ) {
				var img = CKEDITOR.dom.element.createFromHtml( evt.data.dataValue );

				assert.areSame( '0', img.getAttribute( 'data-cke-upload-id' ) );
				assert.areSame( 'uploadimage', img.getAttribute( 'data-widget' ) );

				assert.areSame( 0, loadAndUploadCount );
				assert.areSame( 0, uploadCount );
			} );

			// Fill upload repository.
			uploads.create( bender.tools.getTestFile() );

			editor.fire( 'paste', {
				dataTransfer: new CKEDITOR.plugins.clipboard.dataTransfer(),
				dataValue: '<img src="' + bender.tools.pngBase64 + '" data-widget="uploadimage" data-cke-upload-id="0">'
			} );

			wait();
		},

		'test omit images in non contentEditable': function() {
			var editor = editors.classic;

			resumeAfter( editor, 'paste', function( evt ) {
				var img = CKEDITOR.dom.element.createFromHtml( evt.data.dataValue ).findOne( 'img' );

				assert.isNull( img.getAttribute( 'data-cke-upload-id' ) );
				assert.isNull( img.getAttribute( 'data-widget' ) );

				assert.areSame( 0, loadAndUploadCount );
				assert.areSame( 0, uploadCount );
			} );

			editor.fire( 'paste', {
				dataTransfer: new CKEDITOR.plugins.clipboard.dataTransfer(),
				dataValue:
							'<div contentEditable="false">' +
								'<img src="' + bender.tools.pngBase64 + '">' +
							'</div>'
			} );

			wait();
		},

		'test handle images in nested editable': function() {
			var editor = editors.classic;

			resumeAfter( editor, 'paste', function( evt ) {
				var img = CKEDITOR.dom.element.createFromHtml( evt.data.dataValue ).findOne( 'img' );

				assert.areSame( '0', img.getAttribute( 'data-cke-upload-id' ) );
				assert.areSame( 'uploadimage', img.getAttribute( 'data-widget' ) );

				assert.areSame( 0, loadAndUploadCount );
				assert.areSame( 1, uploadCount );
			} );

			editor.fire( 'paste', {
				dataTransfer: new CKEDITOR.plugins.clipboard.dataTransfer(),
				dataValue:
							'<div contentEditable="false">' +
								'<div contentEditable="true">' +
									'<img src="' + bender.tools.pngBase64 + '">' +
								'</div>' +
							'</div>'
			} );

			wait();
		},

		'test handle images in nested editable using cke-editable': function() {
			var editor = editors.classic;

			resumeAfter( editor, 'paste', function( evt ) {
				var img = CKEDITOR.dom.element.createFromHtml( evt.data.dataValue ).findOne( 'img' );

				assert.areSame( '0', img.getAttribute( 'data-cke-upload-id' ) );
				assert.areSame( 'uploadimage', img.getAttribute( 'data-widget' ) );

				assert.areSame( 0, loadAndUploadCount );
				assert.areSame( 1, uploadCount );
			} );

			editor.fire( 'paste', {
				dataTransfer: new CKEDITOR.plugins.clipboard.dataTransfer(),
				dataValue:
							'<div contentEditable="false">' +
								'<div data-cke-editable="1">' +
									'<img src="' + bender.tools.pngBase64 + '">' +
								'</div>' +
							'</div>'
			} );

			wait();
		}
	};

	bender.tools.setUpEditors( editorsDefinitions, function( e, eB ) {
		editors = e;
		editorBots = eB;

		bender.test( tests );
	} );
} )();