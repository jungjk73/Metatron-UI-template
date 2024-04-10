define([ "app", "moment" ], function(app, moment) {
	app.controller("PrestoStatusCtrl", ["$rootScope", "$scope", "$interval", "$timeout", "DataService", "ConfigManager", "GridRenderer", "ngDialog",
		function($rootScope, $scope, $interval, $timeout, DataService, ConfigManager, GridRenderer, ngDialog) {
			"use strict";

			// property

			var prestoStatusCtrl = this;
			var systemSeq = "";
			var systemName = "";

			prestoStatusCtrl.data = {};
			prestoStatusCtrl.chart = {};


			const INTERVAL_TIME = 1000 * 60;
			var __interval;
			var unbind = [];
			var loader = false;

			var colorArr = ['#ff3d00','#00c853','#29c5ff','#d500f9','#e76049','#ffea00','#ffc000','#ff6600','#2979ff','#5d9cec','#888','#575757'];

			// Zoom
			prestoStatusCtrl.chartZoomOut = function(id){
				zingchart.exec(id, 'viewall');
			};


			function getPartition() {
				let partition = "";
				let partition_arr = [];
				let preDate = moment(new Date());
				preDate = moment(preDate).add(-1, 'days');
				partition_arr.push("P" + moment(preDate).format('YYYYMMDD'));
				partition_arr.push("P" + moment().format('YYYYMMDD'));

				partition = partition_arr.join(",");

				return partition;
			}

			function destroy() {
				unbind.forEach(function(fn) {
					$interval.cancel(__interval);
					fn();
				});
			}

			function addEventListener() {
				unbind = [
					$scope.$on(ConfigManager.getEvent("CHANGE_SYSTEM_SEQ_EVENT"), onChangeSystemGroupIdEventHandler),
					$scope.$on('$destroy', destroy)
				];
			}

			/**
			 * Cluster 선택 이벤트 핸들러
			 */
			function onChangeSystemGroupIdEventHandler(event, data) {
				if (data == null)
					return;

				loader = true;

				prestoStatusCtrl.data = {};
				prestoStatusCtrl.chart = {};
				prestoStatusCtrl.GridData = [];

				getData();

			}


			/**
			 * 상단 박스 데이터
			 */
			function getUpperStatusData(){
				let param = {};
				param.systemSeq = ConfigManager.getSystemSeq();
				DataService.httpPost('/service/presto/getUpperStatusData', param, function (result) {
					console.log('화면 상단 데이터 : ',result.data);
					if (!result.data) return;

					prestoStatusCtrl.data.alive = result.data.alive;
					prestoStatusCtrl.data.dead = result.data.dead;
					prestoStatusCtrl.data.reservedmemory = result.data.reservedmemory;
					prestoStatusCtrl.data.runningqueries = result.data.runningqueries;
					prestoStatusCtrl.data.blockedqueries = result.data.blockedqueries;
					prestoStatusCtrl.data.runningdrivers = result.data.runningdrivers;
					prestoStatusCtrl.data.uptime = moment(result.data.uptime).format('YYYY-MM-DD hh:mm');
				});
			}


			function getChartData(){
				let param = {};
				param.systemSeq = ConfigManager.getSystemSeq();
				param.partition = getPartition();
				DataService.httpPost('/service/presto/getChartData', param, function (result) {
					console.log('차트 데이터 : ',result.data);
					if (!result.data) return;

					let scaleX = result.data.chartTimeList;
					for (let i = 0 ; i < scaleX.length ; i++) {
						scaleX[i] = moment(scaleX[i]).format('x');
					}

					let seriesObj = {
						lineColor : colorArr[1],
						lineWidth : '1',
						marker : {backgroundColor : colorArr[1], size : 3},
						guideLabel : {borderColor : colorArr[1]}
					};
					let seriesObj_byteInput = angular.copy(seriesObj);
					seriesObj_byteInput.values = result.data.byteInputRateChartValueList;
					prestoStatusCtrl.chart.byteInputRate = createChartOption('Byte Input Rate', ' MB/sec', scaleX, [seriesObj_byteInput]);

					let seriesObj_rowInput = angular.copy(seriesObj);
					seriesObj_rowInput.values = result.data.rowInputRateChartValueList;
					prestoStatusCtrl.chart.rowInputRate = createChartOption('Row Input Rate', ' M/sec', scaleX, [seriesObj_rowInput]);

					let seriesObj_cpuTime = angular.copy(seriesObj);
					seriesObj_cpuTime.values = result.data.cpuTimeRateChartValueList;
					prestoStatusCtrl.chart.cpuTimeRate = createChartOption('CPU Time Rate', ' K/sec', scaleX, [seriesObj_cpuTime]);

					//$('.zc-img').css('position', 'fixed');

				});
			}


			function createChartOption (title, unit, scaleX, series) {
				let chartOption  = {
					type: 'line',
					theme : 'dark',
					backgroundColor : "transparent",
					tooltip: {visible: false},
					title : {
						text: title,
						y : '-9',
						fontSize: 15,
						fontColor: "#fff"
					},
					plotarea: {marginTop: "dynamic", marginRight: "30", marginBottom: "35", marginLeft: "50"},
					scaleX : {
						zooming: true,
						transform: {
							type: "date",
							text: "%Y-%mm-%dd<br> %H:%i:%s"
						},
						item: {
							"font-color": "#fff"
						},
						labels: scaleX
					},
					scaleY: {
						thousandsSeparator: ",",
						decimals : 0,
						step:1,
						item: {"font-color": "#fff"},
						guide: {
							visible: true, "line-width": "1px",
							"line-color": "#CCCCCC", alpha: "0.2", "line-style": "dashed"
						}
					},
					crosshairX: {
						lineWidth: 1,
						scaleLabel: {
							backgroundColor: "#fff",
							color: "#383737",
							borderColor: "#C0C0C0",
							borderWidth: "1px"
						},
						plotLabel: {
							text:'%v '+unit,
							visible: true,
							multiple: true,
							backgroundColor: "#fff",
							borderRadius: 1,
							padding: 5,
							fontSize: 11,
							fontColor : '#383737'
						}

					},
					series : series
				};

				return chartOption;

			}

			function getPrestoServerStatusGrid(){
				// prestoStatusCtrl.GridData = [];
				let param = {};
				param.systemSeq = ConfigManager.getSystemSeq();
				param.partition = getPartition();
				DataService.httpPost('/service/presto/getPrestoServerStatusGrid', param, function (result) {
					console.log('그리드 ',result.data);
					let list = angular.copy(result.data.prestoServerStatus);
					if (list != null && list.length > 0) {
						let keys = Object.keys(list[0]);
						for (let k = 0 ; k < list.length ; k++) {
							// isNaN(list[k].BYTES_IN) == false : 숫자
							for (let i = 0 ; i < keys.length ; i++){
								if (isNaN(list[k][keys[i]]) == false) {
									list[k][keys[i]] = Number(list[k][keys[i]]);
								}
							}
						}
					}	

					prestoStatusCtrl.GridData = list;
					
				});
			}


			function initialize(){
				systemSeq = ConfigManager.getSystemSeq();

				prestoStatusCtrl.GridData = [];

				addEventListener();

				getData();
			}

			function getData(){
				$interval.cancel(__interval);

				getUpperStatusData();
				getChartData();
				getPrestoServerStatusGrid();

				__interval = $interval(function () {
					getUpperStatusData();
					getChartData();
					getPrestoServerStatusGrid();
				}, INTERVAL_TIME);
			}

			initialize();



		}]);
});