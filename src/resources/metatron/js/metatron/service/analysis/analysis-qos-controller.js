define([ "app" ,"moment"], function(app,moment) {
	app.controller("HistoryQosCtrl", [	"$rootScope","$scope","$timeout", "$sce", "DataService", "ConfigManager","WebSocketService", "GridRenderer","ngDialog", "$compile", "CommonUtil",
		function($rootScope, $scope,$timeout, $sce, DataService, ConfigManager, WebSocketService, GridRenderer, ngDialog, $compile, CommonUtil) {
			"use strict";


			// property

			var historyQosCtrl = this;
			var systemSeq = "";
			var unbind = [];
			var chartIdx = 0;
			var chartShowIdx = 0;
			var chartTotal = 0;
			historyQosCtrl.empty = true;

			let allOption = {value: 'all', label: 'ALL'};

			let mySpinner = null;
			let mySpinnerTarget = null;
			let myBlockUI = null;

			var periodDay = 0;

			historyQosCtrl.selectedQos = '';
			historyQosCtrl.selectedHost = 'ALL';

			historyQosCtrl.chartDataArr = {};
			historyQosCtrl.requestExcel = false;		// 엑셀 다운로드 요청인지 구분. search 기능 이용

			$scope.largeChartModel = null;

			let orderArr = ['select','update'];			// select, update, insert, delete

			var LOAD_COMPLETE = false;		// 컴포넌트에 사용되는 데이터 모두 받아온 상태 체크
			var REQUEST_ZOOMING_SEARCH = true;	// zoom 이벤트가 두번 날아가는거 방지.

			historyQosCtrl.typeList = [];

			historyQosCtrl.untilList = [
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
					$scope.$on(ConfigManager.getEvent("CHANGE_SYSTEM_SEQ_EVENT"), onChangeSystemGroupIdEventHandler),
					$scope.$on(ConfigManager.getEvent("GET_METRIC_CHART_LIST_EVENT"), getMetricChartListHandler),
					$scope.$on('$destroy', destroy)
				];
			}

			function destroy() {
				DataService.httpPost("/activities/system/history/delChartImg", null , function(data) {

				}, false);

				hideMySpinner();

				unbind.forEach(function(fn) {
					fn();
				});

				historyQosCtrl = null;
				chartIdx = null;
				chartShowIdx  = null;
				chartTotal = null;
			}

			function onChangeSystemGroupIdEventHandler(event, data) {
				if (data == null)
					return;

				systemSeq = ConfigManager.getSystemSeq();
			}

			/**
			 * 웹소켓에서 받아온 차트 데이터들 처리
			 * @param event
			 * @param data
			 */
			function getMetricChartListHandler(event, data){

				let chartData = data.searchResults;

				historyQosCtrl.metricChartMap = {};


				if (!chartData) {
					console.error('No Result Data From WebSocket');
					hideMySpinner();
					historyQosCtrl.empty = true;
					$('#msg_area').text('No data.');
					return;
				}

				let totalChartSize = 0;
				historyQosCtrl.chartDataArr = {};

				historyQosCtrl.metricMaxMap = {};		// Metric 별 최대값

				let keySet = (Object.keys(chartData)).sort();		// 차트 이름순으로 정렬

				if (chartData != null && keySet.length > 0) {
					historyQosCtrl.empty = false;
				}

				for (let i = 0; i < keySet.length; i++) {
					let hostName = keySet[i];
					let hostObj = chartData[hostName];
					let metricTypeSet = (Object.keys(hostObj));

					for (let x = 0 ; x < metricTypeSet.length ; x++) {
						let metricTypeName = metricTypeSet[x];
						let metricChartObj = hostObj[metricTypeName];
						let metricNameSet = (Object.keys(metricChartObj));

						totalChartSize += metricNameSet.length;

						let currMetricMaxValue = 0;
						for (let m = 0 ; m < metricNameSet.length ; m++) {
							let metricName = metricNameSet[m];
							let chartValueObj = metricChartObj[metricName];

							let values = chartValueObj.map(arr => arr[1]);
							let currMax = Math.max.apply(null,values);
							currMetricMaxValue = Math.max(currMetricMaxValue, currMax);
							historyQosCtrl.chartDataArr[hostName+'__'+metricName] = chartValueObj;
						}

						// max 값 계산
						if ( !historyQosCtrl.metricMaxMap[metricTypeName] ) historyQosCtrl.metricMaxMap[metricTypeName] = 0;
						historyQosCtrl.metricMaxMap[metricTypeName] = Math.max(historyQosCtrl.metricMaxMap[metricTypeName], currMetricMaxValue);
					}
				}

				if (totalChartSize == 0) {
					historyQosCtrl.empty = true;
					$('#msg_area').text('No data.');
				}


				// EXCEL 처리
				if (historyQosCtrl.requestExcel) {
					console.debug('Export to CSV');
					let gridOption = [];
					historyQosCtrl.chartGridData = [];
					let headerFinish = false;
					gridOption.push({headerName: "Date", field: "date", width: 150, editable: false});
					gridOption.push({headerName: "Host", field: "host", width: 150, editable: false});
					gridOption.push({headerName: "Metric", field: "metric", width: 150, editable: false});
					gridOption.push({headerName: "Value", field: "value", width: 150, editable: false});

					let hostMetricList = Object.keys(historyQosCtrl.chartDataArr);

					for (let x = 0, y = hostMetricList.length; x < y; x++) {

						let keyArr = hostMetricList[x].split('__');
						let _host = keyArr[0];
						let _metric = keyArr[1];


						let _values = historyQosCtrl.chartDataArr[hostMetricList[x]];
						for (let i = 0, j = _values.length; i < j; i++) {
							let timeValue = _values[i];
							let _gridData = {};
							_gridData['host'] = _host;
							_gridData['metric'] = _metric;
							_gridData['date'] = moment(timeValue[0]).format('YYYY-MM-DD HH:mm:ss');
							_gridData['value'] = timeValue[1];
							historyQosCtrl.chartGridData.push(_gridData);
						}
					}

					historyQosCtrl.chartGridOption = gridOption;

					let param = {};
					param.fileName = "Analysis_QOS.csv";
					param.id = "tempExcelGrid";
					$timeout(function () {
						$rootScope.$broadcast("exportToCSV", param); // $rootScope.$on
					}, 1500);
					historyQosCtrl.requestExcel = false;
					hideMySpinner();
					return;
				}


				// ########################### jFreeChart 처리
				// historyQosCtrl.chartUrlList = [];
				let param = {
					data: chartData,
					totalChartSize : totalChartSize,
					metricMaxMap: historyQosCtrl.metricMaxMap
				};

				console.debug('REQUEST CHART IMG : ' + moment().format('YYYY-MM-DD HH:mm:ss'));

				DataService.httpPost("/activities/system/history/getQosChartImg", param, function (data) {
					if (!data.data.metricChartMap || data.data.metricChartMap.length <= 0)
						return;



					let chartMap = data.data.metricChartMap;

					let keys = (Object.keys(chartMap)).sort();

					// Metric Type 별 구성
					// select, insert, delete, update
					let metricTypeList = angular.copy(historyQosCtrl.typeList);
					metricTypeList.shift();
					for (let r = 0 ; r < metricTypeList.length ; r++) {
						let metricType = metricTypeList[r].label;
						historyQosCtrl.metricChartMap[metricType] = [];
						for (let i = 0 ; i < keys.length ; i++) {
							let tempArr = chartMap[keys[i]];
							for (let k = 0 ; k < tempArr.length ; k++) {
								if ( (tempArr[k].metricType).toLowerCase() == metricType.toLowerCase() ) {

									let query = '';
									for (let j = 0 ; j < orderArr.length ; j++) {
										if (tempArr[k].metricName.indexOf(orderArr[j]) != -1) {
											query = orderArr[j];
										}
									}

									tempArr[k].title = $sce.trustAsHtml('['+(query).toUpperCase()+'] '+tempArr[k].host);		// html 코드로 처리

									historyQosCtrl.metricChartMap[metricType].push(tempArr[k]);
								}
							}
						}
					}

					let m_keys = Object.keys(historyQosCtrl.metricChartMap);
					for (let r = 0 ; r < m_keys.length ; r++) {
						let metric = m_keys[r];
						let arr = historyQosCtrl.metricChartMap[metric];
						if (arr.length != 0)
							orderChartObj(arr,'metricName',0);
						else {
							delete historyQosCtrl.metricChartMap[metric];
						}
					}

					hideMySpinner();
				}, true);
				// ###########################

			}


			function getCP(obj, metricName, orderArr) {
				let cp = -1;
				let metric = obj[metricName].toLowerCase();

				for (let k = 0 ; k < orderArr.length ; k++) {
					if (metric.indexOf(orderArr[k]) != -1) {
						cp = k;
					}
				}
				return cp;
			}

			/**
			 * OrderArr 에 따라 정렬
			 * @param arr
			 * @param metricName
			 * @param idx
			 */
			function orderChartObj ( arr , metricName, idx ) {
				for (let i = idx ; i < arr.length ; i++) {
					let currObj = arr[i];
					if (i+1 != arr.length) {
						let nextObj = arr[i+1];
						let currCP = getCP(currObj, metricName, orderArr);
						let nextCP = getCP(nextObj, metricName, orderArr);
						if (currCP > nextCP) {
							let temp = arr[i];
							arr[i] = nextObj;
							arr[i+1] = temp;
							orderChartObj(arr, metricName, idx++);
						}
					} else {
						break;
					}


				}
			}


			// method
			historyQosCtrl.changeSelectBox = function (event, type) {

				if (LOAD_COMPLETE && type == 'UNTIL') {
					historyQosCtrl.selectedUntil = event.value;
					var eMoment = moment(historyQosCtrl.eDateTime);
					historyQosCtrl.sDateTime = eMoment.subtract(historyQosCtrl.selectedUntil, 'hour').format('YYYY-MM-DD HH:mm');
					ap($scope);
				}

			};
			
			/**
			 * QoS셀렉트박스 선택한 경우
			 * ALL 선택한 경우 영역 헤더를 만들어준다
			 */
			historyQosCtrl.changeTypeSelectEventHandler = function (event) {
				if (!LOAD_COMPLETE) return;


				historyQosCtrl.selectedQos = event.label;

			};


			/**
			 * Search 클릭
			 */
			historyQosCtrl.clickSearch = function(){
				let _host = historyQosCtrl.selectedHost.toLowerCase() == 'all' ? null : historyQosCtrl.selectedHost.toLowerCase();
				let _qos = historyQosCtrl.selectedQos.toLowerCase() == 'all' ? null : historyQosCtrl.selectedQos.toLowerCase();
				let _sMoment = (moment(historyQosCtrl.sDateTime).valueOf()/1000).toString();
				let _eMoment = (moment(historyQosCtrl.eDateTime).valueOf()/1000).toString();

				var duration = moment.duration(moment(historyQosCtrl.eDateTime).diff(moment(historyQosCtrl.sDateTime)));
				periodDay = duration.asDays();


				let param = [{}];
				param[0].function = 'getQosInfo';
				param[0].systemSeq = systemSeq;
				param[0].resultEvent = 'GET_METRIC_CHART_LIST_EVENT';

				let metricData = [{}];
				param[0].metricData = metricData;
				metricData[0].startTime = _sMoment;
				metricData[0].endTime = _eMoment;
				if (_qos)
					metricData[0].metrics = [_qos];
				metricData[0].hostName = _host;

				// console.log('send param', param);
				showMySpinner();
				WebSocketService.callRequest(param);
			};

			/**
			 * Excel 클릭
			 */
			historyQosCtrl.clickExcelDownload = function(){
				historyQosCtrl.requestExcel = true;
				historyQosCtrl.clickSearch();
			};

			/**
			 * 차트 더블 클릭 >
			 * chartKey : hostName_metricName
			 * @param chartKey
			 */
			historyQosCtrl.showLargeChart = function(chartKey){
				if (!historyQosCtrl.chartDataArr || chartKey.toLowerCase() == 'all')
					return;

				let titleArr = chartKey.split('__');
				let chartTitle = titleArr[0]+' : '+titleArr[1];

				let chartData = historyQosCtrl.chartDataArr[chartKey];
				let chartOption = {
					type: "area",
					gui: {
						contextMenu: {
							visible: false
						}
					},
					title: {
						fontSize: "15px",
						text : chartTitle
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
							text: "%v",
							fontSize: 12,
							thousandsSeparator: ","
						}
					},
					scaleY: {
						thousandsSeparator: ",",
						label: {
							text: "(ms)",
							fontAngle:0,
							fontSize: "14px",
							bold : false,
							fontColor: "#7E7E7E",
							offsetY:"-240px",
							offsetX : "30px"
						},
						guide: {visible: false}
					},
					scaleX: {
						transform: { 		// 날짜 형식 설정
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
						marginLeft: '50px'
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
							alphaArea: "1",
							values : chartData

						}
					]
				};

				// historyQosCtrl.largeChart = chartOption;
				$scope.largeChartModel = chartOption;

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
				historyQosCtrl.eDateTime = moment(event.kmax).format('YYYY-MM-DD HH:mm');
				historyQosCtrl.sDateTime = moment(event.kmin).format('YYYY-MM-DD HH:mm');

				historyQosCtrl.clickSearch();

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
			 * HOST 영역 toggle
			 * @param host
			 */
			historyQosCtrl.toggleChartArea = function(target){
				$('#chartArea_'+target).slideToggle('slow');
			};


			$scope.closeLargeChartDialog = function(){
				$scope.largeChartModel = null;
				ngDialog.closeAll();
			};



			function getInitData(){
				getQOSList();

			}

			function getQOSList(){
				DataService.httpGet("/activities/system/history/getQoSList/", null, function (data) {
					historyQosCtrl.typeList = data.data;
					historyQosCtrl.typeList.unshift(allOption);
					LOAD_COMPLETE = true;
				}, false);
			}




			function initialize() {

				addEventListener();
				systemSeq = ConfigManager.getSystemSeq();

				getInitData();

				$timeout(function(){
					var eMoment = moment(historyQosCtrl.eDateTime);
					historyQosCtrl.eDateTime = eMoment.subtract(2, 'minute').format('YYYY-MM-DD HH:mm');
					historyQosCtrl.sDateTime = eMoment.subtract(3, 'hour').format('YYYY-MM-DD HH:mm');
				},500);


				$('#selectedHostName').focusout(function () {
					if ($(this).val() == '') {
						$(this).val('ALL');
					}
					historyQosCtrl.selectedHost = $(this).val();
				});

				$('#selectedHostName').focus(function () {
					if ($(this).val() == 'ALL') {
						$(this).val('');
					}
				});

				$('#msg_area').text('You need to search.');

			}



			function showMySpinner(){
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

			function hideMySpinner(){
				$('.mu-content').unblock();
				myBlockUI = null;
				// $('.spinner').remove();
				$('#indicator').children().remove();
				if (mySpinner != null)
					mySpinner.stop(mySpinnerTarget);
			}

			function transformDate() {
				let showSec = '';

				if (periodDay >= 1) {
					return "%Y-%mm-%dd<br>%H:%i:%s"
				} else {
					return "%H:%i:%s"
				}
			}


			initialize();
		} ]);
});