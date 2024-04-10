define(["app"], function (app) {
	app.controller("FileBrowserCtrl", ["$rootScope", "$scope", "$document", "ConfigManager", "DataService", "CommonUtil", "FileBrowserUtil",
		function ($rootScope, $scope, $document, ConfigManager, DataService, CommonUtil, FileBrowserUtil) {
			"use strict";

			// property
			var fileBrowserCtrl = this;
			var systemSeq = "";
			var unbind = [];

			fileBrowserCtrl.data = {};
			fileBrowserCtrl.grid = {};
			fileBrowserCtrl.current = {};
			fileBrowserCtrl.current.directory = "/";

			var changeDirFlag = true;


			// method
			fileBrowserCtrl.onDirectoryBackHandler = function () {
				var val = fileBrowserCtrl.current.directory;
				var lastIdx = val.lastIndexOf("/");
				if (lastIdx == 0)
					fileBrowserCtrl.current.directory = "/";
				else
					fileBrowserCtrl.current.directory = val.substring(0, lastIdx);
				ap($scope);
			};

			fileBrowserCtrl.onDirectoryDBClickHandler = function (event) {
				if (event == null || event.data == null)
					return;

				var data = event.data;
				if(data == null || data.type == "FILE")
					return;

				if  (changeDirFlag == false) return;

				var val = fileBrowserCtrl.current.directory;
				if (val.charAt(val.length - 1) == "/")
					fileBrowserCtrl.current.directory = val + event.data.pathSuffix;
				else
					fileBrowserCtrl.current.directory = val + "/" + event.data.pathSuffix;
				ap($scope);
				changeDirFlag = false;
			};

			fileBrowserCtrl.onOpenFileInfo = function(event) {
				if(event == null)
					return;

				var target = event.rowData.event.target;
				var data = event.rowData;
				if (target == null || target.nodeName != "A" || data == null || data.data == null)
					return;

				var dir = FileBrowserUtil.getPathValidate(fileBrowserCtrl.current.directory);
				if(dir == null)
					return;

				FileBrowserUtil.getBlockInfo(dir + "/" + data.data.pathSuffix, $scope);
			};


			// event-handler
			function destory() {
				unbind.forEach(function (fn) {
					FileBrowserUtil.destroy();
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
			}


			// function
			function initialize() {
				systemSeq = ConfigManager.getSystemSeq();
				var p = FileBrowserUtil.getNameNodeIp(systemSeq);
				p.then(addEventListener);
			}

			function addEventListener() {
				// broadcast event
				unbind = [
					$scope.$on(ConfigManager.getEvent("CHANGE_SYSTEM_SEQ_EVENT"), onChangeSystemSeqEventHandler),
					$scope.$on('$destroy', destory)
				];

				// watch
				$scope.$watch("fileBrowserCtrl.current.directory", getDirectory);
				$rootScope.$on('$locationChangeStart', function(e) {
					if(fileBrowserCtrl == null || fileBrowserCtrl.current == null)
						return;

					var val = fileBrowserCtrl.current.directory;
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
				getDirectory();
			}

			function directoryBackEventHandler() {
				var val = fileBrowserCtrl.current.directory;
				if(val == null || val == "")
					val = "/";

				fileBrowserCtrl.current.directory = (val.lastIndexOf("/") < 1)? "/":val.substring(0, val.lastIndexOf("/"));
				ap($scope);
			}

			function getDirectory() {
				var dir = FileBrowserUtil.getPathValidate(fileBrowserCtrl.current.directory);
				if(dir == null) {
					changeDirFlag = true;
					return;
				}

				fileBrowserCtrl.current.directory = dir;
				var p = FileBrowserUtil.getDirectory(dir);
				p.then(function(data) {
					fileBrowserCtrl.grid.directories = data;
					ap($scope);
					changeDirFlag = true;
				});
			}

			function clear() {
				delete fileBrowserCtrl.data;
				delete fileBrowserCtrl.grid;
				delete fileBrowserCtrl.current;

				fileBrowserCtrl = null;
				systemSeq = null;
				unbind = null;
			}

			initialize();
		}]);
});