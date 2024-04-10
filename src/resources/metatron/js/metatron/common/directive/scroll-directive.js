define([], function() {
    return function($rootScope) {
        return {
        	scope: {
             	selectValue : "="
             },
            link: function postLink($scope, element, attrs, controller) {
            	
            	element.scroll(function(){
					var scrollableHeight = element.prop('scrollHeight');		// DOM 전체 높이. 데이터가 추가될수록 길어짐
				});
            	
            	function selectValueChange(value){
            		console.log(value);
            		
            	};
            	
            	$scope.$watch("selectValue", selectValueChange)
            }
        }
    }
});