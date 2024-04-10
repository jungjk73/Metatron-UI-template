define(["app", "moment"], function (app, moment) {
	app.controller("SystemHistoryCtrl", ["$rootScope", "$scope", "$compile", "DataService", "ConfigManager", "WebSocketService", "$timeout", "ngDialog", "CommonUtil",
		function ($rootScope, $scope, $compile, DataService, ConfigManager, WebSocketService, $timeout, ngDialog, CommonUtil) {
			"use strict";


			// property
			let systemHistoryCtrl = this;
			let unbind = [];

			const VIEWTYPE_METRICS = 'METRICS';
			const VIEWTYPE_HOST = 'HOST';

			let systemSeq = ConfigManager.getSystemSeq();

			let LOAD_COMPLETE = false;		// 컴포넌트에 사용되는 데이터 모두 받아온 상태 체크
			let REQUEST_ZOOMING_SEARCH = true;	// zoom 이벤트가 두번 날아가는거 방지.

			systemHistoryCtrl.searchConditions = [];
			systemHistoryCtrl.chartArr = [];			// 차트 옵션 객체 저장
			systemHistoryCtrl.chartXLabels = [];		// 차트 X 축 라벨 저장
			systemHistoryCtrl.chartData = [];			// 차트 데이터 저장
			systemHistoryCtrl.chartData_threshold = [];	// 임계치 있는 차트 데이터
			systemHistoryCtrl.chartData_no_threshold = [];	// 임계치 없는 차트 데이터
			systemHistoryCtrl.chartNameList = [];		// 차트 이름 (metric name / host name) 저장. 전체 차트 개수 계산용
			systemHistoryCtrl.requestExcel = false;		// 엑셀 다운로드 요청인지 구분. search 기능 이용
			systemHistoryCtrl.hasThreshold = false;		// 임계치 조건 차트가 있는 경우
			systemHistoryCtrl.empty = true;					// 데이터가 없을 경우

			let loopCnt;			// 차트 개수
			let chartindex = 0;
			let maxChartCnt;  		// 그리려는 최대 차트 개수 - 처음에 할당 후 불변
			let totalChartCnt;		// 전체 그려져야 하는 차트 개수 -
			let loadMoreCnt = 0;	// 추가 로드 카운트
			let periodDay = 0;
			let aggregation = '';

			let mySpinner = null;
			let mySpinnerTarget = null;
			let myBlockUI = null;

			let clusterRetryCnt = 10;

			let allOption = {'value': '00', 'label': 'ALL'};
			systemHistoryCtrl.searchMetricList = [];	// 선택한 Metric 객체 저장 리스트


			systemHistoryCtrl.viewType = VIEWTYPE_METRICS;		// METRICS, HOST

			systemHistoryCtrl.selectedHostName = 'ALL';

			systemHistoryCtrl.levelList = [
				{"label": "Max", "value": "MAX"},
				{"label": "Min", "value": "MIN"},
				{"label": "Avg", "value": "AVERAGE"}
			];
			systemHistoryCtrl.chartSizeList = [
				{"label": "140*100px", "value": "140_100"},
				{"label": "170*115px", "value": "170_115"},
				{"label": "200*135px", "value": "200_135"},
				{"label": "240*161px", "value": "240_161"},
				{"label": "280*190px", "value": "280_190"}
			];
			systemHistoryCtrl.untilList = [
				{"label": "Select", "value": "0"},
				{"label": "3H", "value": "3"},
				{"label": "6H", "value": "6"},
				{"label": "12H", "value": "12"},
				{"label": "1D", "value": "24"},
				{"label": "3D", "value": "72"}
			];
			systemHistoryCtrl.conditionList = [
				{"label": ">", "value": ">"},
				{"label": ">=", "value": ">="},
				{"label": "<=", "value": "<="},
				{"label": "<", "value": "<"}
			];


			// event-handler

			function addEventListener() {
				unbind = [
					$scope.$on('$destroy', destroy),
					$scope.$on(ConfigManager.getEvent("CHANGE_SYSTEM_SEQ_EVENT"), onChangeSystemGroupIdEventHandler),		// 클러스터 선택한 경우에 firing
					$scope.$on(ConfigManager.getEvent("GET_METRIC_CHART_LIST_EVENT"), getMetricChartListHandler)			// 차트 정보 호출 핸들러
				];
			}

			function destroy() {
				DataService.httpPost("/activities/system/history/delChartImg", null, function (data) {

				}, false);

				unbind.forEach(function (fn) {
					fn();
				});

				systemHistoryCtrl.searchConditions = null;
				systemHistoryCtrl.chartArr = null;
				systemHistoryCtrl.chartXLabels = null;
				systemHistoryCtrl.chartData = null;
				systemHistoryCtrl.chartData_threshold = null;
				systemHistoryCtrl.chartData_no_threshold = null;
				systemHistoryCtrl.chartNameList = null;
				systemHistoryCtrl.searchMetricList = null;
				systemHistoryCtrl.levelList = null;
				systemHistoryCtrl.chartSizeList = null;
				systemHistoryCtrl.untilList = null;
				systemHistoryCtrl.conditionList = null;
				systemHistoryCtrl.hostNameList = null;
				systemHistoryCtrl.categoryMetricList = null;
				systemHistoryCtrl.metricTreeModel = null;
				systemHistoryCtrl.categorySelectDataList = null;
				systemHistoryCtrl.selectedCategory = null;
				systemHistoryCtrl.metricSelectDataList = null;
				systemHistoryCtrl.searchMetricList = null;
				systemHistoryCtrl.selectedMetrics = null;
				systemHistoryCtrl.selectedHost = null;

				systemHistoryCtrl = null;
				hideMySpinner();
			}

			/**
			 * 클러스터 선택한 경우 해당 클러스터의 호스트 목록을 할당
			 */
			function onChangeSystemGroupIdEventHandler(event, data) {
				if (data == null)
					return;
				systemSeq = (ConfigManager.getSystemSeq()).toString();

				getInitConfig();

				getHostNameList();	// 선택한 클러스터에 대한 호스트 목록 생성
			}

			/**
			 * 서버에서 받은 조회 결과 차트 정보 처리
			 */
			function getMetricChartListHandler(event, data) {
				console.debug('Get Data From Web Socket : ' + moment().format('YYYY-MM-DD HH:mm:ss'));
				if (!data.hasOwnProperty("searchResults")) {
					//alert("Please Check Search Condition or WebSocket Connection Status.");
					alert("There is no data.");
					systemHistoryCtrl.empty = true;
					$('#msg_area').text('No Data.');
					hideMySpinner();
					return;
				}
				if (data.hasOwnProperty("exceptionMassage")) {
					alert(data.exceptionMassage);
					systemHistoryCtrl.empty = true;
					$('#msg_area').text('No Data.');
					hideMySpinner();
					return;
				}

				systemHistoryCtrl.empty = false;
				systemHistoryCtrl.chartMaxValue = 0;
				systemHistoryCtrl.chartUnit = '';

				systemHistoryCtrl.chartXLabels = [];			// 차트 X 축 라벨 저장 - 시간
				systemHistoryCtrl.chartData = [];				// 차트 데이터 객체 저장
				systemHistoryCtrl.chartData_threshold = [];
				systemHistoryCtrl.chartData_no_threshold = [];
				systemHistoryCtrl.chartNameList = [];			// 차트 이름 (metric name / host name) 저장. 전체 차트 개수 계산용

				let chartData = data.searchResults;

				if (systemHistoryCtrl.viewType == VIEWTYPE_HOST && chartData['MEM_USAGE'] != null) {
					delete chartData.MEM_USAGE;
				}

				systemHistoryCtrl.chartMaxValue = 0;

				if (!chartData) {
					if (systemHistoryCtrl.requestExcel)
						alert("There is no data for Excel");
					console.error('No Result Data From WebSocket');
					systemHistoryCtrl.chartArr = [];
					ap($scope);
					lazyHideIndicator();
					return;
				}

				if (Object.keys(chartData).indexOf('MAX_VALUE') > -1) {
					systemHistoryCtrl.chartMaxValue = Math.round((Number(chartData.MAX_VALUE) + (Number(chartData.MAX_VALUE)) * 0.1));
					delete chartData.MAX_VALUE;
				}
				if (Object.keys(chartData).indexOf('UNIT') > -1) {
					systemHistoryCtrl.chartUnit = chartData.UNIT;
					delete chartData.UNIT;
				}


				let keySet = (Object.keys(chartData)).sort();		// 차트 이름순으로 정렬

				for (let i = 0; i < keySet.length; i++) {
					let keyName = keySet[i];

					let chartValueObj = {};

					chartValueObj.chartName = keyName;
					chartValueObj.hasThresholdValue = false;	// 임계치 조건에 해당되는 값이 있는가 - 차트 하나에 대해서
					chartValueObj.category = systemHistoryCtrl.selectedCategory;

					if (systemHistoryCtrl.viewType == VIEWTYPE_METRICS) {
						chartValueObj.metricName = systemHistoryCtrl.selectedMetrics;

						if (systemHistoryCtrl.selectedHostName == 'ALL')
							chartValueObj.host = {'label': keyName, 'value': keyName};
						else {
							for (let x = 0, y = systemHistoryCtrl.hostNameList.length; x < y; x += 1) {
								if (systemHistoryCtrl.hostNameList[x].label == chartValueObj.chartName) {
									chartValueObj.host = systemHistoryCtrl.hostNameList[x];
								}
							}
						}

					} else {
						chartValueObj.metricName = keyName;
						chartValueObj.host = systemHistoryCtrl.selectedHost;
					}

					if ($.inArray(chartValueObj.chartName, systemHistoryCtrl.chartNameList) == -1) {
						systemHistoryCtrl.chartNameList.push(chartValueObj.chartName);
					}


					// Host Name 이 ALL 인 경우와 특정 호스트를 선택한 경우의 리턴 포맷이 다르다.
					if (systemHistoryCtrl.viewType == VIEWTYPE_METRICS) {
						if (chartData[keyName]) {
							if (systemHistoryCtrl.selectedMetrics == 'MEM_USAGE') {
								setChartValList(chartData[keyName], chartValueObj);
							}
							else {
								$.each(chartData[keyName], function (key, value) {

									let valueDataList = value;

									setChartValList(valueDataList, chartValueObj);
								});
							}

						} else {
							chartValueObj.hasValue = false;
						}

					} else {		// Host Name선택
						setChartValList(chartData[keyName], chartValueObj);
					}


					if (chartValueObj.hasThresholdValue)
						systemHistoryCtrl.chartData_threshold.push(chartValueObj);		// 조건에 맞는 차트
					else
						systemHistoryCtrl.chartData_no_threshold.push(chartValueObj);	// 조건에 맞지 않는 차트 / 조건이 없는 경우의 차트


				}

				// 임계치 조건이 있는 차트 + 조건이 없는 차트
				if (systemHistoryCtrl.chartData_threshold.length > 0) {
					systemHistoryCtrl.chartData = systemHistoryCtrl.chartData_threshold;
					systemHistoryCtrl.hasThreshold = true;
				}
				else {
					systemHistoryCtrl.chartData = systemHistoryCtrl.chartData_no_threshold;
					systemHistoryCtrl.hasThreshold = false;
				}


				// 차트 재설정
				if (systemHistoryCtrl.chartData_threshold.length > 30) {
					loopCnt = 30;
					maxChartCnt = totalChartCnt = systemHistoryCtrl.chartData_threshold.length;
				} else if (systemHistoryCtrl.chartData_threshold.length > 0) {
					loopCnt = systemHistoryCtrl.chartData_threshold.length;
					maxChartCnt = totalChartCnt = systemHistoryCtrl.chartData_threshold.length;
				} else if (systemHistoryCtrl.chartData_no_threshold.length > 30) {
					loopCnt = 30;
					maxChartCnt = totalChartCnt = systemHistoryCtrl.chartData_no_threshold.length;
				} else if (systemHistoryCtrl.chartData_no_threshold.length > 0) {
					loopCnt = systemHistoryCtrl.chartData_no_threshold.length;
					maxChartCnt = totalChartCnt = systemHistoryCtrl.chartData_no_threshold.length;
				}


				// 엑셀 처리 부분
				// 보이지 않는 임시 그리드를 만들어서 엑셀로 생성
				// 웹소켓에서 받은 데이터 그대로 처리하는것보다 차트용 객체로 처리하는게 엑셀 생성하는게 더 빠름
				// Metrics / Host 메뉴 구분 없이 처리 가능
				if (systemHistoryCtrl.requestExcel) {
					console.debug('Export to CSV');

					let tempGridData = [];

					if (systemHistoryCtrl.viewType == VIEWTYPE_METRICS && systemHistoryCtrl.selectedMetrics == 'MEM_USAGE') {
						for (let x = 0, y = systemHistoryCtrl.chartData.length; x < y; x++) {
							let _chartData = systemHistoryCtrl.chartData[x];
							let _value_mem_total = _chartData.value['MEM_TOTAL'];
							let _value_mem_usage = _chartData.value['MEM_USAGE'];

							// let _values = systemHistoryCtrl.chartData[x].value;
							if (_value_mem_total == null || _value_mem_total.length < 1 || _value_mem_usage == null || _value_mem_usage.length < 1)
								continue;

							for (let i = 0, j = _value_mem_usage.length; i < j; i++) {
								let _gridData = {};
								_gridData['host'] = systemHistoryCtrl.chartData[x].host.label + ( systemHistoryCtrl.chartUnit == '' ? '' : ' (' + systemHistoryCtrl.chartUnit + ')');
								_gridData['metric'] = systemHistoryCtrl.chartData[x].metricName;
								_gridData['date'] = moment(systemHistoryCtrl.chartXLabels[i]).format('YYYY-MM-DD HH:mm:ss');
								_gridData['value'] = _value_mem_usage[i] + ' / '+_value_mem_total[i];
								tempGridData.push(_gridData);
							}
						}
					} else {
						for (let x = 0, y = systemHistoryCtrl.chartData.length; x < y; x++) {

							let _values = systemHistoryCtrl.chartData[x].value;
							if (_values == null || _values.length < 1)
								continue;

							for (let i = 0, j = _values.length; i < j; i++) {
								let _gridData = {};
								_gridData['host'] = systemHistoryCtrl.chartData[x].host.label + ( systemHistoryCtrl.chartUnit == '' ? '' : ' (' + systemHistoryCtrl.chartUnit + ')');
								_gridData['metric'] = systemHistoryCtrl.chartData[x].metricName;
								_gridData['date'] = moment(systemHistoryCtrl.chartXLabels[i]).format('YYYY-MM-DD HH:mm:ss');
								_gridData['value'] = _values[i];
								tempGridData.push(_gridData);
							}
						}
					}

					systemHistoryCtrl.chartGridData = tempGridData;
					ap($scope);

					let param = {};
					param.fileName = "System_History.csv";
					param.id = "tempExcelGrid";
					$timeout(function () {
						$rootScope.$broadcast("exportToCSV", param); // $rootScope.$on
					}, 1500);
					systemHistoryCtrl.requestExcel = false;

					hideMySpinner();
					return;
				}


				// ########################### jFreeChart 처리
				systemHistoryCtrl.chartUrlList = [];
				let param = {
					data: systemHistoryCtrl.chartData,
					maxValue: systemHistoryCtrl.chartMaxValue.toString(),
					hasThreshold: systemHistoryCtrl.hasThreshold.toString(),
					unit: systemHistoryCtrl.chartUnit,
					timeData: systemHistoryCtrl.chartXLabels,
					metric: systemHistoryCtrl.selectedMetrics,
					viewType: systemHistoryCtrl.viewType
				};

				console.debug('REQUEST CHART IMG : ' + moment().format('YYYY-MM-DD HH:mm:ss'));
				DataService.httpPost("/activities/system/history/getChartImg", param, function (data) {
					hideMySpinner();
					systemHistoryCtrl.chartUrlList = data.data.pathTitleArray;

				}, false);
				// ###########################


				systemHistoryCtrl.chartArr = [];
				chartindex = 0;
				setChartModel();

				showMoreChartBtn();


				// 확대 차트 팝업이 열려있는 경우의 처리
				if ($scope.largeChartModel) {
					let sMoment = moment(systemHistoryCtrl.sDateTime);
					let eMoment = moment(systemHistoryCtrl.eDateTime);

					// 설정한 날짜를 분으로 변환
					let diffMin = eMoment.diff(sMoment, 'minutes');
					if (diffMin <= 180) {
						let chartText = $scope.largeChartModel.title.text;
						if (systemHistoryCtrl.chartArr != null && systemHistoryCtrl.chartArr.length > 0) {
							for (let i = 0, j = systemHistoryCtrl.chartArr.length; i < j; i++) {
								if (systemHistoryCtrl.chartArr[i].title.text == chartText) {
									$scope.largeChartModel = systemHistoryCtrl.chartArr[i];
									$scope.largeChartModel.button = systemHistoryCtrl.viewType == VIEWTYPE_METRICS ? 'Host' : 'Metrics';
									break;
								}
							}
						}
					}

				}
			}


			// method

			/**
			 * HostName List 생성
			 * 선택한 클러스터에 대한 Host Name 목록 데이터 호출 및 셀렉트박스 생성
			 */
			function getHostNameList() {
				DataService.httpGet("/activities/system/history/getHostNameList/" + systemSeq, null, function (data) {
					if (data && data.result == 1) {
						if (data.data && data.data.length == 0) {
							//alert('Can not retrieve host list.');
							systemHistoryCtrl.hostNameList = [];
							return;
						}
						systemHistoryCtrl.hostNameList = data.data;
						if (systemHistoryCtrl.viewType == VIEWTYPE_METRICS && systemHistoryCtrl.hostNameList && systemHistoryCtrl.hostNameList.length > 0 && systemHistoryCtrl.hostNameList[0].value != '00') {
							systemHistoryCtrl.hostNameList.unshift(allOption);
						}
						getCategoryMetricList();	// Category List / Metric List
					}

				}, false);
			}

			/**
			 * Metric Tree
			 */
			function getCategoryMetricList() {
				DataService.httpGet("/activities/system/history/getMetricList/", null, function (data) {
					systemHistoryCtrl.categoryMetricList = data.data;
					// systemHistoryCtrl.metricTreeModel = [];
					systemHistoryCtrl.metricTreeModel = systemHistoryCtrl.categoryMetricList;		// Metric Tree 데이터 설정
					systemHistoryCtrl.categorySelectDataList = [];

					for (let i = 0, j = systemHistoryCtrl.categoryMetricList.length; i < j; i += 1) {
						systemHistoryCtrl.categorySelectDataList.push({
							'label': systemHistoryCtrl.categoryMetricList[i].metricName,
							'value': systemHistoryCtrl.categoryMetricList[i].metricName
						});
					}

					systemHistoryCtrl.selectedCategory = systemHistoryCtrl.categorySelectDataList[0];
					getMetricDataList(systemHistoryCtrl.selectedCategory.label);
					ap($scope);
				}, false);
			}

			/**
			 * 선택한 카테고리에 대한 Metric 리스트를 가져온다
			 * @param category
			 * @returns {Array}
			 */
			function getMetricDataList(category) {
				systemHistoryCtrl.metricSelectDataList = [];

				let selectedLargeChartCategory = null;

				for (let i = 0, j = systemHistoryCtrl.categoryMetricList.length; i < j; i += 1) {
					if (systemHistoryCtrl.categoryMetricList[i].metricName == category) {
						if ($scope.largeChartModel)
							selectedLargeChartCategory = systemHistoryCtrl.categoryMetricList[i];
						for (let m = 0, n = systemHistoryCtrl.categoryMetricList[i].childrenList.length; m < n; m += 1) {
							systemHistoryCtrl.metricSelectDataList.push({
								'label': systemHistoryCtrl.categoryMetricList[i].childrenList[m].metricName,
								'value': systemHistoryCtrl.categoryMetricList[i].childrenList[m].metricName
							});
						}
					}
				}

				if (systemHistoryCtrl.viewType == VIEWTYPE_METRICS) {
					if (category == 'CPU') {
						systemHistoryCtrl.selectedMetrics = 'LOAD_ONE';
					} else {
						systemHistoryCtrl.selectedMetrics = systemHistoryCtrl.metricSelectDataList[0].label;
					}

					systemHistoryCtrl.searchMetricList = [];
					systemHistoryCtrl.searchMetricList.push({'metricName': systemHistoryCtrl.selectedMetrics});
				} else {
					systemHistoryCtrl.selectedMetrics = null;
				}
			}

			/**
			 * Metrics / Host View Change
			 */
			systemHistoryCtrl.changeView = function (type) {
				systemHistoryCtrl.empty = true;
				$('#msg_area').text('You need to search.');

				systemHistoryCtrl.chartUrlList = [];
				systemHistoryCtrl.chartArr = [];
				$('.btn-more').hide();
				systemHistoryCtrl.thresholdValue = undefined;

				if (LOAD_COMPLETE && type == 'metrics') {
					systemHistoryCtrl.viewType = VIEWTYPE_METRICS;
					if (systemHistoryCtrl.hostNameList && systemHistoryCtrl.hostNameList.length > 0 && systemHistoryCtrl.hostNameList[0].value != '00') {
						systemHistoryCtrl.hostNameList.unshift(allOption);
					}


					if (!$scope.largeChartModel) {
						systemHistoryCtrl.selectedHost = systemHistoryCtrl.hostNameList[0];
						if(systemHistoryCtrl.hostNameList && systemHistoryCtrl.hostNameList.length > 0) {
							systemHistoryCtrl.selectedHostName = systemHistoryCtrl.selectedHost.label;
							if (systemHistoryCtrl.categorySelectDataList) {
								systemHistoryCtrl.selectedCategory = systemHistoryCtrl.categorySelectDataList[0];
								if (systemHistoryCtrl.selectedCategory.label == 'CPU') {
									systemHistoryCtrl.selectedMetrics = 'LOAD_ONE';
								} else {
									systemHistoryCtrl.selectedMetrics = systemHistoryCtrl.metricSelectDataList[0].label;
								}
								getMetricDataList(systemHistoryCtrl.selectedCategory.label);
							}
						}
					} else {
						systemHistoryCtrl.selectedHost = $scope.largeChartModel.host;
						systemHistoryCtrl.selectedHostName = systemHistoryCtrl.selectedHost.systemName;
						systemHistoryCtrl.selectedCategory = $scope.largeChartModel.category;
						getMetricDataList(systemHistoryCtrl.selectedCategory.label);
						systemHistoryCtrl.selectedMetrics = $scope.largeChartModel.metricName;

						let timer = $timeout(function () {
							systemHistoryCtrl.clickSearch();

							$timeout.cancel(timer);
						}, 500);
					}

					$('#mu-btn-host').removeClass('active');
					$('#mu-btn-metrics').addClass('active');

				}
				else if (LOAD_COMPLETE && type == 'host') {
					systemHistoryCtrl.viewType = VIEWTYPE_HOST;

					if (systemHistoryCtrl.hostNameList && systemHistoryCtrl.hostNameList.length > 0 && systemHistoryCtrl.hostNameList[0].value == '00') {
						systemHistoryCtrl.hostNameList.shift();
					}

					let treeViewObj = null;

					if (!$scope.largeChartModel) {
						treeViewObj = systemHistoryCtrl.metricTreeModel[0];
						systemHistoryCtrl.selectedHost = systemHistoryCtrl.hostNameList[0];
						systemHistoryCtrl.selectedHostName = systemHistoryCtrl.selectedHost.systemName;
						systemHistoryCtrl.selectedCategory = {
							'label': treeViewObj.metricName,
							'value': treeViewObj.metricName
						};
					}
					else {
						for (let i = 0, j = systemHistoryCtrl.metricTreeModel.length; i < j; i += 1) {
							if (systemHistoryCtrl.metricTreeModel[i].metricName == $scope.largeChartModel.category.label) {
								treeViewObj = systemHistoryCtrl.metricTreeModel[i];
							}
						}
						for (let i = 0, j = systemHistoryCtrl.hostNameList.length; i < j; i += 1) {
							if (systemHistoryCtrl.hostNameList[i].label == $scope.largeChartModel.host.label) {
								systemHistoryCtrl.selectedHost = systemHistoryCtrl.hostNameList[i];
								systemHistoryCtrl.selectedHostName = systemHistoryCtrl.selectedHost.label;
							}
						}

					}

					// systemHistoryCtrl.selectTreeCategory(treeViewObj, 'label');
					systemHistoryCtrl.selectedCategory = {'label': treeViewObj.label, 'value': treeViewObj.label};
					systemHistoryCtrl.searchMetricList = [];
					for (let i = 0, j = treeViewObj.childrenList.length; i < j; i += 1) {
						systemHistoryCtrl.searchMetricList.push(treeViewObj.childrenList[i]);
					}

					$('#mu-btn-metrics').removeClass('active');
					$('#mu-btn-host').addClass('active');

				}

			};

			/**
			 * 셀렉트 박스 변경 이벤트
			 * Level, Condition Until
			 * Select Box Event
			 */
			systemHistoryCtrl.changeSelectBox = function (event, type) {

				if (LOAD_COMPLETE && type == VIEWTYPE_HOST) {
					systemHistoryCtrl.selectedHost = event;
					systemHistoryCtrl.selectedHostName = systemHistoryCtrl.selectedHost.label;


				} else if (LOAD_COMPLETE && type == 'LEVEL') {
					systemHistoryCtrl.selectedLevel = event.value;
				} else if (LOAD_COMPLETE && type == 'SIZE') {
					systemHistoryCtrl.selectedChartSize = event.value;
				} else if (LOAD_COMPLETE && type == 'CATEGORY' && systemHistoryCtrl.viewType == VIEWTYPE_METRICS) {
					systemHistoryCtrl.selectedCategory = event;
					getMetricDataList(systemHistoryCtrl.selectedCategory.label);
				} else if (LOAD_COMPLETE && type == VIEWTYPE_METRICS && systemHistoryCtrl.viewType == VIEWTYPE_METRICS) {
					systemHistoryCtrl.selectedMetrics = event.value;
					systemHistoryCtrl.searchMetricList = [];
					systemHistoryCtrl.searchMetricList.push({'metricName': systemHistoryCtrl.selectedMetrics});
				} else if (LOAD_COMPLETE && type == 'UNTIL') {
					systemHistoryCtrl.selectedUntil = event.value;
					let eMoment = moment(systemHistoryCtrl.eDateTime);
					systemHistoryCtrl.sDateTime = eMoment.subtract(systemHistoryCtrl.selectedUntil, 'hour').format('YYYY-MM-DD HH:mm');
					ap($scope);
				} else if (LOAD_COMPLETE && type == 'CONDITION') {
					systemHistoryCtrl.selectedCondition = event.value;
				}

			};

			/**
			 * 스크롤이 마지막으로 내려갔을때 차트 추가 생성
			 */
			$('#chartOuterArea').scroll(function (e) {

				if ($('#chartOuterArea').scrollTop() + 20 > $('#chartListArea').height() - $('#chartOuterArea').height()) {
					systemHistoryCtrl.loadMoreRecords();
				}

			});

			/**
			 * 스크롤 내리면 추가 차트 생성
			 */
			systemHistoryCtrl.loadMoreRecords = function () {
				if (systemHistoryCtrl.chartArr.length >= maxChartCnt) return;

				if (totalChartCnt - loopCnt > 8) {
					totalChartCnt = totalChartCnt - loopCnt;
					loopCnt = 8;
				}
				else
					loopCnt = totalChartCnt - loopCnt;

				setChartModel();
				ap($scope);
			};

			/**
			 * Excel 다운로드 버튼 클릭
			 */
			systemHistoryCtrl.clickExcelDownload = function () {
				systemHistoryCtrl.requestExcel = true;
				systemHistoryCtrl.clickSearch();
			};

			/**
			 * Search 버튼 클릭
			 * 2017.06.26 버튼 클릭하면 host alert 가 뜬다
			 */
			systemHistoryCtrl.clickSearch = function () {

				//getHostNameList();
				// console.debug('Search CLICK. Request WebSocket : ' + moment().format('YYYY-MM-DD HH:mm:ss'));
				if(systemHistoryCtrl.hostNameList.length == 0 ) {
					alert('Can not retrieve host list.');
					return;
				}
				if (systemHistoryCtrl.searchMetricList.length == 0) {
					alert('No metric data.');
					return;
				}

				if (systemHistoryCtrl.selectedHost == null) systemHistoryCtrl.selectedHost = systemHistoryCtrl.hostNameList[0];
				if (systemHistoryCtrl.selectedLevel == null) systemHistoryCtrl.selectedLevel = systemHistoryCtrl.levelList[0].value;
				if (systemHistoryCtrl.selectedCondition == null) systemHistoryCtrl.selectedCondition = systemHistoryCtrl.conditionList[0].value;
				if (systemHistoryCtrl.selectedUntil == null) systemHistoryCtrl.selectedUntil = systemHistoryCtrl.untilList[0].value;

				// 날짜(시작, 종료) validation check
				if (!CommonUtil.validateStartEndDate(systemHistoryCtrl.sDateTime, systemHistoryCtrl.eDateTime))
					return;

				// 마지막 날짜가 현재 날짜보다 크다면 마지막 날짜를 현재 날짜로 설정
				if (CommonUtil.isEndDateLargerThanToday(systemHistoryCtrl.eDateTime)) {
					systemHistoryCtrl.eDateTime = moment().subtract(2, 'minute').format('YYYY-MM-DD HH:mm');
				}

				let sMoment = moment(systemHistoryCtrl.sDateTime);
				let eMoment = moment(systemHistoryCtrl.eDateTime);

				// 설정한 날짜를 분으로 변환
				let diffMin = eMoment.diff(sMoment, 'minutes');

				let param_standard = 15;	// 기본은 15로 하기로 함 (서버와 협의)
				if (diffMin >= 360) {		// 6시간이 넘는 경우
					param_standard = 15;
				}
				if (diffMin >= 2880) {
					param_standard = 60;	// 2일이 넘는 경우
				}
				if (diffMin >= 21600) {
					param_standard = 1440;	// 15일이 넘는 경우
				}

				let duration = moment.duration(eMoment.diff(sMoment));
				periodDay = duration.asDays();

				let param = [];
				let metricData = {};
				metricData.standard = param_standard.toString();
				metricData.aggregation = systemHistoryCtrl.selectedLevel;
				metricData.startTime = (sMoment.valueOf() / 1000).toString();
				metricData.endTime = (eMoment.valueOf() / 1000).toString();
				let metrics = [];
				for (let i = 0, j = systemHistoryCtrl.searchMetricList.length; i < j; i += 1) {
					metrics.push(systemHistoryCtrl.searchMetricList[i].metricName);
				}
				metricData.metrics = metrics;

				if (diffMin <= 180) metricData.aggregation = 'LAST';	// 3시간 이하인 경우에는 무조건 LAST로 보내기.
				// if (systemHistoryCtrl.requestExcel) metricData.aggregation = 'LAST';	// 엑셀 다운로드 요청인 경우 무조건 LAST 로 보내기. raw 데이터 받아야하기 때문 // 변경.. 엑셀도 차트와 같은 설정으로 적용 (2017.12.04)
				aggregation = metricData.aggregation;

				param.push({'metricData': [metricData]});

				// 클러스터 내의 모든 호스트. 특정 metric
				if ((systemHistoryCtrl.viewType == VIEWTYPE_METRICS ) ||
					(systemHistoryCtrl.viewType == VIEWTYPE_HOST && systemHistoryCtrl.selectedHost.label == 'ALL')) {
					param[0].function = 'getMetricChartList';
					param[0].systemSeq = systemSeq;
					param[0].resultEvent = 'GET_METRIC_CHART_LIST_EVENT';
					param[0].period = diffMin.toString();

				} else {	// 클러스터 내의 특정 호스트. 모든 metric
					metricData.resultEvent = 'GET_METRIC_CHART_LIST_EVENT';
					metricData.period = diffMin.toString();
					metricData.systemSeq = systemSeq;
					// metricData.hostName = systemHistoryCtrl.selectedHost.label;
					metricData.hostName = systemHistoryCtrl.selectedHostName;
				}

				if (systemHistoryCtrl.viewType == VIEWTYPE_METRICS) {
					if (systemHistoryCtrl.selectedHostName != null && systemHistoryCtrl.selectedHostName != '' && systemHistoryCtrl.selectedHostName.toUpperCase() != 'ALL') {	// 사용자가 조회하려는 Host Name 입력한 경우
						metricData.hostName = systemHistoryCtrl.selectedHostName;
					}
				}

				if (!systemHistoryCtrl.requestExcel)
					systemHistoryCtrl.chartUrlList = [];

				showMySpinner();
				WebSocketService.callRequest(param);

			};

			systemHistoryCtrl.changeDate = function (event) {
				if (LOAD_COMPLETE) {
					systemHistoryCtrl.sDateTime = event.sDateTime;
					systemHistoryCtrl.eDateTime = event.eDateTime;
				}
			};

			/**
			 * 차트값이 사용자가 설정한 임계치 조건에 맞는지 확인
			 */
			function getHasThresholdValue(chartVal) {

				let threshold = Number(systemHistoryCtrl.thresholdValue);
				let returnValue = false;

				if (systemHistoryCtrl.selectedCondition == '>') {
					if (chartVal > threshold) {
						returnValue = true;
					}

				} else if (systemHistoryCtrl.selectedCondition == '>=') {
					if (chartVal >= threshold) {
						returnValue = true;
					}

				} else if (systemHistoryCtrl.selectedCondition == '<=') {
					if (chartVal <= threshold) {
						returnValue = true;
					}

				} else if (systemHistoryCtrl.selectedCondition == '<') {
					if (chartVal < threshold) {
						returnValue = true;
					}
				}

				return returnValue;
			}

			/**
			 * 차트 데이터 객체에 값 할당
			 */
			function setChartValList(valueArray, chartValueObj) {

				if (systemHistoryCtrl.viewType == VIEWTYPE_METRICS && systemHistoryCtrl.selectedMetrics == 'MEM_USAGE') {
					let valueData = {};

					let hasValue = false;		// 값이 없는 차트인지 확인하기 위함

					$.each(valueArray, function (key, value) { // key :  MEM_TOTAL, MEM_USAGE

						let valueDataList = value;

						let chartValList = [];

						for (let i = 0, j = valueDataList.length; i < j; i += 1) {
							let timestamp = valueDataList[i][0];
							let chartVal = valueDataList[i][1];
							chartVal = (chartVal.toFixed(2));

							if ($.inArray(timestamp, systemHistoryCtrl.chartXLabels) == -1) {		// X 축 라벨 생성
								systemHistoryCtrl.chartXLabels.push(timestamp);
							}

							// systemHistoryCtrl.thresholdValue 와 비교해서 넘는 값이 있는 차트라면 차트 객체 저장하는 리스트를 따로 관리
							if (systemHistoryCtrl.thresholdValue && chartValueObj.hasThresholdValue == false)
								chartValueObj.hasThresholdValue = getHasThresholdValue(chartVal);

							chartValList.push(chartVal);		// 차트 값 저장
							if (Number(chartVal) != 0) {
								hasValue = true;
							}
						}


						valueData[key] = chartValList;
						// chartValTotalList.push(valueData);

					});


					// chartValueObj.value = chartValTotalList;
					chartValueObj.value = valueData;
					chartValueObj.hasValue = hasValue;


				} else {
					let chartValList = [];
					let hasValue = false;		// 값이 없는 차트인지 확인하기 위함
					for (let i = 0, j = valueArray.length; i < j; i += 1) {
						let timestamp = valueArray[i][0];
						let chartVal = valueArray[i][1];
						chartVal = (chartVal.toFixed(2));

						// timestamp = moment(timestamp).format('YYYY-MM-DD HH:mm:ss');

						if ($.inArray(timestamp, systemHistoryCtrl.chartXLabels) == -1) {		// X 축 라벨 생성
							systemHistoryCtrl.chartXLabels.push(timestamp);
						}

						// systemHistoryCtrl.thresholdValue 와 비교해서 넘는 값이 있는 차트라면 차트 객체 저장하는 리스트를 따로 관리
						if (systemHistoryCtrl.thresholdValue && chartValueObj.hasThresholdValue == false)
							chartValueObj.hasThresholdValue = getHasThresholdValue(chartVal);

						chartValList.push(chartVal);		// 차트 값 저장
						if (Number(chartVal) != 0) {
							hasValue = true;
						}
					}

					chartValueObj.value = chartValList;
					chartValueObj.hasValue = hasValue;
				}



				return chartValueObj.hasThresholdValue;
			}


			/**
			 *    각 차트에 옵션 설정
			 */
			function setChartModel() {
				let maxValue = systemHistoryCtrl.chartMaxValue;
				if (maxValue == 0) maxValue = null;

				if (systemHistoryCtrl.chartData == null || systemHistoryCtrl.chartData.length == 0) return;
				// showIndicator();

				// for (let i = 0 ; i < loopCnt ; i++) {
				for (let i = 0; i < systemHistoryCtrl.chartData.length; i++) {
					let _chartData = systemHistoryCtrl.chartData[chartindex] == null ? {} : systemHistoryCtrl.chartData[chartindex];
					_chartData.metricName = _chartData.metricName == null ? '' : _chartData.metricName;
					_chartData.chartName = _chartData.chartName == null ? '' : _chartData.chartName;
					_chartData.value = _chartData.value == null ? [] : _chartData.value;
					_chartData.plotLabelText = _chartData.metricName + "<br>%v";

					if (systemHistoryCtrl.viewType == VIEWTYPE_METRICS && systemHistoryCtrl.selectedMetrics == 'MEM_USAGE') {
						for (let m = 0, n = _chartData.value['MEM_TOTAL'].length; m < n; m++) {
							_chartData.value['MEM_TOTAL'][m] = Number(_chartData.value['MEM_TOTAL'][m]);
						}
						for (let m = 0, n = _chartData.value['MEM_USAGE'].length; m < n; m++) {
							_chartData.value['MEM_USAGE'][m] = Number(_chartData.value['MEM_USAGE'][m]);
						}
						_chartData.plotLabelText = "%t<br>%v";
					} else {
						for (let m = 0, n = _chartData.value.length; m < n; m++) {
							_chartData.value[m] = Number(_chartData.value[m]);
						}
					}

					_chartData.host = _chartData.host == null ? {} : _chartData.host;
					_chartData.category = _chartData.category == null ? {} : _chartData.category;
					let obj = {
						type: "area",
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
									text: transformDate()
								},
								fontSize: 12
							},
							plotLabel: {
								padding: 8,
								borderRadius: 3,
								borderColor: "#55bc75",
								backgroundColor: "#fff",
								color: "#333",
								visible: true,
								// text: _chartData.metricName + "<br>%v",
								text: _chartData.plotLabelText,
								fontSize: 12,
								thousandsSeparator: ","
							}
						},
						scaleY: {
							maxValue: maxValue,
							thousandsSeparator: ",",
							guide: {visible: false}
						},
						scaleX: {
							labels: systemHistoryCtrl.chartXLabels
							, transform: { 		// 날짜 형식 설정
								type: "date",
								text: transformDate()
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
						series: [
							{
								rules: [		// threashold 값 설정 시 각 차트에 반영
									{
										rule: '%v ' + systemHistoryCtrl.selectedCondition + ' ' + systemHistoryCtrl.thresholdValue,
										backgroundColor: '#89dcf7'
									}
								],
								tooltip: {
									visible: "false"
								},
								lineWidth: 1,
								lineColor: "#55c7eb",
								lineStyle: "solid",
								backgroundColor: "#c8f3ff",
								alphaArea: "1"
							}

						]
					};

					obj.title.text = _chartData.chartName + ( systemHistoryCtrl.chartUnit == '' ? '' : ' (' + systemHistoryCtrl.chartUnit + ')');
					if (systemHistoryCtrl.viewType == VIEWTYPE_METRICS && systemHistoryCtrl.selectedMetrics == 'MEM_USAGE') {
						obj.series.push({
							lineWidth: 1,
							lineColor: "red",
							lineStyle: "solid",
							backgroundColor: "transparent"
						});
						obj.series[0].values = _chartData.value['MEM_USAGE'];
						obj.series[0].text = 'MEM_USAGE';
						obj.series[1].values = _chartData.value['MEM_TOTAL'];
						obj.series[1].text = 'MEM_TOTAL';
					} else {
						obj.series[0].values = _chartData.value;
					}

					obj.host = _chartData.host;
					obj.category = _chartData.category;
					obj.metricName = _chartData.metricName;
					obj.id = "chart_" + chartindex;
					systemHistoryCtrl.chartArr.push(obj);
					chartindex = chartindex + 1;
				}


				// lazyHideIndicator();

			}

			function transformDate() {
				let showSec = '';
				if (aggregation == 'LAST')
					showSec = ':%s';

				if (periodDay >= 1) {
					return "%Y-%mm-%dd<br>%H:%i" + showSec
				} else {
					return "%H:%i" + showSec
				}
			}


			/**
			 * 차트 더블클릭
			 * 새 창에서 차트 보여준다
			 */
			systemHistoryCtrl.showLargeChart = function (idx) {
				if (!systemHistoryCtrl.chartArr || systemHistoryCtrl.chartArr.length == 0) return;
				let chart = systemHistoryCtrl.chartArr[idx];
				// for (let i = 0 , j = chart.series[0].values.length ; i < j ; i++) {
				// 	chart.series[0].values[i] = Number(chart.series[0].values[i]);
				// }
				$scope.largeChartModel = chart;
				$scope.largeChartModel.button = systemHistoryCtrl.viewType == VIEWTYPE_METRICS ? 'Host' : 'Metrics';

				let popup = ngDialog.open({
					template: "/common/chart_large_template.html",
					className: "ngdialog-theme-default custom-width",
					showClose: false,
					disableAnimation: true,
					cache: false,
					closeByDocument: false,
					closeByEscape: false,
					draggable: false,
					scope: $scope
				});
				let closer = $rootScope.$on('ngDialog.refresh', function (e, id) {
					if (id != popup.id) return;
					closer();
				});

				let timer = $timeout(function () {
					$compile($('#largeChart'))($scope);
					$timeout.cancel(timer);
				}, 500);

			};

			/**
			 * 차트에서
			 */
			$scope.goToView = function () {
				if ($scope.largeChartModel) {
					if (systemHistoryCtrl.viewType == VIEWTYPE_METRICS)
						systemHistoryCtrl.changeView('host');
					else
						systemHistoryCtrl.changeView('metrics');
					$scope.closeLargeChartDialog();
				}

			};

			$scope.zoomingChart = function (event) {
				if (REQUEST_ZOOMING_SEARCH == false) return;
				let sDate = $scope.largeChartModel.scaleX.labels[0];
				let eDate = $scope.largeChartModel.scaleX.labels[$scope.largeChartModel.scaleX.labels.length - 1];
				let sMoment = moment(sDate);
				let eMoment = moment(eDate);
				let diffMin = eMoment.diff(sMoment, 'minutes');
				sMoment = sMoment.format('YYYY-MM-DD HH:mm');
				eMoment = eMoment.format('YYYY-MM-DD HH:mm');

				let sMoment2;
				let eMoment2;
				if (diffMin <= 180) {
					sMoment2 = moment(sDate).add(Number(event.kmin) * 30, 'seconds');
					eMoment2 = moment(sDate).add(Number(event.kmax) * 30, 'seconds');
				} else {
					sMoment2 = moment(sDate).add(Number(event.kmin) * 15, 'minutes');
					eMoment2 = moment(sDate).add(Number(event.kmax) * 15, 'minutes');
				}

				sMoment2 = sMoment2.format('YYYY-MM-DD HH:mm');
				eMoment2 = eMoment2.format('YYYY-MM-DD HH:mm');
				systemHistoryCtrl.sDateTime = sMoment2;
				systemHistoryCtrl.eDateTime = eMoment2;

				systemHistoryCtrl.clickSearch();

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

			/**
			 * 차트 더 보기 버튼 클릭
			 */
			function showMoreChartBtn() {
				if (systemHistoryCtrl.chartData_threshold.length > 0 && systemHistoryCtrl.chartData_no_threshold.length > 0) $('.btn-more').show();
				else $('.btn-more').hide();
			}

			/**
			 * 컨디션에 해당되지 않는 차트들을 보여준다
			 */
			systemHistoryCtrl.showNoThresholdChart = function () {

				maxChartCnt = maxChartCnt + systemHistoryCtrl.chartData_no_threshold.length;

				if (systemHistoryCtrl.chartData_no_threshold.length > 20) {
					loopCnt = 20;
				} else if (systemHistoryCtrl.chartData_no_threshold.length > 0) {
					loopCnt = systemHistoryCtrl.chartData_no_threshold.length;
				}
				totalChartCnt = systemHistoryCtrl.chartData_no_threshold.length;

				$('.btn-more').hide();

				setChartModel();

			};

			/**
			 * Metric 트리 선택 이벤트 처리
			 */
			systemHistoryCtrl.selectTreeCategory = function (node, type) {
				systemHistoryCtrl.selectedCategory = {'label': node.label, 'value': node.label};
				systemHistoryCtrl.searchMetricList = [];
				for (let i = 0, j = node.childrenList.length; i < j; i += 1) {
					systemHistoryCtrl.searchMetricList.push(node.childrenList[i]);
				}

				systemHistoryCtrl.clickSearch();
			};

			/**
			 * Metric Tree Options
			 */
			function setTree() {
				systemHistoryCtrl.treeOptions = {
					dirSelectable: true
				}
			}

			function initialize() {

				systemSeq = ConfigManager.getSystemSeq();
				if (systemSeq == null || systemSeq == '') {
					if (clusterRetryCnt == 0) {
						alert('Cannot find cluster.');
					} else {
						let timer = $timeout(function () {
							clusterRetryCnt--;
							initialize();
							$timeout.cancel(timer);
						}, 300);
					}

				} else {
					addEventListener();

					getInitConfig();

					setTree();			// Metric Tree
				}

				$('#selectedHostName').focusout(function () {
					if ($(this).val() == '') {
						$(this).val('ALL');
					}
					systemHistoryCtrl.selectedHostName = $(this).val();

				});

				$('#selectedHostName').focus(function () {
					if ($(this).val() == 'ALL') {
						$(this).val('');
					}
				});

				$('#msg_area').text('You need to search.');


				let gridOption = [];

				gridOption.push({headerName: "Date", field: "date", width: 150, editable: false});
				gridOption.push({headerName: "Host", field: "host", width: 150, editable: false});
				gridOption.push({headerName: "Metric", field: "metric", width: 150, editable: false});
				gridOption.push({headerName: "Value", field: "value", width: 150, editable: false});

				systemHistoryCtrl.chartGridOption = gridOption;

				systemHistoryCtrl.chartGridData = [];


			}

			function getInitConfig() {
				getHostNameList();		// Host Name , Category List , Metric List
				let timer = $timeout(function () {

					// if (systemHistoryCtrl.hostNameList == null) {
					// 	getInitConfig();
					// } else {
					// 	// 기본 3시간 간격으로 설정
					// 	systemHistoryCtrl.selectedUntil = '3';
                    //
					// 	let eMoment = moment();
					// 	systemHistoryCtrl.eDateTime = eMoment.subtract(2, 'minute').format('YYYY-MM-DD HH:mm');
					// 	systemHistoryCtrl.sDateTime = eMoment.subtract(3, 'hour').format('YYYY-MM-DD HH:mm');
					// 	ap($scope);
                    //
					// 	LOAD_COMPLETE = true;
                    //
					// 	systemHistoryCtrl.changeView('metrics');
                    //
					// 	$timeout.cancel(timer);
					// }


					// 기본 3시간 간격으로 설정
					systemHistoryCtrl.selectedUntil = '3';

					let eMoment = moment();
					systemHistoryCtrl.eDateTime = eMoment.subtract(2, 'minute').format('YYYY-MM-DD HH:mm');
					systemHistoryCtrl.sDateTime = eMoment.subtract(3, 'hour').format('YYYY-MM-DD HH:mm');
					ap($scope);

					LOAD_COMPLETE = true;

					systemHistoryCtrl.changeView('metrics');

				}, 500);
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

			// 한글 입력 막기
			systemHistoryCtrl.fn_press_han = function(event)
			{
				console.log(event);
				//좌우 방향키, 백스페이스, 딜리트, 탭키에 대한 예외
				if(event.keyCode == 8 || event.keyCode == 9 || event.keyCode == 37 || event.keyCode == 39
					|| event.keyCode == 46 ) return;
				event.key = event.key.replace(/[\ㄱ-ㅎㅏ-ㅣ가-힣]/g, '');
			}

			// 한글입력막기 스크립트
			$(".not-kor").keyup(function(e) {
				if (!(e.keyCode >=37 && e.keyCode<=40)) {
					var v = $(this).val();
					$(this).val(v.replace(/[^a-z0-9]/gi,''));
				}
			});

			initialize();

		}]);

});