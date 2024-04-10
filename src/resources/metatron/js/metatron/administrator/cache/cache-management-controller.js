define(["app", "moment"], function (app, moment) {
	app.controller("CacheManagementCtrl", ["$rootScope", "$scope", "$document", "$cookies", "ConfigManager", "DataService",
											"CommonUtil", "GridRenderer", "FileBrowserUtil", "ngDialog",
		function ($rootScope, $scope, $document, $cookies, ConfigManager, DataService, CommonUtil, GridRenderer, FileBrowserUtil, ngDialog) {
			"use strict";

			// property
			var cacheManagementCtrl = this;
			var systemSeq = "";
			var unbind = [];
			var directiveMap = {};
			var ENTERPRISE_URL = ConfigManager.getConst("ENTERPRISE_URL");
			var CACHE_POOL_LIMIT = ConfigManager.getConst("CACHE_POOL_LIMIT");

			cacheManagementCtrl.data = {};
			cacheManagementCtrl.grid = {};
			cacheManagementCtrl.current = {};
			cacheManagementCtrl.current.directory = "/";
			cacheManagementCtrl.current.pool = "default";


			// method
			cacheManagementCtrl.onDirectoryBackHandler = function () {
				var val = cacheManagementCtrl.current.directory;
				var lastIdx = val.lastIndexOf("/");
				if (lastIdx == 0)
					cacheManagementCtrl.current.directory = "/";
				else
					cacheManagementCtrl.current.directory = val.substring(0, lastIdx);
				ap($scope);
			};

			cacheManagementCtrl.onDirectoryDBClickHandler = function (event) {
				if (event == null || event.data == null)
					return;

				var data = event.data;
				if(data == null || data.type == "FILE")
					return;

				var val = cacheManagementCtrl.current.directory;
				if (val.charAt(val.length - 1) == "/")
					cacheManagementCtrl.current.directory = val + event.data.pathSuffix;
				else
					cacheManagementCtrl.current.directory = val + "/" + event.data.pathSuffix;
				ap($scope);
			};

			cacheManagementCtrl.onAddButtonDirectoriesHandler = function (event) {
				if (event == null || event.rowData == null)
					return;

				var target = event.rowData.event.target;
				if (target == null || (target.nodeName != "BUTTON" && target.nodeName != "I"))
					return;

				var data = event.rowData.data;
				if (data == null)
					return;

				var path = cacheManagementCtrl.current.directory;
				if (path.charAt(path.length - 1) == "/")
					path = cacheManagementCtrl.current.directory + data.pathSuffix;
				else
					path = cacheManagementCtrl.current.directory + "/" + data.pathSuffix;
				data.path = path;

				var list = cacheManagementCtrl.grid.directives;
				list = (list == null) ? [] : list;
				list.push(data);
				cacheManagementCtrl.grid.directives = angular.copy(list);
			};

			cacheManagementCtrl.onDeleteButtonDirectiveHandler = function (event) {
				if (event == null || event.rowData == null)
					return;

				var target = event.rowData.event.target;
				if (target == null || (target.nodeName != "BUTTON" && target.nodeName != "I"))
					return;

				var list = cacheManagementCtrl.grid.directives;
				list = (list == null) ? [] : list;
				list.splice(event.rowData.rowIndex, 1);
				cacheManagementCtrl.grid.directives = angular.copy(list);
			};

			cacheManagementCtrl.onSaveDirectiveHandler = function () {
				// ValidationCheck
				var param = getParam();
				if (param == null || !param)
					return;

				DataService.httpPost("/administrator/cache/management/validateCacheDirective", param, onSaveValiadateCheckResult, false);
			};

			cacheManagementCtrl.onDeleteButtonCachePoolHandler = function (params) {
				if (params == null || params.data == null)
					return;

				var target = params.event.target;
				if (target == null || (target.nodeName != "BUTTON" && target.nodeName != "I"))
					return;

				var deleteDBDirective = function(param) {

					param.systemSeq = systemSeq;
					DataService.httpPost("/administrator/cache/management/deleteCacheDirective", param, function() {
						getDirectiveData();
						ap($scope);
					});
				}

				if(directiveMap[params.data.path] == null) {
					deleteDBDirective(params.data);
					return;
				}

				var id = directiveMap[params.data.path].id;
				try {
					// API 연동(delete)
					getData("/directive?sys_seq=" + systemSeq + "&id=" + id, "DELETE", null, null);
				} catch(e) { }

				// DB 삭제
				deleteDBDirective(params.data);
			}

			cacheManagementCtrl.onOpenFileInfo = function(event) {
				if(event == null)
					return;

				var target = event.rowData.event.target;
				var data = event.rowData;
				if (target == null || target.nodeName != "A" || data == null || data.data == null)
					return;

				var dir = FileBrowserUtil.getPathValidate(cacheManagementCtrl.current.directory);
				if(dir == null)
					return;

				FileBrowserUtil.getBlockInfo(dir + "/" + data.data.pathSuffix, $scope);
			}


			// event-handler
			function destory() {
				unbind.forEach(function (fn) {
					FileBrowserUtil.destroy();
					ngDialog.closeAll();
					fn();
					clear();
				});
			}

			function onChangeSystemSeqEventHandler(event, data) {
				if (data == null)
					return;

				systemSeq = data;

				// name node ip setting
				var p = FileBrowserUtil.getNameNodeIp(systemSeq);
				p.then(getDirectory);
				getDirectiveData();
			}

			function onSaveValiadateCheckResult(data) {
				if (data == null || data.data == null)
					return;

				if (data.data == null || data.data.length != 0) {
					alert("There is a registered Cache Directive.");
					return;
				}

				addCacheDirective();
			}

			function onSaveDirectiveResult(data) {
				cacheManagementCtrl.grid.directives = [];
				getDirectiveData();
			}

			function onGetClusterAccountResultHandler(data) {

				if (location.hostname == "localhost" || location.hostname == "~호스트IP") {
					cacheManagementCtrl.current.owner = "hadoop";
					getCachePoolData();
					return;
				}

				if (data == null || data.data == null)
					return;

				cacheManagementCtrl.current.owner = data.data;
				getCachePoolData();
			}

			function onGetCacheDirectiveResultHandler(data) {
				if (data == null || data.data == null)
					return;

				getMakeCacheDirectiveData(data.data);
			}


			// function
			function initialize() {
				systemSeq = ConfigManager.getSystemSeq();

				if (location.hostname == "localhost" || location.hostname == "~호스트IP")
					systemSeq = 15;

				var p = FileBrowserUtil.getNameNodeIp(systemSeq);
				p.then(addEventListener);
				getDirectiveData();
				openSettingPopup();
			}

			function addEventListener() {
				// broadcast event
				unbind = [
					$scope.$on(ConfigManager.getEvent("CHANGE_SYSTEM_SEQ_EVENT"), onChangeSystemSeqEventHandler),
					$scope.$on('$destroy', destory)
				];

				// watch
				$scope.$watch("cacheManagementCtrl.current.directory", getDirectory);
				$rootScope.$on('$locationChangeStart', function(e) {
					if(cacheManagementCtrl == null || cacheManagementCtrl.current == null)
						return;

					var val = cacheManagementCtrl.current.directory;
					if(val != null && val != "" && val != "/") {
						directoryBackEventHandler();
						e.preventDefault();
					}
				});
				$document.on("keydown", function(e) {
					if (e.which === 8
						&& e.target.nodeName !== "INPUT"
						&& e.target.nodeName !== "TEXTAREA") {
						directoryBackEventHandler();
						e.preventDefault();
					}
				});
			}

			function openSettingPopup() {
				var popFlag = $cookies.get("VIEW_HDFS_SETTING_POP");
				popFlag = (popFlag != null && popFlag == "false")? false:true;
				$cookies.put("VIEW_HDFS_SETTING_POP", popFlag);

				if(!popFlag)
					return;

				var popup = ngDialog.open({
					template: "/administrator/cache/popup/hdfs_setting_popup_template.html",
					className: "ngdialog-theme-default custom-width",
					showClose: false,
					disableAnimation: true,
					cache: false,
					closeByDocument: false,
					closeByEscape: false,
					scope: $scope,
					controller: ['$scope', '$cookies', function($scope, $cookies) {
						$scope.chkPopFlag = false;
						$scope.checkClickHandler = function() {
							if($scope.chkPopFlag) {
								$cookies.put("VIEW_HDFS_SETTING_POP", false);
								ngDialog.closeAll();
							}
						}
					}]
				});

				var closer = $rootScope.$on('ngDialog.refresh', function (e, id) {
					if (id != popup.id) return;
					closer();
				});
			}

			function directoryBackEventHandler() {
				var val = cacheManagementCtrl.current.directory;
				if(val == null || val == "")
					val = "/";

				cacheManagementCtrl.current.directory = (val.lastIndexOf("/") < 1)? "/":val.substring(0, val.lastIndexOf("/"));
				ap($scope);
			}

			function getCachePoolData() {
				// API 연동(get)
				getData("/pool?sys_seq=" + systemSeq, "GET", null, function(data) {
					var d = data.cachePools;
					var poolInfo = null;
					if (d != null && d.length > 0) {
						var len = d.length;
						for(var i=0; i<len; i++) {
							// 초기버전 요청으로 "default" pool이 없을 경우 만드는 것으로 처리.(추후 하드 코딩이라 제거가 필요)
							if(d[i].name == "default") {
								poolInfo = d[i];
								break;
							}
						}

						if(poolInfo == null) {
							addCachePool();
							return;
						}
					}
					cacheManagementCtrl.data.bytesNeeded = CommonUtil.numberFormatter(poolInfo.bytesNeeded);
					cacheManagementCtrl.data.limit = poolInfo.limit;
					cacheManagementCtrl.data.maxTtl = poolInfo.maxTtl;
				});
			}

			function getDirectiveData() {
				// cache list(DB)
				var param = {};
				param.systemSeq = systemSeq;
				DataService.httpPost("/administrator/cache/management/getClusterAccount", param, onGetClusterAccountResultHandler);
				DataService.httpPost("/administrator/cache/management/getCacheDirectives", param, onGetCacheDirectiveResultHandler);

				// directive(API)
				initDirectiveMap();
			}

			function initDirectiveMap() {
				//directiveMap
				var pool = cacheManagementCtrl.current.pool;
				getData("/directive?sys_seq=" + systemSeq + "&pool=" + pool, "GET", null, function(data) {
					var d = data.directives;
					directiveMap = _.indexBy(d, "path");
				});
			}

			function addCachePool() {
				var param = {};
				param.sys_seq = systemSeq;
				param.name = "default";
				param.owner = cacheManagementCtrl.current.owner;
				param.group = cacheManagementCtrl.current.owner;
				param.mode = "755";
				param.limit = CACHE_POOL_LIMIT * (1024*1024*1024) + "";
				param.maxttl = "never";

				// API 연동(add)
				getData("/pool", "POST", [param], getCachePoolData);
			}

			function getData(url, method, param, resultFunction, resultAll) {
				resultAll = (resultAll == null)? false:resultAll;
				var result = function (data) {
					if (data == null || data.body == null)
						return;

					var d = (resultAll == true)? data:data.body;
					resultFunction(d);
				};

				if (method == "GET") {
					DataService.httpGet(ENTERPRISE_URL + "/cache" + url, param, result, false);
				} else if (method == "PUT") {
					DataService.httpPut(ENTERPRISE_URL + "/cache" + url, param, result, false);
				} else if (method == "DELETE") {
					DataService.httpDelete(ENTERPRISE_URL + "/cache" + url, param, result, false);
				} else if (method == "POST") {
					DataService.httpPost(ENTERPRISE_URL + "/cache" + url, param, result, false);
				}
			}

			function getDirectory() {
				var dir = FileBrowserUtil.getPathValidate(cacheManagementCtrl.current.directory);
				if(dir == null)
					return;

				cacheManagementCtrl.current.directory = dir;
				var p = FileBrowserUtil.getDirectory(dir);
				p.then(function(data) {
					cacheManagementCtrl.grid.directories = data;
					ap($scope);
				});
			}

			function initCacheDirectivesData() {
				if(cacheManagementCtrl.grid == null)
					cacheManagementCtrl.grid = [];

				cacheManagementCtrl.grid.columns = [
					{
						"headerName": " ", "field": "submitTime", "cellStyle": {"text-align": "center"}, "width": 80,
						"cellRenderer": GridRenderer.deleteButtonRenderer,
						"onCellClicked": function (params) {
							cacheManagementCtrl.onDeleteButtonCachePoolHandler(params)
						}
					},
					{"headerName": "Pool", "field": "pool", "cellStyle": {"text-align": "center"}, "width": 130},
					{"headerName": "Directive", "field": "path", "cellStyle": {"text-align": "left"}, "width": 350},
					{"headerName": "Start", "field": "startDate", "cellStyle": {"text-align": "center"}, "width": 140},
					{"headerName": "Expiry", "field": "expireDate", "cellStyle": {"text-align": "center"}, "width": 140}
				];
			}

			function getParam() {
				var param = {};
				param.systemSeq = systemSeq;
				param.pool = cacheManagementCtrl.current.pool;
				param.owner = cacheManagementCtrl.current.owner;
				param.group = cacheManagementCtrl.current.owner;
				param.mode = "755";

				var list = cacheManagementCtrl.grid.directives;
				if(list == null || list.length < 1) {
					alert("There is no directive to register.");
					return false;
				}

				var reg = /^(\d+)(s|h|d|m|w|y|(second|min|day|hour|month|week|year)(s)?)$/gi;
				var l = list.length;
				for (var i = 0; i < l; i++) {
					var start = moment();
					var end = moment();
					var expiry = (list[i].expiry == null) ? "" : list[i].expiry;
					if (expiry.match(reg) == null || !convertExpiry(expiry, moment())) {
						alert("Expiry does not fit the format.");
						return false;
					}

					list[i].startDate = start.format("YYYYMMDD HHmmss");
					list[i].expireDate = convertExpiry(expiry, end);
				}
				param.list = list;
				return param;
			}

			function convertExpiry(val, now) {

				var num = val.match(/^(\d+)/gi)[0];
				var unit = val.match(/[^(\d+)](\w*)$/gi)[0];
				unit = (unit != null && unit == 'min') ? "m" : unit;
				unit = moment.normalizeUnits(unit);

				if (num == null || unit == null)
					return false;

				now.add(num, unit);
				return now.format("YYYYMMDD HHmmss");
			}

			function getMakeCacheDirectiveData(data) {
				var now = moment().subtract(1, 'day');
				initCacheDirectivesData();

				// columns setting
				var columns = [];
				for (var i = 0; i < 14; i++) {
					var current = now.add(1, 'day');
					var col = {};
					col.headerName = current.format("MM/DD");
					col.field = current.format("YYYYMMDD");
					col.width = 80;
					col.cellRenderer = GridRenderer.percentRender;
					columns.push(col);
				}
				cacheManagementCtrl.grid.columns = cacheManagementCtrl.grid.columns.concat(columns);

				// data setting
				var len = data.length;
				if (data == null || len == 0) {
					cacheManagementCtrl.grid.pools = [];
					return;
				}

				for(var i = 0 ; i < len ; i++) {
					var d = data[i];
					var a = (d.startDate == null || d.startDate == "-")? null:moment(d.startDate);
					var b = (d.expireDate == null || d.expireDate == "-")? null:moment(d.expireDate);

					var cLen = columns.length;
					for(var j = 0 ; j < cLen ; j++ ) {
						var col = columns[j];
						if(a == null || b == null) {
							d[col.field] = "0%";
							continue;
						}

						var s_day = parseInt(a.format("YYYYMMDD"));
						var e_day = parseInt(b.format("YYYYMMDD"));
						var c_day = parseInt(col.field);
						if(s_day < c_day && c_day < e_day){
							d[col.field] = "100%";
						} else if(s_day == e_day && s_day == c_day && e_day == c_day) {
							var diff = b.hour() - a.hour();
							var ml = (a.hour() == 0)? "0%":(a.hour()/24)*100 + "%";
							d[col.field] = (diff == 0)? "2%;margin-left:" + ml:(diff/24)*100 + "%;margin-left:" + ml;
						} else if(s_day == c_day) {
							var h = a.hour();
							d[col.field] = (h == 0)? "100%":((24-h)/24)*100 + "%";
							d['sDate'] = s_day;
						} else if(e_day == c_day){
							d[col.field] = (b.hour()/24)*100 + "%";
						} else{
							d[col.field] = "0%";
						}
					}
				}
				cacheManagementCtrl.grid.pools = data;
			}

			function addCacheDirective() {
				var param = getParam();
				if (param == null || !param)
					return;

				var list = param.list;
				var len = list.length;
				for(var i=0; i<len; i++) {
					list[i].sys_seq = param.systemSeq;
					list[i].pool = param.pool;
					list[i].repl = 1;
					list[i].ttl = list[i].expiry;
				}

				try {
					// API 연동(add)
					getData("/directive", "POST", list, null, true);
				} catch(e) {
					getDirectiveData();
				}

				// DB 저장
				DataService.httpPost("/administrator/cache/management/addCacheDirective", param, onSaveDirectiveResult, false);
			}

			function clear() {
				delete cacheManagementCtrl.data;
				delete cacheManagementCtrl.grid;
				delete cacheManagementCtrl.current;

				cacheManagementCtrl = null;
				systemSeq = null;
				unbind = null;
				directiveMap = null;
			}

			initialize();
	}]);
});