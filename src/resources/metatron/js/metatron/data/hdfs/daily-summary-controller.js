define(["app", "moment"], function(app, moment) {
  app.controller("DailySummaryCtrl", ["$scope", "$rootScope", "$http", "$timeout", "$filter", "$controller", "ConfigManager", "DataService", "GridRenderer", "ngDialog", "CommonUtil",
    function($scope, $rootScope, $http, $timeout, $filter, $controller, ConfigManager, DataService, GridRenderer, ngDialog, CommonUtil) {
      "use strict";


      // property
      let dailySummaryCtrl = this;
      let unbind = [];

      let tooltipTimer;

      dailySummaryCtrl.typeSelectOptionList = [{
        value: 'user',
        label: 'USER'
      }, {
        value: 'total',
        label: 'TOTAL'
      }];
      dailySummaryCtrl.applicationSelectOptionList = [{
        value: '2',
        label: 'MR'
      }, {
        value: '7',
        label: 'TRINO'
      }];

      dailySummaryCtrl.searchOption = {}; // 검색조건 저장 객체

      let colorArr = CommonUtil.getChartColorArr();
      let colorMap = {};


      let loadedFlag = false;

      let curr_date;

      // SELECT BOX

      // SVC Name
      dailySummaryCtrl.changeSVCSelectEventHandler = function(event) {

        if (!loadedFlag) return;
        dailySummaryCtrl.searchOption.svcId = event.value;
        dailySummaryCtrl.searchOption.svcName = event.label;
      };


      // DATE
      dailySummaryCtrl.changeDateHandler = function(event) {
        let todayDate = moment().format('YYYY-MM-DD');
        let eventEndDate = moment(event.eDateTime).format('YYYY-MM-DD');
        if (moment(todayDate).diff(eventEndDate) > 0) {
          dailySummaryCtrl.eDateTime = moment(event.eDateTime).format('YYYY-MM-DD 23:59');
        } else {
          dailySummaryCtrl.eDateTime = moment().format("YYYY-MM-DD HH:mm");
        }
        dailySummaryCtrl.sDateTime = event.sDateTime;
      };

      // Bar / Line Check box
      dailySummaryCtrl.changeChartTypeEventHandler = function(type) {
        dailySummaryCtrl.activeChartType = type;
        dailySummaryCtrl.clickSearch();
      };

      // Chart Toggle - User / Status
      dailySummaryCtrl.toggleChartClass = function(type, event) {
        dailySummaryCtrl.activeChartClass = type;
        dailySummaryCtrl.clickSearch();
      };

      // Search Click
      dailySummaryCtrl.clickSearch = function() {
        if (!CommonUtil.validateStartEndDate(dailySummaryCtrl.sDateTime, dailySummaryCtrl.eDateTime))
          return;
        dailySummaryCtrl.searchOption.startTime = dailySummaryCtrl.sDateTime;
        dailySummaryCtrl.searchOption.endTime = dailySummaryCtrl.eDateTime;
        console.log('#### Search Condition ', dailySummaryCtrl.searchOption);
        getData();
      };


      // 차트에 마우스 올렸을때 처리
      // 툴팁 만들어서 보여준다
      dailySummaryCtrl.chartMousemoveEventHandler = function(data) {
        $('#customTooltipLayer').remove();
        $timeout.cancel(tooltipTimer);
        tooltipTimer = $timeout(function() {
          $('#customTooltipLayer').remove();

          let chartId = data.id;
          let items = data.items;
          let trHTMLArr = '';
          let totalVal = 0;
          for (let i = 0; i < items.length; i++) {
            let textArr = items[i].text.split(':');
            let trHTML = '<tr><th><div class="color-tag" style="background-color: ' + colorMap[textArr[0]] + '"></div> ' + textArr[0] + '</th><td>' + $filter('number')(textArr[1]) + ' GB</td></tr>';
            totalVal = totalVal + Number(textArr[1]);
            trHTMLArr = trHTMLArr + trHTML;
          }
          if(items.length > 1) trHTMLArr = '<tr><th>Total</th><td>' + $filter('number')((totalVal.toFixed(2))) + ' GB</td></tr>' + trHTMLArr;

          let timeLabel = data['scale-label']['scale-x'];
          timeLabel = timeLabel.replace('<br>', '');
          let timeTr = '<tr><th colspan="2" style="text-align: center;">' + timeLabel + '</th></tr>';
          trHTMLArr = timeTr + trHTMLArr;

          let tableHTML = '<table>' + trHTMLArr + '</table>';

          let left = data.ev.offsetX + 30;
          if (left > data.width / 2) left = data.ev.offsetX - 150;

          let top = data.ev.offsetY;

          let tooltip = $('<div id="customTooltipLayer" class="width150" style="left:' + left + 'px; top:' + top + 'px;">' + tableHTML + '</div>');

          $('#' + chartId).append(tooltip);
        }, 150);
      };


      // Zoom
      dailySummaryCtrl.chartZoomOut = function(id) {
        zingchart.exec(id, 'viewall');
      };


      dailySummaryCtrl.clickLegend = function(svc) {

        $('#customTooltipLayer').remove();

        let plotindex = -1;
        let d = zingchart.exec('dailySummaryChart', 'getseriesdata');
        if (d == null || d.length < 1)
          return;

        for (let i = 0; i < d.length; i++) {
          let series = d[i];
          if (svc.name == series.text) {
            plotindex = series.palette;
          }
        }

        let action = 'hideplot';
        if (svc.visible) action = 'hideplot';
        else action = 'showplot';
        zingchart.exec('dailySummaryChart', action, {
          'plotindex': plotindex,
          'toggle-action': 'remove' //toggleAction (CamelCase not supported here), only css style
        });

        svc.visible = !svc.visible;
      };


      // 그리드 클릭
      dailySummaryCtrl.showPieChart = function(value, event) {
        if (!event) return;
        curr_date = value[0].data.insertTime;
        dailySummaryCtrl.searchOption.specificTime = curr_date;
        drawPieChartData();
      };


      // event-handler
      function destroy() {
        unbind.forEach(function(fn) {
          fn();
        });

        ngDialog.closeAll();
        clear();
      }

      function addEventListener() {
        unbind = [
          $scope.$on(ConfigManager.getEvent("CHANGE_SYSTEM_SEQ_EVENT"), onChangeSystemSeqEventHandler),
          $scope.$on('$destroy', destroy)
        ];
      }

      function onChangeSystemSeqEventHandler(event, data) {
        if (data == null)
          return;

        if (!loadedFlag) return;

        dailySummaryCtrl.gridData = [];

        dailySummaryCtrl.clickSearch();

      }

      function textAlignCenterRenderer(params) {
        if (params == null || params.data == null)
          return '';

        let col = params.column.colId;
        let val = params.data[col] == null ? '0' : params.data[col];

        return "<div style='text-align : center;'><span>" + val + "</span></div>";
      }

      function textHighlightRenderer(params) {
        if (params == null || params.data == null)
          return '';

        if (!params.column.colDef.highlight)
          return "<div style='text-align : center; '>" + (params.value || '0.00 GB') + "</div>";

        if (params.column.colDef.highlight == params.column.colDef.headerName) {
          return "<div style='text-align : center; font-weight: bold;'><span>" + (params.value || '0.00 GB') + "</span></div>";
        } else {
          return "<div style='text-align : center; '>" + (params.value || '0.00 GB') + "</div>";
        }

      }

      function clear() {
        dailySummaryCtrl.chartObj = null;
        dailySummaryCtrl.searchOption = null;
        dailySummaryCtrl.typeSelectOptionList = null;
        dailySummaryCtrl.applicationSelectOptionList = null;
        dailySummaryCtrl.changeTypeSelectEventHandler = null;
        dailySummaryCtrl.changeApplicationSelectEventHandler = null;
      }

      // function
      function initialize() {
      	dailySummaryCtrl.openConfigPopup = openConfigPopup;
        addEventListener();

        let param = {};
        param.systemName = ConfigManager.getSystemName();

        // svc name list
        DataService.httpPost('/data/hdfs/used/getSvcIdNameList', param, function(result) {
          if (result.result == 1 && result.data && result.data.length > 0) {
            let svcNameList = [];
            svcNameList.push({
              label: 'Total',
              value: ''
            });
            for (let i = 0; i < result.data.length; i++) {
              svcNameList.push({
                label: result.data[i].SVC_NAME,
                value: result.data[i].SVC_ID
              });
            }

            dailySummaryCtrl.svcNameList = svcNameList;
          }
        });


        dailySummaryCtrl.activeChartClass = 'user';
        dailySummaryCtrl.activeChartType = 'bar';

        $timeout(function() {
          dailySummaryCtrl.sDateTime = moment().subtract(1, 'month').local().format("YYYY-MM-DD 00:00");
          dailySummaryCtrl.eDateTime = moment().subtract(1, 'day').local().format("YYYY-MM-DD 23:59"); // 어제 날짜로 보여주기로 함 2017.10.19
        }, 500);


        $timeout(function() {
          dailySummaryCtrl.clickSearch();
          loadedFlag = true;
        }, 1000);

        $('.chart-area').mouseleave(function() {
          $('#customTooltipLayer').remove();
          $timeout.cancel(tooltipTimer);
          tooltipTimer = null;
        });

        $(document).on('mouseover', '[id *= "legend-frame"]', function() {
          $('#customTooltipLayer').remove();
          $timeout.cancel(tooltipTimer);
          tooltipTimer = null;
        });
      }

      function drawChartData() {
        dailySummaryCtrl.legendItems = [];

        dailySummaryCtrl.searchOption.systemName = ConfigManager.getSystemName();

        DataService.httpPost('/data/hdfs/used/getChartData', dailySummaryCtrl.searchOption, function(result) {

          if (result.result == 1) {
            // let colorArr = CommonUtil.getChartColorArr();
            let svcNameList = result.data.displayNameList;
            let series_stack = result.data.series_stack;
            // let curr_date = result.data.curr_date;

            let scaleX = result.data.scaleX;
            for (let i = 0; i < scaleX.length; i++) {
              scaleX[i] = moment(scaleX[i]).format('x');
            }


            if (svcNameList && svcNameList.length > 0) {



              // let colorMap = {};
              for (let i = 0; i < svcNameList.length; i++) {
                let svc = svcNameList[i];
                if (colorArr[i] == null)
                  colorMap[svc] = colorArr[i - colorArr.length];
                else colorMap[svc] = colorArr[i];

                dailySummaryCtrl.legendItems.push({
                  name: svc,
                  color: colorMap[svc],
                  visible: true
                });
              }

              if (series_stack) {
                for (let i = 0; i < series_stack.length; i++) {
                  let svc = series_stack[i].text;
                  series_stack[i].backgroundColor = colorMap[svc];
                  series_stack[i].lineColor = colorMap[svc];
                  series_stack[i].lineWidth = '1';
                  series_stack[i].marker = {};
                  series_stack[i].marker.backgroundColor = colorMap[svc];
                  series_stack[i].marker.size = '3';
                }
              }


              let token = '';

              let noData = {
                "color": "#fff",
                "margin-top": "7%",
                "font-size": "16px",
                "background-color": "none",
                "text": "No data."
              };


              dailySummaryCtrl.chartObj = {
                type: dailySummaryCtrl.activeChartType,
                noData: noData,
                plotarea: {
                  border: "none",
                  //adjustLayout: true,
                  marginTop: "50",
                  marginRight: "30",
                  marginLeft: "dynamic",
                  marginBottom: "40",
                  paddingRight: "10"
                },
                crosshairX: {
                  lineWidth: 1,
                  scaleLabel: {
                    backgroundColor: "#fff",
                    color: "#383737",
                    borderColor: "#C0C0C0",
                    borderWidth: "1px"
                  },
                  plotLabel: {
                    text: '%t:%v',
                    visible: false,
                    multiple: false
                  }

                },
                tooltip: {
                  visible: false
                },
                plot: {
                  stacked: dailySummaryCtrl.activeChartType == 'bar',
                  stackType: "normal"
                },
                scaleX: {
                  zooming: true,
                  transform: {
                    type: "date",
                    text: "%Y-%mm-%dd" + token
                  },
                  labels: scaleX
                },
                scaleY: {
                  thousandsSeparator: ',',
                },
                series: series_stack
              };


            } else {
              dailySummaryCtrl.chartObj = {};
            }

          }


        }, false);
      }


      function drawPieChartData() {
        let param = angular.copy(dailySummaryCtrl.searchOption);
        param.svcId = null;
        param.systemName = ConfigManager.getSystemName();

        DataService.httpPost('/data/hdfs/used/getPieChartData', param, function(result) {
          //if(dailySummaryCtrl.pie.chartObj) dailySummaryCtrl.pie.chartObj.clear();
          if (dailySummaryCtrl.pie.chartObj) dailySummaryCtrl.pie = {};

          if (result.result == 1) {
            curr_date = result.data.curr_date;
            if (curr_date == '') {
              curr_date = moment(dailySummaryCtrl.searchOption.endTime).format('YYYY-MM-DD');
            }

            let userList = result.data.userList;
            let series_pie_curr = result.data.series_pie_curr;
            let series_pie_total = result.data.series_pie_total;

            for (let i = 0; i < userList.length; i++) {
              let user = userList[i];
              if (colorArr[i] == null)
                colorMap[user] = colorArr[i - colorArr.length];
              else colorMap[user] = colorArr[i];
            }

            if (series_pie_curr) {
              for (let i = 0; i < series_pie_curr.length; i++) {
                let user = series_pie_curr[i].name;
                series_pie_curr[i].itemStyle = {
                  normal: {
                    color: colorMap[user]
                  }
                };

              }
            }

            if (series_pie_total) {
              for (let i = 0; i < series_pie_total.length; i++) {
                let user = series_pie_total[i].name;
                series_pie_total[i].itemStyle = {
                  normal: {
                    color: colorMap[user]
                  }
                };

              }
            }

            dailySummaryCtrl.pie = {};
            dailySummaryCtrl.pie.config = {
              currDate: curr_date,
              tooltip: {
                trigger: 'item',
                // formatter: "{a} <br/>{b} : {c} ({d}%)"
                formatter: function(param) {
                  let _name = param.name;
                  let _value = param.value[0] || 0;
                  let _percent = param.percent;
                  return _name + '<br/>' + $filter('number')(_value) + ' GB<br/>(' + _percent + ' %)';
                }
              },
              legend: {
                show: true,
                x: 'center',
                y: 'top',
                data: userList,
                itemWidth: 10,
                itemHeight: 10,
                orient: 'horizontal'
              },
              calculable: true,
              series: [{
                  name: curr_date,
                  type: 'pie',
                  radius: [30, 80],
                  center: ['26%', '55%'],
                  // roseType : 'radius',
                  label: {
                    normal: {
                      show: true
                    },
                    emphasis: {
                      show: true
                    }
                  },
                  lableLine: {
                    normal: {
                      show: false
                    },
                    emphasis: {
                      show: true
                    }
                  },
                  itemStyle: {
                    normal: {
                      label: {
                        position: "outer"
                      },
                      labelLine: {
                        show: true
                      }
                    },
                    emphasis: {
                      label: {
                        show: true,
                        formatter: "{b}\n{d}%"
                      }
                    }
                  }
                },
                {
                  name: 'Total',
                  type: 'pie',
                  radius: [30, 80],
                  center: ['72%', '55%'],
                  // roseType : 'area',
                  label: {
                    normal: {
                      show: true
                    },
                    emphasis: {
                      show: true
                    }
                  },
                  itemStyle: {
                    normal: {
                      label: {
                        position: "outer"
                      },
                      labelLine: {
                        show: true
                      }
                    },
                    emphasis: {
                      label: {
                        show: true,
                        formatter: "{b}\n{d}%"
                      }
                    }
                  }
                }
              ]
            };

            dailySummaryCtrl.pie.data = [
              series_pie_curr,
              series_pie_total
            ];

          }

          dailySummaryCtrl.searchOption.specificTime = '';

        });
      }


      function getGridData() {
        dailySummaryCtrl.gridColumnDefs = [];
        let param = angular.copy(dailySummaryCtrl.searchOption);
        param.svcId = null;
        param.systemName = ConfigManager.getSystemName();
        DataService.httpPost('/data/hdfs/used/getGridData', param, function(result) {

          dailySummaryCtrl.gridData = result.data.grid;

          let tempColumnDefs = [];

          tempColumnDefs.push({
            headerName: "Date",
            headerClass: 'main-header',
            field: "insertTime",
            width: 110,
            cellRenderer: textAlignCenterRenderer
          });
          if (result.data.user && result.data.user.length > 0) {

            for (let i = 0; i < result.data.user.length; i++) {
              let name = result.data.user[i];
              if (name == 'TOTAL') {
                result.data.user.splice(i, 1);
              }
            }

            tempColumnDefs.push({
              headerName: 'TOTAL',
              headerClass: 'main-header',
              field: "TOTAL_totalCount",
              width: 130,
              cellRenderer: textAlignCenterRenderer
            });


            for (let i = 0; i < result.data.user.length; i++) {
              let svc = result.data.user[i];
              tempColumnDefs.push({
                headerName: svc,
                highlight: dailySummaryCtrl.searchOption.svcName,
                headerClass: 'main-header',
                field: svc + "_totalCount",
                width: 110,
                cellRenderer: textHighlightRenderer
              });
            }
          }


          dailySummaryCtrl.gridColumnDefs = tempColumnDefs;

        });
      }


      function openConfigPopup() {
        var popup = ngDialog.open({
          template: "/data/hdfs/popup/service_config_popup_template.html",
          className: "ngdialog-theme-default custom-width",
          showClose: false,
          disableAnimation: true,
          cache: false,
          closeByDocument: false,
          closeByEscape: false,  
          data: {procType: 'DATE'},        
          scope: $scope          
        }).closePromise.then(function(data) {                        
          getData()
        });


        var closer = $rootScope.$on('ngDialog.refresh', function(e, id) {
          if (id != popup.id) return;
          closer();
        });
      }


      function getData() {

        drawChartData();


        drawPieChartData();


        getGridData();
      }

      initialize();
    }
  ]);
});