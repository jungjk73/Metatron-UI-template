if (typeof module !== "undefined" && typeof exports !== "undefined" && module.exports === exports) {
	module.exports = 'metatronChart';
}

(function (angular) {
	'use strict';

	var theme;		// 전역변수, 한번만 load
	$.get("/resources/constants/chart-theme.json", function (data) {
		theme = data;
	});

	// http://www.zingchart.com/ 사이트 참고
	angular.module('metatronChart', [])
		.directive('metatronChart', ['$compile', function ($compile) {
			return {
				restrict: 'EA',
				replace: true,
				require: "metatronChart",
				transclude: true,
				scope: {
					chartId: "@",				// chart ID
					source: "=",				// chart data
					seriesType: "@type",		// line, bar, area, mixed 등등..(mixed인 경우 source에 type지정을 해줘야함)
					themeType: "@",				// theme type
					title: "@",					// chart Title
					legend: "@",				// legend show flag
					zoom: "@",					// chart zoom (x or y or xy)
					merge: "@",					// 기본 차트 속성과 merge할지의 여부
					hideprogresslogo: "@",		// 로딩시 로고 노출 여부
					jsonObj: "=",				// chart의 정의된 속성 이외 추가할 속성
					chartHeight: "@height",		// chart height값
					chartWidth: "@width",		// chart width값
					refresh: "=",				// refresh를 위해서 랜덤값
					output: "@",				// output type(canvas, svg...)
					onMousemove : "&",			// mouse move 이벤트
					onSeriesClick: "&",			// node click 이벤트
					onSeriesOver: "&",			// node mouse over 이벤트
					onSeriesOut: "&",			// node mouse out 이벤트
					onPlotOut: "&",				// plot mouse out 이벤트
					onZooming:"&"				// zoom 이벤트
				},
				link: function postLink($scope, $element, $attrs, controller) {
					var DEFAULT_CHART_TYPE = "line";
					var unbind = [];

					// property
					var source = null;
					var seriesType = DEFAULT_CHART_TYPE;
					var title = null;
					var legend = false;
					var zoom = false;
					var zoomType = "x";
					var crosshair = false;
					var hideprogresslogo = false;
					var jsonObj = {};
					var refresh = "";
					var merge = true;
					var themeType = "dark";
					var output = "";

					var chartID = "";
					var chartH = $attrs.height == undefined ? '100%' : $attrs.height;
					var chartW = $attrs.width == undefined ? '100%' : $attrs.width;

					var curr_chart = ""; // tooltip 때문에 현재 차트 체크

					/**
					 * chart 기본 설정 가져오는 함수
					 */
					function getChartOption() {

						var option = {
							"background-color": (themeType == null || themeType == "dark") ? "transparent" : "#fff"
						};

						var noData = {
							"color": (themeType == null || themeType == "dark") ? "#fff" : "transparent",
							"margin-top": "7%",
							"font-size": "16px",
							"background-color": "none",
							"text": "No data."
						};

						if (!merge && jsonObj != null && Object.keys(jsonObj).length > 0) {
							if (jsonObj["gui"] == null) jsonObj["gui"] = {contextMenu : {empty : true}};
							jsonObj["gui"].contextMenu = {empty:true};
							if (jsonObj["scaleX"]) {
								jsonObj["scaleX"].zooming = {};
								jsonObj["scaleX"].zooming = true;
							} else if (jsonObj["scale-x"]) {
								jsonObj["scale-x"].zooming = {};
								jsonObj["scale-x"].zooming = true;
							}
							jsonObj["no-data"] = noData;
							return jsonObj;
						}

						// source
						if (!source) {
							source = [];
							source.push({data: []});
						}
						option.series = source;

						// series
						option.type = seriesType;

						// title
						title = $attrs.title;
						if (title != null && title != "") {
							if (!option.title)
								option.title = {};

							option.title.text = title;
						}

						// legend
						if (legend) {
							option.legend = {
								"layout": "x1",
								"margin-top": "5%",
								"border-width": "1",
								"max-items": 4,
								"overflow": "page",
								"shadow": false,
								"marker": {
									"cursor": "hand",
									"border-width": "0"
								},
								"background-color": (themeType == null || themeType == "dark") ? "transparent" : "#fff",
								"item": {
									"cursor": "hand"
								},
								"toggle-action": "remove"
							};
						}

						// scale
						option["scale-x"] = {
							thousandsSeparator: ",",
							guide: {
								visible: false
							}
						};
						option["scale-y"] = {
							thousandsSeparator: ",",
							guide: {
								visible: false
							}
						};

						// zoom
						if (zoom) {
							zoomType = $attrs.zoom;
							if (zoomType.indexOf("x") > -1 && option["scale-x"] == null)
								option["scale-x"] = {};
							if (zoomType.indexOf("y") > -1 && option["scale-y"] == null)
								option["scale-y"] = {};

							if (zoomType.toLowerCase() == "xy") {
								option["scale-x"].zooming = zoom;
								option["scale-y"].zooming = zoom;
							} else if (zoomType.toLowerCase() == "x" || zoomType.toLowerCase() == "y") {
								option["scale-" + zoomType].zooming = zoom;
							}
						}

						// crosshair
						if (crosshair) {
							if (!option["crosshair-x"])
								option["crosshair-x"] = {};

							option["crosshair-x"].shared = crosshair;
						}

						option.tooltip = {
							"jsRule": 'window.tooltipFunc(e)',
							zIndex : 999
						};

						// json object
						if (jsonObj != null && Object.keys(jsonObj).length > 0)
							angular.merge(option, jsonObj);

						option.gui = {
							"context-menu": {
								"visible": "false"
							}
						};

						option["no-data"] = noData;

						return option;
					}

					/*
					 * chart에 이벤트 바인딩 함수
					 */
					function addChartEvent() {
						if ($attrs.onMousemove) {
							zingchart.bind(chartID, "guide_mousemove", function (p) {
								$scope.onMousemove({event: p});
							});
						}
						if ($attrs.onSeriesClick) {
							zingchart.bind(chartID, "node_click", function (p) {
								$scope.onSeriesClick({event: p});
							});
						}
						if ($attrs.onSeriesOver) {
							zingchart.bind(chartID, "node_mouseover", function (p) {
								$scope.onSeriesOver({event: p});
							});
						}
						if ($attrs.onSeriesOut) {
							zingchart.bind(chartID, "node_mouseout", function (p) {
								$scope.onSeriesOut({event: p});
							});
						}
						if ($attrs.onPlotOut) {
							zingchart.bind(chartID, "plot_mouseout", function (p) {
								$scope.onPlotOut({event: p});
							});
						}
						if (legend) {
							zingchart.bind(chartID, "legend_item_click", legendClickHandler);
							zingchart.bind(chartID, "legend_marker_click", legendClickHandler);
						}
						if ($attrs.onZooming) {
							zingchart.bind(chartID, "zoom", function(p){
								$scope.onZooming({event:p});
							});
						}
					}

					/**
					 * legend item 클릭 이벤트 핸들러
					 */
					function legendClickHandler(p) {
						p.visible = !p.visible;

						var d = zingchart.exec(chartID, 'getseriesdata');
						if (d == null || d.length < 1)
							return;

						var count = 0;
						for (var i = 0; i < d.length; i++) {
							if (p.plotindex == d[i].palette)
								d[i].visible = p.visible;

							if (d[i].visible == false)
								count++;
						}
						if (d.length == count) {
							var v = !p.visible;
							p.visible = v;
							d[p.plotindex].visible = v;
							zingchart.exec(chartID, 'update');
						}
					}

					/**
					 * 차트 생성(차트 속성이 달라졌을 때 사용)
					 */
					function createChart() {
						var option = getChartOption();
						var conf = {};


						conf.data = option;
						conf.cache = {data: true | false, defaults: true | false, css: true | false, csv: true | false};
						if (output == null || output == "") {
							conf.output = output;
						}

						zingchart.exec(chartID, 'setdata', conf);

						// zingchart 라이센스 없애기
						setTimeout(function(){
							$('a[title="JavaScript Charts by ZingChart"]').remove();
							$('.zc-license').remove();

						},5000);
					}

					/**
					 * source 속성
					 */
					function sourceChange(value) {
						if (!value || value === source)
							return;

						source = value;
						zingchart.exec(chartID, 'setseriesdata', {
							data: source
						});
					}

					/**
					 * 추가 속성(데이터 타입은 json)
					 */
					function jsonObjChange(value) {
						if (!value)
							value = {};

						jsonObj = value;
						createChart();
					}

					/**
					 * chart width 속성
					 */
					function widthChange(value) {
						if (value == null || value == chartW)
							return;

						var w;

						if (value.indexof('%') > -1)
							w = value;
						else
							w = parseInt(value);

						zingchart.exec(chartID, 'resize', {
							'width': w
						});

						console.log('##### RESIZE!!!!!');

						chartW = w;
					}

					/**
					 * chart height 속성
					 */
					function heightChange(value) {
						if (value == null || value == chartH)
							return;

						var h = parseInt(value);
						zingchart.exec(chartID, 'resize', {
							'height': h
						});

						chartH = h;
					}

					/**
					 * 강제 refresh를 위한 dummy 값
					 */
					function refreshChange(value) {
						if (value == null)
							return;

						refresh = value;
						createChart();
					}

					/**
					 * 속성 감시 이벤트 핸들러
					 */
					function addEventHandler() {
						unbind = [
							$scope.$watch("source", sourceChange),
							$scope.$watch("jsonObj", jsonObjChange),
							$scope.$watch("chartWidth", widthChange),
							$scope.$watch("chartHeight", heightChange),
							$scope.$watch("refresh", refreshChange)
						];

						zingchart.bind(chartID, 'zoom', function(e) {
							if (e.action && e.action != 'viewall')
								return true;

							// viewall에 대한 처리
							var data = zingchart.exec(e.id, "getseriesvalues");
							if(data == null || data.length <1)
								return true;

							if (data == null || data.length < 1 || data[0] == null || data[0].length < 1) {
								return false;
							}
						});
					}

					/**
					 * 사용자 속성 setting
					 */
					function setAttr() {
						source = ($attrs.source == null) ? [] : $attrs.source;
						jsonObj = ($attrs.jsonObj == null) ? [] : $attrs.jsonObj;
						seriesType = ($attrs.type == null || $attrs.type == "") ? DEFAULT_CHART_TYPE : $attrs.type;
						chartID = ($attrs.chartId == null || $attrs.chartId == "") ? getDefaultChartID() : $attrs.chartId;
						merge = ($attrs.merge == null || $attrs.merge == "false") ? false : true;
						crosshair = ($attrs.crosshair == null || $attrs.crosshair == 'false') ? false : true;
						legend = ($attrs.legend == null || $attrs.legend == 'false') ? false : true;
						zoom = ($attrs.zoom != null && $attrs.zoom != '') ? true : false;
						hideprogresslogo = ($attrs.hideprogresslogo == null || $attrs.hideprogresslogo == 'false') ? false : true;
						themeType = ($attrs.themeType == null) ? "dark" : $attrs.themeType;
						output = ($attrs.output == null || $attrs.output == "") ? "" : $attrs.output;

						// append after setting
						appendChartElement();
					}

					/**
					 * chart 기본 ID 셋팅
					 */
					function getDefaultChartID() {
						return "metatron-" + (new Date()).getTime() + Math.floor((Math.random() * 1000) + 1);
					}

					/**
					 * target에 chart element 추가
					 */
					function appendChartElement() {
						var target = angular.element($element);
						target[0].id = chartID;

						// output 은 render 에 넣어야 적용이됨
						var r = {
							id: chartID,
							defaults: theme,
							cacheControl: 'http-headers',
							hideprogresslogo: hideprogresslogo,
							width: chartW,
							height: chartH
						};

						if (output != null && output != "") {
							r.output = output;

							//svg 일 경우에 넣으면 tooltip 사이즈가 고정이 됨
							if (output == null || output == "svg") {
								zingchart.FASTWIDTH = true;
							}
						}

						zingchart.render(r);
						addChartEvent();
					}


					// 2017.04.26 김경내 추가
					// tooltip 이 무조건 나와서 현재 mouse_over 된 차트가 아니면
					// tooltip visible = false
					//chart tooltip 버튼에 가려지는 문제  수정 z-index node mouse over 변
					zingchart.node_mouseover = function(p) {
						curr_chart = p.id;
						var thisChart = document.getElementById(p.id+"-top");
						$(thisChart).css("z-index","100");
					};
					//chart tooltip 버튼에 가려지는 문제  수정
					zingchart.node_mouseout = function(p) {
						curr_chart = "";
						var thisChart = document.getElementById(p.id+"-top");
						$(thisChart).css("z-index","0");
					};

					window.tooltipFunc = function (e) {
						if(curr_chart == e.id || curr_chart == "")
							return {"visible" : "true"};
						else
							return {"visible" : "false"};
					};


					// zingchart.guide_mousemove = function(p) {
					// 	console.log('@@@@ ',p);
					// 	if ($attrs.onMousemove) {
					// 		$scope.onMousemove({'data':p});
					// 	}
					// };

					/**
					 * Destroy
					 */
					function destroy() {
						$scope.$on("$destroy", function () {

							// 차트에서 잡고 있는 메모리 해제
							zingchart.exec(chartID, 'destroy');

							unbind.forEach(function (fn) {
								fn();
							});
						});
					}

					/**
					 * 초기 함수
					 */
					function initialize() {
						setAttr();
						destroy();
						addEventHandler();
					}

					initialize();
				},
				controller: ['$scope', function ($scope) {
				}]
			};
		}])
})(angular);
