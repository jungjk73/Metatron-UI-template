define([], function () {
	return function ($rootScope, $scope, $location, $state, $compile, $window, ConfigManager, WebSocketService, DataService, AlarmService, CommonUtil) {
		"use strict";

		// property
		var leftCtrl = this;
		var unbind = [];
		var preSystemSeq = "";
		var preSystemParentSeq = "";
		var preSystemName = "";
		var mm = {};
		var clusterListInit = false;

		leftCtrl.systemGroupList = null;
		leftCtrl.systemGroupId = "";
		leftCtrl.menu = [];
		leftCtrl.menuMap = {};

		let loadFlag = false;

		let preMenuAlias = null;

		
		// method
		leftCtrl.selectMenu = function (menu, $event) {
			if(menu == null || (menu.childrenFlag != null && menu.childrenFlag == 'Y'))
				return;

			menu.navi = getMenuNavigator(menu);
			if (menu.menuPath == "/") {
				alert("준비중입니다.");
				$event.stopPropagation();
			} else {

				if(menu.linkFlag != null && menu.linkFlag == 'Y') {
					goNewTab(menu);
					return;
				}

				let toGo = menu.menuAlias ? menu.menuAlias : '';
				let currMenu = $location.path();
				console.log(toGo);
				if ('/'+toGo.replace(':','') == currMenu) {
					$state.reload();
				} else {

					// User Management 에서는 Master DB를 사용하기 때문에 다른 메뉴로 돌아가면 이전에 사용하던 DB로 연결한다. DB만 Master.
					// 웹소켓이나 알람 설정은 해당안됨
					if (menu.menuAlias && menu.menuAlias != 'userManagement' && preMenuAlias == 'userManagement') {
						DataService.httpPost("/common/changeCluster", {'systemName':preSystemName}, function (data) {
							console.log('#####',data);
						});
					}

					if(menu.menuAlias && menu.menuAlias.indexOf('flume/:') > -1) {
						var p = menu.menuAlias.split(':');
						if(p[1]) {
							$state.go(menu.menuPath, {procType: p[1]});
						}						
					}else {
						$state.go(menu.menuPath);
					}
					
				}
				preMenuAlias = menu.menuAlias;
			}
		};

		/***********************************************************************
		 * cluster 선택
		 **********************************************************************/
		leftCtrl.selectGroupId = function (event, systemId, parentSeq, systemName) {
			leftCtrl.systemGroupId = systemId;
			if (event) {
				$('#cluster_' + preSystemSeq).css("color", "#fff");
				$('#cluster_' + systemId).css("color", "#44ced1");
				$('#cluster_' + systemId).parent().siblings().find('a').css("color", "#fff");
			} else {
				setTimeout(function(){
					if (Number(preSystemSeq) != Number(systemId)){
						$('#cluster_' + preSystemSeq).css("color", "#fff");
					}
					$('#cluster_' + systemId).css("color", "#44ced1");
				}, 800);
			}

			let _systemSeq = systemId;
			let _systemParentSeq = parentSeq;
			let _systemName = systemName;
			let _THIS_APP_ID = sessionStorage.getItem("THIS_APP_ID");

			/**
			 * 클러스터 변경
			 * 선택한 클러스터에 대한 외부 연결정보가 없는 경우에 기본 ( MASTER ) DB에 연결
			 */
			DataService.httpPost("/common/changeCluster", {'systemName':systemName,'THIS_APP_ID':_THIS_APP_ID}, function (data) {
				if (data.data) {

					let conInfo = data.data;
					if (conInfo.system_name.toUpperCase() != 'MASTER') {
						_systemSeq = conInfo.system_seq;
						_systemName = conInfo.system_name;
						// parentSeq 필요한가 ??
					}

					// 웹소켓 연결정보 재설정
					if (conInfo.websocket)
						WebSocketService.reconnectToNewURL(conInfo.websocket);
					if (conInfo.event_ip && conInfo.event_occur_port && conInfo.event_info_port)
					AlarmService.setConnectionInfo(conInfo.event_ip, conInfo.event_occur_port, conInfo.event_info_port);
				}

				preSystemSeq = _systemSeq;
				preSystemParentSeq = _systemParentSeq;
				preSystemName = _systemName;

				ConfigManager.setSystemSeqName({'systemSeq':_systemSeq, 'systemParentSeq':_systemParentSeq, 'systemName':_systemName});
				$rootScope.$broadcast(ConfigManager.getEvent("CHANGE_SYSTEM_SEQ_EVENT"), _systemSeq);
				setMasterInfo();
				checkBasicConnectionData(systemId, systemName);
				getMenuList();
			});
		};

		function checkBasicConnectionData(systemId, systemName) {
			var param = {};
			param.systemSeq = systemId;
			param.systemName = systemName;
			param.preSystemSeq = preSystemSeq;
			param.preSystemName = preSystemName;

			DataService.httpPost("/common/checkCurrentClusterInfo", param, function (data) {
				if(data.data == false)
					checkBasicConnectionData(systemId, systemName);
			});
		}

		leftCtrl.goToDefaultPath  = function() {			
			var path = ConfigManager.getDefaultPath();
			$state.go(path);
			getMenuIdByPath(leftCtrl.menu, path);
			fs_first_show();
		};

		/**
		 * 클러스터 리스트 새로 고침
		 */
		leftCtrl.refreshClusterList = function(){
			if (!confirm("Do you want to refresh cluster connection info?"))
				return;

			CommonUtil.syncClusterData();
		};


		// event-handler
		function destroy() {
			unbind.forEach(function (fn) {
				fn();
			});
		}

		function onRefreshClusterListHandler(event, data) {
			if(data == null)
				data = [];

			DataService.httpGet("/common/getMaster", {}, function(result) {
				ConfigManager.setMasterInfo(result.data);
				setMasterInfo();
			}, false);

			if(clusterListInit == false) {
				clusterListInit = true;
				var p = angular.element("#cluster_inner");
				var h = (data == null || data.length < 3) ? "90px" : "120px";
				p.attr("slimscroll", "{height:'" + h + "', color:'#6e6e6e', size:'7px'}");
				$compile(p)($scope);
			}
			makeClusterList(data);
		}


		// function
		function initialize() {
			CommonUtil.syncClusterData();
			// setTimeout(getMenuList, 500);
			addEventListener();
			setMasterInfo();
		}

		function getMenuList() {
			fe_slideMenu_offEvent();
			leftCtrl.menu = [];
			DataService.httpGet("/common/menu", null, function (data) {
				leftCtrl.menu = data.data;
				makeMenuMap(leftCtrl.menu);
				if ($location.path() == "/") {
					leftCtrl.selectMenu(mm);
				}

				setTimeout(executeViewScript, 500);
				loadFlag = true;
			}, false);
		}

		function makeMenuMap(list) {
			for (var i = 0; i < list.length; i++) {
				var childrenFlag = list[i].childrenFlag;
				var p_id = list[i].menuParentId;
				p_id = p_id.toString();
				p_id = p_id.substring(0, 1);
				if ($location.path() == "/") {
					if (p_id == '0' && list[i].menuOpen != null && list[i].menuOpen != "") {
					// if (p_id == '0') {
						menu1 = 'm_' + list[i].menuId;
						if (list[i].menuPath && list[i].menuPath != "")
							mm = list[i];
					} else if (p_id == 1 && list[i].menuOpen != null && list[i].menuOpen != "") {
						menu2 = 'm_' + list[i].menuId;
						if (list[i].menuPath && list[i].menuPath != "")
							mm = list[i];
					} else if (p_id == 2 && list[i].menuOpen != null && list[i].menuOpen != "") {
						menu3 = 'm_' + list[i].menuId;
						if (list[i].menuPath && list[i].menuPath != "")
							mm = list[i];
					}
				} else {
					var alias = list[i].menuAlias;
					var path = $location.path();

					if (alias && path.indexOf(alias) > -1) {
						var str_id = list[i].menuId.toString();
						str_id = str_id.substring(0, 1);
						if (str_id == "2") {
							menu2 = "m_" + list[i].menuId;
							menu1 = "m_" + list[i].menuParentId;
						} else if (str_id == "3") {
							menu3 = "m_" + list[i].menuId;
							menu2 = "m_" + list[i].menuParentId;
							getSelectedMenu(leftCtrl.menu, list[i].menuParentId);
						}
					}
				}

				if (childrenFlag != null && childrenFlag == "Y")
					makeMenuMap(list[i].children);

				leftCtrl.menuMap[list[i].menuId] = list[i];
			}
		}

		function getMenuIdByPath(list, path) {
			let custPath = $location.path();
			if (path != null) custPath = path;

			for (var i = 0; i < list.length; i++) {
				var childrenFlag = list[i].childrenFlag;
				var p_id = list[i].menuParentId;
				p_id = p_id.toString();
				p_id = p_id.substring(0, 1);
				if ($location.path() == "/") {
					if (p_id == '0' && list[i].menuOpen != null && list[i].menuOpen != "") {
						// if (p_id == '0') {
						menu1 = 'm_' + list[i].menuId;
						if (list[i].menuPath && list[i].menuPath != "")
							mm = list[i];
					} else if (p_id == 1 && list[i].menuOpen != null && list[i].menuOpen != "") {
						menu2 = 'm_' + list[i].menuId;
						if (list[i].menuPath && list[i].menuPath != "")
							mm = list[i];
					} else if (p_id == 2 && list[i].menuOpen != null && list[i].menuOpen != "") {
						menu3 = 'm_' + list[i].menuId;
						if (list[i].menuPath && list[i].menuPath != "")
							mm = list[i];
					}
				} else {
					var menuPath = list[i].menuPath;

					if (menuPath && custPath == menuPath) {
						var str_id = list[i].menuId.toString();
						str_id = str_id.substring(0, 1);
						if (str_id == "2") {
							menu2 = "m_" + list[i].menuId;
							menu1 = "m_" + list[i].menuParentId;
						} else if (str_id == "3") {
							menu3 = "m_" + list[i].menuId;
							menu2 = "m_" + list[i].menuParentId;
							getSelectedMenu(leftCtrl.menu, list[i].menuParentId);
						}
					}
				}

				if (childrenFlag != null && childrenFlag == "Y")
					getMenuIdByPath(list[i].children, custPath);

			}
		}

		function getSelectedMenu(list, p_id) {
			for (var i = 0; i < list.length; i++) {
				var childrenFlag = list[i].childrenFlag;
				if (list[i].menuId == p_id) {
					menu1 = "m_" + list[i].menuParentId;
					return;
				}

				if (childrenFlag != null && childrenFlag == "Y")
					getSelectedMenu(list[i].children, p_id);
			}
		}

		function addEventListener() {
			unbind = [
				$scope.$on(ConfigManager.getEvent("REFRESH_CLUSTER_LIST_EVENT"), onRefreshClusterListHandler),
				$scope.$on(ConfigManager.getEvent("CHANGE_CLUSTER_LIST_EVENT"), onRefreshClusterListHandler),
				$rootScope.$on(ConfigManager.getEvent("SELECT_MENU_EVENT"), onSelectMenuEventHandler),
				$scope.$on('$destroy', destroy)
			];

			var body = angular.element(document.getElementsByClassName("mu-container"));
			body.bind('mouseover', function (e) {
				var depth3 = angular.element(document.getElementsByClassName("depth3"));
				depth3.hide();
				//var alarm = angular.element(document.getElementById("alarmDiv"));
				//alarm.remove();
			});

			body.bind('click', function (e) {
				if ($(e.target).hasClass("bell")) {
					return;
				}

				var alarm = angular.element(document.getElementById("alarmDiv"));
				alarm.remove();
			});
		}

		function makeClusterList(value) {
			if (value == null)
				value = [];

			// 임시 
			//value = _.where(value, {systemSeq: '800'});

			// 클러스터 순서 변경. Master 클러스터를 제일 위로
			// 기능 안쓰기로 함 2018.02.13
			// value.sort(function(a,b){
			// 	if (a.isMaster != null && a.isMaster != '' && a.isMaster == 'Y') {
			// 		return -1;
			// 	}
			// 	else if (a.isMaster != null && a.isMaster != '' && a.isMaster == 'N') return 1;
			// 	else {
			// 		return 0;
			// 	}
			//
			// });

			// cluster popup setting
			leftCtrl.systemGroupList = value;
			leftCtrl.clusterDivPadding = (value.length < 2) ? "padding:13px 0 13px 20px;" : "padding:17px 0 0 20px;";

			if (sessionStorage.getItem('systemSeq')) {
				preSystemSeq = sessionStorage.getItem('systemSeq');
				preSystemParentSeq = sessionStorage.getItem('systemParentSeq');
				preSystemName = sessionStorage.getItem('systemName');
			}
			else {
				preSystemSeq = value[0]['systemSeq'];
				preSystemParentSeq = value[0]['systemParentSeq'];
				preSystemName = value[0]['systemName'];
			}
			leftCtrl.selectGroupId(null, preSystemSeq, preSystemParentSeq, preSystemName);
		}

		function onSelectMenuEventHandler(event, data) {
			if (data.mode == 'header') {	// 헤더에서 요청한 메뉴
				var $depth2_item = angular.element('.mu-slide-menu > li > ul > li > a');
				$depth2_item.css( "color", "#9da2a6" );
				getMenuIdByPath(leftCtrl.menu, data.path);
				fs_first_show();
			}
		}

		function getMenuNavigator(menu) {
			var c = 0;
			var navi = [menu];
			var current = menu.menuParentId;
			while (current != 0 || c < 5) {
				if (current == 0)
					break;

				var parent = leftCtrl.menuMap[current];
				navi.splice(0, 0, parent);
				current = parent.menuParentId;
				c++;
			}
			return navi;
		}

		function setMasterInfo() {
			// master일 경우 화면 제어
			var master = ConfigManager.getMasterInfo();
			leftCtrl.masterFlag = (master.system_seq == preSystemSeq)? true:false;
		}

		function goNewTab(menu) {
			if(menu == null || menu.linkFlag == null || menu.linkFlag != 'Y' || menu.menuPath == null || menu.menuPath == "")
				return;

			$window.open(menu.menuPath, '_blank');
		}

		// 메뉴 css 초기화
		initialize();
	};
});