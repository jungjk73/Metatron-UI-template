define(["app", "moment"], function (app, moment) {
	app.controller("SwitchMonitoringCtrl", ["$rootScope", "$scope", "$compile", "DataService", "ConfigManager", "$interval", "$timeout", "ngDialog", "CommonUtil",
		function ($rootScope, $scope, $compile, DataService, ConfigManager, $interval, $timeout, ngDialog, CommonUtil) {
			"use strict";

			// property
			let switchMonitoringCtrl = this;
			let unbind = [];

			let colorArr = CommonUtil.getChartColorArr();

			let REQUEST_ZOOMING_SEARCH = true;	// zoom 이벤트가 두번 날아가는거 방지.

			let INTERVAL_TIME = 60 * 1000;
			let __interval;

			let loadedFlag = false;
			switchMonitoringCtrl.processInterval = true;
			switchMonitoringCtrl.viewChart = true;
			switchMonitoringCtrl.selectedSwitch = '';

			let largeChartPop = null;


			switchMonitoringCtrl.searchOption = {};		// 검색 조건 저장 객체


			// 차트 단위 변경
			switchMonitoringCtrl.chartChange = function (type) {
				switchMonitoringCtrl.chartType = type;
				if (type == 'traffic') switchMonitoringCtrl.unit = 'GB';
				else if (type == 'error') switchMonitoringCtrl.unit = 'cnt';
				else if (type == 'discard') switchMonitoringCtrl.unit = 'cnt';
				else if (type == 'cpu') switchMonitoringCtrl.unit = '%';
				else if (type == 'memory') switchMonitoringCtrl.unit = '%';
				else if (type == 'temperature') switchMonitoringCtrl.unit = '°C';
				getChartData();
			};

			// 날짜 조건 변경
			switchMonitoringCtrl.changeDateHandler = function (event) {
				switchMonitoringCtrl.searchOption.startDate = event.sDateTime;
				switchMonitoringCtrl.searchOption.endDate = event.eDateTime;
				ap($scope);
			};

			// 검색 버튼 클릭
			switchMonitoringCtrl.clickSearchHandler = function () {
				switchMonitoringCtrl.searchOption.startDate = switchMonitoringCtrl.sDateTime;
				switchMonitoringCtrl.searchOption.endDate = switchMonitoringCtrl.eDateTime;

				console.log('검색조건 :: ', switchMonitoringCtrl.searchOption);
				getOverviewGridData();
				getChartData();
			};

			// Interval 중지 / 시작 클릭
			switchMonitoringCtrl.intervalHoldHandler = function () {
				switchMonitoringCtrl.processInterval = !switchMonitoringCtrl.processInterval;

				if (switchMonitoringCtrl.processInterval == true) {		// 재시작
					switchMonitoringCtrl.sDateTime = moment().subtract(6, 'hour').local().format("YYYY-MM-DD HH:mm");
					switchMonitoringCtrl.eDateTime = moment().format("YYYY-MM-DD HH:mm");
					switchMonitoringCtrl.clickSearchHandler();
					intervalSearch();
				} else {	// 중지
					$interval.cancel(__interval);
				}
			};

			// Grid Row 아이콘 클릭
			switchMonitoringCtrl.showGridHandler = function(event, data){
				switchMonitoringCtrl.viewChart = false;

				showSwitchOverview(data.sysName);
			};

			// Grid Row 더블 클릭
			switchMonitoringCtrl.showGridDblClickHandler = function(event){
				switchMonitoringCtrl.viewChart = false;

				showSwitchOverview(event.node.data.sysName);
			};

			// 상세 그리드 더블 클릭 - 차트 팝업
			switchMonitoringCtrl.showChartPopHandler = function(event){

				$scope.largeChartModel = {};

				$scope.largeChartModel.param = {};
				$scope.largeChartModel.param.systemId = event.data.systemId;
				$scope.largeChartModel.param.ifName = event.data.ifName;
				$scope.largeChartModel.param.sysName = event.data.sysName;
				$scope.largeChartModel.param.endDate = moment().format("YYYY-MM-DD HH:mm");
				$scope.largeChartModel.param.startDate = moment().subtract(6, 'hour').local().format("YYYY-MM-DD HH:mm");

				switchMonitoringCtrl.retrieveChartPopHandler();
			};


			// 차트 툴팁 처리
			// 차트에서 마우스 벗어나면 툴팁 없애고, 다시 차트로 올리면 툴팁 보이게
			$(document).on('mouseleave','.chart',function(){
				if (!switchMonitoringCtrl.chart || !switchMonitoringCtrl.chart.chartArr || switchMonitoringCtrl.chart.chartArr.length == 0) return;


				for (let i = 0 ; i < switchMonitoringCtrl.chart.chartArr.length ; i++){

					zingchart.exec('switchMonitoringChart_'+i, "modify", {
						data: {
							crosshairX : {
								alpha : 0,
								plotLabel : {
									visible : false
								},
								scaleLabel: {
									visible : false
								}
							}
						}
					});

					if (switchMonitoringCtrl.chart.chartArr[i].zoomEvent) {
						zingchart.exec('switchMonitoringChart_'+i, "zoomto", {
							xmin : switchMonitoringCtrl.chart.chartArr[i].zoomEvent.xmin,
							xmax : switchMonitoringCtrl.chart.chartArr[i].zoomEvent.xmax,
							kmin : switchMonitoringCtrl.chart.chartArr[i].zoomEvent.kmin,
							kmax : switchMonitoringCtrl.chart.chartArr[i].zoomEvent.kmax
						});
					}

				}

			});
			$(document).on('mouseenter','.chart',function(){

				if (!switchMonitoringCtrl.chart || !switchMonitoringCtrl.chart.chartArr || switchMonitoringCtrl.chart.chartArr.length == 0) return;
				for (let i = 0 ; i < switchMonitoringCtrl.chart.chartArr.length ; i++){

					zingchart.exec('switchMonitoringChart_'+i, "modify", {
						data: {
							crosshairX : {
								alpha : 1,
								plotLabel : {
									visible : true
								},
								scaleLabel: {
									visible : true
								}
							}
						}
					});

					if (switchMonitoringCtrl.chart.chartArr[i].zoomEvent) {
						zingchart.exec('switchMonitoringChart_'+i, "zoomto", {
							xmin : switchMonitoringCtrl.chart.chartArr[i].zoomEvent.xmin,
							xmax : switchMonitoringCtrl.chart.chartArr[i].zoomEvent.xmax,
							kmin : switchMonitoringCtrl.chart.chartArr[i].zoomEvent.kmin,
							kmax : switchMonitoringCtrl.chart.chartArr[i].zoomEvent.kmax
						});
					}
				}
			});


			// 차트 팝업에서 검색 버튼 클릭
			switchMonitoringCtrl.retrieveChartPopHandler = function(){
				DataService.httpPost("/activities/switch/monitoring/showChartPopHandler", $scope.largeChartModel.param, function (result) {
					if (result.result == 0 || !result.data) return;

					let _chartXLabels = result.data.chartTime;

					// String metricNameList[] = {"IF_IN_OCTETS","IF_OUT_OCTETS","IF_IN_DISCARDS","IF_OUT_DISCARDS","IF_IN_ERRORS","IF_OUT_ERRORS"};

					let _chartData_IF_IN_OCTETS = result.data.chart['IF_IN_OCTETS'];
					_chartData_IF_IN_OCTETS.value = [];
					for (let m = 0, n = _chartData_IF_IN_OCTETS.values.length; m < n; m++) {
						_chartData_IF_IN_OCTETS.value[m] = Number(_chartData_IF_IN_OCTETS.values[m][1]);
					}

					let _chartData_IF_OUT_OCTETS = result.data.chart['IF_OUT_OCTETS'];
					_chartData_IF_OUT_OCTETS.value = [];
					for (let m = 0, n = _chartData_IF_OUT_OCTETS.values.length; m < n; m++) {
						_chartData_IF_OUT_OCTETS.value[m] = Number(_chartData_IF_OUT_OCTETS.values[m][1]);
					}

					let _chartData_IF_IN_DISCARDS = result.data.chart['IF_IN_DISCARDS'];
					_chartData_IF_IN_DISCARDS.value = [];
					for (let m = 0, n = _chartData_IF_IN_DISCARDS.values.length; m < n; m++) {
						_chartData_IF_IN_DISCARDS.value[m] = Number(_chartData_IF_IN_DISCARDS.values[m][1]);
					}

					let _chartData_IF_OUT_DISCARDS = result.data.chart['IF_OUT_DISCARDS'];
					_chartData_IF_OUT_DISCARDS.value = [];
					for (let m = 0, n = _chartData_IF_OUT_DISCARDS.values.length; m < n; m++) {
						_chartData_IF_OUT_DISCARDS.value[m] = Number(_chartData_IF_OUT_DISCARDS.values[m][1]);
					}

					let _chartData_IF_IN_ERRORS = result.data.chart['IF_IN_ERRORS'];
					_chartData_IF_IN_ERRORS.value = [];
					for (let m = 0, n = _chartData_IF_IN_ERRORS.values.length; m < n; m++) {
						_chartData_IF_IN_ERRORS.value[m] = Number(_chartData_IF_IN_ERRORS.values[m][1]);
					}

					let _chartData_IF_OUT_ERRORS = result.data.chart['IF_OUT_ERRORS'];
					_chartData_IF_OUT_ERRORS.value = [];
					for (let m = 0, n = _chartData_IF_OUT_ERRORS.values.length; m < n; m++) {
						_chartData_IF_OUT_ERRORS.value[m] = Number(_chartData_IF_OUT_ERRORS.values[m][1]);
					}

					$scope.largeChartModel.chart0 = {};

					$scope.largeChartModel.chart0.config = {
						type: "line",
						gui: {
							contextMenu: {
								visible: false
							}
						},
						title: {
							fontSize: "15px"
						},
						backgroundColor: "transparent",
						crosshairX: {
							lineColor: "#ff3d00",
							lineStyle: "solid",
							lineWidth: 1,
							alpha: 0.5,
							scaleLabel: {
								borderColor: "#55bc75",
								backgroundColor: "#c8f3ff",
								color: "#333",
								padding: '0 5px 0 5px',
								borderWidth: 1,
								transform: { 		// 날짜 형식 설정
									type: "date",
									text: "%Y-%mm-%dd<br>%H:%i:%s"
								},
								fontSize: 12
							},
							plotLabel: {
								padding: 8,
								borderRadius: 3,
								borderColor: "#55bc75",
								backgroundColor: "#fff",
								multiple: true,
								fontSize: 12,
								thousandsSeparator: ","
							}
						},
						scaleY: {
							thousandsSeparator: ",",
							guide: {visible: false}
						},
						scaleX: {
							labels: _chartXLabels
							, transform: { 		// 날짜 형식 설정
								type: "date",
								text: "%Y-%mm-%dd<br>%H:%i:%s"
							}
						},
						plot: {
							marker: {
								visible: false
							}
						},
						plotarea: {
							marginBottom: '40',
							marginTop: '30px',
							marginRight: '50px',
							marginLeft: 'dynamic'
						},
						tooltip : {visible : false}

					};


					$scope.largeChartModel.chart1 = {};

					$scope.largeChartModel.chart1.config = angular.copy($scope.largeChartModel.chart0.config);

					$scope.largeChartModel.chart0.config.series = [
						{
							lineColor: CommonUtil.getChartColorArr()[0],
							lineWidth : 1,
							text: "IF_IN_OCTETS",
							guideLabel: {
								text: '%t: %v',
								backgroundColor: '#fff',
								borderColor: CommonUtil.getChartColorArr()[0],
								fontColor: CommonUtil.getChartColorArr()[0]
							},
							values : _chartData_IF_IN_OCTETS.value

						},
						{
							lineColor: CommonUtil.getChartColorArr()[2],
							lineWidth : 1,
							text: "IF_OUT_OCTETS",
							guideLabel: {
								text: '%t: %v',
								backgroundColor: '#fff',
								borderColor: CommonUtil.getChartColorArr()[2],
								fontColor: CommonUtil.getChartColorArr()[2]
							},
							values : _chartData_IF_OUT_OCTETS.value

						}

					];
					$scope.largeChartModel.chart1.config.series = [
						{
							lineColor: CommonUtil.getChartColorArr()[0],
							lineWidth : 1,
							text: "IF_IN_DISCARDS",
							guideLabel: {
								text: '%t: %v',
								backgroundColor: '#fff',
								borderColor: CommonUtil.getChartColorArr()[0],
								fontColor: CommonUtil.getChartColorArr()[0]
							},
							values : _chartData_IF_IN_DISCARDS.value
						},
						{
							lineColor: CommonUtil.getChartColorArr()[4],
							lineWidth : 1,
							text: "IF_OUT_DISCARDS",
							guideLabel: {
								text: '%t: %v',
								backgroundColor: '#fff',
								borderColor: CommonUtil.getChartColorArr()[4],
								fontColor: CommonUtil.getChartColorArr()[4]
							},
							values : _chartData_IF_OUT_DISCARDS.value
						},
						{
							lineColor: CommonUtil.getChartColorArr()[2],
							lineWidth : 1,
							text: "IF_IN_ERRORS",
							guideLabel: {
								text: '%t: %v',
								backgroundColor: '#fff',
								borderColor: CommonUtil.getChartColorArr()[2],
								fontColor: CommonUtil.getChartColorArr()[2]
							},
							values : _chartData_IF_IN_ERRORS.value
						},
						{
							lineColor: CommonUtil.getChartColorArr()[1],
							lineWidth : 1,
							text: "IF_OUT_ERRORS",
							guideLabel: {
								text: '%t: %v',
								backgroundColor: '#fff',
								borderColor: CommonUtil.getChartColorArr()[1],
								fontColor: CommonUtil.getChartColorArr()[1]
							},
							values : _chartData_IF_OUT_ERRORS.value
						}

					];


					$scope.largeChartModel.title = _chartData_IF_IN_OCTETS.systemId + ' - '+_chartData_IF_IN_OCTETS.ifName;
					$scope.largeChartModel.button = false;

					if (!largeChartPop) {
						largeChartPop = ngDialog.open({
							template: "/common/chart_large_dbl_template.html",
							className: "ngdialog-theme-default custom-width",
							showClose: false,
							disableAnimation: true,
							cache: false,
							closeByDocument: false,
							closeByEscape: false,
							draggable: false,
							scope: $scope
						});

						let timer = $timeout(function () {
							$compile($('#chartListArea'))($scope);
							$timeout.cancel(timer);
							$scope.largeChartModel.loadCompleted = true;

							$scope.largeChartModel.startDate = moment().subtract(6, 'hour').local().format("YYYY-MM-DD HH:mm");
						}, 500);

						$scope.largeChartModel.chartZoomOut = function(_id){
							zingchart.exec(_id, 'viewall');
						};
					}

				});
			};

			$scope.changeLargeChartDateHandler = function(event){
				if ($scope.largeChartModel && $scope.largeChartModel.loadCompleted) {
					$scope.largeChartModel.startDate = event.sDateTime;
					$scope.largeChartModel.param.startDate = event.sDateTime;
					$scope.largeChartModel.endDate = event.eDateTime;
					$scope.largeChartModel.param.endDate = event.eDateTime;
				}
			};

			$scope.closeLargeChartDialog = function () {
				$scope.largeChartModel = null;
				largeChartPop = null;
				ngDialog.closeAll();
			};

			function showSwitchOverview(sysName){
				switchMonitoringCtrl.selectedSwitch = sysName;

				switchMonitoringCtrl.switchGrid = {};

				DataService.httpPost("/activities/switch/monitoring/getGridDataBySwitch", {sysName : sysName}, function (result) {
					switchMonitoringCtrl.switchGrid = result.data;
				});
			}

			// Zoom Out - All 버튼 클릭
			switchMonitoringCtrl.chartZoomOut = function(id){
				zingchart.exec('switchMonitoringChart_'+id, 'viewall');
			};

			// Zoom In
			switchMonitoringCtrl.zoomingChart = function(id, event){

				if (switchMonitoringCtrl.chart.chartArr && switchMonitoringCtrl.chart.chartArr.length > 0) {
					switchMonitoringCtrl.chart.chartArr[id].zoomEvent = event;
				}

			};


			// event-handler

			function addEventListener() {
				unbind = [
					$scope.$on('$destroy', destroy),
					$scope.$on(ConfigManager.getEvent("CHANGE_SYSTEM_SEQ_EVENT"), onChangeSystemGroupIdEventHandler),
					$scope.$on(ConfigManager.getEvent("GRID_CELL_CLICK_EVENT"), switchMonitoringCtrl.showGridHandler)

				];
			}

			function destroy() {

				$interval.cancel(__interval);

				unbind.forEach(function (fn) {
					fn();
				});

				switchMonitoringCtrl.chart.chartArr = [];
				$interval.cancel(__interval);
				__interval = null;


			}

			function onChangeSystemGroupIdEventHandler(event, data){
				if (!loadedFlag) return;

				initData();
				switchMonitoringCtrl.clickSearchHandler();
				intervalSearch();
			}


			function getOverviewGridData() {
				DataService.httpPost("/activities/switch/monitoring/getMonitoringList", switchMonitoringCtrl.searchOption, function (result) {
					console.log('-- overview grid data ', result);
					if (result.result != 1) {
						switchMonitoringCtrl.monitoringOverviewGrid = [];
						return;
					}

					let gridData = result.data;

					if (gridData != null && gridData.length > 0) {
						let keys = Object.keys(gridData[0]);
						for (let k = 0 ; k < gridData.length ; k++) {
							// isNaN(list[k].BYTES_IN) == false : 숫자
							for (let i = 0 ; i < keys.length ; i++){
								if (isNaN(gridData[k][keys[i]]) == false) {
									gridData[k][keys[i]] = Number(gridData[k][keys[i]]);
								}
							}
						}
					}

					switchMonitoringCtrl.monitoringOverviewGrid = gridData;
				});
			}



			function getChartData() {

				let scaleX = [];
				let seriesArr = [];
				let label = '';

				DataService.httpPost("/activities/switch/monitoring/getChartData/" + switchMonitoringCtrl.chartType, switchMonitoringCtrl.searchOption, function (result) {

					if (result.data && result.data.length > 0 && result.data[0].seriesList) {

					}

					switchMonitoringCtrl.chart = {};
					switchMonitoringCtrl.chart.chartArr = [];

					for (let i = 0; i < result.data.length; i++) {

						let chartData = result.data[i];
						if (chartData) {
							seriesArr = chartData.seriesList;
							for (let i = 0 ; i < seriesArr.length ; i++) {
								seriesArr[i].lineColor = colorArr[i];
								seriesArr[i].lineWidth = '1';
								seriesArr[i].marker = {};
								seriesArr[i].marker.backgroundColor = colorArr[i];
								seriesArr[i].marker.size = '3';
								seriesArr[i].guideLabel = {borderColor : colorArr[i]};
							}
							scaleX = chartData.scaleX;
							for (let i = 0; i < scaleX.length; i++) {
								scaleX[i] = moment(scaleX[i]).format('x');
							}
							label = chartData.sysName;
						}

						let chartObj = {
							type: 'line',
							backgroundColor: 'transparent',
							theme: 'dark',
							title : {
								text:label,
								y : '-10',
								fontSize : '15',
								fontColor: "#fff"
							},
							// noData: noData,
							plotarea: {marginTop: "15", marginRight: "30", marginBottom: "38", marginLeft: "dynamic"},
							crosshairX: {
								lineWidth: 1,
								scaleLabel: {
									backgroundColor: "#fff",
									color: "#383737",
									borderColor: "#C0C0C0",
									borderWidth: "1px"
								},

								plotLabel: {
									text:'%t: %v '+switchMonitoringCtrl.unit,
									visible: true,
									multiple: true,
									backgroundColor: "#fff",
									borderRadius: 1,
									padding: 5,
									fontSize: 11,
									fontColor : '#383737'
								}
							},
							tooltip: {visible: false},
							scaleX: {
								zooming: true,
								transform: {
									type: "date",
									all: "%Y-%mm-%dd<br>%H:%i:%s"
								},
								labels: scaleX
							},
							scaleY: {
								thousandsSeparator: ",",
								item: {fontColor: "#fff"},
								guide: {
									visible: true, "line-width": "1px",
									lineColor: "#CCCCCC", alpha: "0.2", "line-style": "dashed"
								}
							},
							series: seriesArr
						};

						switchMonitoringCtrl.chart.chartArr.push(chartObj);
					}


				}, false);
			}

			function initData() {
				switchMonitoringCtrl.chartType = 'traffic';
				switchMonitoringCtrl.unit = 'GB';
				switchMonitoringCtrl.monitoringOverviewGrid = {};
				switchMonitoringCtrl.switchGrid = {};
				switchMonitoringCtrl.chart = {};
				switchMonitoringCtrl.chart.chartArr = [];
				switchMonitoringCtrl.searchOption = {};
			}

			function intervalSearch() {
				$interval.cancel(__interval);

				__interval = $interval(function () {
					// switchMonitoringCtrl.sDateTime = moment(switchMonitoringCtrl.sDateTime).add( INTERVAL_TIME/1000 , 'seconds').format("YYYY-MM-DD HH:mm");
					// switchMonitoringCtrl.eDateTime = moment(switchMonitoringCtrl.eDateTime).add( INTERVAL_TIME/1000 , 'seconds').format("YYYY-MM-DD HH:mm");
					switchMonitoringCtrl.sDateTime = moment().subtract(6, 'hour').local().format("YYYY-MM-DD HH:mm");
					switchMonitoringCtrl.eDateTime = moment().format("YYYY-MM-DD HH:mm");
					switchMonitoringCtrl.clickSearchHandler();
				}, INTERVAL_TIME);

			}


			function initialize() {

				addEventListener();

				initData();

				$timeout(function () {
					switchMonitoringCtrl.sDateTime = moment().subtract(6, 'hour').local().format("YYYY-MM-DD HH:mm");
					switchMonitoringCtrl.eDateTime = moment().format("YYYY-MM-DD HH:mm");
				}, 500);

				$timeout(function () {
					switchMonitoringCtrl.clickSearchHandler();
					loadedFlag = true;
				}, 1000);

				intervalSearch();

			}


			initialize();

		}]);

});