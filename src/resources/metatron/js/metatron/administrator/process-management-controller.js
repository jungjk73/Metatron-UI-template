define(["app"], function (app) {
	app.controller("ProcessManagementCtrl", ["$rootScope", "$scope", "$timeout", "DataService", "ngDialog", "CommonUtil",
		function ($rootScope, $scope, $timeout, DataService, ngDialog, CommonUtil) {
			"use strict";

			// property
			var unbind = [];
			var selectedApplication;
			var infoPopId;			
			$scope.useFlagType = [
				{"label": "Y", "value": "Y"},
				{"label": "N", "value": "N"}
			];

			var popupTitle = "Process"
			var cmd = '';
			$scope.applicationSelectIdx = "0";


			//method
			$scope.onAddApplicationHandler = function() {
				var data = {};
				data.processParentSeq = 0;
				popupTitle = "Application";
				cmd = "ADD";
				openProcessInfoPopup(data, "A");
			}

			$scope.onAddProcessHandler = function() {
				if(selectedApplication == null) {
					alert("Please select application first.");
					return;
				}
				popupTitle = "Process";
				var data = {};
				data.processParentSeq = selectedApplication.data.processSeq;
				openProcessInfoPopup(data, "A");
			}

			$scope.onDeleteApplicationHandler = function(event) {
				if (event == null || event.rowData == null)
					return;

				var target = event.rowData.event.target;
				if (target == null || (target.nodeName != "BUTTON" && target.nodeName != "I"))
					return;

				var data = event.rowData.data;
				DataService.httpPost("/process/management/validateDeleteApplication", data, function() {
					var d = data.data;
					if(d == null || d.result == null) {
						alert("Failed to save the corresponding process. Please try again.");
						return;
					}

					if(d.result != true) {
						alert(d.resultCause);
						return;
					}					
				}, false);
			}

			$scope.onDeleteProcessHandler = function(event, type) {
				if (event == null || event.rowData == null)
					return;

				var target = event.rowData.event.target;
				if (target == null || (target.nodeName != "BUTTON" && target.nodeName != "I"))
					return;

				var path = "/validateDeleteProcess";
				var selectedData = event.rowData.data;
				if(selectedData.processParentSeq == 0) {
					path = "/validateDeleteApplication";
				}

				DataService.httpPost("/process/management" + path, selectedData, function(data) {
					var d = data.data;
					if(d == null || d.result == null) {
						alert("Failed to delete the corresponding process. Please try again.");
						return;
					}

					if(d.result != true) {
						alert(d.resultCause);
						return;
					}				
					
					popupTitle = type;
					if(type == 'Application') {
						$scope.applicationSelectIdx = "0";
					}
					deleteProcess(selectedData);
				}, false);
			}

			$scope.onApplicationGridClickHandler = function(value) {
				if(value == null || value.length < 1)
					return;

				selectedApplication = value[0];
				$scope.applicationSelectIdx = selectedApplication.childIndex.toString();
				getProcessData(selectedApplication.data);
				ap($scope);
				
			}

			$scope.onApplicationGridDoubleClickHandler = function(event) {
				if (event == null || event.data == null)
					return;				
				openProcessInfoPopup(event.data, "V");
			}

			$scope.onProcessGridDoubleClickHandler = function(event) {
				if (event == null || event.data == null)
					return;

				openProcessInfoPopup(event.data, "V");
			}

			$scope.changePopupTypeHandler = function(type) {
				if(type == null || type == "")
					return;

				$scope.popup.action = type;
			}

			$scope.onSaveProcessHandler = function() {
				var pData = angular.copy($scope.popup);
				if(pData == null)
					return;

				// validation check
				var name = pData.processName;
				if(CommonUtil.checkEmpty(name)) {
					alert("Please enter the " + popupTitle.toLowerCase()+ " name.");
					return;
				}
				if(name.match(CommonUtil.REGEXP_ENG) == null) {
					alert(popupTitle + " name can only be entered in English");
					return;
				}
				var port = pData.port;
				if(port != null && port.match(CommonUtil.REGEXP_PORT) == null) {
					alert("It does not match the port format.");
					return;
				}

				DataService.httpPost("/process/management/validateProcess", pData, onValidateCheckProcessResultHandler);
			}

			$scope.onChangePopupUseFlagHandler = function(event) {
				if($scope.popup == null)
					$scope.popup = {};

				$scope.popup.useFlag = event.value;
			}


			// event-handler
			$scope.destroy = function() {
				unbind.forEach(function (fn) {
					ngDialog.closeAll();
					fn();
				});
			}

			function onGetDataResultHandler(data) {
				if(data == null || data.data == null)
					return;

				var d = data.data;
				$scope.applicationList = d.application;
				$scope.processList = d.process;

				if($scope.applicationList != null && $scope.applicationList.length > 0) {
					if(cmd === 'ADD') {
						$scope.applicationSelectIdx = $scope.applicationList.length-1;
						cmd = "";
					}
					selectedApplication = $scope.applicationList[$scope.applicationSelectIdx];
					ap($scope);					
				}
			}

			function onGetProcessDataResultHandler(data) {
				if(data == null || data.data == null)
					return;

				$scope.processList = [];
				$scope.processList = data.data;
	
			}

			function onValidateCheckProcessResultHandler(data) {
				console.log("---------------validate result; ", data);

				var d = data.data;
				if(d == null || d.result == null) {
					alert("Failed to save the corresponding process. Please try again.");
					return;
				}

				if(d.result != true) {
					alert(d.resultCause);
					return;
				}

				var pData = angular.copy($scope.popup);
				if(pData == null)
					return;

				DataService.httpPost("/process/management/mergeProcess", pData, onMergeProcessResultHandler);
			}

			function onMergeProcessResultHandler(data) {
				ngDialog.close(infoPopId);
				getData();
			}


			// function
			function initialize() {
				addEventListener();
				getData();
			}

			function addEventListener() {
				unbind = [
					$scope.$on('$destroy', $scope.destroy)
				];
			}

			function getData() {
				DataService.httpGet("/process/management/getProcessConfiguration", null, onGetDataResultHandler, false);
			}

			function getProcessData(value) {
				DataService.httpPost("/process/management/getProcessData", value, onGetProcessDataResultHandler, false);
			}

			function openProcessInfoPopup(data, type) {
				if(data == null)
					return;

				$scope.popup = {};
				$scope.popup = angular.copy(data);
				$scope.popup.action = type;
				$scope.popup.title = popupTitle;

				var popup = ngDialog.open({
					template: "/common/popup/process_info_popup.html",
					className: "ngdialog-theme-default custom-width",
					showClose: false,
					disableAnimation: true,
					cache: false,
					closeByDocument: false,
					closeByEscape: false,
					scope: $scope,
				});
				infoPopId = popup.id;

				var closer = $rootScope.$on('ngDialog.refresh', function (e, id) {
					if (id != popup.id) return;
					closer();
				});
			}

			function deleteProcess(data) {
				if(data == null)
					return;

				var confirmResult = confirm("Do you delete the " + popupTitle.toLowerCase() + '?');
				if(!confirmResult)
					return;

				DataService.httpPost("/process/management/deleteProcess", data, function(data) {
					getData();
				});
			}

			initialize();
	}]);
});