define(["moment"], function(moment) {
	return function($rootScope, $timeout, ConfigManager, AlarmService, WindowReloadDetect, DataService) {
		"use strict";

		//property
		var alarmSummary = {};
		var unbind = [];

		var SYNC_TIME_TIMER;
		var LAST_SYNC_TIME;
		var LAST_SUMMARY = null;
		var LAST_PUSH_CHECK_TIMEOUT = null;
		var syncFlag = false;
		var worker = new Worker("/resources/js/metatron/common/worker/stomp-worker.js");
		worker.onmessage = function (e) {
			mqPushHandler(e.data);
		};


		// event-handler
		function destroy() {
			unbind.forEach(function(fn) {
				fn();
				clear();
			});
		}


		// method
		/**
		 * 알람 조회
		 * @param filter: (key/value 형태로 정의)
		 * @param grouping: cluster별 grouping 옵션(기본값이 true임. false일 경우 cluster 구분없이 다 가져옴)
		 * @returns array
		 */
		this.getAlarms = function(filterObject, grouping) {
			var filter = parsingFilter(filterObject);

			// grouping
			if(grouping == null || grouping == true)
				filter.push({"field": "location", "value": [ConfigManager.getSystemName()]});

			var param = getAlarmBaseCondition();
			param.filter = filter;
			var p = new Promise(function(resolve) {
				AlarmService.getList(param, function(data) {
					if(data == null)
						return;

					resolve(data.datas);
				},false);
			});
			return p;
		};

		/**
		 * 알람 통계 조회
		 * @returns object
		 */
		this.getSummary = function() {
			var p = new Promise(function(resolve) {
				AlarmService.getSummary(null, function(data) {
					alarmSummary = data;
					resolve(data);
				}, false);
			});
			return p;
		};

		/**
		 * 전체알람을 특정 key로 그룹핑
		 * @param key
		 * @param grouping: cluter별 grouping 옵션(기본값이 true임. false일 경우 cluster 구분없이 다 가져옴)
		 * @returns object
		 */
		this.getAlarmsAsGroup = function(key, grouping) {

			var getAlarmProm = this.getAlarms({}, grouping);
			var p = new Promise(function(resolve) {
				getAlarmProm.then(function(data) {
					resolve(_.groupBy(data, key));
				});
			});

			return p;
		};


		// function
		function initialize() {
			console.log("AlarmManager initialize");
			var ES_MQ_ADDRESS = ConfigManager.getConst("EVENT_SERVER_IP") + ":" + ConfigManager.getConst("EVENT_SERVER_MQ_PORT");

			var EVENT_USED = ConfigManager.getConst("EVENT_USED");
			EVENT_USED = (EVENT_USED == null || EVENT_USED == true || EVENT_USED == "true")? true:false;
			if(!EVENT_USED)
				return;

			// worker 등록
			worker.postMessage({
				operation: "connect",
				url: "ws://" + ES_MQ_ADDRESS
			});
			WindowReloadDetect.addOperation(closeSocket);

			addEventListener();
			syncTime();

			$timeout(function() {
				$rootScope.$broadcast(ConfigManager.getEvent("ALARM_UPDATE_EVENT"));
			}, 800);
		}

		function closeSocket() {
			worker.postMessage({
				operation: "close"
			});
		}

		function addEventListener() {
			unbind = [
				$rootScope.$on('$destroy', destroy)
			];
		}

		function syncTime() {
			SYNC_TIME_TIMER = setInterval(function() {
				DataService.httpGet("/common/getSyncTime", null, function (data) {
					if(data == null || data.data == null)
						return;

					var offset = moment(data.data).valueOf() - Date.now();
					moment.now = function() {
						return moment(Date.now() + offset);
					}
				}, false);
			}, 30000);
		}

		function mqPushHandler(data) {
			var now = moment().valueOf();
			var syncDiff = now-LAST_SYNC_TIME;
			if(LAST_SUMMARY == null)
				LAST_SUMMARY = data;

			// timer 초기화
			if(LAST_PUSH_CHECK_TIMEOUT != null)
				clearTimeout(LAST_PUSH_CHECK_TIMEOUT);

			if(syncDiff < 2000 && (LAST_SUMMARY.total == data.total || syncDiff < 50)) {
				LAST_PUSH_CHECK_TIMEOUT = setTimeout(function() {
					if(alarmSummary.total != LAST_SUMMARY.total)
						$rootScope.$broadcast(ConfigManager.getEvent("ALARM_UPDATE_EVENT"));

					clearTimeout(LAST_PUSH_CHECK_TIMEOUT);
					LAST_PUSH_CHECK_TIMEOUT = null;
				}, 1000);
				return;
			}

			LAST_SYNC_TIME = now;
			LAST_SUMMARY = data;
			$rootScope.$broadcast(ConfigManager.getEvent("ALARM_UPDATE_EVENT"));
		}

		function parsingFilter(obj) {
			if(obj == null || Object.keys(obj).length < 1)
				return [];

			var filter = [];
			for(var key in obj) {
				var o = {};
				o.field = key;
				o.value = (angular.isString(obj[key]))? [obj[key]]:obj[key];
				filter.push(o);
			}

			return filter;
		}

		function getAlarmBaseCondition() {
			return {
				"offset" : 1,
				"size": 1000000,
				//"sortField":"alarmSeq:asc"
				//"sortField":"occurTime:desc"
				"sort":[{"field":"occurTime","order":"asc"}]
			};
		}

		function clear() {
			clearInterval(SYNC_TIME_TIMER);

			alarmSummary = null;
			unbind = null;
			syncFlag = null;
			SYNC_TIME_TIMER = null;
			LAST_SYNC_TIME = null;
			LAST_SUMMARY = null;
			LAST_PUSH_CHECK_TIMEOUT = null;
		}

		initialize();
	};
});