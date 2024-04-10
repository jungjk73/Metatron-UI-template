define(["app", "moment"], function(app, moment) {
  app.controller("MetricDashboardNewCtrl", ["$rootScope", "$scope", "$controller", "$interval", "$timeout", "$compile", "$filter", "DataService", "ConfigManager", "GridRenderer", "ngDialog", 'CommonUtil', "MetricDashboardFactory", 
    function($rootScope, $scope, $controller, $interval, $timeout, $compile, $filter, DataService, ConfigManager, GridRenderer, ngDialog, CommonUtil, metricDashboardFactory) {
      "use strict";

      let vm = this;
      let INTERVAL_TIME = 1000 * 60;
      let unbind = [];
      let __interval;

      /*************************************** System Rack 관리 Start **************************************/      
      // System Rack upload Popup
      function openSystemRackPopup() {
        var popup = ngDialog.open({
          template: "/dashboard/metric/popup/system_rack_txt_upload_template.html",
          className: "ngdialog-theme-default custom-width",
          showClose: false,
          disableAnimation: true,
          cache: false,
          closeByDocument: false,
          closeByEscape: false,
          scope: $scope
        });

        var closer = $rootScope.$on('ngDialog.refresh', function(e, id) {
          if (id != popup.id) return;
          closer();
        });

        $(document).on('change', '#ex_filename', function() {
          if (window.FileReader) {
            var filename = $(this)[0].files[0].name;
            if (!metricDashboardFactory.checkFileType(filename)) {
              alert('Please upload the TXT file.');
              return;
            }
          } else {
            var filename = $(this).val().split('/').pop().split('\\').pop();
          }

          $(this).siblings('.upload-name').val(filename);
        });
      }

      // Text file read
      function txtToArray(data) {
        var rows = data.split('\n');
        var params = [];
        angular.forEach(rows, function(val) {
          if (val != "") {
            var r = val.split('/');
            var systemIp = r[0].trim();
            var rackInfo = r[1].trim();
            if (systemIp != '' && rackInfo != '') {
              var obj = {
                systemParentSeq: vm.systemSeq,
                systemIp: systemIp,
                rackInfo: rackInfo
              }
              params.push(obj);
            }
          }
        });

        return params;
      }


      // System Rack Info TEXT file upload
      function uploadSystemRack() {
        var file = document.getElementById("ex_filename").files[0];
        if (file) {
          if (!metricDashboardFactory.checkFileType(file.name)) {
            alert('Please upload the TXT file.');
            return;
          }

          var reader = new FileReader();
          reader.readAsText(file, "UTF-8");
          reader.onload = function(e) {
            var fileContent = reader.result;
            var params = txtToArray(fileContent)

            if (params.length == 0) {
              alert("No Upload Datas!");
            } else {
              DataService.httpPost("/dashboard/metric-new/updatSystemRack", params, function(result) {
                ngDialog.closeAll();
                getSystemRackList();
              });
            }

          }
          reader.onerror = function(e) {
            alert("File Upload Error!")
          }
        } else {
          alert('Please upload the TXT file.');
          return;
        }
      }
      /*************************************** System Rack 관리 End **************************************/









      /*************************************** System Rack Chart Start **************************************/      
      // System Rack 정보 목록 가져오기
      function getSystemRackList() {
        DataService.httpGet("/dashboard/metric-new/getSystemRackList?systemParentSeq=" + vm.systemSeq, {}, function(result) {
          createTreemapChartData(result.data);
        });
      }

      // Treemap Chart 데이타 생성
      function createTreemapChartData(data) {
        var chartDatas = [];

        var k = 0;
        _.each(data, function(val, key) {
          var item = {
            name: metricDashboardFactory.toCapitalize(key),
            value: [10, 0],
            path: key,
            children: []
          }

          for (var i = 0; i < val.length; i++) {
            var childItem = {
              name: val[i].systemName,
              value: [5, 0],
              path: key + '/' + val[i].systemName,
              ip: val[i].systemIp
            }
            item.children.push(childItem);
          }

          item.children = _.sortBy(item.children, 'name').reverse();

          chartDatas.push(item);
          k++
        })

        vm.chart.treemap.config.series[0].data = _.sortBy(chartDatas, 'name').reverse();
        getSocketData();
        ap($scope);
      }
      /*************************************** System Rack Chart End **************************************/



      /*************************************** Master Process, Worker Process Start **************************************/

      // Process Grid 설정 팝업 열기
      // 타이틀 헤더 끝에 아이콘 달기?
      // 저장 처리 후 해당 그리드만 새로 고침
      function showProcessControll(dist) {

        let param = {};
        param.type = 'config';
        param.systemSeq = ConfigManager.getSystemSeq();

        vm.config = {};
        vm.config.dist = dist;

        DataService.httpPost("/dashboard/metric/getOverviewProcessData", param, function(result){

          if (!result.data) return;

          let _targetProcessList = [];
          let _selectedProcessList = [];
          if (dist == 'master'){
            if (result.data.masterGridData && result.data.masterGridData.length > 0) {
              for (let k = 0 ; k < result.data.masterGridData.length ; k++){
                let item = result.data.masterGridData[k];
                if (item.useFlag == 'Y') _selectedProcessList.push(item);
                if (item.useFlag == 'N') _targetProcessList.push(item);
              }
              //vm.config.maxHeight = result.data.masterGridData.length > 4 ? result.data.masterGridData.length * 30 : 200;
            }
          } else if (dist == 'worker') {
            if (result.data.workerGridData && result.data.workerGridData.length > 0) {
              for (let k = 0 ; k < result.data.workerGridData.length ; k++){
                let item = result.data.workerGridData[k];
                if (item.useFlag == 'Y') _selectedProcessList.push(item);
                if (item.useFlag == 'N') _targetProcessList.push(item);
              }
              //vm.config.maxHeight = result.data.workerGridData.length > 4 ? result.data.workerGridData.length * 30 : 200;
            }
          }
          vm.config.targetProcessList = _targetProcessList;
          vm.config.selectedProcessList = _selectedProcessList;
        });

        let popup = ngDialog.open({
          template: "/common/popup/process_ordering_template.html",
          className: "ngdialog-theme-default custom-width",
          showClose: false,
          disableAnimation: true,
          cache: false,
          closeByDocument: false,
          closeByEscape: false,
          scope: $scope,
          onOpenCallback: function(val){
            $('#selectedProcessList').sortable({
              cursor: 'move',
              stop: function(event, ui) {

                $('#selectedProcessList > li').each(function(idx, elem){
                  let seq = $(this).data('seq');
                  angular.forEach(vm.config.selectedProcessList, function(item){
                    if (item.processSeq == seq) {
                      item.order = idx;
                    }
                  });
                });
                vm.config.selectedProcessList.sort(function(a, b){
                  return a.order - b.order;
                });

              }
            });
            $('#selectedProcessList').disableSelection();
          }
        });


        let closer = $rootScope.$on('ngDialog.refresh', function (e, id) {
          if (id != popup.id) return;
          closer();
        });
      }
      /*************************************** Master Process, Worker Process Start End **************************************/

      function getGridData() {
        vm.grid.alarm.gridData = [
          {severity: 'CR', occurTime: '2019.12.20 15:35:33', resource: 'BPP-TMAPDT-M03CN001', occurMessage: 'HIVESERVER2 connect timed out'},
          {severity: 'CR', occurTime: '2019.12.20 15:35:33', resource: 'BPP-TMAPDT-M03CN001', occurMessage: 'HIVESERVER2 connect timed out'},
          {severity: 'CR', occurTime: '2019.12.20 15:35:33', resource: 'BPP-TMAPDT-M03CN001', occurMessage: 'HIVESERVER2 connect timed out'}
        ];
        vm.grid.master.gridData = [
          {processName: 'RESOURCEMANAGER', alive: '2', dead: '0'},
          {processName: 'RESOURCEMANAGER', alive: '2', dead: '0'},
          {processName: 'RESOURCEMANAGER', alive: '2', dead: '0'}
        ];
        vm.grid.worker.gridData = [
          {processName: 'NODEMANAGER', alive: '30', dead: '0'},
          {processName: 'NODEMANAGER', alive: '30', dead: '0'},
          {processName: 'NODEMANAGER', alive: '30', dead: '0'}
        ];
      }




      /*************************************** init Data, event .... **************************************/
      function getSocketData() {
        for (var i = 0; i < vm.chart.treemap.config.series[0].data.length; i++) {
          for (var k = 0; k < vm.chart.treemap.config.series[0].data[i].children.length; k++) {
            vm.chart.treemap.config.series[0].data[i].children[k].value[1] = 0;
          }
        }

        for (var i = 0; i < vm.chart.treemap.config.series[0].data.length; i++) {
          var length = vm.chart.treemap.config.series[0].data[i].children.length - 1;
          var p = _.random(0, 3);
          for (var k = 0; k < p; k++) {
            var q = _.random(0, length);
            vm.chart.treemap.config.series[0].data[i].children[q].value[1] = 1;
          }
        }
      }

      function intervalSearch() {
        $interval.cancel(__interval);
        getSystemRackList();
        __interval = $interval(function() {
          getSocketData();
          //getServerInfo();
        }, INTERVAL_TIME);
      }

      function destroy() {
        $interval.cancel(__interval);
        __interval = null;
      }

      function onChangeSystemSeqEventHandler(event, data) {
        vm.systemSeq = ConfigManager.getSystemSeq();
        getSystemRackList();
      };

      function addEventListener() {
        unbind = [
          $scope.$on('$destroy', destroy),
          $scope.$on(ConfigManager.getEvent("CHANGE_SYSTEM_SEQ_EVENT"), onChangeSystemSeqEventHandler),
        ];
      }

      function initData() {
        vm.systemSeq = ConfigManager.getSystemSeq();
        vm.chart = {
          treemap: {
            config: {},
            data: [],
            chartObj: {}
          },
          hdfsUsage: {
            config: {},
            data: [],
            chartObj: {}
          },
          nameNodeRpc: {
            config: {},
            data: [],
            chartObj: {}
          },
          nameNodeQueue: {
            config: {},
            data: [],
            chartObj: {}
          }
        };

        vm.grid = {
          alarm: {
            gridData: []
          },
          master: {
            gridData: []
          },
          worker: {
            gridData: []
          }
        }
       
      }

      function initialize() {
        vm.openSystemRackPopup = openSystemRackPopup;
        vm.uploadSystemRack = uploadSystemRack;
        vm.showProcessControll = showProcessControll;

        initData();

        vm.chart.treemap.config = metricDashboardFactory.createTreemapChartObj();
        vm.chart.hdfsUsage.config = metricDashboardFactory.createLineChartObj();
        vm.chart.nameNodeRpc.config = metricDashboardFactory.createLineChartObj();
        vm.chart.nameNodeQueue.config = metricDashboardFactory.createLineChartObj();


        intervalSearch();

        getGridData();

        addEventListener();

      }

      initialize();


    }
  ]);

});