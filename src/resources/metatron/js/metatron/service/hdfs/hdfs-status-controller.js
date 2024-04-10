define(["app", "moment"], function (app, moment) {
	app.controller("StatusHdfsCtrl", ["$rootScope", "$scope", "$timeout", "$controller", "DataService", "ConfigManager", "GridRenderer", "ngDialog", "CommonUtil",
		function ($rootScope, $scope, $timeout, $controller, DataService, ConfigManager, GridRenderer, ngDialog, CommonUtil) {
		"use strict";

			// property
			var statusHdfsCtrl = this;
			var systemSeq = "";
			var loader = true;
			var INTERVAL_TIME = 60 * 1000;			// 1분
			var TIMER;
			var unbind = [];
			var param = {};
			var system_name = [];
			var colors = ["#ffc000", "#ff6600", "#00c853", "#29c5ff", "#2979ff", "#FF3D00"];
			var center = { "text-align": "center" };
			$scope.sort_type = 'system_name';		// MASTER NODE grid sort filter
			$scope.master_sort_reverse = true;		// MASTER NODE grid sort filter
			statusHdfsCtrl.pop = {};
			statusHdfsCtrl.columns = {
				"live": [
					{ "headerName": "Insert Time", "field": "insertTime", "cellStyle": center, "width": 140, "minWidth": 140 },
					{ "headerName": "System Name", "field": "systemName", "cellStyle": center, "width": 185, "minWidth": 185, "cellRenderer": GridRenderer.tooltipRenderer },
					{ "headerName": "Info Addr", "field": "infoAddr", "cellStyle": center, "width": 150, "minWidth": 150 },
					{ "headerName": "Info Secure Addr", "field": "infoSecureAddr", "cellStyle": center, "width": 150, "minWidth": 150 },
					{ "headerName": "Xfer Addr", "field": "xferAddr", "cellStyle": center, "width": 150, "minWidth": 150 },
					{ "headerName": "Last Contact", "field": "lastContact", "cellStyle": center, "width": 120, "minWidth": 120, "cellRenderer": GridRenderer.numberFormatter },
					{ "headerName": "Used Space", "field": "usedSpace", "cellStyle": center, "width": 150, "minWidth": 150, "cellRenderer": GridRenderer.numberFormatter },
					{ "headerName": "Admin State", "field": "adminState", "cellStyle": center, "width": 100, "minWidth": 100 },
					{ "headerName": "Non Dfs Used Space", "field": "nonDfsUsedSpace", "cellStyle": center, "width": 150, "minWidth": 150, "cellRenderer": GridRenderer.numberFormatter },
					{ "headerName": "Capacity", "field": "capacity", "cellStyle": center, "width": 150, "minWidth": 150, "cellRenderer": GridRenderer.numberFormatter },
					{ "headerName": "Num Blocks", "field": "numBlocks", "cellStyle": center, "width": 100, "minWidth": 100, "cellRenderer": GridRenderer.numberFormatter },
					{ "headerName": "Version", "field": "version", "cellStyle": center, "width": 100, "minWidth": 100 },
					{ "headerName": "Used", "field": "used", "cellStyle": center, "width": 150, "minWidth": 150, "cellRenderer": GridRenderer.numberFormatter },
					{ "headerName": "Remaining", "field": "remaining", "cellStyle": center, "width": 150, "minWidth": 150, "cellRenderer": GridRenderer.numberFormatter },
					{ "headerName": "Blocks Scheduled", "field": "blocksScheduled", "cellStyle": center, "width": 150, "minWidth": 150, "cellRenderer": GridRenderer.numberFormatter },
					{ "headerName": "Block Pool Used", "field": "blockPoolUsed", "cellStyle": center, "width": 150, "minWidth": 150, "cellRenderer": GridRenderer.numberFormatter },
					{ "headerName": "Block Pool Used Percent", "field": "blockPoolUsedPercent", "cellStyle": center, "width": 190, "minWidth": 190, "cellRenderer": GridRenderer.numberFormatter },
					{ "headerName": "Vol Fails", "field": "volFails", "cellStyle": center, "width": 100, "minWidth": 100, "cellRenderer": GridRenderer.numberFormatter }
				],
				"dead": [
					{ "headerName": "Insert Time", "field": "insertTime", "cellStyle": center, "width": 130, "minWidth": 130 },
					{ "headerName": "System Name", "field": "systemName", "cellStyle": center, "width": 185, "minWidth": 185 },
					{ "headerName": "Last Contact", "field": "lastContact", "cellStyle": center, "width": 120,"minWidth": 120, "cellRenderer": GridRenderer.numberFormatter },
					{ "headerName": "Decommissined", "field": "decommissined", "cellStyle": center, "cellRenderer": GridRenderer.numberFormatter }
				]
			};

			statusHdfsCtrl.units = {
				"hdfsChart_1": "%",
				"hdfsChart_2": "%",
				"hdfsChart_3": "GB",
				"hdfsChart_4": "Cnt",
				"hdfsChart_5": "Cnt",
				"hdfsChart_6": "Cnt"
			};

			statusHdfsCtrl.rawdataColumns = {
				"hdfsChart_1": ['system_name', 'non_HDFS_used'],
				"hdfsChart_2": ['system_name', 'HDFS_used'],
				"hdfsChart_3": ['system_name', 'used_heap_memory'],
				"hdfsChart_4": ['system_name', 'xceiver_count'],
				"hdfsChart_5": ['system_name', 'gc_count'],
				// "hdfsChart_5": ['system_name', 'gc_time_millis'],
				"hdfsChart_6": ['system_name', 'log_error']
			};

			statusHdfsCtrl.processGridData = [];
			statusHdfsCtrl.last = {};


			// event-handler
			function destroy() {
				unbind.forEach(function (fn) {
					fn();
				});
				clearInterval(TIMER);
				ngDialog.closeAll();
				statusHdfsCtrl = null;
				TIMER = null;
				INTERVAL_TIME = null;

				angular.element('.stats-display').html('');
			}

			function onChangeSystemGroupIdEventHandler(event, data) {
				if (data == null)
					return;

				loader = true;
				systemSeq = ConfigManager.getSystemSeq();

				statusHdfsCtrl.hdfsChart_1 = [];
				statusHdfsCtrl.hdfsChart_2 = [];
				statusHdfsCtrl.hdfsChart_3 = [];
				statusHdfsCtrl.hdfsChart_4 = [];
				statusHdfsCtrl.hdfsChart_5 = [];
				statusHdfsCtrl.hdfsChart_6 = [];


				getData();
				createTimer();

				setChartOption();

			}

			function onGetDataNodeInfoResultHandler(data) {
				if (data == null || data.data == null)
					return;

				statusHdfsCtrl.pop.gridData = data.data;
				let popup = ngDialog.open({
					template: "/services/hdfs/popup/hdfs_status_livenode.html",
					className: "ngdialog-theme-default custom-width",
					showClose: false,
					disableAnimation: true,
					cache: false,
					closeByDocument: false,
					closeByEscape: false,
					scope: $scope
				});

				let closer = $rootScope.$on('ngDialog.refresh', function (e, id) {
					if (id != popup.id) return;
					closer();
				});
			}

			function onGetHdfsStatusTopResult(data) {
				getGridDataResult(data.data.grid);
				getStatusTopData(data.data.top);

				DataService.httpPost("/service/hdfs/getHdfsStatusData", param, onGetStatusDataResult, loader);
				ap($scope);
			}

			function onGetStatusDataResult(data) {
				if (data == null || data.data == null)
					return;

				let d = data.data.chart;
				getChartDataResult(d);
				loader = false;
			}

			function onGetZookeeperDetailResult(data) {
				statusHdfsCtrl.zookeeperGridData = data.data.grid;
				let popup = ngDialog.open({
					template: "/services/hdfs/popup/hdfs_status_zookeeper.html",
					className: "ngdialog-theme-default custom-width",
					showClose: false,
					disableAnimation: true,
					cache: false,
					closeByDocument: false,
					closeByEscape: false,
					scope: $scope
				});

				let closer = $rootScope.$on('ngDialog.refresh', function (e, id) {
					if (id != popup.id) return;
					closer();
				});
			}

			$scope.sortBy = function(sort_type, grid_type){
				$scope.sort_type = sort_type;
				if (grid_type == 'master')
					$scope.master_sort_reverse = !$scope.master_sort_reverse;
				else
					$scope.volum_sort_reverse = !$scope.volum_sort_reverse;
			};


			// method
			statusHdfsCtrl.chartZoomOut = function (chart_id) {
				zingchart.exec(chart_id, 'viewall');
			};

			statusHdfsCtrl.zookeeperDetailPop = function () {
				param.systemSeq = systemSeq;
				DataService.httpPost("/service/hdfs/getZookeeperDetail", param, onGetZookeeperDetailResult);
			};

			statusHdfsCtrl.popHdfsStatusLiveNode = function (type) {
				statusHdfsCtrl.pop = {};

				let width = 1200;
				if (type == "dead")
					width = 640;

				statusHdfsCtrl.pop.halfwidth = width / 2;
				statusHdfsCtrl.pop.width = "width:" + width + "px";

				// 그리드 column 셋팅
				statusHdfsCtrl.pop.type = type[0].toUpperCase() + type.substring(1, type.length);
				statusHdfsCtrl.pop.gridColumns = statusHdfsCtrl.columns[type];

				// 그리드 정보 조회
				param.type = type;
				param.systemSeq = systemSeq;

				DataService.httpPost("/dashboard/metric/getDataNodeInfo", param, onGetDataNodeInfoResultHandler);
			};

			statusHdfsCtrl.getRawData = function (type) {
				if (type == null || type == "")
					return;

				let chartData = [];
				let data = zingchart.exec(type, 'getdata');
				let title = data.graphset[0].title.text;
				if(statusHdfsCtrl.last == null || statusHdfsCtrl.last[type] == null || Object.keys(statusHdfsCtrl.last).length <1)
					chartData = [];
				else
					chartData = statusHdfsCtrl.last[type].raw;

				openRawDataPopup(type, title, chartData);
			};


			// function
			function openRawDataPopup(type, title, list) {
				if(list == null) {
					alert("There is no raw data.");
					return;
				}

				let columns = getColumnsBylist(type);
				if(columns == null || columns.length < 1)
					return;

				let popup = ngDialog.open({
					template: "/common/popup/rawdata_grid_popup_template.html",
					className: "ngdialog-theme-default custom-width",
					showClose: false,
					disableAnimation: true,
					cache: false,
					closeByDocument: false,
					closeByEscape: false,
					scope: $scope,
					controller: $controller("RawDataGridPopCtrl", {
						$scope: $scope,
						columns: columns,
						title: title,
						data: list,
						width : 365,
						height : 400
					})
				});

				let closer = $rootScope.$on('ngDialog.refresh', function (e, id) {
					if (id != popup.id) return;
					closer();
				});
			}

			function getColumnsBylist(type) {
				if(type == null || type == "")
					return;

				let columns = [];
				let keys = statusHdfsCtrl.rawdataColumns[type];
				let len = keys.length;

				for(let i=0; i<len; i++) {
					let c = {};
					c.headerName = getCamelCase(keys[i]);
					c.field = keys[i];
					c.cellStyle = center;
					if(keys[i] === 'system_name') {
                        c.width = 185;
                    }else {
                        c.width = 145;
                    }

					if(keys[i].toUpperCase().indexOf("SYSTEM_NAME") < 0)
						c.cellRenderer = GridRenderer.unitRenderer;

					columns.push(c);
				}
				return columns;
			}

			function getCamelCase(str) {
				if(str == null || str == "")
					return null;

				let words = str.split(/\_|\s/gi);
				for(let i=0; i<words.length; i++) {
					words[i] = words[i].charAt(0).toUpperCase() + words[i].substr(1, words[i].length);
				}
				return words.join(" ");
			}

			function getStatusTopData(data) {
				statusHdfsCtrl.statusTopData = data.top_status_01 == null ? {} : data.top_status_01;
				statusHdfsCtrl.statusTopData = angular.merge(statusHdfsCtrl.statusTopData, data.top_status_02);
				statusHdfsCtrl.statusTopData = angular.merge(statusHdfsCtrl.statusTopData, data.top_status_03);
				statusHdfsCtrl.statusTopData = angular.merge(statusHdfsCtrl.statusTopData, data.top_status_04);
				statusHdfsCtrl.statusTopData = angular.merge(statusHdfsCtrl.statusTopData, data.top_status_05);
				statusHdfsCtrl.statusTopData = angular.merge(statusHdfsCtrl.statusTopData, data.top_status_06);

				if(data.top_status_02 == null) {
					statusHdfsCtrl.statusTopData.total = 0;
					statusHdfsCtrl.statusTopData.used = 0;
					statusHdfsCtrl.statusTopData.non_use = 0;
					statusHdfsCtrl.statusTopData.free = 0;
					statusHdfsCtrl.statusTopData.free_per_num = 0;
					statusHdfsCtrl.statusTopData.free_per = 0;
					statusHdfsCtrl.statusTopData.used_per_num = 0;
					statusHdfsCtrl.statusTopData.used_per = 0;
					statusHdfsCtrl.statusTopData.non_use_per_num = 0;
					statusHdfsCtrl.statusTopData.non_use_per = 0;
					statusHdfsCtrl.statusTopData.total_files = 0;
					statusHdfsCtrl.statusTopData.total_blocks = 0;
					statusHdfsCtrl.statusTopData.missing_blocks = 0;
				}
			}

			function getChartDataResult(data) {
				if(data == null)
					return;

				statusHdfsCtrl.last = {};

				let nonHDFSUsedChart = data.noneHDFSUsed;
				if (nonHDFSUsedChart.x && nonHDFSUsedChart.x.length > 0) {
					zingchart.exec('hdfsChart_1', 'repaintobjects', {});
					statusHdfsCtrl.hdfsChart_1 = getMakeChartData(nonHDFSUsedChart, 'None HDFS Used');
					statusHdfsCtrl.last.hdfsChart_1 = nonHDFSUsedChart;
				}

				let hdfsUsedChart = data.hdfsUsed;
				if (hdfsUsedChart.x && hdfsUsedChart.x.length > 0) {
					zingchart.exec('hdfsChart_2', 'repaintobjects', {});
					statusHdfsCtrl.hdfsChart_2 = getMakeChartData(hdfsUsedChart, 'HDFS Used');
					statusHdfsCtrl.last.hdfsChart_2 = hdfsUsedChart;
				}

				let heapMemoryUsedChart = data.heapMemoryUsed;
				if (heapMemoryUsedChart.x && heapMemoryUsedChart.x.length > 0) {
					zingchart.exec('hdfsChart_3', 'repaintobjects', {});
					statusHdfsCtrl.hdfsChart_3 = getMakeChartData(heapMemoryUsedChart, 'Heap Memory Used');
					statusHdfsCtrl.last.hdfsChart_3 = heapMemoryUsedChart;
				}

				let xCeiverChart = data.xceiver;
				if (xCeiverChart.x && xCeiverChart.x.length > 0) {
					zingchart.exec('hdfsChart_4', 'repaintobjects', {});
					statusHdfsCtrl.hdfsChart_4 = getMakeChartData(xCeiverChart, 'xceiver_count');
					statusHdfsCtrl.last.hdfsChart_4 = xCeiverChart;
				}

				let gcCountChart = data.gccount;
				if (gcCountChart.x && gcCountChart.x.length > 0) {
					zingchart.exec('hdfsChart_5', 'repaintobjects', {});
					statusHdfsCtrl.hdfsChart_5 = getMakeChartData(gcCountChart, 'gc_count');
					statusHdfsCtrl.last.hdfsChart_5 = gcCountChart;
				}

				let logErrorChart = data.logerror;
				if (logErrorChart.x && logErrorChart.x.length > 0) {
					zingchart.exec('hdfsChart_6', 'repaintobjects', {});
					statusHdfsCtrl.hdfsChart_6 = getMakeChartData(logErrorChart, 'log_error');
					statusHdfsCtrl.last.hdfsChart_6 = logErrorChart;
				}

				setTimeout(function() {
					// tooltip 초기화
					angular.element(".zc-tooltip").hide();
					angular.element(".zc-tooltip").remove();
				}, 300);
			}

			function getMakeChartOption(title, color) {
				let scatterChartOption = {
					backgroundColor: "transparent",
					title: {
						text: title,
						"font-size": 15,
						"font-color": "#fff",
						"padding-top": 0
					},
					plotarea: {
						"margin-top": "60px",
						"margin-left": "dynamic",
						"margin-right": "30px",
						"margin-bottom": "23px"
					},
					scaleX: {
                        "item-overlap" : true,
                        "max-items":5,
						zooming: true,
						guide: {
							visible: false
						},
						item: {
							"font-color": "#fff"
						},
						thousandsSeparator: ","
					},
					scaleY: {
						item: {
							"font-color": "#fff",
						},
						step:10,
						zooming: true,
						guide: {
							visible: false
						},
						thousandsSeparator: ","

					},
					plot: {
						"mode": "fast",
						"exact": true,
						marker: {
							backgroundColor: color,
							type: "circle",
							borderWidth: 0,
							size: 3,
							shadow: false
						}
					}
				};

				return scatterChartOption;
			}

			function getMakeChartTooltip(boo) {
				let tooltipText = "";
				if (boo == true)
					tooltipText = "System Name : %data-system \n %t : %v \n %plot-description : %kl";
				else
					tooltipText = "System Name : %kl \n %t : %v";

				let tooltip = {};
				tooltip.tooltip = {
					padding: "10 10 10 10",
					borderWidth: 1,
					backgroundColor: "#fff",
					fontColor: "#333",
					textAlign: "left",
					borderColor: "%background-color",
					thousandsSeparator: ",",
					text: tooltipText

				};

				return tooltip;
			}

			function getMakeChartData(value, text, description) {
				system_name = value.system;
				return [{values: value.x, 'data-system': value.system, 'text': text, 'description': description}];
			}

			function getGridDataResult(data) {
				statusHdfsCtrl.volFailsGridData = data.vol_fails;
				statusHdfsCtrl.processGridData = data.process;
			}

			function getData() {
				param.systemSeq = systemSeq;
				param.partition = "P" + moment().format('YYYYMMDD');
				DataService.httpPost("/service/hdfs/getHdfsStatusTop", param, onGetHdfsStatusTopResult, loader);
			}

			function createTimer() {
				clearInterval(TIMER);
				TIMER = setInterval(getData, INTERVAL_TIME);
			}

			function addEventListener() {
				unbind = [
					$scope.$on(ConfigManager.getEvent("CHANGE_SYSTEM_SEQ_EVENT"), onChangeSystemGroupIdEventHandler),
					$scope.$on('$destroy', destroy)
				];
			}

			function setChartOption(){
				statusHdfsCtrl.hdfsChart1_option = angular.copy(angular.merge(getMakeChartOption('None HDFS Used', colors[0]), getMakeChartTooltip(false)));
				statusHdfsCtrl.hdfsChart1_option.scaleX.minValue = 1;
				statusHdfsCtrl.hdfsChart1_option.scaleX.step = 10;

				// statusHdfsCtrl.hdfsChart2_option = angular.copy(angular.merge(getMakeChartOption('Non Heap Memory / Heap Memory', "#FFEA00"), getMakeChartTooltip(true)));
				statusHdfsCtrl.hdfsChart2_option = angular.copy(angular.merge(getMakeChartOption('HDFS Used', colors[1]), getMakeChartTooltip(false)));
				statusHdfsCtrl.hdfsChart2_option.scaleX.minValue = 1;
				statusHdfsCtrl.hdfsChart2_option.scaleX.step = 10;

				statusHdfsCtrl.hdfsChart3_option = angular.copy(angular.merge(getMakeChartOption('Heap Memory Used', colors[2]), getMakeChartTooltip(false)));
				statusHdfsCtrl.hdfsChart3_option.scaleX.tick = {visible: "false"};

				statusHdfsCtrl.hdfsChart4_option = angular.copy(angular.merge(getMakeChartOption('xCeiver Count', colors[3]), getMakeChartTooltip(false)));
				statusHdfsCtrl.hdfsChart4_option.scaleX.tick = {visible: "false"};

				statusHdfsCtrl.hdfsChart5_option = angular.copy(angular.merge(getMakeChartOption('GC Count', colors[4]), getMakeChartTooltip(false)));
				statusHdfsCtrl.hdfsChart5_option.scaleX.tick = {visible: "false"};

				// statusHdfsCtrl.hdfsChart5_option = angular.copy(angular.merge(getMakeChartOption('GC Time', "#00C853"), getMakeChartTooltip(false)));
				// statusHdfsCtrl.hdfsChart5_option.scaleX.tick = {visible: "false"};

				statusHdfsCtrl.hdfsChart6_option = angular.copy(angular.merge(getMakeChartOption('LOG Error Count', colors[5]), getMakeChartTooltip(false)));
				statusHdfsCtrl.hdfsChart6_option.scaleX.tick = {visible: "false"};
			}

			function initialize() {
				addEventListener();
				systemSeq = ConfigManager.getSystemSeq();

				getData();
				createTimer();

				setChartOption();

			}

			initialize();
	}]);
});