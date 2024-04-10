define(["app"], function (app) {
	app.controller("FileBrowserPopCtrl", ["$scope", "pop", function ($scope, pop) {
		"use strict";

		// property


		//method


		// event-handler
		$scope.onChangePopupBlock = function (event) {
			$scope.pop.block = event;
		}


		// function
		function initialize() {
			$scope.pop = pop;
			ap($scope);
		}

		initialize();
	}]);
});