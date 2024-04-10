define(["app", "moment"], function(app, moment) {
    app.controller("RpcMonitoringCtrl", ["$rootScope", "$scope", "$interval", "$timeout", "$filter", "$http", "$q", "DataService", "WebSocketService", "ConfigManager", "GridRenderer", "ngDialog", 'CommonUtil',
        function($rootScope, $scope, $interval, $timeout, $filter, $http, $q, DataService, WebSocketService, ConfigManager, GridRenderer, ngDialog, CommonUtil) {
            "use strict";

            let vm = this;
            let unbind = [];
            let colorArr = ['#00c853','#ff3d00', '#29c5ff','#ffea00','#e76049', '#ffc000','#ff6600','#2979ff','#d500f9','#5d9cec'];           

            function search() {
                if (!CommonUtil.validateStartEndDate(vm.sDateTime, vm.eDateTime))
                    return;

                getRpcActivityDatas();
                getNamenodeActivityDatas();
            }

            // RpcActivityDatas Chart Datas
            function getRpcActivityDatas() {
                DataService.httpPost("/service/hdfs/rpcmonitoring/getRpcActivityDatas", vm.searchInfo, function(result) {
                    if (result.result === 1 && result.data !== null) {
                        vm.chart.rpcQueueTimeObj = getRpcMonitoringChartObj('rpcqueuetimeavgtime', result.data);
                        vm.chart.rpcProcessingTimeObj = getRpcMonitoringChartObj('rpcprocessingtimeavgtime', result.data);
                    }
                });
            }

            // RpcActivityDatas Chart Datas
            function getNamenodeActivityDatas() {
                DataService.httpPost("/service/hdfs/rpcmonitoring/getNamenodeActivityDatas", vm.searchInfo, function(result) {
                    if (result.result === 1 && result.data !== null) {
                        vm.chart.totalFileOpsObj = getRpcMonitoringChartObj('value', result.data);
                    }
                });
            }

            function getRpcMonitoringChartObj(iType, data) {
                var scaleX = [], values = [], series = [];

                var i=0;
                _.each(data, function(val, key){
                    if(i == 0) {                        
                        scaleX = _.map(val, function(item){return item.insertTime});
                    }
                    values = _.map(val, function(item){return item[iType]});

                    var obj = {
                        "type": 'line',
                        "line-color": colorArr[i],
                        "text": key.toUpperCase(),
                        "guideLabel": {
                            "text": "%t : %v ",
                            "color": "#fff",
                            "font-size": "10px",
                            "background-color": "#292626",
                            "border-color": colorArr[i]
                        },
                        values: values
                    };    
                    series.push(obj);  
                   
                    i++;
                });

                var chartObj = createLineChartObj(scaleX, series);

                return chartObj;

            }


            /* 라인차트 Object 생성 */
            function createLineChartObj(scaleX, series) {

               
                var chartObj = {
                    type: 'mixed',
                    backgroundColor: 'transparent',
                    theme: 'dark',
                    // title: {
                    //     text: 'chartInfo.title',
                    //     y: '10',
                    //     fontSize: '15',
                    //     fontColor: "#fff"
                    // },
                    noData:{
                    text:"No Data.",
                    backgroundColor: "#fff",
                    fontSize:18,
                    textAlpha:.9,
                    alpha:.6,
                    bold:true
                    },
                    plotarea: {
                        marginTop: "30",
                        marginRight: "38",
                        marginBottom: "25",
                        marginLeft: "50"
                    }, // 그래프 사이즈
                    plot: {
                        "mode": "fast",
                        "exact": true,
                        "smartSampling": true,
                        "maxNodes": 0,
                        //  "maxTrackers": 0,     tooltip 안보임
                        "lineWidth": 1,
                        "shadow": false,
                        "marker": {
                            color: '#e76049',
                            type: "circle",
                            borderWidth: 0,
                            size: 2,
                            shadow: false
                        },
                        "thousands-separator":",",
                        "aspect": "spline"
                    },

                    tooltip: {
                        visible: false
                    },
                    crosshairX: {
                        shared: false,
                        lineWidth: 1,
                        scaleLabel: {
                            "backgroundColor": "#292626",
                            "color": "#fff",
                            borderColor: "#C0C0C0",
                            borderWidth: "1px",
                            transform: {
                                type: "date",
                                text: "%mm-%dd %H:%i:%s"
                            }
                        },
                        plotLabel: {
                            visible: true,
                            multiple: true
                        }
                    },
                    scaleY: {
                        "min-value": "auto",
                        "thousands-separator": ",",
                        item: {
                            "font-color": "#4e4949"
                        },
                        guide: {
                            visible: false,
                            "line-width": "1px",
                            "line-color": "#CCCCCC",
                            alpha: "0.2",
                            "line-style": "dashed"
                        },
                        "transform": {}
                        // "progression": "log",
                        // "log-base": 10                       
                    },
                   
                    scaleX: {
                        zooming: true,
                        placement: "default",
                        // maxItems: 5,
                        //step: 60000 * 60, //1시간 단위
                        item: {
                            "font-color": "#4e4949"
                        },
                        guide: {
                            visible: false
                        },
                        tick: {
                            lineWidth: "1px"
                        },
                        "min-value": "auto",
                        // "min-value":1541753250000,
                        //"step":"30minute",
                        // "min-value":"1541753250000", //Min Value
                        // "max-value":"1541771970000", //Max Value
                        "transform": {
                            type: "date",
                            all: "%H:%i"
                        },
                        "max-items": 24,
                        values: scaleX
                    },

                    series: series
                }

                return chartObj;
            };



            function chartZoomOut(chart_id) {
                zingchart.exec(chart_id, 'viewall');
            };

            function changeDateHandler(event) {
                vm.searchInfo.startDate = event.sDateTime;
                vm.searchInfo.endDate = event.eDateTime;
                ap($scope);
            }

            function reset() {
                vm.searchInfo = {
                    systemSeq: ConfigManager.getSystemSeq()
                };
                vm.data = {
                    rpcActivityDatas: []
                };
                vm.chart = {
                    rpcQueueTimeObj: {},
                    rpcProcessingTimeObj: {},
                    totalFileOpsObj: {}
                }

                ap($scope);
            }

            function setSearchProcess() {
                $timeout(function() {                   
                    vm.sDateTime = moment().subtract(1, 'days').local().format('YYYY-MM-DD HH:mm');
                    vm.eDateTime = moment().format('YYYY-MM-DD HH:mm');
                    vm.searchInfo.startDate = vm.sDateTime;
                    vm.searchInfo.endDate = vm.eDateTime;

                    // vm.searchInfo.startDate = '2019-12-06 14:00';
                    // vm.searchInfo.endDate = '2019-12-06 15:00';
                    search();
                },1000)
            }


            function onChangeSystemSeqEventHandler(event, data) {
                reset();
                setSearchProcess();
            }

            function addEventListener() {
                unbind = [
                    $scope.$on('$destroy', destroy),
                    $scope.$on(ConfigManager.getEvent("CHANGE_SYSTEM_SEQ_EVENT"), onChangeSystemSeqEventHandler)
                ];
            }

            function destroy() {
                unbind.forEach(function(fn) {
                    fn();
                });
            }

            function initialize() {
                reset();
                vm.changeDateHandler = changeDateHandler;
                vm.search = search;
                vm.chartZoomOut = chartZoomOut;

                addEventListener();
                setSearchProcess();

            }


            initialize();
        }
    ]);

});