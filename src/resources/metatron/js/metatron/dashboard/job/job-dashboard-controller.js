define(["app", "moment"], function (app, moment) {
	app.controller("JobDashboardCtrl", ["$scope", "$rootScope", "ConfigManager", "WebSocketService", "DataService", "ngDialog", "$interval", "$timeout", "$http",  function ($scope, $rootScope, ConfigManager, WebSocketService, DataService, ngDialog, $interval, $timeout, $http) {
		"use strict";

		var jobDashboardCtrl = this;
		var unbind = [];
		var systemSeq = "";
		var TIMER;
		var INTERVAL_TIME = 1000 * 60;
		// var INTERVAL_TIME = 100000 * 60;
		var loader = true;
		var jobStatusSeries = [];
		var jobCountSeries = [];
		var jobStatusQueue = [];
		var jobApplication = [];
		var jobStatusMiddleS = {};
		var jobCpuResourceObj = {};
		var jobElapsed;
		var date_min;
		var date_max;
		var type = "MR";
		var param = {};
		var ylabel = [];
		var ruleLable = [];
		var statusCodeList = null;
		var colorArr = ['#ff3d00', '#00c853', '#29c5ff', '#d500f9', '#e76049', '#ffea00', '#ffc000', '#ff6600', '#2979ff', '#5d9cec', '#888', '#575757'];
		var loader = true;


		let mySpinner = null;
		let mySpinnerTarget = null;
		let myBlockUI = null;
		
		jobDashboardCtrl.statusLengend = [];

		var jobCountPalette = {
			spark: "#ff6600",
			druid: "#29c5ff",
			hive: "#ffea00",
			mr: "#00c853",
			prestoserver: "#ff3d00",
			cpu: "#888888"
		};

		let jobConfigTemp = {};
		let jobConfigLatencyTemp = {};

		// property
		jobDashboardCtrl.jobCountChartObj = {};
		jobDashboardCtrl.jobStatusChartObj = {};
		jobDashboardCtrl.jobLatencyChartObj = {};
		jobDashboardCtrl.jobStatusH = "440";
		jobDashboardCtrl.jobTotalObj = {};

		jobDashboardCtrl.viewType = "count";
		jobDashboardCtrl.activeClassLatency = "";
		jobDashboardCtrl.activeClassCount = "active";

		jobDashboardCtrl.selectedLegend = []; // Job Count legend 선택 값.

		/*** Hive Data Show YN **/
		jobDashboardCtrl.hiveDdlViewYn = 'Y';
		getCommonCode('UI_VISIBLE_STATUS');
		function getCommonCode(value) {
      DataService.httpPost("/common/getCommonCode", {type: value}, function(data){                
        if (data == null || data.data == null)
      	  return;
      	var code = _.findWhere(data.data, {codeName: 'HIVE_DDL'});
      	if(code) {
      		jobDashboardCtrl.hiveDdlViewYn = code.codeValue;
      	}        
      });
    } 
    /*** Hive Data Show YN End **/


    /*** Excel DownLoad ***/


    jobDashboardCtrl.excelDownload = function() {
    	param = {};
			param.systemSeq = systemSeq;
			param.partition = getPartition();
			param.type = type;
			
		  $http({
		    method: 'POST',
		    url: '/dashboard/job/excelDownload',
		    responseType: 'arraybuffer', // We get response message which is written by binary data from server.
		    headers: {
		      'Accept': 'application/vnd.ms-excel',
		    },
		    params: param
		  }).success(function(data, status, headers, config) {
		    var fileName = 'job.xlsx';
		    var blob = new Blob([data], {
		      type: 'application/vnd.ms-excel;charset=UTF-8'
		    });
		    var objectUrl = (window.URL || window.webkitURL).createObjectURL(blob);
		    if (typeof window.navigator.msSaveBlob !== 'undefined') {
		      window.navigator.msSaveBlob(blob, fileName);
		    } else {
		      var link = angular.element('<a/>');
		      link.attr({
		        href: objectUrl,
		        download: fileName
		      })[0].click();
		    }
		  }).error(function(response, status, headers, config) {

		  });
		}

		function destroy() {
			unbind.forEach(function (fn) {
				fn();
			});

			ngDialog.closeAll();
			$interval.cancel(TIMER);

			TIMER = null;
			INTERVAL_TIME = null;

			hideMySpinner();

			//'.mu-row').html('');
		}

		// method

		//Job Count or Job Latency
		jobDashboardCtrl.changeViewType = function (type, event) {
			jobDashboardCtrl.viewType = type;
			jobDashboardCtrl.activeClassCount = "";
			jobDashboardCtrl.activeClassLatency = "";

			if (type == "count")
				jobDashboardCtrl.activeClassCount = "active";
			else
				jobDashboardCtrl.activeClassLatency = "active";
		};

		//Mr Job or All Job
		jobDashboardCtrl.jobStatusChange = function (event, str) {
			var target = angular.element(event.currentTarget);
			target.addClass("active");
			target.siblings().removeClass("active");
			type = str;
			param.type = str;
			jobDashboardCtrl.jobStatusChartObj = {};
			loader = true;
			getJobStatusChart();
		};

				
		jobDashboardCtrl.legendClickHandler = function (event, value) {

			var target = $(event.currentTarget);
			var strong = target.find('strong');
			if (strong.hasClass('txt-lightgray')) {
				strong.removeClass('txt-lightgray');
				jobDashboardCtrl.selectedLegend = _.without(jobDashboardCtrl.selectedLegend, value);
			} else {
				strong.addClass('txt-lightgray');
				jobDashboardCtrl.selectedLegend.push(value);
				
			}

			getSocketData();
			if(jobDashboardCtrl.selectedLegend.length == 0) {				
				createTimer();
			}else {
				$interval.cancel(TIMER);
			}
			
		};

		//Status Legend Click
		jobDashboardCtrl.jobStatusLegendClickHandler = function (event, value) {
			showMySpinner();
			var s = jobDashboardCtrl.statusLengend;
			var idx = _.indexOf(s, value);
			var target = $(event.currentTarget);
			var strong = target.find('span');
			var em = target.find('em');
			if (strong.hasClass('txt-lightgray')) {
				strong.removeClass('txt-lightgray');
				s.push(value);
			} else {
				strong.addClass('txt-lightgray');
				s.splice(idx, 1);
			}

			if (em.hasClass('bg-lightgray')) {
				em.removeClass('bg-lightgray');
			} else {
				em.addClass('bg-lightgray');
			}

			settingMarkerVisible();
		};

		//Job Status Chart By Legend Visible
		function settingMarkerVisible() {
			var s = jobDashboardCtrl.jobStatusChartObj.series;
			var len = s.length;

			for (var i = 0; i < len; i++) {
				var obj = s[i];
				if (obj.type == "line") {
					obj.visible = false;

					for (var k = 0; k < jobDashboardCtrl.statusLengend.length; k++) {
						var value = jobDashboardCtrl.statusLengend[k];
						if (getCodeValueByState(obj["data-status"]) == value) {
							obj.visible = true;
						}
					}
				} else {
					var status = obj["data-status"];
					var visible = obj["data-visible"];
					var status_len = status.length;
					for (var j = 0; j < status_len; j++) {
						visible[j] = false;

						for (var k = 0; k < jobDashboardCtrl.statusLengend.length; k++) {
							var value = jobDashboardCtrl.statusLengend[k];
							if (getCodeValueByState(status[j]) == value) {
								visible[j] = true;
							}
						}
					}
				}
			}

			jobDashboardCtrl.jobStatusChartRefresh = !jobDashboardCtrl.jobStatusChartRefresh;
			hideMySpinner();
		}

		//Job Status Chart Mouse Event Handler
		jobDashboardCtrl.jobStatusChartNodeOver = function (event) {
			var target = $(document.getElementsByClassName("statustip"));
			var chart = $(document.getElementsByClassName("statuschart"));
			var positionX = event.ev.pageX - 90;
			target.css("left", positionX);
			target.css("display", "block");
			target.css("top", (chart.offset().top + 40) + "px");
			jobDashboardCtrl.tooltipText = event["data-startT"];
			ap($scope);
		};

		jobDashboardCtrl.jobStatusChartNodeOut = function (event) {
			var target = $(document.getElementsByClassName("statustip"));
			target.css("display", "none");
		};

		jobDashboardCtrl.jobStatusChartNodeClick = function (event) {

			if(ngDialog.getOpenDialogs().length > 0) return;	// 팝업 중복 open 방지
			
			var currentDate = moment(event['data-startT']);
			var node_param = {};
			node_param.partition = "P" + moment(currentDate).format('YYYYMMDD');
			node_param.jobId = event['data-jobid'];
			node_param.state = event['data-status'];
			node_param.user_name = event['data-user'];
			node_param.submitTime = event['data-startT'];
			node_param.systemSeq = systemSeq;
			node_param.partition = getPartition();


			var httpURL = "";
			var template = "";

			//if ( type == "TRINO" || type == "presto" || node_param.user_name == 'presto') {
			if((node_param.jobId).indexOf("application") < 0){  // jobId가 'application' 으로 시작하지 않으면 presto job 으로 간주함.
				httpURL = "/dashboard/job/get-presto-detail";
				template = "/activities/job/popup/job_presto_info_popup_template.html";
			}
			//  else if (node_param.user_name == 'hive') {
			// 	httpURL = "/dashboard/job/get-" + node_param.user_name + "-detail";
			// 	template = "/dashboard/job/pop/job_" + node_param.user_name + "_info_dashboard_popup_template.html";
			else {
				httpURL = "/dashboard/job/get-yarn-detail";
				template = "/activities/job/popup/job_info_popup_template.html";
			}

			if (node_param.state == 'RUNNING' || node_param.state == 'ACCEPTED' || node_param.state == 'SUBMIT')
				node_param.queryMode = 'running';
			else node_param.queryMode = 'job';


			DataService.httpPost(httpURL, node_param, function (data) {
				var popInfo = data.data;
				if (!popInfo) {
					alert('[ ' + node_param.jobId + ' ]\nNo data at this time. Maybe state has changed or removed.');
					return;
				}
				var popup = ngDialog.open({
					template: template,
					className: "ngdialog-theme-default custom-width",
					showClose: false,
					disableAnimation: true,
					cache: false,
					closeByDocument: false,
					closeByEscape: false,
					scope: $scope
				});

				let __timer = $timeout(function () {
					$rootScope.$broadcast(ConfigManager.getEvent("JOB_DETAIL_POPUP"), popInfo);
					$timeout.cancel(__timer);
				}, 500);

				var closer = $rootScope.$on('ngDialog.refresh', function (e, id) {
					if (id != popup.id) return;
					closer();
				});
			}, false);
		};

		jobDashboardCtrl.updateElapsed = function () {
			var p = {};

			if (jobDashboardCtrl.jobConfigPopupStr == "status") {
				p = jobDashboardCtrl.jobConfig;
				if (param.type == "ALL")
					p.type = "statusALL";
				else
					p.type = jobDashboardCtrl.jobConfigPopupStr;

				if (!p.time_interval)
					p.time_interval = ConfigManager.getConst("DEFAULT_TIME_INTERVAL");
				if (!p.bar_elapsed)
					p.bar_elapsed = ConfigManager.getConst("DEFAULT_BAR_ELAPSED");
				if (!p.elapsed)
					p.elapsed = ConfigManager.getConst("DEFAULT_ELAPSED");

			} else {
				p = jobDashboardCtrl.jobConfigLatency;
				p.type = jobDashboardCtrl.jobConfigPopupStr;
			}


			p.systemSeq = systemSeq;

			DataService.httpPost("/dashboard/job/update-elapsed", p, function (data) {
				ngDialog.closeAll();
				loader = true;
				getData();
			}, loader);
		};

		jobDashboardCtrl.closeThisDialog = function() {

			jobDashboardCtrl.jobConfig = angular.copy(jobConfigTemp);
			jobDashboardCtrl.jobConfigLatency = angular.copy(jobConfigLatencyTemp);
			
			ngDialog.closeAll();
		};

		jobDashboardCtrl.jobConfigPopup = function (type) {

			if(jobDashboardCtrl.viewType == 'count' && type == 'latency') return;

			jobDashboardCtrl.jobConfigPopupStr = type;
			//admin 사용자만 변경가능함.
			var popup = ngDialog.open({
				template: "/common/job_config_template.html",
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

			var closer = $rootScope.$on('ngDialog.destroy', function (e, id) {
				if (id != popup.id) return;
				closer();
			});
		};

		jobDashboardCtrl.jobStatustChartZoomOut = function () {
			let temp = zingchart.exec("jobStatusChart", 'getseriesvalues', {});
			if (temp && temp.length > 0)
				zingchart.exec("jobStatusChart", 'viewall');
		};

		jobDashboardCtrl.jobCountChartZoomOut = function () {
			if (jobDashboardCtrl.viewType == "count") {
				let temp = zingchart.exec("jobCountChart", 'getseriesvalues', {});
				if (temp && temp.length > 0)
					zingchart.exec("jobCountChart", 'viewall');
			}
			else {
				let temp = zingchart.exec("jobLatencyChart", 'getseriesvalues', {});
				if (temp && temp.length > 0)
					zingchart.exec("jobLatencyChart", 'viewall');
			}
		};

		//Job Status chart window Min Max
		jobDashboardCtrl.jobStatusDivZoom = function (event) {
			var target = $(event.currentTarget);
			var target_i = target.find("i");
			if (target_i.hasClass('zoom')) {
				target_i.removeClass("zoom");
				target_i.addClass("expand");
				$('.job-status').animate({'top': '302px'}, 500);
				$('.job-status .cont-area').animate({'height': '501px'}, 500);
				jobDashboardCtrl.jobStatusH = "440";
			} else {
				target_i.removeClass("expand");
				target_i.addClass("zoom");
				$('.job-status').animate({'top': '0'}, 500);
				$('.job-status .cont-area').animate({'height': '834px'}, 500);
				jobDashboardCtrl.jobStatusH = "750";
			}
		};

		// change Cluster
		function onChangeSystemGroupIdEventHandler(event, data) {
			if (data == null)
				return;

			loader = true;
			systemSeq = ConfigManager.getSystemSeq();
			// getData();
			getSocketData();
		}

		// function
		function initialize() {
			systemSeq = ConfigManager.getSystemSeq();

			addEventListener();
			getStatusCode();
		}

		function getSocketData() {
			showMySpinner();
			var s_param = {
				"function": "getJobDashboard",
				"resultEvent": "GET_JOB_DASHBOARD_EVENT",
				"systemSeq": systemSeq
			};
			WebSocketService.callRequest(s_param);
			//getData();			
		}

		function onWebsocketDataReceiveEventHandler(event, data) {
			if (data.hasOwnProperty("exceptionMassage") || !data.hasOwnProperty("searchResults")) {
				jobCpuResourceObj = {};
			} else {
				jobCpuResourceObj = {
					type: "line",
					scales: "scaleX, scaleY2",
					values: data.searchResults.CPU_RESOURCE,
					text: "CPU Usage",
					tooltip: {"visible": false},
					lineColor: "#888888",
					lineWidth: 0.5,
					alpha: 0.3,
					marker: {
						visible: true,
						lineColor: '#888888',
						backgroundColor: '#888888',
						borderColor: '#888888',
						size: 1
					},
					guideLabel: {
						"text": "%t : %V",
						"font-color": "#888888",
						"border-color": "#888888",
						"background-color": "#fff"
					}
				};
			}

			//소켓 데이터 받아오고 나서 DB 데이터받아옴
			getData();
		}

		function getPartition() {
			var partition = "";
			var partition_arr = [];
			var preDate = moment(new Date());
			preDate = moment(preDate).add(-1, 'days');
			partition_arr.push("P" + moment(preDate).format('YYYYMMDD'));
			partition_arr.push("P" + moment().format('YYYYMMDD'));
			partition = partition_arr.join(",");
			return partition;
		}

		function getData() {
			param = {};
			param.systemSeq = systemSeq;
			param.partition = getPartition();
			param.type = type;
			DataService.httpPost("/dashboard/job/getJobCountChart", param, function (data) {


				 jobApplication = [];
				_.each(data.data.appl, function(obj){
					if(_.indexOf(jobDashboardCtrl.selectedLegend, obj.app) === -1) {
						jobApplication.push(obj);
					}
				})


				var filterCount_list = [];
				_.each(data.data.count_list, function(obj){					
					for( var key in obj ) {
					  if(_.indexOf(jobDashboardCtrl.selectedLegend, key)  === -1) {
					  	filterCount_list.push(obj);
					  }
					}
				});
			
				jobDashboardCtrl.jobCountChartObj = createJobCountChartObj(filterCount_list);
				jobDashboardCtrl.jobTotalObj = data.data.count_total;
				jobDashboardCtrl.jobStatusAllQueue = data.data.all_queue;

				if (!jobDashboardCtrl.jobLatencyChartObj || !jobDashboardCtrl.jobLatencyChartObj.type)
					createJobLatencyChartObj();

				getJobStatusChart();
				jobApplication = null;

				hideMySpinner();
			}, loader);
		}

		
		function getJobStatusChart() {
			DataService.httpPost("/dashboard/job/getJobStatusChart", param, function (data) {
				if (data.data == null || data.data.elapsed_status == null) {
					jobDashboardCtrl.jobStatusChartObj = {};
					jobDashboardCtrl.jobLatencyChartSource = [];
					return;
				}
				jobElapsed = data.data.elapsed_status.bar_elapsed;
				jobStatusQueue = data.data.queue;

				jobDashboardCtrl.jobConfig = data.data.elapsed_status;
				jobDashboardCtrl.jobConfigLatency = data.data.elapsed_latencty;

				jobConfigTemp = angular.copy(data.data.elapsed_status);
				jobConfigLatencyTemp = angular.copy(data.data.elapsed_latencty);

				jobDashboardCtrl.jobStatusChartObj = {};
				jobDashboardCtrl.jobStatusChartObj = createJobStatusChartObj();

				loader = false;
				jobStatusQueue = null;

				getJobLatencyChart();

				//Job Status Legend 선택된 값에 따라 visible
				settingMarkerVisible();
			}, loader);
		}

		function getJobLatencyChart() {
			// if (jobDashboardCtrl.jobConfigLatency == null) return;
			param.job_name = jobDashboardCtrl.jobConfigLatency != null && jobDashboardCtrl.jobConfigLatency.job_name != null ? jobDashboardCtrl.jobConfigLatency.job_name : '';
			DataService.httpPost("/dashboard/job/getJobLatencyChart", param, getJobLatencyChartResult, loader);
		}

		function getJobLatencyChartResult(data) {
			var now = new Date().getTime();
			date_max = now;
			date_min = now - (60000 * 60 * 24);

			var series_value;

			if (data.data)
				series_value = data.data.data;
			else
				series_value = {};


			if (series_value == null || series_value.dataMap == null) {
				jobDashboardCtrl.jobLatencyChartSource = [];
				return;
			}

			var jobLatencyChartData = [];
			let keySet = Object.keys(series_value.dataMap);
			for (let i = 0, j = keySet.length; i < j; i++) {
				let jobName = keySet[i];
				let color = colorArr[i] == null ? colorArr[i - colorArr.length] : colorArr[i];

				let sv = {};
				sv.lineColor = color;
				sv.lineWidth = '1px';
				sv.values = series_value.dataMap[jobName];
				sv.text = jobName;
				sv.tooltip = {visible: false};
				sv.visible = true;
				sv.marker = {
					visible: true,
					lineColor: color,
					backgroundColor: color,
					borderColor: color,
					size: 1
				};
				sv["data-submitTime"] = series_value.submit_time;
				sv.guideLabel = {
					text: "%t : %v",
					fontColor: color,
					borderColor: color,
					backgroundColor: "#fff"
				};

				jobLatencyChartData.push(sv);
			}

			//jobDashboardCtrl.jobLatencyChartObj.series = jobLatencyChartData;
			jobDashboardCtrl.jobLatencyChartSource = jobLatencyChartData;
			console.log(jobDashboardCtrl.jobLatencyChartObj);
		}


		function createJobLatencyChartObj() {
			jobDashboardCtrl.jobLatencyChartObj = {
				type: "mixed",
				backgroundColor: "transparent",
				scaleX: {
					step: 'second',
					autoFit: true,
					zooming: true,
					// values: series_value.submit_time,
					minValue: date_min - 600000,
					maxValue: date_max + 600000,
					item: {
						fontColor: "#fff"
					},
					transform: {
						type: "date",
						text: "%H:%i:%s"
					},
					guide: {
						visible: false
					}
				},
				scaleY: {
					autoFit: true,
					lineWidth: 1,
					item: {
						fontColor: "#fff"
					},
					guide: {
						visible: false
					},
					thousandsSeparator: ","
				},
				scaleY2: {
					autoFit: true,
					lineWidth: 1,	
					tick:{
				      	visible:false
				    },				
					item: {
						visible: false
					},
					guide: {
						visible: false
					}
				},
				plot: {
					exact: true
				},
				plotarea: {
					border: "none",
					//adjustLayout: true,
					marginTop: "20px",
					marginRight: "30px",
					marginBottom: "23px",
					paddingRight: "10px"
				},
				crosshairX: {
					shared: false,
					lineWidth: 1,
					scaleLabel: {
						backgroundColor: "#fff",
						color: "#383737",
						borderColor: "#C0C0C0",
						borderWidth: "1px",
						transform: {
							type: "date",
							text: "%Y-%mm-%dd %H:%i:%s"
						}
					},
					plotLabel: {
						visible: true,
						multiple: true
					}
				}
			};
		}

		

		function createJobCountChartObj(arr) {
			jobDashboardCtrl.jobCountChartObj = undefined;	// job Count 초기화
			jobCountSeries = [];
			var now = new Date().getTime();
			date_max = now;
			date_min = now - (60000 * 60 * 24);

			var len = jobApplication.length;
			for (var i = 0; i < len; i++) {
				var list = arr[i][jobApplication[i].app];
				var v = [];
				if (list.length == 0)
					continue;

				var sv = {};
				sv.type = "line";
				sv.scales = "scaleX, scaleY";
				sv.values = list;
				sv.lineColor = jobCountPalette[jobApplication[i].app];
				sv.alpha = 0.7;
				sv.lineWidth = "1px";

				if (jobApplication[i].app == "prestoserver"  || jobApplication[i].app == "presto")
					sv.text = 'TRINO';
				else
					sv.text = jobApplication[i].app.toUpperCase();


				sv.tooltip = {"visible": false};
				sv.visible = true;
				sv.guideLabel = {
					"text": "%t : %V",
					"font-color": jobCountPalette[jobApplication[i].app],
					"border-color": jobCountPalette[jobApplication[i].app],
					"background-color": "#fff"
				};				
				sv.marker = {
					visible: true,
					lineColor: jobCountPalette[jobApplication[i].app],
					backgroundColor: jobCountPalette[jobApplication[i].app],
					borderColor: jobCountPalette[jobApplication[i].app],
					size: 1
				};
				jobCountSeries.push(sv);
			}			

			jobCountSeries.push(jobCpuResourceObj);

			var graph = {
				gui: {
					contextMenu: {
						visible: "false"
					}
				},
				type: "mixed",
				theme: 'dark',
				backgroundColor: "transparent",
				zoom: {
					backgroundColor: "#3399ff",
					shared: true
				},
				plot: {
					mode: "fast",
					exact: true,
					smartSampling: true
				},
				plotarea: {
					maskTolerance: 80,
					marginLeft: "65",
					marginRight: "20",
					marginBottom: "25",
				},
				crosshairX: {
					lineWidth: 1,
					scaleLabel: {
						backgroundColor: "#fff",
						color: "#383737",
						borderColor: "#C0C0C0",
						borderWidth: "1px",
						transform: {
							type: "date",
							text: "%Y-%mm-%dd %H:%i:%s"
						}
					},
					plotLabel: {
						visible: true,
						multiple: true
					}

				},
				scaleX: {
					autoFit: true,
					normalize: true,
					zooming: true,
					placement: "default",
					minValue: date_min - 600000,
					maxValue: date_max + 600000,
					step: "60000", //1분단위
					item: {
						//visible : false
						"font-color": "#fff"
					},
					guide: {
						visible: false
					},
					tick: {
						lineWidth: "1px"
					},
					transform: {
						type: "date",
						text: "%H:%i"
					}
				},
				scaleY: {
					item: {
						"font-color": "#fff",
						"thousands-separator": ","
					},
					guide: {
						visible: false
					}
				},
				scaleY2: {
					tick:{
				      	visible:false
				    },				
					item: {
						visible: false
					},
					guide: {
						visible: false
					}
				},
				series: jobCountSeries
			};
			return graph;
		}



		function createJobStatusChartObj() {
			let timeInterval = Number(jobDashboardCtrl.jobConfig.time_interval);
			var now = new Date().getTime();

			date_min = now - (60000 * 60 * timeInterval);

			jobStatusSeries = [];
			ylabel = [];
			ruleLable = [];
			var scaleI = 0;

			jobStatusMiddleS = {
				type: "scatter",
				marker: {"jsRule": 'window.customFnc()'},
				values: [],
				tooltip: {jsRule: "window.formatTooltip()"},
				"data-jobName": [],
				"data-status": [],
				"data-jobid": [],
				"data-endT": [],
				"data-startT": [],
				"data-user": [],
				"data-visible": [],
				"scales": "scale-x , scale-y-2",
				plot: {
					"maxTrackers": 99999,
					"mode": "fast",
					"exact": true,
					"smartSampling": true
				}
			};

			var len = jobStatusQueue.length;
			for (var i = 0; i < len; i++) {
				var obj = {};
				obj.leftLabel = (jobStatusQueue[i]['left_label']=='MAPREDUCE')? "MR":jobStatusQueue[i]['left_label'];
				obj.cnt = scaleI;

				var s = jobStatusQueue[i]['data'].length;//series[i].length;  // user 별갯수
				if (s > 0) {
					var c = Math.ceil(s / 100) * 100; // user 별 갯수 100단위로 전환
					var j = Math.floor((c - 10) / s); // value증가값
					if (j == 0)
						j = 1;

					createTimelineBar(jobStatusQueue[i]['data'], scaleI + 10, j);
					scaleI = c + scaleI; // 줄에 붙는게 보기 안좋아서 시작값을 5로 지정
					obj.aa = scaleI - obj.cnt;
					ruleLable.push(obj);
				}
			}

			if (jobStatusSeries.length == 0) {
				jobStatusSeries.push({type: "line", value: [[null, null], [null, null]]});
			}


			jobStatusSeries.push(jobStatusMiddleS);

			for (var i = 0; i <= scaleI; i++) {
				var label = "";
				var rule_len = ruleLable.length;
				for (var j = 0; j < rule_len; j++) {
					var cpv = ruleLable[j].cnt + (ruleLable[j].aa / 2);
					if (cpv == i) {
						label = ruleLable[j].leftLabel;
					}
				}
				ylabel.push(label);
			}

			var graph = {
				gui: {
					contextMenu: {
						visible: "false"
					}
				},
				type: "mixed",
				theme: 'dark',
				backgroundColor: "transparent",
				zoom: {
					backgroundColor: "#3399ff",
					shared: true
				},
				plot: {
					lineWidth: 1,
					maxTrackers: 99999,
					mode: "fast",
					exact: true,
					smartSampling: true,
					marker: {
						visible: false
					}
				},
				crosshairX: {
					visible: false,
				},
				scaleX: {
					autoFit: true,
					normalize: true,
					zooming: true,
					placement: "opposite",
					minValue: date_min - 600000,
					maxValue: date_max + 600000,
					step: "60000", //1분단위
					item: {
						//visible : false
						"font-color": "#fff"
					},
					guide: {
						lineWidth: "1px"
					},
					tick: {
						lineWidth: "1px"
					},
					transform: {
						type: "date",
						text: "%H:%i"
					}
				},
				scaleY: {
					itemsOverlap: true,
					guide: {
						lineWidth: 1,
						lineStyle: "solid",
						borderColor: "C0C0C0",
						//visible : false,
						alpha: 0,
						rules: ruleFunc()
					},
					item: {
						fontSize: "15px",
						fontColor: "#fff"
					},
					tick: {
						visible: false
					},
					labels: ylabel,
					//item : {visible : false},
					step: 1,//cStep,
					maxValue: scaleI,
					maxItems: scaleI
				},
				scaleY2: {
					guide: {
						lineWidth: 1,
						lineStyle: "solid",
						borderColor: "ff00ff",
						//visible : false,
						alpha: 0,
						rules: ruleFunc()
					},
					tick: {
						visible: false
					},
					item: {visible: false},
					step: 1,//cStep,
					maxValue: scaleI,
					maxItems: scaleI
				},
				plotarea: {
					maskTolerance: 80,
					marginTop: "40",
					marginBottom: "0",
					marginLeft: "95",
					marginRight: "20"
				},
				series: jobStatusSeries
			};


			return graph;
		}


		function createTimelineBar(arr, index, j) {
			var scaleYIndex = index;
			var len = arr.length;
			for (var i = 0; i < len; i++) {
				var obj = arr[i];
				var elapse = parseInt(obj.elapsed);
				if (isNaN(elapse))
					elapse = 0;

				elapse = elapse / 100;

				// var submitT = unixToDate(arr[i].submit_time);//moment(obj.submit_time).format('YYYY-MM-DD HH:mm');
				var submitT = arr[i].submit_time;//moment(obj.submit_time).format('YYYY-MM-DD HH:mm');
				// var finishT = unixToDate(arr[i].finish_time);//moment(obj.finish_time).format('YYYY-MM-DD HH:mm');
				var finishT = arr[i].finish_time;//moment(obj.finish_time).format('YYYY-MM-DD HH:mm');
				if (elapse >= jobElapsed) {
					var progressStart = {
						type: "line",
						values: [[moment(obj.submit_time).valueOf(), scaleYIndex], [moment(obj.finish_time).valueOf(), scaleYIndex]],
						lineColor: getColorByState(obj.state),
						"data-jobid": obj.job_id,
						"data-status": obj.state,
						"data-startT": submitT,
						"data-user": obj.user_name,
						visible: true,
						tooltip: {
							htmlMode: true,
							"background-color": "#f90",
							"padding": "0 0 0 0",
							"border-width": 0,
							"alpha": 0,
							// text: "<div class='mu-tooltip'><div class='list'><ul class='mu-tooltip-inner' style=' border:1px solid " + jobStatusPalette[obj.state] + ";'><li>STATUS : " + obj['state'] + "</li><li>JOB ID : " + obj['job_id'] + "</li><li>START_TIME : " + submitT + "</li><li>END_TIME : " + finishT + "</li></ul></div></div>"
							text: "<div class='mu-tooltip'><div class='list'><ul class='mu-tooltip-inner' style=' border:1px solid " + getColorByState(obj.state) + ";'><li>STATUS : " + obj['state'] + "</li><li>JOB ID : " + obj['job_id'] + "</li><li>START_TIME : " + submitT + "</li><li>END_TIME : " + finishT + "</li></ul></div></div>"
						},
						marker: {
							"type": "square",
							"background-color": "#1B1B1B",
							// "border-color": jobStatusMakerPalette[obj.state],
							"border-color": getColorByState(obj.state),
							"size": 3,
							"shadow": false,
							rules: [
								{
									rule: "%i == 0",
									visible: true
								}
							]
						}
					};

					if (obj['state'] == 'RUNNING' || obj['state'] == 'ACCEPTED' || obj['state'] == 'SUBMIT') {
						// progressStart.tooltip.text = "<div class='mu-tooltip'><div class='list'><ul class='mu-tooltip-inner' style=' border:1px solid " + jobStatusPalette[obj.state] + ";'><li>STATUS : " + obj['state'] + "</li><li>JOB ID : " + obj['job_id'] + "</li><li>START_TIME : " + submitT + "</li><li>END_TIME : </li></ul></div></div>"
						progressStart.tooltip.text = "<div class='mu-tooltip'><div class='list'><ul class='mu-tooltip-inner' style=' border:1px solid " + getColorByState(obj.state) + ";'><li>STATUS : " + obj['state'] + "</li><li>JOB ID : " + obj['job_id'] + "</li><li>START_TIME : " + submitT + "</li><li>END_TIME : </li></ul></div></div>"
					}
					jobStatusSeries.push(progressStart);
					jobStatusMiddleS["data-status"].push(obj.state);
					jobStatusMiddleS["data-jobName"].push(obj.job_name);
					jobStatusMiddleS["data-startT"].push(submitT);
					jobStatusMiddleS["data-endT"].push(finishT);
					jobStatusMiddleS["data-jobid"].push(obj.job_id);
					jobStatusMiddleS["data-user"].push(obj.user_name);
					jobStatusMiddleS["data-visible"].push(true);
					jobStatusMiddleS.values.push([0, 0]);
				} else {
					jobStatusMiddleS["data-status"].push(obj.state);
					jobStatusMiddleS["data-jobName"].push(obj.job_name);
					jobStatusMiddleS["data-startT"].push(submitT);
					if (obj['state'] == 'RUNNING' || obj['state'] == 'ACCEPTED' || obj['state'] == 'SUBMIT') {
						jobStatusMiddleS["data-endT"].push("");
					} else {
						jobStatusMiddleS["data-endT"].push(finishT);
					}
					jobStatusMiddleS["data-jobid"].push(obj.job_id);
					jobStatusMiddleS["data-user"].push(obj.user_name);
					jobStatusMiddleS["data-visible"].push(true);
					jobStatusMiddleS.values.push([moment(obj.submit_time).valueOf(), scaleYIndex]);
				}
				scaleYIndex += j;
			}
			return scaleYIndex;
		}

		// function unixToDate(unix) {
		// 	var d = new Date(unix);
		// 	var h = addZero(d.getHours());
		// 	var m = addZero(d.getMinutes());
		// 	var s = addZero(d.getSeconds());
		//
		// 	return d.getFullYear() + "-" + addZero((d.getMonth() + 1)) + "-" + addZero(d.getDate()) + " " + h + ":" + m + ":" + s;
		// }
		//
		// function addZero(i) {
		// 	if (i < 10) {
		// 		i = "0" + i;
		// 	}
		// 	return i;
		// }


		function addEventListener() {
			unbind = [
				$scope.$on(ConfigManager.getEvent("CHANGE_SYSTEM_SEQ_EVENT"), onChangeSystemGroupIdEventHandler),
				$scope.$on(ConfigManager.getEvent("GET_JOB_DASHBOARD_EVENT"), onWebsocketDataReceiveEventHandler),			
				$scope.$on('$destroy', destroy)
			];
		}


		function createTimer() {
			TIMER = $interval(getSocketData, INTERVAL_TIME);
		}

		/**
		 * 상태별 코드값과 컬러값 조회
		 */
		function getStatusCode() {
			$timeout(function(){
				var a = 1;
				var b = 2;
			},200)
			
			DataService.httpPost("/dashboard/job/getStatusCode", param, function (data) {
				statusCodeList = data.data;

				for (let i = 0, j = statusCodeList.length; i < j; i++) {
					let status = statusCodeList[i];
					if (jobDashboardCtrl.statusLengend.indexOf(status.code_value) == -1)
						jobDashboardCtrl.statusLengend.push(status.code_value);
				}

				getSocketData();
				createTimer();
			});
		}

		function getColorByState(state) {
			let color = '#fff';
			if (!statusCodeList || statusCodeList.length == 0) {
				return color;
			}
			for (let i = 0, j = statusCodeList.length; i < j; i++) {
				let status = statusCodeList[i];
				if (status.code_name == state && status.color_code) {
					color = status.color_code;
				}
			}
			return color;
		}

		function getCodeValueByState(state) {
			for (let i = 0, j = statusCodeList.length; i < j; i++) {
				let status = statusCodeList[i];
				if (status.code_name == state) {
					return status.code_value;
				}
			}
		}


		function ruleFunc() {
			var ruleArr = [];
			for (var i = 0; i < ruleLable.length; i++) {
				var r = {
					rule: "%v === " + ruleLable[i].cnt,
					alpha: 1
				};
				ruleArr.push(r);
			}

			return ruleArr;
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
				$('.mu-content').unblock();
				myBlockUI = null;
				$('#indicator').children().remove();
				if (mySpinner != null)
					mySpinner.stop(mySpinnerTarget);
			}

		window.formatTooltip = function (e) {
			return {
				htmlMode: true,
				"background-color": "#f90",
				"padding": "1 1 1 1",
				"border-width": 1,
				// "border-color": jobStatusBoxPalette[e["data-status"]],
				"border-color": getColorByState(e["data-status"]),
				"alpha": 0,
				text: "<div class='mu-tooltip'><div class='list'><ul class='mu-tooltip-inner' ><li>User : %data-user</li><li>STATUS : %data-status</li><li>JOB ID : %data-jobid</li><li>START_TIME : %data-startT</li><li>END_TIME : %data-endT</li></ul></div></div>"
			}
		};

		//Status Chart Plot Rule
		window.customFnc = function (e) {
			var bgc = "";
			bgc = getColorByState(e["data-status"]);
			// for (var key in jobStatusBoxPalette) {
			// 	if (key == e["data-status"])
			// 		bgc = jobStatusBoxPalette[key]
			// }

			var v = true;
			if (e.hasOwnProperty("data-visible")) {
				v = e["data-visible"]
			}
			return {type: "circle", visible: v, size: 2, borderWidth: 0, backgroundColor: bgc};
		};

		//Latency Chart Plot Rule
		window.customFncScatter = function (e) {
			if (e.value / 10 > jobDashboardCtrl.jobConfigLatency.bar_elapsed) {
				return {type: "rectangle", width: 1, height: e.value / 10, borderWidth: 0, backgroundColor: "green"};
			} else {
				return {type: "square", size: 1, borderWidth: 0, backgroundColor: "green"};
			}
		};

		initialize();
	}]);
});