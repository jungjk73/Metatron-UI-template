define(["app", "moment"], function (app, moment) {
	app.controller("ApplicationManagementCtrl", ["$rootScope", "$scope", "$http", "$timeout", "$controller", "ConfigManager", "DataService", "CommonUtil", "ngDialog",
		function ($rootScope, $scope, $http, $timeout, $controller, ConfigManager, DataService, CommonUtil, ngDialog) {
			"use strict";

			// property
			var applicationManagementCtrl = this;
			var systemSeq;
			var unbind = [];
			var processGridSelectedArr = [];
			applicationManagementCtrl.processHostList = [];


			// event-handler
			function onChangeSystemGroupIdEventHandler(event, data) {
				if (data == null)
					return;

				systemSeq = ConfigManager.getSystemSeq();
				// getData();
				getProcessList();
			}

			function onGetHadoopRackListHandler(event) {
				if (event == null)
					return;

				var list = (event.data == null)? []:event.data;				
				applicationManagementCtrl.hostList = list;

				var visible = _.groupBy(applicationManagementCtrl.hostList, "visible");
				var visibleYCount = (visible['Y'] == null)? 0:visible['Y'].length;
				applicationManagementCtrl.hostListSize = visibleYCount;

				onGetProcessHostList();
			}

			function onGetProcessHostListResult(data) {
				if(data == null || data.data == null)
					return;

				var list = (data.data.list == null)? []:data.data.list;
				applicationManagementCtrl.processHostList = list;
				applicationManagementCtrl.process_port = "";

				if (applicationManagementCtrl.processHostList.length > 0)
					applicationManagementCtrl.process_port = Number(applicationManagementCtrl.processHostList[0].processPort);

				applicationManagementCtrl.onChangeCheckHost();
			}

			function onGetProcessHostList() {
				var param = {};
				param.processParentSeq = applicationManagementCtrl.process_parent_seq;
				param.processSeq = applicationManagementCtrl.process_seq;
				param.systemSeq = systemSeq;

				DataService.httpPost("/admin/application/getProcessHostList", param, onGetProcessHostListResult);
			}

			function onGetProcessListByTypeReslut(data) {
				if(data == null || data.data == null)
					return;

				var list = (data.data.list == null)? []:data.data.list;
				applicationManagementCtrl.processList = list;
			}
			
			function onSaveApplicationInfoResult(data) {
				getData();
			}


			// method
			applicationManagementCtrl.hostGridRowClick = function (value) {
				processGridSelectedArr = [];
				for (var h in value) {
					value[h].data.checked = "true";
					processGridSelectedArr.push(value[h].data);
				}
			};

			applicationManagementCtrl.onDeleteButtonDirectiveHandler = function(event) {
				if (event == null || event.rowData == null)
					return;

				var target = event.rowData.event.target;
				if (target == null || (target.nodeName != "BUTTON" && target.nodeName != "I"))
					return;

				var list = applicationManagementCtrl.processHostList;
				list = (list == null) ? [] : list;
				list.splice(event.rowData.rowIndex, 1);
				applicationManagementCtrl.processHostList = angular.copy(list);
			};

			applicationManagementCtrl.onChangeProcess = function (event) {
				var nullSelect = [{label: "", value: ""}];
				applicationManagementCtrl.processListChild = event.children.length == 0 ? nullSelect : event.children;
				applicationManagementCtrl.process_parent_seq = event.value;
				ap($scope)
			};

			applicationManagementCtrl.onChangeProcessChild = function (event) {
				applicationManagementCtrl.process_seq = event.value;
				applicationManagementCtrl.process_name = event.label;
				getData();
			};

			applicationManagementCtrl.onClickProcessConf = function(event) {

				var popup = ngDialog.open({
					template: "/common/popup/process_management_popup.html",
					className: "ngdialog-theme-default custom-width",
					showClose: false,
					disableAnimation: true,
					cache: false,
					closeByDocument: false,
					closeByEscape: false,
					scope: $scope,
					controller: $controller("ProcessManagementCtrl", {
						$scope: $scope
					})
				});

				var closer = $rootScope.$on('ngDialog.refresh', function (e, id) {
					if (id != popup.id) return;
					closer();
				});
			};

			applicationManagementCtrl.onChangeCheckHost = function (event, value) {
				var saveBtn = angular.element(document.getElementsByClassName('save'));

				var grade = _.groupBy(applicationManagementCtrl.hostList, "checked");

				if (grade.hasOwnProperty("true") && grade['true'].length > 0)
					saveBtn.removeClass("disabled");
				else
					saveBtn.addClass("disabled");

				var len = applicationManagementCtrl.hostList.length;
				for (var i = 0; i < len; i++) {
					var host = applicationManagementCtrl.hostList[i];
					applicationManagementCtrl.hostCheckAll = true;
					if (host.checked == "false") {
						applicationManagementCtrl.hostCheckAll = false;
						break;
					}
				}

				if(applicationManagementCtrl.hostListSize < 1) {
					saveBtn.addClass("disabled");
					applicationManagementCtrl.hostCheckAll = false;
				}

				ap($scope)
			};

			applicationManagementCtrl.onCheckHostAll = function (value) {
				var len = applicationManagementCtrl.hostList.length;
				for (var i = 0; i < len; i++) {
					applicationManagementCtrl.hostList[i]['checked'] = applicationManagementCtrl.hostCheckAll.toString();
				}

				var saveBtn = angular.element(document.getElementsByClassName('save'));

				if (applicationManagementCtrl.hostCheckAll.toString() == "true")
					saveBtn.removeClass("disabled");
				else
					saveBtn.addClass("disabled");
				ap($scope)
			};

			applicationManagementCtrl.addHost = function (event) {
				var target = angular.element(event.target);
				if (target.hasClass("disabled"))
					return;

				processGridSelectedArr = [];
				applicationManagementCtrl.addGridData = [];
				if (applicationManagementCtrl.hostList) {
					var len = applicationManagementCtrl.hostList.length;
					for (var i = 0; i < len; i++) {
						if (applicationManagementCtrl.hostList[i]['checked'] == "true") {
							applicationManagementCtrl.hostList[i].visible = "N";
							var host = angular.copy(applicationManagementCtrl.hostList[i]);
							host.checked = "false";
							host.processName = applicationManagementCtrl.process_name;
							host.processSeq = applicationManagementCtrl.process_seq;
							host.processPort = applicationManagementCtrl.process_port;
							host.useFlag = 'Y';
							host.dummy = 'Y';
							applicationManagementCtrl.processHostList.push(host);
						}
					}
				}

				applicationManagementCtrl.processHostList = _.uniq(applicationManagementCtrl.processHostList, "systemSeq");

				var visible = _.groupBy(applicationManagementCtrl.hostList, "visible");
				applicationManagementCtrl.hostListSize = visible['Y'] != null ? visible['Y'].length : 0;

				ap($scope);
			};

			applicationManagementCtrl.deleteHost = function () {
				console.log(processGridSelectedArr);
				for (var i = 0; i < processGridSelectedArr.length; i++) {
					var obj = processGridSelectedArr[i];
					for (var j = 0; j < applicationManagementCtrl.processHostList.length; j++) {
						if (applicationManagementCtrl.processHostList[j].systemSeq == obj.systemSeq) {
							applicationManagementCtrl.processHostList.splice(j, 1);

						}
					}
				}
				applicationManagementCtrl.refreshGrid = !applicationManagementCtrl.refreshGrid;

				for (var l = 0; l < processGridSelectedArr.length; l++) {
					var o = processGridSelectedArr[l];
					for (var k = 0; k < applicationManagementCtrl.hostList.length; k++) {
						var obj = applicationManagementCtrl.hostList[k];
						if (obj.systemSeq == o.systemSeq) {
							obj.checked = "false";
							obj.visible = "Y";
						}
					}
				}

				var visible = _.groupBy(applicationManagementCtrl.hostList, "visible");
				applicationManagementCtrl.hostListSize = visible['Y'].length;
			};

			applicationManagementCtrl.cancelHost = function () {
				applicationManagementCtrl.deleteGridData = angular.copy(applicationManagementCtrl.processHostList);
			};

			applicationManagementCtrl.saveApplicationList = function () {

				var list = applicationManagementCtrl.processHostList;
				var len = list.length;
				for(var i=0; i<len; i++) {
					var port = list[i].processPort + "";
					if(port.match(CommonUtil.REGEXP_PORT) == null) {
						alert("It does not match the port format.");
						return;
					}
				}

				var param = {};
				param.type = "SAVE";
				param.list = list;
				param.systemParentSeq = systemSeq;
				param.processSeq = applicationManagementCtrl.process_seq;
				DataService.httpPost("/admin/application/saveApplicationInfo", param, onSaveApplicationInfoResult);
				param = null;
			};

			applicationManagementCtrl.processPortChange = function () {
				applicationManagementCtrl.reloadData = [];
				for (var i = 0; i < applicationManagementCtrl.processHostList.length; i++) {
					applicationManagementCtrl.processHostList[i]['processPort'] = applicationManagementCtrl.process_port;
				}
				applicationManagementCtrl.processHostList = angular.copy(applicationManagementCtrl.processHostList);
			};

			// function
			function initialize() {
				systemSeq = ConfigManager.getSystemSeq();
				addEventListener();
				getProcessList();
			}

			function getData() {
				var param = {};
				param.systemSeq = systemSeq;
				param.processSeq = applicationManagementCtrl.process_seq;
				DataService.httpPost("/admin/application/getHostList", param, onGetHadoopRackListHandler);
			}

			function getProcessList() {
				var param = {};
				param.system_seq = systemSeq;
				DataService.httpPost("/admin/service/getProcessListByType", param, onGetProcessListByTypeReslut);
			}

			function addEventListener() {
				unbind = [
					$scope.$on(ConfigManager.getEvent("CHANGE_SYSTEM_SEQ_EVENT"), onChangeSystemGroupIdEventHandler),
					$scope.$on('$destroy', destroy)
				];
			}

			function destroy() {
				unbind.forEach(function (fn) {
					fn();
				});

				applicationManagementCtrl = null;
			}

			initialize();
	}]);
});