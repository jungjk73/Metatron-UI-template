define(["app", "moment"], function (app, moment) {
	app.controller("SwitchHistoryCtrl", ["$rootScope", "$scope", "$compile", "$http", "$q", "DataService", "ConfigManager", "WebSocketService", "$timeout", "ngDialog", "CommonUtil",
		function ($rootScope, $scope, $compile, $http, $q, DataService, ConfigManager, WebSocketService, $timeout, ngDialog, CommonUtil) {
			"use strict";


			// property
			var switchHistoryCtrl = this;
			var unbind = [];

			var LOAD_COMPLETE = false;		// 컴포넌트에 사용되는 데이터 모두 받아온 상태 체크
			var REQUEST_ZOOMING_SEARCH = true;	// zoom 이벤트가 두번 날아가는거 방지.

			switchHistoryCtrl.searchOption = {};
			switchHistoryCtrl.systemNameList = [];
			switchHistoryCtrl.chartUrlList = [];		// 차트 이미지 주소 저장
			switchHistoryCtrl.chartArr = [];			// 차트 옵션 객체 저장
			switchHistoryCtrl.chartXLabels = [];		// 차트 X 축 라벨 저장
			switchHistoryCtrl.chartData = {};			// 차트 데이터 저장
			switchHistoryCtrl.chartData_threshold = [];	// 임계치 있는 차트 데이터
			switchHistoryCtrl.chartData_no_threshold = [];	// 임계치 없는 차트 데이터
			switchHistoryCtrl.chartNameList = [];		// 차트 이름 (metric name / host name) 저장. 전체 차트 개수 계산용
			switchHistoryCtrl.requestExcel = false;		// 엑셀 다운로드 요청인지 구분. search 기능 이용
			switchHistoryCtrl.hasThreshold = false;		// 임계치 조건 차트가 있는 경우
			switchHistoryCtrl.empty = true;					// 데이터가 없을 경우

			var loopCnt;			// 차트 개수
			var chartindex = 0;
			var maxChartCnt;  		// 그리려는 최대 차트 개수 - 처음에 할당 후 불변
			var totalChartCnt;		// 전체 그려져야 하는 차트 개수 -
			var loadMoreCnt = 0;	// 추가 로드 카운트

			let mySpinner = null;
			let mySpinnerTarget = null;
			let myBlockUI = null;

			switchHistoryCtrl.untilList = [
				{"label": "Select", "value": "0"},
				{"label": "3H", "value": "3"},
				{"label": "6H", "value": "6"},
				{"label": "12H", "value": "12"},
				{"label": "1D", "value": "24"},
				{"label": "3D", "value": "72"}
			];

			// event-handler

			function addEventListener() {
				unbind = [
					$scope.$on('$destroy', destroy)
				];
			}

			function destroy() {
				DataService.httpPost("/activities/system/history/delChartImg", null, function (data) {

				}, false);

				unbind.forEach(function (fn) {
					fn();
				});

				switchHistoryCtrl.chartArr = null;
				switchHistoryCtrl.chartXLabels = null;
				switchHistoryCtrl.chartData = null;
				switchHistoryCtrl.chartData_threshold = null;
				switchHistoryCtrl.chartData_no_threshold = null;
				switchHistoryCtrl.chartNameList = null;
				switchHistoryCtrl.hostNameList = null;
				switchHistoryCtrl.categoryMetricList = null;
				switchHistoryCtrl.metricTreeModel = null;
				switchHistoryCtrl.categorySelectDataList = null;
				switchHistoryCtrl.selectedCategory = null;
				switchHistoryCtrl.metricList = null;
				switchHistoryCtrl.selectedMetrics = null;
				switchHistoryCtrl.selectedHost = null;

				switchHistoryCtrl = null;
				hideMySpinner();
			}



			// method

			/**
			 * Switch Name List, Metric List 조회
			 */
			function getFilterDataList() {

				let promise_switchName = $http({method : 'POST', url : '/activities/switch/history/getSysNameList'});
				let promise_metric = $http({method : 'POST', url : '/activities/switch/history/getMetricList'});

				$q.all([promise_switchName, promise_metric]).then(function(result){
					let result_switchName = result[0].data;
					let result_metricName = result[1].data;

					// switch name list
					let nameList = [];
					if (result_switchName.result == 1 && result_switchName.data.length > 0) {
						for (let i = 0 ; i < result_switchName.data.length ; i++) {
							nameList.push({label : result_switchName.data[i], value : result_switchName.data[i]});
						}
						switchHistoryCtrl.searchOption.sysName = nameList[0].value;
					}
					switchHistoryCtrl.systemNameList = nameList;

					// metric list
					let metricList = [];
					if (result_metricName.result == 1 && result_metricName.data.length > 0) {
						for (let i = 0 ; i < result_metricName.data.length ; i++) {
							metricList.push({label : result_metricName.data[i], value : result_metricName.data[i]});
						}
						switchHistoryCtrl.searchOption.metricName = metricList[0].value;
					}
					switchHistoryCtrl.metricList = metricList;

					LOAD_COMPLETE = true;
				});

			}



			/**
			 * 셀렉트 박스 변경 이벤트
			 * Level, Condition Until
			 * Select Box Event
			 */
			switchHistoryCtrl.changeSelectBox = function (event, type) {
				if (!LOAD_COMPLETE) return;

				if (type == 'SWITCH') {
					switchHistoryCtrl.searchOption.sysName = event.value;

				} else if (type == 'METRICS') {
					switchHistoryCtrl.searchOption.metricName = event.value;

				} else if (type == 'UNTIL') {
					let eMoment = moment(switchHistoryCtrl.eDateTime);
					switchHistoryCtrl.sDateTime = eMoment.subtract(event.value, 'hour').format('YYYY-MM-DD HH:mm');
					ap($scope);
				}
			};


			/**
			 * 날짜 변경
			 */
			switchHistoryCtrl.changeDate = function (event) {
				if (LOAD_COMPLETE) {
					switchHistoryCtrl.sDateTime = event.sDateTime;
					switchHistoryCtrl.eDateTime = event.eDateTime;
				}
			};


			/**
			 * 스크롤이 마지막으로 내려갔을때 차트 추가 생성
			 */
			$('#chartOuterArea').scroll(function (e) {

				if ($('#chartOuterArea').scrollTop() + 20 > $('#chartListArea').height() - $('#chartOuterArea').height()) {
					switchHistoryCtrl.loadMoreRecords();
				}

			});

			/**
			 * 스크롤 내리면 추가 차트 생성
			 */
			switchHistoryCtrl.loadMoreRecords = function () {
				if (switchHistoryCtrl.chartArr.length >= maxChartCnt) return;

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
			switchHistoryCtrl.clickExcelDownload = function () {
				switchHistoryCtrl.requestExcel = true;
				switchHistoryCtrl.getData();
			};

			/**
			 * Search 버튼 클릭
			 */
			switchHistoryCtrl.clickSearch = function () {
				switchHistoryCtrl.requestExcel = false;
				switchHistoryCtrl.getData();
			};
			switchHistoryCtrl.getData = function () {
				chartindex = 0;
				switchHistoryCtrl.chartArr = [];

				switchHistoryCtrl.searchOption.startDate = switchHistoryCtrl.sDateTime;
				switchHistoryCtrl.searchOption.endDate = switchHistoryCtrl.eDateTime;

				console.log('#### SEARCH CONDITION :: ',switchHistoryCtrl.searchOption);

				// 날짜(시작, 종료) validation check
				if (!CommonUtil.validateStartEndDate(switchHistoryCtrl.sDateTime, switchHistoryCtrl.eDateTime))
					return;

				// 마지막 날짜가 현재 날짜보다 크다면 마지막 날짜를 현재 날짜로 설정
				if (CommonUtil.isEndDateLargerThanToday(switchHistoryCtrl.eDateTime)) {
					switchHistoryCtrl.eDateTime = moment().subtract(2, 'minute').format('YYYY-MM-DD HH:mm');
				}


				let param = angular.copy(switchHistoryCtrl.searchOption);


				if (!switchHistoryCtrl.requestExcel)
					switchHistoryCtrl.chartUrlList = [];

				showMySpinner();
				switchHistoryCtrl.chartUrlList = [];
				DataService.httpPost("/activities/switch/history/getChartData", param, function (result) {
					console.log(result);
					if (result.result == 1 && result.data != null) {

						let ifNames = Object.keys(result.data.chartPathMap);

						if (switchHistoryCtrl.requestExcel){
							console.debug('Export to CSV');

							if (!ifNames || ifNames.length == 0) {
								alert("There is no data");
								hideMySpinner();
								return;
							}
							let empty = true;
							let tempGridData = [];
							for (let x = 0, y = ifNames.length; x < y; x++) {
								let ifName = ifNames[x];
								let _chart = result.data.chart[ifName];
								let _values = _chart.values;

								for (let i = 0, j = _values.length; i < j; i++) {
									let _gridData = {};
									if (_values[i] != null && _values[i].length > 0)
										empty = false;

									let unit =  _chart.unit == '' ? '' : ' ('+_chart.unit+')';

									_gridData['date'] = moment(_values[i][0]).format('YYYY-MM-DD HH:mm:ss');
									_gridData['sysName'] = _chart.sysName;
									_gridData['metric'] = _chart.metricName;
									_gridData['ifName'] = _chart.ifName;
									_gridData['value'] = _values[i][1] + unit;

									tempGridData.push(_gridData);
								}
							}

							if (empty) {
								alert("There is no data for Excel.");
								// $('#msg_area').text('No Data.');
								// historyAnalysisCtrl.empty = true;
								hideMySpinner();
								return;
							}

							switchHistoryCtrl.chartGridData = tempGridData;
							ap($scope);


							let param = {};
							param.fileName = "Switch_History.csv";
							param.id = "tempExcelGrid";
							$timeout(function () {
								$rootScope.$broadcast("exportToCSV", param); // $rootScope.$on
							}, 1500);

							hideMySpinner();
							// return;
						}
						else {
							for (let i = 0 ; i < ifNames.length ; i++) {
								switchHistoryCtrl.chartUrlList.push(result.data.chartPathMap[ifNames[i]][0]);
							}
							if (switchHistoryCtrl.chartUrlList.length > 0) switchHistoryCtrl.empty = false;
							console.log('#### switchHistoryCtrl.chartUrlList :: ',switchHistoryCtrl.chartUrlList);

							switchHistoryCtrl.chartData = result.data.chart;

							switchHistoryCtrl.chartXLabels = result.data.chartTime;

							setChartModel();
							hideMySpinner();
						}

					}
				}, false);

			};


			/**
			 *    각 차트에 옵션 설정
			 */
			function setChartModel() {
				let maxValue = null;

				let ifNames = Object.keys(switchHistoryCtrl.chartData);

				if (switchHistoryCtrl.chartData == null || ifNames.length == 0) return;
				// showIndicator();

				console.log(switchHistoryCtrl.chartData);

				// for (var i = 0 ; i < loopCnt ; i++) {
				for (var i = 0; i < ifNames.length; i++) {
					let _ifName = ifNames[i];
					let _chartData = _ifName == null ? {} : switchHistoryCtrl.chartData[_ifName];

					_chartData.value = [];
					for (let m = 0, n = _chartData.values.length; m < n; m++) {
						_chartData.value[m] = Number(_chartData.values[m][1]);
					}
					var obj = {
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
								text: _chartData.ifName + "<br>%v"+ " "+_chartData.unit,
								fontSize: 12,
								thousandsSeparator: ","
							}
						},
						scaleY: {
							maxValue: _chartData.maxValue,
							thousandsSeparator: ",",
							guide: {visible: false}
						},
						scaleX: {
							labels: switchHistoryCtrl.chartXLabels
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

					obj.title.text = _chartData.systemId + ( _chartData.unit == '' ? '' : ' (' + _chartData.unit + ')') + ' - '+_chartData.ifName;
					obj.series[0].values = _chartData.value;
					obj.id = "chart_" + chartindex;
					switchHistoryCtrl.chartArr.push(obj);
				}

				console.log(switchHistoryCtrl.chartArr);


				// lazyHideIndicator();

			}

			function transformDate() {
				return "%Y-%mm-%dd<br>%H:%i:%s";
			}


			/**
			 * 차트 더블클릭
			 * 새 창에서 차트 보여준다
			 */
			switchHistoryCtrl.showLargeChart = function (idx) {
				if (!switchHistoryCtrl.chartArr || switchHistoryCtrl.chartArr.length == 0) return;
				let chart = switchHistoryCtrl.chartArr[idx];
				$scope.largeChartModel = chart;
				$scope.largeChartModel.button = false;

				var popup = ngDialog.open({
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
				var closer = $rootScope.$on('ngDialog.refresh', function (e, id) {
					if (id != popup.id) return;
					closer();
				});

				let timer = $timeout(function () {
					$compile($('#largeChart'))($scope);
					$timeout.cancel(timer);
				}, 500);

			};

			$scope.zoomingChart = function (event) {
				if (REQUEST_ZOOMING_SEARCH == false) return;
				let sDate = $scope.largeChartModel.scaleX.labels[0];
				let eDate = $scope.largeChartModel.scaleX.labels[$scope.largeChartModel.scaleX.labels.length - 1];
				let sMoment = moment(Number(sDate));
				let eMoment = moment(Number(eDate));
				sMoment = sMoment.format('YYYY-MM-DD HH:mm');
				eMoment = eMoment.format('YYYY-MM-DD HH:mm');

				let sMoment2;
				let eMoment2;
					sMoment2 = moment(Number(sDate)).add(Number(event.kmin), 'minutes');
					eMoment2 = moment(Number(sDate)).add(Number(event.kmax), 'minutes');

				sMoment2 = sMoment2.format('YYYY-MM-DD HH:mm');
				eMoment2 = eMoment2.format('YYYY-MM-DD HH:mm');

				switchHistoryCtrl.sDateTime = sMoment2;
				switchHistoryCtrl.eDateTime = eMoment2;

				switchHistoryCtrl.clickSearch();

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
				if (switchHistoryCtrl.chartData_threshold.length > 0 && switchHistoryCtrl.chartData_no_threshold.length > 0) $('.btn-more').show();
				else $('.btn-more').hide();
			}


			function initialize() {
				addEventListener();

				getInitConfig();

				$('#msg_area').text('You need to search.');


				let gridOption = [];

				gridOption.push({headerName: "Date", field: "date", width: 150, editable: false});
				gridOption.push({headerName: "Switch", field: "sysName", width: 150, editable: false});
				gridOption.push({headerName: "Metric", field: "metric", width: 150, editable: false});
				gridOption.push({headerName: "IF Name", field: "ifName", width: 150, editable: false});
				gridOption.push({headerName: "Value", field: "value", width: 150, editable: false});

				switchHistoryCtrl.chartGridOption = gridOption;

				switchHistoryCtrl.chartGridData = [];
			}

			function getInitConfig() {

				getFilterDataList();		// System Name ,  Metric List

				let timer = $timeout(function () {

					// 기본 3시간 간격으로 설정
					switchHistoryCtrl.selectedUntil = '3';

					let eMoment = moment();
					switchHistoryCtrl.eDateTime = eMoment.subtract(2, 'minute').format('YYYY-MM-DD HH:mm');
					switchHistoryCtrl.sDateTime = eMoment.subtract(3, 'hour').format('YYYY-MM-DD HH:mm');
					ap($scope);

					LOAD_COMPLETE = true;


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

			initialize();

		}]);

});