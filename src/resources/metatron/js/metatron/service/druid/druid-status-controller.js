define(["app", "moment"], function (app, moment) {
	app.controller("DruidStatusCtrl", ["$rootScope", "$scope", "DataService", "ConfigManager", "GridRenderer", "ngDialog", "CommonUtil",
		function ($rootScope, $scope, DataService, ConfigManager, GridRenderer, ngDialog, CommonUtil) {
			"use strict";

			// property
			var druidStatusCtrl = this;
			var systemSeq = "";
			var INTERVAL_TIME = 1000 * 60;
			var TIMER;
			var unbind = [];

			druidStatusCtrl.chart = {};
			druidStatusCtrl.grid = {};
			druidStatusCtrl.grid.selectedIndex = 0;


			// method
			druidStatusCtrl.chartZoomOut = function (id) {
				zingchart.exec(id, 'viewall');
			};

			druidStatusCtrl.onGridClickHandler = function (value) {
				if(value == null || value.length < 1)
					return;

				druidStatusCtrl.grid.selectedIndex = value[0].childIndex;

				var p = getParam();
				p.datasource = value[0].data.datasource;
				DataService.httpPost("/service/druid/status/getDataSource", p, function (result) {
					setLineChartSeries(result.data);
				});
			}


			// event-handler
			function destory() {
				unbind.forEach(function (fn) {
					fn();
					ngDialog.closeAll();
					clear();
				});
			}

			function onChangeSystemGroupIdEventHandler(event, data) {
				if (data == null)
					return;

				systemSeq = ConfigManager.getSystemSeq();
				getData();
			}


			// function
			function getDruidStatusResult(result) {
				console.info("druid status data; ", result);
				var data = result.data;
				if (data == null)
					return;

				// dataSource
				druidStatusCtrl.grid = data.dataByDatasource;
				druidStatusCtrl.chart.datasource = {};
				druidStatusCtrl.chart.datasource.option = getLineChartOption();
				setLineChartSeries(data.data);
			}

			function getDruidStatusChartResult(result) {
				console.info("druid status chart data; ", result);
				var data = result.data;
				if (data == null)
					return;

				// chart
				setScatterChartSeries("lqcount", data.loadQueueCount);
				setScatterChartSeries("lqsize", data.loadQueueSize);
				setScatterChartSeries("lqfail", data.loadQueueFail);
				setScatterChartSeries("dqcount", data.dropQueueCount);
				setScatterChartSeries("brokerMem", data.brokerMemory);
				setScatterChartSeries("hisMem", data.historialMemory);
			}

			function getLineChartOption() {
				var current = moment();
				//var standard = moment(current).add(current.minute()%5, "minutes");
				var standard = moment(current).add((5-current.minute()%5), "minutes");
				var min = moment(standard).subtract(3, 'hours').unix()*1000;
				var max = moment(standard).unix()*1000;
				return {
					backgroundColor: "transparent",
					"scale-x":{
						"min-value":min,
						"max-value":max,
						"step":"1800000",			// 30분
						"transform":{
							"type":"date",
							"all":"%h:%i"
						},
						"max-items":12,
						"item":{
							"font-size":11,
							"color":"#fff"
						}
					},
					"scale-y":{
						"format":"%v",
						"guide":{
							"visible": false
						},
						"item":{
							"font-size":11,
							"color":"#fff"
						}
					},
					"scale-y-2":{
						"format":"%vG",
						"guide":{
							"visible": false
						},
						"item":{
							"font-size":11,
							"color":"#fff"
						}
					},
					"crosshair-x":{
						"plot-label":{
							"multiple":true
						}
					},
					"plot":{
						"tooltip":{
							"visible":false
						},
						"marker": {
							"visible": false
						}
					},
					"plotarea": {
						marginTop:"dynamic",
						marginLeft:"dynamic",
						marginRight:"dynamic",
						marginBottom:"25",
					}
				}
			}

			function setLineChartSeries(data) {

				// 초기화
				if(data == null || data.length < 1)
					return;

				var counts = [];
				var sizes = [];
				var len = data.length;
				for(var i=0; i<len; i++) {
					var t = moment(data[i].insert_time, "YYYY-MM-DD HH:mm:ss").unix();
					counts.push([t*1000, [Number(data[i].count)]]);
					sizes.push([t*1000, [Number(CommonUtil.formatBytes(data[i].size*1024*1024, 2, null, false))]]);
				}

				var s = [
					{
						"scales": "scale-x,scale-y",
						"line-color": "#00c853",
						"text":"Count",
						"values": counts
					},
					{
						"scales": "scale-x,scale-y-2",
						"line-color": "#ffea00",
						"text":"Size",
						"values": sizes
					}
				];

				druidStatusCtrl.chart.datasource.y = s;
			}

			function setScatterChartSeries(key, data) {
				if (key == null || data == null)
					return;

				// series
				zingchart.exec(key, 'modify', {
					data: {"scale-x": {labels: data.x}}
				});

				var s = {
					"values": data.y,
					"data-system": data.x,
				};
				druidStatusCtrl.chart[key].series = [s];
			}

			function getParam() {
				var p = {};
				p.systemSeq = systemSeq;
				p.partition = "P" + moment().format('YYYYMMDD');
				p.selectedIndex = druidStatusCtrl.grid.selectedIndex;

				return p;
			}

			function getData() {
				var colors = ["#ffc000", "#ff6600", "#00c853", "#29c5ff", "#2979ff", "#5d9cec"];

				// Chart option setting
				getScatterChartOption("lqcount", "Load Queue Count", colors[0]);
				getScatterChartOption("lqsize", "Load Queue Size", colors[1]);
				getScatterChartOption("lqfail", "Load Queue Fail", colors[2]);
				getScatterChartOption("dqcount", "Drop Queue Count", colors[3]);
				getScatterChartOption("brokerMem", "Broker Memory", colors[4]);
				getScatterChartOption("hisMem", "Historial Memory", colors[5]);

				// 좌측 data 조회
				var param = getParam();
				DataService.httpPost("/service/druid/status/getStatusData", param, getDruidStatusResult, false);

				// Chart data 조회
				var param = getParam();
				DataService.httpPost("/service/druid/status/getStatusChartData", param, getDruidStatusChartResult, false);
			}

			function getScatterChartOption(key, title, color) {
				if (druidStatusCtrl.chart[key] == null) {
					druidStatusCtrl.chart[key] = {};
				}

				var option = {
					type : 'scatter',
					backgroundColor: "transparent",
					"title": {
						"text": title,
						"font-size": 15,
						"font-color": "#fff",
						"padding-top": 0
					},
					"scale-x": {
						"item": {
							"font-color": "#fff"
						},
						"min-items": 0,
					},
					"scale-y": {
						"item": {
							"font-color": "#fff"
						},
						"min-value": 0
					},
					"plotarea": {
						marginTop: "dynamic",
						marginRight: "dynamic",
						marginBottom: "25",
						"left": "-22px",
						"margin-left": "-22px",
						"padding-left": "-22px"
					},
					"plot": {
						mode: "fast",
						exact: true,
						smartSampling: true,
						marker: {
							type: "circle",
							borderWidth: 0,
							size: 3,
							shadow: false,
							backgroundColor: color
						},
						tooltip: {
							padding: "10 10 10 10",
							borderWidth: 1,
							backgroundColor: "#fff",
							fontColor: "#333",
							textAlign: "left",
							borderColor: "%background-color",
							thousandsSeparator: ",",
							text: "System Name : %data-system \n " + title + " : %vv"
						}
					},
					"series": []
				}

				druidStatusCtrl.chart[key].option = option;
			}

			function addEventListener() {
				unbind = [
					$scope.$on(ConfigManager.getEvent("CHANGE_SYSTEM_SEQ_EVENT"), onChangeSystemGroupIdEventHandler),
					$scope.$on('$destroy', destory)
				];
			}

			function createTimer() {
				TIMER = setInterval(getData, INTERVAL_TIME);
			}

			function initialize() {
				systemSeq = ConfigManager.getSystemSeq();
				addEventListener();
				getData();
				createTimer();
			}

			function clear() {
				delete druidStatusCtrl.chart;
				delete druidStatusCtrl.grid;

				clearInterval(TIMER);

				systemSeq = null;
				INTERVAL_TIME = null;
				TIMER = null;
				unbind = null;
			}

			initialize();
		}]);
});