define(["http-interceptor-factory",
		"exception-factory",
		"dependency-resolver-factory",
		"common-util-factory",
		"grid-renderer-factory",
		"config-manager-provider",
		"window-reload-detect-provider",
		"html-filter",
		"route-config",
		"metatron/common/controller/header-controller",
		"metatron/common/controller/left-controller",
		"metatron/common/directive/tooltip-menu-directive",
		"metatron/common/directive/scroll-directive",
		"metatron/common/service/alarm-service",
		"metatron/common/service/alarm-manager",
		"metatron/common/service/data-service",
		"metatron/common/service/websocket-service",
		"ag-grid",
		"ng-dialog",
		"angular-echart",
		"angular-tree-control",
		"angular-zingchart",
		"angular-grid",
		"angular-disabled",
		"angular-slimscroll",
		"angular-ui-router"
	],
	function (httpInterceptorFactory, exceptionFactory, dependencyResolverFactory, commonUtilFactory, gridRendererFactory,
			  configManagerProvider, windowReloadDetectProvider,
			  htmlFilter, routeConfig,
			  headerController, leftController, tooltipMenu, scroller, alarmService, alarmManager, dataService, websocketService, agGrid) {
		"use strict";
		agGrid.initialiseAgGridWithAngular1(angular);
		var app = angular.module("app", ["ngRoute", "ngCookies", "ngDialog", "ui.router", "pascalprecht.translate", "metatronChart", "treeControl", "agGrid", "metatronGrid", "slimscroll", "disableAll","angular-echarts"]);
		app.factory("HttpInterceptor", ["$q", httpInterceptorFactory]);
		app.factory('GridRenderer', ["$filter", "$rootScope", "ConfigManager", "CommonUtil", gridRendererFactory]);

		app.provider("ConfigManager", [configManagerProvider]);
		app.provider("WindowReloadDetect", [windowReloadDetectProvider]);

		app.service("DataService", ["$rootScope", "$http", "$window", dataService]);
		app.factory('CommonUtil', ["$rootScope", "$filter", "$window", "ConfigManager", "DataService", commonUtilFactory]);

		app.service("WebSocketService", ["$rootScope", "$timeout", "WindowReloadDetect", "ConfigManager", websocketService]);
		app.service("AlarmService", ["$rootScope", "$http", "ConfigManager", alarmService]);
		app.service("AlarmManager", ["$rootScope", "$timeout", "ConfigManager", "AlarmService", "WindowReloadDetect", "DataService", alarmManager]);

		app.filter("html", ["$sce", htmlFilter]);
		app.controller("HeaderCtrl", ["$rootScope", "$scope", "$compile", "$location", "$state", "ConfigManager", "DataService", "WebSocketService", "AlarmManager", "ngDialog", "CommonUtil", headerController]);
		app.controller("LeftCtrl", ["$rootScope", "$scope", "$location", "$state", "$compile", "$window", "ConfigManager", "WebSocketService", "DataService", "AlarmService", "CommonUtil", leftController]);
		app.directive("tooltipMenu", ["$rootScope", tooltipMenu]);
		app.directive("scroller", ["$rootScope", scroller]);
		app.initialize = initialize;

		var _resources = {};

		function initializeResource() {
			var $injector = angular.injector(["ng"]);
			var $q = $injector.get('$q');
			var $http = $injector.get('$http');
			var deferred = $q.defer();
			var urls = {
				constant: $http.get("/resources/constants/constant.json"),
				event: $http.get("/resources/constants/event.json"),
				user: $http.get("/common/getUser"),
				master: $http.get("/common/getMaster")
			};

			$q.all(urls).then(function (results) {
				_resources.constant = results.constant.data;
				_resources.event = results.event.data;
				_resources.user = results.user.data.data;
				_resources.master = results.master.data.data;
				deferred.resolve(_resources);
			});

			return deferred.promise;
		}

		function config($routeProvider, $locationProvider, $stateProvider, $urlRouterProvider, $controllerProvider, $httpProvider, $compileProvider, $filterProvider, $provide, $translateProvider, ConfigManagerProvider) {
			app.controller = $controllerProvider.register;
			app.directive = $compileProvider.directive;
			app.filter = $filterProvider.register;
			app.factory = $provide.factory;
			app.service = $provide.service;

			// 보통 $http 통신을 하게 될 경우 응답이 오면 $digest를 내부적으로 실행됨.
			// 이 속성을 켰을 경우에는 여러 $http 통신을 했을 때 묶어서 한번만 $digest를 날리므로 성능개선됨.
			$httpProvider.useApplyAsync(true);

			// debugging 모드에서 dom속성을 수정하는 경우는 없기 때문에 false 줌.(성능저하의 영향이 있음)
			$compileProvider.debugInfoEnabled(false);

			$httpProvider.interceptors.push("HttpInterceptor");

			$provide.decorator("$exceptionHandler", exceptionFactory);

			$translateProvider.useStaticFilesLoader({
				prefix: "/resources/messages/",
				suffix: ".json"
			});
			$translateProvider.preferredLanguage("ko_KR");

			ConfigManagerProvider.initialize(_resources.constant, _resources.event, _resources.user, _resources.master);

			if (routeConfig.routes) {
				angular.forEach(routeConfig.routes, function (route, path) {

					$stateProvider.state(path, {
						url: '/' + route.name,
						templateUrl: route.templateUrl,
						params: {
							path: path
						},
						resolve: dependencyResolverFactory(route.dependencies),
						reloadOnSearch: true
					});
				});
			}

			if (routeConfig.defaultRoutePath) {
				$urlRouterProvider.otherwise(routeConfig.defaultRoutePath);
			}
		}

		function initialize() {
			if (sessionStorage.getItem("THIS_APP_ID") == null)
				sessionStorage.setItem('THIS_APP_ID', "AA_"+Math.random());

			initializeResource().then(function () {
				app.run(function ($rootScope, $location, $state, $window, $timeout, ConfigManager, CommonUtil, WebSocketService) {
					angular.element("body").show();

					// 네트워크 연결여부 이벤트 Listener
					$window.addEventListener("offline", function () {	
						console.log("offline");					
						$timeout(CommonUtil.networkAlertHandler, 10000);						
					}, false);

					$window.addEventListener("online", function() {
						console.log("online");
						$rootScope.alertFlag = true;
					}, false);

					$rootScope.$on('$stateChangeError', function(event, toState, toParams, fromState, fromParams, error) {
						CommonUtil.networkAlertHandler();
					});

					$rootScope.$on('$stateNotFound', function(event, unfoundState, fromState, fromParams){
						//CommonUtil.networkAlertHandler();
						alert('Can not find the url.');
						return;
					});

					// config 코드라서 최대한 간결하고 직관적이게..
					$rootScope.$on('$stateChangeStart', function (event, toState, toParams) {

						if($state.transition != null) {
							CommonUtil.networkAlertHandler();
							return;
						}

						$rootScope.alertFlag = false;

						// Websocket check
						WebSocketService.reconnect(500);

						// 현재 path정보
						$rootScope.$broadcast(ConfigManager.getEvent("SELECT_MENU_EVENT"), {path : toParams.path, mode : 'left'});

						// 테마 설정
						var p = toParams.path.toLowerCase();
						var t = 'DARK';
						if (p.indexOf('enterprisemodule') > -1 ||
							p.indexOf('administrator') > -1 ||
							p.indexOf('activities/alarm/') > -1 ||
							p.indexOf('/filebrowser') > -1 ||
							p.indexOf('qos') > -1 ||
							p.indexOf('count') > -1 ||
							p.indexOf('trace') > -1 ||
							p.indexOf('summary') > -1 ||
							p.indexOf('lot') > -1 ||
							p.indexOf('history') > -1 || 
							p.indexOf('redis') > -1 || 
							p.indexOf('flume') > -1 || 
							p.indexOf('retention') > -1 || 
							p.indexOf('rpcmonitoring') > -1 ||
							p.indexOf('yarn/que') > -1){
							t = 'LIGHT';
						}
						setTheme(t);

						//alarm 이동시에 팝업 제거
						removePopup();

						// left메뉴 , 배경 높이 조절
						angular.element('header').height('99%');
						angular.element('.mu-container').height('100%');
					});
				});

				app.config(config);
				angular.bootstrap(document, ["app"]);
			});
		}

		return app;
	});