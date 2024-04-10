define(["app", "moment"], function(app, moment) {
    app.controller("YarnStatusCtrl", ["$rootScope", "$scope", "$controller", "$timeout", "DataService", "ConfigManager", "GridRenderer", "ngDialog", "CommonUtil",
        function($rootScope, $scope, $controller, $timeout, DataService, ConfigManager, GridRenderer, ngDialog, CommonUtil) {
            "use strict";

            // property
            let yarnStatusCtrl = this;
            let systemSeq = "";
            let center = { "text-align": "center" };
            let INTERVAL_TIME = 1000 * 60;
            let TIMER;
            let unbind = [];

            var colors = ["#ffc000", "#ff6600", "#00c853", "#29c5ff", "#2979ff", "#5d9cec"];

            $scope.sort_type = 'system_name'; // MASTER NODE grid sort filter
            $scope.master_sort_reverse = true; // MASTER NODE grid sort filter

            yarnStatusCtrl.appsRunning = 0;

            yarnStatusCtrl.showScheduler = true;
            yarnStatusCtrl.data = {};
            yarnStatusCtrl.data.masterNode = [];
            yarnStatusCtrl.chart = {};
            yarnStatusCtrl.pop = {};
            yarnStatusCtrl.columns = [
                { "headerName": "System Name", "field": "systemName", "cellStyle": center, "width": 185, "min-width": 185 },
                { "headerName": "Rack", "field": "rack", "cellStyle": center, "width": 100, "min-width": 100 },
                { "headerName": "Status", "field": "state", "cellStyle": center, "width": 100, "min-width": 100 },
                { "headerName": "Node ID", "field": "nodeId", "cellStyle": center, "width": 150, "min-width": 150 },
                { "headerName": "Address", "field": "nodeHttpAddress", "cellStyle": center, "width": 150, "min-width": 150 },
                { "headerName": "Health Update", "field": "lastHealthUpdate", "cellStyle": center, "width": 150, "min-width": 150, "cellRenderer": GridRenderer.numberFormatter },
                { "headerName": "Health Report", "field": "healthReport", "cellStyle": center, "width": 150, "min-width": 150, "cellRenderer": GridRenderer.tooltipRenderer },
                { "headerName": "Node Manager Version", "field": "nodemanagerVersion", "cellStyle": center, "width": 180, "min-width": 180 },
                { "headerName": "Containers", "field": "numContainers", "cellStyle": center, "width": 150, "min-width": 150, "cellRenderer": GridRenderer.numberFormatter },
                { "headerName": "Used Memory", "field": "usedMemory", "cellStyle": center, "width": 125, "min-width": 125, "cellRenderer": GridRenderer.numberFormatter },
                { "headerName": "Available Memory", "field": "availableMemory", "cellStyle": center, "width": 150, "min-width": 150, "cellRenderer": GridRenderer.numberFormatter }
            ];
            yarnStatusCtrl.columns_running = [
                { "headerName": "Job ID", "field": "job_id", "cellStyle": center, "width": 200, "min-width": 200, "cellRenderer": GridRenderer.tooltipRenderer },
                { "headerName": "Job Name", "field": "job_name", "cellStyle": center, "width": 300, "min-width": 300, "cellRenderer": GridRenderer.tooltipRenderer },
                { "headerName": "Application Type", "field": "application_type", "cellStyle": center, "width": 130, "min-width": 130 },
                { "headerName": "User Name", "field": "user_name", "cellStyle": center, "width": 120, "min-width": 120 },
                { "headerName": "Queue", "field": "queue", "cellStyle": center, "width": 130, "min-width": 130 },
                { "headerName": "Maps Total", "field": "maps_total", "cellStyle": center, "width": 120, "min-width": 120, "cellRenderer": GridRenderer.numberFormatter },
                { "headerName": "Reduces Total", "field": "reduces_total", "cellStyle": center, "width": 120, "min-width": 120, "cellRenderer": GridRenderer.numberFormatter }
            ];
            yarnStatusCtrl.columns_container = [
                { "headerName": "System Name", "field": "system_name", "cellStyle": center, "width": 185, "min-width": 185 },
                { "headerName": "ID", "field": "id", "cellStyle": center, "width": 150, "min-width": 150 },
                { "headerName": "State", "field": "state", "cellStyle": center, "width": 150, "min-width": 150 },
                { "headerName": "Rack", "field": "rack", "cellStyle": center, "width": 150, "min-width": 150 },
                { "headerName": "Node Address", "field": "node_http_address", "cellStyle": center, "width": 150, "min-width": 150 },
                { "headerName": "Containers", "field": "num_containers", "cellStyle": center, "width": 130, "min-width": 130, "cellRenderer": GridRenderer.numberFormatter }
            ];
            yarnStatusCtrl.columns_core = [
                { "headerName": "System Name", "field": "system_name", "cellStyle": center, "width": 185, "min-width": 185 },
                { "headerName": "ID", "field": "id", "cellStyle": center, "width": 150, "min-width": 150 },
                { "headerName": "State", "field": "state", "cellStyle": center, "width": 150, "min-width": 150 },
                { "headerName": "Rack", "field": "rack", "cellStyle": center, "width": 150, "min-width": 150 },
                { "headerName": "Node Address", "field": "node_http_address", "cellStyle": center, "width": 150, "min-width": 150 },
                { "headerName": "Core Usage(%)", "field": "usage_virtual_cores", "cellStyle": center, "width": 130, "min-width": 130 },
                { "headerName": "Core Used", "field": "used_virtual_cores", "cellStyle": center, "width": 130, "min-width": 130 }
            ];
            yarnStatusCtrl.columns_memory = [
                { "headerName": "System Name", "field": "system_name", "cellStyle": center, "width": 185, "min-width": 185 },
                { "headerName": "ID", "field": "id", "cellStyle": center, "width": 150, "min-width": 150 },
                { "headerName": "State", "field": "state", "cellStyle": center, "width": 150, "min-width": 150 },
                { "headerName": "Rack", "field": "rack", "cellStyle": center, "width": 150, "min-width": 150 },
                { "headerName": "Node Address", "field": "node_http_address", "cellStyle": center, "width": 150, "min-width": 150 },
                { "headerName": "Mem Usage(%)", "field": "usage_memory", "cellStyle": center, "width": 130, "min-width": 130 },
                { "headerName": "Mem Used(GB)", "field": "used_memory_gb", "cellStyle": center, "width": 130, "min-width": 130 }
            ];

            yarnStatusCtrl.units = {
                "memory": "%",
                "containerStatus": "Cnt",
                "vcore": "Cnt",
                "containerLaunch": "ms",
                "shuffle": "MB"
            };

            yarnStatusCtrl.rawdataColumns = {
                "memory": ['system_name', 'available', 'allocated', 'usage'],
                "containerStatus": ['system_name', 'used'],
                "vcore": ['system_name', 'used'],
                "containerLaunch": ['system_name', 'value'],
                "shuffle": ['system_name', 'value'],
                "runningApp": ['submit_time', 'start_time', 'job_id', 'job_name', 'application_type', 'user_name', 'queue', 'maps_total', 'reduces_total']
            };

            $scope.sortBy = function(sort_type, grid_type) {
                $scope.sort_type = sort_type;
                if (grid_type == 'master')
                    $scope.master_sort_reverse = !$scope.master_sort_reverse;
                else
                    $scope.volum_sort_reverse = !$scope.volum_sort_reverse;
            };

            yarnStatusCtrl.last = {};


            // method
            yarnStatusCtrl.chartZoomOut = function(id) {
                let temp = zingchart.exec(id, 'getseriesvalues', {});
                if (temp && temp.length > 0)
                    zingchart.exec(id, 'viewall');
            };

            yarnStatusCtrl.activeLostNodeHandler = function(type) {
                if (type == null || type == "")
                    return;

                if (type.toLowerCase() == 'dead') {

                    DataService.httpPost("/dashboard/metric/getDeadSystemInfo", { "systemSeq": systemSeq }, function(result) {
                        let data = result.data;
                        console.log(data);

                        openNodeDeadGridPopup(data, 520, 500);
                    });
                } else {
                    DataService.httpPost("/service/yarn/status/getYarn" + type + "Nodes", { "systemSeq": systemSeq }, function(result) {
                        let data = result.data;
                        openPopup(type, data);
                    });
                }

            };






            yarnStatusCtrl.getRawData = function(type) {
                if (type == null || type == "")
                    return;

                let chartData = [];
                let data = zingchart.exec(type, 'getdata');
                let title = data.graphset[0].title.text;
                if (yarnStatusCtrl.last == null || yarnStatusCtrl.last[type] == null || Object.keys(yarnStatusCtrl.last).length < 1)
                    chartData = [];
                else
                    chartData = yarnStatusCtrl.last[type].raw;

                openRawDataPopup(type, title, chartData);
            };


            yarnStatusCtrl.showTopStatus = function(_type) {
                let url = '';
                let param = getParam();
                let type = _type;
                if (type == 'running') url = '/service/yarn/status/getRunningAppInfo';
                else if (type == 'container') url = '/service/yarn/status/getRunningContainerInfo';
                else if (type == 'core') url = '/service/yarn/status/getCoreUsageInfo';
                else if (type == 'mem') url = '/service/yarn/status/getMemoryUsageInfo';

                DataService.httpPost(url, param, function(result) {
                    if (result == null || result.data == null)
                        return;

                    openPopup(type, result.data);

                }, false);
            };


            // event-handler
            function destory() {
                unbind.forEach(function(fn) {
                    fn();
                    ngDialog.closeAll();
                    clear();
                });
            }

            function onChangeSystemGroupIdEventHandler(event, data) {
                if (data == null)
                    return;

                systemSeq = ConfigManager.getSystemSeq();
                getData();
            }


            // function
            function getColumnsBylist(type) {
                if (type == null || type == "")
                    return;

                let columns = [];
                let keys = yarnStatusCtrl.rawdataColumns[type];
                let len = keys.length;

                for (let i = 0; i < len; i++) {
                    let c = {};
                    c.headerName = getCamelCase(keys[i]);
                    c.field = keys[i];
                    c.cellStyle = center;
                    if(keys[i] === 'system_name') {
                        c.width = 185;
                    }else {
                        c.width = 140;
                    }
                    

                    if (keys[i].toUpperCase().indexOf("SYSTEM_NAME") < 0)
                        c.cellRenderer = GridRenderer.unitRenderer;
                    columns.push(c);
                }
                return columns;
            }

            function getCamelCase(str) {
                if (str == null || str == "")
                    return null;

                let words = str.split(/\_|\s/gi);
                for (let i = 0; i < words.length; i++) {
                    words[i] = words[i].charAt(0).toUpperCase() + words[i].substr(1, words[i].length);
                }
                return words.join(" ");
            }

            function openRawDataPopup(type, title, list) {
                if (list == null) {
                    alert("There is no raw data.");
                    return;
                }

                let columns = getColumnsBylist(type);
                if (columns == null || columns.length < 1)
                    return;

                let popup = ngDialog.open({
                    template: "/common/popup/rawdata_grid_popup_template.html",
                    className: "ngdialog-theme-default custom-width",
                    showClose: false,
                    disableAnimation: true,
                    cache: false,
                    closeByDocument: false,
                    closeByEscape: false,
                    scope: $scope,
                    controller: $controller("RawDataGridPopCtrl", {
                        $scope: $scope,
                        columns: columns,
                        title: title,
                        data: list,
                        width: columns.length * 150+45,
                        height: 400
                    })
                });

                let closer = $rootScope.$on('ngDialog.refresh', function(e, id) {
                    if (id != popup.id) return;
                    closer();
                });
            }

            function openPopup(type, data) {
                let width;
                if (type.toLowerCase() == 'active' || type.toLowerCase() == 'lost') {
                    yarnStatusCtrl.pop.title = type + '  Nodes Information';
                    yarnStatusCtrl.pop.gridColumns = yarnStatusCtrl.columns;
                    width = 1000;

                } else if (type.toLowerCase() == 'running') {
                    yarnStatusCtrl.pop.title = 'Running Application';
                    yarnStatusCtrl.pop.gridColumns = yarnStatusCtrl.columns_running;
                    width = 1000;
                } else if (type.toLowerCase() == 'container') {
                    yarnStatusCtrl.pop.title = 'Running Containers';
                    yarnStatusCtrl.pop.gridColumns = yarnStatusCtrl.columns_container;
                    width = 900;
                } else if (type.toLowerCase() == 'core') {
                    yarnStatusCtrl.pop.title = 'Core Usage';
                    yarnStatusCtrl.pop.gridColumns = yarnStatusCtrl.columns_core;
                    width = 1050;
                } else if (type.toLowerCase() == 'mem') {
                    yarnStatusCtrl.pop.title = 'Memory Usage';
                    yarnStatusCtrl.pop.gridColumns = yarnStatusCtrl.columns_memory;
                    width = 1050;
                }
                yarnStatusCtrl.pop.halfwidth = width / 2;
                yarnStatusCtrl.pop.width = width + 'px';


                yarnStatusCtrl.pop.gridData = data;

                let popup = ngDialog.open({
                    template: "/service/yarn/popup/grid_popup_template.html",
                    className: "ngdialog-theme-default custom-width",
                    showClose: false,
                    disableAnimation: true,
                    cache: false,
                    closeByDocument: false,
                    closeByEscape: false,
                    scope: $scope
                });

                let closer = $rootScope.$on('ngDialog.refresh', function(e, id) {
                    if (id != popup.id) return;
                    closer();
                });
            }


            function openNodeDeadGridPopup(list, width, height) {

                let column = [{
                        "headerName": "System Name",
                        "field": "system_name",
                        "cellStyle": center,
                        width: 185,
                        "min-width": 185
                    },
                    {
                        "headerName": "System IP",
                        "field": "system_ip",
                        "cellStyle": center,
                        width: 150,
                        "min-width": 150
                    },
                    {
                        "headerName": "Status",
                        "field": "process_status",
                        "cellStyle": center,
                        width: 150,
                        "min-width": 150
                    }
                ];
                let title = 'Dead Nodes Information';


                let popup = ngDialog.open({
                    template: "/common/popup/rawdata_grid_popup_template.html",
                    className: "ngdialog-theme-default custom-width",
                    showClose: false,
                    disableAnimation: true,
                    cache: false,
                    closeByDocument: false,
                    closeByEscape: false,
                    scope: $scope,
                    controller: $controller("RawDataGridPopCtrl", {
                        $scope: $scope,
                        columns: column,
                        title: title,
                        data: list,
                        width: width,
                        height: height
                    })
                });

                let closer = $rootScope.$on('ngDialog.refresh', function(e, id) {
                    if (id != popup.id) return;
                    closer();
                });
            }

            function getYarnStatusResult(result) {

                let data = result.data;
                if (data == null)
                    return;

                if (data.topStatus == null) {
                    initData();
                    return;
                }

                // top summary
                yarnStatusCtrl.data.topStatus = data.topStatus;
                //yarnStatusCtrl.data.topStatus.memoryUsed = CommonUtil.formatBytes(data.topStatus.memoryUsed *1024 * 1024, 2, 'GB');
                //yarnStatusCtrl.data.topStatus.memoryTotal = CommonUtil.formatBytes(data.topStatus.memoryTotal *1024 * 1024, 2, 'GB');

                // masterNode
                yarnStatusCtrl.data.masterNode = data.masterNode;

                // scheduler
                yarnStatusCtrl.data.scheduler = data.scheduler;
                if(yarnStatusCtrl.data.scheduler !== null) {
                    yarnStatusCtrl.appsRunning = yarnStatusCtrl.data.scheduler.reduce((s,f) => {
                        return s + f.numActiveApps
                    },0);
                }
                
                makeSchedulerChartData();
                // $('#memory-img').css('z-index', 99);
                // $('.zc-img').css('position', 'absolute');
            }


            function getActiveResourceMgrResult(result) {
                let data = result.data;
                if (data == null) return;

                yarnStatusCtrl.data.nodeInfo = data;
            }

            function initData() {
                yarnStatusCtrl.data.topStatus = {};
                yarnStatusCtrl.data.masterNode = [];
                yarnStatusCtrl.data.scheduler = [];
                yarnStatusCtrl.data.schedulerChartData = [];
            }

            function getYarnStatusChartResult(result) {
                let data = result.data;
                if (data == null)
                    return;

                yarnStatusCtrl.last = {};

                // tooltip 초기화
                angular.element(".zc-tooltip").hide();

                // chart
                getScatterChartOption("memory", data.memory, "Memory Usage", true, colors[0]);
                getScatterChartOption("containerStatus", data.container, "Container Used", true, colors[1]);
                getScatterChartOption("vcore", data.vcore, "vCore Used", true, colors[2]);
                getScatterChartOption("containerLaunch", data.containerLaunch, "Container launch time", true, colors[3]);
                getScatterChartOption("shuffle", data.shuffle, "Shuffle Bytes", true, colors[4]);

                ap($scope);
            }

            function makeSchedulerChartData() {
                yarnStatusCtrl.data.schedulerChartData = [];
                if (!yarnStatusCtrl.data.scheduler) return;

                let m = [];
                let v = [];
                let x = [];
                let l = yarnStatusCtrl.data.scheduler.length;
                for (let i = 0; i < l; i++) {
                    let o = yarnStatusCtrl.data.scheduler[i];
                    m.push(o.memoryUsage);
                    v.push(o.vcoreUsage);
                    x.push(o.queueName);
                }
                let mem = {};
                mem.values = m;
                mem.text = "Memory";
                let vcores = {};
                vcores.values = v;
                vcores.text = "vCores";

                let result = [];
                result.push(mem);
                result.push(vcores);

                let maxValue = 100;
                for (let i = 0, j = m.length; i < j; i++) {
                    if (m[i] >= maxValue) {
                        maxValue = m[i];
                    }
                }
                for (let i = 0, j = v.length; i < j; i++) {
                    if (v[i] >= maxValue) {
                        maxValue = v[i];
                    }
                }

                yarnStatusCtrl.data.schedulerChartData = result;
                yarnStatusCtrl.chart.chartOptions = {
                    "scale-x": {
                        "labels": x,
                        "item": {
                            "font-color": "#fff"
                        },
                        "min-items": l + 1,
                        "max-items": l + 1
                    },
                    "scale-y": {
                        "item": {
                            "font-color": "#fff"
                        },
                        "max-value": maxValue
                    },
                    "legend":{
                      align: 'right',
                      verticalAlign: 'top',
                      backgroundColor:'none',
                      borderWidth: 0,
                      item:{
                        fontColor:'#E3E3E5',
                        cursor: 'hand'
                      }
                    },
                    "plotarea": {
                        "border": "none",
                        "adjust-layout": false,
                        "margin-top": "35px",
                        "margin-left": "dynamic",
                        "margin-right": "30px",
                        'margin-bottom': '25'
                    },
                    "tooltip": {
                        "text": "%kl<br/>%t: <strong>%v</strong>%",
                        "shadow": false,
                        "background-color": "#3e3e3e",
                        "border-width": "1px",
                        "border-color": "#fffeee",
                        "border-radius": 3,
                        "color": "#fff",                        
                        "callout": true,
                        "callout-height": "5px",
                        "placement": "node:top",
                        "rules": [{
                            "rule": "%plot-index == 0",
                            "border-color": "#ffea00"
                        }, {
                            "rule": "%plot-index == 1",
                            "border-color": "#00c853"
                        }],
                    },
                }
            }

            function getScatterChartOption(key, data, title, systemFlag, color) {
                yarnStatusCtrl.chart[key] = {};

                let tooltip = "System Name : %data-system \n %data-series1 : %v \n %data-series2 : %kl";
                if (systemFlag) {
                    tooltip = "System Name : %kl \n %data-series2 : %v";
                }

                let scaleX = [];
                let seriesData = [];

                yarnStatusCtrl.chart[key].source = seriesData;

                if (data != null) {
                    // 초기화
                    yarnStatusCtrl.last[key] = data;

                    scaleX = data.x;

                    seriesData.push({
                        "values": data.y,
                        "data-system": data.x,
                        "data-series1": data.xlabel,
                        "data-series2": data.ylabel,
                    });
                }

                let option = {
                    type: 'scatter',
                    "backgroundColor": "transparent",
                    "title": {
                        "text": title,
                        "font-size": 15,
                        "font-color": "#fff",
                        "padding-top": 0,
                        "text-align": "center"
                    },
                    "scale-x": {
                        "values": scaleX,
                        "item": {
                            "font-color": "#fff",
                            "font-size": "10px"
                        }
                    },
                    "scale-y": {
                        "item": {
                            "font-color": "#fff"
                        },
                        step: 10
                    },
                    "plotarea": {
                        "margin-top": "60px",
                        "margin-left": "dynamic",
                        "margin-right": "30px",
                        "margin-bottom": "23px"
                    },
                    "plot": {
                        mode: "fast",
                        exact: true,
                        marker: {
                            type: "circle",
                            borderWidth: 0,
                            size: 3,
                            shadow: false,
                            backgroundColor: color
                        },
                        tooltip: {
                            padding: "10 10 10 10",
                            borderWidth: 1,
                            backgroundColor: "#fff",
                            fontSize: 12,
                            fontColor: "#333",
                            textAlign: "left",
                            borderColor: "%background-color",
                            thousandsSeparator: ",",
                            text: tooltip
                        }
                    },
                    "series": seriesData
                };

                yarnStatusCtrl.chart[key].option = option;
                // if (!data)
                // 	yarnStatusCtrl.chart[key].option = null;
            }

            function setScatterChartSeries(key, data) {


                // 초기화
                yarnStatusCtrl.last[key] = data;
                yarnStatusCtrl.chart[key].series = [];
                if (key == null || data == null)
                    return;

                let s = {
                    "values": data.y,
                    "data-system": data.x,
                    "data-series1": data.xlabel,
                    "data-series2": data.ylabel,
                };

                yarnStatusCtrl.chart[key].option['scale-x'].values = data.x;
                yarnStatusCtrl.chart[key].option.series = [s];
            }

            function getParam() {
                let p = {};
                p.systemSeq = systemSeq;
                p.partition = "P" + moment().format('YYYYMMDD');                

                return p;
            }

            function getData() {
                // 좌측 데이터 조회, Chart data 조회
                let param = getParam();
                DataService.httpPost("/service/yarn/status/getRootQueueInfo", param, function(result) {
                    if (result.result === 1 && result.data !== null) {
                        yarnStatusCtrl.queueInfo = result.data;
                    }
                }); 
                DataService.httpPost("/service/yarn/status/getStatusData", param, getYarnStatusResult, false);
                DataService.httpPost("/service/yarn/status/getStatusChartData", param, getYarnStatusChartResult, false);
                              

                // Get Recourece manager node data

                let req = {
                    system_parent_seq: systemSeq
                }
                DataService.httpPost("/dashboard/metric/getActiveResourceMgrData", req, getActiveResourceMgrResult, false);
            }

            function addEventListener() {
                unbind = [
                    $scope.$on(ConfigManager.getEvent("CHANGE_SYSTEM_SEQ_EVENT"), onChangeSystemGroupIdEventHandler),
                    $scope.$on('$destroy', destory)
                ];
            }

            function createTimer() {
                TIMER = setInterval(getData, INTERVAL_TIME);
            }

            // Resource Manager Node Active 마우스 오버시 툴팁
            yarnStatusCtrl.getResourceNodeInfo = function(type) {
                if (yarnStatusCtrl.data.nodeActiveCount !== 0) {
                    $.powerTip.show($('#resourceActiveNode'));
                }
            };

            function initialize() {
                systemSeq = ConfigManager.getSystemSeq();
                addEventListener();

                // Chart option setting
                // getScatterChartOption("memory", "Memory Usage", true, colors[0]);
                // getScatterChartOption("containerStatus", "Container Used", true, colors[1]);
                // getScatterChartOption("vcore", "vCore Used", true, colors[2]);
                // getScatterChartOption("containerLaunch", "Container launch time", true, colors[3]);
                // getScatterChartOption("shuffle", "Shuffle Bytes", true, colors[4]);

                getData();
                createTimer();

                $('header h1 button').on('click', function() {
                    if ($('header').width() > 100) {
                        if ($('#resizableSpan').text().length >= 16) {
                            $('#resizableDL').addClass('resizableDL-slim');
                        } else {
                            $('#resizableDL').removeClass('resizableDL-slim');
                        }
                    } else {
                        $('#resizableDL').addClass('resizableDL-slim');
                    }
                });
                $('#resizableSpan').on('DOMSubtreeModified', function() {
                    if ($('header').width() < 100) {
                        if ($('#resizableSpan').text().length >= 16) {
                            $('#resizableDL').addClass('resizableDL-slim');
                        } else {
                            $('#resizableDL').removeClass('resizableDL-slim');
                        }
                    } else {
                        $('#resizableDL').addClass('resizableDL-slim');
                    }
                });

                // let timer = $timeout(function(){
                // 	$('.ag-body-container').attr('style', 'width : 100% !important');
                // 	$timeout.cancel(timer);
                // }, 500);
            }

            function clear() {
                delete yarnStatusCtrl.data;
                delete yarnStatusCtrl.pop;
                delete yarnStatusCtrl.columns;
                delete yarnStatusCtrl.chart;
                delete yarnStatusCtrl.showScheduler;

                clearInterval(TIMER);

                systemSeq = null;
                center = null;
                INTERVAL_TIME = null;
                TIMER = null;
                unbind = null;
            }

            initialize();
        }
    ]);
});