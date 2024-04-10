define(["moment"], function (moment) {
	return function ($rootScope, $scope, $compile, $location, $state, ConfigManager, DataService, WebSocketService, AlarmManager, ngDialog, CommonUtil) {
		"use strict";

		// property
		var headerCtrl = this;
		var unbind = [];
		var systemSeq = "";
		var content = null;

		headerCtrl.currentDate = moment().local().format('YYYY-MM-DD HH:mm');
		headerCtrl.systemGroupList = null;
		headerCtrl.UserInfo = "";
		headerCtrl.password = "";
		headerCtrl.showAlarmCount = false;


		// method
		headerCtrl.alarmPopClick = function () {			
			var alarm = angular.element("#alarmDiv");
			alarm.remove();

			if ($location.url() == '/alarmStatus') return;

			$state.go('/activities/alarm/status');
			$rootScope.$broadcast(ConfigManager.getEvent("SELECT_MENU_EVENT"), {
				path: '/activities/alarm/status',
				mode: 'header'
			});
		};

		headerCtrl.alarmListClick = function (obj) {
			window.location = "";
		};

		headerCtrl.selectMenu = function (menu) {
			alert(menu);
		};

		headerCtrl.updateUserPop = function () {			
			headerCtrl.password = "";
			DataService.httpPost("/admin/user/userManagement/getUserDetail", ConfigManager.getUser(), getUserDetailResult, false);
		};

		headerCtrl.clickSignUpHandler = function () {
			// vaildation check
			var userid = headerCtrl.userInfo.userId;
			if(CommonUtil.checkEmpty(userid)) {
				alert("Please check the userid.");
				return;
			}

			var username = headerCtrl.userInfo.name;
			if(CommonUtil.checkEmpty(username)) {
				alert("Please enter the username.");
				return;
			}

			var passwd = headerCtrl.userInfo.userPassword;
			if(CommonUtil.checkEmpty(passwd)) {
				alert("Please enter the password.");
				return;
			}

			var verifypasswd = headerCtrl.userInfo.userpassConfirm;
			if(CommonUtil.checkEmpty(verifypasswd)) {
				alert("Please enter the verify password.");
				return;
			}

			if(passwd != verifypasswd) {
				alert("The values of password and verity password are different. Please check.");
				return;
			}

			var email = headerCtrl.userInfo.email;
			if (email != null && email.match(CommonUtil.REGEXP_EMAIL) == null) {
				alert("The Email format is not correct.");
				return false;
			}

			var contact = headerCtrl.userInfo.contact;
			if (contact != null && contact.match(CommonUtil.REGEXP_PHONE_NUMBER) == null) {
				alert("Please check the contact.");
				return false;
			}

			var popup = ngDialog.open({
				template: "/index/user_password_popup_template.html",
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

		headerCtrl.clickUpdateHandler = function () {
			if (headerCtrl.password == "") {
				alert("Please enter the password.");
			} else {
				var param = {};
				param.password = headerCtrl.password;
				DataService.httpPost("/admin/user/userManagement/checkPassword", param, checkPasswordResult, false);
			}
		};

		headerCtrl.logoutHandler = function () {
			sessionStorage.clear();
			window.location = "/logout";
		};


		headerCtrl.goHomeHandler = function () {
			history.go(-1);
		};

		$rootScope.$on('$stateChangeStart', function (event, toState, toParams) {
			headerCtrl.currentDate = moment().local().format('YYYY-MM-DD HH:mm');
		});


		// event-handler
		function onAlarmUpdateEventHandler(event) {

			if(headerCtrl.alarm == null)
				headerCtrl.alarm = {};

			// headerCtrl.alarm.currCount = 0;
			AlarmManager.getAlarms({}, true).then(function(data) {
				if(data != null)
					headerCtrl.alarm.currCount = data.length;

				if (headerCtrl.alarm.currCount == null || headerCtrl.alarm.currCount == 0) {
					headerCtrl.alarm.currCount = 0;
					headerCtrl.showAlarmCount = false;
				} else {
					headerCtrl.showAlarmCount = true;
				}

			});
		}

		function onSelectMenuEventHandler(event, data) {
			if (data == null || data == "")
				return;

			var paths = [];

			if(data.path == "/services/hdfs/overview"){
				data.path = "/data/hdfs/overview";
			}
			data.path.replace(/(\w+)/gi, function (v) {
				var s = CommonUtil.getFirstUpperCase(v, true);
				s = s.replace(/hdfs/gi, 'HDFS');  	// hdfs는 예외
				s = s.replace(/Presto/gi, 'Trino');
				paths.push(s);
			});

			headerCtrl.headerMenu = paths;
		}

		function onGetSystemIdEventHandler(event, data) {
			systemSeq = data;
			headerCtrl.systemSeq = data;
		}


		// function
		function initialize() {
			addEventListener();
		}

		function userUpdateResult(data) {
			alert("Success update user information.");
			ngDialog.closeAll();
		}

		function checkPasswordResult(data) {
			if (data.data == true) {
				var param = {};
				param.user = headerCtrl.userInfo;
				DataService.httpPost("/admin/user/userManagement/updateUserInfo", param, userUpdateResult, false);
			} else {
				alert("Please check the password.");
			}
		}

		function getUserDetailResult(data) {
			headerCtrl.userInfo = data.data.user;
			if (!headerCtrl.userInfo.useStartDate || !headerCtrl.userInfo.useEndDate || headerCtrl.userInfo.useEndDate.indexOf("0000-00-00") != -1 || headerCtrl.userInfo.useStartDate.indexOf("0000-00-00") != -1) {
				headerCtrl.userInfo.expiration = "Unlimited";
			} else {
				headerCtrl.userInfo.expiration = headerCtrl.userInfo.useStartDate + " ~ " + headerCtrl.userInfo.useEndDate;
			}
			var popup = ngDialog.open({
				template: "/index/user_update_popup_template.html",
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

		function destroy() {
			unbind.forEach(function (fn) {
				fn();
				ngDialog.closeAll();
				clear();
			});
		}

		function addEventListener() {
			unbind = [
				$rootScope.$on(ConfigManager.getEvent("ALARM_UPDATE_EVENT"), onAlarmUpdateEventHandler),
				$rootScope.$on(ConfigManager.getEvent("CHANGE_SYSTEM_SEQ_EVENT"), onGetSystemIdEventHandler),
				$rootScope.$on(ConfigManager.getEvent("SELECT_MENU_EVENT"), onSelectMenuEventHandler),
				$scope.$on('$destroy', destroy)
			];
		}

		function clear() {
			delete headerCtrl.currentDate;
			delete headerCtrl.systemGroupList;
			delete headerCtrl.UserInfo;
			delete headerCtrl.password;
			delete headerCtrl.showAlarmCount;

			unbind = null;
			systemSeq = null;
			content = null;
		}

		initialize();
	};
});