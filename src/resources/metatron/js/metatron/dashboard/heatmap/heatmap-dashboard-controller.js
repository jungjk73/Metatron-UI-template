define(["app", "moment"], function(app, moment) {
	app.controller("HeatmapDashboardCtrl", ["$rootScope", "$scope", "$timeout", "$interval", "ConfigManager", "WebSocketService", "DataService", "CommonUtil", "ngDialog",
	    function($rootScope, $scope, $timeout, $interval, ConfigManager, WebSocketService, DataService, CommonUtil, ngDialog) {
			"use strict";

			// property
			var unbind = [];
			var heatmapDashboardCtrl = this;
			var systemSeq = ConfigManager.getSystemSeq();
			var interval;
			const MAX_METRIC_NUM = 6;				// Heatmap으로 표시할 최대 metric 개수
			const TIMER_INTERVAL = 1000 * 10;		// 서버에 heatmap 정보 요청 주기 - 20초
			const cursor_timeout = 500;				// 마우스 커서 이동이 정지한 상태를 감지하기 위한 시간 텀
			var targetCell;							// 사용자가 툴팁 보려고 하는 셀 
			var cursor_thread;
			var tooltipRequest = false;
			var configPopupShow = false;			// select-box directive 자동으로 선택 이벤트 되는것 막기
			var treeLabelMaxLength = 27;

			heatmapDashboardCtrl.systemName = ConfigManager.getSystemName();
			heatmapDashboardCtrl.metricNameList = [];		// HeatMap 처리 대상 Metric List
			heatmapDashboardCtrl.totalHeatMap = {};			// HeatMap 으로 표현될 데이터
			heatmapDashboardCtrl.configList = [];			// 설정정보 저장 리스트
			heatmapDashboardCtrl.editConfigList = [];		// 사용자 입력 설정정보 리스트 - config setting 에서 입력한 정보 저장
			heatmapDashboardCtrl.orderNumList = [];
			heatmapDashboardCtrl.useFlagList = [{label : 'Y', value : 'Y'} , {label : 'N', value : 'N'}];
			heatmapDashboardCtrl.configMsg = ' ';

			// event-handler
			function addEventListener() {
				unbind = [
					$scope.$on('$destroy', destroy),
					$scope.$on(ConfigManager.getEvent("GET_HEATMAP_DASHBOARD_EVENT"), getHeatMapDashboardEventHandler),
					$scope.$on(ConfigManager.getEvent("GET_SYSTEM_STATUS_BY_HOST_EVENT"), getSystemStatusByHostEventHandler),
					$scope.$on(ConfigManager.getEvent("CHANGE_SYSTEM_SEQ_EVENT"), onChangeSystemSeqEventHandler)
				];
			}

			/**
			 * 웹소켓에서 받아온 heatmap 데이터 처리
			 */
			function getHeatMapDashboardEventHandler(event, data){
				var result = data.searchResults;

				if (result == undefined) return;
				var keySet = Object.keys(result).sort();		// 이름순으로 정렬

				heatmapDashboardCtrl.totalHeatMap = {};

				// 데이터 초기 세팅
				for ( var i = 0 , j = heatmapDashboardCtrl.metricNameList.length ; i < j ; i += 1){
					heatmapDashboardCtrl.totalHeatMap[heatmapDashboardCtrl.metricNameList[i]] = [];
				}

				for ( var i = 0 , j = keySet.length ; i < j ; i += 1) {
					var hostName = keySet[i];
					var host = result[hostName];

					for ( var m = 0, n = heatmapDashboardCtrl.metricNameList.length ; m < n ; m += 1) {
						var metricName = heatmapDashboardCtrl.metricNameList[m];
						var heatMapData = {};
						heatMapData.hostName = hostName;
						heatMapData.value = host[metricName];
						getStatusAndThreshold(metricName, heatMapData);
						heatmapDashboardCtrl.totalHeatMap[metricName].push(heatMapData);
					}

				}

				ap($scope);

				let timer = $timeout(function(){
					tooltipRequest = true;
					$timeout.cancel(timer);
				}, 100);
			}

			/**
			 * 선택한 호스트에 대한 툴팁 정보를 보여준다
			 */
			function getSystemStatusByHostEventHandler(event, data){
				var result = data.searchResults;
				var time = moment.unix(data.currentTime).format('YYYY-MM-DD HH:mm:ss');

				$(targetCell).tooltip({
					content : function(){
						var elm = $(this);
						var data = result[(JSON.parse(elm[0].dataset.hostItem)).hostName];

						// 툴팁에 보여줄 항목 :: 상태 / 임계치 / 실제값 / 시간(서버에서 보낸) / BYTES_IN / BYTES_OUT / CPU_NUM / CPU_USAGE / DISK_USAGE  / MEM_USAGE
						var hostStatus = (JSON.parse(elm[0].dataset.hostItem)).status;
						var hostThreshold = CommonUtil.numberFormatter((JSON.parse(elm[0].dataset.hostItem)).threshold);
						var hostValue = CommonUtil.numberFormatter((JSON.parse(elm[0].dataset.hostItem)).value);

						var $tootipContent = $('<div><div class="tooltip_title">'+(JSON.parse(elm[0].dataset.hostItem)).hostName+'</div></div>');
						var statusBar = $('<div class="tooltip_detail"></div>');
						statusBar.append( $('<div class="row"><div><span class="title '+getTextClassByStatus(hostStatus)+'">'+hostStatus+'</span></div><div>'+time+'</div></div>') );		// 상태 / 시간
						statusBar.append( $('<div class="row"><div><span class="title">Threshold</span> : '+ hostThreshold+'</div><div><span class="title">Value</span> : '+hostValue+'</div></div>') );	// 임계치값 / 실제값

						var detailBar = $('<div class="tooltip_detail"></div>');
						detailBar.append( $('<div class="row"><div><span class="title">CPU Usage(%)</span> : '+ (data['CPU_USAGE'] ? data['CPU_USAGE'] : '0') +'</div><div><span class="title">Disk Usage(%)</span> : '+  (data['DISK_USAGE'] ? data['DISK_USAGE'] : '0') +'</div></div>') );
						detailBar.append( $('<div class="row"><div><span class="title">Byte In(MB/s)</span> : '+ (data['BYTES_IN'] ? data['BYTES_IN'] : '0') +'</div><div><span class="title">Byte Out(MB/s)</span> : '+ (data['BYTES_OUT'] ? data['BYTES_OUT'] : '0') +'</div></div>') );
						detailBar.append( $('<div class="row"><div><span class="title">MEM Usage(%)</span> : '+ (data['MEM_USAGE'] ? data['MEM_USAGE'] : '0') +'</div></div>') );

						$tootipContent.append(statusBar);
						$tootipContent.append(detailBar);

						return $tootipContent;
					},
					tooltipClass : 'cust-tooltip',
					position: {
						my: "center bottom-5",
						at: "center top",
						using: function( position ) {
							$( this ).css( position );
						}
					}
				}).tooltip('open');
			}

			/**
			 * Cluster 선택한 경우
			 */
			function onChangeSystemSeqEventHandler(event, data){
				heatmapDashboardCtrl.systemName = ConfigManager.getSystemName();
				systemSeq = ConfigManager.getSystemSeq();
				getMetricList();
				setTree();
				refreshHeatMapData();
			}

			function destroy() {
				heatmapDashboardCtrl.totalHeatMap = null;
				heatmapDashboardCtrl.metricNameList = null;
				heatmapDashboardCtrl.configList = null;
				heatmapDashboardCtrl.editConfigList = null;
				heatmapDashboardCtrl.orderNumList = null;
				heatmapDashboardCtrl.useFlagList = null;
				heatmapDashboardCtrl = null;

				$interval.cancel(interval);
				interval = null;
				ngDialog.closeAll();

				unbind.forEach(function(fn) {
					fn();
				});

				$(document).off('mouseover', '.cell-heat');
				$(document).off('mouseleave', '.cell-heat');

				$scope.$$watchers = null;
				$scope.$$listeners = null;
			}

			// method

			heatmapDashboardCtrl.getCellStatusClass = function(status){
				if (status == 'NORMAL') return 'cell-normal';
				else if (status == 'MINOR') return 'cell-beware';
				else if (status == 'MAJOR') return 'cell-warning';
				else if (status == 'CRITICAL') return 'cell-urgent';
			};


			/**
			 * Heatmap 설정 팝업
			 */
			heatmapDashboardCtrl.showConfigPop = function(){
				getConfilgList();	// 저장된 config setting 리스트

				//admin 사용자만 변경가능함.
				var popup = ngDialog.open({
					template: "/common/heatmap_config_template.html",
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

				let timer = $timeout(function(){configPopupShow = true; $timeout.cancel(timer);}, 1000);

				// Tree Scroll 계산
				setTimeout(function() {
					if(treeLabelMaxLength != 0) {
						let w = treeLabelMaxLength*12;
						angular.element("#tree").find("ul").eq(0).css("width", w + "px");
					}
				}, 1800);
			};

			/**
			 * Config Setting
			 * Save 버튼 클릭 - 설정 내용 저장
			 */
			heatmapDashboardCtrl.saveConfig = function(){
				if (validateConfigSetting()) {
					DataService.httpPost("/dashboard/heatMap/saveConfigList", heatmapDashboardCtrl.editConfigList, function(data) {
						if (data.result == 1) {
							alert('변경되었습니다');
							refreshHeatMapData();
						}
					});
					heatmapDashboardCtrl.closeDialog();
				} else {
				}
			};

			/**
			 * Config Setting
			 * 사용자 입력 값 확인
			 */
			function validateConfigSetting(){
				var validate = true;

				var tempOrderList = [];
				var useYCount = 0;

				for (var i = 0, j = heatmapDashboardCtrl.editConfigList.length ; i < j ; i += 1 ) {
					if (tempOrderList.indexOf(heatmapDashboardCtrl.editConfigList[i].orderNum) == -1) tempOrderList.push(heatmapDashboardCtrl.editConfigList[i].orderNum);
					else {
						tempOrderList = [];
						heatmapDashboardCtrl.configMsg = 'Duplicated Order.';
						validate = false;
						return false;
					}

					if (heatmapDashboardCtrl.editConfigList[i].critical < 1 || heatmapDashboardCtrl.editConfigList[i].major < 1 || heatmapDashboardCtrl.editConfigList[i].minor < 1) {
						heatmapDashboardCtrl.configMsg = 'Value must be greater than 0';
						validate = false;
						return false;
					}

					if (heatmapDashboardCtrl.editConfigList[i].useFlag == 'Y') {
						useYCount++;
						if (useYCount > MAX_METRIC_NUM) {
							heatmapDashboardCtrl.configMsg = 'Use Config size cannot be greater than '+MAX_METRIC_NUM;
							validate = false;
							return false;
						}
					}

					if(heatmapDashboardCtrl.editConfigList[i].metricsName == 'CPU_IDLE') {
						if (heatmapDashboardCtrl.editConfigList[i].major <= heatmapDashboardCtrl.editConfigList[i].critical) {
							heatmapDashboardCtrl.configMsg = 'The CPU_IDLE must have a Major value greater than the Critical value.';
							validate = false;
							return false;
						}

						if (heatmapDashboardCtrl.editConfigList[i].minor <= heatmapDashboardCtrl.editConfigList[i].major) {							
							heatmapDashboardCtrl.configMsg = 'The CPU_IDLE must have a Minor value greater than the Major value.';
							validate = false;
							return false;
						}

					}else {
						if (heatmapDashboardCtrl.editConfigList[i].major >= heatmapDashboardCtrl.editConfigList[i].critical) {
							heatmapDashboardCtrl.configMsg = 'Critical value must be greater than Major value';
							validate = false;
							return false;
						}

						if (heatmapDashboardCtrl.editConfigList[i].minor >= heatmapDashboardCtrl.editConfigList[i].major) {
							heatmapDashboardCtrl.configMsg = 'Major value must be greater than Minor value';
							validate = false;
							return false;
						}
					}

					
				}
				return validate;
			}

			/**
			 * Config Setting
			 * 팝업 닫기
			 */
			heatmapDashboardCtrl.closeDialog = function(){
				ngDialog.closeAll();
				configPopupShow = false;
				heatmapDashboardCtrl.configMsg = ' ';
				refreshHeatMapData();
			};

			/**
			 * Config Setting
			 * Metric 트리 노드 클래스 설정
			 */
			heatmapDashboardCtrl.getNodeClass = function(node){
				if(node.label != null && node.label.length > treeLabelMaxLength)
					treeLabelMaxLength = node.label.length;

				if (node.childrenList)
					return 'metric-parent';
				else
					return 'metric-child';
			};

			/**
			 * Config Setting
			 * Metric 트리 노드 선택
			 */
			heatmapDashboardCtrl.checkMetric = function(node){				
				if(node.metricParentSeq == '0') {
					node.checked = false;
					return;
				}

				if (node.checked) {

					if (heatmapDashboardCtrl.editConfigList && heatmapDashboardCtrl.editConfigList.length < MAX_METRIC_NUM) {

						// 선택한 노드를 모델 리스트에 추가. 타입에 맞는 신규 객체 생성하여 추가
						var config = {
								metricSeq : node.metricSeq,
								metricsParentSeq : node.metricsParentSeq,
								metricsName : node.metricName,
								critical : 1,
								major : 1,
								minor : 1,
								orderNum : getDefaultOrder(),
								useFlag : 'Y'
						};
						heatmapDashboardCtrl.editConfigList.push(config);

					} else {
						alert('최대 '+MAX_METRIC_NUM+'개의 Metric만 선택 가능');
						node.checked = false;
					}
				} else {
					var idx = 0;
					for ( var i = 0 , j = heatmapDashboardCtrl.editConfigList.length ; i < j ; i += 1) {
						if (node.metricSeq == heatmapDashboardCtrl.editConfigList[i].metricSeq) {
							idx = i;
						}
					}
					heatmapDashboardCtrl.editConfigList.splice(idx, 1);
				}
			};

			/**
			 * Config Setting
			 * Order 변경 한 경우
			 */
			heatmapDashboardCtrl.selectOrderHandler = function(order, idx){
				if (configPopupShow)
					heatmapDashboardCtrl.editConfigList[idx].orderNum = order.value;
			};

			/**
			 * Config Setting
			 * UseFlag 변경 한 경우
			 */
			heatmapDashboardCtrl.selectUseHandler = function(order, idx){
				if (configPopupShow)
					heatmapDashboardCtrl.editConfigList[idx].useFlag = order.value;
			};

			/**
			 * Config Setting
			 * 기본 순서 설정
			 */
			function getDefaultOrder(){
				var returnOrder;
				if (!heatmapDashboardCtrl.editConfigList || !heatmapDashboardCtrl.editConfigList.length || heatmapDashboardCtrl.editConfigList.length == 0) return 1;

				returnOrder = heatmapDashboardCtrl.editConfigList[heatmapDashboardCtrl.editConfigList.length-1].orderNum + 1;

				return returnOrder;
			}

			/**
			 * Config Setting
			 * 사용자가 설정한 설정리스트를 받아온다
			 */
			function getConfilgList(){
				DataService.httpGet("/dashboard/heatMap/configList", null, function(data) {
					heatmapDashboardCtrl.editConfigList = data.data;

					heatmapDashboardCtrl.editConfigList.sort(function(a, b){
						return a.orderNum < b.orderNum ? -1 : a.orderNum > b.orderNum ? 1 : 0;
					});

					initMetricTreeModelCheck();

					// Metric Tree에 체크 설정
					for (var i = 0 , j = heatmapDashboardCtrl.editConfigList.length ; i < j ; i += 1) {
						var configMetricSeq = heatmapDashboardCtrl.editConfigList[i].metricSeq;
						var configMetricsParentSeq = heatmapDashboardCtrl.editConfigList[i].metricsParentSeq;
						for (var m = 0, n = heatmapDashboardCtrl.metricTreeModel.length ; m < n ; m += 1) {
							if (configMetricsParentSeq == heatmapDashboardCtrl.metricTreeModel[m].metricSeq) {
								for ( var x = 0, y = heatmapDashboardCtrl.metricTreeModel[m].childrenList.length ; x < y ; x += 1) {
									if (configMetricSeq == heatmapDashboardCtrl.metricTreeModel[m].childrenList[x].metricSeq) {
										heatmapDashboardCtrl.metricTreeModel[m].childrenList[x].checked = true;
									}
								}
							}
						}
					}	// end of metric tree check for loop
				});
			}

			/**
			 * Config Setting
			 * Metric Tree 체크 박스를 초기화 한다
			 */
			function initMetricTreeModelCheck(){
				for (var i = 0, j = heatmapDashboardCtrl.metricTreeModel.length ; i < j ; i += 1) {
					heatmapDashboardCtrl.metricTreeModel[i].checked = false;
					heatmapDashboardCtrl.metricTreeModel[i].display = "N";
					for (var m = 0 , n = heatmapDashboardCtrl.metricTreeModel[i].childrenList.length ; m < n ; m += 1) {
						heatmapDashboardCtrl.metricTreeModel[i].childrenList[m].checked = false;
					}
				}
			}

			/**
			 * Config Setting
			 * Metric Tree 데이터 호출
			 */
			function getMetricList() {
				DataService.httpGet("/activities/system/history/getMetricList/", null, function(data) {
					heatmapDashboardCtrl.metricTreeModel = data.data;

					// 첫번째 노드 (CPU 노드) 확장
					heatmapDashboardCtrl.initialExpandedNodes = [heatmapDashboardCtrl.metricTreeModel[0]];
					$('.metric-parent').hide();
				});
			}

			/**
			 * Config Setting
			 * Metric Tree Options
			 */
			function setTree() {
				heatmapDashboardCtrl.treeOptions = {
					    nodeChildren: "childrenList",
					    dirSelectable: true,
					    injectClasses: {
					    	ul: "a1",
					    	li: "a2",
					    	liSelected: "a7",
					    	iExpanded: "a3",
					    	iCollapsed: "a4",
					    	iLeaf: "a5",
					    	label: "a6",
					    	labelSelected: "a8"
					    }
					}
			}

			/**
			 * HeatMap 데이터 받아온다
			 */
			function getHeatMap() {
				callWebsocketHeatmap();

				if (angular.isDefined(interval)) {
		            $interval.cancel(interval);
					interval = undefined;
				}

				interval = $interval(function() {
					callWebsocketHeatmap();
				}, TIMER_INTERVAL);
			}

			function callWebsocketHeatmap(){
				var param = {};
				param.function = 'getHeatMap';
				param.systemSeq = systemSeq;
				param.resultEvent = 'GET_HEATMAP_DASHBOARD_EVENT';
				tooltipRequest = false;
				WebSocketService.callRequest(param);
			}

			/**
			 * 받아온 데이터값에 대한 상태와 임계치를 반환
			 * Critical : 3 / Major : 2 / Minor : 1 / Normal : 0
			 */
			function getStatusAndThreshold(metricName, heatMapData){
				for (var i = 0, j = heatmapDashboardCtrl.configList.length ; i < j ; i += 1) {

					if (heatmapDashboardCtrl.configList[i].metricsName == metricName) {

						if(metricName == 'CPU_IDLE') {
							if (Number(heatMapData.value) <= Number(heatmapDashboardCtrl.configList[i].critical)) {
								heatMapData.status = 'CRITICAL';
								heatMapData.threshold = heatmapDashboardCtrl.configList[i].critical;
								return false;
							} else if (Number(heatMapData.value) <= Number(heatmapDashboardCtrl.configList[i].major)) {
								heatMapData.status = 'MAJOR';
								heatMapData.threshold = heatmapDashboardCtrl.configList[i].major;
								return false;
							} else if (Number(heatMapData.value) <= Number(heatmapDashboardCtrl.configList[i].minor)) {
								heatMapData.status = 'MINOR';
								heatMapData.threshold = heatmapDashboardCtrl.configList[i].minor;
								return false;
							} else {
								heatMapData.status = 'NORMAL';
								heatMapData.threshold = '0';
								return false;
							}
						}else {
							if (Number(heatMapData.value) >= Number(heatmapDashboardCtrl.configList[i].critical)) {
								heatMapData.status = 'CRITICAL';
								heatMapData.threshold = heatmapDashboardCtrl.configList[i].critical;
								return false;
							} else if (Number(heatMapData.value) >= Number(heatmapDashboardCtrl.configList[i].major)) {
								heatMapData.status = 'MAJOR';
								heatMapData.threshold = heatmapDashboardCtrl.configList[i].major;
								return false;
							} else if (Number(heatMapData.value) >= Number(heatmapDashboardCtrl.configList[i].minor)) {
								heatMapData.status = 'MINOR';
								heatMapData.threshold = heatmapDashboardCtrl.configList[i].minor;
								return false;
							} else {
								heatMapData.status = 'NORMAL';
								heatMapData.threshold = '0';
								return false;
							}
						}
						
					}
				}
			}

			function callWebsocketTooltip(hostName){
				var param = {};
				param.function = 'getSystemStatusByHost';
				param.systemSeq = ConfigManager.getSystemSeq();
				param.resultEvent = 'GET_SYSTEM_STATUS_BY_HOST_EVENT';
				param.metricData = [{ 'hostName' : hostName}];
				if (tooltipRequest)
					WebSocketService.callRequest(param);
			}

			/**
			 * 설정 정보와 HeatMap 정보 새로 요청 
			 */
			function refreshHeatMapData() {
				DataService.httpGet("/dashboard/heatMap/configList", null, function(data) {
					heatmapDashboardCtrl.configList = [];
					heatmapDashboardCtrl.configList = data.data;

					heatmapDashboardCtrl.metricNameList = [];
					for (var i = 0, j = heatmapDashboardCtrl.configList.length ; i < j ; i += 1) {
						if (heatmapDashboardCtrl.configList[i].useFlag == 'Y')
							heatmapDashboardCtrl.metricNameList.push(heatmapDashboardCtrl.configList[i].metricsName);
					}

					let timer = $timeout(function(){
						getHeatMap();
						$timeout.cancel(timer);
					}, 300);
				});
			}

			function getTextClassByStatus(status) {
				if (status.toLowerCase() == 'critical') return 'txt-red';
				else if (status.toLowerCase() == 'major') return 'txt-orangered';
				else if (status.toLowerCase() == 'minor') return 'txt-yellow';
				else if (status.toLowerCase() == 'normal') return 'txt-green';
			}

			function initialize() {
				for (var i = 0 ; i < MAX_METRIC_NUM ; i++) {
					heatmapDashboardCtrl.orderNumList.push({label : i+1, value : i+1});
				}

				addEventListener();
				getMetricList();
				setTree();
				refreshHeatMapData();
				tooltipShowHandler();
			}

			function tooltipShowHandler() {
				// 마우스 올리고 일정 시간 지나면 툴팁 정보 요청. 셀 위에서 무작위로 움직일때는 툴팁 보여주지 않기 위함 
				$(document).on('mouseover', '.cell-heat', function( event ) {
					targetCell = event.target;
					$(targetCell).attr('title','');
					$(targetCell).css('border','1px solid #fff');
			        $timeout.cancel(cursor_thread);
			        cursor_thread = $timeout(function(){
			        	var dataset = event.target.dataset;
			        	callWebsocketTooltip((JSON.parse(dataset.hostItem)).hostName);
			         }, cursor_timeout);
			    }); 
				
				$(document).on('mouseleave', '.cell-heat', function(){
					$timeout.cancel(cursor_thread);
					$('.cust-tooltip').remove();
					$('.cell-heat').css('border','0px');
					if ($(targetCell).tooltip('instance'))
						$(targetCell).tooltip('destroy');
				});
			}

			initialize();
	}]);

	/**
	 * Metric 별 Heatmap 생성 Directive
	 */
	app.directive('heatmapItem', function(){
		return {
			restrict : 'E',
			scope : {
				item : '='
			},
			template : '<div ng-repeat="heat in item" class="cell-heat" ng-class="getCellStatusClass(heat.status)" data-host-item="{{::heat}}"></div>',
			link : function(scope, element, attrs){
				scope.getCellStatusClass = function(status){
					if (status == 'NORMAL') return 'cell-normal';
					else if (status == 'MINOR') return 'cell-beware';
					else if (status == 'MAJOR') return 'cell-warning';
					else if (status == 'CRITICAL') return 'cell-urgent';
				};
			}
		};
	});

});