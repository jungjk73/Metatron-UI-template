define(["app", "moment"], function (app, moment) {
	app.controller("OverviewDashboardCtrl", ["$rootScope", "$scope", "$timeout", "$interval", "$filter", "$controller", "$sce", "ngDialog", "WebSocketService", "ConfigManager", "DataService", "CommonUtil", "GridRenderer",
		function ($rootScope, $scope, $timeout, $interval, $filter, $controller, $sce, ngDialog, WebSocketService, ConfigManager, DataService, CommonUtil, GridRenderer) {
			"use strict";

			// property
			let overviewDashboardCtrl = this;
			let INTERVAL_TIME = (1000 * 60) * 1;
			let INTERVAL;
			let systemSeq = "";
			let unbind = [];
			let LOAD_COMPLETE = false;
			let webSocketResult = false;


			// 데이터 초기화
			function initData(){
				overviewDashboardCtrl.chart = {};
				overviewDashboardCtrl.chart.hdfs = {};
				overviewDashboardCtrl.chart.hdfs.pie = {};
				overviewDashboardCtrl.chart.hdfs.line = {};
				overviewDashboardCtrl.chart.disk = {};
				overviewDashboardCtrl.chart.disk.pie = {};

				overviewDashboardCtrl.status = {};

				overviewDashboardCtrl.chart.yarn = {};
				overviewDashboardCtrl.chart.presto = {};

				overviewDashboardCtrl.grid = {};
				overviewDashboardCtrl.grid.master = {};
				overviewDashboardCtrl.grid.worker = {};

			}


			function createInterval(){
				if (INTERVAL != null) {
					$interval.cancel(INTERVAL);
					INTERVAL = null;
				}
				INTERVAL = $interval(getData, INTERVAL_TIME);
			}

			// 데이터 조회
			function getData(){
				if (ConfigManager.getSystemSeq() == ''){
					let __out = $timeout(function(){
						getData();
						$timeout.cancel(__out);
					}, 500);
					return;
				}

				sendWebsocket();


				let param = {};
				param.systemSeq = ConfigManager.getSystemSeq();

				// 파티션 setting
				CommonUtil.setPartition(param);

				param.trendUnit = 'tb';

				let startDateToday = moment().format('YYYY-MM-DD 00:00:00');
				let endDateToday = moment().format('YYYY-MM-DD HH:mm:ss');

				let startDateYesterday = moment().add(-1,'days').format('YYYY-MM-DD 00:00:00');
				let endDateYesterday = moment().add(-24,'hours').format('YYYY-MM-DD HH:mm:ss');

				param.startDateToday = startDateToday;
				param.endDateToday = endDateToday;
				param.startDateYesterday = startDateYesterday;
				param.endDateYesterday = endDateYesterday;


				DataService.httpPost("/dashboard/metric/getOverviewDashboardData", param, function(result){
					if (result.result == 1 && result.data) {

						makeHdfsPieChart(result.data);

						makeHDFSLineChart(result.data);

						makeServerStatus(result.data);

						makeJobCountBarChart(result.data);

						makeMasterWorkerGrid(result.data);

					} else {

					}

				});

			}

			function sendWebsocket(){
				WebSocketService.callRequest({
					"function": "getMetricDashboard",
					"resultEvent": "GET_METRIC_DASHBOARD_EVENT",
					"systemSeq": ConfigManager.getSystemSeq()
				});

				WebSocketService.callRequest({
					"function": "getDiskStateCount",
					"resultEvent": "GET_DISK_STATE_COUNT_EVENT",
					"systemSeq": ConfigManager.getSystemSeq()
				});
			}



			// Websocket Result 처리
			function onGetWebsocketEventHandler(event, data){
				if (data.function == "getMetricDashboard" && data.period == "1") {
					if (data.hasOwnProperty("exceptionMassage") || !data.hasOwnProperty("searchResults")) {

					} else {
						webSocketResult = true;
						let _result = data.searchResults;

						let _cpuNum = Number(_result.CPU_NUM);
						let _loadOne = Number(_result.LOAD_ONE);
						overviewDashboardCtrl.status.cpuUsagePercent = Number(_result.LOAD_ONE) === 0 ? 0 : ( Number(_result.LOAD_ONE) / Number(_result.CPU_NUM) * 100 ).toFixed(2);

						let _memFree = Number(_result.MEM_CACHED)
							+ Number(_result.MEM_BUFFERS)
							+ Number(_result.MEM_FREE);
						let _memTotal = Number(_result.MEM_USED) + _memFree;
						overviewDashboardCtrl.status.memUsingPercent = Number(_result.MEM_USED) === 0 ? 0 : (  Number(_result.MEM_USED) / _memTotal * 100).toFixed(2);

						$.powerTip.destroy($('#statusCPU'));
						$('#statusCPU').data('powertipjq', $([
							'<div>',
							'<div class="tooltip_title align-left">',
							'<b>Total : </b>' + _cpuNum,
							'<p><b>Load One : </b>'+_loadOne+'</p>',
							'</div>',
							'</div>'
						].join('\n')));
						$('#statusCPU').powerTip({
							placement: 'n',
							smartPlacement: true,
							manual: true
						});

						$.powerTip.destroy($('#statusMemory'));
						$('#statusMemory').data('powertipjq', $([
							'<div>',
							'<div class="tooltip_title align-left">',
							'<b>Total : </b>' + CommonUtil.formatBytes(_memTotal * 1024, 2, 'TB'),
							'<p><b>Used : </b>'+CommonUtil.formatBytes(Number(_result.MEM_USED) * 1024, 2, 'TB')+'</p>',
							'<p><b>Free : </b>'+CommonUtil.formatBytes(_memFree * 1024, 2, 'TB')+'</p>',
							'</div>',
							'</div>'
						].join('\n')));
						$('#statusMemory').powerTip({
							placement: 'n',
							smartPlacement: true,
							manual: true
						});
					}
				}
			}
			function onGetWebsocketDiskEventHandler(event, data){
				if (data.function == "getDiskStateCount") {
					if (data.hasOwnProperty("exceptionMassage") || !data.hasOwnProperty("searchResults")) {

					} else {
						webSocketResult = true;
						let _result = data.searchResults;
						overviewDashboardCtrl.status.rootfs = _result.disk_free_percent_rootfs;

						$.powerTip.destroy($('#statusRoot'));
						$('#statusRoot').data('powertipjq', $([
							'<div>',
							'<div class="tooltip_title align-left">',
							'<b>RootFS : </b>' + overviewDashboardCtrl.status.rootfs,
							'</div>',
							'</div>'
						].join('\n')));
						$('#statusRoot').powerTip({
							placement: 'n',
							smartPlacement: true,
							manual: true
						});

						makeDiskPieChart(_result);
					}
				}
			}


			function onGetWebsocketServerStatusDetailEvent(event, data){

				let _data = data.searchResults;
				let _resultData = [];
				let _column = [];
				let _width = 0;
				let _useGrid = true;

				let _title = overviewDashboardCtrl.viewStatus+' Status';

				if (overviewDashboardCtrl.viewStatus == 'CPU_USAGE') {
					let _keys = Object.keys(_data);
					_keys.sort(function(a, b){return a < b ? -1 : a > b ? 1: 0;});
					for (let i = 0 ; i < _keys.length ; i++) {
						let _item = _data[_keys[i]];
						_resultData.push({systemName : _keys[i], cpuNum: _item.CPU_NUM, loadOne: _item.LOAD_ONE, cpuUsage: _item.CPU_USAGE });
					}

					_column = [
						{"headerName": "System Name", "field": "systemName", "cellStyle": center, "width": 185, "min-width": 185},
						{"headerName": "CPU Total", "field": "cpuNum", "cellStyle": center, "width": 100, "min-width": 150,"cellRenderer": GridRenderer.numberFormatter},
						{"headerName": "CPU Used", "field": "loadOne", "cellStyle": center, "width": 100, "min-width": 150,"cellRenderer": GridRenderer.numberFormatter},
						{"headerName": "Usage %", "field": "cpuUsage", "cellStyle": center, "width": 150, "min-width": 150}
					];

					_width=  550;
				} else if (overviewDashboardCtrl.viewStatus == 'MEM_USAGE') {
					let _keys = Object.keys(_data);
					_keys.sort(function(a, b){return a < b ? -1 : a > b ? 1: 0;});
					for (let i = 0 ; i < _keys.length ; i++) {
						let _item = _data[_keys[i]];
						_resultData.push({systemName : _keys[i], memTotal: _item.MEM_TOTAL, memUsed: _item.MEM_USED, memCached: _item.MEM_CACHED, memBuffers: _item.MEM_BUFFERS, memFree: _item.MEM_FREE });
					}

					_column = [
						{"headerName": "System Name", "field": "systemName", "cellStyle": center, "width": 185, "min-width": 185},
						{"headerName": "Total", "field": "memTotal", "cellStyle": center, "width": 120, "min-width": 120,"cellRenderer": GridRenderer.unitTransToTB},
						{"headerName": "Used", "field": "memUsed", "cellStyle": center, "width": 120, "min-width": 120,"cellRenderer": GridRenderer.unitTransToTB},
						{"headerName": "Cached", "field": "memCached", "cellStyle": center, "width": 120, "min-width": 120,"cellRenderer": GridRenderer.unitTransToTB},
						{"headerName": "Buffers", "field": "memBuffers", "cellStyle": center, "width": 120, "min-width": 120,"cellRenderer": GridRenderer.unitTransToTB},
						{"headerName": "Free", "field": "memFree", "cellStyle": center, "width": 120, "min-width": 120,"cellRenderer": GridRenderer.unitTransToTB}
					];

					_width = 807;
				} else if (overviewDashboardCtrl.viewStatus == 'ROOTFS') {
					let _rootfs = overviewDashboardCtrl.chart.disk.pie.rootfs90_host;
					let _parentKeys = Object.keys(_rootfs);
					_parentKeys.sort(function(a, b){return a < b ? -1 : a > b ? 1: 0;});
					for (let i =  0 ; i < _parentKeys.length ; i++) {
						let _host = _parentKeys[i];
						let _item = _rootfs[_host];
						let _itemKeys = Object.keys(_item);
						_itemKeys.sort(function(a, b){return a < b ? -1 : a > b ? 1: 0;});
						let _values = '';
						for (let k = 0 ; k < _itemKeys.length ; k++) {
							let _disk = _itemKeys[k];
							_disk = _disk.replace("DISK_FREE_PERCENT_", "");
							let _val = _item[_itemKeys[k]];

							_values += _disk+': '+_val+' %';
							if ((k+1) % 3 == 0) _values += '<br>';
							else _values += ' , ';
						}

						_resultData.push({
							systemName: _host,
							data: $sce.trustAsHtml(_values || '')
						});
					}

					_width = 700;

					_column = [
						{"headerName": "System Name", "field": "systemName", "cellStyle": center, "width": 185, "min-width": 185},
						{"headerName": "Data", "field": "data", "cellStyle": center, "width": 300, "min-width": 300}
					];

					_useGrid = false;

				}

				openGridPopup(_column, _title, _resultData, _width, 500, _useGrid);
			}


			// HDFS 차트 데이터 설정
			function makeHdfsPieChart(resultData){

				overviewDashboardCtrl.chart.hdfs.pie.config = {
					tooltip: {show: false},
					cursor: 'move',
					label: {
						normal: {
							show: false
						},
						emphasis: {
							show: false
						}
					},
					series: [{
						type: 'pie',
						radius: ['80', '100']
					}]
				};		

				overviewDashboardCtrl.chart.hdfs.capacityTotal = resultData.capacityTotal;		
				overviewDashboardCtrl.chart.hdfs.capacityUsed = resultData.capacityUsed+resultData.capacityNon; 		
				overviewDashboardCtrl.chart.hdfs.capacityNonUsed = resultData.capacityNon;
				overviewDashboardCtrl.chart.hdfs.missingBlocks = resultData.missingBlocks;
				overviewDashboardCtrl.chart.hdfs.capacityRemaining = resultData.capacityRemaining;
				overviewDashboardCtrl.chart.hdfs.stddev = resultData.stddev;

				let _usedVal = Number(resultData.capacityUsed + resultData.capacityNon);
				let _labelShowOption = {normal: {
					show: true,
					position: 'center',
					textStyle: {
						fontSize: '30',
						fontWeight: 'bold'
					}
				}};
				let _labelCloseOption = {normal: {
					show: false
				}};
				overviewDashboardCtrl.chart.hdfs.pie.data = [];
				overviewDashboardCtrl.chart.hdfs.pie.data.push([
					{
						value: Number(overviewDashboardCtrl.chart.hdfs.capacityUsed), name:'Used',color : '#01C853',
						label: _labelShowOption
					},
					// {value:Number(resultData.capacityNon), name:'Non', color : '#666A7B',label: _labelCloseOption},
					{
						value: Number(overviewDashboardCtrl.chart.hdfs.capacityRemaining), name:'Free', color : '#3E8CFF',
						label: _labelCloseOption
					}
				]);

				$timeout(function(){

					overviewDashboardCtrl.chart.hdfs.pie.chartObj.on('mouseover', function (params) {
						for (let m = 0 ; m < overviewDashboardCtrl.chart.hdfs.pie.data[0].length ; m++ ) {
							overviewDashboardCtrl.chart.hdfs.pie.data[0][m].label = _labelCloseOption;
						}

						overviewDashboardCtrl.chart.hdfs.pie.data[0][params.dataIndex].label = _labelShowOption;
						ap($scope);
					});
					overviewDashboardCtrl.chart.hdfs.pie.chartObj.on('mouseout', function (params) {
						overviewDashboardCtrl.chart.hdfs.pie.data[0][0].label = _labelShowOption;		// used
						// overviewDashboardCtrl.chart.hdfs.pie.data[0][1].label = _labelCloseOption;		// non
						overviewDashboardCtrl.chart.hdfs.pie.data[0][1].label = _labelCloseOption;		// free
						ap($scope);
					});
				},500);




			}


			// HDFS Line 차트
			function makeHDFSLineChart(resultData) {

				overviewDashboardCtrl.chart.hdfs.line.config = {
					toolbox: {
						show: false,
						feature: {
							dataZoom: {
								yAxisIndex: 'none'
							}
						}
					},
					tooltip : {
						show: true,
						backgroundColor : '#fff',
						formatter : function(param){
							let val = '';
							val = val + '<span style="color : #000">'+param[0].axisValue + '</span><br>';
							val = val + '<span style="color : #ff3d00">'+param[1].seriesName+': '+param[1].value + ' (TB)</span><br>';
							val = val + '<span style="color : #00c853">'+param[0].seriesName+': '+param[0].value + ' (TB)</span>';
							return val;
						}
					},
					grid: {
						left: '1%',
						right: '10%',
						bottom: '10%',
						top: '5%',
						containLabel: true
					},
					xAxis:{
						axisLabel: {
							formatter: function(value, idx){
								let __date = moment(value).format('YYYY/MM/DD');
								let __time = moment(value).format('HH:mm:ss');
								return __date+'\n'+__time;
							}
						}

					},
					yAxis: {
						type : 'value',
						axisLabel : {
							show : true,
							formatter: '{value} TB'
						}
					},
					series: [
						{name: 'Capacity Used',  itemStyle:{normal:{color:'#00c853'}}},
						{name: 'Capacity Total', itemStyle:{normal:{color:'#ff3d00'}}}
					]
				};

				let _xAxis = [];
				let _val = [];
				let _val2 = [];
				angular.forEach(resultData.trendData,function(_data){
					_xAxis.push(_data.insert_time_str);
					_val.push(_data.capacity_used);
					_val2.push(resultData.trendTotalData.capacity_total || 0);
				});
				overviewDashboardCtrl.chart.hdfs.line.config.xAxis.data = _xAxis;

				overviewDashboardCtrl.chart.hdfs.line.data = [];
				overviewDashboardCtrl.chart.hdfs.line.data.push(_val, _val2);

			}



			// Node Disk 차트
			function makeDiskPieChart(resultData){
				$timeout(function(){


					let _config = {
						tooltip: {show: false},

						series: [{
							type: 'pie',
							radius: ['10','100'],
							center: ['50%','43%'],
							roseType: 'area',
							itemStyle: {
								normal: {
									label: {
										position: 'inner',
										formatter: function (item) {
											return (+item.percent).toFixed() + '%';
										}
									},
									labelLine: { show: false }
								},
								emphasis: {
									label: {
										show: true,
										formatter: '{b}\n{d}%'
									}
								}
							}
						}]
					};
					overviewDashboardCtrl.chart.disk.pie.config = _config;

					overviewDashboardCtrl.chart.disk.pie.data = [];
					overviewDashboardCtrl.chart.disk.pie.data.push([

						{value : resultData.disk_free_percent90_95, name: '90% - 95%', color: '#ffc600'},
						{value : resultData.disk_free_percent85, name: 'Under 85%' , color: '#339947'},
						{value : resultData.disk_free_percent85_90, name: '85% - 90%', color: '#3ba1c8'},
						{value : resultData.disk_free_percent95, name: 'Over 95%', color: '#c83200'},

					]);

					overviewDashboardCtrl.chart.disk.pie.persect85_90_host = resultData.persect85_90_host || {};
					overviewDashboardCtrl.chart.disk.pie.persect85_host = resultData.persect85_host || {};
					overviewDashboardCtrl.chart.disk.pie.persect90_95_host = resultData.persect90_95_host || {};
					overviewDashboardCtrl.chart.disk.pie.persect95_host = resultData.persect95_host || {};

					overviewDashboardCtrl.chart.disk.pie.rootfs90_host = resultData.rootfs90_host || {};
				},100);

			}

			// Server Status 설정
			function makeServerStatus(resultData) {

				// active / dead node
				let __nodeActiveCount = Number(resultData.alive);
				let __nodeDeadCount = Number(resultData.dead);
				let __nodeTotalCount = __nodeActiveCount + __nodeDeadCount;

				let __nodeActivePercent = (__nodeActiveCount/__nodeTotalCount * 100).toFixed(2);
				let __nodeDeadPercent = (__nodeDeadCount/__nodeTotalCount * 100).toFixed(2);

				overviewDashboardCtrl.status.nodeActiveCount = $filter('number')(__nodeActiveCount);
				overviewDashboardCtrl.status.nodeDeadCount = $filter('number')(__nodeDeadCount);
				overviewDashboardCtrl.status.nodeActivePercent = __nodeActivePercent;
				overviewDashboardCtrl.status.nodeDeadPercent = __nodeDeadPercent;


				$.powerTip.destroy($('#statusActive'));
				$('#statusActive').data('powertipjq', $([
					'<div>',
					'<div class="tooltip_title align-left">',
					'<b>Active Count : </b>' + overviewDashboardCtrl.status.nodeActiveCount,
					'</div>',
					'</div>'
				].join('\n')));
				$('#statusActive').powerTip({
					placement: 'n',
					smartPlacement: true,
					manual: true
				});

				$.powerTip.destroy($('#statusDead'));
				$('#statusDead').data('powertipjq', $([
					'<div>',
					'<div class="tooltip_title align-left">',
					'<b>Dead Count : </b>' + overviewDashboardCtrl.status.nodeDeadCount,
					'</div>',
					'</div>'
				].join('\n')));
				$('#statusDead').powerTip({
					placement: 'n',
					smartPlacement: true,
					manual: true
				});

			}


			// Job Count Bar Chart
			function makeJobCountBarChart(resultData) {
				let _barChartOption = angular.copy({
					grid: {
						left: '3%',
						right: '4%',
						bottom: '10%',
						top: '10%',
						containLabel: true
					},
					xAxis : {},
					legend: {
						data: [
							{name: 'Yesterday', textStyle: {color: 'white'}},
							{name: 'Today', textStyle: {color: 'white'}}
						]
					},
					series: [
						{
							name: 'Yesterday',
							label: {
								normal: {
									show: true,
									position: 'top'
								}
							},
							barMaxWidth: 35,
							itemStyle: {normal: { color: '#ccc'}}
						},
						{
							name: 'Today',
							label: {
								normal: {
									show: true,
									position: 'top'
								}
							},
							barMaxWidth: 35,
							itemStyle: {normal: { color: '#3e8cff'}}
						}
					]
				});

				overviewDashboardCtrl.chart.yarn.config = angular.copy(_barChartOption);
				overviewDashboardCtrl.chart.yarn.data = [];

				let map = resultData.yarnPrestoCountData;

				if (!map) return;

				let yarnData = map.yarn;

				if(yarnData.length > 0 && yarnData[0] !== null) {
					let gridDataMap_yarn = getGridDataSet(yarnData);
					let _xAxis_yarn = gridDataMap_yarn.xAxis;
					let _valYes_yarn = gridDataMap_yarn.valYesterday;
					let _valTo_yarn = gridDataMap_yarn.valToday;

					overviewDashboardCtrl.chart.yarn.config.xAxis.data = _xAxis_yarn;
					overviewDashboardCtrl.chart.yarn.data.push(_valYes_yarn);
					overviewDashboardCtrl.chart.yarn.data.push(_valTo_yarn);
				}


				overviewDashboardCtrl.chart.presto.config = angular.copy(_barChartOption);
				overviewDashboardCtrl.chart.presto.data = [];

				let prestoData = map.presto;

				if(prestoData.length > 0 && prestoData[0] !== null) {
				
					let gridDataMap_presto = getGridDataSet(prestoData);
					let _xAxis_presto = gridDataMap_presto.xAxis;
					let _valYes_presto = gridDataMap_presto.valYesterday;
					let _valTo_presto = gridDataMap_presto.valToday;

					overviewDashboardCtrl.chart.presto.config.xAxis.data = _xAxis_presto;
					overviewDashboardCtrl.chart.presto.data.push(_valYes_presto);
					overviewDashboardCtrl.chart.presto.data.push(_valTo_presto);
				}
			}


			function getGridDataSet(passData){
				let _xAxis = [];
				let _valYes = [];
				let _valTo = [];
				let resultMap = {'xAxis':_xAxis, 'valYesterday':_valYes, 'valToday':_valTo};
				if (passData && passData.length > 0) {
					let totalYes = '';
					let totalTo = '';
					angular.forEach(passData, function(_data){
						if (_data.USER_NAME && _data.USER_NAME != '' && _data.USER_NAME.toLowerCase() == 'total') {
							totalYes = _data.YESTERDAY_COUNT;
							totalTo = _data.TODAY_COUNT;
						} else {
							_xAxis.push(_data.USER_NAME);
							_valYes.push(_data.YESTERDAY_COUNT);
							_valTo.push(_data.TODAY_COUNT);
						}
					});
					_xAxis.unshift('Total');
					_valYes.unshift(totalYes);
					_valTo.unshift(totalTo);
				}
				return resultMap;
			}

			// Master , Worker Grid
			function makeMasterWorkerGrid(resultData){
				overviewDashboardCtrl.grid.master.gridData = resultData.masterGridData;
				overviewDashboardCtrl.grid.worker.gridData = resultData.workerGridData;
				$timeout(function(){
					overviewDashboardCtrl.grid.master.gridData = angular.copy(overviewDashboardCtrl.grid.master.gridData);
					overviewDashboardCtrl.grid.worker.gridData = angular.copy(overviewDashboardCtrl.grid.worker.gridData);
				}, 100);

				//20220311 henry ("PRESTOSERVER" -> "TRINOSERVER" 명칭 변경)
				for (let m =  0 ; m < overviewDashboardCtrl.grid.worker.gridData.length ; m++) {
					if (overviewDashboardCtrl.grid.worker.gridData[m].processName == "PRESTOSERVER"){
						overviewDashboardCtrl.grid.worker.gridData[m].processName = "TRINOSERVER";
						break;
					}
				}
			}

			overviewDashboardCtrl.showStatusRawGrid = function (type) {
				if (type == null || type == "")
					return;

				if (type.toLowerCase() == 'active' || type.toLowerCase() == 'dead') {

					DataService.httpPost("/dashboard/metric/getAliveServerGridData", {"systemSeq": ConfigManager.getSystemSeq(), "status":type.toLowerCase()}, function (result) {
						let _data = result.data;

						let _column = [
							{"headerName": "System Name", "field": "systemName", "cellStyle": center, "width": 200, "min-width": 200},
							{"headerName": "System IP", "field": "systemIP", "cellStyle": center, "width": 200, "min-width": 200}
						];
						let _title = type + '  Nodes Information';
						openGridPopup(_column, _title, _data, 450, 500);
					});
				} else if (type == 'CPU_USAGE' || type == 'MEM_USAGE' || type == 'ROOTFS') {
					overviewDashboardCtrl.viewStatus = type;
					WebSocketService.callRequest({
						"function": "getServerStatusDetail",
						"resultEvent": "GET_SERVER_STATUS_DETAIL_EVENT",
						"systemSeq": ConfigManager.getSystemSeq(),
						"metricData" : [{"metrics":[type]}]
					});
				}
			};

			// Node Disk Usage 영역별 팝업
			overviewDashboardCtrl.showDiskUsageRawGrid = function(type){
				let _data = overviewDashboardCtrl.chart.disk.pie[type];
				let _parentKeys = Object.keys(_data);
				_parentKeys.sort(function(a, b){return a < b ? -1 : a > b ? 1: 0;})

				let _gridData = [];
				for (let i =  0 ; i < _parentKeys.length ; i++) {
					let _host = _parentKeys[i];
					let _item = _data[_host];
					let _itemKeys = Object.keys(_item);
					let _values = '';
					for (let k = 0 ; k < _itemKeys.length ; k++) {
						let _disk = _itemKeys[k];
						let _val = _item[_disk];

						_disk = _disk.replace("DISK_FREE_PERCENT_", "");

						_values += _disk+': '+_val+' %';
						if ((k+1) % 3 == 0) _values += '<br>';
						else _values += ' , ';
					}


					_gridData.push({
						systemName: _host,
						data: $sce.trustAsHtml(_values)
					});
				}

				let _column = [
					{"headerName": "System Name","cellClass":"temptest", "field": "systemName", "cellStyle": center, "width": 185, "min-width": 185},
					{"headerName": "Data", "field": "data", "cellStyle": center, "width": 300, "min-width": 300}
				];
				openGridPopup(_column, type, _gridData, 700, 500, false);
			};


			function openGridPopup(column, title, list, width, height, useGrid) {
				hidePowertip();

				let url = '';
				if (useGrid == false) {
					url = "/common/popup/rawdata_text_popup_template.html";
					let popup = ngDialog.open({
						template: url,
						className: "ngdialog-theme-default custom-width",
						showClose: false,
						disableAnimation: true,
						cache: false,
						closeByDocument: false,
						closeByEscape: false,
						data: {title: title, list: list, width: width, height: height}
					});

					let closer = $rootScope.$on('ngDialog.refresh', function (e, id) {
						if (id != popup.id) return;
						closer();
					});
				} else {
					url = "/common/popup/rawdata_grid_popup_template.html";
					let popup = ngDialog.open({
						template: url,
						className: "ngdialog-theme-default custom-width",
						showClose: false,
						disableAnimation: true,
						cache: false,
						closeByDocument: false,
						closeByEscape: false,
						scope: $scope,
						controller: $controller("RawDataGridPopCtrl", {
							$scope: $scope,
							columns: column,
							title: title,
							data: list,
							width: width,
							height: height
						})
					});

					let closer = $rootScope.$on('ngDialog.refresh', function (e, id) {
						if (id != popup.id) return;
						closer();
					});
				}

			}

			// 클러스터 변경
			function onChangeSystemSeqEventHandler(event, data) {
				if (data == null)
					return;

				if (!LOAD_COMPLETE) return;
				
				initTooltip();
				//destroyPowertip();

				systemSeq = ConfigManager.getSystemSeq();

				if (overviewDashboardCtrl.chart.hdfs.pie.chartObj) overviewDashboardCtrl.chart.hdfs.pie.chartObj.clear();
				if (overviewDashboardCtrl.chart.hdfs.line.chartObj) overviewDashboardCtrl.chart.hdfs.line.chartObj.clear();
				if (overviewDashboardCtrl.chart.disk.pie.chartObj) overviewDashboardCtrl.chart.disk.pie.chartObj.clear();
				if (overviewDashboardCtrl.chart.yarn.chartObj) overviewDashboardCtrl.chart.yarn.chartObj.clear();
				if (overviewDashboardCtrl.chart.presto.chartObj) overviewDashboardCtrl.chart.presto.chartObj.clear();
				overviewDashboardCtrl.grid.master.gridData = [];
				overviewDashboardCtrl.grid.worker.gridData = [];

				initData();
				getData();
				createInterval();

			}

			function addEventListener() {
				// broadcast event
				unbind = [
					$scope.$on('$destroy', destory),
					$scope.$on(ConfigManager.getEvent("GET_METRIC_DASHBOARD_EVENT"), onGetWebsocketEventHandler),
					$scope.$on(ConfigManager.getEvent("GET_DISK_STATE_COUNT_EVENT"), onGetWebsocketDiskEventHandler),
					$scope.$on(ConfigManager.getEvent("GET_SERVER_STATUS_DETAIL_EVENT"), onGetWebsocketServerStatusDetailEvent),
					$scope.$on(ConfigManager.getEvent("CHANGE_SYSTEM_SEQ_EVENT"), onChangeSystemSeqEventHandler)
				];
			}

			function destory() {
				unbind.forEach(function (fn) {
					fn();
				});
				clear();
			}

			function clear() {
				if (INTERVAL != null) {
					$interval.cancel(INTERVAL);
					INTERVAL = null;
				}

				overviewDashboardCtrl.chart = null;
				overviewDashboardCtrl = null;
				hidePowertip();
			}

			function initialize() {
				systemSeq = ConfigManager.getSystemSeq();
				addEventListener();

				initData();

				getData();

				createInterval();

				let __timeout = $timeout(function(){
					LOAD_COMPLETE = true;
				}, 1000);
				
				initTooltip();

				$(document).on('mouseleave', '.statusTooltip', function () {
					hidePowertip();
				});
				$(document).on('mouseout', '.statusTooltip', function () {
					hidePowertip();
				});


				let __websocketTimeout = $timeout(function(){
					if (webSocketResult == false) {
						sendWebsocket();
					}
				}, 1000);
			}
			
			function hidePowertip(){
				$.powerTip.hide($('#statusCPU'));
				$.powerTip.hide($('#statusMemory'));
				$.powerTip.hide($('#statusRoot'));
				$.powerTip.hide($('#statusActive'));
				$.powerTip.hide($('#statusDead'));
			}
			
			// Tooltip 초기화
			function initTooltip() {
				
				$.powerTip.destroy($('#statusActive'));
				$('#statusActive').data('powertipjq', $([
					'<div>',
					'<div class="tooltip_title align-left">',
					'<b>Active Count : </b>0',
					'</div>',
					'</div>'
				].join('\n')));
				$('#statusActive').powerTip({
					placement: 'n',
					smartPlacement: true,
					manual: true
				});

				$.powerTip.destroy($('#statusDead'));
				$('#statusDead').data('powertipjq', $([
					'<div>',
					'<div class="tooltip_title align-left">',
					'<b>Dead Count : </b>0',
					'</div>',
					'</div>'
				].join('\n')));
				
				$('#statusDead').powerTip({
					placement: 'n',
					smartPlacement: true,
					manual: true
				});
				
				
				$.powerTip.destroy($('#statusCPU'));
				$('#statusCPU').data('powertipjq', $([
					'<div>',
					'<div class="tooltip_title align-left">',
					'<b>Total : </b>0',
					'<p><b>Load One : </b>0</p>',
					'</div>',
					'</div>'
				].join('\n')));
				$('#statusCPU').powerTip({
					placement: 'n',
					smartPlacement: true,
					manual: true
				});

				$.powerTip.destroy($('#statusMemory'));
				$('#statusMemory').data('powertipjq', $([
					'<div>',
					'<div class="tooltip_title align-left">',
					'<b>Total : </b>0 Byte',
					'<p><b>Used : </b>0 Byte</p>',
					'<p><b>Free : </b>0 Byte</p>',
					'</div>',
					'</div>'
				].join('\n')));
				$('#statusMemory').powerTip({
					placement: 'n',
					smartPlacement: true,
					manual: true
				});
				
				
				$.powerTip.destroy($('#statusRoot'));
				$('#statusRoot').data('powertipjq', $([
					'<div>',
					'<div class="tooltip_title align-left">',
					'<b>RootFS : </b>0',
					'</div>',
					'</div>'
				].join('\n')));
				$('#statusRoot').powerTip({
					placement: 'n',
					smartPlacement: true,
					manual: true
				});

			}
			
			
			
			

			initialize();

			// Process Grid 설정 팝업 열기
			// 타이틀 헤더 끝에 아이콘 달기?
			// 저장 처리 후 해당 그리드만 새로 고침
			$scope.showProcessControll = function(dist){
				hidePowertip();

				let param = {};
				param.type = 'config';
				param.systemSeq = ConfigManager.getSystemSeq();

				overviewDashboardCtrl.config = {};
				overviewDashboardCtrl.config.dist = dist;

				DataService.httpPost("/dashboard/metric/getOverviewProcessData", param, function(result){

					if (!result.data) return;

					let _targetProcessList = [];
					let _selectedProcessList = [];
					if (dist == 'master'){
						if (result.data.masterGridData && result.data.masterGridData.length > 0) {
							for (let k = 0 ; k < result.data.masterGridData.length ; k++){
								let item = result.data.masterGridData[k];
								if (item.useFlag == 'Y') _selectedProcessList.push(item);
								if (item.useFlag == 'N') _targetProcessList.push(item);
							}
							//overviewDashboardCtrl.config.maxHeight = result.data.masterGridData.length > 4 ? result.data.masterGridData.length * 30 : 200;
						}
					} else if (dist == 'worker') {
						if (result.data.workerGridData && result.data.workerGridData.length > 0) {
							for (let k = 0 ; k < result.data.workerGridData.length ; k++){
								let item = result.data.workerGridData[k];
								if (item.processName == "PRESTOSERVER") item.processName = "TRINOSERVER";  //20220311 henry 이름변경표시
								if (item.useFlag == 'Y') _selectedProcessList.push(item);
								if (item.useFlag == 'N') _targetProcessList.push(item);
							}
							//overviewDashboardCtrl.config.maxHeight = result.data.workerGridData.length > 4 ? result.data.workerGridData.length * 30 : 200;
						}
					}
					overviewDashboardCtrl.config.targetProcessList = _targetProcessList;
					overviewDashboardCtrl.config.selectedProcessList = _selectedProcessList;
				});

				let popup = ngDialog.open({
					template: "/common/popup/process_ordering_template.html",
					className: "ngdialog-theme-default custom-width",
					showClose: false,
					disableAnimation: true,
					cache: false,
					closeByDocument: false,
					closeByEscape: false,
					scope: $scope,
					onOpenCallback: function(val){
						$('#selectedProcessList').sortable({
							cursor: 'move',
							stop: function(event, ui) {

								$('#selectedProcessList > li').each(function(idx, elem){
									let seq = $(this).data('seq');
									angular.forEach(overviewDashboardCtrl.config.selectedProcessList, function(item){
										if (item.processSeq == seq) {
											item.order = idx;
										}
									});
								});
								overviewDashboardCtrl.config.selectedProcessList.sort(function(a, b){
									return a.order - b.order;
								});

							}
						});
						$('#selectedProcessList').disableSelection();
					}
				});


				let closer = $rootScope.$on('ngDialog.refresh', function (e, id) {
					if (id != popup.id) return;
					closer();
				});



			};

			overviewDashboardCtrl.toggleSelect = function(item){
				item.select = !item.select;
			};


			// Target >>> Select
			overviewDashboardCtrl.passToSelect = function(){
				let _targetProcessList = angular.copy(overviewDashboardCtrl.config.targetProcessList);
				let _selectedProcessList = angular.copy(overviewDashboardCtrl.config.selectedProcessList);

				overviewDashboardCtrl.config.selectedProcessList = [];
				for (let k = 0 ; k < _targetProcessList.length ; k++) {
					if (_targetProcessList[k].select) {
						_targetProcessList[k].select = false;
						_selectedProcessList.push(angular.copy(_targetProcessList[k]));
						_targetProcessList.splice(k,1);
						k--;
					}
				}

				for (let k = 0 ; k < _selectedProcessList.length ; k++) {
					_selectedProcessList[k].order = k;
				}

				overviewDashboardCtrl.config.targetProcessList = _targetProcessList;
				overviewDashboardCtrl.config.selectedProcessList = _selectedProcessList;
			};


			// Select >>> Target
			overviewDashboardCtrl.passToTarget = function(){
				let _targetProcessList = angular.copy(overviewDashboardCtrl.config.targetProcessList);
				let _selectedProcessList = angular.copy(overviewDashboardCtrl.config.selectedProcessList);

				overviewDashboardCtrl.config.targetProcessList = [];
				for (let k = 0 ; k < _selectedProcessList.length ; k++) {
					if (_selectedProcessList[k].select) {
						_selectedProcessList[k].select = false;
						_targetProcessList.push(angular.copy(_selectedProcessList[k]));
						_selectedProcessList.splice(k,1);
						k--;
					}
				}

				for (let k = 0 ; k < _selectedProcessList.length ; k++) {
					_selectedProcessList[k].order = k;
				}

				overviewDashboardCtrl.config.targetProcessList = _targetProcessList;
				overviewDashboardCtrl.config.selectedProcessList = _selectedProcessList;
			}

			// Process 설정 팝업 저장
			overviewDashboardCtrl.saveBtnClickHandler = function(){
				// overviewDashboardCtrl.config.dist
				let param = {};
				param.target = overviewDashboardCtrl.config.targetProcessList;
				param.selected = overviewDashboardCtrl.config.selectedProcessList;
				param.dist = overviewDashboardCtrl.config.dist;
				param.systemSeq = ConfigManager.getSystemSeq();

				// 저장시에는 processSeq 만 전달되어 저장. 20220311 henry
				DataService.httpPost("/dashboard/metric/setProcessConfig", param, function(result){
					if (result.result != 1 || !result.data) return;

					if (overviewDashboardCtrl.config.dist == 'master') {
						overviewDashboardCtrl.grid.master.gridData = result.data;
						$timeout(function(){
							overviewDashboardCtrl.grid.master.gridData = angular.copy(overviewDashboardCtrl.grid.master.gridData);
						}, 100);
					}
					else if (overviewDashboardCtrl.config.dist == 'worker') {
						overviewDashboardCtrl.grid.worker.gridData = result.data;
						$timeout(function(){
							overviewDashboardCtrl.grid.worker.gridData = angular.copy(overviewDashboardCtrl.grid.worker.gridData);
						}, 100);

						// 20220311 henry (PRESTOSERVER -> TRINOSERVER 명칭 변경)
						for (let m = 0 ; m < overviewDashboardCtrl.grid.worker.gridData.length ; m++ ) {
							if(overviewDashboardCtrl.grid.worker.gridData[m].processName == "PRESTOSERVER"){
								overviewDashboardCtrl.grid.worker.gridData[m].processName = "TRINOSERVER";
								break;
							}
						}
					}

					ngDialog.closeAll();
				});
			};


			overviewDashboardCtrl.cancelBtnClickHandler = function(){
				ngDialog.closeAll();
			};

			$scope.showStatusTooltip = function(id){
				$.powerTip.show($('#'+id));
			};
		}]);

});