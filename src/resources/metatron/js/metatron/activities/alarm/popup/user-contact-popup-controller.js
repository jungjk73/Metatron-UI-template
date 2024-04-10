define(["app"], function (app) {
	app.controller("UserContactPopupCtrl", ["$rootScope", "$scope", "DataService", "CommonUtil", function ($rootScope, $scope, DataService, CommonUtil) {
		"use strict";

		// property
		var userContactPopupCtrl = this;
		var sync = false;

		userContactPopupCtrl.grid = {};
		userContactPopupCtrl.grid.selectedUsers = [];
		userContactPopupCtrl.customUsers = [{}];
		userContactPopupCtrl.selectViewType = "grid";


		//method
		userContactPopupCtrl.selectSmsUserHandler = function(value) {
			userContactPopupCtrl.grid.selectedUsers = value;
		}

		userContactPopupCtrl.selectSmsUserSave = function() {

			let list = [];
			let errorType = "";
			if(userContactPopupCtrl.selectViewType == "grid") {
				list = _.pluck(userContactPopupCtrl.grid.selectedUsers, "data");
				errorType = "select";
			} else {
				list = userContactPopupCtrl.customUsers;
				errorType = "enter";
			}

			if(list == null || list.length < 1) {
				alert(`Please ${errorType} the user.`);
				return;
			}

			list = _.uniq(list, x => x.seq);
			if(!validateSmsUser(list))
				return;

			$scope.closeThisDialog(list);
		}

		userContactPopupCtrl.userAddClick = function () {
			var user = {seq: getDummySeq() };
			userContactPopupCtrl.customUsers.push(user);
		}

		userContactPopupCtrl.userDeleteClick = function (value) {
			if(value == null)
				return;

			var list = userContactPopupCtrl.customUsers;
			for (var i = 0; i < list.length; i++) {
				if (value.seq == list[i].seq) {
					list.splice(i, 1);
					i--;
				}
			}
			userContactPopupCtrl.customUsers = list;
		}

		userContactPopupCtrl.changeViewType = function(type, event) {
			userContactPopupCtrl.selectViewType = type;

			// active 상태 변경
			var tab = angular.element("#viewTypeTab");
			tab.children().removeClass("active");
			var target = angular.element(event.currentTarget);
			target.addClass("active");

			if(userContactPopupCtrl.selectViewType == "grid")
				userContactPopupCtrl.customUsers = [{seq:0}];
			else
				userContactPopupCtrl.grid.selectedUsers = [];
		}

		userContactPopupCtrl.changeCustomSelectTypeHandler = function(event, data) {
			if(event == null)
				return;

			data.selectType = event.codeValue;
		}


		// event-handler
		function onGetUserResultHandler(data) {
			if(data == null || data.data == null)
				return;

			userContactPopupCtrl.grid.users = data.data.userlist;
			sync = false;
		}


		// function
		function initialize() {
			getUser();
			userContactPopupCtrl.customUsers[0].seq = 0;
		}

		function getUser() {
			if(sync == true)
				return;

			sync = true;
			DataService.httpPost("/admin/user/userManagement/getUserList", {}, onGetUserResultHandler);
		}

		function validateSmsUser(list) {
			var result = false;
			if (list == null || list.length < 1) {
				$scope.closeThisDialog(list);
				return result;
			}

			var dupContact = {};
			var dupEmail = {};
			let validateContact = function (contact, data) {
				if (CommonUtil.checkEmpty(contact)) {
					alert("Please check the contact.");
					return false;
				}

				if (contact.match(CommonUtil.REGEXP_PHONE_NUMBER) == null) {
					alert("Please check the contact.");
					return false;
				}

				if(dupContact[contact] != null) {
					alert("Please check the contact. There is a duplicate contact in the list.");
					return false;
				} else {
					dupContact[contact] = data;
				}

				return true;
			}
			let validateEmail = function (email, data) {
				if (CommonUtil.checkEmpty(email)) {
					alert("Please check the email.");
					return false;
				}

				if (email.match(CommonUtil.REGEXP_EMAIL) == null) {
					alert("The Email format is not correct.");
					return false;
				}

				if(dupEmail[email] != null) {
					alert("Please check the email. There is a duplicate email in the list.");
					return false;
				} else {
					dupEmail[email] = data;
				}

				return true;
			}

			var len = list.length;
			for (var i = 0; i < len; i++) {

				if (userContactPopupCtrl.selectViewType != "grid" && CommonUtil.checkEmpty(list[i].name)) {
					alert("Please check the username.");
					return false;
				}

				let contact = list[i].contact;
				let email = list[i].email;
				var type = (list[i].selectType == null || list[i].selectType == "") ? "all" : list[i].selectType.toLowerCase();
				if (type == "all") {
					if (!validateContact(contact, list[i]))
						return false;
					if (!validateEmail(email, list[i]))
						return false;
				} else if (type == "sms" && !validateContact(contact, list[i])) {
					delete list[i].email;
					return false;
				} else if (type == "email" && !validateEmail(email, list[i])) {
					delete list[i].contact;
					return false;
				}
			}

			result = true;
			return result;
		}

		function getDummySeq() {
			var d = new Date();
			return d.getTime();
		}

		initialize();
	}]);
});