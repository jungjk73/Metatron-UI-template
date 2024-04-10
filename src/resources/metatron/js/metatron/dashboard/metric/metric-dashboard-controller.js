define(["app", "moment"], function(app, moment) {
  app.controller("MetricDashboardCtrl", ["$rootScope", "$scope", "$state", "$timeout", "$filter", "$interval", "$controller", "$q", "ConfigManager", "WebSocketService", "DataService", "AlarmManager", "CommonUtil", "ngDialog", "GridRenderer",
    function($rootScope, $scope, $state, $timeout, $filter, $interval, $controller, $q, ConfigManager, WebSocketService, DataService, AlarmManager, CommonUtil, ngDialog, GridRenderer) {
      "use strict";

      // property
      let metricDashboardCtrl = this;
      let INTERVAL_TIME = (1000 * 20) * 1;
      let TIMER;
      let systemSeq = "";
      let hostCount = 0;
      let last;
      let lastNode;
      let center = {
        "text-align": "center"
      };
      let heatMapNodeMap = {};
      let unbind = [];
      let __interval;

      let alarmLevel = ['OK', 'MN', 'MJ', 'CR'];

      let cursor_thread;

      let colorArr = ['#00c853', '#ff3d00'];

      metricDashboardCtrl.columns = {
        "live": [{
            "headerName": "Insert Time",
            "field": "insertTime",
            "cellStyle": center,
            width: 140,
            "minWidth": 140
          },
          {
            "headerName": "System Name",
            "field": "systemName",
            "cellStyle": center,
            width: 185,
            "cellRenderer": GridRenderer.tooltipRenderer
          },
          {
            "headerName": "Info Addr",
            "field": "infoAddr",
            "cellStyle": center,
            width: 150
          },
          {
            "headerName": "Info Secure Addr",
            "field": "infoSecureAddr",
            "cellStyle": center,
            width: 150
          },
          {
            "headerName": "Xfer Addr",
            "field": "xferAddr",
            "cellStyle": center,
            width: 150
          },
          {
            "headerName": "Last Contact",
            "field": "lastContact",
            "cellStyle": center,
            width: 120,
            "cellRenderer": GridRenderer.numberFormatter
          },
          {
            "headerName": "Used Space",
            "field": "usedSpace",
            "cellStyle": center,
            width: 150,
            "cellRenderer": GridRenderer.numberFormatter
          },
          {
            "headerName": "Admin State",
            "field": "adminState",
            "cellStyle": center,
            width: 100
          },
          {
            "headerName": "Non Dfs Used Space",
            "field": "nonDfsUsedSpace",
            "cellStyle": center,
            width: 150,
            "cellRenderer": GridRenderer.numberFormatter
          },
          {
            "headerName": "Capacity",
            "field": "capacity",
            "cellStyle": center,
            width: 150,
            "cellRenderer": GridRenderer.numberFormatter
          },
          {
            "headerName": "Num Blocks",
            "field": "numBlocks",
            "cellStyle": center,
            width: 100,
            "cellRenderer": GridRenderer.numberFormatter
          },
          {
            "headerName": "Version",
            "field": "version",
            "cellStyle": center,
            width: 100,
            "minWidth": 100
          },
          {
            "headerName": "Used",
            "field": "used",
            "cellStyle": center,
            width: 150,
            "cellRenderer": GridRenderer.numberFormatter
          },
          {
            "headerName": "Remaining",
            "field": "remaining",
            "cellStyle": center,
            width: 150,
            "cellRenderer": GridRenderer.numberFormatter
          },
          {
            "headerName": "Blocks Scheduled",
            "field": "blocksScheduled",
            "cellStyle": center,
            width: 150,
            "cellRenderer": GridRenderer.numberFormatter
          },
          {
            "headerName": "Block Pool Used",
            "field": "blockPoolUsed",
            "cellStyle": center,
            width: 150,
            "cellRenderer": GridRenderer.numberFormatter
          },
          {
            "headerName": "Block Pool Used Percent",
            "field": "blockPoolUsedPercent",
            "cellStyle": center,
            width: 150,
            "cellRenderer": GridRenderer.numberFormatter
          },
          {
            "headerName": "Vol Fails",
            "field": "volFails",
            "cellStyle": center,
            width: 100,
            "cellRenderer": GridRenderer.numberFormatter
          }
        ],
        "dead": [{
            "headerName": "Insert Time",
            "field": "insertTime",
            "cellStyle": center,
            width: 140,
            "minWidth": 140
          },
          {
            "headerName": "System Name",
            "field": "systemName",
            "cellStyle": center,
            width: 185
          },
          {
            "headerName": "Last Contact",
            "field": "lastContact",
            "cellStyle": center,
            width: 120,
            "cellRenderer": GridRenderer.numberFormatter
          },
          {
            "headerName": "Decommissined",
            "field": "decommissined",
            "cellStyle": center,
            width: 160,
            "cellRenderer": GridRenderer.numberFormatter
          }
        ]
      };

      metricDashboardCtrl.hdfsToggle = 'pie';

      // method
      metricDashboardCtrl.chartZoomOut = function(id) {      
        if(id == 'loadavg') {
        	if (metricDashboardCtrl.chart.loadAverageList && metricDashboardCtrl.chart.loadAverageList.length > 0)
            metricDashboardCtrl.chart.lineOption = getLineChartOption();
        }else {
        	zingchart.exec(id, 'viewall');
        }
      };

      metricDashboardCtrl.pieChartClickHandler = function(event) {
        let plotInfo = zingchart.exec(event.id, 'getobjectinfo', {
          object: 'plot',
          plotindex: event.plotindex
        });

        if (plotInfo == null)
          plotInfo = {};

        if (plotInfo["backgroundColor1"] == null)
          plotInfo.backgroundColor1 = "#00C853";

        zingchart.exec(event.id, 'updateobject', {
          type: 'label',
          id: 'lbPieTop',
          data: {
            text: "<strong style='font-size:15px;color:#fff;'>" + CommonUtil.numberFormatter(event.text) + " TB</strong><br/>"
          }
        });
        zingchart.exec(event.id, 'updateobject', {
          type: 'label',
          id: 'lbPieBottom',
          data: {
            text: "<strong style='color:" + plotInfo.backgroundColor1 + ";'>%npv%</strong>"
          }
        });
      };

      metricDashboardCtrl.dataNodePopupHandler = function(type) {

        metricDashboardCtrl.pop = {};
        // metricDashboardCtrl.pop.width = (type != null && type == "dead") ? "width:580px;" : "width:750px;";
        metricDashboardCtrl.pop.width = (type != null && type == "dead") ? 580 : 1000;
        metricDashboardCtrl.pop.left = 'calc(100%/2 - ' + (metricDashboardCtrl.pop.width / 2) + 'px)';
        metricDashboardCtrl.pop.type = type[0].toUpperCase() + type.substring(1, type.length);
        // metricDashboardCtrl.pop.gridWidth = (type != null && type == "dead") ? "width:550px;" : "width:710px;";
        metricDashboardCtrl.pop.gridWidth = (type != null && type == "dead") ? "width:550px;" : "width:950px;";
        metricDashboardCtrl.pop.gridColumns = metricDashboardCtrl.columns[type];

        // 그리드 정보 조회
        let param = {};
        param.type = type;
        param.systemSeq = systemSeq;

        DataService.httpPost("/dashboard/metric/getDataNodeInfo", param, onGetDataNodeInfoResultHandler);
      };

      metricDashboardCtrl.changeViewType = function(type, event) {
        metricDashboardCtrl.viewType = type;

        if (type == "heatmap")
          return;

        // LoadAvg 차트 width값을 먼저 로드된 heatmap width에 맞춰서 resize.
        let w = $("#heatmapArea").css('width');
        zingchart.exec("loadavg", 'resize', {
          'width': w
        });
      };

      metricDashboardCtrl.heatmapMouseHandler = function(data) {
        if (data == null)
          return;

        // let now = new Date().getTime();
        // let diff = (now - last);
        // let moving = diff < 200;
        // last = now;
        lastNode = data;
        // if (moving || diff < 3000)
        // 	return;

        heatMapNodeMap = data;
        // getHostInfo();

        $timeout.cancel(cursor_thread);
        cursor_thread = $timeout(getHostInfo, 300);
      };

      metricDashboardCtrl.closeAllTooltip = function() {
        $timeout.cancel(cursor_thread);
        $.powerTip.hide();
      };

      // NameNode 마우스 오버시 Host Name, IP 툴팁으로 보여준다
      metricDashboardCtrl.getNameNodeInfo = function(type) {
        if (type == 'active') {
          if (metricDashboardCtrl.data.activeIp !== undefined) {
            $.powerTip.show($('#namenodeActive'));
          }

        } else {
          if (metricDashboardCtrl.data.standbyIp !== undefined) {
            $.powerTip.show($('#namenodeStandby'));
          }
        }
      };

      // Resource Manager Node Active 마우스 오버시 툴팁
      metricDashboardCtrl.getResourceNodeInfo = function(type) {
        if (metricDashboardCtrl.data.nodeActiveCount !== 0) {
          $.powerTip.show($('#resourceActiveNode'));
        }
      };

      // 24 Hour Job - total 클릭하면 JobHistory 로 이동
      metricDashboardCtrl.goJobHistory = function(type, schType) {

        if (schType == 'yarn') {
          if (type == 'over10m') {
            sessionStorage.setItem("jobType", "yarnOver10m");
          } else if (type == 'fail') {
            sessionStorage.setItem("jobType", "yarnFail");
          } else {
            sessionStorage.setItem("jobType", "yarnTotal");
          }
        } else if (schType == 'presto') {
          if (type == 'finished') {
            sessionStorage.setItem("jobType", "prestoFinished");
          } else if (type == 'fail') {
            sessionStorage.setItem("jobType", "prestoFail");
          } else {
            sessionStorage.setItem("jobType", "prestoTotal");
          }
        }


        $state.go('/activities/job/history');
        $rootScope.$broadcast(ConfigManager.getEvent("SELECT_MENU_EVENT"), {
          path: '/activities/job/history',
          mode: 'header',
          param: {
            'menu': schType,
            'period': '24'
          }
        });

      };


      metricDashboardCtrl.showMemoryPopup = function() {
        let param = {};
        param.systemSeq = ConfigManager.getSystemSeq();
        DataService.httpPost("/dashboard/metric/getMemoryStatus", param, function(result) {

          if (result.result != 1) {
            alert('Fail to get memory list');
            return;
          }

          let _columns = [{
              "headerName": "System Name",
              "field": "system_name",
              "cellStyle": center,
              width: 185
            },
            {
              "headerName": "ID",
              "field": "id",
              "cellStyle": center,
              width: 180
            },
            {
              "headerName": "State",
              "field": "state",
              "cellStyle": center,
              width: 105
            },
            {
              "headerName": "Rack",
              "field": "rack",
              "cellStyle": center,
              width: 105
            },
            {
              "headerName": "Node Address",
              "field": "node_http_address",
              "cellStyle": center,
              width: 180
            },
            {
              "headerName": "Used Mem(GB)",
              "field": "used_memory",
              "cellStyle": center,
              width: 120
            },
            {
              "headerName": "Avail Mem(GB)",
              "field": "avail_memory",
              "cellStyle": center,
              width: 120
            }
          ];

          openGridPopup(_columns, "Memory Status", result.data, 1040, 400);


        }, false);

      };

      metricDashboardCtrl.showCPUPopup = function() {
        let param = {};
        param.systemSeq = ConfigManager.getSystemSeq();
        DataService.httpPost("/dashboard/metric/getCPUStatus", param, function(result) {

          if (result.result != 1) {
            alert('Fail to get CPU list');
            return;
          }

          let _columns = [{
              "headerName": "System Name",
              "field": "system_name",
              "cellStyle": center,
              width: 185
            },
            {
              "headerName": "ID",
              "field": "id",
              "cellStyle": center,
              width: 180
            },
            {
              "headerName": "State",
              "field": "state",
              "cellStyle": center,
              width: 105
            },
            {
              "headerName": "Rack",
              "field": "rack",
              "cellStyle": center,
              width: 105
            },
            {
              "headerName": "Node Address",
              "field": "node_http_address",
              "cellStyle": center,
              width: 180
            },
            {
              "headerName": "Used vCore",
              "field": "used_virtual_cores",
              "cellStyle": center,
              width: 100,
              "cellRenderer": GridRenderer.numberFormatter
            },
            {
              "headerName": "Avail vCore",
              "field": "available_virtual_cores",
              "cellStyle": center,
              width: 100,
              "cellRenderer": GridRenderer.numberFormatter
            }
          ];

          openGridPopup(_columns, "vCore Status", result.data, 990, 400);


        }, false);

      };

      metricDashboardCtrl.showNetworkPopup = function() {
        WebSocketService.callRequest({
          "function": "getMetricDashboardByteInOut",
          "resultEvent": "GET_METRIC_DASHBOARD_EVENT",
          "systemSeq": systemSeq
        });
      };

      metricDashboardCtrl.activeLostNodeHandler = function(type) {
        if (type == null || type == "")
          return;

        if (type.toLowerCase() == 'active') {

          DataService.httpPost("/service/yarn/status/getYarn" + type + "Nodes", {
            "systemSeq": systemSeq
          }, function(result) {
            let data = result.data;
            console.log(data);

            let _column = [{
                "headerName": "System Name",
                "field": "systemName",
                "cellStyle": center,
                "width": 185,
                "min-width": 185
              },
              {
                "headerName": "Rack",
                "field": "rack",
                "cellStyle": center,
                "width": 100,
                "min-width": 100
              },
              {
                "headerName": "Status",
                "field": "state",
                "cellStyle": center,
                "width": 100,
                "min-width": 100
              },
              {
                "headerName": "Node ID",
                "field": "nodeId",
                "cellStyle": center,
                "width": 180,
                "min-width": 180
              },
              {
                "headerName": "Address",
                "field": "nodeHttpAddress",
                "cellStyle": center,
                "width": 180,
                "min-width": 180
              },
              {
                "headerName": "Health Update",
                "field": "lastHealthUpdate",
                "cellStyle": center,
                "width": 150,
                "min-width": 150,
                "cellRenderer": GridRenderer.dateFormatter
              },
              {
                "headerName": "Health Report",
                "field": "healthReport",
                "cellStyle": center,
                "width": 150,
                "min-width": 150,
                "cellRenderer": GridRenderer.tooltipRenderer
              },
              {
                "headerName": "Node Manager Version",
                "field": "nodemanagerVersion",
                "cellStyle": center,
                "width": 180,
                "min-width": 180
              },
              {
                "headerName": "Containers",
                "field": "numContainers",
                "cellStyle": center,
                "width": 150,
                "min-width": 150,
                "cellRenderer": GridRenderer.numberFormatter
              },
              {
                "headerName": "Used Memory",
                "field": "usedMemory",
                "cellStyle": center,
                "width": 125,
                "min-width": 125,
                "cellRenderer": GridRenderer.numberFormatter
              },
              {
                "headerName": "Available Memory",
                "field": "availableMemory",
                "cellStyle": center,
                "width": 150,
                "min-width": 150,
                "cellRenderer": GridRenderer.numberFormatter
              }
            ];
            let _title = type + '  Nodes Information';
            openGridPopup(_column, _title, data, 1000, 500);
          });
        } else if (type.toLowerCase() == 'dead') {

          DataService.httpPost("/dashboard/metric/getDeadSystemInfo", {
            "systemSeq": systemSeq
          }, function(result) {
            let data = result.data;
            console.log(data);

            let _column = [{
                "headerName": "System Name",
                "field": "system_name",
                "cellStyle": center,
                width: 185,
                "min-width": 185
              },
              {
                "headerName": "System IP",
                "field": "system_ip",
                "cellStyle": center,
                width: 150,
                "min-width": 150
              },
              {
                "headerName": "Status",
                "field": "process_status",
                "cellStyle": center,
                width: 150,
                "min-width": 150
              }
            ];
            let _title = type + '  Nodes Information';
            openGridPopup(_column, _title, data, 520, 500);
          });
        }
      };


      function openGridPopup(column, title, list, width, height) {
        let popup = ngDialog.open({
          template: "/common/popup/rawdata_grid_popup_template.html",
          className: "ngdialog-theme-default custom-width",
          showClose: false,
          disableAnimation: true,
          cache: false,
          closeByDocument: false,
          closeByEscape: false,
          scope: $scope,
          controller: $controller("RawDataGridPopCtrl", {
            $scope: $scope,
            columns: column,
            title: title,
            data: list,
            width: width,
            height: height
          })
        });

        let closer = $rootScope.$on('ngDialog.refresh', function(e, id) {
          if (id != popup.id) return;
          closer();
        });
      }


      // event-handler
      function destory() {
        unbind.forEach(function(fn) {
          fn();
          ngDialog.closeAll();
          clear();
          $(document).off('mouseover', '.cell-heat');
          $(document).off('mouseleave', '.cell-heat');
        });
        $('#powerTip').remove();
       
      }

      function onChangeSystemSeqEventHandler(event, data) {
        if (data == null)
          return;

        destoryTooltip();

        systemSeq = ConfigManager.getSystemSeq();

        createTimer();
        metricDashboardCtrl.data = {};
        initData();
        getHeatmapHostData();
        getData();
        metricDashboardCtrl.viewType = 'heatmap';
        getSystemStatusSocketData();
        intervalSearch();
      }

      // WebSocket 에서 받은 후 처리
      function onGetMetricDashboardEventHandler(event, data) {
        if (data.function == "getMetricDashboard") {
          if (data.hasOwnProperty("exceptionMassage") || !data.hasOwnProperty("searchResults")) {
            initData();
          } else {
            mergeSocketData(data);
          }
          ap($scope);

        } else if (data.function == "getMetricDashboardByteInOut") {
          if (data.hasOwnProperty("exceptionMassage") || !data.hasOwnProperty("searchResults")) {
            return;
          }

          let columns = [{
              "headerName": "Host Name",
              "field": "host_name",
              "cellStyle": center,
              width: 185
            },
            {
              "headerName": "DateTime",
              "field": "date",
              "cellStyle": center,
              width: 150
            },
            {
              "headerName": "Network In",
              "field": "network_in",
              "cellStyle": center,
              width: 150
            },
            {
              "headerName": "Network Out",
              "field": "network_out",
              "cellStyle": center,
              width: 150
            }
          ];
          let title = 'Network In/Out';
          let list = [];

          let listData = data.searchResults;

          let keySet = (Object.keys(listData)).sort();
          for (let i = 0; i < keySet.length; i++) {
            let hostName = keySet[i];
            let hostObj = listData[hostName];
            let _data = {
              host_name: hostName,
              date: '',
              network_in: '',
              network_out: ''
            };
            if (hostObj && hostObj != '' && hostObj.BYTES_IN && hostObj.BYTES_OUT) {
              let bytes_in = hostObj.BYTES_IN[0];
              let bytes_out = hostObj.BYTES_OUT[0];
              _data.date = moment(bytes_in[0]).format('YYYY/MM/DD HH:mm:ss');
              _data.network_in = CommonUtil.formatBytes(bytes_in[1], 2, 'MB', true);
              _data.network_out = CommonUtil.formatBytes(bytes_out[1], 2, 'MB', true);
            }
            list.push(_data);
          }

          if (columns == null || columns.length < 1)
            return;

          let popup = ngDialog.open({
            template: "/common/popup/rawdata_grid_popup_template.html",
            className: "ngdialog-theme-default custom-width",
            showClose: false,
            disableAnimation: true,
            cache: false,
            closeByDocument: false,
            closeByEscape: false,
            scope: $scope,
            controller: $controller("RawDataGridPopCtrl", {
              $scope: $scope,
              columns: columns,
              title: title,
              data: list,
              width: 670,
              height: 400
            })
          });

          let closer = $rootScope.$on('ngDialog.refresh', function(e, id) {
            if (id != popup.id) return;
            closer();
          });
        }

      }



      function onDashboardDataResultHandler(data) {
        if (data == null || data.data == null) {
          namenodeEmptyData();
          return;
        }

        //console.log('#### DB Result ',data.data);

        let result = data.data;

        angular.merge(metricDashboardCtrl.data, result);
        makePieChartData();

        makeTrendChartData();

        metricDashboardCtrl.data.standbyTxtClass = 'txt-green';
        metricDashboardCtrl.data.activeTxtClass = 'txt-green';
        let compareSeq = '';
        let standbyData = result.standby;
        let activeData = result.active;

        // active/standby host name
        if (standbyData != null) {
          metricDashboardCtrl.data.standby = result.standby;
          metricDashboardCtrl.data.standbyIp = result.standbyIp;
          metricDashboardCtrl.data.standbyHostName = result.standbyHostName;
        } else {
          metricDashboardCtrl.data.standby = '-';
          metricDashboardCtrl.data.standbyIp = '';
          metricDashboardCtrl.data.standbyHostName = '';
          if (activeData != null) {
            compareSeq = result.activeSeq;
          }
        }
        if (activeData != null) {
          metricDashboardCtrl.data.active = result.active;
          metricDashboardCtrl.data.activeIp = result.activeIp;
          metricDashboardCtrl.data.activeHostName = result.activeHostName;
        } else {
          metricDashboardCtrl.data.active = '-';
          metricDashboardCtrl.data.activeIp = '';
          metricDashboardCtrl.data.activeHostName = '';
          if (standbyData != null) {
            compareSeq = result.standbySeq;
          }
        }

        if (standbyData == null || activeData == null) {
          DataService.httpPost("/dashboard/metric/getNamenodeStateInfo", {
            systemSeq: systemSeq
          }, function(result) {
            if (result.result != 1) return;

            // process_status == 'Alive' 면 다시 호출 getData()
            // process_status == 'Dead' 면 txt-red 처리, Dead 표시
            if (result.data.length > 0) {
              for (let k = 0; k < result.data.length; k++) {
                let process = result.data[k];
                if (Number(compareSeq) != process.system_seq && process.process_status.toLowerCase() == 'alive') {
                  let temp_timer = $timeout(function() {
                    getData();
                    $timeout.cancel(temp_timer);
                  }, 500);
                } else if (Number(compareSeq) != process.system_seq && process.process_status.toLowerCase() == 'dead') {
                  if (standbyData == null) {
                    metricDashboardCtrl.data.standbyTxtClass = 'txt-red';
                    metricDashboardCtrl.data.standby = process.process_status;
                  }
                  if (activeData == null) {
                    metricDashboardCtrl.data.activeTxtClass = 'txt-red';
                    metricDashboardCtrl.data.active = process.process_status;
                  }
                }
              }
            }

          }, false);
        }


        // NameNode 마우스 오버시 호스트 이름과 IP 툴팁 처리
        $.powerTip.destroy($('#namenodeActive'));
        $('#namenodeActive').data('powertipjq', $([
          '<div>',
          '<div class="tooltip_title align-left">',
          '<b>IP : </b>' + metricDashboardCtrl.data.activeIp,
          '<p><b>Host Name : </b>' + metricDashboardCtrl.data.activeHostName + '</p>',
          '</div>',
          '</div>'
        ].join('\n')));
        $('#namenodeActive').powerTip({
          placement: 'n',
          smartPlacement: true,
          manual: true
        });

        $.powerTip.destroy($('#namenodeStandby'));
        $('#namenodeStandby').data('powertipjq', $([
          '<div>',
          '<div class="tooltip_title align-left">',
          '<b>IP : </b>' + metricDashboardCtrl.data.standbyIp,
          '<p><b>Host Name : </b>' + metricDashboardCtrl.data.standbyHostName + '</p>',
          '</div>',
          '</div>'


        ].join('\n')));
        $('#namenodeStandby').powerTip({
          placement: 'n',
          smartPlacement: true,
          manual: true
        });


        // NameNode 마우스 오버시 호스트 이름과 IP 툴팁 처리
        $.powerTip.destroy($('#resourceActiveNode'));
        $('#resourceActiveNode').data('powertipjq', $([
          '<div>',
          '<div class="tooltip_title align-left">',
          '<b>Active : </b>' + metricDashboardCtrl.data.nodeActiveCount,
          '<p><b>Unhealthy : </b>' + metricDashboardCtrl.data.unhealthyCnt + '</p>',
          '</div>',
          '</div>'
        ].join('\n')));
        $('#resourceActiveNode').powerTip({
          placement: 'n',
          smartPlacement: true,
          manual: true
        });


        // convert unit
        metricDashboardCtrl.data.dataNode = CommonUtil.numberFormatter(metricDashboardCtrl.data.dataNode);
        metricDashboardCtrl.data.decomm = CommonUtil.numberFormatter(metricDashboardCtrl.data.decomm);
        metricDashboardCtrl.data.dead = CommonUtil.numberFormatter(metricDashboardCtrl.data.dead);
        metricDashboardCtrl.data.memTotal = CommonUtil.formatBytes(metricDashboardCtrl.data.memTotal * 1024 * 1024, 2, 'TB');
        metricDashboardCtrl.data.memUsing = CommonUtil.formatBytes(metricDashboardCtrl.data.memUsing * 1024 * 1024, 2, 'TB');
        metricDashboardCtrl.data.totalJob = CommonUtil.numberFormatter(metricDashboardCtrl.data.totalJob);
        metricDashboardCtrl.data.failJob = CommonUtil.numberFormatter(metricDashboardCtrl.data.failJob);
        metricDashboardCtrl.data.runningJob = CommonUtil.numberFormatter(metricDashboardCtrl.data.runningJob);
        metricDashboardCtrl.data.totalBlocks = CommonUtil.numberFormatter(metricDashboardCtrl.data.totalBlocks);
        metricDashboardCtrl.data.missingBlocks = CommonUtil.numberFormatter(metricDashboardCtrl.data.missingBlocks);
        metricDashboardCtrl.data.containerRunning = CommonUtil.numberFormatter(metricDashboardCtrl.data.containerRunning);
        metricDashboardCtrl.data.containerPending = CommonUtil.numberFormatter(metricDashboardCtrl.data.containerPending);
        metricDashboardCtrl.data.vcoreTotal = CommonUtil.numberFormatter(metricDashboardCtrl.data.vcoreTotal);
        metricDashboardCtrl.data.vcoreUsed = CommonUtil.numberFormatter(metricDashboardCtrl.data.vcoreUsed);

        metricDashboardCtrl.data.prestoTotalJob = CommonUtil.numberFormatter(metricDashboardCtrl.data.prestoTotalJob);
        metricDashboardCtrl.data.prestoFailJob = CommonUtil.numberFormatter(metricDashboardCtrl.data.prestoFailJob);
        metricDashboardCtrl.data.prestoFinishedJob = CommonUtil.numberFormatter(metricDashboardCtrl.data.prestoFinishedJob);
        ap($scope);
      }

      function onGetDataNodeInfoResultHandler(data) {
        if (data == null || data.data == null)
          return;

        metricDashboardCtrl.pop.gridData = data.data;
        let popup = ngDialog.open({
          template: "/dashboard/metric/popup/datanode_info_popup_template.html",
          className: "ngdialog-theme-default custom-width",
          showClose: false,
          disableAnimation: true,
          cache: false,
          closeByDocument: false,
          closeByEscape: false,
          scope: $scope
        });

        let closer = $rootScope.$on('ngDialog.refresh', function(e, id) {
          if (id != popup.id) return;
          closer();
        });
      }

      function onHeatmapDataResultHandler(data) {
        if (data == null || data.data == null) {
          metricDashboardCtrl.heatmapEmpty = true;
          return;
        }

        let d = data.data;
        if (d.clusterName == null || (d.nameNode.length == 0 && d.dataNode.length == 0)) {
          metricDashboardCtrl.heatmapEmpty = true;
          return;
        }

        metricDashboardCtrl.heatmapEmpty = false;
        metricDashboardCtrl.data.clusterName = d.clusterName;
        if (d.dataNode == null || d.dataNode.length == 0) {
          metricDashboardCtrl.data.nameNodeList = [];
          metricDashboardCtrl.data.dataNodeList = d.nameNode;
        } else {
          metricDashboardCtrl.data.nameNodeList = d.nameNode;
          metricDashboardCtrl.data.dataNodeList = d.dataNode;
        }

        // Alarm 데이터 조회
        getAlarmData();

        // heatmap event bind(tooltip)
        let temp_Timer = $timeout(function() {
          angular.element('#heatmapArea div.cell-heat').data('powertipjq', $([
            '<div>',
            '	<div class="tooltip_title"></div>',
            '	<div class="tooltip_detail">',
            '		<div class="row"><div><span class="title">CPU Usage(%)</span> : <span class="cpu"></span></div><div><span class="title">Disk Usage(%)</span> : <span class="disk"></span></div></div>',
            '		<div class="row"><div><span class="title">Byte In(MB/s)</span> : <span class="bytein"></span></div><div><span class="title">Byte Out(MB/s)</span> : <span class="byteout"></span></div></div>',
            '		<div class="row"><div><span class="title">MEM Usage(%)</span> : <span class="mem"></span></div></div>',
            '	</div>',
            '	<div class="alarms"></div>',
            '</div>'
          ].join('\n')));

          angular.element('#heatmapArea div.cell-heat').powerTip({
            placement: 's',
            smartPlacement: true,
            manual: true
          });

          angular.element('#heatmapArea div.cell-heat').on({
            powerTipRender: function() {
              getTooltipHandler(this);

              if (heatMapNodeMap.metric == null) {
                $.powerTip.show(angular.element('#node-' + heatMapNodeMap.systemSeq));
                return;
              }

              // 데이터 셋팅
              angular.element("#powerTip .tooltip_title").text(heatMapNodeMap.systemName);
              angular.element("#powerTip .severity").text(CommonUtil.getFirstUpperCase(heatMapNodeMap.severityLabel));
              angular.element("#powerTip .severity").css("color", getSeverityColor(heatMapNodeMap.severity));
              angular.element("#powerTip .time").text(heatMapNodeMap.time);
              angular.element("#powerTip .cpu").text(heatMapNodeMap.metric.CPU_USAGE);
              angular.element("#powerTip .disk").text(heatMapNodeMap.metric.DISK_USAGE);
              angular.element("#powerTip .bytein").text(heatMapNodeMap.metric.BYTES_IN);
              angular.element("#powerTip .byteout").text(heatMapNodeMap.metric.BYTES_OUT);
              angular.element("#powerTip .mem").text(heatMapNodeMap.metric.MEM_USAGE);
              ap($scope);

              // 데이터 셋팅(Alarms)
              AlarmManager.getAlarms({
                resource: heatMapNodeMap.systemName
              }).then(function(list) {
                if (list != null && list.length > 0) {
                  let len = list.length;
                  let tb = [];
                  tb.push('<table class="mu-formbox-vertical">');
                  tb.push('	<thead><tr><th>Grade</th><th>Occured Date</th><th>Message</th></thead>');
                  tb.push('	<tbody>');
                  for (let i = 0; i < len; i++) {
                    tb.push('<tr>');

                    let s = list[i].severity;
                    let sc = "txt-green";
                    if (s == 'CR') {
                      sc = "txt-red";
                    } else if (s == 'MJ') {
                      sc = "txt-orangered";
                    } else if (s == 'MN') {
                      sc = "txt-yellow";
                    }

                    tb.push('	<td style="text-align: center;"><span class="mu-icon circle ' + sc + '"></span></td>');
                    tb.push('	<td>' + moment(list[i].occurTime).format('YYYY/MM/DD HH:mm:ss') + '</td>');
                    tb.push('	<td>' + list[i].occurMessage + '</td>');
                    tb.push('</tr>');
                  }
                  tb.push('	</tbody>');
                  tb.push('</table>');
                  angular.element("#powerTip").find(".alarms").html(tb.join(''));
                }
              });
            }
          });

          angular.element('#heatmapArea div.cell-heat').mousestop(function() {
            if (heatMapNodeMap === lastNode)
              return;

            heatMapNodeMap = lastNode;
            getHostInfo();
          });

          $timeout.cancel(temp_Timer);
        }, 300);
        ap($scope);
      }

      function getSeverityColor(s) {
        if (s == "CR") {
          return "#ff3d00";
        } else if (s == "MJ") {
          return "#ff6600";
        } else if (s == "MN") {
          return "#ffc000";
        } else {
          return "#00c853";
        }
      }

      function onGetHostInfoEventHandler(event, data) {
        heatMapNodeMap.time = moment.unix(data.currentTime).format('YYYY-MM-DD HH:mm:ss');
        heatMapNodeMap.metric = data.searchResults[heatMapNodeMap.systemName];
        $.powerTip.show(angular.element('#node-' + heatMapNodeMap.systemSeq));
      }  
      // function
      function initialize() {

        systemSeq = ConfigManager.getSystemSeq();     
        addEventListener();
        createTimer();
        metricDashboardCtrl.data = {};
        initData();
        getHeatmapHostData();   

           
        
        getData();
        getSystemStatusSocketData();
        intervalSearch();
        destoryTooltip();

        metricDashboardCtrl.viewType = 'heatmap';

        $(document).on('mouseover', '.cell-heat', function(event) {
          let targetCell = event.target;
          $(targetCell).css('border', '1px solid #fff');
        });

        $(document).on('mouseleave', '.cell-heat', function() {
          $timeout.cancel(cursor_thread);
          $.powerTip.hide();
          $('.cell-heat').css('border', '0px');
        });

        $(document).on('mouseleave', '#namenodeActive', function() {
          $.powerTip.hide();
        });
        $(document).on('mouseleave', '#namenodeStandby', function() {
          $.powerTip.hide();
        });
        $(document).on('mouseleave', '#resourceActiveNode', function() {
          $.powerTip.hide();
        });

      }

      function namenodeEmptyData() {
        let obj = {};
        obj.active = "-";
        obj.heapMemoryUsed = "0";
        obj.standby = "-";
        obj.dataNode = 0;
        obj.decomm = 0;
        obj.dead = 0;
        obj.nodeActiveCount = 0;
        obj.nodeDeadCount = 0;
        obj.memTotal = "0 TB";
        obj.memUsing = "0 TB";
        obj.vcoreTotal = 0;
        obj.vcoreUsed = 0;
        obj.totalJob = 0;
        obj.failJob = 0;
        obj.over10m = 0;
        obj.capacityTotalNumber = 0;
        obj.totalBlocks = 0;
        obj.missingBlocks = 0;
        obj.stddev = 0;

        obj.prestoTotalJob = 0;
        obj.prestoFailJob = 0;
        obj.prestoFinishedJob = 0;

        angular.merge(metricDashboardCtrl.data, obj);
      }

      function makePieChartData() {
        if (metricDashboardCtrl.data == null)
          return;

        metricDashboardCtrl.data.capacityUsed = metricDashboardCtrl.data.capacityUsed + metricDashboardCtrl.data.capacityNon
        metricDashboardCtrl.data.capacityTotalNumber = CommonUtil.numberFormatter(metricDashboardCtrl.data.capacityTotal);
        let pieList = [{
            values: [Number(metricDashboardCtrl.data.capacityUsed)],
            backgroundColor: "#01C853",
            text: "Used"
          },
          // {
          // 	values: [Number(metricDashboardCtrl.data.capacityNon)],
          // 	backgroundColor: "#666A7B",
          // 	text: "None"
          // }, 
          {
            values: [Number(metricDashboardCtrl.data.capacityRemaining)],
            backgroundColor: "#3E8CFF",
            text: "Free"
          }
        ];

        metricDashboardCtrl.chart.pieOption = getPieChartOption();
        metricDashboardCtrl.chart.pieList = pieList;
        metricDashboardCtrl.pieChartClickHandler({
          "id": "pieChart",
          "plotindex": 0,
          "text": metricDashboardCtrl.data.capacityUsed
        });

        ap($scope);
      }

      function getPieChartOption() {
        let used = isNaN(Number(metricDashboardCtrl.data.capacityUsed)) ? 0 : Number(metricDashboardCtrl.data.capacityUsed);
        let total = isNaN(Number(metricDashboardCtrl.data.capacityTotal)) ? 0 : Number(metricDashboardCtrl.data.capacityTotal);
        let percent = isNaN(Math.round(used / total * 100)) ? 0 : Math.round(used / total * 100);
        return {
          plot: {
            "size": 90,
            "slice": 60,
            borderWidth: 2,
            "border-color": "#262626",
            "detach": false,
            "shadow": 0,
            "value-box": {
              visible: false
            },
            "tooltip": {
              "text": "%v TB",
              "shadow": false,
              thousandsSeparator: ","
            }
          },
          "plotarea": {
            "margin": "15px 20px 0"
          },
          "labels": [{
              "id": 'lbPieTop',
              "anchor": 'c',
              "x": "52%",
              "y": "44%",
              "fontSize": 15,
              "default-value": "TB",
              "text": "<strong style='font-size:15px;color:#fff;margin-bottom:-10px;'>" + CommonUtil.numberFormatter(used) + " TB</strong>"
            },
            {
              "id": 'lbPieBottom',
              "anchor": 'c',
              "x": "50%",
              "y": "60%",
              "fontSize": 38,
              "default-value": "%",
              "text": "<strong style='color:#00C853;'>" + percent + "%</strong>"
            }
          ]
        };
      }


      function makeTrendChartData() {
        let trendChartData = [];

        if (metricDashboardCtrl.data.trendData == null || metricDashboardCtrl.data.trendData.length < 1)
          return;


        metricDashboardCtrl.data.trendChartData = [];
        let _dataComma = [];
        let _values = [];
        for (let i = 0, j = metricDashboardCtrl.data.trendData.length; i < j; i++) {
          let value = [];
          let time = metricDashboardCtrl.data.trendData[i].insert_time;
          let used = metricDashboardCtrl.data.trendData[i].capacity_used;
          value.push(time, used);
          _values.push(value);
          _dataComma.push($filter('number')(used));
        }


        let _currValues = [];
        let _dataCommaCurr = [];
        if (metricDashboardCtrl.data.trendTotalData) {
          // _currValues.push([metricDashboardCtrl.data.trendData[0].insert_time,metricDashboardCtrl.data.trendTotalData.capacity_total]);
          // _currValues.push([metricDashboardCtrl.data.trendData[metricDashboardCtrl.data.trendData.length-1].insert_time,metricDashboardCtrl.data.trendTotalData.capacity_total]);

          for (let i = 0, j = metricDashboardCtrl.data.trendData.length; i < j; i++) {
            let value = [];
            let time = metricDashboardCtrl.data.trendData[i].insert_time;
            let used = metricDashboardCtrl.data.trendTotalData.capacity_total;
            value.push(time, used);
            _dataCommaCurr.push($filter('number')(used));
            _currValues.push(value);
          }
        }


        metricDashboardCtrl.data.trendChartData = [{
            tooltip: {
              visible: false
            },
            guideLabel: {
              text: '%t: %data-number(TB)',
              fontColor: '#00c853',
              backgroundColor: '#fff'
            },
            text: 'Capacity Used',
            lineColor: '#00c853',
            dataNumber: _dataComma,
            values: _values
          },
          {
            tooltip: {
              visible: false
            },
            guideLabel: {
              text: '%t: %data-number (TB)',
              fontColor: '#ff3d00',
              backgroundColor: '#fff'
            },
            text: 'Capacity Total',
            lineColor: '#ff3d00',
            dataNumber: _dataCommaCurr,
            values: _currValues
          }
        ];
      }

      
      function getCpuPieOption(label, data) {

        // 임계치 설정(idle은 20미만일때, 나머지는 80초과일 때 붉은색으로 출력)
        let pieColor = "#00C853";
        let value = Math.round(Number(data) / hostCount);
        if (isNaN(value)) value = 0;
        if ((label.toLowerCase() == "idle" && value < 20) || (label.toLowerCase() != "idle" && value > 80))
          pieColor = "#ff3d00";

        if (value > 100)
          value = 100;

        return {
          type: "pie",
          backgroundColor: "transparent",
          "labels": [{
              "x": "51%",
              "y": "38%",
              "anchor": 'c',
              "text": "<span style='color:#fff'>" + label + "</span>",
              "font-size": 12
            },
            {
              "x": "50%",
              "y": "60%",
              "anchor": 'c',
              "default-value": "-",
              "text": "<span style='color:" + pieColor + "'>" + value + "</span>",
              "font-size": 16
            }
          ],
          "plotarea": {
            "border": "none",
            "adjust-layout": true,
            "margin": "0 20px 0"
          },
          plot: {
            "size": 33,
            "slice": 25,
            "margin-right": 50,
            borderWidth: 0,
            "detach": false,
            "shadow": 0,
            "value-box": {
              visible: false
            }
          },
          "tooltip": {
            "text": "%v %",
            "shadow": false
          },
          "series": [{
              values: [value],
              backgroundColor: pieColor
            },
            {
              values: [(100 - value)],
              backgroundColor: "#1d243d"
            }
          ]
        };
      }

      function makeLoadAvgLineChartData() {
        if (metricDashboardCtrl.metric == null)
          return;

        metricDashboardCtrl.chart.loadAverageList = getLoadAverageData();
        metricDashboardCtrl.chart.lineOption = getLineChartOption();
      }

      function getLoadAverageData() {
        // alert(metricDashboardCtrl.metric.CPU_NUM);
        let data = metricDashboardCtrl.metric.chart;
        if (data == null || Object.keys(data).length < 1)
          return;

        // 초기화
        metricDashboardCtrl.metric.chart.x = null;

        let loadLineChart = {
          "NAMENODE_CPU": "#ffea00",
          "NAMENODE_MEMORY": "#ff6600",
          "LOAD_ONE": "#00c853",
          "MEM_USAGE": "#9da2a6"
        };
        let result = [];

        // 데이터 구조변경 : 각 NAMENODE HOST의 CPU, MEMORY 차트 추가. henry20230331
        for (let m in data) {
          if (data[m] == null || data[m] == "" || loadLineChart[m] == null)
            continue;

          if (m == 'NAMENODE_CPU' || m == 'NAMENODE_MEMORY') {
            let namenode_data = {};
            namenode_data = data[m].NAMENODES;

            for(let nn in namenode_data){
              let obj = {};
              obj.text = namenode_data[nn].HOST_NAME;
              obj.values = namenode_data[nn].y;
              obj.alpha = 0.7;
              obj.lineWidth = "1px";
              obj["line-color"] = loadLineChart[m];
              obj.guideLabel = {
                "text": "%t : %V",
                fontColor: loadLineChart[m],
                "border-color": loadLineChart[m],
                backgroundColor: "#fff"
              };
              //obj.scales = 'scale-x,scale-y-2';
              obj.guideLabel.text = '%t : %v %';
              //result.push(obj);   // 이거 풀면 그래프 나옴.
            }
          }else{
            continue;
          }
        }
        // 데이터 구조변경 NAMENODE 각 HOST의 CPU, MEMORY 차트 추가. 끝

        for (let m in data) {

          if (data[m] == null || data[m] == "" || loadLineChart[m] == null)
            continue;

          if (metricDashboardCtrl.metric.chart.x == null)
            metricDashboardCtrl.metric.chart.x = data[m].x;

          let obj = {};
          obj.text = m;
          obj.values = data[m].y;
          obj.alpha = 0.7;
          obj.lineWidth = "1px";
          obj["line-color"] = loadLineChart[m];
          obj.guideLabel = {
            "text": "%t : %V",
            fontColor: loadLineChart[m],
            "border-color": loadLineChart[m],
            backgroundColor: "#fff"
          };
          if (m == 'MEM_USEAGE') {
            obj.scales = 'scale-x,scale-y-2';
            obj.guideLabel.text = '%t : %v %';
          }
          if (m == 'NAMENODE_CPU' || m == 'NAMENODE_MEMORY') {
            obj.guideLabel.text = '%t : %v %';
          }
          result.push(obj);
        }


        if (result.length > 0 && result[0].values && result[0].values.length > 0) {
          let cpuVal = [];
          var cpuNum = parseFloat(metricDashboardCtrl.metric.CPU_NUM);
          for (let i = 0; i < result[0].values.length; i++) {
            cpuVal.push(cpuNum);
          }
          let cpuObj = {};
          cpuObj.text = 'CPU_TOTAL';
          cpuObj.values = cpuVal;
          cpuObj.alpha = 0.7;
          cpuObj.lineWidth = "2px";
          cpuObj.lineColor = '#ff3d00';
          cpuObj.guideLabel = {
            "text": "%t : %V",
            fontColor: 'red',
            "border-color": 'red',
            backgroundColor: "#fff"
          };
          result.push(cpuObj);
        }

        return result;
      }

      function getLineChartOption() {
        let option = {
          backgroundColor: "transparent",
          scaleX: {
            utc: true,
            zooming: true,
            timezone: 9,
            values: metricDashboardCtrl.metric.chart.x,
            item: {
              fontColor: "#fff"
            },
            transform: {
              type: "date",
              all: "%H:%i:%s"
            },
            guide: {
              visible: false
            }
          },
          scaleY: {
            autoFit: true,
            lineWidth: 1,
            item: {
              fontColor: "#fff"
            },
            guide: {
              visible: false
            },
            thousandsSeparator: ","
          },
          scaleY2: {
            values: "0:100:20",
            format: "%v %",
            autoFit: true,
            lineWidth: 1,
            item: {
              fontColor: "#fff"
            },
            guide: {
              visible: false
            },
            thousandsSeparator: ","
          },
          plot: {
            marker: {
              visible: false
            }
          },
          plotarea: {
            width: "100%",
            marginTop: "dynamic",
            marginBottom: "38",
            marginLeft: "dynamic",
            marginRight: "dynamic",
          },
          crosshairX: {
            lineWidth: 1,
            scaleLabel: {
              backgroundColor: "#fff",
              color: "#383737",
              borderColor: "#C0C0C0",
              borderWidth: "1px",
              width: "90px",
              height: "35px",
              transform: {
                type: "date",
                text: "%Y-%mm-%dd<br>%H:%i:%s"
              }
            },
            plotLabel: {
              visible: true,
              multiple: true
            }
          },
          series: metricDashboardCtrl.chart.loadAverageList
        };
        return option;
      }

      function addEventListener() {
        // broadcast event
        unbind = [
          $rootScope.$on(ConfigManager.getEvent("ALARM_UPDATE_EVENT"), getAlarmData),
          $scope.$on(ConfigManager.getEvent("CHANGE_SYSTEM_SEQ_EVENT"), onChangeSystemSeqEventHandler),
          $scope.$on(ConfigManager.getEvent("GET_METRIC_DASHBOARD_EVENT"), onGetMetricDashboardEventHandler),
          $scope.$on(ConfigManager.getEvent("GET_HOST_INFO_EVENT"), onGetHostInfoEventHandler),
          $scope.$on(ConfigManager.getEvent("GET_METRIC_DASHBOARD_STATUS_EVENT"), onGetMetricDashboardStatusEventHandler),
          $scope.$on(ConfigManager.getEvent("GET_METRIC_DASHBOARD_TREND_EVENT"), onGetMetricDashboardTrendEventHandler),
          $scope.$on('$destroy', destory)
        ];
      }

      function getData() {

        let param = {};
        param.systemSeq = systemSeq;

        param.trendUnit = 'tb';

        // 파티션 setting
        setPartition(param);


        // DB데이터 조회
        DataService.httpPost("/dashboard/metric/getDashboardData", param, onDashboardDataResultHandler, false);

        // RRD데이터 조회
        setTimeout(function() {
        	

          WebSocketService.callRequest({
            "function": "getMetricDashboard",
            "resultEvent": "GET_METRIC_DASHBOARD_EVENT",
            "systemSeq": systemSeq
          });
          

          // System Network Status 정보 조회
          getMetricSummarySocketData('GET_METRIC_DASHBOARD_STATUS_EVENT');

        }, 500);

        getAlarmData();
      }

      function setPartition(param) {
        if (param == null)
          param = {};

        let startTime = moment().subtract(1, 'days');
        let currentDate = moment();

        let dateArr = [];
        while (startTime <= currentDate) {
          dateArr.push("P" + startTime.format('YYYYMMDD'));
          startTime = startTime.add(1, 'days');
        }

        // setting
        param.partition = dateArr.join(",");
      }

      function getHeatmapHostData() {
        let param = {};
        param.systemSeq = systemSeq;

        DataService.httpPost("/dashboard/metric/getHeatMapData", param, onHeatmapDataResultHandler, false);
      }

      function getAlarmData() {
        AlarmManager.getAlarms({}, false).then(function(data) {
          metricDashboardCtrl.alarms = data;
          mappingAlarmData(metricDashboardCtrl.data.nameNodeList);
          mappingAlarmData(metricDashboardCtrl.data.dataNodeList);
        });
      }

      function mappingAlarmData(list) {
        let alarms = metricDashboardCtrl.alarms;
        if (list == null || alarms == null)
          return;

        let severityMap = ConfigManager.getSeverity();
        let l = list.length;
        let al = alarms.length;
        for (let i = 0; i < l; i++) {

          // 초기화
          list[i].severity = "";
          list[i].severityLabel = "normal";

          for (let j = 0; j < al; j++) {
            if (alarms[j].resource == list[i].systemName) {
              let s = alarms[j].severity;
              let alarmCP = $.inArray(s, alarmLevel);

              if (list[i].severity && list[i].severity != '') {
                let currCP = $.inArray(list[i].severity, alarmLevel);
                if (alarmCP > currCP) {
                  list[i].severity = s;
                  list[i].severityLabel = (severityMap[s] == null) ? 'normal' : severityMap[s].toLowerCase();
                }
              } else {
                list[i].severity = s;
                list[i].severityLabel = (severityMap[s] == null) ? 'normal' : severityMap[s].toLowerCase();
              }

            }
          }
        }
        list = angular.copy(list);
      }

      function createTimer() {
        if (TIMER != null) {
          $interval.cancel(TIMER);
          TIMER = null;
        }
        TIMER = $interval(getData, INTERVAL_TIME);
      }

      function mergeSocketData(data) {
        let type = data.dataType;
        data = data.searchResults;

        if (type == null || type.toUpperCase() == "VALUE") {

          hostCount = parseInt(data["HOST_CNT"]);
          metricDashboardCtrl.metric = data;
          //setSocketDataTypeValue();
        } else if (type.toUpperCase() == "CHART") {

          metricDashboardCtrl.metric.chart = data;
          makeLoadAvgLineChartData();
         // makeNetworkChartData();
        }
      }
     

      function initData() {
        // metricDashboardCtrl.data = {};
        metricDashboardCtrl.metric = {};
        metricDashboardCtrl.networkToggle = 'trend';
        if (!metricDashboardCtrl.chart)
          metricDashboardCtrl.chart = {};
        
        metricDashboardCtrl.chart.networkInOutChartData = {};
        metricDashboardCtrl.chart.loadAverageList = [];

        // system memory info
        metricDashboardCtrl.system = {
          master: {
            status: {},
            memChartData: [],
            cpuChartData: [],
            inOutChartObj: {},
            cpuMemoryChartObj: {}
          },
          slave: {
            status: {},
            memChartData: [],
            cpuChartData: [],
            inOutChartObj: {},
            cpuMemoryChartObj: {}
          }
        }


        metricDashboardCtrl.chart.barOption = {
          "stacked": true,
          backgroundColor: "transparent",
          plot: {
            "stackType": "100%",
            "bar-width": "14px"
          },
          "plotarea": {
            "border": "none",
            "adjust-layout": false,
            "margin": "dynamic",
            "margin-top": "16px",
            "margin-bottom": 0
          },
          scaleX: {
            visible: false,
            guide: {
              visible: false
            }
          },
          scaleY: {
            visible: false,
            guide: {
              visible: false
            },
            "minValue": 0,
            "maxValue": 100
          },
          "tooltip": {
            "text": "%t: <strong>%npv %</strong>",
            "shadow": false,
            backgroundColor: "#ff3d00",
            "border-color": "#222",
            borderWidth: "1px",
            "border-radius": 3,
            "color": "#fff",
            "callout": true,
            "callout-height": "5px",
            "decimals": 2
          }
        };


        metricDashboardCtrl.chart.trendOption = {
          type: "line",
          gui: {
            contextMenu: {
              visible: false
            }
          },
          theme: 'dark',
          backgroundColor: "transparent",
          zoom: {
            backgroundColor: "#3399ff",
            shared: true
          },
          plot: {
            marker: {
              visible: false
            }
          },
          plotarea: {
            marginBottom: '45',
            marginTop: '25',
            marginRight: '30',
            marginLeft: 'dynamic'
          },
          crosshairX: {
            lineWidth: 1,
            scaleLabel: {
              backgroundColor: "#fff",
              color: "#383737",
              borderColor: "#C0C0C0",
              borderWidth: "1px",
              width: "80px",
              height: "25px",
              transform: {
                type: "date",
                text: "%Y-%mm-%dd<br>%H:%i:%s"
              }
            },
            plotLabel: {
              visible: true,
              multiple: true
            }
          },
          scaleX: {
            zooming: true,
            placement: "default",
            step: "60000", //1분단위
            item: {
              fontColor: "#fff"
            },
            guide: {
              visible: false
            },
            tick: {
              lineWidth: "1px"
            },
            transform: {
              type: "date",
              text: "%Y-%mm-%dd<br>%H:%i:%s"
            }
          },
          scaleY: {
            item: {
              fontColor: "#fff",
              thousandsSeparator: ","
            },
            guide: {
              visible: false
            }
          },
          legend: {
            visible: false

          }
        };

        // metricDashboardCtrl.chart.pieOption = getPieChartOption();
      }

      function getHostInfo() {
        if (heatMapNodeMap == null || Object.keys(heatMapNodeMap).length < 1)
          return;

        WebSocketService.callRequest({
          function: 'getSystemStatusByHost',
          resultEvent: 'GET_HOST_INFO_EVENT',
          systemSeq: systemSeq,
          metricData: [{
            'hostName': heatMapNodeMap.systemName
          }]
        });
      }

      function getTooltipHandler(d) {
        let node = angular.element(d);
        let seq = JSON.parse(node.attr("node-data"));

        if (heatMapNodeMap == null || heatMapNodeMap.metric == null || seq != heatMapNodeMap.systemSeq) {
          metricDashboardCtrl.closeAllTooltip();
          return false;
        }
      }


      /**************************************************************/
      /* 2019.05.21 신규 개발 
      (System Network Trend/Status ==> getMetricSummary socket data */
      /**************************************************************/
     

      /* Trend line Chart */
      function onGetMetricDashboardTrendEventHandler(event, data) {        
        if (data.hasOwnProperty("exceptionMassage") || !data.hasOwnProperty("searchResults")) return;  
        createSystemTrendChartDatas(data.searchResults).then(function(result){         
          metricDashboardCtrl.system.master.inOutChartObj = createLineChartObj(result.master.inOutChartData, 'GB');
          metricDashboardCtrl.system.master.cpuMemoryChartObj = createLineChartObj(result.master.cpuMemoryChartData, '%');
          metricDashboardCtrl.system.slave.inOutChartObj = createLineChartObj(result.slave.inOutChartData, 'GB');
          metricDashboardCtrl.system.slave.cpuMemoryChartObj = createLineChartObj(result.slave.cpuMemoryChartData, '%');          
        })  
         
      }

      function createSystemTrendChartDatas(data) {

      	var defferd = $q.defer();
      	var result = {};


      	let sysTypes = {
          master: 'Others',
          slave: 'DataNode'
        };
      
        var arrLen = Object.keys(data.Others.MEM_TOTAL).length;
        var i=0;
        _.each(sysTypes, function(val, key){

        	var inOutChartData = {}, cpuMemoryChartData = {};
        	var insertTimes = [], networkInValues = [], networkOutValues = [], memUseageValues = [], cpuUsedValues = [];
         
         	metricDashboardCtrl.system[key].inOutChartObj = {};
        	metricDashboardCtrl.system[key].cpuMemoryChartObj = {};
        	
          if(arrLen > 0) {
            // var x = key == 'slave' ? 1024 : 1;                   
            _.each(data[val].MEM_TOTAL, function(memTotal, insertTime) {
              insertTimes.push(insertTime * 1000);
              networkInValues.push(parseFloat((data[val].BYTES_IN[insertTime] / 1024 / 1024 / 1024).toFixed(2)));
              networkOutValues.push(parseFloat((data[val].BYTES_OUT[insertTime] / 1024 / 1024 / 1024).toFixed(2)));
              cpuUsedValues.push(parseFloat((parseFloat(data[val].CPU_USER[insertTime])+parseFloat(data[val].CPU_SYSTEM[insertTime])).toFixed(2)));
              var memUsed = memTotal == 0 ? null : parseFloat(((memTotal-data[val].MEM_FREE[insertTime])/memTotal*100).toFixed(2))
              memUseageValues.push(memUsed);

              i++;
            });

            // 마지막 데이타 제거
            insertTimes.splice(arrLen-1,1);
            networkInValues.splice(arrLen-1,1);
            networkOutValues.splice(arrLen-1,1);
            cpuUsedValues.splice(arrLen-1,1);
            memUseageValues.splice(arrLen-1,1);
          }

          result[key] = {
          	inOutChartData: {
	         		network_in: {
	         			insertTimes: insertTimes,
	         			values: networkInValues
	         		},
	         		network_out: {
	         			insertTimes: insertTimes,
	         			values: networkOutValues
	         		}
	         	},
	         	cpuMemoryChartData: {
	         		cpu_used: {
	         			insertTimes: insertTimes,
	         			values: cpuUsedValues
	         		},
	         		mem_useage: {
	         			insertTimes: insertTimes,
	         			values: memUseageValues
	         		}
	         	}
          }
        })   


        if(arrLen*2 == i) {
        	defferd.resolve(result);
        }   

        return defferd.promise;
      }
      /* Status Data */
      function onGetMetricDashboardStatusEventHandler(event, data) {
        if (data.hasOwnProperty("exceptionMassage") || !data.hasOwnProperty("searchResults")) return;        
        let sysTypes = {
          master: 'Others',
          slave: 'DataNode'
        };
        let nwUnit = 'GB';
        if (ConfigManager.getSystemName() == 'AZURE') nwUnit = 'MB'; // 2017.03.14. AZURE 는 MB로 처리하기로 함


        _.each(sysTypes, function(val, key) {
          let memTotal = parseFloat(getSocketLastValue(data.searchResults[val].MEM_TOTAL));
          let memFree = parseFloat(getSocketLastValue(data.searchResults[val].MEM_FREE));
          let memUsed = memTotal - memFree;

          // Status 정보 셋팅
          metricDashboardCtrl.system[key].status = {
            MEM_TOTAL: CommonUtil.formatBytes(memTotal * 1024, 2, 'TB'),
            MEM_FREE: CommonUtil.formatBytes(memFree * 1024, 2, 'TB'),
            MEM_USED: CommonUtil.formatBytes(memUsed * 1024, 2, 'TB'),
            BYTES_IN: CommonUtil.formatBytes(getSocketLastValue(data.searchResults[val].BYTES_IN), 2, nwUnit),
            BYTES_OUT: CommonUtil.formatBytes(getSocketLastValue(data.searchResults[val].BYTES_OUT), 2, nwUnit),
            LOAD_ONE: Math.floor(getSocketLastValue(data.searchResults[val].LOAD_ONE)),
            CPU_NUM: Math.floor(getSocketLastValue(data.searchResults[val].CPU_NUM))
          };


          // Memory bar chart 셋팅
          metricDashboardCtrl.system[key].memChartData = [{
              values: [Number(memUsed)],
              backgroundColor: "#01C853",
              "text": "Used"
            },
            {
              values: [memFree],
              backgroundColor: "#3E8CFF",
              "offset-x": "2px",
              "text": "Free"
            }
          ];

          // CPU pie chart 셋팅
          let g = [];
          g.push(getCpuPieOption("User", getSocketLastValue(data.searchResults[val].CPU_USER)));
          g.push(getCpuPieOption("System", getSocketLastValue(data.searchResults[val].CPU_SYSTEM)));
          g.push(getCpuPieOption("Idle", getSocketLastValue(data.searchResults[val].CPU_IDLE)));
          g.push(getCpuPieOption("WIO", getSocketLastValue(data.searchResults[val].CPU_WIO)));
          g.push(getCpuPieOption("SINTR", getSocketLastValue(data.searchResults[val].CPU_SINTR)));

          let pieConfig = {};
          pieConfig.layout = "h";
          pieConfig.graphset = g;
          metricDashboardCtrl.system[key].cpuChartData = pieConfig;

        });

      }

      /* Status 소켓 데이타 최신날짜 value값 얻기 */
      function getSocketLastValue(arr) {
        return arr[_.last(_.keys(arr))];
      }



      /* 소켓통신 getMetricSummary */
      function getMetricSummarySocketData(resultEvent, metricData) {
        var param = {
          function: 'getMetricSummary',
          resultEvent: resultEvent,
          systemSeq: systemSeq
        };

        if (metricData) param.metricData = metricData;
        WebSocketService.callRequest(param);
      }


      // 날짜 조건 변경
      metricDashboardCtrl.changeDateHandler = function(event) {
      	if(event.sDateTime.indexOf('undefined') > -1) return;
        //metricDashboardCtrl.processInterval = true;
        //intervalCancel();
        ap($scope);
      };

      // 날짜 검색	소켓 데이타 요청
      metricDashboardCtrl.clickSearchHandler = function() {
        if (!CommonUtil.validateStartEndDate(metricDashboardCtrl.sDateTime, metricDashboardCtrl.eDateTime))
          return;

        metricDashboardCtrl.processInterval = true;
        intervalCancel();
       
        getMetricSummarySocketData('GET_METRIC_DASHBOARD_TREND_EVENT', getSocketParamMetricData());

      }

      /* timer 시작, 종료(소켓통신) */
      metricDashboardCtrl.intervalHoldHandler = function() {
        metricDashboardCtrl.processInterval = !metricDashboardCtrl.processInterval;

        if (metricDashboardCtrl.processInterval == false) { // 재시작
        	getSystemStatusSocketData();
          intervalSearch();
        } else { // 중지
          intervalCancel();
        }
      }

      /* 소켓통신 날짜 검색 param 셋팅 */
      function getSocketParamMetricData() {
        var metricData = [{
          startTime: moment(metricDashboardCtrl.sDateTime, 'YYYY-MM-DD HH:mm').format('X'),
          endTime: moment(metricDashboardCtrl.eDateTime, 'YYYY-MM-DD HH:mm').format('X')
        }]
        return metricData;
      }

      /* 검색 default 기간 설정 */
      function setSearchProcess() {
        metricDashboardCtrl.sDateTime = moment().subtract(3, 'hours').local().format('YYYY-MM-DD HH:mm');
        metricDashboardCtrl.eDateTime = moment().format('YYYY-MM-DD HH:mm');
      }

      /* timer 소켓통신 */
      function intervalSearch() {   
      	intervalCancel();
        __interval = $interval(getSystemStatusSocketData, INTERVAL_TIME);
      }

      function getSystemStatusSocketData() {
      	$timeout(function(){
        	setSearchProcess();
         	getMetricSummarySocketData('GET_METRIC_DASHBOARD_TREND_EVENT', getSocketParamMetricData());
        })         
      }

      function intervalCancel() {
      	$interval.cancel(__interval);
        __interval = null;
      }

      /* 라인차트 Object 생성 */
      function createLineChartObj(data, unit) {

        var scaleX = [];
        var series = [];  

        var scaleYValues = (unit == '%') ? '0:120:30' : null;    

          var i = 0;
          _.each(data, function(val, key) {
            if (i == 0) {
              scaleX = angular.copy(val.insertTimes);
            }
            var obj = {
              "type": 'line',
              "line-color": colorArr[i],
              "text": key.toUpperCase(),
              "guideLabel": {
                "text": "%t : %v " + unit,
                "color": "#fff",
                "font-size": "10px",
                "background-color": "#292626",
                "border-color": colorArr[i]
              },
              values: val.values
            };
            series.push(obj);
            i++;
          });

        var chartObj = {
          type: 'line',
          backgroundColor: 'transparent',
          theme: 'dark',
          plotarea: {
            marginTop: "30",
            marginRight: "30",
            marginBottom: "25",
            marginLeft: "40"
          }, // 그래프 사이즈
          plot: {
            "mode": "fast",
            "exact": true,
            "smartSampling": true,
            "maxNodes": 0,
            //  "maxTrackers": 0,     tooltip 안보임
            "lineWidth": 1,
            "shadow": false,
            "marker": {
              color: '#e76049',
              type: "circle",
              borderWidth: 0,
              size: 2,
              shadow: false
            },
            "thousands-separator": ",",
            "aspect": "spline"
          },

          tooltip: {
            visible: false
          },
          crosshairX: {
            shared: false,
            lineWidth: 1,
            scaleLabel: {
              "backgroundColor": "#292626",
              "color": "#fff",
              borderColor: "#C0C0C0",
              borderWidth: "1px",
              transform: {
                type: "date",
                text: "%mm-%dd %H:%i:%s"
              }
            },
            plotLabel: {
              visible: true,
              multiple: true
            }
          },
          scaleY: {
          	// format: '%v',
          	// autoFit: true,
            "thousands-separator": ",",
            item: {
              "font-color": "#fff"
            },
            guide: {
              visible: false,
              "line-width": "1px",
              "line-color": "#CCCCCC",
              alpha: "0.2",
              "line-style": "dashed"
            },
           // "transform": {},
            values: scaleYValues,                       
          },

          scaleX: {
            zooming: true,
            placement: "default",            
            item: {
              "font-color": "#fff"
            },
            guide: {
              visible: false
            },
            tick: {
              lineWidth: "1px"
            },
            "min-value": "auto",            
            "transform": {
              type: "date",
              all: "%H:%i"
            },
            "max-items": 6,
            values: scaleX
          },

          series: series
        }

        return chartObj;
      };


      function clear() {
        delete metricDashboardCtrl.viewType;
        delete metricDashboardCtrl.data;
        delete metricDashboardCtrl.metric;
        delete metricDashboardCtrl.pop;
        delete metricDashboardCtrl.chart;
        delete metricDashboardCtrl.alarms;
        delete metricDashboardCtrl.columns;
        delete metricDashboardCtrl.system;

        $interval.cancel(TIMER);
        $interval.cancel(__interval);

        INTERVAL_TIME = null;
        TIMER = null;
        systemSeq = null;
        hostCount = null;
        last = null;
        lastNode = null;
        center = null;
        heatMapNodeMap = null;
        unbind = null;
        $.powerTip.destroy(angular.element('#heatmapArea div.cell-heat'));
      }

      function destoryTooltip() {
        $.powerTip.destroy($('#namenodeActive'));
        $.powerTip.destroy($('#namenodeStandby'));
        $.powerTip.destroy($('#resourceActiveNode'));

      }

      initialize();
    }
  ]);
});