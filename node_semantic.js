var http = require('http');
var url = require('url');
var fs = require('fs');
var $rdf = require('rdflib');
var store=$rdf.graph();

http.createServer(function (req, res) {
    try {
        if (req.method == 'POST') {
            var body = '';
            // var targeturi = req.headers.targeturi;
            //
            // if (targeturi.length < 1) {
            //     res.writeHead(400, {'Content-Type':'text/plain'});
            //     res.end('');
            // }

            req.on('data', function (chunk) {
                body += chunk;
            });

            req.on('end', function () {
                var recvData = JSON.parse(body);
                var buffer = new Buffer(recvData.smd.dcrp, 'base64');
                var dcrp = buffer.toString();
                var pi = recvData.smd.pi;
                console.log(recvData);
                console.log(dcrp);
                console.log(pi);

                var storeTriple = function (uri, rdfData, callback) {
                    var contentType='application/rdf+xml';
                    var baseUrl="http://203.253.128.161:7579";
                    try{
                        console.log('Received data into the store from RDF\n');
                        $rdf.parse(rdfData,store,baseUrl+uri,contentType);

                        var stms = store.toString();
                        console.log(stms + '\n');
                        console.log('RDF store success\n');
                    } catch(err){
                        console.log(err);
                        res.writeHead(400, {'Content-Type':'text/plain'});
                        res.end('RDF format is wrong');
                    }
                    callback();
                }

                storeTriple(pi, dcrp, function () {
                    res.writeHead(201, {'Content-Type':'text/plain'});
                    res.end('');
                });
            })
        }
        else if (req.method == 'GET') {
            var queryString = decodeURI(req.headers.smf);
            // var queryString = url.parse(req.url, true).query;
            console.log(queryString);

            var discovery = function (sparql, callback) {
                try{
                    var query = $rdf.SPARQLToQuery(sparql, true, store);
                    var discoveryResult = new Array();
                    var index = 0;

                    console.log(query.toString());

                    store.query(query, function (result) {
                        try {
                            console.log('SPARQL query run\n');
                            console.log(result);
                            console.log('\n');

                            var thing = result['?thing'];
                            var property = result['?property'];

                            var stms_match = store.statementsMatching(thing, undefined, property);

                            for (var i = 0; i < stms_match.length; i++) {
                                var stm = stms_match[i];
                                console.log(stm);
                                var value = stm.why.value;
                                value = value.substr(27, value.length);
                                if (discoveryResult.indexOf(value) == -1) {
                                    discoveryResult[index] = value;
                                    index++;
                                }
                            }
                        }
                        catch(err){
                            console.log(err);
                            res.writeHead(400, {'Content-Type':'text/plain'});
                            res.end('SPARQL format is wrong');
                        }
                    }, fetcher, function onDone() {
                        console.log('onDone');
                        callback(res, discoveryResult);
                    });
                } catch(err){
                    console.log(err);
                    res.writeHead(400, {'Content-Type':'text/plain'});
                    res.end('SPARQL format is wrong');
                }
            };

            function fetcher() {
                console.log('fetcher??');
            }

            discovery(queryString, function (res, discoveryResult) {
                if (discoveryResult.length > 0) {
                    console.log(discoveryResult);

                    res.writeHead(200, {'Content-Type':'text/plain'});
                    res.end(discoveryResult.toString());
                    // var uriList = new Object();
                    // uriList.m2murilist = discoveryResult;
                    // var uriListJson = JSON.stringify(uriList);
                    // console.log(uriListJson);
                }
                else {
                    res.writeHead(404, {'Content-Type':'text/plain'});
                    res.end('Semantic discovery result - not found');
                }
            });
        }
    } catch (err){
        console.log(err);
        res.writeHead(400, {'Content-Type':'text/plain'});
        res.end('');
    }

}).listen(7591, '203.254.173.118');

console.log('.. Semantic server running at http://203.254.173.118:7591/\n');