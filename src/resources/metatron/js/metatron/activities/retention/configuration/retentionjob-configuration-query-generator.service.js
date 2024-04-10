define(["app", "moment"], function (app, moment) {
    app.factory("RetentionjobConfigurationQueryGeneratorService", ["$http", "$q",
        function ($http, $q) {
            "use strict";
            var queryGenerator = function (dataType, inputCmd) {
                var execCmd = '';
                if (dataType === 'Hive') {
                    execCmd = 'hive -e "' + inputCmd + '"';
                } else if (dataType === 'HDFS') {
                    execCmd = 'hadoop dfs -rm -r ' + inputCmd;
                } else if (dataType === 'LogFile') {
                    execCmd = inputCmd;
                } else {
                    execCmd = inputCmd;
                }
                return execCmd;
            };

            var hiveQueryGenerator = function (dbTableName, deleteRole, retentionjobPatterns, cType) {
                var partitionQuery = '';
                var str = (cType == 'exec') ? 'patternId' : 'patternName';               
                for (var i = 0; i < retentionjobPatterns.length; i++) {
                    partitionQuery += 'PARTITION (' + retentionjobPatterns[i].partitionName + deleteRole + '\'' + retentionjobPatterns[i][str] + '\')';
                    if (i === retentionjobPatterns.length - 1) {
                        partitionQuery += ';';
                    } else {
                        partitionQuery += ', ';
                    }
                }
                return 'ALTER TABLE ' + dbTableName + ' DROP IF EXISTS ' + partitionQuery;
            };

            var hiveExternalCmdDirectGenerator = function (cmdHiveExternalCmd) {                
                return 'hadoop dfs -rm -r ' + cmdHiveExternalCmd;
            };

            var hiveExternalCmdToolGenerator = function (dbTableName, deleteRole, retentionjobPatterns) {
                var arr = dbTableName.split('.');
                if (arr.length !== 2) return 'db/table field error.';
                if (retentionjobPatterns.length !== 1) return 'partition field error.';
                var db = arr[0].trim();
                var table = arr[1].trim();
                return 'hadoop dfs -rm -r /user/hive/warehouse/' + db + '.db/' + table + '/' + retentionjobPatterns[0].partitionName + '=' + retentionjobPatterns[0].patternName;
            };

            return {
                queryGenerator: queryGenerator,
                hiveQueryGenerator: hiveQueryGenerator,
                hiveExternalCmdDirectGenerator: hiveExternalCmdDirectGenerator,
                hiveExternalCmdToolGenerator: hiveExternalCmdToolGenerator
            }
        }
    ]);
});
