if (typeof module !== "undefined" && typeof exports !== "undefined" && module.exports === exports) {
	module.exports = 'metatronGrid';
}

(function (angular) {
	'use strict';

	angular.module('metatronGrid', []).directive("metatronGrid", ["$compile", "$timeout", "GridRenderer", "DataService", function ($compile, $timeout, GridRenderer, DataService) {
		return {
			restrict: "EA",
			require: "metatronGrid",
			controllerAs: "gridCtrl",
			scope: {
				id: "@",
				headerHeight: "@",
				rowHeight: "@",
				gridWidth: "@",
				gridHeight: "@",
				gridTheme: "@",

				rowdata: "=", // 그리드 데이터
				dyColumns: "=?", // column 동적으로 생성시
				dyGridOption: "=?", // 옵션 동적으로 생성시
				suppressRow: "=?", // check 박스 사용 안할경우 single select

				useHeaderCheck: "=?",
				selectionType: "@", // single , multi
				rowModelType: "@", // virtual or paginagion or parameter
				rowUniqueField: "@",    // unique key로 사용되는 field지정
				selectedList: "=",  // pragramatically select node;
				sortColumn: "=?",
				sortEnable: "=?",
				selectedIndex: "=?",// rowselectedindex

				pageSize: "@", // 스크롤시 페이지사이즈
				pageStartKey: "@",
				pageEndKey: "@",
				pageLimitKey: "@",

				requestUrl: "=?", // 스크롤시 데이터 받아오는 url
				requestParam: "=?", // 스크롤시 데이터 받아오는

				onRowDoubleClick: "&", // 그리드 row 더블클릭
				onDataResultCallback: "&",
				onRowClick: "&", // 그리드 선택 row
				searchGrid : "@",

				addRowData: "=",
				deleteRowData: "=",
				reloadData: "=",
				refreshGrid: "=",

				gridObj: "=?"
			},
			controller: ["$scope", "$rootScope", "$q", function (scope, $rootScope, $q) {
				var me = this;
				var defaultRowHeight = 37;
				var defaultHeaderHeight = 37;
				var defalutSort = false;
				var defalutSuppressRow = false;
				var columns = [];
				var unbind = [];
				var getRowsParam;
				var change = true;
				var rowdata = null;
				var total;
				var first = true;
				var url = "";
				var param = null;
				var scrollTop;
				var selectedIndex;
				var lastClickEvent;

				scope.pageStartKey = scope.pageStartKey == undefined ? "START" : scope.pageStartKey;
				scope.pageEndKey = scope.pageEndKey == undefined ? "END" : scope.pageEndKey;
				scope.pageLimitKey = scope.pageLimitKey == undefined ? "LIMIT" : scope.pageLimitKey;
				scope.rowHeight = scope.rowHeight == undefined ? defaultRowHeight : scope.rowHeight;
				scope.headerHeight = scope.headerHeight == undefined ? defaultHeaderHeight : scope.headerHeight;
				scope.sortEnable = scope.sortEnable == undefined ? defalutSort : scope.sortEnable;
				scope.suppressRow = scope.suppressRow == undefined ? defalutSuppressRow : scope.suppressRow;
				scope.searchGrid = ( scope.searchGrid == undefined || scope.searchGrid == 'false') ? false : true;
				selectedIndex = scope.selectedIndex == undefined ? null : scope.selectedIndex;

				me.init = function () {
					var setGridJob = $q.defer();
					if (scope.dyColumns != undefined) {
						columns = scope.dyColumns;
					}

					if (scope.dyGridOption) {
						me.grid = scope.dyGridOption;
					} else {
						me.grid = {
							columnDefs: columns,
							enableColResize: true,
							enableSorting: scope.sortEnable,
							enableFilter: false,
							groupHeaders: true,
							suppressMovable: true,
							suppressMovableColumns: true,
							// overlayNoRowsTemplate: "No Data.",
							overlayNoRowsTemplate: "<span id='ngRowMsg'></span>",
							rowHeight: Number(scope.rowHeight),
							headerHeight: Number(scope.headerHeight),
							suppressRowClickSelection: scope.suppressRow,
							rowModelType: scope.rowModelType,
							onSelectionChanged: selectionChanged,
							onRowClicked: function(event) {
								lastClickEvent = event;
							},
							onRowDoubleClicked: onRowDoubleClick,
							angularCompileRows: true,
							onCellValueChanged: function (event) {
								console.log('onCellValueChanged: ' + event.colDef.field + ' = ' + event.newValue);
							},
							onRowValueChanged: function (event) {
								var data = event.data;
								console.log('onRowValueChanged: (' + data.make + ', ' + data.model + ', ' + data.price + ')');
							},
							onGridReady: function (event) {
								event.api.sizeColumnsToFit();
							}
						};
					}

					if (scope.rowModelType == "virtual") {
						if (scope.useHeaderCheck === true) {
							console.warn('headerCheckBox - does not work with virtual pagination');
						}
					} else {
						if (scope.useHeaderCheck === true) {
							me.grid.headerCellRenderer = headerCellRendererFunc;
						}
					}

					me.grid.getRowClass = getRowClassFunc;

					setGridJob.resolve(me.grid);

					return setGridJob.promise;
				};

				scope.gridObj = me;

				function selectionChanged(event) {
					if(scope.rowdata == null)
						return;

					if (scope.rowModelType != "virtual") {
						if (me.grid.api.getSelectedRows().length != scope.rowdata.length) {
							$('#headerchk' + scope.id).prop('checked', false);
						} else if (me.grid.api.getSelectedRows().length == 0 || scope.rowdata.length == 0) {
							$('#headerchk' + scope.id).prop('checked',false);
						} else {
							$('#headerchk' + scope.id).prop('checked',true);
						}
					}

					var node = me.grid.api.getSelectedNodes();
					selectedIndex = (node  == null || node .length == 0)? null:node[0].childIndex;
					scope.onRowClick({
						value: node,
						event: lastClickEvent
					});

					// 현재 selection change에 이벤트가 걸려있어서 클릭하지도 않았는데 데이터가 바꼈을때 이벤트가 발생해서
					// click이벤트는 꼭 초기화를 시켜줘야함.
					lastClickEvent = null;
				}

				function onRowDoubleClick(event) {
					if (scope.onRowDoubleClick)
						scope.onRowDoubleClick({
							event: event
						});
				}

				function getRowData() {
					first = true;
					DataService.httpPost(scope.requestUrl, param, getRowDataResult);
				}

				function getRowDataResult(data) {
					total = data.data.total;
					$rootScope.$broadcast(scope.id + ":getTotalData", total);
					setRowData();
					getRequestResult(data);
					callbackHandler(data.data);
				}

				function setRowData() {
					var dataSource = {
						rowCount: null, // behave as
						pageSize: total,
						overflowSize: total,
						getRows: function (params) {
							getRowsParam = params;
							makeRowData(getRowsParam);
							first = false;
						}
					};
					me.grid.api.setDatasource(dataSource);

					me.grid.api.gridPanel.eBodyViewport.addEventListener("scroll", function (evt) {
						var currPage = Math.floor(me.grid.api.gridPanel.eBodyViewport.scrollTop/(Number(scope.rowHeight)*scope.pageSize));
						$rootScope.$broadcast(scope.id + ":setPageNumber", currPage);
					});
				}

				function makeRowData(value) {
					if (param == null)
						param = {};

					param[scope.pageStartKey] = value.startRow;
					param[scope.pageLimitKey] = scope.pageSize;

					if (first) {
						param[scope.pageEndKey] = scope.pageSize;
						me.grid.api.rowModel.pageSize = scope.pageSize;
						me.grid.api.rowModel.overflowSize = scope.pageSize;
					} else {
						param[scope.pageEndKey] = value.endRow;
					}

					//$rootScope.$broadcast(scope.id + ":setPageNumber", value.pageNumber);

					if(!first)
						DataService.httpPost(scope.requestUrl, param, getRequestResult);

					if (scope.searchGrid) {
						angular.element('#ngRowMsg').text('You need to search.');
					} else {
						angular.element('#ngRowMsg').text('No Data.');
					}
					me.grid.api.showNoRowsOverlay();
				}

				function getRequestResult(data) {
					var lastRow = -1;
					setTimeout(function () {
						if (total <= getRowsParam.endRow) {
							lastRow = Number(total);
						}

						if (data.data == null)
							return;

						// 데이터가 null이거나 데이터 length가 0일 때는 Overlay가 안 없어지도록 처리.
						if(data.data != null && data.data.list != null && data.data.list.length > 0) {
							me.grid.api.hideOverlay();
						}
						else angular.element('#ngRowMsg').text('No Data.');

						getRowsParam.successCallback(data.data.list, lastRow);
						callbackHandler(data.data);
					}, 500);
				}

				function rowDataChange(value) {
					// angular.element('#ngRowMsg').text('No Data.');
					if (value == null || !angular.isArray(value))
						return;

					if (!me.grid || !me.grid.api) return;

					rowdata = value;

					me.grid.api.setRowData(value);

					// var s = (scope.selectedIndex == null) ? selectedIndex : scope.selectedIndex;
					var s = scope.selectedIndex;
					if (s) {
						me.grid.api.forEachNode(function (node) {
							if (node.childIndex == Number(s)) {
								$timeout(function(){
									me.grid.api.selectNode(node, true);									
								})								
							}
						});
					}

					me.grid.api.gridPanel.eBodyViewport.scrollTop = 0;

					//데이터 새로 불러올때는 header check false
					headerCheckFalse();

					if (scope.rowModelType)
						setRowData();
				}

				function sortColumnChange(value) {
					if (!value)
						return;

					me.grid.api.setSortModel(value);
				}

				function dyGridOptionChange(value) {
					if (!value)
						return;

					me.grid.api.setColumnDefs(value.columnDefs);
				}

				function dyColumnsChange(value) {
					if (!value)
						return;

					me.grid.api.setColumnDefs(value);
				}

				function requestParamChange(value) {
					if (!scope.rowModelType)
						return;

					if (!value)
						return;

					param = value;
					getRowData();
				}

				function requestUrlChange(value) {
					if (!scope.rowModelType)
						return;

					if (!value)
						return;

					url = value;
				}

				function rowModelTypeChange(value) {
					if (!value || value == undefined) {

					}
				}

				function addRowDataChange(value) {
					if (!value || value == undefined) {
						return;
					}
					rowdata.push(value);
					me.grid.api.setRowData(rowdata);
				}


				function deleteRowDataChange(value) {
					if (!value)
						return;

					if (value == undefined)
						return;

					var selected = me.grid.api.getFocusedCell();

					rowdata.splice(selected.rowIndex, 1);
					me.grid.api.setRowData(rowdata);
				}

				function selectedListChange(value) {
					if (!value)
						return;

					if (!me.grid || !me.grid.api) return;

					var len = value.length;
					if(len == 0) {
						me.grid.api.deselectAll();
						selectedIndex = null;
						$('#headerchk' + scope.id).prop('checked',false);
					}

					me.grid.api.forEachNode(function (node) {
						for (var i = 0; i < len; i++) {
							if (node.data[scope.rowUniqueField] == value[i]) {
								me.grid.api.selectNode(node, true);
								//me.grid.api.setSelected(node);
							}
						}
					});
				}

				//function scrollTopF() {
				//	me.grid.api.gridPanel.eBodyViewport.scrollTop = scrollTop;
				//	setTimeout(function () {
				//		if (me.grid.api.gridPanel.eBodyViewport.scrollTop < scrollTop) {
				//			scrollTopF();
				//		} else {
				//			change = true;
				//		}
				//	}, 500);
				//
				//}

				function reloadDataChange(value) {
					if (value == null)
						value = [];

					//데이터 새로 불러올때는 header check false
					headerCheckFalse();
					if (!me.grid.api) return;
					me.grid.api.setRowData(value);
				}


				function changeRefreshGrid(value) {
					if (!me.grid.api) return;
					me.grid.api.setRowData(rowdata);
				}

				function headerCheckFalse(){
					$('#headerchk' + scope.id).prop('checked',false);
					if (!me.grid.api) return;
					me.grid.api.deselectAll();
					selectionChanged(null);
				}

				function addEventHandler() {
					unbind = [
						scope.$watch("reloadData", reloadDataChange),
						scope.$watch("rowdata", rowDataChange),
						scope.$watch("requestParam", requestParamChange),
						scope.$watch("requestUrl", requestUrlChange),
						scope.$watch("dyColumns", dyColumnsChange),
						scope.$watch("dyGridOption", dyGridOptionChange),
						scope.$watch("sortColumn", sortColumnChange),
						scope.$watch("rowModelType", rowModelTypeChange),
						scope.$watch("addRowData", addRowDataChange),
						scope.$watch("deleteRowData", deleteRowDataChange),
						scope.$watch("selectedList", selectedListChange),
						scope.$watch("refreshGrid", changeRefreshGrid),
						angular.element("headerchk" + scope.id).change(selectionChanged)];
				}

				function initialize() {
					addEventHandler();
				}

				function getRowClassFunc(params) {
					if (params.data == null)
						return '';

					if (params.data.isParent != null && params.data.isParent == true)
						return 'parent-data';
					else if (params.data.isSub != null && params.data.isSub == true)
						return 'sub-data ';
					else if (params.data.depth != null)
						return 'sub-data' + params.data.depth + ' ';
					else return '';
				}

				function headerCellRendererFunc(params) {
					var cb = document.createElement('input');
					cb.setAttribute('type', 'checkbox');
					cb.setAttribute('id', 'headerchk' + scope.id);
					cb.setAttribute('class', 'mu-checkbox');
					var elabel = document.createElement('label');
					elabel.setAttribute("for", cb.id);

					var eHeader = document.createElement('label');
					var eTitle = document.createTextNode(params.colDef.headerName);
					if (params.colDef.checkboxSelection == true)
						eHeader.appendChild(cb);

					eHeader.appendChild(elabel);
					eHeader.appendChild(eTitle);

					cb.addEventListener('change', function (e) {
						if (e.currentTarget.checked == true) {
							me.grid.api.selectAll();
						} else {
							me.grid.api.deselectAll();

							// ag-grid 버그인지는 모르겠으나, deselectAll 될때만 onSelectionChanged 이벤트가 발생되지 않음. 그래서 강제로 발생.
							selectionChanged(e);
						}
					});

					return eHeader;
				}

				function callbackHandler(data) {
					if (scope.onDataResultCallback != null) {
						scope.onDataResultCallback({
							data: data
						});
					}
				}

				scope.$on("rootScope:getColumnData", function (event, data) {
					columns.push(data);
				});

				scope.$on("rootScope:visibleChange", function (event, data) {
					if(data == null || data.key == null || data.key == "")
						return;

					me.grid.columnApi.setColumnVisible(data.key, data.value);
				});

				scope.$on(scope.id + ":goToPage", function (event, value) {

					if (!value)
						return;
					if (getRowsParam == undefined)
						return;

					getRowsParam.startRow = value.startRow;
					getRowsParam.endRow = value.endRow;
					getRowsParam.pageNumber = value.pageNumber;
					scrollTop = (value.pageNumber * scope.pageSize) * Number(scope.rowHeight); //row height 사이즈

					if (me.grid.api.gridPanel.eBodyViewport.scrollHeight < scrollTop) {
						scrollTop = me.grid.api.gridPanel.eBodyViewport.scrollHeight;
					}

					setTimeout(function(){
						me.grid.api.gridPanel.eBodyViewport.scrollTop = scrollTop;
					},300);

				});

				scope.$on("$destroy", function () {
					unbind.forEach(function (fn) {
						if (typeof fn == "function")
							fn();
					});

					if(me != null && me.grid != null) {
						me.grid.api.destroy();
					}

					me = null;
					columns = null;
					rowdata = null;
					selectedIndex = null;
				});

				scope.$on("exportToCSV", function (event, param) {
					if (scope.id == param.id)
						me.grid.api.exportDataAsCsv(param);
				});

				initialize();
			}],
			link: function (scope, element, attr) {
				scope.gridCtrl.init().then(
					function (grid) {
						var w = (attr.gridWidth == null) ? "100%" : attr.gridWidth;
						var h = (attr.gridHeight == null) ? "100%" : attr.gridHeight;
						var t = (attr.gridTheme == null) ? "ag-fresh" : attr.gridTheme;


						var gridDiv = document.createElement("div");
						gridDiv.setAttribute("ag-grid", "gridCtrl.grid");
						gridDiv.setAttribute("class", t);
						gridDiv.setAttribute("style", "width: " + w + "; height: " + h + ";");
						element.append(gridDiv);

						$compile(element.contents())(scope);

						function setAttr() {
							var selectionType = (attr.selectionType == null) ? "multiple"
								: attr.selectionType;
							grid.rowSelection = selectionType;
						}

						setAttr();
					}, function (reason) {
						$log.log(reason);
					});
			}
		};
	}]).directive("metatronGridColumn", ["$rootScope", "GridRenderer", function ($rootScope, GridRenderer) {
		return {
			restrict: "EA",
			replace: true,
			scope: {
				colId: "@",
				headerText: "@",
				headerClass: "@",
				field: "=",
				width: "=",
				minWidth: "=",
				useCheck: "=",
				render: "&",
				textAlign: "=",
				paddingLeft: "=",
				suppressResize:"@",
				visible: "="
			},
			link: function (scope, element, attr) {
				var headerText = attr.headerText;
				var headerClass = attr.headerClass;
				var field = attr.field;
				var width = attr.width == undefined ? "100" : attr.width;
				var minWidth = attr.minWidth == undefined ? "100" : attr.minWidth;
				var useCheck = false;
				var cellRendererFunc = null;
				var cellstyle = null;
				var colId = attr.colId == null ? "" : attr.colId;
				var textAlign = attr.textAlign;
				var paddingLeft = attr.paddingLeft == undefined ? "0" : attr.paddingLeft;
				var editable = false;
				var visible = (attr.visible == null || attr.visible == "true") ? true : false;
				var attr = attr;
				var maxWidth;
				var _supress = (scope.suppressResize == true || scope.suppressResize == 'true') ? true : false;

				if (attr.render != undefined) {
					cellRendererFunc = GridRenderer[attr.render];
				}

				if (textAlign != undefined) {
					cellstyle = textAlignFunc;
				}

				if (attr.useCheck != undefined) {
					if (attr.useCheck == "true") {
						useCheck = true;
						cellstyle = checkboxStyle;
					}
					else
						useCheck = false;
				}

				if (attr.editable != undefined) {
					if (attr.editable == "true")
						editable = true;
					else
						editable = false;
				}

				if (minWidth != null && width == parseInt(minWidth))
					maxWidth = parseInt(width);

				if (minWidth == null) {
					minWidth = parseInt(width);
				} else {
					minWidth = parseInt(minWidth);
				}

				function textAlignFunc(params) {
					return {
						"text-align": textAlign,
						"padding-left": paddingLeft + 'px'
					};
				}

				function checkboxStyle(params) {
					return {
						"text-align": "center",
						"vertical-align": "middle",
						"padding": "7px 0 0 0",
						"left": "-1px"
					};
				}

				var columnValue = {
					headerName: headerText,
					headerClass: headerClass,
					field: field,
					width: parseInt(width),
					minWidth: parseInt(minWidth),
					hide: !Boolean(visible),
					checkboxSelection: useCheck,
					cellRenderer: cellRendererFunc,
					cellStyle: cellstyle,
					editable: editable,
					suppressResize : _supress,		// Set to true if you do not want this column to be resizable by dragging it's edge.
					suppressSizeToFit : true,  //Set to true if you want this columns width to be fixed during 'size to fit' operation.
					onCellClicked: function (data) {
						angular.element(element).trigger({
							type: "click",
							rowData: data
						});
					}
				};

				if(colId != null && colId != "")
					columnValue.colId = colId;

				if (maxWidth != null)
					columnValue.maxWidth = parseInt(maxWidth);

				scope.$emit("rootScope:getColumnData", columnValue);
				scope.$on("$destroy", function () {
					columnValue = null;
				});

				if(attr.visible != null)
					scope.$watch("visible", visibleChange);

				function visibleChange(value) {
					visible = value;
					var d = {key: colId, value: value};
					if(d.key == null || d.key == "" || d.value == null)
						return;

					$rootScope.$broadcast("rootScope:visibleChange", d);
				}
			}
		}
	}])
})(angular);