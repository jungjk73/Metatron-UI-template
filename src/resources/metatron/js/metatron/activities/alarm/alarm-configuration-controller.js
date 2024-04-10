define(["app"], function (app) {
	app.controller("AlarmConfigCtrl", ["$scope", "$rootScope", "$controller", "$timeout", "DataService", "ngDialog", "ConfigManager",
		function ($scope, $rootScope, $controller,$timeout, DataService, ngDialog, ConfigManager) {
			"use strict";

			// property
			var alarmConfigCtrl = this;
			var systemSeq = "";
			var unbind = [];
			alarmConfigCtrl.filter = {};

			let loadCompleted = false;

			alarmConfigCtrl.selectedAlarms = [];


			// event-handler
			function destroy() {
				unbind.forEach(function (fn) {
					clear();
					fn();
					ngDialog.closeAll();
				});
			}

			function onChangeSystemSeqEventHandler(event, data) {
				if (data == null)
					return;

				if (!loadCompleted) return;

				systemSeq = data;
				getData();
			}

			function onGetSearchConditionDataResult(data) {
				loadCompleted = true;

				if(data == null || data.data == null)
					return;

				alarmConfigCtrl.processList = data.data.alarmCategory;
				setTimeout(getData, 1000);
			}

			function onGetAlarmDataResult(data) {
				if(data == null || data.data == null)
					return;
				alarmConfigCtrl.alarmList_original = data.data;
				alarmConfigCtrl.alarmList = data.data;
			}

			function onDeleteAlarmResultHandler(data) {
				if(data == null || data.data == null)
					return;

				if (!loadCompleted) return;

				alarmConfigCtrl.selectedAlarms = [];
				getData();
			}


			// method
			alarmConfigCtrl.filterListChange = function(event, key) {
				if(event == null || key == null || key == "")
					return;

				if (!loadCompleted) return;

				var type = key.toUpperCase();
				if(type == "TYPE")
					alarmConfigCtrl.enableAlarmCategory = (event.codeValue == 1)? true : false;
				alarmConfigCtrl.filter[key] = event.codeValue;

				getData();
			};

			alarmConfigCtrl.alarmSearchBtnClickHandler = function () {
				getData();
			};

			alarmConfigCtrl.alarmAddBtnClickHandler = function() {
				openAlarmPopup();
			};

			alarmConfigCtrl.alarmGridDbClickHandler = function(data) {
				var param = data.data;
				param.systemParentSeq = systemSeq;
				openAlarmPopup(param);
			};

			alarmConfigCtrl.openFlumeConfigPopup = function(data) {
				
				$scope.data = {
					groupId: data.data.groupId
				}
				
				var flumePopup = ngDialog.open({
                    template: "/data/hdfs/popup/flume_config_popup_template.html",
                    className: "ngdialog-theme-default custom-width",
                    showClose: false,
                    disableAnimation: true,
                    cache: false,
                    closeByDocument: false,
                    closeByEscape: false,
                    scope: $scope,
                    controller: $controller("FlumePopupCtrl", {
                        $rootScope: $rootScope,
                        $scope: $scope
                    })
                });
                
                flumePopup.closePromise.then(function(data) {
					getData();
					return true;
				});

                var closer = $rootScope.$on('ngDialog.refresh', function(e, id) {
                    if (id != flumePopup.id) return;
                    closer();
                });

			};


			alarmConfigCtrl.onAlarmGridRowClickHandler = function (value) {
				alarmConfigCtrl.selectedAlarms = _.pluck(value, 'data');
			};

			alarmConfigCtrl.alarmDeleteBtnClickHandler = function () {
				if (alarmConfigCtrl.selectedAlarms == null || alarmConfigCtrl.selectedAlarms.length < 1) {
					alert("Please select the alarm to delete.");
					return;
				}

				var confirmResult = confirm("Do you delete the alarm(s)?");
				if(!confirmResult)
					return;

				DataService.httpPost("/activities/alarm/configuration/deleteAlarm", alarmConfigCtrl.selectedAlarms, onDeleteAlarmResultHandler);
			};

			alarmConfigCtrl.alarmExcelDownClickHandler = function(event){
				let param = {};
				param.fileName = "Alarm_Configuration.csv";
				param.id = "alarmGrid";
				$timeout(function () {
					$rootScope.$broadcast("exportToCSV", param); // $rootScope.$on
				}, 1500);
			};


			// function
			function openAlarmPopup(param) {
				
				var type = '';
				if(alarmConfigCtrl.filter.type == 1) {
					type = 'metric';
				}else if(alarmConfigCtrl.filter.type == 2) {
					type = 'hostAlarm';
				}else if(alarmConfigCtrl.filter.type == 4) {
					type = 'prometheus';
				}else if(alarmConfigCtrl.filter.type == 5) {
					type = 'redis';
				}

				// 팝업데이터 셋팅				
				$scope.param = {
					type: type,
					data: param
				}
				

				var alarmPopup = ngDialog.open({
					template : "/activities/alarm/popup/alarm_configuration_popup.html",
					className: "ngdialog-theme-default custom-width",
					showClose: false,
					disableAnimation: true,
					cache: false,
					closeByDocument: false,
					closeByEscape: false,
					scope: $scope
				});

				alarmPopup.closePromise.then(function(data) {
					getData();
					return true;
				});

				var closer = $rootScope.$on('ngDialog.refresh', function(e, id) {
					if (id != alarmPopup.id) return;
					closer();
				});
			}

			function getData() {
				if(alarmConfigCtrl.filter.type == null)
					return;

				alarmConfigCtrl.filter.system_parent_seq = systemSeq;

				if(alarmConfigCtrl.filter.type == "3") {
					alarmConfigCtrl.filter.cluster = ConfigManager.getSystemName();
					DataService.httpPost("/data/hdfs/flume/getAlarmList", alarmConfigCtrl.filter, onGetAlarmDataResult, false);
				}else {
					DataService.httpPost("/activities/alarm/configuration/getAlarm", alarmConfigCtrl.filter, onGetAlarmDataResult, false);
				}
				
			}

			function getSearchConditionData() {
				var param = {};
				param.systemSeq = systemSeq;

				DataService.httpPost("/activities/alarm/configuration/getSearchConditionData", param, onGetSearchConditionDataResult, false);
			}

			function changeFilterHandler(event) {
				if(event !== undefined) {					
					var originList = angular.copy(alarmConfigCtrl.alarmList_original);						
					if(event == ''){
						alarmConfigCtrl.alarmList = originList;
					}else {					
						alarmConfigCtrl.alarmList = _.filter(originList, function(item){
							return item.alarmName.toUpperCase().indexOf(event.toUpperCase()) > -1;
						})
					}
				}
			}

			function addEventListener() {
				// broadcast event
				unbind = [
					$scope.$on(ConfigManager.getEvent("CHANGE_SYSTEM_SEQ_EVENT"), onChangeSystemSeqEventHandler),
					$scope.$watch("alarmConfigCtrl.filter.alarmName", changeFilterHandler),
					$scope.$on('$destroy', destroy)
				];
			}

			function initialize() {
				systemSeq = ConfigManager.getSystemSeq();
				addEventListener();
				getSearchConditionData();
			}

			function clear() {
				if(alarmConfigCtrl == null)
					return;

				delete alarmConfigCtrl.enableAlarmCategory;
				delete alarmConfigCtrl.selectedAlarms;
				delete alarmConfigCtrl.processList;
				delete alarmConfigCtrl.alarmList;

				systemSeq = null;
				unbind = null;
				alarmConfigCtrl.filter = null;
				alarmConfigCtrl = null;
			}

			initialize();
	}]);
});