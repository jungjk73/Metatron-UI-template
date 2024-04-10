define(['app'], function (app) {
	app.directive("searchCondition", ["$compile", function ($compile) {
		'use strict';

		return {
			restrict: "E",
			transclude: true,
			templateUrl: "/common/search-condition-template.html",
			scope: {
				nodes: "=",
				onSearchClick: "&",
				onDataChange: "&",
				refresh: "="
			},
			link: function postLink($scope, $element, $attrs) {

				// property
				var target = angular.element($element);
				var nodes = [];
				var unbind = [];

				$scope.itemMap = {};
				$scope.id = "";


				// method
				/**
				 * 검색 버튼 클릭
				 * @param event
				 */
				$scope.searchClickHandler = function (event) {
					if ($attrs.onSearchClick) {
						$scope.onSearchClick({event: event, param: nodes});
					}
				};

				/**
				 * 노드가 바뀔 때마다 실행되는 function
				 * @param event
				 * @param idx
				 */
				$scope.setSearchConditionValue = function (event, idx) {
					var node = nodes[idx];
					var type = node.type.toUpperCase();
					if (type == "SELECT") {
						node.value = event;
					} else if (type == "DATE") {
						node.startDate = event.sDateTime;
						node.endDate = event.eDateTime;
					}

					if ($attrs.onDataChange) {
						$scope.onDataChange({event: event, param: nodes, node: node});
					}
				};


				// function
				/**
				 * 검색조건 박스를 초기화 시키고 다시 setting
				 */
				function makeCustomNodes() {
					if (nodes == null || nodes.length < 1)
						return;

					let data = nodes;

					$scope.itemMap = {};

					var currentRowIndex = 1;
					var item = [];
					item.push('<div>');

					for (var i = 0; i < data.length; i++) {

						var id = data[i].type + "-" + getUniqueId();
						data[i].id = id;
						$scope.itemMap[id] = data[i].data;

						if (currentRowIndex < data[i].rowIndex) {
							currentRowIndex = data[i].rowIndex;
							item.push('</div>');
							item.push('<div>');
						}

						var h = [];
						var visible = (data[i].visible == null) ? true : data[i].visible;
						h.push('<div class="mu-item-group" ng-show="' + visible + '">');
						h.push('<label for="">' + data[i].title + '</label>');
						h.push(getCodeForNode(data[i], i));
						h.push('</div>');
						item.push(h.join(''));
					}
					item.push('</div>');

					var con = $("#searchBox-" + $scope.id);
					con.empty();
					con.append(item.join(''));
					$compile(con)($scope);
				}

				/**
				 * 데이터 타입에 따라서 html 코드 return
				 */
				function getCodeForNode(node, idx) {

					var width = (node.width == null) ? "100px" : node.width;
					var height = (node.height == null) ? "30px" : node.height;
					var css = [`width:${width}`, `height:${height}`];

					var code = [];
					if (node.type.toUpperCase() == "SELECT") {
						code.push('<select-box editable="false" class="ti_texBox" data="itemMap[\'' + node.id + '\']" style="' + css.join(';') + ';margin-bottom: 2px;" on-data-change="setSearchConditionValue(event, ' + idx + ')"></select-box>');
					} else if (node.type.toUpperCase() == "TEXT") {
						code.push('<input type="text" class="mu-input" style="' + css.join(';') + ';margin-top: 1px;" ng-model="nodes[' + idx + '].value" />');
					} else if (node.type.toUpperCase() == "NUMBER") {
						code.push('<input type="number" class="mu-input spinner-hide" min="1" style="' + css.join(';') + ';margin-top: 1px;" ng-model="nodes[' + idx + '].value" />');
					} else if (node.type.toUpperCase() == "DATE") {
						code.push('<date-time-selector s-date-time="nodes[' + idx + '].startDate" e-date-time="nodes[' + idx + '].endDate" on-data-change="setSearchConditionValue(event, ' + idx + ')"></date-time-selector>');
					} else if (node.type.toUpperCase() == "CUSTOM") {
						code.push(node.code);
					}

					return code.join('');
				}

				/**
				 * unique ID 리턴
				 */
				function getUniqueId() {
					return (new Date()).getTime() + Math.floor((Math.random() * 1000) + 1);
				}

				/**
				 * 검색조건 node
				 */
				function nodesChange(value) {
					if (value == null || nodes === value)
						return;

					nodes = value;
					makeCustomNodes();
				}

				/**
				 * 생성된 Node에 데이터 셋팅 할 때
				 * @param value
				 */
				function dataRefresh(value) {
					if(value == null || value.length < 1 || nodes == null || nodes.length < 1)
						return;

					let len = value.length;
					for(var i=0; i<len; i++) {
						if(value[i] == null || Object.keys(value[i]).length < 1)
							continue;

						let type = (value[i].type == null)? "":value[i].type.toUpperCase();
						let nLen = nodes.length;
						for(var j=0; j<nLen; j++) {
							let nType = (nodes[i].type == null)? "":nodes[i].type.toUpperCase();
							if(type == "DATE" && type == nType) {
								nodes[j].startDate = value[i].startDate;
								nodes[j].endDate = value[i].endDate;
							}
						}
					}
				}

				/**
				 * 속성 감시 이벤트 핸들러
				 */
				function addEventHandler() {
					unbind = [
						$scope.$watch("nodes", nodesChange),
						$scope.$watch("refresh", dataRefresh)
					];
				}

				/**
				 * 초기 함수
				 */
				function initialize() {
					$scope.id = getUniqueId();
					addEventHandler();
				}

				/**
				 * 메모리 해제
				 */
				function clear() {
					unbind.forEach(function (fn) {
						fn();
					});

					$scope.$destroy();
					target.off("remove", clear);
				}

				target.on("remove", clear);
				initialize();
			}
		}
	}]);
});