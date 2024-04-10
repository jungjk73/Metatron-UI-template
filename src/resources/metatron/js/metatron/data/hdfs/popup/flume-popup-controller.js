define(["app", "moment"], function(app, moment) {
    app.controller("FlumePopupCtrl", ["$rootScope", "$scope", "$interval", "$timeout", "DataService", "ConfigManager", "GridRenderer", "ngDialog", 'CommonUtil',
        function($rootScope, $scope, $interval, $timeout, DataService, ConfigManager, GridRenderer, ngDialog, CommonUtil) {
            "use strict";

            let flumePopupCtrl = this;
            let loader = true;           
            let unbind = [];            


            // 그룹정보  목록
            function getConfigGroupList() {
                DataService.httpPost("/data/hdfs/flume/getConfigGroupList", flumePopupCtrl.searchInfo, function(result) {
                    if (result.result === 1 && result.data !== null) {
                        flumePopupCtrl.dataDetail.groupList = result.data;
                        if (flumePopupCtrl.configGroupSelected !== undefined) {
                            flumePopupCtrl.configGroupSelectedIndex = _.findIndex(flumePopupCtrl.dataDetail.groupList, { groupId: flumePopupCtrl.configGroupSelected.groupId })+'';                            
                        }
                    }
                });
            }


            // data type 목록
            function getUnSelectedDataTypeList() {
                DataService.httpPost("/data/hdfs/flume/getUnSelectedDataTypeList", flumePopupCtrl.searchInfo, function(result) {
                    if (result.result === 1 && result.data !== null) {
                        flumePopupCtrl.dataDetail.unSelectedDataTypes = result.data;
                    }
                });
            }

            // 설정정보 상세보기
            function getConfigView(groupId) {
                var param = {
                    cluster: flumePopupCtrl.searchInfo.cluster,
                    procType: flumePopupCtrl.searchInfo.procType,
                    groupId: groupId
                }
                DataService.httpPost("/data/hdfs/flume/getConfigView", param, function(result) {
                    if (result.result === 1 && result.data !== null) {
                        flumePopupCtrl.dataDetail.configInfo = result.data;

                        var rules = angular.copy(flumePopupCtrl.dataDetail.configInfo.rules);
                        _.each(flumePopupCtrl.configRuleInfos, function(item, i) {
                            var obj = _.findWhere(rules, { configType: item.configType });
                            if (obj !== undefined) {
                                item.chk = true;
                                item.configValue = obj.configValue;
                                item.configCollecHour = obj.configCollecHour;
                            }
                        });
                    }
                });
            }


            // 설정정보 등록           
            function insertConfig(param) {
                DataService.httpPost("/data/hdfs/flume/insertConfig", param, function(result) {
                    if (result.result === 1 && result.data !== null) {
                        if (result.errorMessage !== '') {
                            alert(result.errorMessage)
                        } else {
                            configResetForm();
                        }

                    }
                });
            }

            // 설정정보 수정           
            function updateConfig(param) {
                DataService.httpPost("/data/hdfs/flume/updateConfig", param, function(result) {
                    if (result.result === 1 && result.data !== null) {
                        if (result.errorMessage !== '') {
                            alert(result.errorMessage)
                        } else {
                            getConfigGroupList();
                            getUnSelectedDataTypeList();
                            getConfigView(param.groupId);
                        }
                    }
                });
            }

            // 설정정보 삭제          
            function deleteConfig(param) {
                DataService.httpPost("/data/hdfs/flume/deleteConfig", param, function(result) {
                    if (result.result === 1 && result.data !== null) {
                        configResetForm();
                    }
                });
            }

            
            function configResetForm() {
                dataDetailReset();
                getConfigGroupList();
                getUnSelectedDataTypeList();
            };

            function onConfigGroupClickHandler(selected) {
                if (selected.length > 0 && flumePopupCtrl.cmd !== 'DEL') {
                    flumePopupCtrl.cmd = 'EDIT';
                    configRuleInfosReset();
                    flumePopupCtrl.configGroupSelected = angular.copy(selected[0].data);
                    getUnSelectedDataTypeList();
                    getConfigView(flumePopupCtrl.configGroupSelected.groupId);
                }
            };

            function toggleSelect(item) {
                item.select = !item.select;
            };

            function passToSelect() {
                for (var i = 0; i < flumePopupCtrl.dataDetail.unSelectedDataTypes.length; i++) {
                    var item = angular.copy(flumePopupCtrl.dataDetail.unSelectedDataTypes[i]);
                    if (item.select) {
                        item.select = false;
                        flumePopupCtrl.dataDetail.configInfo.dataTypes.push(item);
                        flumePopupCtrl.dataDetail.unSelectedDataTypes.splice(i, 1);
                        i--;
                    }
                }

            };

            function passToTarget() {
                for (var i = 0; i < flumePopupCtrl.dataDetail.configInfo.dataTypes.length; i++) {
                    var item = angular.copy(flumePopupCtrl.dataDetail.configInfo.dataTypes[i]);
                    if (item.select) {
                        item.select = false;
                        flumePopupCtrl.dataDetail.unSelectedDataTypes.push(item);
                        flumePopupCtrl.dataDetail.configInfo.dataTypes.splice(i, 1);
                        i--;
                    }
                }
            };

            function changeConfigValueHandler(event, i, k) {
                if (i === 1) {

                    var preV = flumePopupCtrl.configRuleInfos[i].configValue.split(':');
                    var hour = preV[0];
                    var min = preV[1];

                    if (k === 0) {
                        hour = event.value;
                    } else if (k === 1) {
                        min = event.value;
                    }

                    if (parseInt(min) > 30) {
                        flumePopupCtrl.configRuleInfos[i].configCollecHour = addZero(parseInt(hour) + 1);
                    } else {
                        flumePopupCtrl.configRuleInfos[i].configCollecHour = addZero(parseInt(hour));
                    }

                    flumePopupCtrl.configRuleInfos[i].configValue = hour + ':' + min;
                } else {
                    flumePopupCtrl.configRuleInfos[i].configValue = event.value;
                }
            };

            function onSaveProcessHandler() {
                if (flumePopupCtrl.dataDetail.configInfo.groupName === '') {
                    alert("Input Group Name, please.");
                    return;
                }

                if (flumePopupCtrl.dataDetail.configInfo.dataTypes.length === 0) {
                    alert("Select Data Name, please.")
                    return;
                }

                var rules = angular.copy(_.where(flumePopupCtrl.configRuleInfos, { chk: true }));
                if (rules.length === 0) {
                    alert("Select rules. please.");
                    return;
                }

                if (_.findWhere(rules, { configType: 'FIN' }) !== undefined) {

                    if (rules.length > 1) {
                        alert("Only one Rule is selectable.")
                        return;
                    }
                    if (flumePopupCtrl.dataDetail.configInfo.dataTypes.length > 1) {
                        alert("Only one Data Name is selectable.")
                        return;
                    }
                }

                var agentNameRule = _.findWhere(rules, { configType: 'AGENTNAME' });
                if (agentNameRule !== undefined && agentNameRule.configValue == '') {
                    alert("Input Agent Name, please.");
                    return;
                }

                flumePopupCtrl.dataDetail.configInfo.rules = rules;

                var param = angular.copy(flumePopupCtrl.dataDetail.configInfo);

                param.procType = flumePopupCtrl.procType;

                if (flumePopupCtrl.cmd === 'ADD') {
                    insertConfig(param);
                } else {
                    updateConfig(param);
                }

            };

            function onDeleteProcessHandler(event, data) {
                if (!confirm("Do you want to Delete?")) {
                    return;
                }

                flumePopupCtrl.cmd = 'DEL';
                var param = {
                    cluster: flumePopupCtrl.searchInfo.cluster,
                    procType: flumePopupCtrl.procType,
                    groupId: data.groupId
                }
                deleteConfig(param);
            };


            /****************** DataType 추가, 삭제 ***********************/
            // SVC 목록
            function getSvcList() {
                DataService.httpPost("/data/hdfs/flume/getSvcList", flumePopupCtrl.searchInfo, function(result) {
                    if (result.result === 1 && result.data !== null) {
                        flumePopupCtrl.svcList = result.data;
                    }
                });
            }

            // dataType 등록           
            function insertSvcDataType(param) {
                DataService.httpPost("/data/hdfs/flume/insertSvcDataType", param, function(result) {
                    if (result.result === 1 && result.data !== null) {
                       closeDataTypeDialog();
                    }
                });
            }

            // dataType 삭제
            function deleteSvcDataType(param) {
                DataService.httpPost("/data/hdfs/flume/deleteSvcDataType", param, function(result) {
                    if (result.result === 1 && result.data !== null) {
                        getUnSelectedDataTypeList();
                    }
                });
            }           

            // dataType 등록폼
            function insertSvcDataTypeForm() {
                var param = flumePopupCtrl.dataTypeForm;               

                if (param.svcId === '') {
                    alert("Select Svc Id, please.");
                    return;
                }

                if (param.dataType === '') {
                    alert("Input  Data Name, please.");
                    return;
                }

                if (param.hdfsPath === '') {
                    alert("Input Data Path, please.");
                    return;
                }

                insertSvcDataType(param);
            }
            
            // dataType 등록팝업
            function insertSvcDataTypePopup() {
                getSvcList();

                flumePopupCtrl.dataTypePopup = ngDialog.open({
                    template: "/data/hdfs/popup/flume_datatype_popup_template.html",
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

            // dataType 삭제폼
            function deleteSvcDataTypeForm() {
                var params = [];

                for (var i = 0; i < flumePopupCtrl.dataDetail.unSelectedDataTypes.length; i++) {
                    var item = angular.copy(flumePopupCtrl.dataDetail.unSelectedDataTypes[i]);
                    if (item.select) {                        
                        params.push(item);
                    }
                }

                if (params.length === 0) {
                    alert("Select Data Name, please.")
                    return;
                }

                if (!confirm("Do you want to Delete?")) {
                    return;
                }


                deleteSvcDataType(params);
            }

            function changeValueHandler(event) {
                flumePopupCtrl.dataTypeForm.svcId = event.svcId;
            }

            
            function closeDataTypeDialog() {
                flumePopupCtrl.dataTypePopup.close();
                 flumePopupCtrl.dataTypeForm = {
                    cluster: flumePopupCtrl.searchInfo.cluster,
                    procType: flumePopupCtrl.procType,
                    svcId: '',
                    dataType: '',
                    hdfsPath: '',
                    repFmt: ''
                }
                getUnSelectedDataTypeList();
            };
            /****************** DataType 추가, 삭제 끝  ***********************/
            
            // 날짜 타입 패턴 목록
            function getCommonCode(value) {
                DataService.httpPost("/common/getCommonCode", {type: value}, function(data){                
                    if (data == null || data.data == null)
                        return;
                    flumePopupCtrl.patternList = data.data;
                });
            } 

            function configRuleInfosReset() {
                flumePopupCtrl.configRuleInfos = [
                    { chk: false, configType: 'FIN', configValue: '00', configCollecHour: '*' },
                    { chk: false, configType: 'META', configValue: '00:00', configCollecHour: '00' },
                    { chk: false, configType: 'HOURLY', configValue: '', configCollecHour: '*' },
                    { chk: false, configType: 'COUNTDIFFER', configValue: '1', configCollecHour: '*' },
                    { chk: false, configType: 'SIZEDIFFER', configValue: '1', configCollecHour: '*' },
                    { chk: false, configType: 'AGENTNAME', configValue: '', configCollecHour: '*' },
                    { chk: false, configType: 'DELAYED', configValue: '00', configCollecHour: '*' },
                    { chk: false, configType: 'SIZEUNDER', configValue: '1', configCollecHour: '*' },
                    { chk: false, configType: 'SIZEOVER', configValue: '1', configCollecHour: '*' },
                    { chk: false, configType: 'BYTESUNDER', configValue: '1', configCollecHour: '*' },
                ];
            };


            function dataDetailReset() {
                flumePopupCtrl.cmd = 'ADD';
                flumePopupCtrl.configGroupSelected = undefined;
                flumePopupCtrl.configGroupSelectedIndex = '';
                configRuleInfosReset();
                flumePopupCtrl.dataDetail = {
                    groupList: [],
                    unSelectedDataTypes: [],
                    configInfo: {
                        cluster: flumePopupCtrl.searchInfo.cluster,
                        groupId: '',
                        groupName: '',
                        rules: [],
                        dataTypes: []
                    }
                }
                flumePopupCtrl.svcList = [];
                flumePopupCtrl.dataTypeForm = {
                    cluster: flumePopupCtrl.searchInfo.cluster,
                    procType: flumePopupCtrl.procType,
                    svcId: '',
                    dataType: '',
                    hdfsPath: '',
                    repFmt: ''
                }
            };

            // 데이타 정보 리셋
            function reset() {
                flumePopupCtrl.cmd = 'ADD';                
                flumePopupCtrl.searchInfo = {
                    cluster: ConfigManager.getSystemName(),
                    procType: flumePopupCtrl.procType
                };

                dataDetailReset();
            };


            function addZero(i) {
                if (i < 10) {
                    i = "0" + i;
                }
                return i;
            };

            function makeArrayList(s, e, d, u) {
                var arr = [];
                for (var i = s; i < e; i++) {
                    var text = '',
                        value = '';
                    if (d) {
                        text = addZero(i);
                        value = addZero(i);
                    } else {
                        text = i + '';
                        value = i + '';
                    }
                    text += u;
                    var obj = { text: text, value: value };
                    arr.push(obj);
                }
                return arr;
            };

            function closeThisDialog() {
                ngDialog.closeAll();
            };
            

            function addEventListener() {
                unbind = [                   
                    $scope.$on(ConfigManager.getEvent("GRID_DELETE_BTN_EVENT"), onDeleteProcessHandler),
                ];
            };

            function initialize() {
                
                flumePopupCtrl.procType = $scope.ngDialogData.procType;
                flumePopupCtrl.closeThisDialog = closeThisDialog;
                flumePopupCtrl.configResetForm = configResetForm;
                flumePopupCtrl.onConfigGroupClickHandler = onConfigGroupClickHandler;
                flumePopupCtrl.toggleSelect = toggleSelect;
                flumePopupCtrl.passToSelect = passToSelect;
                flumePopupCtrl.passToTarget = passToTarget;
                flumePopupCtrl.onSaveProcessHandler = onSaveProcessHandler;
                flumePopupCtrl.changeConfigValueHandler = changeConfigValueHandler;
                flumePopupCtrl.onDeleteProcessHandler = onDeleteProcessHandler;

                flumePopupCtrl.hours = makeArrayList(0, 24, true, '시');
                flumePopupCtrl.minutes = makeArrayList(0, 60, true, '분');
                flumePopupCtrl.percentages = makeArrayList(1, 101, false, '%');      

                flumePopupCtrl.insertSvcDataTypePopup = insertSvcDataTypePopup;   
                flumePopupCtrl.insertSvcDataTypeForm = insertSvcDataTypeForm;                
                flumePopupCtrl.deleteSvcDataTypeForm = deleteSvcDataTypeForm;
                flumePopupCtrl.changeValueHandler = changeValueHandler;
                flumePopupCtrl.closeDataTypeDialog = closeDataTypeDialog;

                flumePopupCtrl.patternList = [];

                addEventListener();
                reset();

                if($scope.data !== undefined) {
                    flumePopupCtrl.configGroupSelected = {
                        groupId: $scope.data.groupId
                    }
                }

                getConfigGroupList();
                getUnSelectedDataTypeList();
                
                getCommonCode('RETENTION_PATTERN_TYPE');
            };

            initialize();
        }
    ]);

});