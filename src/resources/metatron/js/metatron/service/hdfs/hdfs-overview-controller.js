define(["app", "moment"], function (app, moment) {
	app.controller("HdfsOverviewCtrl", ["$rootScope", "$scope", "$timeout", "$controller", "$filter", "DataService", "ConfigManager", "GridRenderer", "ngDialog", "CommonUtil",
		function ($rootScope, $scope, $timeout, $controller, $filter, DataService, ConfigManager, GridRenderer, ngDialog, CommonUtil) {
			"use strict";

			let hdfsOverviewCtrl = this;

			hdfsOverviewCtrl.overviewDataArr = [];
			hdfsOverviewCtrl.usageGridList = [];
			hdfsOverviewCtrl.serviceGridList = [];
			hdfsOverviewCtrl.gridView = false;

			let unbind = [];

			let colorArr = CommonUtil.getChartColorArr();


			hdfsOverviewCtrl.toggleGridView = function(){
				hdfsOverviewCtrl.gridView = !hdfsOverviewCtrl.gridView;
				if (hdfsOverviewCtrl.gridView) {
					hdfsOverviewCtrl.serviceGridList = [];
					$timeout(function(){
						hdfsOverviewCtrl.usageGridList = angular.copy(hdfsOverviewCtrl.usageGridList);
					}, 100);
				}

			};

			hdfsOverviewCtrl.usageGridRowClick = function(val){
				if (val == null || val.length == 0) return;

				let clusterName = val[0].data.clusterName;

				getServiceUsageData(clusterName);
			};

			function getServiceUsageData(clusterName){
				DataService.httpPost("/service/hdfs/getServiceUsageData", {'clusterName': clusterName}, function (result) {
					if (result.result != 1) {
						hdfsOverviewCtrl.serviceGridList = [];
						return;
					}

					hdfsOverviewCtrl.serviceGridList = result.data.data;

				});
			}

			function getData() {
				DataService.httpPost("/service/hdfs/getHdfsOverviewData", {}, function (result) {

					if (result.result == 1 && result.data) {
						console.log(result.data);
						hdfsOverviewCtrl.usageGridList = result.data.data;
						let serviceNameList = result.data.serviceNameList;
						let colorMap = {};

						for (let i = 0; i < serviceNameList.length; i++) {
							let svc = serviceNameList[i];
							if (colorArr[i] == null)
								colorMap[svc] = colorArr[i - colorArr.length];
							else colorMap[svc] = colorArr[i];
						}

						hdfsOverviewCtrl.overviewDataArr = result.data.data;

						for (let i = 0; i < hdfsOverviewCtrl.overviewDataArr.length; i++) {
							hdfsOverviewCtrl.overviewDataArr[i].usage = {};
							hdfsOverviewCtrl.overviewDataArr[i].usage.config = {};
							hdfsOverviewCtrl.overviewDataArr[i].usage.data = [];

							hdfsOverviewCtrl.overviewDataArr[i].usage.config = {
								tooltip: {show: false},
								cursor: 'move',
								label: {
									normal: {
										show: false
									},
									emphasis: {
										show: false
									}
								},
								series: [{
									type: 'pie',
									unit: 'TB',
									radius: ['80', '100']
								}]
							};

							let usageData = [
								{
									value: Number(hdfsOverviewCtrl.overviewDataArr[i].capacityUsed), name: 'Used', color: '#01C853',
									label: _labelShowOption
								},
								{
									value: Number(hdfsOverviewCtrl.overviewDataArr[i].capacityNon), name: 'Non', color: '#666A7B',
									label: _labelCloseOption
								},
								{
									value: Number(hdfsOverviewCtrl.overviewDataArr[i].capacityRemaining), name: 'Free', color: '#3E8CFF',
									label: _labelCloseOption
								}
							];
							hdfsOverviewCtrl.overviewDataArr[i].usage.data.push(usageData);


							// pie chart 처리
							hdfsOverviewCtrl.overviewDataArr[i].service = {};
							/*
							hdfsOverviewCtrl.overviewDataArr[i].service.config = {
								tooltip : {
									trigger: 'item',
									formatter : function(param){
										let _name = param.name;
										let _value = param.value[0] || 0;
										let _percent = param.percent;
										return _name+'<br/>'+$filter('number')(_value)+' GB<br/>('+ _percent+' %)';
									}
								},
								legend: {
									show: false
								},
								calculable : true,
								series : [
									{
										type:'pie',
										radius : [40, 80],
										center : ['50%', '55%'],
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
									}
								]
							};
							*/
							hdfsOverviewCtrl.overviewDataArr[i].service.config = {
								legend: {
									show: false
								},
								calculable : true,
								tooltip: {show : false},
								series : [
									{
										type:'pie',
										unit: 'TB',
										radius : [80, 100],
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
							hdfsOverviewCtrl.overviewDataArr[i].service.data = [];

							let serviceData = [];
							for (let k = 0; k < hdfsOverviewCtrl.overviewDataArr[i].serviceChartData.length; k++) {
								let _chartData = hdfsOverviewCtrl.overviewDataArr[i].serviceChartData[k];
								let _color = colorMap[_chartData.name];
								// hdfsOverviewCtrl.overviewDataArr[i].serviceChartData[k].itemStyle = {normal:{color: _color}};
								serviceData.push(
									{
										value: Number(_chartData.value), name: _chartData.name, color: _color,
										label: k == 0 ? _labelShowOption : _labelCloseOption
									}
								);
							}
							hdfsOverviewCtrl.overviewDataArr[i].service.data.push(serviceData);

							// hdfsOverviewCtrl.overviewDataArr[i].serviceChartData.length
							// $scope._h = calc( (100% - (hdfsOverviewCtrl.overviewDataArr[i].serviceChartData.length * 25)) / 2 );

							$timeout(function () {
								hdfsOverviewCtrl.overviewDataArr[i].usage.chartObj.on('mouseover', function (params) {
									for (let m = 0 ; m < hdfsOverviewCtrl.overviewDataArr[i].usage.data[0].length ; m++ ) {
										hdfsOverviewCtrl.overviewDataArr[i].usage.data[0][m].label = _labelCloseOption;
									}

									hdfsOverviewCtrl.overviewDataArr[i].usage.data[0][params.dataIndex].label = _labelShowOption;
									ap($scope);
								});
								hdfsOverviewCtrl.overviewDataArr[i].usage.chartObj.on('mouseout', function (params) {
									hdfsOverviewCtrl.overviewDataArr[i].usage.data[0][0].label = _labelShowOption;		// used
									hdfsOverviewCtrl.overviewDataArr[i].usage.data[0][1].label = _labelCloseOption;		// non
									hdfsOverviewCtrl.overviewDataArr[i].usage.data[0][2].label = _labelCloseOption;		// free
									ap($scope);
								});


								hdfsOverviewCtrl.overviewDataArr[i].service.chartObj.on('mouseover', function (params) {
									for (let m = 0 ; m < hdfsOverviewCtrl.overviewDataArr[i].service.data[0].length ; m++ ) {
										hdfsOverviewCtrl.overviewDataArr[i].service.data[0][m].label = _labelCloseOption;
									}

									hdfsOverviewCtrl.overviewDataArr[i].service.data[0][params.dataIndex].label = _labelShowOption;
									ap($scope);
								});
								hdfsOverviewCtrl.overviewDataArr[i].service.chartObj.on('mouseout', function (params) {
									for (let m = 0 ; m < hdfsOverviewCtrl.overviewDataArr[i].service.data[0].length ; m++ ) {
										if (m == 0)	hdfsOverviewCtrl.overviewDataArr[i].service.data[0][m].label = _labelShowOption;
										else hdfsOverviewCtrl.overviewDataArr[i].service.data[0][m].label = _labelCloseOption;
									}
									ap($scope);
								});


							}, 500);


						}


					}

				});
			}

			let _labelShowOption = {
				normal: {
					show: true,
					position: 'center',
					textStyle: {
						fontSize: '30',
						fontWeight: 'bold'
					}
				}
			};
			let _labelCloseOption = {
				normal: {
					show: false
				}
			};



			function addEventListener() {
				// broadcast event
				unbind = [
					$scope.$on('$destroy', destory)
				];
			}

			function destory() {
				unbind.forEach(function (fn) {
					fn();
				});
				clear();
			}

			function clear() {
				hdfsOverviewCtrl.overviewDataArr = [];
			}

			function initialize() {

				addEventListener();

				getData();

			}

			initialize();
		}]);
});