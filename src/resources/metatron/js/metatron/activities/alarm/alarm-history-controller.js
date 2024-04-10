define(["app", "moment"], function (app, moment) {
	app.controller("AlarmHistoryCtrl", ["$scope", "$timeout", "DataService", "ConfigManager", "CommonUtil","ngDialog",
		function ($scope, $timeout, DataService, ConfigManager, CommonUtil,ngDialog) {
			"use strict";

			// property
			var alarmHistoryCtrl = this;
			var systemSeq = "";
			var unbind = [];
			var searchParam = {};

			alarmHistoryCtrl.grid = {};
			alarmHistoryCtrl.grid.historyList = [];
			alarmHistoryCtrl.grid.pagingList = [];

			alarmHistoryCtrl.filter = {};
			alarmHistoryCtrl.filter.severityList = [
				{'value': null, 'label': 'All'},
				{'value': 'CR', 'label': 'Critical'},
				{'value': 'MJ', 'label': 'Major'},
				{'value': 'MN', 'label': 'Minor'}];
			alarmHistoryCtrl.filter.sortList = [
				{'value': 'occur_date', 'label': 'Occurred Date'},
				{'value': 'release_date', 'label': 'Release Date'}];


			// event-handler
			function destroy() {
				unbind.forEach(function (fn) {
					fn();
					clear();
				});
			}

			function onChangeSystemSeqEventHandler(event, data) {
				if (data == null)
					return;

				systemSeq = data;
				initComp(true);
				getData().then(function() {
					settingPeriod(3, 'hours');
					getHistoryList();
				});
			}

			function onGetMetricListResult(data) {
				if(data == null || data.data == null)
					return;

				alarmHistoryCtrl.filter.metricList = data.data;
			}

			function onGetTableListResult(data) {
				if(data == null || data.data == null)
					return;

				alarmHistoryCtrl.filter.tableList = data.data;
			}

			function onGetProcessHostListResult(data) {
				if(data == null || data.data == null)
					return;
				alarmHistoryCtrl.filter.processHostList = data.data.list;				
			}

			// function onGetSystemListResult(data) {
			// 	if(data == null || data.data == null)
			// 		return;

			// 	alarmHistoryCtrl.filter.systemList = data.data;
			// }


			// method
			alarmHistoryCtrl.changeProcess = function (event) {
				if (event.label != 'All') {
					searchParam.type = 'process';
					searchParam.processParentSeq = event.process_parent_seq;
					searchParam.processSeq = event.process_seq;
				} else {
					searchParam.processSeq = null;
				}

				//getSystemList();
				getProcessHostList();
				getTableList();
				getMetricList();
			}

			// alarmHistoryCtrl.changeSystem = function (event) {
			// 	searchParam.systemSeq = event.value;
			// }

			alarmHistoryCtrl.changeHost = function (event) {
				searchParam.systemSeq = event.systemSeq;
			}

			alarmHistoryCtrl.changeCategory = function (event, type) {
				if(event == null)
					return;

				var label = (type == 'metric')? event.label:event.codeValue;
				var metricCombo = angular.element("#metricCombo");
				if(type == "metric") {
					delete searchParam.hostConditions;
					if (label != 'All') {
						searchParam.type = 'table';
						searchParam.metricParentSeq = (event.metric_seq == null || event.metric_seq == "")? label:event.metric_seq;
						metricCombo.css("pointerEvents", "");
						metricCombo.css("opacity", "1");
					} else {
						metricCombo.css("pointerEvents", "none");
						metricCombo.css("opacity", "0.4");
					}
				} else {
					searchParam.type = 'host';
					searchParam.hostConditions = (label != 'All')? [event.codeValue]:null;
					metricCombo.css("pointerEvents", "none");
					metricCombo.css("opacity", "0.4");
				}
				getMetricList();

				searchParam.metricParentName = (label != 'All')? label:null;
				searchParam.metricName = null;
			}

			alarmHistoryCtrl.changeMetric = function (event) {
				searchParam.metricSeq = event.value;
				searchParam.metricName = (event.value != null || event.metric_parent_seq != null)? event.label:null;
			}

			alarmHistoryCtrl.changeSelectBox = function (event, type) {
				searchParam[type] = event.value;
			}

			alarmHistoryCtrl.changeUntil = function (event) {
				if(event.codeValue == null || event.codeValue == "")
					return;

				settingPeriod(event.codeValue, 'hours');
			}

			alarmHistoryCtrl.changeDate = function (event) {
				alarmHistoryCtrl.filter.sDateTime = event.sDateTime;
				alarmHistoryCtrl.filter.eDateTime = event.eDateTime;

				searchParam.startDate = alarmHistoryCtrl.filter.sDateTime;
				searchParam.endDate = alarmHistoryCtrl.filter.eDateTime;
			}

			alarmHistoryCtrl.onSearchClickHandler = function() {
				getHistoryList();
			}

			//-----------------------------------------------------------------
			// 2017.04.27 김경내 수정
			// 그리드 더블클릭 상세화면
			//------------------------------------------------------------------
			alarmHistoryCtrl.onGridDBClickHandler = function(e) {
				alarmHistoryCtrl.popupData = e.data;
				var popup = ngDialog.open({
					template: "/activities/alarm/popup/alarm_history_pop.html",
					className: "ngdialog-theme-default custom-width",
					showClose: false,
					disableAnimation: true,
					cache: false,
					closeByDocument: false,
					closeByEscape: false,
					scope: $scope
				});
			};

			alarmHistoryCtrl.changeType = function(event) {
				if(event == null)
					return;

				var tdCategory = angular.element("#categoryTd");
				var metricCategory = angular.element("#metricCategoryCombo");
				var hostCategory = angular.element("#hostCategoryCombo");
				var codeName = event.codeName.toLowerCase();
				searchParam.alarmType = codeName;
				if(codeName == "all") {
					tdCategory.css("pointerEvents", "none");
					tdCategory.css("opacity", "0.4");
					metricCategory.show();
					hostCategory.hide();
				} else if(codeName == "metric") {
					tdCategory.css("pointerEvents", "");
					tdCategory.css("opacity", "1");
					metricCategory.show();
					hostCategory.hide();
				} else if(codeName == "host") {
					tdCategory.css("pointerEvents", "");
					tdCategory.css("opacity", "1");
					metricCategory.hide();
					hostCategory.show();
				}
				getTableList();
				getMetricList();
			}


			// function
			function getHistoryList() {
				initComp();

				// 날짜(시작, 종료) validation check
				if(!CommonUtil.validateStartEndDate(searchParam.startDate, searchParam.endDate))
					return;

				// message
				if(searchParam.metricName != null && searchParam.metricName != "")
					searchParam.message = searchParam.metricName;
				else if(searchParam.metricParentName != null && searchParam.metricParentName != "")
					searchParam.message = searchParam.metricParentName;
				else
					searchParam.message = null;

				alarmHistoryCtrl.grid.requestParam = angular.copy(searchParam);
				alarmHistoryCtrl.grid.requestURL = "/activities/alarm/history/getAlarmHistoryList";
				ap($scope);
			}

			function initComp(gridFlag) {
				searchParam.systemParentSeq = systemSeq;
				searchParam.startDate = alarmHistoryCtrl.filter.sDateTime;
				searchParam.endDate = alarmHistoryCtrl.filter.eDateTime;
				searchParam.startIndex = '0';
				searchParam.endIndex = '100';
				searchParam.pageSize = '100';

				if(gridFlag != null && gridFlag == true) {
					alarmHistoryCtrl.grid.requestURL = null;
					alarmHistoryCtrl.grid.requestParam = null;
					alarmHistoryCtrl.grid.historyList = [];
					alarmHistoryCtrl.grid.pagingList = [];
					ap($scope);
				}
			}

			function getData() {
				return new Promise(function (resolve) {
					var param = {};
					param.systemParentSeq = ConfigManager.getSystemSeq();

					DataService.httpPost("/activities/alarm/history/getProcessList", param, function (data) {
						if(data == null || data.data == null)
							return;

						alarmHistoryCtrl.filter.processList = [];
						alarmHistoryCtrl.filter.processList = alarmHistoryCtrl.filter.processList.concat(data.data);
						//getSystemList();
						getProcessHostList();
						getTableList();
						getMetricList();
						resolve();
					}, false);
				});
			}

			function getMetricList() {
				DataService.httpPost("/activities/alarm/history/getMetricList", searchParam, onGetMetricListResult, false);
			}

			function getTableList() {
				DataService.httpPost("/activities/alarm/history/getTableList", searchParam, onGetTableListResult, false);
			}

			function getProcessHostList() {
				alarmHistoryCtrl.filter.processHostList = [];
				var param = {
					processParentSeq: searchParam.processParentSeq,
					processSeq: searchParam.processSeq,
					systemSeq: systemSeq
				};			
				DataService.httpPost("/admin/application/getProcessHostList", param, onGetProcessHostListResult);
			}

			// function getSystemList() {
			// 	DataService.httpPost("/activities/alarm/history/getSystemList", searchParam, onGetSystemListResult, false);
			// }

			function initialize() {
				systemSeq = ConfigManager.getSystemSeq();
				addEventListener();
				initComp();
				angular.element("#hostCategoryCombo").hide();

				getData().then(function() {
					settingPeriod(3, 'hours');
					getHistoryList();
				});
			}

			function settingPeriod(num, unit) {
				var eMoment = moment(alarmHistoryCtrl.filter.eDateTime);
				alarmHistoryCtrl.filter.eDateTime = moment(eMoment).subtract(2, 'minutes').format('YYYY-MM-DD HH:mm');
				alarmHistoryCtrl.filter.sDateTime = moment(eMoment).subtract(num, unit).format('YYYY-MM-DD HH:mm');
			}

			function addEventListener() {
				unbind = [
					$scope.$on(ConfigManager.getEvent("CHANGE_SYSTEM_SEQ_EVENT"), onChangeSystemSeqEventHandler),
					$scope.$on('$destroy', destroy)
				];
			}

			function clear() {
				delete alarmHistoryCtrl.grid;
				delete alarmHistoryCtrl.filter;

				systemSeq = null;
				unbind = null;
				searchParam = null;
			}

			initialize();
		}]);
});