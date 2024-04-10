define(["app", "moment"], function(app, moment) {
    app.controller("YarnQueCtrl", ["$rootScope", "$scope", "$interval", "$timeout", "$filter", "$http", "$q", "DataService", "WebSocketService", "ConfigManager", "GridRenderer", "ngDialog", 'CommonUtil',
        function($rootScope, $scope, $interval, $timeout, $filter, $http, $q, DataService, WebSocketService, ConfigManager, GridRenderer, ngDialog, CommonUtil) {
            "use strict";

            let vm = this;
            let unbind = [];
            let colorArr = ['#e76049','#00c823','#d500f9','#ffea00','#11c5ff','#ffc000','#ff6600','#2979ff','#ff3d00','#5d9cec'];
            let systemSeq = ConfigManager.getSystemSeq();


            // Schedule Type
            function getSchedulerType() { 
                var defferd = $q.defer();
                DataService.httpGet("/service/yarn/que/getSchedulerType?systemSeq="+vm.searchInfo.systemSeq, {},  function(result){
                    if (result.result === 1 && result.data !== null)  {                        
                        defferd.resolve(result.data); 
                    } else {
                        defferd.reject();
                    } 
                });
                return defferd.promise;
            }

            // getRegend Infos
            function getLegendItems(data) {
                var result = [];
                var i=0;
                _.each(data, function(val, key) {
                    var item = {
                        name: key.replace('root.',''),
                        color: colorArr[i],
                        visible:true,
                    }
                    result.push(item);
                    i++;
                })
                return result;
            }

            // root Que Chart Datas
            function getYarnQueRootChartDatas() { 
                // DataService.httpPost("/service/yarn/que/getYarnQueRootChartDatas", vm.searchInfo,  function(result){
                //     if (result.result === 1 && result.data !== null)  {
                //         vm.chart.totalResourceChartRegendItems = getLegendItems(result.data.totalResource);
                //         vm.chart.totalResourceChartObj = createLineChartObj(result.data.totalResource, '%');
                //
                //         vm.chart.totalApplicationRegendItems = getLegendItems(result.data.totalApplication);
                //         vm.chart.totalApplicationChartObj = createLineChartObj(result.data.totalApplication);
                //     }
                // });
            }

            // Que Chart Datas
            function getYarnQueChartDatas() { 
                DataService.httpPost("/service/yarn/que/getYarnQueChartDatas", vm.searchInfo,  function(result){
                    if (result.result === 1 && result.data !== null)  {
                        vm.chart.activeAppChartRegendItems = getLegendItems(result.data.numActiveApps);
                        vm.chart.activeAppChartObj = createLineChartObj(result.data.numActiveApps);

                        vm.chart.pendingAppChartRegendItems = getLegendItems(result.data.numPendingApps);
                        vm.chart.pendingAppChartObj = createLineChartObj(result.data.numPendingApps);

                        vm.chart.memoryUsageChartRegendItems = getLegendItems(result.data.memoryUsage);
                        vm.chart.memoryUsageChartObj = createLineChartObj(result.data.memoryUsage, '%');

                        vm.chart.vCoreUsageChartRegendItems = getLegendItems(result.data.vCoreUsage);
                        vm.chart.vCoreUsageChartObj = createLineChartObj(result.data.vCoreUsage, '%');

                        vm.chart.numContainersChartRegendItems = getLegendItems(result.data.numContainers);
                        vm.chart.numContainersChartObj = createLineChartObj(result.data.numContainers);
                    }  
                });
            }

            function search() {
                if (!CommonUtil.validateStartEndDate(vm.sDateTime, vm.eDateTime, 7))
                    return; 
                getYarnQueRootChartDatas();
                getYarnQueChartDatas();               
            }
           
            function chartZoomOut(chart_id) {
                zingchart.exec(chart_id, 'viewall');
            };

            function clickLegend(chart_id, item) {
                $('#customTooltipLayer').remove();

                let plotindex = -1;
                let d = zingchart.exec(chart_id, 'getseriesdata');
                if (d == null || d.length < 1)
                    return;

                for(let i = 0 ; i < d.length ; i++) {
                    let series = d[i];
                    if (item.name == series.text) {
                        plotindex = series.palette;
                    }
                }

                let action = 'hideplot';
                if (item.visible) action = 'hideplot';
                else action = 'showplot';
                zingchart.exec(chart_id, action, {
                    'plotindex':plotindex,
                    'toggle-action': 'remove' //toggleAction (CamelCase not supported here), only css style
                });

                item.visible = !item.visible;
            }

            function changeDateHandler(event) {
                vm.searchInfo.startDate = event.sDateTime;
                vm.searchInfo.endDate = event.eDateTime;
                ap($scope);
            }


            function initData() {
                vm.searchInfo = {
                    systemSeq: systemSeq,
                    schedulerType: '',
                    startDate: null,
                    endDate: null
                };                
                vm.chart = {
                    totalResourceChartObj: {},
                    totalApplicationChartObj: {},
                    activeAppChartObj: {},
                    pendingAppChartObj: {},
                    memoryUsageChartObj: {},
                    vCoreUsageChartObj: {},
                    numContainersChartObj: {}
                }
                ap($scope);
            }

            
            function setSearchProcess() {
                $timeout(function() {
                    systemSeq = ConfigManager.getSystemSeq();
                    vm.sDateTime = moment().subtract(1, 'days').local().format('YYYY-MM-DD HH:mm');     
                    vm.eDateTime = moment().format('YYYY-MM-DD HH:mm');    
                    // vm.sDateTime = "2019-06-11 04:55";
                    // vm.eDateTime = "2019-06-11 10:55";          
                    vm.searchInfo.startDate = vm.sDateTime;
                    vm.searchInfo.endDate = vm.eDateTime;      
                    getSchedulerType().then(function(result){
                        vm.searchInfo.schedulerType = result;
                        getYarnQueRootChartDatas();
                        getYarnQueChartDatas();
                    });                                 
                },200)
                 
            }


            function onChangeSystemSeqEventHandler(event, data) {
                systemSeq = ConfigManager.getSystemSeq();

                initData();
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

            /* 라인차트 Object 생성 */
            function createLineChartObj(data, unit) {

                var scaleX = [];
                var series = [];
                var dUnit = unit ? unit : ''
                
                var i = 0;
                _.each(data, function(val, key) {
                    var values = val.insertTimes.map((item,k) => [item, val.values[k]]);
                    var obj = {
                        "type": 'line',
                        "line-color": colorArr[i],
                        "text": key.replace('root.',''),
                        "guideLabel": {
                            "text": "%t : %v "+dUnit,
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

                var chartObj = {
                    type: 'line',
                    backgroundColor: 'transparent',
                    theme: 'dark',
                    title: {
                        text: 'chartInfo.title',
                        y: '10',
                        fontSize: '15',
                        fontColor: "#fff"
                    },
                    // legend:{
                    //     align: 'center',
                    //     verticalAlign: 'top',
                    //     backgroundColor:'none',
                    //     borderWidth: 0,
                    //     item:{
                    //         fontColor:'#4e4949',
                    //         cursor: 'hand'
                    //     },
                    //     marker:{
                    //         type:'square',
                    //         borderWidth: 0,
                    //         cursor: 'hand'
                    //     }
                    // },
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
                        "transform": {
                            type: "date",
                            all: "%H:%i"
                        },
                        "max-items": 10,
                        values: scaleX
                    },

                    series: series
                }

                return chartObj;
            };


            function initialize() {
                initData();
                vm.changeDateHandler = changeDateHandler;
                vm.search = search;
                vm.chartZoomOut = chartZoomOut;
                vm.clickLegend = clickLegend;

                addEventListener();

                setSearchProcess();

            }

            initialize();
        }
    ]);

});