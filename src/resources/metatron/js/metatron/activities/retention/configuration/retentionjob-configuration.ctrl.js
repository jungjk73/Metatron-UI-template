define(["app", "moment"], function (app, moment) {
    app.controller("RetentionjobConfigurationCtrl", ["$rootScope", "$scope", "$http",
        "$timeout", "$controller", "ConfigManager",
        "DataService", "CommonUtil", "ngDialog",
        "RetentionjobConfigurationService", "RetentionjobConfigurationQueryGeneratorService",
        function ($rootScope, $scope, $http,
                  $timeout, $controller, ConfigManager,
                  DataService, CommonUtil, ngDialog,
                  RetentionjobConfigurationService, RetentionjobConfigurationQueryGeneratorService) {
            "use strict";

            let unbind = [];

            $scope.initial = function () {
                
                $scope.selectedRetentionjobConfigs = [];
                $scope.retentionjobConfig = {};

                $scope.executeRole = {
                    jobGroupCount: 0,
                    jobSleepSecond: 0
                };

                $scope.dataTypeOptions = [  
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

                 $scope.deleteRoleOptions = [
                    {label: '>', value: '>'},
                    {label: '<', value: '<'},
                    {label: '>=', value: '>='},
                    {label: '<=', value: '<='},
                    {label: '==', value: '=='}
                ];
                 
                getCommonCode('RETENTION_PATTERN_TYPE');

                $scope.retentionjobConfigList = [];
                $scope.csvSampleHeader = [
                    "JOB_NAME"
                    , "DATA_TYPE"
                    , "EXEC_MIN"
                    , "EXEC_HOUR"
                    , "EXEC_DAY"
                    , "EXEC_YEAR"
                    , "HOST"
                    , "LOGIN_ID"
                    , "LOGIN_PASSWD"
                    , "RETENTION_PERIOD"
                    , "INPUT_CMD"
                    , "EXTERNAL_CMD"
                ];
              
                addEventListener();

                $scope.reset();

                $timeout(function() {
                    $scope.sDateTime = moment().subtract(7, 'days').local().format('YYYY-MM-DD HH:mm');
                    $scope.eDateTime = moment().format('YYYY-MM-DD HH:mm');
                    $scope.params.regDateStartFilter = $scope.sDateTime;
                    $scope.params.regDateEndFilter = $scope.eDateTime;

                    if ($scope.params.regDateStartFilter && $scope.params.regDateEndFilter) {
                        $scope.getRetentionjobConfigList();
                    }
                });


                
                $scope.grid = {
                    total: 0,
                    retentionjobConfigs: []
                }
              
                $scope.$on('ngDialog.opened', function (e, $dialog) {
                  $(".ngdialog").draggable({
                    handle: ".ngdialog-content"
                  });
                });
                // $scope.addConfig();
            };


            $scope.initConfigForm = function () {

                $scope.retentionjobConfig = {
                    jobId: '',
                    jobName: '',
                    dataType: 'Hive',
                    hiveType: 'M',
                    makeMethod: 'direct',
                    execMin: '',
                    execHour: '',
                    execDay: '',
                    execMonth: '',
                    execYear: '',

                    cmdInputCmd: '',
                    cmdHiveExternalCmd: '',
                    cmdHiveExternalExecCmd: '',
                    cmdExecCmd: '',
                    cmdHost: '',
                    cmdLoginId: '',
                    cmdLoginPasswd: '',
                    cmdRetentionPeriod: '',
                    cmdHostType: 'IP',

                    isSaveAs: false
                };

                $scope.queryTool = {
                    dbTableName: '',
                    partitionCount: 1,
                    deleteRole: '',
                    retentionjobPatterns: [{
                        patternId: '#A',
                        partitionName: '',
                        patternName: '',
                        retentionPeriod: 1
                    }]
                };

                $scope.previewQuery = '';
                $scope.previewHiveExternalCmd = '';

                $scope.partitionCountOptions = [];
                for (var i = 0; i < 10; i++) {
                    $scope.partitionCountOptions.push({label: i + 1, value: i + 1});
                }

               

                $scope.isGenerate = false; 
                $scope.isCmdRetentionPeriod = true;
                $scope.queryTool.retentionjobPatternsTemp = [];                
                makeInputCmdLabel('Hive');

            };

            $scope.initFilter = function() {
                $scope.sDateTime = moment().subtract(7, 'days').local().format('YYYY-MM-DD HH:mm');
                $scope.eDateTime = moment().format('YYYY-MM-DD HH:mm');
                $scope.params.regDateStartFilter = $scope.sDateTime;
                $scope.reset();
            }

            $scope.reset = function () {               
                $scope.params = {
                    dataTypeFilter: ['Hive','HDFS','LogFile'],
                    regDateStartFilter: $scope.sDateTime, 
                    regDateEndFilter: $scope.eDateTime,
                    searchCondition: '',
                    searchTextValue: '',
                    hostFilter: '',
                    loginIdFilter: '',
                    jobIdNameFilter: '',
                    retentionPeriodFilter: '',
                    startIndex: '0',                    
                    pageSize: '30',
                    page: 0,
                    searchDateChk: false                              
                };
                $scope.checkedDataTypes = ['All'];
               
            };

            function getCommonCode(value) {
                DataService.httpPost("/common/getCommonCode", {type: value}, function(data){                
                    if (data == null || data.data == null)
                        return;
                    $scope.patternList = data.data;
                });
            }

            $scope.getRetentionjobConfigList = function () {
                if($scope.params.searchDateChk) {
                    $scope.params.regDateStartFilter = $scope.sDateTime;
                    $scope.params.regDateEndFilter = $scope.eDateTime; 
                }else {
                    $scope.params.regDateStartFilter = '';
                    $scope.params.regDateEndFilter = ''; 
                }
                RetentionjobConfigurationService.getRetentionjobConfigList($scope.params)
                    .then(function (retentionjobConfigs) {
                        $scope.grid.total = retentionjobConfigs.total;
                        $scope.grid.retentionjobConfigs = _.sortBy(retentionjobConfigs.list, 'regDate').reverse();
                        console.debug($scope.retentionjobConfigs);
                    });
            };

            $scope.getRetentionjobConfig = function (jobId) {
                RetentionjobConfigurationService.getRetentionjobConfig(jobId).then(function (result) {
                    $scope.editConfig(result);                   
                });
            };

            // Data Type 조건 변경
           $scope.onCheckedDataTypeHandler = function(event, dataTypes) {              
               $scope.params.dataTypeFilter = dataTypes;
              // $scope.search();
            }


            // 날짜 조건 변경
            $scope.changeDateHandler = function(event) {
                if(event.sDateTime.indexOf('undefined') == -1){
                    $scope.params.regDateStartFilter = event.sDateTime;
                    $scope.params.regDateEndFilter = event.eDateTime; 
                }
                              
            };
           

            $scope.search = function () {    

                if (!CommonUtil.validateStartEndDate($scope.sDateTime, $scope.eDateTime))
                    return;                  
                
                $scope.params.startIndex = 0;
                $scope.params.page = 0;
               
                $scope.getRetentionjobConfigList();
            };

            // Page 이동
            function goToPage(event, message) {  
                $scope.params.pageSize = message.perPage;           
                $scope.params.startIndex = message.startRow;
                $scope.getRetentionjobConfigList();

            }

            function addEventListener() {
                unbind = [                   
                    $scope.$on("retentionConfigurationGrid:goToPage", goToPage)                   
                ];
            }


            $scope.createConfig = function () {             

                $scope.popHeight = "580px";
                $scope.initConfigForm();

                var popup = ngDialog.open({
                    template: "/activities/retention/configuration/popup/retentionjob_configuration_save_popup.html",
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

            };

            $scope.clickedRow = function (rows) {

                $timeout(function () {
                    $scope.selectedRetentionjobConfigs = [];
                    for (var i = 0; i < rows.length; i++) {
                        $scope.selectedRetentionjobConfigs.push(rows[i].data);
                    }
                    console.debug($scope.selectedRetentionjobConfigs);
                });
                // $scope.$apply();
            };

            $scope.doubleClickedRow = function (event) {
                console.log("event" + event);
                if(event !== undefined) {
                    $scope.initConfigForm();
                    $scope.getRetentionjobConfig(event.data.jobId);
                }               
            };


            $scope.editConfig = function (data) {
              
                if (data == undefined) return false;
                var configRow = data;

                console.debug(configRow);

                $scope.retentionjobConfig = configRow;                

                $scope.queryTool = {
                    dbTableName: '',
                    partitionCount: 1,
                    deleteRole: '',
                    retentionjobPatterns: [{
                        patternId: '#A',
                        partitionName: '',
                        patternName: '',
                        retentionPeriod: 1
                    }]
                };   
                
                var chk = 0;
                var retentionjobCmds = $scope.retentionjobConfig.retentionjobCmds;
                for(var i=0;i<retentionjobCmds.length;i++) {
                    var patternLength = retentionjobCmds[i].retentionjobPatterns.length;
                    if(patternLength > 0) {
                        $scope.queryTool.partitionCount = patternLength;
                        $scope.queryTool.retentionjobPatterns = retentionjobCmds[i].retentionjobPatterns;
                        $scope.queryTool.retentionjobPatternsTemp = retentionjobCmds[i].retentionjobPatterns;
                        $scope.retentionjobConfig.makeMethod = 'tool';
                        chk++;
                    }else {
                        $scope.retentionjobConfig.makeMethod = 'direct';
                        $scope.queryTool.partitionCount = 1;
                    }
                }

                if(chk > 0) {
                    $scope.isCmdRetentionPeriod = false;                       
                }else {
                    $scope.isCmdRetentionPeriod = true;
                   
                }          

                //cmd 1
                if (configRow.retentionjobCmds.length > 0) {
                    var retentionjobCmd = configRow.retentionjobCmds[0];
                    $scope.retentionjobConfig.cmdInputCmd = retentionjobCmd.inputCmd;
                    $scope.retentionjobConfig.cmdExecCmd = retentionjobCmd.execCmd;
                    $scope.retentionjobConfig.cmdHost = retentionjobCmd.host;
                    $scope.retentionjobConfig.cmdLoginId = retentionjobCmd.loginId;
                    $scope.retentionjobConfig.cmdLoginPasswd = retentionjobCmd.loginPasswd;
                    $scope.retentionjobConfig.cmdRetentionPeriod = retentionjobCmd.retentionPeriod;
                    $scope.queryTool.dbTableName = retentionjobCmd.dbTableName || '';
                    $scope.queryTool.deleteRole = retentionjobCmd.deleteRole || '';
                }
                
                if (configRow.retentionjobCmds.length > 1) {
                    var retentionjobCmd = configRow.retentionjobCmds[1];
                    $scope.retentionjobConfig.cmdHiveExternalCmd = retentionjobCmd.inputCmd;
                    $scope.retentionjobConfig.cmdHiveExternalExecCmd = retentionjobCmd.execCmd;
                }

                if ($scope.retentionjobConfig.cmdHost.match(CommonUtil.REGEXP_IP) == null) {
                    $scope.retentionjobConfig.cmdHostType = 'HostName';
                }else {
                    $scope.retentionjobConfig.cmdHostType = 'IP';
                }

                makeInputCmdLabel(data.dataType);

                $scope.popHeight = "580px";

                var popup = ngDialog.open({
                    template: "/activities/retention/configuration/popup/retentionjob_configuration_save_popup.html",
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

            };

            $scope.previewQueryDetailValid = function () {
                if (!$scope.queryTool.dbTableName) {
                    alert('DB TABLE 명이 없습니다.');
                    return false;
                }
                var arr = $scope.queryTool.dbTableName.split('.');
                if (arr.length !== 2 || !arr[0].trim() || !arr[1].trim()) {
                    alert('DB TABLE 명이 잘못되었습니다.');
                    return false;
                }
                var exist = true;

                if($scope.retentionjobConfig.dataType == 'Hive' && $scope.retentionjobConfig.hiveType == 'E' && $scope.retentionjobConfig.makeMethod == 'tool') {
                    if($scope.queryTool.retentionjobPatterns.length != 1) {
                        alert("Hive Type이 External인 경우 파티션 정보는 하나만 등록 가능합니다.");
                        return false;
                    }
                }

                for (var i = 0; i < $scope.queryTool.retentionjobPatterns.length; i++) {
                    if (!$scope.queryTool.retentionjobPatterns[i].partitionName
                        || !$scope.queryTool.retentionjobPatterns[i].patternName
                        || !$scope.queryTool.retentionjobPatterns[i].retentionPeriod) {
                        exist = false;
                    }
                }
                if (!exist) {
                    alert('파티션 정보가 잘못되었습니다.');
                    return false;
                }
                return true;
            };

            $scope.openPreviewQueryDetail = function () {

                if (!$scope.previewQueryDetailValid()) {
                    return false;
                }

                $scope.isGenerate = true;

                $scope.popHeight = "600px";

                $scope.previewQuery = RetentionjobConfigurationQueryGeneratorService.hiveQueryGenerator($scope.queryTool.dbTableName, $scope.queryTool.deleteRole, $scope.queryTool.retentionjobPatterns);

                if ($scope.retentionjobConfig.hiveType === 'E') {
                    if($scope.retentionjobConfig.makeMethod == 'tool') {
                        $scope.previewHiveExternalCmd = RetentionjobConfigurationQueryGeneratorService.hiveExternalCmdToolGenerator($scope.queryTool.dbTableName, $scope.queryTool.deleteRole, $scope.queryTool.retentionjobPatterns);
                    }else if($scope.retentionjobConfig.makeMethod == 'direct') {
                        $scope.previewHiveExternalCmd = RetentionjobConfigurationQueryGeneratorService.hiveExternalCmdDirectGenerator($scope.retentionjobConfig.cmdHiveExternalCmd);
                    }
                    
                }

                var popup = ngDialog.open({
                    template: "/activities/retention/configuration/popup/retentionjob_configuration_query_preview_popup.html",
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

            };

            $scope.insertPreviewQuery = function () {
                $scope.retentionjobConfig.cmdInputCmd = $scope.previewQuery;
                $scope.retentionjobConfig.cmdHiveExternalCmd = $scope.previewHiveExternalCmd;
                $scope.retentionjobConfig.cmdHiveExternalExecCmd = $scope.previewHiveExternalCmd;
            };

            // $scope.$watch('retentionjobConfig.cmdInputCmd', function (newValue, oldValue) {            
            //     //make exec cmd
            //     if ($scope.retentionjobConfig.dataType === 'Hive') {
            //         newValue = 'hadoop -e ' + newValue;
            //     }

            //     $scope.retentionjobConfig.cmdExecCmd = newValue;

            // });

            $scope.chooseDataType = function (dataType) {
                $scope.isGenerate = false; 

                $scope.retentionjobConfig.cmdInputCmd = '';
                $scope.retentionjobConfig.cmdExecCmd = '';
                $scope.retentionjobConfig.cmdHiveExternalCmd = '';
                $scope.retentionjobConfig.cmdHiveExternalExecCmd = '';
                $scope.retentionjobConfig.hiveType = 'M';
                $scope.retentionjobConfig.makeMethod = 'direct';

                makeInputCmdLabel(dataType);

            };

            $scope.chooseHiveType = function () {
                $scope.isGenerate = false; 
                makeInputCmdLabel($scope.retentionjobConfig.dataType);
            };

            $scope.chooseMakeMethodType = function () {
                $scope.isGenerate = false; 
                makeInputCmdLabel($scope.retentionjobConfig.dataType);
            };

            $scope.addRemovePartitons = function(cmd, index) {
                $scope.isGenerate = false;   
                if(cmd == 'ADD') {
                    if($scope.retentionjobConfig.dataType == 'Hive' && $scope.retentionjobConfig.hiveType == 'E') 
                        return false;

                    $scope.queryTool.partitionCount++;
                    addRetentionjobPatterns(1);
                }else if(cmd == 'REMOVE') {
                    if($scope.queryTool.partitionCount == 1) return;
                    $scope.queryTool.retentionjobPatterns.splice(index, 1);
                    $scope.queryTool.partitionCount--;
                }                

                _.each($scope.queryTool.retentionjobPatterns, function(item, index){
                    item.patternId = '#' + String.fromCharCode(65+index);
                })
            }

            function addRetentionjobPatterns(count) {                
                for (var i = 0; i < count; i++) {
                    $scope.queryTool.retentionjobPatterns.push(
                        {
                            patternId: '',
                            partitionName: '',
                            patternName: '',
                            retentionPeriod: 1
                         }
                    );
                }
            }

            function makeInputCmdLabel(dataType) {
                $scope.queryExternalLabel = '';
                if (dataType === 'Hive') {
                    $scope.queryInputLabel = {
                        title: 'Query',
                        addQuery: 'hive -e'
                    }
                    if($scope.retentionjobConfig.makeMethod == 'direct') {
                        $scope.queryExternalLabel = 'hadoop dfs -rm -r';
                    }
                    
                } else if (dataType === 'HDFS') {
                    $scope.queryInputLabel = {
                        title: 'HDFS Cmd',
                        addQuery: 'hadoop dfs -rm -r'
                    }
                } else if (dataType === 'LogFile') {
                    $scope.queryInputLabel = {
                        title: 'Host File',
                        addQuery: ''
                    }
                }
            }

            
            function containsCharsOnly(input,chars) {
                for (var inx = 0; inx < input.length; inx++) {
                   if (chars.indexOf(input.charAt(inx)) == -1)
                       return false;
                }
                return true;
            }

            $scope.formValid = function () {

                
                if (!$scope.retentionjobConfig.jobName) {
                    alert('작업명을 입력해주세요.');
                    return false;
                }

                if($scope.retentionjobConfig.dataType == 'Hive' && $scope.retentionjobConfig.hiveType == 'E' && $scope.retentionjobConfig.makeMethod == 'tool') {
                    if($scope.queryTool.retentionjobPatterns.length != 1) {
                        alert("Hive Type이 External인 경우 파티션 정보는 하나만 등록 가능합니다.");
                        return false;
                    }
                }

                if ($scope.retentionjobConfig.makeMethod === 'tool' && !$scope.isGenerate) {
                    alert("[Generate] 버튼을 클릭해주세요.");
                    return false;
                }

                if (!$scope.retentionjobConfig.cmdInputCmd) {
                    alert('명령어 정보가 없습니다.');
                    return false;
                }
                if (!$scope.retentionjobConfig.cmdHost
                    || !$scope.retentionjobConfig.cmdLoginId
                    || !$scope.retentionjobConfig.cmdLoginPasswd) {
                    alert('대상호스트 정보가 없습니다.');
                    return false;
                }

                if($scope.retentionjobConfig.cmdHostType == 'IP') {
                    if ($scope.retentionjobConfig.cmdHost.match(CommonUtil.REGEXP_IP) == null) {
                        alert("IP 정보가 잘못되었습니다");
                        return false;
                    }
                }


                
                if (!$scope.retentionjobConfig.execMin
                    || !$scope.retentionjobConfig.execHour
                    || !$scope.retentionjobConfig.execDay
                    || !$scope.retentionjobConfig.execYear) {
                    alert('실행주기 정보가 없습니다.');
                    return false;
                }

                var chars = "0123456789,-* "
                if(!containsCharsOnly($scope.retentionjobConfig.execMin,chars)) {
                    alert("실행주기 (분) 입력형식이 잘못되었습니다.");
                    return false;
                }

                if(!containsCharsOnly($scope.retentionjobConfig.execHour,chars)) {
                    alert("실행주기 (시) 입력형식이 잘못되었습니다.");
                    return false;
                }

                if(!containsCharsOnly($scope.retentionjobConfig.execDay,chars)) {
                    alert("실행주기 (일) 입력형식이 잘못되었습니다.");
                    return false;
                }

                if(!containsCharsOnly($scope.retentionjobConfig.execYear,chars)) {
                    alert("실행주기 (년) 입력형식이 잘못되었습니다.");
                    return false;
                }


                if ($scope.retentionjobConfig.hiveType === 'E' && !$scope.retentionjobConfig.cmdHiveExternalCmd) {
                    alert('HDFS 명령어 정보가 없습니다.');
                    return false;
                }
                
                return true;
            };

            $scope.saveAs = function() {
                $scope.retentionjobConfig.isSaveAs = true;
                $scope.saveConfigPreview();
            }

            $scope.saveConfigPreview = function (cmd) {

                if (!$scope.formValid()) {
                    return false;
                }

                if(cmd == 'ADD') $scope.retentionjobConfig.isSaveAs = false;

                var cmdInputCmd = '';
                if($scope.retentionjobConfig.dataType == 'Hive' && $scope.retentionjobConfig.makeMethod == 'tool') {
                    cmdInputCmd = $scope.previewQuery = RetentionjobConfigurationQueryGeneratorService.hiveQueryGenerator($scope.queryTool.dbTableName, $scope.queryTool.deleteRole, $scope.queryTool.retentionjobPatterns, 'exec');
                }else {
                    cmdInputCmd = $scope.retentionjobConfig.cmdInputCmd;
                }
                $scope.retentionjobConfig.cmdExecCmd = RetentionjobConfigurationQueryGeneratorService.queryGenerator($scope.retentionjobConfig.dataType, cmdInputCmd);



                if($scope.retentionjobConfig.dataType == 'Hive' && $scope.retentionjobConfig.hiveType == 'E' && $scope.retentionjobConfig.makeMethod == 'direct') {
                     $scope.retentionjobConfig.cmdHiveExternalExecCmd = RetentionjobConfigurationQueryGeneratorService.hiveExternalCmdDirectGenerator($scope.retentionjobConfig.cmdHiveExternalCmd);
                }                      



                var popup = ngDialog.open({
                    template: "/activities/retention/configuration/popup/retentionjob_configuration_save_preview_popup.html",
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

            };

            $scope.saveConfig = function () {
                if (!$scope.formValid()) {
                    return false;
                }
                var retentionjobCmds = [];


                retentionjobCmds.push({
                    host: $scope.retentionjobConfig.cmdHost,
                    execCmd: $scope.retentionjobConfig.cmdExecCmd,
                    inputCmd: $scope.retentionjobConfig.cmdInputCmd,
                    loginId: $scope.retentionjobConfig.cmdLoginId,
                    loginPasswd: $scope.retentionjobConfig.cmdLoginPasswd,
                    retentionPeriod: $scope.retentionjobConfig.cmdRetentionPeriod,
                    dbTableName: $scope.queryTool.dbTableName,
                    deleteRole: $scope.queryTool.deleteRole,
                    retentionjobPatterns: ($scope.retentionjobConfig.makeMethod === 'tool') ? $scope.queryTool.retentionjobPatterns : []
                });

                if ($scope.retentionjobConfig.cmdHiveExternalCmd) {
                    retentionjobCmds.push({
                        host: $scope.retentionjobConfig.cmdHost,
                        execCmd: $scope.retentionjobConfig.cmdHiveExternalExecCmd,
                        inputCmd: $scope.retentionjobConfig.cmdHiveExternalCmd,
                        loginId: $scope.retentionjobConfig.cmdLoginId,
                        loginPasswd: $scope.retentionjobConfig.cmdLoginPasswd,
                        retentionPeriod: $scope.retentionjobConfig.cmdRetentionPeriod,
                        dbTableName: $scope.queryTool.dbTableName,
                        deleteRole: $scope.queryTool.deleteRole,
                        retentionjobPatterns: ($scope.retentionjobConfig.makeMethod === 'tool') ? $scope.queryTool.retentionjobPatterns : []
                    });
                }

                $scope.retentionjobConfig.retentionjobCmds = retentionjobCmds;

                console.debug($scope.retentionjobConfig);
                console.debug($scope.queryTool);               

                if ($scope.retentionjobConfig.jobId && !$scope.retentionjobConfig.isSaveAs ) {
                    RetentionjobConfigurationService.updateRetentionjobConfig($scope.retentionjobConfig.jobId, $scope.retentionjobConfig)
                        .then(function (response) {
                            console.debug(response);
                            console.debug('수정되었습니다');
                            $scope.getRetentionjobConfigList();
                            ngDialog.closeAll();
                        });
                } else {
                    RetentionjobConfigurationService.addRetentionjobConfig($scope.retentionjobConfig)
                        .then(function (response) {
                            console.debug(response);
                            console.debug('저장되었습니다');
                            $scope.getRetentionjobConfigList();
                            ngDialog.closeAll();
                        });
                }

            };

            $scope.editExecuteRole = function () {

                RetentionjobConfigurationService.getExecuteRoleValue('job_group_count').then(function (value) {
                    $scope.executeRole.jobGroupCount = parseInt(value);
                });

                RetentionjobConfigurationService.getExecuteRoleValue('job_sleep_second').then(function (value) {
                    $scope.executeRole.jobSleepSecond = parseInt(value);
                });

                var popup = ngDialog.open({
                    template: "/activities/retention/configuration/popup/retentionjob_configuration_execute_role_popup.html",
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
            };

            $scope.saveExecuteRole = function () {
                RetentionjobConfigurationService.saveExecuteRole($scope.executeRole.jobGroupCount, $scope.executeRole.jobSleepSecond)
                    .then(function () {
                        ngDialog.closeAll();
                    })
            };

            $scope.closePopupAll = function () {
                ngDialog.closeAll();
            };

            $scope.deleteConfigs = function () {
                if(confirm('선택한 항목을 삭제하시겠습니까?')) {
                    var jobIds = $scope.selectedRetentionjobConfigs.map(function (item) {
                        return item.jobId;
                    });
                    RetentionjobConfigurationService.massDeleteRetentionjobConfig(jobIds)
                    .then(function () {
                        $scope.getRetentionjobConfigList();
                    });
                }
                
            };

            $scope.deleteConfig = function (event) {
                console.debug(event.rowData.data);
                var jobId = event.rowData.data.jobId;
                RetentionjobConfigurationService.deleteRetentionjobConfig(jobId)
                    .then(function () {
                        $scope.getRetentionjobConfigList();
                    });
            };

            $scope.excelDownload = function () {
                if(confirm('검색하신 정보를 Excel로 Download 진행하시겠습니까?')) {
                    var jobIds = $scope.selectedRetentionjobConfigs.map(function (item) {
                        return item.jobId;
                    });
                    RetentionjobConfigurationService.retentionjobConfigListExcelDownload($scope.params, jobIds)
                        .then(function () {
                            console.debug('다운로드 성공');
                        });
                }
            };


            /*############# Excel Upload #############*/
            $scope.excelRead = function (file) {
                var data = file.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                $scope.retentionjobConfigList = pivotCsvToArray(csvToArray(file));
            };

            function csvToArray(data) {
                var rows = data.split('\n');
                var obj = [];
                angular.forEach(rows, function (val) {
                    if (val != "") {
                        var r = val.replace(/"[^"]+"/g, function(v) { 
                              return v.replace(/,/gi, '###');
                        });
                        r = r.split(',');                      
                        obj.push(r);
                    }
                });

                return obj;
            }

            function pivotCsvToArray(data) {
                var returnArr = [];
                for (var d in data) {
                    if (d > 0) {
                        var hostMap = {};
                        for (var h in data[d]) {
                            var key = $scope.csvSampleHeader[h];
                            if (key)
                                key = key.toLowerCase();                           
                            var keyData  = data[d][h].indexOf('###') == -1 ? data[d][h] : data[d][h].replace(/"/g,'').replace(/###/gi, ',');
                            hostMap[key] = keyData;
                        }
                        returnArr.push(hostMap)
                    }
                }
                return returnArr;
            }


            $scope.excelUpload = function () {
                $scope.retentionjobConfigList = [];
                $scope.excelUploadErrorMessages = [];
                var popup = ngDialog.open({
                    template: "/activities/retention/configuration/popup/retentionjob_excel_upload_popup.html",
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


                $(document).on('change', '#ex_filename', function () {
                    var filename = '';
                    if (window.FileReader) {
                        filename = $(this)[0].files[0].name;
                    } else {
                        filename = $(this).val().split('/').pop().split('\\').pop();
                    }

                    if(filename.indexOf('.csv') == -1) {
                        alert('CSV 파일만 가능합니다.');
                        $scope.retentionjobConfigList = [];
                        filename = 'Selected File';
                    }
                    $(this).siblings('.upload-name').val(filename);
                });
            };


            function excelFormValid() {
                var errorMessages = [];

                for(var i=0; i<$scope.retentionjobConfigList.length;i++) {

                    var data = $scope.retentionjobConfigList[i];
                    var error = {
                        jobName: (i+1)+'. '+data.job_name,
                        message: []
                    }
                    var chk=0;

                    if (!data.job_name) {
                        error.message.push('작업명을 입력해주세요.');
                        chk++;
                    }
                    if (!data.data_type) {
                        error.message.push('Data Type을 입력해주세요.');
                        chk++;
                    }
                    if (data.data_type !== 'Hive' && data.data_type !== 'HDFS' && data.data_type !== 'LogFile') {
                        error.message.push('Data Type은 Hive, HDFS, LogFile 만 입력 가능합니다.');
                        chk++;
                    }

                    if (!data.exec_min || !data.exec_hour || !data.exec_day || !data.exec_year) {
                        error.message.push('실행주기 정보가 없습니다.');
                        chk++;
                    }

                    var chars = "0123456789,-* "
                    if(!containsCharsOnly(data.exec_min,chars)) {
                        error.message.push("실행주기 (분) 입력형식이 잘못되었습니다.");
                        chk++;
                    }

                    if(!containsCharsOnly(data.exec_hour,chars)) {
                        error.message.push("실행주기 (시) 입력형식이 잘못되었습니다.");
                        chk++;
                    }

                    if(!containsCharsOnly(data.exec_day,chars)) {
                        error.message.push("실행주기 (일) 입력형식이 잘못되었습니다.");
                        chk++;
                    }

                    if(!containsCharsOnly(data.exec_year,chars)) {
                        error.message.push("실행주기 (년) 입력형식이 잘못되었습니다.");
                        chk++;
                    }
                    if (!data.host || !data.login_id || !data.login_passwd) {
                        error.message.push('대상호스트 정보가 없습니다');
                        chk++;
                    }                    
                    if (!data.retention_period) {
                        error.message.push('보존기간을 입력해주세요.');
                        chk++;
                    }

                    if(!CommonUtil.checkNumber(data.retention_period)) {
                        error.message.push('보존기간은 숫자만 입력 가능합니다.');
                        chk++;
                    }
                    if (!data.input_cmd) {
                        error.message.push('명령어 정보가 없습니다.');
                        chk++;
                    }


                    if(chk > 0) errorMessages.push(error);

                }
                return errorMessages;
            };

            $scope.excelUploadProcess = function() {

                if($('.upload-name').val() == 'Selected File') {
                    alert("CSV 파일을 선택해주세요.");
                    return;
                }

                if($scope.retentionjobConfigList.length < 2) {
                    alert("Upload할 정보가 없습니다.");
                    return false;
                }

                $scope.excelUploadErrorMessages = excelFormValid();

                if($scope.excelUploadErrorMessages.length > 0) {
                    excelUploadProcessError();                    
                    return false;
                }

                DataService.httpPost("/activities/retention/configuration/excel-upload", $scope.retentionjobConfigList, excelUploadProcessResult);   
            }

            function excelUploadProcessError() {
                var popup = ngDialog.open({
                    template: "/activities/retention/configuration/popup/retentionjob_excel_upload_error_popup.html",
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


            function excelUploadProcessResult(data) {
                if (data == null || data.data == null)
                    return;
                $scope.excelUploadResult = data.data;
                $scope.initFilter();
                $scope.search();
                ngDialog.closeAll();


                var popup = ngDialog.open({
                    template: "/activities/retention/configuration/popup/retentionjob_excel_upload_result_popup.html",
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

            $scope.viewSampleImage = function() {
                var popup = ngDialog.open({
                    template: "/activities/retention/configuration/popup/retentionjob_excel_upload_sample_popup.html",
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


            $scope.getSampleExcelDownload = function () {
                RetentionjobConfigurationService.getSampleExcelDownload()
                    .then(function () {
                        console.debug('다운로드 성공');
                    });
            };
                      
            $scope.initial();

        }]);
});