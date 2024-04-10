define(["app", "moment"], function(app, moment) {
    app.controller("RetentionjobHistoryCtrl", ["$rootScope", "$scope", "$timeout", "$filter", "$http", "DataService", "ConfigManager", "GridRenderer", "ngDialog", 'CommonUtil',
        function($rootScope, $scope, $timeout, $filter, $http, DataService, ConfigManager, GridRenderer, ngDialog, CommonUtil) {
            "use strict";

            let vm = this;  
            let unbind = [];


            // 검색 서비스
            function getHistoryPagingList() {
                DataService.httpPost("/activities/retention/history/getHistoryPagingList", vm.searchInfo, function(result) {
                    if (result.result === 1 && result.data !== null) {
                      //  vm.searchInfo.endIndex = result.data.total-1+"";
                        vm.grid.total = result.data.total;
                        vm.grid.historyList = _.sortBy(result.data.list, 'jobStartDate').reverse(); 

                    }
                });
            }

            // Excel 다운로드 서비스
            vm.excelDownload = function () {
                if(confirm('검색하신  정보를 Excel로 Download 진행하시겠습니까?')) {
                    $http({
                        method: 'POST',
                        url: '/activities/retention/history/excelDownload',
                        responseType: 'arraybuffer', // We get response message which is written by binary data from server.
                        headers: {'Accept': 'application/vnd.ms-excel',},
                        params: vm.searchInfo
                    }).success(function (data, status, headers, config) {
                        var fileName = 'retention_history.xlsx';
                        var blob = new Blob([data], {type: 'application/vnd.ms-excel;charset=UTF-8'});
                        var objectUrl = (window.URL || window.webkitURL).createObjectURL(blob);
                        if (typeof window.navigator.msSaveBlob !== 'undefined') {
                            window.navigator.msSaveBlob(blob, fileName);
                        } else {
                            var link = angular.element('<a/>');
                            link.attr({
                                href: objectUrl,
                                download: fileName
                            })[0].click();
                        }                       
                    }).error(function (response, status, headers, config) {
                        
                    });

                }
            };

            // 검색
            function search() {
                if (!CommonUtil.validateStartEndDate(vm.sDateTime, vm.eDateTime))
                    return;
                vm.searchInfo.startIndex = 0;
                vm.searchInfo.page = 0;
                getHistoryPagingList();
            }

            // Data Type 조건 변경
            function onCheckedDataTypeHandler(event, dataTypes) {
                vm.searchInfo.dataTypeFilter = dataTypes;
                //search();
            }


            // 날짜 조건 변경
            function changeDateHandler(event) {
                vm.searchInfo.regDateStartFilter = event.sDateTime;
                vm.searchInfo.regDateEndFilter = event.eDateTime;
            };
           

            function setSearchDate() {
                vm.sDateTime = moment().subtract(1, 'hours').local().format('YYYY-MM-DD HH:mm');
                vm.eDateTime = moment().format('YYYY-MM-DD HH:mm');

                vm.searchInfo.regDateStartFilter = vm.sDateTime;
                vm.searchInfo.regDateEndFilter = vm.eDateTime;
            }

            // Page 이동
            function goToPage(event, message) {     
                vm.searchInfo.pageSize = message.perPage;           
                vm.searchInfo.startIndex = message.startRow;
                getHistoryPagingList();

            }

            // 실행결과 로그 보기
            function onHistoryLogView(event, message) {

                $scope.historyDetail = {};
                DataService.httpPost("/activities/retention/history/getHistoryView", message, function(result) {
                    if (result.result === 1 && result.data !== null) {

                        $scope.historyDetail = result.data;
                                               
                        var popup = ngDialog.open({
                            template: "/activities/retention/history/retentionjob_history_log_popup.html",
                            className: "ngdialog-theme-default custom-width",
                            showClose: false,
                            disableAnimation: true,
                            cache: false,
                            closeByDocument: false,
                            closeByEscape: false,
                            scope: $scope
                        });

                        var closer = $rootScope.$on('ngDialog.refresh', function (e, id) {
                            if (id != popup.id) return;
                            closer();
                        });
                    }
                });
                
            }

            function addEventListener() {
                unbind = [                   
                    $scope.$on("retentionHistoryGrid:goToPage", goToPage),
                    $scope.$on(ConfigManager.getEvent("RETENTION_GRID_CELL_CLICK_EVENT"), onHistoryLogView)                   
                ];
            }

            function initFilter() {
                vm.sDateTime = moment().subtract(1, 'hours').local().format('YYYY-MM-DD HH:mm');
                vm.eDateTime = moment().format('YYYY-MM-DD HH:mm');
                reset();
            }



            // 데이타 정보 리셋
            function reset() {
                vm.searchInfo = {  
                    regDateStartFilter: vm.sDateTime, 
                    regDateEndFilter: vm.eDateTime, 
                    cmdStatusFilter: '',
                    dataTypeFilter: ['Hive','HDFS','LogFile'],                    
                    jobIdNameFilter: '', 
                    hostFilter: '',     
                    loginIdFilter: '',   
                    retentionPeriodFilter: '',      
                    startIndex: '0',                    
                    pageSize: '30',
                    page: 0
                }   
                vm.checkedDataTypes = ['All'];    
                $scope.historyDetail = {};                   
            }
            

            function initialize() {               
                vm.changeDateHandler = changeDateHandler; 
                //vm.onChangeDataTypeOptions = onChangeDataTypeOptions; // Data Type checked event  
                vm.onCheckedDataTypeHandler = onCheckedDataTypeHandler;
                vm.search = search;
                vm.initFilter = initFilter;

                vm.grid = {
                    total: 0,
                    historyList: []
                }  
                vm.dataTypeOptions = [                   
                    {
                        label: 'Hive',
                        value: 'Hive'
                    },
                    {
                        label: 'HDFS',
                        value: 'HDFS'
                    },
                    {
                        label: 'LogFile',
                        value: 'LogFile'
                    }
                ];

                vm.cmdStatusOptions = [
                    {
                        label: 'ALL',
                        value: ''
                    },
                    {
                        label: 'SUCCESS',
                        value: 'SUCCESS'
                    },
                    {
                        label: 'FAIL',
                        value: 'FAIL'
                    }
                ]

                reset();
            
                // 검색 시간 설정
                $timeout(function() {   
                    setSearchDate();
                    if (vm.searchInfo.regDateStartFilter && vm.searchInfo.regDateEndFilter) {
                        getHistoryPagingList();
                    }
                });

                addEventListener();
                
            }

            initialize();
        }

    ]);

});