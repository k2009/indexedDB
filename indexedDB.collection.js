+function(){
	var collection = function(){
		var _thisDB = this;


		var fn_json = {
			find:function(){


			}
		}
		return fn_json;
	}
	window.indexedDB_collection = collection;
	console.log("外部钩子释放完毕")
}()

