define(["app", "moment"], function(app, moment) {
	app.controller("JobManagementCtrl", ["$scope", "$rootScope", "ConfigManager", "DataService", "CommonUtil", "ngDialog",
		function($scope, $rootScope, ConfigManager, DataService, CommonUtil, ngDialog) {
			"use strict";

			// property
			var jobManagementCtrl = this;
			var INTERVAL_TIME = (1000 * 30) * 1;
			var TIMER;
			var ENTERPRISE_URL = ConfigManager.getConst("ENTERPRISE_URL_DEV");
			var ENTERPRISE_URL_TEST = "/resources/js/metatron/enterprise/job/test";
			var gridFilter = {tab:"ALL", state:"ALL"};
			var unbind = [];

			jobManagementCtrl.data = {};


			// method
			jobManagementCtrl.jobActionHandler = function(event) {
				if(event == null || event.rowData == null)
					return;

				var target = event.rowData.event.target;
				if(target == null || (target.nodeName != "BUTTON" && target.nodeName != "I"))
					return;

				var confirmResult = false;
				var type = target.textContent;
				var data = event.rowData.data;
				confirm("Do you " + type.toLowerCase() +" the application? [" + data.id + "]");

				if(!confirmResult)
					return;

				executeJobAction(type.toUpperCase(), data);
			};

			jobManagementCtrl.jobDBClickHandler = function(event) {
				if(event == null)
					return;

				var jobInfo = event.data;
				getData("/retryInfo", null, function(rData) {
					_.extend(jobInfo, rData[jobInfo.id]);

					getData("/applicationLog", {id:jobInfo.id}, function(lData) {
						_.extend(jobInfo, {amLog: lData});
						openPopup(jobInfo);
					});
				});
			};;

			jobManagementCtrl.jobFilteringHandler = function(event) {
				if(event == null)
					return;

				gridFilter.state = event.codeValue;
				getJobList();
			};

			jobManagementCtrl.changeTabHandler = function(event) {
				if(event == null)
					return;

				var target = angular.element(event.currentTarget);

				// active 상태 변경
				target.siblings().each(function() {
					$(this).removeClass("active");
				});
				target.addClass("active");

				// grid filter
				var type = (target.text() == null)? "":target.text().toUpperCase();
				gridFilter.tab = type;
				getJobList();
			};


			// event-handler
			function destroy() {
				unbind.forEach(function(fn) {
					fn();
				});
			}


			// function
			function initialize() {
				addEventListener();
				createTimer();
				getJobData();
			}

			function addEventListener() {
				unbind = [
					$scope.$on('$destroy', destroy)
				];
			}

			function createTimer() {
				TIMER = setInterval(getJobData, INTERVAL_TIME);
			}

			function getData(url, param, resultFunction) {
				var result = function(data) {
					if(data == null || data.body == null || data.body.JobHandler == null)
						return;

					var d = data.body.JobHandler;
					resultFunction(d);
				};

				if(param == null) {
					DataService.httpGet(ENTERPRISE_URL + "/job" + url, null, result, false);
				} else {
					DataService.httpPost(ENTERPRISE_URL + "/job" + url, param, result, false);
				}
			}

			function getJobData() {
				// (TODO) Resource Manager
				getData("/clusterMetrics", null, function(data) {
					console.log("enterprise clusterMetrics; ", data);
					jobManagementCtrl.data.metrics = data.clusterMetrics;
					setClusterData();
				});

				getData("/yarnResource", null, function(data) {
					console.log("enterprise yarnResource; ", data);
					jobManagementCtrl.data.yarn = data;
					setNodeManagerData();
				});

				getData("/queueList", null, function(data) {
					parsingQueueData(data.scheduler.schedulerInfo);
					console.log("enterprise queueList; ", data, jobManagementCtrl.data.queues);
				});

				getJobList();
			}

			function getJobList(){
				getData("/applicationList", {"state": gridFilter.state}, function(data) {
					console.log("enterprise applicationList; ", data);
					var jobs = data.apps.app;
					jobManagementCtrl.data.jobs = jobs;
					parsingJobData();
				});
			}

			function parsingQueueData(queues) {
				if(queues == null || Object.keys(queues).length == 0)
					return;

				jobManagementCtrl.data.queues = [];
				parsingChildQueueData(queues["rootQueue"], 0);
			}

			function parsingChildQueueData(queues, depth) {
				if(queues == null || queues.length < 1)
					return;

				if(!angular.isArray(queues))
					queues = [queues];

				var len = queues.length;
				for(var i=0; i<len; i++) {

					// data setting
					var q = queues[i];
					q.minValues = q.minResources.memory + "MB / " + q.minResources.vCores + "vCores";
					q.maxValues = q.maxResources.memory + "MB / " + q.maxResources.vCores + "vCores";
					q.depth = depth;
					jobManagementCtrl.data.queues.push(q);

					// children setting
					var children = q.childQueues;
					if(children == null)
						continue;

					parsingChildQueueData(children, depth+1);
				}
			}

			function parsingJobData() {
				//(TODO) applictionMR

				getData("/retryInfo", null, function(data) {
					console.log("enterprise retryInfo; ", data);
					var list = jobManagementCtrl.data.jobs;
					var len = list.length;
					for(var i=0; i<len; i++) {

						var id = list[i].id;
						if(id == null || id == "")
							continue;

						// map, reduce 데이터 셋팅
						//getData("/applicationMR", {id:id}, function(data) {
						//	console.log("------------------------------------------MR result; ", data);
						//});

						// retry 데이터 셋팅
						var info = data[id];
						if(info == null) {
							list[i].retry = 0;
							continue;
						}
						list[i].retry = info.retryNum;
					}

					if(gridFilter.tab != null && gridFilter.tab == "RETRYED") {
						list = _.filter(list, function(data){
							return (data.retry > 0);
						});
					}

					jobManagementCtrl.applicationGridData = list;
				});
			}

			function setClusterData() {
				if(jobManagementCtrl.data == null || jobManagementCtrl.data.metrics == null)
					return;

				var memTotal = jobManagementCtrl.data.metrics.totalMB;
				var used = memTotal - (jobManagementCtrl.data.metrics.reservedMB
					+ jobManagementCtrl.data.metrics.allocatedMB);

				jobManagementCtrl.data.metrics.totalGB = CommonUtil.formatBytes(memTotal*1024*1024, 2, "GB", false);
				jobManagementCtrl.data.metrics.usedGB = CommonUtil.formatBytes(used*1024*1024, 2, "GB", false);
				makePieMemoryChartData();

				var vCoresTotal = jobManagementCtrl.data.metrics.totalVirtualCores;
				var used2 = vCoresTotal - (jobManagementCtrl.data.metrics.reservedVirtualCores
					+ jobManagementCtrl.data.metrics.allocatedVirtualCores);

				jobManagementCtrl.data.metrics.usedVirtualCores = used2;
				makePieVcoresChartData();
			}

			function getPieChartOption(type, total, used) {
				var unit = "GB";
				if(type.toUpperCase() != "MEMORY")
					unit = "vCores";

				var labelCode = [];
				labelCode.push(total + unit);
				labelCode.push('<span style="color:#777;font-size:14px;">(Used </span>');
				labelCode.push('<span style="color:#2979ff;">' + used + unit + '</span>');
				labelCode.push('<span style="color:#777;font-size:14px;">)</span>');

				var xVal = "13%";
				if(used.length > 1)
					xVal = "16%";

				return {
					"plot": {
						"size": 70,
						"slice": 55,
						"border-width": 2,
						"border-color": "#fff",
						"detach": false,
						"shadow": 0,
						"value-box": {
							"visible": false
						}
					},
					"tooltip": {
						"text": "%t: <strong>%v " + unit + "</strong>",
						"shadow": false,
						"background-color": "#3e3e3e",
						"border-color": "#222",
						"border-width": "1px",
						"border-radius": 3,
						"color": "#fff",
						"callout": true,
						"callout-height": "5px"
					},
					"plotarea": {
						"x": "0",
						"y": "-3%",
						"margin-top":"0",
						"margin-right":"50%",
						"margin-bottom":"0"
					},
					"labels": [
						{
							"x": "45%",
							"y": "38%",
							"fontSize": 16,
							"fontWeight": "bold",
							"fontFamily": "Malgun Gothic",
							"color": "#555",
							"text": type + " Total: "
						},
						{
							"x": "45%",
							"y": "50%",
							"fontSize": 21,
							"fontWeight": "bold",
							"fontFamily": "Malgun Gothic",
							"color": "#00c853",
							"text": labelCode.join('')
						},
						{
							"x": xVal,
							"y": "36%",
							"fontSize": 25,
							"fontWeight": "bold",
							"fontFamily": "Malgun Gothic",
							"text": "%plot-value" + unit,
							"color": "#2979ff",
							"default-value":"(%node-value)(0)(0)"
						},
					]
				};
			}

			function makePieMemoryChartData(){
				var total = jobManagementCtrl.data.metrics.totalGB;
				var used = jobManagementCtrl.data.metrics.usedGB;
				var pieList = [{
					"values": [Number(used)],
					"background-color": "#2979ff",
					"text": "Used"
				}, {
					"values": [Number(total-used)],
					"background-color": "#ddd",
					"text": "Free"
				}];

				jobManagementCtrl.pieMemOption = getPieChartOption("Memory", total, used);
				jobManagementCtrl.pieMemList = pieList;
				ap($scope);
			}

			function makePieVcoresChartData(){
				var total = jobManagementCtrl.data.metrics.totalVirtualCores;
				var used = jobManagementCtrl.data.metrics.usedVirtualCores;
				var pieList = [{
					"values": [Number(used)],
					"background-color": "#2979ff",
					"text": "Used"
				}, {
					"values": [Number(total-used)],
					"background-color": "#ddd",
					"text": "Free"
				}];

				jobManagementCtrl.pievCoresOption = getPieChartOption("vCores", total, used);
				jobManagementCtrl.pievCoresList = pieList;
				ap($scope);
			}

			function executeJobAction(type, data) {
				if(type == "KILL") {
					console.log("------------------------------------------kill");
					//getData("/applicationKill", {"kill": data.id});
				} else if(type == "RETRY") {
					console.log("------------------------------------------retry");
					//(TODO) retry API 추가
				}
			}

			function openPopup(data) {

				// 초기화
				jobManagementCtrl.pop = {jobInfo:{}};
				jobManagementCtrl.pop.viewAMLog = false;
				jobManagementCtrl.pop.jobInfo = data;
				jobManagementCtrl.pop.jobInfo.stateDetailInfo = data.state + " (Started: " + CommonUtil.dateFormatter(data.startedTime) + ")";
				jobManagementCtrl.pop.jobInfo.duration = CommonUtil.durationFormatter(data.elapsedTime);

				var retryStr = "None";
				if(data.retryTime != null && data.retryTime != "" && data.retryNum != 0) {
					var r = data.retryTime.split(",");
					if(r != null && r.length > 1) {
						var last = moment(r[r.length-1], "YYYYMMDDHHmmss").format("YYYY-MM-DD HH:mm:ss");
						//jobManagementCtrl.pop.jobInfo.lastRetryTime = last;
						retryStr = data.retryNum + "times (Last retry: " + last + ")";
					}
				}
				jobManagementCtrl.pop.jobInfo.retryInfo = retryStr;

				var popup = ngDialog.open({
					template: "/enterprise/job/popup/job_info_popup_template.html",
					className: "ngdialog-theme-default custom-width",
					showClose: false,
					disableAnimation: true,
					cache: false,
					closeByDocument: false,
					closeByEscape: false,
					scope: $scope
				});

				var closer = $rootScope.$on('ngDialog.refresh', function(e, id) {
					if (id != popup.id) return;
					closer();
				});
			}

			function setNodeManagerData() {
			}

			initialize();
	}]);
});
