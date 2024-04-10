define(["app"], function (app) {
	app.controller("JobDetailPopupCtrl", ["$scope", "ConfigManager", "DataService", function ($scope, ConfigManager, DataService) {
		"use strict";

		// property
		var systemSeq = "";
		var jobDetailPopupCtrl = this;
		var historyServerInfo = "";
		var unbind = [];

		jobDetailPopupCtrl.pop = {};

		// method
		jobDetailPopupCtrl.goJobHistoryLink = function () {
			if (jobDetailPopupCtrl.pop == null || jobDetailPopupCtrl.pop.jobInfo == null)
				return;

			// application type에 따라 서버에 등록된 주소를 받아와서, onGetJobHistoryServerInfo 에 넘김.
			let url;
			if (jobDetailPopupCtrl.pop.jobInfo == null || jobDetailPopupCtrl.pop.jobInfo.applicationType == null || jobDetailPopupCtrl.pop.jobInfo.applicationType == '' || jobDetailPopupCtrl.pop.jobInfo.applicationType.toLowerCase() == 'mapreduce'){
				url = '/activities/job/history/getJobHistoryServerInfo';
			}
			else {
				url = '/activities/job/history/getResourceManagerServerInfo';
			}
			DataService.httpPost(url, {"systemSeq": systemSeq}, onGetJobHistoryServerInfo, false);
		};


		// event-handler
		// data는 경로 url , jobId 는 팝업controller.js 뜰때 이미 받았음.
		function onGetJobHistoryServerInfo(data) {
			if (data == null)
				return;

			// historyServerInfo = "http://" + data.data + "/jobhistory/job/";
			// historyServerInfo = data.data;
			let openUrl = '';
			if (jobDetailPopupCtrl.pop.jobInfo == null || jobDetailPopupCtrl.pop.jobInfo.applicationType == null || jobDetailPopupCtrl.pop.jobInfo.applicationType == '' || jobDetailPopupCtrl.pop.jobInfo.applicationType.toLowerCase() == 'mapreduce'){
				openUrl = 'http://' + data.data + '/jobhistory/job/' + jobDetailPopupCtrl.pop.jobInfo.jobId;
			} else {
				let __url = jobDetailPopupCtrl.pop.jobInfo.jobId;
				if (__url.indexOf('job') != -1) {
					__url = __url.replace('job','application');
				}
				openUrl = 'http://' + data.data + '/cluster/app/'+__url;
			}

			// 테스트 20220315 henry
			openUrl = jobDetailPopupCtrl.pop.jobInfo.trackingUrl;
			window.open(openUrl);
		}

		function onJobDetailPopup(event, data) {
			jobDetailPopupCtrl.pop.jobInfo = data;
			ap($scope);
		}


		// function
		function initialize() {
			systemSeq = ConfigManager.getSystemSeq();
			// DataService.httpPost("/activities/job/history/getJobHistoryServerInfo", {"systemSeq": systemSeq}, onGetJobHistoryServerInfo, false);
			addEventListener();
		}

		function addEventListener() {
			unbind = [
				$scope.$on(ConfigManager.getEvent("JOB_DETAIL_POPUP"), onJobDetailPopup),
				$scope.$on('$destroy', destroy)
			];
		}

		function destroy() {
			unbind.forEach(function (fn) {
				fn();
			});
		}

		initialize();
	}]);
});