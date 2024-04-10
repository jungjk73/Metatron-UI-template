define(["app", "moment"], function(app, moment) {
    app.controller("KafkaStatusNewCtrl", ["$rootScope", "$scope", "$interval", "$timeout", "$filter", "DataService", "ConfigManager", "GridRenderer", "ngDialog", 'CommonUtil', 'KafkaChartRenderer', 'WebSocketService',
        function($rootScope, $scope, $interval, $timeout, $filter, DataService, ConfigManager, GridRenderer, ngDialog, CommonUtil, KafkaChartRenderer, WebSocketService) {
            "use strict";

            let vm = this;     

            let INTERVAL_TIME = 30 * 1000;
            let __interval;

            let SOCKET_TIMER;
            let SOCKET_INTERVAL_TIME = 30 * 1000;

            let unbind = [];
            var loader = true;

            let tooltipTimer;
            let colorArr = ['#00c853','#e76049','#29c5ff','#ffea00','#ff3d00','#ffc000','#ff6600','#2979ff','#d500f9','#5d9cec','#888','#575757',
                            '#e817cd','#e4b4ac','#074b65','#5a5406','#73230a','#efe2bb','#5a2a09','#0a3275','#710d82','#838e9c','#27dc1d','#e8e417'];
            

            // Topic 데이타 요청
            function getTopicList() {               
                DataService.httpGet("/service/kafka/new/getTopicList?systemSeq=" + vm.searchInfo.systemSeq, {}, function(result) {
                    if (result.result === 1 && result.data !== null) {
                        vm.dataDetail.topicList = result.data;
                    }
                });
            }

            // Host 데이타 요청
            function getHostList() {               
                DataService.httpGet("/service/kafka/new/getHostList?systemSeq=" + vm.searchInfo.systemSeq, {}, function(result) {
                    if (result.result === 1 && result.data !== null) {
                        vm.dataDetail.hostList = result.data;
                    }
                });
            }

            // 상단 summery info 
            function getSummaryInfo() {
                DataService.httpPost("/service/kafka/new/getSummaryInfo", vm.searchInfo, function(result) {
                    if (result.result === 1 && result.data !== null) {
                        vm.dataDetail.summaryInfo = result.data;
                    }
                });
            }

            // Current Offsets chart datas
            function getCurrentOffsetChart() {
                DataService.httpPost("/service/kafka/new/getCurrentOffsetChart", vm.searchInfo, function(result) {
                    if (result.result === 1 && result.data !== null) {
                        vm.currentOffsetChartObj = KafkaChartRenderer.createLineChartObj('kafka.currentOffsetChart', result.data);
                        $('#currentOffsetChart-img').css('z-index', 99);
                    }
                });
            }            

            // // Message Purge History chart datas
            function getOldestOffsetChart() {
                DataService.httpPost("/service/kafka/new/getOldestOffsetChart", vm.searchInfo, function(result) {
                    if (result.result === 1 && result.data !== null) {                                               
                        vm.oldestOffsetChartObj = KafkaChartRenderer.createLineChartObj('kafka.oldestOffsetChart', result.data);
                    }
                });
            }            
            
            // // Mirroring Log  chart datas
            function getMirroringLogChart() {
                DataService.httpPost("/service/kafka/new/getMirroringLogChart", vm.searchInfo, function(result) {
                    if (result.result === 1 && result.data !== null) {                        
                        vm.mirroringLogChartObj = KafkaChartRenderer.createLineChartObj('kafka.mirroringLogChart', result.data);
                    }
                });

            }

            // // Message Purge History chart datas
            function getConsumerGroupOffsetChart() {
                DataService.httpPost("/service/kafka/new/getConsumerGroupOffsetChart", vm.searchInfo, function(result) {
                    if (result.result === 1 && result.data !== null) {                        
                        vm.consumerGroupsOffsetChartObj = KafkaChartRenderer.createLineChartObj('kafka.consumerGroupsOffsetChart', result.data);
                    }
                });

            }

            // Mirroring Log & Message Purge History
            function getPartitionLeaderOffsetChart() {
                DataService.httpPost("/service/kafka/new/getPartitionLeaderOffsetChart", vm.searchInfo, function(result) {
                    if (result.result === 1 && result.data !== null) {
                        vm.partitionPerLeaderChartObj = KafkaChartRenderer.createLineChartObj('kafka.partitionPerLeaderChart', result.data);
                        vm.partitionPerOffsetChartObj = KafkaChartRenderer.createLineChartObj('kafka.partitionPerOffsetChart', result.data);                       
                        //$('.zc-img').css('position', 'inherit');
                    }
                });
            }

            // Number of topics and Partitions
            function getNumberOfTopicsPartitionsChart() {
                DataService.httpPost("/service/kafka/new/getNumberOfTopicsPartitionsChart", vm.searchInfo, function(result) {
                    if (result.result === 1 && result.data !== null) {
                        vm.numberOfTopicsPartitionsChartObj = KafkaChartRenderer.createLineChartObj('kafka.numberOfTopicsPartitionsChart', result.data);
                    }
                });
            }

            // Socket Data get
            function getSocketData() {
                var s_param = {
                    "function": "getKafkaTopicNetworkInfo",
                    "resultEvent": "GET_KAFKA_SERVICE_EVENT",
                    "systemSeq": vm.searchInfo.systemSeq
                };
                WebSocketService.callRequest(s_param);
            }

           

            function onWebsocketDataReceiveEventHandler(event, data){
                if (data.hasOwnProperty("exceptionMassage") || !data.hasOwnProperty("searchResults")) {                   

                    vm.dataDetail.socketDataInfo = {
                        RECV_CURR: 0,
                        //RECV_AVG: 0,
                        RECV_DAY_CURR: 0,
                        //RECV_DAY_AVG: 0,
                        TRAN_CURR: 0,
                        //TRAN_AVG: 0,
                        TRAN_DAY_CURR: 0,
                        //TRAN_DAY_AVG: 0
                    }
                } else {                    
                    vm.dataDetail.socketDataInfo = {
                        RECV_CURR: CommonUtil.formatBytes(data.searchResults.RECV_CURR, 2, 'MB', false),
                        //RECV_AVG: CommonUtil.formatBytes(data.searchResults.RECV_AVG, 2, 'MB', false),
                        RECV_DAY_CURR: CommonUtil.formatBytes(data.searchResults.RECV_DAY_CURR, 2, 'MB', false),
                        //RECV_DAY_AVG: CommonUtil.formatBytes(data.searchResults.RECV_DAY_AVG, 2, 'MB', false),
                        TRAN_CURR: CommonUtil.formatBytes(data.searchResults.TRAN_CURR, 2, 'MB', false),
                        //TRAN_AVG: CommonUtil.formatBytes(data.searchResults.TRAN_AVG, 2, 'MB', false),
                        TRAN_DAY_CURR: CommonUtil.formatBytes(data.searchResults.TRAN_DAY_CURR, 2, 'MB', false),
                        //TRAN_DAY_AVG: CommonUtil.formatBytes(data.searchResults.TRAN_DAY_AVG, 2, 'MB', false)
                    }
                }

            }


            // Kafka 모든 데이타 정보 가져오기
            function searchDatas() {               

                if(vm.searchInfo.systemSeq !== '' && vm.searchInfo.topic !== '') {
                    getSummaryInfo();     
                    // getCurrentOldestOffsetChart();    
                    getCurrentOffsetChart();
                    getOldestOffsetChart();
                    // getConsumerMirroringOffsetChart();
                    getMirroringLogChart();
                    getConsumerGroupOffsetChart();
                    getPartitionLeaderOffsetChart();
                    getNumberOfTopicsPartitionsChart();
                    getHostList();

                }
                
            }


            function clickSearchHandler() {
                if (!CommonUtil.validateStartEndDate(vm.sDateTime, vm.eDateTime))
                    return;

                vm.processInterval = true;
                $interval.cancel(__interval);
                searchDatas();
            }

            
            // 날짜 조건 변경
            function changeDateHandler(event) {
                vm.searchInfo.startDate = event.sDateTime;
                vm.searchInfo.endDate = event.eDateTime;

                //vm.processInterval = true;
                $interval.cancel(__interval);
                ap($scope);
            };

            // Topic 변경
            function changeTopicHandler(event) {
                if (vm.searchInfo.topic !== event.topic) {
                    vm.searchInfo.topic = event.topic;
                    searchDatas();
                }
            }



            function onChangeSystemSeqEventHandler(event, data) {
                vm.searchInfo.systemSeq = ConfigManager.getSystemSeq();

                reset();
                getTopicList();
                searchDatas();
                getSocketData();
            }


            function addEventListener() {
                unbind = [
                    $scope.$on('$destroy', destroy),
                    $scope.$on(ConfigManager.getEvent("CHANGE_SYSTEM_SEQ_EVENT"), onChangeSystemSeqEventHandler),
                    $scope.$on(ConfigManager.getEvent("GET_KAFKA_SERVICE_EVENT"), onWebsocketDataReceiveEventHandler)
                ];
            }


            function createTimer() {               
                SOCKET_TIMER = $interval(getSocketData, SOCKET_INTERVAL_TIME);
            }


            function intervalSearch() {
                $interval.cancel(__interval);

                searchDatas();

                __interval = $interval(function() {
                    setSearchDate();
                    searchDatas();
                }, INTERVAL_TIME);

            }

            function intervalHoldHandler() {
                vm.processInterval = !vm.processInterval;

                console.log('vm.processInterval : ' + vm.processInterval)

                if (vm.processInterval == false) { // 재시작
                    setSearchDate();
                    intervalSearch();
                } else { // 중지
                    $interval.cancel(__interval);
                }
            }

            function destroy() {

                $interval.cancel(__interval);

                unbind.forEach(function(fn) {
                    fn();
                });

                //reset();
                $interval.cancel(__interval);
                __interval = null;


                SOCKET_TIMER = null;
                SOCKET_INTERVAL_TIME = null;

            }


            function setSearchDate() {
                vm.sDateTime = moment().subtract(6, 'hours').local().format('YYYY-MM-DD HH:mm');
                vm.eDateTime = moment().format('YYYY-MM-DD HH:mm');

                // vm.sDateTime = '2018-11-19 04:53';
                // vm.eDateTime = '2018-11-19 10:53';

                vm.searchInfo.startDate = vm.sDateTime;
                vm.searchInfo.endDate = vm.eDateTime;
            }

            function tapExpand(t) {               
                var target = $(event.currentTarget);
                var target_i = target.find("i");
                
                if(target_i.hasClass('down')) {

                    vm.processInterval = true;
                    $interval.cancel(__interval);
                    
                    target_i.removeClass('down');
                    target_i.addClass('up');
                    $('#'+t).css({
                        display: 'block'
                    });                   
                       
                }else if(target_i.hasClass('up')) {
                    target_i.removeClass('up');
                    target_i.addClass('down');
                    $('#'+t).css({
                        display: 'none'
                    });
                }
            }

            
            // 차트에 마우스 올렸을때 처리
            // 툴팁 만들어서 보여준다
            function chartMousemoveEventHandler(data) {
                $('#kafkaTooltipLayer').remove();
                $timeout.cancel(tooltipTimer);
                tooltipTimer = $timeout(function () {
                    $('#kafkaTooltipLayer').remove();

                    let chartId = data.id;
                    let items = data.items;
                    let trHTMLArr = '';

                   // let totalVal = 0;
                    for (let i = 0; i < items.length; i++) {
                        let textArr = items[i].text.split(':');
                        let trHTML = '<tr><th><div class="color-tag" style="background-color: '+colorArr[i]+'"></div> ' + textArr[0] + '</th><td>' + $filter('number')(textArr[1])+ '</td></tr>';
                        //totalVal = totalVal + Number(textArr[1]);
                        trHTMLArr = trHTMLArr + trHTML;
                    }
                  //  trHTMLArr = '<tr><th>Total</th><td>' + $filter('number')(totalVal) + '</td></tr>' + trHTMLArr;
                    let timeLabel = data['scale-label']['scale-x'];
                    timeLabel = timeLabel.replace('<br>', '');
                    let timeTr = '<tr><th colspan="2" style="text-align: center;">'+timeLabel+'</th></tr>';
                    trHTMLArr = timeTr + trHTMLArr;
                    let tableHTML = '<table>' + trHTMLArr + '</table>';

                    let left = data.ev.pageX-100;
                    if (left > data.width / 2) left = data.ev.pageX - 370;

                    let top = data.ev.pageY-(items.length*20+250);   
                    //let top = data.ev.pageY-250;                


                    let tooltip = $('<div id="kafkaTooltipLayer" class="width150" style="left:' + left + 'px; top:' + top + 'px;">' + tableHTML + '</div>');

                    $('#' + chartId).append(tooltip);
                }, 50);
            };

            vm.chartZoomOut = function (chart_id) {
                zingchart.exec(chart_id, 'viewall');
            };

           
            // 데이타 정보 리셋
            function reset() {

                vm.searchInfo = {
                    systemSeq: ConfigManager.getSystemSeq(),
                    //topic: 'tmap-rp-log'
                    topic: ''
                };
                
                // 데아타 정보
                vm.dataDetail = {
                    topicList: [],
                    hostList: [],
                    summaryInfo: {
                        partitionCount: 0,
                        replica: 0,
                        underReplica: 0,
                        keepingLogs: 0,
                        logsPerSecond: 0,
                        logsPerDay: 0
                    },
                    socketDataInfo: {
                        RECV_CURR: 0,
                        //RECV_AVG: 0,
                        RECV_DAY_CURR: 0,
                        //RECV_DAY_AVG: 0,
                        TRAN_CURR: 0,
                        //TRAN_AVG: 0,
                        TRAN_DAY_CURR: 0,
                        //TRAN_DAY_AVG: 0
                    }
                }

                vm.currentOffsetChartObj = {};
                vm.oldestOffsetChartObj = {};
                vm.mirroringLogChartObj = {};
                vm.consumerGroupsOffsetChartObj = {};
                vm.partitionPerLeaderChartObj = {};
                vm.partitionPerOffsetChartObj = {};
                vm.numberOfTopicsPartitionsChartObj = {};
               
            }


            function initialize() {
               

                vm.clickSearchHandler = clickSearchHandler;
                vm.changeDateHandler = changeDateHandler;
                vm.changeTopicHandler = changeTopicHandler;

               // vm.processInterval = true;
                vm.intervalHoldHandler = intervalHoldHandler;
                vm.chartMousemoveEventHandler = chartMousemoveEventHandler;
                vm.tapExpand = tapExpand;

                addEventListener();
                reset();
                getSocketData();
                createTimer();

            
                // 검색 시간 설정
                $timeout(function() {                    

                    setSearchDate();
                    if (vm.searchInfo.startDate && vm.searchInfo.endDate) {
                        getTopicList(); // topicList 정보 
                        searchDatas()
                        intervalSearch();
                    }

                });

                $('.chart.partitionPer').mouseleave(function () {
                    $('#kafkaTooltipLayer').remove();
                    $timeout.cancel(tooltipTimer);
                    tooltipTimer = null;
                });
               


            }

            initialize();
        }
    ]);

    
     angular.module('app')
        .factory('KafkaChartRenderer', function(CommonUtil) {
            "use strict";

            let colorArr = ['#00c853','#e76049','#29c5ff','#ffea00','#ff3d00','#ffc000','#ff6600','#2979ff','#d500f9','#5d9cec','#888','#575757',
                            '#e817cd','#e4b4ac','#074b65','#5a5406','#73230a','#efe2bb','#5a2a09','#0a3275','#710d82','#838e9c','#27dc1d','#e8e417'];

            return {
                getChartInfo: function(chartId, data) {
                   
                    var defaultObj = {
                        "line-color": "#00c853",
                        "text": "",
                        guideLabel: {
                            "text": "%t : %v",
                            "color":"#fff",
                            "font-size": "10px",
                            "background-color": "#292626",
                            "border-color": "#00c853"
                        }
                    };


                    var chartInfo = {
                        id: chartId,
                        type: 'line',
                        scaleX: {
                            maxItems: 6
                        },
                        scaleY: {
                            "min-value": "auto",
                            "transform": {}                            
                        },
                        crosshairX: {
                            scaleLableVisible: true,
                            plotLableVisible: true
                        },
                        series: [{
                            "line-color": "#00c853",
                            "text": "value",
                            guideLabel: {
                                "text": "%v",
                                "color":"#fff",
                                "font-size": "10px",
                                "background-color": "#292626",
                                "border-color": "#00c853",
                                "thousands-separator": ",",
                            }
                        }]
                    }

                    switch (chartId) {

                        case 'kafka.currentOffsetChart': // Current Offsets                            
                            chartInfo.scaleX.maxItems = 9;
                            chartInfo.series[0]["line-color"] = colorArr[0]; 
                            chartInfo.series[0].guideLabel["border-color"] = colorArr[0];
                            chartInfo.series[0].values = data.values;
                            break;

                        case 'kafka.oldestOffsetChart': // Message Purge History    
                           
                            chartInfo.type = "scatter";
                            chartInfo.scaleY["min-value"] = _.min(_.filter(data.values,function(v){return v > 0}));
                            chartInfo.scaleX.maxItems = 9;
                            chartInfo.series[0]["line-color"] = colorArr[1]; 
                            chartInfo.series[0].guideLabel["border-color"] = colorArr[1];
                            chartInfo.crosshairX.plotLableVisible = true;
                            chartInfo.series[0].values = data.values;
                            break;

                        case 'kafka.mirroringLogChart': // Mirroring Log


                            chartInfo.scaleX.maxItems = 9;
                            chartInfo.series[0]["line-color"] = colorArr[2]; 
                            chartInfo.series[0].guideLabel["border-color"] = colorArr[2];                        
                            chartInfo.series[0].values = data.values;

                            break;

                        case 'kafka.consumerGroupsOffsetChart': // Consumer Groups Offset
                            var series = [];

                            var dataKeys = Object.keys(data);

                            if(dataKeys.indexOf('dacoe-habit-tracker') > -1) {
                                chartInfo.type = 'mixed';
                            }

                            for(var i=0;i<dataKeys.length;i++) {
                                var obj = angular.copy(defaultObj);
                                    obj.type = 'line';
                                    obj["line-color"] = colorArr[i+2];  
                                    obj["text"] = dataKeys[i];    
                                    obj.guideLabel["border-color"] = colorArr[i+2];
                                    obj.values = data[dataKeys[i]].values;
                                    if(dataKeys[i] == 'dacoe-habit-tracker') {                                   
                                        obj.scales = 'scaleX, scaleY2'; 
                                    }else {
                                        obj.scales = 'scaleX, scaleY'; 
                                    }

                                series.push(obj);                                
                            }
                            chartInfo.series = series;

                            break;


                        case 'kafka.partitionPerLeaderChart': // Partition Per Leader
                            var series = [];
                            var i=0;
                            _.each(data.partitionPerLeader, function(val, key) {

                                var obj = angular.copy(defaultObj);
                                    obj["line-color"] = colorArr[i];  
                                    obj["text"] = "Partition" + key;    
                                    obj.guideLabel["border-color"] = colorArr[i];
                                    obj.values = val;
                                   
                                series.push(obj);
                                i++;
                            });
                            chartInfo.crosshairX.scaleLableVisible = false;
                            chartInfo.crosshairX.plotLableVisible = false;
                            chartInfo.series = series;
                            break;

                        case 'kafka.partitionPerOffsetChart': // Partition Per Offset
                            var series = [];
                            var i=0;
                            _.each(data.partitionPerOffset, function(val, key) {
                                var obj = angular.copy(defaultObj);
                                    obj["line-color"] = colorArr[i];  
                                    obj["text"] = "Partition" + key;    
                                    obj.guideLabel["border-color"] = colorArr[i];
                                    obj.values = val;
                                   
                                series.push(obj);
                                i++;
                            });
                            chartInfo.crosshairX.scaleLableVisible = false;
                            chartInfo.crosshairX.plotLableVisible = false;
                            chartInfo.series = series;
                            break;

                        case 'kafka.numberOfTopicsPartitionsChart': // Number of topics and Partitions
                            var series = [];
                            var dataKeys = Object.keys(data.chartDatas);
                            for(var i=0;i<dataKeys.length;i++) {

                                var obj = angular.copy(defaultObj);                                   
                                    obj["line-color"] = colorArr[i+5];  
                                    obj["text"] = dataKeys[i];    
                                    obj.guideLabel["border-color"] = colorArr[i+5];
                                    obj.values = data.chartDatas[dataKeys[i]];
                                
                                series.push(obj);
                            }

                            chartInfo.scaleX.maxItems = 9;
                            chartInfo.series = series;

                            break;


                    }

                    return chartInfo
                },
  
                createLineChartObj: function(chartId, data) {

                    var chartInfo = this.getChartInfo(chartId, data);
                    var insertTimes = [];
                    var scaleX = [];


                    if(chartId == 'kafka.consumerGroupsOffsetChart') {
                        var dataKeys = Object.keys(data);
                        if(dataKeys.length > 0) {
                            insertTimes = angular.copy(data[dataKeys[0]].insertTimes);
                            scaleX = insertTimes;         
                            //scaleX = scaleX.unshift(moment(vm.searchInfo.startDate).format('x'));                   
                        }else {
                            chartInfo.series = [];
                        }

                    }else {
                        if (data.insertTimes === undefined || data.insertTimes === null || data.insertTimes.length === 0) {
                            chartInfo.series = [];
                        } else {
                            insertTimes = angular.copy(data.insertTimes);
                            scaleX = insertTimes;    
                            if(chartId == 'kafka.oldestOffsetChart') {
                                for (let i = 0; i < scaleX.length; i++) {
                                    scaleX[i] = moment(scaleX[i]).format('x');
                                }
                            }                       
                        }
                    }


                    var chartObj = {
                        type: chartInfo.type,
                        backgroundColor: 'transparent',
                        theme: 'dark',
                        title: {
                            text: chartInfo.title,
                            y: '10',
                            fontSize: '15',
                            fontColor: "#fff"
                        },
                        plotarea: { marginTop: "30", marginRight: "38", marginBottom: "25", marginLeft: "55" }, // 그래프 사이즈
                        //plotarea: {margin: 'dynamic dynamic dynamic dynamic'},
                        plot: {
                            "mode": "fast",
                            "exact": true,
                            "smartSampling": true,
                            "maxNodes": 0,
                            //  "maxTrackers": 0,     tooltip 안보임
                            "lineWidth": 1,
                            "shadow": false,
                            "marker": {
                                color: colorArr[1],
                                type: "circle",
                                borderWidth: 0,
                                size: 2,
                                shadow: false
                            },
                            "aspect": "spline"
                        },



                        tooltip: { visible: false },
                        crosshairX: {
                            shared: false,
                            lineWidth: 1,
                            scaleLabel: {
                                "backgroundColor":"#292626",
                                "color":"#fff",
                                borderColor: "#C0C0C0",
                                borderWidth: "1px",
                                visible: chartInfo.crosshairX.scaleLableVisible,
                                transform: {
                                    type: "date",
                                    text: "%Y-%mm-%dd %H:%i:%s"
                                }
                            },
                            plotLabel: {
                                visible: chartInfo.crosshairX.plotLableVisible,
                                multiple: true
                            }
                        },
                        scaleY: {
                            "min-value": chartInfo.scaleY["min-value"],
                            "thousands-separator": ",",
                            item: { "font-color": "#fff" },
                            guide: {
                                visible: false,
                                "line-width": "1px",
                                "line-color": "#CCCCCC",
                                alpha: "0.2",
                                "line-style": "dashed"
                            },
                            "transform": chartInfo.scaleY.transform
                            // "progression": "log",
                            // "log-base": 10                       
                        },
                        scaleY2: {
                            "min-value": chartInfo.scaleY["min-value"],
                            "thousands-separator": ",",
                            item: { "font-color": "#fff" },
                            tick:{
                                visible: true
                            },              
                            item: {
                                visible: true
                            },
                            guide: {
                                visible: false
                            }
                        },

                        scaleX: {
                            zooming: true,
                            placement: "default",
                            // maxItems: 5,
                            //step: 60000 * 60, //1시간 단위
                            item: {
                                "font-color": "#fff"
                            },
                            guide: {
                                visible: false
                            },
                            tick: {
                                lineWidth: "1px"
                            },
                            "min-value": chartInfo.scaleX["min-value"],
                            // "min-value":1541753250000,
                            //"step":"30minute",
                            // "min-value":"1541753250000", //Min Value
                            // "max-value":"1541771970000", //Max Value
                            "transform": {
                                type: "date",
                                all: "%H:%i"
                            },
                            "max-items": chartInfo.scaleX.maxItems,
                            values: scaleX
                        },


                        series: chartInfo.series
                    }

                    return chartObj;
                }

            }
        });

});