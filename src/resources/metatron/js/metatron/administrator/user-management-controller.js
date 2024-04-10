define(["app", "moment", "user-model"], function (app, moment, UserModel) {
	app.controller("UserManagementCtrl", ["$rootScope", "$scope", "ConfigManager", "DataService", "ngDialog", function ($rootScope, $scope, ConfigManager, DataService, ngDialog) {
		"use strict";

		// property
		var userManagementCtrl = this;
		var unbind = [];
		userManagementCtrl.menu = [];
		userManagementCtrl.menuMap = {};
		userManagementCtrl.currentUser = new UserModel();
		userManagementCtrl.currentResource = [];
		userManagementCtrl.userListSelectIdx = "0";
		userManagementCtrl.treeDisabled = 'Y';
		userManagementCtrl.grantId;

		function destroy() {
			unbind.forEach(function (fn) {
				ngDialog.closeAll();
				fn();
			});
		}

		function initialize() {
			addEventListener();
			getData();
		}


		function initializeCalendar(value) {
			$(".date").datepicker({dateFormat: 'yy-mm-dd'});

			if (value == '0') {
				$('.datepicker').attr('disabled', 'true');
			} else {
				$('.datepicker').removeAttr('disabled', 'false');
			}
		}

		// method

		userManagementCtrl.getSelectedRow = function (value) {
			if (!value[0]) {
				return;
			}

			var user = value[0];
			userManagementCtrl.userListSelectIdx = user.childIndex.toString();

			if (user.data.grantId == "") {
				user.data.grantId = "3";
			}

			DataService.httpPost("/admin/user/userManagement/getUserDetail", user.data, getUserDetailResult);
			DataService.httpPost("/admin/user/userManagement/getMenuList", user.data, getMenuListResult);
		};

		//userManagementCtrl.menuAuthEditClick

		userManagementCtrl.updateInitPassword = function () {
			var c = confirm("Do you want to initialize password?");
			if (!c) {
				return;
			}

			// update
			DataService.httpPost("/admin/user/userManagement/initializePassword", userManagementCtrl.currentUser, updateInitPasswordResult);
		};

		userManagementCtrl.menuAuthEditClick = function (event) {
			//admin 사용자만 변경 가능함
			if (userManagementCtrl.loginUser.userId != "admin")
				return;


			let menulist = angular.copy(userManagementCtrl.grantMenuList);


			var target = $(event.currentTarget);
			var target_i = target.find("i");
			if (target_i.hasClass('edit')) {
				target.find('i').removeClass("edit");
				target.find('i').addClass("save");
				userManagementCtrl.treeDisabled = 'N';
			} else {
				// admin은 모든 메뉴에 대한 권한을 갖게 한다
				let userId = userManagementCtrl.currentUser.userId;

				if (userId == 'admin') {
					let hasMenuGrant = true;
					for (var j = 0; j < menulist.length; j++) {
						if (menulist[j].menuGrant.toString().toUpperCase() == 'N') {
							hasMenuGrant = false;
							break;
						}
						if (menulist[j].children && menulist[j].children.length > 0) {
							for (let h = 0; h < menulist[j].children.length; h++) {
								if (menulist[j].children[h].menuGrant.toString().toUpperCase() == 'N') {
									hasMenuGrant = false;
									break;
								}
							}
						}
					}
					if (hasMenuGrant == false) {
						alert('Admin must have all menu permission');
						return;
					}
				}

				target.find('i').removeClass("save");
				target.find('i').addClass("edit");
				userManagementCtrl.treeDisabled = 'Y';

				userManagementCtrl.grantId = userManagementCtrl.currentUser.grantId;

				var popup = ngDialog.open({
					template: "/index/user_grant_popup_template.html",
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

		};

		userManagementCtrl.clickPerMenuUpdate = function () {
			if (userManagementCtrl.grantId == undefined || userManagementCtrl.grantId == "") {
				alert("check Grant Permision");
				return;
			}

			var menulist = angular.copy(userManagementCtrl.grantMenuList);


			for (var j = 0; j < menulist.length; j++) {
				var node = menulist[j];
				node.grantId = userManagementCtrl.grantId;
				if (node.hasOwnProperty("childrenFlag")) {
					if (node.childrenFlag == "Y") {
						for (var i = 0; i < node.children.length; i++) {
							node.children[i].grantId = userManagementCtrl.grantId;
						}
					}
				}
			}

			DataService.httpPost("/admin/user/userManagement/updatePerMenu", menulist, getUpdatePerMenuResult);
		};

		function getUpdatePerMenuResult(data) {
			ngDialog.closeAll();
			getData();
		}

		function getUserDetailResult(data) {
			let user = data.data.user;

			if (!user.status) {
				user.status = "request";
			}

			if (!user.grantId) {
				user.grantId = "3";
			}

			if (!user.useStartDate || !user.useEndDate || user.useStartDate.indexOf("0000-00-00") != -1 || user.useEndDate.indexOf("0000-00-00") != -1) {
				user.useExpired = 0;
				user.useStartDate = "";
				user.useEndDate = "";
			}

			if (user.useEndDate == "" && user.useStartDate == "")
				user.useExpired = "0";
			else
				user.useExpired = "1";

			if (user.useExpired == '1' && user.useStartDate != '' && user.useEndDate != '') {
				user.useStartDate = moment(user.useStartDate).format("YYYY-MM-DD");
				user.useEndDate = moment(user.useEndDate).format("YYYY-MM-DD");
			}

			userManagementCtrl.currentUser = user;
			userManagementCtrl.currentResource = data.data.resources;

			initializeCalendar(userManagementCtrl.currentUser.useExpired);
		}

		userManagementCtrl.clickUseExpiredYesHandler = function (code) {
			if (code == 'y') {
				userManagementCtrl.currentUser.useStartDate = moment().local().subtract(1, 'day').format("YYYY-MM-DD");
				userManagementCtrl.currentUser.useEndDate = moment().local().format("YYYY-MM-DD");
			} else {
				userManagementCtrl.currentUser.useStartDate = '';
				userManagementCtrl.currentUser.useEndDate = '';
			}

		};

		userManagementCtrl.clickPermissioHandler = function () {
			//getMenu
			DataService.httpPost("/admin/user/userManagement/getMenuList", userManagementCtrl.currentUser, getMenuListResult);
		};

		userManagementCtrl.clickAuthMenuHandler = function () {
			// $rootScope.$broadcast(ConfigManager.getEvent("CHANGE_AUTH_EVENT"), user);
		};


		userManagementCtrl.userGridSelectRow = function (value) {
			userManagementCtrl.userData = value;
		};

		userManagementCtrl.menuSelected = function (node) {
			userManagementCtrl.selectedNode = node;
			if (node.hasOwnProperty("childrenFlag")) {
				if (node.childrenFlag == "Y") {
					for (var i = 0; i < node.children.length; i++) {
						node.children[i].menuGrant = node.menuGrant;
					}
				}
			}
		};


		userManagementCtrl.clusterSelected = function (node) {
			console.log(node);
		};

		userManagementCtrl.userInfoUpdate = function () {
			var c = confirm("Do you want to update?");
			if (!c) {
				return;
			}

			// validation
			var user = userManagementCtrl.currentUser;
			if (!user.name || user.name.trim() == "") {
				alert("User Name is required");
				return;
			}

			if (user.useExpired == "1") {
				//user.useStartDate = user.useStartDate + ' 00:00:00';
				//user.useEndDate = user.useEndDate + ' 23:59:59';

				if (!moment(user.useStartDate + ' 00:00:00').isBefore(user.useEndDate + ' 23:59:59')) {
					alert('Expiration Start Date cannot be later than End Date');
					return;
				}
			}

			if (user.useExpired == "0") {
				delete user.useStartDate;
				delete user.useEndDate;
			}

			// update
			var param = {};
			param.user = angular.copy(user);
			if (user.useExpired == "1") {
				param.user.useStartDate = param.user.useStartDate + ' 00:00:00';
				param.user.useEndDate = param.user.useEndDate + ' 23:59:59';
			}
			param.resources = [];

			for (var i = 0; i < userManagementCtrl.currentResource.length; i++) {
				if (userManagementCtrl.currentResource[i]['clusterGrant'] == 'Y') {
					param.resources.push(userManagementCtrl.currentResource[i]);
				}
			}

			if (param.resources.length == 0) {
				alert("Resource Permission is at least one node has to choose.");
				return;
			}

			DataService.httpPost("/admin/user/userManagement/updateUserInfo", param, updateUserInfoResult);
		};

		function updateUserInfoResult(data) {
			if(data == null || data.data == null)
				return;

			alert("Success user information.");
			getData();

			if(data.data != null && data.data.length > 0)
				$rootScope.$broadcast(ConfigManager.getEvent("CHANGE_CLUSTER_LIST_EVENT"), data.data);
		}

		// function
		function getData() {
			var param = {};
			DataService.httpPost("/admin/user/userManagement/getUserList", param, getUserListReslut);
		}

		function getMenuListResult(data) {
			userManagementCtrl.grantMenuList = data.data.menulist;

			userManagementCtrl.expandMenuList = [];
			for (var i = 0; i < userManagementCtrl.grantMenuList.length; i++) {
				userManagementCtrl.expandMenuList.push(userManagementCtrl.grantMenuList[i]);
			}
		}

		// event-handler
		function getUserListReslut(data) {
			userManagementCtrl.userList = data.data.userlist;
			userManagementCtrl.loginUser = data.data.loginUser;
			
			for(var i=0;i<userManagementCtrl.userList.length;i++) {
				if(userManagementCtrl.userList[i].userId === userManagementCtrl.loginUser.userId) {
					userManagementCtrl.userListSelectIdx = i+'';	
					//$scope.$$childHead.gridObj.grid.api.selectIndex(i)
					console.log($scope);
					break;
				}
			}
			//userManagementCtrl.grantMenuList = data.data.menulist;
			//userManagementCtrl.grantClustList = data.data.clusterlist;
			//userManagementCtrl.expandMenuList
//			userManagementCtrl.expandMenuList = [];
//			
//			for(var i = 0 ; i < userManagementCtrl.grantMenuList.length ; i++)
//			{
//				userManagementCtrl.expandMenuList.push(userManagementCtrl.grantMenuList[i]);
//			}
		}

		function deleteUserEventHandler(event, data) {
			var c = confirm("Do you want to Delete?");
			if (!c) {
				return;
			}

			DataService.httpPost("/admin/user/userManagement/deleteUserInfo", data, deleteUserResult);
		}

		function deleteUserResult(data) {
			getData();
		}

		function updateInitPasswordResult(data) {

		}

		function onChangeSystemSeqEventHandler(event, data) {
			if (data == null)
				return;
			getData();
		}

		function addEventListener() {
			unbind = [$scope.$on('$destroy', destroy),
				$scope.$on(ConfigManager.getEvent("CHANGE_SYSTEM_SEQ_EVENT"), onChangeSystemSeqEventHandler),
				$rootScope.$on(ConfigManager.getEvent("GRID_DELETE_BTN_EVENT"), deleteUserEventHandler)];
		}

		initialize();
	}]);
});