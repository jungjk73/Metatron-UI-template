define(["app"], function(app) {
	app.controller("ResourceManagementCtrl", ["$rootScope", "$scope", "$timeout", "$compile", "$http", "ConfigManager", "DataService", "ngDialog", "CommonUtil",
	    function($rootScope, $scope, $timeout, $compile, $http, ConfigManager, DataService, ngDialog, CommonUtil) {
			"use strict";

			// property
			var resourceManagementCtrl = this;
			var unbind = [];
			var restUrl = ConfigManager.getConst("ENTERPRISE_URL_DEV");
            var systemSeq = '';
            var param_sys_seq = '';
            var addCount = 0;       // /fair-scheduler/add 해야 할 항목이 몇개 있는지 확인
            var addIdx = 0;
            var isSelectable = false;

            resourceManagementCtrl.memoryTotal = 0;
            resourceManagementCtrl.memoryUsed = 0;
            resourceManagementCtrl.memoryReserved = 0;
            resourceManagementCtrl.vCoreTotal = 0;
            resourceManagementCtrl.vCoreUsed = 0;
            resourceManagementCtrl.vCoreReserved = 0;
            resourceManagementCtrl.nodeAlive = 0;

			resourceManagementCtrl.schedulerType = '-';
			resourceManagementCtrl.queueCount = 0;
			resourceManagementCtrl.resourceJobActive = 0;
			resourceManagementCtrl.resourceJobInactive = 0;

			resourceManagementCtrl.resourceGridData = [];
			resourceManagementCtrl.yarnGridData = [];
			resourceManagementCtrl.applicationGridData = [];

            resourceManagementCtrl.queueConfigInput = {};       // Queue Resource Config 사용자 입력 내용 객체
            resourceManagementCtrl.queueConfigInput.subQueueList = [];
            resourceManagementCtrl.subQueueIdx = 0;
            resourceManagementCtrl.yarnConfigInfo = {};         // Yarn Configuration에서 선택한 config

			resourceManagementCtrl.yarnServerAction = [
				{label : 'Restart', value : 'restart'},{label : 'Start', value : 'start'},{label : 'Stop', value : 'stop'}
			];

            resourceManagementCtrl.applicationConfigInput = {};

            resourceManagementCtrl.policyList = [
                {label : 'fair', value : 'fair'}, {label : 'DRF', value : 'DRF'}
            ];


            // event-handler
            function destory() {
                unbind.forEach(function(fn) {
                    ngDialog.closeAll();
                    fn();
                });
            }

            function addEventListener() {
                unbind = [
                    $scope.$on('$destroy', destory),
                    $scope.$on(ConfigManager.getEvent("CHANGE_SYSTEM_SEQ_EVENT"), onChangeSystemGroupIdEventHandler),
                    $scope.$on(ConfigManager.getEvent("GRID_CELL_CLICK_EVENT"), onGridCellClickEventHandler),
                    $scope.$on(ConfigManager.getEvent("GRID_DELETE_BTN_EVENT"), onGridDeleteClickEventHandler)
                ];
            }

            function onChangeSystemGroupIdEventHandler(event, data) {
                if (data == null)
                    return;

                systemSeq = ConfigManager.getSystemSeq();
                getSysSeq();
            }

            /**
             * Application List
             * click KILL button
             */
            function onGridCellClickEventHandler(event, data){
                if (data.action == 'KILL') {
                    killApplication(data.id);
                } else if (data.action == 'RUN') {
                    console.log('run');
                }
            }

            /**
             * ADD Resource Pool
             * 등록된 Queue 삭제 버튼 클릭
             */
            function onGridDeleteClickEventHandler(event, data){

                if ( confirm('Are you sure you want to delete '+data.queueName+' ?') ) {
                    $http.post(restUrl+'/resource/fairDel', {sys_seq: param_sys_seq, del : data.queueName}).then(function (successResponse){
                        // job 도 지워야 함. /application/kill 만 가능
                        removeApplication(data.queueName);
                        getQueueList();
                        alert('Success\n'+data.queueName+' was successfully deleted!');
                    }, function(failResponse){});
                }

            }

            // method

            /**
             * Node Info
             * /yarn/yarnResource
             */
            function getYarnResourceList(){
                $http.get(restUrl+'/resource/yarnResource?sys_seq='+systemSeq,{}).success(function(result){
                    var resultData = result.body.ResourceManager;

                    if (!resultData.nodes) return;

                    var nodeTotal = 0;

                    $.each(resultData.nodes.node, function(){
                        resourceManagementCtrl.memoryReserved += Number(this.availMemoryMB);
                        resourceManagementCtrl.memoryUsed += Number(this.usedMemoryMB);
                        resourceManagementCtrl.vCoreReserved += Number(this.availableVirtualCores);
                        resourceManagementCtrl.vCoreUsed += Number(this.usedVirtualCores);
                        nodeTotal++;
                        if (this.state.toUpperCase() == 'RUNNING') resourceManagementCtrl.nodeAlive++;
                    });

                    resourceManagementCtrl.memoryTotal = resourceManagementCtrl.memoryReserved + resourceManagementCtrl.memoryUsed;
                    resourceManagementCtrl.vCoreTotal = resourceManagementCtrl.vCoreReserved + resourceManagementCtrl.vCoreUsed;
                    resourceManagementCtrl.nodeLost = nodeTotal - resourceManagementCtrl.nodeAlive;
                });
            }

			/**
			 * Scheduler Info
             * /fair-scheduler/list
			 */
			function getQueueList(){
                console.debug('[Q 리스트] 요청 :: ');
				$http.get(restUrl+'/resource/fairList?sys_seq='+systemSeq, {}).success(function(result){
					var resourceManager = result.body.ResourceManager;

                    if (!resourceManager || !resourceManager.scheduler || !resourceManager.scheduler.schedulerInfo) {getQueueList(); return;}

					resourceManagementCtrl.schedulerType = resourceManager.scheduler.schedulerInfo['xsi:type'];

                    var queues = angular.copy(resourceManager.scheduler.schedulerInfo.rootQueue.childQueues);
                    console.debug('[Q 리스트] 완료 :: ', queues);
                    if ($.type(queues) == 'object') queues = [queues];      // queue 가 1개일때는 서버에서 Object로 리턴. 2개부터 Array로 리턴.

                    // resourceManagementCtrl.queueCount = queues.length;      // 부모큐만 카운트

                    resourceManagementCtrl.queueCount = 0;
                    resourceManagementCtrl.resourceJobActive = 0;
                    resourceManagementCtrl.resourceJobInactive = 0;

                    setQueueList(queues);       // 리스트 데이터 설정

                    // sub queue 처리
                    // child queue 를 parent queue 아래에 붙여준다
                    var resourceGridData = angular.copy(queues);
                    var addIdx = 0;
                    $.each(queues, function(){
                    	if (this.childQueues && this.childQueues.length > 0) {
                            resourceGridData[addIdx].isParent = true;
                            var parentQueueName = this.queueName;
                            $.each(this.childQueues, function(){
                                addIdx++;
                                this.isSub = true;
                                this.parentQueueName = parentQueueName;
                                resourceGridData.splice(addIdx, 0, this);
                            });
                        }
                        addIdx++;
                    });

                    resourceManagementCtrl.resourceGridData = resourceGridData.sort();

                    var defaultIdx = 0;
                    $.each(resourceManagementCtrl.resourceGridData, function(idx){
                        if (this.queueName == 'root.default') defaultIdx = idx;
                    });

                    var defaultObj = resourceManagementCtrl.resourceGridData.splice(defaultIdx, 1);
                    resourceManagementCtrl.resourceGridData.unshift(defaultObj[0]);

				});
			}

            /**
             * Add Resource Pool
             * 서버에서 받아온 리스트 객체 처리
             */
			function setQueueList(queues){
                $.each(queues, function(){
                    resourceManagementCtrl.queueCount++;
                    resourceManagementCtrl.resourceJobActive += this.numActiveApps ? this.numActiveApps : 0;
                    resourceManagementCtrl.resourceJobInactive += this.numPendingApps ? this.numPendingApps : 0;

                    var maxMem = CommonUtil.numberFormatter(this.maxResources.memory);
                    var maxVCore = CommonUtil.numberFormatter(this.maxResources.vCores);

                    var minMem = CommonUtil.numberFormatter(this.minResources.memory);
                    var minVCore = CommonUtil.numberFormatter(this.minResources.vCores);

                    this.memMinMax = minMem+ ' / '+ maxMem;
                    this.vCoreMinMax = minVCore + ' / ' +maxVCore;

                    this.weight = 1;        // 기본으로 1

                    this.allocation = (this.weight / queues.length * 100).toFixed(2) +'%';

                    if (this.childQueues) {
                        if ($.type(this.childQueues) == 'object') this.childQueues = [this.childQueues];        // sub queue 가 1개일때는 서버에서 Object로 리턴. 2개부터 Array로 리턴.
                        setQueueList(this.childQueues);
                    }

                });
            }

            /**
             * Add Resource Pool
             * 서버에서 받은 데이터에서 memory, vCore 별 최대값, 최소값을 리턴
             * getResourceByDist(maxResources, memory)
             * getResourceByDist(maxResources, vCores)
             */
            function getResourceByDist(data, dist){
                var returnValue = 0;
                if (!data || data.indexOf(',') == -1) return returnValue;
                var datas = data.split(',');
                if (dist == 'memory') {
                    var data_memory = datas[0];
                    returnValue = data_memory.split(' ')[0];
                } else if (dist == 'vCores') {
                    var data_vCore = datas[1];
                    returnValue = data_vCore.split(' ')[0];
                }
                return Number(returnValue);
            }

            /**
             * Add Resource Pool
             * 설정 팝업 열기
             */
            resourceManagementCtrl.showConfigPop = function(){
                console.debug(':: 선택 ::',resourceManagementCtrl.selectedQueueInfo);

                resourceManagementCtrl.queueConfigInput.readonly = false;
                resourceManagementCtrl.queueConfigInput.weight = 1;

                //admin 사용자만 변경가능함.
                var popup = ngDialog.open({
                    template: "/common/resource_config_template.html",
                    className: "ngdialog-theme-default custom-width",
                    showClose: false,
                    disableAnimation: true,
                    cache: false,
                    closeByDocument: false,
                    closeByEscape: false,
                    scope: $scope
                });

                var closer = $rootScope.$on('ngDialog.refresh', function(e, id) {
                    if (id != popup.id) return;
                    closer();
                });
            };

            /**
             * Add Resource Pool
             * row 더블클릭 - Queue 선택
             */
            resourceManagementCtrl.selectQueueInfo = function(event){
                resourceManagementCtrl.selectedQueueInfo = event.data;

                // Sub Queue 인 경우는 부모 Queue 정보 보여준다
                if (resourceManagementCtrl.selectedQueueInfo.isSub == true) {
                    $.each(resourceManagementCtrl.resourceGridData, function(){
                        if (this.queueName == resourceManagementCtrl.selectedQueueInfo.parentQueueName) {
                            resourceManagementCtrl.selectedQueueInfo = this;
                            return false;
                        }
                    });
                }

                resourceManagementCtrl.queueConfigInput.queueName = getQueueName(resourceManagementCtrl.selectedQueueInfo.queueName, 'parent');
                resourceManagementCtrl.showConfigPop();

                resourceManagementCtrl.queueConfigInput.maxMem = resourceManagementCtrl.selectedQueueInfo.maxResources.memory;
                resourceManagementCtrl.queueConfigInput.minMem = resourceManagementCtrl.selectedQueueInfo.minResources.memory;

                resourceManagementCtrl.queueConfigInput.maxVCore = resourceManagementCtrl.selectedQueueInfo.maxResources.vCores;
                resourceManagementCtrl.queueConfigInput.minVCore = resourceManagementCtrl.selectedQueueInfo.minResources.vCores;

                resourceManagementCtrl.queueConfigInput.weight = resourceManagementCtrl.selectedQueueInfo.weight;
                resourceManagementCtrl.queueConfigInput.maxApps = resourceManagementCtrl.selectedQueueInfo.maxApps;

                resourceManagementCtrl.queueConfigInput.readonly = true;
                resourceManagementCtrl.queueConfigInput.modify = true;

                // subQueue 처리
                if (resourceManagementCtrl.selectedQueueInfo.childQueues && resourceManagementCtrl.selectedQueueInfo.childQueues.length > 0) {
                    let timer = $timeout(function(){
                        resourceManagementCtrl.queueConfigInput.subQueueList = [];      // sub queue 저장 리스트 초기화

                        $.each(resourceManagementCtrl.selectedQueueInfo.childQueues, function(){
                            this.queueName = getQueueName(this.queueName, 'sub');
                            this.maxMem = this.maxResources.memory;
                            this.minMem = this.minResources.memory;
                            this.maxVCore = this.maxResources.vCores;
                            this.minVCore = this.minResources.vCores;
                            this.readonly = true;
                            resourceManagementCtrl.addSubQueue(this);
                        });
                        $timeout.cancel(timer);
                    }, 400);
                }
            };

            function removeApplication(selectedQueueName){
                var job = '';
                $.each(resourceManagementCtrl.applicationGridData, function(){
                    if (this.queue == selectedQueueName) {
                        job = this.id;
                        return false;
                    }
                });

                killApplication(job);
            }

            function killApplication(jobId) {
                console.debug('[Job 삭제] 요청', jobId);
                $http.post(restUrl+'/resource/applicationKill', {sys_seq : param_sys_seq, kill : jobId}).then(function (successResponse){
                    console.debug('[Job 삭제] 완료', successResponse);
                    getApplicationList();
                }, function (failResponse){
                    console.error('[Job 삭제] ERROR', failResponse);
                });
            }

            /**
             * ADD Resource Pool
             * 설정팝업
             * Sub Queue 추가
             */
            resourceManagementCtrl.addSubQueue = function(child){
                var idx = resourceManagementCtrl.subQueueIdx;

                var subQueueInfo = {};
                if (child) subQueueInfo = child;
                subQueueInfo.isSub = true;

                resourceManagementCtrl.queueConfigInput.subQueueList.push(subQueueInfo);

                var subQueue = $('<tr class="sub-data subQueue subQueue_'+idx+'">');      // Memory / vCore

                subQueue.append('<th scope="row"> <input type="text" class="mu-input tc queueName" style="width:135px;" ng-model="resourceManagementCtrl.queueConfigInput.subQueueList['+idx+'].queueName" ng-readonly="resourceManagementCtrl.queueConfigInput.subQueueList['+idx+'].readonly"><button type="button" id="btn_addMemorySub" class="mu-btn mu-btn-icon mu-btn-color bg-red ml10 fr" style="height:20px; margin-top:3px; padding:0 5px; line-height:20px;" ng-click="resourceManagementCtrl.delSubQueue('+idx+')"><i class="mu-icon del"></i></button></th>');

                var subQueue_mem = $('<td>');
                subQueue_mem.append('<input type="number" class="mu-input tc spinner-hide minMem subQueue_minMem" style="width:92px;" ng-model="resourceManagementCtrl.queueConfigInput.subQueueList['+idx+'].minMem">');
                subQueue_mem.append('<input type="number" class="mu-input tc spinner-hide fr maxMem subQueue_maxMem" style="width:92px;" ng-model="resourceManagementCtrl.queueConfigInput.subQueueList['+idx+'].maxMem">');
                subQueue.append(subQueue_mem);

                subQueue.append('<th scope="row">  <input type="text" class="mu-input tc queueName" style="width:135px;" ng-model="resourceManagementCtrl.queueConfigInput.subQueueList['+idx+'].queueName" ng-readonly="resourceManagementCtrl.queueConfigInput.subQueueList['+idx+'].readonly"><button type="button" id="btn_addMemorySub" class="mu-btn mu-btn-icon mu-btn-color bg-red ml10 fr" style="height:20px; margin-top:3px; padding:0 5px; line-height:20px;" ng-click="resourceManagementCtrl.delSubQueue('+idx+')"><i class="mu-icon del"></i></button></th>');

                var subQueue_vCore = $('<td>');
                subQueue_vCore.append('<input type="number" class="mu-input tc spinner-hide minVCore subQueue_minVCore" style="width:92px;" ng-model="resourceManagementCtrl.queueConfigInput.subQueueList['+idx+'].minVCore" >');
                subQueue_vCore.append('<input type="number" class="mu-input tc spinner-hide fr maxVCore subQueue_maxVCore" style="width:92px;" ng-model="resourceManagementCtrl.queueConfigInput.subQueueList['+idx+'].maxVCore">');
                subQueue.append(subQueue_vCore);


                var subQueue2 = $('<tr class="sub-data subQueue2 subQueue_'+idx+'">');        // weight / policy / apps

                subQueue2.append('<th scope="row"> <input type="text" class="mu-input tc queueName" style="width:135px;" ng-model="resourceManagementCtrl.queueConfigInput.subQueueList['+idx+'].queueName" ng-readonly="resourceManagementCtrl.queueConfigInput.subQueueList['+idx+'].readonly"></th>');

                var subQueue2_weight = $('<td>');
                resourceManagementCtrl.queueConfigInput.subQueueList[idx].weight = 1;
                subQueue2_weight.append('<input type="number" class="mu-input tc spinner-hide weight fl subQueue_weight" style="width:92px;" name="" ng-model="resourceManagementCtrl.queueConfigInput.subQueueList['+idx+'].weight" />');
                subQueue2_weight.append('<select-box data="resourceManagementCtrl.policyList" class-name="mu-selectbox light fr"  on-data-change="resourceManagementCtrl.policyListChange(event, \'sub\', '+idx+')"></select-box>');
                subQueue2.append(subQueue2_weight);

                subQueue2.append('<th scope="row"> <input type="text" class="mu-input tc queueName" style="width:135px;" ng-model="resourceManagementCtrl.queueConfigInput.subQueueList['+idx+'].queueName" ng-readonly="resourceManagementCtrl.queueConfigInput.subQueueList['+idx+'].readonly"></th>');

                var subQueue2_apps = $('<td>');
                subQueue2_apps.append('<input type="number" class="mu-input tc spinner-hide maxApps subQueue_maxApps" style="width:92px;" name="" ng-model="resourceManagementCtrl.queueConfigInput.subQueueList['+idx+'].maxApps" />');
                subQueue2.append(subQueue2_apps);


                if ($('.subQueue').size() == 0) {
                    $('.parentQueue').after(subQueue);
                    $('.parentQueue2').after(subQueue2);
                }
                else {
                    $('.subQueue').last().after(subQueue);
                    $('.subQueue2').last().after(subQueue2);
                }

                $compile( subQueue )($scope);
                $compile( subQueue2 )($scope);

                resourceManagementCtrl.subQueueIdx++;
            };

            /**
             * ADD Resource Pool
             * 설정팝업
             * Sub Queue 삭제
             */
            resourceManagementCtrl.delSubQueue = function(idx){
                $('.subQueue_'+idx).remove();
                resourceManagementCtrl.queueConfigInput.subQueueList[idx] = null;   // 리스트 중간에서 삭제하지 않고 삭제하려는 인덱스의 객체를 null로 처리
            };

            /**
             * Add Resource Pool
             * 설정 팝업
             * 정책 셀렉트박스 선택
             */
            resourceManagementCtrl.policyListChange = function(event, type, idx){
                if (type == 'parent')
                    resourceManagementCtrl.queueConfigInput.policy = event.value;
                else {
                    resourceManagementCtrl.queueConfigInput.subQueueList[idx].policy = event.value;
                }
            };

            /**
             * Add Resource Pool
             * 설정 팝업
             * 설정정보 저장
             */
            resourceManagementCtrl.addQueue = function(frm){

                if (!validatConfig(frm)) return;

                addIdx = 0;

                // 처리해야 하는 Queue 개수 확인. 0이 되면 모두 처리한 것으로 판단하고 완료 처리
                if (resourceManagementCtrl.queueConfigInput.subQueueList && resourceManagementCtrl.queueConfigInput.subQueueList.length > 0) {
                    for (var i = 0 ; i < resourceManagementCtrl.queueConfigInput.subQueueList.length ; i++) {
                        if (resourceManagementCtrl.queueConfigInput.subQueueList[i] != null) {
                            addCount++;
                        }
                    }
                }
                addCount = addCount+1;


                // 수정 - 삭제 후 새로 추가
                if (resourceManagementCtrl.queueConfigInput.modify) {
                    console.debug('[Q 삭제] 요청 :: '+resourceManagementCtrl.queueConfigInput.queueName);
                    $http.post(restUrl+'/fair-scheduler/del', {sys_seq : param_sys_seq, "del":resourceManagementCtrl.queueConfigInput.queueName}).then(function(successResponse){        // 부모큐 삭제하면 서브큐도 삭제
                        console.debug('[Q 삭제] 완료 :: '+resourceManagementCtrl.queueConfigInput.queueName);
                        addQueueParam(resourceManagementCtrl.queueConfigInput, null);
                    });
                } else {    // 신규
                    addQueueParam(resourceManagementCtrl.queueConfigInput, null);
                }

            };

            function addQueueParam(config, parentName){
                var param = {};

                if  (parentName == null)
                    param.add = config.queueName;
                else {
                    param.add = parentName + '.' + config.queueName;       // sub queue
                    addIdx++;
                }

                var url = restUrl+'/resource/fairAdd';

                param.sys_seq = param_sys_seq;
                param.addMin = config.minMem+','+config.minVCore;
                param.addMax = config.maxMem+','+config.maxVCore;
                param.addWeight = config.weight.toString();
                param.addPolicy = 'fair';
                // param.addSubmitApp = 'test';

                // console.debug('add param\n',param);
                console.debug('[Q 저장] 요청 :: ' + param.add);

                $http.post(url, param).then(function(successResponse){
                    console.debug('[Q 저장] 완료 :: '+ param.add);
                    addCount--;

                    if (!resourceManagementCtrl.queueConfigInput.modify) {
                        let timer = $timeout(function(){
                            addJob(config, parentName); // fake job 생성
                            $timeout.cancel(timer);
                        }, 500);
                    }


                    if (addCount ==0) {     // Sub Queue 를 포함한 모든 Queue 처리 완료

                        let timer = $timeout(function(){
                            getQueueList();
                            $timeout.cancel(timer);
                        }, 2000); // 저장한 내용 서버에서 바로 안보여줌. 리스트 호출해도 저장한 내용들 바로 나오지 않고 몇초 기다려야 나온다.

                        resourceManagementCtrl.closeDialog();
                    } else if (resourceManagementCtrl.queueConfigInput.subQueueList && resourceManagementCtrl.queueConfigInput.subQueueList.length > 0) {
                        if (resourceManagementCtrl.queueConfigInput.subQueueList[addIdx] != null) {
                            addQueueParam(resourceManagementCtrl.queueConfigInput.subQueueList[addIdx], resourceManagementCtrl.queueConfigInput.queueName);
                        } else {

                            while(resourceManagementCtrl.queueConfigInput.subQueueList[addIdx]== null){
                                addIdx++;
                            }
                            addQueueParam(resourceManagementCtrl.queueConfigInput.subQueueList[addIdx], resourceManagementCtrl.queueConfigInput.queueName);
                        }
                    }


                }, function(failResponse){
                    console.error('!!!! ERROR ERROR ERROR !!!!');
                    console.error(failResponse);
                });

            }

            /**
             * Queue에 대한 Job 저장
             */
            function addJob(config, parentName){
                var param = {};
                if  (parentName == null)
                    param.add = config.queueName;
                else {
                    param.add = parentName + '.' + config.queueName;       // sub queue
                }
                param.containerMem = String(config.minMem);
                param.sys_seq = param_sys_seq;

                console.debug('[Job 저장] 요청 :: ', param);
                $http.post(restUrl+'/resource/applicationAdd', param).then(function(successResponse){
                    console.debug('[Job 저장] 완료 :: ', param.add);

                    let timer = $timeout(function(){getApplicationList(); $timeout.cancel(timer);}, 1000);
                }, function(failResponse){});
            }

            /**
             * Add Resource Pool
             * 설정 팝업
             * 사용자 입력값 검증
             */
            function validatConfig(frm){
                var returnState = true;

                // 현재 선택한 Queue + sub Queue 제외한 나머지 리스트
                var otherResourceGridData = [];
                var qNameList = [];

                if (resourceManagementCtrl.selectedQueueInfo) {
                    var _qName = resourceManagementCtrl.selectedQueueInfo.queueName;
                    qNameList.push(_qName);
                    $.each(resourceManagementCtrl.selectedQueueInfo.childQueues, function(){
                        var _subQName = _qName+'.'+this.queueName;
                        qNameList.push(_subQName);
                    });

                    qNameList.push('root.default'); // root.default는 무조건 리스트에 있음

                    $.each(resourceManagementCtrl.resourceGridData, function(){
                        var qName = this.queueName;
                        if (qNameList.indexOf(qName) < 0 && this.parentQueueName == null) {
                            otherResourceGridData.push(this);
                        }
                    });
                } else {
                    $.each(resourceManagementCtrl.resourceGridData, function(){
                        if (this.parentQueueName == null && this.queueName != 'root.default') {
                            otherResourceGridData.push(this);
                        }
                    });
                }

                $.each($('.queueName'), function(){
                    if ( $(this).val() == null || $(this).val() == '') {
                        resourceManagementCtrl.configMsg = 'Check Queue Name';
                        returnState = false;
                    }
                });

                $.each($('.minMem'), function(){
                    if ( $(this).val() == null || $(this).val() == '') {
                        resourceManagementCtrl.configMsg = 'Check Memory Min';
                        returnState = false;
                    }
                });

                $.each($('.maxMem'), function(){
                    if ( $(this).val() == null || $(this).val() == '') {
                        resourceManagementCtrl.configMsg = 'Check Memory Max';
                        returnState = false;
                    }
                });

                var subQueueMinMemSum = 0;
                $.each( $('.subQueue_minMem'), function(){
                    subQueueMinMemSum += Number($(this).val());
                } );
                if (subQueueMinMemSum > Number($('.parentQueue_minMem').val()) ) {
                    resourceManagementCtrl.configMsg = 'Check Memory Min of Sub Queue. It must be smaller than Memory of Parent Queue.';
                    returnState = false;
                }

                var subQueueMaxMemSum = 0;
                $.each( $('.subQueue_maxMem'), function(){
                    subQueueMaxMemSum += Number($(this).val());
                } );
                if (subQueueMaxMemSum > Number($('.parentQueue_maxMem').val()) ) {
                    resourceManagementCtrl.configMsg = 'Check Memory Max of Sub Queue. It must be smaller than Memory of Parent Queue.';
                    returnState = false;
                }

                var maxMemSum = 0;
                // $.each($('.maxMem'), function(){
                $.each($('.parentQueue_maxMem'), function(){
                    maxMemSum += Number($(this).val());
                });
                $.each(otherResourceGridData, function(){
                    maxMemSum += Number(this.maxResources.memory);
                });
                if (maxMemSum > resourceManagementCtrl.memoryTotal) {
                    resourceManagementCtrl.configMsg = 'Check Memory Max. It must be smaller than Memory Total.';
                    returnState = false;
                }

                $.each($('.minVCore'), function(){
                    if ( $(this).val() == null || $(this).val() == '') {
                        resourceManagementCtrl.configMsg = 'Check vCore Min';
                        returnState = false;
                    }
                });

                $.each($('.maxVCore'), function(){
                    if ( $(this).val() == null || $(this).val() == '') {
                        resourceManagementCtrl.configMsg = 'Check vCore Max';
                        returnState = false;
                    }
                });

                var subQueueMinVCoreSum = 0;
                $.each( $('.subQueue_minVCore'), function(){
                    subQueueMinVCoreSum += Number($(this).val());
                } );
                if (subQueueMinVCoreSum > Number($('.parentQueue_minVCore').val()) ) {
                    resourceManagementCtrl.configMsg = 'Check vCore Min of Sub Queue. It must be smaller than vCore of Parent Queue.';
                    returnState = false;
                }

                var subQueueMaxVCoreSum = 0;
                $.each( $('.subQueue_maxVCore'), function(){
                    subQueueMaxVCoreSum += Number($(this).val());
                } );
                if (subQueueMaxVCoreSum > Number($('.parentQueue_maxVCore').val()) ) {
                    resourceManagementCtrl.configMsg = 'Check vCore Max of Sub Queue. It must be smaller than vCore of Parent Queue.';
                    returnState = false;
                }

                var maxVCoreSum = 0;
                // $.each($('.maxVCore'), function(){
                $.each($('.parentQueue_maxVCore'), function(){
                    maxVCoreSum += Number($(this).val());
                });
                $.each(otherResourceGridData, function(){
                    maxVCoreSum += Number(this.maxResources.vCores);
                });
                if (maxVCoreSum > resourceManagementCtrl.vCoreTotal) {
                    resourceManagementCtrl.configMsg = 'Check vCore Max. It must be smaller than vCore Total.';
                    returnState = false;
                }

                $.each($('.weight'), function(){
                    if ( $(this).val() == null || $(this).val() == '') {
                        resourceManagementCtrl.configMsg = 'Check Weight';
                        returnState = false;
                    }
                });

                $.each($('.maxApps'), function(){
                    if ( $(this).val() == null || $(this).val() == '') {
                        resourceManagementCtrl.configMsg = 'Check Max Apps';
                        returnState = false;
                    }
                });


                return returnState;
            }

            /**
             * Add Resource Pool
             * 설정 팝업
             * 팝업 닫기
             */
            resourceManagementCtrl.closeDialog = function(){
                ngDialog.closeAll();
                initConfigInput();
            };

            /**
             * 팝업 사용 객체 초기화
             */
            function initConfigInput(){
                resourceManagementCtrl.selectedQueueInfo = {};
                resourceManagementCtrl.queueConfigInput = {};
                resourceManagementCtrl.queueConfigInput.subQueueList = [];
                resourceManagementCtrl.configMsg = '';
                resourceManagementCtrl.subQueueIdx = 0;
                resourceManagementCtrl.applicationConfigInput = {};
            }

            /**
             * Queue 이름 리턴
             * Queue를 저장했다가 서버에서 다시 읽으면 root 부터 연결되어 있음.
             * (root.queueTest.queueTestSub)
             */
            function getQueueName(name, type){
                var returnName = name;
                if (name.indexOf('.') != -1) {
                    var names = name.split('.');
                    if (type == 'parent') returnName = names[1];
                    else if (type == 'sub') returnName = names[2];
                }
                return returnName;
            }

            /**
             * Yarn Configuration
             * List
             */
            function getYarnConfigurationList(){
                $http.get(restUrl+'/resource/yarn-site?sys_seq='+systemSeq,{}).success(function(result){
                    var resultData = result.body.ResourceManager;

                    if (!resultData.configuration || !resultData.configuration.property) {getYarnConfigurationList(); return;}
                    resourceManagementCtrl.yarnGridData = resultData.configuration.property;
                });
            }

            /**
             * Yarn Configuration
             * row 선택
             */
            resourceManagementCtrl.selectYarnConfiguration = function(event){
                resourceManagementCtrl.yarnConfigInfo = event.data;
            };

            /**
             * Yarn Configuration
             * 셀렉트 박스 - 서버 동작 처리
             * yarn deamon 시작 / 정지 / 재시동
			 */
			resourceManagementCtrl.yarnServerStateChange = function(event){
			    var action = event.value;
				if (isSelectable && event == 'restart') {

				} else if (isSelectable && event == 'start') {

				} else if (isSelectable && event == 'stop') {

				}

                // 정지 / 재시작 / 시작
                if (isSelectable) {
                    if (confirm('Are you going to\nResourceManager '+event.label+'?')) {
                        $http.get(restUrl+'/yarn/'+action,{params:{sys_seq:param_sys_seq}}).then(function(successResponse){
                            console.debug('YARN '+action, successResponse);
                            alert(event.label + ' Success');
                        }, function(failResponse){
                            console.error('YARN '+action, failResponse);
                            alert(event.label + ' Fail.');
                        });
                    }
                }
			};

			/**
			 * Application List
             * /application/list
			 */
			function getApplicationList(){
                console.debug('[Job 목록] 요청');
                // $.ajax({
                //     url: restUrl+'/resource/applicationList',
                //     type: "POST",
                //     data: JSON.stringify({sys_seq : param_sys_seq}),
                //     contentType: "text/plain"
                // }).success(function(data){
                //     console.log("success: ", data);
                //     $("#resultDiv").append(data + "<br/>--------------------------------------------------------------------------------------<br/>");
                // }).error(function(data){
                //     console.error(data);
                //     $("#resultDiv").append("error<br/>--------------------------------------------------------------------------------------<br/>");
                // });

                $http.post(restUrl+'/resource/applicationList', JSON.stringify({sys_seq : param_sys_seq})).success(function(result){

					var resultData = result.body.ResourceManager;
                    if (!resultData.apps) return;

                    console.debug('[Job 목록] 완료',result.body.ResourceManager.apps.app);

					resourceManagementCtrl.applicationGridData = (resultData.apps.app).sort();

					$.each(resourceManagementCtrl.applicationGridData, function(){
						if (this.state == 'KILLED' || this.state == 'FINISHED' || this.state == 'FAILED') this.action = '';
						else this.action = 'KILL';
					});


                    resourceManagementCtrl.applicationGridData = resourceManagementCtrl.applicationGridData.sort(function (a, b) {
                        return b.id.localeCompare( a.id );
                    });

				});
			}

            /**
             * Application List
             * Job 추가 팝업
             */
            resourceManagementCtrl.showApplicationPop = function(){

                resourceManagementCtrl.queueNameSelectData = [];

                // Job 이 이미 할당된 Queue 는 Job 추가하려는 목록에서 제외한다
                $.each(resourceManagementCtrl.resourceGridData, function(){
                    var queue_queueName = this.queueName;
                    var has = false;

                    if (queue_queueName != 'root.default') {

                        $.each(resourceManagementCtrl.applicationGridData, function(){
                            if (queue_queueName == this.queue && (this.state != 'FINISHED' && this.state != 'KILLED') ) {
                                has = true;

                            }
                        });

                        if (!has) resourceManagementCtrl.queueNameSelectData.push( {label : queue_queueName, value : queue_queueName } );
                    }

                });

                if ( !resourceManagementCtrl.queueNameSelectData || resourceManagementCtrl.queueNameSelectData.length == 0) {
                    alert('Need Another Queue');
                    return;
                }

                var popup = ngDialog.open({
                    template: "/enterprise/resourceManagement/application-config-template.html",
                    className: "ngdialog-theme-default custom-width",
                    showClose: false,
                    disableAnimation: true,
                    cache: false,
                    closeByDocument: false,
                    closeByEscape: false,
                    scope: $scope
                });

                var closer = $rootScope.$on('ngDialog.refresh', function(e, id) {
                    if (id != popup.id) return;
                    closer();
                });

            };

            /**
             * Application List
             * Job 추가 팝업
             * Queue Name 선택 셀렉트박스
             */
            resourceManagementCtrl.queueNameSelectDataChange = function(event){
                resourceManagementCtrl.applicationConfigInput.queueName = event.value;

                // 선택한 이름의 Queue의 min Memory 값을 가져온다
                $.each(resourceManagementCtrl.resourceGridData, function(){
                    if (this.queueName == resourceManagementCtrl.applicationConfigInput.queueName) {
                        resourceManagementCtrl.applicationConfigInput.minMem = this.minResources.memory;
                        return false;
                    }
                });
            };

            /**
             * Application List
             * Job 추가 팝업
             * 저장
             */
            resourceManagementCtrl.addJob = function(){
                addJob(resourceManagementCtrl.applicationConfigInput, null);
                resourceManagementCtrl.closeDialog();
            };

			function getSysSeq(){
                // DataService.httpPost("/enterpriseModule/resourceManager/getSysSeq", {systemSeq : systemSeq}, function(result){

                    // if (result.result == 1) {
                    //     param_sys_seq = result.data.systemData.system_parent_seq;

                        param_sys_seq = systemSeq;

                        getYarnResourceList();

                        getQueueList();

                        getYarnConfigurationList(); // Yarn Configuration List

                        getApplicationList();	// Application List
                    // }

                // }, false);
            }

			function initialize() {

                systemSeq = ConfigManager.getSystemSeq();

                getSysSeq();

				addEventListener();

                let timer = $timeout(function(){
                    isSelectable = true;    // select box 선택 이벤트 바로 처리 안되게

                    $('.ag-body-container').attr('style', 'width : 100% !important');
                    $timeout.cancel(timer);
                }, 500);
			}

			initialize();
	}]);


    app.directive('queueItem', ['$rootScope', 'ConfigManager', function($rootScope, ConfigManager){
        return {
            restrict : 'E',
            scope : {
                item : '=item'
            },
            template : '<div ng-click="showDetail(item)" style="border: 1px solid #ccc; width:200px;"><strong>{{item.queueName}}</strong><span ng-click="remove(item)">\t\t\tX</span><br>Mem : {{item.memMinMax}}<br><br><br></div>',
            replace : true,
            link : function postLink(scope, elem, attrs, controller){
                scope.remove = function(item){
                    $rootScope.$broadcast(ConfigManager.getEvent("GRID_DELETE_BTN_EVENT"), item);
                };
                
                scope.showDetail = function(item){
                    console.debug('##### DETAIL Q ::',item);
                };
            }
        }
    }]);

});