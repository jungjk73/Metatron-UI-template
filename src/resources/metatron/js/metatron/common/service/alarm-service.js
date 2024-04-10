define([], function () {
	return function ($rootScope, $http, ConfigManager) {
		"use strict";

		//property
		var ES_SECURE = false;
		var ES_HTTP_PROTOCOL = "http://";
		var ES_OCCUR_ADDRESS;
		var ES_INFO_ADDRESS;

		// henry Ajax 내재화 2022014
		var WEB_HOST_ADDRESS = location.hostname + ":" + location.port;

		this.getSummary = function (param, resultHandler, loader) {
			if (ES_INFO_ADDRESS == null || ES_INFO_ADDRESS == "") {
				initialize();
			}

			if(param == null){
				param = {uri : ES_HTTP_PROTOCOL + ES_INFO_ADDRESS + "/alarm/statistics/severity"};
			}else{
				param.uri = ES_HTTP_PROTOCOL + ES_INFO_ADDRESS + "/alarm/statistics/severity";
			}
			executeAjax(WEB_HOST_ADDRESS + "/alarmrelay/severity", param, resultHandler, loader);
		};

		this.getList = function (param, resultHandler, loader) {
			if (ES_INFO_ADDRESS == null || ES_INFO_ADDRESS == "") {
				initialize();
			}

			param.uri = ES_HTTP_PROTOCOL + ES_INFO_ADDRESS + "/alarm/list";
			executeAjax(WEB_HOST_ADDRESS + "/alarmrelay/list", param, resultHandler, loader);
		};

		this.ackAlarm = function (param, resultHandler, loader) {
			if (ES_OCCUR_ADDRESS == null || ES_OCCUR_ADDRESS == "") {
				initialize();
			}

			param.uri = ES_HTTP_PROTOCOL + ES_OCCUR_ADDRESS + "/alarm/acknowledge";
			executeAjax(WEB_HOST_ADDRESS + "/alarmrelay/acknowledge", param, resultHandler, loader);
		};

		this.deleteAlarm = function (param, resultHandler, loader) {
			if (ES_OCCUR_ADDRESS == null || ES_OCCUR_ADDRESS == "") {
				initialize();
			}

			param.uri = ES_HTTP_PROTOCOL + ES_OCCUR_ADDRESS + "/alarm/delete";
			executeAjax(WEB_HOST_ADDRESS + "/alarmrelay/delete", param, resultHandler, loader);
		};

		// 클러스터 바꿀때마다 EventServer 정보 변경
		this.setConnectionInfo = function(ip, occur, info, mq){
			ES_OCCUR_ADDRESS = ip+':'+occur;
			ES_INFO_ADDRESS = ip+':'+info;
		};

		// function . henryshin 수정. 20220614
		function initialize() {
			// 기본정보 setting

			var _ip = ConfigManager.getConst("EVENT_SERVER_IP");
			ES_OCCUR_ADDRESS = _ip + ":" + ConfigManager.getConst("EVENT_SERVER_OCCUR_PORT");
			ES_INFO_ADDRESS = _ip + ":" + ConfigManager.getConst("EVENT_SERVER_INFO_PORT");
			ES_SECURE = ConfigManager.getConst("EVENT_SERVER_SECURE");

			if (ES_SECURE != null && (ES_SECURE == true || ES_SECURE == "true")) {
				ES_SECURE = true;
				ES_HTTP_PROTOCOL = "https://";
			} else {
				ES_SECURE = false;
				ES_HTTP_PROTOCOL = "http://";
			}
		}

		function executeAjax(url, param, resultHandler, loader) {

			// loader
			// loader = (loader == null) ? true : false;
			loader = false;

			if(param == null && loader == false) {
				param = {};
				param.loader = false;
			} else if (param && typeof param === "object") {
				param.loader = loader;
			}

			// secure
			ES_HTTP_PROTOCOL = "http://";
			if (ES_SECURE) {
				ES_HTTP_PROTOCOL = "https://";
			}


			/*원래는 'Content-Type': 'text/plain'*/
			$http({
				method: "POST",
				url: ES_HTTP_PROTOCOL + url,
				data: JSON.stringify(param),
				headers: {
					"Content-Type": "application/json"
				}
			}).success(function (data) {
				if (resultHandler != null)
					resultHandler(data);
			}).error(function (data) {
				console.error('### Error(' + url + ') ###');
				if (resultHandler != null)
					resultHandler(data);
			});
		}

		initialize();
	};
});