define(["app", "moment"], function(app, moment) {
  app.controller("RedisCtrl", ["$rootScope", "$scope", "$controller", "$interval", "$timeout", "$compile", "$filter", "DataService", "ConfigManager", "GridRenderer", "ngDialog", 'CommonUtil',  
    function($rootScope, $scope, $controller, $interval, $timeout, $compile, $filter, DataService, ConfigManager, GridRenderer, ngDialog, CommonUtil) {
      "use strict";

      let vm = this;   
      let unbind = [];
      let systemParentSeq = ConfigManager.getSystemSeq();
      let center = { "text-align": "center" };
      let defaultColumns = [
        {"headerName": "Insert time", "field": "insert_time", "cellStyle": center, "width": 160},
        {"headerName": "System Name", "field": "system_name", "cellStyle": center, "width": 160},
        {"headerName": "Port", "field": "process_port", "cellStyle": center, "width": 100}
      ];
      let colorArr = ['#00c853','#e76049','#29c5ff','#ffea00','#ff3d00','#ffc000','#ff6600','#2979ff','#d500f9','#5d9cec'];


      // Redis System Info
      function getRedisSystemInfo() { 
        DataService.httpGet("/service/redis/getRedisSystemInfo?systemParentSeq="+vm.searchInfo.systemParentSeq, {},  function(result){
          if (result.result === 1 && result.data !== null)  {
            vm.systemList = result.data; 
            vm.popup.systemList = angular.copy(result.data);           
          }  
        });
      }
     
      // Redis Metric Info
      function getRedisMetricInfo() {             
        var param = {
          system_parent_seq: vm.searchInfo.systemParentSeq
        };   

        DataService.httpPost("/activities/alarm/configuration/getRedisConfigInfo", param,  function(result){
          if (result.result === 1 && result.data !== null)  {
            vm.tableList = result.data;
            _.each(vm.tableList, function(item){
              var text = item.metricName.split('_');
              item.uiName = text[2].toUpperCase();
            })
            vm.popup.tableList = angular.copy(vm.tableList);
          }  
        });
      }

      // Redis history List info
      function getRedisHistoryList() {
        DataService.httpPost("/service/redis/getRedisHistoryList", vm.searchInfo, function(result){
          if(result.result === 1 && result.data !== null) {
            $timeout(function(){
              vm.grid.columns = getGridColumnsInfo(vm.searchInfo.searchType);
              vm.grid.data = result.data;
            })
          }
        });
      }      
     
      function search() {
        if (!CommonUtil.validateStartEndDate(vm.sDateTime, vm.eDateTime))
          return;
        getRedisHistoryList();
      }

      function openChart() {
        vm.isPopup = false;
        $scope.data = {
          systemList: vm.systemList,
          tableList: vm.tableList
        }
        var popup = ngDialog.open({
          template: "/services/redis/popup/redis_chart_popup_template.html",
          className: "ngdialog-theme-default custom-width",
          showClose: false,
          disableAnimation: true,
          cache: false,
          closeByDocument: false,
          closeByEscape: false,
         // draggable: true,
          scope: $scope
        });

        var closer = $rootScope.$on('ngDialog.refresh', function (e, id) {
          if (id != popup.id) return;
          closer();
        });

        let timer = $timeout(function () {
          $compile($('#redisChartPopup'))($scope);
          vm.popup.sDateTime = moment().subtract(7, 'days').local().format('YYYY-MM-DD HH:mm');
          vm.popup.eDateTime = moment().format('YYYY-MM-DD HH:mm');       
          vm.popup.searchInfo.startDate = vm.popup.sDateTime;
          vm.popup.searchInfo.endDate = vm.popup.eDateTime;
          vm.isPopup = true;
          getRedisHistoryChartDatas();
          ap($scope);
          $timeout.cancel(timer);          
        }, 500)

      }

      
      function getGridColumnsInfo(searchType) {
        var columns = angular.copy(defaultColumns);
        var metricsInfo = _.findWhere(vm.tableList, {metricName: searchType});
        if(metricsInfo !== undefined) {
          _.each(metricsInfo.childrenList, function(item){
              columns.push({"headerName": item.metricName, "field": item.metricName, "cellStyle": center, "width": 185, cellRenderer: GridRenderer.numberStringFormatter});
          });
        }
        return columns;
      }

      

      function onChangeSelectBox(type, event) {
        if(type == 'system') {           
          vm.searchInfo.systemSeq = event.systemSeq;
          if(event.systemName == 'All') {
            vm.portList = [{labelKey:'', processPort:''}];
            return;
          }
          var portList = _.findWhere(vm.systemList, {systemSeq: event.systemSeq}).childList;
          vm.portList = _.map(portList, function(item) {
            item.labelKey = item.processPort;
            return item;
          });                    
        }else if(type == 'port') {
          vm.searchInfo.processPort = event.processPort;
        }else if(type == 'searchType') {
          vm.searchInfo.searchType = event.metricName;          
        }       
        getRedisHistoryList();        
      }

      // 날짜 조건 변경
      function changeDateHandler(event) {
        if(event.sDateTime.indexOf('undefined') > 0) return;
        vm.searchInfo.startDate = event.sDateTime;
        vm.searchInfo.endDate = event.eDateTime;   
      };



      /********** Popup Chart ****************/

      // Redis history Chart Datas;
      function getRedisHistoryChartDatas() {        
        DataService.httpPost("/service/redis/getRedisHistoryChartDatas", vm.popup.searchInfo, function(result){
          if(result.result === 1 && result.data !== null) {
            vm.popup.metricsChartObj = createLineChartObj(result.data);
            ap($scope);
          }
        });
      }

      function searchPopup() {
        if (!CommonUtil.validateStartEndDate(vm.popup.sDateTime, vm.popup.eDateTime))
          return;
        getRedisHistoryChartDatas();
      }

      function onChangeSelectBoxPopup(type, event) {
        if(type == 'system') {           
          vm.popup.searchInfo.systemSeq = event.systemSeq;   
          var portList = _.findWhere(vm.popup.systemList, {systemSeq: event.systemSeq}).childList;
          vm.popup.portList = _.map(portList, function(item) {
            item.labelKey = item.processPort;
            return item;
          });     
        }else if(type == 'port') {
          vm.popup.searchInfo.processPort = event.processPort;
        }else if(type == 'searchType') {
          vm.popup.searchInfo.searchType = event.metricName;          
          vm.popup.metricList = _.filter(_.findWhere(vm.popup.tableList, {metricName: event.metricName}).childrenList, function(item){
            if(item.dataType !== 'string') return item;
          });
        }else if(type == 'metric') {
          vm.popup.searchInfo.metricName = event.metricName;
          if(vm.isPopup) {
            getRedisHistoryChartDatas();
          }          
        }        
      }

      // 날짜 조건 변경
      function changeDateHandlerPopup(event) {
        if(event.sDateTime.indexOf('undefined') > 0) return;
        vm.popup.searchInfo.startDate = event.sDateTime;
        vm.popup.searchInfo.endDate = event.eDateTime; 
      };

      function chartZoomOut(chart_id) {
        zingchart.exec(chart_id, 'viewall');
      };


      function setSearchProcess() {
        $timeout(function() {
          systemParentSeq = ConfigManager.getSystemSeq();
          vm.sDateTime = moment().subtract(1, 'hours').local().format('YYYY-MM-DD HH:mm');
          vm.eDateTime = moment().format('YYYY-MM-DD HH:mm');       
          vm.searchInfo.startDate = vm.sDateTime;
          vm.searchInfo.endDate = vm.eDateTime;

          getRedisSystemInfo();
          getRedisMetricInfo();
        },1000)
      }


      function setSearchDate() {
        
      }

      function onChangeSystemSeqEventHandler(event, data) {
        systemParentSeq = ConfigManager.getSystemSeq();

        initData();
        setSearchProcess();
      }

      function addEventListener() {
        unbind = [
          $scope.$on('$destroy', destroy),
          $scope.$on(ConfigManager.getEvent("CHANGE_SYSTEM_SEQ_EVENT"), function(event, data){
            initData();
            onChangeSystemSeqEventHandler(event,data);
          })
        ];
      }
      function destroy() {
        unbind.forEach(function(fn) {
          fn();
        });
      }

      function initData() {   
        vm.searchInfo = {     
          systemParentSeq: systemParentSeq,
          systemSeq: '',
          processPort: '',
          searchType: 'hm_redis_cpu',          
          startDate: null,
          endDate: null
        };  
        vm.systemList = [];
        vm.portList = [];
        vm.tableList = [];

        vm.popup = {
          systemList: [],
          portList: [],
          tableList: [],
          metricList: [],
          sDateTime: null,
          endDate: null,
          searchInfo: {     
            systemParentSeq: systemParentSeq,
            systemSeq: '',
            processPort: '',
            searchType: 'hm_redis_cpu', 
            metricName: '',   
            startDate: null,
            endDate: null
          },
          metricsChartObj: {} 
        }
        
        vm.grid = {
          data: [],
          columns: getGridColumnsInfo(vm.searchInfo.searchType)
        } 
             
      }



      function initialize() {    

        vm.onChangeSelectBox = onChangeSelectBox;             
        vm.changeDateHandler = changeDateHandler;
        vm.search = search;
        vm.openChart = openChart;

        vm.onChangeSelectBoxPopup = onChangeSelectBoxPopup;             
        vm.changeDateHandlerPopup = changeDateHandlerPopup;
        vm.searchPopup = searchPopup;
        vm.chartZoomOut = chartZoomOut;

        initData();   

        setSearchProcess();
        addEventListener();  
        
      }


       /* 라인차트 Object 생성 */
    function createLineChartObj(data) {
      var scaleX = angular.copy(data.insertTimes);
      var series = [];    
      var i = Math.floor(Math.random() * 10); 
      var obj = {
        "line-color": colorArr[i],
        "text": vm.popup.searchInfo.metricName,
        guideLabel: {
          "text": "%t : %v",
          "color":"#fff",
          "font-size": "10px",
          "background-color": "#292626",
          "border-color": colorArr[i]
        },
        values: data.values
      };
      series.push(obj);

      var chartObj = {
        type: 'line',
        backgroundColor: 'transparent',
        theme: 'dark',
        title: {
          text: 'chartInfo.title',
          y: '10',
          fontSize: '15',
          fontColor: "#fff"
        },
        plotarea: {
          marginTop: "30",
          marginRight: "38",
          marginBottom: "25",
          marginLeft: "100"
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
            "thousands-separator":",",
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
            "min-value": "auto",
            "thousands-separator": ",",
            item: {
              "font-color": "#4e4949"
            },
            guide: {
              visible: false,
              "line-width": "1px",
              "line-color": "#CCCCCC",
              alpha: "0.2",
              "line-style": "dashed"
            },
            "transform": {}
            // "progression": "log",
            // "log-base": 10                       
          },

          scaleX: {
            zooming: true,
            placement: "default",
            // maxItems: 5,
            //step: 60000 * 60, //1시간 단위
            item: {
              "font-color": "#4e4949"
            },
            guide: {
              visible: false
            },
            tick: {
              lineWidth: "1px"
            },
            "min-value": "auto",
            // "min-value":1541753250000,
            //"step":"30minute",
            // "min-value":"1541753250000", //Min Value
            // "max-value":"1541771970000", //Max Value
            "transform": {
              type: "date",
              all: "%H:%i"
            },
            "max-items": 12,
            values: scaleX
          },

          series: series
        }

        return chartObj;
      };

      initialize();
    }
    ]);

});