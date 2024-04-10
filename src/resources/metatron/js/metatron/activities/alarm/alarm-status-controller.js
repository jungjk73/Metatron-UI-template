define(["app"], function(app) {
	app.controller("AlarmStatusCtrl", ["$scope", "$rootScope", "AlarmService", "AlarmManager", "DataService", "ConfigManager", "ngDialog",
		function($scope, $rootScope, AlarmService, AlarmManager, DataService, ConfigManager, ngDialog) {
			"use strict";

			// property
			const ALARM_24H_PER_HOST_TOP_NUM = 10;

			var alarmStatusCtrl = this;
			var systemSeq = "";
			var unbind = [];
			var selectedAlarm = {};
			var alarmAction = { "ack": "Acknowledge", "delete": "Delete" };

			alarmStatusCtrl.top = {};
			alarmStatusCtrl.alarm = {};
			alarmStatusCtrl.grid = {};
			alarmStatusCtrl.chart = {};
			alarmStatusCtrl.filter = { severity: ['CR', 'MJ', 'MN'] };

			// method
			alarmStatusCtrl.onAlarmClickHandler = function(value) {
				setSelectedAlarm(value);
			};

			alarmStatusCtrl.changeFilterHandler = function() {
				console.log("change filter;");
				getAlarm();
			};

			alarmStatusCtrl.alarmUpdateHandler = function(type) {
				var l = getCheckedAlarmSeqList();
				if(l == null || l.length == 0) {
					alert("Please select Alarm.");
					console.log("Please select Alarm.", l);
					return;
				}

				var msgCode = [];
				msgCode.push('<div class="lay-pop">');
				msgCode.push('	<div class="pop-wrap">');
				msgCode.push('		<div class="head"><p class="tit">User Alarm Message</p></div>');
				msgCode.push('		<div class="cont">');
				msgCode.push('			<table class="mu-formbox" style="border: none;">');
				msgCode.push('				<tbody>');
				msgCode.push('					<tr>');
				msgCode.push('						<th style="border:none;">Message</th>');
				msgCode.push('						<td colspan="3" style="border:none;"><input type="text" class="mu-input" ng-model="alarmStatusCtrl.alarm.message"></td>');
				msgCode.push('					</tr>');
				msgCode.push('				</tbody>');
				msgCode.push('			</table>');
				msgCode.push('			<div class="btn-area">');
				msgCode.push('				<button type="button" class="mu-btn" ng-click="closeThisDialog();alarmStatusCtrl.alarm.message=\'\'">Cancel</button>');
				msgCode.push('				<button type="button" class="mu-btn mu-btn-color bg-orange" ng-click="alarmStatusCtrl.alarmUpdateExecution(\'' + type + '\')">OK</button>');
				msgCode.push('			</div>');
				msgCode.push('		</div>');
				msgCode.push('	</div>');
				msgCode.push('</div>');

				var popup = ngDialog.open({
					template: msgCode.join(''),
					className: "ngdialog-theme-default custom-width",
					showClose: true,
					plain: true,
					disableAnimation: true,
					cache: false,
					closeByDocument: false,
					closeByEscape: false,
					scope: $scope
				});

				var closer = $rootScope.$on('ngDialog.refresh', function(e, id) {
					if (id != popup.id) return;
					alarmStatusCtrl.alarm.message = "";
					closer();
				});
			};

			alarmStatusCtrl.alarmUpdateExecution = function(type) {
				var confirmResult = false;
				if(type == "ack") {
					confirmResult = confirm("Do you acknowledge the alarm(s)?");
				} else if(type == "delete") {
					confirmResult = confirm("Do you delete the alarm(s)?");
				}

				if(!confirmResult)
					return;

				var param = {};
				param.alarmSeqs = getCheckedAlarmSeqList();
				param.user = ConfigManager.getUser().username;
				param.message = alarmStatusCtrl.alarm.message;

				console.info("alarm update param; ", param);

				AlarmService[type + "Alarm"](param, function() {
					console.log(type + " is completed.----------------------------------------------------");
					alarmStatusCtrl.alarm.message = "";
					ngDialog.closeAll();
				});
			};

			alarmStatusCtrl.toggleSeverity = function(event, value) {
				var s = alarmStatusCtrl.filter.severity;
				var idx = _.indexOf(s, value);
				var target = angular.element(event.currentTarget);
				if(target.hasClass("disabled")) {
					target.removeClass("disabled");
					s.push(value);
				} else {
					s.splice(idx, 1);
					target.addClass("disabled");
				}
				getAlarm();
			};


			// event-handler
			function destroy() {
				unbind.forEach(function(fn) {
					fn();
					ngDialog.closeAll();
					clear();
				});
			}

			function onChangeSystemGroupIdEventHandler(event, data) {
				if (data == null)
					return;

				systemSeq = data;
				getData();
			}

			function onGetGridAlarmDataResultHandler(data) {
				if(data == null)
					return;

				alarmStatusCtrl.alarm.selectedList = getCheckedAlarmSeqList();
				alarmStatusCtrl.grid = _.sortBy(data, 'occurTime').reverse();
				ap($scope);
			}


			// function
			function initialize() {
				systemSeq = ConfigManager.getSystemSeq();
				addEventListener();
				getData();

				$scope.$watch("alarmStatusCtrl.filter.resource", alarmStatusCtrl.changeFilterHandler);
				$scope.$watch("alarmStatusCtrl.filter.occurMessage", alarmStatusCtrl.changeFilterHandler);
			}

			function addEventListener() {
				unbind = [
					$scope.$on(ConfigManager.getEvent("CHANGE_SYSTEM_SEQ_EVENT"), onChangeSystemGroupIdEventHandler),
					$scope.$on(ConfigManager.getEvent("ALARM_UPDATE_EVENT"), getData),
					$scope.$on('$destroy', destroy)
				];

				setTimeout(function() {
					var clickedLegend = false;
					// legend의 Scroll을 잡고 drag시도 하면 사라지는 이슈가 있어서 포인터가 나가면 이벤트 금지.
					angular.element(".zc-scroll-y-handle").mouseleave(function(event) {
						console.log("out!!!!!!!!!");
						angular.element(".zc-scroll-y-handle").blur();
						event.preventDefault();
						event.stopPropagation();
						event.stopImmediatePropagation();
						return false;
					}).mousemove(function(event) {
						if(clickedLegend) {
							event.preventDefault();
							event.stopPropagation();
							event.stopImmediatePropagation();
							return false;
						}
					}).mousedown(function() {
						clickedLegend = true;
					}).mouseup(function() {
						clickedLegend = false;
					});
				}, 1000);
			}

			function getData() {
				// Summary(Top; Current)
				getSummaryCurrent();

				// Grid(Bottom)
				getAlarm();

				// Summary(Top; 24시간 통계)
				getSummary24hours();
			}

			function getSummaryCurrent() {
				AlarmManager.getSummary().then(function(data) {
					alarmStatusCtrl.top = data;
				});

				AlarmManager.getAlarmsAsGroup('location', false).then(function(data) {
					alarmStatusCtrl.top.clusters = data;
					makePieChartData();
				});
			}

			function getSummary24hours() {
				var param = {};
				param.systemSeq = systemSeq;

				DataService.httpPost("/alarm/status/getAlarmSummaryData", param, function(data) {
					if(data == null || data.data == null)
						return;

					angular.merge(alarmStatusCtrl.top, data.data);
					makeAlarmByDateData();
					makeAlarmByHostData();
				}, false);
			}

			function makeAlarmByDateData() {
				if(alarmStatusCtrl.top.alarmByDate == null)
					return;

				var alarmByDate = alarmStatusCtrl.top.alarmByDate;
				var y = alarmByDate.y;
				var nullFlag = true;
				for(var i=0; i<y.length; i++) {
					if(y[i] != 0) {
						nullFlag = false;
						break;
					}
				}
				y = (nullFlag) ? [] : [{values: alarmByDate.y}];
				alarmStatusCtrl.chart.alarmByDateList = y;
				alarmStatusCtrl.chart.barChartOption = getBarChartOption(alarmByDate.x);
			}

			function makeAlarmByHostData() {
				if(alarmStatusCtrl.top.alarmByHost == null)
					return;

				// 값이 0 인 알람상태는 차트에서 안보여주도록 처리
				let valuesObjArr = alarmStatusCtrl.top.alarmByHost.y;
				if (valuesObjArr != null) {
					for (let i = 0 ; i < valuesObjArr.length ; i++) {
						let obj = valuesObjArr[i];
						if (obj.values && obj.values.length > 0) {
							let hasVal = false;
							for (let x = 0 ; x < obj.values.length ; x++) {
								let val = obj.values[x];
								if (Number(val) != 0) {
									hasVal = true;
								}
							}
							if (hasVal == false) {
								obj.values = [];
							}
						}
					}
				}

				alarmStatusCtrl.chart.alarmByHostList = alarmStatusCtrl.top.alarmByHost.y == null ? [] : alarmStatusCtrl.top.alarmByHost.y;
				var forceArr = makeForceArrayLength(alarmStatusCtrl.top.alarmByHost.x, ALARM_24H_PER_HOST_TOP_NUM, "");
				alarmStatusCtrl.chart.stackChartOption = getStackBarChartOption(forceArr);
			}

			function makeForceArrayLength(list, forceNum, replaceObj) {
				if(list == null)
					list = [];

				var result = [];
				for(var i=0; i<forceNum; i++) {
					var tmp = (list[i] == null)? replaceObj:list[i];
					result.push(tmp);
				}
				return result;
			}

			function getBarChartOption(x) {
				return {
					"scale-x": {
						"item": {
							"font-color": "#000"
						},
						"guide": {
							"visible": false
						},
						"utc": true,
						"timezone": 9,
						"transform": {
							"type": "date",
							"all": "%ddd %Hh"
						},
						"values": x
					},
					"scale-y": {
						"auto-fit": true,
						"line-width": 1,
						"step": 1,
						"item": {
							"font-color": "#000"
						},
						"guide": {
							"visible": false
						}
					},
					"plot": {
						"background-color": "#8ae1fa",
						"marker": {
							"visible": false
						},
						"tooltip": {
							"text": "%kv",
							"thousands-separator": ",",
							"transform": {
								"type": "date",
								"all": "%Y/%m/%d %H:00<br/>Alarm Count: %v"
							}
						}
					},
					"plotarea": {
						marginTop : 'dynamic',
						marginRight : 'dynamic',
						marginLeft : 'dynamic',
						marginBottom : '25',
						"border": "none",
						"top": -100
					}
				}
			}

			function getStackBarChartOption(x) {
				return {
					"stacked": true,
					"scale-x": {
						"item": {
							"font-size": 11,
							"font-color": "#000",
							"width": 15,
							"max-chars" : 7
						},
						"tooltip" : {
							"text":"%v",
							"background-color":"#fff",
							"border-color":"#ccc"
						},
						"guide": {
							"visible": false
						},
						"values": x,
						"min-items": 10,
						"max-items": 10,
					},
					"scale-y": {
						"auto-fit": true,
						"line-width": 1,
						"step": 1,
						"item": {
							"font-color": "#000"
						},
						"guide": {
							"visible": false
						}
					},
					"plot": {
						"background-color": "#8ae1fa",
						"marker": {
							"visible": false
						},
						"tooltip": {
							"text": "<b>%k</b><br>%t: %v",
							"thousands-separator": ","
						}
					},
					"plotarea": {
						marginTop : 'dynamic',
						marginRight : 'dynamic',
						marginLeft : 'dynamic',
						marginBottom : '25',
						"border": "none",
						"top": -100
					}
				}
			}

			function getAlarm() {
				AlarmManager.getAlarms(alarmStatusCtrl.filter).then(function(data) {
					onGetGridAlarmDataResultHandler(data);
				});
			}

			function getCheckedAlarmSeqList() {
				return Object.keys(selectedAlarm);
			}

			function makePieChartData() {
				if(alarmStatusCtrl.top.clusters == null)
					return;

				var data = alarmStatusCtrl.top.clusters;
				var pData = [];
				for(var key in data) {
					var p = {};
					p["text"] = key;
					p["values"] = [data[key].length];
					pData.push(p);
				}

				alarmStatusCtrl.top.currentStatus = pData;
				alarmStatusCtrl.chart.pieOption = getPieChartOption(pData);
			}

			function getPieChartOption(data) {
				var opt = {
					"background-color": "#fff",
					"plot": {
						"size": 90,
						"slice": 60,
						"detach": false,
						"shadow": 0,
						"value-box": {
							"visible": false
						},
						"tooltip": {
							"text": "Alarm Count<br/>%t: %v",
							"shadow": false,
							"thousands-separator": ","
						}
					},
					

					"plotarea": {
						"x": -35,
						"margin": "dynamic"
					},
					"legend": {
						"overflow":"scroll",
						"position": "absolute",
						"width": "90px",
						"padding":"2%",
						"layout":"4x1",
						"max-items": 4,
						"border-width": 1,
						"margin": "40px 235px",
						"marker": {
							"border-radius": 3,
							"border-width": 0
						},
						"item": {
							"color": "#333",
							"text": "%t",
							"overflow":"hidden",
							"text-overflow":"ellipsis"
						},
						header: {
							"text": "Total: " + alarmStatusCtrl.top.total,
							"font-size": "12px"
						}
					},
					"labels": [
						{
							"id": 'lblcenter',
							"anchor": 'c',
							"x": "35%",
							"y": "50%",
							"text": (alarmStatusCtrl.top != null && alarmStatusCtrl.top.total != null && alarmStatusCtrl.top.total < 1)? "":"ALL",
							"fontSize": 27,
							"font-weight": "bold",
							"color": "#484A54"
						}
					]
				};

				if(data == null || data.length < 1) {
					delete opt.legend;
				}
				return opt;
			}

			function setSelectedAlarm(value) {
				if(value == null || value.length < 1) {
					selectedAlarm = {};
					return;
				}

				selectedAlarm = _.indexBy(_.pluck(value, 'data'), 'alarmSeq');

				var l = value.length;
				for(var key in selectedAlarm) {

					var exist = false;
					for(var i=0; i<l; i++) {
						var data = value[i].data;
						if(key == data.alarmSeq) {
							exist = true;
							selectedAlarm[data.alarmSeq] = value[i].data;
							break;
						}
					}

					if(!exist)
						delete selectedAlarm[key];
				}
			}

			function clear() {
				delete alarmStatusCtrl.top;
				delete alarmStatusCtrl.filter;
				delete alarmStatusCtrl.alarm;
				delete alarmStatusCtrl.grid;
				delete alarmStatusCtrl.chart;

				systemSeq = null;
				unbind = null;
				selectedAlarm = null;
				alarmAction = null;
			}

			initialize();
	}]);
});