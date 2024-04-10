/**
 *
 */
define(["app"], function(app) {
    app.directive("metatronGridPage",["$compile","CommonUtil", function($compile,CommonUtil){
       return {
            restrict: "EA",
            templateUrl: "/common/ag-page-template.html",
            replace: true,
            scope: {
            	collection : '=',   //list
                perPage: '=',		//page 표시수
                pageGroupSize : '=',// page 표현되는 숫자수
                linkGroupSize :"=",
                // directive -> app communication only
                numPages: '=?',
                numItems: '=?',
                page:'=?',
                gridId:"@"

            },
            controller: ["$scope", "$rootScope", "$q",
                         function($scope,$rootScope, $q ) {


            		var defaultLinkGroupSize = 5, defaultPerPage = 50, defaultpageGroupSize =10;

            		$scope.page = $scope.page || 0;
            		$scope.linkGroupSize  = typeof $scope.linkGroupSize === 'number' ? $scope.linkGroupSize : defaultLinkGroupSize;
            		$scope.pageGroupSize  = typeof $scope.pageGroupSize === 'number' ? $scope.pageGroupSize : defaultpageGroupSize;

            		$scope.perPage  = typeof $scope.perPage === 'number' ? $scope.perPage : defaultPerPage;


            		$scope.gotoPage = function (i) {
            			if(i < 0 || i*$scope.perPage >= $scope.numItems) {
                            return;
                        }

            			$scope.page = i;
            			//scroll 도 같이 움직이게 ..
                        var goScrollh = i * defaultPerPage;

            			var o = {};
                        o.startRow = i * defaultPerPage;
                        o.endRow = o.startRow + defaultPerPage;
                        o.pageNumber = i;
                        $rootScope.$broadcast($scope.gridId+":goToPage", o); // $rootScope.$on
                  };


                  $scope.$watch('collection', function(newVal, oldVal) {
                	  if(!$scope.collection)
                		  return;
//                	  if($scope.collection.length == 0)
//                		  return;

                	  $scope.numItems = $scope.collection.length  ;
                	  $scope.numPages = Math.ceil($scope.numItems / $scope.perPage);
                  });



                  $scope.linkGroupFirst = function() {
                	  var rightDebt = Math.max( 0,
                			  $scope.linkGroupSize - ($scope.numPages - 1 - ($scope.page + 2))
                	  );
                	  // return Math.max( 0,$scope.page - ($scope.linkGroupSize + rightDebt) );


                      let startPage;
                      if ($scope.numPages < $scope.pageGroupSize) {
                          startPage = 0;
                      } else {
                          if ($scope.page < 6) {
                              startPage = 0;
                          } else if ($scope.page + 4 > $scope.numPages) {
                              startPage = $scope.numPages - $scope.pageGroupSize;
                          } else {
                              startPage = $scope.page - 6;
                          }
                      }
                      return startPage;
                  };

                  $scope.linkGroupLast = function() {
                	  var leftDebt = Math.max( 0,
                			  $scope.linkGroupSize - ($scope.page - 2)
                	  );

                      let endPage;
                      if ($scope.numPages < $scope.pageGroupSize) {
                          endPage = $scope.numPages-1;
                      } else {
                          if ($scope.page < 6) {
                              endPage = 9;
                          } else if ($scope.page + 4 > $scope.numPages) {
                              endPage = $scope.numPages-1;
                          } else {
                              endPage = $scope.page + 3;
                          }
                      }
                      return endPage;

                  };

	              $scope.$on($scope.gridId+":getTotalData", function (event, data) {
	            	  $scope.numItems = data;
	             	  $scope.numPages = Math.ceil($scope.numItems / $scope.perPage);
	              });

	              $scope.$on($scope.gridId+":setPageNumber", function (event, data) {
	            	   $scope.page = data;
	              });

	              $scope.$on("$destroy", function() {

				  });

            }],
            link: function(scope, element) {
                //page total , page count 를 가지고 페이지를  ng-repeat 하고 페이지 번호 클릭시에 컨트롤러로 이벤트 전달.
            	 $compile(element.contents())(scope);
            }
        };
    }]).
    filter('makeRange', function() {
        return function(input) {
          var lowBound, highBound;
          switch (input.length) {
          case 1:
            lowBound = 0;
            highBound = parseInt(input[0], 10) - 1;
            break;
          case 2:
            lowBound = parseInt(input[0], 10);
            highBound = parseInt(input[1], 10);
            break;
          default:
            return input;
          }
          var result = [];
          for (var i = lowBound; i <= highBound; i++) { result.push(i); }
          return result;
        };
      });


    function parseRange(hdr) {
      var m = hdr && hdr.match(/^(?:items )?(\d+)-(\d+)\/(\d+|\*)$/);
      if(m) {
        return {
          from: +m[1],
          to: +m[2],
          total: m[3] === '*' ? Infinity : +m[3]
        };
      } else if(hdr === '*/0') {
        return { total: 0 };
      }
      return null;
    }

    function length(range) {
      return range.to - range.from + 1;
    }
});