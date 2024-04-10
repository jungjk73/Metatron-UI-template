var app = angular.module("app", ["ngCookies", "ngDialog"]);
app.controller("IndexCtrl", ["$rootScope", "$scope", "$http", "$cookies", "$filter", "ngDialog",  
	function($rootScope, $scope, $http, $cookies, $filter, ngDialog) {
    "use strict";

    // property
    var indexCtrl = this;
    var unbind = [];
    var offlineFlag = false;

    function destory() {
        unbind.forEach(function(fn) {
            ngDialog.closeAll();
            fn();
        });
    }

    indexCtrl.searchUserInfo = {}; // 사용자 검색시 사용
    indexCtrl.searchUserInfo.messageForId = '';
    indexCtrl.searchUserInfo.messageForPW = '';

    indexCtrl.user = {
        userId: "",
        userPassword: ""
    };

    indexCtrl.addUser = {};
    indexCtrl.rememberFlag = false;

    indexCtrl.registerUser = function() {

        if (offlineFlag) {
            alert("The network connection failed. Please contact your administrator.");
            return;
        }

        var popup = ngDialog.open({
            template: "/index/user_add_popup_template.html",
            className: "ngdialog-theme-default custom-width",
            showClose: false,
            disableAnimation: true,
            cache: false,
            closeByDocument: false,
            closeByEscape: false,
            scope: $scope
        });

        //		ngDialog.open({ template: 'templateId' });

        var closer = $rootScope.$on('ngDialog.refresh', function(e, id) {
            if (id != popup.id) return;
            closer();
        });
    };

    indexCtrl.searchUser = function() {

        if (offlineFlag) {
            alert("The network connection failed. Please contact your administrator.");
            return;
        }

        var popup = ngDialog.open({
            template: "/index/user_search_popup_template.html",
            className: "ngdialog-theme-default custom-width ",
            showClose: false,
            disableAnimation: true,
            cache: false,
            closeByDocument: false,
            closeByEscape: false,
            scope: $scope
        });

        var closer = $rootScope.$on('ngDialog.refresh', function(e, id) {
            if (id != popup.id) return;
            closer();
        });
    };

    indexCtrl.clickSignUpHandler = function() {
        duplicateCheckUser();
    };

    // method
    indexCtrl.login = function() {

        if (offlineFlag) {
            alert("The network connection failed. Please contact your administrator.");
            return;
        }

        $http({
            method: "POST",
            url: "/login.do",
            data: JSON.stringify(indexCtrl.user),
            headers: {
                "Content-Type": "application/json"
            }
        }).success(function(data) {
            if (data.result == 1) {
                // sesssion storage 초기화
                sessionStorage.clear();
                window.location = "main";
            } else if (angular.isString(data) && data.indexOf("<script>") > -1) {
                var s = "<script>";
                var d = data.substring(data.indexOf(s) + s.length, data.indexOf("</script>"));
                eval(d);
            } else {
                alert(data.errorMessage);
            }
        }).error(function(data, status) {
            console.log("=====================login fail; ", data, status);
            if (status == 401) {
                alert("Auth Fail.");
            }
        });
    };

    indexCtrl.userRememberHandler = function($event) {

        // 이벤트 타입이 click일 때는 checkbox로 간주
        if ($event.type == "click") {
            indexCtrl.rememberFlag = !indexCtrl.rememberFlag;
        }

        if (indexCtrl.rememberFlag) {
            $cookies.put("METATRON_SESSION_ID", indexCtrl.user.userId);
        } else {
            $cookies.remove("METATRON_SESSION_ID");
        }
    };

    /**
     * 사용자가 ID를 잃어버린 경우 - 사용자 ID 찾기
     */
    indexCtrl.searchUserForIDHandler = function(frm) {
        validateSearchUserInfo(frm, 'ID');
    };

    /**
     * 사용자가 비밀번호 잃어버린 경우
     */
    indexCtrl.searchUserForPWHandler = function(frm) {
        validateSearchUserInfo(frm, 'PASSWORD')
    };

    function validateSearchUserInfo(frm, dist) {

        indexCtrl.searchUserInfo.request = 'SEARCH_USER';
        indexCtrl.searchUserInfo.dist = dist;

        if (dist == 'ID') {
            if (frm.searchEmailId.$error.required) {
                indexCtrl.searchUserInfo.messageForId = 'E-Mail is required';
                $('[name="searchEmailId"]').focus();
                return;
            } else if (frm.searchEmailId.$error.email) {
                indexCtrl.searchUserInfo.messageForId = 'Not valid E-Mail';
                $('[name="searchEmailId"]').focus();
                return;
            } else if (frm.searchPhoneId.$error.required) {
                indexCtrl.searchUserInfo.messageForId = 'Phone Number is required';
                $('[name="searchPhoneId"]').focus();
                return;
            } else if (frm.searchPhoneId.$error.pattern) {
                indexCtrl.searchUserInfo.messageForId = 'Not valid Phone Number';
                $('[name="searchPhoneId"]').focus();
                return;
            }

            indexCtrl.searchUserInfo.email = indexCtrl.searchUserInfo.emailForId;
            indexCtrl.searchUserInfo.phone = indexCtrl.searchUserInfo.phoneForId;

        } else {
            if (frm.searchIdPW.$error.required) {
                indexCtrl.searchUserInfo.messageForPW = 'UserId is required';
                $('[name="searchIdPW"]').focus();
                return;
            } else if (frm.searchEmailPW.$error.required) {
                indexCtrl.searchUserInfo.messageForPW = 'E-Mail is required';
                $('[name="searchEmailPW"]').focus();
                return;
            } else if (frm.searchEmailPW.$error.email) {
                indexCtrl.searchUserInfo.messageForPW = 'Not valid E-Mail';
                $('[name="searchEmailPW"]').focus();
                return;
            } else if (frm.searchPhonePW.$error.required) {
                indexCtrl.searchUserInfo.messageForPW = 'Phone Number is required';
                $('[name="searchPhonePW"]').focus();
                return;
            } else if (frm.searchPhonePW.$error.pattern) {
                indexCtrl.searchUserInfo.messageForPW = 'Not valid Phone Number';
                $('[name="searchPhonePW"]').focus();
                return;
            }

            indexCtrl.searchUserInfo.userId = indexCtrl.searchUserInfo.idForPW;
            indexCtrl.searchUserInfo.email = indexCtrl.searchUserInfo.emailForPW;
            indexCtrl.searchUserInfo.phone = indexCtrl.searchUserInfo.phoneForPW;
        }

        if (offlineFlag) {
            alert("The network connection failed. Please contact your administrator.");
            return;
        }

        $http({
            method: "POST",
            url: "/admin/user/userManagement/getUserList",
            data: JSON.stringify(indexCtrl.searchUserInfo),
            headers: {
                "Content-Type": "application/json"
            }
        }).success(function(result) {
            if (result.result === 1 && result.data !== null &&
                result.data.userlist !== null && result.data.userlist.length > 0) {
                ngDialog.closeAll();

                indexCtrl.searchResultUserInfo = {};
                indexCtrl.searchResultUserInfo.userId = result.data.userlist[0].userId;
                indexCtrl.searchResultUserInfo.dist = angular.copy(indexCtrl.searchUserInfo.dist);
                indexCtrl.searchUserResult();

                indexCtrl.searchUserInfo = {};
            } else {
                if (dist == 'ID') indexCtrl.searchUserInfo.messageForId = 'No Matched Data. Please Check Your Input.';
                else indexCtrl.searchUserInfo.messageForPW = 'No Matched Data. Please Check Your Input.';
            }
        });
    }

    indexCtrl.searchUserResult = function() {

        if (offlineFlag) {
            alert("The network connection failed. Please contact your administrator.");
            return;
        }

        var popup = ngDialog.open({
            template: "/index/user_search_result_popup_template.html",
            className: "ngdialog-theme-default custom-width",
            showClose: false,
            disableAnimation: true,
            cache: false,
            closeByDocument: false,
            closeByEscape: false,
            scope: $scope
        });

        var closer = $rootScope.$on('ngDialog.refresh', function(e, id) {
            if (id != popup.id) return;
            closer();
        });
    };

    /**
     * 사용자 ID 확인 후 로그인 창에 넣어주기
     */
    indexCtrl.closeDialogAddUserId = function() {
        indexCtrl.user.userId = indexCtrl.searchResultUserInfo.userId;
        indexCtrl.closeDialog();
    };

    /**
     * 비밀번호 재설정
     */
    indexCtrl.resetPassword = function() {

        if (offlineFlag) {
            alert("The network connection failed. Please contact your administrator.");
            return;
        }

        if (!indexCtrl.searchResultUserInfo.userPw || !indexCtrl.searchResultUserInfo.userPwRe || (indexCtrl.searchResultUserInfo.userPw != indexCtrl.searchResultUserInfo.userPwRe)) {
            indexCtrl.searchResultUserInfo.messageForPW = 'Please Check Your Input.';
        } else {
            indexCtrl.searchResultUserInfo.userPassword = indexCtrl.searchResultUserInfo.userPw;
            $http({
                method: "POST",
                url: "/admin/user/userManagement/resetPassword",
                data: JSON.stringify(indexCtrl.searchResultUserInfo),
                headers: {
                    "Content-Type": "application/json"
                }
            }).success(function(data) {
                if (data) {
                    if (data.result == '1') {
                        alert('Your password has been reset. Please login again');
                        indexCtrl.closeDialog();
                    } else {
                        alert('Error has occured. Please retry.');
                    }
                }
            });
        }
    };

    indexCtrl.closeDialog = function() {
        indexCtrl.searchUserInfo = {};
        indexCtrl.searchUserInfo.messageForId = '';
        indexCtrl.searchUserInfo.messageForPW = '';
        ngDialog.closeAll();
    };


    // function
    function initialize() {
        var id = $cookies.get("METATRON_SESSION_ID");
        if (id != null && id != "") {
            indexCtrl.user.userId = id;
            indexCtrl.rememberFlag = true;
        }

        if (location.hostname == "localhost") {
            //indexCtrl.user.userId = "admin";
            //indexCtrl.user.userPassword = "admin";
            //indexCtrl.login();
        }

        // 네트워크 연결여부 이벤트 Listener
        window.addEventListener("offline", function() {
            offlineFlag = true;
            alert("The network connection failed. Please contact your administrator.");
            sessionStorage.clear();
        }, false);
        window.addEventListener("online", function() {
            offlineFlag = false;
            sessionStorage.clear();
        }, false);
    }

    function duplicateCheckUser() {
        if (offlineFlag) {
            alert("The network connection failed. Please contact your administrator.");
            return;
        }

        console.log(indexCtrl.addUser);
        var id = indexCtrl.addUser.userId;
        if (id == null || id.trim() == "") {
            alert("User ID is required");
            return;
        }

        $http({
            method: "POST",
            url: "/admin/user/userManagement/duplicateCheckUser",
            data: JSON.stringify(indexCtrl.addUser),
            headers: {
                "Content-Type": "application/json"
            }
        }).success(function(data) {
            if (data) {
                let dupResult = -1;
                if (data && data.result == 1)
                    dupResult = data.data;
                addUser(dupResult);
            }
        });
    }

    function addUser(dupResult) {

        if (offlineFlag) {
            alert("The network connection failed. Please contact your administrator.");
            return;
        }

        if (!addUserValidationCheck(dupResult))
            return;

        $http({
            method: "POST",
            url: "/admin/user/userManagement/addUser",
            data: JSON.stringify(indexCtrl.addUser),
            headers: {
                "Content-Type": "application/json"
            }
        }).success(function(data) {
            if (data) {
                alert("[" + indexCtrl.addUser.userId + "] is an account of the approved request.");
                indexCtrl.addUser = {};
                ngDialog.closeAll();
            }
        });
    }

    function addUserValidationCheck(dupResult) {
        // User ID - 빈값 체크, 중복체크
        var id = indexCtrl.addUser.userId;
        if (id == null || id.trim() == "") {
            alert("User ID is required");
            return false;
        }

        // User Name - 빈값 체크
        var name = indexCtrl.addUser.name;
        if (name == null || name.trim() == "") {
            alert("User Name is required");
            return false;
        }

        // Password - 빈값 체크, 비밀번호 확인값과 체크
        var pw = indexCtrl.addUser.userPassword;
        var pwConf = indexCtrl.addUser.userpassConfirm;
        if (pw == null || pw == "" || pwConf == null || pwConf == "") {
            alert("Password is required");
            return false;
        }
        if (pw != pwConf) {
            alert("Password do not match.");
            return false;
        }

        if (indexCtrl.addUser.email == null || indexCtrl.addUser.email == "") {
            alert("email is required");
            return false;
        }

        if ($filter('email')(indexCtrl.addUser.email) != true) {
            alert("not Valid Email ");
            return false;
        }

        if (indexCtrl.addUser.contact == null || indexCtrl.addUser.contact == "") {
            alert("Phone Number is required");
            return false;
        }

        if ($filter('phone')(indexCtrl.addUser.contact) != true) {
            alert("Not valid Phone Number.");
            return false;
        }

        if (dupResult == -1) {
            alert("Error! Please Check log.");
            return false;
        }
        if (dupResult == 1) { // id 중복
            alert("[" + id + "] is already registered.\n Please enter a different ID.");
            return false;
        }
        if (dupResult == 2) { // email 중복
            alert("[" + indexCtrl.addUser.email + "] is already registered.\n Please enter a different E-mail.");
            return false;
        }
        if (dupResult == 3) { // contact (모바일) 중복
            alert("[" + indexCtrl.addUser.contact + "] is already registered.\n Please enter a different mobile phone number.");
            return false;
        }

        return true;
    }
    

    function addEventListener() {
        // broadcast event
        unbind = [
            $scope.$on('$destroy', destory)
        ];
    }

    // event-handler


    // entry-point
    initialize();

}]);

app.directive('ngEnter', function() {
    return function(scope, element, attrs) {
        element.bind("keydown keypress", function(event) {
            if (event.which === 13) {
                scope.$apply(function() {
                    scope.$eval(attrs.ngEnter);
                });

                event.preventDefault();
            }
        });
    };
});

app.filter('email', function() {
    var validateEmail = function(email) {
        var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(email);
    };
    return function(input) {
        return validateEmail(input);
    };
});

app.filter('phone', function() {
    var validatePhone = function(phone) {
        var re = /^\(?([0-9]{3})\)?[-]?([0-9]{3,4})[-]?([0-9]{4})$/;
        return re.test(phone);
    };
    return function(input) {
        return validatePhone(input);
    };
});