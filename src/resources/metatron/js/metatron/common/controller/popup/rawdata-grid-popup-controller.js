define(["app"], function (app) {
	app.controller("RawDataGridPopCtrl", ["$scope", "$timeout", "title", "columns", "data", "width","height",  function ($scope, $timeout, title, columns, data, width, height) {
		"use strict";

		// property
		$scope.grid = {};

		//method


		// event-handler


		// function
		function initialize() {
			console.log('\n\n\t\tPOP INIT');
			$scope.grid = {};
			$scope.grid.data = [];
			$scope.title = title;
			$scope.grid.columns = columns;
			$scope.width = width;
			$scope.height = height;

			// 팝업이 뜰 때 스크롤이 없었다가 생기는 타이밍 문제가 보여서 timeout으로 처리.
			setTimeout(function() {
				$scope.grid.data = data;
				ap($scope);
			}, 300);
		}

		initialize();
	}]);
});