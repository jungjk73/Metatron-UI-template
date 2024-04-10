define(["app", "moment"], function(app, moment) {
    app.controller("FlinkStatusCtrl", ["$rootScope", "$scope", "$interval", "$timeout", "$filter", "$q", "DataService", "ConfigManager", "GridRenderer", "ngDialog", 'CommonUtil', 'FlinkChartRenderer',
        function($rootScope, $scope, $interval, $timeout, $filter, $q, DataService, ConfigManager, GridRenderer, ngDialog, CommonUtil, FlinkChartRenderer) {
            "use strict";

            let vm = this;
            let INTERVAL_TIME = 30 * 1000;
            let __interval;
            let unbind = [];   
            let tabOpened = [];         


            // job 목록
            function getJobList() {
                var param = {
                    systemSeq: vm.searchInfo.systemSeq
                };
                DataService.httpGet("/service/flink/getJobList?systemSeq=" + vm.searchInfo.systemSeq, {}, function(result) {
                    if (result.result === 1 && result.data !== null) {
                        vm.dataDetail.jobList = result.data;
                    }
                });
            }

            /* checkpoint, uptimes, restarts getData */
            function getStatusLastInfo() {
                var params = {
                    systemSeq: vm.searchInfo.systemSeq,
                    jobId: vm.searchInfo.jobId
                }


                DataService.httpPost("/service/flink/getStatusLastInfo", params, function(result) {
                    if (result.result === 1 && result.data !== null) {
                        vm.dataDetail.statusLastInfo = result.data;
                    }
                });
            }

            /* Kafka input/output rates chart datas */
            function getKafkaInOutputs() {
                DataService.httpPost("/service/flink/getKafkaInOutputs", vm.searchInfo, function(result) {
                    if (result.result === 1 && result.data !== null) {     
                        vm.messageInputRateChartObj = FlinkChartRenderer.createLineChartObj('flink.messageInputRateChart', result.data);
                        vm.messageStreamSizeChartObj = FlinkChartRenderer.createLineChartObj('flink.messageStreamSizeChart', result.data);
                        vm.finishedSessionsChartObj = FlinkChartRenderer.createLineChartObj('flink.finishedSessionsChart', result.data);
                        vm.finishedSessionsSizeChartObj = FlinkChartRenderer.createLineChartObj('flink.finishedSessionsSizeChart', result.data);
                      
                        setKafkaInputOutputDatas(result.data);
                    }
                });
            }
           

            // Current Offsets chart datas
            function getCurrentOffsetChart(topic) {
                var deferred = $q.defer();
                var param = {
                    systemSeq: vm.searchInfo.systemSeq,
                    startDate: vm.searchInfo.startDate,
                    endDate: vm.searchInfo.endDate,
                    topic: topic
                };               
                DataService.httpPost("/service/kafka/new/getCurrentOffsetChart", param, function(result) {
                    if (result.result === 1 && result.data !== null) {                        
                        deferred.resolve(result.data);
                    }
                });
                return deferred.promise;
            }

            function setKafkaInputOutputDatas(data) {
                var deferred = $q.defer();
                var topics = ['tmap-channel-gpsinfo', 'tmap-rpda-drivinghabits', 'dacoe-result1'];
                
                var gpsinfo = getCurrentOffsetChart(topics[0]);
                var drivinghabits = getCurrentOffsetChart(topics[1]);
                var dacoe_result1 = getCurrentOffsetChart(topics[2]);

                $q.all([gpsinfo, drivinghabits, dacoe_result1]).then(function(result){

                    /** Input Rates setting */
                    var inputRates = {};
                    inputRates.kafka = result[0];
                    inputRates[vm.searchInfo.jobId] = {
                        insertTimes: data.insertTimes,
                        values: data.requestsmeters
                    }
                    vm.kafkaInputChartObj = FlinkChartRenderer.createLineChartObj('flink.kafkaInputChart', inputRates);


                    /** Output Rates setting */
                    var outputRates = {};
                    outputRates[topics[1]] = result[1];
                    outputRates[topics[2]] = result[2];
                    outputRates[vm.searchInfo.jobId] = {
                        insertTimes: data.insertTimes,
                        values: data.finishedsessionsmeters
                    }
                    vm.kafkaOutputChartObj = FlinkChartRenderer.createLineChartObj('flink.kafkaOutputChart', outputRates);
                  //  $('#kafkaInputChart-img').css('z-index', 99);
                })                
            }

            function setKafkaOutputs(data) {

                var inputRates = {};
                
                var param = {
                    systemSeq: vm.searchInfo.systemSeq,
                    startDate: vm.searchInfo.startDate,
                    endDate: vm.searchInfo.endDate,
                    topic: 'tmap-channel-gpsinfo'                    
                };
                 
                
                var  tmap_channel_drivinghabits_list = [];
                
                DataService.httpPost("/service/kafka/new/getCurrentOffsetChart", param, function(result) {
                    if (result.result === 1 && result.data !== null) {
                        inputRates.kafka = result.data;
                        
                    }
                });                
            }


            /* Current Watermark chart datas */
            function getCurrentWatermarks() {
                DataService.httpPost("/service/flink/getCurrentWatermarks", vm.searchInfo, function(result) {
                    if (result.result === 1 && result.data !== null) {                       
                        vm.currentWatermarksChartObj = FlinkChartRenderer.createLineChartObj('flink.currentWatermarksChart', result.data);
                    }
                });
            }

            /* Check Point Chart Datas */
            function getCheckPointInfo() {
                DataService.httpPost("/service/flink/getCheckPointInfo", vm.searchInfo, function(result) {
                    if (result.result === 1 && result.data !== null) {
                        result.data.jobId = vm.searchInfo.jobId;
                        vm.checkPointChartObj = FlinkChartRenderer.createLineChartObj('flink.checkPointChart', result.data);                                             
                    }
                });
            }


            /* Last Check Point Chart Datas */
            function getLastCheckPoints() {
                DataService.httpPost("/service/flink/getLastCheckPoints", vm.searchInfo, function(result) {
                    if (result.result === 1 && result.data !== null) {
                        vm.lastChkPointSizeChartObj = FlinkChartRenderer.createLineChartObj('flink.lastChkPointSizeChart', result.data);
                        vm.lastChkPointDurationChartObj = FlinkChartRenderer.createLineChartObj('flink.lastChkPointDurationChart', result.data);
                        vm.lastChkPointBufferedChartObj = FlinkChartRenderer.createLineChartObj('flink.lastChkPointBufferedChart', result.data);                        
                    }
                });
            }

            /* Garbage Collection Chart Datas */
            function getGarbageCollections() {
                DataService.httpPost("/service/flink/getGarbageCollections", vm.searchInfo, function(result) {
                    if (result.result === 1 && result.data !== null) {
                        vm.garbageCollectionsChartObj = FlinkChartRenderer.createLineChartObj('flink.garbageCollectionsChart', result.data);
                    }
                });
            }

            /* Jitter Chart Datas */
            function getJitter() {
                DataService.httpPost("/service/flink/getJitter", vm.searchInfo, function(result) {
                    if (result.result === 1 && result.data !== null) {                        
                        vm.jitterChartObj = FlinkChartRenderer.createLineChartObj('flink.jitterChart', result.data);
                    }
                });
            }           

            /* Processing Time Chart Datas */
            function getProcessiongTime() {
                DataService.httpPost("/service/flink/getProcessiongTime", vm.searchInfo, function(result) {
                    if (result.result === 1 && result.data !== null) {                        
                        vm.processiongTimeChartObj = FlinkChartRenderer.createLineChartObj('flink.processiongTimeChart', result.data);
                    }
                });
            }

            /* Request EventCode Chart Datas */
            function getRequestEventCode() {
                DataService.httpPost("/service/flink/getRequestEventCode", vm.searchInfo, function(result) {
                    if (result.result === 1 && result.data !== null) {                        
                        vm.requestEventCodeChartObj = FlinkChartRenderer.createLineChartObj('flink.requestEventCodeChart', result.data);
                    }
                });
            }

            /* Last Request EventCode Chart Datas */
            function getLastRequestEventCode() {
                DataService.httpPost("/service/flink/getLastRequestEventCode", vm.searchInfo, function(result) {
                    if (result.result === 1 && result.data !== null) {                        
                        vm.lastRequestEventCodeChartObj = FlinkChartRenderer.createLineChartObj('flink.lastRequestEventCodeChart', result.data);
                    }
                });
            }

            /* Current input watermark Chart Datas */
            function getCurrentInputWatermark() {               
                DataService.httpPost("/service/flink/getCurrentInputWatermark", vm.searchInfo, function(result) {
                    if (result.result === 1 && result.data !== null) {      
                        vm.windowWatermarkChartObj = FlinkChartRenderer.createLineChartObj('flink.windowWatermarkChart', result.data.window);
                        vm.requestStatSinkWatermarkChartObj = FlinkChartRenderer.createLineChartObj('flink.requestStatSinkWatermarkChart', result.data.requestStatSink);
                        vm.sessionStatSinkWatermarkChartObj = FlinkChartRenderer.createLineChartObj('flink.sessionStatSinkWatermarkChart', result.data.sessionStatSink);    
                    }
                });
            }

            /* numRecordOutPerSecond  Chart Datas */
            function getNumRecordOutPerSecond () {               
                DataService.httpPost("/service/flink/getNumRecordOutPerSecond", vm.searchInfo, function(result) {
                    if (result.result === 1 && result.data !== null) {    
                        vm.sourceOutPerSecondChartObj = FlinkChartRenderer.createLineChartObj('flink.sourceOutPerSecondChart', result.data.source);
                        vm.sessionWindowOutPerSecondChartObj = FlinkChartRenderer.createLineChartObj('flink.sessionWindowOutPerSecondChart', result.data.sessionWindow);
                        vm.requestStatSinkOutPerSecondChartObj = FlinkChartRenderer.createLineChartObj('flink.requestStatSinkOutPerSecondChart', result.data.requestStatSink);    
                    }
                });
            }


            /* TaskManager Memory Consumption */
            function getTaskManagerMemory () {               
                DataService.httpPost("/service/flink/getTaskManagerMemory", vm.searchInfo, function(result) {
                    if (result.result === 1 && result.data !== null) {      
                        setTaskManagerMemoryChart(result.data);                      
                    }
                });
            }
            function setTaskManagerMemoryChart(data) {
                vm.taskManagerMemoryChartTitles = [];
                vm.taskManagerMemoryChartObj = {};
                var i=0;
                _.each(data, function(val, key){                    
                    vm.taskManagerMemoryChartTitles.push(key);
                    vm.taskManagerMemoryChartObj[key] = FlinkChartRenderer.createLineChartObj('flink.taskManagerMemoryChart', data[key]);
                    i++;
                })
                vm.taskManagerMemoryChartTitles = _.sortBy(vm.taskManagerMemoryChartTitles);
            }


            /* TaskManager Garbage Collection */
            function getTaskManagerGarbage () {               
                DataService.httpPost("/service/flink/getTaskManagerGarbage", vm.searchInfo, function(result) {
                    if (result.result === 1 && result.data !== null) {      
                        setTaskManagerGarbageChart(result.data);                      
                    }
                });
            }
            function setTaskManagerGarbageChart(data) {
                vm.taskManagerGarbageChartTitles = [];
                vm.taskManagerGarbageChartObj = {};
                var i=0;
                _.each(data, function(val, key){                    
                    vm.taskManagerGarbageChartTitles.push(key);
                    vm.taskManagerGarbageChartObj[key] = FlinkChartRenderer.createLineChartObj('flink.taskManagerGarbageChart', data[key]);
                    i++;
                })
                vm.taskManagerGarbageChartTitles = _.sortBy(vm.taskManagerGarbageChartTitles);
            }

            
             


            function clickSearchHandler() {
                if (!CommonUtil.validateStartEndDate(vm.sDateTime, vm.eDateTime))
                    return;
                vm.processInterval = true;
                $interval.cancel(__interval);
                searchDatas();
            }


            // Flink 모든 데이타 정보 가져오기
            function searchDatas() {
                if(vm.searchInfo.systemSeq !== '' && vm.searchInfo.jobId !== '') {
                    getStatusLastInfo();
                    getKafkaInOutputs();
                    getCheckPointInfo();                  
                    getGarbageCollections();                 
                    getJitter();        
                    getRequestEventCode();
                    getLastRequestEventCode();
                    getCurrentInputWatermark(); 

                    if(tabOpened.indexOf('taskMetricsTap') > -1) {
                        getNumRecordOutPerSecond();
                        getLastCheckPoints();
                        getProcessiongTime();
                    }

                    if(tabOpened.indexOf('taskMemoryTap') > -1) {
                        getTaskManagerMemory(); 
                    }

                    if(tabOpened.indexOf('taskGarbageTap') > -1) {
                        getTaskManagerGarbage(); 
                    }
                    
                    
                }                
            }

            // 날짜 조건 변경
            function changeDateHandler(event) {
                vm.searchInfo.startDate = event.sDateTime;
                vm.searchInfo.endDate = event.eDateTime;

              //  vm.processInterval = true;
                $interval.cancel(__interval);
                ap($scope);
            };

            // Job 변경
            function changeJobHandler(event) {
                if (vm.searchInfo.jobId !== event.jobId) {
                    vm.searchInfo.jobId = event.jobId;
                    searchDatas();
                }
            }



            function onChangeSystemSeqEventHandler(event, data) {
                vm.searchInfo.systemSeq = ConfigManager.getSystemSeq();

                reset();
                getJobList();
                searchDatas();
            }


            function addEventListener() {
                unbind = [
                    $scope.$on('$destroy', destroy),
                    $scope.$on(ConfigManager.getEvent("CHANGE_SYSTEM_SEQ_EVENT"), onChangeSystemSeqEventHandler)
                ];
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


            }

            function setSearchDate() {
                vm.sDateTime = moment().subtract(6, 'hours').local().format('YYYY-MM-DD HH:mm');
                vm.eDateTime = moment().format('YYYY-MM-DD HH:mm');

                // vm.sDateTime = '2018-11-19 18:00';
                // vm.eDateTime = '2018-11-19 21:00';

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

                    tabOpened.push(t);

                    if(t === 'taskMetricsTap') {                        
                        getNumRecordOutPerSecond();
                        getLastCheckPoints();
                        getProcessiongTime();
                    }

                    if(t === 'taskMemoryTap') {
                        getTaskManagerMemory();
                    }

                    if(t === 'taskGarbageTap') {
                        getTaskManagerGarbage();
                    }
                       
                }else if(target_i.hasClass('up')) {
                    tabOpened.splice(tabOpened.indexOf("kim"),1);

                    target_i.removeClass('up');
                    target_i.addClass('down');
                    $('#'+t).css({
                        display: 'none'
                    });
                }
            }

            vm.chartZoomOut = function (chart_id) {                
                zingchart.exec(chart_id, 'viewall');
            };


            // 데이타 정보 리셋
            function reset() {

                vm.searchInfo = {
                    systemSeq: ConfigManager.getSystemSeq(),
                   //jobId: 'a23b3880a9b193420b610ea2f6b9c42f'
                    jobId: ''
                };

                vm.dataDetail = {
                    jobList: [],
                    statusLastInfo: {
                        checkpoint: 0,
                        uptimes: 0,
                        restarts: 0
                    }
                }

                vm.kafkaInputChartObj = {};
                vm.kafkaOutputChartObj = {};
                vm.currentWatermarksChartObj = {};
                vm.availableMemorySegmentsChartObj = {};
                vm.lastChkPointSizeChartObj = {};
                vm.lastChkPointDurationChartObj = {};
                vm.lastChkPointBufferedChartObj = {};
                vm.garbageCollectionsChartObj = {};

                vm.messageInputRateChartObj = {};
                vm.messageStreamSizeChartObj = {};
                vm.jitterChartObj = {};
                vm.finishedChartObj = {};
                vm.finishedSessionsSizeChartObj = {};
                vm.finishedSessionsSizeChart = {};
                vm.processiongTimeChartObj = {};
                vm.requestEventCodeChartObj = {};
                vm.lastRequestEventCodeChartObj = {};

                vm.windowWatermarkChartObj = {};
                vm.requestStatSinkWatermarkChartObj = {};
                vm.sessionStatSinkWatermarkChartObj = {};
                vm.sourceOutPerSecondChartObj = {};
                vm.sessionWindowOutPerSecondChartObj = {};
                vm.requestStatSinkOutPerSecondChartObj = {};

                vm.heapMemoryChartObj = {};
                vm.nonHeapMemoryChartObj = {};
                vm.directMemoryChartObj = {};
                vm.markSweepChartObj = {};
                vm.scavengeChartObj = {};

                vm.checkPointChartObj = {};


            }


            function initialize() {

                vm.clickSearchHandler = clickSearchHandler;
                vm.changeDateHandler = changeDateHandler;
                vm.changeJobHandler = changeJobHandler;

                //vm.processInterval = true;
                vm.intervalHoldHandler = intervalHoldHandler;

                vm.tapExpand = tapExpand;
              
                addEventListener();
                reset();


                // 검색 시간 설정
                $timeout(function() {                   
                    setSearchDate()
                    if (vm.searchInfo.startDate && vm.searchInfo.endDate) {
                        getJobList(); // jobList 정보 
                        searchDatas()
                        intervalSearch();
                    }
                });

            }

            initialize();
        }
    ]);



     angular.module('app')
        .factory('FlinkChartRenderer', function(CommonUtil) {
            "use strict";

            let colorArr = CommonUtil.getChartColorArr();

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
                            plotLableVisible: true
                        },
                        series: [defaultObj]
                    }

                    switch (chartId) {

                        case 'flink.kafkaInputChart': //  Kafka Input Rate
                            var series = [];
                            var i=0;
                            _.each(data, function(val, key) {

                                if(val.insertTimes) {
                                    var values = val.insertTimes.map((item,k) => [item, val.values[k]]);
                                    var obj = angular.copy(defaultObj);
                                    obj["line-color"] = colorArr[i];  
                                    obj["text"] = key;    
                                    obj.guideLabel["border-color"] = colorArr[i];
                                    obj.values = values;

                                    series.push(obj);
                                }
                                i++;

                            });
                            
                            chartInfo.series = series;
                            break;
                            


                        case 'flink.kafkaOutputChart': //  Kafka Output Rate
                            var series = [];
                            var i=0;
                            _.each(data, function(val, key) {

                                if(val.insertTimes) {
                                    var values = val.insertTimes.map((item,k) => [item, val.values[k]]);
                                    var obj = angular.copy(defaultObj);
                                    obj["line-color"] = colorArr[i+2];  
                                    obj["text"] = key;    
                                    obj.guideLabel["border-color"] = colorArr[i+2];
                                    obj.values = values;

                                    series.push(obj);
                                }
                                i++;

                            });
                            
                            chartInfo.series = series;
                            break;

                        case 'flink.checkPointChart': //  Check Point
                                var series = [];
                                var obj = angular.copy(defaultObj);
                                    obj["line-color"] = colorArr[5];  
                                    obj["text"] = data.jobId;    
                                    obj.guideLabel["border-color"] = colorArr[5];
                                    obj.values = data.values;

                                series.push(obj);
                               
                                chartInfo.series = series;
                            break;                        

                       

                        case 'flink.currentWatermarksChart': // Current Watermark
                            var series = [];
                            var i=0;
                            _.each(data, function(val, key) {

                                var values = [];

                                for(var k=0;k<val.insertTimes.length;k++) {
                                    var arr = [];                                    
                                    // arr.push(moment(val.insertTimes[k]).format('x'));
                                    arr.push(val.insertTimes[k]);
                                    arr.push(val.values[k]);
                                    values.push(arr);
                                }
                                
                                var obj = angular.copy(defaultObj);
                                    obj["line-color"] = colorArr[i+5];  
                                    obj["text"] = key;    
                                    obj.guideLabel["border-color"] = colorArr[i+5];
                                    obj.values = values;

                                series.push(obj);
                                i++;

                            });
                            
                            chartInfo.series = series;
                            break;

                       

                        case 'flink.lastChkPointSizeChart': // Last Checkpoint Size
                            var series = [];
                            var obj = angular.copy(defaultObj);
                                obj["line-color"] = colorArr[7];  
                                obj["text"] = "Size";    
                                obj.guideLabel["border-color"] = colorArr[7];
                                obj.values = data.sizes;

                            series.push(obj);

                            chartInfo.series = series;
                            break;

                        case 'flink.lastChkPointDurationChart': // Last Checkpoint Duration
                            var series = [];
                            var obj = angular.copy(defaultObj);
                                obj["line-color"] = colorArr[8];  
                                obj["text"] = "Duration";    
                                obj.guideLabel["border-color"] = colorArr[8];
                                obj.values = data.durations;

                            series.push(obj);                            
                            chartInfo.series = series;
                            break;

                        case 'flink.lastChkPointBufferedChart': // Last Checkpoint Alignment Buffered
                            var series = [];
                            var obj = angular.copy(defaultObj);
                                obj["line-color"] = colorArr[9];  
                                obj["text"] = "Buffer";    
                                obj.guideLabel["border-color"] = colorArr[9];
                                obj.values = data.buffereds;

                            series.push(obj);
                            chartInfo.series = series;
                            break;

                        case 'flink.garbageCollectionsChart': // Garbage Collection
                            var series = [];    
                            var i=0;   
                            _.each(data.chartDatas, function(val, key) {
                                var obj = angular.copy(defaultObj);
                                    obj["line-color"] = colorArr[i+5];  
                                    obj["text"] = key    
                                    obj.guideLabel["border-color"] = colorArr[i+5];
                                    obj.values = val;

                                series.push(obj);                                
                                i++;
                            });
                            
                            chartInfo.series = series;
                            break;

                        case 'flink.messageInputRateChart': // Message Input Rate
                            var series = [];
                            var obj = angular.copy(defaultObj);
                                obj["line-color"] = colorArr[0];  
                                obj["text"] = "Request";    
                                obj.guideLabel["border-color"] = colorArr[0];
                                obj.values = data.requestsmeters;

                            series.push(obj);                              
                            chartInfo.series = series;
                            break;

                        case 'flink.messageStreamSizeChart': // Message Stream size
                            var series = [];
                            var obj = angular.copy(defaultObj);
                                obj["line-color"] = colorArr[1];  
                                obj["text"] = "RequestSize";    
                                obj.guideLabel["border-color"] = colorArr[1];
                                obj.values = data.requestsizemeters;

                            series.push(obj);
                            chartInfo.series = series;
                            break;


                        case 'flink.jitterChart': // Jitter

                            var series = [];    
                            var i=0;   
                            _.each(data.chartDatas, function(val, key) {
                                var obj = angular.copy(defaultObj);
                                    obj["line-color"] = colorArr[i+2];  
                                    obj["text"] = key.toUpperCase();    
                                    obj.guideLabel["border-color"] = colorArr[i+2];
                                    obj.values = val;

                                series.push(obj);
                                i++;
                            });
                            
                            chartInfo.series = series;
                            break;

                        case 'flink.finishedSessionsChart': // Finished Sessions
                            var series = [];
                            var obj = angular.copy(defaultObj);
                                obj["line-color"] = colorArr[4];  
                                obj["text"] = "Session";    
                                obj.guideLabel["border-color"] = colorArr[4];
                                obj.values = data.finishedsessionsmeters;

                            series.push(obj);
                            chartInfo.series = series;
                            break;

                        case 'flink.finishedSessionsSizeChart': // Finished Sessions size
                            var series = [];
                            var obj = angular.copy(defaultObj);
                                obj["line-color"] = colorArr[5];  
                                obj["text"] = "Session Size";    
                                obj.guideLabel["border-color"] = colorArr[5];
                                obj.values = data.finishedsessionsizemeters;

                            series.push(obj);
                            chartInfo.series = series;
                            break;

                        case 'flink.processiongTimeChart': // Processing Time

                            var series = [];     
                            var i=0;  
                            _.each(data.chartDatas, function(val, key) {
                                var obj = angular.copy(defaultObj);
                                    obj["line-color"] = colorArr[i+6];  
                                    obj["text"] = key.toUpperCase();    
                                    obj.guideLabel["border-color"] = colorArr[i+6];
                                    obj.values = val;

                                series.push(obj);
                                i++;
                            });
                            
                            chartInfo.series = series;
                            break;

                        case 'flink.requestEventCodeChart': // request Event Code

                            var series = [];       
                            var i=0;
                            _.each(data.chartDatas, function(val, key) {
                                var obj = angular.copy(defaultObj);
                                    obj["line-color"] = colorArr[i];  
                                    obj["text"] = key.toUpperCase();    
                                    obj.guideLabel["border-color"] = colorArr[i];
                                    obj.values = val;

                                series.push(obj);
                                i++;

                            });
                            
                            chartInfo.series = series;
                            break;

                        case 'flink.lastRequestEventCodeChart': // Last Request Event Code

                            var series = [];       
                            var i=0;
                            _.each(data.chartDatas, function(val, key) {
                                var obj = angular.copy(defaultObj);
                                    obj["line-color"] = colorArr[i];  
                                    obj["text"] = key.toUpperCase();    
                                    obj.guideLabel["border-color"] = colorArr[i];
                                    obj.values = val;

                                series.push(obj);                                
                                i++;

                            });
                            
                            chartInfo.series = series;
                            break;

                        case 'flink.windowWatermarkChart': // currentInputWatermark @Window
                            var series = [];
                            var i=0;
                            _.each(data, function(val, key) {
                                if(key !== 'insertTimes') {      
                                    var obj = angular.copy(defaultObj);
                                        obj["line-color"] = colorArr[i+2];  
                                        obj["text"] = key;    
                                        obj.guideLabel["border-color"] = colorArr[i+2];
                                        obj.guideLabel.transform = {
                                            "type":"date",
                                            "all":"%Y-%mm-%dd %H:%i:%s"
                                        }
                                        obj.values = val;

                                    series.push(obj);
                                    i++;
                                }                                

                            });

                            chartInfo.scaleY.transform = {
                                type: "date",
                                all: "%H:%i"
                            },
                            chartInfo.series = series;
                            break;

                        case 'flink.requestStatSinkWatermarkChart': // currentInputWatermark  @Request Stat Sink
                            var series = [];
                            var i=0;
                            _.each(data, function(val, key) {
                                if(key !== 'insertTimes') {

                                    var obj = angular.copy(defaultObj);
                                        obj["line-color"] = colorArr[i+4];  
                                        obj["text"] = key;    
                                        obj.guideLabel["border-color"] = colorArr[i+4];
                                        obj.guideLabel.transform = {
                                            "type":"date",
                                            "all":"%Y-%mm-%dd %H:%i:%s"
                                        }
                                        obj.values = val;

                                    series.push(obj);                                   
                                    i++;
                                }        

                            });

                            chartInfo.scaleY.transform = {
                                type: "date",
                                all: "%H:%i"
                            },
                            chartInfo.series = series;
                            break;

                        case 'flink.sessionStatSinkWatermarkChart': // currentInputWatermark @Session Stat Sink
                            var series = [];
                            var i=0;
                            _.each(data, function(val, key) {
                                if(key !== 'insertTimes') {
                                    var obj = angular.copy(defaultObj);
                                        obj["line-color"] = colorArr[i+4];  
                                        obj["text"] = key;    
                                        obj.guideLabel["border-color"] = colorArr[i+4];
                                        obj.guideLabel.transform = {
                                            "type":"date",
                                            "all":"%Y-%mm-%dd %H:%i:%s"
                                        }
                                        obj.values = val;

                                    series.push(obj);
                                    i++;
                                }        
                            });

                            chartInfo.scaleY.transform = {
                                type: "date",
                                all: "%H:%i"
                            },
                            chartInfo.series = series;
                            break;

                        case 'flink.sourceOutPerSecondChart': // numRecordOutPerSecond @Source
                            var series = [];
                            var i=0;
                            _.each(data, function(val, key) {
                                if(key !== 'insertTimes') {
                                    var obj = angular.copy(defaultObj);
                                        obj["line-color"] = colorArr[i];  
                                        obj["text"] = key;    
                                        obj.guideLabel["text"] = "%t : %v sec"; 
                                        obj.guideLabel["border-color"] = colorArr[i];
                                        obj.values = val;

                                    series.push(obj);                                  
                                    i++;
                                }        
                            });
                            
                            chartInfo.series = series;
                            break;

                        case 'flink.sessionWindowOutPerSecondChart': // numRecordOutPerSecond @session windows
                            var series = [];
                            var i=0;
                            _.each(data, function(val, key) {
                                if(key !== 'insertTimes') {
                                    var obj = angular.copy(defaultObj);
                                        obj["line-color"] = colorArr[i];  
                                        obj["text"] = key;    
                                        obj.guideLabel["text"] = "%t : %v sec"; 
                                        obj.guideLabel["border-color"] = colorArr[i];
                                        obj.values = val;

                                    series.push(obj);
                                    i++;
                                }        
                            });
                           
                            chartInfo.series = series;
                            break;

                        case 'flink.requestStatSinkOutPerSecondChart': // numRecordOutPerSecond @Request Stat Sink
                            var series = [];
                            var i=0;
                            _.each(data, function(val, key) {
                                if(key !== 'insertTimes') {
                                    
                                    var obj = angular.copy(defaultObj);
                                        obj["line-color"] = colorArr[i];  
                                        obj["text"] = key;    
                                        obj.guideLabel["text"] = "%t : %v sec"; 
                                        obj.guideLabel["border-color"] = colorArr[i];
                                        obj.values = val;

                                    series.push(obj); 
                                    i++;
                                }        
                            });
                         
                            chartInfo.series = series;
                            break;

                        case 'flink.taskManagerMemoryChart' :  // TaskManager Memory Charts
                            var series = [];
                            var i=0;

                            _.each(data, function(arr, tmId){

                                if(arr.insertTimes) {
                                    var heaps=[], nonHeaps=[], directs=[];

                                    _.each(arr.datas, function(val, key){

                                        var values = arr.insertTimes.map((item,k) => [item, val[k]]);
                                        var obj = angular.copy(defaultObj);
                                        obj["line-color"] = colorArr[i];  
                                        obj["text"] = tmId+' - '+key;   
                                        obj.guideLabel["text"] = "%t : %v GB";  
                                        obj.guideLabel["border-color"] = colorArr[i];
                                        obj.values = values;

                                        series.push(obj);

                                        i++;

                                    })
                                }                              
                            })
                           
                            chartInfo.series = series;
                            break;

                        case 'flink.taskManagerGarbageChart' :  // TaskManager Garbage Charts
                            var series = [];
                            var i=0;

                            _.each(data, function(arr, tmId){

                                if(arr.insertTimes) {
                                    var heaps=[], nonHeaps=[], directs=[];

                                    _.each(arr.datas, function(val, key){

                                        var values = arr.insertTimes.map((item,k) => [item, val[k]]);
                                        var obj = angular.copy(defaultObj);
                                        obj["line-color"] = colorArr[i];  
                                        obj["text"] = tmId+' - '+key;   
                                        obj.guideLabel["text"] = "%t : %v Byte";  
                                        obj.guideLabel["border-color"] = colorArr[i];
                                        obj.values = values;

                                        series.push(obj);

                                        i++;

                                    })
                                }                              
                            })
                           
                            chartInfo.series = series;
                            break;
                    }

                    return chartInfo
                },                



                createLineChartObj: function(chartId, data) {

                    var chartInfo = this.getChartInfo(chartId, data);

                    var scaleX = [];

                    if(chartId !== 'flink.currentWatermarksChart' && chartId !== 'flink.kafkaInputChart' 
                        && chartId !== 'flink.kafkaOutputChart' && chartId !== 'flink.taskManagerMemoryChart' 
                        && chartId !== 'flink.taskManagerGarbageChart') {
                        
                        if (data.insertTimes === undefined || data.insertTimes === null || data.insertTimes.length === 0) {
                            chartInfo.series = [];
                        } else {                           
                            scaleX = angular.copy(data.insertTimes);
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
                        plotarea: { marginTop: "30", marginRight: "38", marginBottom: "25", marginLeft: "50" }, // 그래프 사이즈
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
                                transform: {
                                    type: "date",
                                    text: "%mm-%dd %H:%i:%s"
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

