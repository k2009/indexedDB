# indexedDB

兼容jquery,可以直接$.db调用,同时兼容define()引用require后自主命名,db函数无依赖,浏览器兼容性暂时未测;

使用方法
    
	var thisDB = $.db({
        dbName: "数据库名",
        tableName: "子表名" //若不填子表名,子表名为数据库名
    	}, {
        key: '创建时必填,数据库查询单条数据的身份识别码,之后修改无效,只能删库重来...',
        index: []
    });
    thisDB.open(function(e) { //异步打开indexDB,若无tableName,则直接关闭数据库,提升数据库版本后新建该子表;

        // 可挂载方法:
        e.add(value)		//向当前数据库添加一条新纪录(keyPath唯一,如果已有,会报错)(若传入参数为数组,则添加多条记录);
        e.put(value)		//向当前数据库添加或更新一条新纪录(keyPath唯一,如果未找到keyPath,则新增,若找到,则更新)(若传入参数为数组,则put多条记录);
        e.get( keyPath||callback , null||callback )		//如果传入的第一个参数是function,那么直接获取当前仓库的所有数据,若不是,则通过keyPath获取当前数据库内的单条数据;
        e.each(callback,eachEndFn)		//逐条读取当前仓库内的所有数据,每次读取完执行callback,当读取全部完成时,执行第二参数eachEndFn方法;
        e.close()		//关闭当前数据库(indexedDB单个页面只能打开一个数据库,若需要打开别的库,必须先关闭库才能再打开);
        e.delete()		//删除当前仓库;
        e.clear()		//清空当前仓库;

    })
    thisDB.deleteDB() //直接删除主表;

