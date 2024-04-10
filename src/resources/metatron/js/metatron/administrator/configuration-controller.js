define(["app", "moment"], function (app, moment) {
	app.controller("ConfigurationCtrl", ["$rootScope", "$scope", "$http", "$timeout", "ConfigManager", "DataService", "ngDialog",function ($rootScope, $scope, $http, $timeout, ConfigManager, DataService, ngDialog) {
		"use strict";
		var configurationCtrl = this;
		var fileName = "";
		var unbind = [];
		var systemSeq = "";
		var session_id = "";
		var param = {};
		configurationCtrl.prestoFileType = "production";

		configurationCtrl.markOptions = {
			"element": "span",
			"className": "markBlue",
			"separateWordSearch": true
		};

		configurationCtrl.searchKeyEnter = function () {
			var f_key = configurationCtrl.findKey ==undefined ? "" : configurationCtrl.findKey ;
			unMarkOption();
			$(".mu-grid").mark(f_key ,configurationCtrl.markOptions);
		};

		configurationCtrl.selectPrestoType = function () {
			param.prestoType = configurationCtrl.prestoFileType;
			ngDialog.closeAll();
			DataService.httpPost("/admin/configuration/getProcessFileList", param, getProcessFileListResult);
		};

		configurationCtrl.addRow = function () {
			// configurationCtrl.addGridData = {name: "", value: "-"};
			configurationCtrl.gridData.push({name: "", value: "", description : ""});
		};

		configurationCtrl.delRow = function (idx) {
			configurationCtrl.gridData.splice(idx,1);
		};

		/*
		 * roll back function
		 * */
		configurationCtrl.rollBack = function () {
			if (!param.file_type) {
				alert("select file please");
				return;
			}

			param.rollBack = "Y";
			configurationCtrl.serverType = param.file_value;
			var popup = ngDialog.open({
				template: "/administrator/conf-popup/rollback_popup_template.html",
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

			setTimeout(function () {
				var eMoment = moment(configurationCtrl.eDateTime);
				configurationCtrl.eDateTime = moment().format('YYYY-MM-DD HH:mm');
				configurationCtrl.sDateTime = eMoment.subtract(30, 'day').format('YYYY-MM-DD HH:mm');
				var sDate = angular.element(document.getElementById("sdate"));
				$(sDate).on("mousedown", function () {
					var datepicker = angular.element(document.getElementById("ui-datepicker-div"));
					if (datepicker) {
						var pop = angular.element(document.getElementsByClassName("ngdialog"));
						pop.append(datepicker);
					}
				});
				ap($scope);
				getRollBackHostList();
			}, 500);
		};

		configurationCtrl.changeHostNameSelectEventHandler = function (event) {
			configurationCtrl.rollBackSystem = event;
			if (configurationCtrl.rollBackGridList)
				configurationCtrl.rollBackGridListFilter = configurationCtrl.rollBackGridList.filter(filterBySystem);
		};

		configurationCtrl.rollBackGridListClick = function (event) {
			if (fileName.indexOf('xml') > -1) {
				$('.resource').css('display', 'block');
				$('.zoo').css('display', 'none');
			} else {
				$('.resource').css('display', 'none');
				$('.zoo').css('display', 'block');
			}

			param = angular.merge(param, event.data);
			DataService.httpPost("/admin/configuration/getDataToList", param, getDataToListResult);
			configurationCtrl.rollBackPopUpClose();
			param.rollBack = "N";
		};


		function filterBySystem(obj) {
			if (configurationCtrl.rollBackSystem.label.toUpperCase() == 'ALL')
				return true;

			if (obj.system_name.toUpperCase() == configurationCtrl.rollBackSystem.label.toUpperCase()) {
				return true;
			} else {
				return false;
			}
		}

		function getRollBackHostList() {
			DataService.httpPost("/admin/configuration/getRollBackHostList", param, getRollBackHostListResult);
		}

		function getRollBackHostListResult(data) {
			configurationCtrl.rollBackHostList = data.data;
			configurationCtrl.getRollBackList();
		}

		configurationCtrl.getRollBackList = function () {
			param.sDateTime = configurationCtrl.sDateTime;
			param.eDateTime = configurationCtrl.eDateTime;

			DataService.httpPost("/admin/configuration/rollBackHistoryData", param, rollBackHistoryDataResult);
		};

		configurationCtrl.changeDate = function (event) {
			configurationCtrl.sDateTime = event.sDateTime;
			configurationCtrl.eDateTime = event.eDateTime;
		};

		configurationCtrl.rollBackPopUpClose = function () {
			param.rollBack = "N";
			ngDialog.closeAll();
		};

		function rollBackHistoryDataResult(data) {
			configurationCtrl.rollBackGridList = data.data;
			configurationCtrl.rollBackGridListFilter = configurationCtrl.rollBackGridList.filter(filterBySystem);
		}


		configurationCtrl.getXmlData = function (event, value) {
			configurationCtrl.findKey = '';
			removeBtenCSS();

			var target = $(event.currentTarget);
			target.addClass("mu-btn-selected");
			param = {};
			param.file_value = value.code_value;
			param.file_type = value.description;
			param.parent_system_seq = systemSeq;
			param.system_seq = systemSeq;
			fileName = value.description;
			param.process_name = value.code_name;
			if (value.code_name.toUpperCase() == "PRESTO") {
				var popup = ngDialog.open({
					template: "/administrator/conf-popup/radio_popup_template.html",
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
			} else {
				DataService.httpPost("/admin/configuration/getProcessFileList", param, getProcessFileListResult);
			}
		};

		configurationCtrl.selectSystemPop = function (value) {
			console.log(value);
			if(value.system_name.toLowerCase() == "template") {
				param.template = "Y";
				if (fileName.indexOf('xml') > -1) {
					$('.resource').css('display', 'block');
					$('.zoo').css('display', 'none');
				} else {
					$('.resource').css('display', 'none');
					$('.zoo').css('display', 'block');
				}
				DataService.httpPost("/admin/configuration/getDataToList", param, getDataToListResult);
			}else{
				param.template = "N";
				param.system_seq = value.system_seq;
				if (param.type == "SET_XML" || param.type == "SET_CFG") {
					param.list = configurationCtrl.gridData;
					for (let i = 0 ; i < param.list.length ; i++) {
						delete param.list[i].delete;
					}
					param.file_type = fileName;
					param.cfg = configurationCtrl.cfgData;
					param.session_id = session_id;
					DataService.httpPost("/admin/configuration/setListToXml", param, setListToXmlResult);
				} else {
					if (fileName.indexOf('xml') > -1) {
						$('.resource').css('display', 'block');
						$('.zoo').css('display', 'none');
					} else {
						$('.resource').css('display', 'none');
						$('.zoo').css('display', 'block');
					}

					DataService.httpPost("/admin/configuration/getDataToList", param, getDataToListResult);
				}
			}
		};


		function getProcessFileListResult(data) {
			param.type = "GET_XML";
			configurationCtrl.processFileList = data.data;
			if (data.data.length > 1) {
				var popup = ngDialog.open({
					template: "/administrator/conf-popup/select_popup_template.html",
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
			} else {
				if (fileName.indexOf('xml') > -1) {
					$('.resource').css('display', 'block');
					$('.zoo').css('display', 'none');
				} else {
					$('.resource').css('display', 'none');
					$('.zoo').css('display', 'block');
				}
				DataService.httpPost("/admin/configuration/getDataToList", param, getDataToListResult);
			}
		}

		configurationCtrl.setListToXml = function () {
			unMarkOption();

			if(param.template == 'Y') {
				alert("do not save Template");
				return;
			}

			jQuery.fn.shift = [].shift;
			var $rows =  $('#conf_table').find('tr:not(:hidden)');
			var headers = [];
			var data = [];
			var boo = true;
			// Get the headers (add special header logic here)
			$($rows.shift()).find('th:not(:empty)').each(function () {
				headers.push($(this).text().toLowerCase());
			});


			// Turn all existing rows into a loopable array
			$rows.each(function () {
				var $td = $(this).find('td');
				var h = {};
				// Use the headers from earlier to name our hash keys
				headers.forEach(function (header, i) {
					var val = $($td.eq(i)[0]).text();
					h[header] = $.trim(val);
				});

				if (saveValidationCheck(h) === false) {
					$td.find("div").css("background-color", "#00ff00");
					boo = false;
				}

				data.push(h);
			});


			if(boo == true) {
				configurationCtrl.gridData = data;
				if (fileName.indexOf('xml') > -1) {
					if (configurationCtrl.gridData && configurationCtrl.gridData.length > 0) {
						param.type = "SET_XML";
						param.parent_system_seq = systemSeq;
						DataService.httpPost("/admin/configuration/getProcessOfSystem", param, getProcessOfSystemResult);
					} else {
						alert("get Xml file List");
					}
				} else {
					param.type = "SET_CFG";
					param.parent_system_seq = systemSeq;
					DataService.httpPost("/admin/configuration/getProcessOfSystem", param, getProcessOfSystemResult);
				}
			}
		};


		//값 validation
		function saveValidationCheck(data) {
			var v = data.value;
			var n = data.name;
			var t = data.type.toLowerCase();
			var boo = true;
			if(t == 'integer' && $.isNumeric(v) == true) {
				v = parseInt(v);
			}

			if(t.toLowerCase() == 'integer') {
				if(Number.isInteger(v) == true) {
					boo =  true;
				}else{
					boo = false;
				}
			}else if(t.toLowerCase() == 'string') {
				if(Number.isInteger(v) == false) {
					boo =  true;
				}else{
					boo = false;
				}
			}else if(t.toLowerCase() == 'float') {
				if(parseFloat("1.0f") == "NaN") {
					boo = false;
				}else{
					boo = true;
				}
			}

			return boo;
		}

		Number.isInteger = Number.isInteger || function(value) {
				return typeof value === "number" &&
					isFinite(value) &&
					Math.floor(value) === value;
		};


		//버튼선택색상 초기화
		function removeBtenCSS() {
			var leftBox = angular.element(document.getElementsByClassName("left-box"));
			leftBox.find("div > div> dl > dd > button").removeClass("mu-btn-selected");
			configurationCtrl.gridData = [];
		}

		function unMarkOption() {
			$(".mu-grid").unmark(configurationCtrl.markOptions);

			var $rows =  $('#conf_table').find('tr:not(:hidden)');
			$rows.each(function () {
				var $td = $(this).find('td');
				$td.find("div").css("background-color", "#fff");
			});
		}

		function getProcessOfSystemResult(data) {
			configurationCtrl.processFileList = data.data;

			var popup = ngDialog.open({
				template: "/administrator/conf-popup/select_popup_template.html",
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

		function getDataToListResult(data) {
			ngDialog.closeAll();
			if (data.data.type == 'xml')
				configurationCtrl.gridData = data.data.list;
			else
				configurationCtrl.cfgData = data.data.list;

			if (data.data.hasOwnProperty("session_id"))
				session_id = data.data.session_id;

			if (data.data.hasOwnProperty("status")) {
				alert(data.data.status);
			}

			setTimeout(function (){
				var $rows =  $('#conf_table').find('tr:not(:hidden)');
				if(param.template == "Y") {
					//contenteditable = false;
					$rows.each(function () {
						var $td = $(this).find('td');
						$td.attr('contentEditable','false');
					});
				}else{
					//contenteditable = true;
					$rows.each(function () {
						var $td = $(this).find('td');
						$td.attr('contentEditable','true');
					});
				}
			},500);
		}

		function setListToXmlResult(data) {
			ngDialog.closeAll();
			configurationCtrl.gridData = [];
			configurationCtrl.cfgData = "";

			$timeout((function () {
				console.log('\n\n#############\t Zookeeper');
				DataService.httpPost("/admin/configuration/getDataToList", param, getDataToListResult);
			}), 500);
		}

		function initialize() {
			systemSeq = ConfigManager.getSystemSeq();
			getCategoryData();
			addEventListener();
		}

		function getCategoryData() {

			removeBtenCSS();
			param = {};
			param.system_seq = systemSeq;
			DataService.httpPost("/common/getConfCategory", param, getConfCategoryResult);
		}
		function getConfCategoryResult(data) {
			configurationCtrl.categoryData = data.data;
		}

		function gridDeleteBtnEventHandler(event, data) {
			configurationCtrl.deleteData = data;
			ap($scope);
		}

		function onChangeSystemGroupIdEventHandler(event, data) {
			if (data == null)
				return;

			systemSeq = ConfigManager.getSystemSeq();

			getCategoryData();
		}

		function addEventListener() {
			unbind = [$scope.$on('$destroy', destroy),
				$scope.$on(ConfigManager.getEvent("CHANGE_SYSTEM_SEQ_EVENT"), onChangeSystemGroupIdEventHandler),
				$rootScope.$on(ConfigManager.getEvent("GRID_DELETE_BTN_EVENT"), gridDeleteBtnEventHandler)];
		}

		function destroy() {
			unbind.forEach(function (fn) {
				fn();
			});
			configurationCtrl = null;
		}

		initialize();
	}]);
});