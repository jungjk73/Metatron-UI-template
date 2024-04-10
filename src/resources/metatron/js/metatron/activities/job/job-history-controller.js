define(["app", "moment"], function (app, moment) {
	app.controller("JobHistoryCtrl", ["$scope", "$rootScope", "$http", "$sce", "ConfigManager", "DataService", "GridRenderer", "ngDialog", "CommonUtil",
		function ($scope, $rootScope, $http, $sce, ConfigManager, DataService, GridRenderer, ngDialog, CommonUtil) {
			"use strict";

			/** 2017.04.14 김경내
			 hive 삭제 yarn 탭에 hive-only 체크박스 두고 화면전환
			 hive-ddl -> hive 로 lable 변경
			 currentHadoop  text() -> val() 값으로 변경함 **/

			// property
			var jobHistoryCtrl = this;
			var systemSeq = "";
			var unbind = [];
			var defaultQueueType = [];
			var historyServerInfo = "";

			jobHistoryCtrl.currentHadoop = "";
			jobHistoryCtrl.hadoopCondition = {};

			jobHistoryCtrl.top = {};
			jobHistoryCtrl.top.showSelectHour = false;
			jobHistoryCtrl.top.searchConditions = [];

			jobHistoryCtrl.grid = {};
			jobHistoryCtrl.grid.gridHeight = 681;
			jobHistoryCtrl.grid.topGridData = [];
			jobHistoryCtrl.grid.bottomGridData = [];
			jobHistoryCtrl.grid.topPagingData = [];

			jobHistoryCtrl.filter = {};
			jobHistoryCtrl.filter.completedTime = [
				{"label": "0s - 300s", "value": "0-300"},
				{"label": "301s - 600s", "value": "301-600"},
				{"label": "601s - 1200s", "value": "601-1200"},
				{"label": "1200s Over", "value": "1200-"},
				{"label": "", "value": "", "custom": true}
			];
			jobHistoryCtrl.filter.runningTime = [
				{"label": "0s - 300s", "value": "0-300"},
				{"label": "301s - 600s", "value": "301-600"},
				{"label": "601s - 1200s", "value": "601-1200"},
				{"label": "1200s Over", "value": "1200-"},
				{"label": "", "value": "", "custom": true}
			];
			jobHistoryCtrl.filter.cpuTime = [
				{"label": "0s - 10s", "value": "0-10"},
				{"label": "10s - 20s", "value": "10-20"},
				{"label": "20s - 40s", "value": "20-40"},
				{"label": "40s Over", "value": "40-"},
				{"label": "", "value": "", "custom": true}
			];
			jobHistoryCtrl.filter.hdfsBytes = [
				{"label": "0B - 200MB", "value": "0-200"},
				{"label": "200MB - 400MB", "value": "200-400"},
				{"label": "400MB - 1GB", "value": "400-1000"},
				{"label": "1GB Over", "value": "1000-"},
				{"label": "", "value": "", "custom": true}
			];
			jobHistoryCtrl.filter.bytesType = [
				{"label": "0B - 100MB", "value": "0-100"},
				{"label": "100MB - 500MB", "value": "100-500"},
				{"label": "500MB Over", "value": "500-"},
				{"label": "", "value": "", "custom": true}
			];

			//hive ddl , hive only check value
			jobHistoryCtrl.hiveOnlyChk = false;
			jobHistoryCtrl.hiveOnlyDdlChk = false;
			jobHistoryCtrl.hiveOnlyShow = false;

			/*** Hive Data Show YN **/
			jobHistoryCtrl.hiveDdlViewYn = 'Y';
			getCommonCode('UI_VISIBLE_STATUS');
			function getCommonCode(value) {
	      DataService.httpPost("/common/getCommonCode", {type: value}, function(data){                
	        if (data == null || data.data == null)
	      	  return;
	      	var code = _.findWhere(data.data, {codeName: 'HIVE_DDL'});
	      	if(code) {
	      		jobHistoryCtrl.hiveDdlViewYn = code.codeValue;
	      	}        
	      });
	    } 
    /*** Hive Data Show YN End **/

			// method
			jobHistoryCtrl.changeConditionHandler = function (event, data) {
				if(event != null && data != null) {
					let current = angular.element(event.currentTarget);
					let customEl = current.siblings("span.custom");

					// Custom 노드가 아닌 애들이 체크됬을때 Custom Disabled
					if(customEl == null || customEl.length < 1) {
						let customSpan = current.parents("ul").children("li").children("span.custom");
						customSpan.attr("readonly", "readonly");
						customSpan.css("opacity", "0.4");
						customSpan.children("input").each(function() {
							angular.element(this).attr("readonly", "readonly");
							angular.element(this).val('');
						});
					}

					// Custom 노드들 처리.
					if(data.custom != null && data.custom == true && !(event.currentTarget.control.checked) == true) {
						customEl.css("opacity", 1);
						customEl.children("input").eq(0).focus();
						customEl.children("input").each(function() {
							angular.element(this).removeAttr("readonly");
							angular.element(this).val('');
						});
					} else {
						customEl.css("opacity", 0.4);
						customEl.children("input").each(function() {
							angular.element(this).attr("readonly", "readonly");
							angular.element(this).val('');
						});
					}
				}

				jobHistoryCtrl.msg = '';
				setTimeout(getData, 500);
			};

			jobHistoryCtrl.searchBtnClickHandler = function (event) {
				getData();
			};

			jobHistoryCtrl.changeHadoopHandler = function (event) {
				if (event == null)
					return;

				var target = angular.element(event.currentTarget);
				settingChangeHadoop(target);

				// 포커스 아웃 처리.
				angular.element("input").blur();

				jobHistoryCtrl.msg = '';
			};

			jobHistoryCtrl.hiveOnlyHandler = function (event) {
				setTimeout(function () {
					if (jobHistoryCtrl.hiveOnlyChk == true) {
						jobHistoryCtrl.currentHadoop = "hive";
					} else {
						jobHistoryCtrl.currentHadoop = "yarn";
					}

					jobHistoryCtrl.grid.gridHeight = (jobHistoryCtrl.currentHadoop == "hive") ? 280 : 681;

					// 초기화
					jobHistoryCtrl.grid.topGridData = [];
					jobHistoryCtrl.grid.topPagingData = [];
					jobHistoryCtrl.grid.bottomGridData = [];
					jobHistoryCtrl.requestURL = null;
					jobHistoryCtrl.requestParam = null;
					initLeftCondition();
					ap($scope);
				}, 100);
			};

			jobHistoryCtrl.onTopGridClickHandler = function (value) {
				if (value == null || value.length == 0)
					return;

				getBottomData(value[0].data);
			};

			jobHistoryCtrl.onTopGridDbClickHandler = function (event) {
				if (event == null || event.data == null
					|| jobHistoryCtrl.currentHadoop == 'hive')
					return;

				openPopup(event.data);
			};

			jobHistoryCtrl.onBottomGridDbClickHandler = function (event) {
				if (event == null || event.data == null || jobHistoryCtrl.currentHadoop != 'hive')
					return;

				openPopup(event.data);
			};

			jobHistoryCtrl.onDataResultHandler = function (data) {
				if (data == null)
					return;

				jobHistoryCtrl.msg = '';
				if (data.noPartition && data.noPartition.length > 0){
					notifyNoPartition(data.noPartition);
					return;
				}

				getBottomData(data.list[0]);
			};

			jobHistoryCtrl.searchConditionChangeHandler = function (event, param, node) {

				var field = node.field.toUpperCase();
				if (field == "PERIOD") {
					if (event.sDateTime == null || event.eDateTime == null)
						return;
					getQueueType();

				} else if (field == "SELECTHOURS") {
					var target = event.currentTarget;
					if (target.nodeName == "BUTTON") {
						jobHistoryCtrl.top.showSelectHour = !jobHistoryCtrl.top.showSelectHour;
					} else {
					}
				}
			};

			jobHistoryCtrl.goJobHistoryLink = function () {
				if (jobHistoryCtrl.pop == null || jobHistoryCtrl.pop.jobInfo == null)
					return;

				var url = historyServerInfo + jobHistoryCtrl.pop.jobInfo.jobId;
				window.open(url);
			};

			jobHistoryCtrl.selectHoursHandler = function (event, index) {
				var target = angular.element(event.currentTarget);
				if (target.hasClass("active"))
					target.removeClass("active");
				else
					target.addClass("active");
			};

			jobHistoryCtrl.selectHoursAllHandler = function (flag) {

				var d = angular.element("#divHours");
				if (flag == null) {
					var val = [];
					d.find("button.active").each(function () {
						val.push(angular.element(this).text().trim());
					});

					var s = val.join(", ");
					jobHistoryCtrl.top.searchConditions[1].value = s;
					jobHistoryCtrl.top.showSelectHour = false;
				} else if (flag == true) {
					d.children("button").addClass("active");
				} else if (flag == false) {
					d.children("button").removeClass("active");
				}
			};


			// event-handler
			function destroy() {
				unbind.forEach(function (fn) {
					fn();
					ngDialog.closeAll();
					clear();
				});

				sessionStorage.removeItem("jobType");
			}

			function onChangeSystemSeqEventHandler(event, data) {
				if (data == null)
					return;

				sessionStorage.removeItem("jobType");

				systemSeq = ConfigManager.getSystemSeq();
				getGridConfig();
				tabDragNDropHandler();
				getSearchCondition();

				// current 초기 셋팅(0번째 노드)
				var ele = angular.element("#appTab button").eq(0).val().toLowerCase();
				jobHistoryCtrl.currentHadoop = ele;

				jobHistoryCtrl.msg = '';
			}

			function onSearchConditionResultHandler(data) {
				if (data == null)
					return;

				var result = data.data;
				jobHistoryCtrl.hadoopCondition.yarn.sortList = result.JOB_HIS_SORT_YARN;
				jobHistoryCtrl.hadoopCondition.spark.sortList = result.JOB_HIS_SORT_SPARK;
				jobHistoryCtrl.hadoopCondition.presto.sortList = result.JOB_HIS_SORT_PRESTO;
				jobHistoryCtrl.hadoopCondition.druid.sortList = result.JOB_HIS_SORT_DRUID;
				jobHistoryCtrl.filter.stateType = result.JOB_HISTORY_STATUS;
				defaultQueueType = result.JOB_QUEUE;

				setSearchNodes();
				setTimeout(getQueueType, 500);
			}

			function onJobHistoryDetailDataResultHandler(data) {
				if (data == null)
					return;

				var result = data.data;
				jobHistoryCtrl.grid.bottomGridData = result;
			}

			function onQueueTypeResultHandler(data) {
				if (data == null || data.data == null)
					return;

				if (data.data.list == null && data.data.noPartition && data.data.noPartition.length > 0){
					notifyNoPartition(data.data.noPartition);

				}

				let result = (data.data.list == null || data.data.list.length < 1) ? defaultQueueType : data.data.list;
				jobHistoryCtrl.filter.queueType = result;
			}

			// 파티션이 없는 경우 Alert
			function notifyNoPartition(noPartition){
				if (noPartition.length > 0) {
					let noPartitionList = [];
					let _noPartitionFirst = noPartition[0];
					let _noPartitionFirstDate;
					let _noPartitionLast = noPartition[noPartition.length-1];
					let _noPartitionLastData;
					if (_noPartitionFirst.indexOf('P') > -1) {
						_noPartitionFirst = _noPartitionFirst.replace('P','');
					}
					_noPartitionFirstDate = moment(_noPartitionFirst).format('YYYY-MM-DD');

					if (_noPartitionLast.indexOf('P') > -1) {
						_noPartitionLast = _noPartitionLast.replace('P','');
					}
					_noPartitionLastData = moment(_noPartitionLast).format('YYYY-MM-DD');

					let msg = 'There is no partitioned table in database for ';
					if (_noPartitionFirstDate == _noPartitionLastData){
						msg = msg + _noPartitionFirstDate+'.';
					} else {
						msg = msg + _noPartitionFirstDate + ' ~ ' + _noPartitionLastData+'.';
					}
					msg = msg + '<br>Please Check out period condition.';

					jobHistoryCtrl.msg = $sce.trustAsHtml(msg);
				}
			}


			// function
			function initialize() {
				systemSeq = ConfigManager.getSystemSeq();
				addEventListener();
				getGridConfig();
				tabDragNDropHandler();
				getSearchCondition();

				// current 초기 셋팅(0번째 노드)
				var ele = angular.element("#appTab button").eq(0).val().toLowerCase();
				jobHistoryCtrl.currentHadoop = ele;

				if (jobHistoryCtrl.currentHadoop == "yarn")
					jobHistoryCtrl.hiveOnlyShow = true;


				setInitSearch();

				// 새로고침 하는 경우의 처리
				window.onbeforeunload = function (evt) {
					sessionStorage.removeItem("jobType");
				};

				jobHistoryCtrl.noRowMsg = 'You need to search.';
			}

			/**
			 * Metric Dashboard - ResourceManager 의 total을 클릭하여 이동한 경우
			 * 초기 검색 설정
			 */
			function setInitSearch(){
				if (sessionStorage.getItem("jobType") != null) {
					setTimeout(function(){

						if (jobHistoryCtrl.top.searchConditions != null) {
							for (let i = 0 , j = jobHistoryCtrl.top.searchConditions.length ; i < j ; i++) {
								if (jobHistoryCtrl.top.searchConditions[i].type.toUpperCase() == "DATE") {
									jobHistoryCtrl.top.searchConditions[i].startDate = moment().add(-1, 'days').format('YYYY-MM-DD HH:mm');
									jobHistoryCtrl.top.searchConditions[i].endDate = moment().format('YYYY-MM-DD HH:mm');
									ap($scope);
								}
							}
						}

						if(sessionStorage.getItem("jobType").indexOf('yarn') > -1) {
							angular.element("#tabYarn").click();
							if (jobHistoryCtrl.top.searchConditions != null) {
								if (sessionStorage.getItem("jobType") == 'yarnOver10m') {
									jobHistoryCtrl.filter.elapsedCustomStart = 600;
									jobHistoryCtrl.filter.elapsed.push({'label':'600s-','value':'600-'});
									jobHistoryCtrl.changeConditionHandler();	// 검색 요청
								}else if (sessionStorage.getItem("jobType") == 'yarnFail') {
									jobHistoryCtrl.left.state = [];
									jobHistoryCtrl.left.state.push({
										label: "Failed/Killed",
										value: "FAILED,KILLED"	
									})
									jobHistoryCtrl.changeConditionHandler();	// 검색 요청
								} else {
									jobHistoryCtrl.searchBtnClickHandler();
								}
							}
						}else if(sessionStorage.getItem("jobType").indexOf('presto') > -1) {
							angular.element("#tabPresto").click();
							if (jobHistoryCtrl.top.searchConditions != null) {
								if (sessionStorage.getItem("jobType") == 'prestoFinished') {
									jobHistoryCtrl.left.state = [];
									jobHistoryCtrl.left.state.push({
										label: "Finished",
										value: "FINISHED"	
									})
									jobHistoryCtrl.changeConditionHandler();	// 검색 요청
								}else if (sessionStorage.getItem("jobType") == 'prestoFail') {
									jobHistoryCtrl.left.state = [];
									jobHistoryCtrl.left.state.push({
										label: "Failed/Killed",
										value: "FAILED,KILLED"	
									})
									jobHistoryCtrl.changeConditionHandler();	// 검색 요청
								}else {
									jobHistoryCtrl.searchBtnClickHandler();
								}
							}
						}
						ap($scope);
					}, 1500);
				}
			}

			function tabDragNDropHandler() {
				var t = angular.element("#appTab");
				t.sortable({
					cancel: false,
					stop: function (event, ui) {
						var l = [];
						var t = angular.element("#appTab button");
						t.each(function () {
							var s = angular.element(this).val().toLowerCase();
							if (s != null && s != '')
								l.push(s);
						});

						var param = {};
						param.user = ConfigManager.getUser().username;
						param.confType = "JOB_HISTORY_TAB_ORDER";
						param.value = l.join(',');

						DataService.httpPost("/activities/job/history/updateApplicationTabOrder", param, null, false);
					}
				}).disableSelection();

				// DB에서 tab order 조회해서 셋팅
				var p = {};
				p.user = ConfigManager.getUser().username;
				p.confType = "JOB_HISTORY_TAB_ORDER";
				DataService.httpPost("/activities/job/history/getApplicationTabOrder", p, function (data) {
					if (data == null || data.data == null || data.data == "")
						return;

					tabReorderingHandler(data.data);
				}, false);
			}

			function tabReorderingHandler(data) {
				var keys = data.split(",");
				var elements = angular.element("#appTab button");
				var standard = null;
				for (var i = 0; i < keys.length; i++) {
					for (var j = 0; j < elements.length; j++) {
						var e = angular.element(elements[j]);
						if (keys[i] == e.val().toLowerCase()) {
							if (standard == null) {
								settingChangeHadoop(e);
							} else {
								e.insertAfter(standard);
							}

							standard = e;
							break;
						}
					}
				}
			}

			function settingChangeHadoop(target) {
				target.addClass("active");
				target.siblings().removeClass("active");

				jobHistoryCtrl.currentHadoop = target.val().toLowerCase().replace(/\s/gi, '');

				//hive only check box show
				jobHistoryCtrl.hiveOnlyShow = (jobHistoryCtrl.currentHadoop == "yarn") ? true : false;

				// grid 높이
				jobHistoryCtrl.grid.gridHeight = (jobHistoryCtrl.currentHadoop == "hive") ? 280 : 681;

				// 초기화
				jobHistoryCtrl.grid.topGridData = [];
				jobHistoryCtrl.grid.topPagingData = [];
				jobHistoryCtrl.grid.bottomGridData = [];
				jobHistoryCtrl.requestURL = null;
				jobHistoryCtrl.requestParam = null;

				//check box 전부 초기화
				jobHistoryCtrl.hiveOnlyChk = false;
				jobHistoryCtrl.hiveOnlyDdlChk = false;

				// 좌측 검색 조건 초기화
				initLeftCondition();

				// 상단 검색 조건 초기화
				setSearchNodes();
			}

			function getGridConfig() {
				$http.get("/resources/js/metatron/activities/job/data/job-history-config-data.json").then(function (data) {
					if (data == null || data.data == null)
						return;

					var app = data.data;
					for (var appName in app) {
						var conf = app[appName];
						for (var confName in conf) {
							if (confName.indexOf("gridColumn") < 0)
								continue;

							var list = conf[confName];
							var l = list.length;
							for (var i = 0; i < l; i++) {
								if (list[i].hasOwnProperty("cellRenderer")) {
									list[i].cellRenderer = GridRenderer[list[i].cellRenderer];
								}
							}
						}
					}
					jobHistoryCtrl.hadoopCondition = app;
				});
			}

			function addEventListener() {
				unbind = [
					$scope.$on(ConfigManager.getEvent("CHANGE_SYSTEM_SEQ_EVENT"), onChangeSystemSeqEventHandler),
					$scope.$on('$destroy', destroy)
				];
			}

			function getSearchCondition() {
				DataService.httpPost("/activities/job/history/getJobHistorySearchCondition", null, onSearchConditionResultHandler, false);
			}

			function getData() {
				var param = getSearchParam();
				if (param == null)
					return;

				var c = angular.copy(jobHistoryCtrl.currentHadoop);
				var url = c.replace("-", "");
				jobHistoryCtrl.requestURL = "/activities/job/history/" + url + "/getJobHistoryData";
				jobHistoryCtrl.requestParam = angular.copy(param);
				ap($scope);
			}

			function alertHandler(flag, msg) {
				if (!flag)
					return;

				alert(msg);
			}

			function getSearchParam(validationFlag) {
				if (jobHistoryCtrl.top.searchConditions == null)
					return;

				if (validationFlag == null)
					validationFlag = true;

				var result = {};
				result.systemSeq = systemSeq;
				result.hadoopType = jobHistoryCtrl.currentHadoop;
				result.startIndex = '0';
				result.endIndex = '100';
				result.pageSize = '100';
				result.hiveDdl = jobHistoryCtrl.hiveOnlyDdlChk.toString();

				// 상단 검색 조건
				var data = jobHistoryCtrl.top.searchConditions;
				var dl = data.length;
				for (var i = 0; i < dl; i++) {
					if (data[i].type.toUpperCase() == "DATE") {

						var startTime = data[i].startDate;
						var endTime = data[i].endDate;

						// 날짜(시작, 종료) validation check
						if (validationFlag && !CommonUtil.validateStartEndDate(startTime, endTime))
							return;

						// 마지막 날짜가 현재 날짜보다 크다면 마지막 날짜를 현재 날짜로 설정
						if (CommonUtil.isEndDateLargerThanToday(endTime)) {
							data[i].endDate = moment().subtract(2, 'minute').format('YYYY-MM-DD HH:mm');
							endTime = data[i].endDate;
						}

						result.startTime = startTime;
						result.endTime = endTime;
					} else {
						if (jobHistoryCtrl.currentHadoop == "hive")
							continue;

						var val = data[i].value;
						if (angular.isObject(val))
							val = val.value;

						// validation check
						if (data[i].field == "numLimit" && val != null && isNaN(Number(val))) {
							alertHandler(validationFlag, data[i].title + "must be a number.");
							return;
						}

						result[data[i].field] = val;
					}
				}

				if (result.startTime == null || result.startTime == "" || result.endTime == null || result.endTime == "")
					return;

				// 파티션 setting
				setPartition(result);

				// 좌측 검색 조건
				if (!checkEmpty(jobHistoryCtrl.left.state)) {
					var sVal = jobHistoryCtrl.left.state[0].value;
					var a = sVal.split(",");
					var nVal = [];
					for (var i = 0; i < a.length; i++) {
						nVal.push("'" + a[i] + "'");
					}
					result.state = nVal.join(",");
				}
				if (!checkEmpty(jobHistoryCtrl.left.queue)) {
					result.queue = jobHistoryCtrl.left.queue[0].value;
				}

				var data = jobHistoryCtrl.hadoopCondition[jobHistoryCtrl.currentHadoop].timeCondition;
				if (data == null || data.length < 1)
					return result;

				for (var i = 0; i < data.length; i++) {
					if (!checkEmpty(jobHistoryCtrl.filter[data[i]])) {
						if (!setTimeRange(result, data[i], jobHistoryCtrl.filter[data[i]][0], validationFlag)) {
							return;
						}
					}
				}

				return result;
			}

			function checkEmpty(data) {
				if (data == null || data == "") {
					return true;
				} else if (angular.isObject(data) && Object.keys(data).length < 1) {
					return true;
				} else if (angular.isArray(data) && data.length < 1) {
					return true;
				}
				return false;
			}

			function setTimeRange(result, key, data, validationFlag) {
				let returnValue = true;
				if (data.custom != null && data.custom == true) {

					var start = jobHistoryCtrl.filter[key + "CustomStart"] + "";
					var end = jobHistoryCtrl.filter[key + "CustomEnd"] + "";

					// validation check
					if (start != null && Number(start) != 0 && (end == null || end == '')) {

					} else {
						if (start != null && isNaN(Number(start)) && end != null && isNaN(Number(end))) {
							alertHandler(validationFlag, data.title + " must be a number.");
							returnValue = false;
						}
						if (Number(start) > Number(end)) {
							alertHandler(validationFlag, "End Time should be greater than Start Time.");
							returnValue = false;
						}
						if (start == null || start == '') {
							returnValue = false;
						}
					}

					result[key + "Start"] = start;
					result[key + "End"] = end;
				} else {
					var splitVal = data.value.split("-");
					result[key + "Start"] = splitVal[0];
					result[key + "End"] = splitVal[1];
				}

				return returnValue;
			}

			function initLeftCondition() {
				if(jobHistoryCtrl.currentHadoop == null || jobHistoryCtrl.currentHadoop == "")
					setTimeout(initLeftCondition, 700);

				jobHistoryCtrl.left = {};
				var data = jobHistoryCtrl.hadoopCondition[jobHistoryCtrl.currentHadoop] != undefined ? jobHistoryCtrl.hadoopCondition[jobHistoryCtrl.currentHadoop].timeCondition : null;
				if (data == null || data.length < 1)
					return;

				for (var i = 0; i < data.length; i++) {
					var key = data[i];
					jobHistoryCtrl.filter[key] = [];
					jobHistoryCtrl.filter[key + "CustomStart"] = "";
					jobHistoryCtrl.filter[key + "CustomEnd"] = "";

					let customSpan = angular.element('[ng-model="jobHistoryCtrl.filter.' + key + 'CustomStart"]').parents("span");
					customSpan.attr("readonly", "readonly");
					customSpan.css("opacity", "0.4");
					customSpan.children("input").each(function() {
						angular.element(this).attr("readonly", "readonly");
						angular.element(this).val('');
					});
					let customCheck = customSpan.siblings('input[type="checkbox"]').eq(0);
					customCheck.removeAttr("checked");
				}
			}

			function setPartition(result) {
				if (result == null || result.startTime == null || result.endTime == null)
					return;

				var startTime = new Date(result.startTime.split(" ")[0]);
				var endTime = new Date(result.endTime.split(" ")[0]);

				var dateArr = [];
				var currentDate = moment(startTime);
				while (currentDate <= endTime) {
					dateArr.push("P" + moment(currentDate).format('YYYYMMDD'));
					currentDate = moment(currentDate).add(1, 'days');
				}

				// setting
				result.partition = dateArr.join(",");
			}

			function getTopPeriodData() {
				if(jobHistoryCtrl.top.searchConditions == null)
					return null;

				let list = jobHistoryCtrl.top.searchConditions;
				let len = list.length;
				for(var  i=0; i<len; i++) {
					if (list[i].type.toUpperCase() == "DATE")
						return list[i];
				}
			}

			function setTopPeriodData(data) {
				if(jobHistoryCtrl.top.searchConditions == null || data == null)
					return null;

				let list = jobHistoryCtrl.top.searchConditions;
				let len = list.length;
				for(var  i=0; i<len; i++) {
					if (list[i].type.toUpperCase() == "DATE") {
						list[i] = data;
						return;
					}
				}
			}

			function setSearchNodes() {
				var selectHoursCode = [];
				selectHoursCode.push('<button type="button" class=" mu-btn-color mu-btn-hour" ng-click="setSearchConditionValue($event, 1)"><i class="mu-icon clock"></i></button>');
				selectHoursCode.push('<input type="text" class="mu-input" id="form01" style="width:120px;border-color:#ccc;background-color:#fff; margin-top: 2px;" readonly ng-model="nodes[1].value" ng-keyup="setSearchConditionValue($event, 1)">');

				// 날짜는 초기화에서 제외(전 날짜정보 memory에 저장)
				let lastDateTime = getTopPeriodData();

				jobHistoryCtrl.top.sortList =  jobHistoryCtrl.hadoopCondition[jobHistoryCtrl.currentHadoop] != undefined ? jobHistoryCtrl.hadoopCondition[jobHistoryCtrl.currentHadoop].sortList : [];
				jobHistoryCtrl.top.searchConditions = [
					{title: "Period", field: "PERIOD", width: "148px", rowIndex: 1, type: "date"},
					{
						title: "Select Hour(s)",
						field: "selectHours",
						width: "120px",
						rowIndex: 1,
						type: "custom",
						visible: (jobHistoryCtrl.currentHadoop != "hive"),
						code: selectHoursCode.join("")
					},
					{
						title: "Query",
						field: "query",
						width: "120px",
						rowIndex: 1,
						type: "text",
						visible: (jobHistoryCtrl.currentHadoop == "hive-ddl")
					},
					{
						title: "Sort",
						field: "sort",
						width: "120px",
						rowIndex: 1,
						type: "select",
						data: jobHistoryCtrl.top.sortList,
						visible: (jobHistoryCtrl.currentHadoop.indexOf("hive") < 0)
					},
					{
						title: "TOP N",
						field: "numLimit",
						width: "120px",
						rowIndex: 1,
						type: "number",
						visible: (jobHistoryCtrl.currentHadoop != "hive")
					},
					{
						title: "Job Name",
						field: "jobName",
						width: "120px",
						rowIndex: 1,
						type: "text",
						visible: (jobHistoryCtrl.currentHadoop != "hive-ddl" && jobHistoryCtrl.currentHadoop != "druid")
					}
				];

				// memory에 저장했던 날짜정보 다시 셋팅(단, 셋팅 후 휘발성 데이터이므로 null로 초기화 해줘야함)
				// directive 내에서는 null이거나 length가 없을 때 return 시킴.
				jobHistoryCtrl.top.refreshConditions = [lastDateTime];
				//jobHistoryCtrl.top.refreshConditions = null;
			}

			function getBottomData(data) {
				if (data == null || jobHistoryCtrl.currentHadoop != "hive")
					return;

				var param = getSearchParam();
				if (param == null)
					return;

				param.hiveSessionId = data.hiveSessionId;
				DataService.httpPost("/activities/job/history/" + jobHistoryCtrl.currentHadoop + "/getJobHistoryDetailData", param, onJobHistoryDetailDataResultHandler, false);
			}

			function getQueueType() {

				if (jobHistoryCtrl.currentHadoop != "yarn")
					return;

				var param = getSearchParam(false);
				if (param == null)
					return;

				DataService.httpPost("/activities/job/history/getQueueType", param, onQueueTypeResultHandler, false);
			}

			function openPopup(data) {
				var currentHadoop = jobHistoryCtrl.currentHadoop;
				if (currentHadoop == null || currentHadoop == "")
					return;

				// 초기화
				jobHistoryCtrl.pop = {jobInfo: {}};
				jobHistoryCtrl.pop.jobInfo = data;

				currentHadoop = currentHadoop.replace(/\-/gi, "");
				var type = (currentHadoop == 'yarn') ? "" : (currentHadoop + "_");
				var template = "/activities/job/popup/job_" + type + "info_popup_template.html";
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

				setTimeout(function () {
					$rootScope.$broadcast(ConfigManager.getEvent("JOB_DETAIL_POPUP"), jobHistoryCtrl.pop.jobInfo);
				}, 500);

				var closer = $rootScope.$on('ngDialog.refresh', function (e, id) {
					if (id != popup.id) return;
					closer();
				});
			}

			function clear() {
				delete jobHistoryCtrl.currentHadoop;
				delete jobHistoryCtrl.hadoopCondition;
				delete jobHistoryCtrl.top;
				delete jobHistoryCtrl.left;
				delete jobHistoryCtrl.grid;
				delete jobHistoryCtrl.filter;
				delete jobHistoryCtrl.pop;
				delete jobHistoryCtrl.requestURL;
				delete jobHistoryCtrl.requestParam;

				systemSeq = null;
				unbind = null;
				defaultQueueType = null;
				historyServerInfo = null;
			}

			initialize();
		}]);
});