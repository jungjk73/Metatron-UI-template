define(["app", "moment"], function (app, moment) {
	app.controller("ServiceSummaryCtrl", ["$scope", "$rootScope", "$http", "$timeout", "$filter", "ConfigManager", "DataService", "GridRenderer", "ngDialog", "CommonUtil",
		function ($scope, $rootScope, $http, $timeout, $filter, ConfigManager, DataService, GridRenderer, ngDialog, CommonUtil) {
			"use strict";


			// property
			let serviceSummaryCtrl = this;
			let unbind = [];

			let tooltipTimer;

			serviceSummaryCtrl.searchOption = {};		// 검색조건 저장 객체

			let colorArr = CommonUtil.getChartColorArr();
			let colorMap = {};


			let loadedFlag = false;

			let curr_date;

			// SELECT BOX

			// SVC Name
			serviceSummaryCtrl.changeSVCSelectEventHandler = function(event){
				if (!loadedFlag) return;
				serviceSummaryCtrl.searchOption.svcId = event.value;
				serviceSummaryCtrl.searchOption.svcName = event.label;
				if (event.label.toLowerCase() == "bar") 		serviceSummaryCtrl.changeChartTypeEventHandler('bar');
				if (event.label.toLowerCase() == "line") 		serviceSummaryCtrl.changeChartTypeEventHandler('line');
				if (event.label.toLowerCase() == "blocks") 		serviceSummaryCtrl.changeChartTypeEventHandler('blocks');
				if (event.label.toLowerCase() == "todaybar") 	serviceSummaryCtrl.changeChartTypeEventHandler('todaybar');
				if (event.label.toLowerCase() == "todayline") 	serviceSummaryCtrl.changeChartTypeEventHandler('todayline');
			};


			// DATE
			serviceSummaryCtrl.changeDateHandler = function (event) {
				let todayDate = moment().format('YYYY-MM-DD');
				let eventEndDate = moment(event.eDateTime).format('YYYY-MM-DD');
				if (moment(todayDate).diff(eventEndDate) > 0) {
					serviceSummaryCtrl.eDateTime = moment(event.eDateTime).format('YYYY-MM-DD 23:59');
				} else {
					serviceSummaryCtrl.eDateTime = moment().format("YYYY-MM-DD HH:mm");
				}
				serviceSummaryCtrl.sDateTime = event.sDateTime;
			};

			// Bar / Line Check box
			serviceSummaryCtrl.changeChartTypeEventHandler = function (type) {
				serviceSummaryCtrl.selectChartType = type;

				if(type=="bar")			serviceSummaryCtrl.activeChartType = "bar";
				if(type=="line")		serviceSummaryCtrl.activeChartType = "line";
				if(type=="blocks")		serviceSummaryCtrl.activeChartType = "line";
				if(type=="todaybar")	serviceSummaryCtrl.activeChartType = "bar";
				if(type=="todayline")	serviceSummaryCtrl.activeChartType = "line";
				//serviceSummaryCtrl.clickSearch();
				serviceSummaryCtrl.changeType();
			};

			// Search Click
			serviceSummaryCtrl.clickSearch = function () {
				if (!CommonUtil.validateStartEndDate(serviceSummaryCtrl.sDateTime, serviceSummaryCtrl.eDateTime))
                    return;
				serviceSummaryCtrl.searchOption.startTime 		= serviceSummaryCtrl.sDateTime;
				serviceSummaryCtrl.searchOption.endTime 		= serviceSummaryCtrl.eDateTime;
				serviceSummaryCtrl.searchOption.activeChartType = serviceSummaryCtrl.activeChartType;   // 차트 랜더링 타입
				serviceSummaryCtrl.searchOption.selectChartType = serviceSummaryCtrl.selectChartType;   // 화면 선택 구분값
				console.log('#### Search Condition ',serviceSummaryCtrl.searchOption);
				getData();
			};

			// 화면내 차트전환용
			serviceSummaryCtrl.changeType = function () {
				if (!CommonUtil.validateStartEndDate(serviceSummaryCtrl.sDateTime, serviceSummaryCtrl.eDateTime))
					return;
				serviceSummaryCtrl.searchOption.startTime 		= serviceSummaryCtrl.sDateTime;
				serviceSummaryCtrl.searchOption.endTime 		= serviceSummaryCtrl.eDateTime;
				serviceSummaryCtrl.searchOption.activeChartType = serviceSummaryCtrl.activeChartType;   // 차트 랜더링 타입
				serviceSummaryCtrl.searchOption.selectChartType = serviceSummaryCtrl.selectChartType;   // 화면 선택 구분값
				console.log('#### Search Condition ',serviceSummaryCtrl.searchOption);
				getData();
			};

			// Click Grid Row
			serviceSummaryCtrl.showPieChart = function(value, event){
				if (!event) return;
				if (serviceSummaryCtrl.selectChartType == 'todaybar' | serviceSummaryCtrl.selectChartType == 'todayline') return;

				curr_date = value[0].data.insertTime;
				serviceSummaryCtrl.searchOption.specificTime = curr_date;
				drawPieChartData();
			};

			serviceSummaryCtrl.clickLegend = function(svc){

				$('#customTooltipLayer').remove();

				let plotindex = -1;
				let d = zingchart.exec('serviceSummaryChart', 'getseriesdata');
				if (d == null || d.length < 1)
					return;

				for(let i = 0 ; i < d.length ; i++) {
					let series = d[i];
					if (svc.name == series.text) {
						plotindex = series.palette;
					}
				}

				let action = 'hideplot';
				if (svc.visible) action = 'hideplot';
				else action = 'showplot';
				zingchart.exec('serviceSummaryChart', action, {
					'plotindex':plotindex,
					'toggle-action': 'remove' //toggleAction (CamelCase not supported here), only css style
				});

				svc.visible = !svc.visible;
			};


			// 차트에 마우스 올렸을때 처리
			// 툴팁 만들어서 보여준다
			serviceSummaryCtrl.chartMousemoveEventHandler = function (data) {

				$('#customTooltipLayer').remove();
				$timeout.cancel(tooltipTimer);
				tooltipTimer = $timeout(function () {
					$('#customTooltipLayer').remove();

					let chartId = data.id;
					let items = data.items;
					let trHTMLArr = '';
					let unit = ' GB';

					if(serviceSummaryCtrl.selectChartType=='blocks') unit = ' Blocks';

					let timeLabel = data['scale-label']['scale-x'];
					timeLabel = timeLabel.replace('<br>', '');

					let totalVal = serviceSummaryCtrl.totalDataObj[timeLabel] || 0;
					for (let i = 0; i < items.length; i++) {
						let textArr = items[i].text.split(':');
						let trHTML = '<tr><th><div class="color-tag" style="background-color: '+colorMap[textArr[0]]+'"></div> ' + textArr[0] + '</th><td>' + $filter('number')(textArr[1]) + unit + '</td></tr>';
						// totalVal = totalVal + Number(textArr[1]);
						trHTMLArr = trHTMLArr + trHTML;
					}
					if(serviceSummaryCtrl.selectChartType != 'blocks' & items.length > 1) trHTMLArr = '<tr><th>Total</th><td>' + $filter('number')( (totalVal.toFixed(2)) ) + unit + '</td></tr>' + trHTMLArr;

					let timeTr = '<tr><th colspan="2" style="text-align: center;">'+timeLabel+'</th></tr>';
					trHTMLArr = timeTr + trHTMLArr;

					let tableHTML = '<table>' + trHTMLArr + '</table>';

					let left = data.ev.offsetX + 30;
					if (left > data.width / 2) left = data.ev.offsetX - 150;

					let top = data.ev.offsetY;


					let tooltip = $('<div id="customTooltipLayer" class="width150" style="left:' + left + 'px; top:' + top + 'px;">' + tableHTML + '</div>');

					$('#' + chartId).append(tooltip);
				}, 150);
			};


			// Zoom
			serviceSummaryCtrl.chartZoomOut = function(id){
				zingchart.exec(id, 'viewall');
			};


			// event-handler
			function destroy() {
				unbind.forEach(function (fn) {
					fn();
				});

				ngDialog.closeAll();
				clear();
			}

			function addEventListener() {
				unbind = [
					$scope.$on(ConfigManager.getEvent("CHANGE_SYSTEM_SEQ_EVENT"), onChangeSystemSeqEventHandler),
					$scope.$on('$destroy', destroy)
				];
			}

			function onChangeSystemSeqEventHandler(event, data) {
				if (data == null)
					return;

				if (!loadedFlag) return;

				serviceSummaryCtrl.gridData = [];

				serviceSummaryCtrl.clickSearch();


			}

			function textAlignCenterRenderer(params) {
				if (params == null || params.data == null)
					return '';

				let col = params.column.colId;
				let val = params.data[col] == null ? '0' : params.data[col];

				return "<div style='text-align : center;'><span>" + val + "</span></div>";
			}

			function textHighlightRenderer(params) {
				if (params == null || params.data == null)
					return '';

				if (!params.column.colDef.highlight)
					return "<div style='text-align : center; '>" + (params.value || '0.00 GB') + "</div>";

				if (params.column.colDef.highlight == params.column.colDef.headerName) {
					return "<div style='text-align : center; font-weight: bold;'><span>" + (params.value || '0.00 GB') + "</span></div>";
 				} else {
					return "<div style='text-align : center; '>" + (params.value || '0.00 GB') + "</div>";
				}

			}

			function clear() {
				serviceSummaryCtrl.searchOption = null;
				serviceSummaryCtrl.typeSelectOptionList = null;
				serviceSummaryCtrl.applicationSelectOptionList = null;
				serviceSummaryCtrl.changeTypeSelectEventHandler = null;
				serviceSummaryCtrl.changeApplicationSelectEventHandler = null;
				serviceSummaryCtrl.chartObj = null;
			}

			// function
			function initialize() {

				serviceSummaryCtrl.openConfigPopup = openConfigPopup;
				addEventListener();
				let param = {};
				param.systemName = ConfigManager.getSystemName();
				// svc name list
				DataService.httpPost('/data/hdfs/service/getSvcIdNameList', param, function (result) {
					if (result.result == 1 && result.data && result.data.length > 0) {
						let svcNameList = [];
						svcNameList.push({label : 'Total', value : ''});
						for (let i = 0 ; i < result.data.length ; i++) {
							if (result.data[i].SVC_NAME.toLowerCase() == 'total' || result.data[i].SVC_NAME.toLowerCase() == 'blocks') continue;
							svcNameList.push({label : result.data[i].SVC_NAME, value : result.data[i].SVC_ID});
						}

						serviceSummaryCtrl.svcNameList = svcNameList;
					}
				});


				serviceSummaryCtrl.activeChartClass = 'user';
				serviceSummaryCtrl.activeChartType = 'bar';
				serviceSummaryCtrl.selectChartType = 'bar';

				$timeout(function () {
					serviceSummaryCtrl.sDateTime = moment().subtract(1, 'month').local().format("YYYY-MM-DD 00:00");
					serviceSummaryCtrl.eDateTime = moment().subtract(1, 'day').local().format("YYYY-MM-DD 23:59");		// 어제 날짜로 보여주기로 함 2017.10.19
				}, 500);


				$timeout(function () {
					serviceSummaryCtrl.clickSearch();
					loadedFlag = true;
				}, 1000);

				$('.chart-area').mouseleave(function () {
					$('#customTooltipLayer').remove();
					$timeout.cancel(tooltipTimer);
					tooltipTimer = null;
				});

				$(document).on('mouseover', '[id *= "legend-frame"]', function(){
					$('#customTooltipLayer').remove();
					$timeout.cancel(tooltipTimer);
					tooltipTimer = null;
				});
			}


			function drawChart(){
				serviceSummaryCtrl.legendItems = [];
				serviceSummaryCtrl.searchOption.systemName = ConfigManager.getSystemName();

				DataService.httpPost("/data/hdfs/service/getChartData", serviceSummaryCtrl.searchOption, function (result) {

					if (result.result == 1) {
						// let colorArr = CommonUtil.getChartColorArr();
						let svcNameList = result.data.displayNameList;
						let series_stack = result.data.series_stack;

						let scaleX = result.data.scaleX;
						for (let i = 0; i < scaleX.length; i++) {
							scaleX[i] = moment(scaleX[i]).format('x');
						}


						if (svcNameList && svcNameList.length > 0) {
							// let colorMap = {};
							let totalIdx = -1;
							for (let i = 0; i < svcNameList.length; i++) {
								let svc = svcNameList[i];
								if (svc.toLowerCase() == 'total') {
									totalIdx = i; break;
								}
							}
							if (totalIdx != -1) {
								svcNameList.splice(totalIdx, 1);
							}

							serviceSummaryCtrl.legendItems = [];
							for (let i = 0; i < svcNameList.length; i++) {
								let svc = svcNameList[i];
								if (colorArr[i] == null)
									colorMap[svc] = colorArr[i - colorArr.length];
								else colorMap[svc] = colorArr[i];

								serviceSummaryCtrl.legendItems.push({
									name: svc,
									color: colorMap[svc],
									visible: true
								});
							}

							if (series_stack) {
								let totalIdx = -1;
								for (let i = 0; i < series_stack.length; i++) {
									let svc = series_stack[i].text;
									if (svc && svc.toLowerCase() == 'total') {
										totalIdx = i;
										for (let k = 0 ; k < series_stack[i].values.length ; k++){
											serviceSummaryCtrl.totalDataObj[moment(Number(scaleX[k])).format('YYYY-MM-DD')] = series_stack[i].values[k];
										}
										series_stack[i].visible = false;

									} else {
										series_stack[i].backgroundColor = colorMap[svc];
										series_stack[i].lineColor = colorMap[svc];
										series_stack[i].lineWidth = '1';
										series_stack[i].marker = {};
										series_stack[i].marker.backgroundColor = colorMap[svc];
										series_stack[i].marker.size = '3';
									}
								}
								if (totalIdx != -1) {
									series_stack.splice(totalIdx, 1);
								}
							}


							let token = '';

							serviceSummaryCtrl.chartObj = {
								type: serviceSummaryCtrl.activeChartType,
								plotarea: {
									border: "none",
									//adjustLayout: true,
									marginTop: "50",
									marginRight: "30",
									marginLeft: "dynamic",
									marginBottom: "40",
									paddingRight: "10"
								},
								crosshairX: {
									lineWidth: 1,
									scaleLabel: {
										backgroundColor: "#fff",
										color: "#383737",
										borderColor: "#C0C0C0",
										borderWidth: "1px"
									},
									plotLabel: {
										text: '%t:%v',
										visible: false,
										multiple: false
									}

								},
								tooltip: {visible: false},
								plot: {
									stacked: serviceSummaryCtrl.activeChartType == 'bar',
									stackType: "normal"
								},
								scaleX: {
									zooming: true,
									transform: {
										type: "date",
										text: "%Y-%mm-%dd" + token
									},
									labels: scaleX
								},
								scaleY: {
									thousandsSeparator: ',',
								},
								series: series_stack
							};

						} else {
							serviceSummaryCtrl.chartObj = {};
						}
					}

				}, false);

			}


			function drawGridData(){
				serviceSummaryCtrl.gridColumnDefs = [];
				// serviceSummaryCtrl.searchOption.svcId = null;
				let param = angular.copy(serviceSummaryCtrl.searchOption);
				param.svcId = null;
				param.systemName = ConfigManager.getSystemName();
				DataService.httpPost('/data/hdfs/service/getGridData', param, function(result){

					serviceSummaryCtrl.gridData = result.data.grid;

					let tempColumnDefs = [];

					tempColumnDefs.push({
						headerName: "Date",
						headerClass: 'main-header',
						field: "insertTime",
						width: 110,
						cellRenderer: textAlignCenterRenderer
					});

					// blocks 항목을 맨 앞으로.
					tempColumnDefs.push({
						headerName: 'BLOCKS',
						headerClass: 'main-header',
						field: "BLOCKS_totalCount",
						width : 130,
						cellRenderer: textAlignCenterRenderer
					});

					if (result.data.user && result.data.user.length > 0) {

						for (let i = 0; i < result.data.user.length; i++) {
							let name = result.data.user[i];
							if (name == 'Total') {
								result.data.user.splice(i,1);
							}
						}

						tempColumnDefs.push({
							headerName: 'TOTAL',
							headerClass: 'main-header',
							field: "TOTAL_totalCount",
							width : 130,
							cellRenderer: textAlignCenterRenderer
						});


						for (let i = 0; i < result.data.user.length; i++) {
							let svc = result.data.user[i];
							if (svc == 'BLOCKS' || svc == 'TOTAL') continue;  // 맨앞에서 표현 했으므로 skip
							tempColumnDefs.push({
								headerName: svc,
								highlight : serviceSummaryCtrl.searchOption.svcName,
								headerClass: 'main-header',
								field: svc + "_totalCount",
								width : 130,
								cellRenderer: textHighlightRenderer
							});
						}
					}


					serviceSummaryCtrl.gridColumnDefs = tempColumnDefs;

				});
			}


			function drawPieChartData(){

				let param = angular.copy(serviceSummaryCtrl.searchOption);
				param.svcId = null;
				param.systemName = ConfigManager.getSystemName();
				DataService.httpPost('/data/hdfs/service/getPieChartData', param, function (result) {
					// if (serviceSummaryCtrl.pie.chartObj) serviceSummaryCtrl.pie.chartObj.clear();
					if (serviceSummaryCtrl.pie.chartObj) serviceSummaryCtrl.pie = {};

					if (result.result == 1) {
						curr_date = result.data.curr_date;
						if (curr_date == '') {
							curr_date = moment(serviceSummaryCtrl.searchOption.endTime).format('YYYY-MM-DD');
						}

						let userList = result.data.userList;
						let series_pie_curr = result.data.series_pie_curr;
						let series_pie_total = result.data.series_pie_total;

						for (let i = 0; i < userList.length; i++) {
							let user = userList[i];
							if (colorArr[i] == null)
								colorMap[user] = colorArr[i - colorArr.length];
							else colorMap[user] = colorArr[i];
						}

						if (series_pie_curr) {
							for (let i = 0; i < series_pie_curr.length; i++) {
								let user = series_pie_curr[i].name;
								series_pie_curr[i].itemStyle = {normal:{color: colorMap[user]}};

							}
						}

						if (series_pie_total) {
							for (let i = 0; i < series_pie_total.length; i++) {
								let user = series_pie_total[i].name;
								series_pie_total[i].itemStyle = {normal:{color: colorMap[user]}};

							}
						}

						serviceSummaryCtrl.pie = {};
						serviceSummaryCtrl.pie.config = {
							title: {
								show: true,
								textStyle:{
									fontSize: 16
								},
								text: 'No data.',
								left: 'center',
								top: 'center'
							},
							currDate: curr_date,
							tooltip : {
								trigger: 'item',
								// formatter: "{a} <br/>{b} : {c} ({d}%)"
								formatter : function(param){
									let _name = param.name;
									let _value = param.value[0] || 0;
									let _percent = param.percent;
									return _name+'<br/>'+$filter('number')(_value)+' GB<br/>('+ _percent+' %)';
								}
							},
							legend: {
								show: true,
								x : 'center',
								y : 'top',
								data: userList,
								itemWidth: 10,
								itemHeight: 10,
								orient : 'horizontal'
							},
							calculable : true,
							series : [
								{
									name: curr_date,
									type:'pie',
									radius : [30, 80],
									center : ['26%', '55%'],
									// roseType : 'radius',
									label: {
										normal: {
											show: true
										},
										emphasis: {
											show: true
										}
									},
									lableLine: {
										normal: {
											show: false
										},
										emphasis: {
											show: true
										}
									},
									itemStyle: {
										normal: {
											label: {
												position: "outer"
											},
											labelLine: {
												show: true
											}
										},
										emphasis: {
											label: {
												show: true,
												formatter: "{b}\n{d}%"
											}
										}
									}
								},
								{
									name: 'Total',
									type:'pie',
									radius : [30, 80],
									center : ['72%', '55%'],
									// roseType : 'area',
									label: {
										normal: {
											show: true
										},
										emphasis: {
											show: true
										}
									},
									itemStyle: {
										normal: {
											label: {
												position: "outer"
											},
											labelLine: {
												show: true
											}
										},
										emphasis: {
											label: {
												show: true,
												formatter: "{b}\n{d}%"
											}
										}
									}
								}
							]
						};

						serviceSummaryCtrl.pie.data = [
							series_pie_curr,
							series_pie_total
						];

						if (series_pie_curr.length > 0 || series_pie_total.length > 0) {
							delete serviceSummaryCtrl.pie.config.title;
						}


					} else {
						serviceSummaryCtrl.pie = {};
					}


					serviceSummaryCtrl.searchOption.specificTime = '';

				});
			}

			function openConfigPopup() {
				var popup = ngDialog.open({
						  template: "/data/hdfs/popup/service_config_popup_template.html",
						  className: "ngdialog-theme-default custom-width",
						  showClose: false,
						  disableAnimation: true,
						  cache: false,
						  closeByDocument: false,
						  closeByEscape: false,
						  data: {procType: 'PATH'},
						  scope: $scope
						}).closePromise.then(function(data) {  getData() });


				var closer = $rootScope.$on('ngDialog.refresh', function(e, id) {
				  if (id != popup.id) return;
				  closer();
				});
			}


			function getData() {
				serviceSummaryCtrl.totalDataObj = {};
				drawChart();
				drawPieChartData();
				drawGridData();
			}

			initialize();
		}]);
});