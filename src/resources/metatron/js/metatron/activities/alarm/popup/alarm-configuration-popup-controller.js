define(["app"], function (app) {
	app.controller("AlarmConfigPopupCtrl", ["$scope", "$rootScope", "$controller", "DataService", "ngDialog", "ConfigManager", "CommonUtil",
		function ($scope, $rootScope, $controller, DataService, ngDialog, ConfigManager, CommonUtil) {
			"use strict";

			// property
			var vm = this;
			var unbind = [];
			var systemSeq;			
			var currentProcessSeq = null;
			var treeLabelMaxLength = 27;
			const DEFAULT_CALCULATE_VALUE = ">";
			const uniqueKeyMap = {
				"system": "systemSeq",
				"metric": "metricName",
				"hostAlarm": "alarmSeq",
				"prometheus": 'metricSeq'
			};

			vm.POPUP_TYPE = "ADD";
			vm.showTreeType = 'redis';
			vm.conditionType = 0;
			vm.prometheusConfigInfo = {};
			vm.alarmConfigTypeSelectedIndex = '0';
			vm.etcCodes = [
				{codeName: 'KAFKA', codeValue: 'KAFKA'},
				{codeName: 'FLINK', codeValue: 'FLINK'}
			]
			
			// event-handler
			function destroy() {
				unbind.forEach(function (fn) {
					clear();
					fn();
					ngDialog.closeAll();
				});
			}
			


			function onGetPrometheusConfigInfoResult(result) {
				if (result == null && result.data == null)
					return;

				// Alarm Types
				vm.alarmConfigTypes = result.data.alarmConfigTypes;

				if(vm.config.alarmType) {
					vm.alarmConfigTypeSelectedIndex = _.findIndex(vm.alarmConfigTypes, {alarmType: vm.config.alarmType}) + '';
				}
				
				// Prometheus  Tree				
				vm.tree.prometheus_original = result.data.prometheus;
				vm.tree.prometheus = angular.copy(vm.tree.prometheus_original);
				expandTreeHandler('prometheus');				
			}

			function onGetRedisConfigInfoResult(result) {
				if (result == null && result.data == null)
					return;				
				
				// Prometheus  Tree				
				vm.tree.redis_original = result.data;
				vm.tree.redis = angular.copy(vm.tree.redis_original);
				expandTreeHandler('redis');				
			}

			function onGetTreeDataResult (data) {
				if(data == null || data.data == null)
					return;

				// System Tree
				vm.tree.system_original = data.data.system;
				vm.tree.system = angular.copy(vm.tree.system_original);
				expandTreeHandler('system');

				// Metric Tree
				vm.tree.metric_original = data.data.metric;
				vm.tree.metric = angular.copy(vm.tree.metric_original);
				expandTreeHandler('metric');

				// Host Alarm Tree
				vm.tree.hostAlarm_original = data.data.host;
				vm.tree.hostAlarm = angular.copy(vm.tree.hostAlarm_original);
				expandTreeHandler('hostAlarm');


				// Host 알람일 경우, UI 바껴야 함.
				if(vm.config.eventSeq && (vm.config.eventSeq[0] != 'E' && vm.config.eventSeq[0] != 'K' && vm.config.eventSeq[0] != 'R')) {
					delete vm.config.metric;
					vm.changeAlarmTypeHandler('hostAlarm', true);
				} else {
					delete vm.config.hostAlarm;
				}
				setTimeout(metricDivScrollHandler, 800);

				// Tree Scroll 계산
				setTimeout(function() {
					if(treeLabelMaxLength != 0) {
						let w = treeLabelMaxLength*15;
						angular.element("#metricTree").find("ul").eq(0).css("width", w + "px");
					}
				}, 1800);
			}

			function onGetSmsUserResultHandler(data) {
				if(data == null || data.data == null)
					return;

				vm.config.sms = data.data;
			}

			function onValidateAlarmsResultHandler(data) {
				if(data == null || data.data == null)
					return;

				var d = data.data;
				if(!d.result) {
					alert(d.errorMessage);
					return;
				}

				saveAlarm();
			}

			// 초기화
			function configFormReset() {
				vm.prometheusConfigInfo = {};
				vm.config[vm.showTreeType] = [];
			}

			// Service Type Selected
			// va
			vm.onShowTreeType = function() {
				var key = vm.showTreeType;
				// if(vm.showTreeType == 'prometheus') {
				// 	vm.muColNum1 = '3';
				// 	vm.muColNum2 = '9';
				// }else if(vm.showTreeType == 'redis') {
				// 	vm.muColNum1 = '0'
				// 	vm.muColNum2 = '12';
				// }else {
				// 	vm.muColNum1 = '6';
				// 	vm.muColNum2 = '6';
				// }
			}

			// Alarm Type Selected			
			vm.onAlarmConfigTypeClickHandler = function(value) {
				if(value.length == 0) return;

				if(vm.prometheusConfigInfo.fixingMetricFlag){
					if(vm.prometheusConfigInfo.fixingMetricFlag == 'N' && value[0].data.fixingMetricFlag == 'Y') {
						vm.config.prometheus_original = angular.copy(vm.config.prometheus);
						vm.config.prometheus = value[0].data.fixingMetricInfos;
					}else if(vm.prometheusConfigInfo.fixingMetricFlag == 'Y' && value[0].data.fixingMetricFlag == 'Y') {
						vm.config.prometheus = value[0].data.fixingMetricInfos;
					}else if(vm.prometheusConfigInfo.fixingMetricFlag == 'Y' && value[0].data.fixingMetricFlag == 'N') {
						vm.config.prometheus = vm.config.prometheus_original;
					}

				}else {
					if(value[0].data.fixingMetricFlag == 'Y') {
						vm.config.prometheus = value[0].data.fixingMetricInfos;
					}
				}

				vm.prometheusConfigInfo = value[0].data;

				if(vm.prometheusConfigInfo.fixingTasknameFlag == 'Y') {
					vm.tasknameList = [];
					var tasknames = vm.prometheusConfigInfo.fixingTasknameInfo.split(',');
					_.each(tasknames, function(item){
						var obj = {
							taskname: item
						}
						vm.tasknameList.push(obj);
					});
				}

				ap($scope);
			}


			// method
			vm.getNodeClass = function (parentSeq, key, node) {
				if(node != null && node.label != null && node.label.length > treeLabelMaxLength)
					treeLabelMaxLength = node.label.length;
				
				if(key == 'hostAlarm' && parentSeq == null) {
					return 'metric-child';
				} else if (key == 'prometheus' || key == 'redis') {
					return node.metricSeq == null ? 'display-none' : 'metric-child';
				} else if (parentSeq == 0 || parentSeq == null) {
					return (key == 'system')? 'metric-parent':'display-none';
				} else {
					return 'metric-child';
				}
			};

			vm.checkTreeNode = function (selected, key) {

				// 상위를 체크 또는 해제를 했을 때 하위 노드도 checked 값을 셋팅
				if(selected.treeDepth != null) {
					var list = selected.childrenList;
					if((list != null && list.length > 0) && ((key == 'system' && selected.treeDepth == 0) || (key == 'hostAlarm' && selected.treeDepth == 1))) {
						for (var i = 0; i < list.length; i++)
							list[i].checked = selected.checked;
					}
				}

				// 초기화
				vm.config[key] = [];

				treeConfigSetting(key);
				metricDivScrollHandler();
			};

			vm.selectTreeLabel = function (node, key) {
				var metricFlag = (key == 'metric' && node.treeDepth != 2);
				var hostRootFlag = (key == 'hostAlarm' && node.treeDepth == 0);
				if(!(metricFlag || hostRootFlag))
					node.checked = (node.checked == 'Y')? 'N':'Y';

				vm.checkTreeNode(node, key);

				if(node.childrenList != null && node.childrenList.length > 0) {
					currentProcessSeq = node.processSeq;
					treeExpandedNodeHandler(key, node);
				}
			};

			vm.changeConditionType = function(event) {
				if(event == null || vm.config == null)
					return;

				// codeValue가 0일 경우 'Combination', 1일 경우 'Individual'
				var codeValue = event.codeValue;
				if(codeValue == '1') {
					vm.config.conditions = 'ARITHMETIC';
					vm.inputTypeEnabled = true;
					vm.userDefineEnabled = false;
				} else {
					vm.inputTypeEnabled = false;
				}
			};

			vm.changeInputType = function(event) {
				if(event == null)
					return;

				var codeValue = event.codeValue;
				vm.userDefineEnabled = (codeValue == 'USERDEFINE')? true:false;
				vm.config.conditions = codeValue;

				setTimeout(metricDivScrollHandler, 100);

				if(!vm.userDefineEnabled) {
					delete vm.config.expression;
					delete vm.config.expressionView;
					delete vm.config.expressionCalculate;
					delete vm.config.expressionValue;
					vm.config.expressionCalculate = DEFAULT_CALCULATE_VALUE;
				} else {
					var metrics = vm.config.metric;
					if(metrics == null || metrics.length < 1)
						return;
					for (var i = 0; i < metrics.length; i++) {
						delete vm.config.metric[i].value;
						vm.config.metric[i].calculate = DEFAULT_CALCULATE_VALUE;
					}
				}

			};

			vm.saveBtnClickHandler = function() {
				var flag = dataValidationCheck();
				if(!flag)
					return;

				DataService.httpPost("/activities/alarm/configuration/validateAlarms", vm.config, onValidateAlarmsResultHandler);
			};

			vm.repeatCountChange = function (event) {
				if(event == null)
					return;

				vm.config.repeatCount = event;
			};

			vm.changeValueHandler = function (event, node, key, targetValue) {
				if(event == null)
					return;
				if(!targetValue) targetValue = 'codeValue';

				node[key] = event[targetValue];
			};

			vm.changeSmsFlagHandler = function() {
				var flag = vm.config.smsFlag;
				if(flag == null)
					flag = "Y";

				vm.disableSms = (flag == "Y")? false:true;
				if(vm.disableSms)
					vm.sms.selectedUser = [];
			};

			vm.addSmsUser = function() {

				var popup = ngDialog.open({
					template : "/activities/alarm/popup/user_contact_popup_list.html",
					className: "ngdialog-theme-default custom-width",
					showClose: false,
					disableAnimation: true,
					cache: false,
					closeByDocument: false,
					closeByEscape: false,
					scope: $scope,
					controller: $controller("UserContactPopupCtrl", {
						$rootScope: $rootScope,
						$scope: $scope
					})
				});

				popup.closePromise.then(function(data) {
					if(data == null || data.value == null)
						return;

					var users =  _.union(vm.config.sms, data.value);
					vm.config.sms = users;
					return true;
				});

				var closer = $rootScope.$on('ngDialog.refresh', function(e, id) {
					if (id != popup.id) return;
					closer();
				});
			};

			vm.onDeleteSmsUser = function(event) {
				if (event == null || event.rowData == null)
					return;

				var target = event.rowData.event.target;
				if (target == null || (target.nodeName != "BUTTON" && target.nodeName != "I"))
					return;

				var user = vm.config.sms;
				user = (user == null) ? [] : user;
				user.splice(event.rowData.rowIndex, 1);
				vm.config.sms = angular.copy(user);
			};

			vm.changeAlarmTypeHandler = function(key, init) {
				vm.showTreeType = key;
				vm.conditionType = (key != "hostAlarm")? 0:1;

				if(init == null || init == false) {
					initTreeChecked(key);
					vm.config.alarmName = "";
				}

				vm.config.system = [];
				treeConfigSetting('system');
				setTimeout(metricDivScrollHandler, 800);

				var hostDiv = angular.element("#hostAlarmTitleDiv");
				if(vm.showTreeType == 'hostAlarm') {
					delete vm.config.metric;
					hostDiv.css("border-top", "none");
					hostDiv.css("border-bottom", "1px #ddd solid");
					vm.config.severity = "CR";
				} else {
					delete vm.config.host;
					hostDiv.css("border-top", "1px #ddd solid");
					hostDiv.css("border-bottom", "none");
				}
			};

			
			vm.treeOnSelectionHandler = function(node, expanded, key) {
				if(expanded) {
					currentProcessSeq = node.processSeq;
					treeExpandedNodeHandler(key, node);
				}
			};


			// function
			function initTreeChecked(key) {
				var list = vm.tree[key];
				if(list == null || list.length < 1)
					return;

				vm.tree[key + "Expanded"] = [];
				treeExpandedNodeHandler(key, list[0]);

				var childTreeChecked = function(list) {
					let len = list.length;
					for (var i = 0; i < len; i++) {
						list[i].checked = 'N';
						if(list[i].childrenList != null && list[i].childrenList.length > 0)
							childTreeChecked(list[i].childrenList);
					}
				};

				let len = list.length;
				for (var i = 0; i < len; i++) {
					list[i].checked = 'N';
					if(list[i].childrenList != null && list[i].childrenList.length > 0)
						childTreeChecked(list[i].childrenList);
				}
			}

			function treeConfigSetting(key) {
				var list = vm.tree[key];
				if(list == null || list.length < 1)
					return;

				var len = list.length;
				for (var i = 0; i < len; i++) {
					var node = list[i];
					if(node.treeDepth == 0) {

						// key == 'system' 이면서 하위 node 가 모드 체크 됐을경우 상위 노드 체크, 또는 하나라도 체크 안됐을경우 상위 체크 해제
						if(key === 'system' && node.childrenList.length > 0) {						
							var chkLen = 0;
							for(var k=0; k < node.childrenList.length; k++) {
								if(node.childrenList[k].checked === 'Y') {
									chkLen++;									
								}
							}

							if(chkLen === node.childrenList.length) {
								list[i].checked = 'Y';
							}else {
								list[i].checked = 'N';
							}
						}

						// metric 알람인 경우엔 system 전체를 선택했을 때 cluster 한개만 들어가야함.
						if (key == 'system' && node.checked == 'Y' && vm.showTreeType == 'metric') {
							vm.config[key].push(node);
							treeExpandedNodeHandler(key, node);
							continue;
						}

						var childExpanded = treeChildConfigSetting(key, node);
						if(childExpanded) {
							treeExpandedNodeHandler(key, node);
						}
					}

					
				}
			}

			function treeChildConfigSetting(key, parent) {
				if(parent == null)
					return false;

				var children = parent.childrenList;
				if(children == null || children.length < 1)
					return false;

				var result = false;
				var checkNum = 0;
				for(var i=0; i<children.length; i++) {
					var child = children[i];
					var childExpanded = false;
					if(child.childrenList != null && child.childrenList.length > 0)
						childExpanded = treeChildConfigSetting(key, child);

					if(childExpanded)
						checkNum++;

					if (child.checked == 'Y') {
						checkNum++;
						vm.config[key].push(child);
					}
				}

				if(checkNum > 0) {
					treeExpandedNodeHandler(key, parent);
					if(checkNum < children.length)
						parent.checked = 'N';

					result = true;
				}
				return result;
			}

			function treeExpandedNodeHandler(key, node) {
				let list = vm.tree[key + "Expanded"];
				let uniqueKey = uniqueKeyMap[key];
				let keyMap = _.indexBy(list, uniqueKey);

				let exist = false;
				let len = list.length;
				for(var i=0; i<len; i++) {
					if(keyMap[node[uniqueKey]] != null) {
						exist = true;
						break;
					}
				}

				if(!exist)
					keyMap[node[uniqueKey]] = node;

				let result = [];
				let keyMapKeys = Object.keys(keyMap);
				let keyMapLen = keyMapKeys.length;
				for(var i=0; i<keyMapLen; i++) {
					var data = keyMap[keyMapKeys[i]];

					// metric 트리인 경우에는 현재 펼친 node의 processSeq 기준으로 한가지 process만 펼칠 수 있음.
					if(key == 'metric' && currentProcessSeq != null && data.processSeq != currentProcessSeq)
						continue;

					result.push(data);
				}

				if(result != null && result.length > 0)
					vm.tree[key + "Expanded"] = result;
			}

			function saveAlarm() {
				var path = (vm.POPUP_TYPE == 'ADD')? "/addAlarm":"/updateAlarm";
				DataService.httpPost('/activities/alarm/configuration/'+path, vm.config, function(data) {
					if(data != null && data.data == true) {
						$scope.closeThisDialog(vm.config);
					}
				});
			}

			function dataValidationCheck() {
				var type = vm.showTreeType;
				var data = vm.config;
				var metrics = [];

				vm.config.type = type;

				// System
				if(type == "metric" || type == 'hostAlarm' || type == 'redis') {
					if(data.system == null || data.system.length < 1) {
						alert("Please select the system.");
						return false;
					}
				}


				if(type == 'metric') {
					metrics = data.metric;
				}else if(type == 'prometheus') {					
					metrics = data.prometheus;					
					vm.config.systemSeq = ConfigManager.getSystemSeq();
					vm.config.alarmType = vm.prometheusConfigInfo.alarmType;
				}else if(type == 'redis') {
					metrics = data.redis;
				}
				

				// Metric
				if(type == "metric" || type == 'prometheus' || type == 'redis') {

					if (metrics == null || metrics.length < 1) {
						alert("Please select the metric.");
						return false;
					}

					// Alarm Name
					if (data.alarmName == null || data.alarmName == "") {
						alert("Please enter the alarm name.");
						return false;
					}

					// Threshold(Operator+Value) - Metric
					var combiFlag = (vm.inputTypeEnabled) ? false : true;
					vm.config.combinationFlag = combiFlag;

					var userDefineFlag = vm.userDefineEnabled;
					vm.config.userDefineFlag = userDefineFlag;

					if (combiFlag && userDefineFlag) {
						let v = angular.copy(data.expressionView);
						if (v == null || v == "") {
							alert("Please enter the Arithmetic.");
							return false;
						}

						// 다른 숫자를 넣었을 때도 체크($\d)인걸 찾아서 체크...
						var sourceMap = _.indexBy(metrics, 'userDefineKey');
						var target = v.match(/(\$([0-9]*))/gm);
						if(target == null || target.length < 1) {
							alert('At least one metric must be included in the expression.');
							return false;
						}

						for(var i=0; i<target.length; i++) {
							if(sourceMap[target[i]] == null) {
								alert('Please check the Arithmetic.');
								return false;
							}
						}

						// 맞는 연산식인지 확인하기 위해 임의 숫자를 넣고 체크
						// 귀찮으니까 변수의 '$'만 제거해서 체크
						v = v.replace(/\$/gm, '');
						try {
							eval(v);
						} catch (e) {
							alert("Please check the Arithmetic.");
							return false;
						}

						if (data.expressionValue == null || data.expressionValue == "") {
							alert('Please enter the value.');
							return false;
						}

						// expression 셋팅
						if (vm.config.metric != null) {
							//var metric = data.metric;
							var len = metrics.length;
							let value = angular.copy(data.expressionView);
							for (var i = 0; i < len; i++) {
								if (metrics[i].userDefineKey != null && value.indexOf(metrics[i].userDefineKey) > -1) {
									value = CommonUtil.replaceAll(value, metrics[i].userDefineKey, metrics[i].metricName);
								}
							}
							vm.config.expression = value;
						}

					} else {
						//var metric = data.metric;
						var len = metrics.length;
						for (var i = 0; i < len; i++) {
							if (metrics[i].value == null || metrics[i].value == "") {
								alert(`Please enter the metric(${metrics[i].metricName}) value.`);
								return false;
							}
						}
					}

					// Process List - 선택한 Metric에 대해(cm_event_config에 시스템과 process 별로 넣어줘야 하기 때문에 필요)
					if (metrics != null && metrics.length > 0) {
						var processList = _.groupBy(metrics, 'processSeq');
						var keys = Object.keys(processList);
						if(keys.length > 1) {
							alert("Please select only one type of process.");
							return false;
						}
						vm.config.processSeq = keys[0];
					}

					// Condition Count
					vm.config.conditionCount = (combiFlag) ? metrics.length : 1;
				}

				if(type == "hostAlarm") {
					if(data.hostAlarm == null || data.hostAlarm.length < 1) {
						alert("Please select the host alarm.");
						return false;
					}
				}

				// Repeat Count
				if(data.repeatCount == null || data.repeatCount == "") {
					alert('Please enter the repeat count.');
					return false;
				}

				// SMS
				if(data.smsFlag != null && data.smsFlag == 'Y' && data.sms != null && data.sms.length > 0) {
					let dupContact = {};
					let dupEmail = {};
					let validateContact = function (contact, data) {
						if(dupContact[contact] != null) {
							alert("Please check the contact. There is a duplicate contact in the list.");
							return false;
						} else {
							dupContact[contact] = data;
						}
						return true;
					};
					let validateEmail = function (email, data) {
						if(dupEmail[email] != null) {
							alert("Please check the email. There is a duplicate email in the list.");
							return false;
						} else {
							dupEmail[email] = data;
						}
						return true;
					};

					var smsList = data.sms;
					var slen = smsList.length;
					for(var i=0; i<slen; i++) {

						let contact = smsList[i].contact;
						let email = smsList[i].email;
						var type = (smsList[i].selectType == null || smsList[i].selectType == "") ? "all" : smsList[i].selectType.toLowerCase();
						if (type == "all") {
							if (contact != null && contact != "" && !validateContact(contact, smsList[i]))
								return false;
							if (email != null && email != "" && !validateEmail(email, smsList[i]))
								return false;
						} else if (type == "sms" && !validateContact(contact, smsList[i])) {
							delete smsList[i].email;
							return false;
						} else if (type == "email" && !validateEmail(email, smsList[i])) {
							delete smsList[i].contact;
							return false;
						}
					}
				}

				return true;
			}

			function initComponent() {
				vm.config = {};
				vm.config.repeatCount = 1;
				vm.config.severity = 'CR';
				vm.config.useFlag = 'Y';
				vm.config.smsFlag = 'N';
				vm.config.sms = [];
				vm.tree = {};
				vm.treeOptions = {
					nodeChildren: "childrenList",
					dirSelectable: true
				};

				vm.changeAlarmTypeHandler($scope.param.type, true);

				if($scope.param.data == null) {
					vm.POPUP_TYPE = "ADD";
				} else {
					vm.POPUP_TYPE = "UPDATE";
					vm.config = $scope.param.data;
					if(vm.config.conditions == 'USERDEFINE') {
						vm.userDefineEnabled = true;
					}
					getSmsUsers(vm.config);
				}
			}

			function getSmsUsers(param) {
				if(param == null || param.eventSeq == null)
					return;

				DataService.httpPost("/activities/alarm/configuration/getSmsUsers", param, onGetSmsUserResultHandler, false);
			}

			function expandTreeHandler(key) {
				if(key == null || key == "" || vm.tree[key] == null)
					return;

				// 초기화
				vm.config[key] = [];
				vm.tree[key + "Expanded"] = [];

				var list = vm.tree[key];
				if(vm.POPUP_TYPE == "ADD") {
					treeExpandedNodeHandler(key, list[0]);
					return;
				}

				treeConfigSetting(key);
			}

			function metricDivScrollHandler() {
				var metrics = [];
				var metricDiv = angular.element('#conditionArea');

				var heightPerOne = 32;
				var minimumHeight = 140;
				var maximumHeight = 370;
				var currentMetricDivHeight;
				var userDefineHeight = vm.userDefineEnabled == true ? 43 : 0;

				if(vm.showTreeType == 'metric' || vm.showTreeType == 'redis') {
					metrics = vm.config.metric;					
				} else if(vm.showTreeType == 'prometheus') {					
					if(vm.prometheusConfigInfo.topicUseFlag == 'Y' || vm.prometheusConfigInfo.fixingTasknameFlag == 'Y') {
						heightPerOne = 80;
					}else {
						heightPerOne = 40;
					}
					metrics = vm.config.prometheus;
					
				}

				currentMetricDivHeight = (metrics == null || metrics.length < 1)? minimumHeight:(metrics.length * heightPerOne)+userDefineHeight;
			
				if(minimumHeight < currentMetricDivHeight) {
					angular.element("#alarmConfigDiv").addClass('mu-scroll-v');
				} else {
					angular.element("#alarmConfigDiv").removeClass('mu-scroll-v');
				}

				if (metrics && currentMetricDivHeight > maximumHeight) {
					metricDiv.css("height", maximumHeight);
					metricDiv.addClass('mu-scroll-v');
				} else {
					var h = (currentMetricDivHeight < minimumHeight)? minimumHeight:currentMetricDivHeight;
					metricDiv.css("height", h);
					metricDiv.removeClass('mu-scroll-v');
				}
			}

			// Topic 데이타 요청
			function getTopicList() {               
				DataService.httpGet("/service/kafka/new/getTopicList?systemSeq=" + ConfigManager.getSystemSeq(), {}, function(result) {
					if (result.result === 1 && result.data !== null) {
						vm.topicList = result.data;
						vm.topicList.unshift({
							topicLabel: '-- Not Selected --',
							topic: ''
						})
					}
				});
			}

      /* Prometheus 정보 요청 */
			function getPrometheusConfigInfo() {							
				var param = {
					system_parent_seq: ConfigManager.getSystemSeq(),
					serviceType: 4,
					eventSeq : ''
				};			
				if(vm.POPUP_TYPE == 'UPDATE' && $scope.param.data.eventSeq != null) {
					param.eventSeq = $scope.param.data.eventSeq;
				}

				DataService.httpPost("/activities/alarm/configuration/getPrometheusConfigInfo", param,  onGetPrometheusConfigInfoResult, false);
			}

			/* Redis 정보 요청 */
			function getRedisConfigInfo() {							
				var param = {
					system_parent_seq: ConfigManager.getSystemSeq(),				
					eventSeq : ''
				};			
				if(vm.POPUP_TYPE == 'UPDATE' && $scope.param.data.eventSeq != null) {
					param.eventSeq = $scope.param.data.eventSeq;
				}

				DataService.httpPost("/activities/alarm/configuration/getRedisConfigInfo", param,  onGetRedisConfigInfoResult, false);
			}

			function getTreeData() {
				var param = {};
				param.system_parent_seq = ConfigManager.getSystemSeq();
				if(vm.POPUP_TYPE == 'UPDATE' && $scope.param.data.eventSeq != null) {
					param.eventSeq = $scope.param.data.eventSeq;
				}

				DataService.httpPost("/activities/alarm/configuration/getAlarmPopupCondition", param, onGetTreeDataResult, false);
			}

			function addEventListener() {
				unbind = [
					$scope.$on('$destroy', destroy)
				];
			}

			function initialize() {
				systemSeq = ConfigManager.getSystemSeq();

				initComponent();
				addEventListener();
				getTreeData();
				getTopicList();
				getPrometheusConfigInfo();			
				getRedisConfigInfo();	
			}

			function clear() {
				delete vm.tree;
				delete vm.config;
				delete vm.sms;
				delete vm.treeOptions;
				delete vm.showTreeType;
				delete vm.conditionType;
				delete vm.inputTypeEnabled;
				delete vm.userDefineEnabled;
				delete vm.disableSms;

				currentProcessSeq = null;
				vm.POPUP_TYPE = null;
				systemSeq = null;
				unbind = null;
				vm = null;
			}

			initialize();
	}]);
});