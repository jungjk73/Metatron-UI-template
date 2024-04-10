define(["app", "moment"], function(app, moment) {
    app.controller("ReportConnectionPopupCtrl", ["$rootScope", "$scope", "$interval", "$timeout", "DataService", "ConfigManager", "GridRenderer", "ngDialog", "CommonUtil",
        function($rootScope, $scope, $interval, $timeout, DataService, ConfigManager, GridRenderer, ngDialog, CommonUtil) {
            "use strict";

            let reportConnPopupCtrl = this;
            let unbind = [];
            let systemSeq = '';
            let REPORT_CONNECTION_SYSTEM_TYPE_CODE = '30086';   // CONNECTION TYPE Common Code
            let REPORT_CONNECTION_DB_TYPE_CODE = '30087';       // DB TYPE Common Code        

            function getList() {
                DataService.httpGet("/administrator/report/getReportConnectionUrlInfoList?systemSeq="+reportConnPopupCtrl.searchInfo.systemSeq+"&systemType="+reportConnPopupCtrl.searchInfo.systemType, {}, function(result) {
                    if (result.result === 1 && result.data !== null) {                    
                        reportConnPopupCtrl.reportConnectionInfoList = result.data;
                        if(reportConnPopupCtrl.selectedRow !== undefined) {
                            reportConnPopupCtrl.gridSelectedIndex = _.findIndex(reportConnPopupCtrl.reportConnectionInfoList, {systemSeq : reportConnPopupCtrl.selectedRow.systemSeq, 
                                systemType: reportConnPopupCtrl.selectedRow.systemType, name: reportConnPopupCtrl.selectedRow.name});
                        }
                    }
                });
            }

            function insert() {
                DataService.httpPost("/administrator/report/insertReportConnectionUrlInfo", reportConnPopupCtrl.dataDetail, function(result) {
                    gridSelectedReset();            
                    getList();
                });
            }

            function update() {
                DataService.httpPost("/administrator/report/updateReportConnectionUrlInfo", reportConnPopupCtrl.dataDetail, function(result) {
                    getList();
                });
            }

            function remove(param) {
                DataService.httpPost("/administrator/report/deleteReportConnectionUrlInfo", param, function(result) {
                    gridSelectedReset();         
                    getList();
                });
            }

            function getCommonCode(schCodeParentSeq) {
                DataService.httpGet("/admin/code/getCommonCodeList?schCodeParentSeq="+schCodeParentSeq, {}, function(result) {  
                    if (result == null || result.data == null)
                        return;
                    if(schCodeParentSeq == REPORT_CONNECTION_SYSTEM_TYPE_CODE) {
                        reportConnPopupCtrl.connectionSystemTypeList = result.data;
                    }else if(schCodeParentSeq == REPORT_CONNECTION_DB_TYPE_CODE) {
                        reportConnPopupCtrl.connectionDbTypeList = result.data;
                    }
                    
                });
            }

            function onSaveProcessHandler() {
                if(!reportConnPopupCtrl.dataDetail.name || reportConnPopupCtrl.dataDetail.name == '') {
                    alert("Input Name, please.");
                    return;
                }

                if(reportConnPopupCtrl.searchInfo.systemType == 'METADB') {
                    if(!reportConnPopupCtrl.dataDetail.dbType || reportConnPopupCtrl.dataDetail.dbType == '' || !reportConnPopupCtrl.dataDetail.dbDriver || reportConnPopupCtrl.dataDetail.dbDriver == '' 
                        || !reportConnPopupCtrl.dataDetail.dbUrl || reportConnPopupCtrl.dataDetail.dbUrl == '' || !reportConnPopupCtrl.dataDetail.dbId || reportConnPopupCtrl.dataDetail.dbId == ''
                        || !reportConnPopupCtrl.dataDetail.dbPwd || reportConnPopupCtrl.dataDetail.dbPwd == '' || !reportConnPopupCtrl.dataDetail.dbQuery || reportConnPopupCtrl.dataDetail.dbQuery == '') {
                        alert("Input DB Info, please.");
                        return;
                    }

                    if(reportConnPopupCtrl.dataDetail.dbType == 'Oracle') {
                        if(!reportConnPopupCtrl.dataDetail.metricId || reportConnPopupCtrl.dataDetail.metricId == '') {
                        alert("Input Metric ID, please.");
                        return;
                    }    
                    }
                }else {
                    if(!reportConnPopupCtrl.dataDetail.url || reportConnPopupCtrl.dataDetail.url == '') {
                        alert("Input Url, please.");
                        return;
                    }    
                }

                if(!reportConnPopupCtrl.dataDetail.orders || reportConnPopupCtrl.dataDetail.orders == '') {
                    alert("Input Orders, please.");
                    return;
                }

               

                if(reportConnPopupCtrl.cmd == 'ADD') {
                    reportConnPopupCtrl.dataDetail.systemSeq = reportConnPopupCtrl.searchInfo.systemSeq;
                    reportConnPopupCtrl.dataDetail.systemType = reportConnPopupCtrl.searchInfo.systemType;
                    insert();
                }else {
                    update();
                }
            }

            function onDeletePopupProcessHandler(event, data) {                
                if(data == null) return;
                if (!confirm("Do you want to Delete????")) {
                    return;
                }
                remove(data);
            };

            function onAddFormReset() {                
                gridSelectedReset();
                getList();
            }

            function onChangeSelect() { 
                gridSelectedReset();
                getList();
            }

            function onGridClickHandler(value) {
                if(value.length == 0) return;
                reportConnPopupCtrl.cmd = 'EDT'
                reportConnPopupCtrl.selectedRow = value[0].data;
                reportConnPopupCtrl.dataDetail = angular.copy(reportConnPopupCtrl.selectedRow);
                ap($scope);
            }
            
            function gridSelectedReset() {
                reportConnPopupCtrl.cmd = 'ADD';
                reportConnPopupCtrl.gridSelectedIndex = '';
                reportConnPopupCtrl.selectedRow = undefined;
                reportConnPopupCtrl.dataDetail = {};    
            }
           
            // 데이타 정보 리셋
            function reset() {    
                reportConnPopupCtrl.searchInfo = {
                    systemSeq: $scope.vm.selectSystemSeq,
                    systemType: 'WEBUI'
                }             
                reportConnPopupCtrl.connectionSystemTypeList = [];
                reportConnPopupCtrl.connectionDbTypeList = [];
                reportConnPopupCtrl.reportConnectionInfoList = [];                
                gridSelectedReset();
            };

            function addEventListener() {
                unbind = [                   
                    $scope.$on(ConfigManager.getEvent("GRID_REPORT_DELETE_BTN_EVENT"), onDeletePopupProcessHandler)
                ];
            };

            function initialize() {                
                reportConnPopupCtrl.onChangeSelect = onChangeSelect;
                reportConnPopupCtrl.onGridClickHandler = onGridClickHandler;                
                reportConnPopupCtrl.onSaveProcessHandler = onSaveProcessHandler;
                reportConnPopupCtrl.onAddFormReset = onAddFormReset;

                reset();      

                addEventListener();
                getCommonCode(REPORT_CONNECTION_SYSTEM_TYPE_CODE);
                getCommonCode(REPORT_CONNECTION_DB_TYPE_CODE);
                getList();

            };

            initialize();
        }
    ]);

});