define(["app", "moment"], function (app, moment) {
	app.controller("HostManagementCtrl", ["$rootScope", "$scope", "$http", "ConfigManager", "DataService", "ngDialog", "CommonUtil", "AlarmManager",
		function ($rootScope, $scope, $http, ConfigManager, DataService, ngDialog, CommonUtil, AlarmManager) {
			"use strict";

			// property
			var hostManagementCtrl = this;
			var unbind = [];
			var seq = null;
			var center = {"text-align": "center"};

			var preSystemName = '';

			hostManagementCtrl.masterFlag = false;
			hostManagementCtrl.clusterListSelectIdx = "0";
			hostManagementCtrl.host = {};
			hostManagementCtrl.useType = [
				{"label": "Y", "value": "Y"},
				{"label": "N", "value": "N"}
			];


			// event-handler
			function addEventListener() {
				unbind = [
					$scope.$on(ConfigManager.getEvent("REFRESH_CLUSTER_LIST_EVENT"), onRefreshClusterListHandler),
					$scope.$on(ConfigManager.getEvent("CHANGE_SYSTEM_SEQ_EVENT"), onChangeSystemSeqEventHandler),
					$scope.$on('$destroy', destroy)
				];
			}

			function onRefreshClusterListHandler(event, data) {
				DataService.httpGet("/common/getMaster", {}, function (data) {
					ConfigManager.setMasterInfo(data.data);
					setMasterInfo();
				}, false);
			}

			function onChangeSystemSeqEventHandler(event, data) {
				if (data == null)
					return;
				seq = ConfigManager.getSystemSeq();
				getData();
				setMasterInfo();
			}

			function destroy() {
				unbind.forEach(function (fn) {
					fn();
				});
			}

			hostManagementCtrl.addCluster = function (type) {
				if (type == 'ADD')
					hostManagementCtrl.cluster = {};

				hostManagementCtrl.cluster.type = type;
				hostManagementCtrl.cluster.popType = CommonUtil.getFirstUpperCase(type.toLowerCase());

				// placeholder 설정
				if (hostManagementCtrl.placeholder == null) {
					hostManagementCtrl.placeholder = {};
					hostManagementCtrl.placeholder.ws_url = CommonUtil.getIpAndPortFromUrl(ConfigManager.getConst("SOCKET_URL"));
					hostManagementCtrl.placeholder.event_ip = ConfigManager.getConst("EVENT_SERVER_IP");
					hostManagementCtrl.placeholder.event_occur = Number(ConfigManager.getConst("EVENT_SERVER_OCCUR_PORT"));
					hostManagementCtrl.placeholder.event_info = Number(ConfigManager.getConst("EVENT_SERVER_INFO_PORT"));
					hostManagementCtrl.placeholder.event_mq = Number(ConfigManager.getConst("EVENT_SERVER_MQ_PORT"));
				}

				var popup = ngDialog.open({
					template: "/administrator/host-popup/cluster_add_popup_template.html",
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
					preSystemName = '';
					closer();
				});
			};

			/**
			 * Cluster 정보 가져온다
			 * @param event
			 */
			hostManagementCtrl.clusterGridDoubleRowClick = function (event) {
				if (event == null)
					return;

				hostManagementCtrl.cluster = angular.copy(event.data);
				preSystemName = hostManagementCtrl.cluster.systemName;

				// Master DB 에서 해당 클러스터에 대한 정보를 가져온다
				DataService.httpPost("/admin/host/getClusterDataFromMaster", hostManagementCtrl.cluster, function (data) {
					if (data.data == null) {
						if (hostManagementCtrl.cluster.systemName == ConfigManager.getMasterInfo().alias) {		// 현재 선택한 클러스터가 마스터 클러스터인 경우
							DataService.httpPost("/admin/host/getClusterDataFromMasterBySeq", hostManagementCtrl.cluster, function (result) {
								setMasterData(result);
							});
						}

					} else {
						setMasterData(data);
					}

					hostManagementCtrl.addCluster('UPDATE');
				});


			};

			
			function setMasterData(data) {
				var jdbc_url = data.data.url.replace('jdbc:mysql://','').replace('?allowMultiQueries=true','');
				hostManagementCtrl.cluster.jdbc_url = jdbc_url;
				hostManagementCtrl.cluster.jdbc_user = data.data.userName;
				hostManagementCtrl.cluster.jdbc_password = data.data.password;
				hostManagementCtrl.cluster.ws_url = CommonUtil.getIpAndPortFromUrl(data.data.websocket);
				hostManagementCtrl.cluster.event_ip = data.data.eventIp;
				hostManagementCtrl.cluster.event_occur = Number(data.data.eventOccurPort);
				hostManagementCtrl.cluster.event_info = Number(data.data.eventInfoPort);
				hostManagementCtrl.cluster.event_mq = Number(data.data.eventMqPort);
				hostManagementCtrl.cluster.zookeeper_url = data.data.zookeeperUrl;
				hostManagementCtrl.cluster.zookeeper_dir = data.data.zookeeperDir;
				hostManagementCtrl.cluster.zookeeper_session_timeout = Number(data.data.zookeeperSessionTimeout);
				hostManagementCtrl.cluster.zookeeper_connection_timeout = Number(data.data.zookeeperConnectionTimeout);
			}

			hostManagementCtrl.clusterGridRowClick = function (value, event) {
				if (event == null)
					return;

				// 초기화
				hostManagementCtrl.systemInfoListGrid = [];
				ap($scope);

				if (!gridClickEventCheck(event))
					return;

				var cluster = (event == null) ? value[0].data : event.data;
				if (cluster == null)
					return;

				if (cluster.systemSeq != seq) {
					alert("Please go to the Cluster to view the host registration or list.");
					return;
				}

				hostManagementCtrl.clusterListSelectIdx = value[0].childIndex.toString();
				hostManagementCtrl.selectedCluster = value[0];
				hostManagementCtrl.systemInfoListGrid = hostManagementCtrl.systemInfoList.filter(filterByCluster);
				ap($scope);
			};

			hostManagementCtrl.addClusterSave = function () {

				// validation check
				var clusterInfo = hostManagementCtrl.cluster;
				if (CommonUtil.checkEmpty(clusterInfo.systemName)) {
					alert("Please enter the system name.");
					return;
				}

				// alias 는 없을 때 system name과 똑같이 넣어준다.
				if (CommonUtil.checkEmpty(clusterInfo.alias)) {
					clusterInfo.alias = clusterInfo.systemName;
				}

				var c = confirm("Do you want to Save?");
				if (!c) {
					return;
				}

				if (CommonUtil.checkEmpty(clusterInfo.jdbc_url)) {
					alert("Please enter the JDBC Url.");
					return;
				}

				// if ((clusterInfo.jdbc_url).match(CommonUtil.REGEXP_IP_PORT) == null) {
				// 	alert("Please check the JDBC Url.");
				// 	return;
				// }

				if (CommonUtil.checkEmpty(clusterInfo.jdbc_user)) {
					alert("Please enter the JDBC User.");
					return;
				}

				if (CommonUtil.checkEmpty(clusterInfo.jdbc_password)) {
					alert("Please enter the JDBC Password.");
					return;
				}

				if (CommonUtil.checkEmpty(clusterInfo.ws_url)) {
					alert("Please enter the Websocket Url.");
					return;
				}

				if ((clusterInfo.ws_url.toString()).match(CommonUtil.REGEXP_IP_PORT) == null) {
					alert("Please check the Websocket Url.");
					return;
				}

				if (CommonUtil.checkEmpty(clusterInfo.event_ip)) {
					alert("Please enter the EventServer IP");
					return;
				}

				if (clusterInfo.event_ip.match(CommonUtil.REGEXP_IP) == null) {
					alert("Please check the EventServer IP.");
					return;
				}

				if (CommonUtil.checkEmpty(clusterInfo.event_occur)) {
					alert("Please enter the EventServer Occur Port.");
					return;
				}

				if (CommonUtil.checkEmpty(clusterInfo.event_info)) {
					alert("Please enter the EventServer Info Port.");
					return;
				}

				if (CommonUtil.checkEmpty(clusterInfo.event_mq)) {
					alert("Please enter the EventServer MQ Port.");
					return;
				}

				if (CommonUtil.checkEmpty(clusterInfo.zookeeper_url)) {
					alert("Please enter the Zookeeper Url.");
					return;
				}

				if ((clusterInfo.zookeeper_url).match(CommonUtil.REGEXP_IP_PORT) == null) {
					alert("Please check the Zookeeper Url.");
					return;
				}

				if (CommonUtil.checkEmpty(clusterInfo.zookeeper_dir)) {
					alert("Please enter the Zookeeper Directory.");
					return;
				}

				if (CommonUtil.checkEmpty(clusterInfo.zookeeper_session_timeout)) {
					alert("Please enter the Zookeeper Session Timeout.");
					return;
				}

				if (CommonUtil.checkEmpty(clusterInfo.zookeeper_connection_timeout)) {
					alert("Please enter the Zookeeper Connection Timeout.");
					return;
				}

				let clusterName = clusterInfo.systemName;
				if (hostManagementCtrl.cluster.type == 'ADD' || hostManagementCtrl.cluster.type == 'UPDATE') {

					if (clusterName != preSystemName) {
						// * 입력하려는 클러스터 이름이 중복되는지 마스터 데이터베이스에서 확인
						DataService.httpPost("/admin/host/checkClusterNameDupl", {'systemName': clusterName}, function (data) {
							console.log('이름 중복 확인');
							if (data.data && data.data.count != '0') {
								alert('Cluster name is duplicated. \nPlease Change the name');
								return;
							}
							addClusterInfo(clusterInfo);
						});
					} else {
						addClusterInfo(clusterInfo);
					}
				}
			};

			hostManagementCtrl.changeClusterUseSelectBox = function (event) {
				hostManagementCtrl.cluster.useFlag = event.value;
			};

			hostManagementCtrl.onDeleteButtonDirectiveHandler = function (event) {
				if (event == null || event.rowData == null)
					return;

				var target = event.rowData.event.target;
				if (target == null || (target.nodeName != "BUTTON" && target.nodeName != "I"))
					return;

				var clusterInfo = event.rowData.data;
				DataService.httpPost("/admin/host/validateCluster", clusterInfo, function (data) {
					var d = data.data;
					if (d == null || d.result == null) {
						alert("Failed to delete the corresponding Cluster. Please try again.");
						return;
					}

					if (d.result == true) {

						// 알람 현재 떠있는 경우도 체크 => 테스트 필요
						AlarmManager.getAlarms({"location": [clusterInfo.systemName]}).then(function(data) {
							if(data != null && data.length < 1)
								gridDeleteBtnEventHandler(clusterInfo);
						});
					} else {
						alert(d.resultCause);
					}
				}, false);
			};

			// method

			function addClusterInfo(clusterInfo) {
				// db 연결 검사
				DataService.httpPost("/admin/host/checkConnection", clusterInfo, function (data) {
					console.log('db connection test');
					if (data.data.connection == false) {
						alert('Can\'t connect to ' + clusterInfo.jdbc_url);

					} else {
						clusterInfo.jdbc_url = 'jdbc:mysql://' + clusterInfo.jdbc_url + '?allowMultiQueries=true';
						clusterInfo.ws_url = 'ws://' + clusterInfo.ws_url + '/websocket';
						clusterInfo.mr_elapsed = ConfigManager.getConst("DEFAULT_ELAPSED");
						clusterInfo.mr_bar_elapsed = ConfigManager.getConst("DEFAULT_BAR_ELAPSED");
						clusterInfo.mr_time_interval = ConfigManager.getConst("DEFAULT_TIME_INTERVAL");
						clusterInfo.all_elapsed = ConfigManager.getConst("DEFAULT_ELAPSED");
						clusterInfo.all_bar_elapsed = ConfigManager.getConst("DEFAULT_BAR_ELAPSED");
						clusterInfo.all_time_interval = ConfigManager.getConst("DEFAULT_TIME_INTERVAL");
						clusterInfo.latency_job_name = '';
						clusterInfo.preSystemName = preSystemName;
						clusterInfo.alias = clusterInfo.systemName;

						DataService.httpPost("/admin/host/saveClusterInfo", clusterInfo, function (data) {		// 클러스터 정보 저장 > sub

							if (data.data == 1) {
								DataService.httpPost("/admin/host/saveClusterInfoToMaster", clusterInfo, function (data) {	// 클러스터 정보 저장 > master
									console.log('master에 정보 저장 완료');
									preSystemName = '';
									ngDialog.closeAll();
									getData();

									CommonUtil.syncClusterData();
								});
							} else {
								console.log("==========addClusterInfo==============RESULT: ", data);
								alert(data.data);
							}
						});
					}
				});
			}

			function filterByCluster(obj) {
				if (obj.cluster == hostManagementCtrl.selectedCluster.data.systemName)
					return true;
				else
					return false;
			}

			function gridDeleteBtnEventHandler(data) {
				if (!confirm("Do you want to Delete?")) {
					return;
				}

				var param = data;
				param.type = "DEL";
				console.log(data);
				DataService.httpPost("/admin/host/saveClusterInfo", param, function (result) {
					DataService.httpPost("/admin/host/saveClusterInfoToMaster", param, function (result) {
						getData();
						CommonUtil.syncClusterData();
					});
				});
				ap($scope);
			}


			hostManagementCtrl.hostGridRowClick = function (value) {
				hostManagementCtrl.host.list = [];
				for (var h in value) {
					hostManagementCtrl.host.list.push(value[h].data);
				}
			};
			hostManagementCtrl.hostGridDoubleRowClick = function (event) {
				hostManagementCtrl.host.list = [];
				hostManagementCtrl.host.list.push(event.data);
				hostManagementCtrl.addHost('UPDATE');
			};

			hostManagementCtrl.changeUseSelectBox = function (event, node) {
				node.use_flag = event.value;
			};

			hostManagementCtrl.hostAddClick = function () {
				// var host = {seq: seq++};
				var host = {seq: seq, id: moment().valueOf()};

				hostManagementCtrl.host.list.push(host);
			};

			hostManagementCtrl.hostDeleteClick = function (value) {
				if (value == null)
					return;

				for (var i = 0; i < hostManagementCtrl.host.list.length; i++) {
					if (value.id == hostManagementCtrl.host.list[i].id)
						hostManagementCtrl.host.list.splice(i, 1);
				}

			};

			hostManagementCtrl.addHostListSave = function () {

				if (hostManagementCtrl.host == null || hostManagementCtrl.host.list == null  || hostManagementCtrl.host.list.length == 0
				// || hostManagementCtrl.host.list.length < 1
				) {
					alert('Please select file');
					return;
				}


				// validation check
				var list = hostManagementCtrl.host.list;
				var len = list.length;
				let maxLength = 64;
				for (var i = 0; i < len; i++) {
					var host = list[i];

					if (!CommonUtil.isCountSafe(host.system_name, maxLength)) {
						alert("Cannot be over " + maxLength + " characters in length");
						return;
					}

					if (!CommonUtil.isCountSafe(host.login_id, maxLength)) {
						alert("Cannot be over " + maxLength + " characters in length");
						return;
					}

					if (!CommonUtil.isCountSafe(host.login_password, maxLength)) {
						alert("Cannot be over " + maxLength + " characters in length");
						return;
					}

					if (!CommonUtil.isCountSafe(host.sudo_password, maxLength)) {
						alert("Cannot be over " + maxLength + " characters in length");
						return;
					}

					if (CommonUtil.checkEmpty(host.system_name)) {
						alert("Please enter the system name.");
						return;
					}
					var ip = host.system_ip;
					if (CommonUtil.checkEmpty(ip)) {
						alert("Please enter the system ip.");
						return;
					}
					if (ip.match(CommonUtil.REGEXP_IP) == null) {
						alert("[Systme Name : " + host.system_name + "]\nIt does not match the ip format.");
						return;
					}
					if (CommonUtil.checkEmpty(host.login_id)) {
						alert("Please enter Login ID");
						return;
					}
					if (CommonUtil.checkEmpty(host.login_password)) {
						alert("Please enter Login Password");
						return;
					}

				}

				var c = confirm("Do you want to Save?");
				if (!c) {
					return;
				}

				console.log('\n\n\n######################\n\n\n',hostManagementCtrl.host);

				DataService.httpPost("/admin/host/addHostListInfo", hostManagementCtrl.host, addHostListSaveResult);
			};

			hostManagementCtrl.delHost = function () {
				console.log("delete btn");
				var hostList = hostManagementCtrl.host.list;
				if (hostList == null || hostList.length < 1) {
					alert("Please select a host to delete.");
					return;
				}

				let param = {};
				param.list = hostList;

				DataService.httpPost("/admin/host/validateHost", param, function (data) {
					var d = data.data;
					if (d == null || d.result == null) {
						alert("Failed to delete the corresponding Cluster. Please try again.");
						return;
					}

					if (d.result == true) {

						// 알람 현재 떠있는 경우도 체크
						var hostNameList = _.pluck(hostList, "system_name");
						AlarmManager.getAlarms({"resource": hostNameList}).then(function(data) {
							if(data != null && data.length < 1)
								deleteHostExecute(hostList);
						});
					} else {
						alert(d.resultCause);
					}
				}, false);
			};

			/** 2016.06.27 param 값은 object 형태로 넘긴다. **/
			function deleteHostExecute(host) {
				var c = confirm("Do you want to Delete?");
				if (!c)
					return;


				var param = {};
				param.list = host;
				param.type = 'DEL';
				DataService.httpPost("/admin/host/addHostListInfo", param, addHostListSaveResult);
			}

			hostManagementCtrl.addHost = function (type) {
				if (type == 'ADD')
				// hostManagementCtrl.host.list = [{seq: seq++}];
					hostManagementCtrl.host.list = [{seq: seq, id: moment().valueOf()}];

				hostManagementCtrl.host.applyAll = false;
				hostManagementCtrl.host.type = type;
				hostManagementCtrl.host.system_parent_data = hostManagementCtrl.selectedCluster.data;
				hostManagementCtrl.popHeight = (type == "ADD") ? "400px" : "75px";

				var popup = ngDialog.open({
					template: "/administrator/host-popup/host_add_popup_template.html",
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

			function addHostListSaveResult(data) {
				if (data.data == 1) {
					hostManagementCtrl.host.list = [];
					ngDialog.closeAll();
					getData();
					setMasterInfo();
				} else {
					console.log("==========addHostListSaveResult==============RESULT: ", data);
					alert(data.errorMessage);
				}
			}

			hostManagementCtrl.closeThisDialog = function () {
				hostManagementCtrl.host.list = [];
				ngDialog.closeAll();
			};

			hostManagementCtrl.csvSampleHeader = ["SYSTEM_NAME"
				, "SYSTEM_IP"
				, "USE_FLAG"
				, "LOGIN_ID"
				, "LOGIN_PASSWORD"
				, "SUDO_PASSWORD"
			];

			hostManagementCtrl.read = function (file) {
				var data = file.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
				hostManagementCtrl.host.type = "ADD";
				hostManagementCtrl.host.system_parent_data = hostManagementCtrl.selectedCluster.data;
				hostManagementCtrl.host.list = pivotCsvToArray(csvToArray(file));
			};

			function csvToArray(data) {
				var rows = data.split('\n');
				var obj = [];
				angular.forEach(rows, function (val) {
					if (val != "") {
						var r = val.split(',');
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
							var key = hostManagementCtrl.csvSampleHeader[h];
							if (key)
								key = key.toLowerCase();

							hostMap[key] = data[d][h];
						}
						returnArr.push(hostMap)
					}
				}
				return returnArr;
			}

			hostManagementCtrl.excelUpload = function () {
				var popup = ngDialog.open({
					template: "/administrator/host-popup/host_excel_upload_template.html",
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
					if (window.FileReader) {
						var filename = $(this)[0].files[0].name;
						if(!checkFileType(filename)) {
							alert('Please upload the CSV file.');
							return;
						}
					} else {
						var filename = $(this).val().split('/').pop().split('\\').pop();
					}

					$(this).siblings('.upload-name').val(filename);
				});
			};

			function checkFileType(filename) {
				var arrFileName = filename.split(".");
				var extensions = arrFileName[arrFileName.length-1].toLowerCase();
				if(extensions === 'csv') {
					return true;
				}
				return false;
			}


			function initialize() {
				seq = ConfigManager.getSystemSeq();
				addEventListener();
				getData();
				setMasterInfo();

			}

			function setMasterInfo() {
				// master일 경우 화면 제어
				var master = ConfigManager.getMasterInfo();
				hostManagementCtrl.masterFlag = (master.system_seq == seq || seq == '') ? true : false;		// 클러스터가 아무것도 없는 경우에도 화면 제어 가능하게 해서 클러스터를 추가 할 수 있도록 처리
				//hostManagementCtrl.masterFlag = true;
			}

			function getData() {
				var param = {};
				DataService.httpPost("/admin/host/getSystemList", param, getSystemListResult);
			}

			function getSystemListResult(data) {
				hostManagementCtrl.systemInfoListGrid = [];
				hostManagementCtrl.systemGroupList = data.data.group;
				hostManagementCtrl.systemInfoList = data.data.info;

				// index setting
				var list = hostManagementCtrl.systemGroupList;
				var len = list.length;
				for (var i = 0; i < len; i++) {
					if (seq == list[i].systemSeq) {
						hostManagementCtrl.clusterListSelectIdx = i;
						var d = {data: list[i], childIndex: i};
						hostManagementCtrl.clusterGridRowClick([d], d);
						break;
					}
				}
			}

			function gridClickEventCheck(event) {
				if (event.event != null) {
					var target = event.event.target;
					if (target != null && (target.nodeName == "BUTTON" || target.nodeName == "I")) {
						return false;
					}
				}

				return true;
			}

			initialize();
		}]);
});