/**
 *
 */
define(["app", "moment"], function(app, moment) {
    app.directive("uiCalendar",["$compile","CommonUtil", function($compile,CommonUtil){
       return {
            restrict: "E",
            templateUrl: "/common/calendar.html",
           // replace: true,
            scope: {
                onCalendarClick: '&',    
                onDownloadClick: '&',           
                reportFileList: '=reportFiles'
            },            
            controller: ["$scope", "$rootScope", function($scope,$rootScope ) {

              let days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];    

              // Today click
              $scope.onClickToday = function() {
                // if($scope.toDate.getFullYear() == $scope.date.getFullYear() && $scope.toDate.getMonth() == $scope.date.getMonth()) {
                //   return;
                // }                
                setToday();
                $scope.onCalendarClick({event:$scope.date.getFullYear()+CommonUtil.leftPad($scope.date.getMonth()+1,2,'0')});
              }

              // 월(이전, 이후) click
              $scope.onIncrementDate = function(inc) {
                incrementDate(inc);
                $scope.onCalendarClick({event:$scope.date.getFullYear()+CommonUtil.leftPad($scope.date.getMonth()+1,2,'0')});
              }

              
              // report 다운로드
              $scope.onReportDownload = function(fileInfo) {  
                $scope.onDownloadClick({event:fileInfo}); 
              }

              function setToday() {                
                $scope.date = new Date();
                $scope.toDate = new Date();              
                $scope.firstDay = new Date($scope.date.getFullYear(), $scope.date.getMonth(), 1);
                $scope.lastDay = new Date($scope.date.getFullYear(), $scope.date.getMonth() + 1, 0);   
                $scope.preLastDay = new Date($scope.date.getFullYear(), $scope.date.getMonth(),0);                   
              }
             
              function incrementDate(inc) {
                if(inc > 12)  //Too hard, and out of scope
                  return false
                $scope.toDate = new Date();
                var newMonth = $scope.date.getMonth() + inc
                var newYear = $scope.date.getFullYear()

                if($scope.date.getMonth() + inc > 11) {
                  newYear++
                  newMonth = (($scope.date.getMonth() + inc) % 11) - 1
                } else if($scope.date.getMonth() + inc < 0) {
                  newYear--
                  newMonth = 12 + ($scope.date.getMonth() + inc)
                }

                $scope.date = $scope.firstDay = new Date(newYear, newMonth, 1);
                $scope.lastDay = new Date(newYear, newMonth + 1, 0);
                $scope.preLastDay = new Date(newYear, newMonth, 0);                
              }             


              function getDate(day) {
                var result = {};                
                var dayDiff = day - $scope.firstDay.getDay()
                var cnt = 42-$scope.lastDay.getDate()-$scope.firstDay.getDay();
                if(dayDiff <= 0) {
                  result = {
                    day: dayDiff + $scope.preLastDay.getDate(),
                    disabled: true
                  }                  
                }else if(dayDiff > $scope.lastDay.getDate()) {     
                  result = {
                    day: -(42-day-cnt),
                    disabled: true
                  }  
                }else {
                  result = {
                    day: dayDiff,
                    date: $scope.date.getFullYear()+CommonUtil.leftPad($scope.date.getMonth()+1,2,'0')+CommonUtil.leftPad(dayDiff,2,'0'),               
                    disabled: false
                  } 

                  var obj = _.findWhere($scope.reportFileList, {reportDate: result.date});
                  if(obj !== undefined) result.report = obj;

                  if($scope.toDate.getFullYear() == $scope.date.getFullYear() 
                    && $scope.toDate.getMonth() == $scope.date.getMonth()
                    && $scope.toDate.getDate() == dayDiff) {
                    result.today = true;
                  }
                }

                return result;
              }

              function setCalendarDatas(){  
                var arr = new Array();
                var week = [1,2,3,4,5,6];
                var dow = [1,2,3,4,5,6,7];                    

                for(var i=0;i<week.length;i++) {
                  arr[i] = new Array();
                  for(var k=0;k<dow.length;k++) {                   
                   arr[i][k]= getDate((7 * (week[i] - 1)) + dow[k]);
                  }
                }                

                $scope.calendarDatas = arr;
              }  

              function addEventListener(){
                $scope.$watch('reportFileList', function(newVal, oldVal){                 
                  if(newVal != oldVal) {
                    setCalendarDatas();
                  }                 
                })
              }

              function initialize() {
                $scope.months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                
                addEventListener(); 
                $scope.onClickToday();
                // setToday();
                // setCalendarDatas();
              }
              
              initialize();

            }]
        };
    }])    
});