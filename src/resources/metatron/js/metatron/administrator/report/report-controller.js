define(["app", "moment"], function(app, moment) {
  app.controller("ReportCtrl", ["$rootScope", "$scope", "$interval", "$timeout", "$filter", "$http", "$q", "$controller", "DataService", "ConfigManager", "GridRenderer", "ngDialog", 'CommonUtil',
    function($rootScope, $scope, $interval, $timeout, $filter, $http, $q, $controller, DataService, ConfigManager, GridRenderer, ngDialog, CommonUtil) {
      "use strict";

      let vm = this;
      let unbind = [];
      let currName = [];
      let currEmail = [];
      let infoPopId = '';


      /* 선택된 날짜(월)의 모든 Report 파일 목록 가져오기 */
      function getReportFileList(schDate) {        
        DataService.httpGet("/administrator/report/getReportFileList?schDate="+schDate, {}, function(result) {
          if (result.result === 1 && result.data !== null) {
            _.each(result.data, function(item){
              //item.filePath = '/resources/js/metatron/activities/retention/sample/upload.xlsx';
              item.fileName = item.filePath.replace(/^.*[\\\/]/, '');
            })
            vm.reportFileList = result.data;
          }
        });
      }

      /* Report 사용자 정보 가져오기 */
      function getReportUserList() {   
        reset();     
        DataService.httpGet("/administrator/report/getReportUserList", {}, function(result) {
          if (result.result === 1 && result.data !== null) {
            vm.reportUserList = result.data;
          }
        });
      }

      function insertReportUser() {         

         if(CommonUtil.checkEmpty(vm.input.userName)) {
            alert("Please check the User Name.");
            return;
         }

         if(CommonUtil.checkEmpty(vm.input.userEmail)) {
            alert("Please check your email.");
            return;
         }

         if (validateEmail(vm.input.userEmail)) {
            DataService.httpPost("/administrator/report/insertReportUser", vm.input, function(result) {
              if (result.result === 1 && result.data !== null) {               
                getReportUserList();
              }
            });
         }         
      }


      // Report Connection URL 설정 popup
      function onReportConnectionUrlInfo(event, data) {  
        vm.selectSystemSeq = data.systemSeq;
        vm.selectSystemName = data.systemName;
        var popup = ngDialog.open({
          template: "/administrator/report-popup/report_connection_setting_popup_template.html",
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

      }


      // Report Metric 임계치 설정 popup
      function onReportMetricConfig(event, data) {

        vm.reportMetricConfigList = [];
        vm.selectSystemSeq = data.systemSeq;
        vm.selectSystemName = data.systemName;
        DataService.httpGet("/administrator/report/getReportMetricConfigList?systemSeq="+vm.selectSystemSeq, {}, function(result) {
          if (result.result === 1 && result.data !== null) {

            vm.reportMetricConfigList = result.data;           

            var popup = ngDialog.open({             
              template: "/administrator/report-popup/report_threshold_setting_popup_template.html",
              className: "ngdialog-theme-default custom-width",
              showClose: false,
              disableAnimation: true,
              cache: false,
              closeByDocument: false,
              closeByEscape: false,
              scope: $scope
            });
            infoPopId = popup.id;
            var closer = $rootScope.$on('ngDialog.refresh', function (e, id) {
              if (id != popup.id) return;
              closer();
            });
          }
        });
      }

      // Report Metric 임계치 설정
      function reportMetricConfigSetting() {
        var params = [];
        _.each(vm.reportMetricConfigList, function(val, key){
          _.each(val, function(item){
            if((item.val !== '' && item.val !== null) || item.delChk) {
              item.systemSeq = vm.selectSystemSeq;
              params.push(item);
            }
          })
        })

        if(params.length > 0) {
          DataService.httpPost("/administrator/report/reportMetricConfigSetting", params, function(result) {                
            ngDialog.close(infoPopId);
          });
        }else {
          alert("Please check value.")
        }
                
      }

      // Report 환경설정
      function onSettingReport() {

        vm.reportSettingList = [];
        DataService.httpGet("/administrator/report/getReportSettingList", {}, function(result) {
          if (result.result === 1 && result.data !== null) {

            vm.reportSettingList = result.data;

            var popup = ngDialog.open({              
              template: "/administrator/report-popup/report_setting_popup_template.html",
              className: "ngdialog-theme-default custom-width",
              showClose: false,
              disableAnimation: true,
              cache: false,
              closeByDocument: false,
              closeByEscape: false,
              scope: $scope
            });

            var closer = $rootScope.$on('ngDialog.refresh', function (e, id) {
              if (id != popup.id) return;
              closer();
            });
          }
        });
      }

      /* Report 설정정보 update */
      function updateReportSetting() {
        var chk = 0;
        for(var i=0;i<vm.reportSettingList.length;i++){
          if(CommonUtil.checkEmpty(vm.reportSettingList[i].clusterKorName) || CommonUtil.checkEmpty(vm.reportSettingList[i].reportSortOrder)) chk++;
        }

        if(chk > 0) {
          alert('Please enter your setting information.');
          return;
        }

        DataService.httpPost("/administrator/report/updateReportSetting", vm.reportSettingList, function(result) {  
          vm.selectSystemSeq = '';              
          ngDialog.closeAll();
        });
      }

      function addEventListener() {
        unbind = [
          $scope.$on(ConfigManager.getEvent('GRID_SETTING_BTN_EVENT'), function(event, data){
            if(data.targetEvent == 'threshold') {
              onReportMetricConfig(event,data);
            }else if(data.targetEvent == 'connection') {
              onReportConnectionUrlInfo(event, data);
            }
          }),
          $scope.$on(ConfigManager.getEvent("GRID_DELETE_BTN_EVENT"), function(event, data) {
            if (!confirm("Do you want to delete?")) return;

            console.log('GRID_DELETE_BTN_EVENT..... ', data);
            let param = [{
              userName: data.name
            }];
            DataService.httpDelete("/administrator/report/deleteReportUser/"+data.idx, {}, function(result) {
              getReportUserList();
            });
          }),
          $scope.$on(ConfigManager.getEvent("GRID_EDIT_BTN_EVENT"), function(event, data) {
            console.log('GRID_EDIT_BTN_EVENT..... ', data);

            if ($('.editCol').length > 0) {
              let $row = $('.editCol').parent().parent();
              let _name = $('input[data-column="userName"]').val();
              let _email = $('input[data-column="userEmail"]').val();

              if(CommonUtil.checkEmpty(_name)) {
                alert("Please check the User Name.");
                return;
              }

              if (CommonUtil.checkEmpty(_email)) {
                alert("Please check your email.");
                return;
              }


              if (!validateEmail(_email)) return;


              let param = {};
              param.idx = data.data.idx;
              param.userName = _name;
              param.userEmail = _email;

              DataService.httpPost("/administrator/report/updateReportUser/", param, function(result) {
                if (result.result === 1) {
                  $row.find('input[data-column="userName"]').parent().parent().text(_name);
                  $row.find('input[data-column="userEmail"]').parent().parent().text(_email);
                  $row.find('.editCol').remove();
                  currName.push(_name);
                  currEmail.push(_email);
                }else {
                  return;
                }
              });

              let rowIdx = $row.attr('row');
              vm.userList[rowIdx].editMode = false;
            }


            if (data.data.editMode) { // input text 로 변경하여 사용자가 내용 수정하도록 처리

              let $row = $('#userListGrid .ag-body-container .ag-row:eq(' + data.rowIndex + ')');
              let columns = vm.gridObj.grid.columnDefs;

              let colObj = {};

              let childNodes = $row[0].childNodes;
              let _name = '';
              let _email = '';

              for (let i = 0; i < columns.length; i++) {
                if (columns[i].field && columns[i].field != '') {
                  let value = $(childNodes[i]).text();
                  colObj[columns[i].field] = value;

                  if (i == 1) _name = $(childNodes[i]).text();
                  if (i == 2) _email = $(childNodes[i]).text();

                  $(childNodes[i]).html('<div style="margin-top: -5px;" class="editCol"><input style="height: 27px; text-align: center;" value="' + value + '" data-origin="' + value + '" data-column="' + columns[i].field + '"></div>');
                }
              }

              $('.editCol > input').on('change', function() {
                let field = $(this).attr('data-column');
                colObj[field] = $(this).val();
              });

              data.data.editObj = colObj;

              for (let i = 0; i < currName.length; i++) {
                if (currName[i] == _name) {
                  currName.splice(i, 1);
                  i--;
                }
              }

              for (let i = 0; i < currEmail.length; i++) {
                if (currEmail[i] == _email) {
                  currEmail.splice(i, 1);
                  i--;
                }
              }
              console.log(currName, currEmail);

            } else {
              return;
            }

          }),
          $scope.$on('$destroy', destroy)
        ];
      }

      function getReportDownload(fileInfo) {
        var defferd = $q.defer();     
        var fileName = fileInfo.fileName;
        var param = {
          filePath: fileInfo.filePath         
        }
        $http({
          method: 'POST',
          url: '/administrator/report/download',
          responseType: 'arraybuffer', 
          headers: {'Accept': 'application/vnd.ms-excel',},
          params: param
        }).success(function (data, status, headers, config) {       
          if(data.byteLength > 0) {            
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
          }else {
            alert("The file does not exist.");
            defferd.reject();
          }

        }).error(function (response, status, headers, config) {
          alert("The file does not exist.");
          defferd.reject();
        });
        return defferd.promise;
      };


      function onCalendarClick(event) {         
         getReportFileList(event);
      }

      function onDownloadClick(event) {
        if(event == '') return;
        getReportDownload(event).then(function(result){
          console.log('download success');
        });
      }
      
      function validateEmail(email, checkDup) {
        if (email != null && email.trim() != '') {
          if (email.match(CommonUtil.REGEXP_EMAIL) == null) {
            alert("The Email format is not correct.");
            return false;
          }
        }
        return true;
      }

      function destroy() {
        unbind.forEach(function(fn) {
          //clear();
          fn();
        });
      }


      function reset() {         
         vm.reportUserList = [];   
         vm.reportFileList = [];
         vm.reportSettingList = [];
         vm.reportMetricConfigList = [];
         vm.selectSystemSeq = '';
         vm.selectSystemName = '';

         vm.input = {
            userName: '',
            userEmail: ''
         }      
      }

      function initialize() {
         vm.insertReportUser = insertReportUser;
         vm.onCalendarClick = onCalendarClick;
         vm.onDownloadClick = onDownloadClick;
         vm.onSettingReport = onSettingReport;
         vm.updateReportSetting = updateReportSetting;
         vm.onReportMetricConfig = onReportMetricConfig;
         vm.reportMetricConfigSetting = reportMetricConfigSetting;
         vm.onReportConnectionUrlInfo = onReportConnectionUrlInfo;

          vm.conditionList = [
            {label: '>', value: '>'},
            {label: '<', value: '<'},
            {label: '>=', value: '>='},
            {label: '<=', value: '<='},
            {label: '==', value: '=='}
          ];

         reset();
         addEventListener();
         //getReportFileList();
         getReportUserList();
      }

      initialize();
    }
  ]);

});