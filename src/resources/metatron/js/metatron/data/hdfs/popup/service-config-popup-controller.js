define(["app", "moment"], function(app, moment) {
    app.controller("SeviceConfigPopupCtrl", ["$rootScope", "$scope", "$interval", "$timeout", "DataService", "ConfigManager", "GridRenderer", "ngDialog", 'CommonUtil',
        function($rootScope, $scope, $interval, $timeout, DataService, ConfigManager, GridRenderer, ngDialog, CommonUtil) {
            "use strict";

            let vm = this;
            let loader = true;           
            let unbind = [];  

            /*************** System Service  기본 정보 Start ***************/            

            // System Service List 목록
            function getSystemSvcList() {     
                DataService.httpPost("/data/hdfs/config/getSystemSvcList", vm.searchInfo, function(result) {
                    if (result.result === 1 && result.data !== null) {
                        vm.systemSvcList = result.data;
                        if (vm.systemSvcSelected !== undefined ) {
                             vm.systemSvcSelectedIndex = _.findIndex(vm.systemSvcList, { svcId: vm.systemSvcSelected.svcId })+'';                            
                        }
                    }
                });
            } 

            // System Service 상세
            function getSystemSvcView() {     
                DataService.httpPost("/data/hdfs/config/getSystemSvcView", vm.searchInfo, function(result) {
                    if (result.result === 1 && result.data !== null) {
                        vm.systemSvcInfo = result.data;
                        vm.systemSvcDataList = vm.systemSvcInfo.systemSvcDatas
                    }
                });
            } 

            // System Service create
            function insertSystemSvc() {                
                DataService.httpPost("/data/hdfs/config/insertSystemSvc", vm.systemSvcDetail, function(result) {
                    if (result.result === 1 && result.data !== null) {
                        closeServiceConfigPopup();
                        svcReset();
                        vm.systemSvcSelected = undefined;  
                        getSystemSvcList();                      
                    }
                });
            }

            // System Service update
            function updateSystemSvc() {                
                DataService.httpPost("/data/hdfs/config/updateSystemSvc", vm.systemSvcDetail, function(result) {
                    if (result.result === 1 && result.data !== null) {
                        closeServiceConfigPopup();
                        svcReset();
                        getSystemSvcList();                        
                    }
                });
            }

            // System Service delete
            function deleteSystemSvc(param) {                
                DataService.httpPost("/data/hdfs/config/deleteSystemSvc", param, function(result) {
                    if (result.result === 1 && result.data !== null) {
                        vm.systemSvcSelected = undefined; 
                        svcReset();
                        getSystemSvcList();                       
                    }
                });
            }

            function onSaveSystemSvc() {
                if(vm.systemSvcDetail.svcName == '') {
                    alert("Input System Name, please.");
                    return;
                }

                if(vm.cmd == 'ADD') {
                    insertSystemSvc();
                }else if(vm.cmd == 'EDT') {
                    updateSystemSvc();
                }
            }

            function onUpdateSystemSvc(event, data) {   
                vm.cmd = 'EDT';
                vm.systemSvcDetail = data;
                openServiceConfigPopup();
            }

            function onDeleteSystemSvc(event, data) {                
                if (!confirm("Do you want to Delete?")) {
                    return;
                }
                var param = data;
                deleteSystemSvc(param);
            }
 
            
            // System 목록 클릭
            function onSystemSvcClickHandler(selected) {
                if(selected.length == 0) return;
                vm.systemSvcSelected = angular.copy(selected[0].data);
                vm.searchInfo.svcId = vm.systemSvcSelected.svcId;
                getSystemSvcView();
            }


            // 서비스 등록팝업
            function openServiceConfigPopup() {     
                vm.systemSvcPopup = ngDialog.open({
                    template: "/data/hdfs/popup/service_config_add_popup_template.html",
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

                var closer = $rootScope.$on('ngDialog.destroy', function (e, id) {
                    if (id != popup.id) return;
                    closer();
                });

            }

            function closeServiceConfigPopup() {
                vm.systemSvcPopup.close();                
            }
            /*************** System Service  기본 정보 END ***************/   





            /*************** System Service Data정보 Start ***************/   
            // 날짜 타입 패턴 목록
            function getCommonCode(value) {
                DataService.httpPost("/common/getCommonCode", {type: value}, function(data){                
                    if (data == null || data.data == null)
                        return;
                    vm.patternList = data.data;
                });
            } 

            // System Service Data create
            function insertSystemSvcData() {                
                DataService.httpPost("/data/hdfs/config/insertSystemSvcData", vm.systemSvcDataDetail, function(result) {
                    if (result.result === 1 && result.data !== null) {
                        getSystemSvcView();
                        closeServiceConfigDataPopup();
                    }
                });
            }

            // System Service Data update
            function updateSystemSvcData() {                
                DataService.httpPost("/data/hdfs/config/updateSystemSvcData", vm.systemSvcDataDetail, function(result) {
                    if (result.result === 1 && result.data !== null) {
                        getSystemSvcView();
                        closeServiceConfigDataPopup();
                    }
                });
            }

            // System Service Data delete
            function deleteSystemSvcData(param) {                
                DataService.httpPost("/data/hdfs/config/deleteSystemSvcData", param, function(result) {
                    if (result.result === 1 && result.data !== null) {
                        getSystemSvcView();
                        closeServiceConfigDataPopup();
                    }
                });
            }

            function onSaveSystemSvcData() {               
                if(vm.systemSvcDataDetail.dataType == '') {
                    alert("Input Data Name, please.");
                    return;
                }

                if(vm.systemSvcDataDetail.hdfsPath == '') {
                    alert("Input HDFS Path, please.");
                    return;
                }

                if(vm.systemSvcSelected.procType == 'DATE' && vm.systemSvcDataDetail.repFmt == '') {
                    alert("Select Date Type, please.");
                    return;
                }

                if(vm.data_cmd == 'ADD') {
                    insertSystemSvcData();
                }else if(vm.data_cmd == 'EDT') {
                    updateSystemSvcData();
                }
            }

            function onUpdateSystemSvcData(event, data) {   
                vm.data_cmd = 'EDT';
                vm.systemSvcDataDetail = data.data;
                openServiceConfigDataPopup();
            }

            function onDeleteSystemSvcData(event, data) {                
                if (!confirm("Do you want to Delete?")) {
                    return;
                }
                var param = data;
                deleteSystemSvcData(param);
            }
 
            
            /*************** System Service Data정보 End ***************/  

            

            // dataType 등록팝업
            function openServiceConfigDataPopup() {

                if(!vm.systemSvcSelected) {
                    alert("Select Service Name, please.")
                    return;
                }

                vm.systemSvcDataDetail.svcId = vm.systemSvcSelected.svcId;

                vm.systemSvcDataPopup = ngDialog.open({
                    template: "/data/hdfs/popup/service_config_data_popup_template.html",
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

                var closer = $rootScope.$on('ngDialog.destroy', function (e, id) {
                    if (id != popup.id) return;
                    closer();
                });

            }

            function closeServiceConfigDataPopup() {
                vm.systemSvcDataPopup.close();
                svcDataReset();
            }

            function closeThisDialog() {
                ngDialog.closeAll();
            };
            

            function addEventListener() {
                 unbind = [                   
                    $scope.$on(ConfigManager.getEvent("GRID_DELETE_BTN_SVC_EVENT"), onDeleteSystemSvc),
                    $scope.$on(ConfigManager.getEvent("GRID_EDIT_BTN_SVC_EVENT"), onUpdateSystemSvc),
                    $scope.$on(ConfigManager.getEvent("GRID_DELETE_BTN_EVENT"), onDeleteSystemSvcData),
                    $scope.$on(ConfigManager.getEvent("GRID_EDIT_BTN_EVENT"), onUpdateSystemSvcData)                   
                ];
            };
            

            function svcDataReset() {
                vm.data_cmd = 'ADD';
                vm.systemSvcDataDetail = {
                    svcId: '',                 
                    cluster: vm.searchInfo.cluster,
                    procType: vm.searchInfo.procType,
                    dataType: '',
                    hdfsPath: '',
                    repFmt: ''
                }
            }
            function svcReset() {
                vm.cmd = 'ADD';
                vm.systemSvcDetail = {   
                    svcId: '',                 
                    cluster: vm.searchInfo.cluster,
                    procType: vm.searchInfo.procType,
                    svcName: '',                   
                    useType: 'N',
                    orderSeq: ''
                }    
                vm.systemSvcSelectedIndex = '';               
                vm.systemSvcList = [];  
                vm.systemSvcInfo = {}; 
                vm.systemSvcDataList = [];              
               
                svcDataReset();
            }

            function initData() {   
                vm.searchInfo = {
                    cluster: ConfigManager.getSystemName(),
                    procType: $scope.ngDialogData.procType,
                    svcId: ''
                }
                // vm.systemSvcList = [];  
                // vm.systemSvcDataList = [];  
                // vm.systemSvcInfo = {};  
                vm.patternList = [];

                svcReset();       
            };

            function initialize() {
               
                vm.getSystemSvcList = getSystemSvcList;
                vm.onSystemSvcClickHandler = onSystemSvcClickHandler;
                vm.onSaveSystemSvc = onSaveSystemSvc;                
                vm.onSaveSystemSvcData = onSaveSystemSvcData;
                vm.closeThisDialog = closeThisDialog;

                vm.openServiceConfigPopup = openServiceConfigPopup;
                vm.closeServiceConfigPopup = closeServiceConfigPopup;
                vm.openServiceConfigDataPopup = openServiceConfigDataPopup;
                vm.closeServiceConfigDataPopup = closeServiceConfigDataPopup;

                addEventListener();
                initData();

                getSystemSvcList();
                getCommonCode('RETENTION_PATTERN_TYPE');
             
            };

            initialize();
        }
    ]);

});