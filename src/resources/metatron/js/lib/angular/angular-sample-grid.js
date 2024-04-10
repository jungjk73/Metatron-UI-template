if (typeof module !== "undefined" && typeof exports !== "undefined" && module.exports === exports){
  module.exports = 'dwGrid';
}

(function ( angular ) {
    'use strict';
    angular.module('dwGrid', [])
    .directive("dwGrid",["$compile","GridRenderer", function($compile, GridRenderer){
       return {
            restrict: "EA",
            require: "dwGrid",
            controllerAs: "gridCtrl",
            replace: true,
            scope: {
            	rowdata : "=",
            	onRowDoubleClick : "&",
            	selectedRow : "&" ,
            	dyColumns : "=",
            	dyGridOption : "=",
            	gridWidth: "@",
            	gridHeight: "@",
            	selectionType: "@",
            	rowModelType:"@"
            },
            controller: ["$scope", "$q",
                        function(scope, $q ) {
                            var me = this;
                            var columns = [];
                            var unbind = [];
                            me.init = function() {
                                var setGridJob = $q.defer();
                                
                               
                                if(scope.dyColumns != undefined)
                                {
                                	columns = scope.dyColumns;
                                }
                                
                                me.grid = {
                                    columnDefs: columns,
                                    rowData: scope.rowdata,
                 	                enableColResize: true,
                 	                enableSorting: false,
                 	                enableFilter: false,
                 	                groupHeaders: true,
                 	                rowHeight : 31,
                 	                headerHeight : 31,
                 	                suppressRowClickSelection: false,
                 	                onSelectionChanged: selectionChanged,
                 	                onRowDoubleClicked: onRowDoubleClick,
                 	                headerCellRenderer:headerCellRendererFunc
                                };
                                
                                setGridJob.resolve(me.grid);
                                return setGridJob.promise;
                            };
                            
                            
                            function selectionChanged(event) 
                            {
                            	scope.selectedRow({value: me.grid.api.getSelectedRows()});
                            };
                            
                            function onRowDoubleClick(event)
                      	    {
                      		   if(scope.onRowDoubleClick)
                      			   scope.onRowDoubleClick({event:event});
                      	    };
                            
                            function setRowData(value) {
                    		    var dataSource = {
                    		        rowCount: null, // behave as infinite scroll
                    		        pageSize:50,
                    		        overflowSize: 50,
                    		        maxConcurrentRequests: 2,
                    		        maxPagesInCache: 2,
                    		        getRows: function (params) {
                    		            setTimeout( function() {
                    		                var rowsThisPage = value.slice(params.startRow, params.endRow);
                    		                var lastRow = -1;
                    		                if (value.length <= params.endRow) {
                    		                    lastRow = value.length;
                    		                }
                    		                params.successCallback(rowsThisPage, lastRow);
                    		            }, 500);
                    		        }
                    		    };

                    		    me.grid.api.setDatasource(dataSource);
                    		};
                            
                           
                            function rowDataChange(value) {
                        		if( !value )
                        			return;
                        		
                        		if(scope.rowModelType != undefined)
                        		{
                        			setRowData(value);
                        		}else{
                        			me.grid.api.setRowData(value);
                        		}
                            };
                            
                            function dyGridOptionChange(value) {
                        		if( !value )
                        			return;
                        		
                        		 me.grid = value;
                            };
                            
                            function rowModelTypeChange(value) {
                            	if (!value)
                            		return;
                            
                            	me.grid.rowModelType = value;
                            		
                            }
                            
                            function addEventHandler() {
                        	    unbind = [scope.$watch("rowdata", rowDataChange),
                        	              scope.$watch("rowModelType" , rowModelTypeChange),
                                          scope.$watch("dyGridOption", dyGridOptionChange)];	
                            }
                            
                            
                            function initialize() {
                                addEventHandler();
                            }
                            
                            function headerCellRendererFunc(params) {
                        		var cb = document.createElement('input');
                        		cb.setAttribute('type', 'checkbox');
                        	
                        		        var eHeader = document.createElement('label');
                        		        var eTitle = document.createTextNode(params.colDef.headerName);
                        		        if(params.colDef.checkboxSelection == true)
                        		        	eHeader.appendChild(cb);
                        		       
                        		        eHeader.appendChild(eTitle);

                        		        cb.addEventListener('change', function (e) {
                        		            if (e.currentTarget.checked == true) {
                        		            	me.grid.api.selectAll();
                        		            } else {
                        		            	me.grid.api.deselectAll();
                        		            } 
                        		        });
                        		        
                        		return eHeader; 
                        	}
                            
                            scope.$on("rootScope:getColumnData", function (event, data) {
                               columns.push(data);
                            });
                            
                	    	scope.$on("$destroy", function() {
                        	    unbind.forEach(function(fn) {
                        	        fn();
                        	    });
                        	});
                	    	
                	    	initialize();
                        }
                    ],
            link: function(scope, element, attr,controller) {
                scope.gridCtrl.init().then(
                    function(grid) {
                    	var w = (attr.gridWidth == null)? "100%":attr.gridWidth;
                    	var h = (attr.gridHeight == null)? "100%":attr.gridHeight;
                    	
                        var gridDiv = document.createElement("div");
                        gridDiv.setAttribute("ag-grid", "gridCtrl.grid");
                        gridDiv.setAttribute("class", "ag-fresh");
                        gridDiv.setAttribute("style", "width: " + w + "; height: " + h + ";")
                        element.append(gridDiv);
 
                        $compile(element.contents())(scope);
                        
                        function setAttr() {
                        	var selectionType = (attr.selectionType == null)? "multiple":attr.selectionType;
                        	grid.rowSelection = selectionType;
                        }
                        
                        setAttr();
                    },
                    function(reason) {
                        $log.log(reason);
                    }
                );
                
            }
        };
    }]).directive("dwGridColumn",["$compile","$parse","GridRenderer",function($compile, $parse, GridRenderer){
    	 return {
             restrict: "EA",
             replace: true,
             scope: {
             	headerText : "@",
             	field : "=",
             	width : "=",
             	useCheck : "=",
             	render : "&",
             	textAlign : "="
             },link : function(scope,element,attr,controller,ngModel){
            	 var headerText = attr.headerText;
            	 var field = attr.field;
            	 var width = attr.width == undefined ? "100" : attr.width;
            	 var useCheck = false;
            	 var cellRendererFunc = null;
            	 var cellstyle = null;
            	 var textAlign = attr.textAlign;
            	 var attr = attr;
            	if(attr.useCheck != undefined)
            	{
            		 if(attr.useCheck == "true")
            			 useCheck = true;
            		 else
            			 useCheck = false;
            			
            	}
            	
            	
            	
            	
            	
            	if(attr.render != undefined)
            	{
            		
            		cellRendererFunc = GridRenderer[attr.render];
            	}
            	
            	
            	
               
            	if(textAlign != undefined)
            	{
            		cellstyle = textAlignFunc;
            	}
            	 
            	
            	function textAlignFunc(params) {
            		return {"text-align": textAlign};
            	}
            	
            	
            	 var columnValue = {headerName : headerText ,
            			 			field : field,
            			 			width : parseInt(width),
            			 			checkboxSelection : useCheck,
            			 			cellRenderer : cellRendererFunc,
            			 			cellStyle : cellstyle };
            	 
            	 scope.$emit("rootScope:getColumnData", columnValue); // $rootScope.$on
             }
    	 }
    }])     
})( angular );