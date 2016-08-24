/*
 *	微信 H5 活动统计 JS
 *	Li Ming
 *	2015.10.26
 *	部署文档
 *	http://static.api.social-touch.com/docs/analytics_js/index.html
 *	http://static.api.social-touch.com/docs/download/h5_analytics_js_guide.pdf
 *	技术实现方式及原理
 *	http://static.api.social-touch.com/docs/analytics_js_detail/index.html
 */
(function(){
	// 常用配置的定义
	var VERSION = "1.0.0";
	var PATH = location.protocol + "//logst.social-touch.com";
	var LOG_PATH_PV = PATH + "/show.gif";
	var LOG_PATH_SHARE = PATH + "/share.gif";	// 参数 open_id=12345678&pre_doid=qazwsxedc&doid=qazwsxedc&url=
	var VERIFY_API = "http://biz.social-touch.com/spread/admin_info/CustomPageMarking";
	var SHARE_SUCCESS_SCRIPT = "http://static.biz.social-touch.com/public/js/h5share/weixin-share-success.min.js?ver=1.0";
	var OPEN_ID = null;		// 保存 open_id
	var REAL_URL = null;	// 保存真实 URL
	var SOURCE_UUID = null;	// 上次的传播节点
	var EXT_INFO = null;	// 扩展字段
	var isInit = false;	// 是否初始化完成

	function $(o){
		if(typeof o == "string"){
			return document.getElementById(o);
		} else {
			return o;
		}
	}
	var Analytics = {
		// 注入微信 JS
		"inject": function(){
			if(typeof wx == "undefined"){
				if(typeof console != "undefined" && typeof console.log != "undefined"){
					console.log("请在 H5 统计 JS 之前先引入微信的 http://res.wx.qq.com/open/js/jweixin-1.0.0.js");
				}
				return;
			}
			window._wx = wx;
			var toBeHooked = [
				'onMenuShareTimeline',
				'onMenuShareAppMessage',
				'onMenuShareQQ',
				'onMenuShareWeibo',
				'onMenuShareQZone'
			];
			var config = _wx.config;
			wx.config = function(opt) {
				// 自动补充分享的 jsApiList
				opt.jsApiList = Analytics.fixOption(opt.jsApiList, toBeHooked);
				config(opt);

				var uuid = Analytics.getUUID();
				for(var i = 0, j = toBeHooked.length; i < j; i++) {
					(function(){
						var old = wx[toBeHooked[i]];
						wx[toBeHooked[i]] = function(info) {
							try{
							var p = {};
							if(info != null){
								for(var key in info){
									p[key] = info[key];
								}
							}
							// 看是否定义了分享 URL，如果定义了，用它，没定义就用 REAL_URL
							var link =  (typeof(p.link) == 'undefined' || p.link == '') ? decodeURIComponent(REAL_URL) : p.link;
							link = link || document.URL;
							// 修正分享 URL 中的 __bp_uuid__ 为新生成的
							if(link.indexOf("__bp_uuid__") != -1){
								link.replace(/__bp_uuid__=(\w+)/, "__bp_uuid__=" + uuid);
							} else {
								if(link.indexOf("?") == -1){
									link += "?__bp_uuid__=" + uuid;
								} else {
									link += "&__bp_uuid__=" + uuid;
								}
							}
							p.link = link;
							// p.title = "H5 数据统计测试";

							var success = p.success;
							p.success = function(){
								if(success) {
										try{    
												success.apply(window,arguments);
										}catch(e) { }
								}
								// 发送分享日志请求
								Analytics.shareLog(uuid);
								// 分享成功提示，通过 jsonp 去查询接口
								Analytics.shareUserInfo();
							};
							old(p);
							}catch(e){}
						};
					})();
				}
			};
			// 劫持 ready 和 error 用于监听微信 JSSDK 鉴权成功与否
			var ready = _wx.ready;
			wx.ready = function(info){
				// 鉴权成功后发出消息
				function catchSucc(param){
					info(param);
					Analytics.verifyFileContent(1);
				}
				ready(catchSucc);
			};
			var error = _wx.error;
			wx.error = function(info){
				// 鉴权失败后发出消息
				function catchError(param){
					info(param);
					Analytics.verifyFileContent(4);
				}
				error(catchError);
			}
		},
		//
		"fixOption" : function(source, plugins){
			var result = source.concat(plugins);
			result.sort();
			result = result.join(",") + ",";
			result = result.replace(/([a-z]+,)\1/gi, "$1");
			result = result.substr(0, result.length - 1);
			result = result.split(",");
			return source;
		},
		// pv 记录
		"pvLog": function(){
			if(isInit == false){ return; }
			// 如果 open_id 和 REAL_URL 都存在，才发出点击日志
			var params = "";
			if(OPEN_ID != null && REAL_URL != null && SOURCE_UUID != null){
				params = "open_id=" + OPEN_ID + "&pre_doid=" + SOURCE_UUID + "&url=" + REAL_URL;
				var url = LOG_PATH_PV + "?" + params;
				// alert("pv log:" + url);
				Analytics.pushLog(url);
			}
		},
		// 分享行为记录
		"shareLog": function(uuid){
			if(isInit == false){ return; }
			var params = "";
			// 如果 open_id 和 REAL_URL 都存在，才发出分享日志
			if(OPEN_ID != null && REAL_URL != null && SOURCE_UUID != null){
				params = "open_id=" + OPEN_ID + "&pre_doid=" + SOURCE_UUID + "&doid=" + uuid + "&url=" + REAL_URL;
				var url = LOG_PATH_SHARE + "?" + params;
				// alert("share log:" + url);
				Analytics.pushLog(url);
			}
		},
		// 发送日志请求
		"pushLog": function(url){
			// alert("push: " + url);
			// 如果有扩展信息，就带上
			if(EXT_INFO != null){
				url += "&ext_info=" + EXT_INFO;
			}
			url += "&rand=" + Math.random();
			var img = new Image();
			img.src = url;
			img.onload = clear;
			function clear(){
				img.onload = null;
				img = null;
			}
		},
		// 页面数据采集
		"collect": function(){
			// 获取真实 URL
			var urlContainer = $("wechat_share_url");
			if(urlContainer){
				isInit = true;
				REAL_URL = encodeURIComponent($("wechat_share_url").value);
			} else {
				return;
			}

			var extInfo = $("wechat_ext_info");
			if(extInfo){
				EXT_INFO = encodeURIComponent(extInfo.value);
			}
			// 扩展信息 encode 之后不能超过 2000 字符
			if(EXT_INFO != null && EXT_INFO.length > 2000){
				EXT_INFO = null;
			}
			// 从 url 中获取获取微信 open_id
			if(document.URL.indexOf("openid=") != -1){
				OPEN_ID = document.URL.match(/[\?&]openid=([-\w]+)/i);
				if(OPEN_ID != null && OPEN_ID.length > 1){
					OPEN_ID = OPEN_ID[1];
				} else {
					OPEN_ID = null;
				}
			}
			// 从地址栏中获取上次的 uuid
			var param = location.search;
			if(param != ""){
				SOURCE_UUID = param.match(/[\?&]__bp_uuid__=(\w+)(?=(&|$))/);
				if(SOURCE_UUID != null && SOURCE_UUID.length > 2){
					SOURCE_UUID = SOURCE_UUID[1];
					// 如果 __bp_uuid__ 是以 sysMark_ 开始，表示这次访问，是校验部码的，分享的时候不带这个参数
					if(SOURCE_UUID.indexOf("sysMark_") == 0){
						SOURCE_UUID = "";
					}
				} else {
					SOURCE_UUID = "";
				}
			} else {
				SOURCE_UUID = "";
			}
		},
		// 生成新的 uuid
		"getUUID": function(){
			var str = [OPEN_ID, REAL_URL, new Date().getTime()].join(":");
			return Analytics.md5(str);
		},
		// 启动函数
		"start": function (event) {
			// 如果初始化过了，就不再二次初始化
			if(isInit){return;}
			// try{
			// 页面信息采集
			Analytics.collect();
			// 加载成功后，就记一次 PV 请求
			Analytics.pvLog();
			// }catch(e){}
		},
		// 检查是否调试模式
		"debugMode": function(){
			var scripts = document.scripts;
			for(var i = 0, count = scripts.length; i < count; i++){
				var url = scripts[i].src;
				// alert("parse script: " + url);
				if(url.indexOf("debug=") != -1 && url.indexOf("weixin-stat-1.0") != -1){
					var domain = url.match(/debug=([-\w\.]+)/);
					if(domain.length > 1){
						domain = domain[1];
						PATH = location.protocol + "//" + domain;
						LOG_PATH_PV = PATH + "/show.gif";
						LOG_PATH_SHARE = PATH + "/share.gif";
						VERIFY_API = PATH + "/spread/admin_info/CustomPageMarking";
					}
				}
			}
		},
		// 验证统计 JS 部署是否正确
		"verifyFileContent": function(status){
			// try{
			if(document.URL.indexOf("sysMark_") != -1){
				var data = {
					"sysMark" : null,
					"status" : 1	// 状态：1=通过，2=微信网页授权失败，3=URL参数有误，4=微信JSSDK鉴权失败，5=系统错误
				};
				data.sysMark = document.URL.match(/__bp_uuid__=sysMark_([-\w]+)/i);
				if(data.sysMark != null && data.sysMark.length > 1){
					data.sysMark = data.sysMark[1];
				} else {
					data.sysMark = "";
				}
				// 检查是否包含 openid 参数
				if(document.URL.indexOf("openid=") == -1){
					setStatus(2);
				}
				// 检查是否包含 input type="hidden" id="#wechat_share_url" 是否存在
				var urlContainer = $("wechat_share_url");
				if(urlContainer == null){
					setStatus(3);
				}
				// 检查微信鉴权是否失败
				if(status != null && status == 4){
					setStatus(4);
				}
				if(typeof data.status != "number"){
					data.status = data.status.join(",");
				}
				// 发出请求，通知接口
				var img = new Image();
				img.src = VERIFY_API + "?sysParam=" + JSON.stringify(data);
				img.onload = function(){
					img.onload = null;
					img = null;
				}
			}
			// }catch(e){alert(e);}
			function setStatus(st){
				if(Object.prototype.toString.call(data.status) !== '[object Array]'){
					data.status = [];
				}
				data.status.push(st);
			}
		},
		// 分享成功后的反馈
		"shareUserInfo": function(){
			// 如果 URL 中有 openid 和 appid 参数，就唤起外部 JS 来执行后续逻辑
			if(document.URL.indexOf("openid=") != -1 && document.URL.indexOf("appid=") != -1){
				// 如果分享插件已经加载，就直接执行，否则加载对应的 JS
				if(typeof window.SocialTouch != "undefined" &&
					typeof window.SocialTouch.ShareObject != "undefined" &&
					typeof window.SocialTouch.ShareObject.init == "function"){
					window.SocialTouch.ShareObject.init();
				} else {
					Analytics.scriptLoader(SHARE_SUCCESS_SCRIPT);
				}
			}
		},
		// 加载一个指定的脚本
		"scriptLoader": function(url){
			var script = document.createElement("script");
			script.src = url;
			document.getElementsByTagName("head")[0].appendChild(script);
		}
	};
	// MD5 算法
	/*
	 * JavaScript MD5 1.0.1
	 * https://github.com/blueimp/JavaScript-MD5
	 *
	 * Copyright 2011, Sebastian Tschan
	 * https://blueimp.net
	 *
	 * Licensed under the MIT license:
	 * http://www.opensource.org/licenses/MIT
	 * 
	 * Based on
	 * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
	 * Digest Algorithm, as defined in RFC 1321.
	 * Version 2.2 Copyright (C) Paul Johnston 1999 - 2009
	 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
	 * Distributed under the BSD License
	 * See http://pajhome.org.uk/crypt/md5 for more info.
	 */
	(function ($) {
		'use strict';

		/*
		* Add integers, wrapping at 2^32. This uses 16-bit operations internally
		* to work around bugs in some JS interpreters.
		*/
		function safe_add(x, y) {
			var lsw = (x & 0xFFFF) + (y & 0xFFFF),
				msw = (x >> 16) + (y >> 16) + (lsw >> 16);
			return (msw << 16) | (lsw & 0xFFFF);
		}

		/*
		* Bitwise rotate a 32-bit number to the left.
		*/
		function bit_rol(num, cnt) {
			return (num << cnt) | (num >>> (32 - cnt));
		}

		/*
		* These functions implement the four basic operations the algorithm uses.
		*/
		function md5_cmn(q, a, b, x, s, t) {
			return safe_add(bit_rol(safe_add(safe_add(a, q), safe_add(x, t)), s), b);
		}
		function md5_ff(a, b, c, d, x, s, t) {
			return md5_cmn((b & c) | ((~b) & d), a, b, x, s, t);
		}
		function md5_gg(a, b, c, d, x, s, t) {
			return md5_cmn((b & d) | (c & (~d)), a, b, x, s, t);
		}
		function md5_hh(a, b, c, d, x, s, t) {
			return md5_cmn(b ^ c ^ d, a, b, x, s, t);
		}
		function md5_ii(a, b, c, d, x, s, t) {
			return md5_cmn(c ^ (b | (~d)), a, b, x, s, t);
		}

		/*
		* Calculate the MD5 of an array of little-endian words, and a bit length.
		*/
		function binl_md5(x, len) {
			/* append padding */
			x[len >> 5] |= 0x80 << (len % 32);
			x[(((len + 64) >>> 9) << 4) + 14] = len;

			var i, olda, oldb, oldc, oldd,
				a =  1732584193,
				b = -271733879,
				c = -1732584194,
				d =  271733878;

			for (i = 0; i < x.length; i += 16) {
				olda = a;
				oldb = b;
				oldc = c;
				oldd = d;

				a = md5_ff(a, b, c, d, x[i],       7, -680876936);
				d = md5_ff(d, a, b, c, x[i +  1], 12, -389564586);
				c = md5_ff(c, d, a, b, x[i +  2], 17,  606105819);
				b = md5_ff(b, c, d, a, x[i +  3], 22, -1044525330);
				a = md5_ff(a, b, c, d, x[i +  4],  7, -176418897);
				d = md5_ff(d, a, b, c, x[i +  5], 12,  1200080426);
				c = md5_ff(c, d, a, b, x[i +  6], 17, -1473231341);
				b = md5_ff(b, c, d, a, x[i +  7], 22, -45705983);
				a = md5_ff(a, b, c, d, x[i +  8],  7,  1770035416);
				d = md5_ff(d, a, b, c, x[i +  9], 12, -1958414417);
				c = md5_ff(c, d, a, b, x[i + 10], 17, -42063);
				b = md5_ff(b, c, d, a, x[i + 11], 22, -1990404162);
				a = md5_ff(a, b, c, d, x[i + 12],  7,  1804603682);
				d = md5_ff(d, a, b, c, x[i + 13], 12, -40341101);
				c = md5_ff(c, d, a, b, x[i + 14], 17, -1502002290);
				b = md5_ff(b, c, d, a, x[i + 15], 22,  1236535329);

				a = md5_gg(a, b, c, d, x[i +  1],  5, -165796510);
				d = md5_gg(d, a, b, c, x[i +  6],  9, -1069501632);
				c = md5_gg(c, d, a, b, x[i + 11], 14,  643717713);
				b = md5_gg(b, c, d, a, x[i],      20, -373897302);
				a = md5_gg(a, b, c, d, x[i +  5],  5, -701558691);
				d = md5_gg(d, a, b, c, x[i + 10],  9,  38016083);
				c = md5_gg(c, d, a, b, x[i + 15], 14, -660478335);
				b = md5_gg(b, c, d, a, x[i +  4], 20, -405537848);
				a = md5_gg(a, b, c, d, x[i +  9],  5,  568446438);
				d = md5_gg(d, a, b, c, x[i + 14],  9, -1019803690);
				c = md5_gg(c, d, a, b, x[i +  3], 14, -187363961);
				b = md5_gg(b, c, d, a, x[i +  8], 20,  1163531501);
				a = md5_gg(a, b, c, d, x[i + 13],  5, -1444681467);
				d = md5_gg(d, a, b, c, x[i +  2],  9, -51403784);
				c = md5_gg(c, d, a, b, x[i +  7], 14,  1735328473);
				b = md5_gg(b, c, d, a, x[i + 12], 20, -1926607734);

				a = md5_hh(a, b, c, d, x[i +  5],  4, -378558);
				d = md5_hh(d, a, b, c, x[i +  8], 11, -2022574463);
				c = md5_hh(c, d, a, b, x[i + 11], 16,  1839030562);
				b = md5_hh(b, c, d, a, x[i + 14], 23, -35309556);
				a = md5_hh(a, b, c, d, x[i +  1],  4, -1530992060);
				d = md5_hh(d, a, b, c, x[i +  4], 11,  1272893353);
				c = md5_hh(c, d, a, b, x[i +  7], 16, -155497632);
				b = md5_hh(b, c, d, a, x[i + 10], 23, -1094730640);
				a = md5_hh(a, b, c, d, x[i + 13],  4,  681279174);
				d = md5_hh(d, a, b, c, x[i],      11, -358537222);
				c = md5_hh(c, d, a, b, x[i +  3], 16, -722521979);
				b = md5_hh(b, c, d, a, x[i +  6], 23,  76029189);
				a = md5_hh(a, b, c, d, x[i +  9],  4, -640364487);
				d = md5_hh(d, a, b, c, x[i + 12], 11, -421815835);
				c = md5_hh(c, d, a, b, x[i + 15], 16,  530742520);
				b = md5_hh(b, c, d, a, x[i +  2], 23, -995338651);

				a = md5_ii(a, b, c, d, x[i],       6, -198630844);
				d = md5_ii(d, a, b, c, x[i +  7], 10,  1126891415);
				c = md5_ii(c, d, a, b, x[i + 14], 15, -1416354905);
				b = md5_ii(b, c, d, a, x[i +  5], 21, -57434055);
				a = md5_ii(a, b, c, d, x[i + 12],  6,  1700485571);
				d = md5_ii(d, a, b, c, x[i +  3], 10, -1894986606);
				c = md5_ii(c, d, a, b, x[i + 10], 15, -1051523);
				b = md5_ii(b, c, d, a, x[i +  1], 21, -2054922799);
				a = md5_ii(a, b, c, d, x[i +  8],  6,  1873313359);
				d = md5_ii(d, a, b, c, x[i + 15], 10, -30611744);
				c = md5_ii(c, d, a, b, x[i +  6], 15, -1560198380);
				b = md5_ii(b, c, d, a, x[i + 13], 21,  1309151649);
				a = md5_ii(a, b, c, d, x[i +  4],  6, -145523070);
				d = md5_ii(d, a, b, c, x[i + 11], 10, -1120210379);
				c = md5_ii(c, d, a, b, x[i +  2], 15,  718787259);
				b = md5_ii(b, c, d, a, x[i +  9], 21, -343485551);

				a = safe_add(a, olda);
				b = safe_add(b, oldb);
				c = safe_add(c, oldc);
				d = safe_add(d, oldd);
			}
			return [a, b, c, d];
		}

		/*
		* Convert an array of little-endian words to a string
		*/
		function binl2rstr(input) {
			var i,
				output = '';
			for (i = 0; i < input.length * 32; i += 8) {
				output += String.fromCharCode((input[i >> 5] >>> (i % 32)) & 0xFF);
			}
			return output;
		}

		/*
		* Convert a raw string to an array of little-endian words
		* Characters >255 have their high-byte silently ignored.
		*/
		function rstr2binl(input) {
			var i,
				output = [];
			output[(input.length >> 2) - 1] = undefined;
			for (i = 0; i < output.length; i += 1) {
				output[i] = 0;
			}
			for (i = 0; i < input.length * 8; i += 8) {
				output[i >> 5] |= (input.charCodeAt(i / 8) & 0xFF) << (i % 32);
			}
			return output;
		}

		/*
		* Calculate the MD5 of a raw string
		*/
		function rstr_md5(s) {
			return binl2rstr(binl_md5(rstr2binl(s), s.length * 8));
		}

		/*
		* Calculate the HMAC-MD5, of a key and some data (raw strings)
		*/
		function rstr_hmac_md5(key, data) {
			var i,
				bkey = rstr2binl(key),
				ipad = [],
				opad = [],
				hash;
			ipad[15] = opad[15] = undefined;
			if (bkey.length > 16) {
				bkey = binl_md5(bkey, key.length * 8);
			}
			for (i = 0; i < 16; i += 1) {
				ipad[i] = bkey[i] ^ 0x36363636;
				opad[i] = bkey[i] ^ 0x5C5C5C5C;
			}
			hash = binl_md5(ipad.concat(rstr2binl(data)), 512 + data.length * 8);
			return binl2rstr(binl_md5(opad.concat(hash), 512 + 128));
		}

		/*
		* Convert a raw string to a hex string
		*/
		function rstr2hex(input) {
			var hex_tab = '0123456789abcdef',
				output = '',
				x,
				i;
			for (i = 0; i < input.length; i += 1) {
				x = input.charCodeAt(i);
				output += hex_tab.charAt((x >>> 4) & 0x0F) +
					hex_tab.charAt(x & 0x0F);
			}
			return output;
		}

		/*
		* Encode a string as utf-8
		*/
		function str2rstr_utf8(input) {
			return unescape(encodeURIComponent(input));
		}

		/*
		* Take string arguments and return either raw or hex encoded strings
		*/
		function raw_md5(s) {
			return rstr_md5(str2rstr_utf8(s));
		}
		function hex_md5(s) {
			return rstr2hex(raw_md5(s));
		}
		function raw_hmac_md5(k, d) {
			return rstr_hmac_md5(str2rstr_utf8(k), str2rstr_utf8(d));
		}
		function hex_hmac_md5(k, d) {
			return rstr2hex(raw_hmac_md5(k, d));
		}

		function md5(string, key, raw) {
			if (!key) {
				if (!raw) {
					return hex_md5(string);
				}
				return raw_md5(string);
			}
			if (!raw) {
				return hex_hmac_md5(key, string);
			}
			return raw_hmac_md5(key, string);
		}

		if (typeof define === 'function' && define.amd) {
			define(function () {
				return md5;
			});
		} else {
			$.md5 = md5;
		}
	}(Analytics));


	// 主逻辑
	// 注入微信 JS
	Analytics.inject();
	// 调试模式
	Analytics.debugMode();
	// 部署验证
	if(typeof window.wx == "undefined"){
		Analytics.verifyFileContent(4);
	}
	// 如果页面已经加载完成，就直接执行
	if(document.readyState = "complete"){
		Analytics.start();
	}
	// 如果页面还在加载，就监听 DomReady 事件
	document.addEventListener("DOMContentLoaded", Analytics.start);
})();
