define(["app"], function(app) {
  app.factory("MetricDashboardFactory", function() {
    "use strict";

    return {

      // Line Chart Object
      createLineChartObj: function() {

        var obj = {
          grid: {
            left: '5px',
            right: '5px'
          },
          xAxis: {
            show: false,
            data: ['1', '2', '3', '4', '5', '6', '7']
          },
          yAxis: {
            show: false,
            type: 'value'
          },
          series: [{
            data: [82, 93, 90, 93, 129, 133, 132],
            type: 'line',
            smooth: true
          }, {
            data: [62, 30, 87, 65, 110, 50, 90],
            type: 'line',
            smooth: true
          }]
        };

        return obj;
      },

      // Treemap Chart Obj
      createTreemapChartObj: function() {
        var obj = {
          tooltip: {
            formatter: function(info) {
              if (info.data.ip == undefined) return;
              var tootipData = '<div>';
              // tootipData += '   <div class="tooltip_title">' + info.name + '</div>';
              tootipData += '   <div class="tooltip_detail">';
              tootipData += '       <div class="row"><div><span class="treemap-txt">IP     </span> : <span class="treemap-txt">' + info.data.ip + '</span></div></div>';
              tootipData += '       <div class="row"><div><span class="treemap-txt">Host Name</span> : <span class="treemap-txt">' + info.name + '</span></div></div>';
              tootipData += '   </div>';
              tootipData += '   <div class="alarms" style="margin-top:10px">';

              if (info.value[1] > 0) {
                let tb = [];
                tootipData += '<table class="mu-formbox-vertical" style="width: 100%;">';
                tootipData += '   <thead><tr><th class="treemap-txt">Grade</th><th class="treemap-txt">Date</th><th class="treemap-txt">Message</th></thead>';
                tootipData += '   <tbody>';
                tootipData += '<tr>';
                tootipData += '   <td style="text-align: center;"><span class="mu-icon circle txt-red"></span></td>';
                tootipData += '   <td class="treemap-txt" style="margin-left:5px">2019.12.16 12:33:40</td>';
                tootipData += '   <td class="treemap-txt" style="margin:0px 5px 0px 5px">' + 'TRINOSERVER connect timed out' + '</td>';
                tootipData += '</tr>';

                tootipData += '</tbody>';
                tootipData += '</table>';
              }

              tootipData += '   </div>';
              tootipData += '</div>';

              return [tootipData].join('');

            }
          },
          series: [{
            name: 'ALL',
            top: 10,
            left: 10,
            right: 10,
            bottom: 50,
            type: 'treemap',
            label: {
              show: true,
              formatter: '{b}'
            },
            upperLabel: {
              normal: {
                show: true,
                height: 30
              }
            },
            itemStyle: {
              normal: {
                borderColor: '#fff'
              }
            },
            // visualMin: 0,
            // visualMax: 1,
            visualDimension: 1,
            levels: this.getLevelOption(),
            data: []
          }]
        }

        return obj
      },

      // Treemap Chart series level option
      getLevelOption: function() {
        return [{
            itemStyle: {
              normal: {
                borderColor: '#333b5b',
                borderWidth: 0,
                gapWidth: 5
              }
            },
            upperLabel: {
              normal: {
                show: false
              }
            }
          },
          {
            color: ['#0b8a22', '#0b8a22', '#942e38'],
            colorMappingBy: 'value',
            itemStyle: {
              normal: {
                borderColor: '#555',
                borderWidth: 5,
                gapWidth: 1
              },
              emphasis: {
                borderColor: '#ddd'
              }
            }
          },
          {
            itemStyle: {
              normal: {
                borderWidth: 1,
                gapWidth: 1,
                borderColorSaturation: 0.6
              }
            }
          }
        ];
      },

      // txt 파일 check
      checkFileType: function(filename) {
        var arrFileName = filename.split(".");
        var extensions = arrFileName[arrFileName.length - 1].toLowerCase();
        if (extensions === 'txt') {
          return true;
        }
        return false;
      },

      // 첫글자 대문자
      toCapitalize: function(text) {
        var text = text.replace(/^./, text[0].toUpperCase());
        return text;
      }


    }
  });
});