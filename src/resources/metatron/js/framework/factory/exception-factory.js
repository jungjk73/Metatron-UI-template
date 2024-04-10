define([], function () {
	return function () {
		'use strict';

		return function errorCatcherHandler(exception, cause) {
			console.error(exception, cause);
		};
	}
});