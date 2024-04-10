define(['app'], function(app) {

	app.directive('infiniteScroll', [
         '$rootScope', '$window', '$timeout', function($rootScope, $window, $timeout) {
           return {
             link: function(scope, elem, attrs) {
               var checkWhenEnabled, handler, scrollDistance, scrollEnabled;
            	 // @@@@
            	 var lastScrollTop = 0;
            	 var direction = '';
            	 
               $window = angular.element($window);
               scrollDistance = 0;
               if (attrs.infiniteScrollDistance != null) {
                 scope.$watch(attrs.infiniteScrollDistance, function(value) {
                   return scrollDistance = parseInt(value, 10);
                 });
               }
               scrollEnabled = true;
               checkWhenEnabled = false;
               if (attrs.infiniteScrollDisabled != null) {
                 scope.$watch(attrs.infiniteScrollDisabled, function(value) {
                   scrollEnabled = !value;
                   if (scrollEnabled && checkWhenEnabled) {
                     checkWhenEnabled = false;
                     return handler();
                   }
                 });
               }
               handler = function() {
                 var elementBottom, remaining, shouldScroll, windowBottom;
                 
                 windowBottom = $window.height() + $window.scrollTop();
                 elementBottom = elem.offset().top + elem.height();
                 remaining = elementBottom - windowBottom;
                 shouldScroll = remaining <= $window.height() * scrollDistance;
                 
                 var st = window.pageYOffset;
                 if (st > lastScrollTop){
                	 // 스크롤 다운 
                	 direction = 'DOWN';
                 } else {	
                	 // 스크롤 업
                	 direction = 'UP';
                 }
                 lastScrollTop = st;
                 
                 
                 if (shouldScroll && scrollEnabled) {
                   if ($rootScope.$$phase) {
                     return scope.$eval(attrs.infiniteScroll);
                   } else {
                	   if (direction == 'UP') return;			// 스크롤 올릴때는 함수 실행 안되게 
//                     return scope.$apply(attrs.infiniteScroll);
                   }
                 } else if (shouldScroll) {
                   return checkWhenEnabled = true;
                 }
               };
               $window.on('scroll', handler);
               scope.$on('$destroy', function() {
                 return $window.off('scroll', handler);
               });
               return $timeout((function() {
                 if (attrs.infiniteScrollImmediateCheck) {
                   if (scope.$eval(attrs.infiniteScrollImmediateCheck)) {
                     return handler();
                   }
                 } else {
                   return handler();
                 }
               }), 0);
             }
           };
         }
       ]);
});