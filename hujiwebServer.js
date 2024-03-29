//Author: James Adams Student no 777635004
//Ex4 Internet Technologies, Hebrew University 2015/16 Autumn Semester.

var net = require('net');
var hujiNet = require('./HujiNet');

//constructor for a usecase object
function UseCase(resource,requestHandler,reg_obj) {
    //stored for debug purposes, but not really neccessary.
    this.resource=resource;
    this.requestHandler=requestHandler;
    //regex object which has a regex string for match checking and an array of params that looks like:
    //params = [null,param1,param2,..,param(n)[
    this.reg_obj=reg_obj;
}


//array to keep track of sockets
sockets=[];

function start (port,callback) {

    console.log('Starting server.');
    var serverObj= {};
    //using https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty


    //adding the immutable (read-only) properties.
    Object.defineProperty(serverObj, 'port', {
        value: port
    });


    //give it an empty array for use cases:
    serverObj.uses=[];



    //and the function for handling the uses:

    serverObj.use=function(resource, requestHandler) {
        //in case only the request handler being sent.
        if(typeof requestHandler === 'undefined') {
            requestHandler=resource;
            resource='/';
        }
        //create a regexp string/param list out of the resource string:
        this.uses.push(new UseCase(resource,requestHandler,create_reg(resource)));
    };


    //create the server (can this be done with a non-anonymous function?)
    var server = net.createServer( function(socket) {
        //since we're dealing with plain text requests, not hexadecimal
        socket.setEncoding("utf8");

        //to prevent memory leak detection
        socket.setMaxListeners(0);

        //2s according to project spec
        socket.setTimeout(2000);

        //keep track of this socket

        sockets.push(socket);

        //event handlers

        socket.on('data', function(data) {
            //if we're here, we're receiving data from the user/socket.
            //so, handle the data, sending the data to hujinet.
            hujiNet.handleRequest(data,socket,serverObj.uses);
        });

        socket.on('end',function() {
            var i = sockets.indexOf(socket);
            if (i!=-1) sockets.splice(i,1);
        });


        socket.on('timeout',function () {
            socket.end();
            var i = sockets.indexOf(socket);
            if (i!=-1) sockets.splice(i,1);

        });

        //called when the server destroys/closes the connection.
        socket.on('close', function() {
            var i = sockets.indexOf(socket);
            if (i!=-1) sockets.splice(i,1);
        });
    });

    //send the server with the serverobj which will be returned.
    //This will allow the server to be closed.
    serverObj.server=server;

    //same as previously, but on a server level:
    server.setMaxListeners(0);

    server.listen(port, callback);
    //error handling if server receives an error event.
    server.on('error',function(errorObj) {
        console.log('socket error');
        //note, 'close' event will be called directly following this.
        callback(errorObj);
    });

    serverObj.stop = function (callback) {
        //close all the sockets. Ensures the server hard closes, rather than
        //just stopping to accept new connections, when server.close is called.
        for (var i=0; i<sockets.length;i++) {
            sockets[i].destroy();
        }
        this.server.close(function () {
            console.log('server is closed.');
        });
    };
    return serverObj;

}
//static requestHandler.
exports.static=function(rootFolder) {

    //make it return a requestHandler function:
    //console.log('in static');
    return function(req,res,next) {
        console.log('in the static function!');
            hujiNet.handleStaticResponse(req,res.socket,rootFolder);
        //next();
    }
};
//method for creating a reg ex object (as described in the use case constructor), from a given resource path.
function create_reg(resource) {
    var folders = resource.split('/');
    var reg_string = '^';
    var reg_obj={};
    var params=[null];
    for (var i = 0; i < folders.length; i++) {
        //standard
        if (folders[i][0] != ':') reg_string += folders[i];
        //param
        if (folders[i][0] === ':') {
            reg_string += '(\\w*)';
            //take the param name not including the : and add it to the params list.
            params.push(folders[i].substr(1));
        }
        //add on an escaped slash if we're not on the last directory in the route.
        if (i != folders.length - 1) reg_string += '\/';
    }
    reg_string += '';
    reg_obj.reg=new RegExp(reg_string);
    reg_obj.params=params;

    return reg_obj;
}
//export the method so it's publicly accessible upon requiring the module.
exports.start = start;




