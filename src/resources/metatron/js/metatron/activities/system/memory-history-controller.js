define(["app", "moment"], function(app, moment) {
    app.controller("SystemMemoryHistoryCtrl", ["$rootScope", "$scope", "$interval", "$timeout", "$filter", "$http", "$q", "DataService", "WebSocketService", "ConfigManager", "GridRenderer", "ngDialog", 'CommonUtil',
        function($rootScope, $scope, $interval, $timeout, $filter, $http, $q, DataService, WebSocketService, ConfigManager, GridRenderer, ngDialog, CommonUtil) {
            "use strict";

            let vm = this;
            let unbind = [];
            let colorArr = ['#00c853', '#ff3d00'];
            let systemSeq = ConfigManager.getSystemSeq();

            function search() {

                if (!CommonUtil.validateStartEndDate(vm.sDateTime, vm.eDateTime))
                    return;

                var t1 = moment(vm.sDateTime, 'YYYY-MM-DD HH:mm');
                var t2 = moment(vm.eDateTime, 'YYYY-MM-DD HH:mm');
                var diff = moment.duration(t2.diff(t1)).asDays();

                if (diff > 1) {
                    vm.searchInfo.groupByType = 'hour';
                } else {
                    vm.searchInfo.groupByType = 'seconds';
                }

                getSystemDatas(t1.format('X'), t2.format('X'));

                getYarnDatas('master');
                getYarnDatas('slave');

                getPrestoDatas('master');
                getPrestoDatas('slave');
            }

            // System Chart Datas
            function getSystemDatas(startTime, endTime) {               
                var s_param = {
                    function: 'getMetricSummary',
                    resultEvent: 'GET_SYSTEM_MEMORY_HISTORY_EVENT',
                    systemSeq: systemSeq,
                    metricData: [
                        { startTime: startTime, endTime: endTime }
                    ]
                };                
                WebSocketService.callRequest(s_param);               
            }

            function onWebsocketDataReceiveEventHandler(event, data) {
                console.log(data);
                if (data.hasOwnProperty("exceptionMassage") || !data.hasOwnProperty("searchResults")) return;      

                vm.chart.systemMasterObj = {};                
                createChartDatas(data.searchResults.Others).then(function(result){
                    vm.chart.systemMasterObj = createLineChartObj(result, 'TB');
                });  

                vm.chart.systemSlaveObj = {};
                createChartDatas(data.searchResults.DataNode).then(function(result){
                    vm.chart.systemSlaveObj = createLineChartObj(result, 'TB');
                });    

            }

            function createChartDatas(data) {
                var defferd = $q.defer();

                var result = {};

                if(data.MEM_TOTAL && data.MEM_FREE) {
                    var insertTimes = [], totalValues = [], usedValues = [];
                    
                    var i=0;
                    _.each(data.MEM_TOTAL, function(val, key){    
                        insertTimes.push(key*1000);
                        totalValues.push(parseFloat((val/1024/1024/1024).toFixed(2)));
                        usedValues.push(parseFloat(((val-data.MEM_FREE[key])/1024/1024/1024).toFixed(2)));
                        i++;
                    });
                    
                    result = {
                        total: {
                            insertTimes: insertTimes,
                            values: totalValues
                        },
                        used: {
                            insertTimes: insertTimes,
                            values: usedValues
                        }
                    }

                    if(Object.keys(data.MEM_TOTAL).length == i) {
                        defferd.resolve(result);                       
                    }
                }
                return defferd.promise;
            }

            // Yarn Chart Datas
            function getYarnDatas(searchType) {
                var param = angular.copy(vm.searchInfo);
                param.systemSeq = systemSeq;
                param.searchType = searchType;
                DataService.httpPost("/activities/system/memory/getYarnDatas", param, function(result) {
                    if (result.result === 1 && result.data !== null) {
                        if (searchType == 'master') {
                            vm.chart.yarnMasterObj = {};
                            vm.chart.yarnMasterObj = createLineChartObj(result.data, 'MB');
                        } else if (searchType == 'slave') {
                            vm.chart.yarnSlaveObj = {};
                            vm.chart.yarnSlaveObj = createLineChartObj(result.data);
                        }
                    }
                });
            }

            // Presto Chart Datas
            function getPrestoDatas(searchType) {
                var param = angular.copy(vm.searchInfo);
                param.systemSeq = systemSeq;
                param.searchType = searchType;
                DataService.httpPost("/activities/system/memory/getPrestoDatas", param, function(result) {
                    if (result.result === 1 && result.data !== null) {
                        if (searchType == 'master') {
                            vm.chart.prestoMasterObj = {};
                            vm.chart.prestoMasterObj = createLineChartObj(result.data);
                        } else if (searchType == 'slave') {
                            vm.chart.prestoSlaveObj = {};
                            vm.chart.prestoSlaveObj = createLineChartObj(result.data);
                        }
                    }
                });

            }

            function chartZoomOut(chart_id) {
                zingchart.exec(chart_id, 'viewall');
            };

            function changeDateHandler(event) {
                vm.searchInfo.startDate = event.sDateTime;
                vm.searchInfo.endDate = event.eDateTime;
                ap($scope);
            }

            function reset() {
                vm.searchInfo = {};
                vm.data = {
                    systemMaster: [],
                    systemSlave: [],
                    yarnMaster: [],
                    yarnSlave: [],
                    prestoMaster: [],
                    prestoSlave: []
                };
                vm.chart = {
                    systemMasterObj: {},
                    systemSlaveObj: {},
                    yarnMasterObj: {},
                    yarnSlaveObj: {},
                    prestoMasterObj: {},
                    prestoSlaveObj: {}
                }

                ap($scope);
            }


            /* 라인차트 Object 생성 */
            function createLineChartObj(data, unit) {

                var scaleX = [];
                var series = [];
                var dUnit = unit ? unit : 'GB'

                if (data.total != null && data.used != null) {

                    var i = 0;
                    _.each(data, function(val, key) {
                        if (i == 0) {
                            scaleX = angular.copy(val.insertTimes);
                        }
                        var obj = {
                            "type": 'line',
                            "line-color": colorArr[i],
                            "text": key.toUpperCase(),
                            "guideLabel": {
                                "text": "%t : %v "+dUnit,
                                "color": "#fff",
                                "font-size": "10px",
                                "background-color": "#292626",
                                "border-color": colorArr[i]
                            },
                            values: val.values
                        };                       
                        series.push(obj);                      
                        i++;
                    });
                }

                var chartObj = {
                    type: 'mixed',
                    backgroundColor: 'transparent',
                    theme: 'dark',
                    title: {
                        text: 'chartInfo.title',
                        y: '10',
                        fontSize: '15',
                        fontColor: "#fff"
                    },
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
                        "max-items": 12,
                        values: scaleX
                    },

                    series: series
                }

                return chartObj;
            };

            function setSearchProcess() {
                $timeout(function() {
                    systemSeq = ConfigManager.getSystemSeq();
                    vm.sDateTime = moment().subtract(3, 'days').local().format('YYYY-MM-DD HH:mm');
                    //vm.sDateTime = '2019-05-03 11:02'
                    vm.eDateTime = moment().format('YYYY-MM-DD HH:mm');
                    vm.searchInfo.startDate = vm.sDateTime;
                    vm.searchInfo.endDate = vm.eDateTime;
                    search();
                },1000)
            }


            function onChangeSystemSeqEventHandler(event, data) {
                systemSeq = ConfigManager.getSystemSeq();

                reset();
                setSearchProcess();
            }

            function addEventListener() {
                unbind = [
                    $scope.$on('$destroy', destroy),
                    $scope.$on(ConfigManager.getEvent("CHANGE_SYSTEM_SEQ_EVENT"), onChangeSystemSeqEventHandler),
                    $scope.$on(ConfigManager.getEvent("GET_SYSTEM_MEMORY_HISTORY_EVENT"), onWebsocketDataReceiveEventHandler)
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