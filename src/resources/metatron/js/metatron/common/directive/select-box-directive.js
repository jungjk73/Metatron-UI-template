define(['app'], function (app) {
	app.directive("selectBox", ['DataService', function (DataService) {
		'use strict';
		return {
			restrict: "E",
			template: '<div class="{{className}}">' +
							'	<input type="text" class="mu-value" ng-click="inputClick($event)" ng-keydown="keyPress($event)" ng-change="key(myValue)" ng-model="myValue" style="cursor:pointer;{{styleCode}};width:{{width}}px;min-width:{{width}}px;" />' +
							'	<ul class="mu-list" style="z-index: 15;">' +
							'		<li style="width:{{width}}px-5px;" ng-repeat="element in nodeList | searchTextFilter : textValue:labelKey track by $index" value="{{element[valueKey]}}" ng-click="selectValueClick($event , element)">{{element[labelKey]}}</li>' +
							'	</ul>' +
							'</div>',
			scope: {
				data: "=",
				labelKey: "@",
				valueKey: "@",
				autoSelect : "=?",
				selectedValue: "=",
				childDirection: "@",
				onDataChange: "&",
				className: "@",
				width: "@",
				styleCode: "@",
				commonCodeKey: "@",
				showAll: "@",
				editable: "@",
				themeType: "@"				// DARK or LIGHT(default LIGHT)
			},
			controller: ["$scope", "$element", "$attrs",
				function ($scope, $element, $attrs) {

					var DEFAULT_LABEL_KEY = "label";
					var DEFAULT_VALUE_KEY = "value";
					var target = angular.element($element);
					var selectedData;
					var currentValue = "";
					var childDirection = "down";
					var mode = $attrs.mode;
					var unbind = [];
					var themeType = "";

					var body = angular.element(angular.element("body"));
					body.bind('click', function (e) {
						if(!$(e.target).parent().hasClass("mu-selectbox")) {
              if(!$(e.target).parent().parent().hasClass("mu-selectbox")){
                var list = angular.element(document.getElementsByClassName("mu-selectbox"));
                list.removeClass("on");
              }   
            }
					});

					$scope.className = "mu-selectbox";
					$scope.textValue = "";

					$scope.inputClick = function (event) {

						// 초기화
						angular.element("select-box").children("div").each(function () {
							angular.element(this).removeClass("on");
						});
						angular.element("type-box").children("div").each(function() {
							angular.element(this).removeClass("on");
						});

						var $curr = angular.element(event.currentTarget);
						var $parent = $curr.parent();
						if ($parent.hasClass("on"))
							$parent.removeClass("on");
						else
							$parent.addClass("on");
					};

					$scope.keyPress = function (event) {
						var $curr = angular.element(event.currentTarget);
						var $parent = $curr.parent();
						$parent.addClass("on");
					};

					$scope.key = function (data) {
						$scope.textValue = data;
					};

					$scope.selectValueClick = function (event, element) {
						var $curr = angular.element(event.currentTarget);
						var $parent = $curr.parent().parent();
						$parent.removeClass("on");
						selectedData = element;

						if ($scope.onDataChange && selectedData) {
							$scope.onDataChange({event: selectedData});
						}

						$scope.myValue = element[$scope.labelKey];
					};

					function dataChange(value) {
						if (!value || value.length < 1)
							return;

						if ($scope.showAll == 'true') {
							var obj = {};
							obj[$scope.labelKey] = "All";
							obj[$scope.valueKey] = "";
							value.splice(0, 0, obj);
						}
						$scope.nodeList = value;

						if (mode && mode.toUpperCase() == 'HOSTNAME') {
							selectedData = value[0];
						} else {
							if (currentValue != null && currentValue != "") {
								selectedData = getValueByNode(currentValue);
							} else {
								selectedData = value[0];
							}

							if (!selectedData)
								return;
						}

						$scope.myValue = selectedData[$scope.labelKey];
						if ($scope.autoSelect != null && $scope.autoSelect == false) {

						} else {
							if ($scope.onDataChange && selectedData) {
								$scope.onDataChange({event: selectedData});
							}
						}

					}

					function commonCodeKeyChange(value) {
						if (value == null || value == "")
							return;

						DataService.httpPost("/common/getCommonCode", {type: value}, function (data) {
							if (data == null || data.data == null)
								return;

							var d = data.data;
							if(d.length > 0 && d[0][$scope.labelKey] == null) {
								for(var i=0; i<d.length; i++) {
									if(d[i][$scope.labelKey] == null)
										d[i][$scope.labelKey] = d[i].codeName;
									if(d[i][$scope.valueKey] == null)
										d[i][$scope.valueKey] = d[i].codeValue;
								}
							}

							dataChange(d);
						}, false);
					}

					function selectedValueChange(value) {
						if (value == null)
							value = "";

						currentValue = value;
						selectedData = getValueByNode(currentValue);

						if (selectedData != null) {
							$scope.myValue = selectedData[$scope.labelKey];
							if ($scope.onDataChange && selectedData) {
								$scope.onDataChange({event: selectedData});
							}
						}

					}

					function getValueByNode(value) {
						if ($scope.nodeList == null)
							return null;

						var l = $scope.nodeList.length;
						for (var i = 0; i < l; i++) {
							if (String(value).toUpperCase() == String($scope.nodeList[i][$scope.valueKey]).toUpperCase()) {
								return $scope.nodeList[i];
							}
						}
						return null;
					}

					function addEventHandler() {
						unbind = [
							$scope.$on('$destroy', clear),
							$scope.$watch("data", dataChange),
							$scope.$watch("commonCodeKey", commonCodeKeyChange),
							$scope.$watch("selectedValue", selectedValueChange),
							$scope.$watch("childDirection", function (value) {
								childDirection = value
							})
						];
					}

					function setAttr() {
						$scope.className = ($attrs.className == null || $attrs.className == "") ? "mu-selectbox" : $attrs.className;
						themeType = ($attrs.themeType == null || $attrs.themeType == "") ? "" : $attrs.themeType;
						if (themeType != null && themeType != "" && themeType.toUpperCase() == "DARK")
							$scope.className += " black";
						$scope.width = ($attrs.width == null || $attrs.width == "") ? "auto" : ($attrs.width + "-10px");
						$scope.labelKey = ($attrs.labelKey == null || $attrs.labelKey == "") ? DEFAULT_LABEL_KEY : $attrs.labelKey;
						$scope.valueKey = ($attrs.valueKey == null || $attrs.valueKey == "") ? DEFAULT_VALUE_KEY : $attrs.valueKey;
						$scope.showAll = ($attrs.showAll == null || $attrs.showAll == "") ? "false" : $attrs.showAll;
						if ($attrs.styleCode)
							$scope.styleCode = $attrs.styleCode;
						else
							$scope.styleCode = ($attrs.style == null || $attrs.style == "") ? "" : $attrs.style;

						if($attrs.editable != null && $attrs.editable != "" && $attrs.editable == "false") {
							angular.element(target).find("input").attr("readonly", "readonly");
						} else {
							angular.element(target).find("input").removeAttr("readonly");
						}
					}

					/**
					 * 초기 함수
					 */
					function initialize() {
						addEventHandler();
						setAttr();
					}

					// clear-memory
					function clear() {
						unbind.forEach(function (fn) {
							fn();
						});
						$scope.$destroy();
						target.off("remove", clear);
						target = null;
						body = null;
					}

					target.on("remove", clear);
					initialize();
				}],
			link: function (scope, element) {

			}
		}
	}]).filter('searchTextFilter', function () {
		return function (items, search, labelKey) {
			if (!search) {
				return items;
			}

			if (search === '') {
				return items;
			}

			return items.filter(function (element) {
				if (search === '' || search.toUpperCase() == 'ALL') {
					return true;
				} else {
					var l = (element[labelKey] == null) ? "" : element[labelKey].toUpperCase();
					return (l.indexOf(search.toUpperCase()) > -1 || l == "ALL");
				}
			});
		};
	});

});