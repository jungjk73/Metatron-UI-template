define(["app"], function(app) {
	app.controller("defaultCtrl", ["$scope", function($scope) {
		"use strict";

		// property
		var self = this;
		var systemSeq = "";
		var unbind = [];

		// method


		// event-handler
		function destroy() {
			unbind.forEach(function(fn) {
				fn();
			});
		}


		// function
		function initialize() {
			addEventListener();
		}

		function addEventListener() {
			unbind = [
				$scope.$on('$destroy', destroy)
			];
		}

		initialize();
	}]);
});