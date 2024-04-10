define(["app", "moment"], function (app, moment) {
    app.factory("RetentionjobConfigurationService", ["$http", "$q",
        function ($http, $q) {
            "use strict";
            var getRetentionjobConfigList = function (params) {
                var defferd = $q.defer();
                $http({
                    method: 'post',
                    url: '/activities/retention/configuration/getRetentionPagingList',
                    data: JSON.stringify(params),
                    //params: params,
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

            var getRetentionjobConfig = function (jobId) {
                var defferd = $q.defer();
                $http({
                    method: 'get',
                    url: '/activities/retention/configuration/retentionjobConfig/' + jobId,
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

            var addRetentionjobConfig = function (retentionjobConfig) {
                var defferd = $q.defer();
                $http({
                    method: 'post',
                    url: '/activities/retention/configuration/retentionjobConfig',
                    data: JSON.stringify(retentionjobConfig),
                    headers: {
                        "Content-Type": "application/json"
                    }
                }).success(function (response, status, headers, config) {
                    defferd.resolve(response);
                }).error(function (response, status, headers, config) {
                    defferd.reject(response);
                });
                return defferd.promise;
            };

            var updateRetentionjobConfig = function (jobId, retentionjobConfig) {
                var defferd = $q.defer();
                $http({
                    method: 'post',
                    url: '/activities/retention/configuration/retentionjobConfig/' + jobId,
                    data: JSON.stringify(retentionjobConfig),
                    headers: {
                        "Content-Type": "application/json"
                    }
                }).success(function (response, status, headers, config) {
                    defferd.resolve(response);
                }).error(function (response, status, headers, config) {
                    defferd.reject(response);
                });
                return defferd.promise;
            };

            var deleteRetentionjobConfig = function (jobId) {
                var defferd = $q.defer();
                $http({
                    method: 'post',
                    url: '/activities/retention/configuration/retentionjobConfig/' + jobId + '/delete',
                    headers: {
                        "Content-Type": "application/json"
                    }
                }).success(function (response, status, headers, config) {
                    defferd.resolve(response);
                }).error(function (response, status, headers, config) {
                    defferd.reject(response);
                });
                return defferd.promise;
            };

            var massDeleteRetentionjobConfig = function (jobIds) {
                var defferd = $q.defer();
                $http({
                    method: 'post',
                    url: '/activities/retention/configuration/retentionjobConfig/mass-delete',
                    data: JSON.stringify(jobIds),
                    headers: {
                        "Content-Type": "application/json"
                    }
                }).success(function (response, status, headers, config) {
                    defferd.resolve(response);
                }).error(function (response, status, headers, config) {
                    defferd.reject(response);
                });
                return defferd.promise;
            };

            var retentionjobConfigListExcelDownload = function (params, jobIds) {
                var defferd = $q.defer();
                params.jobIds = jobIds;
                $http({
                    method: 'POST',
                    url: '/activities/retention/configuration/retentionjobConfigList/excel-download',
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

            var saveExecuteRole = function (jobGroupCount, jobSleepSecond) {
                var defferd = $q.defer();
                $http({
                    method: 'post',
                    url: '/activities/retention/configuration/retentionjobConfig/execute-role',
                    params: {
                        jobGroupCount: jobGroupCount,
                        jobSleepSecond: jobSleepSecond
                    },
                    headers: {
                        "Content-Type": "application/json"
                    }
                }).success(function (response, status, headers, config) {
                    defferd.resolve(response);
                }).error(function (response, status, headers, config) {
                    defferd.reject(response);
                });
                return defferd.promise;
            };

            var getExecuteRoleValue = function (codeName) {
                var defferd = $q.defer();
                $http({
                    method: 'get',
                    url: '/activities/retention/configuration/retentionjobConfig/execute-role',
                    params: {
                        codeName: codeName
                    },
                    headers: {
                        "Content-Type": "application/json"
                    }
                }).success(function (response, status, headers, config) {
                    defferd.resolve(response.data);
                }).error(function (response, status, headers, config) {
                    defferd.reject(response);
                });
                return defferd.promise;
            };


             var getSampleExcelDownload = function () {
                 var defferd = $q.defer();                
                $http({
                    method: 'GET',
                    url: '/resources/js/metatron/activities/retention/sample/upload_sample.csv',
                    responseType: 'arraybuffer', 
                    headers: {'Accept': 'text/csv',},
                    params: {}
                }).success(function (data, status, headers, config) {
                    var fileName = 'upload_sample.csv';
                    var blob = new Blob([data], {type: 'text/csv;charset=UTF-8'});
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
                getRetentionjobConfigList: getRetentionjobConfigList,
                getRetentionjobConfig: getRetentionjobConfig,
                addRetentionjobConfig: addRetentionjobConfig,
                updateRetentionjobConfig: updateRetentionjobConfig,
                deleteRetentionjobConfig: deleteRetentionjobConfig,
                massDeleteRetentionjobConfig: massDeleteRetentionjobConfig,
                retentionjobConfigListExcelDownload: retentionjobConfigListExcelDownload,
                getExecuteRoleValue: getExecuteRoleValue,
                saveExecuteRole: saveExecuteRole,
                getSampleExcelDownload: getSampleExcelDownload
            }
        }
    ]);
});

