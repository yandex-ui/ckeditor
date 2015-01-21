/* bender-tags: unit */
/* bender-ckeditor-plugins: notificationaggregator */

( function() {

	'use strict';

	var Task;

	bender.test( {
		setUp: function() {
			// Assign types to more convenient variable.
			Task = CKEDITOR.plugins.notificationAggregator.task;
			// We don't need real editor, just mock it.
			this.editor = {};
		},

		'test subsequent update': function() {
			// In this test we'll make 2 calls to update() method, and ensure that weight DO NOT sum internally,
			// but each value replaces the previous one.
			var instance = new Task( 300 );

			instance.done = sinon.spy();

			instance.update( 50 );
			assert.areSame( 50, instance._doneWeight, 'Invalid value in _doneWeight after first call' );

			// Perform a subsequent call.
			instance.update( 200 );
			assert.areSame( 200, instance._doneWeight, 'Invalid value in _doneWeight after second call' );

			assert.areSame( 0, instance.done.callCount, 'instance.done was not called' );
		},

		'test update with too big weight': function() {
			// If a task is created with maximal weight of 200, we need to ensure that if developer
			// calls ret.update( 201 ) it will update the _doneWeights entry will be updated to the
			// maximal weight, instead of incorrect value.
			var instance = new Task( 200 );

			instance.update( 201 );

			assert.areEqual( 200, instance._doneWeight, 'Invalid value in _doneWeight' );
		},

		'test update fires updated event': function() {
			var instance = new Task( 200 );

			instance.fire = sinon.spy();

			instance.update( 100 );

			assert.areSame( 1, instance.fire.callCount, 'instance.fire call count' );

			sinon.assert.calledWithExactly( instance.fire, 'updated', 100 );
		},

		'test update calculates weightChange': function() {
			var instance = new Task( 200 );

			instance.fire = sinon.spy();
			instance._doneWeight = 40;

			instance.update( 100 );

			assert.areSame( 1, instance.fire.callCount, 'instance.fire call count' );

			sinon.assert.calledWithExactly( instance.fire, 'updated', 60 );
		},

		'test update calculates weightChange negative': function() {
			var instance = new Task( 200 );

			instance.fire = sinon.spy();
			instance._doneWeight = 150;

			instance.update( 100 );

			assert.areSame( 1, instance.fire.callCount, 'instance.fire call count' );

			sinon.assert.calledWithExactly( instance.fire, 'updated', -50 );
		},

		'test update fires done event': function() {
			var instance = new Task( 200 );

			instance.fire = sinon.spy();

			instance.update( 200 );

			assert.areSame( 2, instance.fire.callCount, 'instance.fire call count' );

			sinon.assert.calledWithExactly( instance.fire, 'done' );
		},

		'test update skips calls when done': function() {
			// If task is done, taks.update() should not listen to any further updates.
			var instance = new Task( 200 );

			instance.isDone = sinon.stub().returns( true );
			instance.fire = sinon.spy();

			instance.update( 200 );

			assert.areSame( 0, instance.fire.callCount, 'No events were fired' );
		},

		'test done': function() {
			// Method done() should simply call update method with _weight property as an argument.
			var instance = new Task( this.aggregator );

			instance._weight = 200;
			instance.update = sinon.spy();

			instance.done();

			assert.areSame( 1, instance.update.callCount, 'instance.update call count' );
			sinon.assert.calledWithExactly( instance.update, 200 );
		},

		'test isDone': function() {
			var instance = new Task( 300 );
			instance._doneWeight = 300;
			assert.isTrue( instance.isDone(), 'Invalid return value' );
		},

		'test isDone falsy': function() {
			var instance = new Task( 300 );
			instance._doneWeight = 100;
			assert.isFalse( instance.isDone(), 'Invalid return value' );
		},

		'test cancel': function() {
			var instance = new Task( 300 );
			instance.fire = sinon.spy();
			instance.cancel();

			assert.areSame( 1, instance.fire.callCount, 'instance.fire call count' );
			sinon.assert.calledWithExactly( instance.fire, 'canceled' );
		}
	} );

} )();