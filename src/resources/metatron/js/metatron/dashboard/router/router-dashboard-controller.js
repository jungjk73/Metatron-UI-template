define(["app", "moment"], function(app, moment) {
	app.controller("RouterDashboardCtrl", ["$rootScope", "$scope", "$timeout", "$interval", "ConfigManager", "DataService", "ngDialog",
	    function($rootScope, $scope, $timeout, $interval, ConfigManager, DataService, ngDialog) {
			"use strict";

			// property
			var unbind = [];
			var routerDashboardCtrl = this;
			var interval;

			routerDashboardCtrl.nameserviceList = [];
			routerDashboardCtrl.namenodeList    = [];
			routerDashboardCtrl.routerInfoList  = [];

			// event-handler
			function addEventListener() {
				unbind = [
					$scope.$on('$destroy', destroy),
					$scope.$on(ConfigManager.getEvent("GET_ROUTER_DASHBOARD_EVENT"), getRouterDashboardEventHandler),
				];
			}

			/**
			 * 웹소켓에서 받아온 router 데이터 처리
			 */
			function getRouterDashboardEventHandler(event, data){
				ap($scope);

				let timer = $timeout(function(){
					// tooltipRequest = true;
					getRouterInfoList();
					$timeout.cancel(timer);
				}, 100);
			}


			function destroy() {
				 routerDashboardCtrl = null;

				$interval.cancel(interval);
				interval = null;
				ngDialog.closeAll();

				unbind.forEach(function(fn) {
					fn();
				});

				$(document).off('mouseover', '.cell-heat');
				$(document).off('mouseleave', '.cell-heat');

				$scope.$$watchers = null;
				$scope.$$listeners = null;
			}

			function initialize() {
				addEventListener();
				//henry
				getRouterInfoList();
			}


			/**
			 * router 정보 요청.  henry
			 */
			function getRouterInfoList() {
				DataService.httpGet("/dashboard/router/routerInfoList", null, function(data) {
					routerDashboardCtrl.nameserviceList = [];
					routerDashboardCtrl.namenodeList    = [];
					routerDashboardCtrl.routerInfoList  = [];

					routerDashboardCtrl.nameserviceList = data.data.nameservicesMap;
					routerDashboardCtrl.namenodeList    = data.data.namenodesMap;
					routerDashboardCtrl.routerInfoList  = data.data.routersMap;

				});
			}

			initialize();
	}]);

});