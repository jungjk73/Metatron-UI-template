define([ "app", "moment" ], function(app, moment) {
	app.controller("PrestoStatusCtrl", ["$rootScope", "$scope", "$interval", "$timeout", "DataService", "CommonUtil", "ConfigManager", "GridRenderer", "ngDialog", "WebSocketService",
	    function($rootScope, $scope, $interval, $timeout, DataService, CommonUtil, ConfigManager, GridRenderer, ngDialog, WebSocketService) {
			"use strict";

			// property

			var prestoStatusCtrl = this;
			var systemSeq = "";
			var systemName = "";

			var systemSeqList = [];
			var system_name = [];

			var jobStatusSeries = [];
			var ylabel = [];
			var ruleLable = [];
			var jobElapsed;
			var jobStatusQueue = [];
			var jobStatusMiddleS = {};
			var jobCpuResourceObj = {};
			var jobMemResourceObj = {};
			var date_min ;
			var date_max ;
			const INTERVAL_TIME = 1000 * 60;
			var interval;
			var unbind = [];
			var loader = false;

			var hostList;
			var systemStatusGrid;

			// prestoStatusCtrl.serverActiveCount = 0;
			// prestoStatusCtrl.serverInactiveCount = 0;
			prestoStatusCtrl.serverInactiveGrid = [];
			// prestoStatusCtrl.serverDownCount = 0;
			prestoStatusCtrl.clusterMemoryTotalCount = 0;
			prestoStatusCtrl.clusterMemoryUsedCount = 0;
			prestoStatusCtrl.assignedQueryCount = 0;
			prestoStatusCtrl.outOfMemoryQueryCount = 0;
			prestoStatusCtrl.blockedQueryCount = 0;

			prestoStatusCtrl.statusTopData = {};


			prestoStatusCtrl.jobTypeList = ['info', 'status'];
			prestoStatusCtrl.jobType = prestoStatusCtrl.jobTypeList[0];

			prestoStatusCtrl.viewTypeList = [{label:'Finished', value:'finished'}, {label:'Failed', value:'failed'}, {label:'Running', value:'running'}];
			prestoStatusCtrl.viewType = 'finished';

			// prestoStatusCtrl.sDateTime = moment().subtract(2, 'hour').local().format("YYYY-MM-DD HH:mm");
			// prestoStatusCtrl.eDateTime = moment().local().format("YYYY-MM-DD HH:mm");
			prestoStatusCtrl.searchDate = moment().subtract(2, 'hour').format('YYYY-MM-DD HH:mm');

			prestoStatusCtrl.jobCountTotal = '0';
			prestoStatusCtrl.jobCountFinished = '0';
			prestoStatusCtrl.jobCountFail = '0';

			prestoStatusCtrl.nodeAliveCount = '0';
			prestoStatusCtrl.NodeDeadCount = '0';

			prestoStatusCtrl.prestoServerStatusGridRefresh = true;

			prestoStatusCtrl.prestoServerStatusGrid_finished = [];
			prestoStatusCtrl.prestoServerStatusGrid_failed = [];
			prestoStatusCtrl.prestoServerStatusGrid_running = [];

			prestoStatusCtrl.prestoNodeGrid = [];

			// event-handler

			function destroy() {
				unbind.forEach(function(fn) {
					$interval.cancel(interval);
					ngDialog.closeAll();
					fn();
				});

				$('body').off('DOMNodeInserted', '.ag-header-row');

				prestoStatusCtrl.prestoServerStatusGrid = null;
				prestoStatusCtrl.prestoServerStatusGridColumnDefs = null;
				prestoStatusCtrl.jobStatusChartObj = null;
				prestoStatusCtrl.serverInactiveGrid = null;
				prestoStatusCtrl.rowInputOutputDataSizeChart = null;
				prestoStatusCtrl.processedInputSizeChart = null;
				prestoStatusCtrl.totalTaskChart = null;
				prestoStatusCtrl.cumulateMemoryChart = null;
				prestoStatusCtrl.rowByteInputRateChartData = null;
				prestoStatusCtrl.heapMemoryUsedChartData = null;
				prestoStatusCtrl.heapMemoryUsedChartOption = null;
				prestoStatusCtrl.statusTopData = null;
				prestoStatusCtrl = null;

				systemSeqList = null;
				system_name = null;
				jobStatusSeries = null;
				ylabel = null;
				ruleLable = null;
				jobElapsed = null;
				jobStatusQueue = null;
				jobStatusMiddleS = null;
				jobCpuResourceObj = null;
				jobMemResourceObj = null;
			}

			function addEventListener() {
				unbind = [
					$scope.$on(ConfigManager.getEvent("CHANGE_SYSTEM_SEQ_EVENT"), onChangeSystemGroupIdEventHandler),
					$scope.$on(ConfigManager.getEvent("GET_SYSTEM_STATUS_GRID_EVENT"), getSystemStatusGridEventHandler),
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
				systemSeq = ConfigManager.getSystemSeq();
				systemName = ConfigManager.getSystemName();

				getPrestoServerStatus();
				$interval.cancel(interval);
				createTimer();
			}


			// method

			function getPrestoServerStatus(){
				getServerActiveInactive();		// Server Active 갯수 Inactive 갯수, Inactive 리스트
			}

			/**
			 * Presto Server Status Grid
			 */
			function getPrestoServerStatusGrid() {
				var param = {};
				param.systemSeq = ConfigManager.getSystemSeq();
				// param.sdate = prestoStatusCtrl.sDateTime;
				// param.edate = prestoStatusCtrl.eDateTime;
				param.sdate = prestoStatusCtrl.searchDate;
				param.edate = moment(prestoStatusCtrl.searchDate).add(2, 'hour').format('YYYY-MM-DD HH:mm');
				param.partition = getPartition();

				// DataService.httpPost('/service/presto/getPrestoServerStatusGrid', {seqList : systemSeqList}, function(result){
				DataService.httpPost('/service/presto/getPrestoServerStatusGrid', param, function (result) {     // 2016. 12. 29 변경 . Active Server의 seq를 넣지 말고 PRESTO 이면서 COORDINATOR 인 sys seq 를 넣기로 함
					console.log('/service/presto/getPrestoServerStatusGrid :', param, result);
					if (result.data) {
						// console.log(result.data);
						// result.data.prestoServerStatusGrid_finished
						// result.data.prestoServerStatusGrid_failed
						// result.data.prestoServerStatusGrid_running
						prestoStatusCtrl.prestoServerStatusGrid_finished = result.data.prestoServerStatusGrid_finished;
						prestoStatusCtrl.prestoServerStatusGrid_failed = result.data.prestoServerStatusGrid_failed;
						prestoStatusCtrl.prestoServerStatusGrid_running = result.data.prestoServerStatusGrid_running;
					}
				});
			}

			function getPrestoServerStatusNode(){
				var parma = {};

				DataService.httpPost('/service/presto/getPrestoServerNodeGrid', param, function (result) {

				});
			}

			function getServerActiveInactive(){
				//DataService.httpPost("/service/presto/getStatusCountList", {}, function(result){

					// logic 변경
					/*if(result.data) {
						prestoStatusCtrl.serverActiveCount = result.data.activeInactiveNodeCount == null ? '0' : result.data.activeInactiveNodeCount[0].activenodecount;
						prestoStatusCtrl.serverInactiveCount = result.data.activeInactiveNodeCount == null ? '0' : result.data.activeInactiveNodeCount[0].inactivenodecount;

						if (result.data.inactiveServerInfo)
							prestoStatusCtrl.serverInactiveGrid = result.data.inactiveServerInfo;
					}*/

					getPrestoServerStatusGrid();	// Presto Server Status Grid
					getSystemStatusGrid();

					// logic 변경
					// getJobCount24H();
					getJobCount();
					getNodeCount();
					getMemBarChartData();

				// });
			}

			/**
			 * 24시간동안의 JobCount
			 * Total / Fail / Drop
			 */
			/*function getJobCount24H() {
                var param = {};
                param.systemSeq = ConfigManager.getSystemSeq();
                param.partition = getPartition();
				DataService.httpPost("/service/presto/getJobCount24H", param, function(result){

					prestoStatusCtrl.jobCount24H_total = result.data.jobCount24H_total == null ? '0' : result.data.jobCount24H_total;
					prestoStatusCtrl.jobCount24H_fail = result.data.jobCount24H_fail == null ? '0' : result.data.jobCount24H_fail;
					prestoStatusCtrl.jobCount24H_drop = result.data.jobCount24H_drop == null ? '0' : result.data.jobCount24H_drop;

				});
			}*/
			function getJobCount() {
			 var param = {};
			 param.systemSeq = ConfigManager.getSystemSeq();
			 param.partition = getPartition();
			 param.sdate = prestoStatusCtrl.searchDate;
			 param.edate = moment(prestoStatusCtrl.searchDate).add(2, 'hour').format('YYYY-MM-DD HH:mm');

			 DataService.httpPost("/service/presto/getJobCount", param, function(result){
				 console.log("/service/presto/getJobCount", param, result);

				 prestoStatusCtrl.jobCountTotal = result.data.count[0].TOTAL == null ? '0' : result.data.count[0].TOTAL;
				 prestoStatusCtrl.jobCountFinished = result.data.count[0].FINISHED == null ? '0' : result.data.count[0].FINISHED;
				 prestoStatusCtrl.jobCountFail = result.data.count[0].FAILED == null ? '0' : result.data.count[0].FAILED;

			 });
			}


			function getMemBarChartData() {
				var param = {};
				param.systemSeq = ConfigManager.getSystemSeq();

				DataService.httpPost("/service/presto/getMemBarChartData", param, function(result){
					console.log("/service/presto/getMemBarChartData", param, result);
					if (result.result != 1)
						return;

					prestoStatusCtrl.statusTopData.mem_free_percent = result.data.count[0].MEM_FREE_PERCENT == null ? '0' : result.data.count[0].MEM_FREE_PERCENT;
					prestoStatusCtrl.statusTopData.mem_presto_percent = result.data.count[0].MEM_PRESTO_PERCENT == null ? '0' : result.data.count[0].MEM_PRESTO_PERCENT;
					prestoStatusCtrl.statusTopData.mem_used_percent = result.data.count[0].MEM_USED_PERCENT == null ? '0' : result.data.count[0].MEM_USED_PERCENT;

					let mem_used = result.data.count[0].MEM_USED == null ? '0' : result.data.count[0].MEM_USED;
					let mem_free = result.data.count[0].MEM_FREE == null ? '0' : result.data.count[0].MEM_FREE;
					let mem_presto = result.data.count[0].MEM_PRESTO == null ? '0' : result.data.count[0].MEM_PRESTO;

					prestoStatusCtrl.statusTopData.mem_used = CommonUtil.formatBytes(mem_used*1024*1024, 2, 'TB');
					prestoStatusCtrl.statusTopData.mem_free = CommonUtil.formatBytes(mem_free*1024*1024, 2, 'TB');
					prestoStatusCtrl.statusTopData.mem_presto = CommonUtil.formatBytes(mem_presto*1024*1024, 2, 'TB');

				});
			}

			function getNodeCount() {
				DataService.httpPost("/service/presto/getNodeCount", {}, function(result){
					console.log("/service/presto/getNodeCount", result);

					prestoStatusCtrl.nodeAliveCount = result.data.count[0].ALIVE == null ? '0' : result.data.count[0].ALIVE;
					prestoStatusCtrl.NodeDeadCount = result.data.count[0].DEAD == null ? '0' : result.data.count[0].DEAD;
				});

			}

			function getSystemStatusGrid () {
				var g_param = { "function": "getSystemStatusGrid","resultEvent": "GET_SYSTEM_STATUS_GRID_EVENT", "systemSeq": systemSeq };
				WebSocketService.callRequest(g_param);
			}

			function getSystemStatusGridEventHandler(event , data) {
				console.log("prestoStatusCtrl.getSystemStatusGridEventHandler :", event, data);

				if(data.hasOwnProperty("exceptionMassage")) {
					data.searchResults = null;
					return;
				}

				systemStatusGrid = data.searchResults;

				// getStatusHostsList();
			}

			function getStatusHostsList() {
				var param = {};
				param.systemSeq = systemSeq;
				DataService.httpPost("/activities/system/status/status_hosts_list", param, getStatusHostListResult,loader);
			}

			function getStatusHostListResult(data) {
				console.log("/activities/system/status/status_hosts_list", data);

				if(!data.data.appl)
					return;

				hostList = data.data.appl;

				var gridObj = systemStatusGrid;
				var hostGridData = [];
				var host_len = hostList.length;
				for(var i = 0 ; i <  host_len; i++) {
					 var hostObj = hostList[i];
					 for (var k in gridObj){
						 if(k.toUpperCase() == hostObj.system_name) {
							angular.merge(hostObj, gridObj[k]);
						 }
					 }

					 hostGridData.push(hostObj);
				}

				hostGridData = _.groupBy(hostGridData , "system_name");
				 var hostGrid = [];
				 for(var host in  hostGridData) {
					 var d = hostGridData[host][0];
					 hostGrid.push(d);
				 }

				 // TODO. sm_presto_node 테이블과 mapping

				prestoStatusCtrl.prestoNodeGrid = [];
				prestoStatusCtrl.prestoNodeGrid = hostGrid;
			}

			prestoStatusCtrl.changeJobType = function (type) {
				console.log("prestoStatusCtrl.changeJobType :", type);
				prestoStatusCtrl.jobType = type;

				refreshPrestoServerStatusGrid();
			};

			/*prestoStatusCtrl.changeDate = function (e) {
				console.log("prestoStatusCtrl.changeDate :", e, prestoStatusCtrl.sDateTime, prestoStatusCtrl.eDateTime);
				getPrestoServerStatusGrid();
			};*/

			prestoStatusCtrl.changeDate = function (direction) {
				if (direction == 'backward') {
					prestoStatusCtrl.searchDate = moment(prestoStatusCtrl.searchDate).add(-1, 'hour').format('YYYY-MM-DD HH:mm');
				} else {
					prestoStatusCtrl.searchDate = moment(prestoStatusCtrl.searchDate).add(1, 'hour').format('YYYY-MM-DD HH:mm');
				}

				getPrestoServerStatusGrid();
				getJobCount();
			};

			prestoStatusCtrl.changeViewType = function(e){
				console.log("prestoStatusCtrl.changeViewType :", e.value);
				prestoStatusCtrl.viewType = e.value;

				refreshPrestoServerStatusGrid();
			};

			/**
			 * Alive Node 클릭한 경우 팝업으로 상태 그리드
			 */
			prestoStatusCtrl.showNodeStatusGrid = function () {
				getStatusHostsList();

				var popup = ngDialog.open({
					template: "/service/presto/popup/alive_node_grid_popup_template.html",
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
			};

			/**
			 * 팝업 닫기
			 */
			prestoStatusCtrl.closeDialog = function(){
				ngDialog.closeAll();

			};

			function refreshPrestoServerStatusGrid() {
				// prestoStatusCtrl.prestoServerStatusGridRefresh = !prestoStatusCtrl.prestoServerStatusGridRefresh;
				prestoStatusCtrl.prestoServerStatusGridRefresh = true;
				$timeout(function() {
					prestoStatusCtrl.prestoServerStatusGridRefresh = false;
				}, 0);
			}

			/**
			 * Grid Text 가운데 정렬
			 */
			function textAlignCenterRenderer(params) {
                if(params == null || params.data == null)
                    return '';

                var col = params.column.colId;
                var val = params.data[col] == null ? '' : params.data[col];

				var txtClass = '';
				if (params.data.state == 'inactive') {
					txtClass = 'txt-red';
				}

                return "<div style='text-align : center;'><span class='"+txtClass+"'>" + val + "</span></div>";
            }

			/**
			 * SQL PARTITION
			 */
            function getPartition() {
                var partition_arr = [];
                // var preDate = moment(new Date());
                // preDate = moment(preDate).add(-1, 'days');
                // partition_arr.push("P" + moment(preDate).format('YYYYMMDD'));
                // partition_arr.push("P" + moment().format('YYYYMMDD'));
				// partition_arr.push("P" + moment(prestoStatusCtrl.sDateTime).format('YYYYMMDD'));
				// partition_arr.push("P" + moment(prestoStatusCtrl.eDateTime).format('YYYYMMDD'));
				partition_arr.push("P" + moment(prestoStatusCtrl.searchDate).format('YYYYMMDD'));
				partition_arr.push("P" + moment(prestoStatusCtrl.searchDate).add(2, 'hour').format('YYYYMMDD'));

                return partition_arr.join(",");
            }

			function initialize() {
				systemSeq = ConfigManager.getSystemSeq();
				systemName = ConfigManager.getSystemName();

				prestoStatusCtrl.jobInfoUpperGridColumnDefs = [
					{ headerName: "User Address", field: "start_time", cellRenderer:textAlignCenterRenderer, width: 130 },
					{ headerName: "Job Count", field: "finish_time", cellRenderer:textAlignCenterRenderer, width: 130 },
					{ headerName: "Finish Count", field: "query", cellRenderer:textAlignCenterRenderer, width: 130 },
					{ headerName: "Fail Count", field: "elapsed", cellRenderer:textAlignCenterRenderer, width: 130 },
					{ headerName: "Avg.RunningTime", field: "remoteUserAddress", cellRenderer:textAlignCenterRenderer, width: 130 },
					{ headerName: "Avg.Memory", field: "remoteUserAddress", cellRenderer:textAlignCenterRenderer, width: 130 }
				];

				prestoStatusCtrl.jobInfoLowerGridColumnDefs = [
					{ headerName: "UserID", field: "start_time", cellRenderer:textAlignCenterRenderer, width: 130 },
					{ headerName: "Job Count", field: "finish_time", cellRenderer:textAlignCenterRenderer, width: 130 },
					{ headerName: "Finish Count", field: "query", cellRenderer:textAlignCenterRenderer, width: 130 },
					{ headerName: "Fail Count", field: "elapsed", cellRenderer:textAlignCenterRenderer, width: 130 },
					{ headerName: "Avg.RunningTime", field: "remoteUserAddress", cellRenderer:textAlignCenterRenderer, width: 130 },
					{ headerName: "Avg.Memory", field: "remoteUserAddress", cellRenderer:textAlignCenterRenderer, width: 130 }
				];

				prestoStatusCtrl.prestoServerStatusGridColumnDefs_finished = [
					{ headerName: "Start Time", field: "start_time", cellRenderer:textAlignCenterRenderer, width: 130 },
					{ headerName: "Finished Time", field: "finish_time", cellRenderer:textAlignCenterRenderer, width: 130 },
					{ headerName: "Query", field: "query", cellRenderer:textAlignCenterRenderer, width: 130 },
					{ headerName: "RunningTime(s)", field: "elapsed", cellRenderer:textAlignCenterRenderer, width: 130 },
					{ headerName: "UserAddress", field: "remoteUserAddress", cellRenderer:textAlignCenterRenderer, width: 130 }
				];

				prestoStatusCtrl.prestoServerStatusGridColumnDefs_failed = [
					{ headerName: "Start Time", field: "start_time", cellRenderer:textAlignCenterRenderer, width: 130 },
					{ headerName: "Finished Time", field: "finish_time", cellRenderer:textAlignCenterRenderer, width: 130 },
					{ headerName: "Query", field: "query", cellRenderer:textAlignCenterRenderer, width: 130 },
					{ headerName: "ErrorName", field: "errorName", cellRenderer:textAlignCenterRenderer, width: 130 },
					{ headerName: "ErrorType", field: "errorType", cellRenderer:textAlignCenterRenderer, width: 130 },
					{ headerName: "UserAddress", field: "remoteUserAddress", cellRenderer:textAlignCenterRenderer, width: 130 }
				];

				prestoStatusCtrl.prestoServerStatusGridColumnDefs_running = [
					{ headerName: "Start Time", field: "start_time", cellRenderer:textAlignCenterRenderer, width: 130 },
					{ headerName: "Query", field: "query", cellRenderer:textAlignCenterRenderer, width: 130 },
					{ headerName: "UserAddress", field: "remoteUserAddress", cellRenderer:textAlignCenterRenderer, width: 130 }
				];

				prestoStatusCtrl.prestoNodeGridColumnDefs = [
					{ headerName: "Host Name", field: "system_name", cellRenderer:textAlignCenterRenderer, width: 100 },
					{ headerName: "IP Address", field: "system_ip", cellRenderer:textAlignCenterRenderer, width: 100 },
					{ headerName: "CPU Usage", field: "CPU_USAGE", cellRenderer:GridRenderer.HpercentBarFormatter, width: 100 },
					{ headerName: "MEM Usage", field: "MEM_USAGE", cellRenderer:GridRenderer.HpercentBarFormatter, width: 100 },
					{ headerName: "JobFail", field: "jobFail", cellRenderer:textAlignCenterRenderer, width: 100 },
					{ headerName: "TimeOut", field: "timeOut", cellRenderer:textAlignCenterRenderer, width: 100 },
					{ headerName: "EndOfFile", field: "endOfFile", cellRenderer:textAlignCenterRenderer, width: 100 },
					{ headerName: "ConnectionError", field: "connectionError", cellRenderer:textAlignCenterRenderer, width: 100 }
				];


				// $(".date").datepicker({ dateFormat: 'yy-mm-dd' });

				addEventListener();
				getPrestoServerStatus();
				createTimer();

			}


			function createTimer() {
				interval = $interval(getPrestoServerStatus, INTERVAL_TIME);
			}

			initialize();

	}]);
});