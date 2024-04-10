define(["app", "moment"], function(app, moment) {
    app.controller("StatusSystemCtrl", ["$rootScope", "$scope", "$element", "$interval", "$timeout", "$filter", "DataService", "ConfigManager", "ngDialog", "WebSocketService", "GridRenderer", "AlarmService", "AlarmManager", function($rootScope, $scope, $element, $interval, $timeout, $filter, DataService, ConfigManager, ngDialog, WebSocketService, GridRenderer, AlarmService, AlarmManager) {

        var unbind = [];
        var systemSeq = "";
        var statusSystemCtrl = this;
        var hostList = [];
        var TIMER;
        var INTERVAL_TIME = 1000 * 10;
        var chartRefresh = true;
        var loader = true;
        var chartData = {};
        var xmin = 0;
        var xmax = 0;
        var selectedAlarm = {};
        var grid_type = "USAGE";

        let mySpinner = null;
		let mySpinnerTarget = null;
		let myBlockUI = null;

        statusSystemCtrl.girdH = "height : 340px";
        statusSystemCtrl.alarmH = "height : 172px";
        statusSystemCtrl.overviewW = "width : 547px !important";
        statusSystemCtrl.resourceH = 340;
        statusSystemCtrl.diskH = 0;
        statusSystemCtrl.filter = { severity: ['CR', 'MJ', 'MN'] };
        statusSystemCtrl.hostFilter = { severity: ['CR', 'MJ', 'MN', 'OK'] };
        statusSystemCtrl.data = {};
        statusSystemCtrl.data.DISK_FREE_PERCENT = 100;
        statusSystemCtrl.data.DISK_FREE = 0;
        statusSystemCtrl.data.DISK_TOTAL = 0;
        statusSystemCtrl.data.LOAD_AVG_FIVE = 0;
        statusSystemCtrl.data.LOAD_AVG_FIFTEEN = 0;
        statusSystemCtrl.data.CPU_NUM = 0;
        statusSystemCtrl.data.LOAD_ONE = 0;
        statusSystemCtrl.data.CPU_UTIL = 0;
        statusSystemCtrl.data.LOAD_AVG_ONE = 0;
        statusSystemCtrl.HostListSort = [{ colId: 'system_seq', sort: 'desc' }];
        statusSystemCtrl.DiskListSort = [{ colId: 'system_name', sort: 'desc' }];
        statusSystemCtrl.sortData = [{ label: "Host Name", data: "system_name" }, {
                label: "Disk Usage",
                data: "DISK_USAGE"
            }, { label: "Mem Usage", data: "MEM_USAGE" },
            { label: "CPU Usage", data: "CPU_USAGE" }, { label: "Byte In", data: "BYTES_IN" }, {
                label: "Byte Out",
                data: "BYTES_OUT"
            }
        ];
        statusSystemCtrl.alarmSystemSeq = [];

        statusSystemCtrl.chartRefresh = function(event) {
            chartRefresh = !chartRefresh;
            var target = $(event.currentTarget);
            var target_i = target.find("i");
            if (target_i.hasClass('play')) {
                target.find('i').removeClass("play");
                target.find('i').addClass("pause");
            } else {
                target.find('i').addClass("play");
                target.find('i').removeClass("pause");
            }
        };

        statusSystemCtrl.alarmExpend = function(t) {
            var target = $(event.currentTarget);
            var target_i = target.find("i");
            if (target_i.hasClass('zoom')) {
                target_i.removeClass("zoom");
                target_i.addClass("expand");
                if (t == "host") {
                    $('.alarm-list').addClass("display-block");
                    $('.alarm-list').removeClass("display-none");
                    statusSystemCtrl.girdH = "height : 340px";
                } else {
                    $('.status-list').addClass("display-block");
                    $('.status-list').removeClass("display-none");
                    statusSystemCtrl.alarmH = "height : 173px";
                }

                $('.cluster-overview').addClass("display-block");
                $('.cluster-overview').removeClass("display-none");
                statusSystemCtrl.overviewW = "width : 562px !important";

            } else {
                target_i.removeClass("expand");
                target_i.addClass("zoom");

                if (t == "host") {
                    $('.alarm-list').removeClass("display-block");
                    $('.alarm-list').addClass("display-none");
                    statusSystemCtrl.girdH = "height : 644px";
                } else {
                    $('.status-list').removeClass("display-block");
                    $('.status-list').addClass("display-none");
                    statusSystemCtrl.alarmH = "height : 644px";
                }

                $('.cluster-overview').addClass("display-none");
                $('.cluster-overview').removeClass("display-block");
                statusSystemCtrl.overviewW = "width : 0";
            }
        };

        statusSystemCtrl.changeAllDisk = function(event) {
            var target = event.currentTarget;
            if (grid_type == "USAGE") {
                target.innerText = "Usage Resource";
                $('.hostbox').css('display', 'none');

                $('.resource').removeClass("display-block");
                $('.resource').addClass("display-none");

                $('.disk').removeClass("display-none");
                $('.disk').addClass("display-block");
                grid_type = "DISK";
            } else {
                target.innerHTML = '<i class="mu-icon disk"></i> Usage of All Disks';
                $('.hostbox').css('display', 'block');
                $('.resource').css('display', 'block');

                $('.disk').removeClass("display-block");
                $('.disk').addClass("display-none");

                $('.resource').removeClass("display-none");
                $('.resource').addClass("display-block");

                grid_type = "USAGE"
            }

            statusSystemCtrl.refreshGridNumber = Math.random() * 1000;
            //getSocketGrid();
            //getSocketDiskAllGrid();
        };

        statusSystemCtrl.searchKeyEnter = function() {
            getSocketGrid();
            getSocketDiskAllGrid();
        };

        statusSystemCtrl.sortChange = function(event) {
            statusSystemCtrl.HostListSort = [{ colId: event.data, sort: 'asc' }, { colId: 'system_name', sort: 'asc' }];
            ap($scope);
        };

        statusSystemCtrl.hostToggleSeverity = function(event, value) {
            var s = statusSystemCtrl.hostFilter.severity;
            var idx = _.indexOf(s, value);

            var target = angular.element(event.currentTarget);
            var target_span = $(event.currentTarget).find('> span');
            if (target.hasClass("disabled")) {
                target.removeClass("disabled");
                target_span.removeClass("span_disable");
                s.push(value);
            } else {
                s.splice(idx, 1);
                target.addClass("disabled");
                target_span.addClass("span_disable");
            }

            getSocketGrid();
            getSocketDiskAllGrid();
        };

        statusSystemCtrl.toggleSeverity = function(event, value) {
            var s = statusSystemCtrl.filter.severity;
            var idx = _.indexOf(s, value);
            var target = angular.element(event.currentTarget);
            if (target.hasClass("disabled")) {
                target.removeClass("disabled");
                s.push(value);
            } else {
                s.splice(idx, 1);
                target.addClass("disabled");
            }
            getAlarmList();
        };

        statusSystemCtrl.onAlarmGridRowClickHandler = function(value) {
            setSelectedAlarm(value);
        };

        statusSystemCtrl.alarmUpdateHandler = function(type) {
            statusSystemCtrl.alarm = {};
            statusSystemCtrl.alarm.message = "";

            var l = getCheckedAlarmSeqList();
            if (l == null || l.length == 0) {
                alert("Please select Alarm.");
                return;
            }

            var msgCode = [];
            msgCode.push('<div class="lay-pop">');
            msgCode.push('	<div class="pop-wrap">');
            msgCode.push('		<div class="head"><p class="tit">User Alarm Message</p></div>');
            msgCode.push('		<div class="cont">');
            msgCode.push('			<table class="mu-formbox" style="border: none;">');
            msgCode.push('				<tbody>');
            msgCode.push('					<tr>');
            msgCode.push('						<th style="border:none;">Message</th>');
            msgCode.push('						<td colspan="3" style="border:none;"><input type="text" class="mu-input gray" ng-model="statusSystemCtrl.alarm.message" style="color:#000;"></td>');
            msgCode.push('					</tr>');
            msgCode.push('				</tbody>');
            msgCode.push('			</table>');
            msgCode.push('			<div class="btn-area">');
            msgCode.push('				<button type="button" class="mu-btn" ng-click="closeThisDialog();statusSystemCtrl.alarm.message=\'\'">Cancel</button>');
            msgCode.push('				<button type="button" class="mu-btn mu-btn-color bg-orange" ng-click="statusSystemCtrl.alarmUpdateExecution(\'' + type + '\')">OK</button>');
            msgCode.push('			</div>');
            msgCode.push('		</div>');
            msgCode.push('	</div>');
            msgCode.push('</div>');

            var popup = ngDialog.open({
                template: msgCode.join(''),
                className: "ngdialog-theme-default custom-width",
                showClose: true,
                plain: true,
                disableAnimation: true,
                cache: false,
                closeByDocument: false,
                closeByEscape: false,
                scope: $scope
            });

            var closer = $rootScope.$on('ngDialog.refresh', function(e, id) {
                if (id != popup.id) return;
                statusSystemCtrl.alarm.message = "";
                closer();
            });
        };

        statusSystemCtrl.alarmUpdateExecution = function(type) {
            var confirmResult = false;
            if (type == "ack") {
                confirmResult = confirm("Are you really acknowledge alarm(s)?");
            } else if (type == "delete") {
                confirmResult = confirm("Are you really delete alarm(s)?");
            }

            if (!confirmResult)
                return;

            var param = {};
            param.alarmSeqs = getCheckedAlarmSeqList();
            param.user = ConfigManager.getUser().username;
            param.message = statusSystemCtrl.alarm.message;


            AlarmService[type + "Alarm"](param, function() {
                statusSystemCtrl.alarm.message = "";
                ngDialog.closeAll();
            });
        };
        //-------------------------------------------------------------------------------------
        // socket get Top Data
        //-------------------------------------------------------------------------------------
        function getSystemStatusEventHandler(event, data) {
            if (data.hasOwnProperty("exceptionMassage")) {
                statusSystemCtrl.data = {};
                statusSystemCtrl.data.DISK_FREE = 0;
                statusSystemCtrl.data.DISK_TOTAL = 0;
                statusSystemCtrl.data.LOAD_AVG_FIVE = 0;
                statusSystemCtrl.data.LOAD_AVG_FIFTEEN = 0;
                statusSystemCtrl.data.CPU_NUM = 0;
                statusSystemCtrl.data.LOAD_ONE = 0;
                statusSystemCtrl.data.CPU_UTIL = 0;
                statusSystemCtrl.data.LOAD_AVG_ONE = 0;
                data.searchResults = null;
                return;
            }


            angular.merge(statusSystemCtrl.data, data.searchResults);
            statusSystemCtrl.data.DISK_FREE_PERCENT = Math.round(100 * (Number(statusSystemCtrl.data.DISK_FREE)) / (Number(statusSystemCtrl.data.DISK_TOTAL)), 2);

            if (isNaN(statusSystemCtrl.data.DISK_FREE_PERCENT)) {
                statusSystemCtrl.data.DISK_FREE_PERCENT = 0;
                statusSystemCtrl.data.DISK_USED_PERCENT = 0;
            } else {
                statusSystemCtrl.data.DISK_USED_PERCENT = 100 - statusSystemCtrl.data.DISK_FREE_PERCENT;
            }
            console.info("STATUS TOP DATA : ", statusSystemCtrl.data);
            ap($scope);
        }

        //-------------------------------------------------------------------------------------
        // socket get Host Grid Data
        //-------------------------------------------------------------------------------------

        function getSystemStatusGridEventHandler(event, data) {
            statusSystemCtrl.hostGridData = [];
            if (data.hasOwnProperty("exceptionMassage")) {
                data.searchResults = null;
                return;
            }

            var s_key = $scope.searchKey == undefined ? "" : $scope.searchKey;
            var gridObj = data.searchResults;
            statusSystemCtrl.hostGridData = [];
            var host_len = hostList.length;
            for (var i = 0; i < host_len; i++) {
                var hostObj = hostList[i];
                for (var k in gridObj) {
                    if (k.toUpperCase() == hostObj.system_name.toUpperCase()) {
                        if (s_key == "") {
                            angular.merge(hostObj, gridObj[k]);
                            break;
                        } else {
                            if (hostObj.system_name.indexOf(s_key) > -1) {
                                angular.merge(hostObj, gridObj[k]);
                                break;
                            }
                        }
                    }
                }

                statusSystemCtrl.hostGridData.push(hostObj);
            }

            console.debug("STATUS HOST GRID DATA : " + data.searchResults);
            onGetHostGridAlarmData();
        }

        function onGetHostGridAlarmData() {
            AlarmManager.getAlarmsAsGroup("resource").then(function(data) {
                statusSystemCtrl.hostGridAlarmData = data; // alarm list host 별로 group
                statusSystemCtrl.alarmFilterSeverity = [];
                statusSystemCtrl.hostGrid = [];
                angular.forEach(statusSystemCtrl.hostGridAlarmData, function(value) {
                    var grade = _.groupBy(value, "severity");
                    //가장 높은 grade push
                    var obj = setHostGrid(grade);
                    statusSystemCtrl.alarmFilterSeverity.push(obj);
                });

                //system_name 로 groupimg 후 grade 넣어준다.
                statusSystemCtrl.hostGridData = _.groupBy(statusSystemCtrl.hostGridData, "system_name");
                statusSystemCtrl.alarmFilterSeverity = _.groupBy(statusSystemCtrl.alarmFilterSeverity, "resource");
                for (var host in statusSystemCtrl.hostGridData) {
                    var d = statusSystemCtrl.hostGridData[host][0];
                    statusSystemCtrl.hostGrid.push(d);
                    for (var alarm in statusSystemCtrl.alarmFilterSeverity) {
                        if (host == alarm) {
                            d.severity = statusSystemCtrl.hostGridAlarmData[alarm][0].severity;
                        }
                    }

                    if (!d.hasOwnProperty("severity"))
                        d.severity = "OK";
                }

                //alarm Count Grouping
                statusSystemCtrl.alarmCount = {};
                statusSystemCtrl.alarmCount.CR = [];
                statusSystemCtrl.alarmCount.MJ = [];
                statusSystemCtrl.alarmCount.MN = [];
                statusSystemCtrl.alarmCount.OK = [];
                statusSystemCtrl.alarmCount = angular.merge(_.groupBy(statusSystemCtrl.hostGrid, "severity"), statusSystemCtrl.alarmCount);

                var s_key = $scope.searchKey == undefined ? "" : $scope.searchKey;
                statusSystemCtrl.hostFilter["system_name"] = [s_key];
                statusSystemCtrl.hostFilterGrid = filterHostByGrade(statusSystemCtrl.hostFilter, statusSystemCtrl.hostGrid);

                ap($scope);
                hideMySpinner();
            });
        }

        function filterHostByGrade(filter, data) {
            var list = angular.copy(data);
            if (filter != null) {
                for (var key in filter) {
                    if (key == "severity") {
                        list = _.filter(list, function(data) {
                            return (_.contains(filter[key], data[key]));
                        });
                    } else {
                        list = _.filter(list, function(data) {
                            return (data[key].indexOf(filter[key]) > -1);
                        });
                    }

                }
            }

            if (list != null && list.length > 0) {
                let keys = Object.keys(list[0]);
                for (let k = 0; k < list.length; k++) {
                    // isNaN(list[k].BYTES_IN) == false : 숫자
                    for (let i = 0; i < keys.length; i++) {
                        if (isNaN(list[k][keys[i]]) == false) {
                            list[k][keys[i]] = Number(list[k][keys[i]]);
                        }
                    }
                }
            }

            return list;
        }

        function setHostGrid(data) {
            if (data.hasOwnProperty("CR")) {
                return data["CR"][0];
            }


            if (data.hasOwnProperty("MJ"))
                return data["MJ"][0];

            if (data.hasOwnProperty("MN"))
                return data["MN"][0];
        }

        //-------------------------------------------------------------------------------------
        // socket get Disk  Grid Data
        //-------------------------------------------------------------------------------------
        function getSystemStatusDiskAllGridEventHandler(event, data) {
            statusSystemCtrl.diskAllGrid = [];
            if (data.hasOwnProperty("exceptionMassage")) {
                data.searchResults = null;
                return;
            }

            var diskAllObj = data.searchResults;
            var s_key = $scope.searchKey == undefined ? "" : $scope.searchKey;
            statusSystemCtrl.diskAllGrid = [];
            statusSystemCtrl.diskAllGridColumn = [{
                field: 'system_name',
                headerName: 'Host Name',
                width: 185,
                cellStyle: textAlignFunc
            }];

            var host = [];
            if (statusSystemCtrl.hostFilterGrid != null && statusSystemCtrl.hostFilterGrid.length > 0)
                host = statusSystemCtrl.hostFilterGrid;
            else
                host = hostList;

            for (var i = 0; i < host.length; i++) {
                var hostObj = host[i];
                for (var k in diskAllObj) {
                    if (k.toUpperCase() == hostObj.system_name.toUpperCase()) {
                        if (s_key == "") {
                            angular.merge(hostObj, diskAllObj[k]);
                            statusSystemCtrl.diskAllGrid.push(hostObj);
                            break;
                        } else {
                            if (hostObj.system_name.indexOf(s_key) > -1) {
                                angular.merge(hostObj, diskAllObj[k]);
                                statusSystemCtrl.diskAllGrid.push(hostObj);
                                break;
                            }
                        }
                    }
                }
            }

            var diskAllColumn = [];
            var max = 0;
            for (var k in diskAllObj) {
                var obj_len = Object.keys(diskAllObj[k]).length;
                if (obj_len > max) {
                    diskAllColumn = diskAllObj[k];
                    max = obj_len;
                }
            }

            console.debug("Disk All Grid Data : " + JSON.stringify(diskAllColumn));
            //첫번째 들어오는 값으로 ...

            if (statusSystemCtrl.diskAllGrid.length > 0) {
                var diskAllColumnArr = [];
                for (var key in diskAllColumn) {
                    if (key.indexOf("DISK_FREE_PERCENT_DATA") > -1) {
                        var keyindex = parseInt(key.replace("DISK_FREE_PERCENT_DATA", ""));
                        diskAllColumnArr.push({
                            "label": key,
                            "index": keyindex,
                            "header": key.replace("DISK_FREE_PERCENT_", "")
                        });
                    }
                }

                diskAllColumnArr.sort(function(a, b) {
                    var a1 = a.index,
                        b1 = b.index;
                    if (a1 == b1) return 0;
                    return a1 > b1 ? 1 : -1;
                });

                let tempSSDArr = [];
                for (var key in diskAllColumn) {
                    if (key.indexOf("DISK_FREE_PERCENT_SSD") > -1) {
                        var keyindex = parseInt(key.replace("DISK_FREE_PERCENT_SSD", ""));
                        tempSSDArr.push({
                            "label": key,
                            "index": keyindex,
                            "header": key.replace("DISK_FREE_PERCENT_", "")
                        });
                    }
                }

                if (tempSSDArr.length > 0) {
                    tempSSDArr.sort(function(a, b) {
                        var a1 = a.index,
                            b1 = b.index;
                        if (a1 == b1) return 0;
                        return a1 > b1 ? 1 : -1;
                    });
                    for (let k = tempSSDArr.length - 1; k >= 0; k--) {
                        diskAllColumnArr.unshift(tempSSDArr[k]);
                    }
                }

                diskAllColumnArr.unshift({ "label": 'DISK_FREE_PERCENT_ROOTFS', "index": '0', "header": "OS(/)" });

                for (var i = 0; i < diskAllColumnArr.length; i++) {
                    var columnValue = {
                        headerName: diskAllColumnArr[i]['header'],
                        field: diskAllColumnArr[i]['label'],
                        width: 80,
                        cellRenderer: GridRenderer['diskAllRenderer'],
                        cellStyle: textAlignFunc,
                        cellClass: 'pl20'
                    };
                    statusSystemCtrl.diskAllGridColumn.push(columnValue);
                  //  ap($scope);
                }
                // for (var i = 0; i < 2; i++) {
                // 	var columnValue = {
                // 		headerName: 'SSD'+i,
                // 		field: 'ssd'+i,
                // 		width: 80,
                // 		cellRenderer: GridRenderer['diskAllRenderer'],
                // 		cellStyle: textAlignFunc,
                // 		cellClass: 'pl20'
                // 	};
                // 	statusSystemCtrl.diskAllGridColumn.push(columnValue);
                // }

            }
        }

        //-------------------------------------------------------------------------------------
        // socket get Chart Data
        //-------------------------------------------------------------------------------------

        function getSystemStatusChartEventHandler(event, data) {
            if (data.hasOwnProperty("exceptionMassage")) {
                statusSystemCtrl.chartData = createChartData();
                data.searchResults = null;
                return;
            }

            angular.merge(chartData, data.searchResults);
            //if (chartData.hasOwnProperty("LOAD_AVG_ONE") && chartData.hasOwnProperty("BYTES_IN") && chartData.hasOwnProperty("MEM_USED")) {
            if (chartData.hasOwnProperty("BYTES_IN") && chartData.hasOwnProperty("MEM_USED")) {
                console.debug("STATUS CHART DATA : " + chartData);
                createChartDataabc(chartData, data.startTime * 1000, data.endTime * 1000);
            }
        }

        //chart Zoom Event
        zingchart.zoom = function(p) {
            //console.log("-----------------------move", p, $.format.date(xmin, "HH:mm"), $.format.date(xmax, "HH:mm"));
            if (p == null || p.preview == null)
                return;

            if (p.kmin == xmin) {
                getSocketChart(true, "xmin");
            } else if (p.kmax == xmax) {
                getSocketChart(true, "xmax");
            }
        };

        function createChartDataabc(data, min, max) {
            xmin = min;
            xmax = max;

            var scaleX = {
                minValue: min,
                maxValue: max,
                "autoFit": true,
                "normalize": true,
                zoomToValues: [max - (60000 * 60), max], //1시간 단위로 보여줌
            };

            zingchart.exec('statusChart', 'modify', {
                graphid: 0,
                data: { "scale-x": scaleX }
            });
            zingchart.exec('statusChart', 'modify', {
                graphid: 1,
                data: { "scale-x": scaleX }
            });

            zingchart.exec('statusChart', 'modify', {
                graphid: 2,
                data: { "scale-x": scaleX }
            });

            zingchart.exec('statusChart', 'modify', {
                graphid: 3,
                data: { "scale-x": scaleX }
            });

            zingchart.exec('statusChart', 'setseriesvalues', {
                graphid: 0,
                values: [data.LOAD_AVG_ONE, data.LOAD_AVG_FIVE, data.LOAD_AVG_FIFTEEN]
            });
            zingchart.exec('statusChart', 'setseriesvalues', {
                graphid: 1,
                values: [data.BYTES_IN, data.BYTES_OUT]
            });
            zingchart.exec('statusChart', 'setseriesvalues', {
                graphid: 2,
                values: [data.CPU_USER, data.CPU_SYSTEM, data.CPU_IDLE, data.CPU_WIO]
            });
            zingchart.exec('statusChart', 'setseriesvalues', {
                graphid: 3,
                values: [data.MEM_BUFFERS, data.MEM_CACHED, data.MEM_FREE, data.MEM_USED]
            });

        }

        function createChartData() {
            var titleUnit = 'GB';
            if (ConfigManager.getSystemName() == 'AZURE') titleUnit = 'MB'; // 2017.03.14. AZURE 는 MB로 처리하기로 함
            var scaleY = {
                "thousands-separator": ",",
                item: { "font-color": "#fff" },
                guide: {
                    visible: true,
                    "line-width": "1px",
                    "line-color": "#CCCCCC",
                    alpha: "0.2",
                    "line-style": "dashed"
                }
            };
            var scaleX = {
                zooming: true,
                placement: "default",
                maxItems: 5,
                step: "60000", //1분단위
                item: {
                    "font-color": "#fff"
                },
                guide: {
                    visible: false
                },
                tick: {
                    lineWidth: "1px"
                },
                transform: {
                    type: "date",
                    text: "%H:%i"
                }
            };

            var crosshairX = {
                "shared": true,
                "scale-label": {
                    backgroundColor: "#fff",
                    color: "#383737",
                    borderColor: "#C0C0C0",
                    "visible": true,
                    "border-width": "1px"

                },
                "plot-label": {
                    visible: true,
                    multiple: true,
                    backgroundColor: "#383737",
                    borderRadius: 1,
                    padding: 5,
                    fontSize: 11,
                    borderColor: "none"
                }
            };

            var zoom = { "shared": true, "background-color": "#3399ff" };
            var plotarea = { "marginTop": "dynamic", "marginRight": "dynamic", "marginBottom": "25", marginLeft: "50" };
            var plot = {
                "mode": "fast",
                "exact": true,
                "smartSampling": true,
                "maxNodes": 0,
                "maxTrackers": 0,
                "lineWidth": 1,
                "shadow": false,
                "marker": {
                    "type": "none",
                    "shadow": false
                }
            };
            var tooltip = { "visible": false };

            var noData = {
                "color": "#fff",
                "margin-top": "7%",
                "font-size": "16px",
                "background-color": "none",
                "text": ""
            };

            var graphset = {
                "layout": "4x1",
                "graphset": [{
                        "gui": {
                            "context-menu": {
                                "visible": "false"
                            },
                        },
                        "type": "line",
                        theme: 'dark',
                        backgroundColor: "transparent",
                        "title": { "text": "Load Average", "font-size": 15, "font-color": "#fff", "margin-top": 10 },
                        "zoom": zoom,
                        "chart": { "margin-top": 35, "margin-bottom": 20 },
                        "preview": { "position": "0 0", "height": 15, marginRight: 20 },
                        "tooltip": tooltip,
                        "crosshair-x": crosshairX,
                        "scale-x": scaleX,
                        "scale-y": scaleY,
                        "plot": plot,
                        "plotarea": { marginTop: "40", marginLeft: "50", marginRight: "20", marginBottom: "28" },
                        "no-data": noData,
                        "series": [{
                                "line-color": "#00c853",
                                "text": "LOAD_AVG_ONE",
                                guideLabel: {
                                    "text": "%t : %V",
                                    "font-color": "#333",
                                    "font-size": "10px",
                                    "background-color": "#fff",
                                    "border-color": "#00c853"
                                }
                            },
                            {
                                "line-color": "#ff6600",
                                "text": "LOAD_AVG_FIVE",
                                guideLabel: {
                                    "text": "%t : %V",
                                    "font-color": "#333",
                                    "font-size": "10px",
                                    "background-color": "#fff",
                                    "border-color": "#ff6600"
                                }
                            },
                            {
                                "line-color": "#ff3d00",
                                "text": "LOAD_AVG_FIFTEEN",
                                guideLabel: {
                                    "text": "%t : %V",
                                    "font-color": "#333",
                                    "font-size": "10px",
                                    "background-color": "#fff",
                                    "border-color": "#ff3d00"
                                }
                            }
                        ]
                    },
                    {
                        "gui": {
                            "context-menu": {
                                "visible": "false"
                            }
                        },
                        "type": "line",
                        theme: 'dark',
                        "chart": { "margin-top": 30, "margin-bottom": 35 },
                        backgroundColor: "transparent",
                        "title": {
                            "text": "Traffic Usage(" + titleUnit + ")",
                            "font-size": 15,
                            "font-color": "#fff",
                            "padding-top": -5
                        },
                        "zoom": zoom,
                        "tooltip": tooltip,
                        "crosshair-x": crosshairX,
                        "scale-x": scaleX,
                        "scale-y": scaleY,
                        "plot": plot,
                        "plotarea": plotarea,
                        "no-data": noData,
                        "series": [{
                                "line-color": "#00c853",
                                "text": "BYTES_IN",
                                guideLabel: {
                                    "text": "%t : %V",
                                    "font-color": "#333",
                                    "font-size": "10px",
                                    "background-color": "#fff",
                                    "border-color": "#00c853"
                                }
                            },
                            {
                                "line-color": "#ff6600",
                                "text": "BYTES_OUT",
                                guideLabel: {
                                    "text": "%t : %V",
                                    "font-color": "#333",
                                    "font-size": "10px",
                                    "background-color": "#fff",
                                    "border-color": "#ff6600"
                                }
                            }
                        ]
                    },
                    {
                        "gui": {
                            "context-menu": {
                                "visible": "false"
                            }
                        },
                        "type": "line",
                        theme: 'dark',
                        "chart": { "margin-top": 30, "margin-bottom": 35 },
                        backgroundColor: "transparent",
                        "title": { "text": "CPU Usage", "font-size": 15, "font-color": "#fff", "padding-top": -5 },
                        "tooltip": tooltip,
                        "crosshair-x": crosshairX,
                        "zoom": zoom,
                        "scale-x": scaleX,
                        "scale-y": scaleY,
                        "plot": plot,
                        "plotarea": plotarea, //"CPU_USER","CPU_SYSTEM","CPU_IDLE","CPU_WIO"
                        "no-data": noData,
                        "series": [{
                                "line-color": "#00c853",
                                "text": "CPU_USER",
                                guideLabel: {
                                    "text": "%t : %V",
                                    "font-color": "#333",
                                    "font-size": "10px",
                                    "background-color": "#fff",
                                    "border-color": "#00c853"
                                }
                            },
                            {
                                "line-color": "#ff6600",
                                "text": "CPU_SYSTEM",
                                guideLabel: {
                                    "text": "%t : %V",
                                    "font-color": "#333",
                                    "font-size": "10px",
                                    "background-color": "#fff",
                                    "border-color": "#ff6600"
                                }
                            },
                            {
                                "line-color": "#ff3d00",
                                "text": "CPU_IDLE",
                                guideLabel: {
                                    "text": "%t : %V",
                                    "font-color": "#333",
                                    "font-size": "10px",
                                    "background-color": "#fff",
                                    "border-color": "#ff3d00"
                                }
                            },
                            {
                                "line-color": "#ffc000",
                                "text": "CPU_WIO",
                                guideLabel: {
                                    "text": "%t : %V",
                                    "font-color": "#333",
                                    "font-size": "10px",
                                    "background-color": "#fff",
                                    "border-color": "#ffc000"
                                }
                            }
                        ]
                    },
                    {
                        "gui": {
                            "context-menu": {
                                "visible": "false"
                            }
                        },
                        "type": "line",
                        theme: 'dark',
                        "chart": { "margin-top": 30, "margin-bottom": 35 },
                        backgroundColor: "transparent",
                        "title": { "text": "Memory Usage(GB)", "font-size": 15, "font-color": "#fff", "padding-top": -5 },
                        "zoom": zoom,
                        "crosshair-x": crosshairX,
                        "scale-x": scaleX,
                        "scale-y": scaleY,
                        "plot": plot,
                        "tooltip": tooltip,
                        "plotarea": plotarea,
                        "no-data": noData,
                        "series": [{
                                "line-color": "#00c853",
                                "text": "MEM_BUFFERS",
                                guideLabel: {
                                    "text": "%t : %V",
                                    "font-color": "#333",
                                    "font-size": "10px",
                                    "background-color": "#fff",
                                    "border-color": "#00c853"

                                }
                            },
                            {
                                "line-color": "#ff6600",
                                "text": "MEM_CACHED",
                                guideLabel: {
                                    "text": "%t : %V",
                                    "font-color": "#333",
                                    "font-size": "10px",
                                    "background-color": "#fff",
                                    "border-color": "#ff6600"
                                }
                            },
                            {
                                "line-color": "#ff3d00",
                                "text": "MEM_FREE",
                                guideLabel: {
                                    "text": "%t : %V",
                                    "font-color": "#333",
                                    "font-size": "10px",
                                    "background-color": "#fff",
                                    "border-color": "#ff3d00"
                                }
                            },
                            {
                                "line-color": "#ffc000",
                                "text": "MEM_USED",
                                guideLabel: {
                                    "text": "%t : %V",
                                    "font-color": "#333",
                                    "font-size": "10px",
                                    "background-color": "#fff",
                                    "border-color": "#ffc000",
                                    "thousandsSeparator": ','
                                }
                            }
                        ]
                    }
                ]
            };

            return graphset;
        }


        function textAlignFunc(params) {
            return { "text-align": "center", "vertical-align": "middle" };
        }

        function getData() {
            var param = {};
            param.systemSeq = systemSeq;
            DataService.httpPost("/activities/system/status/status_hosts_list", param, getStatusHostListResult, loader);
        }

        function getSocketStatus() {
            var s_param = {
                "function": "getSystemStatus",
                "resultEvent": "GET_SYSTEM_STATUS_EVENT",
                "systemSeq": systemSeq
            };
            WebSocketService.callRequest(s_param);
        }

        function getSocketGrid() {
        	showMySpinner();
            var g_param = {
                "function": "getSystemStatusGrid",
                "resultEvent": "GET_SYSTEM_STATUS_GRID_EVENT",
                "systemSeq": systemSeq
            };
            WebSocketService.callRequest(g_param);
        }

        function getSocketDiskAllGrid() {        	
            var d_param = {
                "function": "getDiskUsage",
                "resultEvent": "GET_SYSTEM_STATUS_DISKALL_GRID_EVENT",
                "systemSeq": systemSeq
            };
            WebSocketService.callRequest(d_param);
        }

        function getSocketChart(zoom, key) {
            chartData = {};
            var c_param = [{
                "metricData": [{
                    "resultEvent": "GET_SYSTEM_STATUS_CHART_EVENT",
                    "period": "180",
                    "systemSeq": systemSeq,
                    "metrics": ["BYTES_IN", "BYTES_OUT", "MEM_BUFFERS", "MEM_CACHED", "MEM_FREE", "CPU_USER", "CPU_SYSTEM", "CPU_IDLE", "CPU_WIO"]
                }]
            }];
            var l_param = [{
                "function": "getSystemStatusLoadAvg",
                "systemSeq": systemSeq,
                "resultEvent": "GET_SYSTEM_STATUS_CHART_EVENT",
                "metricData": [{}]
            }];
            var m_param = [{
                "function": "getMemoryUsed",
                "systemSeq": systemSeq,
                "resultEvent": "GET_SYSTEM_STATUS_CHART_EVENT",
                "metricData": [{}]
            }];
            if (zoom == true && key == "xmin" && xmin > 0) {
                c_param[0].metricData[0].endTime = String(xmin / 1000);
                l_param[0].metricData[0].endTime = String(xmin / 1000);
                m_param[0].metricData[0].endTime = String(xmin / 1000);
            } else if (zoom == true && key == "xmax" && xmax > 0) {
                var end = moment(xmax).add(3, 'hours').unix().valueOf();
                c_param[0].metricData[0].endTime = String(end);
                l_param[0].metricData[0].endTime = String(end);
                m_param[0].metricData[0].endTime = String(end);
            }

            WebSocketService.callRequest(l_param);
            WebSocketService.callRequest(c_param);
            WebSocketService.callRequest(m_param);
        }

        function getAlarmList() {
            AlarmManager.getAlarms(statusSystemCtrl.filter).then(function(data) {
                onGetGridAlarmDataResultHandler(data);
            });
        }

        function onGetGridAlarmDataResultHandler(data) {
            if (data == null)
                return;

            statusSystemCtrl.selectedList = getCheckedAlarmSeqList();
            statusSystemCtrl.alarmGridData = data;

            var messageGroup = _.groupBy(statusSystemCtrl.alarmGridData, "occurMessage");
            statusSystemCtrl.data.UNREACHABLE = 0;
            for (var s in messageGroup) {
                if (s.indexOf("unreachable") > -1) {
                    statusSystemCtrl.data.UNREACHABLE = (messageGroup[s] != null && messageGroup[s].length != null) ? messageGroup[s].length : 0;
                    statusSystemCtrl.data.HOST_CNT = statusSystemCtrl.data.HOST_CNT - statusSystemCtrl.data.UNREACHABLE;
                    break;
                }
            }

            ap($scope);
        }

        function getCheckedAlarmSeqList() {
            return Object.keys(selectedAlarm);
        }

        function setSelectedAlarm(value) {
            if (value == null || value.length < 1) {
                selectedAlarm = {};
                return;
            }

            selectedAlarm = _.indexBy(_.pluck(value, 'data'), 'alarmSeq');

            var l = value.length;
            for (var key in selectedAlarm) {

                var exist = false;
                for (var i = 0; i < l; i++) {
                    var data = value[i].data;
                    if (key == data.alarmSeq) {
                        exist = true;
                        selectedAlarm[data.alarmSeq] = value[i].data;
                        break;
                    }
                }

                if (!exist)
                    delete selectedAlarm[key];
            }
        }

        function getStatusHostListResult(data) {
            hostList = data.data.appl;
            getSocketStatus();

            if (chartRefresh == true)
                getSocketChart();

            getSocketGrid();
            getSocketDiskAllGrid();

            $timeout((function() {
                getAlarmList();
            }), 500);
            loader = false;
            statusSystemCtrl.data.HOST_CNT = hostList != null ? hostList.length : 0;
        }

        function onChangeSystemGroupIdEventHandler(event, data) {
            if (data == null)

                return;

            loader = true;
            systemSeq = ConfigManager.getSystemSeq();
            statusSystemCtrl.systemName = ConfigManager.getSystemName();
            createTimer();
            getData();
            statusSystemCtrl.chartData = createChartData();
        }

        function initialize() {

            systemSeq = ConfigManager.getSystemSeq();
            statusSystemCtrl.systemName = ConfigManager.getSystemName();
            addEventListener();
            createTimer();
            getData();
            statusSystemCtrl.chartData = createChartData();

        }

        function addEventListener() {
            unbind = [
                $scope.$on(ConfigManager.getEvent("CHANGE_SYSTEM_SEQ_EVENT"), onChangeSystemGroupIdEventHandler),
                $scope.$on(ConfigManager.getEvent("GET_SYSTEM_STATUS_EVENT"), getSystemStatusEventHandler),
                $scope.$on(ConfigManager.getEvent("GET_SYSTEM_STATUS_CHART_EVENT"), getSystemStatusChartEventHandler),
                $scope.$on(ConfigManager.getEvent("GET_SYSTEM_STATUS_GRID_EVENT"), getSystemStatusGridEventHandler),
                $scope.$on(ConfigManager.getEvent("GET_SYSTEM_STATUS_DISKALL_GRID_EVENT"), getSystemStatusDiskAllGridEventHandler),
                $scope.$on('$destroy', destroy)
            ];
        }

        function createTimer() {
            if (TIMER != null) {
                clearInterval(TIMER);
                TIMER = null;
            }
            TIMER = setInterval(getData, INTERVAL_TIME);
        }


        function destroy() {
            unbind.forEach(function(fn) {
                fn();
            });
            clearInterval(TIMER);
            TIMER = null;
            angular.element('.stats-display').html('');
            hideMySpinner();
        }

        function showMySpinner() {
            if (!myBlockUI) {
                myBlockUI = $('.mu-content').block({
                    message: null,
                    overlayCSS: {
                        opacity: 0
                    }
                });
            }

            let opts = {
                lines: 12, // The number of lines to draw
                length: 19, // The length of each line
                width: 10, // The line thickness
                radius: 30, // The radius of the inner circle
                corners: 1, // Corner roundness (0..1)
                rotate: 0, // The rotation offset
                direction: 1, // 1: clockwise, -1: counterclockwise
                color: '#000', // #rgb or #rrggbb or array of colors
                speed: 1, // Rounds per second
                trail: 60, // Afterglow percentage
                shadow: false, // Whether to render a shadow
                hwaccel: true, // Whether to use hardware acceleration
                className: 'spinner', // The CSS class to assign to the spinner
                zIndex: 2e9, // The z-index (defaults to 2000000000)
                top: '50%', // Top position relative to parent
                left: '50%', // Left position relative to parent
                scale: 0.5
            };

            mySpinnerTarget = document.getElementById('indicator');
            mySpinner = new Spinner(opts).spin(mySpinnerTarget);

            mySpinner.spin(mySpinnerTarget);
        }

        function hideMySpinner() {
            $('.mu-content').unblock();
            myBlockUI = null;
            $('#indicator').children().remove();
            if (mySpinner != null)
                mySpinner.stop(mySpinnerTarget);
        }

        initialize();
    }]);
});