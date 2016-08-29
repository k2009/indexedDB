+function(){
	"use strict";
	var collection = function(){
		var _thisDB = this;

		var value_fn = {
			$gt:function(){			//大于操作符

			},
			$gte:function(){		//大于等于

			},
			$lt:function(){			//小于

			},
			$lte:function(){		//小于等于

			},
			$ne:function(){			//不等于

			},
			$all:function(){		//匹配所有

			},
			$size:function(){		//查询指定长度的素组

			},
			$in:function(){			//在范围内

			},
			$nin:function(){		//不在范围内

			},
			$mod:function(){		//

			},
			$slice:function(){		//控制返回的数组元素中的元素个数

			}
		}
		var key_fn ={
			$and:function(data){		//与方法,内部表达式都符合才返回 => db.collection.find({"$and":[{"userid":"495"},{"type":"info"}]})

			},
			$or:function(){			//或方法,满足其一及返回

			},
			$nor:function(){		//内部表达式有一个不满足就不返回

			},
			$not:function(){		//找出不匹配表达式的文档，不能够单独使用，必须与其他表达式配合使用

			},
			$exists:function(){		//查询文档中字段是否存在

			},
			$regex:function(){		//Object.prototype.toString.call(/123123/) => "[object RegExp]"

			},
		}
		var fn_json = {
			find:function(opt){
				var data = {};
				var attr;
				var callback = function(){};
				var callbackJson = {
					done:function(c){
						callback = c;
					}
				};

				_thisDB.open(function(e){
					var searchKey = {

					}
					data = {};

					for(attr in opt){
						if(key_fn[attr]){=
							for (var d in opt[attr]) {
								searchKey[d]
							}
						}else{
							searchKey[attr] = opt[attr];

							e.each(function(d){
								var btn = true;
								for (var attr in searchKey) {
									if(d[attr] != searchKey[attr]){
										btn = false;
									}
								}
								if(btn){
									data = d;
									callback(data)
									return false;
								}
							})
						}
					}
				})

				return callbackJson;
			}
		}
		return fn_json;
	}
	window.indexedDB_collection = collection;
	console.log("外部钩子释放完毕")
}()

