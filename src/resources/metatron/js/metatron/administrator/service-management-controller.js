define(["app", "moment"], function (app, moment) {
	/**
	 * Master 는 하나만 선택하도록 한다
	 * Slave 는 여러개 선택할수 있다
	 * Master와 Slave 동시에 선택할 수 없다
	 * Dead 상태인 노드는 Start 만 가능.
	 * Active 상태인 노드는 Stop 만 가능
	 */
	app.controller("ServiceManagementCtrl", ["$rootScope", "$scope", "$http", "$interval", "$timeout", "ConfigManager", "DataService", "ngDialog", function ($rootScope, $scope, $http, $interval, $timeout, ConfigManager, DataService, ngDialog) {
		"use strict";
		var serviceManagementCtrl = this;
		var systemSeq;
		var unbind = [];
		var process_seq = "";
		const INTERVAL_TIME = 1000 * 10;
		var INTERVAL;
		var sessionIds = [];
		serviceManagementCtrl.processMasterList = [];
		serviceManagementCtrl.processSlaveList = [];
		serviceManagementCtrl.processApplicationList = [];

		serviceManagementCtrl.historyGridData = [];

		serviceManagementCtrl.changeSelectBox = function (event) {
			process_seq = event.value;
			getProcessData();
			serviceManagementCtrl.historyGridData = [];
			sessionIds = [];
			$interval.cancel(INTERVAL);
			INTERVAL = $interval(function () {
				getProcessData();
			}, INTERVAL_TIME);
		};

		/**
		 * Host 클릭 이벤트 처리
		 */
		serviceManagementCtrl.hostClick = function (host, type) {

			console.log(host);

			$interval.cancel(INTERVAL);

			if (type == 'MASTER') {

				let selectedHostList = getSelectedHostList('SLAVE');
				if (selectedHostList.length > 0) {
					alert('You can choose Master or Slave. ');
					host.checked = 'false';
					return;
				}

				selectedHostList = getSelectedHostList('MASTER');
				if (selectedHostList.length > 1) {
					alert('You can choose only 1 host in Master.');
					host.checked = 'false';
					return;
				}

			} else {
				let selectedHostList = getSelectedHostList('MASTER');
				if (selectedHostList.length > 0) {
					alert('You can choose Master or Slave. ');
					host.checked = 'false';
					return;
				}

				let app = getSelectedHostList('APPLICATION');
				let count = _.where(app, {systemName:host.systemName}).length;
				if(host.checked == "true" && count > 1) {
					alert('You can choose only 1 host in Application.');
					host.checked = 'false';
					return;
				}
			}
		};

		/**
		 * Start , Stop 클릭
		 * Master 또는 Slave 한쪽만 선택 가능
		 * Master는 하나만 선택 가능 / Slave 는 여러개 선택 가능
		 */
		serviceManagementCtrl.requestClick = function (event, action) {
			let masterList = getSelectedHostList('MASTER');
			let slaveList = getSelectedHostList('SLAVE');
			let applicationList = getSelectedHostList('APPLICATION');
			let selectedHostList = masterList.concat(slaveList);
			selectedHostList = selectedHostList.concat(applicationList);

			if (selectedHostList.length == 0) {
				alert('Please Select Host.');
				return;
			}

			for (let i = 0, j = selectedHostList.length; i < j; i++) {
				let host = selectedHostList[i];
				if (action == 'start' && host.processStatus.toUpperCase() != 'DEAD') {
					alert(host.processStatus + ' 상태의 호스트는 Start 할 수 없습니다');
					return false;
				} else if (action == 'stop' && host.processStatus.toUpperCase() == 'DEAD') {
					alert(host.processStatus + ' 상태의 호스트는 Stop 할 수 없습니다');
					return false;
				}
			}

			for (let i = 0, j = selectedHostList.length; i < j; i++) {
				let host = selectedHostList[i];
				for (let x = 0, y = serviceManagementCtrl.historyGridData.length; x < y; x += 1) {
					let grid = serviceManagementCtrl.historyGridData[x];
					if (host.systemSeq == grid.system_seq && action == grid.action && !grid.status) {
						alert(host.systemName + ' 처리 중입니다.');
						return false;
					}
				}
			}

			let param = {};
			param.type = action;
			param.list = selectedHostList;

			DataService.httpPost("/admin/service/requestAction", param, function (data) {
				setHostCheckFalse('MASTER');
				setHostCheckFalse('SLAVE');
				setHostCheckFalse('APPLICATION');

				var sessionId = data.data.session_id;
				sessionIds.push(sessionId);

				if (sessionId) {
					alert('Request to ' + action + ' Hosts.');

					let hostList = data.data.list;

					// 상태정보 확인
					$interval.cancel(INTERVAL);
					getProcessData();
					getCurrentHostList(sessionIds, hostList);
					INTERVAL = $interval(function () {
						getProcessData();
						getCurrentHostList(sessionIds, hostList);
					}, INTERVAL_TIME);
				}
				else alert('Hosts ' + action + ' failed.');


			});
		};


		/**
		 * History 그리드의 Row 를 선택한 경우 해당 Host의 정보를 보여준다
		 * @param value
		 * @param event
		 */
		serviceManagementCtrl.showHostPopup = function (host) {
			serviceManagementCtrl.popupData = {};
			var param = {};
			if (host) {
				param.sessionId = host.session_id;
				param.systemSeq = host.system_seq;
				DataService.httpPost("/admin/service/getCurrentHostBySessionId", param, function (data) {
					serviceManagementCtrl.popupData = data.data;

					var popup = ngDialog.open({
						template: "/admin/service/hostInfo_popup_template.html",
						className: "ngdialog-theme-default custom-width",
						showClose: false,
						disableAnimation: true,
						cache: false,
						closeByDocument: false,
						closeByEscape: true,
						scope: $scope
					});

					var closer = $rootScope.$on('ngDialog.refresh', function (e, id) {
						if (id != popup.id) return;
						closer();
					});
				});
			}

		};

		/**
		 * Host Check false
		 * @param role
		 */
		function setHostCheckFalse(role) {
			let compareList = [];

			if (role == 'MASTER') {
				compareList = serviceManagementCtrl.processMasterList;
			} else if (role == 'SLAVE') {
				compareList = serviceManagementCtrl.processSlaveList;
			} else if (role == 'APPLICATION') {
				compareList = serviceManagementCtrl.processApplicationList;
			}

			for (let x = 0, y = compareList.length; x < y; x += 1) {
				for (var i = 0, j = compareList[x].children.length; i < j; i += 1) {
					let host = compareList[x].children[i];
					host.checked = 'false';
				}
			}
		}


		serviceManagementCtrl.slaveCheckedChange = function (event, value) {
			let compareList = [];
			if (value.role == 'SLAVE') {
				compareList = serviceManagementCtrl.processSlaveList;
			} else if (value.role == 'APPLICATION') {
				compareList = serviceManagementCtrl.processApplicationList;
			}
			for (var i = 0; i < compareList.length; i++) {
				var slave = compareList[i];
				if (slave.hasOwnProperty("children")) {
					for (var j = 0; j < slave.children.length; j++) {
						var c = slave.children[j];
						if (c.checked == "false") {
							slave.checkedAll = false;
							break;
						}
					}
				}
			}

			ap($scope)
		};

		serviceManagementCtrl.slaveProcessAll = function (value) {
			if (value.checkedAll) {
				let selectedHostList = getSelectedHostList('MASTER');
				if (selectedHostList.length > 0) {
					alert('You can choose Master or Slave. ');
					value.checkedAll = false;
					return;
				}
			}
			console.log("--------------selected master/slave/application; ", getSelectedHostList('MASTER'), getSelectedHostList('SLAVE'), getSelectedHostList('APPLICATION'));

			let app = getSelectedHostList('APPLICATION');
			var appMap = _.indexBy(app, 'systemName');
			if (value.hasOwnProperty("children")) {
				for (var i = 0; i < value.children.length; i++) {
					if(value.checkedAll && appMap[value.children[i].systemName] != null) {
						alert('You can choose only 1 host in Application.');
						value.checkedAll = false;
						return;
					}
				}

				for (var i = 0; i < value.children.length; i++) {
					value.children[i].checked = value.checkedAll.toString();
				}
			}

			ap($scope);
		};

		/**
		 * 사용자가 선택하여 Start 또는 Stop 요청한 호스트 리스트들 조회
		 */
		function getCurrentHostList(sessionIds, hostList) {
			DataService.httpPost("/admin/service/getCurrentHostList", {'sessionIds': sessionIds}, function (data) {
				let currentList = data.data;
				serviceManagementCtrl.historyGridData = [];
				serviceManagementCtrl.historyGridData = currentList;

			});
		}

		function initialize() {
			systemSeq = ConfigManager.getSystemSeq();
			addEventListener();
			getProcessByTypeData();
		}


		function getProcessByTypeData() {
			var param = {};
			param.system_seq = systemSeq;
			DataService.httpPost("/admin/service/getProcessListByType", param, getProcessListByTypeReslut);
		}

		function getProcessData() {
			let masterList = getSelectedHostList('MASTER');
			let slaveList = getSelectedHostList('SLAVE');
			let applicationList = getSelectedHostList('APPLICATION');
			let selectedHostList = masterList.concat(slaveList);
			selectedHostList = selectedHostList.concat(applicationList);

			var param = {};
			param.system_seq = systemSeq;
			param.process_seq = process_seq;
			param.selectedHostList = selectedHostList;

			DataService.httpPost("/admin/service/getProcessList", param, getProcessDataReslut);
		}

		function getProcessListByTypeReslut(data) {
			serviceManagementCtrl.processList = data.data.list;
		}

		function getProcessDataReslut(data) {
			if (!data.data.list) return;

			serviceManagementCtrl.processMasterList = [];
			serviceManagementCtrl.processSlaveList = [];
			serviceManagementCtrl.processApplicationList = [];

			var roles = Object.keys(data.data.list);

			for (let i = 0, j = roles.length; i < j; i += 1) {
				let roleName = roles[i].toUpperCase();

				if (roleName == 'MASTER') {
					serviceManagementCtrl.processMasterList = data.data.list[roleName];
				} else if (roleName == 'SLAVE') {
					serviceManagementCtrl.processSlaveList = data.data.list[roleName];
				} else if (roleName == 'APPLICATION') {
					serviceManagementCtrl.processApplicationList = data.data.list[roleName];
				}
			}

			if (serviceManagementCtrl.processApplicationList.length > 0 && serviceManagementCtrl.processMasterList.length == 0 && serviceManagementCtrl.processSlaveList.length == 0) {
				serviceManagementCtrl.processApplicationList.height = '700';
			} else if (serviceManagementCtrl.processApplicationList.length > 0 && serviceManagementCtrl.processMasterList.length > 0 && serviceManagementCtrl.processSlaveList.length > 0) {
				serviceManagementCtrl.processSlaveList.height = '180';
				serviceManagementCtrl.processApplicationList.height = '180';
			} else if (serviceManagementCtrl.processApplicationList.length == 0 && serviceManagementCtrl.processMasterList.length > 0 && serviceManagementCtrl.processSlaveList.length > 0) {
				serviceManagementCtrl.processSlaveList.height = '477';
			}
		}


		/**
		 * role 에 따라 선택된 호스트 리스트를 리턴
		 * @param role
		 * @returns {Array}
		 */
		function getSelectedHostList(role) {
			let selectedHostList = [];

			let compareList = [];

			if (role == 'MASTER') {
				compareList = serviceManagementCtrl.processMasterList;
			} else if (role == 'SLAVE') {
				compareList = serviceManagementCtrl.processSlaveList;
			} else if (role == 'APPLICATION') {
				compareList = serviceManagementCtrl.processApplicationList;
			}

			for (let x = 0, y = compareList.length; x < y; x += 1) {
				for (let i = 0, j = compareList[x].children.length; i < j; i += 1) {
					let host = compareList[x].children[i];
					if (host.checked == 'true')
						selectedHostList.push(host);
				}
			}

			return selectedHostList;

		}

		function onChangeSystemGroupIdEventHandler(event, data) {
			if (data == null)
				return;

			systemSeq = ConfigManager.getSystemSeq();
			getProcessByTypeData();
		}


		function addEventListener() {
			unbind = [$scope.$on('$destroy', destroy),
				$scope.$on(ConfigManager.getEvent("CHANGE_SYSTEM_SEQ_EVENT"), onChangeSystemGroupIdEventHandler),]
		}

		function destroy() {
			unbind.forEach(function (fn) {
				fn();
			});
			$interval.cancel(INTERVAL);
			INTERVAL = null;
			serviceManagementCtrl = null;
		}

		initialize();
	}]);
});