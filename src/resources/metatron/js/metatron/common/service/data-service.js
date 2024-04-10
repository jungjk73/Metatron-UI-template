define([], function () {
	return function ($rootScope, $http, $window) {
		"use strict";

		// method
		this.httpGet = function (url, param, resultHandler, loader) {
			if (url == null || url == "")
				return;

			if (param && param.text)
				url = param.text;

			executeAjax("GET", url, param, resultHandler, loader);
		};

		this.httpPost = function (url, param, resultHandler, loader) {
			if (url == null || url == "")
				return;

			executeAjax("POST", url, param, resultHandler, loader);
		};

		this.httpPut = function (url, param, resultHandler, loader) {
			if (url == null || url == "")
				return;

			executeAjax("PUT", url, param, resultHandler, loader);
		};

		this.httpDelete = function (url, param, resultHandler, loader) {
			if (url == null || url == "")
				return;

			executeAjax("DELETE", url, param, resultHandler, loader);
		};


		// function
		function executeAjax(method, url, param, resultHandler, loader) {

			if (loader == null)
				loader = true;

			if(param == null && loader == false) {
				param = {};
				param.loader = false;
			} else if (param != null && !_.isArray(param) && _.isObject(param)) {
				param.loader = loader;
			}

			$http({
				method: method,
				url: url,
				data: JSON.stringify(param),
				headers: {
					"Content-Type": "application/json"
				}
			}).success(function (data, status, headers, config) {
				$rootScope.alertFlag = false;
				if(resultHandler)
					resultHandler(data);
			}).error(function (data, status, headers, config) {
				if(!$rootScope.alertFlag && status == null) {
					//alert("System Error!!");
					alert("The network connection failed. Please login again.");
					$rootScope.alertFlag = true;
					$window.location = "/logout";
					return;
				}

				console.error('### Error(' + url + ') ###', data, config, window.navigator.onLine);
				angular.element('#indicator').children().remove();
				if(resultHandler)
					resultHandler(data);
			});
		}
	};
});