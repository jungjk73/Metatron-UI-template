define(["app", "moment"], function(app, moment) {
  app.controller("MenuManagementCtrl", ["$rootScope", "$scope", "$interval", "$timeout", "$filter", "$http", "$q", "DataService", "ConfigManager", "GridRenderer", "ngDialog", 'CommonUtil',
    function($rootScope, $scope, $interval, $timeout, $filter, $http, $q, DataService, ConfigManager, GridRenderer, ngDialog, CommonUtil) {
      "use strict";

      let vm = this;  

      /* 메뉴 목록(tree) */
      function getMenuTreeList() {   
        DataService.httpGet("/admin/menu/getMenuTreeList", {}, function(result) {
          if (result.result === 1 && result.data !== null) {           
            vm.menuTreeList = result.data;
          }
        });     
      } 

      function treeOnSelectionHandler(node, expanded) {
        if(expanded) {
          currentProcessSeq = node.processSeq;
          treeExpandedNodeHandler(node);
        }
      }; 

      function treeExpandedNodeHandler(key, node) {
        let list = vm.tree.menuExpanded;
        let uniqueKey = 'menuId';
        let keyMap = _.indexBy(list, uniqueKey);

        let exist = false;
        let len = list.length;
        for(var i=0; i<len; i++) {
          if(keyMap[node[uniqueKey]] != null) {
            exist = true;
            break;
          }
        }

        if(!exist)
          keyMap[node[uniqueKey]] = node;

        let result = [];
        let keyMapKeys = Object.keys(keyMap);
        let keyMapLen = keyMapKeys.length;
        for(var i=0; i<keyMapLen; i++) {
          var data = keyMap[keyMapKeys[i]];
          result.push(data);
        }

        if(result != null && result.length > 0)
          vm.tree.menuExpanded = result;
      }  

      // method
      function getNodeClass(menuParentId, node) {
        if(node != null && node.label != null && node.label.length > treeLabelMaxLength)
          treeLabelMaxLength = node.label.length;
        
        return 'metric-child';
      };


      function checkTreeNode(selected, key) {

        // 상위를 체크 또는 해제를 했을 때 하위 노드도 checked 값을 셋팅
        if(selected.treeDepth != null) {
          var list = selected.childrenList;
          if((list != null && list.length > 0) && ((key == 'system' && selected.treeDepth == 0) || (key == 'hostAlarm' && selected.treeDepth == 1))) {
            for (var i = 0; i < list.length; i++)
              list[i].checked = selected.checked;
          }
        }

        // 초기화
        vm.config[key] = [];

        treeConfigSetting(key);
        metricDivScrollHandler();
      };

      vm.selectTreeLabel = function (node) {
        var metricFlag = (key == 'metric' && node.treeDepth != 2);
        var hostRootFlag = (key == 'hostAlarm' && node.treeDepth == 0);
        if(!(metricFlag || hostRootFlag))
          node.checked = (node.checked == 'Y')? 'N':'Y';

        vm.checkTreeNode(node, key);

        if(node.childrenList != null && node.childrenList.length > 0) {
          currentProcessSeq = node.processSeq;
          treeExpandedNodeHandler(key, node);
        }
      };

      function reset() {
        vm.menuTreeList = []; 
       
      }

      function initialize() {
        vm.treeOptions = {
          nodeChildren: "children",
          dirSelectable: true
        };  

        vm.treeOnSelectionHandler = treeOnSelectionHandler;
        vm.getNodeClass = getNodeClass;
        vm.checkTreeNode = checkTreeNode;

        reset();
        getMenuTreeList();       
      }

      initialize();
    }
  ]);

});