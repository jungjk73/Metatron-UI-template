define(["app"], function (app) {
	app.controller("ProvisioningCtrl", ["$rootScope", "$scope", "$interval", "ConfigManager", "DataService", "ngDialog", "CommonUtil",
		function ($rootScope, $scope, $interval, ConfigManager, DataService, ngDialog, CommonUtil) {
			"use strict";
			
			// property
			var provisioningCtrl = this;
			var unbind = [];
			var TIMER;
			var INTERVAL_TIME = 1000 * 10;
			var i = 0;
			var pageMap = {
				"STEP1": "/administrator/provisioning/service-install.html",
				"STEP2": "/administrator/provisioning/host-select.html",
				"STEP3": "/administrator/provisioning/program-select.html"
			};

			
			provisioningCtrl.template = "";
			provisioningCtrl.programList = [];
			provisioningCtrl.param = {};
			provisioningCtrl.targetHostText = "";
			provisioningCtrl.tarDirectory = "";
			provisioningCtrl.syncBtnStatus = "disabled";


			// event-handler
			function onInstallStatusListResult(data) {
				if(data == null || data.data == null)
					return;

				var list = data.data.list;
				var status = true;
				var len = list.length;
				for (i = 0; i < len; i++) {
					var obj = list[i];
					if (obj.hasOwnProperty("children")) {
						var child = obj.children;
						var child_len = child.length;
						for (var j = 0; j < child_len; j++) {
							if (!child[j].status) {
								status = false;
								return;
							}
						}
					}
				}

				provisioningCtrl.syncBtnStatus = "";
				provisioningCtrl.installStatusList = list;

				if (status == true) {
					$interval.cancel(TIMER);
					TIMER = null;
				}
			}

			function onGetInstallProgramListResult(data) {
				var group_list = _.groupBy(data.data.list, "os_name");
				if (group_list.hasOwnProperty("Centos6")) {
					provisioningCtrl.installList1 = group_list.Centos6;
				}

				if (group_list.hasOwnProperty("Centos7")) {
					provisioningCtrl.installList2 = group_list.Centos7;
				}
			}

			function onInstallListResult(data) {
				provisioningCtrl.param = {};
				provisioningCtrl.param.session_id = data.data;

				provisioningCtrl.getInstallStatusList();
				createTimer(provisioningCtrl.getInstallStatusList)
			}

			function onChangeSystemSeqEventHandler(event, data) {
				if (data == null)
					return;
				changeStep("STEP1");
				getData();
			}

			function onGridDeleteBtnEventHandler(event, data) {
				ap($scope);
			}
			
			function onAddHostListResult(data) {
				if (data.data) {
					provisioningCtrl.param = data.data;
					provisioningCtrl.getInstallHostList();
					createTimer(provisioningCtrl.getInstallHostList);
				}
			}

			function onInstallHostListResult(data) {
				provisioningCtrl.installHostList = data.data.list;

				var status = true;
				var len = provisioningCtrl.installHostList.length;
				for (i = 0; i < len; i++) {
					var obj = provisioningCtrl.installHostList[i];
					if (!obj.connect_status) {
						status = false;
						break;
					}
				}

				if (status == true) {
					provisioningCtrl.installHostList_SUCCESS = _.groupBy(provisioningCtrl.installHostList, "connect_status");
					if (provisioningCtrl.installHostList_SUCCESS.hasOwnProperty("success")) {
						provisioningCtrl.installHostList_SUCCESS = provisioningCtrl.installHostList_SUCCESS.success;
						if (provisioningCtrl.programList.length > 0) {
							len = provisioningCtrl.programList.length;
							for (i = 0; i < len; i++) {
								var obj = provisioningCtrl.programList[i];
								obj.child = angular.copy(provisioningCtrl.installHostList_SUCCESS);
							}
						}
						provisioningCtrl.nextPage = true;
					} else {
						provisioningCtrl.nextPage = false;
					}
					$interval.cancel(TIMER);
					TIMER = null;
				}
			}

			function destroy() {
				unbind.forEach(function (fn) {
					fn();
					ngDialog.closeAll();
					clear();
				});
			}
			
			
			// method
			provisioningCtrl.gridRowClickHandler = function (event, value) {
				var program_len = provisioningCtrl.programList.length;
	
				if (value.checked == true) {
					if (event.currentTarget.id.indexOf("centos6") > -1) {
						provisioningCtrl.centos7Disable = "Y";
					} else if (event.currentTarget.id.indexOf("centos7") > -1) {
						provisioningCtrl.centos6Disable = "Y";
					}
					value.child = angular.copy(provisioningCtrl.installHostList_SUCCESS);
					provisioningCtrl.programList.push(value);
				} else {
					for (i = 0; i < program_len; i++) {
						var obj = provisioningCtrl.programList[i];
						if (value.install_seq == obj.install_seq) {
							provisioningCtrl.programList.splice(i, 1);
							program_len--;
							i--;
						}
					}
	
					if (provisioningCtrl.programList.length == 0) {
						provisioningCtrl.centos7Disable = "N";
						provisioningCtrl.centos6Disable = "N";
					}
				}
			};
	
			provisioningCtrl.textAreaToGrid = function () {

				if(CommonUtil.checkEmpty(provisioningCtrl.targetHostText)) {
					alert("Please enter the target host.");
					return;
				}

				provisioningCtrl.sudoPassword = "";
				provisioningCtrl.sudoID = "";
				provisioningCtrl.rootPassword = "";

				var hostList = checkInstallHost();
				if(hostList == null || hostList.length < 1) {
					alert("Please check the target host.")
					return;
				}
				provisioningCtrl.addHostList = hostList;

				var popup = ngDialog.open({
					template: "/administrator/provisioning/password-checked-popup.html",
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
	
			provisioningCtrl.checkPassword = function () {
				if(CommonUtil.checkEmpty(provisioningCtrl.rootPassword)) {
					alert("Please enter the Root password.");
					return;
				}
	
				if(CommonUtil.checkEmpty(provisioningCtrl.sudoID)) {
					alert("Please enter the sudo ID.");
					return;
				}
	
				if(CommonUtil.checkEmpty(provisioningCtrl.sudoPassword)) {
					alert("Please enter the sudo password.");
					return;
				}

				ngDialog.closeAll();
				var param = {};
				param.sudo_password = provisioningCtrl.sudoPassword;
				param.sudo_id = provisioningCtrl.sudoID;
				param.root_password = provisioningCtrl.rootPassword;
				param.hostList = provisioningCtrl.addHostList;
				param.system_seq = ConfigManager.getSystemSeq();
	
				DataService.httpPost("/admin/provisioning/addHostList", param, onAddHostListResult);
	
				provisioningCtrl.sudoPassword = "";
				provisioningCtrl.sudoID = "";
				provisioningCtrl.rootPassword = "";
			};
	
			provisioningCtrl.getInstallHostList = function () {
				DataService.httpPost("/admin/provisioning/installHostList", provisioningCtrl.param, onInstallHostListResult);
			};

			provisioningCtrl.nextClickHandler = function (key, last) {
				ngDialog.closeAll();

				if(CommonUtil.checkEmpty(provisioningCtrl.targetHostText)) {
					alert("Please enter the target host.");
					return;
				}

				if (!provisioningCtrl.installHostList_SUCCESS || provisioningCtrl.installHostList_SUCCESS.length == 0) {
					alert("Please check the target host or host status.");
					return;
				}

				if (provisioningCtrl.nextPage == false) {
					alert("Please add success host.");
					return;
				}

				if (!provisioningCtrl.programList || provisioningCtrl.programList.length == 0) {
					alert("Please select install program list.");
					return;
				}
	
				if (last == true) {
					var c = confirm("Do you want to Application install?");
					if (!c) {
						return;
					}
	
					installProgramList(key);
				} else {
					// package type check
					var type = _.indexBy(provisioningCtrl.programList, 'package_type');
					if(type != null && type.hasOwnProperty("TAR.GZ")) {
						openTarPathConfigPop();
					} else {
						changeStep(key);
					}
				}
			};
	
			provisioningCtrl.preClickHandler = function (key) {
				changeStep(key);
			};
	
			provisioningCtrl.programHostChange = function (event, value, parent) {
				var len = provisioningCtrl.installHostList_SUCCESS.length;
				for (i = 0; i < len; i++) {
					var host = provisioningCtrl.installHostList_SUCCESS[i];
					if (host.input_host == value.input_host) {
						if (value.checked == true) {
							if (!host.hasOwnProperty("child"))
								host.child = [];
	
							var program = {};
							program.package_name = parent.package_name;
							program.install_seq = parent.install_seq;
							host.child.push(program);
						} else {
							var j = 0;
							var child_len = host.child.length;
							for (j = 0; j < child_len; j++) {
								var host_child = host.child[j];
								if (host_child.package_name == parent.package_name) {
									host.child.splice(j, 1);
									j--;
								}
	
							}
						}
						break;
					}
				}
			};

			provisioningCtrl.getInstallStatusList = function () {
				DataService.httpPost("/admin/provisioning/installStatusList", provisioningCtrl.param, onInstallStatusListResult);
			};

			provisioningCtrl.setTarPathConfig = function() {
				ngDialog.closeAll();
				changeStep("STEP2");
			}
			
			
			// function
			function checkInstallHost() {
				if(CommonUtil.checkEmpty(provisioningCtrl.targetHostText))
					return null;
				
				var host = provisioningCtrl.targetHostText.toUpperCase();
				var hostArray = host.split("\n");
				hostArray = _.filter(hostArray, function(data){
					if(data.length > 1 && data.match(CommonUtil.REGEXP_IP_AND_HOST))
						return data.replace(/(\t+)|(\s+)/gi, "");
				});

				return _.uniq(hostArray);
			}

			function changeStep(key) {
				if(key == null || key == "")
					return;

				provisioningCtrl.template = pageMap[key];
			}

			function openTarPathConfigPop() {
				var popup = ngDialog.open({
					template: "/administrator/provisioning/tar_path_config_pop.html",
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

			function createTimer(fn) {
				TIMER = $interval(fn, INTERVAL_TIME);
			}
	
			function getData() {
				DataService.httpPost("/admin/provisioning/getInstallProgramList", {}, onGetInstallProgramListResult);
			}
	
			function installProgramList(key) {
				var len = provisioningCtrl.installHostList_SUCCESS.length;
				var install_list = [];
				for (i = 0; i < len; i++) {
					var host = provisioningCtrl.installHostList_SUCCESS[i];
					if (host.hasOwnProperty("child")) {
						var child_len = host.child.length;
						for (var j = 0; j < child_len; j++) {
							var child = host.child[j];
							child.system_ip = host.system_ip;
							child.system_name = host.system_name;
							child.home_path = provisioningCtrl.tarDirectory;
	
							install_list.push(child);
						}
					}
				}
	
				if (install_list.length == 0) {
					alert("Please select program list.");
					return;
				}
	
				var param = {};
				param.install_list = install_list;
				param.session_id = provisioningCtrl.param.session_id;

				DataService.httpPost("/admin/provisioning/installList", param, onInstallListResult);
				changeStep(key);
			}
	
			function addEventListener() {
				unbind = [
					$scope.$on(ConfigManager.getEvent("CHANGE_SYSTEM_SEQ_EVENT"), onChangeSystemSeqEventHandler),
					$rootScope.$on(ConfigManager.getEvent("GRID_DELETE_BTN_EVENT"), onGridDeleteBtnEventHandler),
					$scope.$on('$destroy', destroy)
				];
			}
	
			function initialize() {
				changeStep("STEP1");
				addEventListener();
				getData();
			}

			function clear() {
				delete provisioningCtrl.template;
				delete provisioningCtrl.programList;
				delete provisioningCtrl.param;
				delete provisioningCtrl.installStatusList;
				delete provisioningCtrl.installList1;
				delete provisioningCtrl.installList2;
				delete provisioningCtrl.installHostList_SUCCESS;
				delete provisioningCtrl.nextPage;
				delete provisioningCtrl.centos7Disable;
				delete provisioningCtrl.centos6Disable;
				delete provisioningCtrl.sudoPassword;
				delete provisioningCtrl.sudoID;
				delete provisioningCtrl.rootPassword;
				delete provisioningCtrl.targetHostText;
				delete provisioningCtrl.addHostList;
				delete provisioningCtrl.tarDirectory;

				$interval.cancel(TIMER);

				unbind = null;
				TIMER = null;
				INTERVAL_TIME = null;
				i = null;
			}
	
			initialize();
	}]);
});

