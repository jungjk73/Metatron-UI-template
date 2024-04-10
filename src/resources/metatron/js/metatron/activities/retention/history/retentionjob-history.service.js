define(["app", "moment"], function (app, moment) {
    app.factory("RetentionjobHistoryService", ["$http", "$q",
        function ($http, $q) {
            "use strict";

            var getRetentionjobHistoryList = function (params) {
                var defferd = $q.defer();
                $http({
                    method: 'get',
                    url: '/activities/retention/history/retentionjobHistoryList',
                    // data: JSON.stringify(param),
                    params: params,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }).success(function (response, status, headers, config) {
                    defferd.resolve(response.data);
                }).error(function (response, status, headers, config) {
                    defferd.reject();
                });
                return defferd.promise;
            };

            var getRetentionjobHistory = function (jobId) {
                var defferd = $q.defer();
                $http({
                    method: 'get',
                    url: '/activities/retention/configuration/retentionjobHistory/' + jobId,
                    // data: JSON.stringify(param),
                    headers: {
                        "Content-Type": "application/json"
                    }
                }).success(function (response, status, headers, config) {
                    defferd.resolve(response.data);
                }).error(function (response, status, headers, config) {
                    defferd.reject();
                });
                return defferd.promise;
            };

            var retentionjobHistoryListExcelDownload = function (params, jobIds) {
                var defferd = $q.defer();
                params.jobIds = jobIds;
                $http({
                    method: 'GET',
                    url: '/activities/retention/history/retentionjobHistoryList/excel-download',
                    responseType: 'arraybuffer', // We get response message which is written by binary data from server.
                    headers: {'Accept': 'application/vnd.ms-excel',},
                    params: params
                }).success(function (data, status, headers, config) {
                    var fileName = 'retention.xlsx';
                    var blob = new Blob([data], {type: 'application/vnd.ms-excel;charset=UTF-8'});
                    var objectUrl = (window.URL || window.webkitURL).createObjectURL(blob);
                    if (typeof window.navigator.msSaveBlob !== 'undefined') {
                        window.navigator.msSaveBlob(blob, fileName);
                    } else {
                        var link = angular.element('<a/>');
                        link.attr({
                            href: objectUrl,
                            download: fileName
                        })[0].click();
                    }
                    defferd.resolve(true);
                }).error(function (response, status, headers, config) {
                    defferd.reject();
                });
                return defferd.promise;
            };

            return {
                getRetentionjobHistoryList: getRetentionjobHistoryList,
                getRetentionjobHistory: getRetentionjobHistory,
                retentionjobHistoryListExcelDownload: retentionjobHistoryListExcelDownload
            }
        }
    ]);
});
