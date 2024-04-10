require.config({
	baseUrl: "/resources/js",
	paths: {
		"angular": "lib/angular/angular.min",
		"angular-route": "lib/angular/angular-route.min",
		"angular-sanitize": "lib/angular/angular-sanitize.min",
		"angular-translate": "lib/angular/angular-translate.min",
		"angular-translate-loader-static-files": "lib/angular/angular-translate-loader-static-files.min",
		"angular-cookies": "lib/angular/angular-cookies.min",
		"angular-bind-html-compile": "lib/angular/angular-bind-html-compile.min",
		"angular-ui-router": "lib/angular/angular-ui-router.min",
		"angular-tree-control": "lib/angular/angular-tree-control-0.2.28",
		"angular-zingchart": "lib/angular/angular-zingchart",
		"angular-echart" : "lib/echart/angular-echart",
		"angular-grid": "lib/angular/angular-grid",
		"angular-disabled": "lib/angular/angular-disable-all",
		"angular-slimscroll": "lib/angular/angular-slimscroll",
		"jquery": "lib/jquery/jquery-2.2.0.min",
		"jquery-ui": "lib/jquery/jquery-ui-1.11.4.min",
		"jquery-blockUI": "lib/jquery/jquery.blockUI.min",
		"jquery-dateFormat": "lib/jquery/jquery-dateFormat.min",
		"jquery-slimscroll": "lib/jquery/jquery.slimscroll.min",
		"moment": "lib/moment/moment-2.11.2.min",
		"underscore": "lib/underscore/underscore-1.8.3.min",
		"zingchart": "lib/zingchart/zingchart.min",
		"ag-grid": "lib/angular/ag-grid",
		"ng-dialog": "lib/angular/ng-dialog-1.2.0.min",
		"http-interceptor-factory": "framework/factory/http-interceptor-factory",
		"dependency-resolver-factory": "framework/factory/dependency-resolver-factory",
		"exception-factory": "framework/factory/exception-factory",
		"common-util-factory": "metatron/common/factory/common-util-factory",
		"grid-renderer-factory": "metatron/common/factory/grid-renderer-factory",
		"alarm-service": "metatron/common/service/alarm-service",
		"alarm-manager": "metatron/common/service/alarm-manager",
		"html-filter": "framework/filter/html-filter",
		"config-manager-provider": "framework/provider/config-manager-provider",
		"window-reload-detect-provider": "framework/provider/window-reload-detect-provider",
		"user-model": "metatron/administrator/model/user-model",
		"globalize": "framework/common/globalize.min",
		"route-config": "metatron/route",
		"mark" : "lib/jquery/jquery.mark.min",		
		"app": "metatron/app"
	},
	shim: {
		"angular": {
			deps: ["jquery"]
		},
		"angular-route": {
			deps: ["angular"]
		},
		"angular-animate": {
			deps: ["angular"]
		},
		"angular-translate": {
			deps: ["angular"]
		},
		"angular-cookies": {
			deps: ["angular"]
		},
		"angular-bind-html-compile": {
			deps: ["angular"]
		},
		"angular-translate-loader-static-files": {
			deps: ["angular", "angular-translate"]
		},
		"angular-tree-control": {
			deps: ["angular"]
		},
		"angular-zingchart": {
			deps: ["angular", "zingchart", "moment"]
		},
		"angular-grid": {
			deps: ["angular", "ag-grid"]
		},
		"angular-ui-router": {
			deps: ["angular"]
		},
		"jquery-slimscroll": {
			deps: ["jquery"]
		},
		"jquery-blockUI": {
			deps: ["jquery"]
		},
		"jquery-dateFormat": {
			deps: ["jquery"]
		},
		"globalize": {
			deps: ["jquery", "jquery-ui"]
		},
		"app": {
			deps: ["angular",
				"angular-route",
				"angular-translate",
				"angular-cookies",
				"angular-translate-loader-static-files",
				"jquery-blockUI",
				"jquery-slimscroll",
				"jquery-dateFormat",
				"underscore",
				"moment",
				"mark",				
				"globalize"]
		}
	}
});

require(["app"], function (app) {
	$(document).ready(function () {
		app.initialize();
	});
});