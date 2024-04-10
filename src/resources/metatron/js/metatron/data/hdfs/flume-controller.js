define(["app", "moment"], function(app, moment) {
    app.controller("FlumeCtrl", ["$rootScope", "$scope", "$interval", "$timeout", "$controller", "$stateParams", "DataService", "ConfigManager", "GridRenderer", "ngDialog", 'CommonUtil',
        function($rootScope, $scope, $interval, $timeout, $controller, $stateParams, DataService, ConfigManager, GridRenderer, ngDialog, CommonUtil) {
            "use strict";

            let vm = this;
            let loader = true;
            let tooltipTimer;
            const tooltip_timeout = 500;
            let unbind = [];           


            // flume status
            function getStatus() {
             //   vm.searchInfo.searchDate = '2018-12-01';
                DataService.httpPost("/data/hdfs/flume/getStatus", vm.searchInfo, statusResultHandler);
            }

            function statusResultHandler(result) {
                vm.statusList = [];
                if (result.result === 1 && result.data !== null) {
                    vm.statusList = result.data;

                    _.each(vm.statusList, function(status) {

                        if (status.hdfsUsedRaws.length > 0) {
                            _.each(vm.emptyDatas, function(n) {
                                var value = _.findWhere(status.hdfsUsedRaws, { dataHour: n });
                                if (value === undefined) {
                                    var obj = {
                                        bg: "white",
                                        dataHour: n,
                                        fileCount: 0,
                                        size: 0,
                                    }
                                    status.hdfsUsedRaws.splice(n, 0, obj);
                                } else {
                                    value.bg = 'white';
                                    if(value.fileCount > 0 || value.size > 0) value.bg = 'green';
                                    if (value.alarmCount > 0) {                                       
                                        var chks = _.filter(value.hdfsAlarmHistorys, function(item){
                                            return item.configType == 'FIN' || item.configType == 'META' || item.configType == 'HOURLY' || item.configType == 'AGENTNAME';
                                        });                                        
                                        if(chks.length > 0) {
                                            value.bg = 'red';
                                        }else {
                                            value.bg = 'yellow';
                                        }
                                    } 
                                }
                            });

                        } else {
                            _.each(vm.emptyDatas, function(n) {
                                var obj = {
                                    bg: "white",
                                    dataHour: n,
                                    fileCount: 0,
                                    size: 0,
                                }
                                status.hdfsUsedRaws.push(obj);
                            })
                        }
                    })
                }
            }


            function searchStatus() {
                getStatus();
            }

            function changeDateHandler(event) {
                vm.tempStartDate = moment(event.sDateTime).format('YYYY-MM-DD');;
                vm.searchInfo.searchDate = vm.tempStartDate;                
            }

            function openConfigPopup() {
                var popup = ngDialog.open({
                    template: "/data/hdfs/popup/flume_config_popup_template.html",
                    className: "ngdialog-theme-default custom-width",
                    showClose: false,
                    disableAnimation: true,
                    cache: false,
                    closeByDocument: false,
                    closeByEscape: false,
                    data: {procType: vm.procType},
                    scope: $scope
                }).closePromise.then(function(data) {                        
                    getStatus();
                });
                

                var closer = $rootScope.$on('ngDialog.refresh', function(e, id) {
                    if (id != popup.id) return;
                    closer();
                });
            }

            
          
            function dataMousemoveEventHandler(event, data) {    

                $timeout.cancel(tooltipTimer);             

                tooltipTimer = $timeout(function(){                   
                    var id = event.currentTarget.id;

                    data.sizeMB = (data.size/1024/1024).toFixed(2);

                    var tootipData = '<div>';
                        tootipData += '   <div class="tooltip_title">' + data.dataTime + ' ' + addZero(data.dataHour) + ':00</div>';
                        tootipData += '   <div class="tooltip_detail">';
                        tootipData += '       <div class="row"><div><span class="title">SERVICE NAME</span> : <span class="svcName">' + data.svcName + '</span></div></div>';
                        tootipData += '       <div class="row"><div><span class="title">DATA TYPE</span> : <span class="dataType">' + data.dataType + '</span></div></div>';
                        tootipData += '       <div class="row"><div><span class="title">FILE COUNT</span> : <span class="fileCount">' + CommonUtil.numberFormatter(data.fileCount) + '</span></div></div>';
                        tootipData += '       <div class="row"><div><span class="title">SIZE(MB)</span> : <span class="size"></span>' + CommonUtil.numberFormatter(data.sizeMB) + '</div></div>';
                        tootipData += '   </div>';
                        tootipData += '   <div class="alarms">';

                    if(data.hdfsAlarmHistorys !== null && data.hdfsAlarmHistorys.length > 0) {
                        let tb = [];
                        tootipData += '<table class="mu-formbox-vertical" style="width: 100%;">';
                        tootipData += '   <thead><tr><th>Grade</th><th>Resource</th><th>Message</th></thead>';
                        tootipData += '   <tbody>';
                        for(let i=0; i<data.hdfsAlarmHistorys.length; i++) {
                            var icon = (data.hdfsAlarmHistorys[i].configType == 'FIN' || data.hdfsAlarmHistorys[i].configType == 'META' 
                                || data.hdfsAlarmHistorys[i].configType == 'HOURLY' || data.hdfsAlarmHistorys[i].configType == 'AGENTNAME') ? 'red' : 'yellow';
                            tootipData += '<tr>';
                            tootipData += '   <td style="text-align: center;"><span class="mu-icon circle txt-'+icon+'"></span></td>';
                            tootipData += '   <td>' + data.hdfsAlarmHistorys[i].resources + '</td>';
                            tootipData += '   <td>' + data.hdfsAlarmHistorys[i].message + '</td>';
                            tootipData += '</tr>';
                        }       
                        tootipData += '</tbody>';   
                        tootipData += '</table>';        
                    }

                    tootipData += '   </div>';
                    tootipData += '</div>';

                    angular.element('#' + id).data('powertipjq', $([tootipData].join('\n')));                

                    angular.element('#' + id).powerTip({
                        placement: 'nw',
                      //  followMouse: true,
                        smartPlacement: true,
                        manual: true
                    });

                    $.powerTip.show(angular.element('#' + id));

                }, tooltip_timeout);
            };


            // 데이타 정보 리셋
            function reset() {
                vm.cmd = 'ADD';
                vm.tempStartDate = moment().format('YYYY-MM-DD');
                //vm.tempStartDate = '2019-05-25';
                vm.searchInfo = {
                    cluster: ConfigManager.getSystemName(),
                    procType: vm.procType,
                    searchDate: vm.tempStartDate
                };

                vm.statusList = [];
            };


            function addZero(i) {
                if (i < 10) {
                    i = "0" + i;
                }
                return i;
            };


            function onChangeSystemSeqEventHandler(event, data) {
                reset();
                getStatus();
            };

            function addEventListener() {
                unbind = [
                    $scope.$on(ConfigManager.getEvent("CHANGE_SYSTEM_SEQ_EVENT"), onChangeSystemSeqEventHandler)
                ];
            };

            function initialize() {

                vm.procType = $stateParams.procType;               
                vm.dataMousemoveEventHandler = dataMousemoveEventHandler;
                vm.changeDateHandler = changeDateHandler;
                vm.searchStatus = searchStatus;
                vm.openConfigPopup = openConfigPopup;
                vm.emptyDatas = _.range(0, 24);
               
                         

                addEventListener();
                reset();
                getStatus();

                $(document).on('mouseleave', '.legend', function() {
                    $timeout.cancel(tooltipTimer);
                    $.powerTip.hide();
                });

            };

            initialize();
        }
    ]);

});