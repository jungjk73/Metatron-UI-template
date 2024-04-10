define(["app"], function(app) {
    app.service("defaultService", ["$rootScope", "$http", function($http, $rootScope) {
		"use strict";
        
		// property
		var self = this;
		var unbind = [];

		// method


		// event-handler


		// function
		function initialize() {    

		}

		function addEventListener() {
			unbind = [];
		}

		function destory() {
			unbind.forEach(function(fn) {
				fn();
			});			
		}
		
        // function
        function getData(url, parameter, event) {
            $http({
                method: "POST",
                url: url,
                data: JSON.stringify(parameter),
                headers: {
                    "Content-Type": "application/json"
                }
            }).success(function(data) {
                data = data.data;
                $rootScope.$broadcast(event, data);
            });
        }
        
		initialize();
	}]);
});