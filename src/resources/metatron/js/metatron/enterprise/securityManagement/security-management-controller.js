define(["app"], function(app) {
	app.controller("SecurityManagementCtrl", ["$rootScope", "$scope", "$http", "ConfigManager", "ngDialog", "$sce", "$timeout", "DataService",
		function($rootScope, $scope, $http, ConfigManager, ngDialog, $sce, $timeout, DataService) {
			"use strict";

			// property
			var securityManagementCtrl = this;
			var unbind = [];
			var restUrl = ConfigManager.getConst("ENTERPRISE_URL");

			securityManagementCtrl.principalConfigInput = {};
			securityManagementCtrl.realmList = [];


			securityManagementCtrl.selectRealmData = [];


			/**
			 * Security System Status
			 */
			function getSecuritySystemStatus(){
				$http.get(restUrl+'/cluster/daemon', {}).then(function(successResponse){
					console.debug(':: /cluster/daemon ::',successResponse);

					var kdc = null;
					var ldap = null;
					var ranger = null;

					$.each(successResponse.data.body.secure.daemons, function(){
						var state = 0;
						if (this.state == 'RUNNING') state = 'normal';
						else state = 'abnormal';

						if (this.name.indexOf('kdc') > -1) kdc = state;
						else if (this.name.indexOf('ldap') > -1) ldap = state;
						else if (this.name.indexOf('rangeradmin') > -1) ranger = state;
					});


					var systemStatus = [
						{text : 'KDC', normal : (kdc != null && kdc == 'normal' ? 1 : 0 ), abnormal : (kdc == null || kdc != 'normal' ? 1 : 0 ) },
						{text : 'LDAP', normal : (ldap != null && ldap == 'normal' ? 1 : 0 ), abnormal : (ldap == null || ldap != 'normal' ? 1 : 0 ) },
						{text : 'Ranger', normal : (ranger != null && ranger == 'normal' ? 1 : 0 ), abnormal : (ranger == null || kdc != 'normal' ? 1 : 0 ) }
					];
					securityManagementCtrl.statusChartData = createStatusChartObj(systemStatus);

				}, function(failResponse){});

			}


			/**
			 * Security System Status
			 * 차트 객체 생성
			 */
			function createStatusChartObj(systemStatus){
				var chartObj = {
					layout : "1x3",
					graphset : []
				};

				$.each(systemStatus, function(){

					var graph = {
						type:"ring",
						plot:{
							valueBox:{
								text: this.text,
								placement:"center",
								fontColor:"black",
								fontSize:25,
								fontWeight:"normal"
							},
							slice:"90%",
							size : "80%",
							borderWidth:0
						},
						plotarea:{
							marginTop:"12%"
						},
						legend : {
							shared : true,
							backgroundColor : "transparent",
							borderColor : "transparent",
							item : {
								fontColor : '#1B1B1B',
								fontSize : '15px'
							},
							layout : 'float',
							y : '1%'

						},
						series:[
							{
								values:[ this.normal ],
								backgroundColor:"#00c853",
								text : 'Normal',
								tooltip : {visible : false}
							},
							{
								values:[ this.abnormal ],
								backgroundColor:"#ff3d00",
								text : 'Abnormal',
								tooltip : {visible : false}
							}
						]
					};
					chartObj.graphset.push(graph);
				});


				return chartObj;
			}


			/**
			 * Realm 리스트
			 */
			function getRealmList(){
				$http.get(restUrl+'/security/principals', {}).then(function(successResponse){
					securityManagementCtrl.realmList = [];
					console.debug(':: Realm List ::', successResponse.data.body.realms);
					if (successResponse.data.body.realms && successResponse.data.body.realms.length > 0) {
						securityManagementCtrl.realmList = successResponse.data.body.realms;


						$.each(securityManagementCtrl.realmList, function(){
							securityManagementCtrl.selectRealmData.push(  {label : this, value : this} );
						});

					}
				}, function(failResponse){});
			}



			/**
			 * 상태 화면 변경
			 */
			securityManagementCtrl.changeView = function(type, event){
				if (event) {
					$(event.currentTarget).siblings().removeClass('active');
					$(event.currentTarget).addClass('active');
				} else {
					$('.kdcPanel > .mu-btn:first-child').addClass('active');
					securityManagementCtrl.viewKDC = true;
				}

				if (type == 'kdc') {
					securityManagementCtrl.viewKDC = true;
					securityManagementCtrl.viewLDAP = false;
					securityManagementCtrl.viewKerberos = false;
					securityManagementCtrl.tabTitle = 'KDC';
					if (securityManagementCtrl.realmList == null || securityManagementCtrl.realmList.length == 0) {
						$timeout(getKDCInfo, 800);
					} else {
						getKDCInfo();
					}

				} else if (type == 'ldap') {
					securityManagementCtrl.viewLDAP = true;
					securityManagementCtrl.viewKDC = false;
					securityManagementCtrl.viewKerberos = false;
					securityManagementCtrl.tabTitle = 'LDAP';
					getLDAPInfo();
				} else if (type == 'kerberos') {
					securityManagementCtrl.viewKerberos = true;
					securityManagementCtrl.viewKDC = false;
					securityManagementCtrl.viewLDAP = false;
					securityManagementCtrl.tabTitle = 'Kerberos';
					getKerberosInfo();
				}

			};


			/**
			 * KDC 정보 조회
			 */
			function getKDCInfo(){
				$http.get(restUrl+'/security/kdc', {}).then(function(successResponse){
					console.debug(':: /security/kdc ::', successResponse);

					var kdc = successResponse.data.body;
					var kdcKeys = Object.keys(kdc);

					securityManagementCtrl.kdcInfoList = [];
					var realm = '';
					if (securityManagementCtrl.realmList && securityManagementCtrl.realmList.length > 0) {
						realm = securityManagementCtrl.realmList[0];
					}
					$.each(kdcKeys, function(){
						var key = this;
						var obj = kdc[key];
						obj.realm = realm;
						securityManagementCtrl.kdcInfoList.push(kdc[key]);
					});

				}, function(failResponse){});
			}


			/**
			 * KDC 정보 테이블 클릭
			 */
			securityManagementCtrl.selectKDC = function(row){
				securityManagementCtrl.selectedKDC = row[0].data.host;
			};



			/**
			 * KDC 상세조회 클릭
			 */
			securityManagementCtrl.showDetailKDCInfo = function(){
				if (securityManagementCtrl.selectedKDC == null) return;
				
				$http.get(restUrl+'/security/kdc?host='+securityManagementCtrl.selectedKDC).then(function(successResponse){
					console.debug(':: KDC Detail ::', successResponse);

					securityManagementCtrl.retrieveInfo = successResponse.data.body.kdc_config;
					securityManagementCtrl.retrieveInfo += '\n\n'+successResponse.data.body.krb_config;

					securityManagementCtrl.showRetrieveDetailPop('kdc');
				}, function(failResponse){});
			};



			/**
			 * LDAP 정보 조회
			 */
			function getLDAPInfo(){
				$http.get(restUrl+'/security/ldap', {}).then(function(successResponse){
					console.debug(':: /security/ldap ::', successResponse);

					var ldap = successResponse.data.body;
					var ladpKeys = Object.keys(ldap);

					securityManagementCtrl.ldapInfo = '';

					$.each(ladpKeys, function(){
						var host = this;
						securityManagementCtrl.ldapInfo += host + '(port : '+ldap[host].port+')<br><br>';

						$.each(ldap[host]['groups'], function(idx){
							if (idx == ldap[host]['groups'].length - 1) {
								securityManagementCtrl.ldapInfo += this;
							} else
								securityManagementCtrl.ldapInfo += this+', ';
						});
					});

					securityManagementCtrl.ldapInfo = $sce.trustAsHtml(securityManagementCtrl.ldapInfo);
				}, function(failResponse){});
			}




			/**
			 * Kerberos 정보 조회
			 */
			function getKerberosInfo(){
				$http.get(restUrl+'/security/kdc/logs', {}).then(function(successResponse){
					console.debug(':: /security/kdc/logs ::', successResponse);

					var kerberos = successResponse.data.body;
					var kerberosKeys = Object.keys(kerberos);

					securityManagementCtrl.kerberosInfo = '';

					$.each(kerberosKeys, function(){
						var host = this;
						var kerberosInfo = kerberos[host];
						var kerberosInfoKeys = Object.keys(kerberosInfo);

						$.each(kerberosInfoKeys, function(){
							var key = this;
							securityManagementCtrl.kerberosInfo += key + ' = ' + kerberosInfo[key] + '<br><br>';
						});
					});

					securityManagementCtrl.kerberosInfo = $sce.trustAsHtml(securityManagementCtrl.kerberosInfo);
				}, function(failResponse){});
			}


			/**
			 * User List 조회
			 */
			function getUserList(){
				securityManagementCtrl.userInfoList = [];

				DataService.httpPost("/admin/user/userManagement/getUserList", {}, function(result){
					console.debug(':: getUserList ::', result);
					securityManagementCtrl.userInfoList = result.data.userlist;
				});
			}



			/**
			 * User List
			 * Principal 추가
			 */
			function onAddPrincipalEventHandler(event, data){
				console.log(':::::::  Principal 추가  ::::::::::', data);
				securityManagementCtrl.principalConfigInput = angular.copy(data);
				securityManagementCtrl.principalConfigInput.mode = 'ADD';
				securityManagementCtrl.showConfigPrincipalPop();
			}



			/**
			 * User List
			 * Principal 수정
			 */
			function onEditPrincipalEventHandler(event, data){
				console.log(':::::::  Principal 수정  ::::::::::', data);
				securityManagementCtrl.principalConfigInput = angular.copy(data);
				securityManagementCtrl.principalConfigInput.mode = 'EDIT';
				securityManagementCtrl.showConfigPrincipalPop();
			}



			/**
			 * User List
			 * 사용자 Principal 팝업 열기
			 */
			securityManagementCtrl.showConfigPrincipalPop = function(){

				var popup = ngDialog.open({
					template: "/common/principal_config_template.html",
					className: "ngdialog-theme-default custom-width",
					showClose: false,
					disableAnimation: true,
					cache: false,
					closeByDocument: false,
					closeByEscape: false,
					scope: $scope
				});

				var closer = $rootScope.$on('ngDialog.refresh', function(e, id) {
					if (id != popup.id) return;
					closer();
				});
			};





			/**
			 * User List
			 * Principal 팝업
			 * Rename
			 * 이름 수정
			 */
			securityManagementCtrl.renamePrincipal = function(){
				if (securityManagementCtrl.principalConfigInput.principal == '') {
					securityManagementCtrl.configMsg = 'Check Your Principal Input.';
					return;
				}

				securityManagementCtrl.configMsg = '';

				var param = {};
				param.principal = securityManagementCtrl.principalConfigInput.principal;
				param.userId = securityManagementCtrl.principalConfigInput.userId;
				param.principalPassword = securityManagementCtrl.principalConfigInput.password;
				DataService.httpPost("/enterpriseModule/securityManagement/renamePrincipal", param, function(result){
					console.log(result);
					if (result.data.checkPassword == '0') {
						alert('Check Your Password');
					} else {
						alert('Rename Success');
						getUserList();
						securityManagementCtrl.closeDialog();
					}

				});
			};





			/**
			 * User List
			 * Principal 팝업
			 * Delete
			 * 제거
			 */
			securityManagementCtrl.deletePrincipal = function(){
				var param = {};
				param.principal = securityManagementCtrl.principalConfigInput.principal;
				param.userId = securityManagementCtrl.principalConfigInput.userId;
				param.principalPassword = securityManagementCtrl.principalConfigInput.password;
				DataService.httpPost("/enterpriseModule/securityManagement/deletePrincipal", param, function(result){
					console.log(result);
					if (result.data.checkPassword == '0') {
						alert('Check Your Password');
					} else {
						alert('Delete Success');
						getUserList();
						securityManagementCtrl.closeDialog();
					}
				});
			};




			/**
			 * User List
			 * 사용자 Principal 팝업
			  내용 저장
			 */
			securityManagementCtrl.addPrincipal = function(){
				console.debug(':: User Principal 저장 ::');
				console.log(securityManagementCtrl.principalConfigInput);

				if (validatePrincipal() == false) return;

				// rest 로 전송

				// db  저장 처리
				var param = {};
				param.principal = securityManagementCtrl.principalConfigInput.principal;
				param.userId = securityManagementCtrl.principalConfigInput.userId;
				param.principalPassword = securityManagementCtrl.principalConfigInput.password;
				DataService.httpPost("/enterpriseModule/securityManagement/addPrincipal", param, function(result){
					console.log(result);
					getUserList();
				});

				securityManagementCtrl.closeDialog();
			};


			/**
			 * User List
			 * Principal 팝업
			 * 내용 확인
			 */
			function validatePrincipal(){
				var returnValidate = true;

				if (securityManagementCtrl.principalConfigInput.principal == '') {
					securityManagementCtrl.configMsg = 'Check Your Principal Input.';
					returnValidate = false;
				}

				if (securityManagementCtrl.principalConfigInput.password == '') {
					securityManagementCtrl.configMsg = 'Check Your Password Input.';
					returnValidate = false;
				}

				if (securityManagementCtrl.principalConfigInput.mode == 'ADD') {
					if (securityManagementCtrl.principalConfigInput.passwordConfirm == '') {
						securityManagementCtrl.configMsg = 'Check Your Password Confirm Input.';
						returnValidate = false;
					}

					if (securityManagementCtrl.principalConfigInput.password != securityManagementCtrl.principalConfigInput.passwordConfirm) {
						securityManagementCtrl.configMsg = 'Check Your Password.';
						returnValidate = false;
					}
				}


				return returnValidate;
			}


			/**
			 * User List
			 * Principal 팝업
			 * Realm 셀렉트박스
			 */
			securityManagementCtrl.selectRealmChange = function(event){
				console.log('Select Box :::::::: ',event);
				securityManagementCtrl.principalConfigInput.realm = event.value;
			};




			/**
			 * User List
			 * 사용자 Principal 팝업 닫기
			 */
			securityManagementCtrl.closeDialog = function(){
				ngDialog.closeAll();
				initPrincipalConfigInput();

				securityManagementCtrl.retrieveInfo = '';
				securityManagementCtrl.selectedKDC = null;
				securityManagementCtrl.configMsg = '';
			};


			/**
			 * User List
			 * 사용자 Principal 팝업 초기화
			 */
			function initPrincipalConfigInput(){
				securityManagementCtrl.principalConfigInput = {};
			}





			/**
			 * 상세정보 조회 팝업
			 * KDC , Principal
			 */
			securityManagementCtrl.showRetrieveDetailPop = function(type){

				if (type == 'kdc') {
					securityManagementCtrl.retrievePopTitle = 'KDC Info.';
					securityManagementCtrl.viewRetrivePopThead = false;
				} else {
					securityManagementCtrl.retrievePopTitle = 'Principal Info.';
					securityManagementCtrl.viewRetrivePopThead = true;
				}

				var popup = ngDialog.open({
					template: "/common/retrieve_template.html",
					className: "ngdialog-theme-default custom-width",
					showClose: false,
					disableAnimation: true,
					cache: false,
					closeByDocument: false,
					closeByEscape: false,
					scope: $scope
				});

				var closer = $rootScope.$on('ngDialog.refresh', function(e, id) {
					if (id != popup.id) return;
					closer();
				});
			};


			/**
			 * Principal List
			 */
			function getPrincipalList(){

				securityManagementCtrl.principalInfoList = [];

				// $http.get(restUrl+'/security/principals', {realm : 'SKT_ENTMOD.COM'}).then(function(successResponse){
                	// securityManagementCtrl.principalInfoList = data;
				// }, function(failResponse){});
			}




			/**
			 * Principal 상세조회 클릭
			 */
			securityManagementCtrl.showDetailPrincipalInfo = function(){

				$http.get(restUrl+'/security/principal?principal=hadoop_princs@SKT.COM').then(function(successResponse){
					console.debug(':: Principal Detail ::', successResponse);

					var data = successResponse.data.body;
					var keys = Object.keys(data);

					$.each(keys, function(){
						securityManagementCtrl.retrieveInfo += this + ' : ' + data[this] + '\n';
					});


					securityManagementCtrl.showRetrieveDetailPop('principal');
				}, function(failResponse){});
			};



			function destroy() {
				unbind.forEach(function(fn) {
					fn();
				});
			}



			function addEventListener() {
				unbind = [
					$scope.$on('$destroy', destroy),
					$scope.$on(ConfigManager.getEvent("ADD_PRINCIPAL_EVENT"), onAddPrincipalEventHandler),
					$scope.$on(ConfigManager.getEvent("EDIT_PRINCIPAL_EVENT"), onEditPrincipalEventHandler)

				];
			}





			function initialize() {
				addEventListener();

				getRealmList();

				getSecuritySystemStatus();

				getUserList();

				getPrincipalList();

				securityManagementCtrl.changeView('kdc', null);

			}


			initialize();
		}]);
});