//
// 1-rcc-3pcc-test.js
//

var sip = require('../sip.js');

var proxy = require('../proxy.js');

var settings = require('./settings.js');

////var sys = require('util');
var util = require('util');

var http = require('http');
var path = require('path');
var fs = require('fs');
var querystring = require('querystring');

var BufferedWriter = require ("buffered-writer");

var xml = require("node-xml");

var portscanner = require('portscanner');


var g_caller_uri = '';
var g_callee_uri = '';
var g_contact_uri = '';
var g_pai_uri = '';

var via_branch_tag = '';

var caller_branch_tag = '';
var callee_branch_tag = '';

var dialogs = {};

var HOST = settings.sip3pcc.host_ip;
var http_port = settings.sip3pcc.http_port;
var sip_port = settings.sip3pcc.sip_port;

var ms1_ip = settings.sip3pcc.ms1_ip;
var ms1_port = settings.sip3pcc.ms1_port;

var ms2_ip = settings.sip3pcc.ms2_ip;
var ms2_port = settings.sip3pcc.ms2_port;


var caller_number = '7606';
var callee_number = '7607';

var rcc_call_id = '';
var rcc_local_tag = '';
var rcc_remote_tag = '';

var rcc3pcc_command = '';

var redis = require('redis');

// Create a redis client to manage the registration
// info.
///var client = redis.createClient(6379,'192.168.0.202');

/*
client.on("connect", function () {
    console.log("redis connect ");
});

client.on("data", function (data) {
    console.log("redis data -> " + data);
});

client.on("error", function (err) {
    console.log("redis error -> " + err);
});

client.on("end", function () {
    console.log("redis end ");
});

client.on("close", function () {
    console.log("redis close ");
});
*/


//Trim leading and trailing whitespace from string values.
function trim(str) 
{
	return str.replace(/^\s+|\s+$/g, '');
}


String.prototype.trim = function()
{
	return (this.replace(/^[\s\xA0]+/, "").replace(/[\s\xA0]+$/, ""));
}

String.prototype.startsWith = function(str) 
{
	return (this.match("^"+str)==str);
	
}

String.prototype.endsWith = function(str) 
{
	return (this.match(str+"$")==str);
}



//var my_udp = require('dgram');
//var my_sock = my_udp.createSocket('udp4');

/*
var my_buf = new Buffer(8);
for (var i = 0; i < 8; i++) {
    my_buf[i] = 100;
}

my_sock.on('listening', function() {
    console.log('listening.....');
});

my_sock.on('message', function(msg, rinfo) {
    console.log('got pong from '+ rinfo.address +":"+ rinfo.port);
});
my_sock.on('close', function() {
    console.log('on close....');
});
my_sock.on('error', function() {
    console.log('on error....');
});

my_sock.bind(20909,'0.0.0.0');
*/



function uuid() {

   var chars = '0123456789abcdef'.split('');

   var uuid = [], rnd = Math.random, r;
   uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
   uuid[14] = '4'; // version 4

   for (var i = 0; i < 36; i++)
   {
      if (!uuid[i])
      {
         r = 0 | rnd()*16;

         uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r & 0xf];
      }
   }

   return uuid.join('');
   
}

function generateBranch() {
	  return ['z9hG4bK',Math.round(Math.random()*1000000)].join('');
}


function createUUID() {
    // http://www.ietf.org/rfc/rfc4122.txt
    var s = [];
    var hexDigits = "0123456789abcdef";
    for (var i = 0; i < 36; i++) {
        s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
    }
    s[14] = "4";  // bits 12-15 of the time_hi_and_version field to 0010
    s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1);  // bits 6-7 of the clock_seq_hi_and_reserved to 01
    s[8] = s[13] = s[18] = s[23] = "-";

    var uuid = s.join("");
    return uuid;
}


function rstring() { 
	return Math.floor(Math.random()*1e6).toString(); 
}

function getNewCallId() { 
    ///return "" + Math.ceil(10000000000*Math.random()) + "-" + rstring() + "@" + HOST + ":" + sip_port ;
    ///return "" + uuid() + "@" + HOST + ":" + sip_port ;
    return "" + createUUID() + "@" + HOST + ":" + sip_port ;
}

var cseq_tag='';

var myCseq = 1;
var myNotifyCseq = 1;

var thridpcc_uri = settings.sip3pcc.uri;

var call_id1= getNewCallId(); //rstring();
var call_id2= call_id1;

var video_sdp = '';

var user_app_info = ''
	+'no mercy take it while you can\r\n'
	+'hello world\r\n'
	+'pitching and defense\r\n'
	+'help is on the way\r\n'
	;

	/*
	+'m=control 0 ivr application '+rstring()+'\r\n'
    +'a=command:SHOW_ME_THE_MONEY\r\n'
	+'a=arg1:12345678\r\n'
	+'a=arg2:09928383844\r\n'
	+'a=arg3:vivjirifrifr\r\n'
	+'a=arg4:vivji4f444f4f4gg555decerifrifr\r\n'
	+'a=arg5:5t5t55y5yvivjirifrifr\r\n'
	;
	*/
	

var ivr_app_sdp = '' 
	+'m=control 0 ivr application '+rstring()+'\r\n'
    +'a=command:IVR_PLAY_AUDIO_REQ\r\n'
    +'a=arg1:1111111111111111aaaa11111111111111\r\n'
    +'a=arg2:22222222222bbbb22222222222222222\r\n'
    +'a=arg3:33333cccc33333333333333333333\r\n'
    +'a=arg4:44444444444444bbbb444444444\r\n'
    +'a=arg5:555555555ffff555555555555\r\n'
    +'a=arg6:66666666666jjjjj66666666\r\n'
    +'a=arg7:777777777jjkkkfff777777777\r\n'
    +'a=arg8:8888888888hhh88888\r\n'
    +'a=arg9:9999999eeeewwwww99999\r\n'
    +'a=arg10:10000000000000000000hnhnhvfvvdfefe00000\r\n'
	;

var cti_app_sdp = '' 
	+'m=control 0 cti application '+rstring()+'\r\n'
    +'a=command:CTI_WHISPER_REQ\r\n'
    +'a=arg1:11111qqqq1111111111111111111111111\r\n'
    +'a=arg2:2222222222wwww222222222222222222\r\n'
    +'a=arg3:3333333333333333rrrr333333333\r\n'
    +'a=arg4:444444444444444444yyyy44444\r\n'
    +'a=arg5:5555555555ssss5555555555\r\n'
    +'a=arg6:6666666666ffff666666666\r\n'
    +'a=arg7:77777777777hhhh7777777\r\n'
    +'a=arg8:88888aaaaaa8888888888\r\n'
    +'a=arg9:999999999kkkkk999\r\n'
    +'a=arg10:10000000000000000klddddd00000000\r\n'
	;



var my_video_sdp = '';

var my_uas_uri = [];

my_uas_uri[0] = 'sip:1234@192.168.1.244:5060';
my_uas_uri[1] = 'sip:5551@192.168.0.11:5060';
my_uas_uri[2] = 'sip:1234@192.168.0.202:5078';
my_uas_uri[3] = 'sip:1234@192.168.0.224:5078';
my_uas_uri[4] = 'sip:1234@192.168.1.28:5100';
my_uas_uri[5] = 'sip:1234@192.168.1.132:5060';


var my_target_uri = [];

my_target_uri[0] = 'sip:7606@192.168.0.109:5060';
my_target_uri[1] = 'sip:7607@192.168.0.187:5060';
my_target_uri[2] = 'sip:7608@192.168.0.186:5060';
my_target_uri[3] = 'sip:7609@192.168.0.112:5060';
my_target_uri[4] = 'sip:07010092588@192.168.70.108:5060';
my_target_uri[5] = 'sip:7610@192.168.0.205:5060';
my_target_uri[6] = 'sip:7611@192.168.0.206:5060';
my_target_uri[7] = 'sip:7612@192.168.0.207:5060';


//my_target_uri[5] = 'sip:7004@192.168.0.100:5060';
//my_target_uri[6] = 'sip:7005@192.168.0.102:5060';
//my_target_uri[7] = 'sip:7006@192.168.0.202:5060';
//my_target_uri[8] = 'sip:106@192.168.0.106:5060';
//my_target_uri[9] = 'sip:107@192.168.0.107:5060';
//my_target_uri[10] = 'sip:103@192.168.0.103:5060';
//my_target_uri[11] = 'sip:104@192.168.0.104:5060';
//my_target_uri[12] = 'sip:105@192.168.0.105:5060';
//my_target_uri[13] = 'sip:108@192.168.0.108:5060';
//my_target_uri[14] = 'sip:110@192.168.0.110:5060';
//my_target_uri[15] = 'sip:111@192.168.0.111:5060';
//my_target_uri[16] = 'sip:113@192.168.0.113:5060';
//my_target_uri[17] = 'sip:114@192.168.0.114:5060';
//my_target_uri[18] = 'sip:115@192.168.0.115:5060';
//my_target_uri[19] = 'sip:116@192.168.0.116:5060';
//my_target_uri[20] = 'sip:117@192.168.0.117:5060';
//my_target_uri[21] = 'sip:122@192.168.0.122:5060';
//my_target_uri[22] = 'sip:123@192.168.0.123:5060';
//my_target_uri[23] = 'sip:124@192.168.0.124:5060';



/*
my_target_uri[4] = 'sip:07010092060@192.168.70.101:5060';
my_target_uri[5] = 'sip:07010092188@192.168.70.102:5060';
my_target_uri[6] = 'sip:07010092809@192.168.70.103:5060';
my_target_uri[7] = 'sip:070-04@192.168.70.104:5060';
my_target_uri[8] = 'sip:070-05@192.168.70.105:5060';
my_target_uri[9] = 'sip:070-06@192.168.70.106:5060';
my_target_uri[10] = 'sip:070-07@192.168.70.107:5060';
my_target_uri[11] = 'sip:07010092588@192.168.70.108:5060';
my_target_uri[12] = 'sip:070-09@192.168.70.109:5060';
my_target_uri[13] = 'sip:070-10@192.168.70.110:5060';
my_target_uri[14] = 'sip:070-11@192.168.70.111:5060';
my_target_uri[15] = 'sip:070-12@192.168.70.112:5060';
my_target_uri[16] = 'sip:070-13@192.168.70.113:5060';
my_target_uri[17] = 'sip:070-14@192.168.70.114:5060';
my_target_uri[18] = 'sip:070-15@192.168.70.115:5060';
my_target_uri[19] = 'sip:070-16@192.168.70.116:5060';
my_target_uri[20] = 'sip:070-17@192.168.70.117:5060';
my_target_uri[21] = 'sip:070-18@192.168.70.118:5060';
my_target_uri[22] = 'sip:070-19@192.168.70.119:5060';
my_target_uri[23] = 'sip:070-20@192.168.70.120:5060';
my_target_uri[24] = 'sip:070-21@192.168.70.121:5060';
my_target_uri[25] = 'sip:070-22@192.168.70.122:5060';
*/

var mwi_uri = 'sip:1111@192.168.0.103';

var moh_uri = 'sip:13@192.168.0.202:6060';
var target_uri = '';
var conf_uri = '';
var video_uri = '';

var my_caller_uri = '';
var my_callee_uri = '';
var my_contact_uri = thridpcc_uri;
var my_pai_uri = '123456789';
var my_call_id = '';
var my_backup_uri = '';

var moh_tag = '';

var caller_to_tag = '';
var callee_to_tag = '';
var target_to_tag = '';
var backup_to_tag = '';

var hold1_sdp='';
var hold2_sdp='';
	
var request1_uri = 'sip:1111@192.168.0.109:5060'; ///'sip:7606@192.168.0.202:5060'; //'sip:7606@192.168.0.109:5060';
var to1_uri = 'sip:1111@192.168.0.109:5060'; ////'sip:7606@192.168.0.202:5060'; //'sip:7606@192.168.0.109:5060';

//var request1_uri = 'sip:7606@192.168.0.109:5060'; ///'sip:7606@192.168.0.202:5060'; //'sip:7606@192.168.0.109:5060';
//var to1_uri = 'sip:7606@192.168.0.109:5060'; ////'sip:7606@192.168.0.202:5060'; //'sip:7606@192.168.0.109:5060';
var from1_uri = 'sip:26552898@192.168.0.187:5060'; ////'sip:7607@192.168.0.202:5060'; //'sip:7607@192.168.0.187:5060';
var contact1_uri = thridpcc_uri; ////'sip:3pcc@192.168.0.101:5060'; //'sip:7607@192.168.0.101:5060';
var sdp1 = '';
var to1_tag = '';
var from1_tag = '123456';
var caller_tag = '123456';
var reinvite1_uri = 'sip:192.168.0.109:5060'; ///'sip:192.168.0.202:5060'; //'sip:192.168.0.109:5060';

var request2_uri = 'sip:1111@192.168.0.187:5060'; ////'sip:7607@192.168.0.202:5060'; //'sip:7607@192.168.0.187:5060';
var to2_uri = 'sip:1111@192.168.0.187:5060'; ////'sip:7607@192.168.0.202:5060'; //'sip:7607@192.168.0.187:5060';

//var request2_uri = 'sip:7607@192.168.0.187:5060'; ////'sip:7607@192.168.0.202:5060'; //'sip:7607@192.168.0.187:5060';
//var to2_uri = 'sip:7607@192.168.0.187:5060'; ////'sip:7607@192.168.0.202:5060'; //'sip:7607@192.168.0.187:5060';
var from2_uri = 'sip:26552898@192.168.0.109:5060'; /////'sip:7606@192.168.0.202:5060'; //'sip:7606@192.168.0.109:5060';
var contact2_uri = thridpcc_uri;
var sdp2 = '';
var to2_tag = '';
var from2_tag = '123456';
var callee_tag = '123456';
var reinvite2_uri = 'sip:192.168.0.187:5060'; ////'sip:192.168.0.202:5060'; //'sip:192.168.0.187:5060';



var flag_second = '';

function initFlag() {
	flag_second = '';
	
	//call_id1= rstring();
	//call_id2= call_id1;
	
}

function tracelog(msg) {}

function tracelog_1(msg) {

	try
	{
		//The BufferedWriter appends content to the end of the file because append == true
		new BufferedWriter ("tracelog", { encoding: "utf8", append: true })
	    	.on ("error", function (error){
	    		console.log (error);
	    	})

	    	//From the end of the file:
	    	.newLine () //Writes EOL (OS dependent; \r\n on Windows, otherwise \n)
	    	.write (msg) //Writes "Third line"
	    	.close (); //Closes the writer. A flush is implicitly done.
		
	} catch (err) {
		
		console.log("tracelog: "+err);
		
	}
	
}

var parser = new xml.SaxParser(function(cb) {
	
	  cb.onStartDocument(function() {
	      console.log('onStartDocument()....');
	  });
	  cb.onEndDocument(function() {
	      console.log('onEndDocument()....');
	  });
	  cb.onStartElementNS(function(elem, attrs, prefix, uri, namespaces) {
	      
		  console.log('onStartElementNS().....');
		  console.log("=> Started: " + elem + " uri="+uri +" (Attributes: " + JSON.stringify(attrs) + " )");
	      
	      if(elem === 'dialog')
	      {
	    	  var n = attrs.length;
	    	  console.log('....here...attrs.length=%s',n);
	    	  var myjson = []; ////new Array(n);
	    	  
	    	  for(var i=0; i<n; i++)
	    	  {
	    		  myjson[i]=JSON.stringify(attrs[i]);
		    	  console.log('....here...dialog: %s ', myjson[i] ); 
		    	  console.log('....here...dialog: %s ', attrs[i] ); 
		    	  console.log('....here...dialog: %s ', attrs[i][0] ); 
		    	  console.log('....here...dialog: %s ', attrs[i][1] ); 
		    	  if(rcc3pcc_command === 'RCC')
		    	  {
		    		  
		    		  if(attrs[i][0] === 'call-id')  {
		    		  
		    			  call_id1 = attrs[i][1];
		    			  console.log('....here...dialog: call_id1-> %s ', call_id1 );
		    			  tracelog('....here...dialog: call_id1-> '+call_id1 );
		    			  
		    			  
		    		  } else if(attrs[i][0] === 'local-tag') {
		    			  
		    			  from1_tag = attrs[i][1];
		    			  console.log('....here...dialog: from1_tag-> %s ', from1_tag );
		    			  tracelog('....here...dialog: from1_tag-> '+from1_tag );
		    			  
		    		  } else if(attrs[i][0] === 'remote-tag') {

		    			  callee_to_tag = attrs[i][1];
		    			  console.log('....here...dialog: callee_to_tag-> %s ', callee_to_tag );
		    			  tracelog('....here...dialog: callee_to_tag-> '+callee_to_tag );

		    		  } 
		    			  
		    	  
		    	  }
	    		  
	    	  }
	    	  ///
	    	  
	    	  
	      }
	      else if(elem === 'dialog-info')
	      {
	    	  var n = attrs.length;
	    	  console.log('....here...attrs.length=%s',n);
	    	  var myjson = []; ////new Array(n);
	    	  for(var i=0; i<n; i++)
	    	  {
	    		  myjson[i]=JSON.stringify(attrs[i]);
		    	  console.log('....here...dialog-info: %s ', myjson[i] ); 
		    	  console.log('....here...dialog-info: %s ', attrs[i] ); 
		    	  console.log('....here...dialog-info: %s ', attrs[i][0] ); 
		    	  console.log('....here...dialog-info: %s ', attrs[i][1] ); 
	    		  
	    	  }
	    	  
	    	  
	      }
	      else if(elem === 'address')
	      {
	    	  var n = attrs.length;
	    	  console.log('....here...attrs.length=%s',n);
	    	  var myjson = []; ////new Array(n);
	    	  for(var i=0; i<n; i++)
	    	  {
	    		  myjson[i]=JSON.stringify(attrs[i]);
		    	  console.log('....here...address: %s ', myjson[i] ); 
		    	  console.log('....here...address: %s ', attrs[i] ); 
		    	  console.log('....here...address: %s ', attrs[i][0] ); 
		    	  console.log('....here...address: %s ', attrs[i][1] ); 
	    		  
	    	  }
	    	  
	    	  
	      }
	      else if(elem === 'status')
	      {
	    	  var n = attrs.length;
	    	  console.log('....here...attrs.length=%s',n);
	    	  var myjson = []; ////new Array(n);
	    	  for(var i=0; i<n; i++)
	    	  {
	    		  myjson[i]=JSON.stringify(attrs[i]);
		    	  console.log('....here...status: %s ', myjson[i] ); 
		    	  console.log('....here...status: %s ', attrs[i] ); 
		    	  console.log('....here...status: %s ', attrs[i][0] ); 
		    	  console.log('....here...status: %s ', attrs[i][1] ); 
	    		  
	    	  }
	    	  
	    	  
	      }
	      else if(elem === 'msnsubstatus')
	      {
	    	  var n = attrs.length;
	    	  console.log('....here...attrs.length=%s',n);
	    	  var myjson = []; ////new Array(n);
	    	  for(var i=0; i<n; i++)
	    	  {
	    		  myjson[i]=JSON.stringify(attrs[i]);
		    	  console.log('....here...msnsubstatus: %s ', myjson[i] ); 
		    	  console.log('....here...msnsubstatus: %s ', attrs[i] ); 
		    	  console.log('....here...msnsubstatus: %s ', attrs[i][0] ); 
		    	  console.log('....here...msnsubstatus: %s ', attrs[i][1] ); 
	    		  
	    	  }
	    	  
	    	  
	      }
	      else if(elem === 'identity')
	      {
	      }
		  
	      
	      
	  });
	  cb.onEndElementNS(function(elem, prefix, uri) {
		  console.log('onEndElementNS().....');
	      console.log("<= End: " + elem + " uri="+uri + "\n");
	      parser.pause();// pause the parser
	      setTimeout(function (){parser.resume();}, 100); //resume the parser
	  });
	  cb.onCharacters(function(chars) {
	      console.log('<CHARS>'+chars+"</CHARS>");
	  });
	  cb.onCdata(function(cdata) {
	      console.log('<CDATA>'+cdata+"</CDATA>");
	  });
	  cb.onComment(function(msg) {
	      console.log('<COMMENT>'+msg+"</COMMENT>");
	  });
	  cb.onWarning(function(msg) {
	      console.log('<WARNING>'+msg+"</WARNING>");
	  });
	  cb.onError(function(msg) {
	      console.log('<ERROR>'+JSON.stringify(msg)+"</ERROR>");
	  });
	
});




function dumpSipRequest(request)
{

    console.log('---------------Received----------------BEGIN');
    var messages = sip.stringify(request);
    console.log(messages);
    console.log('request method ' + request.method );
	console.log('request uri ' + request.uri );
	console.log('request headers ' + JSON.stringify(request.headers) );
    console.log('---------------Received------------------END');


}


function sendSipResponse(response)
{

    console.log('---------------Sent--------------------BEGIN');
    var messages = sip.stringify(response);
    console.log(messages);
    // Send the response to the SIP client
    console.log('response: '+ JSON.stringify(response) );
	///proxy.send(response);
    proxy.send(response);
    console.log('---------------Sent----------------------END');


}

var contacts = {};

var registerContactForUser = function(user, contact, callback) {
	contacts[user] = contact;
	callback(null);
};

	
var queryUserContact = function(user, callback) {
	if (contacts[user] && Array.isArray(contacts[user])
			&& contacts[user].length > 0) {
		callback(null, contacts[user][0]);
	} else {
		calback(new Error('User Not Found'));
	}
};


var runAsync = function(callback) {
	setTimeout(callback, 1000);
};


var processRequestBeforeSending = function(request) {
	util.debug('processRequestBeforeSending:'
			+ util.inspect(request, null, null));
	return request;
};

var handleResponse = function(response) {
	//default behavior:
	util.debug('handleResponse:' + util.inspect(response, null, null));
	response.headers.via.shift();
	proxy.send(response);
};





function processCreateSipStack() {


	var client1 = redis.createClient(6379,'192.168.0.202');

	
	client1.set('*76', '*76');
	client1.set('*77', '*77');
	client1.set('*78', '*78');
	client1.set('*79', '*79');
	
	client1.del('*76');
	client1.del('*77');
	client1.del('*78');
	client1.del('*79');
	

	client1.quit();
	
	myCseq = 1;
	
	// starting stack
	
	///sip.start({

	proxy.start({
		
		port : sip_port,
		address : HOST,
		
		  logger: {
			    recv: function(m) { 
			    	util.debug('RECV:' + util.inspect(m, null, null));
			    	//console.log('RECV:' + util.inspect(m, null, null) );
			    	},
			    send: function(m) { 
			    	util.debug('SEND:' + util.inspect(m, null, null));
			    	//console.log('SEND:' + util.inspect(m, null, null) );
			    	},
			    error: function(e) { 
			    	util.debug('ERROR:' + e.stack);
			    	//console.log('ERROR:' + e.stack );
			    	
			    	}
			  }
		
	}, function(rq) {

		var request = rq;

		
		// Parse the URI in the reuqest header.
		var address = sip.parseUri(request.headers.to.uri);
		
		// Create a redis client to manage the registration
		// info.
		var client = redis.createClient(6379,'192.168.0.202');
		
		
		var sip_req = sip.stringify(rq);
		console.log("processCreateSipStack()...%s...Received Request:>>>\r\n%s\r\n<<<",rq.method,sip_req);
		tracelog("...Received Request>>>\r\n"+sip_req);

	    if (rq.method === 'NOTIFY') { 
	        
	    	var sdp = rq.content;
	    	
	    	if(sdp!=null)
	    	{
	    		//tracelog("content: \r\n"+sdp);
	    		//console.log("content: \r\n"+sdp);
	    		
	    		if(sdp.length>0)
	    		{
	    		    var mysdp = sdp.replace(/[\r\n]/g, "");
					var t_begin = mysdp.indexOf('<dialog-info ');
					var t_end = mysdp.length;
					
					var t_xml = mysdp.substring(t_begin, t_end);
	    		    
	    		    
	    		    parser.parseString(t_xml);
	    			
	    			
	    			
	    		  
	    		}

	    		
	    	}
	    	
			var rs = sip.makeResponse(rq, 200, 'OK');
			rs.headers['contact'] = contact1_uri;
			rs.headers['subscription-state'] = 'active';
			rs.headers.accept = 'application/dialog-info+xml';
			rs.headers.event = 'dialog';
			rs.headers['content-length'] = 0;
			rs.headers.expire = 300;
			
			var sip_res = sip.stringify(rs);
			console.log("processCreateSipStack()....%s...Send Response:>>>\r\n%s\r\n<<<",rq.method,sip_res);
			
			tracelog("...Response>>>\r\n"+sip_res);
			
			
			///proxy.send(rs);
			proxy.send(rs);
			
			
	    } else if (rq.method === 'REGISTER') {
	    	
        	var contact = request.headers.contact;

			// Store the registration info.
			if (Array.isArray(contact)
					&& contact.length
					&& (+(contact[0].params.expires
							|| request.headers.expires || 300)) > 0) 
            {
				///console.log('Registering user ' + request.headers.to.name + ' at ' + contact[0].uri);
				console.log('Registering user ' + address.user + ' at ' + contact[0].uri);
				client.set(address.user, contact[0].uri);
			}

			// Remove the registration info.
			else 
            {
				///console.log('Logging off user ' + request.headers.to.name);
				console.log('Logging off user ' + address.user);
				client.del(address.user);
			}

			// Build the response.
			//var response = sip.makeResponse(request, 200, 'OK');

            //sendSipResponse(response);
	    	
	    	
	    	
	    	var rs = sip.makeResponse(rq, 200, 'OK');

	    	var sip_res = sip.stringify(rs);
			console.log("processCreateSipStack()....%s...Send Response:>>>\r\n%s\r\n<<<",rq.method,sip_res);
	
			tracelog("...Response>>>\r\n"+sip_res);
	    	
	    	//proxy.send(rs);
	    	proxy.send(rs);
	    	
	    	var n = my_target_uri.length;
	    	console.log('my_target_uri....n=%d ',n);
	        for(var i=0; i<n ;i++)
	        {
	        	//processSUBSCRIBE(my_target_uri[i]);
	        	//processSUBSCRIBE_presence(my_target_uri[i]);
	        	//processOPTIONS_Polling(my_target_uri[i]);
	        	
	        }

	        processSUBSCRIBE(contact[0].uri);
        	processSUBSCRIBE_presence(contact[0].uri);
        	processOPTIONS_Polling(contact[0].uri);
	        
	        
	        my_caller_uri = my_target_uri[0];
	        my_callee_uri = my_target_uri[3]; ////[3];
	        
	        var m = my_uas_uri.length;
	    	console.log('my_uas_uri....m=%d ',m);
	        for(var j=0; j<m ;j++)
	        {
	        	//processSUBSCRIBE_presence(my_uas_uri[j]);
	        	//processOPTIONS_Polling(my_uas_uri[j]);
	        	
	        }
	        
	        
	        /*
			InviteFirstParty(
					my_caller_uri, ////caller_uri,
					my_callee_uri, ///callee_uri,
					my_contact_uri,
					my_pai_uri
					);
					*/
	        


	    	

	    } 
	    else if (trim(request.method) == 'ACK1')
	    {
	    	
	    	console.log('....ack....here....');
	    	
	    	var t_call_id = request.headers['call-id'];
	    	var t_request_uri = 'sip:7608@192.168.0.186';///request.headers.contact[0].uri;
	    	console.log('....ack....here....req='+t_request_uri);
	    	var t_callee_uri = request.headers.to.uri;
	    	var t_caller_uri = request.headers.from.uri;
	    	var t_callee_tag = request.headers.to.params.tag;
	    	var t_caller_tag = request.headers.from.params.tag;
		    var t_cseq = myCseq+100;
	    	
		    //request.uri = request.headers.contact.uri;
			//request.headers.contact = [ { uri : my_contact_uri } ];
		    
	        //proxy.send(request);
		    // sending ACK to First
		    proxy.send({
		      method: 'ACK',
		      uri: t_request_uri,
		      headers: {
		        to: {uri: t_callee_uri, params: {tag: t_callee_tag}},
		        from: {uri: t_caller_uri, params: {tag: t_caller_tag} },
		        'call-id': t_call_id,
		        cseq: {method: 'ACK', seq: t_cseq },
		        contact: [{uri: my_contact_uri}],
			    'Content-Type': 'application/sdp',
			    'Max-Forwards': '70',
		        //via: []
				via :
					[ 
					  {
					    version: '2.0',
					    protocol: 'UDP',
					    host: HOST,
					    port: sip_port,
					    params: { 
					    	branch: generateBranch()+';rport'
					    	}
					  }
				       
				    ],
		        
		      },
		      content: ''
		      
		    });

	        
	    	
	    }
	    
		// Handle SIP Invites.
	    else if (trim(request.method) == 'INVITE') 
        {

            dumpSipRequest(request);
            		
            
			///proxy.send(sip.makeResponse(request, 100, 'Trying'));
			//var resp100 = sip.makeResponse(request, 100, 'Trying');
			///sendSipResponse(resp100);
			
			//proxy.send(resp100);

            var user = sip.parseUri(request.uri).user;

			// Look up the registration info. for the user being
			// called.
			address = sip.parseUri(request.uri);
			
			client.get(address.user, function(err, contact) 
            {
				

			
				// If not found or error return 404.
				if (err || contact === null) 
                {
					//thomas....
					if (address.user.startsWith("1") && address.user.length <= 3)
					//if (address.user.length <= 3)
					//if (address.user.length > 0)
					{
                        
                        //proxy.send(sip.makeResponse(request, 180, 'Ringing'));
                        
			             //var resp180 = sip.makeResponse(request, 180, 'Ringing');
			             
			             ///sendSipResponse(resp180);
                        
			             //proxy.send(resp180);
					
						//var mmipService = 'sip:'+ address.user + '@192.168.0.202:5090';
						//sys.puts('User ' + address.user + ' is routing to ' + mmipService);
						//var response = sip.makeResponse(request, 200, 'OK');
						///------var response = sip.makeResponse(request, 180, 'Ringing');
						////////response.headers.contact = [ { uri : mmipService } ];
						///proxy.send(response);
						
						var mmipService = 'sip:192.168.0.202:6060';
						var response = sip.makeResponse(request, 200, 'OK');
						response.headers.contact = [ { uri : mmipService } ];
						
					    request.uri = 'sip:'+ address.user + '@192.168.0.202:6060'; ////contact;
						request.headers.contact = [ { uri : my_contact_uri } ];
					    
				        //proxy.send(request);

				        runAsync(function() {

				        	//request.uri = contact.uri;

				            proxy.send(processRequestBeforeSending(request), handleResponse);
				            
				        });


                        ////proxy.send(response);
                        //sendSipResponse(response);
                        
						//proxy.send(response);
                        
                        
					}
					else if (address.user.startsWith("4") && address.user.length <= 6)
					{
						var mmipService = 'sip:192.168.0.162:5070';
						var response = sip.makeResponse(request, 200, 'OK');
						response.headers.contact = [ { uri : mmipService } ];
						
					    request.uri = 'sip:'+ address.user + '@192.168.0.162:5070'; ////contact;
						request.headers.contact = [ { uri : my_contact_uri } ];
					    
				        ///proxy.send(request);
				        runAsync(function() {

				        	//request.uri = contact.uri;

				            proxy.send(processRequestBeforeSending(request), handleResponse);
				            
				        });

						
					}
					else if (address.user.startsWith("0") ||
							 address.user.startsWith("6")
							)
					{
						var mmipService = 'sip:'+ address.user + '@192.168.1.132:5060';
						console.log('User ' + address.user
								+ ' is routing to ' + mmipService);
						//var response = sip.makeResponse(request, 302, 'Moved Temporarily');
						//var response = sip.makeResponse(request, 180, 'Ringing');
						//response.headers.contact = [ { uri : mmipService } ];
						
                        //proxy.send(response);
                        //sendSipResponse(response);
                        
                        //proxy.send(response);
						
					    request.uri = mmipService;
					    
					    var move_count = 0;

					    
				        proxy.send(request, function onResponse(rs) {
				        	
				            if(rs.status === 302 && rs.headers.contact && rs.headers.contact.length && move_count++ < 4 ) {
				                // restarting request with new target
				                rq.uri = rs.headers.contact[0].uri;

				                // proxy.send pushes new via into requests, so we have to remove it
				                request.headers.via.shift();

				                proxy.send(request, onResponse);
				                
				              }
				              else {
				                // forwarding non-302 response
				               
				                // removing top via
				                rs.headers.via.shift();
				                //rs.headers.contact = [ { uri : my_contact_uri } ];

				                proxy.send(rs);
				                
				              }

				    			


				        	
				        	
				        });
				        
					    
				        



                        
					}
					else if (address.user==='*76')
					{
						

						var response = sip.makeResponse(request, 200, 'OK, Agent State is ACW');
						
						callee_to_tag = rstring();
						response.headers.to.params.tag = callee_to_tag;
						
						//proxy.send(sip.makeResponse(request, 404, 'Not Found'));
						//sendSipResponse(response);
						
						proxy.send(response);

						var call_id_1 = request.headers['call-id'];
						var caller_1 = request.headers.contact[0].uri;
						var callee_1 = request.headers.contact[0].uri;
						var contact_1 = request.headers.contact[0].uri;
						var pai_1 = request.headers.from.uri;
						
						// send sip message for Agent State....
					    processMESSAGE(
					    		'ACW',
					    		caller_1,
					    		callee_1,
					    		contact_1,
					    		pai_1
					    		);

					    /*
					    processNOTIFY(
					    		caller_1,
					    		callee_1,
					    		contact_1,
					    		pai_1
					    		);
						*/
					    
					    processBYE_1(
					    		call_id_1,
					    		caller_1,
					    		callee_1,
					    		contact_1,
					    		pai_1
					    		);
						
						
					}
					else if (address.user==='*77')
					{
						

						var response = sip.makeResponse(request, 200, 'OK, Agent State is AUX');
						
						callee_to_tag = rstring();
						response.headers.to.params.tag = callee_to_tag;
						
						//proxy.send(sip.makeResponse(request, 404, 'Not Found'));
						//sendSipResponse(response);
						
						proxy.send(response);

						var call_id_1 = request.headers['call-id'];
						var caller_1 = request.headers.contact[0].uri;
						var callee_1 = request.headers.contact[0].uri;
						var contact_1 = request.headers.contact[0].uri;
						var pai_1 = request.headers.from.uri;
						
						// send sip message for Agent State....
					    processMESSAGE(
					    		'AUX',
					    		caller_1,
					    		callee_1,
					    		contact_1,
					    		pai_1
					    		);

						/*
					    processNOTIFY(
					    		caller_1,
					    		callee_1,
					    		contact_1,
					    		pai_1
					    		);
					    		*/
					    

					    processBYE_1(
					    		call_id_1,
					    		caller_1,
					    		callee_1,
					    		contact_1,
					    		pai_1
					    		);

						
					}
					else if (address.user==='*78')
					{
						

						var response = sip.makeResponse(request, 200, 'OK, Agent State is AVA');
						
						callee_to_tag = rstring();
						response.headers.to.params.tag = callee_to_tag;
						
						//proxy.send(sip.makeResponse(request, 404, 'Not Found'));
						//sendSipResponse(response);
						
						proxy.send(response);

						var call_id_1 = request.headers['call-id'];
						var caller_1 = request.headers.contact[0].uri;
						var callee_1 = request.headers.contact[0].uri;
						var contact_1 = request.headers.contact[0].uri;
						var pai_1 = request.headers.from.uri;
						
						// send sip message for Agent State....
					    processMESSAGE(
					    		'AVA',
					    		caller_1,
					    		callee_1,
					    		contact_1,
					    		pai_1
					    		);

					    /*
					    processNOTIFY(
					    		caller_1,
					    		callee_1,
					    		contact_1,
					    		pai_1
					    		);
					    		*/
						
					    processBYE_1(
					    		call_id_1,
					    		caller_1,
					    		callee_1,
					    		contact_1,
					    		pai_1
					    		);

						
					}
					else if (address.user==='*79')
					{
						

						var response = sip.makeResponse(request, 200, 'OK, Agent State is LOGOUT');
						
						callee_to_tag = rstring();
						response.headers.to.params.tag = callee_to_tag;
						
						//proxy.send(sip.makeResponse(request, 404, 'Not Found'));
						//sendSipResponse(response);
						
						proxy.send(response);

						var call_id_1 = request.headers['call-id'];
						var caller_1 = request.headers.contact[0].uri;
						var callee_1 = request.headers.contact[0].uri;
						var contact_1 = request.headers.contact[0].uri;
						var pai_1 = request.headers.from.uri;
						
						// send sip message for Agent State....
					    processMESSAGE(
					    		'LOGOUT',
					    		caller_1,
					    		callee_1,
					    		contact_1,
					    		pai_1
					    		);

					    /*
					    processNOTIFY_CLS_MWI(
					    		caller_1,
					    		callee_1,
					    		contact_1,
					    		pai_1
					    		);
					    		*/

					    processBYE_1(
					    		call_id_1,
					    		caller_1,
					    		callee_1,
					    		contact_1,
					    		pai_1
					    		);

						
						
					}

					
					else
					{
						console.log('User ' + address.user + ' is not found');
						var response = sip.makeResponse(request, 404, 'Not Found');
						
						//proxy.send(sip.makeResponse(request, 404, 'Not Found'));
						//sendSipResponse(response);
						
						proxy.send(response);
						
						
					}
				}

				// Otherwise, send redirect with contact URI.
				else 
                {
                
					////var contacts = {};
                
					console.log('User ' + address.user	+ ' is found at ' + contact);
					
					///var response = sip.makeResponse(request, 302, 'Moved Temporarily');
					
					var response = sip.makeResponse(request, 200, 'OK');
					///var response = sip.makeResponse(request, 180, 'Ringing');
					//
                    response.headers.contact = [ { uri : contact } ];
					
					////proxy.send(response);
                    
					///sendSipResponse(response);
                    
					//proxy.send(response);
					
				    ///var user = sip.parseUri(rquest.uri).user;
				    
				    request.uri = contact;
					///try....
				    request.headers.contact = [ { uri : my_contact_uri } ];
				    
				    var move_count = 0;
				      
			        proxy.send(request, function onResponse(rs) {
			        	
			            if(rs.status === 302 && rs.headers.contact && rs.headers.contact.length && move_count++ < 4 ) {
			                // restarting request with new target
			                rq.uri = rs.headers.contact[0].uri;

			                // proxy.send pushes new via into requests, so we have to remove it
			                request.headers.via.shift();

			                proxy.send(request, onResponse);
			                
			              }
			              else {
			                // forwarding non-302 response
			               
			                // removing top via
			                rs.headers.via.shift();
			                //rs.headers.contact = [ { uri : my_contact_uri } ];

			                proxy.send(rs);
			                
			              }

			    			


			        	
			        	
			        });

				    //proxy.send(request);
				      
				    //var ctx = contexts[makeContextId(request)];

				    //if(!ctx) {
				    //  proxy.send.apply(sip, arguments);
				    //  return;
				    //}
				    
				    //forwardRequest(ctx, request, defaultCallback);
				   
				    //request.method ? forwardRequest(ctx, request, callback || defaultCallback) : forwardResponse(ctx, request);

					
					
					
				}
			});
		}
	    
	    
	    else {
			//proxy.send(sip.makeResponse(rq, 405, 'Method Not Allowed'));
	    	var rs = sip.makeResponse(rq, 200, 'OK');

	    	var sip_res = sip.stringify(rs);
			console.log("processCreateSipStack()....%s...Send Response:>>>\r\n%s\r\n<<<",rq.method,sip_res);

			tracelog("...Response>>>\r\n"+sip_res);
			
	    	///proxy.send(rs);
			rs.headers.contact = [ { uri : my_contact_uri } ];
	    	
	    	proxy.send(rs);
	    	
		}
	    
	    ///
		// Close the Redis client
		client.quit();

	});
	
	console.log('Create SIP Stack....Listening: %s:%d',HOST,sip_port);
	///tracelog('Create SIP Stack....');

/*
	proxy.start({
	  logger: {
	    recv: function(m) { util.debug('recv:' + util.inspect(m, null, null)); },
	    send: function(m) { util.debug('send:' + util.inspect(m, null, null)); },
	    error: function(e) { util.debug(e.stack); }
	  }
	});
*/
	
	/*
	 
	, function(rq) {
	  if(rq.method === 'REGISTER') {
	    var user = sip.parseUri(rq.headers.to.uri).user;

	    contacts[user] = rq.headers.contact;
	    var rs = sip.makeResponse(rq, 200, 'Ok');
	    rs.headers.to.tag = Math.floor(Math.random() * 1e6);
	    
	    // Notice  _proxy.send_ not proxy.send
	    proxy.send(rs);
	  }
	  else {
	    var user = sip.parseUri(rq.uri).user;

	    if(contacts[user] && Array.isArray(contacts[user]) && contacts[user].length > 0) {
	      rq.uri = contacts[user][0].uri;
	      
	      proxy.send(sip.makeResponse(rq, 100, 'Trying'));
	      
	      proxy.send(rq);
	    }
	    else {
	      proxy.send(sip.makeResponse(rq, 404, 'Not Found'));
	    }
	  }
	});
	*/
	
	
}

function process3PCC_2() {
	
	
}
////
function processOPTIONS_Polling(p_target)
{
	////myCseq += 1;
	var watcher_uri = contact1_uri; 
	//var watcher_uri = 'sip:7606@192.168.0.109';

	var my_callid=getNewCallId();
	var my_cseq = 101;
	var my_from_tag = 12348888;
	
	var mybranch = generateBranch()+';rport';


	var msg = {

			method : 'OPTIONS', 
			uri : p_target,
			headers : {
				to : {uri : p_target}, ////params : {tag : callee_to_tag}},
				from : {uri : watcher_uri, params : {tag : my_from_tag}},
				////'Alert-Info': 'ring-answer',
				'call-id' : my_callid,
				cseq : {method : 'OPTIONS',seq : my_cseq},
				//'content-type' : 'application/sdp',
				//'Content-Disposition' : 'signal;handling=required',
				//'Event': 'hold',
				/////via : [],
				via :
					[ 
					  {
					    version: '2.0',
					    protocol: 'UDP',
					    host: HOST,
					    port: sip_port,
					    params: { 
					    	branch: mybranch 
					    	}
					  }
				       
				    ],

				
				contact : [ {uri : watcher_uri} ]
			// if your call doesnt get in-dialog request, maybe os.hostname() isn't
			// resolving in your ip address
			},
			//content : 
			//	'<?xml version="1.0" encoding="UTF-8"?>\r\n'+
			//	'<RequestSystemStatus xmlns="http://www.ecma-international.org/standards/ecma-323/csta/ed3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"/>\r\n'
				

			content : '' ///user_app_info ///ivr_app_sdp ///'Data=12345678' //sdp1+ivr_app_sdp
				
				
	};

	var sip_req = sip.stringify(msg);
	console.log("processOPTIONS_Polling()....Request:>>>\r\n%s\r\n<<<",sip_req);

	//tracelog("processOPTIONS_Polling()...Request>>>\r\n"+sip_req);

		
	proxy.send(

		msg,

		function(rs) {

			var sip_res = sip.stringify(rs);
			console.log("processOPTIONS_Polling()....Response:>>>\r\n%s\r\n<<<",sip_res);

			tracelog("processOPTIONS_Polling()...Response>>>\r\n"+sip_res);

			if (rs.status >= 300) {
				console.log('processOPTIONS_Polling()....call failed with status: ' + rs.status);
			} else if (rs.status < 200) {
				console.log('processOPTIONS_Polling()....call progress status: ' + rs.status);
			} else {
				// yes we can get multiple 2xx response with different tags
				console.log('processOPTIONS_Polling()....call answered with tag: ' + rs.headers.to.params.tag);

				var sdp = rs.content;
				if (sdp != null)
				{
					console.log('processOPTIONS_Polling()....content:>>>\r\n%s\r\n<<<', sdp);
				}

				console.log('processOPTIONS_Polling()....call-id: ' + rs.headers['call-id']);
				///call_id1 = rs.headers['call-id'];

				var id = [ rs.headers['call-id'], rs.headers.from.params.tag,
						rs.headers.to.params.tag ].join(':');

				console.log('processOPTIONS_Polling()....id: ' + id);

				// registring our 'dialog' which is just function to process
				// in-dialog
				// requests
				if (!dialogs[id]) {
					dialogs[id] = function(rq) {
						if (rq.method === 'BYE') {
							console.log('processOPTIONS_Polling()....call received bye');

							delete dialogs[id];

							proxy.send(sip.makeResponse(rq, 200, 'Ok'));
						} else {
							proxy.send(sip.makeRespinse(rq, 405, 'Method not allowed'));
						}
					}
				}
			}

	});
	

}

///
function processSUBSCRIBE(p_target) {

////myCseq += 1;
var watcher_uri = contact1_uri; 
//var watcher_uri = 'sip:7606@192.168.0.109';
var mybranch = generateBranch()+';rport';


var msg = {

			method : 'SUBSCRIBE',
			uri : p_target,
			headers : {
				to : {uri : p_target}, ////params : {tag : to1_tag} },
				//from : {uri : contact1_uri,	params : {tag : from1_tag}},
				from : {uri : watcher_uri,	params : {tag : from1_tag}},
				'call-id' : rstring(),
				cseq : {method : 'SUBSCRIBE',seq : rstring() },
				'max-forwards' : '70',
				// //'Subscription-state': '',
				event : 'dialog',
				accept : 'application/dialog-info+xml',
				//event : 'presence',
				expires : 300,
				////via : [],
				via :
					[ 
					  {
					    version: '2.0',
					    protocol: 'UDP',
					    host: HOST,
					    port: sip_port,
					    params: { 
					    	branch: mybranch 
					    	}
					  }
				       
				    ],

				//contact : [ {uri : contact1_uri} ]
				contact : [ {uri : watcher_uri} ]
			// if your call doesnt get in-dialog request, maybe os.hostname() isn't
			// resolving in your ip address

			},
			content : ''
			
			
};

var sip_req = sip.stringify(msg);
console.log("processSUBSCRIBE()....request:>>>\r\n%s\r\n<<<",sip_req);

tracelog("...Request>>>\r\n"+sip_req);

	
proxy.send(

	msg,

	function(rs) {

		var sip_res = sip.stringify(rs);
		console.log("processSUBSCRIBE()....response:>>>\r\n%s\r\n<<<",sip_res);

		tracelog("...Response>>>\r\n"+sip_res);

		if (rs.status >= 300) {
			console.log('processSUBSCRIBE()....call failed with status: ' + rs.status);
		} else if (rs.status < 200) {
			console.log('processSUBSCRIBE()....call progress status: ' + rs.status);
		} else {
			// yes we can get multiple 2xx response with different tags
			console.log('processSUBSCRIBE()....call answered with tag: ' + rs.headers.to.params.tag);

			var sdp = rs.content;
			if (sdp != null)
			{
				console.log('processSUBSCRIBE()....content:>>>\r\n%s\r\n<<<', sdp);
			}

			console.log('processSUBSCRIBE()....call-id: ' + rs.headers['call-id']);
			///call_id1 = rs.headers['call-id'];

			var id = [ rs.headers['call-id'], rs.headers.from.params.tag,
					rs.headers.to.params.tag ].join(':');

			console.log('processSUBSCRIBE()....id: ' + id);

			// registring our 'dialog' which is just function to process
			// in-dialog
			// requests
			if (!dialogs[id]) {
				dialogs[id] = function(rq) {
					if (rq.method === 'BYE') {
						console.log('processSUBSCRIBE()....call received bye');

						delete dialogs[id];

						proxy.send(sip.makeResponse(rq, 200, 'Ok'));
					} else {
						proxy.send(sip.makeRespinse(rq, 405, 'Method not allowed'));
					}
				}
			}
		}

});


}

///
function processSUBSCRIBE_presence(p_target)
{
////myCseq += 1;
	var watcher_uri = contact1_uri; 
	//var watcher_uri = 'sip:7606@192.168.0.109';
	var mybranch = generateBranch()+';rport';

	var msg = {

				method : 'SUBSCRIBE',
				uri : p_target,
				headers : {
					to : {uri : p_target}, ////params : {tag : to1_tag} },
					//from : {uri : contact1_uri,	params : {tag : from1_tag}},
					from : {uri : watcher_uri,	params : {tag : from1_tag}},
					'call-id' : rstring(),
					cseq : {method : 'SUBSCRIBE',seq : rstring() },
					'max-forwards' : '70',
					// //'Subscription-state': '',
					//event : 'dialog',
					//accept : 'application/dialog-info+xml',
					event : 'presence',
					accept : 'application/pidf+xml',
					expires : 300,
					//via : [],
					via :
						[ 
						  {
						    version: '2.0',
						    protocol: 'UDP',
						    host: HOST,
						    port: sip_port,
						    params: { 
						    	branch: mybranch 
						    	}
						  }
					       
					    ],

					//contact : [ {uri : contact1_uri} ]
					contact : [ {uri : watcher_uri} ]
				// if your call doesnt get in-dialog request, maybe os.hostname() isn't
				// resolving in your ip address

				},
				content : ''
				
				
	};

	var sip_req = sip.stringify(msg);
	console.log("processSUBSCRIBE_presence()....request:>>>\r\n%s\r\n<<<",sip_req);

	tracelog("...Request>>>\r\n"+sip_req);

		
	proxy.send(

		msg,

		function(rs) {

			var sip_res = sip.stringify(rs);
			console.log("processSUBSCRIBE_presence()....response:>>>\r\n%s\r\n<<<",sip_res);

			tracelog("...Response>>>\r\n"+sip_res);

			if (rs.status >= 300) {
				console.log('processSUBSCRIBE_presence()....call failed with status: ' + rs.status);
			} else if (rs.status < 200) {
				console.log('processSUBSCRIBE_presence()....call progress status: ' + rs.status);
			} else {
				// yes we can get multiple 2xx response with different tags
				console.log('processSUBSCRIBE_presence()....call answered with tag: ' + rs.headers.to.params.tag);

				var sdp = rs.content;
				if (sdp != null)
				{
					console.log('processSUBSCRIBE_presence()....content:>>>\r\n%s\r\n<<<', sdp);
				}

				console.log('processSUBSCRIBE_presence()....call-id: ' + rs.headers['call-id']);
				///call_id1 = rs.headers['call-id'];

				var id = [ rs.headers['call-id'], rs.headers.from.params.tag,
						rs.headers.to.params.tag ].join(':');

				console.log('processSUBSCRIBE_presence()....id: ' + id);

				// registring our 'dialog' which is just function to process
				// in-dialog
				// requests
				if (!dialogs[id]) {
					dialogs[id] = function(rq) {
						if (rq.method === 'BYE') {
							console.log('processSUBSCRIBE_presence()....call received bye');

							delete dialogs[id];

							proxy.send(sip.makeResponse(rq, 200, 'Ok'));
						} else {
							proxy.send(sip.makeRespinse(rq, 405, 'Method not allowed'));
						}
					}
				}
			}

	});
	

}



////

function processNOTIFY_MWI(caller_uri,callee_uri,contact_uri,pai_uri) {

	console.log('Trying to use NOTIFY_MWI......');
	///tracelog('Trying to use NOTIFY_MWI........');

	//call_id1= getNewCallId(); ///rstring();
	//call_id2= call_id1;

	var msg = {
					

				method : 'NOTIFY',
				uri : callee_uri, ////request1_uri,
				headers : {
					to : {
						uri : callee_uri ///to1_uri
					},
					from : {
						uri : caller_uri,
						params : {
							tag : from1_tag
						}
					},
					'call-id' : rstring(),
					cseq : {
						method : 'NOTIFY',
						seq : rstring()
					},
				'content-type' : 'application/simple-message-summary',
		        'Event': 'message-summary',
		        //'subscription-state': '',
		        ///'Message-Waiting': 'yes',
				
				//via : [],
				via :
					[ 
					  {
					    version: '2.0',
					    protocol: 'UDP',
					    host: HOST,
					    port: sip_port,
					    params: { 
					    	branch: generateBranch()+';rport'
					    	}
					  }
				       
				    ],

				// contact : [ {
				// uri : contact1_uri
				// } ]
				// if your call doesnt get in-dialog request, maybe os.hostname() isn't
				// resolving in your ip address
				},
				content : 
					'Messages-Waiting: yes\r\n'+ 
					'Message-Account: sip:3pcc@127.0.0.1\r\n'+
					'Voice-Message: 1/10 (1/10)\r\n'
					
					
					
		};

		var s11 = sip.stringify(msg);
		console.log("processNOTIFY_MWI()...request:>>>\r\n"+s11);


	proxy.send(msg,
			
			function(rs) {

				var s1 = sip.stringify(rs);
				console.log("processNOTIFY_MWI()...received msg:>>>\r\n"+s1);
				
				if (rs.status >= 300) {
					console.log('processNOTIFY_MWI()...call failed with status ' + rs.status);
					initFlag();

				} else if (rs.status < 200) {
					console.log('processNOTIFY_MWI()...call progress status ' + rs.status);

					console.log('processNOTIFY_MWI()...1xx with to-tag ' + rs.headers.to.params.tag);
					to1_tag = rs.headers.to.params.tag;

				} else {
					// yes we can get multiple 2xx response with different tags
					console.log('processNOTIFY_MWI()...call answered with tag ' + rs.headers.to.params.tag);

					//sdp1 = rs.content;
					//console.log('processNOTIFY_MWI()...sdp1: \r\n' + sdp1);
					console.log('processNOTIFY_MWI()...call-id:' + rs.headers['call-id']);
					// call_id1 = rs.headers['call-id'];
					to1_tag = rs.headers.to.params.tag;
					

					// invite 2nd party....
					///InviteSecondParty(sdp1);

					var id = [ rs.headers['call-id'], rs.headers.from.params.tag,
							rs.headers.to.params.tag ].join(':');

					console.log('processNOTIFY_MWI()...id ' + id);
					
				    // sending ACK to First
					/*
				    proxy.send({
				      method: 'ACK',
				      uri: request1_uri,
				      headers: {
				        to: {uri: to1_uri, params: {tag: to1_tag}},
				        from: {uri: from1_uri, params: {tag: from1_tag} },
				        'call-id': call_id1,
				        cseq: {method: 'ACK', seq: 1 },
				        contact: [{uri: contact1_uri}],
					    'Content-Type': 'application/sdp',
					    'Max-Forwards': '70',
				        via: []
				      },
				      content: ''
				      
				    });*/


					// registring our 'dialog' which is just function to process
					// in-dialog
					// requests
					if (!dialogs[id]) {
						dialogs[id] = function(rq) {
							if (rq.method === 'BYE') {
								console.log('processNOTIFY_MWI()...call received bye');

								delete dialogs[id];

								proxy.send(sip.makeResponse(rq, 200, 'Ok'));
								/// 1st party notify to 2nd party....
								var msg = {

									method : 'BYE',
									uri : callee_uri,
									headers : {
										to: {uri: callee_uri, params: {tag: to2_tag}},
										from: {uri : caller_uri, params : {tag: from2_tag}},
										'call-id': call_id2,
										cseq: {method: 'BYE', seq : 4},
										//'content-type': 'application/sdp',
										//via: [],
										via :
											[ 
											  {
											    version: '2.0',
											    protocol: 'UDP',
											    host: HOST,
											    port: sip_port,
											    params: { 
											    	branch: generateBranch()+';rport'
											    	}
											  }
										       
										    ],

										'Max-Forwards': '70',
								  		//contact: [ {uri : p_contact} ]
										// if your call doesnt get in-dialog request, maybe os.hostname() isn't
										// resolving in your ip address
									},
									content : ''
										
										
								};
								var s = sip.stringify(msg);

								console.log("processNOTIFY_MWI()...send msg:>>>\r\n"+s);

								
								proxy.send(msg);
								
								initFlag();
										
								/*
								processSipRequest(
										'BYE',from1_uri,
										to1_uri,to1_tag,
										from1_uri,from1_tag,
										request1_uri,call_id1
										);

								*/
								
								
							} else {
								proxy.send(sip.makeRespinse(rq, 405, 'Method not allowed'));
							}
						}
					}
				}


				
			}
			 
			
			
	);
	
	
}

function processNOTIFY_CLS_MWI(caller_uri,callee_uri,contact_uri,pai_uri) {
	
	console.log('Trying to use NOTIFY_CLS_MWI......');
	///tracelog('Trying to use NOTIFY_CLS_MWI........');

	//call_id1= getNewCallId(); ///rstring();
	//call_id2= call_id1;

	var msg = {
					

				method : 'NOTIFY',
				uri : callee_uri, ////request1_uri,
				headers : {
					to : {
						uri : callee_uri ///to1_uri
					},
					from : {
						uri : caller_uri,
						params : {
							tag : from1_tag
						}
					},
					'call-id' : rstring(),
					cseq : {
						method : 'NOTIFY',
						seq : rstring()
					},
				'content-type' : 'application/simple-message-summary',
		        'Event': 'message-summary',
		        //'subscription-state': '',
		        ///'Message-Waiting': 'yes',
				
				//via : [],
				via :
					[ 
					  {
					    version: '2.0',
					    protocol: 'UDP',
					    host: HOST,
					    port: sip_port,
					    params: { 
					    	branch: generateBranch()+';rport'
					    	}
					  }
				       
				    ],


				// contact : [ {
				// uri : contact1_uri
				// } ]
				// if your call doesnt get in-dialog request, maybe os.hostname() isn't
				// resolving in your ip address
				},
				content : 
					'Messages-Waiting: no\r\n'+ 
					'Message-Account: sip:3pcc@127.0.0.1\r\n'+
					'Voice-Message: 0/0 (0/0)\r\n'
					
					
					
		};

		var s11 = sip.stringify(msg);
		console.log("processNOTIFY_CLS_MWI()...request:>>>\r\n"+s11);


	proxy.send(msg,
			
			function(rs) {

				var s1 = sip.stringify(rs);
				console.log("processNOTIFY_CLS_MWI()...received msg:>>>\r\n"+s1);
				
				if (rs.status >= 300) {
					console.log('processNOTIFY_CLS_MWI()...call failed with status ' + rs.status);
					initFlag();

				} else if (rs.status < 200) {
					console.log('processNOTIFY_CLS_MWI()...call progress status ' + rs.status);

					console.log('processNOTIFY_CLS_MWI()...1xx with to-tag ' + rs.headers.to.params.tag);
					to1_tag = rs.headers.to.params.tag;

				} else {
					// yes we can get multiple 2xx response with different tags
					console.log('processNOTIFY_CLS_MWI()...call answered with tag ' + rs.headers.to.params.tag);

					//sdp1 = rs.content;
					//console.log('processNOTIFY_CLS_MWI()...sdp1: \r\n' + sdp1);
					console.log('processNOTIFY_CLS_MWI()...call-id:' + rs.headers['call-id']);
					// call_id1 = rs.headers['call-id'];
					to1_tag = rs.headers.to.params.tag;
					

					// invite 2nd party....
					///InviteSecondParty(sdp1);

					var id = [ rs.headers['call-id'], rs.headers.from.params.tag,
							rs.headers.to.params.tag ].join(':');

					console.log('processNOTIFY_CLS_MWI()...id ' + id);
					
				    // sending ACK to First
					/*
				    proxy.send({
				      method: 'ACK',
				      uri: request1_uri,
				      headers: {
				        to: {uri: to1_uri, params: {tag: to1_tag}},
				        from: {uri: from1_uri, params: {tag: from1_tag} },
				        'call-id': call_id1,
				        cseq: {method: 'ACK', seq: 1 },
				        contact: [{uri: contact1_uri}],
					    'Content-Type': 'application/sdp',
					    'Max-Forwards': '70',
				        via: []
				      },
				      content: ''
				      
				    });*/


					// registring our 'dialog' which is just function to process
					// in-dialog
					// requests
					if (!dialogs[id]) {
						dialogs[id] = function(rq) {
							if (rq.method === 'BYE') {
								console.log('processNOTIFY_CLS_MWI()...call received bye');

								delete dialogs[id];

								proxy.send(sip.makeResponse(rq, 200, 'Ok'));
								/// 1st party notify to 2nd party....
								var msg = {

									method : 'BYE',
									uri : callee_uri,
									headers : {
										to: {uri: callee_uri, params: {tag: to2_tag}},
										from: {uri : caller_uri, params : {tag: from2_tag}},
										'call-id': call_id2,
										cseq: {method: 'BYE', seq : 4},
										//'content-type': 'application/sdp',
										//via: [],
										via :
											[ 
											  {
											    version: '2.0',
											    protocol: 'UDP',
											    host: HOST,
											    port: sip_port,
											    params: { 
											    	branch: generateBranch()+';rport'
											    	}
											  }
										       
										    ],

										'Max-Forwards': '70',
								  		//contact: [ {uri : p_contact} ]
										// if your call doesnt get in-dialog request, maybe os.hostname() isn't
										// resolving in your ip address
									},
									content : ''
										
										
								};
								var s = sip.stringify(msg);

								console.log("processNOTIFY_CLS_MWI()...send msg:>>>\r\n"+s);

								
								proxy.send(msg);
								
								initFlag();
										
								/*
								processSipRequest(
										'BYE',from1_uri,
										to1_uri,to1_tag,
										from1_uri,from1_tag,
										request1_uri,call_id1
										);

								*/
								
								
							} else {
								proxy.send(sip.makeRespinse(rq, 405, 'Method not allowed'));
							}
						}
					}
				}


				
			}
			 
			
			
	);
	
	
}

function processNOTIFY(caller_uri,callee_uri,contact_uri,pai_uri) {

console.log('Trying to use NOTIFY......');
///tracelog('Trying to use NOTIFY........');

//call_id1= getNewCallId(); ///rstring();
//call_id2= call_id1;

// acd status -> open, closed

var pidfxml = 
'<?xml version="1.0" encoding="UTF-8"?>\r\n' +
'<presence xmlns="urn:ietf:params:xml:ns:pidf" entity="sip:12345@192.168.0.202">\r\n' +
'<tuple id="1001">\r\n' +
'<status><basic>open</basic></status>\r\n'+
'</tuple>\r\n'+
'</presence>\r\n'
;

var xpidf = 
'<?xml version="1.0"?>\r\n'+
'<!DOCTYPE presence\r\n'+
'PUBLIC "-//IETF//DTD RFCxxxx XPIDF 1.0//EN" "xpidf.dtd">\r\n'+
'<presence>\r\n'+
'<presentity uri="sip:3pcc@192.168.0.202:5060;method=SUBSCRIBE" />\r\n'+
'<atom id="1000">\r\n'+
'<address uri="sip:192.168.0.187:5060;user=ip" priority="0.800000">\r\n'+
'<status status="inuse" />\r\n'+
'<msnsubstatus substatus="onthephone" />\r\n'+
'</address>\r\n'+
'</atom>\r\n'+
'</presence>\r\n'
;


var msg = {
				

			method : 'NOTIFY',
			uri : callee_uri, ////request1_uri,
			headers : {
				to : {
					uri : callee_uri ///to1_uri
				},
				from : {
					uri : caller_uri,
					params : {
						tag : from1_tag
					}
				},
				'call-id' : rstring(),
				cseq : {
					method : 'NOTIFY',
					seq : rstring()
				},
			'content-type' : 'application/simple-message-summary',
		    //'content-type' : 'application/pdif+xml',
	        ///'event': 'presence',
	        'event': 'message-summary',
	        ///'event': 'hold',
	        
	        ///'subscription-state': 'active',
			
			//via : [],
			via :
				[ 
				  {
				    version: '2.0',
				    protocol: 'UDP',
				    host: HOST,
				    port: sip_port,
				    params: { 
				    	branch: generateBranch()+';rport'
				    	}
				  }
			       
			    ],


			// contact : [ {
			// uri : contact1_uri
			// } ]
			// if your call doesnt get in-dialog request, maybe os.hostname() isn't
			// resolving in your ip address
			},
			content : ///xpidf ////pidfxml ////''
				'Messages-Waiting: yes\r\n'+ 
				'Message-Account: sip:3pcc@127.0.0.1\r\n'+
				'Voice-Message: 0/0 (0/0)\r\n'

				
	};


	var s11 = sip.stringify(msg);
	console.log("processNOTIFY()...request:>>>\r\n"+s11);


proxy.send(msg,
		
		function(rs) {

			var s1 = sip.stringify(rs);
			console.log("processNOTIFY()...received msg:>>>\r\n"+s1);
			
			if (rs.status >= 300) {
				console.log('processNOTIFY()...call failed with status ' + rs.status);
				initFlag();

			} else if (rs.status < 200) {
				console.log('processNOTIFY()...call progress status ' + rs.status);

				console.log('processNOTIFY()...1xx with to-tag ' + rs.headers.to.params.tag);
				//to1_tag = rs.headers.to.params.tag;

			} else {
				// yes we can get multiple 2xx response with different tags
				console.log('processNOTIFY()...call answered with tag ' + rs.headers.to.params.tag);

				//sdp1 = rs.content;
				//console.log('processMESSAGE()...sdp1: \r\n' + sdp1);
				console.log('processNOTIFY()...call-id:' + rs.headers['call-id']);
				// call_id1 = rs.headers['call-id'];
				//to1_tag = rs.headers.to.params.tag;
				

				// invite 2nd party....
				///InviteSecondParty(sdp1);

				var id = [ rs.headers['call-id'], rs.headers.from.params.tag,
						rs.headers.to.params.tag ].join(':');

				console.log('processNOTIFY()...id ' + id);
				
			    // sending ACK to First
				/*
			    proxy.send({
			      method: 'ACK',
			      uri: request1_uri,
			      headers: {
			        to: {uri: to1_uri, params: {tag: to1_tag}},
			        from: {uri: from1_uri, params: {tag: from1_tag} },
			        'call-id': call_id1,
			        cseq: {method: 'ACK', seq: 1 },
			        contact: [{uri: contact1_uri}],
				    'Content-Type': 'application/sdp',
				    'Max-Forwards': '70',
			        via: []
			      },
			      content: ''
			      
			    });*/


				// registring our 'dialog' which is just function to process
				// in-dialog
				// requests
				if (!dialogs[id]) {
					dialogs[id] = function(rq) {
						if (rq.method === 'BYE') {
							console.log('processNOTIFY()...call received bye');

							delete dialogs[id];

							proxy.send(sip.makeResponse(rq, 200, 'Ok'));
							/// 1st party notify to 2nd party....
							var msg = {

								method : 'BYE',
								uri : callee_uri,
								headers : {
									to: {uri: callee_uri, params: {tag: to2_tag}},
									from: {uri : caller_uri, params : {tag: from2_tag}},
									'call-id': call_id2,
									cseq: {method: 'BYE', seq : 4},
									//'content-type': 'application/sdp',
									//via: [],
									via :
										[ 
										  {
										    version: '2.0',
										    protocol: 'UDP',
										    host: HOST,
										    port: sip_port,
										    params: { 
										    	branch: generateBranch()+';rport'
										    	}
										  }
									       
									    ],

									'Max-Forwards': '70',
							  		//contact: [ {uri : p_contact} ]
									// if your call doesnt get in-dialog request, maybe os.hostname() isn't
									// resolving in your ip address
								},
								content : ''
									
									
							};
							var s = sip.stringify(msg);

							console.log("processNOTIFY()...send msg:>>>\r\n"+s);

							
							proxy.send(msg);
							
							initFlag();
									
							/*
							processSipRequest(
									'BYE',from1_uri,
									to1_uri,to1_tag,
									from1_uri,from1_tag,
									request1_uri,call_id1
									);

							*/
							
							
						} else {
							proxy.send(sip.makeRespinse(rq, 405, 'Method not allowed'));
						}
					}
				}
			}


			
		}
		 
		
		
);
	
	
}

function processMESSAGE(
		textmsg,
		caller_uri,
		callee_uri,
		contact_uri,
		pai_uri
		) 
{
	
console.log('Trying to use MESSAGE......');
tracelog('Trying to use MESSAGE........');

//call_id1= getNewCallId(); ///rstring();
//call_id2= call_id1;

var msg = {
			

		method : 'MESSAGE',
		uri : callee_uri, ////request1_uri,
		headers : {
			to : {
				uri : callee_uri ///to1_uri
			},
			from : {
				uri : caller_uri,
				params : {
					tag : from1_tag
				}
			},
			'call-id' : rstring(),
			cseq : {
				method : 'MESSAGE',
				seq : rstring()
			},
		'content-type' : 'text/plain',
		// via : []
		via :
			[ 
			  {
			    version: '2.0',
			    protocol: 'UDP',
			    host: HOST,
			    port: sip_port,
			    params: { 
			    	branch: generateBranch()+';rport'
			    	}
			  }
		       
		    ]

		// contact : [ {
		// uri : contact1_uri
		// } ]
		// if your call doesnt get in-dialog request, maybe os.hostname() isn't
		// resolving in your ip address
		},
		content : textmsg
			
			
};

var s11 = sip.stringify(msg);
console.log("processMESSAGE()...request:>>>\r\n"+s11);


proxy.send(msg,
	
	function(rs) {

		var s1 = sip.stringify(rs);
		console.log("processMESSAGE()...received msg:>>>\r\n"+s1);
		
		if (rs.status >= 300) {
			console.log('processMESSAGE()...call failed with status ' + rs.status);
			initFlag();

		} else if (rs.status < 200) {
			console.log('processMESSAGE()...call progress status ' + rs.status);

			console.log('processMESSAGE()...1xx with to-tag ' + rs.headers.to.params.tag);
			//to1_tag = rs.headers.to.params.tag;

		} else {
			// yes we can get multiple 2xx response with different tags
			console.log('processMESSAGE()...call answered with tag ' + rs.headers.to.params.tag);

			//sdp1 = rs.content;
			//console.log('processMESSAGE()...sdp1: \r\n' + sdp1);
			console.log('processMESSAGE()...call-id:' + rs.headers['call-id']);
			// call_id1 = rs.headers['call-id'];
			//to1_tag = rs.headers.to.params.tag;
			

			// invite 2nd party....
			///InviteSecondParty(sdp1);

			var id = [ rs.headers['call-id'], rs.headers.from.params.tag,
					rs.headers.to.params.tag ].join(':');

			console.log('processMESSAGE()...id ' + id);
			
		    // sending ACK to First
			/*
		    proxy.send({
		      method: 'ACK',
		      uri: request1_uri,
		      headers: {
		        to: {uri: to1_uri, params: {tag: to1_tag}},
		        from: {uri: from1_uri, params: {tag: from1_tag} },
		        'call-id': call_id1,
		        cseq: {method: 'ACK', seq: 1 },
		        contact: [{uri: contact1_uri}],
			    'Content-Type': 'application/sdp',
			    'Max-Forwards': '70',
		        via: []
		      },
		      content: ''
		      
		    });*/


			// registring our 'dialog' which is just function to process
			// in-dialog
			// requests
			if (!dialogs[id]) {
				dialogs[id] = function(rq) {
					if (rq.method === 'BYE') {
						console.log('processMESSAGE()...call received bye');

						delete dialogs[id];

						proxy.send(sip.makeResponse(rq, 200, 'Ok'));
						/// 1st party notify to 2nd party....
						var msg = {

							method : 'BYE',
							uri : callee_uri,
							headers : {
								to: {uri: callee_uri, params: {tag: to2_tag}},
								from: {uri : caller_uri, params : {tag: from2_tag}},
								'call-id': call_id2,
								cseq: {method: 'BYE', seq : 4},
								//'content-type': 'application/sdp',
								//via: [],
								via :
									[ 
									  {
									    version: '2.0',
									    protocol: 'UDP',
									    host: HOST,
									    port: sip_port,
									    params: { 
									    	branch: generateBranch()+';rport'
									    	}
									  }
								       
								    ],

								'Max-Forwards': '70',
						  		//contact: [ {uri : p_contact} ]
								// if your call doesnt get in-dialog request, maybe os.hostname() isn't
								// resolving in your ip address
							},
							content : ''
								
								
						};
						var s = sip.stringify(msg);

						console.log("processMESSAGE()...send msg:>>>\r\n"+s);

						
						proxy.send(msg);
						
						initFlag();
								
						/*
						processSipRequest(
								'BYE',from1_uri,
								to1_uri,to1_tag,
								from1_uri,from1_tag,
								request1_uri,call_id1
								);

						*/
						
						
					} else {
						proxy.send(sip.makeRespinse(rq, 405, 'Method not allowed'));
					}
				}
			}
		}


		
	}
	 
	
	
	);
	
}

/// first party
function InviteFirstParty(
		caller_uri,
		callee_uri,
		contact_uri,
		pai_uri
		) 
{

	if (my_call_id === '') {
		call_id1 = getNewCallId(); // /rstring();
		call_id2 = call_id1;

	} else {
		call_id1 = my_call_id;
		call_id2 = call_id1;

	}
	
//call_id1= getNewCallId(); ///rstring();
//call_id2= call_id1;

initFlag();

myCseq = 1;

var mybranch = generateBranch()+';rport';

console.log('InviteFirstParty().....branch='+mybranch);

var msg = {
		
		method : 'INVITE',
		uri : caller_uri,
		headers : {
			to : {
				uri : caller_uri
			},
			from : {
				uri : callee_uri,
				params : {
					tag : from1_tag
				}
			},
			'call-id' : call_id1,
			cseq : {
				method : 'INVITE',
				seq : myCseq
			},
			//'Alert-Info': 'ring-answer',
			'content-type' : 'application/sdp',
			'P-Asserted-Identity' : pai_uri,
			'Allow' : 'INVITE, ACK, CANCEL, OPTIONS, BYE, REFER, SUBSCRIBE, NOTIFY, INFO, PUBLISH',
			
			////via : []

			via :
				[ 
				  {
				    version: '2.0',
				    protocol: 'UDP',
				    host: HOST,
				    port: sip_port,
				    params: { 
				    	branch: mybranch 
				    	}
				  }
			       
			    ]
			
			,
			contact : [ {
				uri : contact_uri
			} ]
		// if your call doesnt get in-dialog request, maybe os.hostname() isn't
		// resolving in your ip address
		},
		content : ''

	 
		
};

var s11 = sip.stringify(msg);
console.log("InviteFirstParty()...request:>>>\r\n"+s11);


proxy.send(
	
	msg, 
	
	function(rs) {

		var s1 = sip.stringify(rs);
		console.log("1...sipResp1 msg:>>>\r\n"+s1);
		
		if (rs.status >= 300) {
			console.log('1...call failed with status ' + rs.status);
			initFlag();

			if (rs.status >= 480) {
				
				processHANGUP(
					caller_uri,
					callee_uri,
					contact_uri,
					pai_uri
				);
				
			}
			

		} else if (rs.status < 200) {
			console.log('1...call progress status ' + rs.status);

			console.log('1...1xx with to-tag ' + rs.headers.to.params.tag);
			to1_tag = rs.headers.to.params.tag;
			caller_to_tag = to1_tag;

			if(rs.status === 180) {
				caller_branch_tag = rs.headers.via[0].params.branch;
				console.log('1...180 Ringing...via_branch: '+caller_branch_tag);
			}

			
			if(rs.status === 1800) 
			{
				processANSWER_Caller(
					caller_uri,
					callee_uri,
					contact_uri,
					pai_uri
					);
			}
			

		} else {
			// yes we can get multiple 2xx response with different tags
			console.log('1...call answered with tag ' + rs.headers.to.params.tag);

			sdp1 = rs.content;
			console.log('1...sdp1: \r\n' + sdp1);
			console.log('1...call-id:' + rs.headers['call-id']);
			// call_id1 = rs.headers['call-id'];
			to1_tag = rs.headers.to.params.tag;
			caller_to_tag = to1_tag;
			

			// invite 2nd party....
			InviteSecondParty(
					sdp1,
					caller_uri,
					callee_uri,
					contact_uri,
					pai_uri
					);

			
			var id = [ rs.headers['call-id'], rs.headers.from.params.tag,
					rs.headers.to.params.tag ].join(':');

			console.log('1...id ' + id);

			// registring our 'dialog' which is just function to process
			// in-dialog
			// requests
			if (!dialogs[id]) {
				dialogs[id] = function(rq) {
					if (rq.method === 'BYE') {
						console.log('1...call received bye');

						delete dialogs[id];

						proxy.send(sip.makeResponse(rq, 200, 'Ok'));
						/// 1st party notify to 2nd party....
						myCseq += 1;
						var msg = {

							method : 'BYE',
							uri : callee_uri,
							headers : {
								to: {uri: callee_uri, params: {tag: to2_tag}},
								from: {uri : caller_uri, params : {tag: from1_tag}},
								'call-id': call_id2,
								cseq: {method: 'BYE', seq : myCseq },
								//'content-type': 'application/sdp',
								//via: [],
								via :
									[ 
									  {
									    version: '2.0',
									    protocol: 'UDP',
									    host: HOST,
									    port: sip_port,
									    params: { 
									    	branch: generateBranch()+';rport'
									    	}
									  }
								       
								    ],

								'Max-Forwards': '70',
						  		//contact: [ {uri : p_contact} ]
								// if your call doesnt get in-dialog request, maybe os.hostname() isn't
								// resolving in your ip address
							},
							content : ''
								
								
						};
						var s = sip.stringify(msg);

						console.log("1...send msg:>>>\r\n"+s);

						
						proxy.send(msg);
						
						initFlag();
								
						
						
					} else {
						proxy.send(sip.makeRespinse(rq, 405, 'Method not allowed'));
					}
				}
			}
		}


		
	}
	 
	
	
	);
	
	
}

var processFirstPartyAnswer = function() {

	console.log('Using uaCSTA to Process Answer Call...');
	tracelog('Using uaCSTA to Process Answer Call....');
	
	///

	/// cancel it first
	
	proxy.send({

		method : 'CANCEL',
		uri : request1_uri,
		headers : {
			to : {
				uri : to1_uri,
				params : {
					tag : to1_tag
				}

			},
			from : {
				uri : from1_uri,
				params : {
					tag : from1_tag
				}
			},
			'max-forwards': 70,
			'call-id' : call_id1,
			cseq : {
				method : 'CANCEL',
				seq : 1
			},
			//'content-type' : 'application/sdp',
			//via : [],
			via :
				[ 
				  {
				    version: '2.0',
				    protocol: 'UDP',
				    host: HOST,
				    port: sip_port,
				    params: { 
				    	branch: generateBranch()+';rport'
				    	}
				  }
			       
			    ],

			
			//contact : [ {
			//	uri : contact1_uri
			//} ]
		// if your call doesnt get in-dialog request, maybe os.hostname() isn't
		// resolving in your ip address
		},
		content : ''

	},
	
	function(rs) {

		var s1 = sip.stringify(rs);
		console.log("1...sipResp1 msg:>>>\r\n"+s1);
		
		if (rs.status >= 300) {
			console.log('1...call failed with status ' + rs.status);
			initFlag();

		} else if (rs.status < 200) {
			console.log('1...call progress status ' + rs.status);

			console.log('1...1xx with to-tag ' + rs.headers.to.params.tag);
			to1_tag = rs.headers.to.params.tag;

		} else {
			// yes we can get multiple 2xx response with different tags
			console.log('1...call answered with tag ' + rs.headers.to.params.tag);

			sdp1 = rs.content;
			console.log('1...sdp1: \r\n' + sdp1);
			console.log('1...call-id:' + rs.headers['call-id']);
			// call_id1 = rs.headers['call-id'];
			to1_tag = rs.headers.to.params.tag;
			

			// invite 2nd party....
			///InviteSecondParty(sdp1);

			var id = [ rs.headers['call-id'], rs.headers.from.params.tag,
					rs.headers.to.params.tag ].join(':');

			console.log('1...id ' + id);

			// registring our 'dialog' which is just function to process
			// in-dialog
			// requests
			if (!dialogs[id]) {
				dialogs[id] = function(rq) {
					if (rq.method === 'BYE') {
						console.log('1...call received bye');

						delete dialogs[id];

						proxy.send(sip.makeResponse(rq, 200, 'Ok'));
						/// 1st party notify to 2nd party....
						var msg = {

							method : 'BYE',
							uri : request2_uri,
							headers : {
								to: {uri: to2_uri, params: {tag: to2_tag}},
								from: {uri : from2_uri, params : {tag: from2_tag}},
								'call-id': call_id2,
								cseq: {method: 'BYE', seq : 4},
								//'content-type': 'application/sdp',
								//via: [],
								via :
									[ 
									  {
									    version: '2.0',
									    protocol: 'UDP',
									    host: HOST,
									    port: sip_port,
									    params: { 
									    	branch: generateBranch()+';rport'
									    	}
									  }
								       
								    ],

								'Max-Forwards': '70',
						  		//contact: [ {uri : p_contact} ]
								// if your call doesnt get in-dialog request, maybe os.hostname() isn't
								// resolving in your ip address
							},
							content : ''
								
								
						};
						var s = sip.stringify(msg);

						console.log("1...send msg:>>>\r\n"+s);

						
						proxy.send(msg);
						
						initFlag();
								
						/*
						processSipRequest(
								'BYE',from1_uri,
								to1_uri,to1_tag,
								from1_uri,from1_tag,
								request1_uri,call_id1
								);

						*/
						
						
					} else {
						proxy.send(sip.makeRespinse(rq, 405, 'Method not allowed'));
					}
				}
			}
		}


		
	}
	
	
	);
	

	
	
	//proxy.send(sip.makeRespinse(rq, 487, 'Request Terminated'));
	
	///

	proxy.send({

		method : 'INVITE',
		uri : request1_uri,
		headers : {
			to : {
				uri : to1_uri,
				params : {
					tag : to1_tag
				}
			},
			from : {
				uri : from1_uri,
				params : {
					tag : from1_tag
				}
			},
			'Alert-Info': 'ring-answer',
			'call-id' : call_id1,
			cseq : {
				method : 'INVITE',
				seq : 1
			},
			'content-type' : 'application/csta+xml',
			'content-disposition' : 'signal; handling=required',
			//via : [],
			via :
				[ 
				  {
				    version: '2.0',
				    protocol: 'UDP',
				    host: HOST,
				    port: sip_port,
				    params: { 
				    	branch: generateBranch()+';rport'
				    	}
				  }
			       
			    ],

			
			contact : [ {
				uri : contact1_uri
			} ]
		// if your call doesnt get in-dialog request, maybe os.hostname() isn't
		// resolving in your ip address
		},
		content : ''

	},
	
	function(rs) {
		
		var s2 = sip.stringify(rs);
		console.log("2...sipResp2 msg:>>>\r\n"+s2);
			
			if (rs.status >= 300) {
				console.log('2...call failed with status ' + rs.status);
				initFlag();
				
			} else if (rs.status < 200) {
				console.log('2...call progress status ' + rs.status);
				
				console.log('2...1xx with to-tag ' + rs.headers.to.params.tag);
				to2_tag = rs.headers.to.params.tag;
				
			} else {
				// yes we can get multiple 2xx response with different tags
				console.log('2...call answered with tag ' + rs.headers.to.params.tag);
				
				console.log('2...call-id:'+rs.headers['call-id']);
				///call_id2 = rs.headers['call-id'];
				to2_tag = rs.headers.to.params.tag;

				sdp2 = rs.content;
				console.log('2...sdp2: \r\n'+ sdp2);
				
				
				var id = [ rs.headers['call-id'], 
				           rs.headers.from.params.tag,
						   rs.headers.to.params.tag ].join(':');
				
				console.log('2...id '+id);
				

			    
				// registring our 'dialog' which is just function to process in-dialog
				// requests
				if (!dialogs[id]) {
					dialogs[id] = function(rq) {
						if (rq.method === 'BYE') {
							console.log('2...call received bye');
							
							delete dialogs[id];
							
							proxy.send(sip.makeResponse(rq, 200, 'Ok'));
							
							// 2nd party notify to 1st party.... 
							
							var msg = {

								method : 'BYE',
								uri : request1_uri,
								headers : {
									to: {uri: to1_uri, params: {tag: to1_tag}},
									from: {uri : from1_uri, params : {tag: from1_tag}},
									'call-id': call_id1,
									cseq: {method: 'BYE', seq : 4},
									//'content-type': 'application/sdp',
									//via: [],
									via :
										[ 
										  {
										    version: '2.0',
										    protocol: 'UDP',
										    host: HOST,
										    port: sip_port,
										    params: { 
										    	branch: generateBranch()+';rport'
										    	}
										  }
									       
									    ],

									'Max-Forwards': '70',
							  		//contact: [ {uri : p_contact} ]
									// if your call doesnt get in-dialog request, maybe os.hostname() isn't
									// resolving in your ip address
								},
								content : ''
										
										
							};
							var s = sip.stringify(msg);

							console.log("2...send msg:>>>\r\n"+s);

								
							proxy.send(msg);
							
							initFlag();
							
							//processSipRequest(
							//		'BYE',to2_uri,
							//		to2_uri,to2_tag,
							//		from2_uri,from2_tag,
							//		request2_uri,call_id2
							//		);

							
							
							
							
						} else {
							proxy.send(sip.makeRespinse(rq, 405, 'Method not allowed'));
						}
					}
				}
				
				
			}
		
		
		
		
	}
	
	
	
	);

	
	
	
}

////
function InviteMOH_URI(
		sdp,
		caller_uri,
		callee_uri,
		contact_uri,
		pai_uri
		) 
{
	
	myCseq += 1;
	cseq_tag = myCseq;
	
	var msg = {
			
			  method: 'INVITE',
			  uri: callee_uri,
			  headers: {
			    to: {uri: callee_uri,params: {tag: callee_to_tag}},
			    from: {uri: caller_uri, params: {tag: from2_tag}},
			    'call-id': call_id2,
			    cseq: {method: 'INVITE', seq: myCseq },
			    'content-type': 'application/sdp',
				//'Alert-Info': 'ring-answer',
			    'P-Asserted-Identity' : pai_uri,
			    'Allow' : 'INVITE, ACK, CANCEL, OPTIONS, BYE, REFER, SUBSCRIBE, NOTIFY, INFO, PUBLISH',
			    
			    //via : [],
				via :
					[ 
					  {
					    version: '2.0',
					    protocol: 'UDP',
					    host: HOST,
					    port: sip_port,
					    params: { 
					    	branch: generateBranch()+';rport'
					    	}
					  }
				       
				    ],

			    contact: [{uri: contact_uri}]  // if your call doesnt get in-dialog request, maybe os.hostname() isn't resolving in your ip address
			  },
			  content: sdp
				
				
	};

	var s11 = sip.stringify(msg);
	console.log("InviteMOH_URI()...request:>>>\r\n"+s11);

		
	proxy.send(

		msg, 
		
		function(rs) {
			
			var s2 = sip.stringify(rs);
			console.log("InviteMOH_URI....msg:>>>\r\n"+s2);
				
				if (rs.status >= 300) {
					console.log('InviteMOH_URI...call failed with status ' + rs.status);
					initFlag();
					
					if (rs.status >= 480) {

						processHANGUP(
							caller_uri,
							callee_uri,
							contact_uri,
							pai_uri
						);
						
					}
					
					
				} else if (rs.status < 200) {
					console.log('InviteMOH_URI...call progress status ' + rs.status);
					
					console.log('InviteMOH_URI...1xx with to-tag ' + rs.headers.to.params.tag);
					to1_tag = rs.headers.to.params.tag;
					
				} else {
					// yes we can get multiple 2xx response with different tags
					console.log('InviteMOH_URI...call answered with tag ' + rs.headers.to.params.tag);
					
					console.log('InviteMOH_URI...call-id:'+rs.headers['call-id']);
					///call_id2 = rs.headers['call-id'];
					to1_tag = rs.headers.to.params.tag;
					
					if(to1_tag != '')
					{
						callee_to_tag = to1_tag;
						console.log('...callee_to_tag=%s',callee_to_tag);
					}


					sdp2 = rs.content;
					console.log('InviteMOH_URI...sdp2: \r\n'+ sdp2);
					
					
					var id = [ rs.headers['call-id'], 
					           rs.headers.from.params.tag,
							   rs.headers.to.params.tag ].join(':');
					
					console.log('InviteMOH_URI...id '+id);
					
				    // sending ACK to First
				    proxy.send({
				      method: 'ACK',
				      uri: callee_uri,
				      headers: {
				        to: {uri: callee_uri, params: {tag: to1_tag}},
				        from: {uri: caller_uri, params: {tag: from1_tag} },
				        'call-id': call_id1,
				        cseq: {method: 'ACK', seq: myCseq },
				        contact: [{uri: contact_uri}],
					    //'Content-Type': 'application/sdp',
					    'Max-Forwards': '70',
				        //via: []
						via :
							[ 
							  {
							    version: '2.0',
							    protocol: 'UDP',
							    host: HOST,
							    port: sip_port,
							    params: { 
							    	branch: generateBranch()+';rport'
							    	}
							  }
						       
						    ]

				      },
				      content: '' /////sdp2
				      
				    });


				    
					// registring our 'dialog' which is just function to process in-dialog
					// requests
					if (!dialogs[id]) {
						dialogs[id] = function(rq) {
							if (rq.method === 'BYE') {
								console.log('InviteMOH_URI...call received bye');
								
								delete dialogs[id];
								
								proxy.send(sip.makeResponse(rq, 200, 'Ok'));
								
								// 2nd party notify to 1st party.... 
								myCseq += 1;
								
								var msg = {

									method : 'BYE',
									uri : caller_uri,
									headers : {
										to: {uri: caller_uri, params: {tag: to1_tag}},
										from: {uri : callee_uri, params : {tag: from1_tag}},
										'call-id': call_id1,
										cseq: {method: 'BYE', seq : myCseq },
										//'content-type': 'application/sdp',
										//via: [],
										via :
											[ 
											  {
											    version: '2.0',
											    protocol: 'UDP',
											    host: HOST,
											    port: sip_port,
											    params: { 
											    	branch: generateBranch()+';rport'
											    	}
											  }
										       
										    ],

										'Max-Forwards': '70',
								  		//contact: [ {uri : p_contact} ]
										// if your call doesnt get in-dialog request, maybe os.hostname() isn't
										// resolving in your ip address
									},
									content : ''
											
											
								};
								var s = sip.stringify(msg);

								console.log("InviteMOH_URI...send msg:>>>\r\n"+s);

									
								proxy.send(msg);
								
								initFlag();
								

								
								
								
								
							} else {
								proxy.send(sip.makeRespinse(rq, 405, 'Method not allowed'));
							}
						}
					}
					
					
				}
			
			
			
			
		}
		 
		
		
		);

	
	
}

function transferCalledParty(
		sdp,
		caller_uri,
		callee_uri,
		contact_uri,
		pai_uri
		)
{
///
/// refer to orig called party	
///	

myCseq += 1;
cseq_tag = myCseq;
	
var msg = {
			
			  method: 'INVITE',
			  uri: callee_uri,
			  headers: {
			    to: {uri: callee_uri},
			    from: {uri: caller_uri, params: {tag: from2_tag}},
			    'call-id': call_id1,
			    cseq: {method: 'INVITE', seq: myCseq },
			    'content-type': 'application/sdp',
				//'Alert-Info': 'ring-answer',
			    'P-Asserted-Identity' : pai_uri,
			    'Allow' : 'INVITE, ACK, CANCEL, OPTIONS, BYE, REFER, SUBSCRIBE, NOTIFY, INFO, PUBLISH',
			    
			    
			    //via : [],
				via :
					[ 
					  {
					    version: '2.0',
					    protocol: 'UDP',
					    host: HOST,
					    port: sip_port,
					    params: { 
					    	branch: generateBranch()+';rport'
					    	}
					  }
				       
				    ],

			    contact: [{uri: contact_uri}]  // if your call doesnt get in-dialog request, maybe os.hostname() isn't resolving in your ip address
			  },
			  content: sdp
				
				
};

var s11 = sip.stringify(msg);
console.log("transferCalledParty()...request:>>>\r\n"+s11);

		
proxy.send(

		msg, 
		
		function(rs) {
			
			var s2 = sip.stringify(rs);
			console.log("transferCalledParty()...response:>>>\r\n"+s2);
				
				if (rs.status >= 300) {
					console.log('transferCalledParty()...call failed with status ' + rs.status);
					initFlag();
					
					if (rs.status >= 480) {

						processHANGUP(
							caller_uri,
							callee_uri,
							contact_uri,
							pai_uri
						);
						
					}
					
					
				} else if (rs.status < 200) {
					console.log('transferCalledParty()...call progress status ' + rs.status);
					
					console.log('transferCalledParty()...1xx with to-tag ' + rs.headers.to.params.tag);
					to2_tag = rs.headers.to.params.tag;
					callee_to_tag = to2_tag;
					
					if(rs.status === 1800)
					{
						processANSWER_Callee(
							caller_uri,
							callee_uri,
							contact_uri,
							pai_uri
							);
					}


					
				} else {
					// yes we can get multiple 2xx response with different tags
					console.log('transferCalledParty()...call answered with tag ' + rs.headers.to.params.tag);
					
					console.log('transferCalledParty()...call-id:'+rs.headers['call-id']);
					///call_id2 = rs.headers['call-id'];
					to2_tag = rs.headers.to.params.tag;
					callee_to_tag = to2_tag;


					sdp2 = rs.content;
					console.log('transferCalledParty()...sdp2: \r\n'+ sdp2);
					
					
					var id = [ rs.headers['call-id'], 
					           rs.headers.from.params.tag,
							   rs.headers.to.params.tag ].join(':');
					
					console.log('2...id '+id);
					
				    // sending ACK to First
					/*
				    proxy.send({
				      method: 'ACK',
				      uri: caller_uri,
				      headers: {
				        to: {uri: caller_uri, params: {tag: to1_tag}},
				        from: {uri: callee_uri, params: {tag: from1_tag} },
				        'call-id': call_id1,
				        cseq: {method: 'ACK', seq: myCseq },
				        contact: [{uri: contact_uri}],
					    'Content-Type': 'application/sdp',
					    'Max-Forwards': '70',
				        via: []
				      },
				      content: sdp2
				      
				    });
				    */

				    // sending ACK to Second
				    proxy.send({
				      method: 'ACK',
				      uri: callee_uri,
				      headers: {
				        to: {uri: callee_uri, params: {tag: to2_tag} },
				        from: {uri: caller_uri, params: {tag: from2_tag} },
				        'call-id': call_id2,
				        cseq: {method: 'ACK', seq: myCseq },
				        contact: [{uri: contact_uri}],
					    ////'content-type': 'application/sdp',
					    'Max-Forwards': '70',
				        //via: []
						via :
							[ 
							  {
							    version: '2.0',
							    protocol: 'UDP',
							    host: HOST,
							    port: sip_port,
							    params: { 
							    	branch: generateBranch()+';rport'
							    	}
							  }
						       
						    ]

				      },
				      content: '' ///sdp1
				      
				      
				    });

				    
				    //timer_tick();
				    
					// registring our 'dialog' which is just function to process in-dialog
					// requests
					if (!dialogs[id]) {
						dialogs[id] = function(rq) {
							if (rq.method === 'BYE') {
								console.log('transferCalledParty()...call received bye');
								
								delete dialogs[id];
								
								proxy.send(sip.makeResponse(rq, 200, 'Ok'));
								
								// 2nd party notify to 1st party.... 
								myCseq += 1;
								
								var msg = {

									method : 'BYE',
									uri : caller_uri,
									headers : {
										to: {uri: caller_uri, params: {tag: to1_tag}},
										from: {uri : callee_uri, params : {tag: from1_tag}},
										'call-id': call_id1,
										cseq: {method: 'BYE', seq : myCseq },
										//'content-type': 'application/sdp',
										//via: [],
										via :
											[ 
											  {
											    version: '2.0',
											    protocol: 'UDP',
											    host: HOST,
											    port: sip_port,
											    params: { 
											    	branch: generateBranch()+';rport'
											    	}
											  }
										       
										    ],

										'Max-Forwards': '70',
								  		//contact: [ {uri : p_contact} ]
										// if your call doesnt get in-dialog request, maybe os.hostname() isn't
										// resolving in your ip address
									},
									content : ''
											
											
								};
								var s = sip.stringify(msg);

								console.log("transferCalledParty()...send msg:>>>\r\n"+s);

									
								proxy.send(msg);
								
								initFlag();
								

								
								
								
								
							} else {
								proxy.send(sip.makeRespinse(rq, 405, 'Method not allowed'));
							}
						}
					}
					
					
				}
			
			
			
			
		}
		 
		
		
);
	
	
}


// invite second party
function InviteSecondParty(
		sdp,
		caller_uri,
		callee_uri,
		contact_uri,
		pai_uri
		) 
{
	

if(flag_second=='second')
{
	console.log('2...flag_second...is...second....');
	return;
}

	
flag_second = 'second';

var mybranch = generateBranch()+';rport';

console.log('2....InviteSecondParty....branch='+mybranch);

var msg = {
		
		  method: 'INVITE',
		  uri: callee_uri,
		  headers: {
		    to: {uri: callee_uri},
		    from: {uri: caller_uri, params: {tag: from2_tag}},
		    'call-id': call_id2,
		    cseq: {method: 'INVITE', seq: myCseq },
		    'content-type': 'application/sdp',
			//'Alert-Info': 'ring-answer',
		    'P-Asserted-Identity' : pai_uri,
		    'Allow' : 'INVITE, ACK, CANCEL, OPTIONS, BYE, REFER, SUBSCRIBE, NOTIFY, INFO, PUBLISH',
		    
		    /////via : []
		    
			via :
				[ 
				  {
				    version: '2.0',
				    protocol: 'UDP',
				    host: HOST,
				    port: sip_port,
				    params: { 
				    	branch: mybranch 
				    	}
				  }
			       
			    ]
		    
		    
		    ,
		    contact: [{uri: contact_uri}]  // if your call doesnt get in-dialog request, maybe os.hostname() isn't resolving in your ip address
		  },
		  content: sdp
			
			
};

var s11 = sip.stringify(msg);
console.log("InviteSecondParty()...request:>>>\r\n"+s11);



	
proxy.send(

	msg, 
	
	function(rs) {
		
		var s2 = sip.stringify(rs);
		console.log("2...sipResp2 msg:>>>\r\n"+s2);
			
			if (rs.status >= 300) {
				console.log('2...call failed with status ' + rs.status);
				initFlag();
				
				if (rs.status >= 480) {

					processHANGUP(
						caller_uri,
						callee_uri,
						contact_uri,
						pai_uri
					);
					
				}
				
				
			} else if (rs.status < 200) {
				console.log('2...call progress status ' + rs.status);
				
				console.log('2...1xx with to-tag ' + rs.headers.to.params.tag);
				to2_tag = rs.headers.to.params.tag;
				callee_to_tag = to2_tag;
				console.log('2......callee_to_tag=%s',callee_to_tag);
				
				if(rs.status === 180) {
					callee_branch_tag = rs.headers.via[0].params.branch;
					console.log('2...180 Ringing...via_branch: '+callee_branch_tag);
				}
				
				
				if(rs.status === 1800)
				{
					processANSWER_Callee(
						caller_uri,
						callee_uri,
						contact_uri,
						pai_uri
						);
				}


				
			} else {
				// yes we can get multiple 2xx response with different tags
				console.log('2...call answered with tag ' + rs.headers.to.params.tag);
				
				console.log('2...call-id:'+rs.headers['call-id']);
				///call_id2 = rs.headers['call-id'];
				to2_tag = rs.headers.to.params.tag;
				callee_to_tag = to2_tag;

				console.log('...callee_to_tag=%s',callee_to_tag);

				sdp2 = rs.content;
				console.log('2...sdp2: \r\n'+ sdp2);
				
				///orig
				var t_end = sdp1.length;
				var t_begin = sdp1.indexOf('m=video');
				
				var t_video_sdp = sdp1.substring(t_begin, t_end);
				console.log('2...get orig SDP t_sdp: >>>\r\n%s\r\n<<<\r\n',t_video_sdp);
				
				var tmp_sdp = '';
				
				tmp_sdp = sdp1.replace('m=video 0 RTP/AVP 115 34\r\n', 'm=video 5064 RTP/AVP 115 34\r\n');
				sdp1 = tmp_sdp;
				
				tmp_sdp = sdp2.replace('m=video 0 RTP/AVP 115 34\r\n', 'm=video 5064 RTP/AVP 115 34\r\n');
				sdp2 = tmp_sdp;
				
				
				var id = [ rs.headers['call-id'], 
				           rs.headers.from.params.tag,
						   rs.headers.to.params.tag ].join(':');
				
				console.log('2...id '+id);
				
			    // sending ACK to First
			    proxy.send({
			      method: 'ACK',
			      uri: caller_uri,
			      headers: {
			        to: {uri: caller_uri, params: {tag: to1_tag}},
			        from: {uri: callee_uri, params: {tag: from1_tag} },
			        'call-id': call_id1,
			        cseq: {method: 'ACK', seq: myCseq },
			        contact: [{uri: contact_uri}],
				    'Content-Type': 'application/sdp',
				    'Max-Forwards': '70',
			        //via: []
					via :
						[ 
						  {
						    version: '2.0',
						    protocol: 'UDP',
						    host: HOST,
						    port: sip_port,
						    params: { 
						    	branch: generateBranch()+';rport'
						    	}
						  }
					       
					    ],

			      },
			      content: sdp2
			      
			    });

			    // sending ACK to Second
			    
			    proxy.send({
			      method: 'ACK',
			      uri: callee_uri,
			      headers: {
			        to: {uri: callee_uri, params: {tag: to2_tag} },
			        from: {uri: caller_uri, params: {tag: from2_tag} },
			        'call-id': call_id2,
			        cseq: {method: 'ACK', seq: myCseq },
			        contact: [{uri: contact_uri}],
				    'Content-Type': 'application/sdp',
				    'Max-Forwards': '70',
			        //via: []
			        
					via :
						[ 
						  {
						    version: '2.0',
						    protocol: 'UDP',
						    host: HOST,
						    port: sip_port,
						    params: { 
						    	branch: generateBranch()+';rport'
						    	}
						  }
					       
					    ],

			      },
			      content: sdp1
			      
			      
			    });
			    

			    
			    //timer_tick();
			    
				// registring our 'dialog' which is just function to process in-dialog
				// requests
				if (!dialogs[id]) {
					dialogs[id] = function(rq) {
						if (rq.method === 'BYE') {
							console.log('2...call received bye');
							
							delete dialogs[id];
							
							proxy.send(sip.makeResponse(rq, 200, 'Ok'));
							
							// 2nd party notify to 1st party.... 
							myCseq += 1;
							
							var msg = {

								method : 'BYE',
								uri : caller_uri,
								headers : {
									to: {uri: caller_uri, params: {tag: to1_tag}},
									from: {uri : callee_uri, params : {tag: from1_tag}},
									'call-id': call_id1,
									cseq: {method: 'BYE', seq : myCseq },
									//'content-type': 'application/sdp',
									//via: [],
									via :
										[ 
										  {
										    version: '2.0',
										    protocol: 'UDP',
										    host: HOST,
										    port: sip_port,
										    params: { 
										    	branch: generateBranch()+';rport'
										    	}
										  }
									       
									    ],

									'Max-Forwards': '70',
							  		//contact: [ {uri : p_contact} ]
									// if your call doesnt get in-dialog request, maybe os.hostname() isn't
									// resolving in your ip address
								},
								content : ''
										
										
							};
							var s = sip.stringify(msg);

							console.log("2...send msg:>>>\r\n"+s);

								
							proxy.send(msg);
							
							initFlag();
							

							
							
							
							
						} else {
							proxy.send(sip.makeRespinse(rq, 405, 'Method not allowed'));
						}
					}
				}
				
				
			}
		
		
		
		
	}
	 
	
	
);

if(video_uri==='')
	return;

var msg_video = {
		
		  method: 'INVITE',
		  uri: video_uri,
		  headers: {
		    to: {uri: video_uri},
		    from: {uri: caller_uri, params: {tag: from2_tag}},
		    'call-id': call_id2,
		    cseq: {method: 'INVITE', seq: myCseq },
		    'content-type': 'application/sdp',
			//'Alert-Info': 'ring-answer',
		    'P-Asserted-Identity' : pai_uri,
		    
		    //via : [],
			via :
				[ 
				  {
				    version: '2.0',
				    protocol: 'UDP',
				    host: HOST,
				    port: sip_port,
				    params: { 
				    	branch: generateBranch()+';rport'
				    	}
				  }
			       
			    ],

		    contact: [{uri: contact_uri}]  // if your call doesnt get in-dialog request, maybe os.hostname() isn't resolving in your ip address
		  },
		  content: sdp
			
			
};

var sdp_video = '';

var s11_video = sip.stringify(msg_video);
console.log("InviteSecondParty()...request:>>>\r\n"+s11_video);

proxy.send(
		msg_video,
		
		function(rs) {
			
			var s2 = sip.stringify(rs);
			console.log("2...sipResp2 msg:>>>\r\n"+s2);
				
				if (rs.status >= 300) {
					console.log('2...call failed with status ' + rs.status);
					initFlag();
					
					if (rs.status >= 480) {

						processHANGUP(
							caller_uri,
							callee_uri,
							contact_uri,
							pai_uri
						);
						
					}
					
					
				} else if (rs.status < 200) {
					console.log('2...call progress status ' + rs.status);
					
					console.log('2...1xx with to-tag ' + rs.headers.to.params.tag);
					to2_tag = rs.headers.to.params.tag;
					callee_to_tag = to2_tag;
					
					if(rs.status === 1800)
					{
						processANSWER_Callee(
							caller_uri,
							callee_uri,
							contact_uri,
							pai_uri
							);
					}


					
				} else {
					// yes we can get multiple 2xx response with different tags
					console.log('2...call answered with tag ' + rs.headers.to.params.tag);
					
					console.log('2...call-id:'+rs.headers['call-id']);
					///call_id2 = rs.headers['call-id'];
					to2_tag = rs.headers.to.params.tag;
					callee_to_tag = to2_tag;


					sdp2 = rs.content;
					console.log('2...sdp2: \r\n'+ sdp2);
					///sdp_video = sdp1.replace('m=audio','m=audio');
					
					var t_begin = sdp1.indexOf('m=audio');
					var t_end = sdp1.indexOf('m=video');

					var t_getrid_sdp = sdp1.substring(t_begin, t_end);

					console.log('2...get rid of orig SDP t_getrid_sdp: >>>\r\n%s\r\n<<<\r\n',t_getrid_sdp);
					
					
					//sdp_video = sdp1.replace(t_getrid_sdp, ''); ///sdp2;
					
					sdp_video = sdp2; ///sdp1;
					////hold2_sdp = sdp2.replace('a=recvonly','a=sendrecv');
					console.log('2...sdp_video: \r\n'+ sdp_video);

					
					var id = [ rs.headers['call-id'], 
					           rs.headers.from.params.tag,
							   rs.headers.to.params.tag ].join(':');
					
					console.log('2...id '+id);
					
				    // sending ACK to First
				    proxy.send({
				      method: 'ACK',
				      uri: video_uri,
				      headers: {
				        to: {uri: video_uri, params: {tag: to2_tag}},
				        from: {uri: callee_uri, params: {tag: from1_tag} },
				        'call-id': call_id1,
				        cseq: {method: 'ACK', seq: myCseq },
				        contact: [{uri: contact_uri}],
					    'Content-Type': 'application/sdp',
					    'Max-Forwards': '70',
				        //via: []
						via :
							[ 
							  {
							    version: '2.0',
							    protocol: 'UDP',
							    host: HOST,
							    port: sip_port,
							    params: { 
							    	branch: generateBranch()+';rport'
							    	}
							  }
						       
						    ],

				      },
				      content: sdp_video ////sdp2
				      
				    });

				    // sending ACK to Second

				    /*
				    proxy.send({
				      method: 'ACK',
				      uri: callee_uri,
				      headers: {
				        to: {uri: callee_uri, params: {tag: to2_tag} },
				        from: {uri: caller_uri, params: {tag: from2_tag} },
				        'call-id': call_id2,
				        cseq: {method: 'ACK', seq: myCseq },
				        contact: [{uri: contact_uri}],
					    'Content-Type': 'application/sdp',
					    'Max-Forwards': '70',
				        via: []
				      },
				      content: sdp1
				      
				      
				    });
				    */
				    

				    
				    //timer_tick();
				    
					// registring our 'dialog' which is just function to process in-dialog
					// requests
					if (!dialogs[id]) {
						dialogs[id] = function(rq) {
							if (rq.method === 'BYE') {
								console.log('2...call received bye');
								
								delete dialogs[id];
								
								proxy.send(sip.makeResponse(rq, 200, 'Ok'));
								
								// 2nd party notify to 1st party.... 
								myCseq += 1;
								
								var msg = {

									method : 'BYE',
									uri : caller_uri,
									headers : {
										to: {uri: caller_uri, params: {tag: to1_tag}},
										from: {uri : callee_uri, params : {tag: from1_tag}},
										'call-id': call_id1,
										cseq: {method: 'BYE', seq : myCseq },
										//'content-type': 'application/sdp',
										//via: [],
										via :
											[ 
											  {
											    version: '2.0',
											    protocol: 'UDP',
											    host: HOST,
											    port: sip_port,
											    params: { 
											    	branch: generateBranch()+';rport'
											    	}
											  }
										       
										    ],

										'Max-Forwards': '70',
								  		//contact: [ {uri : p_contact} ]
										// if your call doesnt get in-dialog request, maybe os.hostname() isn't
										// resolving in your ip address
									},
									content : ''
											
											
								};
								var s = sip.stringify(msg);

								console.log("2...send msg:>>>\r\n"+s);

									
								proxy.send(msg);
								
								initFlag();
								

								
								
								
								
							} else {
								proxy.send(sip.makeRespinse(rq, 405, 'Method not allowed'));
							}
						}
					}
					
					
				}
			
			
			
			
		}
		 
		



);

	

}

function processHANGUP(
		caller_uri,
		callee_uri,
		contact_uri,
		pai_uri
		) 
{
	
	/// hangup 2nd call party....
	/// 1st party notify to 2nd party....
	myCseq += 1;
	
	var msg1 = {

		method : 'BYE',
		uri : callee_uri,
		headers : {
			to: {uri: callee_uri, params: {tag: callee_to_tag}},
			from: {uri : caller_uri, params : {tag: from1_tag}},
			'call-id': call_id2,
			cseq: {method: 'BYE', seq : myCseq },
			//'content-type': 'application/sdp',
			//via: [],
			via :
				[ 
				  {
				    version: '2.0',
				    protocol: 'UDP',
				    host: HOST,
				    port: sip_port,
				    params: { 
				    	branch: generateBranch()+';rport'
				    	}
				  }
			       
			    ],

			'Max-Forwards': '70',
	  		contact: [ {uri : contact_uri} ]
			// if your call doesnt get in-dialog request, maybe os.hostname() isn't
			// resolving in your ip address
		},
		content : ''
			
			
	};
	var s1 = sip.stringify(msg1);

	console.log("processHANGUP()...send msg1:>>>\r\n"+s1);

	
	proxy.send(msg1);
	
	/////
	// 2nd party notify to 1st party.... 
	myCseq += 1;
	
	var msg2 = {

		method : 'BYE',
		uri : caller_uri,
		headers : {
			to: {uri: caller_uri, params: {tag: caller_to_tag}},
			from: {uri : callee_uri, params : {tag: from1_tag}},
			'call-id': call_id1,
			cseq: {method: 'BYE', seq : myCseq },
			//'content-type': 'application/sdp',
			//via: [],
			via :
				[ 
				  {
				    version: '2.0',
				    protocol: 'UDP',
				    host: HOST,
				    port: sip_port,
				    params: { 
				    	branch: generateBranch()+';rport'
				    	}
				  }
			       
			    ],

			'Max-Forwards': '70',
	  		contact: [ {uri : contact_uri} ]
			// if your call doesnt get in-dialog request, maybe os.hostname() isn't
			// resolving in your ip address
		},
		content : ''
				
				
	};
	var s2 = sip.stringify(msg2);

	console.log("processHANGUP()...send msg2:>>>\r\n"+s2);

		
	proxy.send(msg2);
	
	initFlag();
	
///////////////////////
	
	/////
	// 3rd party moh notify to 1st party.... 
	//////
	myCseq += 1;
	
	var msg3 = {

		method : 'BYE',
		uri : moh_uri,
		headers : {
			to: {uri: moh_uri, params: {tag: moh_tag}},
			from: {uri : callee_uri, params : {tag: from1_tag}},
			'call-id': call_id1,
			cseq: {method: 'BYE', seq : myCseq },
			//'content-type': 'application/sdp',
			//via: [],
			via :
				[ 
				  {
				    version: '2.0',
				    protocol: 'UDP',
				    host: HOST,
				    port: sip_port,
				    params: { 
				    	branch: generateBranch()+';rport'
				    	}
				  }
			       
			    ],

			'Max-Forwards': '70',
	  		contact: [ {uri : contact_uri} ]
			// if your call doesnt get in-dialog request, maybe os.hostname() isn't
			// resolving in your ip address
		},
		content : ''
				
				
	};
	var s3 = sip.stringify(msg3);

	console.log("processHANGUP()...send msg3:>>>\r\n"+s3);

		
	proxy.send(msg3);
	
/////////
//// transfer call
	
	myCseq += 1;
	
	var msg4 = {

		method : 'BYE',
		uri : target_uri,
		headers : {
			to: {uri: target_uri, params: {tag: target_to_tag}},
			from: {uri : callee_uri, params : {tag: from1_tag}},
			'call-id': call_id1,
			cseq: {method: 'BYE', seq : myCseq },
			//'content-type': 'application/sdp',
			//via: [],
			via :
				[ 
				  {
				    version: '2.0',
				    protocol: 'UDP',
				    host: HOST,
				    port: sip_port,
				    params: { 
				    	branch: generateBranch()+';rport'
				    	}
				  }
			       
			    ],

			'Max-Forwards': '70',
	  		contact: [ {uri : contact_uri} ]
			// if your call doesnt get in-dialog request, maybe os.hostname() isn't
			// resolving in your ip address
		},
		content : ''
				
				
	};
	var s4 = sip.stringify(msg4);

	console.log("processHANGUP()...send msg4:>>>\r\n"+s4);

		
	proxy.send(msg4);
	
	///////

	if(my_backup_uri === '')
		return;
	
	myCseq += 1;
	
	var msg5 = {

		method : 'BYE',
		uri : my_backup_uri,
		headers : {
			to: {uri: my_backup_uri, params: {tag: backup_to_tag}},
			from: {uri : caller_uri, params : {tag: from1_tag}},
			'call-id': call_id1,
			cseq: {method: 'BYE', seq : myCseq },
			//'content-type': 'application/sdp',
			//via: [],
			via :
				[ 
				  {
				    version: '2.0',
				    protocol: 'UDP',
				    host: HOST,
				    port: sip_port,
				    params: { 
				    	branch: generateBranch()+';rport'
				    	}
				  }
			       
			    ],

			'Max-Forwards': '70',
	  		contact: [ {uri : contact_uri} ]
			// if your call doesnt get in-dialog request, maybe os.hostname() isn't
			// resolving in your ip address
		},
		content : ''
				
				
	};
	var s5 = sip.stringify(msg5);

	console.log("processHANGUP()...send msg5:>>>\r\n"+s5);

		
	proxy.send(msg5);
	
	
}

function processSipRequest(
		p_method,p_request,
		p_from,p_from_tag,
		p_to,p_to_tag,
		p_contact,p_callid
		) 
{

	var msg = {

			method : p_method,
			uri : p_request,
			headers : {
				to: {uri: p_to, params: {tag: p_to_tag}},
				from: {uri : p_from, params : {tag: p_from_tag}},
				'call-id': p_callid,
				cseq: {method: p_method, seq : 1},
				//'content-type': 'application/sdp',
				//via: [],
				via :
					[ 
					  {
					    version: '2.0',
					    protocol: 'UDP',
					    host: HOST,
					    port: sip_port,
					    params: { 
					    	branch: generateBranch()+';rport'
					    	}
					  }
				       
				    ],

				'Max-Forwards': '70',
	  
				//contact: [ {uri : p_contact} ]
			// if your call doesnt get in-dialog request, maybe os.hostname() isn't
			// resolving in your ip address
			},
			content : ''
			
			
	};
	
	var s = sip.stringify(msg);

	console.log("msg:>>>\r\n"+s);
	
	
	proxy.send(msg,
	  
	function(rs) {

		if (rs.status >= 300) {
			console.log('@...call failed with status ' + rs.status);
		} else if (rs.status < 200) {
			console.log('@...call progress status ' + rs.status);
		} else {
			// yes we can get multiple 2xx response with different tags
			console.log('@...call answered with tag ' + rs.headers.to.params.tag);

			sdp1 = rs.content;
			console.log('@...sdp: \r\n' + sdp1);
			console.log('@...call-id:' + rs.headers['call-id']);
			// call_id1 = rs.headers['call-id'];
			to1_tag = rs.headers.to.params.tag;

			// invite 2nd party....
			////InviteSecondParty(sdp1);

			var id = [ rs.headers['call-id'], rs.headers.from.params.tag,
					rs.headers.to.params.tag ].join(':');

			console.log('@...id ' + id);

			// registring our 'dialog' which is just function to process
			// in-dialog
			// requests
			if (!dialogs[id]) {
				dialogs[id] = function(rq) {
					if (rq.method === 'BYE') {
						console.log('@...call received bye');

						delete dialogs[id];

						proxy.send(sip.makeResponse(rq, 200, 'Ok'));
					} else {
						proxy.send(sip.makeRespinse(rq, 405, 'Method not allowed'));
					}
				}
			}
		}

	});
	
	
	
}

var timertick;
var count = 0;

function timer_tick() 
{

  count = count+1;
  console.log("Tick count: " + count);
  if (count >= 10) 
  {
    count = 0;
    

    processRE_INVITE_2(
    		g_caller_uri,
    		g_callee_uri,
    		g_contact_uri,
    		g_pai_uri
    		
    );
    
    //clearTimeout(timertick);

    //processFirstPartyAnswer();
    /*
    processHANGUP(
			my_caller_uri, ////caller_uri,
			my_callee_uri, ///callee_uri,
			my_contact_uri,
			my_pai_uri
    	);
    	*/
    
    
    /*
    processBYE(
			my_caller_uri, ////caller_uri,
			my_caller_uri, ///callee_uri,
			my_contact_uri,
			my_pai_uri
    	);

    processBYE(
			my_callee_uri, ////caller_uri,
			my_callee_uri, ///callee_uri,
			my_contact_uri,
			my_pai_uri
    	);
    	*/
    
    
    return;
    
  }

	


  //timertick=setTimeout(timer_tick, 1000);
  
  setTimeout(timer_tick, 1000);
  
  
  
}

var timer_count = 0;

function timer_test(){
	
	timer_count += 1;
	
	//console.log('Timer Count: %d ',timer_count);
	if(timer_count===1)
	{
		
    	var n = my_target_uri.length;
    	console.log('....n=%d ',n);
        for(var i=0; i<n ;i++)
        {
        	//processSUBSCRIBE(my_target_uri[i]);
        	//processSUBSCRIBE_presence(my_target_uri[i]);
        	//processOPTIONS_Polling(my_target_uri[i]);
        	
        }
        
        my_caller_uri = my_target_uri[0];
        my_callee_uri = my_target_uri[3]; ////[3];
        
        var m = my_uas_uri.length;
    	console.log('....m=%d ',m);
        for(var j=0; j<m ;j++)
        {
        	processSUBSCRIBE_presence(my_uas_uri[j]);
        	processOPTIONS_Polling(my_uas_uri[j]);
        	
        }

	}
	else if(timer_count>=180){

		timer_count = 0;

	}

	///return;
	
}

function timer_test_1()
{
	var test_uas_uri = 'sip:1234@192.168.0.224:5078';
	
	timer_count += 1;
	
	console.log('Timer Count: %d ',timer_count);
	if(timer_count>=3)
	{
		timer_count = 0;
		
		///processOPTIONS_Polling(test_uas_uri);
		
		// Checks the status of a single port
		portscanner.checkPortStatus(ms1_port, ms1_ip, function(error, status) {
		  // Status is 'open' if currently in use or 'closed' if available
		  console.log('%s:%d server status: %s',ms1_ip,ms1_port,status);
		});
		
		portscanner.checkPortStatus(ms2_port, ms2_ip, function(error, status) {
			  // Status is 'open' if currently in use or 'closed' if available
			  console.log('%s:%d server status: %s',ms2_ip,ms2_port,status);
			});
		
		portscanner.checkPortStatus(5060, '192.168.1.28', function(error, status) {
			  // Status is 'open' if currently in use or 'closed' if available
			  console.log('%s:%d server status: %s','192.168.1.28',5060,status);
			});

		portscanner.checkPortStatus(5060, '192.168.1.29', function(error, status) {
			  // Status is 'open' if currently in use or 'closed' if available
			  console.log('%s:%d server status: %s','192.168.1.29',5060,status);
			});
		
		/*
		console.log('....sending udp ping....');
		my_sock.send(my_buf, 0, my_buf.length, 5078, '192.168.0.224', 
				function(err, bytes) {
					if(err) {
						throw err;
					}
					console.log('....my_sock.send().....bytes=%d', bytes);
			
				});
		*/
		
		///my_sock.close();
		
	}

}

var TimerID = null;

function TimerStart(func,delay)
{
   TimerID = setInterval(func,delay);
   console.log('TimerStart().....');
   
}

function TimerStop()
{
	clearInterval(TimerID);
	timer_count = 0;
	TimerID = null;
	console.log('TimerStop()....');
}


// // 3pcc rcc entry function......
function processSip3pcc(
						cmd,
						caller_uri,
						callee_uri,
						text_message,
						contact_uri,
						pai_uri,
						p_target_uri,
						p_moh_uri,
						p_conf_uri,
						p_video_uri,
						p_call_id,
						p_backup_uri
						
						)
{

// /////////////////////
	console.log('processSip3pcc()......'+cmd);
	tracelog('processSip3pcc()......'+cmd);

	target_uri = p_target_uri;
	moh_uri = p_moh_uri;
	conf_uri = p_conf_uri;
	video_uri = p_video_uri;
	
	rcc3pcc_command = cmd;
	my_call_id = p_call_id;
	my_backup_uri = p_backup_uri;
	
	//
	g_caller_uri = caller_uri;
	g_callee_uri = callee_uri;
	g_contact_uri = contact_uri;
	g_pai_uri = pai_uri;

	
	if(cmd==='HOLD') {
		
		processHOLD(
				caller_uri,
				callee_uri,
				contact_uri,
				pai_uri
				);
		
	} else if(cmd==='UNHOLD') {
		
		
		processUNHOLD(
				caller_uri,
				callee_uri,
				contact_uri,
				pai_uri
				);
	
	} else if(cmd==='MOH_HOLD') {

		//Hold Call for music on hold
		processMOH_HOLD(
				caller_uri,
				callee_uri,
				contact_uri,
				pai_uri
				);
		

	} else if(cmd==='MOH_UNHOLD') {
		
		//Retrieve call for music on hold
		processMOH_UNHOLD(
				caller_uri,
				callee_uri,
				contact_uri,
				pai_uri
				);
		
		
	} else if(cmd==='3PCC') {
		
		InviteFirstParty(
				caller_uri,
				callee_uri,
				contact_uri,
				pai_uri
				);

	} else if(cmd==='CONSULT') {

		processCONSULT(
				caller_uri,
				callee_uri,
				contact_uri,
				pai_uri,
				target_uri
		
		);
		
	} else if(cmd==='RE_INVITE_1') {

		processRE_INVITE_1(
				caller_uri,
				callee_uri,
				contact_uri,
				pai_uri
		
		);

	} else if(cmd==='RE_INVITE_2') {
		
		processRE_INVITE_2(
				caller_uri,
				callee_uri,
				contact_uri,
				pai_uri
		
		);
		
		//timer_tick();
		
	} else if(cmd==='SIP_INFO_1') {

		processSIP_INFO_1(
				caller_uri,
				callee_uri,
				contact_uri,
				pai_uri
		
		);
		
		
	} else if(cmd==='SIP_INFO_2') {
		
		processSIP_INFO_2(
				caller_uri,
				callee_uri,
				contact_uri,
				pai_uri
		
		);

	} else if(cmd==='RECOVERY_1') {

		processSIP_RECOVERY_1(
				caller_uri,
				callee_uri,
				contact_uri,
				pai_uri,
				my_backup_uri
		
		);
		
		
	} else if(cmd==='OPTIONS') {
		
		processOPTIONS_1(
				caller_uri,
				callee_uri,
				contact_uri,
				pai_uri
		
		);
		
		
		
	} else if(cmd==='3PCC-2') {
		
		process3PCC_2();
	
	} else if(cmd==='MESSAGE') {
		
	    processMESSAGE(
	    		text_message,
	    		caller_uri,
	    		callee_uri,
	    		contact_uri,
	    		pai_uri
	    		);
		
	} else if(cmd==='HANGUP') {
		
		processHANGUP(
				caller_uri,
				callee_uri,
				contact_uri,
				pai_uri
				);
		
	} else if(cmd==='REINVITE') {
	
		
		processSingleStepTransfer_reInvite(
				caller_uri,
				callee_uri,
				contact_uri,
				pai_uri,
				target_uri
		
		);
		
	} else if(cmd==='RCC') {

		////Remote Call Control...
		processREFER(
				caller_uri,
				callee_uri,
				contact_uri,
				pai_uri
				);
		
		
		
	} else if(cmd==='REFER') {
		
		///processREFER();
		processSingleStepTransfer_REFER(
				caller_uri,
				callee_uri,
				contact_uri,
				pai_uri,
				target_uri
		
		);
		
		
	} else if(cmd==='INVITE') {
		
		processINVITE(
				caller_uri,
				callee_uri,
				contact_uri,
				pai_uri
				);
	
	} else if(cmd==='ANSWERCaller') {
	
		processANSWER_Caller(
				caller_uri,
				callee_uri,
				contact_uri,
				pai_uri
				);
	
	} else if(cmd==='ANSWERCallee') {
		
	
		processANSWER_Callee(
				caller_uri,
				callee_uri,
				contact_uri,
				pai_uri
				);
		
		
	} else if(cmd==='CANCEL') {
		
		///processCANCEL();
		//processBYE(
		processCANCEL(		
				caller_uri,
				callee_uri,
				contact_uri,
				pai_uri
				);
	
	} else if(cmd==='BYE') {
	
		processBYE(
				caller_uri,
				callee_uri,
				contact_uri,
				pai_uri
				);

	} else if(cmd==='SUBSCRIBE_PRESENCE') {
		
		processSUBSCRIBE_presence(callee_uri);
		
		
	} else if(cmd==='SUBSCRIBE') {
		
		processSUBSCRIBE(callee_uri);
		

	} else if(cmd==='NOTIFY') {
	
		processNOTIFY(
				caller_uri,
				callee_uri,
				contact_uri,
				pai_uri
				);
	
	} else if(cmd==='NOTIFY_MWI') {
		
		processNOTIFY_MWI(
				caller_uri,
				callee_uri,
				contact_uri,
				pai_uri
				);	
		
	} else if(cmd==='NOTIFY_CLS_MWI') {
		
		processNOTIFY_CLS_MWI(
				caller_uri,
				callee_uri,
				contact_uri,
				pai_uri
				);
		
	}
	
	
	
	
		
}

////

function processMOH_UNHOLD(
		caller_uri,
		callee_uri,
		contact_uri,
		pai_uri
		)
{

////
	////

	
	
	//hold2_sdp = sdp2.replace('a=recvonly','a=sendrecv');
	//hold2_sdp = sdp2.replace('a=inactive','a=sendrecv');
	hold2_sdp = sdp2.replace('a=recvonly','a=sendrecv');
	//hold_sdp = '';
	console.log('processMOH_UNHOLD()...MOH_UNHOLD.....hold2_sdp='+hold2_sdp);

	////
	//hold1_sdp = sdp1.replace('a=recvonly','a=sendrecv');
	//hold1_sdp = sdp1.replace('a=inactive','a=sendrecv');
	hold1_sdp = sdp1.replace('a=inactive','a=sendrecv');
	//hold_sdp = '';
	console.log('processMOH_UNHOLD()....MOH_UNHOLD.....hold1_sdp='+hold1_sdp);

	
myCseq += 1;
cseq_tag = myCseq;

		
var msg1 = {
				
				method : 'INVITE', ///'NOTIFY',
				uri : callee_uri,
				headers : {
					to : {
						uri : callee_uri,
						params : {
							tag : callee_to_tag
						}
					},
					from : {
						uri : caller_uri,
						params : {
							tag : from1_tag
						}
					},
					////'Alert-Info': 'ring-answer',
					'call-id' : call_id1,
					cseq : {
						method : 'INVITE', ///'NOTIFY',
						seq : cseq_tag
					},
					'content-type' : 'application/sdp',
					//'Content-Disposition' : 'signal;handling=required',
					//'Event': 'talk',
					//via: [],
					via :
						[ 
						  {
						    version: '2.0',
						    protocol: 'UDP',
						    host: HOST,
						    port: sip_port,
						    params: { 
						    	branch: generateBranch()+';rport'
						    	}
						  }
					       
					    ],

					
					contact : [ {
						uri : contact_uri
					} ]
				// if your call doesnt get in-dialog request, maybe os.hostname() isn't
				// resolving in your ip address
				},
				//content : 
				//	'<?xml version="1.0" encoding="UTF-8"?>\r\n'+
				//	'<RequestSystemStatus xmlns="http://www.ecma-international.org/standards/ecma-323/csta/ed3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"/>\r\n'
					

				content : hold1_sdp ////hold2_sdp
					
					
				
				
};

var s11 = sip.stringify(msg1);
console.log("processMOH_UNHOLD()...request:>>>\r\n" + s11);

		//
		// proxy.send(sip.makeRespinse(rq, 487, 'Request Terminated'));
		///

proxy.send(msg1,
		
		function(rs) {

			var s1 = sip.stringify(rs);
			console.log("processMOH_UNHOLD()...response:>>>\r\n"+s1);
			
			if (rs.status >= 300) {
				console.log('processMOH_UNHOLD()...call failed with status ' + rs.status);
				initFlag();

			} else if (rs.status < 200) {
				console.log('processMOH_UNHOLD()...call progress status ' + rs.status);

				console.log('processMOH_UNHOLD()...1xx with to-tag ' + rs.headers.to.params.tag);
				to1_tag = rs.headers.to.params.tag;

			} else {
				// yes we can get multiple 2xx response with different tags
				console.log('processMOH_UNHOLD()...call answered with tag ' + rs.headers.to.params.tag);

				sdp1 = rs.content;
				console.log('processMOH_UNHOLD()...sdp: \r\n' + rs.content);
				console.log('processMOH_UNHOLD()...call-id:' + rs.headers['call-id']);
				// call_id1 = rs.headers['call-id'];
				to1_tag = rs.headers.to.params.tag;
				
				if(to1_tag != '')
				{
					callee_to_tag = to1_tag;
					console.log('...callee_to_tag=%s',callee_to_tag);
				}

				
				cseq_tag = rs.headers.cseq.seq;
				console.log('processMOH_UNHOLD()...cseq:' + cseq_tag);

				// invite 2nd party....
				// InviteSecondParty(sdp1);
				//

				var id = [ rs.headers['call-id'], rs.headers.from.params.tag,
						rs.headers.to.params.tag ].join(':');

				console.log('processMOH_UNHOLD()...id ' + id);

				//hold_sdp = sdp1.replace('a=sendonly','a=sendrecv');

			    // sending ACK to 
				
			    proxy.send({
			      method: 'ACK',
			      uri: callee_uri,
			      headers: {
			        to: {uri: callee_uri, params: {tag: to1_tag}},
			        from: {uri: caller_uri, params: {tag: from1_tag} },
			        'call-id': call_id1,
			        cseq: {method: 'ACK', seq: cseq_tag },
			        contact: [{uri: contact_uri}],
				    //'Content-Type': 'application/sdp',
				    'Max-Forwards': '70',
			        ///via: []
					via :
						[ 
						  {
						    version: '2.0',
						    protocol: 'UDP',
						    host: HOST,
						    port: sip_port,
						    params: { 
						    	branch: generateBranch()+';rport'
						    	}
						  }
					       
					    ],

			      },
			      content: '' ////hold1_sdp
			      
			    });
			    
			    
				


				// registring our 'dialog' which is just function to process
				// in-dialog
				// requests
				if (!dialogs[id]) {
					dialogs[id] = function(rq) {
						if (rq.method === 'BYE') {
							console.log('processMOH_UNHOLD...call received bye');

							delete dialogs[id];

							proxy.send(sip.makeResponse(rq, 200, 'Ok'));
							/// 1st party notify to 2nd party....
							var msg = {

								method : 'BYE',
								uri : callee_uri,
								headers : {
									to: {uri: callee_uri, params: {tag: to1_tag}},
									from: {uri : caller_uri, params : {tag: from1_tag}},
									'call-id': call_id1,
									cseq: {method: 'BYE', seq : 4},
									//'content-type': 'application/sdp',
									//via: [],
									via :
										[ 
										  {
										    version: '2.0',
										    protocol: 'UDP',
										    host: HOST,
										    port: sip_port,
										    params: { 
										    	branch: generateBranch()+';rport'
										    	}
										  }
									       
									    ],

									'Max-Forwards': '70',
							  		//contact: [ {uri : p_contact} ]
									// if your call doesnt get in-dialog request, maybe os.hostname() isn't
									// resolving in your ip address
								},
								content : ''
									
									
							};
							var s = sip.stringify(msg);

							console.log("processMOH_UNHOLD()...send msg:>>>\r\n"+s);

							
							proxy.send(msg);
							
							initFlag();
									
							
							
						} else {
							proxy.send(sip.makeRespinse(rq, 405, 'Method not allowed'));
						}
					}
				}
			}


			
		}
		
		
);

////////
myCseq += 1;
cseq_tag = myCseq;

///

var msg2 = {
			
			method : 'INVITE', ///'NOTIFY',
			uri : caller_uri,
			headers : {
				to : {
					uri : caller_uri,
					params : {
						tag : caller_to_tag
					}
				},
				from : {
					uri : callee_uri,
					params : {
						tag : from1_tag
					}
				},
				////'Alert-Info': 'ring-answer',
				'call-id' : call_id1,
				cseq : {
					method : 'INVITE',
					seq : cseq_tag
				},
				'content-type' : 'application/sdp',
				//'Content-Disposition' : 'signal;handling=required',
				//'Event': 'talk',
				//via : [],
				via :
					[ 
					  {
					    version: '2.0',
					    protocol: 'UDP',
					    host: HOST,
					    port: sip_port,
					    params: { 
					    	branch: generateBranch()+';rport'
					    	}
					  }
				       
				    ],

				
				contact : [ {
					uri : contact_uri
				} ]
			// if your call doesnt get in-dialog request, maybe os.hostname() isn't
			// resolving in your ip address
			},
			//content : 
			//	'<?xml version="1.0" encoding="UTF-8"?>\r\n'+
			//	'<RequestSystemStatus xmlns="http://www.ecma-international.org/standards/ecma-323/csta/ed3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"/>\r\n'
				

			content : hold2_sdp ///hold1_sdp
				
				
			
			
};

var s22 = sip.stringify(msg2);
console.log("processMOH_UNHOLD()...request:>>>\r\n" + s22);

	//
	// proxy.send(sip.makeRespinse(rq, 487, 'Request Terminated'));
	///

proxy.send(msg2,

	function(rs) {

		var s1 = sip.stringify(rs);
		console.log("processMOH_UNHOLD()...response:>>>\r\n"+s1);
		
		if (rs.status >= 300) {
			console.log('processMOH_UNHOLD()...call failed with status ' + rs.status);
			initFlag();

		} else if (rs.status < 200) {
			console.log('processMOH_UNHOLD()...call progress status ' + rs.status);

			console.log('processMOH_UNHOLD()...1xx with to-tag ' + rs.headers.to.params.tag);
			to1_tag = rs.headers.to.params.tag;

		} else {
			// yes we can get multiple 2xx response with different tags
			console.log('processMOH_UNHOLD()...call answered with tag ' + rs.headers.to.params.tag);

			//sdp2 = rs.content;
			//console.log('processMOH_UNHOLD()...sdp: \r\n' + rs.content);
			console.log('processMOH_UNHOLD()...call-id:' + rs.headers['call-id']);
			// call_id1 = rs.headers['call-id'];
			to1_tag = rs.headers.to.params.tag;
			
			cseq_tag = rs.headers.cseq.seq;
			console.log('processMOH_UNHOLD()...cseq:' + cseq_tag);

			// invite 2nd party....
			//InviteSecondParty(sdp1);
			//

			var id = [ rs.headers['call-id'], rs.headers.from.params.tag,
					rs.headers.to.params.tag ].join(':');

			console.log('processMOH_UNHOLD()...id ' + id);

			//hold_sdp = sdp1.replace('a=sendonly','a=sendrecv');

		    // sending ACK to 
			
		    proxy.send({
		      method: 'ACK',
		      uri: caller_uri,
		      headers: {
		        to: {uri: caller_uri, params: {tag: to1_tag}},
		        from: {uri: callee_uri, params: {tag: from1_tag} },
		        'call-id': call_id1,
		        cseq: {method: 'ACK', seq: cseq_tag },
		        contact: [{uri: contact_uri}],
			    //'Content-Type': 'application/sdp',
			    'Max-Forwards': '70',
		        //via: []
				via :
					[ 
					  {
					    version: '2.0',
					    protocol: 'UDP',
					    host: HOST,
					    port: sip_port,
					    params: { 
					    	branch: generateBranch()+';rport'
					    	}
					  }
				       
				    ],

		      },
		      content: '' ////hold2_sdp
		      
		    });
		    
			
		    
			


			// registring our 'dialog' which is just function to process
			// in-dialog
			// requests
			if (!dialogs[id]) {
				dialogs[id] = function(rq) {
					if (rq.method === 'BYE') {
						console.log('processMOH_UNHOLD...call received bye');

						delete dialogs[id];

						proxy.send(sip.makeResponse(rq, 200, 'Ok'));
						/// 1st party notify to 2nd party....
						var msg = {

							method : 'BYE',
							uri : caller_uri,
							headers : {
								to: {uri: caller_uri, params: {tag: to1_tag}},
								from: {uri : callee_uri, params : {tag: from1_tag}},
								'call-id': call_id1,
								cseq: {method: 'BYE', seq : 4},
								//'content-type': 'application/sdp',
								//via: [],
								via :
									[ 
									  {
									    version: '2.0',
									    protocol: 'UDP',
									    host: HOST,
									    port: sip_port,
									    params: { 
									    	branch: generateBranch()+';rport'
									    	}
									  }
								       
								    ],

								'Max-Forwards': '70',
						  		//contact: [ {uri : p_contact} ]
								// if your call doesnt get in-dialog request, maybe os.hostname() isn't
								// resolving in your ip address
							},
							content : ''
								
								
						};
						var s = sip.stringify(msg);

						console.log("processMOH_UNHOLD()...send msg:>>>\r\n"+s);

						
						proxy.send(msg);
						
						initFlag();
								
						
						
					} else {
						proxy.send(sip.makeRespinse(rq, 405, 'Method not allowed'));
					}
				}
			}
		}


		
	}

);

////send Bye

myCseq += 1;
cseq_tag = myCseq;


////
var msg3 = {

		method : 'BYE',
		uri : moh_uri,
		headers : {
			to: {uri: moh_uri, params: {tag: moh_tag}},
			from: {uri : callee_uri, params : {tag: from1_tag}},
			'call-id': call_id1,
			cseq: {method: 'BYE', seq : myCseq },
			//'content-type': 'application/sdp',
			//via: [],
			via :
				[ 
				  {
				    version: '2.0',
				    protocol: 'UDP',
				    host: HOST,
				    port: sip_port,
				    params: { 
				    	branch: generateBranch()+';rport'
				    	}
				  }
			       
			    ],

			
			'Max-Forwards': '70',
	  		//contact: [ {uri : p_contact} ]
			// if your call doesnt get in-dialog request, maybe os.hostname() isn't
			// resolving in your ip address
		},
		content : ''
				
				
	};
	var s3 = sip.stringify(msg3);

	console.log("processMOH_UNHOLD()...send msg3:>>>\r\n"+s3);

		
	proxy.send(msg3);

	
////	

}

///
function processMOH_HOLD(
		caller_uri,
		callee_uri,
		contact_uri,
		pai_uri
		)
{

////
	//hold2_sdp = sdp2.replace('a=sendrecv','a=recvonly');
	hold2_sdp = sdp2.replace('a=sendrecv','a=sendrecv');
	//hold2_sdp = sdp2.replace('a=sendrecv','a=sendonly');
	//hold2_sdp = sdp2.replace('a=sendrecv','a=inactive');
	//hold_sdp = '';
	console.log('processMOH_HOLD()....MOH_HOLD.....hold2_sdp='+hold2_sdp);

	myCseq += 1;
	cseq_tag = myCseq;
		
		
	var msg1 = {
				
				method : 'INVITE', ////'NOTIFY',
				uri : moh_uri, ///callee_uri
				headers : {
					to : {
						uri : moh_uri ////callee_uri
						//params : {
						//	tag : to1_tag
						//}
					},
					from : {
						uri : callee_uri, ////caller
						params : {
							tag : from1_tag
						}
					},
					////'Alert-Info': 'ring-answer',
					'call-id' : call_id1,
					cseq : {
						method : 'INVITE', ////'NOTIFY',
						seq : cseq_tag
					},
					'content-type' : 'application/sdp',
					//'Content-Disposition' : 'signal;handling=required',
					//'Event': 'hold',
					//via : [],
					via :
						[ 
						  {
						    version: '2.0',
						    protocol: 'UDP',
						    host: HOST,
						    port: sip_port,
						    params: { 
						    	branch: generateBranch()+';rport'
						    	}
						  }
					       
					    ],

					
					contact : [ {
						uri : contact_uri
					} ]
				// if your call doesnt get in-dialog request, maybe os.hostname() isn't
				// resolving in your ip address
				},
				//content : 
				//	'<?xml version="1.0" encoding="UTF-8"?>\r\n'+
				//	'<RequestSystemStatus xmlns="http://www.ecma-international.org/standards/ecma-323/csta/ed3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"/>\r\n'
					

				content : hold2_sdp
					
					
				
				
	};

	var s11 = sip.stringify(msg1);
	console.log("processMOH_HOLD()...request:>>>\r\n" + s11);

	///
	/// proxy.send(sip.makeRespinse(rq, 487, 'Request Terminated'));
	///

	proxy.send(msg1,
		
		function(rs) {

			var s1 = sip.stringify(rs);
			console.log("processMOH_HOLD()...response:>>>\r\n"+s1);
			
			if (rs.status >= 300) {
				console.log('processMOH_HOLD()...call failed with status ' + rs.status);
				initFlag();

			} else if (rs.status < 200) {
				console.log('processMOH_HOLD()...call progress status ' + rs.status);

				console.log('processMOH_HOLD()...1xx with to-tag ' + rs.headers.to.params.tag);
				to1_tag = rs.headers.to.params.tag;

			} else {
				// yes we can get multiple 2xx response with different tags
				console.log('processMOH_HOLD()...call answered with tag ' + rs.headers.to.params.tag);

				/// it will get 'recvonly'
				sdp2 = rs.content;
				console.log('processMOH_HOLD()...sdp: \r\n' + rs.content);
				console.log('processMOH_HOLD()...call-id:' + rs.headers['call-id']);
				// call_id1 = rs.headers['call-id'];
				//to1_tag = rs.headers.to.params.tag;
				to1_tag = rs.headers.to.params.tag;
				
				cseq_tag = rs.headers.cseq.seq;
				console.log('processMOH_HOLD()...cseq:' + cseq_tag);

				// invite 2nd party....
				//InviteSecondParty(sdp1);
				//

				var id = [ rs.headers['call-id'], rs.headers.from.params.tag,
						rs.headers.to.params.tag ].join(':');

				console.log('processMOH_HOLD()...id ' + id);
				
				//hold_sdp = sdp1.replace('a=sendrecv','a=sendonly');
				//hold_sdp = sdp1+'a=sendonly';

				
			    // sending ACK to
				moh_tag = to1_tag;
				
			    proxy.send({
			      method: 'ACK',
			      uri: moh_uri, ////callee
			      headers: {
			        to: {uri: moh_uri, params: {tag: to1_tag}},
			        from: {uri: callee_uri, params: {tag: from1_tag} },
			        'call-id': call_id1,
			        cseq: {method: 'ACK', seq: cseq_tag },
			        contact: [{uri: contact_uri}],
				    //'Content-Type': 'application/sdp',
				    'Max-Forwards': '70',
			        //via: []
					via :
						[ 
						  {
						    version: '2.0',
						    protocol: 'UDP',
						    host: HOST,
						    port: sip_port,
						    params: { 
						    	branch: generateBranch()+';rport'
						    	}
						  }
					       
					    ],

			        
			      },
			      content: '' ////sdp2 /////''
			      
			    });
			    

			    ////invite music on hold.....
			    
				InviteMOH_URI(
						sdp2,
						caller_uri,
						callee_uri,
						contact_uri,
						pai_uri
						);
				


				// registring our 'dialog' which is just function to process
				// in-dialog
				// requests
				if (!dialogs[id]) {
					dialogs[id] = function(rq) {
						if (rq.method === 'BYE') {
							console.log('processMOH_HOLD...call received bye');

							delete dialogs[id];

							proxy.send(sip.makeResponse(rq, 200, 'Ok'));
							/// 1st party notify to 2nd party....
							var msg = {

								method : 'BYE',
								uri : callee_uri,
								headers : {
									to: {uri: callee_uri, params: {tag: to1_tag}},
									from: {uri : caller_uri, params : {tag: from1_tag}},
									'call-id': call_id1,
									cseq: {method: 'BYE', seq : 4},
									//'content-type': 'application/sdp',
									//via: [],
									via :
										[ 
										  {
										    version: '2.0',
										    protocol: 'UDP',
										    host: HOST,
										    port: sip_port,
										    params: { 
										    	branch: generateBranch()+';rport'
										    	}
										  }
									       
									    ],

									
									'Max-Forwards': '70',
							  		//contact: [ {uri : p_contact} ]
									// if your call doesnt get in-dialog request, maybe os.hostname() isn't
									// resolving in your ip address
								},
								content : ''
									
									
							};
							var s = sip.stringify(msg);

							console.log("processMOH_HOLD()...send msg:>>>\r\n"+s);

							
							proxy.send(msg);
							
							initFlag();
									
							
							
						} else {
							proxy.send(sip.makeRespinse(rq, 405, 'Method not allowed'));
						}
					}
				}
			}


			
		}
		
		
	);
		
	////
	
	myCseq += 1;
	cseq_tag = myCseq;

	///////
	///hold1_sdp = sdp1.replace('a=sendrecv','a=sendonly');
	hold1_sdp = sdp1.replace('a=sendrecv','a=inactive');
	//hold_sdp = '';
	console.log('processMOH_HOLD()....MOH_HOLD.....hold1_sdp='+hold1_sdp);

	var msg2 = {
			
			method : 'INVITE', ////'NOTIFY',
			uri : caller_uri,
			headers : {
				to : {
					uri : caller_uri,
					params : {
						tag : caller_to_tag
					}
				},
				from : {
					uri : callee_uri,
					params : {
						tag : from1_tag
					}
				},
				////'Alert-Info': 'ring-answer',
				'call-id' : call_id1,
				cseq : {
					method : 'INVITE', ///'NOTIFY',
					seq : cseq_tag
				},
				'content-type' : 'application/sdp',
				//'Content-Disposition' : 'signal;handling=required',
				//'Event': 'hold',
				//via : [],
				via :
					[ 
					  {
					    version: '2.0',
					    protocol: 'UDP',
					    host: HOST,
					    port: sip_port,
					    params: { 
					    	branch: generateBranch()+';rport'
					    	}
					  }
				       
				    ],

				
				contact : [ {
					uri : contact_uri
				} ]
			// if your call doesnt get in-dialog request, maybe os.hostname() isn't
			// resolving in your ip address
			},
			//content : 
			//	'<?xml version="1.0" encoding="UTF-8"?>\r\n'+
			//	'<RequestSystemStatus xmlns="http://www.ecma-international.org/standards/ecma-323/csta/ed3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"/>\r\n'
				

			content : hold1_sdp
				
				
			
			
	};

	var s22 = sip.stringify(msg2);
	console.log("processMOH_HOLD().....MOH_HOLD.....request:>>>\r\n" + s22);

	//
	//proxy.send(sip.makeRespinse(rq, 487, 'Request Terminated'));
	///

	proxy.send(msg2,

	function(rs) {

		var s1 = sip.stringify(rs);
		console.log("processMOH_HOLD()...response:>>>\r\n"+s1);
		
		if (rs.status >= 300) {
			console.log('processMOH_HOLD()...call failed with status ' + rs.status);
			initFlag();

		} else if (rs.status < 200) {
			console.log('processMOH_HOLD()...call progress status ' + rs.status);

			console.log('processMOH_HOLD()...1xx with to-tag ' + rs.headers.to.params.tag);
			to1_tag = rs.headers.to.params.tag;

		} else {
			// yes we can get multiple 2xx response with different tags
			console.log('processMOH_HOLD()...call answered with tag ' + rs.headers.to.params.tag);

			sdp1 = rs.content;
			console.log('processMOH_HOLD()...sdp: \r\n' + rs.content);
			console.log('processMOH_HOLD()...call-id:' + rs.headers['call-id']);
			// call_id1 = rs.headers['call-id'];
			to1_tag = rs.headers.to.params.tag;
			
			cseq_tag = rs.headers.cseq.seq;
			console.log('processMOH_HOLD()...cseq:' + cseq_tag);

			// invite 2nd party....
			// InviteSecondParty(sdp1);
			//

			var id = [ rs.headers['call-id'], rs.headers.from.params.tag,
					rs.headers.to.params.tag ].join(':');

			console.log('processMOH_HOLD()...id ' + id);
			
			//hold_sdp = sdp1.replace('a=sendrecv','a=sendonly');
			//hold_sdp = sdp1+'a=sendonly';

			
		    // sending ACK to
			
		    proxy.send({
		      method: 'ACK',
		      uri: caller_uri,
		      headers: {
		        to: {uri: caller_uri, params: {tag: to1_tag}},
		        from: {uri: callee_uri, params: {tag: from1_tag} },
		        'call-id': call_id1,
		        cseq: {method: 'ACK', seq: cseq_tag },
		        contact: [{uri: callee_uri}],
			    //'Content-Type': 'application/sdp',
			    'Max-Forwards': '70',
		        //via: []
				via :
					[ 
					  {
					    version: '2.0',
					    protocol: 'UDP',
					    host: HOST,
					    port: sip_port,
					    params: { 
					    	branch: generateBranch()+';rport'
					    	}
					  }
				       
				    ],

		      },
		      content: '' 
		      
		    });
		    
		    
			


			// registring our 'dialog' which is just function to process
			// in-dialog
			// requests
			if (!dialogs[id]) {
				dialogs[id] = function(rq) {
					if (rq.method === 'BYE') {
						console.log('processMOH_HOLD()...call received bye');

						delete dialogs[id];

						proxy.send(sip.makeResponse(rq, 200, 'Ok'));
						/// 1st party notify to 2nd party....
						var msg = {

							method : 'BYE',
							uri : caller_uri,
							headers : {
								to: {uri: caller_uri, params: {tag: to1_tag}},
								from: {uri : callee_uri, params : {tag: from1_tag}},
								'call-id': call_id1,
								cseq: {method: 'BYE', seq : 4},
								//'content-type': 'application/sdp',
								//via: [],
								via :
									[ 
									  {
									    version: '2.0',
									    protocol: 'UDP',
									    host: HOST,
									    port: sip_port,
									    params: { 
									    	branch: generateBranch()+';rport'
									    	}
									  }
								       
								    ],

								'Max-Forwards': '70',
						  		//contact: [ {uri : p_contact} ]
								// if your call doesnt get in-dialog request, maybe os.hostname() isn't
								// resolving in your ip address
							},
							content : ''
								
								
						};
						var s = sip.stringify(msg);

						console.log("processMOH_HOLD()...send msg:>>>\r\n"+s);

						
						proxy.send(msg);
						
						initFlag();
								
						
						
					} else {
						proxy.send(sip.makeRespinse(rq, 405, 'Method not allowed'));
					}
				}
			}
		}


		
	}


);

	
////
	
}


function processOPTIONS_1(
		caller_uri,
		callee_uri,
		contact_uri,
		pai_uri
		
	)
{
	
	console.log('Trying to do OPTIONS....');

	//myCseq += 1;
	//cseq_tag = myCseq;
	
	var my_callid=getNewCallId();
	var my_cseq = 101;
	var my_from_tag = 12348888;
		
		
	var msg1 = {
				
				method : 'OPTIONS', 
				uri : callee_uri,
				headers : {
					to : {uri : callee_uri}, ////params : {tag : callee_to_tag}},
					from : {uri : caller_uri, params : {tag : my_from_tag}},
					////'Alert-Info': 'ring-answer',
					'call-id' : my_callid,
					cseq : {method : 'OPTIONS',seq : my_cseq},
					//'content-type' : 'application/sdp',
					//'Content-Disposition' : 'signal;handling=required',
					//'Event': 'hold',
					//via : [],
					via :
						[ 
						  {
						    version: '2.0',
						    protocol: 'UDP',
						    host: HOST,
						    port: sip_port,
						    params: { 
						    	branch: generateBranch()+';rport'
						    	}
						  }
					       
					    ],

					
					contact : [ {uri : contact_uri} ]
				// if your call doesnt get in-dialog request, maybe os.hostname() isn't
				// resolving in your ip address
				},
				//content : 
				//	'<?xml version="1.0" encoding="UTF-8"?>\r\n'+
				//	'<RequestSystemStatus xmlns="http://www.ecma-international.org/standards/ecma-323/csta/ed3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"/>\r\n'
					

				content : '' ///user_app_info ///ivr_app_sdp ///'Data=12345678' //sdp1+ivr_app_sdp
					
					
				
				
	};

	var s11 = sip.stringify(msg1);
	console.log("processOPTIONS_1()...request:>>>\r\n" + s11);

	//
	// proxy.send(sip.makeRespinse(rq, 487, 'Request Terminated'));
	///

	proxy.send(msg1,
		
		function(rs) {

			var s1 = sip.stringify(rs);
			console.log("processOPTIONS_1()...response:>>>\r\n"+s1);
			
			if (rs.status >= 300) {
				console.log('processOPTIONS_1()...call failed with status ' + rs.status);
				initFlag();

			} else if (rs.status < 200) {
				console.log('processOPTIONS_1()...call progress status ' + rs.status);

				console.log('processOPTIONS_1()...1xx with to-tag ' + rs.headers.to.params.tag);
				//to1_tag = rs.headers.to.params.tag;

			} else {
				// yes we can get multiple 2xx response with different tags
				console.log('processOPTIONS_1()...call answered with tag ' + rs.headers.to.params.tag);

				/// it will get 'recvonly'
				//sdp2 = rs.content;
				//console.log('processOPTIONS_1()...sdp: \r\n' + rs.content);
				console.log('processOPTIONS_1()...call-id:' + rs.headers['call-id']);
				// call_id1 = rs.headers['call-id'];
				
				//to1_tag = rs.headers.to.params.tag;
				
				//cseq_tag = rs.headers.cseq.seq;
				//console.log('processOPTIONS_1()...cseq:' + cseq_tag);

				// invite 2nd party....
				//InviteSecondParty(sdp1);
				//

				var id = [ rs.headers['call-id'], rs.headers.from.params.tag,
						rs.headers.to.params.tag ].join(':');

				console.log('processOPTIONS_1()...id ' + id);
				
				//hold_sdp = sdp1.replace('a=sendrecv','a=sendonly');
				//hold_sdp = sdp1+'a=sendonly';

				
			    // sending ACK to
				/*
			    proxy.send({
			      method: 'ACK',
			      uri: callee_uri,
			      headers: {
			        to: {uri: callee_uri, params: {tag: to1_tag}},
			        from: {uri: caller_uri, params: {tag: from1_tag} },
			        'call-id': call_id1,
			        cseq: {method: 'ACK', seq: cseq_tag },
			        contact: [{uri: contact_uri}],
				    //'Content-Type': 'application/sdp',
				    'Max-Forwards': '70',
			        via: []
			        
			      },
			      content: ''
			      
			    });*/
				
			    
			    
				


				// registring our 'dialog' which is just function to process
				// in-dialog
				// requests
				if (!dialogs[id]) {
					dialogs[id] = function(rq) {
						if (rq.method === 'BYE') {
							console.log('processOPTIONS_1()...call received bye');

							delete dialogs[id];

							proxy.send(sip.makeResponse(rq, 200, 'Ok'));
							/// 1st party notify to 2nd party....
							var msg = {

								method : 'BYE',
								uri : callee_uri,
								headers : {
									to: {uri: callee_uri, params: {tag: to1_tag}},
									from: {uri : caller_uri, params : {tag: from1_tag}},
									'call-id': call_id1,
									cseq: {method: 'BYE', seq : rstring() },
									//'content-type': 'application/sdp',
									//via: [],
									via :
										[ 
										  {
										    version: '2.0',
										    protocol: 'UDP',
										    host: HOST,
										    port: sip_port,
										    params: { 
										    	branch: generateBranch()+';rport'
										    	}
										  }
									       
									    ],

									'Max-Forwards': '70',
							  		//contact: [ {uri : p_contact} ]
									// if your call doesnt get in-dialog request, maybe os.hostname() isn't
									// resolving in your ip address
								},
								content : ''
									
									
							};
							var s = sip.stringify(msg);

							console.log("processOPTIONS_1()...send msg:>>>\r\n"+s);

							
							proxy.send(msg);
							
							initFlag();
									
							
							
						} else {
							proxy.send(sip.makeRespinse(rq, 405, 'Method not allowed'));
						}
					}
				}
			}


			
		}
		
		
	);

	//////

	var msg2 = {
			
			method : 'OPTIONS', 
			uri : caller_uri,
			headers : {
				to : {uri : caller_uri},	////params : {tag : caller_to_tag}},
				from : {uri : callee_uri, params : {tag : my_from_tag}},
				////'Alert-Info': 'ring-answer',
				'call-id' : my_callid,
				cseq : {method : 'OPTIONS', seq : my_cseq },
				//'content-type' : 'application/sdp',
				//'Content-Disposition' : 'signal;handling=required',
				//'Event': 'hold',
				//via : [],
				via :
					[ 
					  {
					    version: '2.0',
					    protocol: 'UDP',
					    host: HOST,
					    port: sip_port,
					    params: { 
					    	branch: generateBranch()+';rport'
					    	}
					  }
				       
				    ],

				
				contact : [ {uri : contact_uri} ]
			// if your call doesnt get in-dialog request, maybe os.hostname() isn't
			// resolving in your ip address
			},
			//content : 
			//	'<?xml version="1.0" encoding="UTF-8"?>\r\n'+
			//	'<RequestSystemStatus xmlns="http://www.ecma-international.org/standards/ecma-323/csta/ed3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"/>\r\n'
				

			content : '' ///user_app_info ////cti_app_sdp ///'Data=qwertyuioplkjhgfdsabcnd' ////sdp2+cti_app_sdp
				
				
			
			
	};

	var s22 = sip.stringify(msg2);
	console.log("processOPTIONS_1()...request:>>>\r\n" + s22);

	//
	//proxy.send(sip.makeRespinse(rq, 487, 'Request Terminated'));
	///

	proxy.send(msg2,

	function(rs) {

		var s1 = sip.stringify(rs);
		console.log("processOPTIONS_1()...response:>>>\r\n"+s1);
		
		if (rs.status >= 300) {
			console.log('processOPTIONS_1()...call failed with status ' + rs.status);
			initFlag();

		} else if (rs.status < 200) {
			console.log('processOPTIONS_1()...call progress status ' + rs.status);

			console.log('processOPTIONS_1()...1xx with to-tag ' + rs.headers.to.params.tag);
			//to1_tag = rs.headers.to.params.tag;

		} else {
			// yes we can get multiple 2xx response with different tags
			console.log('processOPTIONS_1()...call answered with tag ' + rs.headers.to.params.tag);

			//sdp1 = rs.content;
			//console.log('processOPTIONS_1()...sdp: \r\n' + rs.content);
			console.log('processOPTIONS_1()...call-id:' + rs.headers['call-id']);
			// call_id1 = rs.headers['call-id'];
			//to1_tag = rs.headers.to.params.tag;
			
			//cseq_tag = rs.headers.cseq.seq;
			//console.log('processOPTIONS_1()...cseq:' + cseq_tag);

			// invite 2nd party....
			//InviteSecondParty(sdp1);
			//

			var id = [ rs.headers['call-id'], rs.headers.from.params.tag,
					rs.headers.to.params.tag ].join(':');

			console.log('processOPTIONS_1()...id ' + id);
			
			//hold_sdp = sdp1.replace('a=sendrecv','a=sendonly');
			//hold_sdp = sdp1+'a=sendonly';

			
		    // sending ACK to
			/*
		    proxy.send({
		      method: 'ACK',
		      uri: caller_uri,
		      headers: {
		        to: {uri: caller_uri, params: {tag: to1_tag}},
		        from: {uri: callee_uri, params: {tag: from1_tag} },
		        'call-id': call_id1,
		        cseq: {method: 'ACK', seq: cseq_tag },
		        contact: [{uri: callee_uri}],
			    //'Content-Type': 'application/sdp',
			    'Max-Forwards': '70',
		        via: []
		      },
		      content: '' 
		      
		    });*/
			
		    
		    
			


			// registring our 'dialog' which is just function to process
			// in-dialog
			// requests
			if (!dialogs[id]) {
				dialogs[id] = function(rq) {
					if (rq.method === 'BYE') {
						console.log('processOPTIONS_1()...call received bye');

						delete dialogs[id];

						proxy.send(sip.makeResponse(rq, 200, 'Ok'));
						/// 1st party notify to 2nd party....
						var msg = {

							method : 'BYE',
							uri : caller_uri,
							headers : {
								to: {uri: caller_uri, params: {tag: to1_tag}},
								from: {uri : callee_uri, params : {tag: from1_tag}},
								'call-id': call_id1,
								cseq: {method: 'BYE', seq : rstring() },
								//'content-type': 'application/sdp',
								//via: [],
								via :
									[ 
									  {
									    version: '2.0',
									    protocol: 'UDP',
									    host: HOST,
									    port: sip_port,
									    params: { 
									    	branch: generateBranch()+';rport'
									    	}
									  }
								       
								    ],

								'Max-Forwards': '70',
						  		//contact: [ {uri : p_contact} ]
								// if your call doesnt get in-dialog request, maybe os.hostname() isn't
								// resolving in your ip address
							},
							content : ''
								
								
						};
						var s = sip.stringify(msg);

						console.log("processOPTIONS_1()...send msg:>>>\r\n"+s);

						
						proxy.send(msg);
						
						initFlag();
								
						
						
					} else {
						proxy.send(sip.makeRespinse(rq, 405, 'Method not allowed'));
					}
				}
			}
		}


		
	}


	);
	
	
}


function processSIP_INFO_1(
		caller_uri,
		callee_uri,
		contact_uri,
		pai_uri
		
	)
{

	console.log('Trying to do SIP_INFO_1....');

	myCseq += 1;
	cseq_tag = myCseq;
		
		
	var msg1 = {
				
				method : 'INFO', 
				uri : callee_uri,
				headers : {
					to : {uri : callee_uri, params : {tag : callee_to_tag}},
					from : {uri : caller_uri, params : {tag : from1_tag}},
					////'Alert-Info': 'ring-answer',
					'call-id' : call_id1,
					cseq : {method : 'INFO',seq : cseq_tag},
					'content-type' : 'application/sdp',
					//'Content-Disposition' : 'signal;handling=required',
					//'Event': 'hold',
					//via : [],
					via :
						[ 
						  {
						    version: '2.0',
						    protocol: 'UDP',
						    host: HOST,
						    port: sip_port,
						    params: { 
						    	branch: generateBranch()+';rport'
						    	}
						  }
					       
					    ],

					
					contact : [ {uri : contact_uri} ]
				// if your call doesnt get in-dialog request, maybe os.hostname() isn't
				// resolving in your ip address
				},
				//content : 
				//	'<?xml version="1.0" encoding="UTF-8"?>\r\n'+
				//	'<RequestSystemStatus xmlns="http://www.ecma-international.org/standards/ecma-323/csta/ed3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"/>\r\n'
					

				content : ivr_app_sdp ///'Data=12345678' //sdp1+ivr_app_sdp
					
					
				
				
	};

	var s11 = sip.stringify(msg1);
	console.log("processSIP_INFO_1()...Request:>>>\r\n" + s11);

	//
	// proxy.send(sip.makeRespinse(rq, 487, 'Request Terminated'));
	///

	proxy.send(msg1,
		
		function(rs) {

			var s1 = sip.stringify(rs);
			console.log("processSIP_INFO_1()...response:>>>\r\n"+s1);
			
			if (rs.status >= 300) {
				console.log('processSIP_INFO_1()...call failed with status ' + rs.status);
				initFlag();

			} else if (rs.status < 200) {
				console.log('processSIP_INFO_1()...call progress status ' + rs.status);

				console.log('processSIP_INFO_1()...1xx with to-tag ' + rs.headers.to.params.tag);
				to1_tag = rs.headers.to.params.tag;

			} else {
				// yes we can get multiple 2xx response with different tags
				console.log('processSIP_INFO_1()...call answered with tag ' + rs.headers.to.params.tag);

				/// it will get 'recvonly'
				sdp2 = rs.content;
				console.log('processSIP_INFO_1()...sdp: \r\n' + rs.content);
				console.log('processSIP_INFO_1()...call-id:' + rs.headers['call-id']);
				// call_id1 = rs.headers['call-id'];
				to1_tag = rs.headers.to.params.tag;
				
				cseq_tag = rs.headers.cseq.seq;
				console.log('processSIP_INFO_1()...cseq:' + cseq_tag);

				// invite 2nd party....
				//InviteSecondParty(sdp1);
				//

				var id = [ rs.headers['call-id'], rs.headers.from.params.tag,
						rs.headers.to.params.tag ].join(':');

				console.log('processSIP_INFO_1()...id ' + id);
				
				//hold_sdp = sdp1.replace('a=sendrecv','a=sendonly');
				//hold_sdp = sdp1+'a=sendonly';

				
			    // sending ACK to
				
			    proxy.send({
			      method: 'ACK',
			      uri: callee_uri,
			      headers: {
			        to: {uri: callee_uri, params: {tag: to1_tag}},
			        from: {uri: caller_uri, params: {tag: from1_tag} },
			        'call-id': call_id1,
			        cseq: {method: 'ACK', seq: cseq_tag },
			        contact: [{uri: contact_uri}],
				    //'Content-Type': 'application/sdp',
				    'Max-Forwards': '70',
			        //via: []
					via :
						[ 
						  {
						    version: '2.0',
						    protocol: 'UDP',
						    host: HOST,
						    port: sip_port,
						    params: { 
						    	branch: generateBranch()+';rport'
						    	}
						  }
					       
					    ],

			      },
			      content: ''
			      
			    });
			    
			    
				


				// registring our 'dialog' which is just function to process
				// in-dialog
				// requests
				if (!dialogs[id]) {
					dialogs[id] = function(rq) {
						if (rq.method === 'BYE') {
							console.log('processSIP_INFO_1()...call received bye');

							delete dialogs[id];

							proxy.send(sip.makeResponse(rq, 200, 'Ok'));
							/// 1st party notify to 2nd party....
							var msg = {

								method : 'BYE',
								uri : callee_uri,
								headers : {
									to: {uri: callee_uri, params: {tag: to1_tag}},
									from: {uri : caller_uri, params : {tag: from1_tag}},
									'call-id': call_id1,
									cseq: {method: 'BYE', seq : rstring() },
									//'content-type': 'application/sdp',
									//via: [],
									via :
										[ 
										  {
										    version: '2.0',
										    protocol: 'UDP',
										    host: HOST,
										    port: sip_port,
										    params: { 
										    	branch: generateBranch()+';rport'
										    	}
										  }
									       
									    ],

									'Max-Forwards': '70',
							  		//contact: [ {uri : p_contact} ]
									// if your call doesnt get in-dialog request, maybe os.hostname() isn't
									// resolving in your ip address
								},
								content : ''
									
									
							};
							var s = sip.stringify(msg);

							console.log("processSIP_INFO_1()...send msg:>>>\r\n"+s);

							
							proxy.send(msg);
							
							initFlag();
									
							
							
						} else {
							proxy.send(sip.makeRespinse(rq, 405, 'Method not allowed'));
						}
					}
				}
			}


			
		}
		
		
	);

	//////

	var msg2 = {
			
			method : 'INFO', 
			uri : caller_uri,
			headers : {
				to : {uri : caller_uri,	params : {tag : caller_to_tag}},
				from : {uri : callee_uri, params : {tag : from1_tag}},
				////'Alert-Info': 'ring-answer',
				'call-id' : call_id1,
				cseq : {method : 'INFO', seq : cseq_tag },
				'content-type' : 'application/sdp',
				//'Content-Disposition' : 'signal;handling=required',
				//'Event': 'hold',
				//via : [],
				via :
					[ 
					  {
					    version: '2.0',
					    protocol: 'UDP',
					    host: HOST,
					    port: sip_port,
					    params: { 
					    	branch: generateBranch()+';rport'
					    	}
					  }
				       
				    ],

				
				contact : [ {uri : contact_uri} ]
			// if your call doesnt get in-dialog request, maybe os.hostname() isn't
			// resolving in your ip address
			},
			//content : 
			//	'<?xml version="1.0" encoding="UTF-8"?>\r\n'+
			//	'<RequestSystemStatus xmlns="http://www.ecma-international.org/standards/ecma-323/csta/ed3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"/>\r\n'
				

			content : cti_app_sdp ///'Data=qwertyuioplkjhgfdsabcnd' ////sdp2+cti_app_sdp
				
				
			
			
	};

	var s22 = sip.stringify(msg2);
	console.log("processSIP_INFO_1()...request:>>>\r\n" + s22);

	//
	//proxy.send(sip.makeRespinse(rq, 487, 'Request Terminated'));
	///

	proxy.send(msg2,

	function(rs) {

		var s1 = sip.stringify(rs);
		console.log("processSIP_INFO_1()...response:>>>\r\n"+s1);
		
		if (rs.status >= 300) {
			console.log('processSIP_INFO_1()...call failed with status ' + rs.status);
			initFlag();

		} else if (rs.status < 200) {
			console.log('processSIP_INFO_1()...call progress status ' + rs.status);

			console.log('processSIP_INFO_1()...1xx with to-tag ' + rs.headers.to.params.tag);
			to1_tag = rs.headers.to.params.tag;

		} else {
			// yes we can get multiple 2xx response with different tags
			console.log('processSIP_INFO_1()...call answered with tag ' + rs.headers.to.params.tag);

			sdp1 = rs.content;
			console.log('processSIP_INFO_1()...sdp: \r\n' + rs.content);
			console.log('processSIP_INFO_1()...call-id:' + rs.headers['call-id']);
			// call_id1 = rs.headers['call-id'];
			to1_tag = rs.headers.to.params.tag;
			
			cseq_tag = rs.headers.cseq.seq;
			console.log('processSIP_INFO_1()...cseq:' + cseq_tag);

			// invite 2nd party....
			//InviteSecondParty(sdp1);
			//

			var id = [ rs.headers['call-id'], rs.headers.from.params.tag,
					rs.headers.to.params.tag ].join(':');

			console.log('processSIP_INFO_1()...id ' + id);
			
			//hold_sdp = sdp1.replace('a=sendrecv','a=sendonly');
			//hold_sdp = sdp1+'a=sendonly';

			
		    // sending ACK to
			
		    proxy.send({
		      method: 'ACK',
		      uri: caller_uri,
		      headers: {
		        to: {uri: caller_uri, params: {tag: to1_tag}},
		        from: {uri: callee_uri, params: {tag: from1_tag} },
		        'call-id': call_id1,
		        cseq: {method: 'ACK', seq: cseq_tag },
		        contact: [{uri: callee_uri}],
			    //'Content-Type': 'application/sdp',
			    'Max-Forwards': '70',
		        //via: []
				via :
					[ 
					  {
					    version: '2.0',
					    protocol: 'UDP',
					    host: HOST,
					    port: sip_port,
					    params: { 
					    	branch: generateBranch()+';rport'
					    	}
					  }
				       
				    ],

		      },
		      content: '' 
		      
		    });
		    
		    
			


			// registring our 'dialog' which is just function to process
			// in-dialog
			// requests
			if (!dialogs[id]) {
				dialogs[id] = function(rq) {
					if (rq.method === 'BYE') {
						console.log('processSIP_INFO_1()...call received bye');

						delete dialogs[id];

						proxy.send(sip.makeResponse(rq, 200, 'Ok'));
						/// 1st party notify to 2nd party....
						var msg = {

							method : 'BYE',
							uri : caller_uri,
							headers : {
								to: {uri: caller_uri, params: {tag: to1_tag}},
								from: {uri : callee_uri, params : {tag: from1_tag}},
								'call-id': call_id1,
								cseq: {method: 'BYE', seq : rstring() },
								//'content-type': 'application/sdp',
								//via: [],
								via :
									[ 
									  {
									    version: '2.0',
									    protocol: 'UDP',
									    host: HOST,
									    port: sip_port,
									    params: { 
									    	branch: generateBranch()+';rport'
									    	}
									  }
								       
								    ],

								'Max-Forwards': '70',
						  		//contact: [ {uri : p_contact} ]
								// if your call doesnt get in-dialog request, maybe os.hostname() isn't
								// resolving in your ip address
							},
							content : ''
								
								
						};
						var s = sip.stringify(msg);

						console.log("processSIP_INFO_1()...send msg:>>>\r\n"+s);

						
						proxy.send(msg);
						
						initFlag();
								
						
						
					} else {
						proxy.send(sip.makeRespinse(rq, 405, 'Method not allowed'));
					}
				}
			}
		}


		
	}


	);
	
	
}



function processSIP_INFO_2(
		caller_uri,
		callee_uri,
		contact_uri,
		pai_uri
		
	)
{

	console.log('Trying to do SIP_INFO_2....');

	myCseq += 1;
	cseq_tag = myCseq;
		
		
	var msg1 = {
				
				method : 'INFO', 
				uri : callee_uri,
				headers : {
					to : {uri : callee_uri, params : {tag : callee_to_tag}},
					from : {uri : caller_uri, params : {tag : from1_tag}},
					////'Alert-Info': 'ring-answer',
					'subject' : 'show me the money',
					'call-id' : call_id1,
					cseq : {method : 'INFO',seq : cseq_tag},
					'content-type' : 'text/plain',
					//'Content-Disposition' : 'signal;handling=required',
					//'Event': 'hold',
					//via : [],
					via :
						[ 
						  {
						    version: '2.0',
						    protocol: 'UDP',
						    host: HOST,
						    port: sip_port,
						    params: { 
						    	branch: generateBranch()+';rport'
						    	}
						  }
					       
					    ],

					
					contact : [ {uri : contact_uri} ]
				// if your call doesnt get in-dialog request, maybe os.hostname() isn't
				// resolving in your ip address
				},
				//content : 
				//	'<?xml version="1.0" encoding="UTF-8"?>\r\n'+
				//	'<RequestSystemStatus xmlns="http://www.ecma-international.org/standards/ecma-323/csta/ed3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"/>\r\n'
					

				content : user_app_info ///ivr_app_sdp ///'Data=12345678' //sdp1+ivr_app_sdp
					
					
				
				
	};

	var s11 = sip.stringify(msg1);
	console.log("processSIP_INFO_2()...request:>>>\r\n" + s11);

	//
	// proxy.send(sip.makeRespinse(rq, 487, 'Request Terminated'));
	///

	proxy.send(msg1,
		
		function(rs) {

			var s1 = sip.stringify(rs);
			console.log("processSIP_INFO_2()...response:>>>\r\n"+s1);
			
			if (rs.status >= 300) {
				console.log('processSIP_INFO_2()...call failed with status ' + rs.status);
				initFlag();

			} else if (rs.status < 200) {
				console.log('processSIP_INFO_2()...call progress status ' + rs.status);

				console.log('processSIP_INFO_2()...1xx with to-tag ' + rs.headers.to.params.tag);
				to1_tag = rs.headers.to.params.tag;

			} else {
				// yes we can get multiple 2xx response with different tags
				console.log('processSIP_INFO_2()...call answered with tag ' + rs.headers.to.params.tag);

				/// it will get 'recvonly'
				sdp2 = rs.content;
				console.log('processSIP_INFO_2()...sdp: \r\n' + rs.content);
				console.log('processSIP_INFO_2()...call-id:' + rs.headers['call-id']);
				// call_id1 = rs.headers['call-id'];
				to1_tag = rs.headers.to.params.tag;
				
				cseq_tag = rs.headers.cseq.seq;
				console.log('processSIP_INFO_2()...cseq:' + cseq_tag);

				// invite 2nd party....
				//InviteSecondParty(sdp1);
				//

				var id = [ rs.headers['call-id'], rs.headers.from.params.tag,
						rs.headers.to.params.tag ].join(':');

				console.log('processSIP_INFO_2()...id ' + id);
				
				//hold_sdp = sdp1.replace('a=sendrecv','a=sendonly');
				//hold_sdp = sdp1+'a=sendonly';

				
			    // sending ACK to
				
			    proxy.send({
			      method: 'ACK',
			      uri: callee_uri,
			      headers: {
			        to: {uri: callee_uri, params: {tag: to1_tag}},
			        from: {uri: caller_uri, params: {tag: from1_tag} },
			        'call-id': call_id1,
			        cseq: {method: 'ACK', seq: cseq_tag },
			        contact: [{uri: contact_uri}],
				    //'Content-Type': 'application/sdp',
				    'Max-Forwards': '70',
			        //via: []
					via :
						[ 
						  {
						    version: '2.0',
						    protocol: 'UDP',
						    host: HOST,
						    port: sip_port,
						    params: { 
						    	branch: generateBranch()+';rport'
						    	}
						  }
					       
					    ],

			      },
			      content: ''
			      
			    });
			    
			    
				


				// registring our 'dialog' which is just function to process
				// in-dialog
				// requests
				if (!dialogs[id]) {
					dialogs[id] = function(rq) {
						if (rq.method === 'BYE') {
							console.log('processSIP_INFO_2()...call received bye');

							delete dialogs[id];

							proxy.send(sip.makeResponse(rq, 200, 'Ok'));
							/// 1st party notify to 2nd party....
							var msg = {

								method : 'BYE',
								uri : callee_uri,
								headers : {
									to: {uri: callee_uri, params: {tag: to1_tag}},
									from: {uri : caller_uri, params : {tag: from1_tag}},
									'call-id': call_id1,
									cseq: {method: 'BYE', seq : rstring() },
									//'content-type': 'application/sdp',
									//via: [],
									via :
										[ 
										  {
										    version: '2.0',
										    protocol: 'UDP',
										    host: HOST,
										    port: sip_port,
										    params: { 
										    	branch: generateBranch()+';rport'
										    	}
										  }
									       
									    ],

									
									'Max-Forwards': '70',
							  		//contact: [ {uri : p_contact} ]
									// if your call doesnt get in-dialog request, maybe os.hostname() isn't
									// resolving in your ip address
								},
								content : ''
									
									
							};
							var s = sip.stringify(msg);

							console.log("processSIP_INFO_2()...send msg:>>>\r\n"+s);

							
							proxy.send(msg);
							
							initFlag();
									
							
							
						} else {
							proxy.send(sip.makeRespinse(rq, 405, 'Method not allowed'));
						}
					}
				}
			}


			
		}
		
		
	);

	//////

	var msg2 = {
			
			method : 'INFO', 
			uri : caller_uri,
			headers : {
				to : {uri : caller_uri,	params : {tag : caller_to_tag}},
				from : {uri : callee_uri, params : {tag : from1_tag}},
				////'Alert-Info': 'ring-answer',
				'subject' : 'show me the money',
				'call-id' : call_id1,
				cseq : {method : 'INFO', seq : cseq_tag },
				'content-type' : 'text/plain',
				//'Content-Disposition' : 'signal;handling=required',
				//'Event': 'hold',
				//via : [],
				via :
					[ 
					  {
					    version: '2.0',
					    protocol: 'UDP',
					    host: HOST,
					    port: sip_port,
					    params: { 
					    	branch: generateBranch()+';rport'
					    	}
					  }
				       
				    ],

				
				contact : [ {uri : contact_uri} ]
			// if your call doesnt get in-dialog request, maybe os.hostname() isn't
			// resolving in your ip address
			},
			//content : 
			//	'<?xml version="1.0" encoding="UTF-8"?>\r\n'+
			//	'<RequestSystemStatus xmlns="http://www.ecma-international.org/standards/ecma-323/csta/ed3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"/>\r\n'
				

			content : user_app_info ////cti_app_sdp ///'Data=qwertyuioplkjhgfdsabcnd' ////sdp2+cti_app_sdp
				
				
			
			
	};

	var s22 = sip.stringify(msg2);
	console.log("processSIP_INFO_2()...request:>>>\r\n" + s22);

	//
	//proxy.send(sip.makeRespinse(rq, 487, 'Request Terminated'));
	///

	proxy.send(msg2,

	function(rs) {

		var s1 = sip.stringify(rs);
		console.log("processSIP_INFO_2()...response:>>>\r\n"+s1);
		
		if (rs.status >= 300) {
			console.log('processSIP_INFO_2()...call failed with status ' + rs.status);
			initFlag();

		} else if (rs.status < 200) {
			console.log('processSIP_INFO_2()...call progress status ' + rs.status);

			console.log('processSIP_INFO_2()...1xx with to-tag ' + rs.headers.to.params.tag);
			to1_tag = rs.headers.to.params.tag;

		} else {
			// yes we can get multiple 2xx response with different tags
			console.log('processSIP_INFO_2()...call answered with tag ' + rs.headers.to.params.tag);

			sdp1 = rs.content;
			console.log('processSIP_INFO_2()...sdp: \r\n' + rs.content);
			console.log('processSIP_INFO_2()...call-id:' + rs.headers['call-id']);
			// call_id1 = rs.headers['call-id'];
			to1_tag = rs.headers.to.params.tag;
			
			cseq_tag = rs.headers.cseq.seq;
			console.log('processSIP_INFO_2()...cseq:' + cseq_tag);

			// invite 2nd party....
			//InviteSecondParty(sdp1);
			//

			var id = [ rs.headers['call-id'], rs.headers.from.params.tag,
					rs.headers.to.params.tag ].join(':');

			console.log('processSIP_INFO_2()...id ' + id);
			
			//hold_sdp = sdp1.replace('a=sendrecv','a=sendonly');
			//hold_sdp = sdp1+'a=sendonly';

			
		    // sending ACK to
			
		    proxy.send({
		      method: 'ACK',
		      uri: caller_uri,
		      headers: {
		        to: {uri: caller_uri, params: {tag: to1_tag}},
		        from: {uri: callee_uri, params: {tag: from1_tag} },
		        'call-id': call_id1,
		        cseq: {method: 'ACK', seq: cseq_tag },
		        contact: [{uri: callee_uri}],
			    //'Content-Type': 'application/sdp',
			    'Max-Forwards': '70',
		        //via: []
				via :
					[ 
					  {
					    version: '2.0',
					    protocol: 'UDP',
					    host: HOST,
					    port: sip_port,
					    params: { 
					    	branch: generateBranch()+';rport'
					    	}
					  }
				       
				    ],

		      },
		      content: '' 
		      
		    });
		    
		    
			


			// registring our 'dialog' which is just function to process
			// in-dialog
			// requests
			if (!dialogs[id]) {
				dialogs[id] = function(rq) {
					if (rq.method === 'BYE') {
						console.log('processSIP_INFO_2()...call received bye');

						delete dialogs[id];

						proxy.send(sip.makeResponse(rq, 200, 'Ok'));
						/// 1st party notify to 2nd party....
						var msg = {

							method : 'BYE',
							uri : caller_uri,
							headers : {
								to: {uri: caller_uri, params: {tag: to1_tag}},
								from: {uri : callee_uri, params : {tag: from1_tag}},
								'call-id': call_id1,
								cseq: {method: 'BYE', seq : rstring() },
								//'content-type': 'application/sdp',
								//via: [],
								via :
									[ 
									  {
									    version: '2.0',
									    protocol: 'UDP',
									    host: HOST,
									    port: sip_port,
									    params: { 
									    	branch: generateBranch()+';rport'
									    	}
									  }
								       
								    ],

								'Max-Forwards': '70',
						  		//contact: [ {uri : p_contact} ]
								// if your call doesnt get in-dialog request, maybe os.hostname() isn't
								// resolving in your ip address
							},
							content : ''
								
								
						};
						var s = sip.stringify(msg);

						console.log("processSIP_INFO_2()...send msg:>>>\r\n"+s);

						
						proxy.send(msg);
						
						initFlag();
								
						
						
					} else {
						proxy.send(sip.makeRespinse(rq, 405, 'Method not allowed'));
					}
				}
			}
		}


		
	}


	);
	
	
}


function processRE_INVITE_1(
		caller_uri,
		callee_uri,
		contact_uri,
		pai_uri
	
		)
{

console.log('Trying to do RE_INVITE_1....');

if(TimerID===null)
	{
		//TimerStart(timer_test,1000);
	}


myCseq += 1;
cseq_tag = myCseq;
	
	
var msg1 = {
			
			method : 'INVITE', 
			uri : callee_uri,
			headers : {
				to : {uri : callee_uri,	params : {tag : callee_to_tag}},
				from : {uri : caller_uri, params : {tag : from1_tag}},
				////'Alert-Info': 'ring-answer',
				'call-id' : call_id1,
				cseq : {method : 'INVITE',seq : cseq_tag},
				'content-type' : 'application/sdp',
				//'Content-Disposition' : 'signal;handling=required',
				//'Event': 'hold',
				//via : [],
				via :
					[ 
					  {
					    version: '2.0',
					    protocol: 'UDP',
					    host: HOST,
					    port: sip_port,
					    params: { 
					    	branch: generateBranch()+';rport'
					    	}
					  }
				       
				    ],

				
				contact : [ {uri : contact_uri} ]
			// if your call doesnt get in-dialog request, maybe os.hostname() isn't
			// resolving in your ip address
			},
			//content : 
			//	'<?xml version="1.0" encoding="UTF-8"?>\r\n'+
			//	'<RequestSystemStatus xmlns="http://www.ecma-international.org/standards/ecma-323/csta/ed3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"/>\r\n'
				

			content : sdp1+ivr_app_sdp
				
				
			
			
};

var s11 = sip.stringify(msg1);
console.log("processRE_INVITE_1()...request:>>>\r\n" + s11);

//
// proxy.send(sip.makeRespinse(rq, 487, 'Request Terminated'));
///

proxy.send(msg1,
	
	function(rs) {

		var s1 = sip.stringify(rs);
		console.log("processRE_INVITE_1()...response:>>>\r\n"+s1);
		
		if (rs.status >= 300) {
			console.log('processRE_INVITE_1()...call failed with status ' + rs.status);
			initFlag();

		} else if (rs.status < 200) {
			console.log('processRE_INVITE_1()...call progress status ' + rs.status);

			console.log('processRE_INVITE_1()...1xx with to-tag ' + rs.headers.to.params.tag);
			to1_tag = rs.headers.to.params.tag;

		} else {
			// yes we can get multiple 2xx response with different tags
			console.log('processRE_INVITE_1()...call answered with tag ' + rs.headers.to.params.tag);

			/// it will get 'recvonly'
			sdp2 = rs.content;
			console.log('processRE_INVITE_1()...sdp: \r\n' + rs.content);
			console.log('processRE_INVITE_1()...call-id:' + rs.headers['call-id']);
			// call_id1 = rs.headers['call-id'];
			to1_tag = rs.headers.to.params.tag;
			
			cseq_tag = rs.headers.cseq.seq;
			console.log('processRE_INVITE_1()...cseq:' + cseq_tag);

			// invite 2nd party....
			//InviteSecondParty(sdp1);
			//

			var id = [ rs.headers['call-id'], rs.headers.from.params.tag,
					rs.headers.to.params.tag ].join(':');

			console.log('processRE_INVITE_1()...id ' + id);
			
			//hold_sdp = sdp1.replace('a=sendrecv','a=sendonly');
			//hold_sdp = sdp1+'a=sendonly';

			
		    // sending ACK to
			
		    proxy.send({
		      method: 'ACK',
		      uri: callee_uri,
		      headers: {
		        to: {uri: callee_uri, params: {tag: to1_tag}},
		        from: {uri: caller_uri, params: {tag: from1_tag} },
		        'call-id': call_id1,
		        cseq: {method: 'ACK', seq: cseq_tag },
		        contact: [{uri: contact_uri}],
			    //'Content-Type': 'application/sdp',
			    'Max-Forwards': '70',
		        //via: []
				via :
					[ 
					  {
					    version: '2.0',
					    protocol: 'UDP',
					    host: HOST,
					    port: sip_port,
					    params: { 
					    	branch: generateBranch()+';rport'
					    	}
					  }
				       
				    ],

		      },
		      content: ''
		      
		    });
		    
		    
			


			// registring our 'dialog' which is just function to process
			// in-dialog
			// requests
			if (!dialogs[id]) {
				dialogs[id] = function(rq) {
					if (rq.method === 'BYE') {
						console.log('processRE_INVITE_1()...call received bye');

						delete dialogs[id];

						proxy.send(sip.makeResponse(rq, 200, 'Ok'));
						/// 1st party notify to 2nd party....
						var msg = {

							method : 'BYE',
							uri : callee_uri,
							headers : {
								to: {uri: callee_uri, params: {tag: to1_tag}},
								from: {uri : caller_uri, params : {tag: from1_tag}},
								'call-id': call_id1,
								cseq: {method: 'BYE', seq : rstring() },
								//'content-type': 'application/sdp',
								//via: [],
								via :
									[ 
									  {
									    version: '2.0',
									    protocol: 'UDP',
									    host: HOST,
									    port: sip_port,
									    params: { 
									    	branch: generateBranch()+';rport'
									    	}
									  }
								       
								    ],

								'Max-Forwards': '70',
						  		//contact: [ {uri : p_contact} ]
								// if your call doesnt get in-dialog request, maybe os.hostname() isn't
								// resolving in your ip address
							},
							content : ''
								
								
						};
						var s = sip.stringify(msg);

						console.log("processRE_INVITE_1()...send msg:>>>\r\n"+s);

						
						proxy.send(msg);
						
						initFlag();
								
						
						
					} else {
						proxy.send(sip.makeRespinse(rq, 405, 'Method not allowed'));
					}
				}
			}
		}


		
	}
	
	
);

//////

var msg2 = {
		
		method : 'INVITE', 
		uri : caller_uri,
		headers : {
			to : {uri : caller_uri,	params : {tag : caller_to_tag}},
			from : {uri : callee_uri, params : {tag : from1_tag}},
			////'Alert-Info': 'ring-answer',
			'call-id' : call_id1,
			cseq : {method : 'INVITE', seq : cseq_tag },
			'content-type' : 'application/sdp',
			//'Content-Disposition' : 'signal;handling=required',
			//'Event': 'hold',
			//via : [],
			via :
				[ 
				  {
				    version: '2.0',
				    protocol: 'UDP',
				    host: HOST,
				    port: sip_port,
				    params: { 
				    	branch: generateBranch()+';rport'
				    	}
				  }
			       
			    ],

			
			contact : [ {uri : contact_uri} ]
		// if your call doesnt get in-dialog request, maybe os.hostname() isn't
		// resolving in your ip address
		},
		//content : 
		//	'<?xml version="1.0" encoding="UTF-8"?>\r\n'+
		//	'<RequestSystemStatus xmlns="http://www.ecma-international.org/standards/ecma-323/csta/ed3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"/>\r\n'
			

		content : sdp2+cti_app_sdp
			
			
		
		
};

var s22 = sip.stringify(msg2);
console.log("processRE_INVITE_1()...request:>>>\r\n" + s22);

//
//proxy.send(sip.makeRespinse(rq, 487, 'Request Terminated'));
///

proxy.send(msg2,

function(rs) {

	var s1 = sip.stringify(rs);
	console.log("processRE_INVITE_1()...response:>>>\r\n"+s1);
	
	if (rs.status >= 300) {
		console.log('processRE_INVITE_1()...call failed with status ' + rs.status);
		initFlag();

	} else if (rs.status < 200) {
		console.log('processRE_INVITE_1()...call progress status ' + rs.status);

		console.log('processRE_INVITE_1()...1xx with to-tag ' + rs.headers.to.params.tag);
		to1_tag = rs.headers.to.params.tag;

	} else {
		// yes we can get multiple 2xx response with different tags
		console.log('processRE_INVITE_1()...call answered with tag ' + rs.headers.to.params.tag);

		sdp1 = rs.content;
		console.log('processRE_INVITE_1()...sdp: \r\n' + rs.content);
		console.log('processRE_INVITE_1()...call-id:' + rs.headers['call-id']);
		// call_id1 = rs.headers['call-id'];
		to1_tag = rs.headers.to.params.tag;
		
		cseq_tag = rs.headers.cseq.seq;
		console.log('processRE_INVITE_1()...cseq:' + cseq_tag);

		// invite 2nd party....
		//InviteSecondParty(sdp1);
		//

		var id = [ rs.headers['call-id'], rs.headers.from.params.tag,
				rs.headers.to.params.tag ].join(':');

		console.log('processRE_INVITE_1()...id ' + id);
		
		//hold_sdp = sdp1.replace('a=sendrecv','a=sendonly');
		//hold_sdp = sdp1+'a=sendonly';

		
	    // sending ACK to
		
	    proxy.send({
	      method: 'ACK',
	      uri: caller_uri,
	      headers: {
	        to: {uri: caller_uri, params: {tag: to1_tag}},
	        from: {uri: callee_uri, params: {tag: from1_tag} },
	        'call-id': call_id1,
	        cseq: {method: 'ACK', seq: cseq_tag },
	        contact: [{uri: callee_uri}],
		    //'Content-Type': 'application/sdp',
		    'Max-Forwards': '70',
	        //via: []
			via :
				[ 
				  {
				    version: '2.0',
				    protocol: 'UDP',
				    host: HOST,
				    port: sip_port,
				    params: { 
				    	branch: generateBranch()+';rport'
				    	}
				  }
			       
			    ],

	      },
	      content: '' 
	      
	    });
	    
	    
		


		// registring our 'dialog' which is just function to process
		// in-dialog
		// requests
		if (!dialogs[id]) {
			dialogs[id] = function(rq) {
				if (rq.method === 'BYE') {
					console.log('processRE_INVITE_1()...call received bye');

					delete dialogs[id];

					proxy.send(sip.makeResponse(rq, 200, 'Ok'));
					/// 1st party notify to 2nd party....
					var msg = {

						method : 'BYE',
						uri : caller_uri,
						headers : {
							to: {uri: caller_uri, params: {tag: to1_tag}},
							from: {uri : callee_uri, params : {tag: from1_tag}},
							'call-id': call_id1,
							cseq: {method: 'BYE', seq : rstring() },
							//'content-type': 'application/sdp',
							//via: [],
							via :
								[ 
								  {
								    version: '2.0',
								    protocol: 'UDP',
								    host: HOST,
								    port: sip_port,
								    params: { 
								    	branch: generateBranch()+';rport'
								    	}
								  }
							       
							    ],

							'Max-Forwards': '70',
					  		//contact: [ {uri : p_contact} ]
							// if your call doesnt get in-dialog request, maybe os.hostname() isn't
							// resolving in your ip address
						},
						content : ''
							
							
					};
					var s = sip.stringify(msg);

					console.log("processRE_INVITE_1()...send msg:>>>\r\n"+s);

					
					proxy.send(msg);
					
					initFlag();
							
					
					
				} else {
					proxy.send(sip.makeRespinse(rq, 405, 'Method not allowed'));
				}
			}
		}
	}


	
}


);




}

/////
///// re-INVITE_2
function processRE_INVITE_2(
		caller_uri,
		callee_uri,
		contact_uri,
		pai_uri
		
	)
{

	console.log('Trying to do RE_INVITE_2....');

	//timer_tick();
	
	///TimerStop();
	
	myCseq += 1;
	cseq_tag = myCseq;
		
		
	var msg1 = {
				
				method : 'INVITE', 
				uri : callee_uri,
				headers : {
					to : {uri : callee_uri,	params : {tag : callee_to_tag}},
					from : {uri : caller_uri, params : {tag : from1_tag}},
					////'Alert-Info': 'ring-answer',
					'call-id' : call_id1,
					cseq : {method : 'INVITE',seq : cseq_tag},
					'content-type' : 'application/sdp',
					//'Content-Disposition' : 'signal;handling=required',
					//'Event': 'hold',
					//via : [],
					via :
						[ 
						  {
						    version: '2.0',
						    protocol: 'UDP',
						    host: HOST,
						    port: sip_port,
						    params: { 
						    	branch: generateBranch()+';rport'
						    	}
						  }
					       
					    ],

					
					contact : [ {uri : contact_uri} ]
				// if your call doesnt get in-dialog request, maybe os.hostname() isn't
				// resolving in your ip address
				},
				//content : 
				//	'<?xml version="1.0" encoding="UTF-8"?>\r\n'+
				//	'<RequestSystemStatus xmlns="http://www.ecma-international.org/standards/ecma-323/csta/ed3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"/>\r\n'
					

				content : sdp1 /////sdp1+ivr_app_sdp
					
					
				
				
	};

	var s11 = sip.stringify(msg1);
	console.log("processRE_INVITE_2()...request:>>>\r\n" + s11);

	//
	// proxy.send(sip.makeRespinse(rq, 487, 'Request Terminated'));
	///

	proxy.send(msg1,
		
		function(rs) {

			var s1 = sip.stringify(rs);
			console.log("processRE_INVITE_2()...response:>>>\r\n"+s1);
			
			if (rs.status >= 300) {
				console.log('processRE_INVITE_2()...call failed with status ' + rs.status);
				initFlag();
				
				if(rs.status===4044) {

					processINVITE(
							caller_uri,
							target_uri, /////callee_uri,
							contact_uri,
							pai_uri
							);

				}


			} else if (rs.status < 200) {
				console.log('processRE_INVITE_2()...call progress status ' + rs.status);

				console.log('processRE_INVITE_2()...1xx with to-tag ' + rs.headers.to.params.tag);
				to1_tag = rs.headers.to.params.tag;

			} else {
				// yes we can get multiple 2xx response with different tags
				console.log('processRE_INVITE_2()...call answered with tag ' + rs.headers.to.params.tag);

				/// it will get 'recvonly'
				sdp2 = rs.content;
				console.log('processRE_INVITE_2()...sdp: \r\n' + rs.content);
				console.log('processRE_INVITE_2()...call-id:' + rs.headers['call-id']);
				// call_id1 = rs.headers['call-id'];
				to1_tag = rs.headers.to.params.tag;
				
				cseq_tag = rs.headers.cseq.seq;
				console.log('processRE_INVITE_2()...cseq:' + cseq_tag);

				// invite 2nd party....
				//InviteSecondParty(sdp1);
				//

				var id = [ rs.headers['call-id'], rs.headers.from.params.tag,
						rs.headers.to.params.tag ].join(':');

				console.log('processRE_INVITE_2()...id ' + id);
				
				//hold_sdp = sdp1.replace('a=sendrecv','a=sendonly');
				//hold_sdp = sdp1+'a=sendonly';

				
			    // sending ACK to
				
			    proxy.send({
			      method: 'ACK',
			      uri: callee_uri,
			      headers: {
			        to: {uri: callee_uri, params: {tag: to1_tag}},
			        from: {uri: caller_uri, params: {tag: from1_tag} },
			        'call-id': call_id1,
			        cseq: {method: 'ACK', seq: cseq_tag },
			        contact: [{uri: contact_uri}],
				    //'Content-Type': 'application/sdp',
				    'Max-Forwards': '70',
			        //via: []
					via :
						[ 
						  {
						    version: '2.0',
						    protocol: 'UDP',
						    host: HOST,
						    port: sip_port,
						    params: { 
						    	branch: generateBranch()+';rport'
						    	}
						  }
					       
					    ],

			      },
			      content: ''
			      
			    });
			    
			    
				


				// registring our 'dialog' which is just function to process
				// in-dialog
				// requests
				if (!dialogs[id]) {
					dialogs[id] = function(rq) {
						if (rq.method === 'BYE') {
							console.log('processRE_INVITE_2()...call received bye');

							delete dialogs[id];

							proxy.send(sip.makeResponse(rq, 200, 'Ok'));
							/// 1st party notify to 2nd party....
							var msg = {

								method : 'BYE',
								uri : callee_uri,
								headers : {
									to: {uri: callee_uri, params: {tag: to1_tag}},
									from: {uri : caller_uri, params : {tag: from1_tag}},
									'call-id': call_id1,
									cseq: {method: 'BYE', seq : rstring() },
									//'content-type': 'application/sdp',
									//via: [],
									via :
										[ 
										  {
										    version: '2.0',
										    protocol: 'UDP',
										    host: HOST,
										    port: sip_port,
										    params: { 
										    	branch: generateBranch()+';rport'
										    	}
										  }
									       
									    ],

									'Max-Forwards': '70',
							  		//contact: [ {uri : p_contact} ]
									// if your call doesnt get in-dialog request, maybe os.hostname() isn't
									// resolving in your ip address
								},
								content : ''
									
									
							};
							var s = sip.stringify(msg);

							console.log("processRE_INVITE_2()...send msg:>>>\r\n"+s);

							
							proxy.send(msg);
							
							initFlag();
									
							
							
						} else {
							proxy.send(sip.makeRespinse(rq, 405, 'Method not allowed'));
						}
					}
				}
			}


			
		}
		
		
	);

	//////

	var msg2 = {
			
			method : 'INVITE', 
			uri : caller_uri,
			headers : {
				to : {uri : caller_uri,	params : {tag : caller_to_tag}},
				from : {uri : callee_uri, params : {tag : from1_tag}},
				////'Alert-Info': 'ring-answer',
				'call-id' : call_id1,
				cseq : {method : 'INVITE', seq : cseq_tag },
				'content-type' : 'application/sdp',
				//'Content-Disposition' : 'signal;handling=required',
				//'Event': 'hold',
				//via : [],
				via :
					[ 
					  {
					    version: '2.0',
					    protocol: 'UDP',
					    host: HOST,
					    port: sip_port,
					    params: { 
					    	branch: generateBranch()+';rport'
					    	}
					  }
				       
				    ],

				
				contact : [ {uri : contact_uri} ]
			// if your call doesnt get in-dialog request, maybe os.hostname() isn't
			// resolving in your ip address
			},
			//content : 
			//	'<?xml version="1.0" encoding="UTF-8"?>\r\n'+
			//	'<RequestSystemStatus xmlns="http://www.ecma-international.org/standards/ecma-323/csta/ed3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"/>\r\n'
				

			content : sdp2 /////sdp2+cti_app_sdp
				
				
			
			
	};

	var s22 = sip.stringify(msg2);
	console.log("processRE_INVITE_2()...request:>>>\r\n" + s22);

	//
	//proxy.send(sip.makeRespinse(rq, 487, 'Request Terminated'));
	///

	proxy.send(msg2,

	function(rs) {

		var s1 = sip.stringify(rs);
		console.log("processRE_INVITE_2()...response:>>>\r\n"+s1);
		
		if (rs.status >= 300) {
			console.log('processRE_INVITE_2()...call failed with status ' + rs.status);
			initFlag();

		} else if (rs.status < 200) {
			console.log('processRE_INVITE_2()...call progress status ' + rs.status);

			console.log('processRE_INVITE_2()...1xx with to-tag ' + rs.headers.to.params.tag);
			to1_tag = rs.headers.to.params.tag;

		} else {
			// yes we can get multiple 2xx response with different tags
			console.log('processRE_INVITE_2()...call answered with tag ' + rs.headers.to.params.tag);

			sdp1 = rs.content;
			console.log('processRE_INVITE_2()...sdp: \r\n' + rs.content);
			console.log('processRE_INVITE_2()...call-id:' + rs.headers['call-id']);
			// call_id1 = rs.headers['call-id'];
			to1_tag = rs.headers.to.params.tag;
			
			cseq_tag = rs.headers.cseq.seq;
			console.log('processRE_INVITE_2()...cseq:' + cseq_tag);

			// invite 2nd party....
			//InviteSecondParty(sdp1);
			//

			var id = [ rs.headers['call-id'], rs.headers.from.params.tag,
					rs.headers.to.params.tag ].join(':');

			console.log('processRE_INVITE_2()...id ' + id);
			
			//hold_sdp = sdp1.replace('a=sendrecv','a=sendonly');
			//hold_sdp = sdp1+'a=sendonly';

			
		    // sending ACK to
			
		    proxy.send({
		      method: 'ACK',
		      uri: caller_uri,
		      headers: {
		        to: {uri: caller_uri, params: {tag: to1_tag}},
		        from: {uri: callee_uri, params: {tag: from1_tag} },
		        'call-id': call_id1,
		        cseq: {method: 'ACK', seq: cseq_tag },
		        contact: [{uri: callee_uri}],
			    //'Content-Type': 'application/sdp',
			    'Max-Forwards': '70',
		        //via: []
				via :
					[ 
					  {
					    version: '2.0',
					    protocol: 'UDP',
					    host: HOST,
					    port: sip_port,
					    params: { 
					    	branch: generateBranch()+';rport'
					    	}
					  }
				       
				    ],

		      },
		      content: '' 
		      
		    });
		    
		    
			


			// registring our 'dialog' which is just function to process
			// in-dialog
			// requests
			if (!dialogs[id]) {
				dialogs[id] = function(rq) {
					if (rq.method === 'BYE') {
						console.log('processRE_INVITE_2()...call received bye');

						delete dialogs[id];

						proxy.send(sip.makeResponse(rq, 200, 'Ok'));
						/// 1st party notify to 2nd party....
						var msg = {

							method : 'BYE',
							uri : caller_uri,
							headers : {
								to: {uri: caller_uri, params: {tag: to1_tag}},
								from: {uri : callee_uri, params : {tag: from1_tag}},
								'call-id': call_id1,
								cseq: {method: 'BYE', seq : rstring() },
								//'content-type': 'application/sdp',
								//via: [],
								via :
									[ 
									  {
									    version: '2.0',
									    protocol: 'UDP',
									    host: HOST,
									    port: sip_port,
									    params: { 
									    	branch: generateBranch()+';rport'
									    	}
									  }
								       
								    ],

								
								'Max-Forwards': '70',
						  		//contact: [ {uri : p_contact} ]
								// if your call doesnt get in-dialog request, maybe os.hostname() isn't
								// resolving in your ip address
							},
							content : ''
								
								
						};
						var s = sip.stringify(msg);

						console.log("processRE_INVITE_2()...send msg:>>>\r\n"+s);

						
						proxy.send(msg);
						
						initFlag();
								
						
						
					} else {
						proxy.send(sip.makeRespinse(rq, 405, 'Method not allowed'));
					}
				}
			}
		}


		
	}


	);
	

}

////

function processSIP_RECOVERY_1(
			caller_uri,
			callee_uri,
			contact_uri,
			pai_uri,
			p_backup_uri
		
		)
{
	
	console.log('Trying to do SIP Call Recovery.....');
	////
	////send bye first
	////
	myCseq += 1;

	var msg_bye = {
			
			method : 'BYE',
			uri : callee_uri,
			headers : {
				to : {uri : callee_uri,	params : {tag : callee_to_tag}},
				from : {uri : caller_uri, params : {tag : from1_tag}},
				'call-id' : call_id1,
				cseq : {method : 'BYE',	seq : myCseq},
				'content-type' : 'application/sdp',
				//via : [],
				via :
					[ 
					  {
					    version: '2.0',
					    protocol: 'UDP',
					    host: HOST,
					    port: sip_port,
					    params: { 
					    	branch: generateBranch()+';rport'
					    	}
					  }
				       
				    ],

				
				contact : [ {uri : contact_uri} ]
			// if your call doesnt get in-dialog request, maybe os.hostname() isn't
			// resolving in your ip address
			},
			content : ''
		
			
	};	

	var s11_bye = sip.stringify(msg_bye);
	console.log("processSIP_RECOVERY_1()...request:>>>\r\n"+s11_bye);


	proxy.send(msg_bye);
	

	//////////////////////////
	
	/*
	if(my_call_id==='')
	{
		call_id1 = getNewCallId(); ///rstring();
		call_id2 = call_id1;
		
	} else {
		call_id1 = my_call_id;
		call_id2 = call_id1;
		
	}
	*/

	var callid_new = call_id1; ////getNewCallId();
	
	myCseq += 1;
	cseq_tag = myCseq;
		
	var mybranch = generateBranch()+';rport';

	console.log('processSIP_RECOVERY_1()....branch='+mybranch);
	
	///this is brand new invite......
		
	var msg1 = {
				
				method : 'INVITE', 
				uri : p_backup_uri,
				headers : {
					to : {uri : p_backup_uri},	///params : {tag : callee_to_tag}},
					from : {uri : caller_uri, params : {tag : from1_tag}},
					////'Alert-Info': 'ring-answer',
					'call-id' : callid_new,
					cseq : {method : 'INVITE',seq : cseq_tag},
					'content-type' : 'application/sdp',
					//'Content-Disposition' : 'signal;handling=required',
					//'Event': 'hold',
					//via : []
					via :
						[ 
						  {
						    version: '2.0',
						    protocol: 'UDP',
						    host: HOST,
						    port: sip_port,
						    params: { 
						    	branch: mybranch 
						    	}
						  }
					       
					    ]


					,
					contact : [ {uri : contact_uri} ]
				// if your call doesnt get in-dialog request, maybe os.hostname() isn't
				// resolving in your ip address
				},
				//content : 
				//	'<?xml version="1.0" encoding="UTF-8"?>\r\n'+
				//	'<RequestSystemStatus xmlns="http://www.ecma-international.org/standards/ecma-323/csta/ed3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"/>\r\n'
					

				content : sdp1 /////sdp1+ivr_app_sdp
					
					
				
				
	};

	var s11 = sip.stringify(msg1);
	console.log("processSIP_RECOVERY_1()...request:>>>\r\n" + s11);

	//
	// proxy.send(sip.makeRespinse(rq, 487, 'Request Terminated'));
	///

	proxy.send(msg1,
		
		function(rs) {

			var s1 = sip.stringify(rs);
			console.log("processSIP_RECOVERY_1()...response:>>>\r\n"+s1);
			
			if (rs.status >= 300) {
				console.log('processSIP_RECOVERY_1()...call failed with status ' + rs.status);
				initFlag();
				
				if(rs.status===4044) {

					processINVITE(
							caller_uri,
							target_uri, /////callee_uri,
							contact_uri,
							pai_uri
							);

				}


			} else if (rs.status < 200) {
				console.log('processSIP_RECOVERY_1()...call progress status ' + rs.status);

				console.log('processSIP_RECOVERY_1()...1xx with to-tag ' + rs.headers.to.params.tag);
				to1_tag = rs.headers.to.params.tag;
				
				backup_to_tag = to1_tag;

				if(rs.status === 180)
				{
					callee_branch_tag = rs.headers.via[0].params.branch;
					console.log('processSIP_RECOVERY_1...callee_branch_tag: '+callee_branch_tag);
				}

				

			} else {
				// yes we can get multiple 2xx response with different tags
				console.log('processSIP_RECOVERY_1()...call answered with tag ' + rs.headers.to.params.tag);

				/// it will get 'recvonly'
				sdp2 = rs.content;
				console.log('processSIP_RECOVERY_1()...sdp: \r\n' + rs.content);
				console.log('processSIP_RECOVERY_1()...call-id:' + rs.headers['call-id']);
				// call_id1 = rs.headers['call-id'];
				to1_tag = rs.headers.to.params.tag;
				backup_to_tag = to1_tag;
				
				cseq_tag = rs.headers.cseq.seq;
				console.log('processSIP_RECOVERY_1()...cseq:' + cseq_tag);

				// invite 2nd party....
				// InviteSecondParty(sdp1);
				//

				var id = [ rs.headers['call-id'], rs.headers.from.params.tag,
						rs.headers.to.params.tag ].join(':');

				console.log('processSIP_RECOVERY_1()...id ' + id);
				
				//hold_sdp = sdp1.replace('a=sendrecv','a=sendonly');
				//hold_sdp = sdp1+'a=sendonly';

				
			    // sending ACK to
				
			    proxy.send({
			      method: 'ACK',
			      uri: p_backup_uri,
			      headers: {
			        to: {uri: p_backup_uri, params: {tag: to1_tag}},
			        from: {uri: caller_uri, params: {tag: from1_tag} },
			        'call-id': call_id1,
			        cseq: {method: 'ACK', seq: cseq_tag },
			        contact: [{uri: contact_uri}],
				    //'Content-Type': 'application/sdp',
				    'Max-Forwards': '70',
			        //via: []
					via :
						[ 
						  {
						    version: '2.0',
						    protocol: 'UDP',
						    host: HOST,
						    port: sip_port,
						    params: { 
						    	branch: generateBranch()+';rport'
						    	}
						  }
					       
					    ],

			      },
			      content: ''
			      
			    });
			    
			    processReInviteOrigCallParty(
						caller_uri,
						callee_uri,
						contact_uri,
						pai_uri,
						p_backup_uri
			    		
			    );
			    
				


				// registring our 'dialog' which is just function to process
				// in-dialog
				// requests
				if (!dialogs[id]) {
					dialogs[id] = function(rq) {
						if (rq.method === 'BYE') {
							console.log('processSIP_RECOVERY_1()...call received bye');

							delete dialogs[id];

							proxy.send(sip.makeResponse(rq, 200, 'Ok'));
							/// 1st party notify to 2nd party....
							var msg = {

								method : 'BYE',
								uri : p_backup_uri,
								headers : {
									to: {uri: p_backup_uri, params: {tag: to1_tag}},
									from: {uri : caller_uri, params : {tag: from1_tag}},
									'call-id': call_id1,
									cseq: {method: 'BYE', seq : rstring() },
									//'content-type': 'application/sdp',
									//via: [],
									via :
										[ 
										  {
										    version: '2.0',
										    protocol: 'UDP',
										    host: HOST,
										    port: sip_port,
										    params: { 
										    	branch: generateBranch()+';rport'
										    	}
										  }
									       
									    ],

									
									'Max-Forwards': '70',
							  		//contact: [ {uri : p_contact} ]
									// if your call doesnt get in-dialog request, maybe os.hostname() isn't
									// resolving in your ip address
								},
								content : ''
									
									
							};
							var s = sip.stringify(msg);

							console.log("processSIP_RECOVERY_1()...send msg:>>>\r\n"+s);

							
							proxy.send(msg);
							
							initFlag();
									
							
							
						} else {
							proxy.send(sip.makeRespinse(rq, 405, 'Method not allowed'));
						}
					}
				}
			}


			
		}
		
		
	);
	
//////////
	
	
	
}


function processReInviteOrigCallParty(
			caller_uri,
			callee_uri,
			contact_uri,
			pai_uri,
			p_backup_uri
		
	)
{
	//////

	////this is re-invite old call party
	
	var msg2 = {
			
			method : 'INVITE', 
			uri : caller_uri,
			headers : {
				to : {uri : caller_uri,	params : {tag : caller_to_tag}},
				from : {uri : callee_uri, params : {tag : from1_tag}},
				////'Alert-Info': 'ring-answer',
				'call-id' : call_id1,
				cseq : {method : 'INVITE', seq : myCseq },
				'content-type' : 'application/sdp',
				//'Content-Disposition' : 'signal;handling=required',
				//'Event': 'hold',
				//via : [],
				via :
					[ 
					  {
					    version: '2.0',
					    protocol: 'UDP',
					    host: HOST,
					    port: sip_port,
					    params: { 
					    	branch: generateBranch()+';rport'
					    	}
					  }
				       
				    ],

				
				contact : [ {uri : contact_uri} ]
			// if your call doesnt get in-dialog request, maybe os.hostname() isn't
			// resolving in your ip address
			},
			//content : 
			//	'<?xml version="1.0" encoding="UTF-8"?>\r\n'+
			//	'<RequestSystemStatus xmlns="http://www.ecma-international.org/standards/ecma-323/csta/ed3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"/>\r\n'
				

			content : sdp2 /////sdp2+cti_app_sdp
				
				
			
			
	};

	var s22 = sip.stringify(msg2);
	console.log("processReInviteOrigCallParty()...request:>>>\r\n" + s22);

	//
	//proxy.send(sip.makeRespinse(rq, 487, 'Request Terminated'));
	///

	proxy.send(msg2,

	function(rs) {

		var s1 = sip.stringify(rs);
		console.log("processReInviteOrigCallParty()...response:>>>\r\n"+s1);
		
		if (rs.status >= 300) {
			console.log('processReInviteOrigCallParty()...call failed with status ' + rs.status);
			initFlag();

		} else if (rs.status < 200) {
			console.log('processReInviteOrigCallParty()...call progress status ' + rs.status);

			console.log('processReInviteOrigCallParty()...1xx with to-tag ' + rs.headers.to.params.tag);
			to1_tag = rs.headers.to.params.tag;

		} else {
			// yes we can get multiple 2xx response with different tags
			console.log('processReInviteOrigCallParty()...call answered with tag ' + rs.headers.to.params.tag);

			sdp1 = rs.content;
			console.log('processReInviteOrigCallParty()...sdp: \r\n' + rs.content);
			console.log('processReInviteOrigCallParty()...call-id:' + rs.headers['call-id']);
			// call_id1 = rs.headers['call-id'];
			to1_tag = rs.headers.to.params.tag;
			
			cseq_tag = rs.headers.cseq.seq;
			console.log('processReInviteOrigCallParty()...cseq:' + cseq_tag);

			//
			// invite 2nd party....
			// InviteSecondParty(sdp1);
			//

			var id = [ rs.headers['call-id'], rs.headers.from.params.tag,
					rs.headers.to.params.tag ].join(':');

			console.log('processReInviteOrigCallParty()...id ' + id);
			
			//hold_sdp = sdp1.replace('a=sendrecv','a=sendonly');
			//hold_sdp = sdp1+'a=sendonly';

			
		    // sending ACK to
			
		    proxy.send({
		      method: 'ACK',
		      uri: caller_uri,
		      headers: {
		        to: {uri: caller_uri, params: {tag: to1_tag}},
		        from: {uri: callee_uri, params: {tag: from1_tag} },
		        'call-id': call_id1,
		        cseq: {method: 'ACK', seq: cseq_tag },
		        contact: [{uri: callee_uri}],
			    'Content-Type': 'application/sdp',
			    'Max-Forwards': '70',
		        //via: []
				via :
					[ 
					  {
					    version: '2.0',
					    protocol: 'UDP',
					    host: HOST,
					    port: sip_port,
					    params: { 
					    	branch: generateBranch()+';rport'
					    	}
					  }
				       
				    ],

		      },
		      content: sdp2 ///'' 
		      
		    });
		    
		    
			


			// registring our 'dialog' which is just function to process
			// in-dialog
			// requests
			if (!dialogs[id]) {
				dialogs[id] = function(rq) {
					if (rq.method === 'BYE') {
						console.log('processReInviteOrigCallParty()...call received bye');

						delete dialogs[id];

						proxy.send(sip.makeResponse(rq, 200, 'Ok'));
						/// 1st party notify to 2nd party....
						var msg = {

							method : 'BYE',
							uri : caller_uri,
							headers : {
								to: {uri: caller_uri, params: {tag: to1_tag}},
								from: {uri : callee_uri, params : {tag: from1_tag}},
								'call-id': call_id1,
								cseq: {method: 'BYE', seq : rstring() },
								//'content-type': 'application/sdp',
								//via: [],
								via :
									[ 
									  {
									    version: '2.0',
									    protocol: 'UDP',
									    host: HOST,
									    port: sip_port,
									    params: { 
									    	branch: generateBranch()+';rport'
									    	}
									  }
								       
								    ],

								
								'Max-Forwards': '70',
						  		//contact: [ {uri : p_contact} ]
								// if your call doesnt get in-dialog request, maybe os.hostname() isn't
								// resolving in your ip address
							},
							content : ''
								
								
						};
						var s = sip.stringify(msg);

						console.log("processReInviteOrigCallParty()...send msg:>>>\r\n"+s);

						
						proxy.send(msg);
						
						initFlag();
								
						
						
					} else {
						proxy.send(sip.makeRespinse(rq, 405, 'Method not allowed'));
					}
				}
			}
		}


		
	}


	);
	
	
	
}

////

function processCONSULT(
			caller_uri,
			callee_uri,
			contact_uri,
			pai_uri,
			p_target_uri
		
			)
{

console.log('Trying to do CONSULT....');

///hold2_sdp = sdp2.replace('a=sendrecv','a=sendonly');
hold2_sdp = sdp2.replace('a=sendrecv','a=inactive');
//hold_sdp = '';
console.log('processCONSULT()....HOLD.....hold2_sdp='+hold2_sdp);

myCseq += 1;
cseq_tag = myCseq;
	
	
var msg1 = {
			
			method : 'INVITE', 
			uri : callee_uri,
			headers : {
				to : {uri : callee_uri,	params : {tag : callee_to_tag}},
				from : {uri : caller_uri, params : {tag : from1_tag}},
				////'Alert-Info': 'ring-answer',
				'call-id' : call_id1,
				cseq : {method : 'INVITE',seq : cseq_tag},
				'content-type' : 'application/sdp',
				//'Content-Disposition' : 'signal;handling=required',
				//'Event': 'hold',
				//via : [],
				via :
					[ 
					  {
					    version: '2.0',
					    protocol: 'UDP',
					    host: HOST,
					    port: sip_port,
					    params: { 
					    	branch: generateBranch()+';rport'
					    	}
					  }
				       
				    ],

				
				contact : [ {uri : contact_uri} ]
			// if your call doesnt get in-dialog request, maybe os.hostname() isn't
			// resolving in your ip address
			},
			//content : 
			//	'<?xml version="1.0" encoding="UTF-8"?>\r\n'+
			//	'<RequestSystemStatus xmlns="http://www.ecma-international.org/standards/ecma-323/csta/ed3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"/>\r\n'
				

			content : hold2_sdp
				
				
			
			
};

var s11 = sip.stringify(msg1);
console.log("processCONSULT()...request:>>>\r\n" + s11);

//
// proxy.send(sip.makeRespinse(rq, 487, 'Request Terminated'));
///

proxy.send(msg1,
	
	function(rs) {

		var s1 = sip.stringify(rs);
		console.log("processCONSULT()...response:>>>\r\n"+s1);
		
		if (rs.status >= 300) {
			console.log('processCONSULT()...call failed with status ' + rs.status);
			initFlag();

		} else if (rs.status < 200) {
			console.log('processCONSULT()...call progress status ' + rs.status);

			console.log('processCONSULT()...1xx with to-tag ' + rs.headers.to.params.tag);
			to1_tag = rs.headers.to.params.tag;

		} else {
			// yes we can get multiple 2xx response with different tags
			console.log('processCONSULT()...call answered with tag ' + rs.headers.to.params.tag);

			/// it will get 'recvonly'
			sdp2 = rs.content;
			console.log('processCONSULT()...sdp: \r\n' + rs.content);
			console.log('processCONSULT()...call-id:' + rs.headers['call-id']);
			// call_id1 = rs.headers['call-id'];
			to1_tag = rs.headers.to.params.tag;
			
			cseq_tag = rs.headers.cseq.seq;
			console.log('processCONSULT()...cseq:' + cseq_tag);

			// invite 2nd party....
			//InviteSecondParty(sdp1);
			//

			var id = [ rs.headers['call-id'], rs.headers.from.params.tag,
					rs.headers.to.params.tag ].join(':');

			console.log('processCONSULT()...id ' + id);
			
			//hold_sdp = sdp1.replace('a=sendrecv','a=sendonly');
			//hold_sdp = sdp1+'a=sendonly';

			
		    // sending ACK to
			
		    proxy.send({
		      method: 'ACK',
		      uri: callee_uri,
		      headers: {
		        to: {uri: callee_uri, params: {tag: to1_tag}},
		        from: {uri: caller_uri, params: {tag: from1_tag} },
		        'call-id': call_id1,
		        cseq: {method: 'ACK', seq: cseq_tag },
		        contact: [{uri: contact_uri}],
			    //'Content-Type': 'application/sdp',
			    'Max-Forwards': '70',
		        //via: []
				via :
					[ 
					  {
					    version: '2.0',
					    protocol: 'UDP',
					    host: HOST,
					    port: sip_port,
					    params: { 
					    	branch: generateBranch()+';rport'
					    	}
					  }
				       
				    ],

		      },
		      content: ''
		      
		    });
		    
		    
			


			// registring our 'dialog' which is just function to process
			// in-dialog
			// requests
			if (!dialogs[id]) {
				dialogs[id] = function(rq) {
					if (rq.method === 'BYE') {
						console.log('processCONSULT()...call received bye');

						delete dialogs[id];

						proxy.send(sip.makeResponse(rq, 200, 'Ok'));
						/// 1st party notify to 2nd party....
						var msg = {

							method : 'BYE',
							uri : callee_uri,
							headers : {
								to: {uri: callee_uri, params: {tag: to1_tag}},
								from: {uri : caller_uri, params : {tag: from1_tag}},
								'call-id': call_id1,
								cseq: {method: 'BYE', seq : rstring() },
								//'content-type': 'application/sdp',
								//via: [],
								via :
									[ 
									  {
									    version: '2.0',
									    protocol: 'UDP',
									    host: HOST,
									    port: sip_port,
									    params: { 
									    	branch: generateBranch()+';rport'
									    	}
									  }
								       
								    ],

								'Max-Forwards': '70',
						  		//contact: [ {uri : p_contact} ]
								// if your call doesnt get in-dialog request, maybe os.hostname() isn't
								// resolving in your ip address
							},
							content : ''
								
								
						};
						var s = sip.stringify(msg);

						console.log("processCONSULT()...send msg:>>>\r\n"+s);

						
						proxy.send(msg);
						
						initFlag();
								
						
						
					} else {
						proxy.send(sip.makeRespinse(rq, 405, 'Method not allowed'));
					}
				}
			}
		}


		
	}
	
	
);

//////
///////
///hold1_sdp = sdp1.replace('a=sendrecv','a=sendonly');
//hold1_sdp = sdp1.replace('a=sendrecv','a=inactive');
hold1_sdp = sdp1.replace('a=sendrecv','a=sendrecv');
//hold_sdp = '';
console.log('processCONSULT()....HOLD.....hold1_sdp='+hold1_sdp);


/////

var msg2 = {
		
		method : 'INVITE', 
		uri : caller_uri,
		headers : {
			to : {uri : caller_uri,	params : {tag : caller_to_tag}},
			from : {uri : callee_uri, params : {tag : from1_tag}},
			////'Alert-Info': 'ring-answer',
			'call-id' : call_id1,
			cseq : {method : 'INVITE', seq : cseq_tag },
			'content-type' : 'application/sdp',
			//'Content-Disposition' : 'signal;handling=required',
			//'Event': 'hold',
			//via : [],
			via :
				[ 
				  {
				    version: '2.0',
				    protocol: 'UDP',
				    host: HOST,
				    port: sip_port,
				    params: { 
				    	branch: generateBranch()+';rport'
				    	}
				  }
			       
			    ],

			
			contact : [ {uri : contact_uri} ]
		// if your call doesnt get in-dialog request, maybe os.hostname() isn't
		// resolving in your ip address
		},
		//content : 
		//	'<?xml version="1.0" encoding="UTF-8"?>\r\n'+
		//	'<RequestSystemStatus xmlns="http://www.ecma-international.org/standards/ecma-323/csta/ed3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"/>\r\n'
			

		content : hold1_sdp
			
			
		
		
};

var s22 = sip.stringify(msg2);
console.log("processCONSULT()...request:>>>\r\n" + s22);

//
//proxy.send(sip.makeRespinse(rq, 487, 'Request Terminated'));
///

proxy.send(msg2,

function(rs) {

	var s1 = sip.stringify(rs);
	console.log("processCONSULT()...response:>>>\r\n"+s1);
	
	if (rs.status >= 300) {
		console.log('processCONSULT()...call failed with status ' + rs.status);
		initFlag();

	} else if (rs.status < 200) {
		console.log('processCONSULT()...call progress status ' + rs.status);

		console.log('processCONSULT()...1xx with to-tag ' + rs.headers.to.params.tag);
		to1_tag = rs.headers.to.params.tag;

	} else {
		// yes we can get multiple 2xx response with different tags
		console.log('processCONSULT()...call answered with tag ' + rs.headers.to.params.tag);

		sdp1 = rs.content;
		console.log('processCONSULT()...sdp: \r\n' + rs.content);
		console.log('processCONSULT()...call-id:' + rs.headers['call-id']);
		// call_id1 = rs.headers['call-id'];
		to1_tag = rs.headers.to.params.tag;
		
		cseq_tag = rs.headers.cseq.seq;
		console.log('processCONSULT()...cseq:' + cseq_tag);

		// invite 2nd party....
		//InviteSecondParty(sdp1);
		//

		var id = [ rs.headers['call-id'], rs.headers.from.params.tag,
				rs.headers.to.params.tag ].join(':');

		console.log('processCONSULT()...id ' + id);
		
		//hold_sdp = sdp1.replace('a=sendrecv','a=sendonly');
		//hold_sdp = sdp1+'a=sendonly';

		
	    // sending ACK to
		
	    proxy.send({
	      method: 'ACK',
	      uri: caller_uri,
	      headers: {
	        to: {uri: caller_uri, params: {tag: to1_tag}},
	        from: {uri: callee_uri, params: {tag: from1_tag} },
	        'call-id': call_id1,
	        cseq: {method: 'ACK', seq: cseq_tag },
	        contact: [{uri: callee_uri}],
		    //'Content-Type': 'application/sdp',
		    'Max-Forwards': '70',
	        //via: []
			via :
				[ 
				  {
				    version: '2.0',
				    protocol: 'UDP',
				    host: HOST,
				    port: sip_port,
				    params: { 
				    	branch: generateBranch()+';rport'
				    	}
				  }
			       
			    ],

	      },
	      content: '' 
	      
	    });
	    
	    
		


		// registring our 'dialog' which is just function to process
		// in-dialog
		// requests
		if (!dialogs[id]) {
			dialogs[id] = function(rq) {
				if (rq.method === 'BYE') {
					console.log('processCONSULT()...call received bye');

					delete dialogs[id];

					proxy.send(sip.makeResponse(rq, 200, 'Ok'));
					/// 1st party notify to 2nd party....
					var msg = {

						method : 'BYE',
						uri : caller_uri,
						headers : {
							to: {uri: caller_uri, params: {tag: to1_tag}},
							from: {uri : callee_uri, params : {tag: from1_tag}},
							'call-id': call_id1,
							cseq: {method: 'BYE', seq : rstring() },
							//'content-type': 'application/sdp',
							//via: [],
							via :
								[ 
								  {
								    version: '2.0',
								    protocol: 'UDP',
								    host: HOST,
								    port: sip_port,
								    params: { 
								    	branch: generateBranch()+';rport'
								    	}
								  }
							       
							    ],

							'Max-Forwards': '70',
					  		//contact: [ {uri : p_contact} ]
							// if your call doesnt get in-dialog request, maybe os.hostname() isn't
							// resolving in your ip address
						},
						content : ''
							
							
					};
					var s = sip.stringify(msg);

					console.log("processCONSULT()...send msg:>>>\r\n"+s);

					
					proxy.send(msg);
					
					initFlag();
							
					
					
				} else {
					proxy.send(sip.makeRespinse(rq, 405, 'Method not allowed'));
				}
			}
		}
	}


	
}


);

//////

myCseq += 1;
cseq_tag = myCseq;

/// invite new call party....
var msg3 = {
		
		method : 'INVITE', 
		uri : p_target_uri,
		headers : {
			to : { uri : p_target_uri }, ////params : {	tag : to1_tag }},
			from : { uri : caller_uri, params : {tag : from1_tag}},
			////'Alert-Info': 'ring-answer',
			'call-id' : call_id1,
			cseq : {method : 'INVITE',	seq : myCseq },
			'content-type' : 'application/sdp',
			//'Content-Disposition' : 'signal;handling=required',
			//'Event': 'hold',
			//via : [],
			via :
				[ 
				  {
				    version: '2.0',
				    protocol: 'UDP',
				    host: HOST,
				    port: sip_port,
				    params: { 
				    	branch: generateBranch()+';rport'
				    	}
				  }
			       
			    ],

			
			contact : [ {uri : contact_uri} ]
		// if your call doesnt get in-dialog request, maybe os.hostname() isn't
		// resolving in your ip address
		},
		//content : 
		//	'<?xml version="1.0" encoding="UTF-8"?>\r\n'+
		//	'<RequestSystemStatus xmlns="http://www.ecma-international.org/standards/ecma-323/csta/ed3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"/>\r\n'
			

		content : sdp1 /////sdp2
		
};

var s33 = sip.stringify(msg3);
console.log("processCONSULT()...request:>>>\r\n%s\r\n<<<", s33);

proxy.send(msg3,
		
		function(rs) {

			var s1 = sip.stringify(rs);
			console.log("processCONSULT()...response:>>>\r\n%s\r\n<<<",s1);
			
			if (rs.status >= 300) {
				console.log('processCONSULT()...call failed with status ' + rs.status);
				initFlag();
				

			} else if (rs.status < 200) {
				console.log('processCONSULT()...call progress status ' + rs.status);

				console.log('processCONSULT()...1xx with to-tag ' + rs.headers.to.params.tag);
				to1_tag = rs.headers.to.params.tag;
				if(rs.status === 180){
					
					//myCseq += 1;
					/*
					var msg = {
							method : 'BYE',
							uri : p_caller_uri,
							headers : {
								to: {uri: p_caller_uri, params: {tag: caller_to_tag}},
								from: {uri : p_callee_uri, params : {tag: from1_tag}},
								'call-id': call_id1,
								cseq: {method: 'BYE', seq : rstring()},
								//'content-type': 'application/sdp',
								via: [],
								'Max-Forwards': '70',
						  		//contact: [ {uri : p_contact} ]
								// if your call doesnt get in-dialog request, maybe os.hostname() isn't
								// resolving in your ip address
							},
							content : ''
						};
						var s = sip.stringify(msg);
						console.log("processCONSULT()...request:>>>\r\n%s\r\n<<<",s);
						proxy.send(msg);
						*/

				}

			} else {
				// yes we can get multiple 2xx response with different tags
				console.log('processCONSULT()...call answered with tag ' + rs.headers.to.params.tag);

				/// 
				sdp1 = rs.content;
				console.log('processCONSULT()...sdp: \r\n' + rs.content);
				console.log('processCONSULT()...call-id:' + rs.headers['call-id']);
				// call_id1 = rs.headers['call-id'];
				to1_tag = rs.headers.to.params.tag;
				caller_to_tag = to1_tag;
				target_to_tag = to1_tag;
				
				cseq_tag = rs.headers.cseq.seq;
				console.log('processCONSULT()...cseq:' + cseq_tag);

				// invite 2nd party....
				//InviteSecondParty(sdp1);
				//

				var id = [ rs.headers['call-id'], rs.headers.from.params.tag,
						rs.headers.to.params.tag ].join(':');

				console.log('processCONSULT()...id ' + id);
				
				//hold_sdp = sdp1.replace('a=sendrecv','a=sendonly');
				//hold_sdp = sdp1+'a=sendonly';

			    // sending ACK to
				
			    proxy.send({
			      method: 'ACK',
			      uri: p_target_uri,
			      headers: {
			        to: {uri: p_target_uri, params: {tag: to1_tag}},
			        from: {uri: caller_uri, params: {tag: from1_tag} },
			        'call-id': call_id1,
			        cseq: {method: 'ACK', seq: cseq_tag },
			        contact: [{uri: contact_uri}],
				    //'Content-Type': 'application/sdp',
				    'Max-Forwards': '70',
			        //via: []
					via :
						[ 
						  {
						    version: '2.0',
						    protocol: 'UDP',
						    host: HOST,
						    port: sip_port,
						    params: { 
						    	branch: generateBranch()+';rport'
						    	}
						  }
					       
					    ]

			      },
			      content: ''
			      
			    });
			    
				//p_caller_uri = p_target_uri;
			    
				/*
				transferCalledParty(
						sdp1,
						p_caller_uri,
						p_callee_uri,
						p_contact_uri,
						p_pai_uri
						);*/
				
				
			    
			    
				


				// registring our 'dialog' which is just function to process
				// in-dialog
				// requests
				if (!dialogs[id]) {
					dialogs[id] = function(rq) {
						if (rq.method === 'BYE') {
							console.log('processCONSULT()...call received bye');

							delete dialogs[id];

							proxy.send(sip.makeResponse(rq, 200, 'Ok'));
							/// 1st party notify to 2nd party....
							var msg = {

								method : 'BYE',
								uri : p_caller_uri,
								headers : {
									to: {uri: p_caller_uri, params: {tag: to1_tag}},
									from: {uri : p_callee_uri, params : {tag: from1_tag}},
									'call-id': call_id1,
									cseq: {method: 'BYE', seq : rstring()},
									//'content-type': 'application/sdp',
									//via: [],
									via :
										[ 
										  {
										    version: '2.0',
										    protocol: 'UDP',
										    host: HOST,
										    port: sip_port,
										    params: { 
										    	branch: generateBranch()+';rport'
										    	}
										  }
									       
									    ],

									'Max-Forwards': '70',
							  		//contact: [ {uri : p_contact} ]
									// if your call doesnt get in-dialog request, maybe os.hostname() isn't
									// resolving in your ip address
								},
								content : ''
									
									
							};
							var s = sip.stringify(msg);

							console.log("processCONSULT()...request:>>>\r\n"+s);

							
							proxy.send(msg);
							
							initFlag();
									
							
							
						} else {
							proxy.send(sip.makeRespinse(rq, 405, 'Method not allowed'));
						}
					}
				}
			}


			
		}
		
		
);

	
}



////
	
function processHOLD(
		caller_uri,
		callee_uri,
		contact_uri,
		pai_uri
		) 
{	
		
///hold2_sdp = sdp2.replace('a=sendrecv','a=sendonly');
hold2_sdp = sdp2.replace('a=sendrecv','a=inactive');
//hold_sdp = '';
console.log('processHOLD()....HOLD.....hold2_sdp='+hold2_sdp);

myCseq += 1;
cseq_tag = myCseq;
	
var mybranch = generateBranch()+';rport';
	
var msg1 = {
			
			method : 'INVITE', ////'NOTIFY',
			uri : callee_uri,
			headers : {
				to : {
					uri : callee_uri,
					params : {
						tag : callee_to_tag
					}
				},
				from : {
					uri : caller_uri,
					params : {
						tag : from1_tag
					}
				},
				////'Alert-Info': 'ring-answer',
				'call-id' : call_id1,
				cseq : {
					method : 'INVITE', ////'NOTIFY',
					seq : cseq_tag
				},
				'content-type' : 'application/sdp',
				//'Content-Disposition' : 'signal;handling=required',
				//'Event': 'hold',
				///via : [],
				via :
					[ 
					  {
					    version: '2.0',
					    protocol: 'UDP',
					    host: HOST,
					    port: sip_port,
					    params: { 
					    	branch: mybranch 
					    	}
					  }
				       
				    ],

				
				contact : [ {
					uri : contact_uri
				} ]
			// if your call doesnt get in-dialog request, maybe os.hostname() isn't
			// resolving in your ip address
			},
			//content : 
			//	'<?xml version="1.0" encoding="UTF-8"?>\r\n'+
			//	'<RequestSystemStatus xmlns="http://www.ecma-international.org/standards/ecma-323/csta/ed3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"/>\r\n'
				

			content : hold2_sdp
				
				
			
			
};

var s11 = sip.stringify(msg1);
console.log("processHOLD()...request:>>>\r\n" + s11);

//
// proxy.send(sip.makeRespinse(rq, 487, 'Request Terminated'));
///

proxy.send(msg1,
	
	function(rs) {

		var s1 = sip.stringify(rs);
		console.log("processHOLD()...response:>>>\r\n"+s1);
		
		if (rs.status >= 300) {
			console.log('processHOLD()...call failed with status ' + rs.status);
			initFlag();

		} else if (rs.status < 200) {
			console.log('processHOLD()...call progress status ' + rs.status);

			console.log('processHOLD()...1xx with to-tag ' + rs.headers.to.params.tag);
			to1_tag = rs.headers.to.params.tag;

		} else {
			// yes we can get multiple 2xx response with different tags
			console.log('processHOLD()...call answered with tag ' + rs.headers.to.params.tag);

			/// it will get 'recvonly'
			sdp2 = rs.content;
			console.log('processHOLD()...sdp: \r\n' + rs.content);
			console.log('processHOLD()...call-id:' + rs.headers['call-id']);
			// call_id1 = rs.headers['call-id'];
			to1_tag = rs.headers.to.params.tag;
			
			cseq_tag = rs.headers.cseq.seq;
			console.log('processHOLD()...cseq:' + cseq_tag);

			// invite 2nd party....
			//InviteSecondParty(sdp1);
			//

			var id = [ rs.headers['call-id'], rs.headers.from.params.tag,
					rs.headers.to.params.tag ].join(':');

			console.log('processHOLD()...id ' + id);
			
			//hold_sdp = sdp1.replace('a=sendrecv','a=sendonly');
			//hold_sdp = sdp1+'a=sendonly';

			
		    // sending ACK to
			
		    proxy.send({
		      method: 'ACK',
		      uri: callee_uri,
		      headers: {
		        to: {uri: callee_uri, params: {tag: to1_tag}},
		        from: {uri: caller_uri, params: {tag: from1_tag} },
		        'call-id': call_id1,
		        cseq: {method: 'ACK', seq: cseq_tag },
		        contact: [{uri: contact_uri}],
			    //'Content-Type': 'application/sdp',
			    'Max-Forwards': '70',
		        //via: []
				via :
					[ 
					  {
					    version: '2.0',
					    protocol: 'UDP',
					    host: HOST,
					    port: sip_port,
					    params: { 
					    	branch: generateBranch()+';rport'
					    	}
					  }
				       
				    ]

		      },
		      content: ''
		      
		    });
		    
		    
			


			// registring our 'dialog' which is just function to process
			// in-dialog
			// requests
			if (!dialogs[id]) {
				dialogs[id] = function(rq) {
					if (rq.method === 'BYE') {
						console.log('processSip3pcc...call received bye');

						delete dialogs[id];

						proxy.send(sip.makeResponse(rq, 200, 'Ok'));
						/// 1st party notify to 2nd party....
						var msg = {

							method : 'BYE',
							uri : callee_uri,
							headers : {
								to: {uri: callee_uri, params: {tag: to1_tag}},
								from: {uri : caller_uri, params : {tag: from1_tag}},
								'call-id': call_id1,
								cseq: {method: 'BYE', seq : 4},
								//'content-type': 'application/sdp',
								//via: [],
								via :
									[ 
									  {
									    version: '2.0',
									    protocol: 'UDP',
									    host: HOST,
									    port: sip_port,
									    params: { 
									    	branch: generateBranch()+';rport'
									    	}
									  }
								       
								    ],

								'Max-Forwards': '70',
						  		//contact: [ {uri : p_contact} ]
								// if your call doesnt get in-dialog request, maybe os.hostname() isn't
								// resolving in your ip address
							},
							content : ''
								
								
						};
						var s = sip.stringify(msg);

						console.log("processHOLD()...send msg:>>>\r\n"+s);

						
						proxy.send(msg);
						
						initFlag();
								
						/*
						processSipRequest(
								'BYE',from1_uri,
								to1_uri,to1_tag,
								from1_uri,from1_tag,
								request1_uri,call_id1
								);

						*/
						
						
					} else {
						proxy.send(sip.makeRespinse(rq, 405, 'Method not allowed'));
					}
				}
			}
		}


		
	}
	
	
);
	

///////
///hold1_sdp = sdp1.replace('a=sendrecv','a=sendonly');
hold1_sdp = sdp1.replace('a=sendrecv','a=inactive');
//hold_sdp = '';
console.log('processHOLD()....HOLD.....hold1_sdp='+hold1_sdp);

var msg2 = {
		
		method : 'INVITE', ////'NOTIFY',
		uri : caller_uri,
		headers : {
			to : {
				uri : caller_uri,
				params : {
					tag : caller_to_tag
				}
			},
			from : {
				uri : callee_uri,
				params : {
					tag : from1_tag
				}
			},
			////'Alert-Info': 'ring-answer',
			'call-id' : call_id1,
			cseq : {
				method : 'INVITE', ///'NOTIFY',
				seq : cseq_tag
			},
			'content-type' : 'application/sdp',
			//'Content-Disposition' : 'signal;handling=required',
			//'Event': 'hold',
			//via : [],
			via :
				[ 
				  {
				    version: '2.0',
				    protocol: 'UDP',
				    host: HOST,
				    port: sip_port,
				    params: { 
				    	branch: generateBranch()+';rport'
				    	}
				  }
			       
			    ],

			
			contact : [ {
				uri : contact_uri
			} ]
		// if your call doesnt get in-dialog request, maybe os.hostname() isn't
		// resolving in your ip address
		},
		//content : 
		//	'<?xml version="1.0" encoding="UTF-8"?>\r\n'+
		//	'<RequestSystemStatus xmlns="http://www.ecma-international.org/standards/ecma-323/csta/ed3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"/>\r\n'
			

		content : hold1_sdp
			
			
		
		
};

var s22 = sip.stringify(msg2);
console.log("processHOLD()...request:>>>\r\n" + s22);

//
//proxy.send(sip.makeRespinse(rq, 487, 'Request Terminated'));
///

proxy.send(msg2,

function(rs) {

	var s1 = sip.stringify(rs);
	console.log("processHOLD()...response:>>>\r\n"+s1);
	
	if (rs.status >= 300) {
		console.log('processHOLD()...call failed with status ' + rs.status);
		initFlag();

	} else if (rs.status < 200) {
		console.log('processHOLD()...call progress status ' + rs.status);

		console.log('processHOLD()...1xx with to-tag ' + rs.headers.to.params.tag);
		//to1_tag = rs.headers.to.params.tag;

	} else {
		// yes we can get multiple 2xx response with different tags
		console.log('processHOLD()...call answered with tag ' + rs.headers.to.params.tag);

		sdp1 = rs.content;
		console.log('processHOLD()...sdp: \r\n' + rs.content);
		console.log('processHOLD()...call-id:' + rs.headers['call-id']);
		// call_id1 = rs.headers['call-id'];
		//to1_tag = rs.headers.to.params.tag;
		
		cseq_tag = rs.headers.cseq.seq;
		console.log('processHOLD()...cseq:' + cseq_tag);

		// invite 2nd party....
		//InviteSecondParty(sdp1);
		//

		var id = [ rs.headers['call-id'], rs.headers.from.params.tag,
				rs.headers.to.params.tag ].join(':');

		console.log('processHOLD()...id ' + id);
		
		//hold_sdp = sdp1.replace('a=sendrecv','a=sendonly');
		//hold_sdp = sdp1+'a=sendonly';

		
	    // sending ACK to
		
	    proxy.send({
	      method: 'ACK',
	      uri: caller_uri,
	      headers: {
	        to: {uri: caller_uri, params: {tag: to1_tag}},
	        from: {uri: callee_uri, params: {tag: from1_tag} },
	        'call-id': call_id1,
	        cseq: {method: 'ACK', seq: cseq_tag },
	        contact: [{uri: callee_uri}],
		    //'Content-Type': 'application/sdp',
		    'Max-Forwards': '70',
	        //via: []
			via :
				[ 
				  {
				    version: '2.0',
				    protocol: 'UDP',
				    host: HOST,
				    port: sip_port,
				    params: { 
				    	branch: generateBranch()+';rport'
				    	}
				  }
			       
			    ],

	      },
	      content: '' 
	      
	    });
	    
	    
		


		// registring our 'dialog' which is just function to process
		// in-dialog
		// requests
		if (!dialogs[id]) {
			dialogs[id] = function(rq) {
				if (rq.method === 'BYE') {
					console.log('processSip3pcc...call received bye');

					delete dialogs[id];

					proxy.send(sip.makeResponse(rq, 200, 'Ok'));
					/// 1st party notify to 2nd party....
					var msg = {

						method : 'BYE',
						uri : caller_uri,
						headers : {
							to: {uri: caller_uri, params: {tag: to1_tag}},
							from: {uri : callee_uri, params : {tag: from1_tag}},
							'call-id': call_id1,
							cseq: {method: 'BYE', seq : 4},
							//'content-type': 'application/sdp',
							//via: [],
							via :
								[ 
								  {
								    version: '2.0',
								    protocol: 'UDP',
								    host: HOST,
								    port: sip_port,
								    params: { 
								    	branch: generateBranch()+';rport'
								    	}
								  }
							       
							    ],

							
							'Max-Forwards': '70',
					  		//contact: [ {uri : p_contact} ]
							// if your call doesnt get in-dialog request, maybe os.hostname() isn't
							// resolving in your ip address
						},
						content : ''
							
							
					};
					var s = sip.stringify(msg);

					console.log("processHOLD()...send msg:>>>\r\n"+s);

					
					proxy.send(msg);
					
					initFlag();
							
					
					
				} else {
					proxy.send(sip.makeRespinse(rq, 405, 'Method not allowed'));
				}
			}
		}
	}


	
}


);


	

	
}


function processUNHOLD(
		caller_uri,
		callee_uri,
		contact_uri,
		pai_uri
		) 
{
	
//hold2_sdp = sdp2.replace('a=recvonly','a=sendrecv');
hold2_sdp = sdp2.replace('a=inactive','a=sendrecv');
//hold_sdp = '';
console.log('processUNHOLD()...UNHOLD.....hold2_sdp='+hold2_sdp);

////
//hold1_sdp = sdp1.replace('a=recvonly','a=sendrecv');
hold1_sdp = sdp1.replace('a=inactive','a=sendrecv');
//hold_sdp = '';
console.log('processUNHOLD()....UNHOLD.....hold1_sdp='+hold1_sdp);


////
myCseq += 1;
cseq_tag = myCseq;
	
var msg1 = {
			
			method : 'INVITE', ///'NOTIFY',
			uri : callee_uri,
			headers : {
				to : {
					uri : callee_uri,
					params : {
						tag : callee_to_tag
					}
				},
				from : {
					uri : caller_uri,
					params : {
						tag : from1_tag
					}
				},
				////'Alert-Info': 'ring-answer',
				'call-id' : call_id1,
				cseq : {
					method : 'INVITE', ///'NOTIFY',
					seq : cseq_tag
				},
				'content-type' : 'application/sdp',
				//'Content-Disposition' : 'signal;handling=required',
				//'Event': 'talk',
				//via : [],
				via :
					[ 
					  {
					    version: '2.0',
					    protocol: 'UDP',
					    host: HOST,
					    port: sip_port,
					    params: { 
					    	branch: generateBranch()+';rport'
					    	}
					  }
				       
				    ],

				
				contact : [ {
					uri : contact_uri
				} ]
			// if your call doesnt get in-dialog request, maybe os.hostname() isn't
			// resolving in your ip address
			},
			//content : 
			//	'<?xml version="1.0" encoding="UTF-8"?>\r\n'+
			//	'<RequestSystemStatus xmlns="http://www.ecma-international.org/standards/ecma-323/csta/ed3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"/>\r\n'
				

			content : hold2_sdp
				
				
			
			
};

var s11 = sip.stringify(msg1);
console.log("processUNHOLD()...request:>>>\r\n" + s11);

	//
	// proxy.send(sip.makeRespinse(rq, 487, 'Request Terminated'));
	///

proxy.send(msg1,
	
	function(rs) {

		var s1 = sip.stringify(rs);
		console.log("processUNHOLD()...response:>>>\r\n"+s1);
		
		if (rs.status >= 300) {
			console.log('processUNHOLD()...call failed with status ' + rs.status);
			initFlag();

		} else if (rs.status < 200) {
			console.log('processUNHOLD()...call progress status ' + rs.status);

			console.log('processUNHOLD()...1xx with to-tag ' + rs.headers.to.params.tag);
			to1_tag = rs.headers.to.params.tag;

		} else {
			// yes we can get multiple 2xx response with different tags
			console.log('processUNHOLD()...call answered with tag ' + rs.headers.to.params.tag);

			sdp1 = rs.content;
			console.log('processUNHOLD()...sdp: \r\n' + rs.content);
			console.log('processUNHOLD()...call-id:' + rs.headers['call-id']);
			// call_id1 = rs.headers['call-id'];
			to1_tag = rs.headers.to.params.tag;
			
			cseq_tag = rs.headers.cseq.seq;
			console.log('processUNHOLD()...cseq:' + cseq_tag);

			// invite 2nd party....
			//InviteSecondParty(sdp1);
			//

			var id = [ rs.headers['call-id'], rs.headers.from.params.tag,
					rs.headers.to.params.tag ].join(':');

			console.log('processUNHOLD()...id ' + id);

			//hold_sdp = sdp1.replace('a=sendonly','a=sendrecv');

		    // sending ACK to 
			
		    proxy.send({
		      method: 'ACK',
		      uri: callee_uri,
		      headers: {
		        to: {uri: callee_uri, params: {tag: to1_tag}},
		        from: {uri: caller_uri, params: {tag: from1_tag} },
		        'call-id': call_id1,
		        cseq: {method: 'ACK', seq: cseq_tag },
		        contact: [{uri: contact_uri}],
			    'Content-Type': 'application/sdp',
			    'Max-Forwards': '70',
		        //via: []
				via :
					[ 
					  {
					    version: '2.0',
					    protocol: 'UDP',
					    host: HOST,
					    port: sip_port,
					    params: { 
					    	branch: generateBranch()+';rport'
					    	}
					  }
				       
				    ]

		      },
		      content: hold1_sdp
		      
		    });
		    
			


			// registring our 'dialog' which is just function to process
			// in-dialog
			// requests
			if (!dialogs[id]) {
				dialogs[id] = function(rq) {
					if (rq.method === 'BYE') {
						console.log('processUNHOLD...call received bye');

						delete dialogs[id];

						proxy.send(sip.makeResponse(rq, 200, 'Ok'));
						/// 1st party notify to 2nd party....
						var msg = {

							method : 'BYE',
							uri : callee_uri,
							headers : {
								to: {uri: callee_uri, params: {tag: to1_tag}},
								from: {uri : caller_uri, params : {tag: from1_tag}},
								'call-id': call_id1,
								cseq: {method: 'BYE', seq : 4},
								//'content-type': 'application/sdp',
								//via: [],
								via :
									[ 
									  {
									    version: '2.0',
									    protocol: 'UDP',
									    host: HOST,
									    port: sip_port,
									    params: { 
									    	branch: generateBranch()+';rport'
									    	}
									  }
								       
								    ],

								'Max-Forwards': '70',
						  		//contact: [ {uri : p_contact} ]
								// if your call doesnt get in-dialog request, maybe os.hostname() isn't
								// resolving in your ip address
							},
							content : ''
								
								
						};
						var s = sip.stringify(msg);

						console.log("processUNHOLD()...send msg:>>>\r\n"+s);

						
						proxy.send(msg);
						
						initFlag();
								
						
						
					} else {
						proxy.send(sip.makeRespinse(rq, 405, 'Method not allowed'));
					}
				}
			}
		}


		
	}
	
	
);

/////////


var msg2 = {
		
		method : 'INVITE', ///'NOTIFY',
		uri : caller_uri,
		headers : {
			to : {
				uri : caller_uri,
				params : {
					tag : caller_to_tag
				}
			},
			from : {
				uri : callee_uri,
				params : {
					tag : from1_tag
				}
			},
			////'Alert-Info': 'ring-answer',
			'call-id' : call_id1,
			cseq : {
				method : 'INVITE',
				seq : cseq_tag
			},
			'content-type' : 'application/sdp',
			//'Content-Disposition' : 'signal;handling=required',
			//'Event': 'talk',
			//via : [],
			via :
				[ 
				  {
				    version: '2.0',
				    protocol: 'UDP',
				    host: HOST,
				    port: sip_port,
				    params: { 
				    	branch: generateBranch()+';rport'
				    	}
				  }
			       
			    ],

			
			contact : [ {
				uri : contact_uri
			} ]
		// if your call doesnt get in-dialog request, maybe os.hostname() isn't
		// resolving in your ip address
		},
		//content : 
		//	'<?xml version="1.0" encoding="UTF-8"?>\r\n'+
		//	'<RequestSystemStatus xmlns="http://www.ecma-international.org/standards/ecma-323/csta/ed3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"/>\r\n'
			

		content : hold1_sdp
			
			
		
		
};

var s22 = sip.stringify(msg2);
console.log("processUNHOLD()...request:>>>\r\n" + s22);

//
// proxy.send(sip.makeRespinse(rq, 487, 'Request Terminated'));
///

proxy.send(msg2,

function(rs) {

	var s1 = sip.stringify(rs);
	console.log("processUNHOLD()...response:>>>\r\n"+s1);
	
	if (rs.status >= 300) {
		console.log('processUNHOLD()...call failed with status ' + rs.status);
		initFlag();

	} else if (rs.status < 200) {
		console.log('processUNHOLD()...call progress status ' + rs.status);

		console.log('processUNHOLD()...1xx with to-tag ' + rs.headers.to.params.tag);
		to1_tag = rs.headers.to.params.tag;

	} else {
		// yes we can get multiple 2xx response with different tags
		console.log('processUNHOLD()...call answered with tag ' + rs.headers.to.params.tag);

		sdp2 = rs.content;
		console.log('processUNHOLD()...sdp: \r\n' + rs.content);
		console.log('processUNHOLD()...call-id:' + rs.headers['call-id']);
		// call_id1 = rs.headers['call-id'];
		to1_tag = rs.headers.to.params.tag;
		
		cseq_tag = rs.headers.cseq.seq;
		console.log('processUNHOLD()...cseq:' + cseq_tag);

		// invite 2nd party....
		//InviteSecondParty(sdp1);
		//

		var id = [ rs.headers['call-id'], rs.headers.from.params.tag,
				rs.headers.to.params.tag ].join(':');

		console.log('processUNHOLD()...id ' + id);

		//hold_sdp = sdp1.replace('a=sendonly','a=sendrecv');

	    // sending ACK to 
		
	    proxy.send({
	      method: 'ACK',
	      uri: caller_uri,
	      headers: {
	        to: {uri: caller_uri, params: {tag: to1_tag}},
	        from: {uri: callee_uri, params: {tag: from1_tag} },
	        'call-id': call_id1,
	        cseq: {method: 'ACK', seq: cseq_tag },
	        contact: [{uri: contact_uri}],
		    'Content-Type': 'application/sdp',
		    'Max-Forwards': '70',
	        //via: []
			via :
				[ 
				  {
				    version: '2.0',
				    protocol: 'UDP',
				    host: HOST,
				    port: sip_port,
				    params: { 
				    	branch: generateBranch()+';rport'
				    	}
				  }
			       
			    ]

	      },
	      content: hold2_sdp
	      
	    });
	    
		


		// registring our 'dialog' which is just function to process
		// in-dialog
		// requests
		if (!dialogs[id]) {
			dialogs[id] = function(rq) {
				if (rq.method === 'BYE') {
					console.log('processUNHOLD...call received bye');

					delete dialogs[id];

					proxy.send(sip.makeResponse(rq, 200, 'Ok'));
					/// 1st party notify to 2nd party....
					var msg = {

						method : 'BYE',
						uri : caller_uri,
						headers : {
							to: {uri: caller_uri, params: {tag: to1_tag}},
							from: {uri : callee_uri, params : {tag: from1_tag}},
							'call-id': call_id1,
							cseq: {method: 'BYE', seq : 4},
							//'content-type': 'application/sdp',
							//via: [],
							via :
								[ 
								  {
								    version: '2.0',
								    protocol: 'UDP',
								    host: HOST,
								    port: sip_port,
								    params: { 
								    	branch: generateBranch()+';rport'
								    	}
								  }
							       
							    ],

							
							'Max-Forwards': '70',
					  		//contact: [ {uri : p_contact} ]
							// if your call doesnt get in-dialog request, maybe os.hostname() isn't
							// resolving in your ip address
						},
						content : ''
							
							
					};
					var s = sip.stringify(msg);

					console.log("processUNHOLD()...send msg:>>>\r\n"+s);

					
					proxy.send(msg);
					
					initFlag();
							
					
					
				} else {
					proxy.send(sip.makeRespinse(rq, 405, 'Method not allowed'));
				}
			}
		}
	}


	
}


);

	
	
	
}

function processCANCEL(
		caller_uri,
		callee_uri,
		contact_uri,
		pai_uri
		
	) 
{
	
console.log('Trying to use CANCEL......');
tracelog('Trying to use CANCEL........');

//call_id1= getNewCallId(); ///rstring();
//call_id2= call_id1;

//myCseq += 1;

var msg1 = {
			

		method : 'CANCEL',
		uri : caller_uri,
		headers : {
			to : {	uri : caller_uri, params : {tag : caller_to_tag	}},
			from : { uri : callee_uri, params : {tag : from1_tag }},
			'call-id' : call_id1,
			cseq : { method : 'CANCEL',	seq : myCseq },
			//'content-type' : 'application/sdp',
			//'P-Asserted-Identity' : pai_uri,
		    'Max-Forwards': '70',
		    'User-Agent' : '3PCC-TEST',
		    //'Allow' : 'INVITE, ACK, CANCEL, OPTIONS, BYE, REFER, SUBSCRIBE, NOTIFY, INFO, PUBLISH',

		    //'Via' : via_branch_tag,
		    
			via : 
				[ 
				  {
				    version: '2.0',
				    protocol: 'UDP',
		            host: HOST,
				    port: sip_port,
				    params: { branch: caller_branch_tag }
				  }
			       
			    ]
			
			//via: []

			//,
			//contact : [ {
			//	uri : contact_uri
			//} ]


		// if your call doesnt get in-dialog request, maybe os.hostname() isn't
		// resolving in your ip address
		},
		content : ''
			
};

var s11 = sip.stringify(msg1);
console.log("processCANCEL()...request:>>>\r\n"+s11);



proxy.send(msg1,
	
	function(rs) {

		var s1 = sip.stringify(rs);
		console.log("processCANCEL()...received msg:>>>\r\n"+s1);
		
		if (rs.status >= 300) {
			console.log('processCANCEL()...call failed with status ' + rs.status);
			initFlag();

		} else if (rs.status < 200) {
			console.log('processCANCEL()...call progress status ' + rs.status);

			console.log('processCANCEL()...1xx with to-tag ' + rs.headers.to.params.tag);
			//to1_tag = rs.headers.to.params.tag;

		} else {
			// yes we can get multiple 2xx response with different tags
			console.log('processCANCEL()...call answered with tag ' + rs.headers.to.params.tag);

			//sdp1 = rs.content;
			//console.log('processCANCEL()...sdp1: \r\n' + sdp1);
			console.log('processCANCEL()...call-id:' + rs.headers['call-id']);
			// call_id1 = rs.headers['call-id'];
			to1_tag = rs.headers.to.params.tag;
			

			// invite 2nd party....
			///InviteSecondParty(sdp1);

			var id = [ rs.headers['call-id'], rs.headers.from.params.tag,
					rs.headers.to.params.tag ].join(':');

			console.log('processCANCEL()...id ' + id);
			
		    // sending ACK to First
		    proxy.send({
		      method: 'ACK',
		      uri: caller_uri,
		      headers: {
		        to: {uri: caller_uri, params: {tag: to1_tag}},
		        from: {uri: callee_uri, params: {tag: from1_tag} },
		        'call-id': call_id1,
		        cseq: {
		        	  method: 'ACK', 
		        	  seq: myCseq 
		        	  },
		        //contact: [{uri: contact1_uri}],
			    ///'Content-Type': 'application/sdp',
			    'Max-Forwards': '70',
		        //via: []
				via :
					[ 
					  {
					    version: '2.0',
					    protocol: 'UDP',
					    host: HOST,
					    port: sip_port,
					    params: { 
					    	branch: generateBranch()+';rport'
					    	}
					  }
				       
				    ]
 
		      },
		      content: ''
		      
		    });


			// registring our 'dialog' which is just function to process
			// in-dialog
			// requests
			if (!dialogs[id]) {
				dialogs[id] = function(rq) {
					if (rq.method === 'BYE') {
						console.log('processCANCEL()...call received bye');

						delete dialogs[id];

						proxy.send(sip.makeResponse(rq, 200, 'Ok'));
						/// 1st party notify to 2nd party....
						var msg = {

							method : 'BYE',
							uri : callee_uri,
							headers : {
								to: {uri: callee_uri, params: {tag: to1_tag}},
								from: {uri : caller_uri, params : {tag: from1_tag}},
								'call-id': call_id1,
								cseq: {method: 'BYE', seq : rstring() },
								//'content-type': 'application/sdp',
								//via: [],
								via :
									[ 
									  {
									    version: '2.0',
									    protocol: 'UDP',
									    host: HOST,
									    port: sip_port,
									    params: { 
									    	branch: generateBranch()+';rport'
									    	}
									  }
								       
								    ],

								'Max-Forwards': '70',
						  		//contact: [ {uri : p_contact} ]
								// if your call doesnt get in-dialog request, maybe os.hostname() isn't
								// resolving in your ip address
							},
							content : ''
								
								
						};
						var s = sip.stringify(msg);

						console.log("processCANCEL()...send msg:>>>\r\n"+s);

						
						proxy.send(msg);
						
						initFlag();
								
						
						
					} else {
						proxy.send(sip.makeRespinse(rq, 405, 'Method not allowed'));
					}
				}
			}
		}


		
	}
	 
	
	
	);
	
///////////////

var msg2 = {
		

		method : 'CANCEL',
		uri : callee_uri,
		headers : {
			to : {	uri : callee_uri, params : {tag : callee_to_tag	}},
			from : { uri : caller_uri, params : {tag : from1_tag }},
			'call-id' : call_id1,
			cseq : { method : 'CANCEL',	seq : myCseq },
			//'content-type' : 'application/sdp',
			//'P-Asserted-Identity' : pai_uri,
		    'Max-Forwards': '70',
		    'User-Agent' : '3PCC-TEST',
		    //'Allow' : 'INVITE, ACK, CANCEL, OPTIONS, BYE, REFER, SUBSCRIBE, NOTIFY, INFO, PUBLISH',

		    //'Via' : via_branch_tag,
		    
			via : 
				[ 
				  {
				    version: '2.0',
				    protocol: 'UDP',
		            host: HOST,
				    port: sip_port,
				    params: { branch: callee_branch_tag }
				  }
			       
			    ]
			
			//via: []

			//,
			//contact : [ {
			//	uri : contact_uri
			//} ]


		// if your call doesnt get in-dialog request, maybe os.hostname() isn't
		// resolving in your ip address
		},
		content : ''
			
};

var s22 = sip.stringify(msg2);
console.log("processCANCEL()...request:>>>\r\n"+s22);



proxy.send(msg2,
	
	function(rs) {

		var s1 = sip.stringify(rs);
		console.log("processCANCEL()...received msg:>>>\r\n"+s1);
		
		if (rs.status >= 300) {
			console.log('processCANCEL()...call failed with status ' + rs.status);
			initFlag();

		} else if (rs.status < 200) {
			console.log('processCANCEL()...call progress status ' + rs.status);

			console.log('processCANCEL()...1xx with to-tag ' + rs.headers.to.params.tag);
			//to1_tag = rs.headers.to.params.tag;

		} else {
			// yes we can get multiple 2xx response with different tags
			console.log('processCANCEL()...call answered with tag ' + rs.headers.to.params.tag);

			//sdp1 = rs.content;
			//console.log('processCANCEL()...sdp1: \r\n' + sdp1);
			console.log('processCANCEL()...call-id:' + rs.headers['call-id']);
			// call_id1 = rs.headers['call-id'];
			to1_tag = rs.headers.to.params.tag;
			

			// invite 2nd party....
			///InviteSecondParty(sdp1);

			var id = [ rs.headers['call-id'], rs.headers.from.params.tag,
					rs.headers.to.params.tag ].join(':');

			console.log('processCANCEL()...id ' + id);
			
		    // sending ACK to First
		    proxy.send({
		      method: 'ACK',
		      uri: callee_uri,
		      headers: {
		        to: {uri: callee_uri, params: {tag: to1_tag}},
		        from: {uri: caller_uri, params: {tag: from1_tag} },
		        'call-id': call_id1,
		        cseq: {
		        	  method: 'ACK', 
		        	  seq: myCseq 
		        	  },
		        //contact: [{uri: contact1_uri}],
			    ///'Content-Type': 'application/sdp',
			    'Max-Forwards': '70',
		        //via: []
				via :
					[ 
					  {
					    version: '2.0',
					    protocol: 'UDP',
					    host: HOST,
					    port: sip_port,
					    params: { 
					    	branch: generateBranch()+';rport'
					    	}
					  }
				       
				    ]

		      },
		      content: ''
		      
		    });


			// registring our 'dialog' which is just function to process
			// in-dialog
			// requests
			if (!dialogs[id]) {
				dialogs[id] = function(rq) {
					if (rq.method === 'BYE') {
						console.log('processCANCEL()...call received bye');

						delete dialogs[id];

						proxy.send(sip.makeResponse(rq, 200, 'Ok'));
						/// 1st party notify to 2nd party....
						var msg = {

							method : 'BYE',
							uri : callee_uri,
							headers : {
								to: {uri: callee_uri, params: {tag: to1_tag}},
								from: {uri : caller_uri, params : {tag: from1_tag}},
								'call-id': call_id1,
								cseq: {method: 'BYE', seq : rstring() },
								//'content-type': 'application/sdp',
								//via: [],
								via :
									[ 
									  {
									    version: '2.0',
									    protocol: 'UDP',
									    host: HOST,
									    port: sip_port,
									    params: { 
									    	branch: generateBranch()+';rport'
									    	}
									  }
								       
								    ],

								'Max-Forwards': '70',
						  		//contact: [ {uri : p_contact} ]
								// if your call doesnt get in-dialog request, maybe os.hostname() isn't
								// resolving in your ip address
							},
							content : ''
								
								
						};
						var s = sip.stringify(msg);

						console.log("processCANCEL()...send msg:>>>\r\n"+s);

						
						proxy.send(msg);
						
						initFlag();
								
						
						
					} else {
						proxy.send(sip.makeRespinse(rq, 405, 'Method not allowed'));
					}
				}
			}
		}


		
	}
	 
	
	
	);


	
} 

function processBYE_1(
		call_id_1,
		caller_uri,
		callee_uri,
		contact_uri,
		pai_uri

	)
{

	console.log('Trying to do processBYE_1......');
	tracelog('Trying to do processBYE_1........');

	initFlag();


	myCseq += 1;
	myCseq += 1;
	
	var msg1 = {
			
			method : 'BYE',
			uri : callee_uri,
			headers : {
				to : {uri : callee_uri,	params : {tag : callee_to_tag}},
				from : {uri : caller_uri, params : {tag : from1_tag}},
				'call-id' : call_id_1,
				cseq : {method : 'BYE',	seq : myCseq},
				//'content-type' : 'application/sdp',
				///via : [],
				via :
					[ 
					  {
					    version: '2.0',
					    protocol: 'UDP',
					    host: HOST,
					    port: sip_port,
					    params: { 
					    	branch: generateBranch()+';rport'
					    	}
					  }
				       
				    ],

				
				contact : [ {uri : contact_uri} ]
			// if your call doesnt get in-dialog request, maybe os.hostname() isn't
			// resolving in your ip address
			},
			content : ''
		
			
	};	

	var s11 = sip.stringify(msg1);
	console.log("processBYE_1()...request:>>>\r\n"+s11);


	proxy.send(msg1);
	
	
}

function processBYE(
		caller_uri,
		callee_uri,
		contact_uri,
		pai_uri
		) 
{
	
console.log('Trying to use BYE......');
tracelog('Trying to use BYE........');

initFlag();


myCseq += 1;
myCseq += 1;


var msg1 = {
		
		method : 'BYE',
		uri : callee_uri,
		headers : {
			to : {uri : callee_uri,	params : {tag : callee_to_tag}},
			from : {uri : caller_uri, params : {tag : from1_tag}},
			'call-id' : call_id1,
			cseq : {method : 'BYE',	seq : myCseq},
			//'content-type' : 'application/sdp',
			///via : [],
			via :
				[ 
				  {
				    version: '2.0',
				    protocol: 'UDP',
				    host: HOST,
				    port: sip_port,
				    params: { 
				    	branch: generateBranch()+';rport'
				    	}
				  }
			       
			    ],

			
			contact : [ {uri : contact_uri} ]
		// if your call doesnt get in-dialog request, maybe os.hostname() isn't
		// resolving in your ip address
		},
		content : ''
	
		
};	

var s11 = sip.stringify(msg1);
console.log("processBYE()...request:>>>\r\n"+s11);


proxy.send(msg1);
	
/////
// 2nd party notify to 1st party.... 
/////
myCseq += 1;

var msg2 = {

	method : 'BYE',
	uri : caller_uri,
	headers : {
		to: {uri: caller_uri, params: {tag: caller_to_tag}},
		from: {uri : callee_uri, params : {tag: from1_tag}},
		'call-id': call_id1,
		cseq: {method: 'BYE', seq : myCseq },
		//'content-type': 'application/sdp',
		//via: [],
		via :
			[ 
			  {
			    version: '2.0',
			    protocol: 'UDP',
			    host: HOST,
			    port: sip_port,
			    params: { 
			    	branch: generateBranch()+';rport'
			    	}
			  }
		       
		    ],
		
		'Max-Forwards': '70',
  		contact: [ {uri : contact_uri} ]
		// if your call doesnt get in-dialog request, maybe os.hostname() isn't
		// resolving in your ip address
	},
	content : ''
			
			
};
var s22 = sip.stringify(msg2);

console.log("processBYE()...request:>>>\r\n"+s22);

	
proxy.send(msg2);


		
	 
	
	

	
}

////
function processANSWER_Callee(
		caller_uri,
		callee_uri,
		contact_uri,
		pai_uri
		) 
{
	
	console.log('Trying to send NOTIFY to Answer Callee......');

	//call_id1= getNewCallId(); ///rstring();
	//call_id2= call_id1;

	///myCseq += 1;
	myNotifyCseq = myCseq + 1;///1;
	
	var msg = {
						

				method : 'NOTIFY',
				uri : callee_uri, ////request1_uri,
				headers : {
					to : {
						uri : callee_uri, ///to1_uri
						params : {
							tag : callee_to_tag
						}
					},
					from : {
						uri : caller_uri,
						params : {
							tag : from1_tag
						}
					},
					'call-id' : call_id1, ///rstring(),
					cseq : {
						method : 'NOTIFY',
						seq : myNotifyCseq
					},
					//'content-type' : 'application/simple-message-summary',
			        'Event': 'talk',
			        //'subscription-state': '',
			        //'Message-Waiting': 'yes',
					
					//via : [],
					       
					via :
						[ 
						  {
						    version: '2.0',
						    protocol: 'UDP',
						    host: HOST,
						    port: sip_port,
						    params: { 
						    	branch: generateBranch()+';rport'
						    	}
						  }
					       
					    ],

					// contact : [ {
					// uri : contact1_uri
					// } ]
					// if your call doesnt get in-dialog request, maybe os.hostname() isn't
					// resolving in your ip address
				},
				content : ''
						
						
	};

	var s11 = sip.stringify(msg);
	console.log("processANSWER_Callee()...request:>>>\r\n"+s11);


	proxy.send(msg,
				
			function(rs) {

					var s1 = sip.stringify(rs);
					console.log("processANSWER_Callee()...received msg:>>>\r\n"+s1);
					
					if (rs.status >= 300) {
						console.log('processANSWER_Callee()...call failed with status ' + rs.status);
						initFlag();

					} else if (rs.status < 200) {
						console.log('processANSWER_Callee()...call progress status ' + rs.status);

						console.log('processANSWER_Callee()...1xx with to-tag ' + rs.headers.to.params.tag);
						//to1_tag = rs.headers.to.params.tag;

					} else {
						// yes we can get multiple 2xx response with different tags
						console.log('processANSWER_Callee()...call answered with tag ' + rs.headers.to.params.tag);

						//sdp1 = rs.content;
						//console.log('processANSWER()...sdp1: \r\n' + sdp1);
						console.log('processANSWER_Callee()...call-id:' + rs.headers['call-id']);
						// call_id1 = rs.headers['call-id'];
						//to1_tag = rs.headers.to.params.tag;
						

						// invite 2nd party....
						///InviteSecondParty(sdp1);

						var id = [ rs.headers['call-id'], rs.headers.from.params.tag,
								rs.headers.to.params.tag ].join(':');

						console.log('processANSWER_Callee()...id ' + id);
						
					    // sending ACK to First
						/*
					    proxy.send({
					      method: 'ACK',
					      uri: request1_uri,
					      headers: {
					        to: {uri: to1_uri, params: {tag: to1_tag}},
					        from: {uri: from1_uri, params: {tag: from1_tag} },
					        'call-id': call_id1,
					        cseq: {method: 'ACK', seq: 1 },
					        contact: [{uri: contact1_uri}],
						    'Content-Type': 'application/sdp',
						    'Max-Forwards': '70',
					        via: []
					      },
					      content: ''
					      
					    });*/


						// registring our 'dialog' which is just function to process
						// in-dialog
						// requests
						if (!dialogs[id]) {
							dialogs[id] = function(rq) {
								if (rq.method === 'BYE') {
									console.log('processANSWER_Callee()...call received bye');

									delete dialogs[id];

									proxy.send(sip.makeResponse(rq, 200, 'Ok'));
									/// 1st party notify to 2nd party....
									myNotifyCseq += 1;
									var msg = {

										method : 'BYE',
										uri : callee_uri,
										headers : {
											to: {uri: callee_uri, params: {tag: to1_tag}},
											from: {uri : caller_uri, params : {tag: from1_tag}},
											'call-id': call_id1,
											cseq: {method: 'BYE', seq : myNotifyCseq },
											//'content-type': 'application/sdp',
											//via: [],
											via :
												[ 
												  {
												    version: '2.0',
												    protocol: 'UDP',
												    host: HOST,
												    port: sip_port,
												    params: { 
												    	branch: generateBranch()+';rport'
												    	}
												  }
											       
											    ],

											'Max-Forwards': '70',
									  		//contact: [ {uri : p_contact} ]
											// if your call doesnt get in-dialog request, maybe os.hostname() isn't
											// resolving in your ip address
										},
										content : ''
											
											
									};
									var s = sip.stringify(msg);

									console.log("processANSWER_Callee()...send msg:>>>\r\n"+s);

									
									proxy.send(msg);
									
									initFlag();
											
									
									
								} else {
									proxy.send(sip.makeRespinse(rq, 405, 'Method not allowed'));
								}
							}
						}
					}


					
				}
				 
				
				
	);
	
	
}

function processANSWER_Caller(
		caller_uri,
		callee_uri,
		contact_uri,
		pai_uri
		) 
{

console.log('Trying to send NOTIFY to Answer Caller......');

//call_id1= getNewCallId(); ///rstring();
//call_id2= call_id1;

//myCseq += 1;
myNotifyCseq = myCseq + 1;

var msg = {
					

			method : 'NOTIFY',
			uri : caller_uri, ////request1_uri,
			headers : {
				to : {
					uri : caller_uri, ///to1_uri
					params : {
						tag : caller_to_tag
					}
					
				},
				from : {
					uri : callee_uri,
					params : {
						tag : from1_tag
					}
				},
				'call-id' : call_id1, ///rstring(),
				cseq : {
					method : 'NOTIFY',
					seq : myNotifyCseq
				},
				//'content-type' : 'application/simple-message-summary',
		        'Event': 'talk',
		        //'subscription-state': '',
		        //'Message-Waiting': 'yes',
				
				////via : [],
				via :
					[ 
					  {
					    version: '2.0',
					    protocol: 'UDP',
					    host: HOST,
					    port: sip_port,
					    params: { 
					    	branch: generateBranch()+';rport'
					    	}
					  }
				       
				    ],


				// contact : [ {
				// uri : contact1_uri
				// } ]
				// if your call doesnt get in-dialog request, maybe os.hostname() isn't
				// resolving in your ip address
			},
			content : ''
					
					
};

var s11 = sip.stringify(msg);
console.log("processANSWER_Caller()...request:>>>\r\n"+s11);


proxy.send(msg,
			
		function(rs) {

				var s1 = sip.stringify(rs);
				console.log("processANSWER_Caller()...received msg:>>>\r\n"+s1);
				
				if (rs.status >= 300) {
					console.log('processANSWER_Caller()...call failed with status ' + rs.status);
					initFlag();

				} else if (rs.status < 200) {
					console.log('processANSWER_Caller()...call progress status ' + rs.status);

					console.log('processANSWER_Caller()...1xx with to-tag ' + rs.headers.to.params.tag);
					//to1_tag = rs.headers.to.params.tag;

				} else {
					// yes we can get multiple 2xx response with different tags
					console.log('processANSWER_Caller()...call answered with tag ' + rs.headers.to.params.tag);

					//sdp1 = rs.content;
					//console.log('processANSWER()...sdp1: \r\n' + sdp1);
					console.log('processANSWER_Caller()...call-id:' + rs.headers['call-id']);
					// call_id1 = rs.headers['call-id'];
					//to1_tag = rs.headers.to.params.tag;
					

					// invite 2nd party....
					///InviteSecondParty(sdp1);

					var id = [ rs.headers['call-id'], rs.headers.from.params.tag,
							rs.headers.to.params.tag ].join(':');

					console.log('processANSWER_Caller()...id ' + id);
					
				    // sending ACK to First
					/*
				    proxy.send({
				      method: 'ACK',
				      uri: request1_uri,
				      headers: {
				        to: {uri: to1_uri, params: {tag: to1_tag}},
				        from: {uri: from1_uri, params: {tag: from1_tag} },
				        'call-id': call_id1,
				        cseq: {method: 'ACK', seq: 1 },
				        contact: [{uri: contact1_uri}],
					    'Content-Type': 'application/sdp',
					    'Max-Forwards': '70',
				        via: []
				      },
				      content: ''
				      
				    });*/


					// registring our 'dialog' which is just function to process
					// in-dialog
					// requests
					if (!dialogs[id]) {
						dialogs[id] = function(rq) {
							if (rq.method === 'BYE') {
								console.log('processANSWER_Caller()...call received bye');

								delete dialogs[id];

								proxy.send(sip.makeResponse(rq, 200, 'Ok'));
								/// 1st party notify to 2nd party....
								myNotifyCseq += 1;
								var msg = {

									method : 'BYE',
									uri : caller_uri,
									headers : {
										to: {uri: caller_uri, params: {tag: to1_tag}},
										from: {uri : callee_uri, params : {tag: from1_tag}},
										'call-id': call_id1,
										cseq: {method: 'BYE', seq : myNotifyCseq},
										//'content-type': 'application/sdp',
										//via: [],
										via :
											[ 
											  {
											    version: '2.0',
											    protocol: 'UDP',
											    host: HOST,
											    port: sip_port,
											    params: { 
											    	branch: generateBranch()+';rport'
											    	}
											  }
										       
										    ],

										'Max-Forwards': '70',
								  		//contact: [ {uri : p_contact} ]
										// if your call doesnt get in-dialog request, maybe os.hostname() isn't
										// resolving in your ip address
									},
									content : ''
										
										
								};
								var s = sip.stringify(msg);

								console.log("processANSWER_Caller()...send msg:>>>\r\n"+s);

								
								proxy.send(msg);
								
								initFlag();
										
								
								
							} else {
								proxy.send(sip.makeRespinse(rq, 405, 'Method not allowed'));
							}
						}
					}
				}


				
			}
			 
			
			
);
	

///////////


	
	
}

function processINVITE(
		caller_uri,
		callee_uri,
		contact_uri,
		pai_uri
		) 
{

console.log('Trying to use INVITE......');
tracelog('Trying to use INVITE........');

if(my_call_id==='')
{
	call_id1 = getNewCallId(); ///rstring();
	call_id2 = call_id1;
	
} else {
	call_id1 = my_call_id;
	call_id2 = call_id1;
	
}

//var via_tag = rq.headers.via[0].params.branch = generateBranch();

var mybranch = generateBranch()+';rport';

console.log('processINVITE()....branch='+mybranch);


myCseq = 1;

var msg = {
		
		method : 'INVITE',
		uri : callee_uri,
		headers : {
			to : {
				uri : callee_uri
			},
			from : {
				uri : caller_uri,
				params : {
					tag : from1_tag,
				}
			},
			'call-id' : call_id1,
			cseq : {
				method : 'INVITE',
				seq : myCseq
			},
			//'Alert-Info': 'info=alert-autoanswer',//'info=alert-autoanswer', ///'ring answer',
			//'Alert-Info': 'ring answer',//'info=alert-autoanswer', ///'ring answer',
			//'Call-Info' : 'answer-after=3',
			'content-type' : 'application/sdp',
			'P-Asserted-Identity' : pai_uri,
		    'Max-Forwards': '70',
		    'User-Agent' : '3PCC-TEST',
		    'Allow' : 'INVITE, ACK, CANCEL, OPTIONS, BYE, REFER, SUBSCRIBE, NOTIFY, INFO, PUBLISH',

		    
			via :
				[ 
				  {
				    version: '2.0',
				    protocol: 'UDP',
		            host: HOST,
				    port: sip_port,
				    params: { 
				    	branch: mybranch 
				    	}
				  }
			       
			    ]
		    
		    

			,
			contact : [ {
				uri : contact_uri,
			} ]
		// if your call doesnt get in-dialog request, maybe os.hostname() isn't
		// resolving in your ip address
		},
		content : ''
			
			/*
			'v=0\r\n'
			+'o=- 1340610679 1340610679 IN IP4 192.168.0.101\r\n'
			+'s=Polycom IP Phone\r\n'
			+'c=IN IP4 192.168.0.101\r\n'
			+'t=0 0\r\n'
			+'a=sendrecv\r\n'
			+'m=audio 2258 RTP/AVP 8 0 101\r\n'
			+'a=rtpmap:8 PCMA/8000\r\n'
			+'a=rtpmap:0 PCMU/8000\r\n'
			+'a=rtpmap:101 telephone-event/8000\r\n'
			+ivr_app_sdp
			*/
			
			/*
			+'m=control 0 cti application\r\n'
	        +'a=command:WHISPER\r\n'
	        +'a=arg1:111111111111111111111111111111\r\n'
	        +'a=arg2:2222222222222222222222222222\r\n'
	        +'a=arg3:3333333333333333333333333\r\n'
	        +'a=arg4:44444444444444444444444\r\n'
	        +'a=arg5:555555555555555555555\r\n'
	        +'a=arg6:6666666666666666666\r\n'
	        +'a=arg7:777777777777777777\r\n'
	        +'a=arg8:888888888888888\r\n'
	        +'a=arg9:999999999999\r\n'
	        +'a=arg10:1000000000000000000000000\r\n'
			//+'m=application 0 app2 do something about call conference\r\n'
			//+'m=text 0 app3 do something about call monitor\r\n'
			//+'m=data 0 app4 do something about call whisper\r\n'
			//+'m=message 0 app5 do something else..............\r\n'
			*/
			

	
		
};	

var s11 = sip.stringify(msg);
console.log("processINVITE()...request:>>>\r\n"+s11);


proxy.send(msg,
	
	function(rs) {

		var s1 = sip.stringify(rs);
		console.log("processINVITE()...received msg:>>>\r\n"+s1);
		
		if (rs.status >= 300) {
			console.log('processINVITE()...call failed with status ' + rs.status);
			initFlag();

		} else if (rs.status < 200) {
			console.log('processINVITE()...call progress status ' + rs.status);

			console.log('processINVITE()...1xx with to-tag ' + rs.headers.to.params.tag);
			to1_tag = rs.headers.to.params.tag;

			callee_to_tag = to1_tag;
			
			via_branch_tag = rs.headers.via[0].params.branch;
			console.log('processINVITE()...via_branch: '+via_branch_tag);
			if(rs.status === 180) {
				callee_branch_tag = rs.headers.via[0].params.branch;
				console.log('processINVITE()...180 Ringing...via_branch: '+callee_branch_tag);
			}


		} else {
			// yes we can get multiple 2xx response with different tags
			console.log('processINVITE()...call answered with tag ' + rs.headers.to.params.tag);

			//sdp1 = rs.content;
			//console.log('processINVITE()...sdp1: \r\n' + sdp1);
			console.log('processINVITE()...call-id:' + rs.headers['call-id']);
			// call_id1 = rs.headers['call-id'];
			to1_tag = rs.headers.to.params.tag;
			
			callee_to_tag = to1_tag;
			

			// invite 2nd party....
			///InviteSecondParty(sdp1);

			var id = [ rs.headers['call-id'], rs.headers.from.params.tag,
					rs.headers.to.params.tag ].join(':');

			console.log('processINVITE()...id ' + id);
			
		    // sending ACK to First
		    proxy.send({
		      method: 'ACK',
		      uri: callee_uri,
		      headers: {
		        to: {uri: callee_uri, params: {tag: to1_tag}},
		        from: {uri: caller_uri, params: {tag: from1_tag} },
		        'call-id': call_id1,
		        cseq: {method: 'ACK', seq: myCseq },
		        contact: [{uri: contact_uri}],
			    'Content-Type': 'application/sdp',
			    'Max-Forwards': '70',
		        //via: []
				via :
					[ 
					  {
					    version: '2.0',
					    protocol: 'UDP',
					    host: HOST,
					    port: sip_port,
					    params: { 
					    	branch: generateBranch()+';rport'
					    	}
					  }
				       
				    ],
		        
		      },
		      content: ''
		      
		    });


			// registring our 'dialog' which is just function to process
			// in-dialog
			// requests
			if (!dialogs[id]) {
				dialogs[id] = function(rq) {
					if (rq.method === 'BYE') {
						console.log('processINVITE()...call received bye');

						delete dialogs[id];

						proxy.send(sip.makeResponse(rq, 200, 'Ok'));
						/// 1st party notify to 2nd party....
						var msg = {

							method : 'BYE',
							uri : callee_uri,
							headers : {
								to: {uri: callee_uri, params: {tag: to1_tag}},
								from: {uri : caller_uri, params : {tag: from1_tag}},
								'call-id': call_id2,
								cseq: {method: 'BYE', seq : myCseq },
								//'content-type': 'application/sdp',
								//via: [],
								via :
									[ 
									  {
									    version: '2.0',
									    protocol: 'UDP',
									    host: HOST,
									    port: sip_port,
									    params: { 
									    	branch: generateBranch()+';rport'
									    	}
									  }
								       
								    ],

								'Max-Forwards': '70',
						  		//contact: [ {uri : p_contact} ]
								// if your call doesnt get in-dialog request, maybe os.hostname() isn't
								// resolving in your ip address
							},
							content : ''
								
								
						};
						var s = sip.stringify(msg);

						console.log("processINVITE()...send msg:>>>\r\n"+s);

						
						proxy.send(msg);
						
						initFlag();
								
						/*
						processSipRequest(
								'BYE',from1_uri,
								to1_uri,to1_tag,
								from1_uri,from1_tag,
								request1_uri,call_id1
								);

						*/
						
						
					} else {
						proxy.send(sip.makeRespinse(rq, 405, 'Method not allowed'));
					}
				}
			}
		}


		
	}
	 
	
	
);
	
	
}

function processSingleStepTransfer_REFER(
		p_caller_uri, 
		p_callee_uri,
		p_contact_uri, 
		p_pai_uri, 
		p_target_uri

		)
{
	
	console.log('processSingleStepTransfer_REFER()......');
	tracelog('processSingleStepTransfer_REFER()........');

	//call_id1= getNewCallId(); ///rstring();
	//call_id2= call_id1;

	///initFlag();

	myCseq += 1;
	cseq_tag = myCseq;

	var msg = {
				
				method : 'REFER',
				uri : p_callee_uri,
				headers : {
					to : {
						uri : p_callee_uri
						//params : {
						//	tag : to1_tag
						//}
					},
					from : {
						uri : p_caller_uri,
						params : {
							tag : from1_tag
						}
					},
					////'Alert-Info': 'ring-answer',
					'call-id' : call_id1,
					cseq : {
						method : 'REFER',
						seq : myCseq
					},
					'Refer-To' : p_target_uri,
					//'Supported' : 'timer',
					//'Content-Type' : 'application/csta+xml',
					//'Content-Disposition' : 'signal;handling=required',
					//via : [],
					via :
						[ 
						  {
						    version: '2.0',
						    protocol: 'UDP',
						    host: HOST,
						    port: sip_port,
						    params: { 
						    	branch: generateBranch()+';rport'
						    	}
						  }
					       
					    ],

					
					contact : [ {
						uri : p_contact_uri
					} ]
				// if your call doesnt get in-dialog request, maybe os.hostname() isn't
				// resolving in your ip address
				},
				//content : 
				//	'<?xml version="1.0" encoding="UTF-8"?>\r\n'+
				//	'<RequestSystemStatus xmlns="http://www.ecma-international.org/standards/ecma-323/csta/ed3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"/>\r\n'
					

				content : ''
				
				
	};

	var s11 = sip.stringify(msg);
	console.log("processSingleStepTransfer_REFER()...request:>>>\r\n"+s11);

	///
	/// proxy.send(sip.makeRespinse(rq, 487, 'Request Terminated'));
	///

	proxy.send(msg,
		
		function(rs) {

			var s1 = sip.stringify(rs);
			console.log("processSingleStepTransfer_REFER()...response:>>>\r\n"+s1);
			
			if (rs.status >= 300) {
				console.log('processSingleStepTransfer_REFER()...call failed with status ' + rs.status);
				initFlag();

				
				

			} else if (rs.status < 200) {
				console.log('processSingleStepTransfer_REFER()...call progress status ' + rs.status);

				console.log('processSingleStepTransfer_REFER()...1xx with to-tag ' + rs.headers.to.params.tag);
				to1_tag = rs.headers.to.params.tag;
				
				if(rs.status === 180){
					
					//myCseq += 1;
					var msg = {
							method : 'BYE',
							uri : p_caller_uri,
							headers : {
								to: {uri: p_caller_uri, params: {tag: caller_to_tag}},
								from: {uri : p_callee_uri, params : {tag: from1_tag}},
								'call-id': call_id1,
								cseq: {method: 'BYE', seq : rstring()},
								//'content-type': 'application/sdp',
								//via: [],
								via :
									[ 
									  {
									    version: '2.0',
									    protocol: 'UDP',
									    host: HOST,
									    port: sip_port,
									    params: { 
									    	branch: generateBranch()+';rport'
									    	}
									  }
								       
								    ],

								'Max-Forwards': '70',
						  		//contact: [ {uri : p_contact} ]
								// if your call doesnt get in-dialog request, maybe os.hostname() isn't
								// resolving in your ip address
							},
							content : ''
						};
						var s = sip.stringify(msg);
						console.log("processSingleStepTransfer_REFER()...request:>>>\r\n%s\r\n<<<",s);
						proxy.send(msg);

				}
				

			} else {
				// yes we can get multiple 2xx response with different tags
				console.log('processSingleStepTransfer_REFER()...call answered with tag ' + rs.headers.to.params.tag);

				//sdp1 = rs.content;
				//console.log('REFER...sdp1: \r\n' + sdp1);
				console.log('processSingleStepTransfer_REFER()...call-id:' + rs.headers['call-id']);
				// call_id1 = rs.headers['call-id'];
				to1_tag = rs.headers.to.params.tag;
				
				///////202 Accepted
				if(rs.status === 202){
					
					//myCseq += 1;
					var msg = {
							method : 'BYE',
							uri : p_caller_uri,
							headers : {
								to: {uri: p_caller_uri, params: {tag: caller_to_tag}},
								from: {uri : p_callee_uri, params : {tag: from1_tag}},
								'call-id': call_id1,
								cseq: {method: 'BYE', seq : rstring()},
								//'content-type': 'application/sdp',
								//via: [],
								via :
									[ 
									  {
									    version: '2.0',
									    protocol: 'UDP',
									    host: HOST,
									    port: sip_port,
									    params: { 
									    	branch: generateBranch()+';rport'
									    	}
									  }
								       
								    ],

								'Max-Forwards': '70',
						  		//contact: [ {uri : p_contact} ]
								// if your call doesnt get in-dialog request, maybe os.hostname() isn't
								// resolving in your ip address
							},
							content : ''
						};
						var s = sip.stringify(msg);
						console.log("processSingleStepTransfer_REFER()...request:>>>\r\n%s\r\n<<<",s);
						proxy.send(msg);

				}
				
				
			    // sending ACK to
				
			    proxy.send({
			      method: 'ACK',
			      uri: p_target_uri,
			      headers: {
			        to: {uri: p_target_uri, params: {tag: to1_tag}},
			        from: {uri: p_callee_uri, params: {tag: from1_tag} },
			        'call-id': call_id1,
			        cseq: {method: 'ACK', seq: cseq_tag },
			        contact: [{uri: p_contact_uri}],
				    //'Content-Type': 'application/sdp',
				    'Max-Forwards': '70',
			        //via: []
					via :
						[ 
						  {
						    version: '2.0',
						    protocol: 'UDP',
						    host: HOST,
						    port: sip_port,
						    params: { 
						    	branch: generateBranch()+';rport'
						    	}
						  }
					       
					    ]

			      },
			      content: ''
			      
			    });
			    
				p_caller_uri = p_target_uri;

				

				// invite 2nd party....
				// InviteSecondParty(sdp1);
				//

				/// call-id:from-tag:to-tag
				///
				var id = [ rs.headers['call-id'], rs.headers.from.params.tag,
						rs.headers.to.params.tag ].join(':');

				console.log('processSingleStepTransfer_REFER()...id ' + id);

				// registring our 'dialog' which is just function to process
				// in-dialog
				// requests
				if (!dialogs[id]) {
					dialogs[id] = function(rq) {
						if (rq.method === 'BYE') {
							console.log('processSingleStepTransfer_REFER()...call received bye');

							delete dialogs[id];

							proxy.send(sip.makeResponse(rq, 200, 'Ok'));
							/// 1st party notify to 2nd party....
							var msg = {

								method : 'BYE',
								uri : p_callee_uri,
								headers : {
									to: {uri: p_callee_uri, params: {tag: to2_tag}},
									from: {uri : p_caller_uri, params : {tag: from2_tag}},
									'call-id': call_id2,
									cseq: {method: 'BYE', seq : rstring()},
									//'content-type': 'application/sdp',
									//via: [],
									via :
										[ 
										  {
										    version: '2.0',
										    protocol: 'UDP',
										    host: HOST,
										    port: sip_port,
										    params: { 
										    	branch: generateBranch()+';rport'
										    	}
										  }
									       
									    ],

									'Max-Forwards': '70',
							  		//contact: [ {uri : p_contact} ]
									// if your call doesnt get in-dialog request, maybe os.hostname() isn't
									// resolving in your ip address
								},
								content : ''
									
									
							};
							var s = sip.stringify(msg);

							console.log("processSingleStepTransfer_REFER()...send msg:>>>\r\n"+s);

							
							proxy.send(msg);
							
							initFlag();
									
							
							
						} else {
							proxy.send(sip.makeRespinse(rq, 405, 'Method not allowed'));
						}
					}
				}
			}


			
		}

	);
	
	
}

function processSingleStepTransfer_reInvite(
			p_caller_uri, 
			p_callee_uri,
			p_contact_uri, 
			p_pai_uri, 
			p_target_uri

			)
{

myCseq += 1;
cseq_tag = myCseq;

/// invite new call party....
var msg1 = {
		
		method : 'INVITE', 
		uri : p_target_uri,
		headers : {
			to : { uri : p_target_uri }, ////params : {	tag : to1_tag }},
			from : { uri : p_callee_uri, params : {tag : from1_tag}},
			////'Alert-Info': 'ring-answer',
			'call-id' : call_id1,
			cseq : {method : 'INVITE',	seq : myCseq },
			'content-type' : 'application/sdp',
			//'Content-Disposition' : 'signal;handling=required',
			//'Event': 'hold',
			//via : [],
			via :
				[ 
				  {
				    version: '2.0',
				    protocol: 'UDP',
				    host: HOST,
				    port: sip_port,
				    params: { 
				    	branch: generateBranch()+';rport'
				    	}
				  }
			       
			    ],

			
			contact : [ {uri : p_contact_uri} ]
		// if your call doesnt get in-dialog request, maybe os.hostname() isn't
		// resolving in your ip address
		},
		//content : 
		//	'<?xml version="1.0" encoding="UTF-8"?>\r\n'+
		//	'<RequestSystemStatus xmlns="http://www.ecma-international.org/standards/ecma-323/csta/ed3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"/>\r\n'
			

		content : sdp2
		
};

var s11 = sip.stringify(msg1);
console.log("processSingleStepTransfer_reInvite()...request:>>>\r\n%s\r\n<<<", s11);

proxy.send(msg1,
		
		function(rs) {

			var s1 = sip.stringify(rs);
			console.log("processSingleStepTransfer_reInvite()...response:>>>\r\n%s\r\n<<<",s1);
			
			if (rs.status >= 300) {
				console.log('processSingleStepTransfer_reInvite()...call failed with status ' + rs.status);
				initFlag();
				

			} else if (rs.status < 200) {
				console.log('processSingleStepTransfer_reInvite()...call progress status ' + rs.status);

				console.log('processSingleStepTransfer_reInvite()...1xx with to-tag ' + rs.headers.to.params.tag);
				to1_tag = rs.headers.to.params.tag;
				if(rs.status === 180){
					
					//myCseq += 1;
					var msg = {
							method : 'BYE',
							uri : p_caller_uri,
							headers : {
								to: {uri: p_caller_uri, params: {tag: caller_to_tag}},
								from: {uri : p_callee_uri, params : {tag: from1_tag}},
								'call-id': call_id1,
								cseq: {method: 'BYE', seq : rstring()},
								//'content-type': 'application/sdp',
								//via: [],
								via :
									[ 
									  {
									    version: '2.0',
									    protocol: 'UDP',
									    host: HOST,
									    port: sip_port,
									    params: { 
									    	branch: generateBranch()+';rport'
									    	}
									  }
								       
								    ],

								'Max-Forwards': '70',
						  		//contact: [ {uri : p_contact} ]
								// if your call doesnt get in-dialog request, maybe os.hostname() isn't
								// resolving in your ip address
							},
							content : ''
						};
						var s = sip.stringify(msg);
						console.log("processSingleStepTransfer_reInvite()...request:>>>\r\n%s\r\n<<<",s);
						proxy.send(msg);

				}

			} else {
				// yes we can get multiple 2xx response with different tags
				console.log('processSingleStepTransfer_reInvite()...call answered with tag ' + rs.headers.to.params.tag);

				/// 
				sdp1 = rs.content;
				console.log('processSingleStepTransfer_reInvite()...sdp: \r\n' + rs.content);
				console.log('processSingleStepTransfer_reInvite()...call-id:' + rs.headers['call-id']);
				// call_id1 = rs.headers['call-id'];
				to1_tag = rs.headers.to.params.tag;
				caller_to_tag = to1_tag;
				target_to_tag = to1_tag;
				
				cseq_tag = rs.headers.cseq.seq;
				console.log('processSingleStepTransfer_reInvite()...cseq:' + cseq_tag);

				// invite 2nd party....
				//InviteSecondParty(sdp1);
				//

				var id = [ rs.headers['call-id'], rs.headers.from.params.tag,
						rs.headers.to.params.tag ].join(':');

				console.log('processSingleStepTransfer_reInvite()...id ' + id);
				
				//hold_sdp = sdp1.replace('a=sendrecv','a=sendonly');
				//hold_sdp = sdp1+'a=sendonly';

			    // sending ACK to
				
			    proxy.send({
			      method: 'ACK',
			      uri: p_target_uri,
			      headers: {
			        to: {uri: p_target_uri, params: {tag: to1_tag}},
			        from: {uri: p_callee_uri, params: {tag: from1_tag} },
			        'call-id': call_id1,
			        cseq: {method: 'ACK', seq: cseq_tag },
			        contact: [{uri: p_contact_uri}],
				    //'Content-Type': 'application/sdp',
				    'Max-Forwards': '70',
			        //via: []
					via :
						[ 
						  {
						    version: '2.0',
						    protocol: 'UDP',
						    host: HOST,
						    port: sip_port,
						    params: { 
						    	branch: generateBranch()+';rport'
						    	}
						  }
					       
					    ]

			      },
			      content: ''
			      
			    });
			    
				p_caller_uri = p_target_uri;
			    
				
				transferCalledParty(
						sdp1,
						p_caller_uri,
						p_callee_uri,
						p_contact_uri,
						p_pai_uri
						);
				
				
			    
			    
				


				// registring our 'dialog' which is just function to process
				// in-dialog
				// requests
				if (!dialogs[id]) {
					dialogs[id] = function(rq) {
						if (rq.method === 'BYE') {
							console.log('processSingleStepTransfer_reInvite()...call received bye');

							delete dialogs[id];

							proxy.send(sip.makeResponse(rq, 200, 'Ok'));
							/// 1st party notify to 2nd party....
							var msg = {

								method : 'BYE',
								uri : p_caller_uri,
								headers : {
									to: {uri: p_caller_uri, params: {tag: to1_tag}},
									from: {uri : p_callee_uri, params : {tag: from1_tag}},
									'call-id': call_id1,
									cseq: {method: 'BYE', seq : rstring()},
									//'content-type': 'application/sdp',
									//via: [],
									via :
										[ 
										  {
										    version: '2.0',
										    protocol: 'UDP',
										    host: HOST,
										    port: sip_port,
										    params: { 
										    	branch: generateBranch()+';rport'
										    	}
										  }
									       
									    ],

									'Max-Forwards': '70',
							  		//contact: [ {uri : p_contact} ]
									// if your call doesnt get in-dialog request, maybe os.hostname() isn't
									// resolving in your ip address
								},
								content : ''
									
									
							};
							var s = sip.stringify(msg);

							console.log("processSingleStepTransfer_reInvite()...request:>>>\r\n"+s);

							
							proxy.send(msg);
							
							initFlag();
									
							
							
						} else {
							proxy.send(sip.makeRespinse(rq, 405, 'Method not allowed'));
						}
					}
				}
			}


			
		}
		
		
);

//////

	
}

function processREFER(
			caller_uri,
			callee_uri,
			contact_uri,
			pai_uri
			) 

{
	
	console.log('Trying to use Remote Call Control....REFER......');
	tracelog('Trying to use Remote Call Control....REFER........');

	if(my_call_id==='')
	{
		call_id1 = getNewCallId(); ///rstring();
		call_id2 = call_id1;
		
	} else {
		call_id1 = my_call_id;
		call_id2 = call_id1;
		
	}
	
	//call_id1= getNewCallId(); ///rstring();
	//call_id2= call_id1;

	initFlag();

	myCseq = 1;

	var msg = {
				
				method : 'REFER',
				uri : caller_uri,
				headers : {
					to : {
						uri : caller_uri
						//params : {
						//	tag : to1_tag
						//}
					},
					from : {
						uri : callee_uri,
						params : {
							tag : from1_tag
						}
					},
					'Alert-Info': 'ring-answer',
					'call-id' : call_id1,
					cseq : {
						method : 'REFER',
						seq : myCseq
					},
					'Refer-To' : callee_uri,
					//'Supported' : 'timer',
					//'Content-Type' : 'application/csta+xml',
					//'Content-Disposition' : 'signal;handling=required',
					//via : [],
					via :
						[ 
						  {
						    version: '2.0',
						    protocol: 'UDP',
						    host: HOST,
						    port: sip_port,
						    params: { 
						    	branch: generateBranch()+';rport'
						    	}
						  }
					       
					    ],

					
					contact : [ {
						uri : contact_uri
					} ]
				// if your call doesnt get in-dialog request, maybe os.hostname() isn't
				// resolving in your ip address
				},
				//content : 
				//	'<?xml version="1.0" encoding="UTF-8"?>\r\n'+
				//	'<RequestSystemStatus xmlns="http://www.ecma-international.org/standards/ecma-323/csta/ed3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"/>\r\n'
					

				content : ''
				
				
	};

	var s11 = sip.stringify(msg);
	console.log("processREFER...request:>>>\r\n"+s11);

	//
	//proxy.send(sip.makeRespinse(rq, 487, 'Request Terminated'));
	///

	proxy.send(msg,
		
		function(rs) {

			var s1 = sip.stringify(rs);
			console.log("processREFER...response:>>>\r\n"+s1);
			
			if (rs.status >= 300) {
				console.log('processREFER...call failed with status ' + rs.status);
				initFlag();

			} else if (rs.status < 200) {
				console.log('processREFER...call progress status ' + rs.status);

				console.log('processREFER...1xx with to-tag ' + rs.headers.to.params.tag);
				to1_tag = rs.headers.to.params.tag;

			} else {
				// yes we can get multiple 2xx response with different tags
				console.log('processREFER...call answered with tag ' + rs.headers.to.params.tag);

				//sdp1 = rs.content;
				//console.log('REFER...sdp1: \r\n' + sdp1);
				console.log('processREFER...call-id:' + rs.headers['call-id']);
				// call_id1 = rs.headers['call-id'];
				to1_tag = rs.headers.to.params.tag;
				

				// invite 2nd party....
				//InviteSecondParty(sdp1);
				//

				/// call-id:from-tag:to-tag
				///
				var id = [ rs.headers['call-id'], rs.headers.from.params.tag,
						rs.headers.to.params.tag ].join(':');

				console.log('processREFER...id ' + id);

				// registring our 'dialog' which is just function to process
				// in-dialog
				// requests
				if (!dialogs[id]) {
					dialogs[id] = function(rq) {
						if (rq.method === 'BYE') {
							console.log('processREFER...call received bye');

							delete dialogs[id];

							proxy.send(sip.makeResponse(rq, 200, 'Ok'));
							/// 1st party notify to 2nd party....
							var msg = {

								method : 'BYE',
								uri : callee_uri,
								headers : {
									to: {uri: callee_uri, params: {tag: to2_tag}},
									from: {uri : caller_uri, params : {tag: from2_tag}},
									'call-id': call_id2,
									cseq: {method: 'BYE', seq : rstring()},
									//'content-type': 'application/sdp',
									//via: [],
									via :
										[ 
										  {
										    version: '2.0',
										    protocol: 'UDP',
										    host: HOST,
										    port: sip_port,
										    params: { 
										    	branch: generateBranch()+';rport'
										    	}
										  }
									       
									    ],

									'Max-Forwards': '70',
							  		//contact: [ {uri : p_contact} ]
									// if your call doesnt get in-dialog request, maybe os.hostname() isn't
									// resolving in your ip address
								},
								content : ''
									
									
							};
							var s = sip.stringify(msg);

							console.log("processREFER...send msg:>>>\r\n"+s);

							
							proxy.send(msg);
							
							initFlag();
									
							
							
						} else {
							proxy.send(sip.makeRespinse(rq, 405, 'Method not allowed'));
						}
					}
				}
			}


			
		}

	);

	
	
}

function processREFER_1() {

console.log('Trying to use REFER......');
tracelog('Trying to use REFER........');
	
var msg = {
			
			method : 'REFER',
			uri : my_target_uri[0],
			headers : {
				to : {
					uri : my_target_uri[0]
					//params : {
					//	tag : to1_tag
					//}
				},
				from : {
					uri : thridpcc_uri,
					params : {
						tag : from1_tag
					}
				},
				////'Alert-Info': 'ring-answer',
				'call-id' : call_id1,
				cseq : {
					method : 'REFER',
					seq : rstring()
				},
				'Refer-To' : my_target_uri[1],
				//'Supported' : 'timer',
				//'Content-Type' : 'application/csta+xml',
				//'Content-Disposition' : 'signal;handling=required',
				//via : [],
				via :
					[ 
					  {
					    version: '2.0',
					    protocol: 'UDP',
					    host: HOST,
					    port: sip_port,
					    params: { 
					    	branch: generateBranch()+';rport'
					    	}
					  }
				       
				    ],

				
				contact : [ {
					uri : thridpcc_uri
				} ]
			// if your call doesnt get in-dialog request, maybe os.hostname() isn't
			// resolving in your ip address
			},
			//content : 
			//	'<?xml version="1.0" encoding="UTF-8"?>\r\n'+
			//	'<RequestSystemStatus xmlns="http://www.ecma-international.org/standards/ecma-323/csta/ed3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"/>\r\n'
				

			content : ''
			
			
};

var s11 = sip.stringify(msg);
console.log("REFER...request:>>>\r\n"+s11);

//
//proxy.send(sip.makeRespinse(rq, 487, 'Request Terminated'));
///

proxy.send(msg,
	
	function(rs) {

		var s1 = sip.stringify(rs);
		console.log("REFER...response:>>>\r\n"+s1);
		
		if (rs.status >= 300) {
			console.log('REFER...call failed with status ' + rs.status);
			initFlag();

		} else if (rs.status < 200) {
			console.log('REFER...call progress status ' + rs.status);

			console.log('REFER...1xx with to-tag ' + rs.headers.to.params.tag);
			to1_tag = rs.headers.to.params.tag;

		} else {
			// yes we can get multiple 2xx response with different tags
			console.log('REFER...call answered with tag ' + rs.headers.to.params.tag);

			//sdp1 = rs.content;
			//console.log('REFER...sdp1: \r\n' + sdp1);
			console.log('REFER...call-id:' + rs.headers['call-id']);
			// call_id1 = rs.headers['call-id'];
			to1_tag = rs.headers.to.params.tag;
			

			// invite 2nd party....
			//InviteSecondParty(sdp1);
			//

			var id = [ rs.headers['call-id'], rs.headers.from.params.tag,
					rs.headers.to.params.tag ].join(':');

			console.log('REFER...id ' + id);

			// registring our 'dialog' which is just function to process
			// in-dialog
			// requests
			if (!dialogs[id]) {
				dialogs[id] = function(rq) {
					if (rq.method === 'BYE') {
						console.log('REFER...call received bye');

						delete dialogs[id];

						proxy.send(sip.makeResponse(rq, 200, 'Ok'));
						/// 1st party notify to 2nd party....
						var msg = {

							method : 'BYE',
							uri : request2_uri,
							headers : {
								to: {uri: to2_uri, params: {tag: to2_tag}},
								from: {uri : from2_uri, params : {tag: from2_tag}},
								'call-id': call_id2,
								cseq: {method: 'BYE', seq : 4},
								//'content-type': 'application/sdp',
								//via: [],
								via :
									[ 
									  {
									    version: '2.0',
									    protocol: 'UDP',
									    host: HOST,
									    port: sip_port,
									    params: { 
									    	branch: generateBranch()+';rport'
									    	}
									  }
								       
								    ],

								'Max-Forwards': '70',
						  		//contact: [ {uri : p_contact} ]
								// if your call doesnt get in-dialog request, maybe os.hostname() isn't
								// resolving in your ip address
							},
							content : ''
								
								
						};
						var s = sip.stringify(msg);

						console.log("REFER...send msg:>>>\r\n"+s);

						
						proxy.send(msg);
						
						initFlag();
								
						/*
						processSipRequest(
								'BYE',from1_uri,
								to1_uri,to1_tag,
								from1_uri,from1_tag,
								request1_uri,call_id1
								);

						*/
						
						
					} else {
						proxy.send(sip.makeRespinse(rq, 405, 'Method not allowed'));
					}
				}
			}
		}


		
	}

);
	

	
}


function processCSTA_RequestSystemStatus() {
//	<?xml version="1.0" encoding="UTF-8"?>
//	<RequestSystemStatus xmlns="http://www.ecma-international.org/standards/ecma-323/csta/ed3">
//	</RequestSystemStatus>

	console.log('Using uaCSTA to Process CSTA Answer Call......');
	tracelog('Using uaCSTA to Process CSTA Answer Call.......');
	
	if(my_call_id==='')
	{
		call_id1 = getNewCallId(); ///rstring();
		call_id2 = call_id1;
		
	} else {
		call_id1 = my_call_id;
		call_id2 = call_id1;
		
	}

	//call_id1= getNewCallId(); ///rstring();

	var msg = {
			
			method : 'INVITE',
			uri : my_target_uri[1],
			headers : {
				to : {
					uri : my_target_uri[1]
					//params : {
					//	tag : to1_tag
					//}
				},
				from : {
					uri : thridpcc_uri,
					params : {
						tag : from1_tag
					}
				},
				////'Alert-Info': 'ring-answer',
				'call-id' : call_id1,
				cseq : {
					method : 'INVITE',
					seq : 1
				},
				'Supported' : 'timer',
				'Content-Type' : 'application/csta+xml',
				'Content-Disposition' : 'signal;handling=required',
				//via : [],
				via :
					[ 
					  {
					    version: '2.0',
					    protocol: 'UDP',
					    host: HOST,
					    port: sip_port,
					    params: { 
					    	branch: generateBranch()+';rport'
					    	}
					  }
				       
				    ],

				
				contact : [ {
					uri : thridpcc_uri
				} ]
			// if your call doesnt get in-dialog request, maybe os.hostname() isn't
			// resolving in your ip address
			},
			//content : 
			//	'<?xml version="1.0" encoding="UTF-8"?>\r\n'+
			//	'<RequestSystemStatus xmlns="http://www.ecma-international.org/standards/ecma-323/csta/ed3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"/>\r\n'
				

			content : 
				'<?xml version="1.0" encoding="UTF-8"?>\r\n'+ 
				'<RequestSystemStatus xmlns="http://www.ecma-international.org/standards/ecma-323/csta/ed3">\r\n'+
				'</RequestSystemStatus>\r\n'
			
			
	};

var s11 = sip.stringify(msg);
console.log("csta...request:>>>\r\n"+s11);

//
//proxy.send(sip.makeRespinse(rq, 487, 'Request Terminated'));
///

proxy.send(msg,
	
	function(rs) {

		var s1 = sip.stringify(rs);
		console.log("csta...response:>>>\r\n"+s1);
		
		if (rs.status >= 300) {
			console.log('csta...call failed with status ' + rs.status);
			initFlag();

		} else if (rs.status < 200) {
			console.log('csta...call progress status ' + rs.status);

			console.log('csta...1xx with to-tag ' + rs.headers.to.params.tag);
			to1_tag = rs.headers.to.params.tag;

		} else {
			// yes we can get multiple 2xx response with different tags
			console.log('csta...call answered with tag ' + rs.headers.to.params.tag);

			//sdp1 = rs.content;
			//console.log('csta...sdp1: \r\n' + sdp1);
			console.log('csta...call-id:' + rs.headers['call-id']);
			// call_id1 = rs.headers['call-id'];
			to1_tag = rs.headers.to.params.tag;
			

			// invite 2nd party....
			//InviteSecondParty(sdp1);
			//

			var id = [ rs.headers['call-id'], rs.headers.from.params.tag,
					rs.headers.to.params.tag ].join(':');

			console.log('csta...id ' + id);

			// registring our 'dialog' which is just function to process
			// in-dialog
			// requests
			if (!dialogs[id]) {
				dialogs[id] = function(rq) {
					if (rq.method === 'BYE') {
						console.log('csta...call received bye');

						delete dialogs[id];

						proxy.send(sip.makeResponse(rq, 200, 'Ok'));
						/// 1st party notify to 2nd party....
						var msg = {

							method : 'BYE',
							uri : request2_uri,
							headers : {
								to: {uri: to2_uri, params: {tag: to2_tag}},
								from: {uri : from2_uri, params : {tag: from2_tag}},
								'call-id': call_id2,
								cseq: {method: 'BYE', seq : 4},
								//'content-type': 'application/sdp',
								//via: [],
								via :
									[ 
									  {
									    version: '2.0',
									    protocol: 'UDP',
									    host: HOST,
									    port: sip_port,
									    params: { 
									    	branch: generateBranch()+';rport'
									    	}
									  }
								       
								    ],

								'Max-Forwards': '70',
						  		//contact: [ {uri : p_contact} ]
								// if your call doesnt get in-dialog request, maybe os.hostname() isn't
								// resolving in your ip address
							},
							content : ''
								
								
						};
						var s = sip.stringify(msg);

						console.log("csta...send msg:>>>\r\n"+s);

						
						proxy.send(msg);
						
						initFlag();
								
						/*
						processSipRequest(
								'BYE',from1_uri,
								to1_uri,to1_tag,
								from1_uri,from1_tag,
								request1_uri,call_id1
								);

						*/
						
						
					} else {
						proxy.send(sip.makeRespinse(rq, 405, 'Method not allowed'));
					}
				}
			}
		}


		
	}
	
	
);
	
	
}

function processCSTA_AnswerCall() {
	
	console.log('Using uaCSTA to Process CSTA Answer Call......');
	tracelog('Using uaCSTA to Process CSTA Answer Call.......');
	
	if(my_call_id==='')
	{
		call_id1 = getNewCallId(); ///rstring();
		call_id2 = call_id1;
		
	} else {
		call_id1 = my_call_id;
		call_id2 = call_id1;
		
	}

	//call_id1= getNewCallId(); ///rstring();

	var msg = {
			
			method : 'INVITE',
			uri : request1_uri,
			headers : {
				to : {
					uri : to1_uri
					//params : {
					//	tag : to1_tag
					//}
				},
				from : {
					uri : from1_uri,
					params : {
						tag : from1_tag
					}
				},
				////'Alert-Info': 'ring-answer',
				'call-id' : call_id1,
				cseq : {
					method : 'INVITE',
					seq : 1
				},
				'Content-Type' : 'application/csta+xml',
				'Content-Disposition' : 'signal;handling=required',
				//via : [],
				via :
					[ 
					  {
					    version: '2.0',
					    protocol: 'UDP',
					    host: HOST,
					    port: sip_port,
					    params: { 
					    	branch: generateBranch()+';rport'
					    	}
					  }
				       
				    ],

				
				contact : [ {
					uri : contact1_uri
				} ]
			// if your call doesnt get in-dialog request, maybe os.hostname() isn't
			// resolving in your ip address
			},
			//content : 
			//	'<?xml version="1.0" encoding="UTF-8"?>\r\n'+
			//	'<RequestSystemStatus xmlns="http://www.ecma-international.org/standards/ecma-323/csta/ed3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"/>\r\n'
				

			content : 
				'<?xml version="1.0" encoding="UTF-8"?>\r\n'+ 
				'<AnswerCall xmlns="http://www.ecma-international.org/standards/ecma-323/csta/ed3">\r\n'+
				'<callToBeAnswered>\r\n'+
				'<callID>'+call_id1+'</callID>\r\n'+
				'<deviceID>'+to1_uri+'</deviceID>\r\n'+
				'</callToBeAnswered>\r\n'+
				'</AnswerCall>\r\n'
			
			
	};

var s11 = sip.stringify(msg);
console.log("csta...request:>>>\r\n"+s11);

//
//proxy.send(sip.makeRespinse(rq, 487, 'Request Terminated'));
///

proxy.send(msg,
	
	function(rs) {

		var s1 = sip.stringify(rs);
		console.log("csta...response:>>>\r\n"+s1);
		
		if (rs.status >= 300) {
			console.log('csta...call failed with status ' + rs.status);
			initFlag();

		} else if (rs.status < 200) {
			console.log('csta...call progress status ' + rs.status);

			console.log('csta...1xx with to-tag ' + rs.headers.to.params.tag);
			to1_tag = rs.headers.to.params.tag;

		} else {
			// yes we can get multiple 2xx response with different tags
			console.log('csta...call answered with tag ' + rs.headers.to.params.tag);

			//sdp1 = rs.content;
			//console.log('csta...sdp1: \r\n' + sdp1);
			console.log('csta...call-id:' + rs.headers['call-id']);
			// call_id1 = rs.headers['call-id'];
			to1_tag = rs.headers.to.params.tag;
			

			// invite 2nd party....
			//InviteSecondParty(sdp1);
			//

			var id = [ rs.headers['call-id'], rs.headers.from.params.tag,
					rs.headers.to.params.tag ].join(':');

			console.log('csta...id ' + id);

			// registring our 'dialog' which is just function to process
			// in-dialog
			// requests
			if (!dialogs[id]) {
				dialogs[id] = function(rq) {
					if (rq.method === 'BYE') {
						console.log('csta...call received bye');

						delete dialogs[id];

						proxy.send(sip.makeResponse(rq, 200, 'Ok'));
						/// 1st party notify to 2nd party....
						var msg = {

							method : 'BYE',
							uri : request2_uri,
							headers : {
								to: {uri: to2_uri, params: {tag: to2_tag}},
								from: {uri : from2_uri, params : {tag: from2_tag}},
								'call-id': call_id2,
								cseq: {method: 'BYE', seq : 4},
								//'content-type': 'application/sdp',
								//via: [],
								via :
									[ 
									  {
									    version: '2.0',
									    protocol: 'UDP',
									    host: HOST,
									    port: sip_port,
									    params: { 
									    	branch: generateBranch()+';rport'
									    	}
									  }
								       
								    ],

								'Max-Forwards': '70',
						  		//contact: [ {uri : p_contact} ]
								// if your call doesnt get in-dialog request, maybe os.hostname() isn't
								// resolving in your ip address
							},
							content : ''
								
								
						};
						var s = sip.stringify(msg);

						console.log("csta...send msg:>>>\r\n"+s);

						
						proxy.send(msg);
						
						initFlag();
								
						/*
						processSipRequest(
								'BYE',from1_uri,
								to1_uri,to1_tag,
								from1_uri,from1_tag,
								request1_uri,call_id1
								);

						*/
						
						
					} else {
						proxy.send(sip.makeRespinse(rq, 405, 'Method not allowed'));
					}
				}
			}
		}


		
	}
	
	
);
	
	
}

function processRFC3261_HoldCall() {
	
	console.log('Using SIP RFC3261 to Process Hold Call......');
	tracelog('Using SIP RFC3261 to Process Hold Call.......');
	
	//call_id1= getNewCallId(); ///rstring();
	var hold_sdp = sdp2.replace('a=sendrecv','a=sendonly');
	console.log('hold_sdp='+hold_sdp);

	var msg = {
			
			method : 'INVITE',
			uri : reinvite2_uri,
			headers : {
				to : {
					uri : to2_uri
					//params : {
					//	tag : to1_tag
					//}
				},
				from : {
					uri : from2_uri,
					params : {
						tag : from1_tag
					}
				},
				////'Alert-Info': 'ring-answer',
				'call-id' : call_id1,
				cseq : {
					method : 'INVITE',
					seq : 2
				},
				'content-type' : 'application/sdp',
				//'Content-Disposition' : 'signal;handling=required',
				//via : [],
				via :
					[ 
					  {
					    version: '2.0',
					    protocol: 'UDP',
					    host: HOST,
					    port: sip_port,
					    params: { 
					    	branch: generateBranch()+';rport'
					    	}
					  }
				       
				    ],

				
				contact : [ {
					uri : reinvite2_uri
				} ]
			// if your call doesnt get in-dialog request, maybe os.hostname() isn't
			// resolving in your ip address
			},
			//content : 
			//	'<?xml version="1.0" encoding="UTF-8"?>\r\n'+
			//	'<RequestSystemStatus xmlns="http://www.ecma-international.org/standards/ecma-323/csta/ed3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"/>\r\n'
				

			content : hold_sdp
				
				
			
			
	};

var s11 = sip.stringify(msg);
console.log("rfc3261...request:>>>\r\n"+s11);

//
//proxy.send(sip.makeRespinse(rq, 487, 'Request Terminated'));
///

proxy.send(msg,
	
	function(rs) {

		var s1 = sip.stringify(rs);
		console.log("rfc3261...response:>>>\r\n"+s1);
		
		if (rs.status >= 300) {
			console.log('rfc3261...call failed with status ' + rs.status);
			initFlag();

		} else if (rs.status < 200) {
			console.log('rfc3261...call progress status ' + rs.status);

			console.log('rfc3261...1xx with to-tag ' + rs.headers.to.params.tag);
			to1_tag = rs.headers.to.params.tag;

		} else {
			// yes we can get multiple 2xx response with different tags
			console.log('rfc3261...call answered with tag ' + rs.headers.to.params.tag);

			//sdp1 = rs.content;
			//console.log('rfc3261...sdp1: \r\n' + sdp1);
			console.log('rfc3261...call-id:' + rs.headers['call-id']);
			// call_id1 = rs.headers['call-id'];
			to1_tag = rs.headers.to.params.tag;
			

			// invite 2nd party....
			//InviteSecondParty(sdp1);
			//

			var id = [ rs.headers['call-id'], rs.headers.from.params.tag,
					rs.headers.to.params.tag ].join(':');

			console.log('rfc3261...id ' + id);
			
		    // sending ACK to 
		    proxy.send({
		      method: 'ACK',
		      uri: reinvite2_uri,
		      headers: {
		        to: {uri: to2_uri}, //params: {tag: to1_tag}},
		        from: {uri: from2_uri, params: {tag: from1_tag} },
		        'call-id': call_id1,
		        cseq: {method: 'ACK', seq: 2 },
		        contact: [{uri: reinvite2_uri}],
			    //'Content-Type': 'application/sdp',
			    'Max-Forwards': '70',
		        //via: []
				via :
					[ 
					  {
					    version: '2.0',
					    protocol: 'UDP',
					    host: HOST,
					    port: sip_port,
					    params: { 
					    	branch: generateBranch()+';rport'
					    	}
					  }
				       
				    ]

		      },
		      content: '' ///sdp2
		      
		    });


			// registring our 'dialog' which is just function to process
			// in-dialog
			// requests
			if (!dialogs[id]) {
				dialogs[id] = function(rq) {
					if (rq.method === 'BYE') {
						console.log('rfc3261...call received bye');

						delete dialogs[id];

						proxy.send(sip.makeResponse(rq, 200, 'Ok'));
						/// 1st party notify to 2nd party....
						var msg = {

							method : 'BYE',
							uri : request2_uri,
							headers : {
								to: {uri: to2_uri, params: {tag: to2_tag}},
								from: {uri : from2_uri, params : {tag: from2_tag}},
								'call-id': call_id2,
								cseq: {method: 'BYE', seq : 4},
								//'content-type': 'application/sdp',
								//via: [],
								via :
									[ 
									  {
									    version: '2.0',
									    protocol: 'UDP',
									    host: HOST,
									    port: sip_port,
									    params: { 
									    	branch: generateBranch()+';rport'
									    	}
									  }
								       
								    ],

								'Max-Forwards': '70',
						  		//contact: [ {uri : p_contact} ]
								// if your call doesnt get in-dialog request, maybe os.hostname() isn't
								// resolving in your ip address
							},
							content : ''
								
								
						};
						var s = sip.stringify(msg);

						console.log("rfc3261...send msg:>>>\r\n"+s);

						
						proxy.send(msg);
						
						initFlag();
								
						/*
						processSipRequest(
								'BYE',from1_uri,
								to1_uri,to1_tag,
								from1_uri,from1_tag,
								request1_uri,call_id1
								);

						*/
						
						
					} else {
						proxy.send(sip.makeRespinse(rq, 405, 'Method not allowed'));
					}
				}
			}
		}


		
	}
	
	
);
	
	
}


function processCSTA_HoldCall() {
	
	console.log('Using uaCSTA to Process CSTA HoldCall......');
	tracelog('Using uaCSTA to Process CSTA HoldCall.......');
	
	//call_id1= getNewCallId(); ///rstring();

	var msg = {
			
			method : 'INFO',
			uri : request1_uri,
			headers : {
				to : {
					uri : to1_uri
					//params : {
					//	tag : to1_tag
					//}
				},
				from : {
					uri : from1_uri,
					params : {
						tag : from1_tag
					}
				},
				////'Alert-Info': 'ring-answer',
				'call-id' : call_id1,
				cseq : {
					method : 'INFO',
					seq : 1
				},
				'Content-Type' : 'application/csta+xml',
				'Content-Disposition' : 'signal;handling=required',
				//via : [],
				via :
					[ 
					  {
					    version: '2.0',
					    protocol: 'UDP',
					    host: HOST,
					    port: sip_port,
					    params: { 
					    	branch: generateBranch()+';rport'
					    	}
					  }
				       
				    ],

				
				contact : [ {
					uri : contact1_uri
				} ]
			// if your call doesnt get in-dialog request, maybe os.hostname() isn't
			// resolving in your ip address
			},
			//content : 
			//	'<?xml version="1.0" encoding="UTF-8"?>\r\n'+
			//	'<RequestSystemStatus xmlns="http://www.ecma-international.org/standards/ecma-323/csta/ed3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"/>\r\n'
				

			content : 
				'<?xml version="1.0" encoding="UTF-8"?>\r\n'+ 
				'<HoldCall xmlns="http://www.ecma-international.org/standards/ecma-323/csta/ed3">\r\n'+
				'<callToBeHeld>\r\n'+
				'<callID>'+call_id1+'</callID>\r\n'+
				'<deviceID>'+to1_uri+'</deviceID>\r\n'+
				'</callToBeHeld>\r\n'+
				'</HoldCall>\r\n'
			
			
	};

var s11 = sip.stringify(msg);
console.log("csta...request:>>>\r\n"+s11);

//
//proxy.send(sip.makeRespinse(rq, 487, 'Request Terminated'));
///

proxy.send(msg,
	
	function(rs) {

		var s1 = sip.stringify(rs);
		console.log("csta...response:>>>\r\n"+s1);
		
		if (rs.status >= 300) {
			console.log('csta...call failed with status ' + rs.status);
			initFlag();

		} else if (rs.status < 200) {
			console.log('csta...call progress status ' + rs.status);

			console.log('csta...1xx with to-tag ' + rs.headers.to.params.tag);
			to1_tag = rs.headers.to.params.tag;

		} else {
			// yes we can get multiple 2xx response with different tags
			console.log('csta...call answered with tag ' + rs.headers.to.params.tag);

			//sdp1 = rs.content;
			//console.log('csta...sdp1: \r\n' + sdp1);
			console.log('csta...call-id:' + rs.headers['call-id']);
			// call_id1 = rs.headers['call-id'];
			to1_tag = rs.headers.to.params.tag;
			

			// invite 2nd party....
			//InviteSecondParty(sdp1);
			//

			var id = [ rs.headers['call-id'], rs.headers.from.params.tag,
					rs.headers.to.params.tag ].join(':');

			console.log('csta...id ' + id);

			// registring our 'dialog' which is just function to process
			// in-dialog
			// requests
			if (!dialogs[id]) {
				dialogs[id] = function(rq) {
					if (rq.method === 'BYE') {
						console.log('csta...call received bye');

						delete dialogs[id];

						proxy.send(sip.makeResponse(rq, 200, 'Ok'));
						/// 1st party notify to 2nd party....
						var msg = {

							method : 'BYE',
							uri : request2_uri,
							headers : {
								to: {uri: to2_uri, params: {tag: to2_tag}},
								from: {uri : from2_uri, params : {tag: from2_tag}},
								'call-id': call_id2,
								cseq: {method: 'BYE', seq : 4},
								//'content-type': 'application/sdp',
								//via: [],
								via :
									[ 
									  {
									    version: '2.0',
									    protocol: 'UDP',
									    host: HOST,
									    port: sip_port,
									    params: { 
									    	branch: generateBranch()+';rport'
									    	}
									  }
								       
								    ],

								'Max-Forwards': '70',
						  		//contact: [ {uri : p_contact} ]
								// if your call doesnt get in-dialog request, maybe os.hostname() isn't
								// resolving in your ip address
							},
							content : ''
								
								
						};
						var s = sip.stringify(msg);

						console.log("csta...send msg:>>>\r\n"+s);

						
						proxy.send(msg);
						
						initFlag();
								
						/*
						processSipRequest(
								'BYE',from1_uri,
								to1_uri,to1_tag,
								from1_uri,from1_tag,
								request1_uri,call_id1
								);

						*/
						
						
					} else {
						proxy.send(sip.makeRespinse(rq, 405, 'Method not allowed'));
					}
				}
			}
		}


		
	}
	
	
);
	
	
}


function processCSTA_RetrieveCall() {

	console.log('Using uaCSTA to Process CSTA Retrieve Call......');
	tracelog('Using uaCSTA to Process CSTA Retrieve Call.......');
	
	if(my_call_id==='')
	{
		call_id1 = getNewCallId(); ///rstring();
		call_id2 = call_id1;
		
	} else {
		call_id1 = my_call_id;
		call_id2 = call_id1;
		
	}
	
	///call_id1= getNewCallId(); ///rstring();

	var msg = {
			
			method : 'INVITE',
			uri : request1_uri,
			headers : {
				to : {
					uri : to1_uri
					//params : {
					//	tag : to1_tag
					//}
				},
				from : {
					uri : from1_uri,
					params : {
						tag : from1_tag
					}
				},
				////'Alert-Info': 'ring-answer',
				'call-id' : call_id1,
				cseq : {
					method : 'INVITE',
					seq : 1
				},
				'Content-Type' : 'application/csta+xml',
				'Content-Disposition' : 'signal;handling=required',
				//via : [],
				via :
					[ 
					  {
					    version: '2.0',
					    protocol: 'UDP',
					    host: HOST,
					    port: sip_port,
					    params: { 
					    	branch: generateBranch()+';rport'
					    	}
					  }
				       
				    ],

				
				contact : [ {
					uri : contact1_uri
				} ]
			// if your call doesnt get in-dialog request, maybe os.hostname() isn't
			// resolving in your ip address
			},
			//content : 
			//	'<?xml version="1.0" encoding="UTF-8"?>\r\n'+
			//	'<RequestSystemStatus xmlns="http://www.ecma-international.org/standards/ecma-323/csta/ed3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"/>\r\n'
				

			content : 
				'<?xml version="1.0" encoding="UTF-8"?>\r\n'+ 
				'<RetrieveCall xmlns="http://www.ecma-international.org/standards/ecma-323/csta/ed3">\r\n'+
				'<callToBeRetrieved>\r\n'+
				'<callID>'+call_id1+'</callID>\r\n'+
				'<deviceID>'+to1_uri+'</deviceID>\r\n'+
				'</callToBeRetrieved>\r\n'+
				'</RetrieveCall>\r\n'
			
			
	};

var s11 = sip.stringify(msg);
console.log("csta...request:>>>\r\n"+s11);

//
//proxy.send(sip.makeRespinse(rq, 487, 'Request Terminated'));
///

proxy.send(msg,
	
	function(rs) {

		var s1 = sip.stringify(rs);
		console.log("csta...response:>>>\r\n"+s1);
		
		if (rs.status >= 300) {
			console.log('csta...call failed with status ' + rs.status);
			initFlag();

		} else if (rs.status < 200) {
			console.log('csta...call progress status ' + rs.status);

			console.log('csta...1xx with to-tag ' + rs.headers.to.params.tag);
			to1_tag = rs.headers.to.params.tag;

		} else {
			// yes we can get multiple 2xx response with different tags
			console.log('csta...call answered with tag ' + rs.headers.to.params.tag);

			//sdp1 = rs.content;
			//console.log('csta...sdp1: \r\n' + sdp1);
			console.log('csta...call-id:' + rs.headers['call-id']);
			// call_id1 = rs.headers['call-id'];
			to1_tag = rs.headers.to.params.tag;
			

			// invite 2nd party....
			//InviteSecondParty(sdp1);
			//

			var id = [ rs.headers['call-id'], rs.headers.from.params.tag,
					rs.headers.to.params.tag ].join(':');

			console.log('csta...id ' + id);

			// registring our 'dialog' which is just function to process
			// in-dialog
			// requests
			if (!dialogs[id]) {
				dialogs[id] = function(rq) {
					if (rq.method === 'BYE') {
						console.log('csta...call received bye');

						delete dialogs[id];

						proxy.send(sip.makeResponse(rq, 200, 'Ok'));
						/// 1st party notify to 2nd party....
						var msg = {

							method : 'BYE',
							uri : request2_uri,
							headers : {
								to: {uri: to2_uri, params: {tag: to2_tag}},
								from: {uri : from2_uri, params : {tag: from2_tag}},
								'call-id': call_id2,
								cseq: {method: 'BYE', seq : 4},
								//'content-type': 'application/sdp',
								//via: [],
								via :
									[ 
									  {
									    version: '2.0',
									    protocol: 'UDP',
									    host: HOST,
									    port: sip_port,
									    params: { 
									    	branch: generateBranch()+';rport'
									    	}
									  }
								       
								    ],

								'Max-Forwards': '70',
						  		//contact: [ {uri : p_contact} ]
								// if your call doesnt get in-dialog request, maybe os.hostname() isn't
								// resolving in your ip address
							},
							content : ''
								
								
						};
						var s = sip.stringify(msg);

						console.log("csta...send msg:>>>\r\n"+s);

						
						proxy.send(msg);
						
						initFlag();
								
						/*
						processSipRequest(
								'BYE',from1_uri,
								to1_uri,to1_tag,
								from1_uri,from1_tag,
								request1_uri,call_id1
								);

						*/
						
						
					} else {
						proxy.send(sip.makeRespinse(rq, 405, 'Method not allowed'));
					}
				}
			}
		}


		
	}
	
	
);

	
}

function processCSTA_1() {
	
	console.log('Using uaCSTA to Process CSTA 1......');
	tracelog('Using uaCSTA to Process CSTA 1.......');
	
	if(my_call_id==='')
	{
		call_id1 = getNewCallId(); ///rstring();
		call_id2 = call_id1;
		
	} else {
		call_id1 = my_call_id;
		call_id2 = call_id1;
		
	}
	
	//call_id1= getNewCallId(); ///rstring();

	var msg = {
			
			method : 'INVITE',
			uri : request1_uri,
			headers : {
				to : {
					uri : to1_uri
					//params : {
					//	tag : to1_tag
					//}
				},
				from : {
					uri : from1_uri,
					params : {
						tag : from1_tag
					}
				},
				////'Alert-Info': 'ring-answer',
				'call-id' : call_id1,
				cseq : {
					method : 'INVITE',
					seq : 1
				},
				'Content-Type' : 'application/csta+xml',
				'Content-Disposition' : 'signal; handling=required',
				//via : [],
				via :
					[ 
					  {
					    version: '2.0',
					    protocol: 'UDP',
					    host: HOST,
					    port: sip_port,
					    params: { 
					    	branch: generateBranch()+';rport'
					    	}
					  }
				       
				    ],

				
				contact : [ {
					uri : contact1_uri
				} ]
			// if your call doesnt get in-dialog request, maybe os.hostname() isn't
			// resolving in your ip address
			},
			//content : 
			//	'<?xml version="1.0" encoding="UTF-8"?>\r\n'+
			//	'<RequestSystemStatus xmlns="http://www.ecma-international.org/standards/ecma-323/csta/ed3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"/>\r\n'
				

			content : 
				'<?xml version="1.0" encoding="UTF-8"?>\r\n'+ 
				'<HoldCall xmlns="http://www.ecma-international.org/standards/ecma-323/csta/ed3">\r\n'+
				'<callToBeHeld>\r\n'+
				'<callID>'+call_id1+'</callID>\r\n'+
				'<deviceID>'+to1_uri+'</deviceID>\r\n'+
				'</callToBeHeld>\r\n'+
				'</HoldCall>\r\n'
			
			
	};

var s11 = sip.stringify(msg);
console.log("csta...request:>>>\r\n"+s11);

//
//proxy.send(sip.makeRespinse(rq, 487, 'Request Terminated'));
///

proxy.send(msg,
	
	function(rs) {

		var s1 = sip.stringify(rs);
		console.log("csta...response:>>>\r\n"+s1);
		
		if (rs.status >= 300) {
			console.log('csta...call failed with status ' + rs.status);
			initFlag();

		} else if (rs.status < 200) {
			console.log('csta...call progress status ' + rs.status);

			console.log('csta...1xx with to-tag ' + rs.headers.to.params.tag);
			to1_tag = rs.headers.to.params.tag;

		} else {
			// yes we can get multiple 2xx response with different tags
			console.log('csta...call answered with tag ' + rs.headers.to.params.tag);

			//sdp1 = rs.content;
			//console.log('csta...sdp1: \r\n' + sdp1);
			console.log('csta...call-id:' + rs.headers['call-id']);
			// call_id1 = rs.headers['call-id'];
			to1_tag = rs.headers.to.params.tag;
			

			// invite 2nd party....
			//InviteSecondParty(sdp1);
			//

			var id = [ rs.headers['call-id'], rs.headers.from.params.tag,
					rs.headers.to.params.tag ].join(':');

			console.log('csta...id ' + id);

			// registring our 'dialog' which is just function to process
			// in-dialog
			// requests
			if (!dialogs[id]) {
				dialogs[id] = function(rq) {
					if (rq.method === 'BYE') {
						console.log('csta...call received bye');

						delete dialogs[id];

						proxy.send(sip.makeResponse(rq, 200, 'Ok'));
						/// 1st party notify to 2nd party....
						var msg = {

							method : 'BYE',
							uri : request2_uri,
							headers : {
								to: {uri: to2_uri, params: {tag: to2_tag}},
								from: {uri : from2_uri, params : {tag: from2_tag}},
								'call-id': call_id2,
								cseq: {method: 'BYE', seq : 4},
								//'content-type': 'application/sdp',
								//via: [],
								via :
									[ 
									  {
									    version: '2.0',
									    protocol: 'UDP',
									    host: HOST,
									    port: sip_port,
									    params: { 
									    	branch: generateBranch()+';rport'
									    	}
									  }
								       
								    ],

								'Max-Forwards': '70',
						  		//contact: [ {uri : p_contact} ]
								// if your call doesnt get in-dialog request, maybe os.hostname() isn't
								// resolving in your ip address
							},
							content : ''
								
								
						};
						var s = sip.stringify(msg);

						console.log("csta...send msg:>>>\r\n"+s);

						
						proxy.send(msg);
						
						initFlag();
								
						/*
						processSipRequest(
								'BYE',from1_uri,
								to1_uri,to1_tag,
								from1_uri,from1_tag,
								request1_uri,call_id1
								);

						*/
						
						
					} else {
						proxy.send(sip.makeRespinse(rq, 405, 'Method not allowed'));
					}
				}
			}
		}


		
	}
	
	
);

	
	

	
}


function processCSTA() {

	console.log('Using uaCSTA to Process CSTA......');
	tracelog('Using uaCSTA to Process CSTA.......');
	
	

	//
	//proxy.send(sip.makeRespinse(rq, 487, 'Request Terminated'));
	///

	proxy.send({

		method : 'INFO',
		uri : request1_uri,
		headers : {
			to : {
				uri : to1_uri,
				params : {
					tag : to1_tag
				}
			},
			from : {
				uri : from1_uri,
				params : {
					tag : from1_tag
				}
			},
			////'Alert-Info': 'ring-answer',
			'call-id' : call_id1,
			cseq : {
				method : 'INFO',
				seq : 1
			},
			'Content-Type' : 'application/csta+xml',
			'Content-Disposition' : 'signal; handling=required',
			//via : [],
			via :
				[ 
				  {
				    version: '2.0',
				    protocol: 'UDP',
				    host: HOST,
				    port: sip_port,
				    params: { 
				    	branch: generateBranch()+';rport'
				    	}
				  }
			       
			    ],

			
			contact : [ {
				uri : contact1_uri
			} ]
		// if your call doesnt get in-dialog request, maybe os.hostname() isn't
		// resolving in your ip address
		},
		//content : '<?xml version="1.0" encoding="UTF-8"?><RequestSystemStatus xmlns="http://www.ecma-international.org/standards/ecma-323/csta/ed3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"/>\r\n'
		content : 
			'<?xml version="1.0" encoding="UTF-8"?>\r\n'+ 
			'<HoldCall xmlns="http://www.ecma-international.org/standards/ecma-323/csta/ed3">\r\n'+
			'<callToBeHeld>\r\n'+
			'<callID>'+call_id1+'</callID>\r\n'+
			'<deviceID>'+to1_uri+'</deviceID>\r\n'+
			'</callToBeHeld>\r\n'+
			'</HoldCall>\r\n'

	}, 
	
	function(rs) {

		var s1 = sip.stringify(rs);
		console.log("csta...sipResp1 msg:>>>\r\n"+s1);
		
		if (rs.status >= 300) {
			console.log('csta...call failed with status ' + rs.status);
			initFlag();

		} else if (rs.status < 200) {
			console.log('csta...call progress status ' + rs.status);

			console.log('csta...1xx with to-tag ' + rs.headers.to.params.tag);
			to1_tag = rs.headers.to.params.tag;

		} else {
			// yes we can get multiple 2xx response with different tags
			console.log('csta...call answered with tag ' + rs.headers.to.params.tag);

			//sdp1 = rs.content;
			//console.log('csta...sdp1: \r\n' + sdp1);
			console.log('csta...call-id:' + rs.headers['call-id']);
			// call_id1 = rs.headers['call-id'];
			to1_tag = rs.headers.to.params.tag;
			

			// invite 2nd party....
			//InviteSecondParty(sdp1);
			//

			var id = [ rs.headers['call-id'], rs.headers.from.params.tag,
					rs.headers.to.params.tag ].join(':');

			console.log('csta...id ' + id);

			// registring our 'dialog' which is just function to process
			// in-dialog
			// requests
			if (!dialogs[id]) {
				dialogs[id] = function(rq) {
					if (rq.method === 'BYE') {
						console.log('csta...call received bye');

						delete dialogs[id];

						proxy.send(sip.makeResponse(rq, 200, 'Ok'));
						/// 1st party notify to 2nd party....
						var msg = {

							method : 'BYE',
							uri : request2_uri,
							headers : {
								to: {uri: to2_uri, params: {tag: to2_tag}},
								from: {uri : from2_uri, params : {tag: from2_tag}},
								'call-id': call_id2,
								cseq: {method: 'BYE', seq : 4},
								//'content-type': 'application/sdp',
								//via: [],
								via :
									[ 
									  {
									    version: '2.0',
									    protocol: 'UDP',
									    host: HOST,
									    port: sip_port,
									    params: { 
									    	branch: generateBranch()+';rport'
									    	}
									  }
								       
								    ],

								'Max-Forwards': '70',
						  		//contact: [ {uri : p_contact} ]
								// if your call doesnt get in-dialog request, maybe os.hostname() isn't
								// resolving in your ip address
							},
							content : ''
								
								
						};
						var s = sip.stringify(msg);

						console.log("csta...send msg:>>>\r\n"+s);

						
						proxy.send(msg);
						
						initFlag();
								
						/*
						processSipRequest(
								'BYE',from1_uri,
								to1_uri,to1_tag,
								from1_uri,from1_tag,
								request1_uri,call_id1
								);

						*/
						
						
					} else {
						proxy.send(sip.makeRespinse(rq, 405, 'Method not allowed'));
					}
				}
			}
		}


		
	}
	
	
	);

	
	
	
}


function processCreateHTTP() {
	

	http.createServer(
		
		function(request, response) 
		{
			console.log('request.connection='+request.connection.remoteAddress);
			tracelog('request.connection='+request.connection.remoteAddress);
			var ip_address = null;
			var remote_port = null;
            try {
            	//ip_address = request.headers['x-forwarded-for'];
                ip_address = request.connection.remoteAddress;
                remote_port = request.connection.remotePort;
            }
            catch ( err ) {
                ip_address = request.connection.remoteAddress;
                remote_port = request.connection.remotePort;
            }
            
			console.log('ip_address='+ip_address);
			tracelog('ip_address='+ip_address);
            
			console.log('remote_port='+remote_port);
			tracelog('remote_port='+remote_port);
			
		    var filePath = '.' + request.url;
		    
		    if (filePath == './action')
		        filePath = './action/index.html';
		    
		    //if (filePath == './sipapp')
		    //    filePath = './sipapp/index.html';
		    
		    if (filePath == './')
		        filePath = './index.html';
		    
		    var extname = path.extname(filePath);
		    var contentType = 'text/html';
		    switch (extname) {
		        case '.js':
		            contentType = 'text/javascript';
		            break;
		        case '.css':
		            contentType = 'text/css';
		            break;
		    }		    
		     
		    path.exists(filePath, function(exists) {
		     
		        if (exists) {
		            fs.readFile(filePath, function(error, content) {
		                if (error) {
		                    response.writeHead(500);
		                    response.end();
		                }
		                else {
		                    response.writeHead(200, { 'Content-Type': contentType });
		                    response.end(content, 'utf-8');
		                }
		            });
		        }
		        else {
		            response.writeHead(404);
		        	//response.writeHead(200, { 'Content-Type': contentType });
		            response.end('Proceeding....');
		        }
		    });	
		    
		    if (request.url=='/sipapp') {
		    	//
				if (request.method == 'POST')
				{

                    var body = '';
                    request.on('data', function (data) {
                        console.log("data...>>>\r\n"+data+"<<<");
                        body += data;
                        if (body.length > 1e6) {
                            // FLOOD ATTACK OR FAULTY CLIENT, NUKE REQUEST
                            request.connection.destroy();
                        }
                        tracelog(body);
                        //console.log(body);

                    });
                

					request.on('end', function(){
                        var POST = querystring.parse(body);
                        console.log("POST...>>>\r\n"+POST+"<<<");
                        //
                        //tracelog(body);
                        //console.log(body);
						//
						//res.writeHead(200, chunk.toString());
						console.log(body);
						
						var str_caller = POST.caller;
						var str_callee = POST.callee;
						var str_sipcmd = POST.sipcmd;
						var str_message = POST.message;
						var str_contact = POST.contact;
						var str_pai = POST.pai;
						var str_target = POST.target;
						var str_moh = POST.moh;
						var str_conf = POST.conf;
						var str_video = POST.video;
						var str_call_id = POST.call_id;
						var str_backup = POST.backup;
						
						console.log('caller  -> '+str_caller);
						console.log('callee  -> '+str_callee);
						console.log('sipapp  -> '+str_sipcmd);
						console.log('message -> '+str_message);
						console.log('contact -> '+str_contact);
						console.log('pai     -> '+str_pai);
						console.log('target  -> '+str_target);
						console.log('moh     -> '+str_moh);
						console.log('conf    -> '+str_conf);
						console.log('video   -> '+str_video);
						console.log('call-id -> '+str_call_id);
						console.log('backup  -> '+str_backup);
						
						
                        
                        processSip3pcc(
                        		str_sipcmd,
                        		str_caller,
                        		str_callee,
                        		str_message,
                        		str_contact,
                        		str_pai,
                        		str_target,
                        		str_moh,
                        		str_conf,
                        		str_video,
                        		str_call_id,
                        		str_backup
                        		
                        		);
                        


					});
					
				
				}
				
				
				
				console.log('TODO: handle /sipapp');
				tracelog('TODO: handle /sipapp');

		    	
		    }

			
		}
		 
	     

	).listen(http_port,HOST);




	console.log('Create HTTP Server.....Listening: %s:%d',HOST,http_port);
	///tracelog('Create HTTP Server.....');

	//TimerStart(timer_test,1000);
	
}


processCreateSipStack();

processCreateHTTP();

TimerStart(timer_test,1000);

/*
 * proxy.send({ method: 'OPTIONS', uri: process.argv[2], headers: { to: {uri:
 * process.argv[2]}, from: {uri: 'sip:test@test', params: {tag: rstring()}},
 * 'call-id': rstring(), cseq: {method: 'OPTIONS', seq: Math.floor(Math.random() *
 * 1e5)}, 'content-type': 'application/sdp', contact: [{uri: 'sip:101@' +
 * os.hostname()}] // if your call doesnt get in-dialog request, maybe
 * os.hostname() isn't resolving in your ip address }, content: '' },
 * function(rs) { if(rs.status >= 300) { console.log('call failed with status ' +
 * rs.status); } else if(rs.status < 200) { console.log('call progress status ' +
 * rs.status); } else { // yes we can get multiple 2xx response with different
 * tags console.log('call answered with tag ' + rs.headers.to.params.tag);
 *  // sending ACK proxy.send({ method: 'ACK', uri: rs.headers.contact[0].uri,
 * headers: { to: rs.headers.to, from: rs.headers.from, 'call-id':
 * rs.headers['call-id'], cseq: {method: 'ACK', seq: rs.headers.cseq.seq}, via: [] }
 * });
 * 
 * var id = [rs.headers['call-id'], rs.headers.from.params.tag,
 * rs.headers.to.params.tag].join(':');
 *  // registring our 'dialog' which is just function to process in-dialog
 * requests if(!dialogs[id]) { dialogs[id] = function(rq) { if(rq.method ===
 * 'BYE') { console.log('call received bye');
 * 
 * delete dialogs[id];
 * 
 * proxy.send(sip.makeResponse(rq, 200, 'Ok')); } else {
 * proxy.send(sip.makeRespinse(rq, 405, 'Method not allowed')); } } } }
 * 
 * });
 * 
 */



/*
sip.start({protocol: 'UDP', address: '192.168.0.101', port: 5060},function(request) {
	
	//proxy.send(new Buffer(s), 0, s.length);
	
	
});

*/

