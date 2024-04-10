define(["app"], function (app) {
	app.controller("SmsConfigCtrl", ["$scope", "$rootScope", "$controller", "$timeout", "$filter", "DataService", "ngDialog", "ConfigManager", "CommonUtil",
		function ($scope, $rootScope, $controller,$timeout,$filter, DataService, ngDialog, ConfigManager, CommonUtil) {
			"use strict";

			// property
			let smsConfigCtrl = this;
			let unbind = [];
			let loadCompleted = false;
			let currPhone = [];
			let currEmail = [];
			let currChannel = [];

			// Alarm List
			smsConfigCtrl.alarmResultList_UNASSIGNED = [];
			smsConfigCtrl.alarmResultList_ASSIGNED = [];

			smsConfigCtrl.selectedUsersId = "";
			smsConfigCtrl.selectedUsersIdx = "";
			smsConfigCtrl.selectedUsers = [];

			smsConfigCtrl.alarmSelectedList_UNASSIGNED = [];
			smsConfigCtrl.alarmSelectedList_ASSIGNED = [];

			smsConfigCtrl.input = {};
			smsConfigCtrl.input.user = '';
			smsConfigCtrl.input.email = '';
			smsConfigCtrl.input.phone = '';

			smsConfigCtrl.searchFilter = {};

			smsConfigCtrl.severitySelected = '';
			smsConfigCtrl.typeSelected = '';


			// 사용자 추가 (channel id를 함께 기입할수 없다.)
			smsConfigCtrl.addUser = function(){
				if (!loadCompleted) return;

				if (smsConfigCtrl.selectedUsers.length > 0) {
					alert('Please Deselect User.');
					return;
				}

				if (!smsConfigCtrl.alarmSelectedList_UNASSIGNED || smsConfigCtrl.alarmSelectedList_UNASSIGNED.length == 0) {
					alert('Please Select Alarms.');
					return;
				}

				if(CommonUtil.checkEmpty(smsConfigCtrl.input.user)) {
					alert("Please check the User Name.");
					return;
				}

				if(CommonUtil.checkEmpty(smsConfigCtrl.input.email) && CommonUtil.checkEmpty(smsConfigCtrl.input.phone)) {
					alert("Please check your phone number or email.");
					return;
				}

				if (!CommonUtil.checkEmpty(smsConfigCtrl.input.channel) &&
					!confirm("When you add USER, then CHANNEL ID will be saved blank.\nDo you want to add USER?"))
					return;

				if (validateEmail(smsConfigCtrl.input.email) && validatePhone(smsConfigCtrl.input.phone)) {
					let paramList = [];
					for (let i = 0 ; i < smsConfigCtrl.alarmSelectedList_UNASSIGNED.length ; i++) {
						let param = {
							eventSeq : smsConfigCtrl.alarmSelectedList_UNASSIGNED[i].data.eventSeq,
							systemSeq : ConfigManager.getSystemSeq(),
							processSeq: smsConfigCtrl.alarmSelectedList_UNASSIGNED[i].data.processSeq,
							name: smsConfigCtrl.input.user,
							contact: smsConfigCtrl.input.phone,
							email: smsConfigCtrl.input.email,
							channel : '',
							// selectType: (smsConfigCtrl.input.phone != null && smsConfigCtrl.input.phone.trim() != '' && smsConfigCtrl.input.email != null && smsConfigCtrl.input.email.trim() != '')? 'BOTH' : ( (smsConfigCtrl.input.phone == null || smsConfigCtrl.input.phone.trim() == '') && smsConfigCtrl.input.email != null && smsConfigCtrl.input.email.trim() != '')? 'EMAIL' : (smsConfigCtrl.input.phone != null && smsConfigCtrl.input.phone.trim() != '' && (smsConfigCtrl.input.email == null || smsConfigCtrl.input.email.trim() == ''))? 'SMS' : ''
						};
						param.selectType = getSelectType(param);

						paramList.push(param);
					}

					DataService.httpPost("/activities/alarm/configuration/addSmsUsers", {'list':paramList}, function(result){
						smsConfigCtrl.input = {};
						getUserList();
					});
				}
			};


			// Cube 알림 채널 추가 (email, phone을 함께 기입할수 없다.)
			smsConfigCtrl.addChannel = function(){
				if (!loadCompleted) return;

				if (smsConfigCtrl.selectedUsers.length > 0) {
					alert('Please Deselect User.');
					return;
				}

				if (!smsConfigCtrl.alarmSelectedList_UNASSIGNED || smsConfigCtrl.alarmSelectedList_UNASSIGNED.length == 0) {
					alert('Please Select Alarms.');
					return;
				}

				if(CommonUtil.checkEmpty(smsConfigCtrl.input.user)) {
					alert("Please check the User Name(or Channel Name).");
					return;
				}

				if(CommonUtil.checkEmpty(smsConfigCtrl.input.channel)) {
					alert("Please check the Cube Channel ID.");
					return;
				}

				if ( ( !CommonUtil.checkEmpty(smsConfigCtrl.input.email) ||
					   !CommonUtil.checkEmpty(smsConfigCtrl.input.phone)    ) &&
					   !confirm("When you add CHANNEL, then EMAIL and PHONE will be saved blank.\nDo you want to add CHANNEL?"))
					return;

				if (validateChannel(smsConfigCtrl.input.channel)) {
					let paramList = [];
					for (let i = 0 ; i < smsConfigCtrl.alarmSelectedList_UNASSIGNED.length ; i++) {
						let param = {
							eventSeq : smsConfigCtrl.alarmSelectedList_UNASSIGNED[i].data.eventSeq,
							systemSeq : ConfigManager.getSystemSeq(),
							processSeq: smsConfigCtrl.alarmSelectedList_UNASSIGNED[i].data.processSeq,
							name: smsConfigCtrl.input.user,
							contact: '',
							email: '',
							channel : smsConfigCtrl.input.channel,
						};
						param.selectType = getSelectType(param);

						paramList.push(param);
					}

					DataService.httpPost("/activities/alarm/configuration/addSmsUsers", {'list':paramList}, function(result){
						smsConfigCtrl.input = {};
						getUserList();
					});
				}
			};


			// 사용자 복제
			smsConfigCtrl.replicateUser = function(){
				if (!loadCompleted) return;

				if (!smsConfigCtrl.selectedUsers || smsConfigCtrl.selectedUsers.length == 0) {
					alert('Please Select User.');
					return;
				}

				if (validateUserName(smsConfigCtrl.input.user) && validateEmail(smsConfigCtrl.input.email) && validatePhone(smsConfigCtrl.input.phone)) {
					let param;
					alert(getSelectType(smsConfigCtrl.input));
					if(getSelectType(smsConfigCtrl.input) == 'CUBE'){
						param = {
							targetName: smsConfigCtrl.selectedUsers[0].data.name,
							userName: smsConfigCtrl.input.user,
							contact: '',
							email: '',
							channel: smsConfigCtrl.input.channel,
							// selectType: (smsConfigCtrl.input.phone.trim() != '' && smsConfigCtrl.input.email.trim() != '')? 'BOTH' : (smsConfigCtrl.input.phone.trim() == '' && smsConfigCtrl.input.email.trim() != '')? 'EMAIL' : (smsConfigCtrl.input.phone.trim() != '' && smsConfigCtrl.input.email.trim() == '')? 'SMS' : ''
							selectType: 'CUBE'
						};
					}else{
						if (CommonUtil.checkEmpty(smsConfigCtrl.input.email) && CommonUtil.checkEmpty(smsConfigCtrl.input.phone)) {
							confirm("Please check your phone number, email and channel id.");
							return;
						}
						if (currPhone.indexOf(smsConfigCtrl.input.phone) != -1) {
							alert("There is a duplicated phone number.");
							return;
						}
						param = {
							targetName: smsConfigCtrl.selectedUsers[0].data.name,
							userName: smsConfigCtrl.input.user,
							contact: smsConfigCtrl.input.phone,
							email: smsConfigCtrl.input.email,
							channel: '',
							// selectType: (smsConfigCtrl.input.phone.trim() != '' && smsConfigCtrl.input.email.trim() != '')? 'BOTH' : (smsConfigCtrl.input.phone.trim() == '' && smsConfigCtrl.input.email.trim() != '')? 'EMAIL' : (smsConfigCtrl.input.phone.trim() != '' && smsConfigCtrl.input.email.trim() == '')? 'SMS' : ''
							selectType: getSelectType(smsConfigCtrl.input)
						};
					}

					if (!confirm("Do you want to replicate user?")) return;

					DataService.httpPost("/activities/alarm/configuration/replicateUserAlarm", param, function(result){
						smsConfigCtrl.input = {};
						getUserList();
						smsConfigCtrl.selectedUsers = [];
						getAlarmList();
					});
				}
			};



			// 사용자 그리드 row 클릭
			smsConfigCtrl.userGridRowClick = function(value, event){				
				if (!event || !loadCompleted) return;

				 $timeout(function(){
					smsConfigCtrl.severitySelected = '';
					smsConfigCtrl.typeSelected = '';
					smsConfigCtrl.searchFilter = {
						severity: '',
						type: ''
					};
				 })
				
				smsConfigCtrl.selectedUsers = value;

				if (!smsConfigCtrl.selectedUsers[0])  {	// 선택된 사용자 없는 경우 전체 알람 검색
					getAlarmList();			
				} else {								// 선택된 사용자에 대한 알람 검색
					smsConfigCtrl.selectedUsersId = smsConfigCtrl.selectedUsers[0].data.name;					
					getAlarmList(smsConfigCtrl.selectedUsers[0].data.name);	
				} 
			};


			// 검색 필터 변경
			smsConfigCtrl.filterListChange = function(event, type){				
				if (!loadCompleted) return;
				if (type == 'severity') {
					smsConfigCtrl.searchFilter = {...smsConfigCtrl.searchFilter, 'severity': event.codeValue};
					smsConfigCtrl.severitySelected = event.codeValue;			

				}
				else if (type == 'type') {
					smsConfigCtrl.searchFilter = {...smsConfigCtrl.searchFilter, 'type': event.codeValue};
					smsConfigCtrl.typeSelected = event.codeValue;

				}

				getAlarmList(smsConfigCtrl.selectedUsers.length > 0 ? smsConfigCtrl.selectedUsers[0].data.name : '');
			};



			// 알람 그리드 row 클릭
			smsConfigCtrl.alarmGridRowClick = function(value, assigned){				
				if (!loadCompleted) return;

				if (assigned) smsConfigCtrl.alarmSelectedList_ASSIGNED = value;
				else smsConfigCtrl.alarmSelectedList_UNASSIGNED = value;
				ap($scope);
			};



			// 할당된 알람 삭제
			smsConfigCtrl.delAlarm = function(){
				if (!smsConfigCtrl.alarmSelectedList_ASSIGNED || smsConfigCtrl.alarmSelectedList_ASSIGNED.length == 0){
					alert('Please Select Alarm.');
					return;
				} else if (smsConfigCtrl.selectedUsers.length == 0) {
					alert('Please Select User.');
					return;
				}


				if (!confirm("Do you want to delete?")) return;

				let userName = smsConfigCtrl.selectedUsers[0].data.name;
				let param = [];
				for (let i = 0 ; i < smsConfigCtrl.alarmSelectedList_ASSIGNED.length ; i++) {

					smsConfigCtrl.alarmSelectedList_ASSIGNED[i].data.userName = userName;
					param.push(smsConfigCtrl.alarmSelectedList_ASSIGNED[i].data);
				}

				DataService.httpPost("/activities/alarm/configuration/deleteSmsConfig", param, function(result){
					if (!result || result.result != 1) return;


					getUserList();
					getAlarmList(userName);

				});
			};



			// 알람 추가
			smsConfigCtrl.addAlarm = function(){
				if (!smsConfigCtrl.alarmSelectedList_UNASSIGNED || smsConfigCtrl.alarmSelectedList_UNASSIGNED.length == 0){
					alert('Please Select Alarm.');
					return;
				} else if( smsConfigCtrl.selectedUsers.length == 0) {
					alert('Please Select User.');
					return;
				}

				let paramList = [];
				for (let i = 0 ; i < smsConfigCtrl.alarmSelectedList_UNASSIGNED.length ; i++) {
					let param = {
						eventSeq : smsConfigCtrl.alarmSelectedList_UNASSIGNED[i].data.eventSeq,
						systemSeq : ConfigManager.getSystemSeq(),
						processSeq: smsConfigCtrl.alarmSelectedList_UNASSIGNED[i].data.processSeq,
						name: smsConfigCtrl.selectedUsers[0].data.name,
						contact: smsConfigCtrl.selectedUsers[0].data.contact ? smsConfigCtrl.selectedUsers[0].data.contact : '',
						email: smsConfigCtrl.selectedUsers[0].data.email ? smsConfigCtrl.selectedUsers[0].data.email : '',
						channel: smsConfigCtrl.selectedUsers[0].data.channel ? smsConfigCtrl.selectedUsers[0].data.channel : '',
						// selectType: (smsConfigCtrl.selectedUsers[0].data.contact.trim() != '' && smsConfigCtrl.selectedUsers[0].data.email.trim() != '')? 'BOTH' : (smsConfigCtrl.selectedUsers[0].data.contact.trim() == '' && smsConfigCtrl.selectedUsers[0].data.email.trim() != '')? 'EMAIL' : (smsConfigCtrl.selectedUsers[0].data.contact.trim() != '' && smsConfigCtrl.selectedUsers[0].data.email.trim() == '')? 'SMS' : ''
						selectType: getSelectType(smsConfigCtrl.selectedUsers[0].data)
					};
					paramList.push(param);
				}

				DataService.httpPost("/activities/alarm/configuration/addSmsUsers", {'list':paramList}, function(result){
					getUserList();
					getAlarmList(smsConfigCtrl.selectedUsers[0].data.name);					
				});

			};



			// 사용자 리스트
			function getUserList(){
				smsConfigCtrl.userList = [];
				currPhone = [];
				currEmail = [];
				currChannel = [];


				let param = {};
				param.system_parent_seq = ConfigManager.getSystemSeq();
				DataService.httpPost("/activities/alarm/configuration/getSmsUsers", param, function(result){
					smsConfigCtrl.userList = result.data;
					for (let i = 0 ; i < smsConfigCtrl.userList.length ; i++){
						let user = smsConfigCtrl.userList[i].name;
						currPhone.push(smsConfigCtrl.userList[i].contact);
						currEmail.push(smsConfigCtrl.userList[i].email);
						currChannel.push(smsConfigCtrl.userList[i].channel);
						if(smsConfigCtrl.selectedUsersId === user) {
							smsConfigCtrl.selectedUsersIdx = i;
						}
					}				
				}, false);
			}


			// Alarm List
			function getAlarmList(_userName){
				smsConfigCtrl.alarmResultList_UNASSIGNED = [];
				smsConfigCtrl.alarmResultList_ASSIGNED = [];

				if (ConfigManager.getSystemSeq() == ''){
					let __out = $timeout(function(){
						getAlarmList(_userName);
						$timeout.cancel(__out);
					}, 500);
					return;
				}

				let param = {};
				param = angular.copy(smsConfigCtrl.searchFilter);
				param.system_parent_seq = ConfigManager.getSystemSeq();
				param.cluster = ConfigManager.getSystemName();

				if (_userName)
					param.userName = _userName;
				DataService.httpPost("/activities/alarm/configuration/getSmsAlarmList", param, function(result){
					if (result.result != 1) return;

					smsConfigCtrl.alarmResultList_UNASSIGNED = result.data.filter(v => v.selected == 'N');
					smsConfigCtrl.alarmResultList_ASSIGNED =  result.data.filter(v => v.selected == 'Y');
					//if (smsConfigCtrl.alarmResultList_ASSIGNED.length == 0) getUserList();
				}, false);
			}

			// User Name Validation
			function validateUserName(name){
				if (CommonUtil.checkEmpty(name)) {
					alert("Please check the User Name.");
					return false;
				} else {
					return true;
				}
			}

			// Phone Validate
			function validatePhone(phone, checkDup){
				if (phone != null && phone.trim() != '' ) {
					if (phone.match(CommonUtil.REGEXP_PHONE_NUMBER) == null) {
						alert("The Phone number format is not correct.");
						return false;
					}

					if (checkDup == null || checkDup == true) {
						if (currPhone.indexOf(phone) != -1) {
							alert("There is a duplicated phone number.");
							return false;
						}
					}
				}

				return true;
			}

			// email Validation
			function validateEmail(email, checkDup) {
				if (email != null && email.trim() != '' ) {
					if (email.match(CommonUtil.REGEXP_EMAIL) == null) {
						alert("The Email format is not correct.");
						return false;
					}

					// if (checkDup == null || checkDup == true) {
					// 	if (currEmail.indexOf(email) != -1) {
					// 		alert("There is a duplicated email.");
					// 		return false;
					// 	}
					// }
				}
				return true;
			}

			// Channel Validate
			function validateChannel(channel, checkDup){
				if (channel != null && channel.trim() != '' ) {
					if (channel.match(CommonUtil.REGEXP_CHANNEL_ID) == null) {
						alert("The Channel ID format is not correct.");
						return false;
					}

					if (checkDup == null || checkDup == true) {
						if (currChannel.indexOf(channel) != -1) {
							alert("There is a duplicated Channel ID.");
							return false;
						}
					}
				}
				return true;
			}

			// event-handler
			function destroy() {
				unbind.forEach(function (fn) {
					clear();
					fn();
					ngDialog.closeAll();
				});
			}

			function clear() {
				if(smsConfigCtrl == null)
					return;

				unbind = null;
				smsConfigCtrl = null;
			}

			function onChangeSystemSeqEventHandler(event, data) {
				if (data == null)
					return;

				if (!loadCompleted) return;

				getAlarmList();
				getUserList();

			}

			function addEventListener() {
				unbind = [
					$scope.$on(ConfigManager.getEvent("CHANGE_SYSTEM_SEQ_EVENT"), onChangeSystemSeqEventHandler),
					$scope.$on(ConfigManager.getEvent("GRID_DELETE_BTN_EVENT"), function(event, data){
						if (!confirm("Do you want to delete?")) return;

						console.log('GRID_DELETE_BTN_EVENT..... ',data);
						let param = [{userName: data.name}];
						DataService.httpPost("/activities/alarm/configuration/deleteSmsConfig", param, function(result){
							getUserList();
						});
					}),
					$scope.$on(ConfigManager.getEvent("GRID_EDIT_BTN_EVENT"), function(event, data){
						console.log('GRID_EDIT_BTN_EVENT..... ', data,smsConfigCtrl.userList);

						if ($('.editCol').length > 0) {
							let $row = $('.editCol').parent().parent();

							let _name = $('.editCol:eq(0)').parent().siblings('[colid="name"]').text();
							let _email = $('input[data-column="email"]').val();
							let _contact = $('input[data-column="contact"]').val();
							let _channel = $('input[data-column="channel"]').val();

							if(CommonUtil.checkEmpty(_channel) && CommonUtil.checkEmpty(_email) && CommonUtil.checkEmpty(_contact)) {
								alert("Please check your phone number, email and channel id.");
								return;
							}

							// 값이 null 일때는 true 리턴. null 아니면 valid 결과 리턴  henry
							if (!validateEmail(_email) || !validatePhone(_contact) || !validateChannel(_channel)) return;

							let param = {};
							param.userName = _name;
							param.contact = _contact;
							param.email = _email;
							param.channel = _channel;
							// param.selectType = (param.contact.trim() != '' && param.email.trim() != '')? 'BOTH' : (param.contact.trim() == '' && param.email.trim() != '')? 'EMAIL' : (param.contact.trim() != '' && param.email.trim() == '')? 'SMS' : '';
							param.selectType = getSelectType(param);

							DataService.httpPost("/activities/alarm/configuration/updateSmsUser", param, function(result){
								$row.find('input[data-column="email"]').parent().parent().text(_email);
								$row.find('input[data-column="contact"]').parent().parent().text(_contact);
								$row.find('input[data-column="channel"]').parent().parent().text(_channel);
								$row.find('.editCol').remove();
								currEmail.push(_email);
								currPhone.push(_contact);
								currChannel.push(_channel);
							});

							let rowIdx = $row.attr('row');
							smsConfigCtrl.userList[rowIdx].editMode = false;
						}


						if (data.data.editMode){	// input text 로 변경하여 사용자가 내용 수정하도록 처리

							let $row = $('#userListGrid .ag-body-container .ag-row:eq('+data.rowIndex+')');
							let columns = smsConfigCtrl.gridObj.grid.columnDefs;

							let colObj = {};

							let childNodes = $row[0].childNodes;

							let _email = '';
							let _contact = '';
							let _channel = '';

							for (let i = 0 ; i < columns.length ; i++) {
								if (columns[i].field && columns[i].field != '' && columns[i].field != 'name' && columns[i].field != 'event_count') {
									let value = $(childNodes[i]).text();
									colObj[columns[i].field] = value;

									if (i == 2) _email = $(childNodes[i]).text();
									else if (i == 3) _contact = $(childNodes[i]).text();
									else if (i == 4) _channel = $(childNodes[i]).text();

									$(childNodes[i]).html('<div style="margin-top: -5px;" class="editCol"><input style="height: 27px; text-align: center;" value="'+value+'" data-origin="'+value+'" data-column="'+columns[i].field+'"></div>');
								}
							}

							$('.editCol > input').on('change',function(){
								let field = $(this).attr('data-column');
								colObj[field] = $(this).val();
							});

							data.data.editObj = colObj;

							for(let i = 0 ; i < currEmail.length ; i++) {
								if (currEmail[i] == _email) {
									currEmail.splice(i,1);
									i--;
								}
							}
							for(let i = 0 ; i < currPhone.length ; i++) {
								if (currPhone[i] == _contact) {
									currPhone.splice(i,1);
									i--;
								}
							}
							for(let i = 0 ; i < currChannel.length ; i++) {
								if (currChannel[i] == _channel) {
									currChannel.splice(i,1);
									i--;
								}
							}
							console.log(currEmail, currPhone, currChannel);

						} else {
							return;

						}

					}),
					$scope.$on('$destroy', destroy)
				];
			}

			// henry
			function getSelectType(data){
				let value = 0;
				let result = "";
				if (data.contact != null && data.contact.trim() != '') value = value +   1;
				if (data.email   != null && data.email.trim()   != '') value = value +  10;
				if (data.channel != null && data.channel.trim() != '') value = value + 100;

				switch(value){
					case   0 : result = "EMPTY"; break;
					case   1 : result = "SMS"  ; break;
					case  10 : result = "EMAIL"; break;
					case  11 : result = "BOTH" ; break;
					case 100 : result = "CUBE" ; break;
					default  : result = "BOTH" ;
				}

				//let resul = (data.contact != null && data.contact.trim() != '' && data.email != null && data.email.trim() != '')? 'BOTH' : ( (data.contact == null || data.contact.trim() == '') && data.email != null && data.email.trim() != '')? 'EMAIL' : (data.contact != null && data.contact.trim() != '' && (data.email == null || data.email.trim() == ''))? 'SMS' : 'BOTH';
				return result;
			}

			function initialize() {
				addEventListener();
				getAlarmList();
				getUserList();

				$timeout(function(){
					loadCompleted = true;
				}, 500);
			}



			initialize();
	}]);
});