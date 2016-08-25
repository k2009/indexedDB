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
			$and:function(){		//与方法,内部表达式都符合才返回 => db.collection.find({"$and":[{"userid":"495"},{"type":"info"}]})

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

				_thisDB.open(function(e){
					searchKey = {

					}
					data = {};

					for(var attr in opt){
						if(key_fn[attr]){
							key_fn[attr](data);

						}else{
							searchkey[attr] = opt[attr]
						}
					}

					return data;

				})

			}
		}
		return fn_json;
	}
	window.indexedDB_collection = collection;
	console.log("外部钩子释放完毕")
}()

