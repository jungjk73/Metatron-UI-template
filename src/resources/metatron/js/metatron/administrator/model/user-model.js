define([], function() {
    
    'use strict';
    
    var model = (function() {
        var contract = "";
        var createDate = "";
        var department = "";
        var email = "";
        var position = "";
        var status = "request";
        var updateDate = "";
        var useEndDate = "";
        var useStartDate = "";
        var useExpired = 0;
        var userId = "";
        var username = "";
        var userPassword = "";
        var name = "";
        var userSeq = 0;
        var grantId = 1;
        var grantName = "";

        return {
            contract:contract,
            createDate:createDate,
            department:department,
            email:email,
            position:position,
            status:status,
            updateDate:updateDate,
            useEndDate:useEndDate,
            useStartDate:useStartDate,
            useExpired:useExpired,
            userId:userId,
            username:username,
            userPassword:userPassword,
            name:name,
            userSeq:userSeq,
            grantId:grantId,
            grantName:grantName,
            set: function(data) {
                for ( var key in data) {
                    if (this.hasOwnProperty(key))
                        this[key] = data[key];
                }
            }
        }
    });
    
    return model;
});