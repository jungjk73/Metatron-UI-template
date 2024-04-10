define(["app", "moment"], function(app, moment) {
  app.controller("CodeManagementCtrl", ["$rootScope", "$scope", "$interval", "$timeout", "$filter", "$http", "$q", "DataService", "ConfigManager", "GridRenderer", "ngDialog", 'CommonUtil',
    function($rootScope, $scope, $interval, $timeout, $filter, $http, $q, DataService, ConfigManager, GridRenderer, ngDialog, CommonUtil) {
      "use strict";

      let vm = this; 
      let unbind = [];   

      /* 공통코드 목록 */
      function getCommonCodeList(schCodeParentSeq, depth) {   
        DataService.httpGet("/admin/code/getCommonCodeList?schCodeParentSeq="+schCodeParentSeq+"&schDepth="+depth, {}, function(result) {
          if (result.result === 1 && result.data !== null) {           
            vm.commonCodeList[depth] = result.data;
            vm.commonCodeList_origin[depth] = result.data;
          }
        });     
      }

      /* 공콩코드 등록 */
      function insertCommonCode(param, depth) {
         DataService.httpPost("/admin/code/insertCommonCode", param, function(result) {
          if (result.result === 1 && result.data !== null) {           
            ngDialog.closeAll();
            getCommonCodeList(param.codeParentSeq, depth);
          }
        }); 
      }

      /* 공콩코드 수정 */
      function updateCommonCode(param) {
         DataService.httpPost("/admin/code/updateCommonCode", param, function(result) {
          if (result.result === 1 && result.data !== null) {    
            ngDialog.closeAll();         
            getCommonCodeList(param.codeParentSeq, param.codeDepth);
          }
        }); 
      }

      /* 공콩코드 삭제 */
      function deleteCommonCode(param) {
         DataService.httpPost("/admin/code/deleteCommonCode", param, function(result) {
          if (result.result === 1 && result.data !== null) {             
            getCommonCodeList(param.codeParentSeq, param.codeDepth);
          }
        }); 
      }

     

      function clickedRow(value, event, targetDepth){
        resetCodeList(targetDepth);
        if(value.length == 0 || event == null) {
          vm.selectRow[targetDepth-1] = undefined;
          return;
        }       
        vm.selectRow[targetDepth-1] = angular.copy(event.data);
        

        getCommonCodeList(value[0].data.codeSeq, targetDepth);
      }
      

      function doubleClickedRow(event, depth) {
        if(event == null || event.data == null) return;
        
        openPopup('EDT', depth, angular.copy(event.data));
      }
     

      function changeFilterHandler(newVal, oldVal, depth) {

        if(newVal != oldVal) {
          resetCodeList(depth+1);
          var originCodeList = vm.commonCodeList_origin[depth];
          if(newVal == '') {
            vm.commonCodeList[depth] = originCodeList;             
          }else {            
            vm.commonCodeList[depth] = _.filter(originCodeList, function(item){              
              return(item.codeName !== '' && item.codeName !== null && item.codeName.toUpperCase().indexOf(newVal.toUpperCase()) > -1);
            });  
          }          
        }
      }

      function resetCodeList(targetDepth) {
        $timeout(function(){
          for(var i=targetDepth; i<3;i++) {
            vm.filter['codeName'+i] = '';
            vm.commonCodeList[i] = [];
            vm.commonCodeList_origin[i] = [];
            vm.selectRow[i] = undefined;
          }
        })            
      }

      function openPopup(cmd, depth, editSelectRow) {
        vm.detailForm = {
          codeSeq: null,
          codeParentSeq: null,
          codeParentName: '',
          codeName: '',
          codeValue: '',
          description: '',
          useFlag: 'Y',
          sortOrder: 0

        }; 
        vm.depth = depth;

        vm.cmd = cmd;

        if(vm.cmd == 'ADD') {
          if(depth == 0) {
            vm.detailForm.codeParentSeq = 0;            
          }else {
            if(vm.selectRow[depth-1] == undefined) {
              alert('Please select the Parent code')
              return;
            }
            vm.detailForm.codeParentSeq = vm.selectRow[depth-1].codeSeq;
            vm.detailForm.codeParentName = vm.selectRow[depth-1].codeName;

          }
          DataService.httpGet("/admin/code/getMaxCommonCodeSeq?schCodeParentSeq=" + vm.detailForm.codeParentSeq, {}, function(result) {
            if (result.result === 1 && result.data !== null) {
              vm.detailForm.codeSeq = result.data + 1;
            }
          });
        }else {
          vm.detailForm = editSelectRow;
        }     

        if(depth == 0) {
          vm.detailForm.codeParentName = '최상위코드';
        }   


        var popup = ngDialog.open({
              template: "/administrator/code-popup/code_add_template.html",
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

      function saveProcess() {
        if(CommonUtil.checkEmpty(vm.detailForm.codeSeq)) {
          alert('Please enter the Code Seq');
          return;
        }
        if(CommonUtil.checkEmpty(vm.detailForm.codeParentSeq)) {
          alert('Please select the Parent code')
          return;
        }
        if(CommonUtil.checkEmpty(vm.detailForm.codeName)) {
          alert('Please enter the Code Name');
          return;
        }

        if(vm.cmd == 'ADD') {
          insertCommonCode(vm.detailForm, vm.depth);
        }else if(vm.cmd == 'EDT') {
          updateCommonCode(vm.detailForm);
        }
      }

      function addEventListener() {    
        unbind = [
          $scope.$on(ConfigManager.getEvent("GRID_DELETE_BTN_EVENT"), function(event, data) {
              if (!confirm("Do you want to delete?")) return;

              console.log('GRID_DELETE_BTN_EVENT..... ', data);
              deleteCommonCode(data);
            })
        ]

          for(let i=0;i<3;i++) {
            unbind.push($scope.$watch("vm.filter.codeName"+i, function(newVal, oldVal){
              changeFilterHandler(newVal, oldVal, i);
            }))
          }   
      }

      function reset() {        
        vm.cmd = '';
        vm.commonCodeList = [];    
        vm.commonCodeList_origin = [];
        vm.commonCodeList_temp = [];    
        vm.selectRow = [];
        vm.detailForm = {
          codeSeq: null,
          codeParentSeq: null,
          codeParentName: '',
          codeName: '',
          codeValue: '',
          description: '',
          useFlag: 'Y',
          sortOrder: 0,
          codeDepth: null
        };
        vm.depth;
      }

      function initialize() {  
        
        vm.clickedRow = clickedRow;
        vm.doubleClickedRow = doubleClickedRow;  
        vm.filter = {
          codeName: []
        }
        vm.openPopup = openPopup;
        vm.saveProcess = saveProcess;       

        
        reset();
        addEventListener();

        getCommonCodeList(0,0);     
      }

      initialize();
    }
  ]);

});