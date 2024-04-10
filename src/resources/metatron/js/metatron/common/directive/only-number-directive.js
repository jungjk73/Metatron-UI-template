define(['app'], function(app) {
  // 숫자만 입력받기
  app.directive('onlyNumber', function(){
    return {
      link: function(scope, element, attr){
        element.on('keydown', function(event){
          var key = (event.which) ? event.which : event.keyCode;
          if((key >=48 && key <= 57) || (key >=96 && key <= 105) || (key == 8) || (key == 9) || (key == 13) || (key == 16) || (key == 37) || (key == 39) || (key == 116)){
            return true;
          }
          else{
            return false;
          }
        });
      }, 
    }
  });
});