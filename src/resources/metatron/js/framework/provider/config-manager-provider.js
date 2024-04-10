define([], function() {
	return function() {
		"use strict";

		// property
		var constants = {};
		var events = {};
		var user = {};
		var master = {};
		var systemSeq = "";
		var systemParentSeq = "";
		var systemName = '';
		var defaultPath = "";

		
		// method
		this.initialize = function(c, e, u, m, d) {
			constants = c;
			events = e;
			user = u;
			master = m;
			defaultPath = d;
		};
		
		
		this.$get = function() {
			return {
				setSystemSeqName : function(value) {
					systemSeq = value.systemSeq;
					systemParentSeq = value.systemParentSeq;
					systemName = value.systemName;

					// 새로고침해도 선택한 클러스터가 유지되도록 web storage에 저장
					sessionStorage.setItem('systemSeq',systemSeq);
					sessionStorage.setItem('systemParentSeq',systemParentSeq);
					sessionStorage.setItem('systemName', systemName);
				},
				getConst: function(key) {
					return constants[key];
				},
				getEvent: function(key) {					
					return events[key];
				},
				getUser: function() {
					return angular.copy(user);
				},
				getSystemSeq: function(){
					return systemSeq;
				},
				getSystemName: function(){
					return sessionStorage.getItem('systemName');;
				},
				getSeverity: function() {
					return {"CR":"Critical", "MJ":"Major", "MN":"Minor"};
				},
				getDefaultPath: function() {
					//return "/dashboard/job";
					// return "/dashboard/metric";
					return "/dashboard/overview";
				},
				getMasterInfo: function() {
					return master;
				},
				setMasterInfo: function(m) {
					master = m;
				}
			}
		}
	}
});