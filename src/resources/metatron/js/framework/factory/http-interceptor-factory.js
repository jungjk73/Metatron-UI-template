define([], function () {
	return function ($q) {
		'use strict';

		function ajaxErrorHandler(res) {
			if (res.status == '200' || res.statusText == "success") {
				return;
			}

			var message = "";
			var location = "";
			var statusErrorMap = {
				'400': "400 Bad Request.",
				'401': "401 Unauthorized.",
				'403': "403 Forbidden.",
				'404': "404 Not Found.",
				'500': "500 Internal Server Error.",
				'503': "503 Service Unavailable.",
				'901': "901 Restart"
			};

			if (res.status) {
				message = statusErrorMap[res.status];
			} else {
				message = "Unknown Error.";
			}

			alert(message);

			if (res.status == "901") {
				window.location = "/";
			}
		}

		function isSuccess(response) {
			if (response == null || response == "" || response == "undefined") {
				return false;
			}

			if (response.hasOwnProperty("result") == false) {
				return true;
			}

			if (response.result == 0) {
				if (response.errorMessage == null || response.errorMessage == "") {
					alert("Unknown Error.");
				} else {
					alert(response.errorMessage);
				}

				return false;
			}

			return true;
		}

		return {
			request: function (config) {
				var loader = true;
				if (config && config.data) {
					var p;
					try {
						p = JSON.parse(config.data);
					} catch (e) {
						p = config.data;
					}

					if (p != null && typeof p === "object" && p.loader == false) {
						loader = false;
						delete p.loader;

						if(Object.keys(p).length == 0)
							p = null;

						config.data = JSON.stringify(p);
					}
				}

				if (loader) {
					showIndicator();
				}

				return config || $q.when(config);
			},

			requestError: function (request) {
				lazyHideIndicator();
				if (canRecover(rejection)) {
					return responseOrNewPromise;
				}
				return $q.reject(request);
			},

			response: function (response) {
				lazyHideIndicator();
				var contentType = response.headers()['content-type'];
				if (contentType && (contentType.indexOf("application/json") > -1 || contentType.indexOf("application/x-www-form-urlencoded") > -1)) {
					var data = isSuccess(response.data);
					if (!data) {
						return $q.reject(response);
					}
				}

				return response || $q.when(response);
			},

			responseError: function (rejection) {
				lazyHideIndicator();
				if (canRecover(rejection)) {
					return responseOrNewPromise;
				}

				ajaxErrorHandler(rejection);
				return $q.reject(rejection);
			}
		}
	}
});