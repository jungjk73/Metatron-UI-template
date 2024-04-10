define(["app", "moment"], function (app, moment) {
	app.controller("JobCountCtrl", ["$scope", "$rootScope", "$http", "$timeout", "$filter", "ConfigManager", "DataService", "GridRenderer", "ngDialog", "CommonUtil",
		function ($scope, $rootScope, $http, $timeout, $filter, ConfigManager, DataService, GridRenderer, ngDialog, CommonUtil) {
			"use strict";


			// property
			let jobCountCtrl = this;
			let systemSeq = "";
			let unbind = [];

			let tooltipTimer;
			let curr_date;

			jobCountCtrl.typeSelectOptionList = [{value: 'user', label: 'USER'}, {value: 'total', label: 'TOTAL'}];
			jobCountCtrl.applicationSelectOptionList = [{value: '2', label: 'Yarn'}, {value: '7', label: 'Trino'}];

			jobCountCtrl.searchOption = {};		// 검색조건 저장 객체

			let colorArr = CommonUtil.getChartColorArr();
			let colorMap = {};

			let loadedFlag = false;

			// SELECT BOX
			// Application
			jobCountCtrl.changeApplicationSelectEventHandler = function (event) {
				jobCountCtrl.searchOption.processSeq = event.value;
				if (loadedFlag) jobCountCtrl.clickSearch();
			};

			// HOUR DAY Check box
			jobCountCtrl.changeDayHourEventHandler = function (dist) {
				jobCountCtrl.searchOption.distDayHour = dist;
				jobCountCtrl.clickSearch();
			};

			// DATE
			jobCountCtrl.changeDateHandler = function (event) {
				let todayDate = moment().format('YYYY-MM-DD');
				let eventEndDate = moment(event.eDateTime).format('YYYY-MM-DD');
				if (moment(todayDate).diff(eventEndDate) > 0) {
					jobCountCtrl.eDateTime = moment(event.eDateTime).format('YYYY-MM-DD 23:59');
				} else {
					jobCountCtrl.eDateTime = moment().format("YYYY-MM-DD HH:mm");
				}

				jobCountCtrl.sDateTime = event.sDateTime;

			};

			// Bar / Line Check box
			jobCountCtrl.changeChartTypeEventHandler = function (type) {
				jobCountCtrl.activeChartType = type;
				jobCountCtrl.clickSearch();

				// set chart type
				// zingchart.exec('jobCountChart', 'setcharttype',{type: type});
				// $timeout(function(){
				// 	zingchart.exec('jobCountChart', 'reload')
				// }, 3000);

			};

			// Chart Toggle - User / Status
			jobCountCtrl.toggleChartClass = function (type, event) {
				jobCountCtrl.activeChartClass = type;
				jobCountCtrl.clickSearch();
			};

			// Search Click
			jobCountCtrl.clickSearch = function () {
				if (!CommonUtil.validateStartEndDate(jobCountCtrl.sDateTime, jobCountCtrl.eDateTime))
                    return;

				jobCountCtrl.searchOption.startTime = jobCountCtrl.sDateTime;
				jobCountCtrl.searchOption.endTime = jobCountCtrl.eDateTime;

				if (jobCountCtrl.searchOption.distDayHour == 'DAY') {
					let todayDate = moment().format('YYYY-MM-DD');
					let eventEndDate = moment(jobCountCtrl.eDateTime).format('YYYY-MM-DD');
					if (moment(todayDate).diff(eventEndDate) > 0) {
						jobCountCtrl.searchOption.endTime = moment(jobCountCtrl.eDateTime).format('YYYY-MM-DD');
					} else {		// 오늘 날짜
						jobCountCtrl.searchOption.endTime = moment(jobCountCtrl.searchOption.endTime).subtract(1, 'day').local().format("YYYY-MM-DD");
					}


				} else {

				}

				console.log('---- Search Option :: ',jobCountCtrl.searchOption);
				getData();
			};


			// 그리드 클릭
			jobCountCtrl.showPieChart = function(value, event){
				if (!event) return;
				curr_date = value[0].data.insertTime;
				jobCountCtrl.searchOption.specificTime = curr_date;
				drawPieChart();
			};


			jobCountCtrl.clickLegend = function(svc){

				$('#customTooltipLayer').remove();

				let plotindex = -1;
				let d = zingchart.exec('jobCountChart', 'getseriesdata');
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
				zingchart.exec('jobCountChart', action, {
					'plotindex':plotindex,
					'toggle-action': 'remove' //toggleAction (CamelCase not supported here), only css style
				});

				svc.visible = !svc.visible;
			};


			// 차트에 마우스 올렸을때 처리
			// 툴팁 만들어서 보여준다
			jobCountCtrl.chartMousemoveEventHandler = function (data) {
				$('#customTooltipLayer').remove();
				$timeout.cancel(tooltipTimer);
				tooltipTimer = $timeout(function () {
					$('#customTooltipLayer').remove();

					let chartId = data.id;
					let items = data.items;
					let trHTMLArr = '';

					let totalVal = 0;
					for (let i = 0; i < items.length; i++) {
						let textArr = items[i].text.split(':');
						let trHTML = '<tr><th><div class="color-tag" style="background-color: '+colorMap[textArr[0]]+'"></div> ' + textArr[0] + '</th><td>' + $filter('number')(textArr[1]) + '</td></tr>';
						totalVal = totalVal + Number(textArr[1]);
						trHTMLArr = trHTMLArr + trHTML;
					}
					trHTMLArr = '<tr><th>Total</th><td>' + $filter('number')(totalVal) + '</td></tr>' + trHTMLArr;
					let timeLabel = data['scale-label']['scale-x'];
					timeLabel = timeLabel.replace('<br>', '');
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
			jobCountCtrl.chartZoomOut = function(id){
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

				systemSeq = ConfigManager.getSystemSeq();

				if (!loadedFlag) return;

				jobCountCtrl.searchOption.systemSeq = systemSeq;
				jobCountCtrl.searchOption.distDayHour = 'HOUR';
				jobCountCtrl.jobCountGridData = [];

				jobCountCtrl.clickSearch();


			}

			function textAlignCenterRenderer(params) {
				if (params == null || params.data == null)
					return '';

				let col = params.column.colId;
				let val = params.data[col] == null ? '0' : params.data[col];
				if (!isNaN(val)) {
					val = $filter('number')(val);
				}

				return "<div style='text-align : center;'><span>" + val + "</span></div>";
			}

			function clear() {
				jobCountCtrl.searchOption = null;
				jobCountCtrl.typeSelectOptionList = null;
				jobCountCtrl.applicationSelectOptionList = null;
				jobCountCtrl.changeTypeSelectEventHandler = null;
				jobCountCtrl.changeApplicationSelectEventHandler = null;
			}

			// function
			function initialize() {
				systemSeq = ConfigManager.getSystemSeq();
				addEventListener();


				jobCountCtrl.searchOption.distDayHour = 'HOUR';
				jobCountCtrl.activeChartClass = 'user';
				jobCountCtrl.activeChartType = 'bar';

				$timeout(function () {
					jobCountCtrl.sDateTime = moment().subtract(2, 'week').local().format("YYYY-MM-DD 00:00");
					jobCountCtrl.eDateTime = moment().format("YYYY-MM-DD HH:mm");
				}, 500);


				$timeout(function () {
					jobCountCtrl.clickSearch();
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

			function getData() {

				jobCountCtrl.searchOption.systemSeq = systemSeq;

				drawPieChart();

				drawBarLineChart();


				DataService.httpPost('/data/job/count/getGridData', jobCountCtrl.searchOption, function (result) {

					jobCountCtrl.jobCountGridData = result.data.grid;
					result.data.user.pop();
					result.data.user.unshift('total');

					let tempColumnDefs = [];

					if (jobCountCtrl.activeChartClass == 'user') {
						tempColumnDefs.push({
							headerName: "Date",
							headerClass: 'main-header',
							field: "insertTime",
							width: 140,
							cellRenderer: textAlignCenterRenderer
						});
						for (let i = 0; i < result.data.user.length; i++) {
							let user = result.data.user[i];
							tempColumnDefs.push({
								headerName: user,
								headerClass: 'main-header',
								field: user + "_totalCount",
								width: 80,
								cellRenderer: textAlignCenterRenderer
							});
						}
					} else {
						tempColumnDefs.push({
							headerName: "Date",
							headerClass: 'main-header',
							field: "insertTime",
							width: 140,
							cellRenderer: textAlignCenterRenderer
						});
						tempColumnDefs.push({
							headerName: "Total",
							headerClass: 'main-header',
							field: "total_totalCount",
							width: 140,
							cellRenderer: textAlignCenterRenderer
						});
						tempColumnDefs.push({
							headerName: "Finish",
							headerClass: 'main-header',
							field: "total_finishCount",
							width: 140,
							cellRenderer: textAlignCenterRenderer
						});
						tempColumnDefs.push({
							headerName: "Fail",
							headerClass: 'main-header',
							field: "total_failCount",
							width: 140,
							cellRenderer: textAlignCenterRenderer
						});
					}



					jobCountCtrl.jobCountGridColumnDefs = tempColumnDefs;

				});
			}

			function drawBarLineChart(){
				let url = '';
				if (jobCountCtrl.activeChartClass == 'user') {
					url = "/data/job/count/getDataByUser";
				}
				else {
					url = "/data/job/count/getDataByState";
				}

				jobCountCtrl.legendItems = [];

				DataService.httpPost(url, jobCountCtrl.searchOption, function (result) {

					if (result.result == 1) {
						let userList = result.data.userList;
						let series_stack = result.data.series_stack;

						let scaleX = result.data.scaleX;
						for (let i = 0; i < scaleX.length; i++) {
							scaleX[i] = moment(scaleX[i]).format('x');
						}

						if (userList && userList.length > 0) {
							// let colorMap = {};
							for (let i = 0; i < userList.length; i++) {
								let user = userList[i];
								if (colorArr[i] == null)
									colorMap[user] = colorArr[i - colorArr.length];
								else colorMap[user] = colorArr[i];

								jobCountCtrl.legendItems.push({name:user, color:colorMap[user], visible:true});
							}

							if (series_stack) {
								for (let i = 0; i < series_stack.length; i++) {
									let user = series_stack[i].text;
									series_stack[i].backgroundColor = colorMap[user];
									series_stack[i].lineColor = colorMap[user];
									series_stack[i].lineWidth = '1';
									series_stack[i].marker = {};
									series_stack[i].marker.backgroundColor = colorMap[user];
									series_stack[i].marker.size = '3';
								}
							}

							let token = '';
							if (jobCountCtrl.searchOption.distDayHour == 'HOUR') token = '<br> %H:%i:%s';

							let noData = {
								"color": "#fff",
								"margin-top": "7%",
								"font-size": "16px",
								"background-color": "none",
								"text": "No data."
							};

							jobCountCtrl.jobCountChartObj = {
								type: jobCountCtrl.activeChartType,
								noData: noData,
								plotarea: {
									border: "none",
									marginTop: "50",
									marginRight: "30",
									marginBottom: "40",
									marginLeft : 'dynamic',
									paddingRight: "100"
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
									stacked: jobCountCtrl.activeChartType == 'bar',
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
							jobCountCtrl.jobCountChartObj = {};
						}

					}

				}, false);
			}


			function drawPieChart(){

				let url_pie = '';
				if (jobCountCtrl.activeChartClass == 'user') {
					url_pie = "/data/job/count/getPieChartDataByUser";
				}
				else {
					url_pie = "/data/job/count/getPieChartDataByState";
				}


				DataService.httpPost(url_pie, jobCountCtrl.searchOption, function (result) {
					// if (jobCountCtrl.pie.chartObj) jobCountCtrl.pie.chartObj.clear();
					if (jobCountCtrl.pie.chartObj) jobCountCtrl.pie = {};

					if (result.result == 1) {
						curr_date = result.data.curr_date;

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

						jobCountCtrl.pie.config = {
							currDate: curr_date,
							tooltip : {
								trigger: 'item',
								formatter: "{a} <br/>{b} : {c} ({d}%)"
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

						jobCountCtrl.pie.data = [
							series_pie_curr,
							series_pie_total
						];

					} 


					jobCountCtrl.searchOption.specificTime = '';

				});
			}

			initialize();
		}]);
});