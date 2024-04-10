define(["app"], function (app) {
	app.factory('FileBrowserUtil', ["$rootScope", "$controller", "$document", "CommonUtil", "DataService", "ngDialog",
		function ($rootScope, $controller, $document, CommonUtil, DataService, ngDialog) {
			"use strict";

			// property
			var NAMENODE_IP = "";
			var DIR_SYNC_FLAG = true;


			// function
			function getNameNodeIp(systemSeq) {

				var p = new Promise(function (resolve) {
					var param = {};
					param.systemSeq = systemSeq;

					DataService.httpPost("/hdfs/filebrowser/getNameNodeIp", param, function (data) {

						if (location.hostname == "localhost") {
							NAMENODE_IP = "~호스트IP:23016";
							//NAMENODE_IP = "~호스트IP:13009";
							//NAMENODE_IP = "hadoop01:50070";
							resolve();
							// return;  //주석처리 20220311 henry
						}

						if (data == null || data.data == null) {
							NAMENODE_IP = null;
							return;
						}

						NAMENODE_IP = data.data;
						resolve();
					}, false);
				});

				return p;
			}

			function getBlockInfo(val, $scope) {
				ngDialog.closeAll();

				var dir = getPathValidate(val);
				if (dir == null)
					return;

				// path 방어 코드 (ex: ///test.txt)
				val = val.replace(/(\/+)/gi, '/');

				var param = {};
				param.path = val;
				param.op = "GET_BLOCK_LOCATIONS";
				param.ip = NAMENODE_IP;
				if(NAMENODE_IP == null || NAMENODE_IP == "")
					return;

				DataService.httpPost("/hdfs/filebrowser/getFileBlockInfo", param, function (data) {
					if (data == null || data.data == null)
						return;

					var result = data.data;
					if (result == null || result.LocatedBlocks == null)
						return;

					var file = val.substring(val.lastIndexOf("/")+1, val.length);
					openPopup(file, result.LocatedBlocks, $scope);
				});
			}

			function getDirectory(val) {
				ngDialog.closeAll();
				var dir = getPathValidate(val);
				if (dir == null)
					return;

				// path 방어 코드 (ex: ///test.txt)
				dir = dir.replace(/(\/+)/gi, '/');

				var param = {};
				param.path = dir;
				param.op = "LISTSTATUS";
				param.ip = NAMENODE_IP;
				if(NAMENODE_IP == null || NAMENODE_IP == "") {
					return new Promise(function(resolve) {
						resolve([]);
					});
				}

				DIR_SYNC_FLAG = false;
				var p = new Promise(function (resolve) {
					DataService.httpPost("/hdfs/filebrowser/getFileList", param, function (data) {
						DIR_SYNC_FLAG = true;
						if (data == null || data.data == null)
							return;

						var result = data.data;
						if (result == null || result.FileStatuses == null || result.FileStatuses.FileStatus == null) {
							resolve([]);
						} else {
							resolve(result.FileStatuses.FileStatus);
						}
					});
				});

				return p;
			}

			function getPathValidate(val) {
				var tmp = ((val == null || val == "") ? "/" : val).replace(/(\s+)/gi, "");
				if (val == null || val == "" || tmp == "" || !DIR_SYNC_FLAG)
					return null;

				if (val.charAt(0) != "/")
					val = "/" + val;

				return val;
			}

			function openPopup(name, data, $scope) {

				// data setting
				var pop = {};
				pop.filename = name;

				var list = angular.copy(data.locatedBlocks);
				var len = list.length;
				for (var i = 0; i < len; i++) {
					var o = {};
					o = list[i].block;
					o.label = "block " + i;
					o.numBytes = CommonUtil.numberFormatter(o.numBytes);
					angular.merge(list[i], o);
				}

				if(list != null && list.length > 0) {
					pop.blocks = list;
					pop.block = list[0];
				} else {
					pop.blocks = [];
					pop.block = {};
				}

				ngDialog.closeAll();
				var popup = ngDialog.open({
					template: "/service/hdfs/popup/file_info_popup_template.html",
					className: "ngdialog-theme-default custom-width",
					showClose: false,
					disableAnimation: true,
					cache: false,
					closeByDocument: false,
					closeByEscape: false,
					scope: $scope,
					controller: $controller("FileBrowserPopCtrl", {
						$scope: $scope,
						pop: pop
					})
				});

				var closer = $rootScope.$on('ngDialog.refresh', function (e, id) {
					if (id != popup.id) return;
					closer();
				});
			}

			function destroy() {
				ngDialog.closeAll();
			}

			return {
				getNameNodeIp: getNameNodeIp,
				getBlockInfo: getBlockInfo,
				getDirectory: getDirectory,
				getPathValidate: getPathValidate,
				destroy: destroy
			}
		}]);
});