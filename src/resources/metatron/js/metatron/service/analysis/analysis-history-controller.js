define(["app", "moment"], function (app, moment) {
	app.controller("HistoryAnalysisCtrl", ["$rootScope", "$scope", "$timeout", "DataService", "ConfigManager", "GridRenderer", "ngDialog", "$compile", "CommonUtil",
		function ($rootScope, $scope, $timeout, DataService, ConfigManager, GridRenderer, ngDialog, $compile, CommonUtil) {
			"use strict";


			/*******
			 * 2017.01.31
			 * Host Name 이 ALL 인 경우에 Metric을 5개 까지 선택하여 보여주기로 함.
			 * 차트 영역에 Metric Name 으로 구분하여 보여주기로 함
			 *******/

			// property

			var historyAnalysisCtrl = this;
			var systemSeq = "";
			var unbind = [];
			var selectTreeMultiType = false;
			var beforTreeNode = null;
			var chartIdx = 0;
			var chartShowIdx = 0;
			var loopCnt = 5;
			var chartTotal = 0;
			var periodDay = 0;
			var treeLabelMaxLength = 17;
			const MAX_METRIC_NUM = 5;     // Host Name 이  ALL 인 경우 최대 선택가능 Metric 개수
			historyAnalysisCtrl.showThreshod = 'Y';
			historyAnalysisCtrl.param = {};
			historyAnalysisCtrl.thresholdValue = "";
			historyAnalysisCtrl.empty = true;

			historyAnalysisCtrl.selectMetricList = [];      // 선택한 Metric name 저장 리스트

			historyAnalysisCtrl.requestExcel = false;		// 엑셀 다운로드 요청인지 구분. search 기능 이용

			let mySpinner = null;
			let mySpinnerTarget = null;
			let myBlockUI = null;

			var REQUEST_ZOOMING_SEARCH = true;	// zoom 이벤트가 두번 날아가는거 방지.


			historyAnalysisCtrl.treeOptions = {
				dirSelectable: false
			};


			// event-handler
			function addEventListener() {
				unbind = [
					$scope.$on(ConfigManager.getEvent("CHANGE_SYSTEM_SEQ_EVENT"), onChangeSystemGroupIdEventHandler),
					$scope.$on('$destroy', destroy)
				];
			}

			function destroy() {
				DataService.httpPost("/activities/system/history/delChartImg", null, function (data) {

				}, false);

				hideMySpinner();

				unbind.forEach(function (fn) {
					fn();
				});

				historyAnalysisCtrl.selectMetricList = null;
				historyAnalysisCtrl = null;
				chartIdx = null;
				chartShowIdx = null;
				loopCnt = null;
				chartTotal = null;
				periodDay = null;
			}

			function onChangeSystemGroupIdEventHandler(event, data) {
				if (data == null)
					return;

				systemSeq = ConfigManager.getSystemSeq();
				getProcessData();
			}

			function onGetSystemListResult(data) {
				if (data == null || data.data == null)
					return;

				historyAnalysisCtrl.systemList = data.data;
			}


			// method
			historyAnalysisCtrl.changeHostNameSelectEventHandler = function (event) {
				historyAnalysisCtrl.selectMetricList = [];
				historyAnalysisCtrl.param.hostSeq = event.value;
				historyAnalysisCtrl.param.hostName = event.label;
				if (historyAnalysisCtrl.metricTreeModel)
					treeClassChange();
			};

			historyAnalysisCtrl.changeSelectBox = function (event, type) {
				if (type == 'metric') {

					if (historyAnalysisCtrl.param.process_seq != event.value) { // 새로 선택한 Metric 과 기존 선택된 Metric 다른 경우
						historyAnalysisCtrl.selectMetricList = [];
						historyAnalysisCtrl.param.process_seq = event.value;
						$timeout(getMetricData, 500);
					}

				} else if (type == 'until') {
					historyAnalysisCtrl.param.until = event.codeValue;
					var eMoment = moment(historyAnalysisCtrl.eDateTime);
					historyAnalysisCtrl.sDateTime = eMoment.subtract(historyAnalysisCtrl.param.until, 'hour').format('YYYY-MM-DD HH:mm');
					ap($scope);
				} else {
					historyAnalysisCtrl.param[type] = event.codeValue;
				}
			};

			historyAnalysisCtrl.clickSearch = function () {
				historyAnalysisCtrl.requestExcel = false;
				getData();
			};

			historyAnalysisCtrl.clickExcelDownload = function () {
				historyAnalysisCtrl.requestExcel = true;
				getData();
			};

			historyAnalysisCtrl.toggleChartArea = function (target) {
				$('#chartArea_' + target).slideToggle('slow');
			};

			historyAnalysisCtrl.getNodeClass = function (node) {
				if (node.label != null && node.label.length > treeLabelMaxLength)
					treeLabelMaxLength = node.label.length;

				if (node.display == 'Y')
					return 'display-inline';
				else
					return 'display-none';
			};



			historyAnalysisCtrl.treeSelected = function (node) {
				if (node.selectedNode == 'Y') {
					historyAnalysisCtrl.param.table = node.tableName;
					historyAnalysisCtrl.param.column = node.columnName;
					historyAnalysisCtrl.param.unitDisplay = node.unitDisplay;
					historyAnalysisCtrl.param.unitType = node.unitType;
				} else {
					historyAnalysisCtrl.param.table = null;
					historyAnalysisCtrl.param.column = null;
				}


				if (selectTreeMultiType == false) {
					if (node.display == 'Y' && node.selectedNode == 'Y' && historyAnalysisCtrl.selectMetricList.length >= MAX_METRIC_NUM) {
						node.selectedNode = 'N';
						alert('You can choose up to ' + MAX_METRIC_NUM + ' metrics.');
					} else if (node.selectedNode == 'N') {
						var idx = _.indexOf(historyAnalysisCtrl.selectMetricList, node.columnName);
						historyAnalysisCtrl.selectMetricList.splice(idx, 1);
					} else {
						historyAnalysisCtrl.selectMetricList.push(node.columnName);
					}

				} else {
					if (node.hasOwnProperty("childrenFlag")) {
						if (node.childrenFlag == "Y") {
							var len = node.children.length;
							for (var i = 0; i < len; i++) {
								node.children[i].selectedNode = node.selectedNode;
							}
						}
					}
				}
			};

			historyAnalysisCtrl.selectTreeLabel = function (node) {
				if (node.selectedNode == 'Y') node.selectedNode = 'N';
				else node.selectedNode = 'Y';

				historyAnalysisCtrl.treeSelected(node);
			};

			historyAnalysisCtrl.changeDate = function (event) {
				historyAnalysisCtrl.sDateTime = event.sDateTime;
				historyAnalysisCtrl.eDateTime = event.eDateTime;
			};

			historyAnalysisCtrl.showLargeChart = function (type, metric, idx) {
				let chart = null;
				if (type == 'ALL')
					chart = historyAnalysisCtrl.chartArrWithMetric[metric][idx];
				else
					chart = historyAnalysisCtrl.chartArr[idx];

				chart.title = {};
				chart.title.text = chart.chartTitle;
				$scope.largeChartModel = chart;

				//jfree chart 수정 (jfreeChart , zingchart 다른것)
				// values 사이즈가 1 일경우에는 앞뒤로 dummy 넣어줘서 맞춰준다.
				var values = chart.series[0].values;
				if(values.length == 1) {
					var s = moment(values[0][0]).add('m',-5).valueOf();
					var e = moment(values[0][0]).add('m',5).valueOf();

					var sArr = [s,0];
					var eArr = [e,0];

					values.unshift(sArr);
					values.push(eArr);

					chart.series[0].values = values;
				}

				var popup = ngDialog.open({
					template: "/common/chart_large_template.html",
					className: "ngdialog-theme-default custom-width",
					showClose: false,
					disableAnimation: true,
					cache: false,
					closeByDocument: false,
					closeByEscape: false,
					scope: $scope
				});
				var closer = $rootScope.$on('ngDialog.refresh', function (e, id) {
					if (id != popup.id) return;
					closer();
				});

				setTimeout(function () {
					$compile($('#largeChart'))($scope);
				}, 500);

			};

			$scope.zoomingChart = function (event) {
				if (REQUEST_ZOOMING_SEARCH == false) return;
				let sMoment2;
				let eMoment2;
				sMoment2 = moment(event.kmin);
				eMoment2 = moment(event.kmax);

				sMoment2 = sMoment2.format('YYYY-MM-DD HH:mm');
				eMoment2 = eMoment2.format('YYYY-MM-DD HH:mm');
				historyAnalysisCtrl.sDateTime = sMoment2;
				historyAnalysisCtrl.eDateTime = eMoment2;

				getData();

				// zoom 요청 두번 날아가는거 방지
				REQUEST_ZOOMING_SEARCH = false;
				let tempTimer = $timeout(function () {
					REQUEST_ZOOMING_SEARCH = true;
					$timeout.cancel(tempTimer);
				}, 1000);

			};

			$scope.closeLargeChartDialog = function () {
				$scope.largeChartModel = null;
				ngDialog.closeAll();
			};

			function treeClassChange() {
				var l = 0;
				if (historyAnalysisCtrl.param.hostSeq && historyAnalysisCtrl.param.hostSeq != null) {
					l = historyAnalysisCtrl.metricTreeModel.length;
					for (var i = 0; i < l; i++) {
						historyAnalysisCtrl.metricTreeModel[i].display = 'Y';
					}
					selectTreeMultiType = true;
				} else {
					l = historyAnalysisCtrl.metricTreeModel.length;
					for (var i = 0; i < l; i++) {
						historyAnalysisCtrl.metricTreeModel[i].display = 'N';
						historyAnalysisCtrl.metricTreeModel[i].selectedNode = 'N';
						var node = historyAnalysisCtrl.metricTreeModel[i];
						if (node.childrenFlag == "Y") {
							for (var j = 0; j < node.children.length; j++) {
								node.children[j].selectedNode = 'N';
							}
						}
					}

					selectTreeMultiType = false;
				}
				ap($scope);

				// Tree Scroll 계산
				setTimeout(function () {
					if (treeLabelMaxLength != 0) {
						let w = treeLabelMaxLength * 12;
						angular.element("#tree").find("ul").eq(0).css("width", w + "px");
					}
				}, 900);
			}

			function getProcessData() {
				var param = {};
				DataService.httpPost("/service/analysis/getAnalysisProcess", param, getAnalysisProcessResult, false);
			}

			function getMetricData() {
				var param = historyAnalysisCtrl.param;
				DataService.httpPost("/service/analysis/getAnalysisMetricList", param, getAnalysisMetricListResult, false);
			}

			function getAnalysisProcessResult(event) {
				historyAnalysisCtrl.processList = [];
				historyAnalysisCtrl.processList = event.data.list;
			}

			function getAnalysisMetricListResult(event) {
				historyAnalysisCtrl.metricTreeModel = [];
				historyAnalysisCtrl.metricTreeModel = event.data.tree;
				historyAnalysisCtrl.expandMenuList = [historyAnalysisCtrl.metricTreeModel[0]];
				treeClassChange();
			}

			function getData() {
				if (getParam() == true) {
					showMySpinner();
					if (!historyAnalysisCtrl.requestExcel) {
						historyAnalysisCtrl.chartUrlList = [];
						historyAnalysisCtrl.metricChartMap = [];
					}
					if (selectTreeMultiType == false)
						DataService.httpPost("/service/analysis/getAnalysisChart", historyAnalysisCtrl.param, getAnalysisChartResult, false);
					else
						DataService.httpPost("/service/analysis/getAnalysisMetricChart", historyAnalysisCtrl.param, getAnalysisChartResult, false);
				}

			}

			function getParam() {
				var boolean = true;

				historyAnalysisCtrl.param.startTime = new Date(historyAnalysisCtrl.sDateTime).getTime();
				historyAnalysisCtrl.param.endTime = new Date(historyAnalysisCtrl.eDateTime).getTime();

				historyAnalysisCtrl.param.startDate = historyAnalysisCtrl.sDateTime;
				historyAnalysisCtrl.param.endDate = historyAnalysisCtrl.eDateTime;

				historyAnalysisCtrl.param.systemSeq = systemSeq;
				historyAnalysisCtrl.param.threshold = historyAnalysisCtrl.thresholdValue;
				historyAnalysisCtrl.param.multiMetric = selectTreeMultiType;
				historyAnalysisCtrl.param.metricData = historyAnalysisCtrl.metricTreeModel;

				historyAnalysisCtrl.param.requestExcel = historyAnalysisCtrl.requestExcel;

				// 날짜(시작, 종료) validation check
				if (!CommonUtil.validateStartEndDate(historyAnalysisCtrl.param.startDate, historyAnalysisCtrl.param.endDate))
					return;

				// 마지막 날짜가 현재 날짜보다 크다면 마지막 날짜를 현재 날짜로 설정
				if (CommonUtil.isEndDateLargerThanToday(historyAnalysisCtrl.eDateTime)) {
					historyAnalysisCtrl.eDateTime = moment().subtract(2, 'minute').format('YYYY-MM-DD HH:mm');
					historyAnalysisCtrl.param.endDate = historyAnalysisCtrl.eDateTime;
				}


				var duration = moment.duration(moment(historyAnalysisCtrl.param.endTime).diff(moment(historyAnalysisCtrl.param.startTime)));
				periodDay = duration.asDays();

				var diffMin = moment(historyAnalysisCtrl.param.endTime).diff(moment(historyAnalysisCtrl.param.startTime), 'minutes');
				/*
				 ~12시간까지 : 15분
				 ~2주일 : 1시간		- 60분
				 ~30일 : 12시간	- 720분
				 30일 넘어가면 : 1일	- 1440분
				 */
				var param_standard = 15;	// 기본은 15로 하기로 함
				if (diffMin > 720 && diffMin <= 20160) {		// 12시간 ~ 2주일
					param_standard = 60;
				}
				if (diffMin > 20160 && diffMin <= 43200) {	// 2주일 ~ 30일
					param_standard = 720;
				}
				if (diffMin > 43200) {		// 30일 넘어가는 경우
					param_standard = 1440;
				}

				historyAnalysisCtrl.param.time_standard = param_standard * 60;

				// if(periodDay > 4)
				// {
				// 	alert('Period of 3 days');
				// 	return;
				// }

				if (historyAnalysisCtrl.param.until == '0') {
					alert('Until Select!');
					boolean = false;
					return;
				}

				if (historyAnalysisCtrl.param.hostSeq == null) {

					if (getSelectMetricBoolean() == false) {
						alert("Please check the metric.");
						boolean = false;
						return;
					}
				} else {
					if (getSelectMetricBoolean() == false) {
						alert("Please check the metric.");
						boolean = false;
						return;
					}
					historyAnalysisCtrl.param.metriclist = historyAnalysisCtrl.metricTreeModel;
				}

				return boolean;
			}

			function getSelectMetricBoolean() {
				var len = historyAnalysisCtrl.metricTreeModel.length;
				for (var i = 0; i < len; i++) {
					if (historyAnalysisCtrl.metricTreeModel[i].selectedNode == 'Y')
						return true;
					else {
						var node = historyAnalysisCtrl.metricTreeModel[i];
						if (node.childrenFlag == "Y") {
							for (var j = 0; j < node.children.length; j++) {
								if (node.children[j].selectedNode == 'Y')
									return true;

							}
						}
					}

				}

				return false;
			}

			function getAnalysisChartResult(event) {

				if (!event.data || !event.data.chart) {
					hideMySpinner();
					if (historyAnalysisCtrl.requestExcel) {
						alert("There is no data for Excel.");
						// $('#msg_area').text('No Data.');
						// historyAnalysisCtrl.empty = true;
					} else {
						historyAnalysisCtrl.empty = true;
					}
					return;
				}


				historyAnalysisCtrl.showThreshod = 'Y';
				chartIdx = 0;
				chartShowIdx = 0;
				$('.btn-more').hide();
				historyAnalysisCtrl.chart = event.data.chart;
				chartTotal = 0;

				historyAnalysisCtrl.chartArr = [];
				historyAnalysisCtrl.chartMetricList = [];
				historyAnalysisCtrl.chartArrWithMetric = {};

				if (selectTreeMultiType == false) {
					historyAnalysisCtrl.chart = [];
					var metricNames = Object.keys(event.data.chart);
					for (var i = 0, j = metricNames.length; i < j; i += 1) {
						var metricName = metricNames[i];
						historyAnalysisCtrl.chartMetricList.push(metricName);
						historyAnalysisCtrl.chart = historyAnalysisCtrl.chart.concat(event.data.chart[metricName]);
						historyAnalysisCtrl.chartArrWithMetric[metricName] = [];
					}
				}

				// 엑셀 처리 부분
				// 보이지 않는 임시 그리드를 만들어서 엑셀로 생성
				let empty = true;
				if (historyAnalysisCtrl.requestExcel) {
					console.debug('Export to CSV');

					if (!historyAnalysisCtrl.chart || historyAnalysisCtrl.chart.length == 0) {
						alert("There is no data");
						// $('#msg_area').text('No Data.');
						// historyAnalysisCtrl.empty = true;
						hideMySpinner();
						return;
					}

					let tempGridData = [];
					for (let x = 0, y = historyAnalysisCtrl.chart.length; x < y; x++) {
						let _chart = historyAnalysisCtrl.chart[x];
						let _values = _chart.chartData.values;

						for (let i = 0, j = _values.length; i < j; i++) {
							let _gridData = {};
							if (selectTreeMultiType == false) { // ALL
								_gridData['host'] = _chart.systemName + ( _chart.chartData.unitType == '' ? '' : ' (' + _chart.chartData.unitType + ')' );
							} else {
								_gridData['host'] = historyAnalysisCtrl.param.hostName + ( _chart.chartData.unitType == '' ? '' : ' (' + _chart.chartData.unitType + ')' );
							}
							_gridData['metric'] = _chart.chartData.metrics;
							_gridData['date'] = moment(_values[i][0]).format('YYYY-MM-DD HH:mm:ss');

							if (_values[i] != null && _values[i].length > 0)
								empty = false;

							_gridData['value'] = _values[i][1];
							tempGridData.push(_gridData);
						}
					}

					if (empty) {
						alert("There is no data for Excel.");
						// $('#msg_area').text('No Data.');
						// historyAnalysisCtrl.empty = true;
						hideMySpinner();
						return;
					}

					historyAnalysisCtrl.chartGridData = tempGridData;
					ap($scope);


					let param = {};
					param.fileName = "Analysis_History.csv";
					param.id = "tempExcelGrid";
					$timeout(function () {
						$rootScope.$broadcast("exportToCSV", param); // $rootScope.$on
					}, 1500);

					//hideMySpinner();
					// return;
				} else {
					for (let x = 0, y = historyAnalysisCtrl.chart.length; x < y; x++) {
						let _chart = historyAnalysisCtrl.chart[x];
						let _values = _chart.chartData.values;
						for (let i = 0, j = _values.length; i < j; i++) {
							if (_values[i] != null && _values[i].length > 0)
								empty = false;
						}
					}

					if (empty) {
						// alert("There is no data.");
						$('#msg_area').text('No Data.');
						historyAnalysisCtrl.empty = true;
						hideMySpinner();
						return;
					} else {
						historyAnalysisCtrl.empty = false;
					}

					// 차트 처리
					chartTotal = historyAnalysisCtrl.chart.length;
					historyAnalysisCtrl.chartMaxValue = null;

					if (event.data.maxValue) {
						historyAnalysisCtrl.chartMaxValue = event.data.maxValue;
					}

					if (selectTreeMultiType == false) {   // ALL
						$timeout(settingChartForALL(), 500);

						if (!historyAnalysisCtrl.requestExcel)
							historyAnalysisCtrl.metricChartMap = event.data.metricChartMap;
					} else {
						$timeout(settingChart(), 500);

						if (!historyAnalysisCtrl.requestExcel)
							historyAnalysisCtrl.chartUrlList = event.data.pathTitleArray;
					}
				}





				historyAnalysisCtrl.requestExcel = false;
				hideMySpinner();
			}

			/**
			 * Host Name 선택이 ALL 인 경우
			 * Metirc 별 영역을 표시해준다
			 */
			function settingChartForALL() {
				for (var i = 0; i < chartTotal; i++) {
					var metricName = historyAnalysisCtrl.chart[chartIdx].chartData['metrics'];
					var maxValue = historyAnalysisCtrl.chartMaxValue[metricName] != null ? Math.round((Number(historyAnalysisCtrl.chartMaxValue[metricName].MAX_VALUE) + (Number(historyAnalysisCtrl.chartMaxValue[metricName].MAX_VALUE)) * 0.1)) : null;
					var chartOption = {
						"type": "area",
						gui: {
							contextMenu: {
								visible: false
							}
						},
						"backgroundColor": "transparent",
						"crosshair-x": {
							lineColor: "#ff3d00",
							lineStyle: "solid",
							lineWidth: 1,
							alpha: 0.5,
							"scale-label": {
								"border-color": "#55c7eb",
								"background-color": "#c8f3ff",
								padding: '0 5px 0 5px',
								"color": "#333",
								"visible": true,
								"border-width": 1,
								"font-size": 12
							},
							"plot-label": {
								"padding": 8,
								"border-radius": 3,
								"border-color": "#55c7eb",
								"background-color": "#fff",
								"color": "#333",
								"visible": true,
								text: metricName + "<br>%v",
								"font-size": 12,
								"thousands-separator": ","
							}
						},
						"scale-y": {
							"thousands-separator": ",",
							maxValue: maxValue,
							item: {
								"font-color": "#555"
							}, guide: {
								visible: false
							}
						},
						"scale-x": {
							zooming: false,
							placement: "default",
							item: {
								"font-color": "#555"
							},
							guide: {
								visible: false
							},
							tick: {
								lineWidth: "1px"
							},
							transform: {
								type: "date",
								text: transformDate()
							}
						},
						"plot": {
							"marker": {
								"visible": false
							}
						},
						plotarea: {
							marginBottom: '40',
							marginTop: 'dynamic',
							marginRight: 'dynamic',
							marginLeft: 'dynamic'
							// margin : 'dynamic'

						},
						"series": [
							{
								"tooltip": {
									"visible": "false"
								},
								"values": historyAnalysisCtrl.chart[chartIdx].chartData['values'],
								"line-width": 1,
								"line-color": "#55c7eb",
								"background-color": "#c8f3ff",
								"alphaArea": "1"
							}
						]
					};

					chartOption.unitType = historyAnalysisCtrl.param.unitType;

					chartOption.chartTitle = historyAnalysisCtrl.chart[chartIdx].label;
					if (chartOption.unitType != '' && chartOption.unitType != null) {
						chartOption.chartTitle = chartOption.chartTitle + " (" + chartOption.unitType + ")";
					}

					historyAnalysisCtrl.chartArrWithMetric[metricName].push(chartOption);
					chartShowIdx++;
					chartIdx++;
				}
			}

			function settingChart() {
				for (var i = 0; i < chartTotal; i++) {
					var chartOption = {
						"type": "area",
						"backgroundColor": "transparent",
						"crosshair-x": {
							lineColor: "#ff3d00",
							lineStyle: "solid",
							lineWidth: 1,
							alpha: 0.5,
							"scale-label": {
								"border-color": "#55c7eb",
								"background-color": "#c8f3ff",
								padding: '0 5px 0 5px',
								"color": "#333",
								"visible": true,
								"border-width": 1,
								"font-size": 12
							},
							"plot-label": {
								"padding": 8,
								"border-radius": 3,
								"border-color": "#55c7eb",
								"background-color": "#fff",
								"color": "#333",
								"visible": true,
								text: historyAnalysisCtrl.chart[chartIdx].chartData['metrics'] + "<br>%v",
								"font-size": 12,
								"thousands-separator": ","
							}
						},
						"scale-y": {
							"thousands-separator": ",",
							maxValue: historyAnalysisCtrl.chartMaxValue,
							item: {
								"font-color": "#555",
							}, guide: {
								visible: false
							}
						},
						"scale-x": {
							zooming: false,
							placement: "default",
							item: {
								"font-color": "#555"
							},
							guide: {
								visible: false
							},
							tick: {
								lineWidth: "1px"
							},
							transform: {
								type: "date",
								text: transformDate()
							}
						},
						"plot": {
							"marker": {
								"visible": false
							}
						},
						plotarea: {
							marginBottom: '40',
							marginTop: '30px',
							marginRight: '50px',
							marginLeft: 'dynamic'
						},
						"series": [
							{
								"tooltip": {
									"visible": "false"
								},
								"values": historyAnalysisCtrl.chart[chartIdx].chartData['values'],
								"line-width": 1,
								"line-color": "#55c7eb",
								"background-color": "#c8f3ff",
								"alphaArea": "1"
							}
						]
					};

					chartOption.unitType = historyAnalysisCtrl.chart[chartIdx]['chartData'].unitType;

					chartOption.chartTitle = historyAnalysisCtrl.chart[chartIdx].label;
					if (chartOption.unitType != '' && chartOption.unitType != null) {
						chartOption.chartTitle = chartOption.chartTitle + " (" + chartOption.unitType + ")";
					}

					historyAnalysisCtrl.chartArr.push(chartOption);
					chartShowIdx++;
					chartIdx++;
				}
			}

			historyAnalysisCtrl.showThreshold = function (chart) {
				return function (item) {
					if (historyAnalysisCtrl.param.threshold != "") {
						if (chartTotal < 30)
							return true;


						if (item.threshold == "Y") {
							return true;
						} else {
							if (historyAnalysisCtrl.showThreshod == 'Y') {
								$('.btn-more').show();
							} else {
								return true;
							}
							return false;
						}
					} else {
						return true;
					}

					return true;
				};
			};

			function transformDate() {
				if (periodDay >= 1) {
					return "%Y-%mm-%dd<br>%H:%i"
				} else {
					return "%H:%i:%s"
				}

			}


			historyAnalysisCtrl.showNoThresholdChart = function () {
				$('.btn-more').hide();
				historyAnalysisCtrl.showThreshod = 'N';
				historyAnalysisCtrl.loadMoreRecords();
			};

			function initialize() {
				addEventListener();
				systemSeq = ConfigManager.getSystemSeq();
				getProcessData();
				getSystemList();

				$timeout(function () {
					var eMoment = moment(historyAnalysisCtrl.eDateTime);
					historyAnalysisCtrl.eDateTime = eMoment.subtract(2, 'minute').format('YYYY-MM-DD HH:mm');
					historyAnalysisCtrl.sDateTime = eMoment.subtract(3, 'hour').format('YYYY-MM-DD HH:mm');
				}, 500);


				let gridOption = [];
				gridOption.push({headerName: "Date", field: "date", width: 150, editable: false});
				gridOption.push({headerName: "Host", field: "host", width: 150, editable: false});
				gridOption.push({headerName: "Metric", field: "metric", width: 150, editable: false});
				gridOption.push({headerName: "Value", field: "value", width: 150, editable: false});
				historyAnalysisCtrl.chartGridOption = gridOption;
				historyAnalysisCtrl.chartGridData = [];

				$('#msg_area').text('You need to search.');
			}

			function showMySpinner() {
				if (!myBlockUI) {
					myBlockUI = $('.mu-content').block({
						message: null,
						overlayCSS: {
							opacity: 0
						}
					});
				}

				let opts = {
					lines: 12, // The number of lines to draw
					length: 19, // The length of each line
					width: 10, // The line thickness
					radius: 30, // The radius of the inner circle
					corners: 1, // Corner roundness (0..1)
					rotate: 0, // The rotation offset
					direction: 1, // 1: clockwise, -1: counterclockwise
					color: '#000', // #rgb or #rrggbb or array of colors
					speed: 1, // Rounds per second
					trail: 60, // Afterglow percentage
					shadow: false, // Whether to render a shadow
					hwaccel: true, // Whether to use hardware acceleration
					className: 'spinner', // The CSS class to assign to the spinner
					zIndex: 2e9, // The z-index (defaults to 2000000000)
					top: '50%', // Top position relative to parent
					left: '50%', // Left position relative to parent
					scale: 0.5
				};

				mySpinnerTarget = document.getElementById('indicator');
				mySpinner = new Spinner(opts).spin(mySpinnerTarget);

				mySpinner.spin(mySpinnerTarget);
			}

			function hideMySpinner() {
				angular.element('.mu-content').unblock();
				myBlockUI = null;
				// $('.spinner').remove();
				angular.element('#indicator').children().remove();
				if (mySpinner != null)
					mySpinner.stop(mySpinnerTarget);
			}

			function getSystemList() {
				let param = {};
				param.systemParentSeq = ConfigManager.getSystemSeq();
				DataService.httpPost("/activities/alarm/history/getSystemList", param, onGetSystemListResult, false);
			}

			initialize();
		}]);
});